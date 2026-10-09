/* Practice settings on a paper's start screen (Alex, 9 October 2026): the
 * timer, checking as you go, which passages or parts to do, and how the
 * listening recording plays.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/practice-settings.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT IS BEING DEFENDED
 *   1. The contract: what counts as exam conditions, the minutes on each
 *      clock, which parts are chosen, what is remembered on the device.
 *   2. A subset paper holds exactly the chosen parts (the same objects), and
 *      its id lines up with the drill catalogue: one part has the very id its
 *      drill has, several have `-drill-p1-p3`. Every place that parses a
 *      drill id reads the new shape.
 *   3. Honest results: only a full paper in exam conditions is a full result.
 *      A paper taken with help is recorded as practice with no band, and
 *      cannot be read as an exam from its id alone.
 *   4. A sitting with no timer has no deadline: it never expires, is always
 *      resumable, and its time used is real time from its start.
 *   5. A question checked as you go is recorded with the help level
 *      'answer-shown'; a multiple-answer group or an answer pool is checked
 *      as a whole.
 *
 * Every student, answer and band below is SYNTHETIC. There is no DOM: the
 * browser is a Map, and the on-screen rules are proved at the functions the
 * screen calls plus source scans where the rule lives in the component.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* ------------------------------------------------------------------ */
/* A browser, in a dozen lines (same as test-session-owner.test.ts)    */
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

let storage = memoryStorage();

(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return storage;
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};
Object.defineProperty(globalThis, 'localStorage', { get: () => storage, configurable: true });

const settingsLib = await import('../src/lib/tests/practice-settings.ts');
const subset = await import('../src/lib/tests/practice-subset.ts');
const session = await import('../src/lib/test-session.ts');
const recording = await import('../src/components/attempt-recording.ts');
const drills = await import('../src/lib/tests/drills.ts');
const { ALL_TESTS } = await import('../src/data/tests/index.ts');
const { createLearnerStore, userOwner } = await import('../src/lib/learning/store.browser.ts');
const { classifyEvidence } = await import('../src/lib/learning/evidence.ts');
const admin = await import('../src/lib/admin.ts');
const testItems = await import('../src/lib/tutor/test-items.ts');

import type { PracticeSettings } from '../src/lib/tests/practice-settings.ts';
import type { PracticeTest, Question, QuestionGroup } from '../src/lib/tests/schema.ts';

const { EXAM_CONDITIONS, clockMinutes, isExamConditions, selectedParts, readRememberedSettings, rememberSettings } = settingsLib;

const READING = ALL_TESTS.find((t: PracticeTest) => t.id === 'reading-full-016')!;
const LISTENING = ALL_TESTS.find((t: PracticeTest) => t.id === 'listening-full-003')!;

const withSettings = (over: Partial<PracticeSettings>): PracticeSettings => ({ ...EXAM_CONDITIONS, parts: [], ...over });

/* ------------------------------------------------------------------ */
/* 1. The contract                                                     */
/* ------------------------------------------------------------------ */

test('the fixtures are the papers the browser checks use', () => {
  assert.ok(READING && LISTENING);
  assert.equal(READING.parts.length, 3);
  assert.equal(LISTENING.parts.length, 4);
  assert.equal(READING.durationMinutes, 60);
});

test('isExamConditions: only the exam timer, marking at the end, every part and (listening) one play', () => {
  assert.equal(isExamConditions(EXAM_CONDITIONS, 3, false), true);
  assert.equal(isExamConditions(EXAM_CONDITIONS, 4, true), true);
  assert.equal(isExamConditions(withSettings({ timer: 'extra' }), 3, false), false);
  assert.equal(isExamConditions(withSettings({ timer: 'off' }), 3, false), false);
  assert.equal(isExamConditions(withSettings({ check: 'as-you-go' }), 3, false), false);
  assert.equal(isExamConditions(withSettings({ parts: [1] }), 3, false), false);
  /* Choosing every part is the same as choosing none: still the whole paper. */
  assert.equal(isExamConditions(withSettings({ parts: [0, 1, 2] }), 3, false), true);
  /* Replay matters for listening only; reading ignores it. */
  assert.equal(isExamConditions(withSettings({ playback: 'replay' }), 4, true), false);
  assert.equal(isExamConditions(withSettings({ playback: 'replay' }), 3, false), true);
});

test('clockMinutes: exam time, +25% extra time, and none at all', () => {
  assert.equal(clockMinutes(60, 'exam'), 60);
  assert.equal(clockMinutes(60, 'extra'), 75);
  assert.equal(clockMinutes(40, 'extra'), 50);
  assert.equal(clockMinutes(60, 'off'), null);
});

test('selectedParts drops what is out of range and reads empty as every part', () => {
  assert.deepEqual(selectedParts(withSettings({ parts: [] }), 3), [0, 1, 2]);
  assert.deepEqual(selectedParts(withSettings({ parts: [2, 0, 2, 9, -1] }), 3), [0, 2]);
  assert.deepEqual(selectedParts(withSettings({ parts: [9] }), 3), [0, 1, 2]);
});

test('timer, checking and playback are remembered on the device; the parts never are', () => {
  storage = memoryStorage();
  assert.deepEqual(readRememberedSettings(), { ...EXAM_CONDITIONS, parts: [] });
  rememberSettings(withSettings({ timer: 'off', check: 'as-you-go', playback: 'replay', parts: [1] }));
  assert.deepEqual(readRememberedSettings(), { timer: 'off', check: 'as-you-go', playback: 'replay', parts: [] });
  storage.setItem('ielts.practice.settings.v1', '{not json');
  assert.deepEqual(readRememberedSettings(), { ...EXAM_CONDITIONS, parts: [] });
});

/* ------------------------------------------------------------------ */
/* 2. Subset papers and their ids                                      */
/* ------------------------------------------------------------------ */

test('every part chosen is the paper itself, untouched', () => {
  assert.equal(subset.buildPracticePaper(READING, withSettings({ parts: [] })), READING);
  assert.equal(subset.buildPracticePaper(READING, withSettings({ parts: [0, 1, 2] })), READING);
  assert.equal(subset.buildPracticePaper(LISTENING, withSettings({ timer: 'off' })), LISTENING);
});

test('one chosen part has the very id its drill has, and the same part object', () => {
  for (const source of [READING, LISTENING]) {
    for (let i = 0; i < source.parts.length; i += 1) {
      const paper = subset.buildPracticePaper(source, withSettings({ parts: [i] }));
      const drill = drills.getDrill(`${source.id}-drill-p${i + 1}`);
      assert.ok(drill, `no drill ${source.id} part ${i + 1}`);
      assert.equal(paper.id, drill!.id);
      assert.equal(paper.parts.length, 1);
      assert.equal(paper.parts[0], source.parts[i], 'the part is kept as it is');
      assert.equal(paper.durationMinutes, drill!.test.durationMinutes, 'a single part has its drill\'s minutes');
      assert.equal(paper.skill, source.skill);
      assert.equal(paper.audioSrc, source.audioSrc);
    }
  }
});

test('several, but not all, parts get a combined id and keep the paper\'s order', () => {
  const paper = subset.buildPracticePaper(LISTENING, withSettings({ parts: [3, 2] }));
  assert.equal(paper.id, 'listening-full-003-drill-p3-p4');
  assert.deepEqual(paper.parts, [LISTENING.parts[2], LISTENING.parts[3]]);
  const reading = subset.buildPracticePaper(READING, withSettings({ parts: [0, 2] }));
  assert.equal(reading.id, 'reading-full-016-drill-p1-p3');
  assert.equal(subset.subsetId('x-full-001', [0, 1, 2], 3), 'x-full-001', 'all parts is the source id');
});

test('a subset\'s scoring covers only its questions', () => {
  const paper = subset.buildPracticePaper(READING, withSettings({ parts: [1] }));
  const own = paper.parts[0]!.groups.flatMap((g) => g.questions).filter((q) => q.scored !== false).length;
  const whole = READING.parts.flatMap((p) => p.groups.flatMap((g) => g.questions)).filter((q) => q.scored !== false).length;
  assert.ok(own > 0 && own < whole);
});

test('minutes: all parts the paper\'s own; reading by share, never under ten; listening by each part\'s own recording', () => {
  assert.equal(subset.subsetMinutes(READING, [0, 1, 2]), 60);
  assert.equal(subset.subsetMinutes(READING, [0]), 20);
  assert.equal(subset.subsetMinutes(READING, [0, 1]), 40);
  assert.equal(subset.subsetMinutes({ ...READING, durationMinutes: 12 }, [0]), 10, 'the single-passage drill floor');
  const l = subset.subsetMinutes(LISTENING, [2, 3]);
  assert.equal(l, drills.listeningDrillMinutes(LISTENING.parts[2]!) + drills.listeningDrillMinutes(LISTENING.parts[3]!));
  assert.ok(l * 60 >= 120, 'long enough for both recordings');
  assert.equal(subset.paperClockMinutes(READING, withSettings({ timer: 'extra' })), 75);
  assert.equal(subset.paperClockMinutes(READING, withSettings({ timer: 'extra', parts: [0] })), 25);
  assert.equal(subset.paperClockMinutes(READING, withSettings({ timer: 'off' })), null);
});

test('every place that reads a drill id reads the several-part ids too', () => {
  assert.deepEqual(subset.drillPartNumbers('listening-full-003-drill-p2'), [2]);
  assert.deepEqual(subset.drillPartNumbers('listening-full-003-drill-p3-p4'), [3, 4]);
  assert.deepEqual(subset.drillPartNumbers('reading-full-016-drill-p1-p3-retake'), [1, 3]);
  assert.equal(subset.drillPartNumbers('reading-full-016'), null);
  assert.equal(subset.sourcePaperOf('reading-full-016-drill-p1-p3'), 'reading-full-016');
  assert.equal(subset.sourcePaperOf('reading-full-016-drill-p2-retake'), 'reading-full-016');
  assert.equal(subset.sourcePaperOf('reading-full-016'), 'reading-full-016');

  assert.equal(recording.isDrillAttemptId('reading-full-016-drill-p1-p3'), true);
  assert.equal(recording.isDrillAttemptId('reading-full-016-drill-p1-p3-retake'), true);
  assert.equal(recording.isDrillAttemptId('reading-full-016'), false);
  assert.equal(recording.isMultiPartSubsetId('reading-full-016-drill-p1-p3'), true);
  assert.equal(recording.isMultiPartSubsetId('reading-full-016-drill-p2'), false);
  /* A single part is the catalogue's own drill; several are recorded against
     their full paper, never a drill id nothing else knows. */
  assert.equal(recording.attemptActivityId('reading-full-016-drill-p2'), 'drill:reading-full-016-drill-p2');
  assert.equal(recording.attemptActivityId('reading-full-016-drill-p1-p3'), 'test:reading-full-016');
  assert.equal(recording.attemptActivityId('reading-full-016-drill-p1-p3-retake'), 'test:reading-full-016');

  assert.equal(testItems.sourceTestId('listening-full-003-drill-p3-p4'), 'listening-full-003');
  assert.equal(admin.sourcePaperId('listening-full-003-drill-p3-p4'), 'listening-full-003');
  assert.equal(admin.testLabel('listening-full-003-drill-p3-p4'), 'Listening test 3, parts 3 and 4 drill');
  assert.equal(admin.testLabel('reading-full-016-drill-p2'), 'Reading test 16, passage 2 drill');
});

/* ------------------------------------------------------------------ */
/* 3. Honest results                                                   */
/* ------------------------------------------------------------------ */

test('resultKindOf: only a full paper in exam conditions is a full result', () => {
  assert.equal(subset.resultKindOf('full', EXAM_CONDITIONS, READING), 'full');
  assert.equal(subset.resultKindOf('full', EXAM_CONDITIONS, LISTENING), 'full');
  assert.equal(subset.resultKindOf('full', withSettings({ timer: 'extra' }), READING), 'drill');
  assert.equal(subset.resultKindOf('full', withSettings({ timer: 'off' }), READING), 'drill');
  assert.equal(subset.resultKindOf('full', withSettings({ check: 'as-you-go' }), READING), 'drill');
  assert.equal(subset.resultKindOf('full', withSettings({ parts: [1] }), READING), 'drill');
  assert.equal(subset.resultKindOf('full', withSettings({ playback: 'replay' }), LISTENING), 'drill');
  /* A drill page is always practice, whatever the settings say. */
  assert.equal(subset.resultKindOf('drill', EXAM_CONDITIONS, READING), 'drill');
  assert.equal(subset.resultKindOf('drill', EXAM_CONDITIONS, LISTENING), 'drill');
});

/* A little paper to record. */
function entries(): { question: Question; group: QuestionGroup }[] {
  const group: QuestionGroup = {
    title: 'Questions 1 to 3',
    type: 'sentence-completion',
    instructionHtml: '',
    questions: [
      { id: 'q1', answer: 'a' },
      { id: 'q2', answer: 'b' },
      { id: 'q3', answer: 'c' },
    ],
  };
  return group.questions.map((question) => ({ question, group }));
}

function freshStore() {
  const data = new Map<string, string>();
  return createLearnerStore({
    storage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
    owner: userOwner('synthetic-student'),
    now: () => '2026-10-09T09:00:00.000Z',
  });
}

test('a full paper taken with help is recorded as practice with no band, and is never read as an exam', () => {
  const store = freshStore();
  const rows = entries();
  const answers = { q1: 'a', q2: 'b', q3: 'x' };
  const scored = new Set(['q1', 'q2']);
  /* What TestPlayer passes: the result kind (drill, because of the settings),
     under the same names the exam path uses. */
  const attemptKind = subset.resultKindOf('full', withSettings({ timer: 'off' }), READING);
  const items = recording.buildQuestionItems('reading-full-016', rows, answers, scored, new Set());
  const event = store.recordSubmission({
    activityId: recording.attemptActivityId('reading-full-016'),
    paper: 'reading',
    at: '2026-10-09T09:00:00.000Z',
    mode: recording.attemptEvidenceMode(attemptKind),
    completion: 'completed',
    items,
    raw: 2,
    total: 3,
    bandEstimate: attemptKind === 'full' ? 6.5 : undefined,
    secondsUsed: 1234,
    sourceTestId: 'reading-full-016',
  })!;
  assert.equal(event.mode, 'practice');
  assert.equal(event.activityId, 'test:reading-full-016');
  assert.equal(event.outcome.kind, 'scored');
  if (event.outcome.kind === 'scored') {
    assert.equal(event.outcome.bandEstimate, undefined, 'a paper taken with help carries no band');
    assert.equal(event.outcome.secondsUsed, 1234);
  }
  assert.notEqual(classifyEvidence(event).use, 'assessed');
});

test('the id of a full paper alone must not read as an exam when the sitting says it had help', () => {
  assert.equal(recording.attemptEvidenceModeFromId('reading-full-016'), 'assessment');
  assert.equal(recording.attemptEvidenceModeFromId('reading-full-016', false), 'assessment');
  assert.equal(recording.attemptEvidenceModeFromId('reading-full-016', true), 'practice');
  assert.equal(recording.attemptEvidenceModeFromId('reading-full-016-drill-p1-p3'), 'practice');
});

test('the history row of a paper taken with help is a drill, flagged practice, and band histories leave it out', () => {
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  assert.match(player, /const attemptKind = resultKindOf\(pageKind, settings, pageTest\);/);
  assert.match(player, /kind: attemptKind,/);
  assert.match(player, /const tookHelp = pageKind === 'full' && attemptKind === 'drill';/);
  assert.match(player, /\.\.\.\(tookHelp \? \{ practice: true \} : \{\}\)/);
  assert.match(player, /bandEstimate: attemptKind === 'full' \?/);
  assert.match(player, /mode: attemptEvidenceMode\(attemptKind, placementRecording\?\.mode\)/);
  /* The band history, the report and Mr EZ all leave 'drill' out. */
  for (const file of ['src/lib/progress.ts', 'src/components/ScoreHistory.tsx', 'src/lib/tutor/insights.ts', 'src/components/ProgressReport.tsx']) {
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /kind !== 'drill'/, file);
  }
  /* No band to Mr EZ for a drill-kind attempt either. */
  assert.match(readFileSync(new URL('../src/lib/tutor/assessment.ts', import.meta.url), 'utf8'), /attempt\.kind === 'drill' \? undefined : attempt\.band/);
});

test('the mock exam, the placement and a retake never see the settings', () => {
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  assert.match(player, /const canChoose = !isRetake && !mockSittingId && !inPlacement;/);
  assert.match(player, /onSettings=\{canChoose \? setSettings : undefined\}/);
  /* The remembered choices are only ever picked up where the screen is shown. */
  assert.match(player, /if \(!restore \|\| !canChoose \|\| resumed \|\| startedRef\.current\) return;/);
  assert.match(player, /canChoose\s*\? \{\s*clockMinutes: clockMinutes\(test\.durationMinutes, settings\.timer\),/);
  /* Without the settings, a start is the paper's own clock. */
  assert.match(player, /\}\s*: undefined,\s*\);/);
});

/* ------------------------------------------------------------------ */
/* 4. A sitting with no timer                                          */
/* ------------------------------------------------------------------ */

test('a sitting with no timer has no deadline, never expires and is always resumable', () => {
  storage = memoryStorage();
  const untimed = session.startSession(READING, {
    clockMinutes: null,
    settings: withSettings({ timer: 'off' }),
    paperId: READING.id,
    practice: true,
  });
  assert.equal(untimed.endsAt, null);
  assert.equal(session.isUntimed(untimed), true);
  const far = untimed.startedAt + 365 * 24 * 3600 * 1000;
  assert.equal(session.sessionExpired(untimed, far), false, 'a year later it is still not expired');
  assert.equal(session.sessionResumable(untimed, far), true);
  assert.equal(session.secondsLeft(untimed, far), 0, 'there is no countdown to read');
  assert.equal(untimed.practice, true);
  assert.deepEqual(untimed.settings?.timer, 'off');
  /* It round-trips through the device and is found again for its paper. */
  const loaded = session.loadSession(READING.id)!;
  assert.equal(loaded.endsAt, null);
  assert.equal(loaded.sittingId, untimed.sittingId);
  assert.equal(session.activeSession()?.endsAt, null);
});

test('a timed sitting still expires, resumes and counts down exactly as before', () => {
  storage = memoryStorage();
  const timed = session.startSession(READING);
  assert.equal(timed.endsAt! - timed.startedAt, 60 * 60_000);
  assert.equal(session.sessionExpired(timed, timed.startedAt + 59 * 60_000), false);
  assert.equal(session.sessionExpired(timed, timed.endsAt!), true);
  assert.equal(session.sessionResumable(timed, timed.startedAt + 59 * 60_000), true);
  assert.equal(session.sessionResumable(timed, timed.endsAt! + 1), false);
  assert.equal(timed.settings, undefined, 'a sitting started without choices carries none');
  const extra = session.startSession(READING, { clockMinutes: 75, settings: withSettings({ timer: 'extra' }) });
  assert.equal(extra.endsAt! - extra.startedAt, 75 * 60_000);
});

test('a sitting keeps its chosen settings, its paper and its checked questions across a reload', () => {
  storage = memoryStorage();
  const chosen = withSettings({ timer: 'extra', check: 'as-you-go', parts: [1] });
  const started = session.startSession(READING, { clockMinutes: 25, settings: chosen, paperId: 'reading-full-016-drill-p2', practice: true });
  const ref = session.sittingRefOf(started);
  assert.equal(started.testId, 'reading-full-016', 'found again under the page\'s paper');
  assert.equal(started.paperId, 'reading-full-016-drill-p2');
  assert.equal(session.saveAnswers({ q1: 'a' }, started.owner, ref, { checked: ['q1'] }), true);
  const back = session.loadSession('reading-full-016')!;
  assert.deepEqual(back.settings, chosen);
  assert.deepEqual(back.checked, ['q1']);
  assert.deepEqual(back.answers, { q1: 'a' });
  /* A later save that carries no extras keeps what was checked. */
  assert.equal(session.saveAnswers({ q1: 'a', q2: 'b' }, started.owner, ref), true);
  assert.deepEqual(session.loadSession('reading-full-016')!.checked, ['q1']);
});

test('the paper store passes the start options on, and a mock leg or placement part ignores them', () => {
  storage = memoryStorage();
  const store = session.standaloneSitting(READING);
  const s = store.start({ clockMinutes: null, settings: withSettings({ timer: 'off' }) });
  assert.equal(s.endsAt, null);
  assert.equal(store.save({ q1: 'a' }, s.owner, session.sittingRefOf(s), { checked: ['q1'] }), true);
  assert.equal(store.load()!.checked?.[0], 'q1');
  const plain = session.standaloneSitting(READING).start();
  assert.equal(typeof plain.endsAt, 'number', 'no options: the paper\'s own clock');
});

test('time used is real time from the start, right with extra time and with no timer', () => {
  const T0 = 1_000_000_000_000;
  const MIN = 60_000;
  /* No timer: whatever has really passed, with no ceiling. */
  assert.equal(session.timeUsedSeconds(T0, null, T0 + 95 * MIN), 95 * 60);
  /* Extra time: 75 minutes on the clock, 70 spent. The old sum (60 minutes
     minus what was left) would have said 55. */
  assert.equal(session.timeUsedSeconds(T0, T0 + 75 * MIN, T0 + 70 * MIN), 70 * 60);
  /* Exam time: a tick that fires a moment late cannot show more than the clock. */
  assert.equal(session.timeUsedSeconds(T0, T0 + 60 * MIN, T0 + 60 * MIN + 900), 60 * 60);
  /* Not started, or a clock that ran backwards: never negative. */
  assert.equal(session.timeUsedSeconds(null, null, T0), 0);
  assert.equal(session.timeUsedSeconds(T0, null, T0 - 5000), 0);
  /* The player uses it for both the history row and the evidence. */
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  assert.match(player, /const secondsUsed = timeUsedSeconds\(startedAtRef\.current, deadline\);/);
  assert.doesNotMatch(player, /durationMinutes \* 60 - left/);
});

test('an untimed sitting found stale on a later visit is abandoned, never expired, and a help paper stays practice', () => {
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  assert.match(player, /const cappedEnd = stale\.endsAt === null \? Date\.now\(\) : Math\.min\(Date\.now\(\), stale\.endsAt\);/);
  assert.match(player, /const expired = sessionExpired\(stale\);/);
  assert.match(player, /mode: attemptEvidenceModeFromId\(sat, stale\.practice === true\),/);
  assert.match(player, /const sat = stale\.paperId \?\? stale\.testId;/);
  /* And the Tests page offers to resume an untimed sitting. */
  const hub = readFileSync(new URL('../src/pages/tests/index.astro', import.meta.url), 'utf8');
  assert.match(hub, /sessionResumable\(session\)/);
});

/* ------------------------------------------------------------------ */
/* 5. Check as you go                                                  */
/* ------------------------------------------------------------------ */

test('a checked question is recorded with the help level answer-shown; an unchecked one is untouched', () => {
  const rows = entries();
  const answers = { q1: 'a', q2: 'b', q3: 'c' };
  const scored = new Set(['q1', 'q2', 'q3']);
  const items = recording.buildQuestionItems('reading-full-016', rows, answers, scored, new Set(['q3']), new Set(['q1']));
  const level = Object.fromEntries(items.map((i) => [i.itemId.split(':')[1], i.assistance]));
  assert.deepEqual(level, { q1: 'answer-shown', q2: 'none', q3: 'hint' });
  /* The answer given is kept as it was when the student pressed Check. */
  assert.equal(items.find((i) => i.itemId.endsWith(':q1'))!.firstAnswer, 'a');
  /* Answer shown outranks a hint on the same question. */
  const both = recording.buildQuestionItems('p', rows, answers, scored, new Set(['q1']), new Set(['q1']));
  assert.equal(both[0]!.assistance, 'answer-shown');
  /* The event as a whole carries the highest help used. */
  const store = freshStore();
  const event = store.recordSubmission({
    activityId: recording.attemptActivityId('reading-full-016'),
    paper: 'reading',
    mode: 'practice',
    completion: 'completed',
    items,
    sourceTestId: 'reading-full-016',
  })!;
  assert.equal(event.assistance, 'answer-shown');
});

test('a multiple-answer group and an answer pool are checked as a whole; everything else one by one', () => {
  const multi: QuestionGroup = {
    title: 'Choose two',
    type: 'multiple-answer',
    instructionHtml: '',
    selectCount: 2,
    choices: [],
    questions: [
      { id: 'm1', answer: ['A', 'C'] },
      { id: 'm2', answer: ['A', 'C'] },
    ],
  };
  assert.deepEqual(subset.checkUnit(multi, multi.questions[0]!), ['m1', 'm2']);
  const pool: QuestionGroup = {
    title: 'Pool',
    type: 'sentence-completion',
    instructionHtml: '',
    questions: [
      { id: 'p19', answer: 'a', answerPairId: 'pair-19-20' },
      { id: 'p20', answer: 'b', answerPairId: 'pair-19-20' },
      { id: 'p21', answer: 'c' },
    ],
  };
  assert.deepEqual(subset.checkUnit(pool, pool.questions[1]!), ['p19', 'p20']);
  assert.deepEqual(subset.checkUnit(pool, pool.questions[2]!), ['p21']);
  /* A per-question multi-select is one question on its own. */
  const per: QuestionGroup = {
    title: 'Per',
    type: 'multiple-answer',
    instructionHtml: '',
    questions: [{ id: 'k1', answer: 'A', multiSelect: { correctValues: ['A', 'B'], selectCount: 2 } }],
  };
  assert.deepEqual(subset.checkUnit(per, per.questions[0]!), ['k1']);
  /* Real papers: a pair from listening-full-003 is checked together. */
  const realGroup = LISTENING.parts.flatMap((p) => p.groups).find((g) => g.questions.some((q) => q.answerPairId))!;
  const paired = realGroup.questions.find((q) => q.answerPairId)!;
  assert.ok(subset.checkUnit(realGroup, paired).length >= 2);
});

test('the player locks a checked answer and offers Check only when the settings say so', () => {
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  /* Locked: setAnswer refuses a checked question's id. */
  assert.match(player, /if \(checkedRef\.current\.has\(qid\)\) return;/);
  /* The Check button exists only with the setting on, before hand-in. */
  assert.match(player, /const checkMode = settings\.check === 'as-you-go';/);
  assert.match(player, /checkMode &&\s*!submitted &&\s*!checkedIds\.has\(nq\.question\.id\) &&/);
  /* The final score counts checked answers as given, and the evidence marks them. */
  assert.match(player, /buildQuestionItems\(baseId, numbered, answers, scoredIds, assistedIds, checkedIds\)/);
  /* Mr EZ is only asked about a handed-in paper. */
  assert.match(player, /tutorTestId=\{submitted \? tutorTestId : undefined\}/);
});

/* ------------------------------------------------------------------ */
/* 6. The start screen's wording stays honest                          */
/* ------------------------------------------------------------------ */

test('the clock warnings stay in the start screen and show only when a timer will run', () => {
  const player = readFileSync(new URL('../src/components/TestPlayer.tsx', import.meta.url), 'utf8');
  const screen = player.slice(player.indexOf('function InstructionsScreen('));
  assert.match(screen, /t\('The clock cannot be paused\.'\)/);
  assert.match(screen, /t\('The timer starts as soon as you begin and runs continuously\.'\)/);
  assert.match(screen, /\{timed \? \(\s*<p className="preflight-essential">\{t\('The timer starts/);
  assert.match(screen, /const timed = timerRuns\(settings\);/);
  /* The recording's copy follows the playback setting, not just the page. */
  assert.match(screen, /const replayOn = attemptKind === 'drill' \|\| settings\.playback === 'replay';/);
  assert.match(screen, /\{timed && \(\s*<li className="flex gap-2\.5">\s*<span aria-hidden="true" className="shrink-0">⏱<\/span>/);
});

test('no new interface text uses an em or en dash', () => {
  for (const file of [
    'src/lib/tests/practice-subset.ts',
    'src/lib/i18n/dict/ru/tests-player.ts',
  ]) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const added = file.endsWith('tests-player.ts') ? text.slice(text.indexOf('Practice settings on the start screen')) : text;
    assert.doesNotMatch(added, /[–—]/, file);
  }
});
