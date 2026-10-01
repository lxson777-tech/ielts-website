/* The one description of the trial (TRIAL_SUMMARY and TRIAL_SECTION_INCLUDES
 * in src/lib/trial/offer.ts, audit F03). Every surface reads these
 * sentences, so they must agree with the numbers the gate and the database
 * enforce, name Academic IELTS, never promise what the trial locks, and
 * have Russian. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TRIAL_FULL_ACCESS_LABEL,
  TRIAL_HOURS,
  TRIAL_OFFER,
  TRIAL_SECTIONS,
  TRIAL_SECTION_INCLUDES,
  TRIAL_SPEAKING_MINUTES,
  TRIAL_SPEAKING_MODE,
  TRIAL_SUMMARY,
  TRIAL_SUMMARY_ORDER,
  TRIAL_TESTS_PER_SECTION,
  TRIAL_TEST_MINUTES,
  TRIAL_TUTOR_PER_SECTION,
} from '../src/lib/trial/offer.ts';
import { strings as ru } from '../src/lib/i18n/dict/ru/index.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';

const index = JSON.parse(fs.readFileSync(new URL('../src/data/generated/learning-index.json', import.meta.url), 'utf8'));

const WORDS: Record<number, string> = { 1: 'one', 3: 'three', 5: 'five' };

function allSentences(): string[] {
  return [...Object.values(TRIAL_SUMMARY), ...Object.values(TRIAL_SECTION_INCLUDES), TRIAL_FULL_ACCESS_LABEL];
}

test('the summary is read in a fixed order and covers every key once', () => {
  assert.deepEqual([...TRIAL_SUMMARY_ORDER].sort(), Object.keys(TRIAL_SUMMARY).sort());
});

test('numbers written in words match the constants the gate and database enforce', () => {
  assert.equal(TRIAL_HOURS, 72);
  assert.match(TRIAL_SUMMARY.days, new RegExp(`^${WORDS[TRIAL_HOURS / 24]} days`, 'i'));
  assert.equal(TRIAL_TESTS_PER_SECTION, 1);
  assert.match(TRIAL_SUMMARY.tests, /^One full Reading test, one full Listening test, and one AI assessment/);
  assert.match(TRIAL_SUMMARY.tutor, new RegExp(`^${WORDS[TRIAL_TUTOR_PER_SECTION]} Mr EZ messages in each section`, 'i'));
  assert.equal(TRIAL_SPEAKING_MODE, 'part1');
  assert.ok(TRIAL_SUMMARY.tests.includes(`recorded Speaking (up to ${WORDS[TRIAL_SPEAKING_MINUTES]} minutes)`));
  assert.ok(TRIAL_SECTION_INCLUDES.speaking.includes('one trial AI assessment'));
  assert.ok(TRIAL_SUMMARY.tests.includes('choose a Writing Task 2 essay or'));
  assert.ok(TRIAL_SUMMARY.days.includes('no payment card'));
});

test('the course is named Academic IELTS before sign-up', () => {
  assert.match(TRIAL_SUMMARY.course, /^Academic IELTS/);
  // The trial page shows the whole summary to a signed-out visitor.
  const join = fs.readFileSync(new URL('../src/components/trial/TrialJoin.tsx', import.meta.url), 'utf8');
  assert.match(join, /TRIAL_SUMMARY_ORDER\.map/);
});

test('no sentence promises what the trial locks', () => {
  for (const sentence of allSentences()) {
    assert.doesNotMatch(sentence, /rotation|a different (one|prompt) every attempt|three-part mock|unlimited AI/i, sentence);
  }
  // Task 1 and the three-part interview are named only as full access.
  assert.match(TRIAL_SECTION_INCLUDES.writing, /More assessments come with paid access/);
  assert.match(TRIAL_SECTION_INCLUDES.speaking, /Live interviews come with paid access/);
});

test('test lengths match the papers and the essay the trial actually uses', () => {
  const tests = index.tests as { id: string; durationMinutes: number }[];
  for (const section of ['reading', 'listening'] as const) {
    const paper = tests.find((t) => t.id === TRIAL_OFFER[section].testId);
    assert.ok(paper, section);
    assert.equal(TRIAL_TEST_MINUTES[section], paper.durationMinutes, section);
  }
  const essay = WRITING_PROMPTS.find((p) => p.id === 'pte-wt-122-task2');
  assert.equal(TRIAL_TEST_MINUTES.writing, essay?.suggestedMinutes);
  assert.equal(TRIAL_TEST_MINUTES.speaking, TRIAL_SPEAKING_MINUTES);
  assert.deepEqual(Object.keys(TRIAL_TEST_MINUTES).sort(), [...TRIAL_SECTIONS].sort());
});

test('every sentence has Russian that keeps the paper names and the numbers', () => {
  for (const sentence of allSentences()) {
    const value = ru[sentence];
    assert.ok(value, `no Russian for "${sentence}"`);
    for (const name of ['Reading', 'Listening', 'Writing', 'Speaking', 'Mr EZ', 'Task 2', 'Part 1', 'Academic IELTS']) {
      if (sentence.includes(name)) assert.ok(value.includes(name), `"${name}" should stay English in: ${value}`);
    }
  }
});
