/* Tests for the translation layer, and the coverage check that guards every
   translation batch after this one.

   Run this file on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/i18n.test.ts

   The coverage test scans the source tree for translatable text and asserts
   the Russian dictionary has it. Its failure messages are the main tool the
   later batch agents have, so every assertion names the file and the key. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getLocale, isLocale, SUPPORTED_LOCALES, LOCALE_LABEL } from '../src/lib/i18n/locale.ts';
import {
  t,
  tn,
  nt,
  messageKey,
  interpolate,
  translateWith,
  pluralWith,
  CONTEXT_SEPARATOR,
} from '../src/lib/i18n/translate.ts';
import {
  loadDictionary,
  getLoadedDictionary,
  loadDictionaryPart,
  isDictionaryPartLoaded,
  availableDictionaryParts,
  type Dictionary,
} from '../src/lib/i18n/dict/index.ts';
import {
  DICTIONARY_PARTS,
  PART_SOURCES,
  partForSourceFile,
  type DictionaryPart,
} from '../src/lib/i18n/dict/parts.ts';
import { extractAll, placeholders } from './i18n-extract.ts';

import * as ruMerged from '../src/lib/i18n/dict/ru/index.ts';
import * as shell from '../src/lib/i18n/dict/ru/shell.ts';
import * as dashboardPlan from '../src/lib/i18n/dict/ru/dashboard-plan.ts';
import * as courseLessons from '../src/lib/i18n/dict/ru/course-lessons.ts';
import * as courseData from '../src/lib/i18n/dict/ru/course-data.ts';
import * as testsPlayer from '../src/lib/i18n/dict/ru/tests-player.ts';
import * as trainers from '../src/lib/i18n/dict/ru/trainers-writing-speaking.ts';
import * as accountAuthVocab from '../src/lib/i18n/dict/ru/account-auth-vocab.ts';
import * as tutor from '../src/lib/i18n/dict/ru/tutor.ts';
import * as pages from '../src/lib/i18n/dict/ru/pages.ts';
import * as trainersDrills from '../src/lib/i18n/dict/ru/trainers-drills.ts';
import * as learningIntake from '../src/lib/i18n/dict/ru/learning-intake.ts';
import * as learningToday from '../src/lib/i18n/dict/ru/learning-today.ts';
import * as learningAccount from '../src/lib/i18n/dict/ru/learning-account.ts';
import * as learningFocus from '../src/lib/i18n/dict/ru/learning-focus.ts';
import * as learningWritingFocus from '../src/lib/i18n/dict/ru/learning-writing-focus.ts';
import * as learningLibraries from '../src/lib/i18n/dict/ru/learning-libraries.ts';
import * as learningVocab from '../src/lib/i18n/dict/ru/learning-vocab.ts';
import * as learningFocusListening from '../src/lib/i18n/dict/ru/learning-focus-listening.ts';
import * as learningFocusReading from '../src/lib/i18n/dict/ru/learning-focus-reading.ts';
import * as learningObjectives from '../src/lib/i18n/dict/ru/learning-objectives.ts';
import * as trialBatch from '../src/lib/i18n/dict/ru/trial.ts';
import * as profile from '../src/lib/i18n/dict/ru/profile.ts';
import * as placementBatch from '../src/lib/i18n/dict/ru/placement.ts';
import * as cRemediation from '../src/lib/i18n/dict/ru/c-remediation.ts';
import * as a1RemediationBatch from '../src/lib/i18n/dict/ru/a1-remediation.ts';
import * as bRemediation from '../src/lib/i18n/dict/ru/b-remediation.ts';
import * as dRemediation from '../src/lib/i18n/dict/ru/d-remediation.ts';
import * as eRemediation from '../src/lib/i18n/dict/ru/e-remediation.ts';
import * as a2RemediationBatch from '../src/lib/i18n/dict/ru/a2-remediation.ts';
import * as a3Remediation from '../src/lib/i18n/dict/ru/a3-remediation.ts';
import * as r01Remediation from '../src/lib/i18n/dict/ru/r01-remediation.ts';
import * as accessModel from '../src/lib/i18n/dict/ru/access-model.ts';
import * as sOffer from '../src/lib/i18n/dict/ru/s-offer.ts';
import * as wFree from '../src/lib/i18n/dict/ru/w-free.ts';
import * as gFree from '../src/lib/i18n/dict/ru/g-free.ts';
import * as pFree from '../src/lib/i18n/dict/ru/p-free.ts';
import * as accountCategories from '../src/lib/i18n/dict/ru/account-categories.ts';
import * as lLegal from '../src/lib/i18n/dict/ru/l-legal.ts';
import * as cConsent from '../src/lib/i18n/dict/ru/c-consent.ts';
import * as practiceSets from '../src/lib/i18n/dict/ru/practice-sets.ts';

import * as partStrategies from '../src/lib/i18n/dict/ru/parts/strategies.ts';
import * as partStructures from '../src/lib/i18n/dict/ru/parts/structures.ts';
import * as partBandGuides from '../src/lib/i18n/dict/ru/parts/band-guides.ts';

/* Every batch file, with the name an agent would recognise. Add a line here
   when a new batch file is created. */
const BATCH_FILES: { file: string; mod: { strings: Record<string, string>; plurals: Record<string, unknown> } }[] = [
  { file: 'dict/ru/shell.ts', mod: shell },
  { file: 'dict/ru/dashboard-plan.ts', mod: dashboardPlan },
  { file: 'dict/ru/course-lessons.ts', mod: courseLessons },
  { file: 'dict/ru/course-data.ts', mod: courseData },
  { file: 'dict/ru/tests-player.ts', mod: testsPlayer },
  { file: 'dict/ru/trainers-writing-speaking.ts', mod: trainers },
  { file: 'dict/ru/account-auth-vocab.ts', mod: accountAuthVocab },
  { file: 'dict/ru/tutor.ts', mod: tutor },
  { file: 'dict/ru/pages.ts', mod: pages },
  { file: 'dict/ru/trainers-drills.ts', mod: trainersDrills },
  { file: 'dict/ru/learning-intake.ts', mod: learningIntake },
  { file: 'dict/ru/learning-today.ts', mod: learningToday },
  { file: 'dict/ru/learning-account.ts', mod: learningAccount },
  { file: 'dict/ru/learning-focus.ts', mod: learningFocus },
  { file: 'dict/ru/learning-writing-focus.ts', mod: learningWritingFocus },
  { file: 'dict/ru/learning-libraries.ts', mod: learningLibraries },
  { file: 'dict/ru/learning-vocab.ts', mod: learningVocab },
  { file: 'dict/ru/learning-focus-listening.ts', mod: learningFocusListening },
  { file: 'dict/ru/learning-focus-reading.ts', mod: learningFocusReading },
  { file: 'dict/ru/learning-objectives.ts', mod: learningObjectives },
  { file: 'dict/ru/trial.ts', mod: trialBatch },
  { file: 'dict/ru/profile.ts', mod: profile },
  { file: 'dict/ru/placement.ts', mod: placementBatch },
  { file: 'dict/ru/c-remediation.ts', mod: cRemediation },
  { file: 'dict/ru/a1-remediation.ts', mod: a1RemediationBatch },
  { file: 'dict/ru/b-remediation.ts', mod: bRemediation },
  { file: 'dict/ru/d-remediation.ts', mod: dRemediation },
  { file: 'dict/ru/e-remediation.ts', mod: eRemediation },
  { file: 'dict/ru/a2-remediation.ts', mod: a2RemediationBatch },
  { file: 'dict/ru/a3-remediation.ts', mod: a3Remediation },
  { file: 'dict/ru/r01-remediation.ts', mod: r01Remediation },
  { file: 'dict/ru/access-model.ts', mod: accessModel },
  { file: 'dict/ru/s-offer.ts', mod: sOffer },
  { file: 'dict/ru/w-free.ts', mod: wFree },
  { file: 'dict/ru/g-free.ts', mod: gFree },
  { file: 'dict/ru/p-free.ts', mod: pFree },
  { file: 'dict/ru/account-categories.ts', mod: accountCategories },
  { file: 'dict/ru/l-legal.ts', mod: lLegal },
  { file: 'dict/ru/c-consent.ts', mod: cConsent },
  { file: 'dict/ru/practice-sets.ts', mod: practiceSets },
];

/* The extra dictionary parts (src/lib/i18n/dict/parts.ts): the big coaching
   texts, fetched only by the screens that show them. Each one is a separate
   chunk, so a Russian student who never opens the band ladder never
   downloads 72 KB of band guidance. Add a line here when a part is added. */
type DictModule = { strings: Record<string, string>; plurals: Record<string, unknown> };

const PART_FILES: Record<DictionaryPart, { file: string; mod: DictModule }> = {
  strategies: { file: 'dict/ru/parts/strategies.ts', mod: partStrategies },
  structures: { file: 'dict/ru/parts/structures.ts', mod: partStructures },
  'band-guides': { file: 'dict/ru/parts/band-guides.ts', mod: partBandGuides },
};

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(REPO_ROOT, 'src');

/* ------------------------------------------------------------------ */
/* t()                                                                 */
/* ------------------------------------------------------------------ */

/** A small dictionary used where a fixture reads better than a real string. */
const FIXTURE: Dictionary = {
  strings: {
    Open: 'Открыть',
    [messageKey('Open', 'adjective')]: 'Открытый',
    'Ready in {days} days': 'Через {days} дня будет готово',
    '{done} of {total} done': 'Готово: {done} из {total}',
    Untranslated: '',
  },
  plurals: {
    '{n} lessons': { one: '{n} урок', few: '{n} урока', many: '{n} уроков', other: '{n} урока' },
  },
};

test('English is the default everywhere, including on the server', () => {
  assert.equal(getLocale(), 'en');
  assert.deepEqual([...SUPPORTED_LOCALES], ['en', 'ru', 'kk']);
  assert.equal(LOCALE_LABEL.en, 'English');
  assert.equal(LOCALE_LABEL.ru, 'Русский');
  assert.equal(LOCALE_LABEL.kk, 'Қазақша');
  assert.ok(isLocale('ru'));
  assert.ok(isLocale('kk'));
  assert.ok(!isLocale('de'));
  assert.ok(!isLocale(undefined));
});

test('t() returns the English literal untouched for en', () => {
  assert.equal(translateWith(FIXTURE, 'en', 'Open'), 'Open');
  // Even with a dictionary present, English never looks anything up.
  assert.equal(translateWith(FIXTURE, 'en', 'Ready in {days} days', { days: 3 }), 'Ready in 3 days');
});

test('t() returns the Russian for ru', () => {
  assert.equal(translateWith(FIXTURE, 'ru', 'Open'), 'Открыть');
});

test('t() falls back to English for a missing or empty entry', () => {
  assert.equal(translateWith(FIXTURE, 'ru', 'Nothing here yet'), 'Nothing here yet');
  // An empty value counts as "not translated", not as "translate to nothing".
  assert.equal(translateWith(FIXTURE, 'ru', 'Untranslated'), 'Untranslated');
  // No dictionary loaded yet: English, never a blank and never a key name.
  assert.equal(translateWith(null, 'ru', 'Open'), 'Open');
});

test('t() uses the context key when one is given', () => {
  assert.equal(translateWith(FIXTURE, 'ru', 'Open', undefined, 'adjective'), 'Открытый');
  assert.equal(translateWith(FIXTURE, 'ru', 'Open'), 'Открыть');
  assert.equal(messageKey('Open', 'adjective'), `adjective${CONTEXT_SEPARATOR}Open`);
  assert.equal(messageKey('Open'), 'Open');
});

test('placeholders are filled after lookup, so Russian may reorder them', () => {
  assert.equal(
    translateWith(FIXTURE, 'ru', 'Ready in {days} days', { days: 3 }),
    'Через 3 дня будет готово',
  );
  // The Russian puts {done} and {total} in a different order from English.
  assert.equal(
    translateWith(FIXTURE, 'ru', '{done} of {total} done', { done: 2, total: 5 }),
    'Готово: 2 из 5',
  );
  assert.equal(translateWith(FIXTURE, 'en', '{done} of {total} done', { done: 2, total: 5 }), '2 of 5 done');
  // An unknown placeholder is left visible rather than blanked.
  assert.equal(interpolate('Hi {nmae}', { name: 'Alex' }), 'Hi {nmae}');
});

test('nt() marks a string for translation without changing it', () => {
  assert.equal(nt('Today'), 'Today');
});

/* ------------------------------------------------------------------ */
/* tn()                                                                */
/* ------------------------------------------------------------------ */

const LESSON_FORMS = { one: '{n} lesson', other: '{n} lessons' };

test('tn() picks one/other for English', () => {
  assert.equal(pluralWith(FIXTURE, 'en', 1, LESSON_FORMS), '1 lesson');
  assert.equal(pluralWith(FIXTURE, 'en', 2, LESSON_FORMS), '2 lessons');
  assert.equal(pluralWith(FIXTURE, 'en', 0, LESSON_FORMS), '0 lessons');
});

test('tn() picks the right Russian form across the awkward numbers', () => {
  const expected: [number, string][] = [
    [1, '1 урок'],
    [2, '2 урока'],
    [5, '5 уроков'],
    [11, '11 уроков'],
    [21, '21 урок'],
    [22, '22 урока'],
    [25, '25 уроков'],
    [101, '101 урок'],
    [111, '111 уроков'],
  ];
  for (const [n, want] of expected) {
    assert.equal(pluralWith(FIXTURE, 'ru', n, LESSON_FORMS), want, `n = ${n}`);
  }
});

test('tn() falls back to the English forms when the pair is not in the dictionary', () => {
  const forms = { one: '{n} test', other: '{n} tests' };
  assert.equal(pluralWith(FIXTURE, 'ru', 3, forms), '3 tests');
  assert.equal(pluralWith(null, 'ru', 1, forms), '1 test');
});

/* ------------------------------------------------------------------ */
/* The lazy dictionary                                                 */
/* ------------------------------------------------------------------ */

test('the Russian dictionary loads lazily and then t() uses it', async () => {
  // Before the chunk lands, Russian callers still get readable English.
  assert.equal(t('Progress report', undefined, undefined, 'ru'), getLoadedDictionary('ru') ? 'Отчёт о прогрессе' : 'Progress report');

  const dict = await loadDictionary('ru');
  assert.ok(dict, 'the ru dictionary should load');
  assert.equal(getLoadedDictionary('ru')?.strings.Today, 'Сегодня');

  assert.equal(t('Progress report', undefined, undefined, 'ru'), 'Отчёт о прогрессе');
  assert.equal(t('Progress report'), 'Progress report', 'the default locale is untouched');
  assert.equal(tn(1, LESSON_FORMS, undefined, 'en'), '1 lesson');

  // English has no dictionary to load at all.
  assert.equal(await loadDictionary('en'), null);
});

test('every batch file exports both strings and plurals, and the index merges them', () => {
  for (const { file, mod } of BATCH_FILES) {
    assert.equal(typeof mod.strings, 'object', `${file} must export a strings object`);
    assert.ok(mod.strings && !Array.isArray(mod.strings), `${file}: strings must be a plain object`);
    assert.equal(typeof mod.plurals, 'object', `${file} must export a plurals object`);
    assert.ok(mod.plurals && !Array.isArray(mod.plurals), `${file}: plurals must be a plain object`);
  }
  assert.equal(ruMerged.BATCHES.length, BATCH_FILES.length, 'dict/ru/index.ts and this test must list the same batches');
  for (const { file, mod } of BATCH_FILES) {
    for (const key of Object.keys(mod.strings)) {
      assert.ok(key in ruMerged.strings, `${file}: "${key}" is missing from the merged dict/ru/index.ts`);
    }
  }
});

/* ================================================================== */
/* Coverage: every wrapped English string has Russian                  */
/* ================================================================== */

/* How the extractor works, because five agents depend on its messages.

   It reads every .ts/.tsx/.astro file under src/ (skipping src/lib/i18n
   itself, src/data/tests and src/content) and pulls out four things:

   1. t('...')  and  nt('...')  — a plain single- or double-quoted first
      argument. A third string argument is read as the context, so
      t('Open', undefined, 'button') is a different key from t('Open').
   2. tn(n, { one: '...', other: '...' }) — the `other` form is the plural
      key.
   3. <el data-i18n>English text</el> in .astro — the text content is the key.
   4. data-i18n-attr="placeholder,aria-label" in .astro — each named
      attribute's literal value is a key.

   Anything dynamic is skipped rather than guessed at: a template literal, a
   variable, or an Astro expression `{...}` inside a data-i18n element cannot
   be read statically, so it is not required to be translated (wrap those in
   nt() at the place the English literal is actually written). Matches that
   sit inside a comment are skipped too. */

/* The extractor itself lives in tests/i18n-extract.ts, shared with the
   Kazakh coverage test (tests/i18n-kk.test.ts). */

const DASHES = /[–—]/;

test('the extractor finds what it is supposed to find', () => {
  // A guard on the guard: if this breaks, every assertion below goes quiet.
  const all = extractAll();
  const keys = new Set(all.map((e) => e.key));
  assert.ok(keys.has('Today'), 'nt() in src/lib/platform-nav.ts should be extracted');
  assert.ok(keys.has('Sign out'), 't() in src/components/WorkspaceMenu.tsx should be extracted');
  assert.ok(keys.has('Skip to content'), 'data-i18n in src/layouts/BaseLayout.astro should be extracted');
  assert.ok(keys.has('Workspace'), 'data-i18n-attr in src/components/WorkspaceHeader.astro should be extracted');
  assert.ok(keys.has('Help'), 'data-i18n in src/components/WorkspaceFooter.astro should be extracted');
  assert.ok(keys.has('{n} drills'), 'ntn() in src/pages/trainers/index.astro should be extracted as a counted phrase');
});

/** The dictionary an extracted string has to be translated in, and the file
    an agent should open to add it. The main dictionary for most files; the
    named part for the few big guidance files listed in PART_SOURCES. */
function dictionaryFor(part: DictionaryPart | null): {
  strings: Record<string, string>;
  plurals: Record<string, unknown>;
  where: string;
} {
  if (!part) return { strings: ruMerged.strings, plurals: ruMerged.plurals, where: 'the main dictionary (src/lib/i18n/dict/ru/*.ts)' };
  const entry = PART_FILES[part];
  return { strings: entry.mod.strings, plurals: entry.mod.plurals, where: `the "${part}" part (src/lib/i18n/${entry.file})` };
}

/** Every dictionary file in the project: the main batches and the parts.
    The dash rule and the conflict rule apply to all of them equally. */
const ALL_DICT_FILES: { file: string; mod: DictModule }[] = [
  ...BATCH_FILES,
  ...DICTIONARY_PARTS.map((part) => PART_FILES[part]),
];

test('every wrapped English string has a Russian translation', () => {
  const missing: string[] = [];
  for (const item of extractAll()) {
    const dict = dictionaryFor(item.part);
    if (item.kind === 'plural') {
      const forms = dict.plurals[item.key] as Record<string, string> | undefined;
      if (!forms) {
        missing.push(`${item.file}: no Russian plural forms for "${item.key}" in ${dict.where}`);
        continue;
      }
      for (const form of ['one', 'few', 'many', 'other']) {
        if (!forms[form]) missing.push(`${item.file}: Russian plural "${item.key}" is missing the "${form}" form`);
      }
      continue;
    }
    const value = dict.strings[item.key];
    if (!value) missing.push(`${item.file}: no Russian for "${item.text}" in ${dict.where}`);
  }
  assert.deepEqual(missing, [], `Untranslated strings:\n  ${missing.join('\n  ')}`);
});

test('every placeholder in an English key survives into its Russian value', () => {
  const problems: string[] = [];
  for (const item of extractAll()) {
    const value = item.kind === 'plural' ? undefined : dictionaryFor(item.part).strings[item.key];
    if (!value) continue;
    for (const name of placeholders(item.text)) {
      if (!value.includes(`{${name}}`)) {
        problems.push(`${item.file}: Russian for "${item.text}" is missing the {${name}} placeholder`);
      }
    }
  }
  assert.deepEqual(problems, [], `Placeholder mismatches:\n  ${problems.join('\n  ')}`);
});

test('no Russian value contains an em dash or an en dash', () => {
  const problems: string[] = [];
  for (const { file, mod } of ALL_DICT_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      if (DASHES.test(value)) problems.push(`${file}: "${key}" contains a dash character; rephrase it`);
    }
    for (const [key, forms] of Object.entries(mod.plurals as Record<string, Record<string, string>>)) {
      for (const [form, value] of Object.entries(forms)) {
        if (DASHES.test(value)) problems.push(`${file}: plural "${key}" (${form}) contains a dash character`);
      }
    }
  }
  assert.deepEqual(problems, [], `Dash characters found:\n  ${problems.join('\n  ')}`);
});

test('no key has two different Russian values across batch files or parts', () => {
  const seen = new Map<string, { file: string; value: string }>();
  const conflicts: string[] = [];
  for (const { file, mod } of ALL_DICT_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      const previous = seen.get(key);
      if (previous && previous.value !== value) {
        conflicts.push(
          `"${key}": ${previous.file} says "${previous.value}", ${file} says "${value}". ` +
            'If both are right, give one call site a ctx instead.',
        );
        continue;
      }
      if (!previous) seen.set(key, { file, value });
    }
  }
  assert.deepEqual(conflicts, [], `Conflicting translations:\n  ${conflicts.join('\n  ')}`);
});

/* ================================================================== */
/* The extra dictionary parts                                          */
/* ================================================================== */

test('the part registry cannot drift: names, loaders, files and sources all line up', () => {
  // Every part has a dictionary file listed in this test...
  assert.deepEqual(Object.keys(PART_FILES).sort(), [...DICTIONARY_PARTS].sort(), 'PART_FILES here and DICTIONARY_PARTS in src/lib/i18n/dict/parts.ts must list the same parts');

  // ...a Russian loader in dict/index.ts...
  assert.deepEqual(availableDictionaryParts('ru').sort(), [...DICTIONARY_PARTS].sort(), 'every part in DICTIONARY_PARTS needs a Russian loader in PART_LOADERS (src/lib/i18n/dict/index.ts)');

  // ...both exports, like any batch file...
  for (const part of DICTIONARY_PARTS) {
    const { file, mod } = PART_FILES[part];
    assert.equal(typeof mod.strings, 'object', `${file} must export a strings object`);
    assert.ok(mod.strings && !Array.isArray(mod.strings), `${file}: strings must be a plain object`);
    assert.equal(typeof mod.plurals, 'object', `${file} must export a plurals object`);
    assert.ok(mod.plurals && !Array.isArray(mod.plurals), `${file}: plurals must be a plain object`);
  }

  // ...and at least one real source file, which must still exist. A renamed
  // or deleted data file would otherwise leave a part quietly translating
  // nothing.
  const claimed = new Set<string>();
  for (const part of DICTIONARY_PARTS) {
    const sources = PART_SOURCES[part];
    assert.ok(sources.length > 0, `PART_SOURCES["${part}"] is empty: a part with no source files has nothing to translate`);
    for (const rel of sources) {
      assert.ok(fs.existsSync(path.join(SRC_DIR, rel)), `PART_SOURCES["${part}"] names src/${rel}, which does not exist`);
      assert.ok(!claimed.has(rel), `src/${rel} is claimed by more than one part`);
      claimed.add(rel);
      assert.equal(partForSourceFile(rel), part, `partForSourceFile("${rel}") should return "${part}"`);
    }
  }
  assert.equal(partForSourceFile('components/WorkspaceMenu.tsx'), null, 'an ordinary file belongs to the main dictionary');
});

test('a part holds exactly its own source files, with nothing dead and nothing duplicated', () => {
  const problems: string[] = [];
  const extracted = extractAll();

  for (const part of DICTIONARY_PARTS) {
    const { file, mod } = PART_FILES[part];
    const wanted = new Set(extracted.filter((e) => e.part === part && e.kind === 'string').map((e) => e.key));
    const wantedPlurals = new Set(extracted.filter((e) => e.part === part && e.kind === 'plural').map((e) => e.key));

    for (const key of Object.keys(mod.strings)) {
      // A leftover from an English edit: the key no longer exists in any of
      // the part's source files, so it can never be looked up again.
      if (!wanted.has(key)) {
        problems.push(`${file}: "${key}" is not marked in any of ${PART_SOURCES[part].map((s) => `src/${s}`).join(', ')} any more. Delete it, or restore the English.`);
      }
      // A part is merged ON TOP of the main dictionary, so a key that is in
      // both and disagrees would silently change that text everywhere else
      // on the page the moment the part lands. An incidental overlap on a
      // short label is fine as long as both say the same thing.
      const inMain = ruMerged.strings[key];
      if (inMain && inMain !== mod.strings[key]) {
        problems.push(
          `${file}: "${key}" is also in the main dictionary, with a different Russian value ` +
            `("${inMain}" there, "${mod.strings[key]}" here). Loading this part would change it everywhere. Make them agree.`,
        );
      }
    }
    for (const key of Object.keys(mod.plurals)) {
      if (!wantedPlurals.has(key)) {
        problems.push(`${file}: plural "${key}" is not used by any of ${PART_SOURCES[part].map((s) => `src/${s}`).join(', ')} any more.`);
      }
    }
  }
  assert.deepEqual(problems, [], `Part problems:\n  ${problems.join('\n  ')}`);
});

test('loading a part merges it into the same lookup, and t() picks it up', async () => {
  await loadDictionary('ru');

  const sample = Object.keys(PART_FILES['strategies'].mod.strings)[0]!;
  const russian = PART_FILES['strategies'].mod.strings[sample]!;

  // English is always "ready": there is nothing to fetch.
  assert.equal(isDictionaryPartLoaded('en', 'strategies'), true);

  await loadDictionaryPart('ru', 'strategies');
  assert.equal(isDictionaryPartLoaded('ru', 'strategies'), true);
  assert.equal(t(sample, undefined, undefined, 'ru'), russian, 't() should read the part through the ordinary dictionary');
  assert.equal(t(sample), sample, 'English is untouched by a part');

  // Idempotent, and the main dictionary object the batch files export is
  // never mutated by a part merge.
  await loadDictionaryPart('ru', 'strategies');
  assert.ok(!(sample in ruMerged.strings), 'merging a part must not write into dict/ru/index.ts');

  // English has nothing to load, and never throws.
  await loadDictionaryPart('en', 'band-guides');
});

test('a device set to Russian opens in Russian, one set to Kazakh in Kazakh, anything else in English', async () => {
  const { detectLocale } = await import('../src/lib/i18n/locale.ts');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const withLanguages = (languages: string[]) =>
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { languages, language: languages[0] },
    });
  try {
    withLanguages(['ru-RU', 'en-US']);
    assert.equal(detectLocale(), 'ru');
    withLanguages(['kk-KZ']);
    assert.equal(detectLocale(), 'kk', 'a Kazakh-set device opens in Kazakh (2 October 2026)');
    withLanguages(['kk']);
    assert.equal(detectLocale(), 'kk');
    withLanguages(['en-US', 'kk-KZ']);
    assert.equal(detectLocale(), 'en', 'only the FIRST device language counts');
    withLanguages(['en-GB', 'ru']);
    assert.equal(detectLocale(), 'en', 'only the FIRST device language counts');
    withLanguages(['de-DE']);
    assert.equal(detectLocale(), 'en');
    withLanguages([]);
    assert.equal(detectLocale(), 'en');
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});
