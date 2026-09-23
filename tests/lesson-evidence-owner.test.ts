/* A student's lesson work, and the tutor's reply to it, belong to the student
 * who pressed the button.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/lesson-evidence-owner.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * Every request to Mr EZ is bound to the student on the page when it is made
 * (src/lib/tutor/client.ts, src/lib/tutor/review-owner.ts), and a reply that
 * comes back after the page changed hands is dropped. The two lesson surfaces
 * that record what came back still wrote it into whoever was on the page by
 * then:
 *
 *   practice evaluation  the written focused task
 *                        (src/components/learning/WritingFocusedTask.tsx)
 *                        fell back to "not judged" and recorded student A's
 *                        written answer into B's learner record;
 *   lesson help          the help buttons (LessonHelpControls.tsx, with the
 *                        request in lesson-help.ts) fell back to the lesson's
 *                        own hint, showed it on B's screen and handed it to
 *                        the screen, which noted it as help.
 *
 * Both now follow runOwnedGrade (src/lib/store-owner.ts): bound at the press,
 * KEPT for that student through a writer that takes their owner
 * (recordEventFor in src/lib/learning/store.browser.ts, and the student's own
 * draft key), SHOWN only while that student has been on the page throughout.
 *
 * WHAT IS REAL AND WHAT IS MIRRORED
 * Real: the tutor client (with the network and the account answered from
 * memory, as tests/tutor-request-owner.test.ts does), the owner module, the
 * learner store and its new explicit-owner writer, the written-task rules,
 * and requestOwnedLessonHelp, the one way the help surfaces ask now. The
 * component's own steps cannot be imported here (the test loader does not
 * read JSX), so `pressCheck` and `keepHelp` below mirror WritingFocusedTask's
 * evaluate() and keepHelp() line for line, the way
 * tests/delayed-grade-owner.test.ts mirrors the trainers, and the last tests
 * read the components' own source to check they still have that shape.
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

/** The session the synthetic account hands out right now. */
let held: { token: string; userId: string } | null = null;
/** Runs inside a session read, after the session was taken: the account
    changing while the token is being read. */
let duringSessionRead: (() => void) | null = null;

(globalThis as Record<string, unknown>).__lessonTestSupabase = {
  auth: {
    async getSession() {
      const now = held;
      duringSessionRead?.();
      return { data: { session: now ? { access_token: now.token, user: { id: now.userId } } : null } };
    },
  },
};

/* SYNTHETIC and never reached: fetch below answers everything itself. */
const TUTOR_URL = 'https://synthetic-tutor.invalid/tutor';
(globalThis as Record<string, unknown>).__lessonTestEnv = { PUBLIC_MR_EZ_URL: TUTOR_URL };

/* The account module is replaced, and the tutor client is given the one
   public setting it reads at load. Everything else is the real file. */
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__lessonTestSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    const loaded = next(url, context);
    if (url.endsWith('/src/lib/tutor/client.ts')) {
      const source =
        typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return {
        ...loaded,
        source: 'Object.defineProperty(import.meta, "env", { get: () => globalThis.__lessonTestEnv });\n' + source,
      };
    }
    return loaded;
  },
});

/** One request as the tutor would have received it. */
interface Sent {
  auth: string;
  body: Record<string, unknown>;
}
const sent: Sent[] = [];

/** How the next request is answered. Tests replace it. */
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

/** An answer held back until the test lets it go. */
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
const client = await import('../src/lib/tutor/client.ts');
const help = await import('../src/components/learning/lesson-help.ts');
const written = await import('../src/components/learning/written-focused-task.ts');
const { WRITTEN_FOCUSED_TASKS, writtenItemId } = await import('../src/data/focused-exercises.ts');
const { DEVICE_ID_KEY } = await import('../src/lib/learning/contracts/sync.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';
import type { AssistanceLevel } from '../src/lib/learning/contracts/evidence.ts';
import type { OwnerBinding, OwnerBindingState } from '../src/lib/store-owner.ts';
import type { HelpResult } from '../src/components/learning/lesson-help.ts';
import type {
  WrittenAttemptRecord,
  WrittenEvaluation,
  WrittenTaskDraft,
  WrittenTaskView,
} from '../src/components/learning/written-focused-task.ts';

const { bindToCurrentOwner, currentOwner, onOwnerChange, ownerNamespace, runOwnedGrade, userOwner } = storeOwner;
const { askPracticeEvaluation, TutorClientError } = client;
const {
  acceptEvaluation,
  helpAfterEvaluation,
  helpToRecord,
  readWrittenDraft,
  unjudgedEvaluation,
  withAttempt,
  withWrittenHelp,
  writeWrittenDraft,
  writtenDraftKey,
  writtenEvidenceDraft,
} = written;

/* ------------------------------------------------------------------ */
/* SYNTHETIC students, one real written task, synthetic replies         */
/* ------------------------------------------------------------------ */

const A = userOwner('SYNTHETIC-LESSON-STUDENT-A');
const B = userOwner('SYNTHETIC-LESSON-STUDENT-B');
const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const A_SESSION = { token: 'SYNTHETIC-token-A', userId: 'SYNTHETIC-LESSON-STUDENT-A' };
const B_SESSION = { token: 'SYNTHETIC-token-B', userId: 'SYNTHETIC-LESSON-STUDENT-B' };

const A_ANSWER = 'SYNTHETIC overview written by student A: coal fell while renewables rose.';
const VERDICT_TEXT = 'SYNTHETIC observation meant for student A, from no model';
const HINT_TEXT = 'SYNTHETIC hint meant for student A, from no model';

/* The guided Task 1 overview, exactly as the registry holds it. */
const ENTRY = WRITTEN_FOCUSED_TASKS.find((entry) => entry.id === 'writing-task1-overview-guided');
assert.ok(ENTRY, 'the guided overview task is registered');
const VIEW = {
  exerciseId: ENTRY.id,
  activityId: `focus:${ENTRY.id}`,
  contentVersion: 1,
  role: ENTRY.role,
  paper: ENTRY.paper,
  subskill: ENTRY.subskill,
  task: ENTRY.source.task,
  piece: ENTRY.piece,
  title: ENTRY.title,
  objective: ENTRY.objective,
  instruction: ENTRY.instruction,
  expectedMinutes: ENTRY.expectedMinutes,
  minWords: ENTRY.rules.minWords,
  maxWords: ENTRY.rules.maxWords,
  checks: ENTRY.rules.checks,
  promptId: ENTRY.source.promptId,
  promptTitle: 'SYNTHETIC prompt title',
  promptHtml: '<p>SYNTHETIC prompt</p>',
  form: ENTRY.source.form,
  attribution: 'SYNTHETIC attribution',
  itemId: writtenItemId(ENTRY.source.promptId),
  guidingQuestions: [],
  modelOverview: null,
  noticeInTheModel: [],
  lessonKey: 'writing-task1-overview',
  blockId: 'fixture-block',
  blockHeading: 'SYNTHETIC fixture heading',
  blockText: 'SYNTHETIC fixture block text. An overview states the main trends without figures.',
} as unknown as WrittenTaskView;

const EVALUATION_REPLY = {
  task: 'evaluate-practice',
  verdict: 'met',
  met: true,
  judged: true,
  feedback: 'SYNTHETIC feedback',
  observations: [VERDICT_TEXT, 'SYNTHETIC second observation'],
  suggestions: ['SYNTHETIC next move'],
  isBand: false,
  live: false,
  model: 'simulated',
};

const HELP_REPLY = {
  task: 'lesson-help',
  kind: 'hint',
  text: HINT_TEXT,
  assistanceAfter: 'hint',
  revealedAnswer: false,
  live: false,
  model: 'simulated',
};

/** Sign-in, account switch or sign-out, the way the account layer moves
    every store: the shared owner first, then the learner record. The
    account's session moves with it. */
function signInAs(owner: CacheOwner, session: { token: string; userId: string } | null): void {
  storeOwner.setCurrentOwner(owner);
  learner.setLearnerOwner(owner);
  held = session;
}

/** A fresh browser with A signed in and every answer held until released. */
function freshBrowser(): void {
  learner.resetLearningStoresForTest();
  local = memoryStorage();
  local.data.set(DEVICE_ID_KEY, 'SYNTHETIC-LESSON-DEVICE');
  sent.length = 0;
  duringSessionRead = null;
  answer = async () => new Response('{}', { status: 500 });
  signInAs(A, A_SESSION);
}

/** The learner record events one owner holds, read straight from storage. */
function eventsOf(owner: CacheOwner): { activityId: string; outcome: { met?: boolean; byModel?: boolean; feedback?: string }; items: { firstAnswer: string }[] }[] {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  if (!raw) return [];
  return (JSON.parse(raw) as { events: never[] }).events;
}

function draftOf(ns: string): WrittenTaskDraft {
  return readWrittenDraft(local, ns, VIEW.exerciseId);
}

/** Every key whose stored value contains `mark`. */
function keysHolding(mark: string): string[] {
  return [...local.data.entries()].filter(([, value]) => value.includes(mark)).map(([key]) => key).sort();
}

/* ------------------------------------------------------------------ */
/* WritingFocusedTask's owner handling, mirrored                        */
/* ------------------------------------------------------------------ */

/** What the component holds: whose work (owner.current), the draft on
    screen, what is painted, and the one-line notice. */
interface Screen {
  owner: string;
  mounted: boolean;
  held: WrittenTaskDraft;
  text: string;
  shown: WrittenEvaluation | null;
  note: string | null;
  evaluating: OwnerBinding | null;
  replies: HelpResult[];
  onHelpCalls: HelpResult[];
  stop(): void;
}

/** The mount effect and the owner-change listener. `listen: false` is a
    screen that never hears of an account change. */
function openScreen(listen = true): Screen {
  const screen: Screen = {
    owner: ownerNamespace(currentOwner()),
    mounted: true,
    held: written.EMPTY_WRITTEN_DRAFT,
    text: '',
    shown: null,
    note: null,
    evaluating: null,
    replies: [],
    onHelpCalls: [],
    stop: () => {},
  };
  screen.held = draftOf(screen.owner);
  screen.text = screen.held.draft;
  if (listen) {
    screen.stop = onOwnerChange(() => {
      if (ownerNamespace(currentOwner()) === screen.owner) return;
      handOver(screen);
    });
  }
  return screen;
}

/** handOver(): let go of the evaluation, show the incoming owner's own
    draft or nothing, and say why. */
function handOver(screen: Screen): void {
  screen.evaluating?.cancel();
  screen.evaluating = null;
  screen.owner = ownerNamespace(currentOwner());
  screen.held = draftOf(screen.owner);
  screen.text = screen.held.draft;
  screen.shown = null;
  screen.replies = [];
  screen.note = 'The account on this page changed. Any answer in progress was kept for the student who was writing it.';
}

/** evaluate(), with record() folded into its keep step. */
async function pressCheck(screen: Screen, text: string): Promise<OwnerBindingState | 'refused'> {
  if (ownerNamespace(currentOwner()) !== screen.owner) {
    handOver(screen);
    return 'refused';
  }
  const binding = bindToCurrentOwner();
  screen.evaluating?.cancel();
  screen.evaluating = binding;
  const helpBeforeSubmission = screen.held.help;
  const at = new Date().toISOString();
  const state = await runOwnedGrade(
    binding,
    async (): Promise<WrittenEvaluation> => {
      try {
        const got = await askPracticeEvaluation({
          activityId: VIEW.activityId,
          contentVersion: VIEW.contentVersion,
          subskill: VIEW.subskill,
          itemIds: [VIEW.itemId],
          submission: text,
          versions: { planRevision: 0, evidenceVersion: 0, indexVersion: '' },
        } as never);
        const checked = acceptEvaluation(got as never);
        return 'refused' in checked ? unjudgedEvaluation(checked.refused) : checked;
      } catch (error) {
        return unjudgedEvaluation(error instanceof TutorClientError ? error.code : 'unreachable');
      }
    },
    {
      keep: (result, whose) => {
        const ns = ownerNamespace(whose);
        const recorded = helpToRecord(helpBeforeSubmission);
        const carried = helpAfterEvaluation(helpBeforeSubmission, result);
        const event = learner.recordEventFor(
          whose,
          writtenEvidenceDraft({ view: VIEW, text, help: recorded, evaluation: result, at, locale: 'en' }),
        );
        const attemptAfter = (kept: WrittenTaskDraft): WrittenAttemptRecord => ({
          at,
          text,
          ...(event?.id ? { evidenceId: event.id } : {}),
          ...(kept.attempts.length > 0 ? { revisionOf: kept.attempts[kept.attempts.length - 1]!.at } : {}),
        });
        if (screen.mounted && screen.owner === ns) {
          screen.held = withAttempt(screen.held, attemptAfter(screen.held), carried);
          writeWrittenDraft(local, ns, VIEW.exerciseId, screen.held);
        } else {
          const kept = readWrittenDraft(local, ns, VIEW.exerciseId);
          writeWrittenDraft(local, ns, VIEW.exerciseId, withAttempt(kept, attemptAfter(kept), carried));
        }
      },
      show: (result) => {
        screen.shown = result;
      },
      hide: () => handOver(screen),
    },
  );
  binding.cancel();
  if (screen.evaluating === binding) screen.evaluating = null;
  return state;
}

/** keepHelp(): noted on screen while the screen holds that student, and
    otherwise written straight into their own stored draft. */
function keepHelp(screen: Screen, assistance: AssistanceLevel, whose: CacheOwner): void {
  const ns = ownerNamespace(whose);
  if (screen.mounted && screen.owner === ns) {
    screen.held = { ...screen.held, help: withWrittenHelp(screen.held.help, { assistance }) };
    writeWrittenDraft(local, ns, VIEW.exerciseId, screen.held);
    return;
  }
  const kept = readWrittenDraft(local, ns, VIEW.exerciseId);
  writeWrittenDraft(local, ns, VIEW.exerciseId, { ...kept, help: withWrittenHelp(kept.help, { assistance }) });
}

/** A press on "Give me a hint", through the REAL requestOwnedLessonHelp,
    with LessonHelpControls' three steps and the written task's keepHelp. */
async function pressHint(screen: Screen): Promise<OwnerBindingState> {
  const binding = bindToCurrentOwner();
  try {
    return await help.requestOwnedLessonHelp(
      binding,
      {
        kind: 'hint',
        lessonKey: 'writing-task1-overview',
        blockId: VIEW.blockId,
        blockHeading: VIEW.blockHeading,
        blockText: VIEW.blockText,
        question: 'SYNTHETIC question',
        attempted: false,
        previousHints: screen.replies.map((entry) => entry.text),
        assistanceSoFar: screen.held.help.assistance,
        versions: { planRevision: 0, evidenceVersion: 0, indexVersion: '' },
        locale: 'en',
      },
      {
        keep: (result, whose) => keepHelp(screen, result.assistanceAfter, whose),
        show: (result) => {
          screen.replies.push(result);
          screen.onHelpCalls.push(result);
        },
        hide: () => {
          screen.replies = [];
        },
      },
    );
  } finally {
    binding.cancel();
  }
}

/* ------------------------------------------------------------------ */
/* 1. Practice evaluation                                               */
/* ------------------------------------------------------------------ */

test('practice evaluation, no switch: the verdict is shown and recorded for A exactly as before', { timeout: 10_000 }, async () => {
  freshBrowser();
  answer = async () => reply(EVALUATION_REPLY);
  const screen = openScreen();
  const state = await pressCheck(screen, A_ANSWER);
  screen.stop();

  assert.equal(state, 'current');
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`);
  assert.equal(screen.shown?.judged, true, 'the verdict is on screen');
  assert.equal(screen.shown?.verdict, 'met');
  assert.equal(screen.shown?.source, 'simulated', 'a simulated reply stays labelled simulated');

  const events = eventsOf(A);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.activityId, VIEW.activityId);
  assert.equal(events[0]!.items[0]!.firstAnswer, A_ANSWER);
  assert.equal(events[0]!.outcome.met, true);
  assert.equal(events[0]!.outcome.byModel, true);
  assert.equal(draftOf(NS_A).attempts.length, 1);
  assert.equal(draftOf(NS_A).help.tutorJudged, true, 'the next answer starts from the feedback');
  assert.deepEqual(eventsOf(B), []);
});

test("practice evaluation: A's answer evaluated after the switch to B is recorded under A only, nothing under B, and the reply is not shown to B", { timeout: 10_000 }, async () => {
  freshBrowser();
  const gate = heldAnswer();
  answer = () => gate.promise;
  const screen = openScreen();
  const pressed = pressCheck(screen, A_ANSWER);
  await until(() => sent.length === 1, 'the evaluation request went out');
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`, 'sent with A’s own token');

  /* Another tab signs A out and B in while the request is on its way. */
  signInAs(B, B_SESSION);
  assert.equal(screen.owner, NS_B, 'the screen handed over at once');
  assert.equal(screen.text, '', 'B sees an empty task, not A’s answer');
  assert.ok(screen.note, 'with one calm line saying why');

  /* The reply comes back, late, with a verdict for A. */
  gate.release(reply(EVALUATION_REPLY));
  const state = await pressed;
  screen.stop();

  assert.equal(state, 'cancelled', 'the screen had already let go of it');
  assert.equal(screen.shown, null, 'nothing of the reply is on B’s screen');
  assert.equal(sent.length, 1, 'nothing was sent again');

  /* A's answer is kept in A's own record, as an attempt nothing judged: the
     tutor client dropped the reply, so there is no verdict to keep. */
  const mine = eventsOf(A);
  assert.equal(mine.length, 1, 'A’s answer is in A’s record');
  assert.equal(mine[0]!.items[0]!.firstAnswer, A_ANSWER);
  assert.equal(mine[0]!.outcome.met, false);
  assert.equal(mine[0]!.outcome.byModel, false, 'recorded as not judged, never as a miss');
  assert.equal(draftOf(NS_A).attempts.length, 1, 'and in A’s own draft, beside any original');
  assert.equal(draftOf(NS_A).attempts[0]!.text, A_ANSWER);

  /* Nothing under B, and the reply's words nowhere at all. */
  assert.deepEqual(eventsOf(B), []);
  assert.deepEqual(draftOf(NS_B).attempts, []);
  assert.ok(!local.data.has(writtenDraftKey(NS_B, VIEW.exerciseId)), 'B has no draft of this task');
  assert.deepEqual(
    keysHolding(A_ANSWER).filter((key) => key.includes(NS_B)),
    [],
    'no key of B’s holds A’s answer',
  );
  assert.deepEqual(keysHolding(VERDICT_TEXT), [], 'the late verdict was kept nowhere');

  /* B's own screen still works, for B. */
  answer = async () => reply(EVALUATION_REPLY);
  const again = openScreen();
  assert.equal(await pressCheck(again, 'SYNTHETIC answer written by B'), 'current');
  again.stop();
  assert.equal(sent[1]!.auth, `Bearer ${B_SESSION.token}`);
  assert.equal(eventsOf(B).length, 1);
  assert.equal(eventsOf(A).length, 1, 'A’s record is untouched by B’s work');
});

test('practice evaluation: a screen that never heard of the switch still keeps the answer for A and shows B nothing', { timeout: 10_000 }, async () => {
  freshBrowser();
  const gate = heldAnswer();
  answer = () => gate.promise;
  const screen = openScreen(false);
  const pressed = pressCheck(screen, A_ANSWER);
  await until(() => sent.length === 1, 'the evaluation request went out');
  signInAs(B, B_SESSION);
  assert.equal(screen.owner, NS_A, 'this screen missed the change');
  gate.release(reply(EVALUATION_REPLY));
  const state = await pressed;

  assert.equal(state, 'owner-changed');
  assert.equal(screen.shown, null, 'not shown');
  assert.equal(screen.owner, NS_B, 'the hide step handed the screen over');
  assert.equal(screen.text, '');
  assert.equal(eventsOf(A).length, 1);
  assert.equal(eventsOf(A)[0]!.items[0]!.firstAnswer, A_ANSWER);
  assert.deepEqual(eventsOf(B), []);
  assert.deepEqual(keysHolding(A_ANSWER).filter((key) => key.includes(NS_B)), []);

  /* And a press on a screen still holding A's work while B is here sends
     nothing at all. */
  const stale = openScreen(false);
  stale.owner = NS_A;
  const before = sent.length;
  assert.equal(await pressCheck(stale, A_ANSWER), 'refused');
  assert.equal(sent.length, before, 'nothing was sent for a student who has gone');
  assert.equal(stale.owner, NS_B);
});

test('practice evaluation: an unmount with nobody else arriving still keeps the answer for A, and paints nothing', { timeout: 10_000 }, async () => {
  freshBrowser();
  const gate = heldAnswer();
  answer = () => gate.promise;
  const screen = openScreen();
  const pressed = pressCheck(screen, A_ANSWER);
  await until(() => sent.length === 1, 'the evaluation request went out');
  /* The component's unmount: stop listening, let go of the evaluation. */
  screen.mounted = false;
  screen.stop();
  screen.evaluating?.cancel();
  gate.release(reply(EVALUATION_REPLY));
  assert.equal(await pressed, 'cancelled');
  assert.equal(screen.shown, null);
  /* A is still the one here, so the verdict itself is kept too. */
  assert.equal(eventsOf(A).length, 1);
  assert.equal(eventsOf(A)[0]!.outcome.met, true);
  assert.equal(draftOf(NS_A).attempts.length, 1, 'written straight to A’s draft, since no screen holds it');
});

/* ------------------------------------------------------------------ */
/* 2. Lesson help                                                       */
/* ------------------------------------------------------------------ */

test('lesson help, no switch: the reply is shown, handed to the screen, and noted as A’s help exactly as before', { timeout: 10_000 }, async () => {
  freshBrowser();
  answer = async () => reply(HELP_REPLY);
  const screen = openScreen();
  const state = await pressHint(screen);
  screen.stop();

  assert.equal(state, 'current');
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`);
  assert.equal(sent[0]!.body.task, 'lesson-help');
  assert.equal(screen.replies.length, 1);
  assert.equal(screen.replies[0]!.text, HINT_TEXT);
  assert.equal(screen.replies[0]!.source, 'simulated', 'a simulated reply stays labelled simulated');
  assert.equal(screen.onHelpCalls.length, 1);
  assert.equal(draftOf(NS_A).help.assistance, 'hint', 'A’s next answer carries the hint');
  assert.ok(!local.data.has(writtenDraftKey(NS_B, VIEW.exerciseId)));
});

test("lesson help: A's help that lands after the switch to B is kept in A's own draft only, never shown and never handed to B's screen", { timeout: 10_000 }, async () => {
  freshBrowser();
  const gate = heldAnswer();
  answer = () => gate.promise;
  const screen = openScreen();
  const pressed = pressHint(screen);
  await until(() => sent.length === 1, 'the help request went out');
  assert.equal(sent[0]!.auth, `Bearer ${A_SESSION.token}`);

  signInAs(B, B_SESSION);
  gate.release(reply(HELP_REPLY));
  const state = await pressed;
  screen.stop();

  assert.equal(state, 'owner-changed');
  assert.deepEqual(screen.replies, [], 'no reply on B’s screen');
  assert.equal(screen.onHelpCalls.length, 0, 'nothing handed to the screen now holding B');
  assert.equal(screen.held.help.assistance, 'none', 'B’s help state is untouched');
  assert.equal(sent.length, 1, 'nothing was sent again');

  /* Kept for A: the tutor client dropped the late reply, so what A asked
     for is kept as the lesson's own fallback at the level it gives. Help
     only raises the level, so this can never make A's next answer read as
     more independent than it was. */
  assert.equal(draftOf(NS_A).help.assistance, 'hint', 'A’s own draft carries the help A asked for');
  assert.ok(!local.data.has(writtenDraftKey(NS_B, VIEW.exerciseId)), 'nothing under B');
  assert.deepEqual(keysHolding(HINT_TEXT), [], 'the late reply’s words were kept nowhere');
  assert.deepEqual(eventsOf(B), []);
});

test('lesson help: refused before sending when the account changes while the token is read; kept for A, shown to nobody', { timeout: 10_000 }, async () => {
  freshBrowser();
  answer = async () => reply(HELP_REPLY);
  const screen = openScreen();
  duringSessionRead = () => {
    duringSessionRead = null;
    signInAs(B, B_SESSION);
  };
  const state = await pressHint(screen);
  screen.stop();

  assert.equal(sent.length, 0, 'nothing was sent, with anybody’s token');
  assert.notEqual(state, 'current');
  assert.deepEqual(screen.replies, []);
  assert.equal(screen.onHelpCalls.length, 0);
  assert.equal(draftOf(NS_A).help.assistance, 'hint');
  assert.ok(!local.data.has(writtenDraftKey(NS_B, VIEW.exerciseId)));
});

/* ------------------------------------------------------------------ */
/* 3. The explicit-owner writer                                         */
/* ------------------------------------------------------------------ */

test('recordEventFor writes into the named owner’s record and no other, and is the shared store when that owner is current', { timeout: 10_000 }, () => {
  freshBrowser();
  signInAs(B, B_SESSION);
  const draft = writtenEvidenceDraft({
    view: VIEW,
    text: A_ANSWER,
    help: written.NO_WRITTEN_HELP,
    evaluation: unjudgedEvaluation(),
    at: '2026-09-23T10:00:00.000Z',
    locale: 'en',
  });
  const event = learner.recordEventFor(A, draft);
  assert.ok(event);
  assert.equal(eventsOf(A).length, 1);
  assert.deepEqual(eventsOf(B), []);
  assert.equal(learner.readLearnerRecord().events.length, 0, 'the record on the page, B’s, did not change');

  signInAs(A, A_SESSION);
  assert.equal(learner.learnerStoreFor(A), learner.getLearnerStore(), 'the current owner is written through the shared store');
  assert.equal(learner.readLearnerRecord().events.length, 1, 'and A finds it on coming back');
});

/* ------------------------------------------------------------------ */
/* 4. The components still have that shape                              */
/* ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function source(relative: string): string {
  return strip(fs.readFileSync(path.join(HERE, '..', 'src', relative), 'utf8')).replace(/\r\n/g, '\n');
}

/** The body of one function in a source file, up to the next function at
    the same indentation. */
function body(code: string, start: string, end: RegExp): string {
  const at = code.indexOf(start);
  assert.ok(at >= 0, `${start} is gone`);
  const rest = code.slice(at + start.length);
  const stop = rest.search(end);
  return start + (stop < 0 ? rest : rest.slice(0, stop));
}

test('source scan: the written task binds its evaluation at the press and records it through the explicit-owner writer', { timeout: 10_000 }, () => {
  const code = source('components/learning/WritingFocusedTask.tsx');
  const evaluate = body(code, 'async function evaluate()', /\n  const feedback = /);

  /* A screen holding somebody else's work sends nothing. */
  assert.match(evaluate, /if \(ownerNamespace\(currentOwner\(\)\) !== owner\.current\) \{\s*handOver\(\);\s*return;\s*\}/);
  /* Bound before anything is sent, and run through runOwnedGrade. */
  const bindAt = evaluate.indexOf('const binding = bindToCurrentOwner();');
  assert.ok(bindAt > 0, 'evaluate() no longer binds its request');
  assert.ok(bindAt < evaluate.indexOf('await askPracticeEvaluation('), 'the request is sent before it is bound');
  assert.match(evaluate, /await runOwnedGrade\(\s*binding,/);
  /* Kept for the owner the binding hands over; painted only in show. */
  assert.match(evaluate, /keep: \(result, whose\) => \{[\s\S]*?record\(result, written, recorded, carried, whose, pressed, binding\.current\(\)\);/);
  const showAt = evaluate.indexOf('show: (result) => {');
  const hideAt = evaluate.indexOf('hide: () => handOver()');
  assert.ok(showAt > 0 && hideAt > showAt, 'show and hide steps are gone');
  for (const paint of ['setEvaluation(result)', "setPhase('answered')", 'setPlanChange(planSummary)']) {
    const at = evaluate.indexOf(paint);
    assert.ok(at > showAt && at < hideAt, `${paint} happens outside the show step`);
    assert.equal(code.split(paint).length, 2, `${paint} appears somewhere else too`);
  }

  /* The attempt is written under the owner it is handed, never the page's. */
  const record = body(code, '  function record(', /\n  async function evaluate\(\)/);
  assert.match(record, /const event = recordEventFor\(\s*whose,/);
  assert.match(record, /if \(mounted\.current && owner\.current === ns\) \{/);
  assert.match(record, /writeWrittenDraft\(storage\(\), ns, view\.exerciseId, withAttempt\(kept, attemptAfter\(kept\), carried\)\)/);
  assert.doesNotMatch(code, /getLearnerStore\(/, 'the shared store is back in the written task');
  assert.doesNotMatch(code, /\.recordEvent\(/, 'an event is written without naming its owner');

  /* The page changing hands hands the screen over. */
  assert.match(code, /onOwnerChange\(\(\) => \{\s*if \(ownerNamespace\(currentOwner\(\)\) === owner\.current\) return;\s*handOver\(\);/);
  const handOverBody = body(code, '  function handOver()', /\n  \/\*\* Write one attempt|\n  function record\(/);
  assert.match(handOverBody, /writeWrittenDraft\(storage\(\), outgoing, view\.exerciseId, \{ \.\.\.kept, draft: pending \}\)/);
  assert.match(handOverBody, /evaluating\.current\?\.cancel\(\);/);
  assert.match(handOverBody, /setOwnerNote\(OWNER_CHANGED_NOTE\);/);

  /* The help buttons keep help for the student who pressed. */
  assert.match(code, /keepHelp=\{\(result, whose\) => keepHelp\(result\.assistanceAfter, whose\)\}/);
  assert.doesNotMatch(code, /onHelp=/, 'help is handed to the screen without its owner');
  const keep = body(code, '  function keepHelp(', /\n  function handOver\(\)/);
  assert.match(keep, /if \(mounted\.current && owner\.current === ns\) \{\s*noteHelp\(\{ assistance \}\);\s*return;\s*\}/);
  assert.match(keep, /writeWrittenDraft\(storage\(\), ns, view\.exerciseId,/);
});

test('source scan: every lesson help surface asks through requestOwnedLessonHelp, bound at the press, and shows only in its show step', { timeout: 10_000 }, () => {
  const helpModule = source('components/learning/lesson-help.ts');
  assert.match(helpModule, /return runOwnedGrade\(binding, \(\) => requestLessonHelp\(input\), \{/);

  const controls = source('components/learning/LessonHelpControls.tsx');
  const ask = body(controls, 'async function ask(kind: LessonHelpKind)', /\n  return \(/);
  const bindAt = ask.indexOf('const binding = bindToCurrentOwner();');
  assert.ok(bindAt > 0, 'the help buttons no longer bind their request');
  assert.ok(bindAt < ask.indexOf('await requestOwnedLessonHelp('), 'asked before it is bound');
  assert.match(ask, /await requestOwnedLessonHelp\(\s*binding,/);
  assert.doesNotMatch(controls, /\brequestLessonHelp\(/, 'the help buttons ask around the binding');
  const show = ask.indexOf('show: (result) => {');
  const hide = ask.indexOf('hide: () => {');
  for (const paint of ['setReplies((held) => [...held, result]);', 'onHelp?.(result);']) {
    const at = ask.indexOf(paint);
    assert.ok(at > show && at < hide, `${paint} happens outside the show step`);
    assert.equal(controls.split(paint).length, 2, `${paint} appears somewhere else too`);
  }
  assert.match(ask, /keep: \(result, owner\) => keepHelp\?\.\(result, owner\),/);
  /* The buttons let go of another student's replies at an account change. */
  assert.match(controls, /onOwnerChange\(\(\) => \{[\s\S]*?asking\.current\?\.cancel\(\);[\s\S]*?setReplies\(\[\]\);/);

  const block = source('components/learning/lesson-block-help.ts');
  const blockAsk = body(block, 'async function ask(kind: LessonHelpKind, button: HTMLButtonElement)', /\n  wrap\.append\(/);
  assert.ok(blockAsk.indexOf('const binding = bindToCurrentOwner();') > 0);
  assert.ok(blockAsk.indexOf('const binding = bindToCurrentOwner();') < blockAsk.indexOf('await requestOwnedLessonHelp('));
  assert.doesNotMatch(block, /\brequestLessonHelp\(/, 'the lesson block asks around the binding');
  const blockShow = blockAsk.indexOf('show: (result: HelpResult) => {');
  const append = blockAsk.indexOf('replies.append(buildReply(result));');
  assert.ok(blockShow > 0 && append > blockShow, 'a block reply is painted outside the show step');
  assert.equal(block.split('replies.append(buildReply(').length, 2);
});

test('source scan: the learner store writes an event for a named owner through the same store the grades use', { timeout: 10_000 }, () => {
  const store = source('lib/learning/store.browser.ts');
  assert.match(
    store,
    /export function recordEventFor\(owner: CacheOwner, draft: EvidenceDraft\): EvidenceEvent \| null \{\s*return learnerStoreFor\(owner\)\.recordEvent\(draft\);\s*\}/,
  );
});
