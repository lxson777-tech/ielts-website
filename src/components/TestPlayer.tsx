import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { PracticeTest, Question, QuestionGroup, QuestionType, TestPart, TestSkill } from '../lib/tests/schema';
import {
  acceptedVariants,
  answerLeniency,
  bandEstimate,
  bandMidpoint,
  isCorrect,
  practiceTestDescription,
  practiceTestTitle,
  questionCount,
  scoredQuestionIds,
} from '../lib/tests/schema';
import { recordTestAttempt } from '../lib/progress';
import {
  activeSession,
  currentSessionOwner,
  isTestSessionStorageKey,
  ownerStillCurrent,
  paperClockAt,
  paperFinishLoss,
  paperMayBeRecorded,
  secondsLeft,
  sittingRefOf,
  standaloneSitting,
  type PaperSittingRef,
  type SittingLoss,
  type TestSession,
} from '../lib/test-session';
import { isActiveMockStorageKey, mockLegSitting, type MockSittingRef } from '../lib/tests/mock';
import { onOwnerChange } from '../lib/store-owner';
import type { ReviewOwnerChange } from '../lib/tutor/review-owner';
import { drillTypes } from '../lib/tests/drills';
import Html from './Html';
import StrategyPanel from './StrategyPanel';
import { LABELS as TYPE_LABELS, lessonHref, practiseHref } from './TypeAnalytics';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import {
  ExplanationsContext,
  baseTestId,
  groupKey,
  useExplanation,
  useExplanations,
} from '../lib/i18n/test-explanations';
import { isBookmarked, toggleBookmark } from '../lib/notes';
import TestDebrief from './tutor/TestDebrief';
import AskWhyWrong from './tutor/AskWhyWrong';
import SessionContinueBar from './learning/SessionContinueBar';
import { recordSubmission, recordUnfinishedAttempt } from '../lib/learning/store.browser';
import {
  attemptActivityId,
  attemptEvidenceMode,
  attemptEvidenceModeFromId,
  baseAttemptId,
  buildQuestionItems,
  isEntirelyBlank,
  paperFromAttemptId,
} from './attempt-recording';

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
  /** Present only when this paper is a leg of a Mock Exam Day sitting
      (MockExam.tsx): the student who started that sitting and its own id.
      The paper's answers and deadline are then kept inside that sitting
      (src/lib/tests/mock.ts, mockLegSitting) and restored only from it, never
      from the one standalone slot a paper opened on its own uses (R2B-03). */
  mockSitting?: MockSittingRef;
  /** Present only with `mockSitting`: told once, when this paper finds its
      mock sitting replaced or gone (a refused save, or its hand-in refused
      before anything was recorded), so the mock screen stops the whole
      sitting with its own sentence (R2D-03). */
  onSittingLost?: (loss: SittingLoss) => void;
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
  const { t } = useT();
  return (
    <div
      role="group"
      aria-label={t('Choose passage')}
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

/** Learner-evidence recording (WP12): a stale TestSession found for some
    other test id, as an evidence event. There is no PracticeTest object for
    that other id here, only what test-session.ts itself kept, which is
    exactly what is honestly known: which paper, roughly how long was spent
    (capped at the session's own clock, never open-ended), and that it was
    never submitted. No items, no score: fabricating either from nothing
    would make an abandoned attempt look like measured evidence, which is
    the one thing the whole evidence layer exists to prevent (architecture
    section 4.1's same rule for the legacy migration). `at` is derived from
    the session's own startedAt, not from now(), so re-discovering the same
    stale session on a later visit to some other test page writes the same
    deterministic id rather than a second row. */
function recordStaleSessionAbandonment(stale: TestSession): void {
  const at = new Date(stale.startedAt).toISOString();
  const cappedEnd = Math.min(Date.now(), stale.endsAt);
  const secondsUsed = Math.max(0, Math.round((cappedEnd - stale.startedAt) / 1000));
  const expired = Date.now() >= stale.endsAt;
  const baseId = baseAttemptId(stale.testId);
  recordUnfinishedAttempt({
    activityId: attemptActivityId(stale.testId),
    paper: paperFromAttemptId(stale.testId),
    at,
    mode: attemptEvidenceModeFromId(stale.testId),
    completion: expired ? 'expired' : 'abandoned',
    secondsUsed,
    sourceTestId: baseId,
  });
}

export default function TestPlayer({ test, hubUrl, attemptKind = 'full', onFinish, mockSitting, onSittingLost }: Props) {
  /* Interface language. Declared first so every hook below keeps a stable
     order, and read as `t`/`tn` only for text: nothing in the timer, the
     session or the scoring reads it. */
  const { t, tn, locale } = useT();
  const numbered = useMemo(() => numberQuestions(test), [test]);
  const TOTAL = numbered.length;
  const SCORED_TOTAL = numbered.filter(({ question }) => question.scored !== false).length;
  const isRetake = !!onFinish;

  /* WHERE THIS PAPER'S SITTING IS KEPT (R2B-03). A leg of a mock sitting is
     kept inside that sitting, found by its identity; any other paper uses the
     one standalone slot. Everything below restores, saves and finishes
     through this and never through the storage directly, so a mock leg and a
     paper opened on its own can no longer overwrite, or pick up, each other. */
  const mockOwner = mockSitting?.owner ?? '';
  const mockSittingId = mockSitting?.sittingId ?? '';
  const sittingStore = useMemo(
    () =>
      mockSittingId
        ? mockLegSitting({ owner: mockOwner, sittingId: mockSittingId }, test)
        : standaloneSitting(test),
    [test, mockOwner, mockSittingId],
  );

  // Resume an in-progress session if one exists (survives refresh / tab close).
  const resumed = useMemo(
    () => (typeof window !== 'undefined' ? sittingStore.load() : null),
    [sittingStore],
  );

  /* WHOSE SITTING THIS IS (finding 1 of the 23 September 2026 review).
     Captured the moment this player picks a sitting up, and never read off
     storage again: a sitting is bound to the student who started it for as
     long as it is on screen. Everything that saves, submits or clears
     checks against it first, so a sign-out or a sign-in in another tab can
     never turn one student's answers into another student's result.
     `resumed.owner` is preferred where a resumed sitting names one, so a
     refresh keeps the same binding rather than quietly re-deciding it. */
  const sittingOwnerRef = useRef<string>(
    typeof window === 'undefined' ? '' : mockOwner || (resumed?.owner ?? currentSessionOwner()),
  );
  /* Set when the owner changes while this player is mounted. 'signed-out'
     when nobody is signed in now, 'other-student' when somebody else is.
     Either way the sitting stops where it is and nothing is submitted. */
  const [ownerChange, setOwnerChange] = useState<'signed-out' | 'other-student' | null>(null);
  /** Which of the two account changes this browser is in now. */
  const ownerChangeNow = (): 'signed-out' | 'other-student' =>
    currentSessionOwner().startsWith('u:') ? 'other-student' : 'signed-out';
  /* THE REVIEW, WITHHELD BY THE TUTOR'S OWN CHECK (sixth Codex round,
     R2E-02). A request to Mr EZ from the review is bound to the student who
     sat the paper, and it compares that student with the account whose
     token it would be sent with. When they differ, although this tab has
     not yet been told of any account change (the other tab's sign-in
     arrives here a moment later, or not at all), nothing is sent and this
     is set: the review leaves the screen for the same stopped screen an
     account change shows, and stays off it in this tab. */
  const [reviewWithheld, setReviewWithheld] = useState<ReviewOwnerChange | null>(null);

  /* WHICH SITTING THIS IS (fifth Codex round, R2D-02). The identity of the
     sitting on screen (its paper and its own sitting id), taken when it is
     picked up or started and never read off storage again. Every save and
     the hand-in name it, and the store writes only into that very sitting,
     so a paper left open in one tab can never overwrite, or clear, a newer
     sitting the same student started in another tab. Null before the paper
     starts. */
  const sittingRef = useRef<PaperSittingRef | null>(
    typeof window === 'undefined' || !resumed ? null : sittingRefOf(resumed),
  );
  /* THIS SITTING IS OVER IN THIS TAB, FOR GOOD (R2D-02, R2D-03): replaced by
     a newer sitting started in another tab, or gone after it was written
     down (handed in, or added to an account, in another tab). Noticed on the
     storage event another tab's write raises (a paper on its own; a mock
     paper's is the mock screen's to hear), on a refused save, and when the
     paper is handed in. From then on nothing is saved, cleared or recorded,
     and the screen says why. Kept as a ref as well for the listeners that
     must read it the moment it is set. */
  const [lost, setLost] = useState<SittingLoss | null>(null);
  const lostRef = useRef<SittingLoss | null>(null);
  /* Set inside the answers updater when the save of that keystroke was
     refused, and looked into by an effect once the render has happened (a
     state update from inside an updater is not allowed). */
  const saveRefusedRef = useRef(false);
  function stopAsLost(loss: SittingLoss) {
    if (lostRef.current) return;
    lostRef.current = loss;
    setLost(loss);
    onSittingLost?.(loss);
  }
  /** Whether the sitting on screen is lost, checking the store now. True
      once it is (and it then stays so). */
  function noticeLost(): boolean {
    if (lostRef.current) return true;
    if (submittedRef.current) return false;
    const loss = sittingStore.lost(sittingOwnerRef.current, sittingRef.current);
    if (!loss) return false;
    stopAsLost(loss);
    return true;
  }

  /* THE PAPER'S DEADLINE, THE CLOCK'S ONLY AUTHORITY (R2C-03). The saved
     `endsAt` of the sitting on screen, taken from the store when the sitting
     is picked up or started, and null before it starts. Every reading of the
     clock (each tick, the sitting's own student coming back to this open
     page, and handing the paper in) is worked out from it and the moment of
     reading, never by counting down a number, so time that passed while the
     student was away, or while this tab sat in the background, is never
     handed back. See paperClockAt in src/lib/test-session.ts. */
  const deadlineRef = useRef<number | null>(
    typeof window === 'undefined' ? null : (resumed?.endsAt ?? null),
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
  // Learner-evidence recording (WP12): question ids that had drill-mode help
  // available and actually used before their answer was settled: the
  // strategy panel opened, or the recording replayed/sought past its first
  // play. Recorded as `assistance: 'hint'` on exactly those items; every
  // other item stays 'none'. A timed full paper or the mock never offers
  // this help in the first place (see ListeningAudio and the
  // attemptKind === 'drill' guard on StrategyPanel below), so this set stays
  // empty there regardless.
  const [assistedIds, setAssistedIds] = useState<Set<string>>(new Set());
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

  /* Learner-evidence recording (WP12): drill-mode help, marked on exactly
     the items it applied to. A strategy panel is per question group, so
     opening it assists every question in that group; a replayed or sought
     recording covers the one shared passage/section, so it assists every
     scored question in the drill. Both are no-ops once the paper is
     submitted (nothing left to mark), and neither is ever wired up outside
     attemptKind === 'drill' (see the render below), so a timed full paper
     or the mock can never pick up help it was never offered. */
  function markGroupAssisted(group: QuestionGroup) {
    if (submittedRef.current) return;
    setAssistedIds((prev) => {
      const ids = group.questions.map((q) => q.id).filter((id) => !prev.has(id));
      if (ids.length === 0) return prev;
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

  function markAllAssisted() {
    if (submittedRef.current) return;
    setAssistedIds((prev) => {
      const ids = numbered.map((nq) => nq.question.id).filter((id) => !prev.has(id));
      if (ids.length === 0) return prev;
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }

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
    /* A mock leg always belongs to the student who started the mock. */
    sittingOwnerRef.current = mockOwner || currentSessionOwner();
    const s = sittingStore.start();
    sittingRef.current = sittingRefOf(s);
    deadlineRef.current = s.endsAt;
    setTimeLeft(secondsLeft(s));
    setStarted(true);
  }

  /* "Start fresh" on the owner-changed screen: throw away what is on screen
     (it is still saved under the student who typed it, untouched) and hand
     the paper to whoever is using this browser now, from the beginning. A
     retake has no instructions gate to fall back to, so it starts straight
     away, exactly as it did when it was opened. */
  function startFreshUnderCurrentOwner() {
    submittedRef.current = false;
    setSubmitted(false);
    setShowScore(false);
    setAnswers({});
    setFlagged(new Set());
    setAssistedIds(new Set());
    setConfirmSubmit(false);
    setByTypeStats(null);
    setActivePart(0);
    /* A review the previous student left open goes with everything of it:
       a retake of it, what that retake fixed, and the review's own filter
       (R2E-02). */
    setRetake(null);
    setRetakeResult(null);
    setReviewFilter('all');
    setReviewWithheld(null);
    setOwnerChange(null);
    /* The previous student's deadline and sitting go with their sitting; the
       paper gets its own when it is started for whoever is here now. */
    deadlineRef.current = null;
    sittingRef.current = null;
    if (isRetake) {
      start();
      return;
    }
    sittingOwnerRef.current = currentSessionOwner();
    setTimeLeft(test.durationMinutes * 60);
    setStarted(false);
  }

  /* Retake mode starts immediately (see `started`'s initializer above) but
     still needs its own session/timer set up the same way the Start-test
     button would have done, so the countdown and resume-on-refresh behaviour
     both work normally within the retake. */
  useEffect(() => {
    if (isRetake && !resumed) {
      sittingOwnerRef.current = mockOwner || currentSessionOwner();
      const s = sittingStore.start();
      sittingRef.current = sittingRefOf(s);
      deadlineRef.current = s.endsAt;
      setTimeLeft(secondsLeft(s));
      /* A paper of a mock that another tab of the same sitting handed in
         just before this one opened is refused a fresh start (a result is
         never started over), and is stopped at once rather than sat for
         nothing (R2E-03). A fresh start that landed reads as held. */
      if (mockSittingId) noticeLost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Learner-evidence recording (WP12): a paper or drill "starting" IS the
     TestSession written by sittingStore.start() (above, and in start()),
     there is no separate started marker to write. What needs catching here
     is the other half: a student who opened a DIFFERENT test, left without
     submitting, and is only now loading a test page again. test-session.ts
     keeps a single session at a time, so if one is sitting there for some
     OTHER test id the moment this instance mounts, that is exactly the
     "detect on the next load" case. Recording it, once, as abandoned (or
     expired, if its clock had already run out while nobody was looking) is
     the only reliable place to catch it, since a beforeunload handler is not
     guaranteed to run (a killed tab, a crashed browser). The stale session
     itself is left untouched: clearing it here would break a legitimate
     "come back to this exact test" resume later, and the deterministic id
     below means finding the same stale session again on some other test
     page is harmless, it re-records the identical row, not a new one.

     Not for a mock leg (R2B-03): it is kept inside its own mock sitting and
     never replaces the standalone slot, so opening it abandons nothing that
     was sitting there. */
  useEffect(() => {
    if (mockSittingId) return;
    const stale = activeSession();
    if (stale && stale.testId !== test.id) recordStaleSessionAbandonment(stale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The owner changed while this player was on screen: a sign-out here, or a
     sign-in, sign-out or account switch in another tab (store-owner.ts's
     onOwnerChange fires for all of them). The sitting on screen belongs to
     whoever started it, so it stops here: the timer is frozen by
     `ownerChange`, nothing more is saved, and handleSubmit refuses. Nothing
     is deleted, and nothing is written under the new owner: the answers stay
     in the previous student's own scoped key, exactly as they were, ready
     for them to resume when they sign back in.

     A SUBMITTED PAPER IS NOT LEFT ALONE (sixth Codex round, R2E-02). Its
     result is already recorded under the owner who sat it, but the review
     on top of it is that student's answers, score and per-question review,
     held in this component's memory, which no namespace protects. Left on
     screen after a switch, the next student read the previous student's
     answers and could ask Mr EZ about them with their own account. So the
     review belongs to the student who sat the paper: once somebody else is
     using this browser it leaves the screen (every answer, the score and
     every tutor control) for the owner-changed stopped screen, and it
     comes back only when that same student is the one using it again. */
  useEffect(() => {
    return onOwnerChange(() => {
      /* A sitting that is over in this tab stays over (R2D-02). */
      if (lostRef.current) return;
      if (submittedRef.current) {
        setOwnerChange(ownerStillCurrent(sittingOwnerRef.current) ? null : ownerChangeNow());
        return;
      }
      if (!startedRef.current) {
        /* Still on the instructions gate: there is no sitting yet, so the
           new student simply gets the paper, with no interruption at all. */
        sittingOwnerRef.current = currentSessionOwner();
        setOwnerChange(null);
        return;
      }
      if (ownerStillCurrent(sittingOwnerRef.current)) {
        /* The sitting's own student is back on this still-open page (R2C-03).
           The deadline kept running while they were away, so the time left
           is read again from it rather than picked up from the frozen
           number. A deadline that passed meanwhile reads as time up, and the
           timer below, which restarts as the stopped screen goes, hands the
           paper in on its first reading, exactly as it does for an expired
           sitting found on a fresh load. No time is given back. */
        const deadline = deadlineRef.current;
        if (deadline !== null) setTimeLeft(paperClockAt(deadline).secondsLeft);
        setOwnerChange(null);
        /* While they were away the sitting may have been replaced, or taken
           away (added to an account in another tab): then this tab stops
           for good rather than carrying on unsaved (R2D-02). */
        noticeLost();
        return;
      }
      setOwnerChange(ownerChangeNow());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ANOTHER TAB WROTE, OR REMOVED, THIS STUDENT'S SITTING (R2D-02). A paper
     opened on its own listens for the storage event another tab's write
     raises on the one standalone slot: a newer sitting started there
     replaces this one, and this one handed in there (or added to an
     account) is gone. Either stops this tab for good. A write of this same
     sitting (the same paper carrying on in another tab) stops nothing.

     A mock's paper listens on the mock's own record (R2E-03). The mock
     screen watches the SITTING and stops the whole mock when it is replaced
     or gone, but it cannot see that THIS PAPER inside a sitting that is
     still written down was handed in from another tab that had picked up
     the same sitting. The paper's own store can (mockLegSitting's `lost`
     reads the paper's state as well), so a stale paper stops here on the
     other tab's hand-in, before it can hand the paper in over it. */
  useEffect(() => {
    if (!started || submitted || lost) return;
    const onStorage = (event: StorageEvent) => {
      const ours = mockSittingId ? isActiveMockStorageKey(event.key) : isTestSessionStorageKey(event.key);
      if (!ours) return;
      noticeLost();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, lost, mockSittingId]);

  /* `started` as a ref, so the owner-change listener above (subscribed once,
     on mount) reads today's value rather than the one it closed over. */
  const startedRef = useRef(started);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);

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
    if (submittedRef.current || lostRef.current) return;
    setAnswers((prev) => {
      const next = { ...prev };
      // Store exactly what was typed — trimming here eats the space the
      // student just typed (controlled input), blocking multi-word answers.
      // Normalisation happens once, at scoring time (isCorrect).
      if (value) next[qid] = value;
      else delete next[qid];
      /* Bound to the student who started this sitting: once somebody else is
         signed in on this browser, the save writes nothing at all rather
         than dropping this keystroke into their key. And bound to THIS
         sitting (R2D-02): once another tab's sitting has taken the slot, or
         this one is gone, it writes nothing either, and the effect below
         finds out why. */
      if (!sittingStore.save(next, sittingOwnerRef.current, sittingRef.current)) saveRefusedRef.current = true;
      return next;
    });
  }

  /* A keystroke's save was refused: if that is because the sitting was
     replaced or is gone (a storage event this tab missed), stop here for
     good (R2D-02). Any other refusal (the account changed, which has its own
     listener; no room left on the device) changes nothing on screen. */
  useEffect(() => {
    if (!saveRefusedRef.current) return;
    saveRefusedRef.current = false;
    noticeLost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers]);

  function handleSubmit() {
    if (submittedRef.current || lostRef.current) return;
    /* The one rule that closes finding 1 of the 23 September 2026 review: a
       result is recorded under the student who SAT the paper, and only while
       that student is still the one using this browser. A sitting that
       outlived its owner (they signed out, or somebody else signed in) is
       not submitted at all: it stays saved under its own owner and the
       screen says so. */
    if (!ownerStillCurrent(sittingOwnerRef.current)) {
      setOwnerChange(ownerChangeNow());
      return;
    }
    /* The time used is read from the deadline at the moment of handing in,
       never from the number on screen, which can be behind it (R2C-03). */
    const deadline = deadlineRef.current;
    const left = deadline !== null ? paperClockAt(deadline).secondsLeft : timeLeft;
    const raw = scoredIds.size;
    const byType: Record<string, { correct: number; total: number }> = {};
    for (const { question, group } of numbered) {
      if (question.scored === false) continue;
      const t = byType[group.type] ?? (byType[group.type] = { correct: 0, total: 0 });
      t.total += 1;
      if (scoredIds.has(question.id)) t.correct += 1;
    }
    const at = new Date().toISOString();
    const outcome = {
      raw,
      total: SCORED_TOTAL,
      band: bandMidpoint(raw, SCORED_TOTAL, test.skill),
      bandLabel: bandEstimate(raw, SCORED_TOTAL, test.skill),
      secondsUsed: test.durationMinutes * 60 - left,
    };

    /* FINALISED BEFORE ANYTHING IS RECORDED (fifth Codex round, R2D-02). The
       store first checks that the sitting on screen is still this tab's own,
       live one (the same student, the same paper, the same sitting) and only
       then finishes it: the standalone slot is cleared, or a mock paper's
       result is kept inside its own mock sitting (R2B-03). A sitting that a
       newer one replaced in another tab, or that is gone (handed in, or
       added to an account, in another tab), is refused here, and NOTHING is
       recorded anywhere: not in the progress history, not in the learner
       evidence, and nothing is cleared. The tab stops for good and says why.
       A paper this browser never managed to write down ('unsaved') has
       nothing to finalise and no other tab can have it, so it is recorded
       as before.

       A PAPER OF A MOCK IS HANDED IN ONCE (sixth Codex round, R2E-03). Two
       tabs that picked up the same mock sitting hold the same paper, and the
       sitting reads as theirs in both. The first hand-in is final: a second
       one is refused as 'handed-in', the first result stays, and this tab
       records nothing, exactly like a lost sitting. Only the first accepted
       completion reaches the history and the evidence (paperMayBeRecorded). */
    const finished = sittingStore.finish(sittingOwnerRef.current, outcome, sittingRef.current);
    const refusedAs = paperFinishLoss(finished);
    if (refusedAs) {
      stopAsLost(refusedAs);
      return;
    }
    if (finished === 'owner-changed') {
      setOwnerChange(ownerChangeNow());
      return;
    }
    if (!paperMayBeRecorded(finished)) return;
    submittedRef.current = true;
    setSubmitted(true);
    setShowScore(true);
    setTimeLeft(left);
    recordTestAttempt(test.id, {
      at,
      ...outcome,
      byType,
      kind: attemptKind,
      skill: test.skill,
    });
    setByTypeStats(byType);

    /* Learner-evidence recording (WP12), written alongside the row above,
       never instead of it: per-item detail for every scored question the
       student saw (buildQuestionItems includes the blank ones too, which is
       what makes exposure honest and a wholly-empty paper detectable as
       `blank` rather than "attempted and got zero"). `baseId` is the real
       paper's own id: for a retake that is the ORIGINAL paper it retries,
       not its synthetic "-retake" id, so the store's own retry detection
       (store.browser.ts's earlierAttempt, matched by shared item ids) links
       this event to the first attempt automatically: no explicit retryOf is
       passed. attemptEvidenceMode turns attemptKind straight into the right
       mode: a retake is always rendered with attemptKind="drill" regardless
       of what it retries (see buildRetakeTest / the nested render below), so
       this one flag already keeps a mock leg (attemptKind="full") assessed
       and a retake practised, exactly as required. */
    const baseId = baseAttemptId(test.id);
    const items = buildQuestionItems(baseId, numbered, answers, scoredIds, assistedIds);
    const blank = isEntirelyBlank(numbered, answers);
    recordSubmission({
      activityId: attemptActivityId(test.id),
      paper: test.skill,
      at,
      mode: attemptEvidenceMode(attemptKind),
      completion: blank ? 'blank' : 'completed',
      items,
      raw,
      total: SCORED_TOTAL,
      bandEstimate: attemptKind === 'full' ? bandMidpoint(raw, SCORED_TOTAL, test.skill) : undefined,
      secondsUsed: test.durationMinutes * 60 - left,
      sourceTestId: baseId,
    });
    // The in-progress sitting was already finished above, before anything
    // was recorded. onFinish itself is wired to the score modal's "Back to
    // results" button, not called here: the retake still shows its own
    // score and review first.
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

  /* The submit the timer calls when time is up: always this render's, so
     the paper is handed in with the answers on screen at that moment. The
     timer below is set up once per run and would otherwise keep the submit
     (and the answers) of the render it was set up in, so a paper that ran
     out of time was handed in without the answers typed after that. */
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  });

  /* Timer: runs only once started, auto-submits when time is up. Every tick
     reads the clock from the saved deadline (R2C-03), so a tab the browser
     slowed down in the background, or a sitting whose student was away,
     shows the time that is really left rather than a count that fell
     behind; the first reading happens at once, so the clock is right the
     moment the timer (re)starts. Stopped while the owner is changed: a clock
     that ran on would hand the previous student's paper in under whoever is
     signed in now. Nothing is lost by stopping it, since the deadline itself
     never stops. Stopped for good once the sitting is lost (R2D-02): there
     is nothing left in this tab to hand in. */
  useEffect(() => {
    if (!started || submitted || ownerChange || lost) return;
    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const clock = paperClockAt(deadline);
      setTimeLeft(clock.secondsLeft);
      if (clock.timeUp) {
        window.clearInterval(id);
        submitRef.current();
      }
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [started, submitted, ownerChange, lost]);

  /* Flag a running paper on <body> so the Mr EZ tutor panel switches to
     invigilator mode (see readPlace() in src/components/tutor/MrEzPanel.tsx).
     The first line of defence is that this route uses the `bare` layout, so
     the panel is not mounted here at all; this is the second, which keeps the
     rule true if the test player is ever embedded somewhere that does have
     the workspace chrome. Cleared on unmount so it cannot stick on. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (started && !submitted && !lost) document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [started, submitted, lost]);

  /* Warn before leaving an in-progress test (can't pause). A sitting that is
     over in this tab has nothing left to lose. */
  useEffect(() => {
    if (!started || submitted || lost) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [started, submitted, lost]);

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
    ? t('Questions {from}-{to}', { from: partItems[0]!.n, to: partItems[partItems.length - 1]!.n })
    : t('Questions');
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
  /* WHOSE REVIEW MR EZ IS ASKED ABOUT (R2E-02): the student who sat the
     paper, never whoever holds the token at the moment of the press. Both
     review requests carry this owner and are refused, sending nothing, once
     it is not the one using this browser; a refusal withholds the review. */
  const tutorOwner = sittingOwnerRef.current;

  /* The student's own language for the answer notes (src/lib/i18n/
     test-explanations.ts). Three things are worth knowing here:
       - `submitted` is the switch. Nothing is downloaded while the paper
         is being sat, because nothing shows an explanation until then;
       - a retake reuses its parent's notes, hence baseTestId: its id has
         a "-retake" suffix with no published file behind it, and its
         questions are the very same objects;
       - an English student never enters this at all (the hook returns the
         English unchanged and makes no request). */
  const explain = useExplanations(baseTestId(test.id), locale, submitted);

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

  /* ── The sitting on screen is over in this tab, for good (R2D-02) ──
     Checked before the account change below because it cannot be undone:
     the sitting is no longer written down as this tab's, so neither "carry
     on when you sign back in" nor "start fresh" (which would replace the
     other tab's newer sitting) would be true here. */
  if (lost) {
    return (
      <SittingStoppedScreen
        reason={lost}
        inMock={!!mockSittingId}
        paperTitle={practiceTestTitle(test, t)}
        hubUrl={hubUrl}
        onStartFresh={startFreshUnderCurrentOwner}
      />
    );
  }

  /* ── The sitting on screen belongs to somebody else now ──
     A handed-in paper's review as well as an unfinished sitting (R2E-02):
     its answers, its score, the per-question review and every Mr EZ
     control leave the screen together, since this is returned INSTEAD of
     all of them. A review withheld by the tutor's own owner check shows the
     same screen. */
  const accountChanged = ownerChange ?? reviewWithheld;
  if (accountChanged) {
    return (
      <SittingStoppedScreen
        reason={accountChanged}
        review={submitted}
        inMock={!!mockSittingId}
        paperTitle={practiceTestTitle(test, t)}
        hubUrl={hubUrl}
        onStartFresh={startFreshUnderCurrentOwner}
      />
    );
  }

  /* ── Instructions gate — timer does not run until Start ── */
  if (!started) {
    return <InstructionsScreen test={test} hubUrl={hubUrl} onStart={start} attemptKind={attemptKind} />;
  }

  return (
    <ExplanationsContext.Provider value={explain}>
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
          {/* "Tests" is the workspace tab's own word, translated once in
              dict/ru/shell.ts — no second entry here. */}
          <span>{t('Tests')}</span>
        </a>
        <span className="hidden truncate font-display text-sm font-bold md:block">{practiceTestTitle(test, t)}</span>
        <div
          className={`tp-timer mx-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold sm:gap-2 sm:px-4 ${
            timerWarn ? 'animate-pulse bg-error-tint text-error' : 'bg-surface-alt text-ink'
          }`}
          role="timer"
          aria-label={t('Time remaining')}
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
          {/* "Review" here means "take me to the question list to check my
              answers". The study plan uses the same English word for revising
              a lesson, so this one carries a context (docs/I18N-GUIDE.md). */}
          {t('Review', undefined, 'test player')}
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
            {t('Score')}
          </button>
        )}
        <button
          type="button"
          onClick={requestSubmit}
          disabled={submitted}
          className="shrink-0 rounded-button bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50 sm:px-4"
        >
          {t('Submit')}
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
              {tn(unansweredCount, {
                one: 'You have {n} unanswered question. Submit anyway?',
                other: 'You have {n} unanswered questions. Submit anyway?',
              })}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="rounded-button border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-alt"
              >
                {t('Go back')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-button bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                {t('Submit')}
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
              {t('You fixed {fixed} of {total}.', { fixed: retakeResult.fixed, total: retakeResult.total })}
            </p>
            <button
              type="button"
              onClick={() => setRetakeResult(null)}
              className="rounded-button border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-alt"
            >
              {t('Dismiss')}
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
          onAssistanceUsed={markAllAssisted}
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
          <BookIcon /> {stimulus.kind === 'passage' ? t('Passage') : t('Question paper')}
        </button>
        <button
          type="button"
          onClick={() => setMobileView('questions')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
            mobileView === 'questions' ? 'border-brand text-brand' : 'border-transparent text-ink-muted'
          }`}
        >
          <PencilIcon /> {stimulus.kind === 'audio' ? t('Answer sheet') : t('Questions')}{' '}
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
                  <h2 className="font-display text-2xl font-extrabold">{t('Question paper')}</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {t('{label}. Follow the recording and read each task carefully.', { label: stimulus.label })}
                  </p>
                </div>
                <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand">{partRange}</span>
              </div>
              {stimulus.questionHtml ? (
                <Html className="listening-question-paper" html={questionAssets(stimulus.questionHtml)} />
              ) : (
                <p className="rounded-card border border-border bg-surface p-4 text-sm text-ink-muted">
                  {t('The question paper for this section is unavailable.')}
                </p>
              )}
              {submitted && stimulus.transcriptHtml && (
                <details ref={transcriptDetailsRef} className="mt-7 rounded-card border border-border bg-surface-alt p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--skill,var(--color-brand))]">{t('Review transcript')}</summary>
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
          aria-label={t('Resize panes')}
        />

        {/* Questions pane */}
        <div
          ref={questionsRef}
          className={`min-h-0 flex-1 overflow-y-auto md:block ${mobileView === 'questions' ? 'block' : 'hidden'}`}
        >
          <div className="mx-auto max-w-2xl px-5 py-6">
            {stimulus.kind === 'audio' && (
              <div className="mb-7 border-b border-border pb-4">
                <h2 className="font-display text-2xl font-extrabold">{t('Answer sheet')}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {t('{label}. Enter answers for {range}.', {
                    label: stimulus.label,
                    range: partRange.toLowerCase(),
                  })}
                </p>
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
                {t('Do the passages in any order. Your answers are kept when you switch.')}
              </p>
            )}
            {/* Desktop-only keyboard-nav hint (feature 3) — shown only while
                actively answering, never once the test is submitted. */}
            {/* One sentence, one key: Russian puts the keys and the verb in a
                different order, so the two kbd chips that used to sit mid
                sentence became a placeholder rather than three separately
                translated fragments (docs/I18N-GUIDE.md). */}
            {!submitted && (
              <p className="mb-4 hidden text-xs text-ink-muted md:block">
                {t('Tip: press {keys} or the arrow keys to move between questions.', { keys: 'j/k' })}
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
                  <span>{t('Show:')}</span>
                  <div className="inline-flex rounded-full border border-border bg-surface-alt p-0.5">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      aria-pressed={reviewFilter === 'all'}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        reviewFilter === 'all' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('All')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('wrong')}
                      aria-pressed={reviewFilter === 'wrong'}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        reviewFilter === 'wrong' ? 'bg-brand text-white' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t('Wrong only')}
                    </button>
                  </div>
                </div>
                {wrongCount > 0 && !isRetake && (
                  <button
                    type="button"
                    onClick={openRetake}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {tn(wrongCount, {
                      one: 'Retry the {n} you got wrong',
                      other: 'Retry the {n} you got wrong',
                    })}
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
                owner={tutorOwner}
                onOwnerChanged={setReviewWithheld}
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
                  {attemptKind === 'drill' && (
                    <div onClickCapture={() => markGroupAssisted(group)}>
                      <StrategyPanel skill={test.skill} type={group.type} />
                    </div>
                  )}
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
                        tutorOwner={tutorOwner}
                        onTutorOwnerChanged={setReviewWithheld}
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
                  {t('Continue to {part}', { part: test.parts[activePart + 1]!.label })}
                </button>
              ) : (
                <p className="mt-4 text-center text-sm text-ink-muted">
                  {t('This is the last passage. Check your answers, then submit using the Submit button above.')}
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
                /* Built as two whole sentences rather than glued-together
                   fragments, so Russian can order "question 5" and its state
                   its own way. */
                const status = unavailable
                  ? t('unavailable and excluded from score')
                  : answered
                    ? t('answered')
                    : t('unanswered');
                return (
                  <button
                    key={question.id}
                    type="button"
                    data-qid={question.id}
                    onClick={() => jumpToQuestion(question.id)}
                    aria-label={
                      isFlagged
                        ? t('Jump to question {n}, {status}, flagged for review', { n, status })
                        : t('Jump to question {n}, {status}', { n, status })
                    }
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
              className="test-result-overlay fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="test-result-panel w-full max-w-sm rounded-card bg-surface p-8 text-center shadow-card-hover"
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <h2 className="font-display text-xl font-extrabold">{t('Your Score')}</h2>
                <p className="band-score-pop mt-4 font-display text-5xl font-extrabold text-brand">
                  {correctCount} / {SCORED_TOTAL}
                </p>
                <p className="mt-2 text-ink-muted">
                  {t('{percent}% correct', { percent: Math.round((correctCount / SCORED_TOTAL) * 100) })}
                </p>
                <p className="mt-3 inline-block rounded-full bg-brand-tint px-4 py-1.5 font-display font-bold text-brand">
                  {/* bandEstimate returns a number like "7.0", or the one
                      phrase "below 2.5" (marked with nt() in tests/schema.ts),
                      so it goes through t() rather than being printed raw. */}
                  {t('Estimated Band: {band}', { band: t(bandEstimate(correctCount, SCORED_TOTAL, test.skill)) })}
                </p>
                {weakestType && (
                  <p className="result-focus mt-4 text-left text-sm text-ink-muted">
                    {/* One sentence, one key. The question type name stays in
                        English on purpose (the student meets it in that form on
                        the real paper), and it used to be <strong> mid
                        sentence, which Russian cannot keep in that position. */}
                    {t('Your weakest type in this test: {type}, {correct} of {total} correct.', {
                      type: TYPE_LABELS[weakestType.type] ?? weakestType.type,
                      correct: weakestType.correct,
                      total: weakestType.total,
                    })}{' '}
                    {lessonHref(test.skill, weakestType.type) && (
                      <a href={lessonHref(test.skill, weakestType.type)} className="font-semibold text-brand hover:underline">
                        {t('Review the lesson')}
                      </a>
                    )}
                    {lessonHref(test.skill, weakestType.type) && drillTypes(test.skill).has(weakestType.type) && ' · '}
                    {drillTypes(test.skill).has(weakestType.type) && (
                      <a href={practiseHref(test.skill, weakestType.type)} className="font-semibold text-brand hover:underline">
                        {t('Practise this type')}
                      </a>
                    )}
                  </p>
                )}
                {wrongCount > 0 && !isRetake && (
                  <button
                    type="button"
                    onClick={openRetake}
                    className="result-retry mt-4 w-full rounded-button border border-brand/30 bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand hover:bg-brand-tint/70"
                  >
                    {tn(wrongCount, {
                      one: 'Retry the {n} you got wrong',
                      other: 'Retry the {n} you got wrong',
                    })}
                  </button>
                )}
                {/* Where "next" really goes, read from the student's own
                    session rather than guessed here: continue today's
                    session when this paper was a step of it, and a quiet
                    way back when they opened it themselves. Not on a
                    retake, which is a nested run with its own way out. */}
                {!isRetake && <SessionContinueBar compact activityId={attemptActivityId(test.id)} />}
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowScore(false)}
                    className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
                  >
                    {t('Review Answers')}
                  </button>
                  {isRetake ? (
                    <button
                      type="button"
                      onClick={() => onFinish!(scoredIds)}
                      className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      {t('Back to results')}
                    </button>
                  ) : (
                    <a
                      href={hubUrl}
                      className="result-more rounded-button px-4 py-2 text-sm font-semibold"
                    >
                      {t('More Tests')}
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
    </ExplanationsContext.Provider>
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
  tutorOwner,
  onTutorOwnerChanged,
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
  /** Whose review this is, and what to do when a press is refused because
      it is somebody else's now (see tutorOwner in TestPlayer, R2E-02). */
  tutorOwner?: string;
  onTutorOwnerChanged?: (now: ReviewOwnerChange) => void;
}) {
  const { t } = useT();
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
          aria-label={
            flagged
              ? t('Unflag question {n} for review', { n })
              : t('Flag question {n} for review', { n })
          }
          title={flagged ? t('Unflag for review') : t('Flag for review')}
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
            {t('This question is missing from the published source and is excluded from your score.')}
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
              placeholder={t('Label…')}
              aria-label={t('Question {n}', { n })}
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
                aria-label={t('Question {n}', { n })}
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
            aria-label={t('Question {n}', { n })}
            className="shrink-0 rounded-lg border border-border bg-surface px-2 py-1 text-sm font-semibold"
          >
            {/* The option VALUES below (True / False / Not Given and the
                group's own options) are exam wording and stay English. */}
            <option value="">{t('(blank)')}</option>
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
          tutorOwner={tutorOwner}
          onTutorOwnerChanged={onTutorOwnerChanged}
        />
      )}
    </div>
  );
}

/** Word-count nudge shown live while typing a free-text answer that has a
    stated limit (e.g. "NO MORE THAN TWO WORDS") — a nudge, not a hard block,
    since the real exam only penalises at marking time. */
function WordLimitWarning({ value, limit, className }: { value: string; limit: number; className?: string }) {
  const { tn } = useT();
  const count = countWords(value);
  return (
    <p className={`text-xs font-semibold text-warning ${className ?? ''}`}>
      ⚠ {tn(count, { one: '{n} word: limit is {limit}', other: '{n} words: limit is {limit}' }, { limit })}
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
  const { t } = useT();
  const [saved, setSaved] = useState(() => (typeof window !== 'undefined' ? isBookmarked('question', id) : false));
  return (
    <button
      type="button"
      onClick={() => setSaved(toggleBookmark('question', id, { title, href, subtitle }))}
      aria-pressed={saved}
      aria-label={saved ? t('Remove bookmark') : t('Bookmark this question')}
      title={saved ? t('Remove bookmark') : t('Bookmark this question')}
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
  tutorOwner,
  onTutorOwnerChanged,
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
  /** Whose review this is (R2E-02). No owner, no button: a press that could
      not say whose answer it sends is never offered. */
  tutorOwner?: string;
  onTutorOwnerChanged?: (now: ReviewOwnerChange) => void;
}) {
  /* Our marker forgives more than an examiner will (a hyphen, a currency sign,
     punctuation). Saying nothing would train the student into a habit that
     costs a mark on test day, so when the forgiveness is what saved the answer
     we name it and show the exact form from the key. */
  const { t } = useT();
  const leniency = ok ? answerLeniency(q, given) : null;
  const variants = acceptedVariants(q);
  /* The note itself is teaching, so a Russian student reads it in
     Russian; the evidence line right below it is the sentence they have
     to find in the passage or the transcript, so it stays English. */
  const explanation = useExplanation(q.id, q.explanation);
  return (
    <div className={`mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm ${className ?? ''}`}>
      {!ok && (
        <p className="font-semibold text-success">
          ✓ {t('Correct answer:')} <span className="font-bold">{answerText}</span>
        </p>
      )}
      {/* Both notes below became ONE key each with placeholders. They used to
          be sentences with <strong> in the middle, which Russian cannot keep
          in that position; per docs/I18N-GUIDE.md the whole sentence moves
          into t() and the inline emphasis goes. The forgiveness reasons
          themselves are marked with nt() in src/lib/tests/schema.ts. */}
      {leniency && (
        <p className="mb-1 rounded bg-warning-tint px-2 py-1.5 text-warning">
          {t('Marked right, but write it exactly as {expected} in the real test. We let {forgiven} through here.', {
            expected: leniency.expected,
            forgiven: leniency.forgiven.map((reason) => t(reason)).join(t(' and ')),
          })}
        </p>
      )}
      {variants.length > 1 && (
        <p className="mb-1 text-xs text-ink-muted">
          {t('The key accepts {variants}. In the test write one answer only, never both with a slash or brackets.', {
            variants: variants.join(t(' or ')),
          })}
        </p>
      )}
      {explanation && <p className="mt-0.5 text-ink-muted">{explanation}</p>}
      {q.evidence && (
        <div className="mt-1.5 border-l-2 border-brand/40 pl-2.5">
          <p className="italic text-ink-muted">“{q.evidence}”</p>
          {onLocate && (
            <button
              type="button"
              onClick={() => onLocate(q.evidence!)}
              className="mt-1 inline-flex items-center gap-1 py-2 -my-1 text-xs font-semibold text-brand hover:underline"
            >
              🔍 {skill === 'listening' ? t('Show in transcript') : t('Show in passage')}
            </button>
          )}
        </div>
      )}
      {/* The note above says why the KEY is right. This says why what the
          student actually wrote is not, which nothing written in advance
          could. One click, one tutor turn, and only ever on a click. */}
      {!ok && q.scored !== false && tutorTestId && tutorOwner && (
        <AskWhyWrong
          testId={tutorTestId}
          questionId={q.id}
          given={given}
          owner={tutorOwner}
          onOwnerChanged={onTutorOwnerChanged}
        />
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
  const { t } = useT();
  const selectCount = group.selectCount ?? slotIds.length;
  const choices = group.choices ?? [];
  /* One note under the whole group. It has no question of its own, so it
     is keyed by the group's first slot (groupKey). */
  const explanationHtml = useExplanation(groupKey(slotIds[0] ?? ''), group.explanationHtml);
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
        {t('Selected {chosen} of {total}', { chosen: selected.length, total: selectCount })}
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
      {submitted && explanationHtml && (
        <Html className="mt-3 rounded-lg bg-surface/70 px-3 py-2 text-sm text-ink-muted" html={explanationHtml} />
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
  const { t } = useT();
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
                      aria-label={t('Question {n}', { n: nq.n })}
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
  const { t } = useT();
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
          {t('Clear highlights')}
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
          🖍 {t('Highlight')}
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
  onAssistanceUsed,
}: {
  src?: string;
  attemptKind: 'full' | 'drill';
  startSeconds?: number;
  endSeconds?: number;
  drillPartNumber: number | null;
  /** Learner-evidence recording (WP12): fired the first time the student
      replays or seeks the drill recording after it has actually started
      playing. Never wired for attemptKind === 'full' by the caller, and
      also guarded here, so a full exam's bare single-play button (which
      has no seek bar to begin with) can never fire it. */
  onAssistanceUsed?: () => void;
}) {
  const { t } = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(src ? 'loading' : 'error');
  const [retry, setRetry] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Set the first time playback actually begins, so the programmatic seek
  // handleLoadedMetadata does to line the drill up on its own startSeconds
  // is never itself read as the student replaying something.
  const hasPlayedRef = useRef(false);
  const assistanceFiredRef = useRef(false);

  function retryLoad() {
    if (!src) return;
    setStatus('loading');
    setStarted(false);
    setEnded(false);
    hasPlayedRef.current = false;
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

  function handlePlay() {
    hasPlayedRef.current = true;
  }

  function handleSeeked() {
    if (attemptKind !== 'drill' || !hasPlayedRef.current || assistanceFiredRef.current) return;
    assistanceFiredRef.current = true;
    onAssistanceUsed?.();
  }

  function startRecording() {
    setStarted(true);
    audioRef.current?.play();
  }

  /* Two whole sentences rather than one built around a "Part N"/"one part"
     fragment: Russian needs the phrase in its own place. "Part" itself stays
     English, like every other exam label. */
  const rangeNote =
    attemptKind === 'drill' && startSeconds != null
      ? partNumber != null
        ? t('This drill covers Part {part} of the recording ({from} to {to}).', {
            part: partNumber,
            from: fmtClock(startSeconds),
            to: fmtClock(endSeconds ?? duration),
          })
        : t('This drill covers one part of the recording ({from} to {to}).', {
            from: fmtClock(startSeconds),
            to: fmtClock(endSeconds ?? duration),
          })
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
      aria-label={t('Listening recording')}
      data-testid="listening-audio-player"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center">
        <div className="shrink-0 sm:w-44">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--skill,var(--color-brand))]">
            {attemptKind === 'drill' ? t('Drill recording') : t('Full recording')}
          </p>
          <p className="text-xs text-ink-muted">
            {attemptKind === 'drill' ? t('Pause and replay freely') : t('Plays once, exam conditions')}
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
            aria-label={t('Drill recording')}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlay}
            onSeeked={handleSeeked}
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
                ▶ {t('Start recording')}
              </button>
            ) : (
              <span className="font-mono text-sm font-semibold text-ink" aria-live="polite">
                {ended ? t('Recording finished') : t('Recording playing')} · {fmtClock(currentTime)} / {fmtClock(duration)}
              </span>
            )}
          </div>
        )}

        {!src && <div className="flex-1" />}

        <div className="min-h-5 shrink-0 text-xs sm:w-36 sm:text-right" aria-live="polite">
          {status === 'loading' && <span className="text-ink-muted">{t('Loading recording...')}</span>}
          {status === 'ready' && !started && attemptKind === 'drill' && <span className="text-success">{t('Recording ready')}</span>}
          {status === 'error' && (
            <span className="text-error">
              {t('Recording unavailable.')}{' '}
              {src && (
                <button type="button" onClick={retryLoad} className="font-bold underline underline-offset-2">
                  {t('Retry')}
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
  const { t } = useT();
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
          {t('{chosen}/{total} selected', { chosen: selected.length, total: config.selectCount })}
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

/* Shown when the account using this browser changed while a paper was open:
   a sign-out here, or a sign-in or account switch in another tab. The sitting
   on screen belongs to the student who started it, so it is stopped and left
   exactly where it is, under their own key, ready for them to resume. It is
   not an error and nothing was lost, so it reads calmly and offers the two
   things that are actually useful: start this paper fresh as whoever is
   signed in now, or go back to the hub.

   The same card, with one true sentence of its own, when the sitting is
   over in this tab for good (R2D-02, R2D-03): 'replaced' (a newer sitting
   was started in another tab) or 'gone' (handed in, finished, or added to
   an account, in another tab). The paper's own title heads it, since
   "paused" would not be true, and the only way on is Back: starting this
   paper fresh here would replace the other tab's newer sitting. A paper of
   a mock says it of the mock exam, in the mock screen's own words; the mock
   screen normally takes over at once anyway.

   'handed-in' (R2E-03) is a paper of a mock that another tab of the same
   sitting had already handed in: this tab's copy was not handed in over it,
   and the mock carries on from that tab.

   The same card again, for a HANDED-IN paper's review (`review`, R2E-02):
   the answers and the score are hidden, not paused, and nothing is waiting
   to be carried on, so it says that instead. The paper's title heads it,
   and "Start this test fresh" hands the paper to whoever is here now. */
function SittingStoppedScreen({
  reason,
  review = false,
  inMock,
  paperTitle,
  hubUrl,
  onStartFresh,
}: {
  reason: 'signed-out' | 'other-student' | SittingLoss;
  /** The paper had been handed in: this is its review leaving the screen. */
  review?: boolean;
  inMock: boolean;
  paperTitle: string;
  hubUrl: string;
  onStartFresh: () => void;
}) {
  const { t } = useT();
  if (reason === 'replaced' || reason === 'gone' || reason === 'handed-in') {
    const sentence =
      reason === 'handed-in'
        ? t('This paper was already handed in from another tab, so it was not handed in again here. The mock exam carries on from that tab.')
        : inMock
          ? reason === 'replaced'
            ? t('A newer mock exam was started in another tab, so this one is no longer being saved.')
            : t('This mock exam was finished or closed in another tab, so this one is no longer being saved.')
          : reason === 'replaced'
            ? t('A newer test was started in another tab, so this one is no longer being saved.')
            : t('This test was submitted or closed in another tab, so this one is no longer being saved.');
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
        <div
          className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover"
          role="status"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{paperTitle}</p>
          <h1 className="mt-1 font-display text-xl font-extrabold leading-snug">{sentence}</h1>
          <div className="mt-8 flex items-center justify-between gap-3">
            <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
              {t('Back')}
            </a>
          </div>
        </div>
      </div>
    );
  }
  if (review) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
        <div
          className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover"
          role="status"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{paperTitle}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">
            {reason === 'other-student'
              ? t('This test belongs to another student')
              : t('You signed out, so this result is hidden')}
          </h1>
          <p className="mt-3 text-ink-muted">
            {reason === 'other-student'
              ? t('A different account is using this browser now, so the answers and the score are hidden. The result is saved in the history of the student who took the test.')
              : t('You are signed out now, so the answers and the score are hidden. The result is saved in the history of the account that took the test, ready for when you sign back in.')}
          </p>
          <div className="mt-8 flex items-center justify-between gap-3">
            <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
              {t('Back')}
            </a>
            <button
              type="button"
              onClick={onStartFresh}
              className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
            >
              {t('Start this test fresh')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div
        className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover"
        role="status"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Test paused')}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">
          {reason === 'other-student'
            ? t('This test belongs to another student')
            : t('You signed out during this test')}
        </h1>
        <p className="mt-3 text-ink-muted">
          {reason === 'other-student'
            ? t('A different account is signed in on this browser now, so this test was not submitted. The answers are saved for the student who started it, and they can carry on from here when they sign back in.')
            : t('You are signed out now, so this test was not submitted. The answers are saved for the account that started it, and you can carry on from here when you sign back in.')}
        </p>
        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {t('Back')}
          </a>
          <button
            type="button"
            onClick={onStartFresh}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            {t('Start this test fresh')}
          </button>
        </div>
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
  const { t, tn } = useT();
  const listening = test.skill === 'listening';
  /* The caption under the "how many parts" figure. Counted, not a fixed word:
     Russian needs four forms, and a single-part drill used to print the
     English plural ("1 passages"). The forms carry no {n}, so only the word
     itself comes back. */
  const partLabel = listening
    ? tn(test.parts.length, { one: 'part', other: 'parts' })
    : tn(test.parts.length, { one: 'passage', other: 'passages' });
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
      <div className="study-preflight w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">
          {listening ? t('Listening Practice Test') : t('Reading Test')}
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{practiceTestTitle(test, t)}</h1>
        <p className="mt-2 text-ink-muted">{practiceTestDescription(test, t)}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.parts.length}</p>
            <p className="text-xs text-ink-muted">{partLabel}</p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{numberedTotal}</p>
            <p className="text-xs text-ink-muted">
              {tn(numberedTotal, { one: 'numbered question', other: 'numbered questions' })}
            </p>
          </div>
          <div className="rounded-card bg-surface-alt p-3">
            <p className="font-display text-2xl font-extrabold text-brand">{test.durationMinutes}</p>
            <p className="text-xs text-ink-muted">{tn(test.durationMinutes, { one: 'minute', other: 'minutes' })}</p>
          </div>
        </div>

        <p className="preflight-essential">{t('The timer starts as soon as you begin and runs continuously.')} <strong>{t('You cannot pause.')}</strong></p>
        {listening && <p className="text-sm text-ink-muted">{attemptKind === 'drill' ? t('Practice mode: pause and replay are available.') : t('Exam mode: the recording plays once.')}</p>}
        <details className="support-disclosure"><summary>{t('Instructions and scoring')}</summary>
        <ul className="mt-6 space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">⏱</span>
            <span>{t('The timer starts as soon as you begin and runs continuously.')}</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚫</span>
            <span><strong>{t('You cannot pause.')}</strong> {t('Refreshing or closing the tab will not stop the clock. You will resume with time already elapsed.')}</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">✍️</span>
            {/* Two counted things in one sentence, and the noun changes with the
                paper, so each skill gets its own counted phrase rather than a
                word glued on at the end. */}
            <span>
              {listening
                ? tn(
                    test.parts.length,
                    {
                      one: 'Answer all {scored} scored questions across {n} part, then submit. It auto-submits when time runs out.',
                      other: 'Answer all {scored} scored questions across {n} parts, then submit. It auto-submits when time runs out.',
                    },
                    { scored: scoredTotal },
                  )
                : tn(
                    test.parts.length,
                    {
                      one: 'Answer all {scored} scored questions across {n} passage, then submit. It auto-submits when time runs out.',
                      other: 'Answer all {scored} scored questions across {n} passages, then submit. It auto-submits when time runs out.',
                    },
                    { scored: scoredTotal },
                  )}
            </span>
          </li>
          {unavailableTotal > 0 && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">ℹ️</span>
              <span>
                {tn(unavailableTotal, {
                  one: '{n} numbered question is missing from the published source and is excluded from your score.',
                  other: '{n} numbered questions are missing from the published source and are excluded from your score.',
                })}
              </span>
            </li>
          )}
          {listening ? (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🎧</span>
              {/* Each of these was a sentence with <strong> in the middle. A
                  Russian sentence puts those words elsewhere, so per
                  docs/I18N-GUIDE.md the whole sentence is one key and the
                  inline emphasis goes. */}
              <span>
                {attemptKind === 'drill'
                  ? t('This is a single-part drill. You can play, pause, seek and replay the recording as many times as you like while you practise.')
                  : t('This is exam conditions: press Start recording when ready and it plays once, from the beginning, with no pausing, seeking or replaying. Refreshing keeps your answers and running timer, but restarts the recording from the beginning.')}
              </span>
            </li>
          ) : (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="shrink-0">🖍</span>
              <span>{t('Select any text in a passage to highlight it, just like the real computer test. Click a highlight to remove it.')}</span>
            </li>
          )}
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">🚩</span>
            <span>{t('Not sure about an answer? Flag it and jump back later using the numbered circles at the bottom.')}</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="shrink-0">📊</span>
            <span>
              {listening
                ? t('At the end you get a score, an estimated band, and a full answer review, including the transcript.')
                : t('At the end you get a score, an estimated band, and a full answer review, with every question explained with the exact line from the passage.')}
            </span>
          </li>
        </ul>
        </details>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {t('Back')}
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            {t('Start test')}
          </button>
        </div>
      </div>
    </div>
  );
}
