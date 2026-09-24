/* The writing tool: start → get a rotating task → write → submit → report.
   Every start serves a different prompt (localStorage rotation) until the
   whole pool has been used, then the cycle restarts. Grading goes through
   gradeEssay() (heuristics + the active EssayGrader), so this component is
   provider-agnostic — it renders the same report whether the stub or a real
   model produced the assessment.

   Two variants, the same split Reading and Speaking already use:
   variant="trainer" is the Writing Trainer at /trainers/writing — the
   coaching playground, with the structure/language/vocab coach beside the
   editor and a "new task" reroll. variant="checker" is the Writing Checker
   at /writing/checker — exam conditions: the question, the clock, the word
   count, nothing to lean on. Both end in the same band report; coaching is
   what separates practice from a test. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EssayPrompt } from '../lib/writing/schema';
import type { GradeResult } from '../lib/writing/schema';
import { CRITERIA, criterionLabel } from '../lib/writing/schema';
import { WRITING_BAND_GUIDES, guideFor } from '../data/band-guides';
import { countWords } from '../lib/writing/mechanics';
import { gradeEssay, isGraderConfigured } from '../lib/writing/grader';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import { getModelAnswers } from '../data/model-answers';
import { nextInRotation } from '../lib/rotation';
import { withBase } from '../lib/url';
import { recordWritingAttemptFor } from '../lib/progress';
import { useT } from '../lib/i18n/react';
import BandReport from './BandReport';
import Html from './Html';
import WritingCoachPanel from './WritingCoachPanel';
import GradingProgress from './GradingProgress';
import ExplainResult from './tutor/ExplainResult';
import SessionContinueBar from './learning/SessionContinueBar';
import WorkOnOverview from './learning/WorkOnOverview';
import { modelAnswerHref } from './library-links';
import { recordWritingGradedFor } from '../lib/learning/store.browser';
import { onOwnerChange, runOwnedGrade, type OwnerBinding } from '../lib/store-owner';
import {
  claimSubmission,
  handOverEssayEditing,
  openEssayEditing,
  restoreEssayDraft,
  clearSubmittedEssayDraft,
  type EssayEditingSession,
  type OpenedEssay,
} from './writing-editor-owner';
import { nt } from '../lib/i18n/translate';
import { writingActivityId } from '../lib/learning/catalog';

const TASK1_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task1');
const TASK2_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task2');
/* Academic only: Task 1 is always a report on visual data (chart, graph,
   table, process, map or combination) and Task 2 is the essay pool. */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/* ── Learner-evidence recording (WP12): a local draft of the essay ───────
 * A safety net for the essay text itself while grading is in flight or has
 * just failed: convenience, per-viewer storage, never evidence, and scoped
 * by the same owner the learner record already uses so one student's
 * unfinished essay can never surface for the next one signed in on the
 * same browser (architecture section 1.1's account-isolation finding).
 * Cleared the moment a real report comes back, since after that the essay
 * lives in ielts.progress.v1's writing history instead, which is durable,
 * but only while the draft still holds the text that report graded: a later
 * revision is never deleted by an earlier grade (R2C-01).
 *
 * The draft store, and the editing session that writes it, live in
 * ./writing-editor-owner.ts (R2B-01): the essay on screen and every draft
 * write it makes belong to the owner who started or restored it, and a
 * change of owner hands the editor over rather than carrying the text
 * across. */

/** Shown in place of a result when the page changed hands while the work
    was being graded (R2-02). One sentence, shared with the speaking
    trainers, that names nobody and shows nothing of the attempt. */
const OWNER_CHANGED_NOTICE = nt(
  'The account on this page changed while this was being graded, so nothing from that attempt is shown here. It is kept for the student who started it.',
);

/** Shown when the page changes hands while an essay is open (R2B-01). The
    editor now holds the incoming owner's own draft, or nothing. Names
    nobody. */
const ACCOUNT_CHANGED_NOTE = nt(
  'The account on this page changed. Any essay in progress was kept for the student who was writing it.',
);

/** Shown when an essay started under one owner is submitted after another
    took over (R2B-01). Nothing was sent, so nothing was graded or recorded. */
const SUBMISSION_REFUSED_NOTE = nt(
  'This essay was started under a different account, so it was not sent for grading. It is kept for the student who wrote it.',
);

export default function WritingTester({ variant = 'trainer' }: { variant?: 'trainer' | 'checker' }) {
  const { t, tn } = useT();
  const coached = variant === 'trainer';
  const [taskType, setTaskType] = useState<'task1' | 'task2' | null>(null);
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);
  const [essay, setEssay] = useState('');
  const [mobileView, setMobileView] = useState<'write' | 'help'>('write');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  // When the grading request went out (ms epoch). GradingProgress derives the
  // real percentage from this, so it survives re-renders of this component.
  const [gradingStartedAt, setGradingStartedAt] = useState(0);
  /* The ISO timestamp the graded attempt was recorded under. That timestamp
     IS the attempt's identity in the progress store, so it is what "ask Mr EZ
     to explain this result" points at — he then reads the marking that was
     already paid for instead of anything being sent for grading twice. */
  const [attemptAt, setAttemptAt] = useState<string | null>(null);
  /* A calm one-line note after the page changed hands (R2B-01). Holds the
     English key and is translated where it is shown, so a note set from the
     owner-change listener still follows the language on screen. */
  const [ownerNote, setOwnerNote] = useState<string | null>(null);

  // Lightbox for the Task 1 chart: the imported prompt markup hard-caps the
  // image at 560px inline, and students need to read exact numbers off it,
  // so a click opens it full-size instead of asking them to squint.
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);

  // Elapsed time — starts the moment the task begins, exactly like the real
  // exam clock (it doesn't wait for the first keystroke).
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerStartedRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* The essay on screen, bound to the owner who started or restored it
     (R2B-01, ./writing-editor-owner.ts). Every draft write it makes lands
     under that owner, however late its timer fires, and only that owner can
     submit it. Replaced, never re-pointed, when the page changes hands. */
  const editRef = useRef<EssayEditingSession | null>(null);
  /* The essay being graded, bound to the student who submitted it (R2-02,
     runOwnedGrade in src/lib/store-owner.ts). Cancelled on unmount, so a
     grade that comes back after this screen has gone is still kept for that
     student but never touches the screen. */
  const gradingBindingRef = useRef<OwnerBinding | null>(null);
  /* Mirrors `grading` for the owner-change listener, which is subscribed
     once and so cannot read state. */
  const gradingRef = useRef(false);

  useEffect(() => {
    // React cleanup is not guaranteed on a browser refresh. Flush the
    // existing owner-bound session before the document is discarded.
    const flushDraft = () => editRef.current?.flush();
    window.addEventListener('pagehide', flushDraft);
    window.addEventListener('beforeunload', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      window.removeEventListener('beforeunload', flushDraft);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      /* A pending draft is written, not dropped: it is the essay's only copy. */
      editRef.current?.close();
      gradingBindingRef.current?.cancel();
    };
  }, []);

  /* Keep the local draft current as the student types, so a failed grading
     request or a closed tab never loses the essay. Debounced by the editing
     session, and always written under the owner the session belongs to. */
  function handleEssayChange(value: string) {
    setEssay(value);
    setOwnerNote(null);
    editRef.current?.edited(value);
  }

  /* Start or restore the essay for one prompt, bound to the owner on the
     page right now (R2B-01). The essay that was open before, if any, is
     written to its own owner's draft first. Returns the draft to show. */
  function openEditor(promptId: string): string {
    editRef.current?.close();
    const opened = openEssayEditing(promptId);
    editRef.current = opened.session;
    return opened.draft;
  }

  /* The page changed hands (R2B-01). Everything on screen belonged to the
     outgoing owner: their essay is already in their own draft, and a grade
     still on its way is kept for them by runOwnedGrade. None of it stays
     here. The editor now shows the incoming owner's own draft of the same
     prompt, or nothing, with one calm line saying why. Touches only refs and
     setters, so the listener below can call it from any render. */
  function showHandedOver(opened: OpenedEssay, note: string) {
    editRef.current = opened.session;
    if (gradingRef.current) {
      /* The screen lets go of the attempt. The grade is still KEPT for the
         student who submitted it when it arrives (runOwnedGrade keeps it
         whatever the binding's state); it is just never painted here. */
      gradingBindingRef.current?.cancel();
      gradingBindingRef.current = null;
      gradingRef.current = false;
      setGrading(false);
    }
    setEssay(opened.draft);
    setResult(null);
    setAttemptAt(null);
    setGradingError(null);
    setLightboxImg(null);
    /* A sign-out followed by a sign-in is two changes of owner. If the first
       one took an essay that was being graded, that notice is still the
       explanation the incoming student needs, until they start writing. */
    setOwnerNote((shown) => (note === ACCOUNT_CHANGED_NOTE && shown === OWNER_CHANGED_NOTICE ? shown : note));
    restartTimer();
  }

  /* A sign-out, sign-in or account switch, from this tab's menu or from
     another tab. The same owner being told its stores changed (the
     anonymous-work claim) replaces nothing. */
  useEffect(() => {
    const stop = onOwnerChange(() => {
      const session = editRef.current;
      if (!session) return;
      const wasGrading = gradingRef.current;
      const opened = handOverEssayEditing(session);
      if (opened) showHandedOver(opened, wasGrading ? OWNER_CHANGED_NOTICE : ACCOUNT_CHANGED_NOTE);
    });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The checker is the exam-conditions counterpart to the coached trainer, so
     while an essay is in progress here Mr EZ must not help with the task
     itself. One data attribute on <body>, read by the tutor panel — no prop
     threading, and it clears itself on unmount so it cannot get stuck on. */
  const examRunning = !coached && Boolean(prompt) && !result;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (examRunning) document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [examRunning]);

  /* Clears any running timer and starts a fresh one from 0, right away. */
  function restartTimer() {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerStartedRef.current = true;
    setElapsedMs(0);
    const startedAt = performance.now();
    timerIntervalRef.current = setInterval(() => setElapsedMs(performance.now() - startedAt), 500);
  }

  const wordCount = useMemo(() => countWords(essay), [essay]);

  useEffect(() => {
    if (!lightboxImg) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxImg(null);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxImg]);

  /* Event delegation on the prompt card: the prompt body is raw HTML from
     the data files (rendered via <Html>), so there's no per-image React
     handler to attach — a click anywhere in the card that landed on an
     <img> opens the lightbox. */
  function handlePromptClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setLightboxImg({ src: img.src, alt: img.alt });
    }
  }

  async function submit() {
    if (!prompt || grading || !isGraderConfigured()) return;
    /* The essay goes out only for the owner who is writing it (R2B-01). Their
       latest text is written to their own draft first, so whatever happens
       next it is not lost. */
    const session = editRef.current;
    session?.flush();
    const binding = claimSubmission(session);
    if (!binding) {
      /* Started under an owner who is no longer the one on the page. Nothing
         is sent, so nothing is graded, paid for or recorded. The text is in
         its own owner's draft, and it leaves this screen. */
      const opened = session ? handOverEssayEditing(session) : null;
      if (opened) showHandedOver(opened, SUBMISSION_REFUSED_NOTE);
      else setOwnerNote(SUBMISSION_REFUSED_NOTE);
      return;
    }
    /* Everything the grade will be kept against is fixed NOW, with the owner
       it belongs to: the student who started this essay and pressed submit. */
    const submitted = { prompt, essay, wordCount };
    gradingBindingRef.current?.cancel();
    gradingBindingRef.current = binding;
    gradingRef.current = true;
    setGrading(true);
    setGradingStartedAt(Date.now());
    setGradingError(null);
    setOwnerNote(null);
    let at = '';
    try {
      await runOwnedGrade(binding, () => gradeEssay({ prompt: submitted.prompt, essay: submitted.essay }), {
        keep: (graded, owner) => {
          const criteria: Record<string, number> = {};
          for (const key of Object.keys(graded.criteria)) criteria[key] = graded.criteria[key as keyof typeof graded.criteria].band;
          at = new Date().toISOString();

          /* Learner-evidence recording (WP12), written alongside the row
             below, never instead of it: the prompt identity, Task 1/2 scope,
             word count, the four criterion bands, whether this was a live
             grade, and a pointer back into the row saved below rather than
             a second copy of the essay text. A not-live (stub) grade is
             still recorded here for the student's own history, but
             classifyEvidence excludes it with reason 'stub-graded', so it
             can never move an ability estimate. Written first, so that a
             record opened for the first time on this device takes its
             one-time copy of the older stores before the row below is in
             them rather than after it.
             Both writes go to `owner`: the student who submitted the essay,
             who is not necessarily the one using the page by now. */
          recordWritingGradedFor(owner, {
            activityId: writingActivityId(submitted.prompt.id),
            paper: 'writing',
            promptId: submitted.prompt.id,
            task: submitted.prompt.task,
            at,
            overallBand: graded.overallBand,
            criteria,
            wordCount: submitted.wordCount,
            grader: graded.grader,
            legacyRef: { store: 'writing', key: submitted.prompt.id, at },
          });
          recordWritingAttemptFor(owner, submitted.prompt.id, {
            at,
            overallBand: graded.overallBand,
            criteria,
            wordCount: submitted.wordCount,
            live: graded.grader.live,
            essay: submitted.essay,
            promptTitle: submitted.prompt.title,
            task: submitted.prompt.task,
            report: {
              criteria: graded.criteria,
              moments: graded.moments,
              strengths: graded.strengths,
              improvements: graded.improvements,
              actionPlan: graded.actionPlan,
              mechanics: {
                wordCount: graded.mechanics.wordCount,
                sentenceCount: graded.mechanics.sentenceCount,
                lexicalDiversity: graded.mechanics.lexicalDiversity,
                linkingDevices: graded.mechanics.linkingDevices,
                underLength: graded.mechanics.underLength,
                notes: graded.mechanics.notes,
              },
              grader: graded.grader,
            },
          });
          // The report just landed, so the working draft this prompt was kept
          // under is no longer the only copy of the essay: it now lives in
          // ielts.progress.v1's writing history, which is durable. The
          // submitter's draft, which is not necessarily the one on screen,
          // and only while it still holds exactly the text that was graded
          // (R2C-01): if the student came back while this was on its way and
          // went on revising, the draft is that revision, and it stays.
          clearSubmittedEssayDraft(submitted.prompt.id, owner, submitted.essay);
        },
        show: (graded) => {
          setResult(graded);
          setAttemptAt(at);
        },
        hide: () => {
          /* Somebody else is using the page now. The essay and its report
             are kept for the student who wrote it; none of it stays here.
             Normally the owner-change listener has already handed the editor
             over (and so let go of this attempt); this is the same hand-over
             for an owner that changed without a notification reaching it. */
          leaveForCurrentOwner();
        },
      });
    } catch {
      if (binding.state() === 'owner-changed') {
        /* The request failed after the page moved on to somebody else. The
           essay is the submitter's only copy, so it goes back into THEIR
           draft, unless they already have one there (the same essay, or a
           later revision, which wins: R2C-01), and it leaves this screen. */
        restoreEssayDraft(submitted.prompt.id, binding.owner, submitted.essay);
        leaveForCurrentOwner();
      } else {
        // The button is disabled whenever isGraderConfigured() is false, so any
        // error reaching here happened after a real request went out - network,
        // timeout, or the Worker itself failing. Show one calm, specific
        // message rather than surfacing the raw error (which might read like a
        // permanent "not configured" state the student can't do anything about).
        setGradingError(
          t('We could not reach the grading service. Your essay is safe on this page; try again in a minute.'),
        );
      }
    } finally {
      if (binding.state() !== 'cancelled') {
        gradingRef.current = false;
        setGrading(false);
      }
    }
  }

  /* The grading attempt found the page in somebody else's hands. */
  function leaveForCurrentOwner() {
    const session = editRef.current;
    const opened = session ? handOverEssayEditing(session) : null;
    if (opened) {
      showHandedOver(opened, OWNER_CHANGED_NOTICE);
      return;
    }
    setEssay('');
    setResult(null);
    setAttemptAt(null);
    setOwnerNote(OWNER_CHANGED_NOTICE);
  }

  /* Serve the next prompt in the given task's rotation and clear the workspace. */
  function startTask(task: 'task1' | 'task2') {
    const pool = task === 'task2' ? TASK2_PROMPTS : TASK1_PROMPTS;
    if (pool.length === 0) return; // no prompts of this kind are loaded
    const rotationKey = task === 'task2' ? 'ielts.rotation.writing-task2.v1' : 'ielts.rotation.writing-task1.v1';
    const id = nextInRotation(
      rotationKey,
      pool.map((p) => p.id),
    );
    const nextPrompt = pool.find((p) => p.id === id) ?? pool[0];
    setTaskType(task);
    setPrompt(nextPrompt);
    // Keep the selected task addressable so refresh reopens this prompt's
    // existing owner-scoped draft instead of advancing the rotation again.
    if (nextPrompt && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('task', nextPrompt.id);
      url.searchParams.delete('type');
      window.history.replaceState(window.history.state, '', url);
    }
    // Restore an unfinished draft of this exact prompt if one is sitting
    // there from an earlier visit (a failed or abandoned grading attempt);
    // otherwise a genuinely fresh prompt starts blank, same as before. Either
    // way the essay is now bound to the owner on the page (R2B-01).
    setEssay(nextPrompt ? openEditor(nextPrompt.id) : '');
    setResult(null);
    setOwnerNote(null);
    restartTimer();
  }

  function newTask() {
    if (essay.trim() && !window.confirm(t('Get a different task? Your current answer will be cleared.'))) return;
    // A confirmed "clear it" is a deliberate discard, not a failure or a
    // navigation away, so the draft this prompt was kept under should not
    // reappear next time the rotation serves it again. The discard also
    // drops a draft write still waiting on the debounce.
    if (essay.trim()) editRef.current?.discard();
    startTask(taskType!);
  }

  /* A link can open the trainer with the task already chosen, so a student sent
     here from a lesson starts writing instead of landing on a menu:
       ?task=<promptId>  this exact question
       ?type=task1|task2 the next question of that type, from the rotation
     Runs once, and only when nothing has been started yet. */
  useEffect(() => {
    if (prompt || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wanted = params.get('task');
    if (wanted) {
      const found = WRITING_PROMPTS.find((p) => p.id === wanted);
      if (found) {
        setTaskType(found.task);
        setPrompt(found);
        setEssay(openEditor(found.id));
        setResult(null);
        restartTimer();
        return;
      }
    }
    const type = params.get('type');
    if (type === 'task1' || type === 'task2') startTask(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 1. Start screen ── */
  if (!prompt) {
    const t1Pool = TASK1_PROMPTS;
    const taskCards = [
      {
        task: 'task1' as const,
        title: 'Task 1',
        kind: t('Report'),
        description: t('Describe a chart, graph, table, process or map in your own words.'),
        minWords: t1Pool[0]?.minWords,
        minutes: t1Pool[0]?.suggestedMinutes,
      },
      {
        task: 'task2' as const,
        title: 'Task 2',
        kind: t('Essay'),
        description: t('Write a discursive essay responding to an opinion, discussion or problem prompt.'),
        minWords: TASK2_PROMPTS[0]?.minWords,
        minutes: TASK2_PROMPTS[0]?.suggestedMinutes,
      },
    ];
    return (
      <div className="writing-choice screen-in">
        <h3>{coached ? t('Choose your writing practice') : t('Choose your writing task')}</h3>
        <p className="choice-description">
          {coached
            ? t('A different exam-style prompt each attempt, with AI feedback on all four criteria.')
            : t('A different exam-style prompt each attempt. Just you and the question, under exam conditions.')}
        </p>
        <div className="writing-choice-grid">
          {taskCards.map((card) => (
            <button
              key={card.task}
              type="button"
              onClick={() => startTask(card.task)}
              className="writing-choice-card group"
            >
              <span className="font-display text-lg font-extrabold">
                {card.title} <span className="font-bold text-ink-muted">· {card.kind}</span>
              </span>
              <p className="mt-1.5 flex-1 text-sm text-ink-muted">{card.description}</p>
              <span className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  {tn(card.minWords ?? 0, { one: '{n}+ word', other: '{n}+ words' })}
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                  ⏱ {t('~{minutes} min', { minutes: card.minutes })}
                </span>
              </span>
              <span className="mt-4 inline-flex w-full items-center justify-center rounded-button bg-[var(--skill,#0E9F6E)] px-4 py-2.5 font-display text-sm font-bold text-white transition-opacity group-hover:opacity-90">
                {t('Start {task}', { task: card.title })}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs text-ink-muted">
          {tn(t1Pool.length, { one: '{n} Task 1 prompt', other: '{n} Task 1 prompts' })} ·{' '}
          {tn(TASK2_PROMPTS.length, { one: '{n} Task 2 prompt', other: '{n} Task 2 prompts' })} · {t('free')}
        </p>
      </div>
    );
  }

  /* ── 2b. Grading in progress ── */
  if (grading) {
    return (
      <div className="screen-in relative mx-auto max-w-5xl overflow-hidden rounded-card border border-border bg-surface p-10 text-center shadow-card">
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--skill,#0E9F6E)]" aria-hidden="true" />
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <span
            className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--skill,#0E9F6E)]/15 border-t-[var(--skill,#0E9F6E)]"
            style={{ animationDuration: '1.1s' }}
            aria-hidden="true"
          />
          <span className="text-3xl" aria-hidden="true">
            📝
          </span>
        </div>
        <h3 className="mt-6 font-display text-xl font-extrabold">{t('Grading your essay…')}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
          {t('Our AI examiner is reading your response against the official IELTS band descriptors.')}
        </p>
        <GradingProgress kind="writing" startedAt={gradingStartedAt} className="mt-7" />
      </div>
    );
  }

  /* ── 3. Feedback report ── */
  if (result) {
    const m = result.mechanics;
    return (
      <div className="screen-in mx-auto max-w-5xl space-y-6">
        <BandReport
          title={prompt.title}
          overallBand={result.overallBand}
          live={result.grader.live}
          offlineWarning={t(
            'The band scores below are illustrative, generated from mechanical signals only, without an AI examiner. Your teacher can enable AI grading.',
          )}
          criteria={CRITERIA.map((c) => {
            const score = result.criteria[c.key];
            const guide = guideFor(WRITING_BAND_GUIDES[c.key], score.band);
            return {
              key: c.key,
              label: criterionLabel(c, prompt.task),
              band: score.band,
              comment: score.comment,
              tip: score.tip,
              nextBand: score.nextBand,
              // task1Note only applies to Task 1 Academic's Task Achievement scale
              guide: guide && prompt.task !== 'task1' ? { ...guide, task1Note: undefined } : guide,
            };
          })}
          strengths={result.strengths}
          improvements={result.improvements}
          actionPlan={result.actionPlan}
        >
          {/* The moment a model answer is worth most: the student has just
              written this exact task and read their own bands. The link
              carries `reason=after-writing-attempt`, which is what makes
              ModelAnswers.tsx frame the model as a comparison with their
              own work instead of as plain browsing. It never asserts the
              attempt: that page checks the student's own recorded
              attempts on this prompt before it honours the reason. */}
          {getModelAnswers(prompt.id).length > 0 && (
            <a
              href={withBase(modelAnswerHref(prompt.id))}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-5 py-4 text-sm shadow-card transition-colors hover:border-brand"
            >
              <span>
                <span className="font-display font-bold text-ink">{t('Compare with a Band 8 answer')}</span>
                <span className="mt-0.5 block text-ink-muted">
                  {t('A model written for this same task, with the examiner notes behind every criterion.')}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-brand">
                &rarr;
              </span>
            </a>
          )}

          {/* Instant mechanics */}
          <div className="rounded-card border border-border bg-surface p-5 shadow-card">
            <h3 className="font-display font-bold">{t('Mechanics check')}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label={t('Words')} value={`${m.wordCount}`} bad={m.underLength} />
              <Stat label={t('Sentences')} value={`${m.sentenceCount}`} />
              <Stat label={t('Vocab variety')} value={`${Math.round(m.lexicalDiversity * 100)}%`} bad={m.lexicalDiversity < 0.42} />
              <Stat label={t('Linking words')} value={`${m.linkingDevices.reduce((a, l) => a + l.count, 0)}`} bad={m.linkingDevices.length === 0 && m.sentenceCount > 3} />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
              {m.notes.map((n) => (
                <li key={n} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Moments */}
          {result.moments.length > 0 && (
            <div className="rounded-card border border-border bg-surface p-5 shadow-card">
              <h3 className="font-display font-bold">{t('Moments from your essay')}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {result.moments.map((mo, i) => (
                  <li key={i}>
                    <span className="italic text-ink-muted">&ldquo;{mo.quote}&rdquo;</span>
                    <span className="block text-ink-muted">· {mo.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </BandReport>

        {/* Mr EZ reads the marking above rather than re-marking anything. He
            points at the stored attempt by its timestamp, so the explanation
            costs one cheap tutor turn, not a second grading run. */}
        {attemptAt && (
          <ExplainResult
            attempt={{ kind: 'writing', at: attemptAt, promptId: prompt.id }}
            summary={`Estimated band ${result.overallBand.toFixed(1)}`}
          />
        )}

        {/* The teaching hand-off (WP17, generalised to every Writing
            objective by WP20). It appears only when this very report gives
            a reason: the examiner said something about one objective, or a
            plain check of the essay found something checkable. It never
            touches the band above, and pressing it reconciles into the ONE
            plan rather than offering a competing next step. Task 1 and
            Task 2 both pass through; WorkOnOverview decides internally
            whether either has something to say. */}
        {attemptAt && (
          <WorkOnOverview
            attempt={{
              at: attemptAt,
              promptId: prompt.id,
              promptTitle: prompt.title,
              task: prompt.task,
              essay,
              live: result.grader.live,
              report: {
                criteria: result.criteria,
                moments: result.moments,
                improvements: result.improvements,
                grader: result.grader,
              },
            }}
          />
        )}

        {/* The one control at the end of a piece of work, reading the same
            session every other surface reads. */}
        <SessionContinueBar activityId={writingActivityId(prompt.id)} compact />

        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
          >
            ✎ {t('Revise this essay')}
          </button>
          <button
            type="button"
            onClick={() => startTask(taskType!)}
            className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            {t('Take another test')}
          </button>
        </div>
        <p className="text-center text-xs text-ink-muted">
          {t('Your essay and its scores are saved.')}{' '}
          <a href={withBase('/account#writing')} className="font-semibold text-brand hover:underline">
            {t('Reread it any time in My progress')}
          </a>
          .
        </p>
      </div>
    );
  }

  /* ── 2. Editor ── */
  const under = wordCount < prompt.minWords;
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const timerOvertime = elapsedMs >= prompt.suggestedMinutes * 60_000;
  return (
    <>
      {/* Floating clock — rendered as a sibling of (not nested inside)
          .screen-in on purpose: that div's entrance animation ends with
          animation-fill-mode: both holding `transform: translateY(0)`, and
          ANY transform on an ancestor — even the identity one — creates a
          new containing block for `position: fixed` descendants, which
          would silently rebase this box to .screen-in's own edges instead
          of the viewport. Nested there, it can never actually reach the
          real margin beside the card and always overlaps the prompt text.
          Only safe once the viewport is wide enough that the max-w-4xl
          card's side margin clears the clock's own width (~135px plus its
          right-6 offset), which is xl. Below xl: it renders inline in the
          card header instead. */}
      {coached && <div className="writing-view-switch" role="group" aria-label={t('Writing')}>
        <button type="button" aria-pressed={mobileView === 'write'} onClick={() => setMobileView('write')}>{t('Writing')}</button>
        <button type="button" aria-pressed={mobileView === 'help'} onClick={() => setMobileView('help')}>{t('Help')}</button>
      </div>}
      <div data-mobile-view={mobileView} className={`writing-workspace screen-in ${coached ? 'lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start lg:gap-8' : ''}`}>
        <div className="writing-editor space-y-4">
          <div
            className="writing-prompt max-w-[820px] rounded-card border border-border bg-surface p-5 shadow-card"
            onClick={handlePromptClick}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--skill,#0E9F6E)]">
                {prompt.task === 'task2' ? 'Writing Task 2' : 'Writing Task 1'}{' '}
                · ~{prompt.suggestedMinutes} min
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {timerStartedRef.current && (
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
                      timerOvertime ? 'border-error text-error' : 'border-border text-ink'
                    }`}
                    title={timerOvertime ? t('Over the suggested time') : t('Time spent writing')}
                  >
                    {timerOvertime ? '⚠' : '⏱'} {pad(Math.floor(totalSeconds / 60))}:{pad(totalSeconds % 60)}
                  </span>
                )}
                {/* Exam conditions: you get the question you're given. The
                    reroll is a practice affordance, so it's trainer-only. */}
                {coached && (
                  <button type="button" onClick={newTask} className="py-2 -my-2 text-xs font-semibold text-ink-muted hover:text-ink">
                    ↻ {t('New task')}
                  </button>
                )}
              </div>
            </div>
            {/* Via <Html> (memoized), not an inline dangerouslySetInnerHTML:
                the writing clock re-renders this component every 500ms and
                every keystroke, and an inline one would reparse the prompt on
                each of those — visibly re-loading the Task 1 chart image. */}
            <Html as="p" className="mt-2 text-[0.95rem] leading-relaxed" html={prompt.promptHtml} />
            {prompt.promptHtml.includes('<img') && (
              <p className="mt-2 text-xs font-medium text-ink-muted">
                {t('View larger: click the chart to open it full-size.')}
              </p>
            )}
          </div>

          {ownerNote && (
            <p role="status" className="rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-ink-muted">
              {t(ownerNote)}
            </p>
          )}

          <textarea
            value={essay}
            onChange={(e) => handleEssayChange(e.target.value)}
            rows={14}
            placeholder={t('Write your answer here…')}
            className="w-full rounded-card border border-border bg-surface p-4 text-[0.95rem] leading-relaxed shadow-card focus:border-brand focus:outline-none"
          />

          {!isGraderConfigured() && (
            <p className="rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
              ⚠{' '}
              {t(
                "AI feedback is not available on this build ({envVar} is not set). You can still write and time yourself, but essays can't be graded here yet.",
                { envVar: 'PUBLIC_GRADER_URL' },
              )}
            </p>
          )}
          {gradingError && (
            <div className="rounded-card border border-error/30 bg-error-tint px-4 py-3 text-sm text-error">
              ⚠ {gradingError}
            </div>
          )}

          <div className="writing-submit-row flex items-center justify-between">
            <span className={`text-sm font-semibold ${under ? 'text-ink-muted' : 'text-success'}`}>
              {t('{count} / {min}+ words', { count: wordCount, min: prompt.minWords })}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={wordCount === 0 || !isGraderConfigured()}
              className="rounded-button bg-brand px-6 py-2.5 font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('Check my essay')}
            </button>
          </div>
        </div>

        {/* The coach is what makes the trainer a trainer. The Checker is the
            exam: question, clock, word count, nothing to lean on. */}
        {coached && (
          <div className="writing-guidance mt-4 lg:sticky lg:top-24 lg:mt-0">
            <WritingCoachPanel key={prompt.id} prompt={prompt} />
          </div>
        )}
      </div>

      {lightboxImg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightboxImg.alt || t('Chart, larger view')}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            aria-label={t('Close')}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
          <img
            src={lightboxImg.src}
            alt={lightboxImg.alt}
            className="max-h-[95vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function Stat({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 ${bad ? 'border-error/40 bg-error-tint' : 'border-border bg-surface-alt'}`}>
      <p className={`font-display text-lg font-extrabold ${bad ? 'text-error' : ''}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
