/* The learner record: what it may claim, and what it refuses to.
 *
 * Every learner in this file is SYNTHETIC, written here to make one rule
 * visible. No real student's work appears anywhere in it.
 *
 * The properties that matter most, and why:
 *   - a completion click never becomes a demonstration;
 *   - a blank or abandoned submission is thrown out WITH A NAMED REASON,
 *     never read as a bad result;
 *   - a second go at material already seen is not fresh evidence;
 *   - writing the same work twice is one row, on one device or two;
 *   - there is nowhere in the record a recording could be kept. */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendAllEvidence,
  appendEvidence,
  applySoftCap,
  assertNoRawAudio,
  attemptNumber,
  canonicalJson,
  classifyAll,
  classifyEvidence,
  createEvidenceEvent,
  deriveExposure,
  emptyLearnerRecord,
  evidenceEventId,
  firstAnswerFor,
  firstAttemptsOnly,
  groupIntoOccasions,
  hashContent,
  highestAssistance,
  independentItems,
  independentOccasions,
  isIndependentDemonstration,
  itemExposureKey,
  localDateFromIso,
  mergeLearnerRecords,
  paperExposureKey,
  recordSelfReportedScore,
  retryChain,
  seenItemIds,
  seenSourcePapers,
  summariseEvents,
  talliesFor,
  validateEvidenceEvent,
  type EvidenceDraft,
} from '../src/lib/learning/evidence.ts';
import type { EvidenceEvent, ItemOutcome, LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import {
  LOCAL_EVENT_SOFT_CAP,
  MAX_FIRST_ANSWER_CHARS,
  MAX_WRITTEN_RESPONSE_CHARS,
} from '../src/lib/learning/contracts/evidence.ts';

/* ── Synthetic fixtures ──────────────────────────────────────────────────── */

function item(overrides: Partial<ItemOutcome> & { itemId: string }): ItemOutcome {
  return {
    firstAnswer: 'B',
    correct: true,
    assistance: 'none',
    seenBefore: false,
    ...overrides,
  };
}

/** A synthetic scored drill: ten questions, all answered unaided. */
function drillDraft(overrides: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'trainer:reading',
    contentVersion: 1,
    at: '2026-09-01T09:00:00.000Z',
    localDate: '2026-09-01',
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'scored',
      raw: 8,
      total: 10,
      bySubskill: { 'matching-headings': { correct: 8, total: 10 } },
    },
    items: [item({ itemId: 'q1' }), item({ itemId: 'q2', correct: false, firstAnswer: '' })],
    ...overrides,
  };
}

/** A synthetic completion click on a lesson page. */
function studiedDraft(overrides: Partial<EvidenceDraft> = {}): EvidenceDraft {
  return {
    activityId: 'lesson:reading-matching-headings',
    contentVersion: 1,
    at: '2026-09-02T09:00:00.000Z',
    localDate: '2026-09-02',
    paper: 'reading',
    subskill: 'matching-headings',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'studied', estimatedMinutes: 12 },
    ...overrides,
  };
}

function recordOf(...drafts: EvidenceDraft[]): LearnerRecordV1 {
  return appendAllEvidence(emptyLearnerRecord(), drafts.map((draft) => createEvidenceEvent(draft)));
}

/* ── Ids ─────────────────────────────────────────────────────────────────── */

test('an event id is derived from its content, so the same work twice is one id', () => {
  const a = evidenceEventId(drillDraft());
  const b = evidenceEventId(drillDraft());
  assert.equal(a, b);
  assert.match(a, /^ev:[0-9a-f]{32}$/);
});

test('different work gets a different id', () => {
  const base = evidenceEventId(drillDraft());
  assert.notEqual(base, evidenceEventId(drillDraft({ at: '2026-09-01T09:00:01.000Z' })));
  assert.notEqual(base, evidenceEventId(drillDraft({ activityId: 'trainer:listening' })));
  assert.notEqual(base, evidenceEventId(drillDraft({ items: [item({ itemId: 'q1', firstAnswer: 'C' })] })));
  assert.notEqual(base, evidenceEventId(drillDraft({ idempotencyKey: 'second-go-same-millisecond' })));
});

test('the id does not depend on the order the draft was built in', () => {
  const forwards = canonicalJson({ a: 1, b: { c: 2, d: 3 } });
  const backwards = canonicalJson({ b: { d: 3, c: 2 }, a: 1 });
  assert.equal(forwards, backwards);
  assert.equal(hashContent(forwards), hashContent(backwards));
});

test('the hash spreads: one character changed moves the whole id', () => {
  const a = hashContent('reading-001');
  const b = hashContent('reading-002');
  assert.notEqual(a, b);
  assert.equal(a.length, 32);
  // Nothing like a shared prefix, which a weaker hash would leave behind.
  assert.notEqual(a.slice(0, 8), b.slice(0, 8));
});

/* ── Appending and merging ───────────────────────────────────────────────── */

test('appending the same event twice changes nothing at all', () => {
  const event = createEvidenceEvent(drillDraft());
  const once = appendEvidence(emptyLearnerRecord(), event);
  const twice = appendEvidence(once, event);
  assert.equal(once.events.length, 1);
  assert.equal(twice.events.length, 1);
  assert.equal(twice.evidenceVersion, once.evidenceVersion);
  assert.deepEqual(twice, once);
});

test('the evidence version counts only what was genuinely new', () => {
  const first = createEvidenceEvent(drillDraft());
  const second = createEvidenceEvent(studiedDraft());
  const record = appendAllEvidence(emptyLearnerRecord(), [first, second, first]);
  assert.equal(record.events.length, 2);
  assert.equal(record.evidenceVersion, 2);
});

test('merging two records is a union by id and does not depend on the order', () => {
  const shared = createEvidenceEvent(drillDraft());
  const onlyA = createEvidenceEvent(studiedDraft());
  const onlyB = createEvidenceEvent(drillDraft({ at: '2026-09-03T18:30:00.000Z', localDate: '2026-09-03' }));

  const deviceA = appendAllEvidence(emptyLearnerRecord(), [shared, onlyA]);
  const deviceB = appendAllEvidence(emptyLearnerRecord(), [onlyB, shared]);

  const ab = mergeLearnerRecords(deviceA, deviceB);
  const ba = mergeLearnerRecords(deviceB, deviceA);
  assert.deepEqual(ab, ba);
  assert.equal(ab.events.length, 3);
  assert.deepEqual(
    ab.events.map((e) => e.id),
    ba.events.map((e) => e.id),
  );
});

test('merging a record with itself adds nothing', () => {
  const record = recordOf(drillDraft(), studiedDraft());
  const merged = mergeLearnerRecords(record, record);
  assert.equal(merged.events.length, record.events.length);
  assert.equal(merged.evidenceVersion, record.evidenceVersion);
});

/* ── Studied, assisted, independent ──────────────────────────────────────── */

test('a completion click is studied and is never a demonstration', () => {
  const studied = createEvidenceEvent(studiedDraft());
  const verdict = classifyEvidence(studied);
  assert.equal(verdict.use, 'study');
  assert.equal(verdict.reason, 'studied-only');
  assert.equal(isIndependentDemonstration(studied), false);

  const breakdown = classifyAll([studied]);
  assert.equal(breakdown.independent.length, 0);
  assert.equal(breakdown.studied.length, 1);
});

test('a hundred completion clicks are still not one demonstration', () => {
  const clicks = Array.from({ length: 100 }, (_, i) =>
    createEvidenceEvent(studiedDraft({ activityId: `lesson:synthetic-${i}`, at: `2026-09-02T09:${String(i % 60).padStart(2, '0')}:00.000Z` })),
  );
  assert.equal(classifyAll(clicks).independent.length, 0);
});

test('a correct answer after a hint is assisted, never independent', () => {
  const assisted = createEvidenceEvent(drillDraft({ assistance: 'hint' }));
  const verdict = classifyEvidence(assisted);
  assert.equal(verdict.use, 'assisted');
  assert.equal(verdict.reason, 'assistance-used');
});

test('the event carries the most help used anywhere inside it', () => {
  const event = createEvidenceEvent(
    drillDraft({
      assistance: undefined,
      items: [item({ itemId: 'q1' }), item({ itemId: 'q2', assistance: 'worked-example' })],
    }),
  );
  assert.equal(event.assistance, 'worked-example');
  assert.equal(highestAssistance(['none', 'hint', 'tutor-explained', 'none']), 'tutor-explained');
  assert.equal(highestAssistance([]), 'none');
});

test('a review pass produces no new ability evidence by itself', () => {
  const event = createEvidenceEvent(drillDraft({ mode: 'review' }));
  assert.equal(classifyEvidence(event).reason, 'review-mode');
  assert.equal(classifyEvidence(event).use, 'assisted');
});

test('every mode and every completion state survives a round trip', () => {
  for (const mode of ['lesson-check', 'practice', 'diagnostic', 'assessment', 'review'] as const) {
    const event = createEvidenceEvent(drillDraft({ mode }));
    assert.equal(event.mode, mode);
    assert.deepEqual(validateEvidenceEvent(event), []);
  }
  for (const completion of ['completed', 'partial', 'abandoned', 'blank', 'expired'] as const) {
    const event = createEvidenceEvent(drillDraft({ completion }));
    assert.equal(event.completion, completion);
    assert.deepEqual(validateEvidenceEvent(event), []);
  }
});

/* ── Exclusions, each with a named reason ────────────────────────────────── */

test('blank and abandoned submissions are excluded, each with its own reason', () => {
  const blank = createEvidenceEvent(drillDraft({ completion: 'blank', at: '2026-09-04T09:00:00.000Z', localDate: '2026-09-04' }));
  const abandoned = createEvidenceEvent(drillDraft({ completion: 'abandoned', at: '2026-09-05T09:00:00.000Z', localDate: '2026-09-05' }));
  const good = createEvidenceEvent(drillDraft());

  const breakdown = classifyAll([blank, abandoned, good]);
  assert.equal(breakdown.independent.length, 1);
  assert.deepEqual(
    breakdown.excluded.map((entry) => entry.reason).sort(),
    ['abandoned', 'blank'],
  );
  assert.deepEqual(breakdown.ignored, [
    { reason: 'abandoned', count: 1 },
    { reason: 'blank', count: 1 },
  ]);
});

test('a stub grade is never counted, however complete it looks', () => {
  const stub = createEvidenceEvent({
    activityId: 'trainer:writing',
    contentVersion: 1,
    at: '2026-09-06T09:00:00.000Z',
    localDate: '2026-09-06',
    paper: 'writing',
    subskill: 'task2-position-and-thesis',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'graded',
      overallBand: 7,
      criteria: { taskResponse: 7 },
      grader: { name: 'offline stub', live: false },
    },
  });
  assert.equal(classifyEvidence(stub).use, 'excluded');
  assert.equal(classifyEvidence(stub).reason, 'stub-graded');
});

test('a simulated result is excluded, and a self-reported one is not work done here', () => {
  const simulated = createEvidenceEvent(drillDraft({ provenance: 'simulated' }));
  assert.equal(classifyEvidence(simulated).reason, 'simulated');
  const claimed = createEvidenceEvent(drillDraft({ provenance: 'self-reported' }));
  assert.equal(classifyEvidence(claimed).reason, 'self-reported-claim');
});

test('a superseded event drops out once its replacement arrives', () => {
  const pending = createEvidenceEvent(drillDraft());
  const settled = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:05:00.000Z', supersedes: pending.id }));
  const breakdown = classifyAll([pending, settled]);
  assert.equal(breakdown.excluded.length, 1);
  assert.equal(breakdown.excluded[0]!.event.id, pending.id);
  assert.equal(breakdown.excluded[0]!.reason, 'superseded');
});

test('evidence about version 1 is not evidence about version 2', () => {
  const old = createEvidenceEvent(drillDraft({ contentVersion: 1 }));
  const context = { contentVersions: { 'trainer:reading': 2 } };
  assert.equal(classifyEvidence(old, context).reason, 'stale-content-version');
  const current = createEvidenceEvent(drillDraft({ contentVersion: 2 }));
  assert.equal(classifyEvidence(current, context).use, 'independent');
});

test('an unknown content version is never treated as stale', () => {
  const migrated = createEvidenceEvent(drillDraft({ contentVersion: undefined, provenance: 'legacy' }));
  assert.equal(migrated.contentVersion, 0);
  assert.equal(classifyEvidence(migrated, { contentVersions: { 'trainer:reading': 5 } }).use, 'independent');
});

test('a submission still waiting on a grade is not yet evidence', () => {
  const waiting = createEvidenceEvent(drillDraft({ pendingGrading: true }));
  assert.equal(classifyEvidence(waiting).reason, 'pending-grading');
});

/* ── Exposure: seen material is never fresh evidence ─────────────────────── */

test('exposure is derived from items and from the source paper', () => {
  const record = recordOf(
    drillDraft({ sourceMaterial: [paperExposureKey('reading-001')] }),
  );
  assert.deepEqual(seenItemIds(record).sort(), ['q1', 'q2']);
  assert.deepEqual(seenSourcePapers(record), ['reading-001']);
  assert.deepEqual(
    deriveExposure(record.events).map((entry) => entry.key),
    record.exposure.map((entry) => entry.key),
  );
});

test('a repeat of material already seen counts as assisted and is named as not fresh', () => {
  const first = recordOf(drillDraft({ sourceMaterial: [paperExposureKey('reading-001')] }));
  const again = createEvidenceEvent(
    drillDraft({ at: '2026-09-10T09:00:00.000Z', localDate: '2026-09-10', sourceMaterial: [paperExposureKey('reading-001')] }),
    first,
  );
  assert.equal(again.seenBefore, true);
  assert.equal(again.items?.every((entry) => entry.seenBefore), true);

  const verdict = classifyEvidence(again);
  assert.equal(verdict.use, 'assisted');
  assert.equal(verdict.reason, 'repeat-of-seen-material');

  // Still listed, so a report can say it was not counted as fresh.
  const breakdown = classifyAll([...first.events, again]);
  assert.deepEqual(breakdown.ignored, [{ reason: 'repeat-of-seen-material', count: 1 }]);
  assert.equal(breakdown.independent.length, 1);
});

test('exposure counts occasions without doubling when a record merges with itself', () => {
  const record = recordOf(drillDraft({ sourceMaterial: [paperExposureKey('reading-001')] }));
  const merged = mergeLearnerRecords(record, record);
  assert.deepEqual(merged.exposure, record.exposure);
  assert.equal(merged.exposure.find((entry) => entry.key === 'paper:reading-001')?.occasions, 1);
});

/* ── First answers and retries ───────────────────────────────────────────── */

test('the first answer is kept separately from anything that came after', () => {
  const first = createEvidenceEvent(
    drillDraft({ items: [item({ itemId: 'q1', firstAnswer: 'wrong one', correct: false })] }),
  );
  const second = createEvidenceEvent(
    drillDraft({
      at: '2026-09-01T09:20:00.000Z',
      retryOf: first.id,
      items: [item({ itemId: 'q1', firstAnswer: 'right one', correct: true })],
    }),
  );

  assert.equal(firstAnswerFor(first, 'q1'), 'wrong one');
  assert.equal(firstAnswerFor(second, 'q1'), 'right one');
  assert.equal(firstAnswerFor(first, 'q9'), null);

  // A second go is real work, and it is not a first answer.
  assert.equal(classifyEvidence(second).reason, 'retry-not-first-answer');
  assert.deepEqual(firstAttemptsOnly([first, second]).map((e) => e.id), [first.id]);
  assert.deepEqual(retryChain([first, second], second.id).map((e) => e.id), [first.id, second.id]);
  assert.equal(attemptNumber([first, second], second), 2);
});

test('a retry chain is followed from either end and cannot spin', () => {
  const one = createEvidenceEvent(drillDraft());
  const two = createEvidenceEvent(drillDraft({ at: '2026-09-01T10:00:00.000Z', retryOf: one.id }));
  const three = createEvidenceEvent(drillDraft({ at: '2026-09-01T11:00:00.000Z', retryOf: two.id }));
  const all = [three, one, two];
  assert.deepEqual(retryChain(all, one.id).map((e) => e.id), [one.id, two.id, three.id]);
  assert.deepEqual(retryChain(all, three.id).map((e) => e.id), [one.id, two.id, three.id]);
  assert.equal(attemptNumber(all, three), 3);

  const selfReferring: EvidenceEvent = { ...one, retryOf: one.id };
  assert.deepEqual(retryChain([selfReferring], one.id).map((e) => e.id), [one.id]);
});

test('an item answered with help does not count among the independent items', () => {
  const event = createEvidenceEvent(
    drillDraft({
      items: [item({ itemId: 'q1' }), item({ itemId: 'q2', assistance: 'hint' }), item({ itemId: 'q3', seenBefore: true })],
    }),
  );
  assert.deepEqual(independentItems(event).map((entry) => entry.itemId), ['q1']);
});

/* ── Occasions ───────────────────────────────────────────────────────────── */

test('work done in one sitting is one occasion, however many questions it held', () => {
  const morning = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:00:00.000Z' }));
  const stillMorning = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:12:00.000Z' }));
  const occasions = groupIntoOccasions([morning, stillMorning]);
  assert.equal(occasions.length, 1);
  assert.equal(occasions[0]!.events.length, 2);
});

test('a long gap starts a new sitting, and so does a new day', () => {
  const morning = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:00:00.000Z', localDate: '2026-09-01' }));
  const evening = createEvidenceEvent(drillDraft({ at: '2026-09-01T19:00:00.000Z', localDate: '2026-09-01' }));
  const nextDay = createEvidenceEvent(drillDraft({ at: '2026-09-02T09:10:00.000Z', localDate: '2026-09-02' }));
  assert.equal(groupIntoOccasions([morning, evening, nextDay]).length, 3);
});

test('a plan session is one occasion whatever the gaps inside it', () => {
  const start = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:00:00.000Z', sessionId: 's1' }));
  const end = createEvidenceEvent(drillDraft({ at: '2026-09-01T23:00:00.000Z', sessionId: 's1' }));
  const occasions = groupIntoOccasions([start, end]);
  assert.equal(occasions.length, 1);
  assert.equal(occasions[0]!.key, 'session:s1');
});

test('only independent work counts toward independent occasions', () => {
  const clean = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:00:00.000Z', localDate: '2026-09-01' }));
  const helped = createEvidenceEvent(drillDraft({ at: '2026-09-02T09:00:00.000Z', localDate: '2026-09-02', assistance: 'hint' }));
  const blank = createEvidenceEvent(drillDraft({ at: '2026-09-03T09:00:00.000Z', localDate: '2026-09-03', completion: 'blank' }));
  assert.equal(independentOccasions([clean, helped, blank]).length, 1);
});

/* ── Validation, and no raw audio anywhere ───────────────────────────────── */

test('a malformed event is described rather than accepted', () => {
  const problems = validateEvidenceEvent({ id: 'ev:1', activityId: '', at: 'not a date', localDate: 'yesterday' });
  assert.ok(problems.length > 0);
  assert.ok(problems.some((line) => line.includes('activityId')));
  assert.ok(problems.some((line) => line.includes('localDate')));
  assert.deepEqual(validateEvidenceEvent(null), ['not an object']);
  assert.deepEqual(validateEvidenceEvent(createEvidenceEvent(drillDraft())), []);
});

test('there is nowhere in an event a recording could be kept', () => {
  assert.throws(() => assertNoRawAudio({ outcome: { audio: 'AAAA' } }), /Raw audio is never retained/);
  assert.throws(() => assertNoRawAudio({ items: [{ recordingUrl: 'blob:...' }] }), /Raw audio is never retained/);
  assert.doesNotThrow(() => assertNoRawAudio(createEvidenceEvent(drillDraft())));

  const speaking = createEvidenceEvent({
    activityId: 'trainer:speaking',
    contentVersion: 1,
    at: '2026-09-07T09:00:00.000Z',
    localDate: '2026-09-07',
    paper: 'speaking',
    subskill: 'part2-hold-the-two-minutes',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: {
      kind: 'graded',
      overallBand: 6.5,
      criteria: { fluencyCoherence: 6, pronunciation: 7 },
      grader: { name: 'speaking grader', live: true },
    },
  });
  assert.equal(JSON.stringify(speaking).includes('audio'), false);
});

test('a first answer is capped rather than stored whole', () => {
  const long = 'x'.repeat(MAX_FIRST_ANSWER_CHARS + 50);
  const event = createEvidenceEvent(drillDraft({ items: [item({ itemId: 'q1', firstAnswer: long })] }));
  assert.equal(event.items?.[0]!.firstAnswer.length, MAX_FIRST_ANSWER_CHARS);
});

test('something the student WROTE is kept whole, not as the first 120 characters of it', () => {
  /* Pilot finding, 22 September 2026. A Task 1 overview is one or two
     sentences; at 120 characters the record held the beginning of one, so
     showing a student their own before and after had to fall back on a
     separate local draft store. A written item says so, and gets room for
     a short paragraph. */
  const overview =
    'Overall, the chart shows that electricity generation from renewable sources rose steadily across the whole period, ' +
    'while coal fell away after the middle of it, and by the final year the two had swapped places entirely.';
  assert.ok(overview.length > MAX_FIRST_ANSWER_CHARS, 'the fixture is longer than the short cap');
  assert.ok(overview.length < MAX_WRITTEN_RESPONSE_CHARS, 'and shorter than the written one');

  const written = createEvidenceEvent(
    drillDraft({ items: [item({ itemId: 'prompt:pte-wt-103-task1', firstAnswer: overview, written: true })] }),
  );
  assert.equal(written.items?.[0]!.firstAnswer, overview, 'the whole overview is kept');
  assert.equal(written.items?.[0]!.written, true);

  /* Everything else keeps the short cap, exactly as before. */
  const gapFill = createEvidenceEvent(drillDraft({ items: [item({ itemId: 'q1', firstAnswer: overview })] }));
  assert.equal(gapFill.items?.[0]!.firstAnswer.length, MAX_FIRST_ANSWER_CHARS);
  assert.equal(gapFill.items?.[0]!.written, undefined);
});

test('and a written answer is still capped, so nothing stores an essay through an item row', () => {
  const essay = 'word '.repeat(300);
  const event = createEvidenceEvent(
    drillDraft({ items: [item({ itemId: 'prompt:x', firstAnswer: essay, written: true })] }),
  );
  assert.equal(event.items?.[0]!.firstAnswer.length, MAX_WRITTEN_RESPONSE_CHARS);
});

test('a graded Writing task never copies the essay into the record at all', () => {
  /* The real protection against an essay reaching the record is not the
     cap above: a whole Writing task is GRADED evidence, and graded
     evidence has no item rows. The bands and the criteria are kept; the
     student's 250 words are not. */
  const essay = 'The widespread adoption of remote work has changed cities. '.repeat(20);
  const event = createEvidenceEvent({
    ...drillDraft(),
    activityId: 'write:pte-wt-103-task1',
    paper: 'writing',
    items: undefined,
    outcome: {
      kind: 'graded',
      overallBand: 6.5,
      criteria: { taskAchievement: 6, coherenceCohesion: 6.5, lexicalResource: 6, grammaticalRange: 7 },
      grader: { name: 'grade-essay', live: true },
    },
  });
  assert.equal(event.items, undefined, 'a graded task carries no item rows');
  assert.equal(JSON.stringify(event).includes('remote work'), false, 'and not a word of the essay');
  assert.ok(essay.length > MAX_WRITTEN_RESPONSE_CHARS, 'the essay really is longer than any item cap');
});

test('a stated reason survives on its own, with no correction attempt after it', () => {
  /* Pilot finding, 22 September 2026. In the guided Reading flow the
     student is asked how they chose, and the answer used to ride along
     with the CORRECTION ATTEMPT, so anyone who said how they chose and
     then read the explanation instead of trying again told us something
     that was never kept. It is their own account and the only record of
     it, so it is stored the moment it is given. */
  const reason = { reasonId: 'matched-a-word', note: 'I saw the same word in the heading.' };
  const event = createEvidenceEvent(
    drillDraft({ items: [item({ itemId: 'q3', firstAnswer: 'iv', correct: false, statedReason: reason })] }),
  );
  assert.deepEqual(event.items?.[0]!.statedReason, reason);

  /* And it stays their account, never an observation: the event still
     says only that the answer was wrong. */
  assert.equal(event.items?.[0]!.correct, false);
});

test('the local date follows the instant when the caller does not give one', () => {
  const event = createEvidenceEvent(drillDraft({ localDate: undefined }));
  assert.equal(event.localDate, localDateFromIso(event.at));
  assert.match(event.localDate, /^\d{4}-\d{2}-\d{2}$/);
});

/* ── Self-reported scores ────────────────────────────────────────────────── */

test('a score the student reports is kept apart and never duplicated', () => {
  const once = recordSelfReportedScore(emptyLearnerRecord(), {
    paper: 'reading',
    band: 6.5,
    takenOn: '2026-05-01',
    reportedAt: '2026-09-01T09:00:00.000Z',
  });
  const twice = recordSelfReportedScore(once, {
    paper: 'reading',
    band: 6.5,
    takenOn: '2026-05-01',
    reportedAt: '2026-09-09T09:00:00.000Z',
  });
  assert.equal(once.selfReported.length, 1);
  assert.equal(twice.selfReported.length, 1);
  assert.equal(once.events.length, 0);
});

/* ── The local soft cap ──────────────────────────────────────────────────── */

test('past the cap the oldest events become tallies, and the newest stay whole', () => {
  const events = Array.from({ length: 10 }, (_, i) =>
    createEvidenceEvent(drillDraft({ at: `2026-09-01T0${i}:00:00.000Z`, localDate: '2026-09-01' })),
  );
  const record = appendAllEvidence(emptyLearnerRecord(), events);
  const capped = applySoftCap(record, 4);

  assert.equal(capped.events.length, 4);
  assert.deepEqual(capped.events.map((e) => e.id), events.slice(6).map((e) => e.id));
  assert.equal(capped.summaries?.length, 1);
  assert.equal(capped.summaries?.[0]!.eventCount, 6);
  assert.equal(capped.summaries?.[0]!.kind, 'evidence-summary');
  assert.match(capped.summaries?.[0]!.id ?? '', /^sum:/);
});

test('a summary keeps its provenance and can never be read as item-level evidence', () => {
  const recorded = createEvidenceEvent(drillDraft({ at: '2026-09-01T09:00:00.000Z' }));
  const migrated = createEvidenceEvent(drillDraft({ at: '2026-09-01T10:00:00.000Z', provenance: 'legacy' }));
  const studied = createEvidenceEvent(studiedDraft({ at: '2026-09-01T11:00:00.000Z', mode: 'lesson-check' }));
  const summary = summariseEvents([recorded, migrated, studied])!;

  assert.equal(summary.tallies.length, 3);
  assert.deepEqual(summary.tallies.map((t) => t.provenance).sort(), ['legacy', 'recorded', 'recorded']);
  // The studied click is counted as study, never as a demonstration.
  const studyTally = summary.tallies.find((t) => t.studiedCount > 0)!;
  assert.equal(studyTally.independentOccasions, 0);
  assert.equal(studyTally.independentItems, 0);

  const serialised = JSON.stringify(summary);
  assert.equal(serialised.includes('firstAnswer'), false);
  assert.equal(serialised.includes('"items"'), false);
});

test('two devices that compact the same block agree on its id', () => {
  const events = Array.from({ length: 6 }, (_, i) =>
    createEvidenceEvent(drillDraft({ at: `2026-09-0${i + 1}T09:00:00.000Z`, localDate: `2026-09-0${i + 1}` })),
  );
  const deviceA = applySoftCap(appendAllEvidence(emptyLearnerRecord(), events), 2);
  const deviceB = applySoftCap(appendAllEvidence(emptyLearnerRecord(), [...events].reverse()), 2);
  assert.deepEqual(deviceA.summaries, deviceB.summaries);
  assert.deepEqual(mergeLearnerRecords(deviceA, deviceB).summaries, deviceA.summaries);
});

test('the cap leaves a record that is under it exactly as it was', () => {
  const record = recordOf(drillDraft(), studiedDraft());
  assert.deepEqual(applySoftCap(record, LOCAL_EVENT_SOFT_CAP), record);
  assert.deepEqual(talliesFor(record, 'matching-headings'), []);
});

test('exposure survives compaction, so old material is still known to be seen', () => {
  const events = Array.from({ length: 5 }, (_, i) =>
    createEvidenceEvent(
      drillDraft({ at: `2026-09-0${i + 1}T09:00:00.000Z`, localDate: `2026-09-0${i + 1}`, sourceMaterial: [paperExposureKey(`reading-00${i}`)] }),
    ),
  );
  const capped = applySoftCap(appendAllEvidence(emptyLearnerRecord(), events), 1);
  assert.equal(capped.events.length, 1);
  assert.equal(seenSourcePapers(capped).length, 5);
  assert.ok(capped.exposure.some((entry) => entry.key === itemExposureKey('q1')));
});
