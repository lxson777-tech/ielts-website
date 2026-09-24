/* Mock Exam Day: a single chained sitting — Listening, then Reading, then
   Writing, then Speaking, with no breaks — mirroring the real IELTS day as
   closely as this portal's pieces allow. Listening and Reading are the
   existing full-test TestPlayer, reused as-is in bare exam mode (see the
   onFinish prop below); Writing is new here since nothing in the app
   already does "one shared 60-minute clock across two tasks, no grading".
   Speaking (2026-09) is the live AI examiner (src/components/LiveExaminer,
   `mock` mode) embedded as the fourth stage, behind its own brief screen
   with a Skip option since it needs a microphone and, on the paid provider,
   a signed-in account — see SpeakingBriefScreen below. See
   src/lib/tests/mock.ts for the pure pair-picking logic, the official
   overall-band rounding, and the essay/attempt storage. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { PracticeTest } from '../lib/tests/schema';
import { ALL_TESTS } from '../data/tests';
import { WRITING_PROMPTS } from '../data/writing-prompts';
import type { EssayPrompt } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { isGraderConfigured } from '../lib/writing/grader';
import { getAttempts } from '../lib/progress';
import {
  pickDefaultPair,
  pairLabel,
  testNumber,
  nextMockId,
  currentMockOwner,
  saveMockAttempt,
  overallMockBand,
  beginActiveMock,
  clearActiveMock,
  isActiveMockStorageKey,
  loadActiveMock,
  mockSittingStatus,
  reconcileActiveMock,
  saveActiveMock,
  writingSecondsLeftAt,
  newMockSittingId,
  mockLegResult,
  speakingExitFor,
  afterSpeakingExit,
  type ActiveMock,
  type ActiveMockSnapshot,
  type MockEssay,
  type MockLegResult,
  type MockStage,
  type SpeakingExit,
} from '../lib/tests/mock';
import { ownerStillCurrent, sittingLossFrom, type SittingLoss } from '../lib/test-session';
import { onOwnerChange } from '../lib/store-owner';
import { recordSubmission } from '../lib/learning/store.browser';
import { paperExposureKey } from '../lib/learning/evidence';
import { mockOverallAllowed } from './mock-summary';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import { isAuthConfigured } from '../lib/auth/supabase';
import { onAuthChange } from '../lib/auth/session';
import { fetchLiveConfig, type LiveConfig } from '../lib/speaking/live/link';
import Html from './Html';
import TestPlayer from './TestPlayer';
import LiveExaminer from './LiveExaminer';
import AuthModal from './AuthModal';

/* The stages, and the shape one finished paper takes, are declared in
   src/lib/tests/mock.ts, because a sitting is written down as it goes and
   what is saved has to match what the screen reads back. */
type Stage = MockStage;

/** Result handed back by the embedded live examiner (LiveExaminer's
    `onComplete`), kept as its own type since MockAttempt only stores the
    number, not the per-criterion breakdown. */
interface SpeakingLegResult {
  overallBand: number;
  criteria: Record<string, number>;
}

type LegResult = MockLegResult;

const TASK1_ACADEMIC = WRITING_PROMPTS.filter((p) => p.task === 'task1' && p.variant !== 'letter');
const TASK2_PROMPTS = WRITING_PROMPTS.filter((p) => p.task === 'task2');
const WRITING_SECONDS = 60 * 60;
const TRANSITION_SECONDS = 60;
/** Same env var LiveExaminer.tsx reads — used here only to know whether the
    Speaking stage's brief screen has anything to gate (sign-in) or offer
    (Start) at all. */
const LIVE_EXAMINER_URL: string | undefined = import.meta.env?.PUBLIC_LIVE_EXAMINER_URL;

const asset = (p: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${p}`;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Icons for the "what to expect" list on the start screen, inline SVG
    (currentColor) instead of emoji so they sit quietly in text-ink-muted
    like every other icon in the workspace rather than four different
    platform emoji colours. */
function ListeningIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  );
}
function ReadingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z" />
    </svg>
  );
}
function WritingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m17 3 4 4-11.5 11.5-5 1 1-5L17 3Z" />
      <path d="m14.5 5.5 4 4" />
    </svg>
  );
}
function NoGradingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 17.5 11-11" />
    </svg>
  );
}
function SpeakingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  );
}

/** One random-ish pick, stable for the lifetime of this mock sitting
    (computed once via useState's lazy initializer, not re-rolled on every
    render). A real rotation store (see src/lib/rotation.ts, used by the
    Writing Trainer/Checker) would remember picks across mocks too, but a
    mock is a rare, deliberate sitting rather than daily practice, so a
    fresh pick per sitting is the simpler and more honest behaviour here. */
function randomOf<T>(pool: T[]): T | undefined {
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
}

export default function MockExam({ hubUrl }: { hubUrl: string }) {
  /* Interface language. Declared first so the hook order below never moves;
     nothing in the stage machine or the clocks reads it. */
  const { t } = useT();
  const listeningTests = useMemo(
    () => ALL_TESTS.filter((t) => t.skill === 'listening').sort((a, b) => a.id.localeCompare(b.id)),
    [],
  );
  const readingTests = useMemo(
    () => ALL_TESTS.filter((t) => t.skill === 'reading').sort((a, b) => a.id.localeCompare(b.id)),
    [],
  );
  const defaultPair = useMemo(() => pickDefaultPair(ALL_TESTS), []);

  const [stage, setStage] = useState<Stage>('start');
  const [listeningId, setListeningId] = useState(defaultPair?.listening.id ?? listeningTests[0]?.id ?? '');
  const [readingId, setReadingId] = useState(defaultPair?.reading.id ?? readingTests[0]?.id ?? '');
  const [mockId, setMockId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [listeningResult, setListeningResult] = useState<LegResult | null>(null);
  const [readingResult, setReadingResult] = useState<LegResult | null>(null);
  const [essay1, setEssay1] = useState('');
  const [essay2, setEssay2] = useState('');
  const [writingSecondsLeft, setWritingSecondsLeft] = useState(WRITING_SECONDS);
  const [speakingResult, setSpeakingResult] = useState<SpeakingLegResult | null>(null);
  const [speakingSkipped, setSpeakingSkipped] = useState(false);
  /* True when this sitting is back on its Speaking brief because the
     interview was interrupted (the account changed, or the page went away
     part way through), so the brief can say why Speaking is not done. */
  const [speakingInterrupted, setSpeakingInterrupted] = useState(false);
  const savedRef = useRef(false);

  /* THIS SITTING'S OWN IDENTITY (R2B-03). Made when a sitting begins and
     handed to each paper's player, which keeps its answers and deadline
     inside this sitting and nowhere else. The mock id is not unique enough
     (see ActiveMock.sittingId in src/lib/tests/mock.ts). */
  const [sittingId, setSittingId] = useState('');

  /* THE ONE CLOCK THIS SCREEN OWNS, AS A DEADLINE (R2-03, 23 September 2026).
     A remaining count cannot survive being put down and picked up again
     without handing the student extra exam time, so Writing's hour is stored
     as the moment it runs out. The Listening and Reading legs keep their own
     deadline inside this sitting's record (src/lib/tests/mock.ts,
     mockLegSitting), and the test player reads its clock from it. The short
     beat between two papers is not exam time and is simply restarted. */
  const [writingEndsAt, setWritingEndsAt] = useState<number | null>(null);

  /* A sitting of this student's own, written down earlier and not finished:
     the offer to pick it up again. Null while there is nothing to offer. */
  const [resumable, setResumable] = useState<ActiveMock | null>(null);

  /* WHOSE MOCK DAY THIS IS (finding 1 of the 23 September 2026 review).
     Captured when the sitting begins, the same way a single paper binds
     itself in TestPlayer.tsx. A mock chains four papers over nearly three
     hours, so it is the sitting most likely to outlive whoever started it:
     a sign-out here, or a sign-in in another tab, must not turn one
     student's essays and bands into another student's record. */
  const mockOwnerRef = useRef('');
  /* Why the sitting on screen is stopped, or null while it is not: nobody
     signed in now, or somebody else. Kept as the reason rather than a yes or
     no, so that A signing out and B then signing in redraws the stopped
     screen with the right heading (a flag that was already "yes" would not
     have redrawn it). */
  const [ownerChange, setOwnerChange] = useState<'signed-out' | 'other-student' | null>(null);
  const ownerChanged = ownerChange !== null;
  const stoppedReason = (): 'signed-out' | 'other-student' =>
    currentMockOwner().startsWith('u:') ? 'other-student' : 'signed-out';

  /* THIS SITTING IS OVER IN THIS TAB, FOR GOOD (fourth and fifth Codex
     rounds, R2C-02 and R2D-03). Two ways, each with its own true sentence:
       - 'replaced': the same student started a fresh mock in another tab,
         which replaces the written-down sitting, papers and all;
       - 'gone': the written-down sitting disappeared after this tab had
         seen it written down: another tab that picked it up finished it
         (recording it and clearing it), or it was added to an account in
         another tab.
     Either way this tab stops and never writes again, so it can neither
     overwrite a newer sitting with a stale snapshot, nor remove it by
     finishing, nor record the same mock a second time. Found three ways: on
     the storage event another tab's write raises, and, should that event be
     missed, the next time a write of this sitting is refused, or a paper of
     it reports the loss (TestPlayer's onSittingLost). Kept as a ref as well,
     for the effects and listeners that must read it the moment it is set.
     Unlike an account change it is never undone in this tab. */
  const [ended, setEnded] = useState<SittingLoss | null>(null);
  const endedRef = useRef<SittingLoss | null>(null);
  function stopAs(loss: SittingLoss) {
    if (endedRef.current) return;
    endedRef.current = loss;
    setEnded(loss);
  }
  /* Whether this tab has ever found its sitting written down (R2D-03): set
     by a begin that landed, a sitting picked up from storage, and every save
     that landed. A record that is absent although it was never written (a
     full or blocked storage) is not "gone", so such a sitting is never
     stopped by mistake, and it is recorded at its results as before (no
     other tab can have picked up a sitting that was never written). */
  const recordHeldRef = useRef(false);
  /** Why this tab's sitting is no longer the written-down one, read now, or
      null while it still is (or the account changed, which is not a loss). */
  function sittingLossNow(): SittingLoss | null {
    const status = mockSittingStatus({ owner: mockOwnerRef.current, sittingId });
    if (status === 'held') recordHeldRef.current = true;
    return sittingLossFrom(status, recordHeldRef.current);
  }

  /* A mock sitting is a timed assessment from the first paper to the last, so
     flag it on <body> for the Mr EZ tutor panel (see readPlace() in
     src/components/tutor/MrEzPanel.tsx). The nested TestPlayer sets the same
     flag during its own legs; this covers the stages it does not own — the
     transition screens, Writing and Speaking. This page uses the `bare`
     layout, so the panel is not mounted here in the first place; the flag is
     the second line of defence, not the only one. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const running = stage !== 'start' && stage !== 'results' && !ended;
    if (running) document.body.dataset.examRunning = 'true';
    else delete document.body.dataset.examRunning;
    return () => {
      delete document.body.dataset.examRunning;
    };
  }, [stage, ended]);

  const listeningTest: PracticeTest | undefined = listeningTests.find((t) => t.id === listeningId) ?? listeningTests[0];
  const readingTest: PracticeTest | undefined = readingTests.find((t) => t.id === readingId) ?? readingTests[0];

  // Stable for the sitting: the same Task 1/Task 2 pair is shown whether the
  // student is still on the start screen or deep into the Writing leg. Both
  // are written down with the sitting, so picking it up again does not
  // quietly swap the questions for two different ones.
  const [task1Prompt, setTask1Prompt] = useState<EssayPrompt | undefined>(() => randomOf(TASK1_ACADEMIC));
  const [task2Prompt, setTask2Prompt] = useState<EssayPrompt | undefined>(() => randomOf(TASK2_PROMPTS));

  /* Leaving mid-mock: Listening and Reading already warn on their own (see
     TestPlayer's beforeunload effect, active for the whole time each nested
     instance is started-but-not-submitted). This covers the stages
     TestPlayer doesn't own — the transition screens, Writing, and the
     Speaking brief/interview — so the warning holds for the entire sitting
     except the start and results screens, same as a real exam has no safe
     point to just walk away. */
  useEffect(() => {
    const midMock =
      stage === 'transition-reading' ||
      stage === 'transition-writing' ||
      stage === 'writing' ||
      stage === 'speaking-brief' ||
      stage === 'speaking';
    /* A sitting that is over in this tab (replaced, or gone) has nothing
       left to lose here. */
    if (!midMock || ended) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stage, ended]);

  /* Writing's single 60-minute clock, running only while stage === 'writing'.
     It counts DOWN TO A MOMENT rather than counting a number down, so a
     refresh or a reopened sitting resumes with the time that is actually
     left. A deadline already in the past simply ends the leg. */
  useEffect(() => {
    /* A sitting that is over in this tab does not move on to anything. */
    if (stage !== 'writing' || ended) return;
    if (writingEndsAt === null) {
      setWritingEndsAt(Date.now() + WRITING_SECONDS * 1000);
      return;
    }
    const tick = () => {
      const left = writingSecondsLeftAt(writingEndsAt, Date.now(), WRITING_SECONDS);
      setWritingSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        setStage('results');
      }
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [stage, writingEndsAt, ended]);

  /* Record the combined mock attempt exactly once, as soon as both legs'
     results and the essays are available. `ownerChanged` is a dependency
     so that a sitting which reached its results while its student was
     signed out (the Writing clock ran out behind the stopped screen) is
     recorded the moment that same student is back, rather than never. */
  useEffect(() => {
    if (stage !== 'results' || savedRef.current || endedRef.current) return;
    if (!listeningResult || !readingResult || !listeningTest || !readingTest) return;
    /* Never record a sitting under somebody who did not sit it. */
    if (!ownerStillCurrent(mockOwnerRef.current)) {
      setOwnerChange(stoppedReason());
      return;
    }
    /* FINALISED BEFORE ANYTHING IS RECORDED (R2D-03). The written-down copy
       goes first, and only if it is still THIS sitting of this student
       (clearActiveMock checks both). If it was not removed, and that is
       because a newer sitting replaced it (R2C-02) or because it is gone
       after this tab saw it (another tab finished it, or it was added to an
       account there), this tab stops and records nothing: the mock is not
       filed a second time, and the newer sitting is not removed. Only a
       sitting this browser never managed to write down at all is recorded
       without that step, since there is nothing to finalise and no other tab
       can have picked it up. */
    const sitting = { owner: mockOwnerRef.current, sittingId };
    if (!clearActiveMock(sitting)) {
      const loss = sittingLossNow();
      if (loss) {
        stopAs(loss);
        return;
      }
    }
    savedRef.current = true;
    const essays: MockEssay[] = [];
    if (task1Prompt) essays.push({ promptId: task1Prompt.id, task: 'task1', text: essay1, wordCount: countWords(essay1) });
    if (task2Prompt) essays.push({ promptId: task2Prompt.id, task: 'task2', text: essay2, wordCount: countWords(essay2) });
    /* One record per sitting: the history refuses a second record of the
       same sitting id (saveMockAttempt, R2D-03), and the learner evidence
       below is written only when this call is the one that recorded it. */
    const recorded = saveMockAttempt({
      id: mockId || nextMockId(startedAt || new Date().toISOString()),
      at: startedAt || new Date().toISOString(),
      listeningTestId: listeningTest.id,
      listeningBand: listeningResult.band,
      listeningRaw: listeningResult.raw,
      listeningTotal: listeningResult.total,
      readingTestId: readingTest.id,
      readingBand: readingResult.band,
      readingRaw: readingResult.raw,
      readingTotal: readingResult.total,
      essays,
      speakingBand: speakingResult?.overallBand,
      speakingSkipped,
      secondsUsed: listeningResult.secondsUsed + readingResult.secondsUsed + (WRITING_SECONDS - writingSecondsLeft),
      sittingId: sittingId || undefined,
    }, mockOwnerRef.current);
    if (!recorded) return;

    /* Learner-evidence recording (WP12): one aggregate event for the whole
       indivisible sitting (catalogue activity 'test:mock', domain
       'exam-skills', see catalog.ts's buildFixedActivities). The Listening
       and Reading legs already wrote their own detailed, per-item events as
       ordinary full papers (TestPlayer's own recording, attemptKind="full"
       above), and the Speaking leg's LiveExaminer records its own graded
       event too (see LiveExaminer.tsx). This is only the "a mock happened"
       summary, so it carries no items of its own, just the combined raw
       score and the same rounded overall band the results screen shows.
       Writing is never graded during a mock (see the header comment), so it
       has nothing to contribute here beyond the time spent, already folded
       into secondsUsed. */
    const bands = [listeningResult.band, readingResult.band];
    if (speakingResult) bands.push(speakingResult.overallBand);
    recordSubmission({
      activityId: 'test:mock',
      at: startedAt || new Date().toISOString(),
      mode: 'assessment',
      completion: 'completed',
      items: [],
      raw: listeningResult.raw + readingResult.raw,
      total: listeningResult.total + readingResult.total,
      bandEstimate: overallMockBand(bands),
      secondsUsed: listeningResult.secondsUsed + readingResult.secondsUsed + (WRITING_SECONDS - writingSecondsLeft),
      sourceMaterial: [paperExposureKey(listeningTest.id), paperExposureKey(readingTest.id)],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, ownerChanged]);

  function beginMock() {
    const now = new Date().toISOString();
    const owner = currentMockOwner();
    const freshId = newMockSittingId();
    const freshMockId = nextMockId(now);
    mockOwnerRef.current = owner;
    setOwnerChange(null);
    endedRef.current = null;
    setEnded(null);
    /* A fresh sitting replaces only THIS student's written-down one. Another
       student's unfinished mock on this browser is under their own key and
       is left exactly where it is. */
    setResumable(null);
    savedRef.current = false;
    setSittingId(freshId);
    setMockId(freshMockId);
    setStartedAt(now);
    setListeningResult(null);
    setReadingResult(null);
    setSpeakingResult(null);
    setSpeakingSkipped(false);
    setSpeakingInterrupted(false);
    setEssay1('');
    setEssay2('');
    setWritingEndsAt(null);
    setWritingSecondsLeft(WRITING_SECONDS);
    /* Written down NOW, before the Listening player mounts, with a new
       identity and no papers: the player keeps its answers and deadline
       inside this record, so the record has to be there first, and a
       different identity means nothing of an older sitting (its answers, its
       deadlines) can be picked up (R2B-03). This is the one place a sitting
       takes the place of an older one (R2C-02); every later save of it is an
       ordinary one that must match it. Whether it landed decides whether this
       sitting can later read as gone (R2D-03). */
    recordHeldRef.current = beginActiveMock({
      version: 1,
      owner,
      sittingId: freshId,
      mockId: freshMockId,
      startedAt: now,
      stage: 'listening',
      listeningTestId: listeningTest?.id ?? listeningId,
      readingTestId: readingTest?.id ?? readingId,
      task1PromptId: task1Prompt?.id ?? null,
      task2PromptId: task2Prompt?.id ?? null,
      listening: null,
      reading: null,
      essay1: '',
      essay2: '',
      writingEndsAt: null,
      speakingBand: null,
      speakingCriteria: null,
      speakingSkipped: false,
      legSittings: {},
      savedAt: Date.now(),
    });
    setStage('listening');
  }

  /* ── The sitting, written down as it goes (R2-03) ──────────────────────
     Everything that would otherwise exist only in this component's memory:
     which stage, which papers, which prompts, the legs already finished,
     both essays and the Writing deadline. Saved under the student sitting
     it, so a refresh, a stray navigation or a sign-out and a sign-in later
     hands it back to that same student and to nobody else. */
  function snapshot(): ActiveMockSnapshot {
    return {
      version: 1,
      owner: mockOwnerRef.current,
      sittingId,
      mockId,
      startedAt,
      stage,
      /* The papers actually on screen, which is what each player keeps its
         sitting under. */
      listeningTestId: listeningTest?.id ?? listeningId,
      readingTestId: readingTest?.id ?? readingId,
      task1PromptId: task1Prompt?.id ?? null,
      task2PromptId: task2Prompt?.id ?? null,
      listening: listeningResult,
      reading: readingResult,
      essay1,
      essay2,
      writingEndsAt,
      speakingBand: speakingResult?.overallBand ?? null,
      speakingCriteria: speakingResult?.criteria ?? null,
      speakingSkipped,
      savedAt: Date.now(),
    };
  }

  /* Declared after the recording effect on purpose: effects run in order, so
     on the results stage the record is written and the in-progress copy
     cleared first, and this one then has nothing to write (saveActiveMock
     refuses the start and results stages, and refuses outright once the
     student who started the sitting is no longer the one signed in). */
  useEffect(() => {
    if (stage === 'start' || stage === 'results' || !mockOwnerRef.current) return;
    if (endedRef.current) return;
    if (!ownerStillCurrent(mockOwnerRef.current)) return;
    if (saveActiveMock(snapshot())) {
      recordHeldRef.current = true;
      return;
    }
    /* Refused. If that is because a newer sitting took this one's place in
       another tab (R2C-02), or because the record this tab saw is gone
       (R2D-03), and the storage event was missed, this one stops here and
       writes nothing more. Any other refusal (no room left on the device,
       say) changes nothing on screen. */
    const loss = sittingLossNow();
    if (loss) stopAs(loss);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stage,
    sittingId,
    mockId,
    startedAt,
    listeningId,
    readingId,
    task1Prompt,
    task2Prompt,
    listeningResult,
    readingResult,
    essay1,
    essay2,
    writingEndsAt,
    speakingResult,
    speakingSkipped,
  ]);

  /** Put a written-down sitting back on screen. Only ever called with a
      record that belongs to the owner using this browser right now: the
      student's own offer on the start screen, or their own sitting when they
      sign back in while it is still open. */
  function resume(written: ActiveMock) {
    const held = reconcileActiveMock(written);
    mockOwnerRef.current = held.owner;
    savedRef.current = false;
    setOwnerChange(null);
    setResumable(null);
    /* The sitting's own identity, so each paper's player restores that
       sitting's answers and deadline, and no other sitting's (R2B-03). */
    setSittingId(held.sittingId);
    /* Picked up where the interview itself had been running: it was
       interrupted, and the brief says so. Kept when this same sitting was
       already showing that on its brief in this tab. */
    setSpeakingInterrupted(
      written.stage === 'speaking' || (written.sittingId === sittingId && speakingInterrupted),
    );
    setMockId(held.mockId);
    setStartedAt(held.startedAt);
    setListeningId(held.listeningTestId || listeningId);
    setReadingId(held.readingTestId || readingId);
    setTask1Prompt(WRITING_PROMPTS.find((p) => p.id === held.task1PromptId) ?? task1Prompt);
    setTask2Prompt(WRITING_PROMPTS.find((p) => p.id === held.task2PromptId) ?? task2Prompt);
    setListeningResult(held.listening);
    setReadingResult(held.reading);
    setEssay1(held.essay1);
    setEssay2(held.essay2);
    setSpeakingSkipped(held.speakingSkipped);
    setSpeakingResult(
      held.speakingBand != null ? { overallBand: held.speakingBand, criteria: held.speakingCriteria ?? {} } : null,
    );
    /* The deadline exactly as it was written down: never restarted, never
       extended. A between-papers screen picked up later starts its short
       beat again, which is not exam time. The Speaking interview is never
       re-entered on its own (reconcileActiveMock lands it on the brief). */
    setWritingEndsAt(held.writingEndsAt);
    setWritingSecondsLeft(writingSecondsLeftAt(held.writingEndsAt, Date.now(), WRITING_SECONDS));
    setStage(held.stage);
  }

  /* An unfinished sitting of this student's own, found when the page opens.
     Offered, never forced: the student chooses to carry on or to start again. */
  useEffect(() => {
    setResumable(loadActiveMock());
  }, []);

  /* The account using this browser changed part way through the sitting.
     The mock stops and records nothing under the new account: each leg
     TestPlayer already finished is saved under the student who sat it, and
     the combined record is simply not written, because it would have to be
     written under somebody who did not sit it.

     The flag is recomputed rather than latched, so the student who started
     the sitting signing back in clears it and lands back in their own mock
     (R2-03, see the effect below). Whoever is using the browser now is also
     offered their OWN unfinished sitting, if they have one. */
  useEffect(() => {
    return onOwnerChange(() => {
      setOwnerChange(
        mockOwnerRef.current && !ownerStillCurrent(mockOwnerRef.current) ? stoppedReason() : null,
      );
      setResumable(loadActiveMock());
    });
  }, []);

  /* Another tab wrote, or removed, the in-progress mock record. If that put
     a NEWER sitting of this same student in this one's place (a fresh mock
     started there, R2C-02), or took away the record this tab had seen
     written down (the other tab finished this same sitting, or it was added
     to an account there, R2D-03), this sitting stops here for good. A write
     of this same sitting (the student carrying on with it in the other tab)
     or another student's record stops nothing. The start screen and the
     results have no sitting to stop. */
  useEffect(() => {
    if (stage === 'start' || stage === 'results' || !sittingId) return;
    const onStorage = (event: StorageEvent) => {
      if (endedRef.current || !mockOwnerRef.current) return;
      if (!isActiveMockStorageKey(event.key)) return;
      const loss = sittingLossNow();
      if (loss) stopAs(loss);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [stage, sittingId]);

  /* The student who started the sitting is back, in this same open tab. The
     stopped screen had unmounted whatever paper was on screen, so the sitting
     is put back through the same path a reopened page uses: a paper handed
     in just before the sign-out counts as done instead of opening a second
     sitting of it, and a live interview lands on its brief. */
  const wasStoppedRef = useRef(false);
  useEffect(() => {
    if (ownerChanged) {
      wasStoppedRef.current = true;
      return;
    }
    if (!wasStoppedRef.current) return;
    wasStoppedRef.current = false;
    if (endedRef.current) return;
    if (!mockOwnerRef.current || !ownerStillCurrent(mockOwnerRef.current)) return;
    if (stage === 'start' || stage === 'results') return;
    /* While the student was away, the sitting may have been replaced, or
       taken away (added to an account in another tab, R2D-03): then there is
       nothing of it to put back, and this tab stops for good instead. */
    const loss = sittingLossNow();
    if (loss) {
      stopAs(loss);
      return;
    }
    /* This screen's memory, plus the papers' own sittings as this same
       sitting wrote them down (a paper handed in just before the sign-out
       is only there). Another sitting's papers are never borrowed. */
    const stored = loadActiveMock();
    const current = snapshot();
    resume({
      ...current,
      legSittings: stored && stored.sittingId === current.sittingId ? stored.legSittings : {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerChanged]);

  /* Developer shortcut for manual/automated verification: ?stage=speaking
     jumps straight to the Speaking brief screen with synthesized Listening,
     Reading and Writing results, skipping ~2h45 of real exam flow. Honoured
     only in dev builds — import.meta.env.DEV is statically false in a
     production build, so this whole branch is dead code there. */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (new URLSearchParams(window.location.search).get('stage') !== 'speaking') return;
    const now = new Date().toISOString();
    const owner = currentMockOwner();
    const freshId = newMockSittingId();
    const freshMockId = nextMockId(now);
    const listening = { raw: 32, total: 40, band: 7, bandLabel: '7', secondsUsed: 28 * 60 };
    const reading = { raw: 30, total: 40, band: 6.5, bandLabel: '6.5', secondsUsed: 58 * 60 };
    const essayOne = '(dev shortcut: Task 1 left blank)';
    const essayTwo = '(dev shortcut: Task 2 left blank)';
    mockOwnerRef.current = owner;
    setSittingId(freshId);
    setMockId(freshMockId);
    setStartedAt(now);
    setListeningResult(listening);
    setReadingResult(reading);
    setEssay1(essayOne);
    setEssay2(essayTwo);
    setWritingSecondsLeft(0);
    /* A sitting of its own, begun the one way a sitting may begin, so its
       later saves are ordinary ones that match it (R2C-02). */
    recordHeldRef.current = beginActiveMock({
      version: 1,
      owner,
      sittingId: freshId,
      mockId: freshMockId,
      startedAt: now,
      stage: 'speaking-brief',
      listeningTestId: listeningTest?.id ?? listeningId,
      readingTestId: readingTest?.id ?? readingId,
      task1PromptId: task1Prompt?.id ?? null,
      task2PromptId: task2Prompt?.id ?? null,
      listening,
      reading,
      essay1: essayOne,
      essay2: essayTwo,
      writingEndsAt: null,
      speakingBand: null,
      speakingCriteria: null,
      speakingSkipped: false,
      legSittings: {},
      savedAt: Date.now(),
    });
    setStage('speaking-brief');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The result a paper was just handed in with: the one the player kept
      inside THIS sitting (R2B-03). Only if that could not be written down
      (no room left on the device) is the paper's latest history row read
      instead, which right after the student's own Submit is the same paper. */
  function legResultNow(test: PracticeTest): LegResult | null {
    const kept = mockLegResult({ owner: mockOwnerRef.current, sittingId }, test.id);
    if (kept) return kept;
    const legAttempts = getAttempts(test.id);
    const last = legAttempts[legAttempts.length - 1]?.attempt;
    return last
      ? { raw: last.raw, total: last.total, band: last.band, bandLabel: last.bandLabel, secondsUsed: last.secondsUsed }
      : null;
  }

  function handleListeningFinish() {
    if (!listeningTest) return;
    const done = legResultNow(listeningTest);
    if (done) setListeningResult(done);
    setStage('transition-reading');
  }

  function handleReadingFinish() {
    if (!readingTest) return;
    const done = legResultNow(readingTest);
    if (done) setReadingResult(done);
    setStage('transition-writing');
  }

  /** The interview left the screen without a band (R2B-02). A deliberate
      cancellation skips Speaking and goes to the results; a suspension (the
      account on this browser changed) goes back to the Speaking brief with
      nothing skipped and nothing recorded, and nothing is saved while the
      sitting's student is away. */
  function leaveSpeaking(reported: SpeakingExit) {
    const next = afterSpeakingExit(speakingExitFor(reported, mockOwnerRef.current));
    setSpeakingSkipped(next.speakingSkipped);
    setSpeakingInterrupted(next.stage === 'speaking-brief');
    setStage(next.stage);
  }

  /* This sitting is over in this tab: a newer sitting of this same student
     took its place in another tab (R2C-02), or the record this tab had seen
     is gone, finished or added to an account in another tab (R2D-03), or
     the paper on screen was already handed in from another tab that had
     picked up this same sitting (R2E-03, told by the paper's player: the
     sitting itself is still written down and carries on from that tab).
     Checked before the account change below because it is for good in this
     tab: the sitting is no longer this tab's to carry on (replaced or gone,
     it is written down nowhere as this tab left it; handed in, it carries
     on from the other tab), so the promise that it picks up again here when
     its student signs back in would not hold. Nothing of it is written or
     recorded from here on. One sentence per case, each
     true for its case, says what happened and what it means; the way on is
     the other tab, or the hub. */
  if (ended) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
        <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover" role="status">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Mock exam stopped')}</p>
          <h1 className="mt-1 font-display text-xl font-extrabold leading-snug">
            {ended === 'replaced'
              ? t('A newer mock exam was started in another tab, so this one is no longer being saved.')
              : ended === 'handed-in'
                ? t('This paper was already handed in from another tab, so it was not handed in again here. The mock exam carries on from that tab.')
                : t('This mock exam was finished or closed in another tab, so this one is no longer being saved.')}
          </h1>
          <div className="mt-8 flex items-center justify-between gap-3">
            <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
              {t('Back')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* The account changed part way through: the sitting stops here, nothing is
     recorded, and the screen says so plainly. Whatever each finished leg
     already saved stays with the student who sat it, and so does the
     written-down sitting itself: "Start a fresh mock exam" only clears this
     screen's memory and never touches that student's saved copy, so they
     can pick it up when they are back (straight away in this tab, or from
     the offer on the start screen). */
  if (ownerChanged) {
    const otherStudent = ownerChange === 'other-student';
    /* The results of a sitting already recorded (R2E-02): its essays and
       bands leave the screen like any review, and what is true to say is
       where they are kept, not that a sitting is waiting to pick up. */
    const recordedResults = stage === 'results' && savedRef.current;
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4">
        <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover" role="status">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Mock exam stopped')}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">
            {otherStudent
              ? t('This mock exam belongs to another student')
              : recordedResults
                ? t('You signed out, so these results are hidden')
                : t('You signed out during this mock exam')}
          </h1>
          {recordedResults ? (
            <p className="mt-3 text-ink-muted">
              {otherStudent
                ? t('A different account is using this browser now, so the results of this mock exam are hidden. They are saved in the history of the student who sat it.')
                : t('You are signed out now, so the results of this mock exam are hidden. They are saved in the history of the account that sat it, ready for when you sign back in.')}
            </p>
          ) : (
            <>
              <p className="mt-3 text-ink-muted">
                {t('The account on this browser changed part way through, so nothing from this sitting was saved to it. Each paper that was already finished stays with the student who sat it.')}
              </p>
              <p className="mt-2 text-ink-muted">
                {t('The sitting itself is kept for the student who started it, and it picks up where it stopped when they sign back in on this browser.')}
              </p>
            </>
          )}
          <div className="mt-8 flex items-center justify-between gap-3">
            <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
              {t('Back')}
            </a>
            <button
              type="button"
              onClick={() => {
                /* Memory only. The previous student's saved sitting stays
                   under their own key, untouched. */
                mockOwnerRef.current = '';
                setOwnerChange(null);
                savedRef.current = false;
                recordHeldRef.current = false;
                setSittingId('');
                setSpeakingInterrupted(false);
                setMockId('');
                setStartedAt('');
                setListeningResult(null);
                setReadingResult(null);
                setSpeakingResult(null);
                setSpeakingSkipped(false);
                setEssay1('');
                setEssay2('');
                setWritingEndsAt(null);
                setWritingSecondsLeft(WRITING_SECONDS);
                /* The start screen then offers whoever is here now their OWN
                   unfinished sitting, if they have one. */
                setResumable(loadActiveMock());
                setStage('start');
              }}
              className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
            >
              {t('Start a fresh mock exam')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!listeningTest || !readingTest) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface-alt p-4 text-center">
        <p className="text-ink-muted">{t('No practice tests are available to build a mock exam right now.')}</p>
      </div>
    );
  }

  if (stage === 'start') {
    return (
      <StartScreen
        hubUrl={hubUrl}
        listeningTests={listeningTests}
        readingTests={readingTests}
        listeningId={listeningId}
        readingId={readingId}
        onChangeListening={setListeningId}
        onChangeReading={setReadingId}
        pairLabelText={pairLabel(ALL_TESTS, { listening: listeningTest, reading: readingTest })}
        onStart={beginMock}
        resumable={resumable}
        onResume={() => {
          /* Read again at the moment of the click, never taken from what
             was on screen: the account may have changed since the offer
             was drawn, and only the current owner's own sitting resumes. */
          const held = loadActiveMock();
          if (held) {
            /* Found written down: from here on its disappearance is a
               loss for this tab (R2D-03). */
            recordHeldRef.current = true;
            resume(held);
          } else setResumable(null);
        }}
      />
    );
  }

  /* Each paper is keyed by the sitting as well as the paper, so a different
     sitting always mounts a fresh player, and each is told which sitting it
     belongs to, so its answers and deadline are kept there (R2B-03). A paper
     that finds the sitting replaced or gone (a refused save, or its hand-in
     refused before anything was recorded) tells this screen, which stops
     the whole sitting (R2D-03). */
  const legOf = { owner: mockOwnerRef.current, sittingId };

  if (stage === 'listening') {
    return (
      <TestPlayer
        key={`${sittingId}:${listeningTest.id}`}
        test={listeningTest}
        hubUrl={hubUrl}
        attemptKind="full"
        onFinish={handleListeningFinish}
        mockSitting={legOf}
        onSittingLost={stopAs}
      />
    );
  }

  if (stage === 'transition-reading') {
    return (
      <TransitionScreen
        next="Reading"
        subtitle={t('Reading Test {n} · {minutes} minutes', {
          n: testNumber(readingTest, readingTests),
          minutes: readingTest.durationMinutes,
        })}
        onContinue={() => setStage('reading')}
      />
    );
  }

  if (stage === 'reading') {
    return (
      <TestPlayer
        key={`${sittingId}:${readingTest.id}`}
        test={readingTest}
        hubUrl={hubUrl}
        attemptKind="full"
        onFinish={handleReadingFinish}
        mockSitting={legOf}
        onSittingLost={stopAs}
      />
    );
  }

  if (stage === 'transition-writing') {
    return (
      <TransitionScreen
        next="Writing"
        subtitle={t('Task 1 and Task 2 · 60 minutes total')}
        onContinue={() => setStage('writing')}
      />
    );
  }

  if (stage === 'writing') {
    return (
      <WritingLeg
        task1={task1Prompt}
        task2={task2Prompt}
        essay1={essay1}
        essay2={essay2}
        onChangeEssay1={setEssay1}
        onChangeEssay2={setEssay2}
        secondsLeft={writingSecondsLeft}
        onFinish={() => setStage('speaking-brief')}
      />
    );
  }

  if (stage === 'speaking-brief') {
    return (
      <SpeakingBriefScreen
        interrupted={speakingInterrupted}
        onStart={() => {
          setSpeakingInterrupted(false);
          setStage('speaking');
        }}
        onSkip={() => {
          setSpeakingSkipped(true);
          setStage('results');
        }}
      />
    );
  }

  if (stage === 'speaking') {
    return (
      <div className="screen-in min-h-dvh bg-surface-alt px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <LiveExaminer
            variant="full"
            mock
            onComplete={(result) => {
              setSpeakingResult(result);
              setStage('results');
            }}
            onAbort={() => leaveSpeaking('cancelled')}
            onSuspend={() => leaveSpeaking('suspended')}
          />
        </div>
      </div>
    );
  }

  return (
    <ResultsScreen
      hubUrl={hubUrl}
      listeningTest={listeningTest}
      readingTest={readingTest}
      listeningResult={listeningResult}
      readingResult={readingResult}
      task1={task1Prompt}
      task2={task2Prompt}
      essay1={essay1}
      essay2={essay2}
      speakingResult={speakingResult}
      speakingSkipped={speakingSkipped}
    />
  );
}

function StartScreen({
  hubUrl,
  listeningTests,
  readingTests,
  listeningId,
  readingId,
  onChangeListening,
  onChangeReading,
  pairLabelText,
  onStart,
  resumable,
  onResume,
}: {
  hubUrl: string;
  listeningTests: PracticeTest[];
  readingTests: PracticeTest[];
  listeningId: string;
  readingId: string;
  onChangeListening: (id: string) => void;
  onChangeReading: (id: string) => void;
  pairLabelText: string;
  onStart: () => void;
  resumable: ActiveMock | null;
  onResume: () => void;
}) {
  const { t } = useT();
  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Mock Exam Day')}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{t('A full IELTS sitting, back to back')}</h1>
        {resumable && <ResumeOffer held={resumable} onResume={onResume} />}
        <p className="mt-2 text-ink-muted">
          {t('Listening, then Reading, then Writing, then Speaking, the same order and pace as the real test day, with no breaks in between. About 2 hours 45 minutes for the first three papers, plus 14 minutes for Speaking.')}
        </p>

        {/* Each bullet opens with a paper name, which is never translated, so
            the bold stays put and only the sentence after it is a key. Where a
            second <strong> sat mid sentence it had to go: Russian puts those
            words somewhere else (docs/I18N-GUIDE.md). */}
        <details className="support-disclosure"><summary>{t('Paper details and scoring')}</summary>
        <ul className="mt-6 space-y-2.5 text-sm text-ink">
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><ListeningIcon /></span>
            <span>
              <strong>Listening</strong>{' '}
              {t('(about 30 minutes, plus time at the end to check your answers). The recording plays once, exam conditions.')}
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><ReadingIcon /></span>
            <span><strong>Reading</strong> {t('(60 minutes), straight after.')}</span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><WritingIcon /></span>
            <span>
              <strong>Writing</strong>{' '}
              {t('(60 minutes): Task 1 and Task 2 share one clock, a suggested 20 minutes on Task 1 and 40 on Task 2, same as the real exam.')}
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><SpeakingIcon /></span>
            <span>
              <strong>Speaking</strong>{' '}
              {t('(about 14 minutes): a real-time voice conversation with the AI examiner, Part 1 interview, Part 2 long turn, Part 3 discussion. Needs a microphone, and an account if this site requires one for it. You can skip this stage.')}
            </span>
          </li>
          <li className="flex gap-2.5">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted"><NoGradingIcon /></span>
            <span>
              {t("Listening, Reading and Speaking are graded automatically. Writing isn't graded during the mock, score it afterwards in the Writing Checker.")}
            </span>
          </li>
        </ul>
        </details>

        <div className="mt-6 space-y-3 rounded-card border border-border bg-surface-alt p-4">
          <p className="text-sm font-semibold">{t('Choose your tests')}</p>
          <label className="block text-sm">
            {/* The two paper names stay English, here and in the options. */}
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Listening</span>
            <select
              value={listeningId}
              onChange={(e) => onChangeListening(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium focus:border-brand"
            >
              {listeningTests.map((item) => (
                <option key={item.id} value={item.id}>
                  {t('Listening Test {n}', { n: testNumber(item, listeningTests) })}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink-muted">Reading</span>
            <select
              value={readingId}
              onChange={(e) => onChangeReading(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium focus:border-brand"
            >
              {readingTests.map((item) => (
                <option key={item.id} value={item.id}>
                  {t('Reading Test {n}', { n: testNumber(item, readingTests) })}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-ink-muted">
            {t("Defaulted to the next tests you haven't taken: {pair}.", { pair: pairLabelText })}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <a href={hubUrl} className="inline-block px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {t('Back')}
          </a>
          <button
            type="button"
            onClick={onStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
          >
            {t('Start Mock Exam')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The paper a sitting stopped on, as the student would name it. Paper names
    stay English in both interface languages. */
function paperAt(stage: MockStage): string {
  if (stage === 'listening') return 'Listening';
  if (stage === 'transition-reading' || stage === 'reading') return 'Reading';
  if (stage === 'transition-writing' || stage === 'writing') return 'Writing';
  return 'Speaking';
}

/** The student's own unfinished sitting, offered back on the start screen
    (R2-03). Only ever given a record loadActiveMock() returned, which is
    the current owner's and nobody else's. It says what is already done and
    where the sitting picks up, in plain words, and it is honest about the
    Writing clock: that deadline kept running while the student was away. */
function ResumeOffer({ held, onResume }: { held: ActiveMock; onResume: () => void }) {
  const { t, tn } = useT();
  /* Read as the sitting WILL be put back: a paper handed in just before the
     page went away already counts as finished here. */
  const shown = useMemo(() => reconcileActiveMock(held), [held]);
  const finished: string[] = [];
  if (shown.listening) finished.push('Listening');
  if (shown.reading) finished.push('Reading');
  if (shown.stage === 'speaking-brief' || shown.stage === 'speaking') finished.push('Writing');
  const writingLeft =
    shown.stage === 'writing' && shown.writingEndsAt !== null
      ? writingSecondsLeftAt(shown.writingEndsAt, Date.now(), WRITING_SECONDS)
      : null;
  return (
    <div className="mt-6 mb-6 rounded-card border border-brand/30 bg-brand-tint p-5" role="region" aria-labelledby="mock-resume-heading">
      <p id="mock-resume-heading" className="font-display text-base font-bold text-ink">
        {t('You have an unfinished mock exam')}
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {finished.length > 0
          ? t('Finished so far: {papers}.', { papers: finished.join(', ') })
          : t('No paper is finished yet.')}{' '}
        {t('It picks up at {paper}.', { paper: paperAt(shown.stage) })}
      </p>
      {writingLeft !== null && (
        <p className="mt-1 text-sm text-ink-muted">
          {/* Whole minutes, rounded DOWN: never promise a minute that is
              not there. The clock itself shows the seconds once resumed. */}
          {writingLeft >= 60
            ? tn(Math.floor(writingLeft / 60), {
                one: '{n} minute is left on the Writing clock.',
                other: '{n} minutes are left on the Writing clock.',
              })
            : writingLeft > 0
              ? t('Less than a minute is left on the Writing clock.')
              : t('The Writing time has run out.')}
        </p>
      )}
      <button
        type="button"
        onClick={onResume}
        className="mt-4 rounded-button bg-brand px-5 py-2.5 font-display text-sm font-bold text-white transition-colors hover:bg-brand-hover"
      >
        {t('Continue where you left off')}
      </button>
      <p className="mt-3 text-xs text-ink-muted">
        {t('Starting a new mock exam below replaces this unfinished one. Papers you already finished stay in your history.')}
      </p>
    </div>
  );
}

/** Between-legs screen (feature spec: "Exam continues: Reading starts in 60
    seconds"). A real sitting has no break, but a screen change still needs a
    beat — the countdown is short and skippable, never a real pause. */
function TransitionScreen({ next, subtitle, onContinue }: { next: string; subtitle: string; onContinue: () => void }) {
  // `t`/`tn` are the translator here; the `t` inside the countdown updater
  // below is its own local number and is deliberately left alone.
  const { t, tn } = useT();
  const [secondsLeft, setSecondsLeft] = useState(TRANSITION_SECONDS);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const id = window.setInterval(() => {
      setSecondsLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          if (!firedRef.current) {
            firedRef.current = true;
            onContinue();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNow() {
    if (firedRef.current) return;
    firedRef.current = true;
    onContinue();
  }

  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Exam continues')}</p>
        <h1 className="mt-1 font-display text-xl font-extrabold">
          {/* `next` is a paper name (Reading, Writing) and stays English. */}
          {tn(
            secondsLeft,
            { one: '{paper} starts in {n} second', other: '{paper} starts in {n} seconds' },
            { paper: next },
          )}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
        <button
          type="button"
          onClick={startNow}
          className="mt-6 rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          {t('Start now')}
        </button>
      </div>
    </div>
  );
}

function WritingLeg({
  task1,
  task2,
  essay1,
  essay2,
  onChangeEssay1,
  onChangeEssay2,
  secondsLeft,
  onFinish,
}: {
  task1?: EssayPrompt;
  task2?: EssayPrompt;
  essay1: string;
  essay2: string;
  onChangeEssay1: (v: string) => void;
  onChangeEssay2: (v: string) => void;
  secondsLeft: number;
  onFinish: () => void;
}) {
  const { t } = useT();
  const timerWarn = secondsLeft <= 300;
  return (
    <div className="screen-in flex min-h-dvh flex-col bg-surface text-ink">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <span className="font-display text-sm font-bold">{t('Mock Exam · Writing')}</span>
        <div
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold sm:gap-2 sm:px-4 ${
            timerWarn ? 'animate-pulse bg-error-tint text-error' : 'bg-surface-alt text-ink'
          }`}
          role="timer"
          aria-label={t('Time remaining')}
        >
          <span aria-hidden="true">⏱</span>
          {fmtClock(secondsLeft)}
        </div>
        <button
          type="button"
          onClick={onFinish}
          className="shrink-0 rounded-button bg-brand px-3 py-1.5 font-display text-sm font-semibold text-white hover:bg-brand-hover sm:px-4"
        >
          {t('Finish Writing')}
        </button>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-6 sm:px-6">
        {/* One key: the two <strong> minute counts sat mid sentence, where
            Russian cannot keep them (docs/I18N-GUIDE.md). */}
        <p className="rounded-card border border-border bg-surface-alt px-4 py-3 text-sm text-ink-muted">
          {t("Suggested timing: about {first} minutes on Task 1, then {second} minutes on Task 2. One clock for both, split it however suits you, then submit when you're done or when time runs out.", {
            first: task1?.suggestedMinutes ?? 20,
            second: task2?.suggestedMinutes ?? 40,
          })}
        </p>

        <WritingTaskBlock label="Task 1 (Academic)" prompt={task1} value={essay1} onChange={onChangeEssay1} />
        <WritingTaskBlock label="Task 2" prompt={task2} value={essay2} onChange={onChangeEssay2} />
      </div>
    </div>
  );
}

function WritingTaskBlock({
  label,
  prompt,
  value,
  onChange,
}: {
  label: string;
  prompt?: EssayPrompt;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useT();
  const wordCount = countWords(value);
  // `label` is "Task 1 (Academic)" / "Task 2", which stay English everywhere.
  if (!prompt) {
    return (
      <section>
        <p className="rounded-card border border-border bg-surface-alt p-4 text-sm text-ink-muted">
          {t('No {label} prompt is available right now.', { label })}
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="rounded-card border border-border bg-surface p-5 shadow-card">
        <span className="text-xs font-bold uppercase tracking-wider text-brand">
          {t('{label} · ~{minutes} min', { label, minutes: prompt.suggestedMinutes })}
        </span>
        <Html as="p" className="mt-2 text-[0.95rem] leading-relaxed" html={prompt.promptHtml} />
        {prompt.imageUrl && (
          <img src={asset(prompt.imageUrl)} alt={t('Task visual')} className="mt-3 w-full rounded-lg border border-border" />
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={12}
        placeholder={t('Write your answer here…')}
        aria-label={t('{label} answer', { label })}
        className="mt-3 w-full rounded-card border border-border bg-surface p-4 text-[0.95rem] leading-relaxed shadow-card focus:border-brand focus:outline-none"
      />
      <p className={`mt-2 text-sm font-semibold ${wordCount >= prompt.minWords ? 'text-success' : 'text-ink-muted'}`}>
        {t('{count} / {min}+ words', { count: wordCount, min: prompt.minWords })}
      </p>
    </section>
  );
}

/** Part 4's brief screen: the same sign-in gate the standalone live
    examiner page uses (isAuthConfigured/onAuthChange/fetchLiveConfig,
    identical to LiveExaminer's own — see its file header), reduced to just
    the decision this screen needs to make: can "Start speaking test" be
    pressed right now, or does the student need to sign in first? Either
    way "Skip speaking" stays available, so a student who'd rather not
    (no mic, no time, doesn't want to sign in) can still finish the sitting
    with three papers. */
function SpeakingBriefScreen({
  interrupted,
  onStart,
  onSkip,
}: {
  /** The interview was stopped part way (R2B-02), so this sitting is back
      here with Speaking neither done nor skipped. */
  interrupted: boolean;
  onStart: () => void;
  onSkip: () => void;
}) {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [liveConfig, setLiveConfig] = useState<LiveConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  useEffect(() => {
    if (!LIVE_EXAMINER_URL) return;
    let cancelled = false;
    fetchLiveConfig(LIVE_EXAMINER_URL)
      .then((cfg) => {
        if (!cancelled) setLiveConfig(cfg);
      })
      .catch(() => {
        /* Can't tell yet whether sign-in is required — Start stays
           disabled until it resolves or the student skips. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const authConfigured = isAuthConfigured();
  const requiresSignIn = liveConfig?.requiresSignIn === true;
  const needsSignIn = requiresSignIn && authConfigured && !user;
  const authUnavailable = requiresSignIn && !authConfigured;
  const examinerConfigured = !!LIVE_EXAMINER_URL;
  const canStart = examinerConfigured && !needsSignIn && !authUnavailable;

  return (
    <div className="screen-in grid min-h-dvh place-items-center bg-surface-alt p-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center shadow-card-hover">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Part 4 of 4')}</p>
        {/* The paper name itself is never translated. */}
        <h1 className="mt-1 font-display text-2xl font-extrabold">Speaking</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t('About 14 minutes with the AI examiner: Part 1 interview, Part 2 long turn, Part 3 discussion. You need a microphone and to be signed in.')}
        </p>

        {interrupted && (
          <p className="mt-5 rounded-lg bg-surface-alt px-3 py-3 text-left text-xs text-ink-muted" role="status">
            {t('Your speaking test was interrupted before it finished, so it is not part of this mock yet. Start it again when you are ready, or skip it.')}
          </p>
        )}

        {needsSignIn && (
          <div className="mt-5 rounded-lg bg-warning-tint px-3 py-3 text-left text-xs text-ink-muted">
            <p>{t('Sign in to take the speaking test (this keeps the paid voice service for real students).')}</p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="mt-2 rounded-button border border-border px-4 py-1.5 text-xs font-semibold hover:bg-surface-alt"
            >
              {/* "Sign in" is translated once, in dict/ru/shell.ts. */}
              {t('Sign in')}
            </button>
          </div>
        )}
        {authUnavailable && (
          <p className="mt-5 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            {t('The speaking test needs accounts to be enabled on this site.')}
          </p>
        )}
        {!examinerConfigured && (
          <p className="mt-5 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
            {t("The speaking test isn't configured on this site yet.")}
          </p>
        )}

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded-button bg-brand px-6 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('Start speaking test')}
          </button>
          <button type="button" onClick={onSkip} className="px-1 py-2 -my-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {t('Skip speaking')}
          </button>
        </div>

        {showAuthModal && <AuthModal initialMode="signin" onClose={() => setShowAuthModal(false)} />}
      </div>
    </div>
  );
}

function ResultsScreen({
  hubUrl,
  listeningTest,
  readingTest,
  listeningResult,
  readingResult,
  task1,
  task2,
  essay1,
  essay2,
  speakingResult,
  speakingSkipped,
}: {
  hubUrl: string;
  listeningTest: PracticeTest;
  readingTest: PracticeTest;
  listeningResult: LegResult | null;
  readingResult: LegResult | null;
  task1?: EssayPrompt;
  task2?: EssayPrompt;
  essay1: string;
  essay2: string;
  speakingResult: SpeakingLegResult | null;
  speakingSkipped: boolean;
}) {
  const { t } = useT();
  const graderReady = isGraderConfigured();

  /* Each paper's result stands on its own here, on purpose. The site's real
     evidence policy shows one "overall" band only once all four papers
     carry real scored or graded evidence (PolicyOutputV1.overall, see
     contracts/policy.ts), and Writing is never graded inside the mock (see
     the header comment above and WritingResultCard below), so that
     condition never holds for a mock sitting recorded today, and
     mockOverallAllowed(...) says so explicitly rather than this screen
     quietly averaging whatever it happens to have. A combined figure built
     from two or three papers would look like the real thing without being
     it, so it is not shown at all; the four cards below carry the honest
     detail instead. */
  const overallAllowed = mockOverallAllowed({
    listeningScored: listeningResult != null,
    readingScored: readingResult != null,
    writingGraded: false,
    speakingScored: speakingResult != null,
  });
  const scoredIntro = speakingResult
    ? t('Listening, Reading and Speaking are scored automatically.')
    : speakingSkipped
      ? t('Listening and Reading are scored automatically; you skipped Speaking.')
      : t('Listening and Reading are scored automatically.');

  return (
    <div className="screen-in mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-brand">{t('Mock Exam Day · Results')}</p>
      <h1 className="mt-1 font-display text-2xl font-extrabold">{t("You've finished the sitting")}</h1>
      <p className="mt-2 text-ink-muted">
        {scoredIntro}{' '}
        {t("Writing isn't auto-scored here, so get real feedback on your essays in the Writing Checker.")}
      </p>

      {!overallAllowed && (
        <div className="mt-6 rounded-card border border-border bg-surface-alt p-5">
          <p className="text-sm font-semibold text-ink">{t('Each paper below stands on its own.')}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {t(
              "There is no single overall band on this screen. Writing isn't graded during the mock, so an honest overall would need a fourth number this sitting does not have yet. Send your essays to the Writing Checker afterwards, then read each paper's result for what it is.",
            )}
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResultCard title={listeningTest.title} raw={listeningResult?.raw} total={listeningResult?.total} bandLabel={listeningResult?.bandLabel} />
        <ResultCard title={readingTest.title} raw={readingResult?.raw} total={readingResult?.total} bandLabel={readingResult?.bandLabel} />
        <WritingResultCard essay1={essay1} essay2={essay2} graderReady={graderReady} />
        <SpeakingResultCard result={speakingResult} skipped={speakingSkipped} />
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="font-display text-lg font-bold">{t('Your essays')}</h2>
        <EssayCard label="Task 1" prompt={task1} text={essay1} />
        <EssayCard label="Task 2" prompt={task2} text={essay2} />
      </div>

      {graderReady ? (
        <a
          href={withBase('/writing/checker')}
          className="mt-6 inline-block rounded-button bg-brand px-5 py-3 font-display text-sm font-bold text-white hover:bg-brand-hover"
        >
          {t('Get AI feedback on these essays')}
        </a>
      ) : (
        <p className="mt-6 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
          {t("AI feedback isn't available on this build. Your essays are saved on this device either way.")}
        </p>
      )}

      {speakingSkipped && (
        <p className="mt-6 rounded-lg bg-warning-tint px-3 py-2 text-xs text-ink-muted">
          {/* The link sits at the end of the sentence in both languages, so it
              stays a link instead of collapsing into the translated text. */}
          {t("You skipped Speaking, so it isn't in your overall band above. You can take a full Speaking test any time at")}{' '}
          <a href={withBase('/speaking/examiner')} className="font-semibold underline">{t('the live AI examiner')}</a>.
        </p>
      )}

      <div className="mt-8">
        <a href={hubUrl} className="text-sm font-semibold text-brand hover:underline">
          {t('Back to Tests')}
        </a>
      </div>
    </div>
  );
}

function ResultCard({
  title,
  raw,
  total,
  bandLabel,
}: {
  title: string;
  raw?: number;
  total?: number;
  bandLabel?: string;
}) {
  const { t } = useT();
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      {/* `title` is the paper's own title, which is exam data and stays as is.
          `bandLabel` is a number like "7.0" or the one phrase "below 2.5"
          (marked with nt() in src/lib/tests/schema.ts). */}
      <p className="text-sm font-semibold text-ink-muted">{title}</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-brand">{bandLabel != null ? t(bandLabel) : '—'}</p>
      {raw != null && total != null && (
        <p className="mt-1 text-xs text-ink-muted">{t('{raw} / {total} correct', { raw, total })}</p>
      )}
    </div>
  );
}

/** Writing never gets a band in the mock (see the note in ResultsScreen
    above), so this card shows what there is instead: word counts, and a
    reminder that real feedback lives one click away in the Writing
    Checker. */
function WritingResultCard({ essay1, essay2, graderReady }: { essay1: string; essay2: string; graderReady: boolean }) {
  const { t, tn } = useT();
  const words = countWords(essay1) + countWords(essay2);
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      {/* Paper name, never translated. */}
      <p className="text-sm font-semibold text-ink-muted">Writing</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-ink-muted">—</p>
      <p className="mt-1 text-xs text-ink-muted">
        {tn(
          words,
          { one: '{n} word · {status}', other: '{n} words · {status}' },
          { status: graderReady ? t('score it below') : t('not scored here') },
        )}
      </p>
    </div>
  );
}

function SpeakingResultCard({ result, skipped }: { result: SpeakingLegResult | null; skipped: boolean }) {
  const { t } = useT();
  return (
    <div className="rounded-card border border-border bg-surface p-5 text-center shadow-card">
      {/* Paper name, never translated. */}
      <p className="text-sm font-semibold text-ink-muted">Speaking</p>
      <p className="mt-2 font-display text-3xl font-extrabold text-brand">
        {result ? result.overallBand.toFixed(1) : '—'}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {result ? t('live AI examiner') : skipped ? t('Skipped') : t('not taken')}
      </p>
    </div>
  );
}

function EssayCard({ label, prompt, text }: { label: string; prompt?: EssayPrompt; text: string }) {
  const { t, tn } = useT();
  const wordCount = countWords(text);
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* "Task 1" / "Task 2" stay English. */}
        <span className="text-xs font-bold uppercase tracking-wider text-brand">{label}</span>
        <span className="text-xs text-ink-muted">{tn(wordCount, { one: '{n} word', other: '{n} words' })}</span>
      </div>
      {prompt && <Html as="p" className="mt-2 text-sm text-ink-muted" html={prompt.promptHtml} />}
      <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{text || <span className="text-ink-muted">{t('(left blank)')}</span>}</p>
    </div>
  );
}
