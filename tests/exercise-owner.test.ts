/* The focused Reading and Listening exercise, and the lesson quick check,
 * belong to the student they were opened for.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/exercise-owner.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * The essay editor (R2B-01) and the written focused task were made sessions
 * bound to one student. The two other screens that host the lesson help
 * buttons were not: FocusedExercise.tsx and PracticeQuiz.tsx kept the
 * previous student's answers on screen after an account change, and a press
 * of check recorded them, with their score and the help each had, into
 * whoever was signed in by then. Both now follow
 * src/components/learning/exercise-owner.ts: bound when the exercise is
 * opened or restored, handed over when the owner changes, a press claimed
 * (refused, recording nothing, for a student who has gone) and recorded
 * through a writer that takes the owner (recordSubmissionFor and
 * recordEventsFor in src/lib/learning/store.browser.ts).
 *
 * WHAT IS REAL AND WHAT IS MIRRORED
 * Real: the owner module (with this application's account session read from
 * the storage below, as it is in a browser), the learner store and its
 * explicit-owner writers, the exercise-owner helper, both in-progress stores
 * (focused-exercise.ts and lesson-check.ts), the real registry entry and the
 * real quick-check set with their identities, and requestOwnedLessonHelp
 * with the tutor client (network and account answered from memory, as
 * tests/lesson-evidence-owner.test.ts does). The components themselves cannot
 * be imported here (the test loader does not read JSX), so the screens below
 * mirror their steps line for line, and the last tests read the components'
 * own source to check they still have that shape.
 *
 * Every student, token, answer and reply below is SYNTHETIC. No model is
 * called, and no reply here is presented as a live one: each says so.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

/* ------------------------------------------------------------------ */
/* A browser, an account and a network, in memory                      */
/* ------------------------------------------------------------------ */

interface MemoryStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let local = memoryStorage();

/* Defined before anything under test is imported. */
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return local;
  },
  get sessionStorage() {
    return memoryStorage();
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};

/** The session the synthetic account client hands out right now. */
let held: { token: string; userId: string } | null = null;

(globalThis as Record<string, unknown>).__exerciseTestSupabase = {
  auth: {
    async getSession() {
      const now = held;
      return { data: { session: now ? { access_token: now.token, user: { id: now.userId } } : null } };
    },
  },
};

/* SYNTHETIC and never reached: fetch below answers everything itself. The
   account project address is given to the owner module too, so it reads
   this application's own session key from the storage above exactly as it
   does in a browser. */
const TUTOR_URL = 'https://synthetic-tutor.invalid/tutor';
const ACCOUNT_URL = 'https://synthetic-exercise.invalid';
(globalThis as Record<string, unknown>).__exerciseTestEnv = {
  PUBLIC_MR_EZ_URL: TUTOR_URL,
  PUBLIC_SUPABASE_URL: ACCOUNT_URL,
  PUBLIC_SUPABASE_ANON_KEY: 'SYNTHETIC-anon-key',
};

const ENV_PRELUDE = 'Object.defineProperty(import.meta, "env", { get: () => globalThis.__exerciseTestEnv });\n';

registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__exerciseTestSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    const loaded = next(url, context);
    if (url.endsWith('/src/lib/tutor/client.ts') || url.endsWith('/src/lib/store-owner.ts')) {
      const source =
        typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return { ...loaded, source: ENV_PRELUDE + source };
    }
    return loaded;
  },
});

interface Sent {
  auth: string;
  body: Record<string, unknown>;
}
const sent: Sent[] = [];
let answer: (request: Sent) => Promise<Response> = async () => new Response('{}', { status: 500 });

globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const request: Sent = {
    auth: headers.Authorization ?? '',
    body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
  };
  sent.push(request);
  return answer(request);
}) as typeof fetch;

function reply(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function heldAnswer() {
  let release!: (response: Response) => void;
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function until(condition: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 400; i += 1) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.fail(`never happened: ${what}`);
}

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const storeOwner = await import('../src/lib/store-owner.ts');
const learner = await import('../src/lib/learning/store.browser.ts');
const owned = await import('../src/components/learning/exercise-owner.ts');
const focused = await import('../src/components/learning/focused-exercise.ts');
const lessonCheck = await import('../src/lib/learning/lesson-check.ts');
const help = await import('../src/components/learning/lesson-help.ts');
const { FOCUSED_EXERCISES } = await import('../src/data/focused-exercises.ts');
const { READING_PRACTICE, PRACTICE_ITEM_IDENTITY } = await import('../src/data/reading-practice.ts');
const { DEVICE_ID_KEY } = await import('../src/lib/learning/contracts/sync.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';
import type { AssistanceLevel } from '../src/lib/learning/contracts/evidence.ts';
import type { OwnerBindingState } from '../src/lib/store-owner.ts';
import type { HelpResult } from '../src/components/learning/lesson-help.ts';
import type { ExerciseClaimDeps, ExerciseRefusal, ExerciseSession } from '../src/components/learning/exercise-owner.ts';
import type { FocusedExerciseView, ItemHelpState } from '../src/components/learning/focused-exercise.ts';
import type { RecordedAnswers } from '../src/lib/learning/lesson-check.ts';
import type { PracticeQuestion } from '../src/data/reading-practice.ts';

const { currentOwner, onOwnerChange, ownerNamespace, userOwner, authSessionKeyFor, storedSessionAgrees } = storeOwner;
const {
  EXERCISE_OWNER_CHANGED_NOTE,
  claimExerciseCheck,
  exerciseIsCurrent,
  helpFromRestored,
  keepFocusedHelpFor,
  keepFocusedProgress,
  openFocusedExercise,
  openLessonCheck,
} = owned;

/* ------------------------------------------------------------------ */
/* SYNTHETIC students, one real exercise, one real quick check          */
/* ------------------------------------------------------------------ */

const A_ID = 'SYNTHETIC-EXERCISE-STUDENT-A';
const B_ID = 'SYNTHETIC-EXERCISE-STUDENT-B';
const A = userOwner(A_ID);
const B = userOwner(B_ID);
const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const A_SESSION = { token: 'SYNTHETIC-token-A', userId: A_ID };
const B_SESSION = { token: 'SYNTHETIC-token-B', userId: B_ID };
/* This application's own session key for the synthetic project, exactly
   as the owner module derives it. */
const SESSION_KEY = authSessionKeyFor(ACCOUNT_URL)!;

const HINT_TEXT = 'SYNTHETIC hint meant for student A, from no model';
const HELP_REPLY = {
  task: 'lesson-help',
  kind: 'hint',
  text: HINT_TEXT,
  assistanceAfter: 'hint',
  revealedAnswer: false,
  live: false,
  model: 'simulated',
};

/* The guided Matching Headings exercise, exactly as the registry holds it.
   The answer key is only there to score; what is checked is whose record
   an answer lands in. */
const ENTRY = FOCUSED_EXERCISES.find((entry) => entry.id === 'reading-matching-headings-guided') as unknown as {
  id: string;
  role: 'guided-practice' | 'independent-check';
  paper: 'reading';
  subskill: string;
  source: { testId: string };
  items: readonly { id: string; questionId: string }[];
};
assert.ok(ENTRY, 'the guided Matching Headings exercise is registered');
const KEY = ['v', 'vii', 'viii', 'x', 'iii', 'ix'];
const VIEW = {
  exerciseId: ENTRY.id,
  activityId: `focus:${ENTRY.id}`,
  contentVersion: 1,
  role: ENTRY.role,
  paper: ENTRY.paper,
  subskill: ENTRY.subskill,
  testId: ENTRY.source.testId,
  items: ENTRY.items.map((item, index) => ({
    itemId: item.id,
    questionId: item.questionId,
    number: 14 + index,
    label: `Paragraph ${'ABCDEF'[index]}`,
    answer: KEY[index]!,
  })),
} as unknown as FocusedExerciseView;
const ITEM = VIEW.items.map((item) => item.itemId);
/* A's answers, one of them wrong, and marked so they cannot be confused
   with anything B does: B never gives "ii". */
const A_ANSWERS: Record<string, string> = { [ITEM[0]!]: 'v', [ITEM[1]!]: 'vii', [ITEM[2]!]: 'ii' };

/* The Reading Headings lesson's quick check, with its real identities. */
const SET_ID = 'practice-reading-headings';
const SET = READING_PRACTICE['headings'];
assert.ok(SET, 'the Reading Headings quick check exists');
const IDENTITY = new Map((PRACTICE_ITEM_IDENTITY[SET_ID] ?? []).map((item) => [item.key, item]));
assert.ok(IDENTITY.size > 0, 'its questions carry identities, so a check records');
const UNIT_SIZES = SET.units.map((unit) => unit.questions.length);
const first = (question: PracticeQuestion): string =>
  Array.isArray(question.answer) ? question.answer[0]! : question.answer;
/* A's answers to unit 1: two right, one deliberately wrong. */
const A_DRAFTS = [first(SET.units[0]!.questions[0]!), first(SET.units[0]!.questions[1]!), 'SYNTHETIC-wrong-A'];

const now = () => new Date().toISOString();

/** Sign-in, account switch or sign-out as a tab that HEARS it: the account
    client stores the session (storage every tab shares), the shared owner
    moves first, then the learner record. */
function signInAs(owner: CacheOwner, session: { token: string; userId: string }): void {
  storeSession(session);
  storeOwner.setCurrentOwner(owner);
  learner.setLearnerOwner(owner);
}

/** Another tab signs in: only the stored session changes. A tab that
    missed the news still names its previous owner. */
function storeSession(session: { token: string; userId: string } | null): void {
  held = session;
  if (session) local.setItem(SESSION_KEY, JSON.stringify({ access_token: session.token, user: { id: session.userId } }));
  else local.removeItem(SESSION_KEY);
}

function freshBrowser(): void {
  learner.resetLearningStoresForTest();
  local = memoryStorage();
  local.data.set(DEVICE_ID_KEY, 'SYNTHETIC-EXERCISE-DEVICE');
  sent.length = 0;
  answer = async () => new Response('{}', { status: 500 });
  signInAs(A, A_SESSION);
}

interface StoredEvent {
  activityId: string;
  items: { itemId: string; firstAnswer: string; assistance?: AssistanceLevel; assistanceLevel?: AssistanceLevel; correct: boolean }[];
}

function eventsOf(owner: CacheOwner): StoredEvent[] {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  if (!raw) return [];
  return (JSON.parse(raw) as { events: StoredEvent[] }).events;
}

function keysHolding(mark: string): string[] {
  return [...local.data.entries()].filter(([, value]) => value.includes(mark)).map(([key]) => key).sort();
}

function focusCopyOf(ns: string) {
  return focused.readFocusedProgress(local, ns, VIEW, now());
}

function quizRunOf(ns: string) {
  return lessonCheck.readLessonCheckProgress(local, lessonCheck.lessonCheckProgressKey(ns, SET_ID), UNIT_SIZES, now());
}

/* ------------------------------------------------------------------ */
/* FocusedExercise.tsx, mirrored                                        */
/* ------------------------------------------------------------------ */

interface FocusScreen {
  exercise: ExerciseSession | null;
  mounted: boolean;
  answers: Record<string, string>;
  help: Record<string, ItemHelpState>;
  phase: 'working' | 'checked';
  firstAnswers: Record<string, string>;
  recorded: boolean;
  note: string | null;
  withheld: boolean;
  stop(): void;
}

/** The keeping effect: one call, from the render's own session. */
function keepFocus(screen: FocusScreen): void {
  if (!screen.exercise) return;
  keepFocusedProgress(
    local,
    screen.exercise,
    VIEW.exerciseId,
    { answers: screen.answers, help: screen.help, settled: screen.phase === 'checked' },
    now(),
  );
}

/** The mount effect and the owner-change listener. `listen: false` is a
    screen that never heard of the change. */
function openFocus(listen = true): FocusScreen {
  const screen: FocusScreen = {
    exercise: null,
    mounted: true,
    answers: {},
    help: {},
    phase: 'working',
    firstAnswers: {},
    recorded: false,
    note: null,
    withheld: false,
    stop: () => {},
  };
  const opened = openFocusedExercise(local, VIEW, now());
  screen.exercise = opened.session;
  screen.answers = { ...opened.restored.answers };
  screen.help = helpFromRestored(opened.restored.assistance);
  keepFocus(screen);
  if (listen) {
    screen.stop = onOwnerChange(() => {
      if (screen.exercise === null || exerciseIsCurrent(screen.exercise)) return;
      handOverFocus(screen);
    });
  }
  return screen;
}

/** handOver() */
function handOverFocus(screen: FocusScreen): void {
  const opened = openFocusedExercise(local, VIEW, now());
  screen.exercise = opened.session;
  screen.recorded = false;
  screen.answers = { ...opened.restored.answers };
  screen.help = helpFromRestored(opened.restored.assistance);
  screen.firstAnswers = {};
  screen.phase = 'working';
  screen.withheld = false;
  screen.note = EXERCISE_OWNER_CHANGED_NOTE;
  keepFocus(screen);
}

/** setAnswer() */
function answerFocus(screen: FocusScreen, itemId: string, value: string): void {
  screen.note = null;
  screen.answers = { ...screen.answers, [itemId]: value };
  keepFocus(screen);
}

/** record(), with the input the component builds. */
function recordFocusRun(drafts: ReturnType<typeof focused.itemDrafts>, answersNow: Record<string, string>, whose: CacheOwner) {
  if (drafts.length === 0) return;
  learner.recordSubmissionFor(whose, {
    activityId: VIEW.activityId,
    contentVersion: VIEW.contentVersion,
    paper: VIEW.paper,
    subskill: VIEW.subskill,
    at: now(),
    mode: focused.modeFor(VIEW.role),
    completion: focused.completionOf(VIEW.items, answersNow),
    items: drafts,
    raw: drafts.filter((draft) => draft.correct).length,
    total: drafts.length,
    bySubskill: focused.bySubskillOf(VIEW, drafts),
    sourceTestId: VIEW.testId,
    locale: 'en',
  });
}

/** check(), with claimPress() folded in. */
function pressFocusCheck(screen: FocusScreen, deps?: ExerciseClaimDeps): 'recorded' | ExerciseRefusal {
  const claim = claimExerciseCheck(screen.exercise, deps);
  if ('refused' in claim) {
    if (claim.refused === 'owner-changed') handOverFocus(screen);
    else {
      screen.withheld = true;
      screen.note = EXERCISE_OWNER_CHANGED_NOTE;
    }
    return claim.refused;
  }
  try {
    const drafts = focused.itemDrafts({ view: VIEW, answers: screen.answers, help: screen.help });
    screen.firstAnswers = { ...screen.answers };
    if (!screen.recorded) {
      screen.recorded = true;
      recordFocusRun(drafts, screen.answers, claim.binding.owner);
    }
    screen.phase = 'checked';
  } finally {
    claim.binding.cancel();
  }
  keepFocus(screen);
  return 'recorded';
}

/** keepHelp() */
function keepFocusHelp(screen: FocusScreen, itemId: string, result: HelpResult, whose: CacheOwner): void {
  if (screen.mounted && screen.exercise?.namespace === ownerNamespace(whose)) {
    const current = screen.help[itemId] ?? focused.NO_HELP;
    screen.help = {
      ...screen.help,
      [itemId]: focused.withHelp(current, { hints: [...current.hints, result.text], assistance: result.assistanceAfter }),
    };
    keepFocus(screen);
    return;
  }
  keepFocusedHelpFor(local, whose, VIEW, itemId, result.assistanceAfter, now());
}

/** A press on one item's "Give me a hint", through the REAL
    requestOwnedLessonHelp, with LessonHelpControls' steps and the focused
    exercise's keepHelp. */
async function pressFocusHint(screen: FocusScreen, itemId: string, shown: HelpResult[]): Promise<OwnerBindingState> {
  const binding = storeOwner.bindToCurrentOwner();
  try {
    return await help.requestOwnedLessonHelp(
      binding,
      {
        kind: 'hint',
        lessonKey: 'reading-headings',
        blockId: 'fixture-block',
        blockHeading: 'SYNTHETIC fixture heading',
        blockText: 'SYNTHETIC fixture block text.',
        question: 'SYNTHETIC question',
        attempted: false,
        previousHints: [],
        assistanceSoFar: screen.help[itemId]?.assistance ?? 'none',
        versions: { planRevision: 0, evidenceVersion: 0, indexVersion: '' },
        locale: 'en',
      },
      {
        keep: (result, whose) => keepFocusHelp(screen, itemId, result, whose),
        show: (result) => void shown.push(result),
        hide: () => {},
      },
    );
  } finally {
    binding.cancel();
  }
}

/* ------------------------------------------------------------------ */
/* PracticeQuiz.tsx, mirrored                                           */
/* ------------------------------------------------------------------ */

interface UnitState {
  drafts: string[];
  checked: boolean;
  attempt: number;
}

interface QuizScreen {
  exercise: ExerciseSession | null;
  key: string | null;
  units: UnitState[];
  recorded: RecordedAnswers;
  assistance: Record<string, AssistanceLevel>;
  note: string | null;
  withheld: boolean;
  stop(): void;
}

const emptyUnits = (): UnitState[] => SET.units.map((unit) => ({ drafts: unit.questions.map(() => ''), checked: false, attempt: 0 }));

function isRight(question: PracticeQuestion, given: string): boolean {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

/** The mount effect and the owner-change listener. */
function openQuiz(listen = true): QuizScreen {
  const screen: QuizScreen = {
    exercise: null,
    key: null,
    units: emptyUnits(),
    recorded: {},
    assistance: {},
    note: null,
    withheld: false,
    stop: () => {},
  };
  const opened = openLessonCheck(local, SET_ID, UNIT_SIZES, now());
  screen.exercise = opened.session;
  screen.key = opened.key;
  if (opened.held) {
    screen.units = opened.held.units.map((unit) => ({ drafts: [...unit.drafts], checked: unit.checked, attempt: unit.attempt }));
    screen.recorded = opened.held.recorded;
  }
  if (listen) {
    screen.stop = onOwnerChange(() => {
      if (screen.exercise === null || exerciseIsCurrent(screen.exercise)) return;
      handOverQuiz(screen);
    });
  }
  return screen;
}

/** handOver() */
function handOverQuiz(screen: QuizScreen): void {
  const opened = openLessonCheck(local, SET_ID, UNIT_SIZES, now());
  screen.exercise = opened.session;
  screen.key = opened.key;
  screen.recorded = opened.held?.recorded ?? {};
  screen.units = opened.held
    ? opened.held.units.map((unit) => ({ drafts: [...unit.drafts], checked: unit.checked, attempt: unit.attempt }))
    : emptyUnits();
  screen.assistance = {};
  screen.withheld = false;
  screen.note = EXERCISE_OWNER_CHANGED_NOTE;
}

/** apply(): the unfinished run, under the render's own key. */
function applyQuiz(screen: QuizScreen, next: UnitState[]): void {
  screen.units = next;
  if (!screen.key) return;
  lessonCheck.writeLessonCheckProgress(local, screen.key, {
    version: 1,
    setId: SET_ID,
    updatedAt: now(),
    units: next.map((unit) => ({ drafts: unit.drafts, checked: unit.checked, attempt: unit.attempt })),
    recorded: screen.recorded,
  });
}

/** setDraft() */
function draftQuiz(screen: QuizScreen, unitIndex: number, qi: number, value: string): void {
  screen.note = null;
  applyQuiz(
    screen,
    screen.units.map((s, i) => (i === unitIndex ? { ...s, drafts: s.drafts.map((d, j) => (j === qi ? value : d)) } : s)),
  );
}

/** record() */
function recordQuizUnit(screen: QuizScreen, unitIndex: number, state: UnitState, whose: CacheOwner): void {
  const unit = SET.units[unitIndex]!;
  const submissions: Parameters<typeof lessonCheck.lessonCheckDrafts>[1][number][] = [];
  unit.questions.forEach((question, qi) => {
    const identity = IDENTITY.get(lessonCheck.lessonCheckItemKey(unitIndex, qi));
    if (!identity) return;
    const given = state.drafts[qi] ?? '';
    const helped = screen.assistance[lessonCheck.lessonCheckItemKey(unitIndex, qi)];
    submissions.push({
      identity,
      given,
      correct: given.trim() !== '' && isRight(question, given),
      attempt: state.attempt,
      ...(helped && helped !== 'none' ? { assistance: helped } : {}),
    });
  });
  if (submissions.length === 0) return;
  const write = lessonCheck.lessonCheckDrafts(
    {
      activityId: lessonCheck.lessonCheckActivityId(SET_ID),
      contentVersion: lessonCheck.LESSON_CHECK_CONTENT_VERSION,
      paper: 'reading',
      at: now(),
      locale: 'en',
      completion: lessonCheck.completionOf(submissions),
      repeatAssistance: lessonCheck.AFTER_ANSWER_SHOWN,
      setId: SET_ID,
    },
    submissions,
    screen.recorded,
  );
  screen.recorded = write.recorded;
  learner.recordEventsFor(whose, write.drafts);
}

/** checkUnit(), with claimPress() folded in. */
function pressQuizCheck(screen: QuizScreen, unitIndex: number, deps?: ExerciseClaimDeps): 'recorded' | ExerciseRefusal {
  const claim = claimExerciseCheck(screen.exercise, deps);
  if ('refused' in claim) {
    if (claim.refused === 'owner-changed') handOverQuiz(screen);
    else {
      screen.withheld = true;
      screen.note = EXERCISE_OWNER_CHANGED_NOTE;
    }
    return claim.refused;
  }
  const next = screen.units.map((s, i) => (i === unitIndex ? { ...s, checked: true } : s));
  try {
    recordQuizUnit(screen, unitIndex, next[unitIndex]!, claim.binding.owner);
  } finally {
    claim.binding.cancel();
  }
  applyQuiz(screen, next);
  return 'recorded';
}

const QUIZ_ACTIVITY = lessonCheck.lessonCheckActivityId(SET_ID);
const quizEventsOf = (owner: CacheOwner) => eventsOf(owner).filter((event) => event.activityId === QUIZ_ACTIVITY);
const focusEventsOf = (owner: CacheOwner) => eventsOf(owner).filter((event) => event.activityId === VIEW.activityId);

/* ------------------------------------------------------------------ */
/* 1. The focused exercise                                              */
/* ------------------------------------------------------------------ */

test('focused exercise, no switch: A answers, has a hint, checks, and the run is recorded under A exactly as before', { timeout: 10_000 }, async () => {
  freshBrowser();
  answer = async () => reply(HELP_REPLY);
  const screen = openFocus();
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  const shown: HelpResult[] = [];
  assert.equal(await pressFocusHint(screen, ITEM[2]!, shown), 'current');
  assert.equal(shown.length, 1, 'the hint is shown');
  assert.equal(shown[0]!.source, 'simulated', 'a simulated reply stays labelled simulated');
  assert.equal(screen.help[ITEM[2]!]?.assistance, 'hint', 'noted on screen, as before');
  assert.equal(focusCopyOf(NS_A).assistance[ITEM[2]!], 'hint', 'and kept in A’s copy beside the answer');

  assert.equal(pressFocusCheck(screen), 'recorded');
  screen.stop();
  assert.equal(learner.learnerStoreFor(A), learner.getLearnerStore(), 'the current owner is written through the shared store');
  const events = focusEventsOf(A);
  assert.equal(events.length, 1, 'one run, under A');
  const byItem = new Map(events[0]!.items.map((item) => [item.itemId, item]));
  assert.equal(byItem.get(ITEM[2]!)?.firstAnswer, 'ii');
  assert.equal(byItem.get(ITEM[0]!)?.correct, true);
  assert.equal(byItem.get(ITEM[2]!)?.correct, false);
  assert.equal(
    byItem.get(ITEM[2]!)?.assistance ?? byItem.get(ITEM[2]!)?.assistanceLevel,
    'hint',
    'the help this answer had is recorded with it',
  );
  assert.deepEqual(focusCopyOf(NS_A).answers, {}, 'the copy is cleared once the run is recorded');
  assert.deepEqual(focusEventsOf(B), []);
  assert.equal(screen.note, null, 'no notice without an account change');
});

test("focused exercise: the page changes to B; B sees none of A's answers, A's answers and help stay in A's own copy, and A finds them on coming back", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openFocus();
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  keepFocusHelp(screen, ITEM[1]!, { text: 'SYNTHETIC', kind: 'hint', assistanceAfter: 'hint', revealedAnswer: false, source: 'simulated' }, A);

  /* Another tab signs A out and B in. */
  signInAs(B, B_SESSION);
  assert.equal(screen.exercise?.namespace, NS_B, 'the screen handed over at once');
  assert.deepEqual(screen.answers, {}, 'B sees an empty exercise');
  assert.deepEqual(screen.help, {}, 'with none of A’s help');
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE, 'and one calm line saying why');
  assert.deepEqual(focusCopyOf(NS_A).answers, A_ANSWERS, 'A’s answers are kept in A’s own copy');
  assert.equal(focusCopyOf(NS_A).assistance[ITEM[1]!], 'hint', 'with the help each had');
  assert.deepEqual(focusCopyOf(NS_B).answers, {}, 'nothing under B');
  assert.deepEqual(keysHolding('"ii"').filter((key) => key.includes(NS_B)), [], 'no key of B’s holds A’s answer');

  /* B's own visit, a fresh page: nothing of A's either. */
  const bPage = openFocus();
  assert.deepEqual(bPage.answers, {});
  bPage.stop();

  /* A signs back in. */
  signInAs(A, A_SESSION);
  screen.stop();
  assert.equal(screen.exercise?.namespace, NS_A);
  assert.deepEqual(screen.answers, A_ANSWERS, 'A finds their answers where they left them');
  assert.equal(screen.help[ITEM[1]!]?.assistance, 'hint', 'still helped: a switch never launders help away');
  assert.deepEqual(focusEventsOf(A), [], 'nothing was recorded for anybody');
  assert.deepEqual(focusEventsOf(B), []);
});

test('focused exercise: a check pressed after the switch, on a screen that missed it, is refused and records nothing', { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openFocus(false);
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  signInAs(B, B_SESSION);
  assert.equal(screen.exercise?.namespace, NS_A, 'this screen missed the change');

  assert.equal(pressFocusCheck(screen), 'owner-changed', 'refused');
  assert.deepEqual(focusEventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(focusEventsOf(B), [], 'nothing recorded under B');
  assert.equal(screen.exercise?.namespace, NS_B, 'the refusal handed the screen over');
  assert.deepEqual(screen.answers, {});
  assert.deepEqual(focusCopyOf(NS_A).answers, A_ANSWERS, 'A’s answers are still A’s, uncleared');
});

test("focused exercise: a tab that missed the switch (still naming A, while this device's session is B's) refuses the check and records nothing", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openFocus();
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);

  /* B signs in in another tab; this tab hears nothing. */
  storeSession(B_SESSION);
  assert.equal(ownerNamespace(currentOwner()), NS_A, 'this tab still names A');
  assert.equal(storedSessionAgrees(A), false, 'but this device’s own session is B’s');

  /* The real default: no dependency is handed in. */
  assert.equal(pressFocusCheck(screen), 'device-changed');
  screen.stop();
  assert.equal(screen.withheld, true, 'the answers leave the screen');
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE);
  assert.deepEqual(eventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(eventsOf(B), [], 'nothing recorded under B');
  assert.deepEqual(focusCopyOf(NS_A).answers, A_ANSWERS, 'A’s answers are still in A’s own copy');
  assert.deepEqual(focusCopyOf(NS_B).answers, {});
});

test("focused exercise: a check pressed before the switch is recorded at the press under A only, and after the switch A's result is on nobody's screen", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openFocus();
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  assert.equal(pressFocusCheck(screen), 'recorded');
  assert.equal(screen.phase, 'checked');
  assert.equal(focusEventsOf(A).length, 1, 'recorded at the press, under A');

  signInAs(B, B_SESSION);
  screen.stop();
  assert.equal(screen.phase, 'working', 'A’s result left the screen');
  assert.deepEqual(screen.firstAnswers, {});
  assert.deepEqual(screen.answers, {});
  assert.equal(focusEventsOf(A).length, 1, 'still once, under A');
  assert.deepEqual(focusEventsOf(B), [], 'nothing under B');
  assert.deepEqual(keysHolding('"ii"').filter((key) => key.includes(NS_B)), []);
});

test("focused exercise: A's hint that lands after the switch is kept in A's own copy only, and never reaches B's screen", { timeout: 10_000 }, async () => {
  freshBrowser();
  const gate = heldAnswer();
  answer = () => gate.promise;
  const screen = openFocus();
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  const shown: HelpResult[] = [];
  const pressed = pressFocusHint(screen, ITEM[0]!, shown);
  await until(() => sent.length === 1, 'the help request went out');
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`, 'sent with A’s own token');

  signInAs(B, B_SESSION);
  gate.release(reply(HELP_REPLY));
  assert.equal(await pressed, 'owner-changed');
  screen.stop();

  assert.deepEqual(shown, [], 'shown to nobody');
  assert.deepEqual(screen.help, {}, 'B’s help state is untouched');
  assert.equal(focusCopyOf(NS_A).assistance[ITEM[0]!], 'hint', 'kept in A’s own copy, beside A’s answer');
  assert.deepEqual(focusCopyOf(NS_B).answers, {});
  assert.deepEqual(keysHolding(HINT_TEXT), [], 'the reply’s words were kept nowhere');
  assert.deepEqual(eventsOf(B), []);
});

/* ------------------------------------------------------------------ */
/* 2. The lesson quick check                                            */
/* ------------------------------------------------------------------ */

test('quick check, no switch: A answers and checks unit 1, and it is recorded under A exactly as before', { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openQuiz();
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));
  screen.assistance[lessonCheck.lessonCheckItemKey(0, 2)] = 'hint';
  assert.equal(pressQuizCheck(screen, 0), 'recorded');
  screen.stop();

  const events = quizEventsOf(A);
  assert.equal(events.length, 1, 'one press, one event, under A');
  assert.equal(events[0]!.items.length, UNIT_SIZES[0], 'every question of the unit');
  assert.equal(events[0]!.items[0]!.firstAnswer, A_DRAFTS[0]);
  assert.equal(events[0]!.items[2]!.firstAnswer, 'SYNTHETIC-wrong-A');
  assert.equal(events[0]!.items[2]!.correct, false);
  assert.equal(
    events[0]!.items[2]!.assistance ?? events[0]!.items[2]!.assistanceLevel,
    'hint',
    'the help this answer had is recorded with it',
  );
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, true, 'the run is kept under A');
  assert.deepEqual(quizEventsOf(B), []);
  assert.equal(screen.note, null);
});

test("quick check: the page changes to B; B sees none of A's answers, A's answers stay in A's own run, and A finds them on coming back", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openQuiz();
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));

  signInAs(B, B_SESSION);
  assert.equal(screen.exercise?.namespace, NS_B, 'handed over at once');
  assert.deepEqual(screen.units, emptyUnits(), 'B sees an empty check');
  assert.deepEqual(screen.recorded, {});
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE);
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts.slice(0, 3), A_DRAFTS, 'A’s answers are kept in A’s own run');
  assert.equal(quizRunOf(NS_B), null, 'nothing under B');
  assert.deepEqual(keysHolding('SYNTHETIC-wrong-A').filter((key) => key.includes(NS_B)), []);

  /* B types, and it goes under B only. */
  draftQuiz(screen, 0, 0, 'SYNTHETIC-B');
  assert.equal(quizRunOf(NS_B)?.units[0]?.drafts[0], 'SYNTHETIC-B');
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts.slice(0, 3), A_DRAFTS, 'A’s run is untouched by B');

  signInAs(A, A_SESSION);
  screen.stop();
  assert.deepEqual(screen.units[0]!.drafts.slice(0, 3), A_DRAFTS, 'A finds their answers where they left them');
  assert.deepEqual(eventsOf(A), [], 'nothing was recorded for anybody');
  assert.deepEqual(eventsOf(B), []);
});

test('quick check: a check pressed after the switch, on a screen that missed it, is refused and records nothing', { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openQuiz(false);
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));
  signInAs(B, B_SESSION);
  assert.equal(pressQuizCheck(screen, 0), 'owner-changed');
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
  assert.equal(screen.exercise?.namespace, NS_B);
  assert.deepEqual(screen.units, emptyUnits());
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, false, 'A’s run is not marked checked');
});

test("quick check: a tab that missed the switch (still naming A, while this device's session is B's) refuses the check and records nothing", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openQuiz();
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));
  storeSession(B_SESSION);
  assert.equal(pressQuizCheck(screen, 0), 'device-changed');
  screen.stop();
  assert.equal(screen.withheld, true);
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts.slice(0, 3), A_DRAFTS);
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, false);
});

test("quick check: a check pressed before the switch is recorded under A only; after it A's answers are on nobody's screen, and A's late hint is kept for nobody", { timeout: 10_000 }, async () => {
  freshBrowser();
  const screen = openQuiz();
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));
  assert.equal(pressQuizCheck(screen, 0), 'recorded');
  assert.equal(quizEventsOf(A).length, 1);

  /* A asks for a hint on unit 2 and the page changes while it is on its
     way. The quick check passes only onHelp to the help buttons, which is
     called in the show step alone. */
  const gate = heldAnswer();
  answer = () => gate.promise;
  const binding = storeOwner.bindToCurrentOwner();
  const noted: AssistanceLevel[] = [];
  const pressed = help.requestOwnedLessonHelp(
    binding,
    {
      kind: 'hint',
      lessonKey: 'reading-headings',
      blockId: 'fixture-block',
      blockHeading: 'SYNTHETIC fixture heading',
      blockText: 'SYNTHETIC fixture block text.',
      question: 'SYNTHETIC question',
      attempted: false,
      previousHints: [],
      assistanceSoFar: 'none',
      versions: { planRevision: 0, evidenceVersion: 0, indexVersion: '' },
      locale: 'en',
    },
    { show: (result) => void noted.push(result.assistanceAfter) },
  );
  await until(() => sent.length === 1, 'the help request went out');
  signInAs(B, B_SESSION);
  gate.release(reply(HELP_REPLY));
  assert.equal(await pressed, 'owner-changed');
  binding.cancel();
  screen.stop();

  assert.deepEqual(noted, [], 'the late hint reached no screen');
  assert.deepEqual(screen.assistance, {}, 'B’s check carries none of A’s help');
  assert.deepEqual(screen.units, emptyUnits(), 'A’s checked unit is on nobody’s screen');
  assert.equal(quizEventsOf(A).length, 1, 'A’s check stays recorded once, under A');
  assert.deepEqual(quizEventsOf(B), [], 'nothing under B');
  assert.deepEqual(keysHolding(HINT_TEXT), [], 'the late reply’s words were kept nowhere');
});

/* ------------------------------------------------------------------ */
/* 3. The pieces underneath                                             */
/* ------------------------------------------------------------------ */

test("storedSessionAgrees: only a stored session naming a DIFFERENT student says no, and 'cannot tell' is always yes", { timeout: 10_000 }, () => {
  const store = memoryStorage();
  const key = 'sb-synthetic-agree-auth-token';
  const anon = storeOwner.anonymousOwner('SYNTHETIC-DEVICE');
  assert.equal(storedSessionAgrees(A, null, key), true, 'no storage: cannot tell');
  assert.equal(storedSessionAgrees(A, store, null), true, 'no accounts configured: cannot tell');
  assert.equal(storedSessionAgrees(A, store, key), true, 'no stored session: cannot tell');
  store.setItem(key, 'not json');
  assert.equal(storedSessionAgrees(A, store, key), true, 'an unreadable session: cannot tell');
  store.setItem(key, JSON.stringify({ user: { id: A_ID } }));
  assert.equal(storedSessionAgrees(A, store, key), true, 'the same student');
  assert.equal(storedSessionAgrees(B, store, key), false, 'another student');
  assert.equal(storedSessionAgrees(anon, store, key), false, 'somebody signed in over an anonymous tab');
});

test('recordSubmissionFor and recordEventsFor write into the named owner’s record only, and are the shared store for the current owner', { timeout: 10_000 }, () => {
  freshBrowser();
  signInAs(B, B_SESSION);
  const drafts = focused.itemDrafts({ view: VIEW, answers: A_ANSWERS, help: {} });
  recordFocusRun(drafts, A_ANSWERS, A);
  assert.equal(focusEventsOf(A).length, 1);
  assert.deepEqual(focusEventsOf(B), []);
  assert.equal(learner.readLearnerRecord().events.length, 0, 'the record on the page, B’s, did not change');

  const screen = openQuiz(false);
  A_DRAFTS.forEach((value, qi) => draftQuiz(screen, 0, qi, value));
  recordQuizUnit(screen, 0, { ...screen.units[0]!, checked: true }, A);
  assert.equal(quizEventsOf(A).length, 1);
  assert.deepEqual(quizEventsOf(B), []);

  signInAs(A, A_SESSION);
  assert.equal(learner.learnerStoreFor(A), learner.getLearnerStore());
  assert.equal(learner.readLearnerRecord().events.length, 2, 'A finds both on coming back');
});

test('keepFocusedHelpFor raises only an answered item, never lowers a level, and writes under the named owner only', { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openFocus(false);
  for (const [itemId, value] of Object.entries(A_ANSWERS)) answerFocus(screen, itemId, value);
  signInAs(B, B_SESSION);
  assert.equal(keepFocusedHelpFor(local, A, VIEW, ITEM[5]!, 'hint', now()), false, 'an unanswered item has nowhere to carry it');
  assert.equal(keepFocusedHelpFor(local, A, VIEW, ITEM[0]!, 'answer-shown', now()), true);
  assert.equal(keepFocusedHelpFor(local, A, VIEW, ITEM[0]!, 'hint', now()), true);
  assert.equal(focusCopyOf(NS_A).assistance[ITEM[0]!], 'answer-shown', 'help only raises a level');
  assert.deepEqual(focusCopyOf(NS_A).answers, A_ANSWERS, 'the answers are untouched');
  assert.deepEqual(focusCopyOf(NS_B).answers, {});
});

/* ------------------------------------------------------------------ */
/* 4. The components still have that shape                              */
/* ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function source(relative: string): string {
  return strip(fs.readFileSync(path.join(HERE, '..', 'src', relative), 'utf8')).replace(/\r\n/g, '\n');
}

function body(code: string, start: string, end: RegExp): string {
  const at = code.indexOf(start);
  assert.ok(at >= 0, `${start} is gone`);
  const rest = code.slice(at + start.length);
  const stop = rest.search(end);
  return start + (stop < 0 ? rest : rest.slice(0, stop));
}

/** Every call of `record(` in `code` passes the owner a press was bound to,
    and is preceded, in the same function, by a claim. */
function assertClaimedBeforeRecord(fn: string, name: string): void {
  const claimAt = fn.indexOf('const binding = claimPress();');
  assert.ok(claimAt >= 0, `${name} no longer claims the press`);
  assert.match(fn, /const binding = claimPress\(\);\s*if \(!binding\) return;/, `${name} carries on after a refusal`);
  const calls = [...fn.matchAll(/\brecord\(/g)];
  assert.ok(calls.length > 0, `${name} no longer records`);
  for (const call of calls) assert.ok(call.index! > claimAt, `${name} records before it claims the press`);
  assert.match(fn, /binding\.owner,?\s*\)/, `${name} records without the owner it was bound to`);
  assert.match(fn, /binding\.cancel\(\);/, `${name} never lets go of its binding`);
}

test('source scan: the focused exercise binds at start, hands over on an owner change, claims every press, and records through the explicit-owner writer', { timeout: 10_000 }, () => {
  const code = source('components/learning/FocusedExercise.tsx');

  /* Bound on mount and at a hand-over, from the one helper. */
  assert.equal(code.split('openFocusedExercise(storage, view, new Date().toISOString())').length, 3, 'opened on mount and at a hand-over');
  assert.doesNotMatch(code, /getLearnerStore\(/, 'the shared store is back in the focused exercise');
  assert.doesNotMatch(code, /\brecordSubmission\(/, 'a run is written without naming its owner');
  assert.match(code, /recordSubmissionFor\(whose, \{/);

  /* The keeping effect writes under the render's own session. */
  assert.match(code, /keepFocusedProgress\(\s*storage,\s*exercise,\s*view\.exerciseId,/);

  /* The page changing hands hands the screen over. */
  assert.match(
    code,
    /onOwnerChange\(\(\) => \{\s*if \(exerciseRef\.current === null \|\| exerciseIsCurrent\(exerciseRef\.current\)\) return;\s*handOver\(\);/,
  );
  const handOver = body(code, '  function handOver()', /\n  \/\* This tab missed|\n  function withhold\(\)/);
  for (const step of [
    'exerciseRef.current = opened.session;',
    'setExercise(opened.session);',
    'setAnswers(opened.restored.answers);',
    'setHelp(helpFromRestored(opened.restored.assistance));',
    'setFirstAnswers({});',
    "setPhase('working');",
    'setOwnerNote(EXERCISE_OWNER_CHANGED_NOTE);',
  ]) {
    assert.ok(handOver.includes(step), `handOver() no longer does ${step}`);
  }

  /* A press is claimed, and a refusal hands over or withholds. */
  const claim = body(code, '  function claimPress()', /\n  \/\*\* Write one run/);
  assert.match(claim, /const claim = claimExerciseCheck\(exercise\);/);
  assert.match(claim, /if \(claim\.refused === 'owner-changed'\) handOver\(\);\s*else withhold\(\);/);
  assertClaimedBeforeRecord(body(code, '  function check()', /\n  function openRetry\(/), 'check()');
  assertClaimedBeforeRecord(body(code, '  function noteStatedReason(', /\n  function submitRetry\(/), 'noteStatedReason()');
  assertClaimedBeforeRecord(body(code, '  function submitRetry(', /\n  const feedback = /), 'submitRetry()');

  /* Help is kept for the student who pressed, never handed to the screen
     without its owner. */
  assert.match(code, /keepHelp=\{\(result, whose\) => keepHelp\(item\.itemId, result, whose\)\}/);
  assert.doesNotMatch(code, /onHelp=/, 'help is handed to the screen without its owner');
  const keep = body(code, '  function keepHelp(', /\n  \/\* The page changed hands/);
  assert.match(keep, /if \(mounted\.current && exerciseRef\.current\?\.namespace === ownerNamespace\(whose\)\) \{/);
  assert.match(keep, /keepFocusedHelpFor\(storage, whose, view, itemId, result\.assistanceAfter,/);
});

test('source scan: the lesson quick check binds at start, hands over on an owner change, claims every press, and records through the explicit-owner writer', { timeout: 10_000 }, () => {
  const code = source('components/PracticeQuiz.tsx');

  assert.equal(code.split('openLessonCheck(storage, setId, unitSizes, new Date().toISOString())').length, 3, 'opened on mount and at a hand-over');
  assert.doesNotMatch(code, /getLearnerStore\(/, 'the shared store is back in the quick check');
  assert.doesNotMatch(code, /\.recordEvents\(/, 'events are written without naming their owner');
  assert.match(code, /const events = recordEventsFor\(whose, write\.drafts\);/);

  /* The unfinished run's key comes from the render's own session. */
  assert.match(code, /exercise && setId \? lessonCheckProgressKey\(exercise\.namespace, setId\) : null/);

  assert.match(
    code,
    /onOwnerChange\(\(\) => \{\s*if \(exerciseRef\.current === null \|\| exerciseIsCurrent\(exerciseRef\.current\)\) return;\s*handOver\(\);/,
  );
  const handOver = body(code, '  function handOver()', /\n  \/\* This tab missed|\n  function withhold\(\)/);
  for (const step of [
    'exerciseRef.current = opened.session;',
    'setExercise(opened.session);',
    'recorded.current = held?.recorded ?? {};',
    'setAssistance({});',
    'setOwnerNote(EXERCISE_OWNER_CHANGED_NOTE);',
  ]) {
    assert.ok(handOver.includes(step), `handOver() no longer does ${step}`);
  }
  assert.match(handOver, /: set\.units\.map\(\(unit\) => emptyUnitState\(unit\)\)/, 'an incoming student with no run gets an empty check');

  const claim = body(code, '  function claimPress()', /\n  function apply\(/);
  assert.match(claim, /const claim = claimExerciseCheck\(exercise\);/);
  assert.match(claim, /if \(claim\.refused === 'owner-changed'\) handOver\(\);\s*else withhold\(\);/);
  assertClaimedBeforeRecord(body(code, '  function checkUnit(', /\n  function resetUnit\(/), 'checkUnit()');
  const apply = body(code, '  function apply(', /\n  \/\*\* Write one unit/);
  assert.match(apply, /if \(!live\(\)\) return;/, 'a stale render may write another student’s run');
});
