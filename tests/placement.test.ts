/* The one-sitting placement test (/placement, src/data/placement.ts).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/placement.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT IS PINNED HERE
 *   1. The reserved material, and the whole paper each part comes from, is
 *      kept out of every pool the plan draws on: teaching, practice,
 *      independent checks, the staged short samples and checkpoint papers.
 *   2. The four parts are written as 'diagnostic' evidence with ONE shared
 *      session id and the placement's source key, through the same writers
 *      the surfaces use.
 *   3. After they are recorded, the papers they touched are no longer
 *      outstanding, their certainty is at most tentative, and a paper the
 *      sitting did NOT assess stays outstanding for the staged samples.
 *   4. The results mapping: percent to a level word, a graded band against
 *      the target, and the question types below the pass line.
 *   5. The resume state belongs to one student, and the Listening and
 *      Reading papers are a real sitting store (start, save, hand in once).
 *   6. The test is taken once: a second visit shows the results.
 *   7. The account-switch case, modelled on tests/exercise-owner.test.ts:
 *      the outgoing student's sitting is kept for them, a tab that missed
 *      the change records nothing, and a grade that lands after the switch
 *      is kept for the student who wrote the essay and nobody else.
 *
 * WHAT IS REAL AND WHAT IS MIRRORED
 * Real: the catalogue, the planner's eligibility rules, the policy, the
 * learner store and its owner-named writers, the owner module (with this
 * application's account session read from the storage below, as in a
 * browser), the placement state and results, and the placement owner
 * helpers. The components cannot be imported (the test loader does not
 * read JSX), so the last tests read their source to check that the test
 * player, the live examiner and the page are still wired to these helpers.
 *
 * Every student, token, answer and grade below is SYNTHETIC. No grader and
 * no model is called; the one essay grade used is written by hand here and
 * labelled as such.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerHooks } from 'node:module';

/* ------------------------------------------------------------------ */
/* A browser and an account, in memory                                 */
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

(globalThis as Record<string, unknown>).__placementTestSupabase = {
  auth: {
    async getSession() {
      return { data: { session: null } };
    },
  },
};

/* SYNTHETIC and never reached. Given to the owner module so it reads this
   application's own session key from the storage above, as in a browser. */
const ACCOUNT_URL = 'https://synthetic-placement.invalid';
(globalThis as Record<string, unknown>).__placementTestEnv = {
  PUBLIC_SUPABASE_URL: ACCOUNT_URL,
  PUBLIC_SUPABASE_ANON_KEY: 'SYNTHETIC-anon-key',
};
const ENV_PRELUDE = 'Object.defineProperty(import.meta, "env", { get: () => globalThis.__placementTestEnv });\n';

registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__placementTestSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    const loaded = next(url, context);
    if (url.endsWith('/src/lib/store-owner.ts')) {
      const source =
        typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return { ...loaded, source: ENV_PRELUDE + source };
    }
    return loaded;
  },
});

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const storeOwner = await import('../src/lib/store-owner.ts');
const learner = await import('../src/lib/learning/store.browser.ts');
const catalogMod = await import('../src/lib/learning/catalog.ts');
const sessionMod = await import('../src/lib/learning/session.ts');
const { rankCheckpoints } = await import('../src/lib/learning/checkpoints.ts');
const { evaluateEvidence } = await import('../src/lib/learning/policy.ts');
const { emptyPlanGoals, nextDiagnosticPaper } = await import('../src/lib/learning/planner.ts');
const { groupIntoOccasions, emptyLearnerRecord, paperItemId } = await import('../src/lib/learning/evidence.ts');
const { DEFAULT_POLICY_THRESHOLDS } = await import('../src/lib/learning/contracts/policy.ts');
const { DEVICE_ID_KEY } = await import('../src/lib/learning/contracts/sync.ts');
const attempt = await import('../src/components/attempt-recording.ts');
const { getDrill } = await import('../src/lib/tests/drills.ts');
const { getWritingPrompt } = await import('../src/data/writing-prompts.ts');
const { SPEAKING_PART1_TOPICS } = await import('../src/data/speaking-prompts.ts');
const placementData = await import('../src/data/placement.ts');
const state = await import('../src/lib/placement/state.ts');
const results = await import('../src/lib/placement/results.ts');
const owned = await import('../src/components/placement/placement-owner.ts');
const { placementScreen } = await import('../src/components/placement/placement-screen.ts');
const offer = await import('../src/components/placement/placement-offer.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';
import type { EvidenceEvent, LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import type { CatalogueActivity, Paper } from '../src/lib/learning/contracts/catalog.ts';
import type { PlanGoals } from '../src/lib/learning/contracts/plan.ts';
import type { GradeResult } from '../src/lib/writing/schema.ts';

const { PLACEMENT, PLACEMENT_PAPER_IDS, PLACEMENT_PROMPT_IDS, PLACEMENT_SOURCE_KEY, PLACEMENT_TOTAL_MINUTES } = placementData;
const { learningCatalogue, practiceForSubskill, checksForSubskill, activitiesThatTeach, isPlacementReserved, LEARNING_INDEX } =
  catalogMod;
const { diagnosticCandidates, checkpointPaper, ineligibleReason, learnerFacts } = sessionMod;
const { ownerNamespace, userOwner, authSessionKeyFor, currentOwner } = storeOwner;

const CATALOGUE = learningCatalogue();
const TODAY = '2026-09-24';
const NOW = '2026-09-24T09:00:00.000Z';

/* ------------------------------------------------------------------ */
/* SYNTHETIC students                                                  */
/* ------------------------------------------------------------------ */

const A_ID = 'SYNTHETIC-PLACEMENT-STUDENT-A';
const B_ID = 'SYNTHETIC-PLACEMENT-STUDENT-B';
const A = userOwner(A_ID);
const B = userOwner(B_ID);
const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const SESSION_KEY = authSessionKeyFor(ACCOUNT_URL)!;

/** A tab that HEARS the change: the stored account session, then the shared
    owner, then the learner record. */
function signInAs(owner: CacheOwner, userId: string): void {
  storeSession(userId);
  storeOwner.setCurrentOwner(owner);
  learner.setLearnerOwner(owner);
}

/** Another tab signs in: only the stored session changes. */
function storeSession(userId: string | null): void {
  if (userId) local.setItem(SESSION_KEY, JSON.stringify({ access_token: `SYNTHETIC-token-${userId}`, user: { id: userId } }));
  else local.removeItem(SESSION_KEY);
}

function freshBrowser(): void {
  learner.resetLearningStoresForTest();
  local = memoryStorage();
  local.data.set(DEVICE_ID_KEY, 'SYNTHETIC-PLACEMENT-DEVICE');
  signInAs(A, A_ID);
}

function eventsOf(owner: CacheOwner): EvidenceEvent[] {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  if (!raw) return [];
  return (JSON.parse(raw) as LearnerRecordV1).events as EvidenceEvent[];
}

function recordOf(owner: CacheOwner): LearnerRecordV1 {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  return raw ? (JSON.parse(raw) as LearnerRecordV1) : emptyLearnerRecord();
}

/* ------------------------------------------------------------------ */
/* The real material                                                   */
/* ------------------------------------------------------------------ */

const LISTENING = getDrill(PLACEMENT.listening.drillId)!;
const READING = getDrill(PLACEMENT.reading.drillId)!;
const WRITING = getWritingPrompt(PLACEMENT.writing.promptId)!;
const SPEAKING = SPEAKING_PART1_TOPICS.find((topic) => topic.id === PLACEMENT.speaking.topicId)!;

/** A drill's paper as the placement page hands it to the player. */
function placementPaper(drill: NonNullable<ReturnType<typeof getDrill>>, minutes: number) {
  return { ...drill.test, durationMinutes: minutes };
}

/** Every scored question of a drill, with its group, in paper order. */
function entriesOf(drill: NonNullable<ReturnType<typeof getDrill>>) {
  return drill.test.parts.flatMap((part) => part.groups.flatMap((group) => group.questions.map((question) => ({ question, group }))));
}

/* ------------------------------------------------------------------ */
/* 1. The material exists and fits                                     */
/* ------------------------------------------------------------------ */

test('the placement material is real, fits forty minutes, and each paper part mixes three or more question types', () => {
  assert.ok(LISTENING, `listening drill ${PLACEMENT.listening.drillId} exists`);
  assert.ok(READING, `reading drill ${PLACEMENT.reading.drillId} exists`);
  assert.ok(WRITING, `writing prompt ${PLACEMENT.writing.promptId} exists`);
  assert.ok(SPEAKING, `speaking topic ${PLACEMENT.speaking.topicId} exists`);
  assert.equal(WRITING.task, 'task1');
  assert.equal(LISTENING.sourceTestId, PLACEMENT.listening.sourceTestId);
  assert.equal(READING.sourceTestId, PLACEMENT.reading.sourceTestId);
  assert.ok(PLACEMENT_TOTAL_MINUTES <= 40, `the sitting is ${PLACEMENT_TOTAL_MINUTES} minutes, and it must not exceed 40`);

  for (const drillId of [PLACEMENT.listening.drillId, PLACEMENT.reading.drillId]) {
    const entry = LEARNING_INDEX.drills.find((drill) => drill.id === drillId)!;
    assert.ok(Object.keys(entry.byType).length >= 3, `${drillId} covers ${Object.keys(entry.byType).join(', ')}`);
  }
  const listeningQuestions = entriesOf(LISTENING).filter((e) => e.question.scored !== false).length;
  const readingQuestions = entriesOf(READING).filter((e) => e.question.scored !== false).length;
  assert.equal(listeningQuestions, 10);
  assert.equal(readingQuestions, 13);
});

test('the placement material is not check-reserved material, not the trial Test 1 papers, and not quoted by any lesson check or focused exercise', () => {
  const checkPapers = new Set<string>();
  const checkPrompts = new Set<string>();
  const quoted = new Set<string>();
  for (const exercise of LEARNING_INDEX.focusedExercises) {
    for (const id of exercise.sourcePaperIds ?? []) {
      quoted.add(id);
      if (exercise.role === 'independent-check') checkPapers.add(id);
    }
    for (const id of exercise.sourcePromptIds ?? []) if (exercise.role === 'independent-check') checkPrompts.add(id);
  }
  for (const set of LEARNING_INDEX.lessonChecks) for (const item of set.items) if (item.sourceTestId) quoted.add(item.sourceTestId);

  for (const paper of PLACEMENT_PAPER_IDS) {
    assert.ok(!checkPapers.has(paper), `${paper} is reserved for an independent check`);
    assert.ok(!quoted.has(paper), `${paper} is quoted by a lesson check or focused exercise`);
    assert.ok(!['listening-full-001', 'reading-full-001'].includes(paper), `${paper} is a trial Test 1 paper`);
  }
  assert.ok(!checkPrompts.has(PLACEMENT.writing.promptId), 'the Task 1 prompt is one of the check-reserved prompts');
  assert.equal(checkPrompts.size, 18, 'the fixture assumes the 18 check-reserved prompts the brief names');
});

/* ------------------------------------------------------------------ */
/* 2. Reserved: out of every pool the plan draws on                     */
/* ------------------------------------------------------------------ */

function reservedActivities(): CatalogueActivity[] {
  return CATALOGUE.activities.filter(isPlacementReserved);
}

test('everything built on the placement papers and prompts is tagged placement-only, the whole paper included', () => {
  const reserved = new Set(reservedActivities().map((a) => a.id));
  for (const paper of PLACEMENT_PAPER_IDS) {
    assert.ok(reserved.has(`test:${paper}`), `the full paper test:${paper} is reserved`);
    const drills = LEARNING_INDEX.drills.filter((d) => d.sourceTestId === paper);
    assert.ok(drills.length >= 3, `${paper} has its drills`);
    for (const drill of drills) assert.ok(reserved.has(`drill:${drill.id}`), `every part of ${paper} is reserved, drill:${drill.id} too`);
  }
  assert.ok(reserved.has(`write:${PLACEMENT.writing.promptId}`), 'the full graded Task 1 on the placement prompt is reserved');
  assert.ok(reserved.has(`speak:${PLACEMENT.speaking.topicId}`), 'the graded Part 1 topic is reserved');

  /* Nothing else is: a reserved activity is always built on the material. */
  const papers = new Set(PLACEMENT_PAPER_IDS);
  const prompts = new Set(PLACEMENT_PROMPT_IDS);
  for (const activity of reservedActivities()) {
    const onMaterial =
      (activity.sourcePaperIds ?? []).some((id) => papers.has(id)) ||
      (activity.sourcePromptIds ?? []).some((id) => prompts.has(id)) ||
      PLACEMENT_PROMPT_IDS.some((id) => activity.id === `write:${id}` || activity.id === `speak:${id}`);
    assert.ok(onMaterial, `${activity.id} is reserved but is not built on placement material`);
  }
});

test('reserved material is never taught, practised or used as an independent check', () => {
  const subskills = new Set<string>();
  for (const activity of reservedActivities()) {
    subskills.add(activity.subskill);
    for (const cover of activity.covers ?? []) subskills.add(cover.subskill);
  }
  assert.ok(subskills.size > 3);
  for (const subskill of subskills) {
    const pools = [
      ...activitiesThatTeach(subskill as never, CATALOGUE),
      ...practiceForSubskill(subskill as never, Number.POSITIVE_INFINITY, CATALOGUE),
      ...checksForSubskill(subskill as never, CATALOGUE).map((check) => check.activity),
    ];
    const leaked = pools.filter(isPlacementReserved).map((a) => a.id);
    assert.deepEqual(leaked, [], `placement material leaked into the pools for ${subskill}`);
  }
});

test('reserved material is never a staged short sample, a checkpoint paper, or eligible for any session step', () => {
  const record = emptyLearnerRecord();
  const policy = evaluateEvidence({ record, goals: emptyPlanGoals(), now: NOW });
  const context = {
    catalogue: CATALOGUE,
    facts: learnerFacts(record, policy),
    policy,
    today: TODAY,
    overrides: [],
    unavailableSurfaces: [] as const,
    minutes: Number.POSITIVE_INFINITY,
    thresholds: DEFAULT_POLICY_THRESHOLDS,
  };
  for (const paper of ['listening', 'reading', 'writing', 'speaking'] as Paper[]) {
    const candidates = diagnosticCandidates(paper, context);
    assert.ok(candidates.length > 0, `${paper} still has short samples to offer`);
    assert.deepEqual(candidates.filter(isPlacementReserved).map((a) => a.id), [], `a ${paper} short sample drew on placement material`);
    const checkpoint = checkpointPaper(paper, context);
    if (checkpoint) assert.ok(!isPlacementReserved(checkpoint), `${checkpoint.id} was offered as a checkpoint`);
    const ranked = rankCheckpoints(paper, CATALOGUE, LEARNING_INDEX, record);
    assert.deepEqual(
      ranked.filter((c) => PLACEMENT_PAPER_IDS.includes(c.testId)).map((c) => c.testId),
      [],
      `a placement paper was ranked as a ${paper} checkpoint`,
    );
  }
  for (const activity of reservedActivities()) {
    assert.equal(ineligibleReason(activity, context), 'placement-only', `${activity.id} is not refused by the planner`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. The four events                                                  */
/* ------------------------------------------------------------------ */

/** SYNTHETIC, written by hand here: no grader was called. */
function syntheticGrade(band: number): GradeResult {
  const criterion = { band, comment: 'SYNTHETIC', tip: 'SYNTHETIC' } as never;
  return {
    overallBand: band,
    criteria: { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion, grammaticalRange: criterion },
    mechanics: {
      wordCount: 160,
      sentenceCount: 9,
      lexicalDiversity: 0.6,
      linkingDevices: [],
      underLength: false,
      notes: [],
    } as never,
    moments: [],
    strengths: ['SYNTHETIC'],
    improvements: ['SYNTHETIC'],
    grader: { name: 'SYNTHETIC grader, never called', live: true },
  };
}

/** Sit one paper through the real placement sitting store and record it the
    way TestPlayer.handleSubmit does: finish first, then write the attempt
    with the placement's evidence. */
function sitPaper(
  ref: { owner: string; sittingId: string },
  drill: NonNullable<ReturnType<typeof getDrill>>,
  minutes: number,
  answer: (index: number, answerKey: string) => string,
): EvidenceEvent | null {
  const test = placementPaper(drill, minutes);
  const store = state.placementLegSitting(ref, test);
  const started = store.start();
  const entries = entriesOf(drill);
  /* The key's first accepted form stands for a right answer, and a
     SYNTHETIC string for a wrong one; which were right is decided here, so
     the test does not depend on how any one question type is marked. */
  const answers: Record<string, string> = {};
  const scored = new Set<string>();
  entries.forEach(({ question }, index) => {
    const key = Array.isArray(question.answer) ? String(question.answer[0]) : String(question.answer);
    answers[question.id] = answer(index, key);
    if (answers[question.id] === key) scored.add(question.id);
  });
  assert.ok(store.save(answers, ref.owner, { testId: test.id, sittingId: started.sittingId! }), 'the answers were saved in the sitting');
  const raw = scored.size;
  const total = entries.filter((e) => e.question.scored !== false).length;
  const finish = store.finish(ref.owner, { raw, total, band: 0, bandLabel: '', secondsUsed: 300 }, { testId: test.id, sittingId: started.sittingId! });
  assert.equal(finish, 'finished', 'the paper was finalised before anything was recorded');
  const evidence = state.placementEvidence(ref.sittingId);
  return learner.recordSubmission({
    activityId: attempt.attemptActivityId(test.id),
    paper: test.skill,
    at: new Date(Date.parse(NOW) + (test.skill === 'listening' ? 0 : 10) * 60_000).toISOString(),
    mode: attempt.attemptEvidenceMode('drill', evidence.mode),
    completion: 'completed',
    items: attempt.buildQuestionItems(drill.sourceTestId, entries, answers, scored, new Set()),
    raw,
    total,
    secondsUsed: 300,
    sourceTestId: drill.sourceTestId,
    sessionId: evidence.sessionId,
    sourceMaterial: evidence.sourceMaterial,
  });
}

/** A whole sitting for A: Listening 7 of 10, Reading 12 of 13 (the first
    wrong), Writing graded 6.0, Speaking graded 6.5 or left out. */
function sitWholePlacement(options: { speaking: boolean } = { speaking: true }) {
  const { state: begun } = owned.beginPlacementFor(local, owned.openPlacement(local).session, NOW);
  const ref = { owner: NS_A, sittingId: begun.sittingId };
  const listening = sitPaper(ref, LISTENING, PLACEMENT.listening.minutes, (i, key) => (i < 7 ? key : 'SYNTHETIC-wrong'));
  const reading = sitPaper(ref, READING, PLACEMENT.reading.minutes, (i, key) => (i === 0 ? 'SYNTHETIC-wrong' : key));
  owned.startWritingFor(local, NS_A, begun.sittingId, Date.parse(NOW), PLACEMENT.writing.minutes);
  const writing = owned.keepPlacementWritingGrade(
    local,
    A,
    begun.sittingId,
    { prompt: WRITING, essay: 'SYNTHETIC essay text, one hundred and sixty words long in spirit.', wordCount: 160 },
    syntheticGrade(6),
    new Date(Date.parse(NOW) + 25 * 60_000).toISOString(),
  );
  let speaking: EvidenceEvent | null = null;
  if (options.speaking) {
    /* Exactly the call LiveExaminer's keep() makes in placement mode. */
    const evidence = state.placementEvidence(begun.sittingId);
    speaking = learner.recordSpeakingGradedFor(A, {
      activityId: `speak:${SPEAKING.id}`,
      paper: 'speaking',
      promptId: SPEAKING.id,
      part: 1,
      at: new Date(Date.parse(NOW) + 38 * 60_000).toISOString(),
      overallBand: 6.5,
      criteria: { fluencyCoherence: 6.5, lexicalResource: 6.5, grammaticalRange: 6, pronunciation: 7 },
      grader: { name: 'SYNTHETIC grader, never called', live: true },
      mode: 'diagnostic',
      sessionId: evidence.sessionId,
      sourceMaterial: evidence.sourceMaterial,
    });
    state.settlePlacementPart(local, NS_A, begun.sittingId, 'speaking', { kind: 'graded', band: 6.5, at: NOW });
  } else {
    state.settlePlacementPart(local, NS_A, begun.sittingId, 'speaking', { kind: 'not-assessed', reason: 'unavailable', at: NOW });
  }
  return { sittingId: begun.sittingId, listening, reading, writing, speaking };
}

test("the four parts are written as diagnostic evidence, share ONE session id, carry the placement's source key, and read as one occasion", () => {
  freshBrowser();
  const sat = sitWholePlacement();
  const events = [sat.listening, sat.reading, sat.writing, sat.speaking];
  for (const event of events) assert.ok(event, 'every part wrote an event');
  const written = events as EvidenceEvent[];
  assert.deepEqual(
    written.map((e) => e.paper),
    ['listening', 'reading', 'writing', 'speaking'],
  );
  for (const event of written) {
    assert.equal(event.mode, 'diagnostic', `${event.paper} was written as ${event.mode}`);
    assert.equal(event.sessionId, `placement:${sat.sittingId}`);
    assert.ok((event.sourceMaterial ?? []).includes(PLACEMENT_SOURCE_KEY), `${event.paper} carries the placement source key`);
  }
  assert.equal(new Set(written.map((e) => e.sessionId)).size, 1, 'one shared session id');
  const occasions = groupIntoOccasions(eventsOf(A));
  assert.equal(occasions.length, 1, 'the policy reads the sitting as one occasion');
  assert.equal(occasions[0]!.events.length, 4);
  /* Items carry the question type, which is how "types below the pass line" is read. */
  assert.ok((sat.listening!.items ?? []).every((item) => typeof item.subskill === 'string'));
  assert.ok(results.placementTaken(recordOf(A)), 'the record itself now says the placement was taken');
});

test('after the sitting the touched papers are no longer outstanding, and no estimate rises above tentative', () => {
  freshBrowser();
  sitWholePlacement();
  const policy = evaluateEvidence({ record: recordOf(A), goals: emptyPlanGoals(), now: NOW });
  assert.deepEqual([...policy.diagnosticsOutstanding], [], 'every paper the sitting assessed has left diagnosticsOutstanding');
  const ranks = { unknown: 0, 'self-reported': 1, limited: 2, tentative: 3, measured: 4 } as const;
  for (const estimate of policy.estimates) {
    assert.ok(ranks[estimate.certainty] <= ranks.tentative, `${estimate.scopeKey} is ${estimate.certainty}, above tentative`);
  }
  for (const paper of ['listening', 'reading', 'writing', 'speaking']) {
    const estimate = policy.estimates.find((e) => e.scopeKey === `paper:${paper}`)!;
    assert.notEqual(estimate.certainty, 'unknown', `${paper} is known after the sitting`);
  }
});

test('a part the sitting could not assess stays outstanding, so the staged short samples still ask for it', () => {
  freshBrowser();
  sitWholePlacement({ speaking: false });
  const record = recordOf(A);
  const policy = evaluateEvidence({ record, goals: emptyPlanGoals(), now: NOW });
  assert.deepEqual([...policy.diagnosticsOutstanding], ['speaking']);
  const next = nextDiagnosticPaper({
    outstanding: policy.diagnosticsOutstanding,
    deferred: new Set(),
    goals: emptyPlanGoals(),
    record,
    status: 'provisional' as never,
  });
  assert.equal(next, 'speaking', 'the next staged sample is the paper the sitting left unassessed');
});

/* ------------------------------------------------------------------ */
/* 4. The results                                                      */
/* ------------------------------------------------------------------ */

test('percent to a level word: below 65 weak, 65 to 79 developing, 80 and above strong', () => {
  assert.equal(results.levelFromPercent(0), 'weak');
  assert.equal(results.levelFromPercent(64.9), 'weak');
  assert.equal(results.levelFromPercent(65), 'developing');
  assert.equal(results.levelFromPercent(79.9), 'developing');
  assert.equal(results.levelFromPercent(80), 'strong');
  assert.equal(results.levelFromPercent(100), 'strong');
});

test('a graded band against the target: at or above strong, within one band developing, further weak, none without a target', () => {
  assert.equal(results.levelFromBand(7, 7), 'strong');
  assert.equal(results.levelFromBand(7.5, 7), 'strong');
  assert.equal(results.levelFromBand(6, 7), 'developing');
  assert.equal(results.levelFromBand(5.5, 7), 'weak');
  assert.equal(results.levelFromBand(6, null), null);
});

test('question types below the pass line are read from the sitting itself, weakest first', () => {
  const weak = results.weakTypesOf({
    bySubskill: {
      'multiple-answer': { correct: 1, total: 5 },
      'sentence-completion': { correct: 3, total: 3 },
      'multiple-choice': { correct: 1, total: 2 },
      tfng: { correct: 2, total: 3 },
    },
  });
  assert.deepEqual(
    weak.map((w) => w.subskill),
    ['multiple-answer', 'multiple-choice'],
    'two of three (67%) is at the pass line, one of two (50%) is below it',
  );
});

test('the results screen reads all four papers from the record, and an unassessed part is "not assessed", never low', () => {
  freshBrowser();
  sitWholePlacement({ speaking: false });
  const goals: PlanGoals = { ...emptyPlanGoals(), overallTarget: { band: 7, status: 'confirmed' as never } };
  const record = recordOf(A);
  const policy = evaluateEvidence({ record, goals, now: NOW });
  const found = results.placementResults(record, policy, goals);
  const by = Object.fromEntries(found.map((r) => [r.paper, r]));

  assert.equal(by.listening!.status, 'assessed');
  assert.equal(by.listening!.raw, 7);
  assert.equal(by.listening!.total, 10);
  assert.equal(by.listening!.level, 'developing', '70% is developing');
  assert.ok(by.listening!.weakTypes.length > 0, 'the three wrong answers put at least one type below the pass line');

  assert.equal(by.reading!.raw, 12);
  assert.equal(by.reading!.level, 'strong', '12 of 13 is strong');

  assert.equal(by.writing!.status, 'assessed');
  assert.equal(by.writing!.band, 6);
  assert.equal(by.writing!.requiredBand, 7);
  assert.equal(by.writing!.level, 'developing', 'one band under the target');

  assert.equal(by.speaking!.status, 'not-assessed');
  assert.equal(by.speaking!.level, null);
  for (const result of found) assert.ok(['unknown', 'limited', 'tentative'].includes(result.certainty));
});

/* ------------------------------------------------------------------ */
/* 5. The resume state and the placement sitting store                 */
/* ------------------------------------------------------------------ */

test('resume state is per owner: A and B each have their own sitting under their own key, and a copy stamped for A is never read as B', () => {
  freshBrowser();
  const a = state.startPlacementState(local, NS_A, NOW, 'placement-SYNTHETIC-A').state;
  const b = state.startPlacementState(local, NS_B, NOW, 'placement-SYNTHETIC-B').state;
  assert.equal(state.readPlacementState(local, NS_A)!.sittingId, a.sittingId);
  assert.equal(state.readPlacementState(local, NS_B)!.sittingId, b.sittingId);
  assert.ok(local.data.has(`ielts.placement.v1::${NS_A}`));
  assert.ok(local.data.has(`ielts.placement.v1::${NS_B}`));

  /* A's sitting copied under B's key is still A's, and B does not get it. */
  local.setItem(state.placementStateKey(NS_B), local.getItem(state.placementStateKey(NS_A))!);
  assert.equal(state.readPlacementState(local, NS_B), null);

  /* A write naming the wrong sitting writes nothing. */
  assert.equal(state.settlePlacementPart(local, NS_A, 'placement-SOMEONE-ELSES', 'listening', { kind: 'scored', raw: 1, total: 1, at: NOW }), null);
  assert.equal(state.readPlacementState(local, NS_A)!.outcomes.listening, undefined);
});

test('a placement paper is a real sitting: resumed with its answers and deadline, handed in once, refused after', () => {
  freshBrowser();
  const { state: begun } = state.startPlacementState(local, NS_A, NOW, 'placement-SYNTHETIC-RESUME');
  const ref = { owner: NS_A, sittingId: begun.sittingId };
  const paper = placementPaper(READING, PLACEMENT.reading.minutes);
  let clock = Date.parse(NOW);
  const store = state.placementLegSitting(ref, paper, { now: () => clock });
  const started = store.start();
  assert.equal(started.endsAt - started.startedAt, PLACEMENT.reading.minutes * 60_000, 'the placement clock, not the drill default');
  const sittingRef = { testId: paper.id, sittingId: begun.sittingId };
  assert.ok(store.save({ q14: 'SYNTHETIC-A' }, NS_A, sittingRef));

  /* Pause and resume: a fresh store (a reload) picks up the same answers and deadline. */
  clock += 5 * 60_000;
  const reloaded = state.placementLegSitting(ref, paper, { now: () => clock });
  const resumed = reloaded.load()!;
  assert.deepEqual(resumed.answers, { q14: 'SYNTHETIC-A' });
  assert.equal(resumed.endsAt, started.endsAt, 'a reload never hands time back');

  assert.equal(reloaded.finish(NS_A, { raw: 0, total: 13, band: 0, bandLabel: '', secondsUsed: 300 }, sittingRef), 'finished');
  assert.deepEqual(state.readPlacementState(local, NS_A)!.outcomes.reading, {
    kind: 'scored',
    raw: 0,
    total: 13,
    at: state.readPlacementState(local, NS_A)!.outcomes.reading!.at,
  });
  /* The other tab still holding it: its hand-in is refused and records nothing. */
  assert.equal(store.finish(NS_A, { raw: 13, total: 13, band: 9, bandLabel: '9', secondsUsed: 1 }, sittingRef), 'handed-in');
  assert.equal(store.lost(NS_A, sittingRef), 'handed-in');
  assert.equal(state.readPlacementState(local, NS_A)!.outcomes.reading!.kind === 'scored' && (state.readPlacementState(local, NS_A)!.outcomes.reading as { raw: number }).raw, 0, 'the first result stands');
  assert.equal(reloaded.load(), null, 'a handed-in paper is never resumed');

  /* A newer sitting replaces this one: the old tab reads it as replaced. */
  state.startPlacementState(local, NS_A, NOW, 'placement-SYNTHETIC-NEWER');
  assert.equal(store.lost(NS_A, sittingRef), 'replaced');
  assert.equal(store.save({ q14: 'late' }, NS_A, sittingRef), false, 'a stale tab writes nothing over the newer sitting');
});

/* ------------------------------------------------------------------ */
/* 6. Taken once                                                       */
/* ------------------------------------------------------------------ */

test('which screen /placement shows: the introduction first, the part under way, and the results on every later visit', () => {
  const none = { opened: true, signedIn: true, state: null, taken: false, materialMissing: false };
  assert.equal(placementScreen({ ...none, opened: false }), 'loading');
  assert.equal(placementScreen({ ...none, signedIn: false }), 'signed-out');
  assert.equal(placementScreen(none), 'intro');
  assert.equal(placementScreen({ ...none, state: { outcomes: { listening: { kind: 'scored', raw: 1, total: 10, at: NOW } } } }), 'part');
  const done = {
    listening: { kind: 'scored' as const, raw: 7, total: 10, at: NOW },
    reading: { kind: 'scored' as const, raw: 12, total: 13, at: NOW },
    writing: { kind: 'not-assessed' as const, reason: 'unavailable' as const, at: NOW },
    speaking: { kind: 'not-assessed' as const, reason: 'unavailable' as const, at: NOW },
  };
  assert.equal(placementScreen({ ...none, state: { outcomes: done }, taken: true }), 'results', 'right after the last part');
  assert.equal(placementScreen({ ...none, taken: true }), 'results', 'a second visit, or another device, shows the results, not the test');
  assert.equal(placementScreen({ ...none, materialMissing: true }), 'unavailable', 'missing material says so calmly');
  assert.equal(placementScreen({ ...none, taken: true, materialMissing: true }), 'results', 'results never need the material');
  /* An interrupted sitting on this device is finished here, even though the record already holds its first part. */
  assert.equal(
    placementScreen({ ...none, state: { outcomes: { listening: done.listening } }, taken: true }),
    'part',
  );
});

test('the Today card: offered once the intake is out of the way, a sign-in invitation when signed out, and quiet for a week after "Not now"', () => {
  const base = { intakeShowing: false, signedIn: true, taken: false, inProgress: false, dismissedOn: null, today: TODAY };
  assert.equal(offer.placementOfferView(base), 'offer');
  assert.equal(offer.placementOfferView({ ...base, intakeShowing: true }), 'hidden');
  assert.equal(offer.placementOfferView({ ...base, signedIn: false }), 'sign-in');
  assert.equal(offer.placementOfferView({ ...base, taken: true }), 'hidden', 'taken once, never offered again');
  assert.equal(offer.placementOfferView({ ...base, taken: true, inProgress: true }), 'resume');
  assert.equal(offer.placementOfferView({ ...base, dismissedOn: '2026-09-20' }), 'hidden');
  assert.equal(offer.placementOfferView({ ...base, dismissedOn: '2026-09-17' }), 'offer', 'back after seven days');
  assert.equal(offer.placementOfferView({ ...base, dismissedOn: '2026-09-30' }), 'offer', 'a date from the future never hides it');
});

/* ------------------------------------------------------------------ */
/* 7. The account switch                                               */
/* ------------------------------------------------------------------ */

test("the page changes to B: B sees none of A's sitting, A's answers stay in A's own resume state, and A finds them on coming back", () => {
  freshBrowser();
  const openedA = owned.openPlacement(local);
  assert.equal(openedA.session.namespace, NS_A);
  const { state: begun } = owned.beginPlacementFor(local, openedA.session, NOW);
  const ref = { owner: NS_A, sittingId: begun.sittingId };
  const store = state.placementLegSitting(ref, placementPaper(LISTENING, PLACEMENT.listening.minutes));
  const started = store.start();
  assert.ok(store.save({ q11: 'SYNTHETIC-A-ANSWER' }, NS_A, { testId: LISTENING.id, sittingId: started.sittingId! }));

  signInAs(B, B_ID);
  const openedB = owned.openPlacement(local);
  assert.equal(openedB.session.namespace, NS_B);
  assert.equal(openedB.state, null, 'B starts from nothing');
  assert.ok(!owned.placementIsCurrent(openedA.session), "A's session is no longer the page's");
  /* The player's owner check refuses A's keystroke once B is here. */
  assert.equal(store.save({ q11: 'SYNTHETIC-A-LATE' }, NS_A, { testId: LISTENING.id, sittingId: started.sittingId! }), false);
  assert.equal(store.load(), null, "A's paper is not resumed for B");
  assert.ok(![...local.data.entries()].some(([key, value]) => key.includes(NS_B) && value.includes('SYNTHETIC-A-ANSWER')), "nothing of A's lands under B");

  signInAs(A, A_ID);
  const back = owned.openPlacement(local);
  assert.deepEqual(back.state!.legs.listening!.answers, { q11: 'SYNTHETIC-A-ANSWER' }, 'A finds their answers where they left them');
});

test("a tab that missed the switch (still naming A, while this device's session is B's) refuses the press and records nothing", () => {
  freshBrowser();
  const openedA = owned.openPlacement(local);
  storeSession(B_ID); /* another tab signed B in; this one did not hear */
  const claim = owned.claimPlacementPress(openedA.session);
  assert.deepEqual(claim, { refused: 'device-changed' });
  assert.equal(state.readPlacementState(local, NS_A), null, 'nothing was started');
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
});

test("A's essay grade that lands after the page changed to B is kept for A (record, history and sitting) and nothing reaches B", () => {
  freshBrowser();
  const openedA = owned.openPlacement(local);
  const { state: begun } = owned.beginPlacementFor(local, openedA.session, NOW);
  owned.startWritingFor(local, NS_A, begun.sittingId, Date.parse(NOW), PLACEMENT.writing.minutes);
  const claim = owned.claimPlacementPress(openedA.session);
  assert.ok('binding' in claim, 'A pressed Hand in while A was on the page');
  const binding = (claim as { binding: { owner: CacheOwner; state(): string; cancel(): void } }).binding;

  signInAs(B, B_ID); /* the page changes hands while the grade is on its way */
  assert.equal(binding.state(), 'owner-changed');
  /* Exactly what runOwnedGrade's keep() does with the binding's owner. */
  owned.keepPlacementWritingGrade(
    local,
    binding.owner,
    begun.sittingId,
    { prompt: WRITING, essay: 'SYNTHETIC essay by A', wordCount: 150 },
    syntheticGrade(6.5),
    NOW,
  );
  binding.cancel();

  const aEvents = eventsOf(A).filter(results.isPlacementEvent);
  assert.equal(aEvents.length, 1, "the grade is in A's record");
  assert.equal(aEvents[0]!.paper, 'writing');
  assert.equal(aEvents[0]!.mode, 'diagnostic');
  assert.deepEqual(eventsOf(B), [], "nothing is in B's record");
  assert.equal(state.readPlacementState(local, NS_A)!.outcomes.writing?.kind, 'graded', "A's sitting moved on");
  assert.equal(state.readPlacementState(local, NS_B), null, 'B has no sitting at all');
  const progressA = local.data.get(`ielts.progress.v1::${NS_A}`) ?? '';
  const progressB = local.data.get(`ielts.progress.v1::${NS_B}`) ?? '';
  assert.ok(progressA.includes('SYNTHETIC essay by A'), "the essay is in A's writing history");
  assert.ok(!progressB.includes('SYNTHETIC essay by A'), "and not in B's");
});

test('a grade kept while somebody else was on the page settles the part when its student comes back, so it is never asked for twice', () => {
  freshBrowser();
  const { state: begun } = state.startPlacementState(local, NS_A, NOW, 'placement-SYNTHETIC-RECONCILE');
  const evidence = state.placementEvidence(begun.sittingId);
  learner.recordSpeakingGradedFor(A, {
    activityId: `speak:${SPEAKING.id}`,
    paper: 'speaking',
    promptId: SPEAKING.id,
    part: 1,
    at: NOW,
    overallBand: 6,
    criteria: { fluencyCoherence: 6 },
    grader: { name: 'SYNTHETIC grader, never called', live: true },
    mode: 'diagnostic',
    sessionId: evidence.sessionId,
    sourceMaterial: evidence.sourceMaterial,
  });
  const reconciled = state.reconcilePlacementFromRecord(local, begun, eventsOf(A));
  assert.equal(reconciled.outcomes.speaking?.kind, 'graded');
  assert.equal(state.readPlacementState(local, NS_A)!.outcomes.speaking?.kind, 'graded');
  /* Another sitting's grade settles nothing. */
  const other = state.startPlacementState(local, NS_A, NOW, 'placement-SYNTHETIC-OTHER').state;
  assert.equal(state.reconcilePlacementFromRecord(local, other, eventsOf(A)).outcomes.speaking, undefined);
});

/* ------------------------------------------------------------------ */
/* 8. The components are still wired to all of the above               */
/* ------------------------------------------------------------------ */

function source(path: string): string {
  return fs.readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('source scan: the test player keeps a placement paper in the placement sitting and changes only the mode it writes', () => {
  const player = source('../src/components/TestPlayer.tsx');
  assert.match(player, /placementLegSitting\(\{ owner: placementOwner, sittingId: placementSittingId \}, test\)/);
  assert.match(player, /mode: attemptEvidenceMode\(attemptKind, placementRecording\?\.mode\)/);
  assert.match(player, /sessionId: placementRecording\.sessionId, sourceMaterial: placementRecording\.sourceMaterial/);
  /* Still finalised before it records, exactly as before. */
  const handIn = player.slice(player.indexOf('function handleSubmit()'), player.indexOf('const unansweredCount'));
  assert.ok(handIn.indexOf('sittingStore.finish(') < handIn.indexOf('recordSubmission('), 'finish comes before record');
  assert.ok(handIn.includes('if (!paperMayBeRecorded(finished)) return;'));
});

test('source scan: the live examiner writes the placement grade as diagnostic evidence of the sitting, and the page binds, hands over and claims', () => {
  const examiner = source('../src/components/LiveExaminer.tsx');
  assert.match(examiner, /mode: 'diagnostic' as const, sessionId: placement\.sessionId, sourceMaterial: placement\.sourceMaterial/);
  assert.match(examiner, /void startTest\('part1', \{ mode: 'part1', title: topic\.topic, part1Topic: topic \}\)/);

  const page = source('../src/components/placement/Placement.tsx');
  assert.match(page, /onOwnerChange\(/, 'the page hears an account change');
  assert.match(page, /setNote\(PLACEMENT_OWNER_CHANGED_NOTE\)/, 'and says so in one calm line');
  assert.match(page, /claimPlacementPress\(held\.session\)/, 'every press is claimed');
  assert.match(page, /onEvidenceRecorded\(\)/, 'the plan is rebuilt before the results read it');
  const writing = source('../src/components/placement/PlacementWriting.tsx');
  assert.match(writing, /runOwnedGrade\(claim\.binding/, 'the essay grade is bound at the press');
  assert.match(writing, /keepPlacementWritingGrade\(deviceStorage\(\), owner,/, 'and kept for the owner it was bound to');
});

test('source scan: the placement material ids live in src/data/placement.ts and the page resolves them without crashing on a missing one', () => {
  const page = source('../src/pages/placement.astro');
  /* Resolved in src/lib/placement/material.ts since 29 September 2026, so
     the gated build's paid pack is built by the same function. */
  const material = source('../src/lib/placement/material.ts');
  assert.match(page, /placementMaterial\(\)/);
  assert.match(material, /getDrill\(drillId\)/);
  assert.match(material, /\?\? null/);
  const components = fs
    .readdirSync(new URL('../src/components/placement/', import.meta.url))
    .map((file) => source(`../src/components/placement/${file}`))
    .join('\n');
  for (const id of [PLACEMENT.listening.drillId, PLACEMENT.reading.drillId, PLACEMENT.writing.promptId, PLACEMENT.speaking.topicId]) {
    assert.ok(!components.includes(id), `${id} is spelled in a component, not only in src/data/placement.ts`);
    assert.ok(!page.includes(id), `${id} is spelled in the page, not only in src/data/placement.ts`);
    assert.ok(!material.includes(id), `${id} is spelled in src/lib/placement/material.ts, not only in src/data/placement.ts`);
  }
  assert.equal(currentOwner().kind, 'user');
});
