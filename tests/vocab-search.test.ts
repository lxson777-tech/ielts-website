/* The vocabulary lesson's search box (audit 2026-09-29, F11).
 *
 * The overview (/lessons/vocabulary) is a directory of topic cards with no
 * word table, yet it offered "Find a word in this lesson" and showed "No
 * matches" before anything was typed; typing "Ecology" or "экология" found
 * nothing. Now the box searches topic cards on the overview (in the shown
 * language and the English original), words on a word-table lesson, and is
 * hidden on a page with neither; "No matches" needs a real query first.
 * The browser run checks both kinds of page in English and Russian.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normaliseForSearch, showNoMatches, vocabSearchMatches, vocabSearchMode } from '../src/lib/vocab-search.ts';

test('a word table makes it a word search, topic cards alone a topic search, neither no search', () => {
  assert.equal(vocabSearchMode(24, 0), 'words');
  assert.equal(vocabSearchMode(24, 3), 'words');
  assert.equal(vocabSearchMode(0, 36), 'topics');
  assert.equal(vocabSearchMode(0, 0), 'none');
});

test('"No matches" never shows on an empty or blank box', () => {
  assert.equal(showNoMatches('', 0), false);
  assert.equal(showNoMatches('   ', 0), false);
  assert.equal(showNoMatches('zzz', 0), true);
  assert.equal(showNoMatches('eco', 2), false);
});

test('an empty query shows everything', () => {
  assert.equal(vocabSearchMatches('Environment & Ecology', ''), true);
});

test('a topic is found by its English and its Russian, whatever the case', () => {
  const card = 'Окружающая среда и экология 20 слов Environment & Ecology 20 words · collocations · exercise';
  assert.equal(vocabSearchMatches(card, 'Ecology'), true);
  assert.equal(vocabSearchMatches(card, 'ecology'), true);
  assert.equal(vocabSearchMatches(card, 'экология'), true);
  assert.equal(vocabSearchMatches(card, 'ЭКОЛОГИЯ'), true);
  assert.equal(vocabSearchMatches(card, 'transport'), false);
});

test('ё and е are the same letter, and runs of spaces collapse', () => {
  assert.equal(normaliseForSearch('  Её   ЖИЗНЬ '), 'ее жизнь');
  assert.equal(vocabSearchMatches('Учёба и образование', 'учеба'), true);
});

test('the component uses these rules and searches cards on the overview', () => {
  const component = readFileSync(join(import.meta.dirname, '..', 'src', 'components', 'LessonVocabularySearch.astro'), 'utf8');
  assert.match(component, /vocabSearchMode\(rows\.length, cards\.length\)/);
  assert.match(component, /\.lesson-body \.sample-card/);
  assert.match(component, /data-i18n-en/, 'a translated card is also found by its English');
  assert.match(component, /showNoMatches\(input\.value, count\)/);
  assert.match(component, /data-vocab-search-root hidden/, 'the box starts hidden until it knows what it searches');
});
