/* Tests for the translated lesson bodies and for the checker that guards
   them.

   Run this file on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/lesson-bodies-ru.test.ts
   The whole suite is `npm test`, which globs tests/*.test.ts, so this file
   needed no registration anywhere.

   Two halves:

   1. Every file in src/content/lesson-bodies/ru/ is run through the real
      checker, one named sub-test per lesson, so a red suite names the
      lesson and prints the same sentences `node tools/lesson-ru.mjs check`
      would have printed. This is the check that matters as more batches
      land: it also goes red when somebody edits an ENGLISH lesson and
      leaves its translation behind, because the hash on line 1 stops
      matching.

   2. The checker itself, against small inline fixtures. A translator
      trusts these messages, so a rule that silently stopped working would
      be worse than no rule at all. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkSlug,
  englishSlugs,
  hashSource,
  russianSlugs,
  validateLessonBody,
} from '../tools/lesson-ru-lib.mjs';

/* ------------------------------------------------------------------ */
/* 1. The real translations                                            */
/* ------------------------------------------------------------------ */

test('every translated lesson body matches its English source', async (t) => {
  const slugs = russianSlugs();
  const english = new Set(englishSlugs());

  for (const slug of slugs) {
    await t.test(slug, () => {
      assert.ok(
        english.has(slug),
        `src/content/lesson-bodies/ru/${slug}.html has no English lesson of that name. ` +
          'The file name is the lesson slug and has to match exactly.',
      );
      const result = checkSlug(slug);
      assert.ok(
        result.ok,
        `${slug}:\n  - ${result.problems.join('\n  - ')}\n` +
          `Run: node tools/lesson-ru.mjs check ${slug}`,
      );
    });
  }

  await t.test('the folder is not empty', () => {
    assert.ok(
      slugs.length > 0,
      'src/content/lesson-bodies/ru/ has no files. The two pilots ' +
        '(reading-tfng, vocabulary-education) should always be there.',
    );
  });
});

/* ------------------------------------------------------------------ */
/* 2. The checker                                                      */
/* ------------------------------------------------------------------ */

/* One small lesson with every feature the rules care about: an id and a
   class to preserve, a load-bearing comment, a frozen passage box, and a
   vocabulary table with its three columns. */
const ENGLISH = `<div class="section" id="demo">
  <h2>What is it?</h2>
  <p>You read a statement and decide whether the passage confirms it.</p>
  <!-- lesson-cards -->
  <div class="passage-box"><strong>Passage extract</strong> The bridge was completed in 1923.</div>
  <table class="vocab-table">
    <thead><tr><th>Word / Phrase</th><th>Meaning</th><th>Example in Context</th></tr></thead>
    <tbody>
      <tr><td>curriculum</td><td>the subjects taught at a school</td><td>"The school curriculum should include life skills."</td></tr>
    </tbody>
  </table>
</div>`;

const HASH = hashSource(ENGLISH);

const RUSSIAN = `<!-- i18n-source-sha256: ${HASH} -->
<div class="section" id="demo">
  <h2>Что это такое?</h2>
  <p>Вы читаете утверждение и решаете, подтверждает ли его текст.</p>
  <!-- lesson-cards -->
  <div class="passage-box"><strong>Passage extract</strong> The bridge was completed in 1923.</div>
  <table class="vocab-table">
    <thead><tr><th>Слово или фраза</th><th>Значение</th><th>Пример в контексте</th></tr></thead>
    <tbody>
      <tr><td>curriculum</td><td>предметы, которые преподают в школе</td><td>"The school curriculum should include life skills."</td></tr>
    </tbody>
  </table>
</div>`;

function check(russian: string, english: string = ENGLISH) {
  return validateLessonBody({ slug: 'demo', english, russian });
}

/** Assert the check failed, and that at least one message says `needle`. */
function failsWith(result: ReturnType<typeof check>, needle: string) {
  assert.equal(
    result.ok,
    false,
    `expected a problem mentioning "${needle}", but the file passed.`,
  );
  assert.ok(
    result.problems.some((p) => p.includes(needle)),
    `no message mentioned "${needle}". Messages were:\n  - ${result.problems.join('\n  - ')}`,
  );
}

test('a correct translation passes', () => {
  const result = check(RUSSIAN);
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
  assert.equal(result.stale, false);
});

test('translated headings and prose are what the rules are FOR', () => {
  // Nothing in the passing fixture is accidental: the Russian really does
  // differ from the English everywhere it is allowed to.
  assert.ok(RUSSIAN.includes('Что это такое?'));
  assert.ok(RUSSIAN.includes('Значение'));
});

test('a changed id is caught, and the message names the attribute', () => {
  const result = check(RUSSIAN.replace('id="demo"', 'id="демо"'));
  failsWith(result, 'the "id" attribute must not change');
  failsWith(result, '"демо"');
});

test('a changed class is caught', () => {
  failsWith(
    check(RUSSIAN.replace('class="vocab-table"', 'class="vocab-tables"')),
    'the "class" attribute must not change',
  );
});

test('a dropped tag is caught, and the message names both sides', () => {
  const result = check(RUSSIAN.replace('<p>Вы читаете утверждение и решаете, подтверждает ли его текст.</p>\n  ', ''));
  failsWith(result, 'English has <p>');
  failsWith(result, 'of the sequence');
});

test('an extra tag is caught and the counts are reported', () => {
  const result = check(RUSSIAN.replace('</div>', '<p>Ещё одна мысль.</p></div>'));
  assert.equal(result.ok, false);
  assert.ok(
    result.problems.some((p) => p.includes('different numbers of tags') || p.includes('of the sequence')),
    `messages were:\n  - ${result.problems.join('\n  - ')}`,
  );
});

test('a dropped comment marker is caught', () => {
  failsWith(check(RUSSIAN.replace('<!-- lesson-cards -->', '')), 'of the sequence');
});

test('a reworded comment marker is caught', () => {
  failsWith(
    check(RUSSIAN.replace('<!-- lesson-cards -->', '<!-- карточки уроков -->')),
    'Comments are markers the code reads',
  );
});

test('a stale hash is caught and says what to do', () => {
  const result = check(RUSSIAN.replace(HASH, 'a'.repeat(64)));
  failsWith(result, 'stale translation');
  failsWith(result, HASH);
  assert.equal(result.stale, true);
});

test('a missing hash line is caught and the message shows the exact line to paste', () => {
  const result = check(RUSSIAN.split('\n').slice(1).join('\n'));
  failsWith(result, `<!-- i18n-source-sha256: ${HASH} -->`);
});

test('an em dash is caught, with the line number and the line', () => {
  const result = check(RUSSIAN.replace('Вы читаете', 'Вы читаете \u2014 внимательно \u2014'));
  failsWith(result, 'em dash');
  failsWith(result, 'line 4');
});

test('an en dash is caught', () => {
  failsWith(check(RUSSIAN.replace('1923', '1920\u20131923')), 'en dash');
});

test('a file with no Cyrillic is caught', () => {
  failsWith(
    check(`<!-- i18n-source-sha256: ${HASH} -->\n${ENGLISH}`),
    'no Cyrillic anywhere',
  );
});

test('a bare ampersand is caught', () => {
  failsWith(check(RUSSIAN.replace('Что это такое?', 'Что & как?')), 'a bare "&"');
});

test('a proper entity is not mistaken for a bare ampersand', () => {
  assert.ok(check(RUSSIAN.replace('Что это такое?', 'Что &amp; как? &#10003; &nbsp;')).ok);
});

test('a translated vocabulary headword is caught, and the message names the column', () => {
  const result = check(RUSSIAN.replace('<td>curriculum</td>', '<td>учебная программа</td>'));
  failsWith(result, 'column 1 ("Word / Phrase")');
  failsWith(result, 'Only the "Meaning" column is translated');
});

test('a translated vocabulary example sentence is caught', () => {
  const result = check(
    RUSSIAN.replace(
      '"The school curriculum should include life skills."',
      '"Школьная программа должна включать жизненные навыки."',
    ),
  );
  failsWith(result, 'column 3 ("Example in Context")');
});

test('translating the Meaning column is allowed, and the headers may be Russian', () => {
  assert.ok(check(RUSSIAN).ok);
});

test('a translated passage extract is caught and called exam material', () => {
  const result = check(RUSSIAN.replace('The bridge was completed in 1923.', 'Мост был построен в 1923 году.'));
  failsWith(result, '.passage-box');
  failsWith(result, 'must stay word for word in English');
});

test('re-indenting a frozen block is not an error', () => {
  const moved = RUSSIAN.replace(
    '<div class="passage-box"><strong>Passage extract</strong> The bridge was completed in 1923.</div>',
    '<div class="passage-box">\n    <strong>Passage extract</strong>\n    The bridge was completed in 1923.\n  </div>',
  );
  const result = check(moved);
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
});

test('a byte-order mark is caught', () => {
  failsWith(check(`﻿${RUSSIAN}`), 'byte-order mark');
});

test('CRLF line endings do not change the hash', () => {
  const result = check(RUSSIAN.replace(/\n/g, '\r\n'), ENGLISH.replace(/\n/g, '\r\n'));
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
});

test('text checks are skipped, and said to be skipped, when the structure is broken', () => {
  const result = check(
    RUSSIAN.replace('<td>curriculum</td>', '<td>учебная программа</td>').replace('<!-- lesson-cards -->', ''),
  );
  failsWith(result, 'were skipped');
  assert.ok(
    !result.problems.some((p) => p.includes('column 1')),
    'a column complaint computed from a mismatched structure would be misleading',
  );
});

test('a title attribute may be translated, an href may not', () => {
  const withLink = ENGLISH.replace(
    '<h2>What is it?</h2>',
    '<h2 title="About this task"><a href="../tests">What is it?</a></h2>',
  );
  const hash = hashSource(withLink);
  const ru = `<!-- i18n-source-sha256: ${hash} -->
${withLink
  .replace('title="About this task"', 'title="Об этом задании"')
  .replace('>What is it?</a>', '>Что это такое?</a>')
  .replace('<p>You read a statement and decide whether the passage confirms it.</p>', '<p>Вы читаете утверждение.</p>')}`;
  assert.ok(check(ru, withLink).ok, check(ru, withLink).problems.join('\n'));

  failsWith(check(ru.replace('href="../tests"', 'href="../testy"'), withLink), 'the "href" attribute must not change');
});
