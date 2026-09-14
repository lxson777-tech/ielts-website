import test from 'node:test';
import assert from 'node:assert/strict';
import { pickDefaultPair, pairLabel, testNumber } from '../src/lib/tests/mock.ts';
import { ALL_TESTS } from '../src/data/tests/index.ts';

test('pickDefaultPair defaults to test 1 of each skill with no attempts recorded (no window/localStorage here)', () => {
  const pair = pickDefaultPair(ALL_TESTS);
  assert.ok(pair);
  assert.equal(pair!.listening.id, 'listening-full-001');
  assert.equal(pair!.reading.id, 'reading-full-001');
});

test('pairLabel reads the trailing test number out of each id', () => {
  const listening4 = ALL_TESTS.find((t) => t.id === 'listening-full-004')!;
  const reading7 = ALL_TESTS.find((t) => t.id === 'reading-full-007')!;
  assert.equal(pairLabel(ALL_TESTS, { listening: listening4, reading: reading7 }), 'Listening Test 4, Reading Test 7');
});

test('testNumber falls back to list position for an id with no trailing digits', () => {
  const listening = ALL_TESTS.filter((t) => t.skill === 'listening');
  const fake = { ...listening[2]!, id: 'listening-no-digits' };
  const listWithFake = [...listening.slice(0, 2), fake, ...listening.slice(3)];
  assert.equal(testNumber(fake, listWithFake), 3);
});

test('every Reading and Listening test has a unique, correctly-ordered id so pairLabel numbers line up 1..N', () => {
  for (const skill of ['reading', 'listening'] as const) {
    const ids = ALL_TESTS.filter((t) => t.skill === skill)
      .map((t) => t.id)
      .sort();
    const numbers = ids.map((id) => parseInt(id.match(/(\d+)$/)![1]!, 10));
    assert.deepEqual(numbers, ids.map((_, i) => i + 1), `${skill} test numbers should run 1..${ids.length} with no gaps`);
  }
});
