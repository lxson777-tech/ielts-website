import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { PracticeTest, Question, QuestionGroup, QuestionType, TestPart, TestSkill } from '../lib/tests/schema';
import {
  acceptedVariants,
  answerLeniency,
  bandEstimate,
  bandMidpoint,
  isCorrect,
  questionCount,
  scoredQuestionIds,
} from '../lib/tests/schema';
import { recordTestAttempt } from '../lib/progress';
import { clearSession, loadSession, saveAnswers, secondsLeft, startSession } from '../lib/test-session';
import { drillTypes } from '../lib/tests/drills';
import Html from './Html';
import StrategyPanel from './StrategyPanel';
import { LABELS as TYPE_LABELS, lessonHref, practiseHref } from './TypeAnalytics';
import { withBase } from '../lib/url';
import { isBookmarked, toggleBookmark } from '../lib/notes';
import TestDebrief from './tutor/TestDebrief';
import AskWhyWrong from './tutor/AskWhyWrong';

interface Props {
  test: PracticeTest;
  /** Base-prefixed URL back to the tests hub. */
  hubUrl: string;
  /** 'drill' tags the recorded attempt so it's excluded from the full-test
      band history (see progress.ts). Defaults to a full exam. */
  attemptKind?: 'full' | 'drill';
  /** Present only when this instance is a nested "retry the ones you got
      wrong" retake, rendered in place by the parent TestPlayer instead of a
      new route (see buildRetakeTest below). Skips the instructions gate,
      starts immediately, and swaps the score modal's "More Tests" link for a
      "Back to results" button that hands the final scored ids back to the
      parent so it can report what improved. */
  onFinish?: (scoredIds: Set<string>) => void;
}

/** Base-prefixed URL for images stored under /public. */
const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

/** Imported question HTML stores public assets from the site root. Prefix only
    local `src="/..."` values so diagrams also resolve when Astro is hosted
    below a base path. */
function questionAssets(html: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base ? html.replace(/\bsrc=(["'])\/(?!\/)/gi, `src=$1${base}/`) : html;
}

/** Icons for the mobile stimulus/questions tab switcher, inline SVG
    (currentColor) instead of emoji so the active-tab text color alone
    carries the state, matching the rest of the icon system. */
function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 3 4 4-11.5 11.5-5 1 1-5L17 3Z" />
      <path d="m14.5 5.5 4 4" />
    </svg>
  );
}

/** Prominent passage/section switcher pinned to the top of the questions
    pane. Students were missing the tiny footer pills entirely, so this is
    now the primary way to jump between passages/sections and revisit ones
    already done. A plain segmented control: one button per part, the
    active one filled brand, each showing progress so switching is legible
    and safe at a glance. */
function PartSwitcher({
  parts,
  numbered,
  answers,
  submitted,
  activePart,
  onSelect,
}: {
  parts: TestPart[];
  numbered: Numbered[];
  answers: Record<string, string>;
  submitted: boolean;
  activePart: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Choose passage"
      className="mb-4 flex flex-wrap gap-1 rounded-full border border-border bg-surface-alt p-1"
    >
      {parts.map((p, i) => {
        const partQs = numbered.filter((nq) => nq.part === p && nq.question.scored !== false);
        const partAnswered = partQs.filter((nq) => answers[nq.question.id]).length;
        const complete = partQs.length > 0 && partAnswered === partQs.length;
        const active = i === activePart;
        return (
          <button
            key={p.label}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(i)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt ${
              active ? 'bg-brand text-white shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {p.label}
            <span className={`ml-1.5 font-normal ${active ? 'opacity-80' : 'opacity-60'}`}>
              {complete && !submitted ? '✓' : `${partAnswered}/${partQs.length}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface Numbered {
  question: Question;
  group: QuestionGroup;
  part: TestPart;
  n: number;
}

function numberQuestions(test: PracticeTest): Numbered[] {
  const out: Numbered[] = [];
  let n = 0;
  for (const part of test.parts)
    for (const group of part.groups)
      for (const question of group.questions) out.push({ question, group, part, n: ++n });
  return out;
}

/** Group types whose widget logic depends on having every slot present, so a
    retake keeps the whole group intact whenever any one of its questions was
    wrong (see buildRetakeTest): diagram-labelling's markers are matched to
    items positionally, multiple-answer's slot count has to equal its
    selectCount, and table-completion's grid would lose cells the table
    layout still expects. Every other type is filtered question-by-question. */
const RETAKE_WHOLE_GROUP_TYPES: QuestionType[] = ['diagram-labelling', 'table-completion', 'multiple-answer'];

/** Build a coaching retake of just the questions the student got wrong or
    left blank last attempt (feature 1). Reuses the same Question objects
    (same ids, same answers/explanations/evidence) so scoring and the review
    panel keep working unchanged; only which questions are included differs.
    Same stimulus, same audio start/end seconds, always a 'drill' attempt
    (untimed in spirit — see the generous flat duration below) so the
    strategy panel shows and the recording gets full controls. */
function buildRetakeTest(test: PracticeTest, wrongIds: Set<string>): PracticeTest {
  const parts: TestPart[] = [];
  for (const part of test.parts) {
    const groups: QuestionGroup[] = [];
    for (const group of part.groups) {
      const anyWrong = group.questions.some((q) => wrongIds.has(q.id));
      if (!anyWrong) continue;
      if (RETAKE_WHOLE_GROUP_TYPES.includes(group.type)) {
        groups.push(group);
      } else {
        groups.push({ ...group, questions: group.questions.filter((q) => wrongIds.has(q.id)) });
      }
    }
    if (groups.length > 0) parts.push({ ...part, groups });
  }
  return {
    ...test,
    id: `${test.id}-retake`,
    title: `${test.title} · Retake`,
    description: 'A retake of just the questions you got wrong or left blank last time, untimed.',
    durationMinutes: 60,
    parts,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Strip tags and collapse whitespace, then cut to a bookmark-card-sized
    subtitle (feature 2). Question stems carry small inline HTML (<em>,
    <strong>), which a bookmark's subtitle has no use for. */
function truncatePlain(html: string, max = 90): string {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default function TestPlayer({ test, hubUrl, attemptKind = 'full', onFinish }: Props) {
  const numbered = useMemo(() => numberQuestions(test), [test]);
  const TOTAL = numbered.length;
  const SCORED_TOTAL = numbered.filter(({ question }) => question.scored !== false).length;
  const isRetake = !!onFinish;

  // Resume an in-progress session if one exists (survives refresh / tab close).
  const resumed = useMemo(
    () => (typeof window !== 'undefined' ? loadSession(test.id) : null),
    [test.id],
  );

  // A retake is coaching, not a fresh exam start: it skips the instructions
  // gate and begins straight away, same as if "Start test" had been clicked.
  const [started, setStarted] = useState(() => !!resumed || isRetake);
  const [answers, setAnswers] = useState<Record<string, string>>(() => resumed?.answers ?? {});
  const [submitted, setSubmitted] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() =>
    resumed ? secondsLeft(resumed) : test.durationMinutes * 60,
  );
  const [activePart, setActivePart] = useState(0);
  const [splitPct, setSplitPct] = useState(50);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  // Inline "you have N unanswered, submit anyway?" confirmation (not a modal —
  // see requestSubmit()). Cleared whenever the student goes back to answering.
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  // Mobile only: the split pane doesn't fit comfortably on a phone screen, so
  // below md the passage and questions each get the full pane one at a time,
  // switched via the tab bar right under the header.
  const [mobileView, setMobileView] = useState<'stimulus' | 'questions'>('stimulus');
  // Per-question-type breakdown from the last submit, kept for the results
  // screen's "weakest type in this test" line (feature 2) — recomputed fresh
  // on every submit, never merged with a prior attempt.
  const [byTypeStats, setByTypeStats] = useState<Record<string, { correct: number; total: number }> | null>(null);
  // Retake state (feature 1): set once the student clicks "Retry the N you
  // got wrong" on the score modal. Rendered as a full-screen nested
  // TestPlayer instance (see the bottom of this component) rather than a new
  // route, so the whole review/strategy/evidence machinery is reused as-is.
  const [retake, setRetake] = useState<{ test: PracticeTest; wrongIds: Set<string> } | null>(null);
  const [retakeResult, setRetakeResult] = useState<{ fixed: number; total: number } | null>(null);
  // Review-list filter (feature 3): "wrong only" hides fully-correct groups
  // from the post-submit review, see the group-render loop below.
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong'>('all');
  // j/k and arrow-key navigation between questions in the active part
  // (feature 3), reset whenever the student switches part/passage.
  /* Cursor for j/k keyboard navigation within the current part. */
  const [activeQIndex, setActiveQIndex] = useState(0);
  /* The question the student is currently on — set by the nav circles and
     by focus landing anywhere inside a question card. Drives the single
     accent ring that slides along the numbered circles in the footer,
     instead of every circle having to announce itself. */
  const [activeQId, setActiveQId] = useState<string | null>(null);
  const qnavRef = useRef<HTMLDivElement>(null);

  function toggleFlag(qid: string) {
    if (submittedRef.current) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  /* Jump to a question card and bring it into view — used by the flag-aware
     nav circles in the footer, mirroring "skip and return" on CD-IELTS. On
     mobile the questions pane may currently be hidden (single-pane tab
     view), so switch to it first and defer the scroll a frame so it's
     scrolling a pane that's actually laid out, not a display:none one. */
  function jumpToQuestion(qid: string) {
    setActiveQId(qid);
    setMobileView('questions');
    requestAnimationFrame(() => {
      document.getElementById(`player-${qid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function start() {
    const s = startSession(test);
    setTimeLeft(secondsLeft(s));
    setStarted(true);
  }

  /* Retake mode starts immediately (see `started`'s initializer above) but
     still needs its own session/timer set up the same way the Start-test
     button would have done, so the countdown and resume-on-refresh behaviour
     both work normally within the retake. */
  useEffect(() => {
    if (isRetake && !resumed) {
      const s = startSession(test);
      setTimeLeft(secondsLeft(s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mainRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const stimulusPaneRef = useRef<HTMLDivElement>(null);
  const passageContentRef = useRef<HTMLDivElement>(null);
  // Listening's equivalent of passageContentRef: the rendered transcript text,
  // used by locateEvidence to jump to a review item's evidence line. Wrapped
  // around the transcript's <Html>, not the whole <details>, so the search
  // never matches the "Review transcript" summary text itself.
  const transcriptContentRef = useRef<HTMLDivElement>(null);
  const transcriptDetailsRef = useRef<HTMLDetailsElement>(null);
  const submittedRef = useRef(false);

  const scoredIds = useMemo(
    () => scoredQuestionIds(numbered.map(({ question }) => question), answers),
    [numbered, answers],
  );

  /* Review: find a question's supporting quote in the passage (reading) or
     transcript (listening), highlight it and scroll it into view. Splits on
     "…"/"..." so multi-fragment quotes each get marked. */
  function locateEvidence(evidence: string) {
    const isListening = test.skill === 'listening';
    const root = isListening ? transcriptContentRef.current : passageContentRef.current;
    if (!root) return;
    // The transcript lives inside a collapsed <details>; open it so the
    // highlighted line is actually visible before scrolling to it.
    if (isListening && transcriptDetailsRef.current) transcriptDetailsRef.current.open = true;
    root.querySelectorAll('mark.ielts-evidence').forEach(unwrap);
    const fragments = evidence
      .split(/\s*(?:\.\.\.|…)\s*/)
      .map((f) => f.trim())
      .filter((f) => f.length > 2);
    let first: HTMLElement | null = null;
    for (const frag of fragments) {
      const range = findTextRange(root, frag);
      if (!range) continue;
      const m = wrapRange(range, root, 'ielts-evidence');
      if (!first) first = m;
    }
    // On mobile the stimulus pane may currently be hidden (single-pane tab
    // view) — switch to it and wait a frame so scrollIntoView runs against
    // a pane that's actually laid out, not a display:none one.
    setMobileView('stimulus');
    requestAnimationFrame(() => {
      first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  const correctCount = scoredIds.size;

  function setAnswer(qid: string, value: string) {
    if (submittedRef.current) return;
    setAnswers((prev) => {
      const next = { ...prev };
      // Store exactly what was typed — trimming here eats the space the
      // student just typed (controlled input), blocking multi-word answers.
      // Normalisation happens once, at scoring time (isCorrect).
      if (value) next[qid] = value;
      else delete next[qid];
      saveAnswers(next);
      return next;
    });
  }

  function handleSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    setShowScore(true);
    const raw = scoredIds.size;
    const byType: Record<string, { correct: number; total: number }> = {};
    for (const { question, group } of numbered) {
      if (question.scored === false) continue;
      const t = byType[group.type] ?? (byType[group.type] = { correct: 0, total: 0 });
      t.total += 1;
      if (scoredIds.has(question.id)) t.correct += 1;
    }
    recordTestAttempt(test.id, {
      at: new Date().toISOString(),
      raw,
      total: SCORED_TOTAL,
      band: bandMidpoint(raw, SCORED_TOTAL, test.skill),
      bandLabel: bandEstimate(raw, SCORED_TOTAL, test.skill),
      secondsUsed: test.durationMinutes * 60 - timeLeft,
      byType,
      kind: attemptKind,
      skill: test.skill,
    });
    setByTypeStats(byType);
    clearSession(); // in-progress state done; permanent attempt kept in progress history
    // onFinish itself is wired to the score modal's "Back to results" button,
    // not called here — the retake still shows its own score/review first.
  }

  const unansweredCount = numbered.filter(
    ({ question }) => question.scored !== false && !answers[question.id],
  ).length;

  /* Submit-button handler: the real computer-delivered exam flags unanswered
     questions before it will lock in the attempt, so a mis-click doesn't
     silently burn the whole test. Auto-submit at time-up calls handleSubmit()
     directly and skips this — there's nothing to "go back" to once the clock
     hits zero. */
  function requestSubmit() {
    if (submittedRef.current) return;
    if (unansweredCount > 0) {
      setConfirmSubmit(true);
      return;
    }
    handleSubmit();
  }

  /* Timer — runs only once started, auto-submits at zero. */
  useEffect(() => {
    if (!started || submitted) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted]);

  /* Flag a running paper on <body> so the Mr EZ tutor panel switches to
     invigilator mode (see readPlace() in src/components/tutor/MrEzPanel.tsx).
     The first line of defence is that this route uses the `bare` layout, so
     the panel is not mounted here at all; this is the second, which keeps the
     rule true if the test player is ever embedded somewhere that does have
     the workspace chrome. Cleared on unmount so it cannot stick on. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (started && !submitted) document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [started, submitted]);

  /* Warn before leaving an in-progress test (can't pause). */
  useEffect(() => {
    if (!started || submitted) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started, submitted]);

  /* Reset the keyboard-nav cursor whenever the visible set of questions
     changes (switching part/passage). */
  useEffect(() => {
    setActiveQIndex(0);
    // Jumping between passages/sections should feel like a fresh page, not
    // a scrolled-down one — reset both panes to the top (passage switcher,
    // see PartSwitcher below).
    questionsRef.current?.scrollTo({ top: 0 });
    stimulusPaneRef.current?.scrollTo({ top: 0 });
  }, [activePart]);

  /* j/k and arrow-key navigation between questions in the current part
     (feature 3) — desktop-only affordance (see the hint rendered below), but
     the listener itself works everywhere; it just does nothing useful on a
     touch device with no keyboard. Skipped entirely while an input/select is
     focused so it never eats a letter the student is actually typing (j and
     k are ordinary letters in plenty of free-text answers). */
  useEffect(() => {
    if (!started || submitted) return;
    // Read the active part straight off `activePart`/`test`, rather than the
    // outer `part` const declared further down this component, so this
    // effect (declared above that point) never references it before its
    // assignment.
    const currentPart = test.parts[activePart];
    const partQs = numbered.filter((nq) => nq.part === currentPart);
    function isTypingTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const dir = e.key === 'j' || e.key === 'ArrowDown' ? 1 : e.key === 'k' || e.key === 'ArrowUp' ? -1 : 0;
      if (dir === 0 || partQs.length === 0) return;
      e.preventDefault();
      setActiveQIndex((i) => {
        const next = Math.max(0, Math.min(partQs.length - 1, i + dir));
        const nq = partQs[next];
        if (nq) jumpToQuestion(nq.question.id);
        return next;
      });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, activePart, test, numbered]);

  /* Split-pane drag (desktop only). */
  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    const onMove = (ev: MouseEvent) => {
      const rect = main.getBoundingClientRect();
      setSplitPct(Math.max(25, Math.min(75, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const part = test.parts[activePart]!;
  const stimulus = part.stimulus;
  const partItems = numbered.filter((nq) => nq.part === part);
  const partRange = partItems.length
    ? `Questions ${partItems[0]!.n}-${partItems[partItems.length - 1]!.n}`
    : 'Questions';
  const timerWarn = timeLeft <= 300 && !submitted;

  /* Park the ring on the active circle. Runs after every render that could
     have moved one: a new active question, a part switch, or submission
     recolouring the row. offsetLeft/offsetTop are measured against the row
     itself, so wrapping onto a second line is handled for free. */
  useEffect(() => {
    const row = qnavRef.current;
    if (!row) return;
    const bar = row.querySelector<HTMLElement>('.tp-qnav-bar');
    if (!bar) return;
    const target = activeQId
      ? row.querySelector<HTMLElement>(`[data-qid="${CSS.escape(activeQId)}"]`)
      : null;
    if (!target) {
      row.classList.remove('is-ready');
      return;
    }
    bar.style.setProperty('--tp-x', `${target.offsetLeft}px`);
    bar.style.setProperty('--tp-y', `${target.offsetTop}px`);
    if (!row.classList.contains('is-ready')) {
      requestAnimationFrame(() => row.classList.add('is-ready'));
    }
  });
  const legacyAudioPart = test.parts.find((p) => p.stimulus.kind === 'audio');
  const sharedAudioSrc = test.audioSrc ??
    (legacyAudioPart?.stimulus.kind === 'audio' ? legacyAudioPart.stimulus.src : undefined);

  // Feature 1: how many scored questions are wrong or blank right now. Stable
  // post-submit since inputs are disabled, so it's safe to read at click time.
  const wrongCount = submitted ? SCORED_TOTAL - correctCount : 0;

  // Question bookmarks (review screen, feature 2): the base URL of this
  // test's own page, `#q<n>` appended per question. Full tests live at
  // /tests/<id>, drills at /trainers/<skill>/<id> (see the two page routes
  // that render TestPlayer). Omitted for a retake (isRetake): its test id
  // has a synthetic "-retake" suffix with no real page behind it, and the
  // nested instance is gone as soon as the student returns to the parent
  // results screen, so a bookmark into it wouldn't resolve to anything.
  const bookmarkBase = isRetake
    ? undefined
    : withBase(attemptKind === 'drill' ? `/trainers/${test.skill}/${test.id}` : `/tests/${test.id}`);

  // Mr EZ on the review screen: the whole-paper debrief card below, and the
  // per-question "why was my answer wrong?" button inside AnswerReview.
  // Undefined switches both off, and `isRetake` (i.e. an onFinish callback
  // was passed) is exactly the right switch, because it marks the two places
  // a TestPlayer is nested inside something bigger:
  //   - a MOCK EXAM leg (MockExam.tsx renders this with onFinish for its
  //     Listening and Reading papers). A mock is one timed assessment from
  //     its first paper to its last, so offering coaching between the legs
  //     would be helping during an exam.
  //   - the nested retake of the questions you got wrong, whose synthetic
  //     `<id>-retake` id has no published paper behind it to look up.
  // Everything else about showing these (is there a tutor, did anything go
  // wrong, is the student signed in) is decided by the components.
  const tutorTestId = isRetake ? undefined : test.id;

  function openRetake() {
    const wrongIds = new Set(
      numbered
        .filter((nq) => nq.question.scored !== false && !scoredIds.has(nq.question.id))
        .map((nq) => nq.question.id),
    );
    if (wrongIds.size === 0) return;
    setRetake({ test: buildRetakeTest(test, wrongIds), wrongIds });
    setShowScore(false);
  }

  // Feature 2: the weakest question type in *this* attempt, with the same
  // lesson/practise links as the cross-test panel on /tests (TypeAnalytics).
  const weakestType =
    byTypeStats && wrongCount > 0
      ? Object.entries(byTypeStats)
          .map(([type, v]) => ({ type: type as QuestionType, ...v }))
          .filter((r) => r.total > 0)
          .reduce<{ type: QuestionType; correct: number; total: number } | null>(
            (worst, r) => (!worst || r.correct / r.total < worst.correct / worst.total ? r : worst),
            null,
          )
      : null;

  /* ── Instructions gate — timer does not run until Start ── */
  if (!started) {
    return <InstructionsScreen test={test} hubUrl={hubUrl} onStart={start} attemptKind={attemptKind} />;
  }

  return (
    <>
    {/* While a retake (feature 1) is open, the underlying results screen is
        unmounted rather than merely covered — two TestPlayer instances open
        at once would duplicate every question's `player-<id>` DOM id and
        double up timers/listeners for no benefit, since the retake always
        returns to a fresh render of this screen anyway (see onFinish below). */}
    {!retake && (
    <div
      className="screen-in flex h-dvh flex-col bg-surface text-ink"
      onFocusCapture={(e) => {
        const card = (e.target as HTMLElement).closest?.('[id^="player-"]');
        if (card) setActiveQId(card.id.slice('player-'.length));
      }}
    >
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2.5 sm:gap-3 sm:px-4">
        <a href={hubUrl} className="shrink-0 whitespace-nowrap py-2 text-sm font-semibold text-ink-muted hover:text-ink">
          <span className="hidden sm:inline">Tests</span>
        </a>
        <span className="hidden truncate font-display text-sm font-bold md:block">{test.title}</span>
        <div
          className={`tp-timer mx-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold sm:gap-2 sm:px-4 ${
            timerWarn ? 'animate-pulse bg-error-tint text-error' : 'bg-surface-alt text-ink'
          }`}
          role="timer"
          aria-label="Time remaining"
        >
          <span aria-hidden="true">⏱</span>
          {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
        </div>
        <button
          type="button"
          onClick={() => {
            setMobileView('questions');
            requestAnimationFrame(() => questionsRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
          }}
          className="shrink-0 rounded-button border border-border px-2.5 py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-alt sm:px-3"
        >
          Review
        </button>
        {/* Reopens the score modal once it's been dismissed via "Review
            Answers" — without this there was no way back to it, which
            mattered only for a retake/mock leg (isRetake): that's the only
            place the modal's "Back to results" button lives, and dismissing
            the modal otherwise stranded the flow with no way to continue.
            Shown for every submitted test, not just isRetake, since it's a
            harmless convenience either way. */}
        {submitted && !showScore && (
          <button
            type="button"
            onClick={() => setShowScore(true)}
            className="shrink-0 rounded-button border border-border px-2.5 py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface-alt sm:px-3"
          >
            Score
          </button>
        )}
        <button
          type="button"
          onClick={requestSubmit}
          disabled={submitted}
          className="shrink-0 rounded-button bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:px-4"
        >
          Submit
        </button>
      </header>

      {/* ── Unanswered-question confirmation — a calm inline panel, not a
           dialog, so it reads as part of the page rather than an interruption. ── */}
      {confirmSubmit && !submitted && (
        <div
          role="alert"
          className="shrink-0 border-b border-warning/30 bg-warning-tint px-4 py-3"
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              You have {unansweredCount} unanswered {unansweredCount === 1 ? 'question' : 'questions'}. Submit anyway?
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="rounded-button border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-alt"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-button bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── "You fixed N of M" banner — shown once a nested retake (feature 1)
           finishes and hands its result back via onFinish below. Dismissible,
           success-toned so it doesn't read as another warning. ── */}
      {retakeResult && (
        <div role="status" className="shrink-0 border-b border-success/30 bg-success-tint px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              You fixed {retakeResult.fixed} of {retakeResult.total}.
            </p>
            <button
              type="button"
              onClick={() => setRetakeResult(null)}
              className="rounded-button border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-alt"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {test.skill === 'listening' && (
        <ListeningAudio
          src={sharedAudioSrc ? asset(sharedAudioSrc) : undefined}
          attemptKind={attemptKind}
          startSeconds={stimulus.kind === 'audio' ? stimulus.startSeconds : undefined}
          endSeconds={stimulus.kind === 'audio' ? stimulus.endSeconds : undefined}
          drillPartNumber={attemptKind === 'drill' ? drillPartNumber(test.id) : null}
        />
      )}

      {/* ── Mobile pane switcher — the split pane below is too cramped on a
           phone screen, so below md each side gets the full pane, one at a
           time. ── */}
      <div className="flex shrink-0 border-b border-border md:hidden">
        <button
          type="button"
          onClick={() => setMobileView('stimulus')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            mobileView === 'stimulus' ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
          }`}
        >
          <BookIcon /> {stimulus.kind === 'passage' ? 'Passage' : 'Question paper'}
        </button>
        <button
          type="button"
          onClick={() => setMobileView('questions')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            mobileView === 'questions' ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
          }`}
        >
          <PencilIcon /> {stimulus.kind === 'audio' ? 'Answer sheet' : 'Questions'}{' '}
          <span className="font-normal opacity-70">
            {numbered.filter((nq) => nq.part === part && nq.question.scored !== false && answers[nq.question.id]).length}/
            {numbered.filter((nq) => nq.part === part && nq.question.scored !== false).length}
          </span>
        </button>
      </div>

      {/* ── Main split pane ── */}
      <div
        ref={mainRef}
        className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[var(--split)_4px_1fr]"
        style={{ '--split': `${splitPct}%` } as React.CSSProperties}
      >
        {/* Stimulus pane — full-height on mobile when its tab is active,
            always visible side-by-side with questions from md up. */}
        <div
          ref={stimulusPaneRef}
          className={`min-h-0 flex-1 overflow-y-auto border-b border-border bg-surface-alt md:block md:border-b-0 ${
            mobileView === 'stimulus' ? 'block' : 'hidden'
          }`}
        >
          {stimulus.kind === 'passage' ? (
            <Highlightable key={activePart} innerRef={passageContentRef} className="mx-auto max-w-2xl px-5 py-6">
              {/* All trusted HTML here goes through <Html> (memoized) rather
                  than an inline dangerouslySetInnerHTML: the countdown
                  re-renders this whole player once a second, and an inline one
                  would re-set innerHTML on every tick — reloading images,
                  dropping the reader's text selection, and flickering. */}
              <Html as="p" className="mb-4 text-sm italic text-ink-muted" html={stimulus.instructionHtml} />
              <p className="text-xs font-bold uppercase tracking-wider text-brand">{stimulus.label}</p>
              <h2 className="mb-4 mt-1 font-display text-2xl font-extrabold">{stimulus.title}</h2>
              {stimulus.paragraphs.map((p, i) => (
                <p key={i} className="mb-4 text-[0.95rem] leading-relaxed">
                  {p.label && <strong className="mr-1 font-display">{p.label}.</strong>}
                  <Html as="span" html={p.html} />
                </p>
              ))}
            </Highlightable>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-2xl font-extrabold">Question paper</h2>
                  <p className="mt-1 text-sm text-ink-muted">{stimulus.label}. Follow the recording and read each task carefully.</p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">{partRange}</span>
              </div>
              {stimulus.questionHtml ? (
                <Html className="listening-question-paper" html={questionAssets(stimulus.questionHtml)} />
              ) : (
                <p className="rounded-card border border-border bg-surface p-4 text-sm text-ink-muted">
                  The question paper for this section is unavailable.
                </p>
              )}
              {submitted && stimulus.transcriptHtml && (
                <details ref={transcriptDetailsRef} className="mt-7 rounded-card border border-border bg-surface-alt p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--skill,var(--color-brand))]">Review transcript</summary>
                  <div ref={transcriptContentRef}>
                    <Html className="mt-2 text-sm leading-relaxed text-ink-muted" html={stimulus.transcriptHtml} />
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Resizer */}
        <div
          className="hidden cursor-col-resize bg-border transition-colors hover:bg-brand md:block"
          onMouseDown={startDrag}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
        />

        {/* Questions pane */}
        <div
          ref={questionsRef}
          className={`min-h-0 flex-1 overflow-y-auto md:block ${mobileView === 'questions' ? 'block' : 'hidden'}`}
        >
          <div className="mx-auto max-w-2xl px-5 py-6">
            {stimulus.kind === 'audio' && (
              <div className="mb-7 border-b border-border pb-4">
                <h2 className="font-display text-2xl font-extrabold">Answer sheet</h2>
                <p className="mt-1 text-sm text-ink-muted">{stimulus.label}. Enter answers for {partRange.toLowerCase()}.</p>
              </div>
            )}
            {/* Prominent passage/section switcher — the footer pills are easy
                to miss, so this is the primary, always-visible way to jump
                between passages/sections and revisit ones already done. */}
            {test.parts.length > 1 && (
              <PartSwitcher
                parts={test.parts}
                numbered={numbered}
                answers={answers}
                submitted={submitted}
                activePart={activePart}
                onSelect={setActivePart}
              />
            )}
            {activePart === 0 && test.skill !== 'listening' && (
              <p className="-mt-2 mb-4 text-xs text-ink-muted">
                Do the passages in any order. Your answers are kept when you switch.
              </p>
            )}
            {/* Desktop-only keyboard-nav hint (feature 3) — shown only while
                actively answering, never once the test is submitted. */}
            {!submitted && (
              <p className="mb-4 hidden text-xs text-ink-muted md:block">
                Tip: press <kbd className="rounded border border-border bg-surface-alt px-1 py-0.5 font-mono text-[0.7rem]">j</kbd>/<kbd className="rounded border border-border bg-surface-alt px-1 py-0.5 font-mono text-[0.7rem]">k</kbd> or the arrow keys to move between questions.
              </p>
            )}
            {/* Review filter toggle (feature 3) — only meaningful once
                there's a right/wrong state to filter on. The retry action
                (feature 1) sits alongside it so it's still reachable once the
                score modal has been dismissed, not just at the moment of
                submission. */}
            {submitted && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <span>Show:</span>
                  <div className="inline-flex rounded-full border border-border bg-surface-alt p-0.5">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      aria-pressed={reviewFilter === 'all'}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        reviewFilter === 'all' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('wrong')}
                      aria-pressed={reviewFilter === 'wrong'}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        reviewFilter === 'wrong' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      Wrong only
                    </button>
                  </div>
                </div>
                {wrongCount > 0 && !isRetake && (
                  <button
                    type="button"
                    onClick={openRetake}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Retry the {wrongCount} you got wrong
                  </button>
                )}
              </div>
            )}
            {/* Mr EZ's debrief of the whole paper (see tutorTestId above):
                above the question list and below the score, never inside the
                score modal, which is a moment of its own. Its position in
                this child list is fixed, so switching passage re-renders the
                questions under it without remounting it and losing what he
                already said. */}
            {submitted && tutorTestId && (
              <TestDebrief
                test={test}
                answers={answers}
                correctIds={scoredIds}
                scoredTotal={SCORED_TOTAL}
              />
            )}
            {part.groups.map((group, groupIndex) => {
              const groupQs = numbered.filter((nq) => nq.group === group);
              const wrongOnly = submitted && reviewFilter === 'wrong';
              // Composite widgets (diagram/table/multi-answer) keep every
              // slot — their scoring only makes sense as a whole — so
              // "wrong only" just hides the widget entirely once every slot
              // in it is correct. Plain per-question groups instead filter
              // which individual questions render.
              const isComposite =
                (group.type === 'diagram-labelling' && !!group.diagram) ||
                (group.type === 'table-completion' && !!group.table) ||
                (group.type === 'multiple-answer' && !group.questions.some((q) => q.multiSelect));
              const visibleQs = wrongOnly
                ? groupQs.filter((nq) => nq.question.scored !== false && !scoredIds.has(nq.question.id))
                : groupQs;
              if (wrongOnly) {
                if (isComposite) {
                  const allCorrect = groupQs.every((nq) => nq.question.scored === false || scoredIds.has(nq.question.id));
                  if (allCorrect) return null;
                } else if (visibleQs.length === 0) {
                  return null;
                }
              }
              const headingId = `question-group-${activePart}-${groupIndex}`;
              return (
                <section key={group.title} aria-labelledby={headingId} className="mb-10 last:mb-2">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                    <h3 id={headingId} className="font-display text-lg font-bold">{group.title}</h3>
                    <Html as="p" className="max-w-md text-sm leading-relaxed text-ink-muted" html={group.instructionHtml} />
                  </div>
                  {group.legendHtml && (
                    <Html
                      className="mb-4 rounded-card border border-border bg-surface-alt p-3 text-sm"
                      html={group.legendHtml}
                    />
                  )}
                  {attemptKind === 'drill' && <StrategyPanel skill={test.skill} type={group.type} />}
                  {group.type === 'diagram-labelling' && group.diagram && (
                    <DiagramFigure diagram={group.diagram} items={groupQs} answers={answers} submitted={submitted} />
                  )}
                  {group.type === 'multiple-answer' && !group.questions.some((question) => question.multiSelect) ? (
                    <MultiAnswer group={group} slotIds={groupQs.map((nq) => nq.question.id)} answers={answers} submitted={submitted} setAnswer={setAnswer} />
                  ) : group.type === 'table-completion' && group.table ? (
                    <TableGrid
                      table={group.table}
                      items={groupQs}
                      answers={answers}
                      submitted={submitted}
                      wordLimit={group.wordLimit}
                      setAnswer={setAnswer}
                      onLocate={locateEvidence}
                      skill={test.skill}
                    />
                  ) : (
                    visibleQs.map((nq) => (
                      <QuestionItem
                        key={nq.question.id}
                        nq={nq}
                        value={answers[nq.question.id] ?? ''}
                        submitted={submitted}
                        scored={scoredIds.has(nq.question.id)}
                        onChange={(v) => setAnswer(nq.question.id, v)}
                        onLocate={locateEvidence}
                        flagged={flagged.has(nq.question.id)}
                        onToggleFlag={() => toggleFlag(nq.question.id)}
                        skill={test.skill}
                        testId={test.id}
                        testTitle={test.title}
                        bookmarkHref={bookmarkBase ? `${bookmarkBase}#q${nq.n}` : undefined}
                        tutorTestId={tutorTestId}
                      />
                    ))
                  )}
                </section>
              );
            })}
            {!submitted &&
              (activePart < test.parts.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActivePart(activePart + 1)}
                  className="mt-2 w-full rounded-button bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Continue to {test.parts[activePart + 1]!.label}
                </button>
              ) : (
                <p className="mt-4 text-center text-sm text-ink-muted">
                  This is the last passage. Check your answers, then submit using the Submit button above.
                </p>
              ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-surface px-4 py-2">
        <div className="flex gap-1">
          {test.parts.map((p, i) => {
            const partQs = numbered.filter((nq) => nq.part === p && nq.question.scored !== false);
            const partAnswered = partQs.filter((nq) => answers[nq.question.id]).length;
            const complete = partAnswered === partQs.length;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setActivePart(i)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  i === activePart ? 'bg-brand text-white' : 'bg-surface-alt text-ink-muted hover:text-ink'
                }`}
              >
                {p.label}
                <span className={`ml-1 font-normal ${i === activePart ? 'opacity-80' : 'opacity-60'}`}>
                  {complete && !submitted ? '✓' : `${partAnswered}/${partQs.length}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Question indicators — current passage only */}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs font-medium text-ink-muted sm:inline">{part.label}:</span>
          <div className="tp-qnav flex flex-wrap gap-1.5" ref={qnavRef}>
            <span className="tp-qnav-bar" aria-hidden="true" />
            {numbered
              .filter((nq) => nq.part === part)
              .map(({ question, n }) => {
                const unavailable = question.scored === false;
                const answered = !!answers[question.id];
                const ok = submitted && scoredIds.has(question.id);
                const cls = unavailable
                  ? 'bg-surface-alt text-ink-muted'
                  : submitted
                  ? ok
                    ? 'bg-success text-white'
                    : 'bg-error text-white'
                  : answered
                    ? 'bg-brand text-white'
                    : 'border border-border text-ink-muted';
                const isFlagged = flagged.has(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    data-qid={question.id}
                    onClick={() => jumpToQuestion(question.id)}
                    aria-label={`Jump to question ${n}${unavailable ? ', unavailable and excluded from score' : answered ? ', answered' : ', unanswered'}${isFlagged ? ', flagged for review' : ''}`}
                    className={`relative grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${cls} ${
                      isFlagged && !submitted ? 'ring-2 ring-warning ring-offset-1 ring-offset-surface' : ''
                    }`}
                  >
                    {n}
                    {isFlagged && !submitted && (
                      <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 text-[0.6rem] leading-none">
                        🚩
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      </footer>

      {/* ── Score modal ── */}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {showScore && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="w-full max-w-sm rounded-card bg-surface p-8 text-center shadow-card-hover"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="font-display text-xl font-extrabold">Your Score</h2>
                <p className="band-score-pop mt-4 font-display text-5xl font-extrabold text-brand">
                  {correctCount} / {SCORED_TOTAL}
                </p>
                <p className="mt-2 text-ink-muted">{Math.round((correctCount / SCORED_TOTAL) * 100)}% correct</p>
                <p className="mt-3 inline-block rounded-full bg-brand-tint px-4 py-1.5 font-display font-bold text-brand">
                  Estimated Band: {bandEstimate(correctCount, SCORED_TOTAL, test.skill)}
                </p>
                {weakestType && (
                  <p className="mt-4 text-left text-sm text-ink-muted">
                    Your weakest type in this test:{' '}
                    <strong className="text-ink">{TYPE_LABELS[weakestType.type] ?? weakestType.type}</strong>,{' '}
                    {weakestType.correct} of {weakestType.total} correct.{' '}
                    {lessonHref(test.skill, weakestType.type) && (
                      <a href={lessonHref(test.skill, weakestType.type)} className="font-semibold text-brand hover:underline">
                        Review the lesson
                      </a>
                    )}
                    {lessonHref(test.skill, weakestType.type) && drillTypes(test.skill).has(weakestType.type) && ' · '}
                    {drillTypes(test.skill).has(weakestType.type) && (
                      <a href={practiseHref(test.skill, weakestType.type)} className="font-semibold text-brand hover:underline">
                        Practise this type
                      </a>
                    )}
                  </p>
                )}
                {wrongCount > 0 && !isRetake && (
                  <button
                    type="button"
                    onClick={openRetake}
                    className="mt-4 w-full rounded-button border border-brand/30 bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-tint/70"
                  >
                    Retry the {wrongCount} you got wrong
                  </button>
                )}
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowScore(false)}
                    className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
                  >
                    Review Answers
                  </button>
                  {isRetake ? (
                    <button
                      type="button"
                      onClick={() => onFinish!(scoredIds)}
                      className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      Back to results
                    </button>
                  ) : (
                    <a
                      href={hubUrl}
                      className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      More Tests
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
    )}

    {/* ── Retake (feature 1) — a nested TestPlayer instance for just the
         wrong/blank questions, rendered in place rather than a new route.
         Replaces the results screen above rather than covering it (see the
         `!retake` guard), so it's a straightforward full-screen render with
         the same chrome as the page it's standing in for. ── */}
    {retake && (
      <TestPlayer
        test={retake.test}
        hubUrl={hubUrl}
        attemptKind="drill"
        onFinish={(finalScoredIds) => {
          const fixed = [...retake.wrongIds].filter((id) => finalScoredIds.has(id)).length;
          setRetakeResult({ fixed, total: retake.wrongIds.size });
          setRetake(null);
        }}
      />
    )}
    </>
  );
}

function QuestionItem({
  nq,
  value,
  submitted,
  scored,
  onChange,
  onLocate,
  flagged,
  onToggleFlag,
  skill,
  testId,
  testTitle,
  bookmarkHref,
  tutorTestId,
}: {
  nq: Numbered;
  value: string;
  submitted: boolean;
  scored: boolean;
  onChange: (v: string) => void;
  onLocate?: (evidence: string) => void;
  flagged?: boolean;
  onToggleFlag?: () => void;
  skill: TestSkill;
  /** Feature 2 (bookmarks) — the test this question belongs to and the
      page URL to jump back to it. bookmarkHref is undefined for a retake,
      where there's no real page for the bookmark to point at (see the
      caller). */
  testId?: string;
  testTitle?: string;
  bookmarkHref?: string;
  /** The paper's id when Mr EZ may be offered for a wrong answer here,
      undefined when he may not (see tutorTestId in TestPlayer). */
  tutorTestId?: string;
}) {
  const { question: q, group, n } = nq;
  const ok = submitted && scored;
  const showHint = submitted && !ok;
  const answerText = q.multiSelect
    ? q.multiSelect.correctValues.join(', ')
    : Array.isArray(q.answer) ? q.answer[0] : q.answer;
  const overLimit = !submitted && group.wordLimit != null && countWords(value) > group.wordLimit;

  const stateCls = submitted
    ? ok
      ? 'border-success bg-success-tint'
      : 'border-error bg-error-tint'
    : flagged
      ? 'border-warning bg-warning-tint'
      : 'border-border bg-surface';

  return (
    <div id={`player-${q.id}`} className={`relative mb-3 scroll-mt-6 rounded-card border p-4 transition-colors ${stateCls}`}>
      {!submitted && onToggleFlag && (
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={!!flagged}
          aria-label={flagged ? `Unflag question ${n} for review` : `Flag question ${n} for review`}
          title={flagged ? 'Unflag for review' : 'Flag for review'}
          className={`absolute right-3 top-3 text-base leading-none transition-opacity ${
            flagged ? 'opacity-100' : 'opacity-30 hover:opacity-70'
          }`}
        >
          🚩
        </button>
      )}
      {submitted && bookmarkHref && testId && (
        <BookmarkToggle
          id={`${testId}:${q.id}`}
          title={`${testTitle ?? 'Test'}, Q${n}${TYPE_LABELS[group.type] ? ` (${TYPE_LABELS[group.type]})` : ''}`}
          href={bookmarkHref}
          subtitle={truncatePlain(q.textHtml || [q.before, q.after].filter(Boolean).join(' ___ ') || group.title)}
        />
      )}
      {q.scored === false ? (
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-alt text-xs font-bold text-ink-muted">
            {n}
          </span>
          <p className="text-sm leading-relaxed text-ink-muted">
            This question is missing from the published source and is excluded from your score.
          </p>
        </div>
      ) : q.multiSelect ? (
        <PerQuestionMultiAnswer
          question={q}
          number={n}
          choices={group.choices ?? []}
          value={value}
          submitted={submitted}
          onChange={onChange}
        />
      ) : group.type === 'diagram-labelling' ? (
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
              {n}
            </span>
            <input
              type="text"
              value={value}
              disabled={submitted}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Label…"
              aria-label={`Question ${n}`}
              className="w-48 rounded-lg border border-border bg-surface px-3 py-1 text-sm font-semibold focus:border-brand"
            />
            {q.textHtml && <Html as="span" className="text-sm text-ink-muted" html={q.textHtml} />}
          </div>
          {overLimit && <WordLimitWarning value={value} limit={group.wordLimit!} className="ml-10 mt-1" />}
        </div>
      ) : group.type === 'sentence-completion' || group.type === 'table-completion' ? (
        <div>
          <div className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
              {n}
            </span>
            <p className="text-[0.95rem] leading-loose">
              {q.before}{' '}
              <input
                type="text"
                value={value}
                disabled={submitted}
                onChange={(e) => onChange(e.target.value)}
                placeholder="…"
                aria-label={`Question ${n}`}
                className="mx-1 w-36 rounded-lg border border-border bg-surface px-2 py-0.5 text-center font-semibold focus:border-brand"
              />{' '}
              {q.after}
            </p>
          </div>
          {overLimit && <WordLimitWarning value={value} limit={group.wordLimit!} className="ml-10 mt-1" />}
        </div>
      ) : group.type === 'multiple-choice' ? (
        <div>
          <p className="mb-2 text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <Html as="span" html={q.textHtml ?? ''} />
          </p>
          <div className="space-y-1.5">
            {(q.options ?? []).map((opt, oi) => {
              const letter = ['A', 'B', 'C', 'D'][oi]!;
              return (
                <label
                  key={letter}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    value === letter ? 'border-brand bg-brand-tint' : 'border-border hover:border-brand/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={letter}
                    checked={value === letter}
                    disabled={submitted}
                    onChange={() => onChange(letter)}
                    className="accent-[var(--color-brand)]"
                  />
                  <strong>{letter}</strong>
                  {opt.trim().toUpperCase() !== letter && <span>{opt}</span>}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <select
            value={value}
            disabled={submitted}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Question ${n}`}
            className="shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-sm font-semibold"
          >
            <option value="">(blank)</option>
            {(group.type === 'tfng'
              ? ['True', 'False', 'Not Given']
              : group.type === 'yes-no-notgiven'
                ? ['Yes', 'No', 'Not Given']
                : (group.options ?? [])
            ).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-[0.95rem]">
            <strong className="mr-1">{n}.</strong>
            <Html as="span" html={q.textHtml ?? ''} />
          </p>
        </div>
      )}
      {submitted && (showHint || q.explanation || q.evidence || (ok && answerLeniency(q, value))) && (
        <AnswerReview
          q={q}
          ok={ok}
          given={value}
          answerText={answerText}
          onLocate={onLocate}
          skill={skill}
          className="sm:ml-10"
          tutorTestId={tutorTestId}
        />
      )}
    </div>
  );
}

/** Word-count nudge shown live while typing a free-text answer that has a
    stated limit (e.g. "NO MORE THAN TWO WORDS") — a nudge, not a hard block,
    since the real exam only penalises at marking time. */
function WordLimitWarning({ value, limit, className }: { value: string; limit: number; className?: string }) {
  const count = countWords(value);
  return (
    <p className={`text-xs font-semibold text-warning ${className ?? ''}`}>
      ⚠ {count} {count === 1 ? 'word' : 'words'}: limit is {limit}
    </p>
  );
}

/** Feature 2 — save this question to the bookmarks list (src/lib/notes.ts)
    for later review, independent of the flag-for-review-within-this-attempt
    feature above. Local state mirrors notes.ts's own store so the star
    updates immediately on click; it's re-read from notes.ts on mount rather
    than assumed false, so revisiting a past attempt's review screen shows
    bookmarks made earlier. */
function BookmarkToggle({
  id,
  title,
  href,
  subtitle,
}: {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
}) {
  const [saved, setSaved] = useState(() => (typeof window !== 'undefined' ? isBookmarked('question', id) : false));
  return (
    <button
      type="button"
      onClick={() => setSaved(toggleBookmark('question', id, { title, href, subtitle }))}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark this question'}
      title={saved ? 'Remove bookmark' : 'Bookmark this question'}
      className={`absolute right-9 top-3 leading-none transition-colors ${
        saved ? 'text-brand' : 'text-ink-muted opacity-40 hover:opacity-80'
      }`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M6 3.5h12a.5.5 0 0 1 .5.5v16.5l-6.5-4-6.5 4V4a.5.5 0 0 1 .5-.5Z"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Post-submit "why this is the answer" panel: correct answer, explanation,
    and the exact evidence line with a jump-to-passage button. Shared by the
    normal per-question list and the table-completion grid. */
function AnswerReview({
  q,
  ok,
  given,
  answerText,
  onLocate,
  skill,
  className,
  tutorTestId,
}: {
  q: Question;
  ok: boolean;
  given: string;
  answerText: string;
  onLocate?: (evidence: string) => void;
  skill: TestSkill;
  className?: string;
  /** Set only where asking Mr EZ about one wrong answer is offered (see
      tutorTestId in TestPlayer). Left unset by the table-completion grid:
      those blanks are marked as one widget, and the debrief card above the
      list already covers them. */
  tutorTestId?: string;
}) {
  /* Our marker forgives more than an examiner will (a hyphen, a currency sign,
     punctuation). Saying nothing would train the student into a habit that
     costs a mark on test day, so when the forgiveness is what saved the answer
     we name it and show the exact form from the key. */
  const leniency = ok ? answerLeniency(q, given) : null;
  const variants = acceptedVariants(q);
  return (
    <div className={`mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm ${className ?? ''}`}>
      {!ok && (
        <p className="font-semibold text-success">
          ✓ Correct answer: <span className="font-bold">{answerText}</span>
        </p>
      )}
      {leniency && (
        <p className="mb-1 rounded bg-warning-tint px-2 py-1.5 text-warning">
          Marked right, but write it exactly as <strong>{leniency.expected}</strong> in the real test. We let{' '}
          {leniency.forgiven.join(' and ')} through here.
        </p>
      )}
      {variants.length > 1 && (
        <p className="mb-1 text-xs text-ink-muted">
          The key accepts {variants.map((v, i) => (
            <span key={v}>
              {i > 0 ? ' or ' : ''}
              <strong>{v}</strong>
            </span>
          ))}. In the test write one answer only, never both with a slash or brackets.
        </p>
      )}
      {q.explanation && <p className="mt-0.5 text-ink-muted">{q.explanation}</p>}
      {q.evidence && (
        <div className="mt-1.5 border-l-2 border-brand/40 pl-2.5">
          <p className="italic text-ink-muted">“{q.evidence}”</p>
          {onLocate && (
            <button
              type="button"
              onClick={() => onLocate(q.evidence!)}
              className="mt-1 inline-flex items-center gap-1 py-2 -my-1 text-xs font-semibold text-brand hover:underline"
            >
              🔍 {skill === 'listening' ? 'Show in transcript' : 'Show in passage'}
            </button>
          )}
        </div>
      )}
      {/* The note above says why the KEY is right. This says why what the
          student actually wrote is not, which nothing written in advance
          could. One click, one tutor turn, and only ever on a click. */}
      {!ok && q.scored !== false && tutorTestId && (
        <AskWhyWrong testId={tutorTestId} questionId={q.id} given={given} />
      )}
    </div>
  );
}

/* Diagram with numbered pins, one per question in the group (in order).
   Pins recolor on submit to match each label input's correctness. */
function DiagramFigure({
  diagram,
  items,
  answers,
  submitted,
}: {
  diagram: NonNullable<QuestionGroup['diagram']>;
  items: Numbered[];
  answers: Record<string, string>;
  submitted: boolean;
}) {
  return (
    <div className="mb-4 rounded-card border border-border bg-white p-3">
      <div className="relative mx-auto max-w-md">
        <img src={asset(diagram.image)} alt={diagram.alt} className="block w-full rounded-lg" />
        {diagram.markers.map((m, i) => {
          const nq = items[i];
          if (!nq) return null;
          const answered = !!answers[nq.question.id];
          const ok = submitted && isCorrect(nq.question, answers[nq.question.id] ?? '');
          const color = submitted ? (ok ? 'bg-success' : 'bg-error') : answered ? 'bg-brand' : 'bg-ink/60';
          return (
            <span
              key={i}
              className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-xs font-extrabold text-white shadow-card ${color}`}
              style={{ left: `${m.x}%`, top: `${m.y}%` }}
              aria-hidden="true"
            >
              {nq.n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* "Choose N statements" — checkbox list capped at selectCount. The chosen
   letters are written into the group's slot question ids (sorted), so scoring,
   answered-state and nav circles reuse the normal per-question machinery: each
   slot's answer is the full correct set, so a chosen letter scores iff it's in
   that set — matching IELTS marking (one mark per correct selection). */
function MultiAnswer({
  group,
  slotIds,
  answers,
  submitted,
  setAnswer,
}: {
  group: QuestionGroup;
  slotIds: string[];
  answers: Record<string, string>;
  submitted: boolean;
  setAnswer: (qid: string, value: string) => void;
}) {
  const selectCount = group.selectCount ?? slotIds.length;
  const choices = group.choices ?? [];
  const correct = new Set(
    Array.isArray(group.questions[0]?.answer) ? (group.questions[0]!.answer as string[]) : [],
  );
  const selected = slotIds.map((id) => answers[id]).filter(Boolean) as string[];
  const selectedSet = new Set(selected);

  function toggle(letter: string) {
    if (submitted) return;
    let next: string[];
    if (selectedSet.has(letter)) next = selected.filter((l) => l !== letter);
    else if (selected.length >= selectCount) return; // cap reached
    else next = [...selected, letter];
    next.sort();
    slotIds.forEach((id, i) => setAnswer(id, next[i] ?? ''));
  }

  return (
    <div id={`player-${slotIds[0]}`} className="rounded-card border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-semibold text-ink-muted">
        Selected {selected.length} of {selectCount}
      </p>
      <div className="space-y-1.5">
        {choices.map((c) => {
          const chosen = selectedSet.has(c.value);
          const isCorrectChoice = correct.has(c.value);
          let cls = 'border-border hover:border-brand/50';
          if (submitted) {
            if (isCorrectChoice) cls = 'border-success bg-success-tint';
            else if (chosen) cls = 'border-error bg-error-tint';
            else cls = 'border-border opacity-50';
          } else if (chosen) {
            cls = 'border-brand bg-brand-tint';
          }
          const atCap = !chosen && selected.length >= selectCount;
          return (
            <label
              key={c.value}
              className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${cls} ${
                atCap && !submitted ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={chosen}
                disabled={submitted || atCap}
                onChange={() => toggle(c.value)}
                className="mt-0.5 accent-[var(--color-brand)]"
              />
              <span>
                <strong className="mr-1">{c.value}</strong>
                {c.label}
              </span>
            </label>
          );
        })}
      </div>
      {submitted && group.explanationHtml && (
        <Html
          className="mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm text-ink-muted"
          html={group.explanationHtml}
        />
      )}
    </div>
  );
}

/* Table/flow-chart completion: a grid of static cells and fill-in-the-blank
   cells, one input per question in the group (in reading order, left→right
   then top→bottom — same left-to-right/top-to-bottom convention as diagram
   pins). Answer explanations render below the table, reusing AnswerReview,
   since the blanks themselves are too small to hold them. */
function TableGrid({
  table,
  items,
  answers,
  submitted,
  wordLimit,
  setAnswer,
  onLocate,
  skill,
}: {
  table: NonNullable<QuestionGroup['table']>;
  items: Numbered[];
  answers: Record<string, string>;
  submitted: boolean;
  wordLimit?: number;
  setAnswer: (qid: string, value: string) => void;
  onLocate?: (evidence: string) => void;
  skill: TestSkill;
}) {
  const byId = new Map(items.map((nq) => [nq.question.id, nq]));

  return (
    <div id={`player-${items[0]?.question.id ?? ''}`} className="mb-4 overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-sm">
        {table.headerRow && (
          <thead>
            <tr className="bg-surface-alt text-left">
              {table.headerRow.map((h, i) => (
                <th key={i} className="border-b border-border px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-b-0">
              {row.map((cell, ci) => {
                if (typeof cell === 'string') {
                  return (
                    <td key={ci} className="px-3 py-2 align-top">
                      {cell}
                    </td>
                  );
                }
                const nq = byId.get(cell.questionId);
                if (!nq) return <td key={ci} className="px-3 py-2" />;
                const value = answers[nq.question.id] ?? '';
                const ok = submitted && isCorrect(nq.question, value);
                const cls = submitted
                  ? ok
                    ? 'border-success bg-success-tint'
                    : 'border-error bg-error-tint'
                  : 'border-border bg-surface';
                return (
                  <td key={ci} className="px-3 py-2 align-top">
                    <span className="mr-1.5 inline-grid h-6 w-6 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand">
                      {nq.n}
                    </span>
                    <input
                      type="text"
                      value={value}
                      disabled={submitted}
                      onChange={(e) => setAnswer(nq.question.id, e.target.value)}
                      placeholder="…"
                      aria-label={`Question ${nq.n}`}
                      className={`w-32 rounded-lg border px-2 py-0.5 text-center font-semibold focus:border-brand ${cls}`}
                    />
                    {wordLimit != null && !submitted && countWords(value) > wordLimit && (
                      <WordLimitWarning value={value} limit={wordLimit} className="mt-1" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {submitted &&
        items.map((nq) => {
          const value = answers[nq.question.id] ?? '';
          const ok = isCorrect(nq.question, value);
          const answerText = Array.isArray(nq.question.answer) ? nq.question.answer[0]! : nq.question.answer;
          if (ok && !nq.question.explanation && !nq.question.evidence && !answerLeniency(nq.question, value)) {
            return null;
          }
          return (
            <AnswerReview
              key={nq.question.id}
              q={nq.question}
              ok={ok}
              given={value}
              answerText={answerText}
              onLocate={onLocate}
              skill={skill}
              className="mx-3 my-2"
            />
          );
        })}
    </div>
  );
}

/* Wrap the current selection in <mark> elements — one per intersected text
   node — so highlighting survives inline tags (<em>, <strong>) and spans
   multiple paragraphs. Each fragment is a single text-node range, so
   surroundContents never throws on partially-selected elements. */
function wrapRange(range: Range, root: HTMLElement, className = 'ielts-hl'): HTMLElement | null {
  if (range.collapsed) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return range.intersectsNode(node) && (node.textContent ?? '').length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let first: HTMLElement | null = null;
  for (const node of nodes) {
    if ((node.parentElement as HTMLElement | null)?.closest(`mark.${className}`)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start >= end) continue;
    const r = document.createRange();
    r.setStart(node, start);
    r.setEnd(node, end);
    const mark = document.createElement('mark');
    mark.className = className;
    try {
      r.surroundContents(mark);
      if (!first) first = mark;
    } catch {
      /* skip any fragment that can't be cleanly wrapped */
    }
  }
  return first;
}

/* Char-for-char normalisation (each replacement is 1:1, so string indices are
   preserved) — lets evidence text match the passage despite curly quotes,
   dashes and non-breaking spaces. */
const normEvidence = (s: string) =>
  s
    .replace(/[’‘‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ');

/* Locate `search` inside a container's text, spanning inline tags and element
   boundaries, and return a DOM Range for it (or null if not found). */
function findTextRange(root: HTMLElement, search: string): Range | null {
  const nodes: Text[] = [];
  const starts: number[] = [];
  let full = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    nodes.push(t);
    starts.push(full.length);
    full += t.data;
  }
  if (nodes.length === 0) return null;
  const fullNorm = normEvidence(full);
  // Try the exact quote (minus any trailing punctuation) first; if it doesn't
  // resolve — quotes sometimes end a word early or swap a trailing comma for a
  // full stop — fall back to the longest leading run of words that does.
  const cleaned = normEvidence(search).trim().replace(/[.,;:]+$/, '');
  let target = '';
  let idx = fullNorm.indexOf(cleaned);
  if (idx >= 0) {
    target = cleaned;
  } else {
    const words = cleaned.split(/\s+/);
    for (let take = words.length - 1; take >= 4; take--) {
      const cand = words.slice(0, take).join(' ').replace(/[.,;:]+$/, '');
      if (cand.length < 12) break;
      idx = fullNorm.indexOf(cand);
      if (idx >= 0) {
        target = cand;
        break;
      }
    }
  }
  if (idx < 0) return null;
  const point = (pos: number, isEnd: boolean) => {
    for (let i = 0; i < nodes.length; i++) {
      const s = starts[i]!;
      const e = s + nodes[i]!.length;
      if (isEnd ? pos <= e : pos < e)
        return { node: nodes[i]!, offset: Math.max(0, Math.min(pos - s, nodes[i]!.length)) };
    }
    const last = nodes[nodes.length - 1]!;
    return { node: last, offset: last.length };
  };
  const a = point(idx, false);
  const b = point(idx + target.length, true);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

function unwrap(mark: Element) {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
  parent.removeChild(mark);
  parent.normalize();
}

/* Passage wrapper that lets the candidate highlight text like the real
   computer-delivered IELTS: drag to select → "Highlight", click a highlight
   to remove it, or clear them all. Highlights live in the DOM for the current
   passage view (reset when switching passages). */
function Highlightable({
  className,
  children,
  innerRef,
}: {
  className?: string;
  children: React.ReactNode;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = innerRef ?? internalRef;
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);
  const [hasHighlights, setHasHighlights] = useState(false);

  const refresh = () => setHasHighlights(!!ref.current?.querySelector('mark.ielts-hl'));

  function onMouseUp() {
    const sel = window.getSelection();
    const host = ref.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !host) return setPopover(null);
    const range = sel.getRangeAt(0);
    if (!host.contains(range.commonAncestorContainer)) return setPopover(null);
    const rect = range.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    setPopover({ x: rect.left - hostRect.left + rect.width / 2, y: rect.top - hostRect.top });
  }

  function applyHighlight() {
    const sel = window.getSelection();
    const host = ref.current;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !host) return;
    wrapRange(sel.getRangeAt(0), host);
    sel.removeAllRanges();
    setPopover(null);
    refresh();
  }

  function onClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest?.('mark.ielts-hl');
    if (!mark || !ref.current?.contains(mark)) return;
    unwrap(mark);
    refresh();
  }

  function clearAll() {
    ref.current?.querySelectorAll('mark.ielts-hl').forEach(unwrap);
    setHasHighlights(false);
    setPopover(null);
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`} onMouseUp={onMouseUp} onClick={onClick}>
      <style>{`mark.ielts-hl{background-color:#fde68a;color:#1f2937;border-radius:2px;padding:0 1px;cursor:pointer}mark.ielts-evidence{background-color:#bfdbfe;color:#10243b;border-radius:2px;padding:0 1px;box-shadow:0 0 0 1px rgba(37,99,235,.35);animation:ielts-eviflash .9s ease-out}@keyframes ielts-eviflash{0%{background-color:#fde68a}100%{background-color:#bfdbfe}}`}</style>
      {hasHighlights && (
        <button
          type="button"
          onClick={clearAll}
          className="absolute right-2 top-2 z-10 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-muted backdrop-blur hover:text-ink"
        >
          Clear highlights
        </button>
      )}
      {children}
      {popover && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyHighlight}
          className="absolute z-20 -translate-x-1/2 -translate-y-full rounded-full bg-ink px-3 py-1 text-xs font-bold text-white shadow-card"
          style={{ left: popover.x, top: popover.y - 6 }}
        >
          🖍 Highlight
        </button>
      )}
    </div>
  );
}

/** Drill ids are always built by drills.ts as `${sourceTestId}-drill-p${n}`,
    so the 1-based part number can be read straight off the id instead of the
    part's own (differently-worded, being renamed elsewhere) label string. */
function drillPartNumber(testId: string): number | null {
  const m = testId.match(/-drill-p(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** The shared listening recording, in one of two very different modes per
    the house rule "trainers coach with every aid, tests are bare exam
    conditions":
    - drill: full native controls (play/pause/seek/replay). If the part
      carries startSeconds it seeks there on load and shows which slice of
      the recording this drill covers; if it carries endSeconds it pauses
      there automatically (seeking further is still allowed).
    - full: bare exam conditions. A single "Start recording" button plays the
      whole recording once from the beginning; no seek bar, no pause, no
      replay, native controls are not rendered at all. */
function ListeningAudio({
  src,
  attemptKind,
  startSeconds,
  endSeconds,
  drillPartNumber: partNumber,
}: {
  src?: string;
  attemptKind: 'full' | 'drill';
  startSeconds?: number;
  endSeconds?: number;
  drillPartNumber: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(src ? 'loading' : 'error');
  const [retry, setRetry] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function retryLoad() {
    if (!src) return;
    setStatus('loading');
    setStarted(false);
    setEnded(false);
    setRetry((n) => n + 1);
  }

  function handleLoadedMetadata() {
    setStatus('ready');
    const el = audioRef.current;
    if (!el) return;
    setDuration(el.duration || 0);
    if (attemptKind === 'drill' && startSeconds != null) {
      el.currentTime = startSeconds;
      setCurrentTime(startSeconds);
    }
  }

  function handleTimeUpdate() {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (attemptKind === 'drill' && endSeconds != null && el.currentTime >= endSeconds) {
      el.pause();
    }
  }

  function startRecording() {
    setStarted(true);
    audioRef.current?.play();
  }

  const rangeNote =
    attemptKind === 'drill' && startSeconds != null
      ? `This drill covers ${partNumber != null ? `Part ${partNumber}` : 'one part'} of the recording (${fmtClock(startSeconds)} to ${fmtClock(endSeconds ?? duration)}).`
      : null;

  // Before a full exam's recording is started, this bar is the candidate's
  // only cue that pressing the button is a real, one-shot exam action, so it
  // gets a touch more room to read as a considered instruction rather than a
  // throwaway toolbar control. Once playing, it settles back to the same
  // compact bar the drill uses.
  const examGate = attemptKind === 'full' && !started;

  return (
    <section
      className={`shrink-0 border-b border-border bg-surface-alt px-3 sm:px-4 ${examGate ? 'py-4' : 'py-2.5'}`}
      aria-label="Listening recording"
      data-testid="listening-audio-player"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
        <div className="shrink-0 sm:w-44">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,var(--color-brand))]">
            {attemptKind === 'drill' ? 'Drill recording' : 'Full recording'}
          </p>
          <p className="text-xs text-ink-muted">
            {attemptKind === 'drill' ? 'Pause and replay freely' : 'Plays once, exam conditions'}
          </p>
        </div>

        {src && attemptKind === 'drill' && (
          <audio
            key={retry}
            ref={audioRef}
            controls
            controlsList="nodownload noplaybackrate"
            preload="metadata"
            src={src}
            className="h-10 w-full min-w-0 shrink-0 sm:w-auto sm:flex-1"
            aria-label="Drill recording"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setStatus('error')}
          />
        )}

        {src && attemptKind === 'full' && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* No `controls`: bare exam conditions render only the button and
                readout below, never native seek/pause/replay affordances. */}
            <audio
              key={retry}
              ref={audioRef}
              preload="metadata"
              src={src}
              className="hidden"
              aria-hidden="true"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setEnded(true)}
              onError={() => setStatus('error')}
            />
            {!started ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={status !== 'ready'}
                className="rounded-button bg-[var(--skill,var(--color-brand))] px-5 py-2 font-display text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                ▶ Start recording
              </button>
            ) : (
              <span className="font-mono text-sm font-semibold text-ink" aria-live="polite">
                {ended ? 'Recording finished' : 'Recording playing'} · {fmtClock(currentTime)} / {fmtClock(duration)}
              </span>
            )}
          </div>
        )}

        {!src && <div className="flex-1" />}

        <div className="min-h-5 shrink-0 text-xs sm:w-36 sm:text-right" aria-live="polite">
          {status === 'loading' && <span className="text-ink-muted">Loading recording...</span>}
          {status === 'ready' && !started && attemptKind === 'drill' && <span className="text-success">Recording ready</span>}
          {status === 'error' && (
            <span className="text-error">
              Recording unavailable.{' '}
              {src && (
                <button type="button" onClick={retryLoad} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      {rangeNote && <p className="mx-auto mt-1.5 max-w-5xl text-xs text-ink-muted">{rangeNote}</p>}
    </section>
  );
}

/** A single numbered question that requires several choices and earns one
    mark only when the complete unordered set is correct. */
function PerQuestionMultiAnswer({
  question,
  number,
  choices,
  value,
  submitted,
  onChange,
}: {
  question: Question;
  number: number;
  choices: NonNullable<QuestionGroup['choices']>;
  value: string;
  submitted: boolean;
  onChange: (value: string) => void;
}) {
  const config = question.multiSelect!;
  const selected = value.split('|').filter(Boolean);
  const selectedSet = new Set(selected);
  const correctSet = new Set(config.correctValues);

  function toggle(choice: string) {
    if (submitted) return;
    const next = selectedSet.has(choice)
      ? selected.filter((value) => value !== choice)
      : selected.length < config.selectCount
        ? [...selected, choice]
        : selected;
    onChange([...next].sort().join('|'));
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4 pr-7">
        <p className="text-[0.95rem] leading-relaxed">
          <strong className="mr-1">{number}.</strong>
          <Html as="span" html={question.textHtml ?? ''} />
        </p>
        <span className="shrink-0 text-xs font-semibold text-ink-muted">
          {selected.length}/{config.selectCount} selected
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {choices.map((choice) => {
          const chosen = selectedSet.has(choice.value);
          const correct = correctSet.has(choice.value);
          const atCap = !chosen && selected.length >= config.selectCount;
          const stateClass = submitted
            ? correct
              ? 'border-success bg-success-tint'
              : chosen
                ? 'border-error bg-error-tint'
                : 'border-border opacity-55'
            : chosen
              ? 'border-brand bg-brand-tint'
              : 'border-border hover:border-brand/50';
          return (
            <label
              key={choice.value}
              className={`flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${stateClass} ${
                submitted ? 'cursor-default' : atCap ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={chosen}
                disabled={submitted || atCap}
                onChange={() => toggle(choice.value)}
                className="mt-0.5 accent-[var(--color-brand)]"
              />
              <span><strong className="mr-1">{choice.value}</strong>{choice.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/* Full-screen instructions gate shown before the timer starts. */
function InstructionsScreen({
  test,
  hubUrl,
  onStart,
  attemptKind,
}: {
  test: PracticeTest;
  hubUrl: string;
  onStart: () => void;
  attemptKind: 'full' | 'drill';
}) {
  const listening = test.skill === 'listening';
  const partLabel = listening ? 'parts' : 'passages';
  const numberedTotal = questionCount(test);
  const scoredTotal = test.parts.reduce(
    (total, part) => total + part.groups.reduce(
      (groupTotal, group) => groupTotal + group.questions.filter((question) => question.scored !== false).length,
      0,
    ),
    0,
  );
  const unavailableTotal = numberedTotal - scoredTotal;
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {listening ? 'Listening Practice Test' : 'Reading Test'}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{test.title}</h1>
        <p className="mt-2 text-ink-muted">{test.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.parts.length}</p>
            <p className="text-xs text-ink-muted">{partLabel}</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{numberedTotal}</p>
            <p className="text-xs text-ink-muted">numbered questions</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.durationMinutes}</p>
            <p className="text-xs text-ink-muted">minutes</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">⏱</span>
            <span>The timer starts as soon as you begin and runs continuously.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚫</span>
            <span><strong>You cannot pause.</strong> Refreshing or closing the tab will not stop the clock. You will resume with time already elapsed.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">✍️</span>
            <span>Answer all {scoredTotal} scored questions across {test.parts.length} {partLabel}, then submit. It auto-submits when time runs out.</span>
          </li>
          {unavailableTotal > 0 && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">ℹ️</span>
              <span>{unavailableTotal} numbered question is missing from the published source and is excluded from your score.</span>
            </li>
          )}
          {listening ? (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🎧</span>
              <span>
                {attemptKind === 'drill' ? (
                  <>This is a single-part drill. You can <strong>play, pause, seek and replay</strong> the recording as many times as you like while you practise.</>
                ) : (
                  <>
                    This is exam conditions: press <strong>Start recording</strong> when ready and it plays <strong>once</strong>, from the beginning, with no pausing, seeking or replaying.
                    Refreshing keeps your answers and running timer, but restarts the recording from the beginning.
                  </>
                )}
              </span>
            </li>
          ) : (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🖍</span>
              <span>Select any text in a passage to <strong>highlight</strong> it, just like the real computer test. Click a highlight to remove it.</span>
            </li>
          )}
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚩</span>
            <span>Not sure about an answer? <strong>Flag it</strong> and jump back later using the numbered circles at the bottom.</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">📊</span>
            <span>
              At the end you get a score, an estimated band, and a full <strong>answer review</strong>
              {listening ? ', including the transcript.' : ', with every question explained with the exact line from the passage.'}
            </span>
          </li>
        </ul>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            Back
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            Start test
          </button>
        </div>
      </div>
    </div>
  );
}
