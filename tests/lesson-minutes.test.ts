/* The minutes on every lesson cover the whole page: teaching text plus every
 * exercise and practice question on it (Alex, 3 October 2026). The rule
 * lives in tools/estimate-lesson-minutes.mjs; this file pins the rule's
 * small pieces and fails when a registry number drifts from the estimate,
 * for example after a lesson gains a section or more practice questions.
 * Fix a failure by re-running the estimator with --write, then
 * `npm run learning:index`. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RULE,
  countWords,
  splitBody,
  speakingPractice,
  roundMinutes,
  estimateAllLessons,
  estimateLesson,
  setMinutesInSource,
} from '../tools/estimate-lesson-minutes.mjs';
import { buildCourse } from '../src/lib/course.ts';

test('the rule numbers are the ones written in the estimator header', () => {
  assert.equal(RULE.wordsPerMinute, 130);
  assert.equal(RULE.readingQuestionMinutes, 1.5);
  assert.equal(RULE.listeningQuestionMinutes, 0.5);
  assert.equal(RULE.bodyExerciseItemMinutes, 1);
  assert.equal(RULE.roundTo, 5);
  assert.equal(RULE.minimum, 10);
});

test('countWords counts what a student sees, not tags, comments or punctuation', () => {
  assert.equal(countWords('<p>The <strong>bridge</strong> was built in 1923.</p>'), 6);
  assert.equal(countWords('<!-- a note --><div class="x">One &amp; two</div>'), 2);
  assert.equal(countWords('<p>A / B = C</p>'), 3);
  assert.equal(countWords('<style>.a{color:red}</style><p>word</p>'), 1);
});

test('practice exercise blocks are timed per item, not read as teaching text', () => {
  const html = `<p>one two three four</p>
    <details><summary>Show Practice Exercise</summary><ol><li>alpha beta</li><li>gamma</li><li>delta</li></ol></details>
    <details><summary>Show Model Answer</summary><p>five six</p></details>`;
  const { teachingWords, exerciseItems } = splitBody(html);
  assert.equal(exerciseItems, 3);
  /* Four words, the three-word "Show Model Answer" button and the two-word
     answer: a model answer is read, an exercise is done. */
  assert.equal(teachingWords, 9);
});

test('a Speaking practice section is timed as talking out loud', () => {
  const html = `<div class="topic-practice"><ol><li>Q</li><li>Q</li></ol></div>
    <div class="section" id="practice">
      <div class="topic-practice"><h4>Work</h4><ol><li>a</li><li>b</li><li>c</li></ol></div>
      <div class="cue-card">Describe a trip.</div>
      <div class="passage-box"><strong>Question: Why?</strong></div>
    </div>`;
  const result = speakingPractice(html);
  assert.equal(result.part1Questions, 3, 'only questions inside the practice section count');
  assert.equal(result.cueCards, 1);
  assert.equal(result.part3Questions, 1);
  assert.equal(result.minutes, 3 * RULE.speakingPart1QuestionMinutes + RULE.speakingCueCardMinutes + RULE.speakingPart3QuestionMinutes);
});

test('rounding goes to the nearest five minutes and never below ten', () => {
  assert.equal(roundMinutes(3.3), 10);
  assert.equal(roundMinutes(12.4), 10);
  assert.equal(roundMinutes(12.5), 15);
  assert.equal(roundMinutes(34.8), 35);
  assert.equal(roundMinutes(45.1), 45);
});

test('every lesson in the course has an estimate, and its registry minutes match it', () => {
  const rows = estimateAllLessons();
  const courseKeys = buildCourse().flatMap((m) => m.lessons.map((l) => l.key)).sort();
  assert.deepEqual(rows.map((r) => r.key).sort(), courseKeys, 'the estimator covers exactly the course lessons');
  const drifted = rows.filter((r) => r.current !== r.minutes).map((r) => `${r.key}: registry ${r.current}, estimate ${r.minutes}`);
  assert.deepEqual(drifted, [], 'run tools/estimate-lesson-minutes.mjs --write, then npm run learning:index');
  for (const row of rows) {
    assert.ok(row.minutes >= RULE.minimum && row.minutes % RULE.roundTo === 0, `${row.key} shows ${row.minutes}`);
  }
});

test('the label covers the practice on the page, not only the teaching', () => {
  /* The two lessons the content review named: about 4,000 words with their
     practice set, once labelled 12 minutes. */
  for (const key of ['reading-tfng', 'reading-ynng']) {
    const row = estimateLesson(key, 'reading', key.slice('reading-'.length));
    assert.ok(row.practiceQuestions >= 10, `${key} has its real test questions`);
    assert.ok(row.parts.practice > row.parts.teaching, `${key}: practice is the larger share`);
    assert.ok(row.minutes >= 30, `${key} shows ${row.minutes} minutes`);
  }
  /* A Listening lesson counts its recording, played once. */
  const listening = estimateLesson('listening-part1', 'listening', 'part1');
  assert.ok(listening.recordingMinutes > 5, 'the Part 1 recording is several minutes long');
  assert.ok(listening.parts.practice >= listening.recordingMinutes, 'the recording is inside the practice time');
});

test('setMinutesInSource changes only the named entry', () => {
  const source = `[
  { slug: 'a', title: 'A', minutes: 10 },
  {
    slug: 'a-b',
    title: 'AB',
    minutes: 12,
  },
  { slug: 'c', minutes: 8 },
]`;
  const next = setMinutesInSource(source, 'a-b', 35);
  assert.ok(next.includes(`slug: 'a', title: 'A', minutes: 10`));
  assert.ok(next.includes('minutes: 35,'));
  assert.ok(next.includes(`slug: 'c', minutes: 8`));
  assert.throws(() => setMinutesInSource(source, 'missing', 10));
});
