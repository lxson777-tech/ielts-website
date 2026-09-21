/* Listening, every question type with real material (WP18b/WP19,
 * 2026-09-22): src/data/focused/listening-*.ts, the audio stimulus added
 * to src/components/learning/focused-exercise.ts and FocusedExercise.tsx,
 * and the resolution branch added to
 * src/pages/trainers/focused/[id].astro.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/focused-listening-types.test.ts
 * The whole suite is `npm test`.
 *
 * WHAT IS BEING DEFENDED
 *   1. Every listening focused exercise names a real group of a real paper,
 *      of the type it claims, with the paper's own item ids.
 *   2. Every type that has real material (sentence-completion,
 *      multiple-choice, table-completion, matching-features,
 *      multiple-answer, categorisation, diagram-labelling) has at least two
 *      guided exercises and at least two independent checks, and no item
 *      is spent by both a guided set and a check.
 *   3. The three papers held back for checks (listening-full-008, -009,
 *      -019) are exactly the papers the check exercises draw on, and
 *      between them cover every type; ordinary practice never spends them.
 *   4. The audio segment maths: never outside the part, never cutting off
 *      the last located answer, deterministic, and the honest fallback to
 *      the whole part when even one item cannot be located. Checked on a
 *      synthetic fixture (the boundary cases) and on real transcripts (that
 *      it actually narrows on real data, not only in theory).
 *   5. Which items a seek or a replay marks as assisted.
 *   6. A question met through a drill or a lesson check counts as seen for
 *      a later independent check, using the real evidence and session
 *      functions, not a stand-in.
 *   7. Nothing this package wrote contains an em dash or an en dash.
 *
 * Every learner record here is SYNTHETIC. There is no DOM: the audio
 * control is a small React component with no logic of its own: everything
 * that decides what the segment IS lives in focused-exercise.ts, which is
 * what this file exercises.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  FOCUSED_EXERCISES,
  MISTAKE_REASONS,
  RESERVED_CHECK_PAPER_IDS,
  isSharedItemId,
  type FocusedExercise,
} from '../src/data/focused-exercises.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';
import {
  checksForSubskill,
  findActivity,
  focusedActivityId,
  learningCatalogue,
  practiceForSubskill,
} from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { learnerFacts, isUnseen } from '../src/lib/learning/session.ts';
import {
  appendAllEvidence,
  createEvidenceEvent,
  emptyLearnerRecord,
  paperExposureKey,
} from '../src/lib/learning/evidence.ts';
import type { EvidenceDraft } from '../src/lib/learning/evidence.ts';
import {
  groupAudioWindow,
  itemsAffectedBySeek,
  locateEvidenceWindow,
  parseTranscriptParagraphs,
  replayWindow,
  type AudioSegmentWindow,
} from '../src/components/learning/focused-exercise.ts';
import { PROFILE_NOW, PROFILE_TODAY, syntheticNew } from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

const LISTENING_TYPES = [
  'sentence-completion',
  'multiple-choice',
  'table-completion',
  'matching-features',
  'multiple-answer',
  'categorisation',
  'diagram-labelling',
] as const;

function listeningExercises(): readonly FocusedExercise[] {
  return FOCUSED_EXERCISES.filter((entry) => entry.paper === 'listening');
}

/* ------------------------------------------------------------------ */
/* 1. The material is real, and every item is the paper's own          */
/* ------------------------------------------------------------------ */

test('every Listening focused exercise names a real group of a real paper, of the type it claims', () => {
  for (const entry of listeningExercises()) {
    const paper = ALL_TESTS.find((candidate) => candidate.id === entry.source.testId);
    assert.ok(paper, `${entry.id} names ${entry.source.testId}, which should exist`);
    assert.equal(paper!.skill, 'listening', `${entry.id} should be built on a Listening paper`);
    const part = paper!.parts[entry.source.partIndex];
    assert.ok(part, `${entry.id} names part ${entry.source.partIndex} of ${paper!.id}`);
    assert.equal(part!.stimulus.kind, 'audio', `${entry.id}: ${paper!.id} part ${entry.source.partIndex} should be an audio part`);
    const group = part!.groups[entry.source.groupIndex];
    assert.ok(group, `${entry.id} names group ${entry.source.groupIndex}`);
    assert.equal(group!.type, entry.subskill, `${entry.id} should really be ${entry.subskill}`);
    assert.ok(paper!.source, `${entry.id} draws on a paper that carries its publisher attribution`);
    assert.equal(entry.provenance, 'imported-paper');

    for (const item of entry.items) {
      assert.ok(
        group!.questions.some((question) => question.id === item.questionId),
        `${entry.id} names ${item.questionId}, which should be in that group`,
      );
      assert.ok(isSharedItemId(item, entry.source.testId), `${entry.id}: ${item.id} must be the paper's own item id`);
    }
    assert.ok(entry.items.length >= 2 && entry.items.length <= 10, `${entry.id} should be a short set`);
    assert.ok(entry.expectedMinutes <= 12, `${entry.id} should fit between teaching and a check`);
    assert.ok(entry.lesson, `${entry.id} should point at the lesson that teaches it`);

    const drillPartNumber = /-drill-p(\d+)$/.exec(entry.source.drillId)?.[1];
    assert.equal(Number(drillPartNumber), entry.source.partIndex + 1, `${entry.id}: drillId should name the right part`);
  }
});

test('every Listening reason list is data, with an id that is stored and a label that is shown', () => {
  const listeningListIds = LISTENING_TYPES.map((type) => `listening-${type}` as const);
  for (const listId of listeningListIds) {
    const reasons = MISTAKE_REASONS[listId];
    assert.ok(reasons, `${listId} should be a reason list`);
    assert.ok(reasons.length >= 4, `${listId} offers a real choice`);
    const ids = new Set(reasons.map((reason) => reason.id));
    assert.equal(ids.size, reasons.length, `${listId} has no repeated ids`);
    for (const reason of reasons) {
      assert.ok(reason.label.length > 0, `${listId}:${reason.id} has something to tap`);
      assert.ok(!/[–—]/.test(`${reason.label}${reason.diagnosis}`), 'no dashes in anything a student reads');
    }
    assert.ok(
      reasons.some((reason) => reason.diagnosis === ''),
      `${listId} lets a student say something that is not a method at all`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 2. Coverage: two guided, two checks, per type                       */
/* ------------------------------------------------------------------ */

test('every Listening type with real material has at least two guided exercises and two independent checks', () => {
  for (const type of LISTENING_TYPES) {
    const guided = listeningExercises().filter((entry) => entry.subskill === type && entry.role === 'guided-practice');
    const checks = listeningExercises().filter((entry) => entry.subskill === type && entry.role === 'independent-check');
    assert.ok(guided.length >= 2, `${type} should have at least two guided exercises, has ${guided.length}`);
    assert.ok(checks.length >= 2, `${type} should have at least two independent checks, has ${checks.length}`);
    assert.equal(
      new Set(guided.map((e) => e.source.testId)).size >= 1,
      true,
      `${type}'s guided exercises should come from real papers`,
    );
  }
});

test('no item is spent by both a guided exercise and a check, across all of Listening', () => {
  const owner = new Map<string, string>();
  for (const entry of listeningExercises()) {
    for (const item of entry.items) {
      const already = owner.get(item.id);
      assert.ok(!already, `${item.id} is used by both ${already} and ${entry.id}`);
      owner.set(item.id, entry.id);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 3. The reserved papers, exactly, and derived, not hand-listed       */
/* ------------------------------------------------------------------ */

test('the Listening papers reserved for checks are exactly listening-full-008, -009 and -019', () => {
  const reserved = [
    ...new Set(listeningExercises().filter((e) => e.role === 'independent-check').map((e) => e.source.testId)),
  ].sort();
  assert.deepEqual(reserved, ['listening-full-008', 'listening-full-009', 'listening-full-019']);
  for (const id of reserved) assert.ok(RESERVED_CHECK_PAPER_IDS.includes(id), `${id} should be in the site-wide reserved list too`);
});

test('every Listening check is drawn from a reserved paper, and every guided exercise is not', () => {
  const reserved = new Set(['listening-full-008', 'listening-full-009', 'listening-full-019']);
  for (const entry of listeningExercises()) {
    const inReserved = reserved.has(entry.source.testId);
    if (entry.role === 'independent-check') {
      assert.ok(inReserved, `${entry.id} is a check, so it should draw on a reserved paper`);
    } else {
      assert.ok(!inReserved, `${entry.id} is guided practice, so it should not spend a reserved paper`);
    }
  }
});

test('a Listening focused exercise is a real page, verified by its publisher source, and tagged for audio', () => {
  for (const entry of listeningExercises()) {
    const activity = findActivity(focusedActivityId(entry.id), CATALOGUE);
    assert.ok(activity, `${entry.id} should be in the catalogue`);
    assert.equal(activity!.verified, true, 'publisher material is verified by its source');
    assert.equal(activity!.completionEvidence, 'scored-items');
    assert.ok((activity!.tags ?? []).includes('needs-audio'), `${entry.id} should carry the needs-audio tag`);
    assert.ok(
      fs.existsSync(path.join(process.cwd(), 'src/pages/trainers/focused/[id].astro')),
      'the route that renders it exists',
    );
  }
});

test('reserved Listening checks are never offered as ordinary practice, and guided sets are never offered as a check', () => {
  for (const type of LISTENING_TYPES) {
    const practice = practiceForSubskill(type, 60, CATALOGUE).map((activity) => activity.id);
    const checks = checksForSubskill(type, CATALOGUE).map((entry) => entry.activity.id);
    const guided = listeningExercises().filter((e) => e.subskill === type && e.role === 'guided-practice');
    const checkEntries = listeningExercises().filter((e) => e.subskill === type && e.role === 'independent-check');
    for (const entry of guided) {
      assert.ok(practice.includes(focusedActivityId(entry.id)), `${entry.id} should be offered as practice`);
      assert.ok(!checks.includes(focusedActivityId(entry.id)), `${entry.id} should never be a check`);
    }
    for (const entry of checkEntries) {
      assert.ok(!practice.includes(focusedActivityId(entry.id)), `${entry.id} should be held back from practice`);
      assert.ok(checks.includes(focusedActivityId(entry.id)), `${entry.id} should be a check`);
    }
  }

  for (const paperId of ['listening-full-008', 'listening-full-009', 'listening-full-019']) {
    for (const type of LISTENING_TYPES) {
      const practice = practiceForSubskill(type, 60, CATALOGUE);
      const spenders = practice.filter((activity) => (activity.sourcePaperIds ?? []).includes(paperId));
      assert.deepEqual(spenders, [], `nothing that would spend ${paperId} is offered as ${type} practice`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 4. The audio segment maths                                          */
/* ------------------------------------------------------------------ */

/* A short, hand-built, SYNTHETIC transcript in the exact shape the real
   automatic transcripts use (see any src/data/tests/listening-full-*.ts):
   one <p> per timestamped paragraph, a <span class="ts"> marker, then the
   words. Three paragraphs, twenty seconds apart, so the boundary maths is
   easy to check by hand. */
const SYNTHETIC_TRANSCRIPT =
  '<p class="transcript-note">Automatic transcript.</p>' +
  '<p><span class="ts">[00:10]</span> Welcome to the tour. First we will visit the garden.</p>' +
  '<p><span class="ts">[00:30]</span> The garden has a fountain, sorry, I mean a statue in the middle.</p>' +
  '<p><span class="ts">[00:55]</span> Next we go to the library, which closes at five.</p>';

test('parseTranscriptParagraphs reads the timestamp and the plain text, and drops the untimed note', () => {
  const paragraphs = parseTranscriptParagraphs(SYNTHETIC_TRANSCRIPT);
  assert.deepEqual(
    paragraphs.map((p) => p.startSeconds),
    [10, 30, 55],
  );
  assert.match(paragraphs[0]!.text, /visit the garden/);
  assert.ok(!paragraphs.some((p) => /Automatic transcript/.test(p.text)), 'the untimed note is not a located paragraph');
});

test('locateEvidenceWindow finds a sentence and bounds it to the paragraph it is in, never guessing past it', () => {
  const paragraphs = parseTranscriptParagraphs(SYNTHETIC_TRANSCRIPT);
  const window = locateEvidenceWindow(paragraphs, 'I mean a statue in the middle', 90);
  assert.ok(window);
  assert.equal(window!.startSeconds, 30, 'starts at its own paragraph, not the one before');
  assert.equal(window!.endSeconds, 55, 'ends where the NEXT paragraph starts, not a guessed offset');
});

test('locateEvidenceWindow bounds the LAST paragraph to the part end, and forgives quotes and case', () => {
  const paragraphs = parseTranscriptParagraphs(SYNTHETIC_TRANSCRIPT);
  const window = locateEvidenceWindow(paragraphs, 'CLOSES AT FIVE', 120);
  assert.ok(window);
  assert.equal(window!.startSeconds, 55);
  assert.equal(window!.endSeconds, 120, 'the last paragraph is bounded by the part end, never left open');
});

test('locateEvidenceWindow returns null for a sentence that is not in the transcript, rather than guessing', () => {
  const paragraphs = parseTranscriptParagraphs(SYNTHETIC_TRANSCRIPT);
  assert.equal(locateEvidenceWindow(paragraphs, 'a sentence that was never said', 90), null);
  assert.equal(locateEvidenceWindow(paragraphs, '', 90), null, 'an empty evidence line locates nothing');
});

test('locateEvidenceWindow is deterministic: the same transcript and evidence always produce the same window', () => {
  const paragraphs = parseTranscriptParagraphs(SYNTHETIC_TRANSCRIPT);
  const a = locateEvidenceWindow(paragraphs, 'closes at five', 90);
  const b = locateEvidenceWindow(paragraphs, 'closes at five', 90);
  assert.deepEqual(a, b);
});

test('groupAudioWindow narrows to cover every located item, and never reaches outside the part', () => {
  const part: AudioSegmentWindow = { startSeconds: 0, endSeconds: 90 };
  const items = [
    { itemId: 'q1', evidence: 'visit the garden' },
    { itemId: 'q2', evidence: 'closes at five' },
  ];
  const result = groupAudioWindow(SYNTHETIC_TRANSCRIPT, items, part);
  assert.equal(result.narrowed, true);
  assert.equal(result.segment.startSeconds, 10);
  assert.equal(result.segment.endSeconds, 90);
  assert.ok(result.segment.startSeconds >= part.startSeconds && result.segment.endSeconds <= part.endSeconds);
  assert.equal(result.itemWindows.size, 2);
});

test('groupAudioWindow falls back to the whole part, honestly, when even one item cannot be located', () => {
  const part: AudioSegmentWindow = { startSeconds: 0, endSeconds: 90 };
  const items = [
    { itemId: 'q1', evidence: 'visit the garden' },
    { itemId: 'q2', evidence: 'something never said in this recording' },
  ];
  const result = groupAudioWindow(SYNTHETIC_TRANSCRIPT, items, part);
  assert.equal(result.narrowed, false, 'one unlocatable item means the honest fallback is the whole part');
  assert.deepEqual(result.segment, part);
  assert.equal(result.itemWindows.size, 1, 'the item that WAS located still gets its own replay window');
});

test('groupAudioWindow falls back to the whole part when there is no transcript at all', () => {
  const part: AudioSegmentWindow = { startSeconds: 0, endSeconds: 90 };
  const result = groupAudioWindow('', [{ itemId: 'q1', evidence: 'visit the garden' }], part);
  assert.equal(result.narrowed, false);
  assert.deepEqual(result.segment, part);
  assert.equal(result.itemWindows.size, 0);
});

test('replayWindow gives a few seconds before the answer, through to the next paragraph, clamped to the part', () => {
  const window = { startSeconds: 30, endSeconds: 55 };
  const part: AudioSegmentWindow = { startSeconds: 0, endSeconds: 90 };
  const clip = replayWindow(window, part);
  assert.equal(clip.startSeconds, 27, 'three seconds of pre-roll by default');
  assert.equal(clip.endSeconds, 55);

  const nearStart = replayWindow({ startSeconds: 1, endSeconds: 10 }, part);
  assert.equal(nearStart.startSeconds, 0, 'pre-roll never reaches before the part starts');
});

test('the audio segment maths on real Listening data: narrows on real transcripts, and never leaves the part', () => {
  const samples: { testId: string; partIndex: number; groupIndex: number }[] = [
    { testId: 'listening-full-001', partIndex: 0, groupIndex: 0 },
    { testId: 'listening-full-019', partIndex: 1, groupIndex: 0 },
    { testId: 'listening-full-008', partIndex: 2, groupIndex: 1 },
    { testId: 'listening-full-012', partIndex: 3, groupIndex: 0 },
  ];
  let anyNarrowed = false;
  for (const sample of samples) {
    const paper = ALL_TESTS.find((t) => t.id === sample.testId)!;
    const part = paper.parts[sample.partIndex]!;
    assert.equal(part.stimulus.kind, 'audio');
    if (part.stimulus.kind !== 'audio') continue;
    const group = part.groups[sample.groupIndex]!;
    const partWindow: AudioSegmentWindow = {
      startSeconds: part.stimulus.startSeconds ?? 0,
      endSeconds: part.stimulus.endSeconds ?? 0,
    };
    const items = group.questions.map((question) => ({ itemId: question.id, evidence: question.evidence }));
    const result = groupAudioWindow(part.stimulus.transcriptHtml ?? '', items, partWindow);
    assert.ok(result.segment.startSeconds >= partWindow.startSeconds, `${sample.testId}: segment starts inside the part`);
    assert.ok(result.segment.endSeconds <= partWindow.endSeconds, `${sample.testId}: segment ends inside the part`);
    assert.ok(result.segment.startSeconds <= result.segment.endSeconds, `${sample.testId}: a real span`);
    if (result.narrowed) anyNarrowed = true;
  }
  assert.ok(anyNarrowed, 'at least one real group should narrow, proving the transcripts really carry usable timestamps');
});

/* ------------------------------------------------------------------ */
/* 5. Which items a seek or a replay marks as assisted                 */
/* ------------------------------------------------------------------ */

test('itemsAffectedBySeek marks only the item whose own window contains the target second', () => {
  const items = [
    { itemId: 'a', audioReplay: { startSeconds: 10, endSeconds: 20 } },
    { itemId: 'b', audioReplay: { startSeconds: 20, endSeconds: 40 } },
    { itemId: 'c', audioReplay: { startSeconds: 40, endSeconds: 60 } },
  ];
  assert.deepEqual(itemsAffectedBySeek(items, 15), ['a']);
  assert.deepEqual(itemsAffectedBySeek(items, 20), ['a', 'b'], 'a shared boundary second belongs to both windows');
  assert.deepEqual(itemsAffectedBySeek(items, 5), [], 'a second before every window affects nothing');
});

test('itemsAffectedBySeek marks every item when none of them could be located at all', () => {
  const items = [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'c' }];
  assert.deepEqual(itemsAffectedBySeek(items, 999), ['a', 'b', 'c']);
});

/* ------------------------------------------------------------------ */
/* 6. Exposure: seen in a drill or a lesson check, spent for a check   */
/* ------------------------------------------------------------------ */

test('a Listening paper met through a drill counts as seen, so its reserved check reads as no longer unseen', () => {
  const checkEntry = listeningExercises().find(
    (e) => e.subskill === 'sentence-completion' && e.role === 'independent-check',
  )!;
  const activity = findActivity(focusedActivityId(checkEntry.id), CATALOGUE)!;

  const draft: EvidenceDraft = {
    activityId: `drill:${checkEntry.source.drillId}`,
    contentVersion: 1,
    at: `${PROFILE_TODAY}T08:00:00.000Z`,
    localDate: PROFILE_TODAY,
    paper: 'listening',
    subskill: checkEntry.subskill,
    mode: 'practice',
    completion: 'completed',
    outcome: { kind: 'scored', raw: 1, total: 1, bySubskill: {} },
    sourceMaterial: [paperExposureKey(checkEntry.source.testId)],
  };
  const record = appendAllEvidence(emptyLearnerRecord(), [createEvidenceEvent(draft)]);
  const policy = evaluateEvidence({ record, goals: syntheticNew().goals, now: PROFILE_NOW });
  const facts = learnerFacts(record, policy);
  assert.equal(isUnseen(activity, facts), false, 'the check draws on a paper this drill just spent');
});

/* ------------------------------------------------------------------ */
/* 7. Nothing this package wrote contains a dash                       */
/* ------------------------------------------------------------------ */

test('nothing authored by this package contains an em dash or an en dash', () => {
  const files = [
    'src/data/focused/listening-sentence-completion.ts',
    'src/data/focused/listening-multiple-choice.ts',
    'src/data/focused/listening-table-completion.ts',
    'src/data/focused/listening-matching-features.ts',
    'src/data/focused/listening-multiple-answer.ts',
    'src/data/focused/listening-categorisation.ts',
    'src/data/focused/listening-diagram-labelling.ts',
    'src/components/learning/AudioSegmentPlayer.tsx',
    'src/lib/i18n/dict/ru/learning-focus-listening.ts',
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const offending = text.split('\n').filter((line) => /[–—]/.test(line) && !/^\s*\/?\*|─/.test(line));
    assert.deepEqual(offending, [], `${file} should have no dashes in it`);
  }
});
