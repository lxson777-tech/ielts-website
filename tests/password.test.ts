/* The password rules every form applies (src/lib/auth/password.ts): at least
 * 8 characters, at least one letter and at least one digit, plus a strength
 * hint that is only ever a hint.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/password.test.ts
 *
 * No real password appears here; every value is made up for the test. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { PASSWORD_MIN_LENGTH, checkPassword } from '../src/lib/auth/password.ts';

test('the minimum is eight characters', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 8);
  assert.deepEqual(checkPassword('abc1234').problems, ['tooShort'], 'seven characters');
  assert.equal(checkPassword('abcd1234').ok, true, 'eight characters');
});

test('an empty password breaks every rule, in a fixed order', () => {
  assert.deepEqual(checkPassword(''), { ok: false, problems: ['tooShort', 'noLetter', 'noDigit'], strength: 'weak' });
});

test('letters only, or digits only, is refused', () => {
  assert.deepEqual(checkPassword('abcdefghij').problems, ['noDigit']);
  assert.deepEqual(checkPassword('1234567890').problems, ['noLetter']);
  assert.deepEqual(checkPassword('!!!!!!!!!!').problems, ['noLetter', 'noDigit']);
});

test('a letter from any alphabet counts, so a Russian password is fine', () => {
  assert.equal(checkPassword('пароль2026').ok, true);
  assert.equal(checkPassword('Қазақ2026x').ok, true);
});

test('length is counted in characters, not in code units', () => {
  // Seven characters, one of which is an emoji made of two UTF-16 units.
  assert.deepEqual(checkPassword('ab12cd😀').problems, ['tooShort']);
});

test('any failed rule means weak, whatever else the password has', () => {
  assert.equal(checkPassword('Ab1!').strength, 'weak');
  assert.equal(checkPassword('ABCDEFGHIJKLMNOPQRSTUV!').strength, 'weak', 'no digit');
});

test('past the rules: fair, then strong with length or variety', () => {
  assert.equal(checkPassword('abcd1234').strength, 'fair', 'the bare minimum');
  assert.equal(checkPassword('Abcd1234').strength, 'fair', 'a capital alone at 8 characters');
  assert.equal(checkPassword('Abcd1234!x').strength, 'strong', '10 characters with a capital and a symbol');
  assert.equal(checkPassword('Abcdef123456').strength, 'strong', '12 characters with a capital');
  assert.equal(checkPassword('abcdef123456').strength, 'fair', '12 characters, one case, no symbol');
  assert.equal(checkPassword('correct horse 42 battery').strength, 'strong', 'a long passphrase');
});

test('a password that passes reports no problems', () => {
  const result = checkPassword('Synthetic-Pass-A1');
  assert.equal(result.ok, true);
  assert.deepEqual(result.problems, []);
});
