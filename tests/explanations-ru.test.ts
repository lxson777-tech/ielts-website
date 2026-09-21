/* Tests for the translated answer explanations and for the checker that
   guards them.

   Run this file on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/explanations-ru.test.ts
   The whole suite is `npm test`, which globs tests/*.test.ts, so this file
   needed no registration anywhere.

   Three parts:

   1. Every file in src/data/tests/ru/ is run through the real checker,
      one named sub-test per test or practice set, so a red suite names
      the paper and prints the same sentences
      `node tools/explanations-ru.mjs check` would have printed. This is
      the check that matters as more batches land: it also goes red when
      somebody edits an ENGLISH explanation and leaves its translation
      behind, because the sha recorded against it stops matching.

   2. The checker itself, against small inline fixtures. A translator
      trusts these messages, so a rule that silently stopped working
      would be worse than no rule at all.

   3. The two ends of the delivery path agree: the keys the browser looks
      notes up by are the keys the tool writes, and the published shape is
      the shape the runtime reads. A mismatch there would be invisible
      (every note would simply stay English), which is exactly why it is
      asserted rather than trusted. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GROUP_KEY_PREFIX,
  allIds,
  checkId,
  collectEntries,
  collectPracticeEntries,
  hashEnglish,
  loadEntries,
  quotedSpans,
  toPublished,
  translatedIds,
  validateExplanations,
} from '../tools/explanations-ru-lib.mjs';

import {
  GROUP_KEY_PREFIX as RUNTIME_GROUP_PREFIX,
  baseTestId,
  explainWith,
  groupKey,
  practiceKey,
} from '../src/lib/i18n/test-explanations.ts';

/* ------------------------------------------------------------------ */
/* 1. The real translations                                            */
/* ------------------------------------------------------------------ */

test('every translated set of explanations matches its English source', async (t) => {
  const ids = translatedIds();
  const known = new Set(await allIds());

  for (const id of ids) {
    await t.test(id, async () => {
      assert.ok(
        known.has(id),
        `src/data/tests/ru/${id}.json names no test or practice set. The file name is the id ` +
          'and has to match exactly: a test file without ".ts" (reading-full-001), or a ' +
          'lesson-page exercise set (practice-reading-tfng).',
      );
      const result = await checkId(id);
      assert.ok(
        result.ok,
        `${id}:\n  - ${result.problems.join('\n  - ')}\n` +
          `Run: node tools/explanations-ru.mjs check ${id}`,
      );
    });
  }

  await t.test('the folder is not empty', () => {
    assert.ok(
      ids.length > 0,
      'src/data/tests/ru/ has no files. The two pilots (reading-full-001, ' +
        'listening-full-001) should always be there.',
    );
  });
});

test('the pilot tests are fully translated, not partly', async () => {
  for (const id of ['reading-full-001', 'listening-full-001']) {
    const result = await checkId(id);
    assert.equal(
      result.counts.missing,
      0,
      `${id} has ${result.counts.missing} explanation(s) with no Russian. The two pilots are ` +
        'the worked example the brief points translators at, so they stay complete.',
    );
    assert.ok(result.counts.total >= 40, `${id} should have at least 40 notes, found ${result.counts.total}.`);
  }
});

/* ------------------------------------------------------------------ */
/* 2. The checker                                                      */
/* ------------------------------------------------------------------ */

/* One small paper's worth of notes, with every feature the rules care
   about: quoted evidence in curly single quotes (how the reading tests
   write it) and in double ones (how the listening tests do), a verdict
   word in capitals, an answer named in the note, and one group note that
   is HTML. */
const ENGLISH_NOTES = [
  {
    key: 'q1',
    kind: 'explanation',
    english:
      'The second paragraph says the colonists ‘liked the look of its glossy leaves’, ' +
      'which is why the statement is TRUE.',
    answer: 'True',
    number: 1,
  },
  {
    key: 'q2',
    kind: 'explanation',
    english: 'At 02:42 the agent says Blue Bay is "only 300 metres" from the beach.',
    answer: '300',
    number: 2,
  },
  {
    key: 'q3',
    kind: 'explanation',
    english: 'The writer recommends biogas digesters as the cheaper option for the village.',
    answer: 'biogas digesters',
    number: 3,
  },
  {
    key: `${GROUP_KEY_PREFIX}q4`,
    kind: 'explanationHtml',
    english: '<p>Both <strong>B</strong> and <strong>E</strong> are named in the last minute.</p>',
    answer: 'B, E',
    number: 4,
  },
].map((entry) => ({ ...entry, sha: hashEnglish(entry.english), prompt: '', type: 'tfng', partLabel: 'Passage 1' }));

const GOOD = {
  q1: 'Во втором абзаце сказано, что колонисты ‘liked the look of its glossy leaves’, поэтому утверждение TRUE.',
  q2: 'На 02:42 агент говорит, что Blue Bay находится "only 300 metres" от пляжа.',
  q3: 'Автор советует biogas digesters как более дешёвый вариант для деревни.',
  [`${GROUP_KEY_PREFIX}q4`]: '<p>И <strong>B</strong>, и <strong>E</strong> названы в последнюю минуту.</p>',
};

/** Build a Russian file from a map of key to Russian text, putting the
    right sha against each one unless `shas` overrides it. */
function fileFor(russian: Record<string, string>, shas: Record<string, string> = {}) {
  const entries: Record<string, unknown> = {};
  for (const [key, ru] of Object.entries(russian)) {
    const entry = ENGLISH_NOTES.find((e) => e.key === key);
    entries[key] = { sha: shas[key] ?? entry?.sha ?? 'f'.repeat(16), ru };
  }
  return JSON.stringify({ id: 'demo-001', locale: 'ru', entries }, null, 2);
}

function check(raw: string) {
  return validateExplanations({ id: 'demo-001', entries: ENGLISH_NOTES, raw });
}

/** Assert the check failed, and that at least one message says `needle`. */
function failsWith(result: ReturnType<typeof check>, needle: string) {
  assert.equal(result.ok, false, `expected a problem mentioning "${needle}", but the file passed.`);
  assert.ok(
    result.problems.some((p) => p.includes(needle)),
    `no message mentioned "${needle}". Messages were:\n  - ${result.problems.join('\n  - ')}`,
  );
}

test('a correct translation passes, and is counted', () => {
  const result = check(fileFor(GOOD));
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
  assert.deepEqual(result.counts, { total: 4, translated: 4, stale: 0, unknown: 0, missing: 0 });
});

test('a partial file is fine, and says how much is left', () => {
  const result = check(fileFor({ q1: GOOD.q1 }));
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
  assert.equal(result.counts.translated, 1);
  assert.equal(result.counts.missing, 3);
});

test('translated prose is what the rules are FOR', () => {
  // Nothing in the passing fixture is accidental: the Russian really does
  // differ from the English everywhere it is allowed to.
  assert.ok(GOOD.q1.includes('Во втором абзаце'));
  assert.ok(GOOD.q3.includes('более дешёвый вариант'));
});

test('a mistyped question id is caught, because nothing at runtime would say so', () => {
  const result = check(fileFor({ q9: 'Это объяснение ни к чему не привязано.' }));
  failsWith(result, '"q9" is not a question of demo-001');
  assert.equal(result.counts.unknown, 1);
});

test('a stale entry is caught, names both shas, and says the student still sees it', () => {
  const result = check(fileFor({ q1: GOOD.q1 }, { q1: 'a'.repeat(16) }));
  failsWith(result, 'stale');
  failsWith(result, ENGLISH_NOTES[0]!.sha);
  assert.equal(result.counts.stale, 1);
  // Still counted as translated: it IS on screen.
  assert.equal(result.counts.translated, 1);
});

test('a stale entry is still checked for everything else', () => {
  const result = check(fileFor({ q1: 'Во втором абзаце \u2014 сказано \u2014 так. ‘liked the look of its glossy leaves’ TRUE' }, { q1: 'a'.repeat(16) }));
  failsWith(result, 'stale');
  failsWith(result, 'em dash');
});

test('a missing or malformed sha is caught and the right one is printed', () => {
  const raw = JSON.stringify({ id: 'demo-001', locale: 'ru', entries: { q1: { ru: GOOD.q1 } } });
  const result = check(raw);
  failsWith(result, ENGLISH_NOTES[0]!.sha);
});

test('an untranslated note (no Cyrillic) is caught', () => {
  failsWith(check(fileFor({ q1: ENGLISH_NOTES[0]!.english })), 'no Cyrillic');
});

test('an em dash is caught, and an en dash', () => {
  failsWith(check(fileFor({ q3: 'Автор советует biogas digesters \u2014 дешевле.' })), 'em dash');
  failsWith(check(fileFor({ q3: 'Автор советует biogas digesters, 1920\u20131930.' })), 'en dash');
});

test('dropping the English evidence the note quotes is caught', () => {
  const result = check(fileFor({ q1: 'Во втором абзаце сказано, что колонистам понравились блестящие листья, поэтому TRUE.' }));
  failsWith(result, 'liked the look of its glossy leaves');
  failsWith(result, 'stay in English');
});

test('evidence in double quotes is caught the same way', () => {
  failsWith(
    check(fileFor({ q2: 'На 02:42 агент говорит, что Blue Bay находится всего в 300 метрах от пляжа.' })),
    'only 300 metres',
  );
});

test('an apostrophe inside quoted evidence does not split the quotation', () => {
  const spans = quotedSpans('the plant, ‘the world’s worst aquatic weed’, spread fast');
  assert.deepEqual(spans, ['the world’s worst aquatic weed']);
});

test('a Russian phrase in quotation marks is not mistaken for English evidence', () => {
  assert.deepEqual(quotedSpans('в тексте сказано «иначе» и ‘по-другому’'), []);
});

test('translating TRUE / FALSE / NOT GIVEN is caught', () => {
  const result = check(fileFor({
    q1: 'Во втором абзаце сказано ‘liked the look of its glossy leaves’, поэтому утверждение ВЕРНО.',
  }));
  failsWith(result, 'the English note says TRUE');
});

test('translating the answer itself is caught', () => {
  const result = check(fileFor({ q3: 'Автор советует биогазовые установки как более дешёвый вариант.' }));
  failsWith(result, 'names the answer, "biogas digesters"');
});

test('a short answer is not demanded, so the rule never fires on a paragraph letter', () => {
  const entries = [
    {
      key: 'q1',
      kind: 'explanation',
      english: 'Paragraph B is the only one that mentions the cost of the scheme.',
      sha: hashEnglish('Paragraph B is the only one that mentions the cost of the scheme.'),
      answer: 'B',
      number: 1,
      prompt: '',
      type: 'paragraph-matching',
      partLabel: 'Passage 1',
    },
  ];
  const raw = JSON.stringify({
    id: 'demo-001',
    locale: 'ru',
    entries: { q1: { sha: entries[0]!.sha, ru: 'Только в этом абзаце говорится о стоимости проекта.' } },
  });
  const result = validateExplanations({ id: 'demo-001', entries, raw });
  assert.ok(result.ok, `expected no problems, got:\n  - ${result.problems.join('\n  - ')}`);
});

test('a group note that loses a tag is caught', () => {
  const key = `${GROUP_KEY_PREFIX}q4`;
  const result = check(fileFor({ [key]: '<p>И B, и E названы в последнюю минуту.</p>' }));
  failsWith(result, 'this note is HTML');
});

test('broken JSON is reported as broken JSON, with nothing else', () => {
  const result = check('{ "id": "demo-001", "locale": "ru", "entries": { "q1": { "ru": "текст", } } }');
  failsWith(result, 'not valid JSON');
  assert.equal(result.problems.length, 1);
});

test('a byte-order mark is caught, because JSON.parse refuses it', () => {
  failsWith(check(`\uFEFF${fileFor(GOOD)}`), 'byte-order mark');
});

test('the wrong id or locale in the file is caught', () => {
  failsWith(check(fileFor(GOOD).replace('"demo-001"', '"demo-002"')), '"id" must be "demo-001"');
  failsWith(check(fileFor(GOOD).replace('"locale": "ru"', '"locale": "en"')), '"locale" must be "ru"');
});

test('an empty Russian note is caught rather than published as a blank', () => {
  failsWith(check(fileFor({ q1: '   ' })), '"ru" must be a non-empty string');
});

test('a CRLF checkout hashes the same as an LF one', () => {
  assert.equal(hashEnglish('one\r\ntwo'), hashEnglish('one\ntwo'));
});

/* ------------------------------------------------------------------ */
/* 3. The two ends of the delivery path                                */
/* ------------------------------------------------------------------ */

test('the tool and the browser agree on how a group note is keyed', () => {
  assert.equal(RUNTIME_GROUP_PREFIX, GROUP_KEY_PREFIX);
  assert.equal(groupKey('q31'), `${GROUP_KEY_PREFIX}q31`);
});

test('the tool and the browser agree on how a practice question is keyed', async () => {
  const entries = await loadEntries('practice-reading-tfng');
  assert.ok(entries.length > 0, 'practice-reading-tfng should have explanations to translate');
  assert.equal(entries[0]!.key, practiceKey(0, 0));
  const keys = new Set(entries.map((e: { key: string }) => e.key));
  assert.ok(keys.has(practiceKey(0, 1)), 'the second question of the first unit should be u0-q1');
});

test('a retake asks for its parent paper, which is the file that exists', () => {
  assert.equal(baseTestId('reading-full-001-retake'), 'reading-full-001');
  assert.equal(baseTestId('reading-full-001'), 'reading-full-001');
});

test('the published file is what the runtime reads: key to Russian, nothing else', () => {
  const source = JSON.parse(fileFor(GOOD)) as {
    id: string;
    locale: string;
    entries: Record<string, { sha: string; ru: string }>;
  };
  const published = toPublished(source);
  assert.deepEqual(published, { id: 'demo-001', locale: 'ru', entries: GOOD });

  const explain = explainWith(published.entries);
  assert.equal(explain('q1', ENGLISH_NOTES[0]!.english), GOOD.q1);
  assert.equal(explain('q404', 'the English note'), 'the English note', 'an unknown key falls back');
  assert.equal(explain('q404', undefined), undefined, 'a question with no note keeps none');
});

test('an empty or missing note never replaces the English with a blank', () => {
  const explain = explainWith({ q1: '' });
  assert.equal(explain('q1', 'the English note'), 'the English note');
  assert.equal(explainWith(null)('q1', 'the English note'), 'the English note');
});

test('the template carries everything a translator needs, and no Russian', async () => {
  const entries = await loadEntries('reading-full-001');
  assert.equal(entries.length >= 40, true);
  for (const entry of entries.slice(0, 5)) {
    assert.ok(entry.english.length > 0);
    assert.match(entry.sha, /^[0-9a-f]{16}$/);
    assert.ok(entry.answer.length > 0, `question ${entry.key} should print its answer`);
  }
});

test('every question id in a test is unique, so no note can shadow another', async () => {
  for (const id of ['reading-full-001', 'listening-full-001']) {
    const entries = await loadEntries(id);
    const keys = entries.map((e: { key: string }) => e.key);
    assert.equal(new Set(keys).size, keys.length, `${id} has two notes claiming the same key`);
  }
});

test('collectEntries and collectPracticeEntries are the only two shapes, and both are complete', async () => {
  // Guards against an entry arriving with a field the template prints as
  // "undefined", which a translator would then have to guess at.
  const fromTest = collectEntries(await (await import('../src/data/tests/reading-full-001.ts')).default);
  const fromPractice = collectPracticeEntries(
    await (async () => {
      const lib = await import('../tools/explanations-ru-lib.mjs');
      return lib.loadPracticeSet('practice-reading-tfng');
    })(),
  );
  for (const entry of [fromTest[0]!, fromPractice[0]!]) {
    for (const field of ['key', 'kind', 'english', 'sha', 'number', 'prompt', 'answer', 'type', 'partLabel']) {
      assert.notEqual((entry as Record<string, unknown>)[field], undefined, `${field} is missing`);
    }
  }
});
