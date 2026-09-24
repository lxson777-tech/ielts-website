/* The dashboard greeting: which sentence is chosen, with and without the
   student's first name, and that the Russian keeps the name as typed. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { greetingKey } from '../src/lib/dashboard-greeting.ts';
import { loadDictionary } from '../src/lib/i18n/dict/index.ts';
import { t } from '../src/lib/i18n/translate.ts';

test('without a name the greeting is exactly what it was before profiles', () => {
  assert.equal(greetingKey(null, null), 'Welcome back.');
  assert.equal(greetingKey(0, null), 'Good morning.');
  assert.equal(greetingKey(11, null), 'Good morning.');
  assert.equal(greetingKey(12, null), 'Good afternoon.');
  assert.equal(greetingKey(17, null), 'Good afternoon.');
  assert.equal(greetingKey(18, null), 'Good evening.');
  assert.equal(greetingKey(23, undefined), 'Good evening.');
});

test('with a name each moment has its own named sentence', () => {
  assert.equal(greetingKey(null, 'Aigerim'), 'Welcome back, {name}.');
  assert.equal(greetingKey(8, 'Aigerim'), 'Good morning, {name}.');
  assert.equal(greetingKey(14, 'Aigerim'), 'Good afternoon, {name}.');
  assert.equal(greetingKey(20, 'Aigerim'), 'Good evening, {name}.');
});

test('a blank name is no name', () => {
  assert.equal(greetingKey(8, ''), 'Good morning.');
  assert.equal(greetingKey(8, '   '), 'Good morning.');
});

test('the name is inserted as typed, in English and in Russian', async () => {
  assert.equal(t(greetingKey(8, 'Aigerim'), { name: 'Aigerim' }, undefined, 'en'), 'Good morning, Aigerim.');
  await loadDictionary('ru');
  assert.equal(t(greetingKey(8, 'Айгерим'), { name: 'Айгерим' }, undefined, 'ru'), 'Доброе утро, Айгерим.');
  assert.equal(t(greetingKey(14, 'Aigerim'), { name: 'Aigerim' }, undefined, 'ru'), 'Добрый день, Aigerim.');
  assert.equal(t(greetingKey(20, 'Aigerim'), { name: 'Aigerim' }, undefined, 'ru'), 'Добрый вечер, Aigerim.');
  assert.equal(t(greetingKey(null, 'Aigerim'), { name: 'Aigerim' }, undefined, 'ru'), 'С возвращением, Aigerim.');
  assert.equal(t(greetingKey(8, null), undefined, undefined, 'ru'), 'Доброе утро.');
});
