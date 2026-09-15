/* Guards the size and shape of the 2026 speaking prompt pool
   (src/data/speaking-prompts.ts). See that file's header for sources. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../src/data/speaking-prompts.ts';

const EM_DASH = '—';
const EN_DASH = '–';

function collectStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

test('the pool has at least 35 Part 1 topics and 35 cue cards', () => {
  assert.ok(SPEAKING_PART1_TOPICS.length >= 35, `expected >= 35 Part 1 topics, got ${SPEAKING_PART1_TOPICS.length}`);
  assert.ok(SPEAKING_CUE_CARDS.length >= 35, `expected >= 35 cue cards, got ${SPEAKING_CUE_CARDS.length}`);
});

test('every Part 1 topic id is unique', () => {
  const ids = SPEAKING_PART1_TOPICS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('every cue card id is unique', () => {
  const ids = SPEAKING_CUE_CARDS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('no id is reused between the two pools', () => {
  const p1 = new Set(SPEAKING_PART1_TOPICS.map((t) => t.id));
  const overlap = SPEAKING_CUE_CARDS.filter((c) => p1.has(c.id));
  assert.deepEqual(overlap, []);
});

test('every Part 1 topic has 3 or more questions', () => {
  for (const topic of SPEAKING_PART1_TOPICS) {
    assert.ok(
      topic.questions.length >= 3,
      `${topic.id} (${topic.topic}) has only ${topic.questions.length} questions`,
    );
  }
});

test('every cue card has 3 or more bullets and 3 or more Part 3 questions', () => {
  for (const card of SPEAKING_CUE_CARDS) {
    assert.ok(card.bullets.length >= 3, `${card.id} has only ${card.bullets.length} bullets`);
    assert.ok(
      card.part3Questions.length >= 3,
      `${card.id} has only ${card.part3Questions.length} Part 3 questions`,
    );
  }
});

test('no em dash or en dash appears anywhere in the pool', () => {
  const strings: string[] = [];
  collectStrings(SPEAKING_PART1_TOPICS, strings);
  collectStrings(SPEAKING_CUE_CARDS, strings);
  const offenders = strings.filter((s) => s.includes(EM_DASH) || s.includes(EN_DASH));
  assert.deepEqual(offenders, []);
});
