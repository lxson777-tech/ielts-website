/* The admin panel's view of one student's work (src/lib/admin.ts): how a
   stored attempt becomes a line in the Tests list, and how its answers are
   joined to the published questions, including every awkward case (a
   question the file lacks, a blank answer, an old attempt with no answers,
   several accepted answers, no file at all). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attemptSummary,
  criterionLabel,
  durationLabel,
  essayBands,
  filterReview,
  loadSiteTest,
  looksLikeSiteTest,
  parseStudentWork,
  questionIdOf,
  reviewRows,
  sourcePaperId,
  type AdminWorkItem,
  type AdminWorkTest,
} from '../src/lib/admin.ts';
import type { SiteTest } from '../src/lib/tutor/test-items.ts';

const SITE: SiteTest = {
  id: 'reading-full-001',
  skill: 'reading',
  title: 'Reading 1',
  questions: [
    { id: 'q1', part: 1, type: 'tfng', typeLabel: 'True / False / Not Given', prompt: 'The bridge opened in 1990.', answer: 'TRUE', explanation: 'Paragraph A says so.', evidence: 'opened in 1990' },
    { id: 'q2', part: 1, type: 'tfng', typeLabel: 'True / False / Not Given', prompt: 'It was built by the city.', answer: 'FALSE', explanation: '', evidence: '' },
    { id: 'q3', part: 1, type: 'sentence-completion', typeLabel: 'Sentence completion', prompt: 'The river is ____ wide.', answer: '200 metres / 200m', explanation: 'The width is given in B.', evidence: '' },
    { id: 'q4', part: 2, type: 'multiple-answer', typeLabel: 'Multiple answer', prompt: 'Which TWO are mentioned?', answer: 'B / D', explanation: '', evidence: '' },
  ],
};

const item = (q: string, firstAnswer: string, correct: boolean, paper = 'reading-full-001'): AdminWorkItem => ({
  itemId: `${paper}:${q}`,
  firstAnswer,
  correct,
  assistance: 'none',
  subskill: 'tfng',
});

function event(over: Partial<AdminWorkTest> = {}, eventOver: Record<string, unknown> = {}): AdminWorkTest {
  return {
    event_id: 'ev-1',
    occurred_at: '2026-10-01T09:00:00Z',
    activity_id: 'test:reading-full-001',
    paper: 'reading',
    mode: 'practice',
    event: {
      at: '2026-10-01T09:00:00Z',
      outcome: { kind: 'scored', raw: 27, total: 40, bandEstimate: 6.5, secondsUsed: 3540 },
      items: [item('q1', 'TRUE', true), item('q2', '', false)],
      ...eventOver,
    },
    ...over,
  };
}

test('an attempt becomes one line: name, date, score, band, time', () => {
  const s = attemptSummary(event());
  assert.equal(s.testId, 'reading-full-001');
  assert.equal(s.sourceId, 'reading-full-001');
  assert.equal(s.title, 'Reading test 1');
  assert.equal(s.kind, 'full');
  assert.equal(s.paper, 'reading');
  assert.deepEqual([s.raw, s.total, s.band, s.secondsUsed], [27, 40, 6.5, 3540]);
  assert.equal(s.answered, 1, 'the blank one is not counted as answered');
  assert.equal(s.hasAnswers, true);
  assert.equal(s.retry, false);
  assert.equal(durationLabel(s.secondsUsed), '59 min');
});

test('a drill reads its full paper, and a listening paper says so', () => {
  const drill = attemptSummary(event({ activity_id: 'drill:listening-full-003-drill-p2', paper: 'listening' }, { outcome: { kind: 'scored', raw: 7, total: 10 } }));
  assert.equal(drill.kind, 'drill');
  assert.equal(drill.paper, 'listening');
  assert.equal(drill.sourceId, 'listening-full-003');
  assert.equal(drill.title, 'Listening test 3, part 2 drill');
  assert.equal(drill.band, null, 'a drill has no band estimate');
  assert.equal(sourcePaperId('reading-full-010-drill-p3'), 'reading-full-010');
});

test('an old attempt moved over from before answers were saved has no answers, and says so', () => {
  const legacy = attemptSummary(event({ event_id: 'legacy:abc' }, { items: undefined }));
  assert.equal(legacy.hasAnswers, false);
  assert.equal(legacy.answered, 0);
  assert.deepEqual(reviewRows([], SITE), []);
});

test('answers are joined to their questions in paper order, right, wrong and blank', () => {
  const rows = reviewRows([item('q2', 'TRUE', false), item('q3', '', false), item('q1', 'TRUE', true)], SITE);
  assert.deepEqual(rows.map((r) => r.questionId), ['q1', 'q2', 'q3']);
  const [q1, q2, q3] = rows as [typeof rows[0], typeof rows[0], typeof rows[0]];
  assert.equal(q1.number, 1);
  assert.equal(q1.prompt, 'The bridge opened in 1990.');
  assert.equal(q1.given, 'TRUE');
  assert.equal(q1.answer, 'TRUE');
  assert.equal(q1.correct, true);
  assert.equal(q1.explanation, 'Paragraph A says so.');
  assert.equal(q1.evidence, 'opened in 1990');
  assert.equal(q2.correct, false);
  assert.equal(q2.blank, false);
  assert.equal(q2.explanation, null, 'an empty explanation is no explanation');
  assert.equal(q3.blank, true);
  assert.equal(q3.correct, false);
  assert.deepEqual(q3.alternatives, ['200 metres', '200m']);
});

test('several accepted answers are listed one by one; a single answer has no list', () => {
  const [multi, single] = reviewRows([item('q4', 'B', true), item('q1', 'FALSE', false)], SITE).sort((a, b) => (b.number ?? 0) - (a.number ?? 0));
  assert.deepEqual(multi!.alternatives, ['B', 'D']);
  assert.equal(multi!.typeLabel, 'Multiple answer');
  assert.deepEqual(single!.alternatives, []);
});

test('a question the published file does not have still shows its id and the answer', () => {
  const rows = reviewRows([item('q40', 'C', false), item('q1', 'TRUE', true)], SITE);
  assert.deepEqual(rows.map((r) => r.questionId), ['q1', 'q40'], 'known questions first, in order, then the rest');
  const missing = rows[1]!;
  assert.equal(missing.number, 40, 'numbered from its id');
  assert.equal(missing.prompt, null);
  assert.equal(missing.answer, null);
  assert.equal(missing.given, 'C');
});

test('with no published file at all, every answer still shows, numbered from its id', () => {
  const rows = reviewRows([item('q12', 'A', true), item('q3', '', false)], null);
  assert.deepEqual(rows.map((r) => [r.number, r.given, r.prompt]), [[3, '', null], [12, 'A', null]]);
});

test('a drill item id names the drill, and the question id is read the same way', () => {
  assert.equal(questionIdOf('reading-full-001-drill-p2:q14'), 'q14');
  const rows = reviewRows([item('q2', 'FALSE', true, 'reading-full-001-drill-p2')], SITE);
  assert.equal(rows[0]!.prompt, 'It was built by the city.');
});

test('"Wrong only" keeps wrong and blank answers and drops the right ones', () => {
  const rows = reviewRows([item('q1', 'TRUE', true), item('q2', 'TRUE', false), item('q3', '', false)], SITE);
  assert.deepEqual(filterReview(rows, 'wrong').map((r) => r.questionId), ['q2', 'q3']);
  assert.equal(filterReview(rows, 'all').length, 3);
});

test('the database answer is shaped safely, whatever arrives', () => {
  assert.deepEqual(parseStudentWork(null), { tests: [], writing: [], speaking: [] });
  assert.deepEqual(parseStudentWork({ tests: 'nope', writing: [null, { promptId: 'p' }] }), { tests: [], writing: [{ promptId: 'p' }], speaking: [] });
});

test('the published file is fetched once per paper, a drill shares its paper\'s file, and a bad file is null', async () => {
  const calls: string[] = [];
  const fetcher = (async (url: string) => {
    calls.push(String(url));
    return new Response(JSON.stringify(String(url).includes('reading-full-002') ? { id: 'x', questions: 'no' } : SITE), { status: 200 });
  }) as unknown as typeof fetch;
  const a = await loadSiteTest('reading-full-001', fetcher);
  const b = await loadSiteTest('reading-full-001-drill-p2', fetcher);
  assert.equal(a, b);
  assert.equal(a!.questions.length, 4);
  assert.deepEqual(calls, ['/data/tests/reading-full-001.json']);
  assert.equal(await loadSiteTest('reading-full-002', fetcher), null);
  assert.equal(await loadSiteTest('../../secret', fetcher), null, 'an id that is not a published paper is never fetched');
  assert.equal(calls.length, 2);
  assert.equal(looksLikeSiteTest(SITE), true);
});

test('an essay\'s bands come with the examiner\'s comments, in the report\'s order', () => {
  const bands = essayBands({
    promptId: 'w1',
    at: '2026-10-01T10:00:00Z',
    criteria: { grammaticalRange: 6, taskResponse: 7 },
    report: { criteria: { taskResponse: { band: 7, comment: 'Clear position.', tip: 'Develop the second idea.' }, grammaticalRange: { band: 6, comment: '' } } },
  });
  assert.deepEqual(bands.map((b) => [b.label, b.band, b.comment]), [['Task response', 7, 'Clear position.'], ['Grammar', 6, null]]);
  assert.equal(bands[0]!.tip, 'Develop the second idea.');
  assert.equal(criterionLabel('someNewThing'), 'Some new thing');
});
