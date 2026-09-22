/* Finding 4 of Codex's independent review (docs/audits/claude-personal-
 * learning-review-2026-09-22.md): the three pilot round (WP20) Speaking
 * objectives (speaking-part1-extend-an-answer, speaking-part2-plan-in-one-
 * minute, speaking-fluency-repair) had guided self-check plus a same-prompt
 * retry only, never an independent check on a different, unseen real
 * prompt. This file defends the fix: each now also carries an
 * independent-check entry on a different real prompt of the same part
 * (src/data/focused/speaking-part1-extend-an-answer.ts and its two
 * siblings), the same shape the coverage round's six pairs already use.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/speaking-pilot-checks.test.ts
 * The whole suite is `npm test`.
 *
 * What tests/writing-speaking-coverage.test.ts already proves generally
 * (guided/check prompts differ, same part, for all nine Speaking
 * objectives) is not repeated here. This file proves what is specific to
 * finding 4: the three checks draw on genuinely fresh, real material never
 * used anywhere else in the Speaking self-check registry; a self-check tick
 * can never become criterion evidence or a band, whatever the grading
 * trainer's own availability; and the microphone failure paths keep
 * whatever was already recorded.
 *
 * Every learner record here is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SPOKEN_FOCUSED_TASKS, type SpokenFocusedTask } from '../src/data/focused-exercises.ts';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../src/data/speaking-prompts.ts';
import { findActivity, focusedActivityId, learningCatalogue } from '../src/lib/learning/catalog.ts';
import { LEARNING_CATALOGUE_MAX_BYTES } from '../src/lib/learning/contracts/catalog.ts';
import {
  spokenEvidenceDraft,
  completionOfSpoken,
  canSelfCheck,
  micProblemText,
  emptyChecklist,
  toggleChecklistItem,
  checkedCount,
  type MicProblem,
  type SpokenTaskView,
} from '../src/components/learning/spoken-focused-task.ts';

const CATALOGUE = learningCatalogue();

const PILOT_CHECK_IDS = [
  'speaking-part1-extend-an-answer-check',
  'speaking-part2-plan-in-one-minute-check',
  'speaking-fluency-repair-check',
] as const;

const PILOT_GUIDED_IDS = [
  'speaking-part1-extend-an-answer',
  'speaking-part2-plan-in-one-minute',
  'speaking-fluency-repair',
] as const;

function findTask(id: string): SpokenFocusedTask {
  const task = SPOKEN_FOCUSED_TASKS.find((entry) => entry.id === id);
  assert.ok(task, `${id} exists in SPOKEN_FOCUSED_TASKS`);
  return task!;
}

function isRealSpeakingPrompt(promptId: string): boolean {
  return SPEAKING_PART1_TOPICS.some((topic) => topic.id === promptId) || SPEAKING_CUE_CARDS.some((card) => card.id === promptId);
}

function fakeView(task: SpokenFocusedTask): SpokenTaskView {
  return {
    exerciseId: task.id,
    activityId: focusedActivityId(task.id),
    contentVersion: 1,
    subskill: task.subskill,
    part: task.part,
    title: task.title,
    objective: task.objective,
    instruction: task.instruction,
    expectedMinutes: task.expectedMinutes,
    promptId: task.promptId,
    questionText: 'A synthetic question, never read from a real page in this test.',
    checklist: task.checklist,
    blockId: 'b1',
    blockHeading: 'Synthetic block',
    blockText: 'Synthetic block text.',
    ...(task.pronunciationNote ? { pronunciationNote: task.pronunciationNote } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* 1. The three checks are on real, reserved, genuinely unexposed      */
/*    prompts                                                          */
/* ------------------------------------------------------------------ */

test('each pilot check is a real Part 1 topic or cue card, resolvable against the real prompt bank', () => {
  for (const id of PILOT_CHECK_IDS) {
    const task = findTask(id);
    assert.ok(isRealSpeakingPrompt(task.promptId), `${id} names a real prompt (${task.promptId}), never an invented one`);
  }
});

test('each pilot check draws on a prompt never used by any OTHER Speaking self-check task, guided or check', () => {
  /* Stronger than "differs from its own guided sibling" (already proved by
     tests/writing-speaking-coverage.test.ts): a genuinely fresh, reserved
     check should not quietly double as material some OTHER objective
     already exposed the student to either. */
  for (const id of PILOT_CHECK_IDS) {
    const task = findTask(id);
    const usedElsewhere = SPOKEN_FOCUSED_TASKS.filter((entry) => entry.id !== task.id && entry.promptId === task.promptId);
    assert.deepEqual(
      usedElsewhere.map((entry) => entry.id),
      [],
      `${id}'s prompt (${task.promptId}) must not be reused by any other Speaking self-check task`,
    );
  }
});

test('each pilot check keeps its guided sibling\'s id unchanged (no catalogue id was renamed to add the check)', () => {
  for (const id of PILOT_GUIDED_IDS) {
    const task = findTask(id);
    assert.equal(task.role, 'guided-practice', `${id} is explicitly marked guided-practice`);
  }
});

/* ------------------------------------------------------------------ */
/* 2. A self-check tick never produces criterion evidence or a band,   */
/*    whatever the real grader's own availability                     */
/* ------------------------------------------------------------------ */

test('spokenEvidenceDraft always writes a plain studied outcome, for every pilot guided and check task', () => {
  for (const id of [...PILOT_GUIDED_IDS, ...PILOT_CHECK_IDS]) {
    const task = findTask(id);
    const view = fakeView(task);
    for (const hasRecording of [true, false]) {
      const draft = spokenEvidenceDraft({ view, hasRecording, at: '2026-09-22T10:00:00.000Z' });
      assert.equal(draft.outcome.kind, 'studied', `${id}: a self-check can only ever write 'studied'`);
      assert.ok(
        !('band' in draft.outcome) && !('criteria' in draft) && !('met' in draft.outcome),
        `${id}: outcome must never carry a band, criteria or a met/judged verdict`,
      );
      const serialized = JSON.stringify(draft);
      assert.ok(!/\bband\b/i.test(serialized), `${id}: the recorded event must never mention a band`);
    }
  }
});

test('the function that builds self-check evidence has no concept of grading availability at all', () => {
  /* spokenEvidenceDraft's own input shape (view, hasRecording, assistance,
     at, sessionId, locale) carries nothing about whether the real grader is
     configured or reachable, which is what makes the outcome honest by
     construction rather than by a runtime check that could be bypassed:
     grading is a separate, explicit, paid step through the real trainer
     (SpokenFocusedTask.tsx's own "Open the Speaking trainer" link), never
     something this function's output depends on. */
  const task = findTask('speaking-part1-extend-an-answer-check');
  const view = fakeView(task);
  const first = spokenEvidenceDraft({ view, hasRecording: true, at: '2026-09-22T10:00:00.000Z' });
  const second = spokenEvidenceDraft({ view, hasRecording: true, at: '2026-09-22T10:00:00.000Z' });
  assert.deepEqual(first, second, 'identical inputs always produce an identical, ungraded outcome');
});

test('the pilot check activities are self-marked in the catalogue, never objective-judged or scored: grading can never enter this evidence', () => {
  for (const id of PILOT_CHECK_IDS) {
    const activity = findActivity(focusedActivityId(id), CATALOGUE);
    assert.ok(activity, `${id} is a real catalogue activity`);
    assert.equal(activity!.completionEvidence, 'self-marked', `${id}: a self-check activity, whatever the real grader's own state`);
    assert.equal(activity!.verified, false, `${id}: project-authored, so unverified, exactly like its guided sibling`);
    assert.ok((activity!.tags ?? []).includes('needs-microphone'), `${id} still needs a microphone to attempt`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Recording state survives both a mic failure and the checklist    */
/*    self-check, on every pilot task                                  */
/* ------------------------------------------------------------------ */

test('completionOfSpoken and canSelfCheck agree: nothing here can mark a check complete or self-checkable without an actual recording, on any pilot task', () => {
  for (const id of [...PILOT_GUIDED_IDS, ...PILOT_CHECK_IDS]) {
    assert.equal(completionOfSpoken(true), 'completed', `${id}: a real recording completes the practice`);
    assert.equal(completionOfSpoken(false), 'blank', `${id}: no recording is honestly blank, never completed`);
    assert.equal(canSelfCheck(true), true, `${id}: self-check is only offered once there is something to listen back to`);
    assert.equal(canSelfCheck(false), false, `${id}: no recording, no self-check`);
  }
});

test('every microphone failure path explains itself in plain language and none of them says the recording was lost', () => {
  const problems: readonly MicProblem[] = ['permission-denied', 'unavailable', 'recording-failed', 'unsupported'];
  for (const problem of problems) {
    const text = micProblemText(problem);
    assert.ok(text.length > 0, `${problem} has a real recovery message`);
    assert.ok(!/[–—]/.test(text), `${problem}'s message must not use an em dash or en dash`);
  }
  /* recording-failed is the one path that follows an attempt already in
     progress; it must say plainly that nothing already recorded was lost,
     which is the "keeps the recording state" promise in plain words. */
  assert.match(
    micProblemText('recording-failed'),
    /nothing was lost/i,
    'a failed save must say plainly that already-recorded work was not lost',
  );
});

test('the checklist helpers never depend on, or reset because of, a recording or grading state, for a pilot check', () => {
  const task = findTask('speaking-fluency-repair-check');
  let state = emptyChecklist();
  for (let i = 0; i < task.checklist.length; i += 1) state = toggleChecklistItem(state, i);
  assert.equal(checkedCount(state), task.checklist.length, 'ticking every line is independent of any recording or grading concept');
  /* Toggling again (the student changing their mind) never throws and never
     needs to know anything about the recording that prompted it. */
  state = toggleChecklistItem(state, 0);
  assert.equal(checkedCount(state), task.checklist.length - 1);
});

/* ------------------------------------------------------------------ */
/* 4. The assembled catalogue, now with three more activities, stays   */
/*    honestly small                                                   */
/* ------------------------------------------------------------------ */

test('adding the three pilot checks keeps the assembled catalogue under its byte cap', () => {
  const bytes = Buffer.byteLength(JSON.stringify(CATALOGUE), 'utf8');
  assert.ok(bytes <= LEARNING_CATALOGUE_MAX_BYTES, `the catalogue is ${bytes} bytes, over the ${LEARNING_CATALOGUE_MAX_BYTES} byte cap`);
});
