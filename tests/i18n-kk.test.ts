/* Kazakh: the third interface language (Builder K, 2 October 2026).

   Run this file on its own with:
     node --import ./tests/ts-extension-loader.mjs --test tests/i18n-kk.test.ts

   Kazakh consumer law (Consumer Law Art. 24, 25 p.3 and p.7, 26; Law on
   Languages Art. 15 and 21; docs/legal/KZ-WEBSITE-REQUIREMENTS-2026-10-02.md,
   section 3) asks for the public offer, the consumer information and the
   advertising in Kazakh as well as Russian. The owner decided: Kazakh for
   the legal and buying pages only, Russian for everything else.

   So this file holds two promises:
   1. every string on the legal and buying surfaces (KK_SURFACES below) has a
      Kazakh entry, with the same placeholders, no dashes, and no two batch
      files disagreeing;
   2. everything else falls back to RUSSIAN for a Kazakh reader (not
      English), and nothing English or Russian readers see changes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  SUPPORTED_LOCALES,
  LOCALE_LABEL,
  LOCALE_SHORT,
  FALLBACK_LOCALE,
  DEVICE_LANGUAGE_LOCALE,
  contentLocale,
  intlLocale,
  isLocale,
} from '../src/lib/i18n/locale.ts';
import { t, tn, translateWith, pluralWith } from '../src/lib/i18n/translate.ts';
import {
  loadDictionary,
  getLoadedDictionary,
  loadDictionaryPart,
  isDictionaryPartLoaded,
  availableDictionaryParts,
  mergeUnderOwn,
  DICTIONARY_PARTS,
  type Dictionary,
} from '../src/lib/i18n/dict/index.ts';
import * as ruMerged from '../src/lib/i18n/dict/ru/index.ts';
import * as kkMerged from '../src/lib/i18n/dict/kk/index.ts';
import * as kkOffer from '../src/lib/i18n/dict/kk/offer.ts';
import * as kkPrivacy from '../src/lib/i18n/dict/kk/privacy.ts';
import * as kkConsent from '../src/lib/i18n/dict/kk/consent.ts';
import * as kkBuying from '../src/lib/i18n/dict/kk/buying.ts';
import * as kkAuth from '../src/lib/i18n/dict/kk/auth.ts';
import * as kkHelp from '../src/lib/i18n/dict/kk/help.ts';
import * as partStrategies from '../src/lib/i18n/dict/ru/parts/strategies.ts';
import { extractFromFile, placeholders, SRC_DIR, type Extracted } from './i18n-extract.ts';

type DictModule = { strings: Record<string, string>; plurals: Record<string, Record<string, string>> };

/* Every Kazakh batch file. Add a line here when one is added (and in
   src/lib/i18n/dict/kk/index.ts). */
const KK_BATCH_FILES: { file: string; mod: DictModule }[] = [
  { file: 'dict/kk/offer.ts', mod: kkOffer },
  { file: 'dict/kk/privacy.ts', mod: kkPrivacy },
  { file: 'dict/kk/consent.ts', mod: kkConsent },
  { file: 'dict/kk/buying.ts', mod: kkBuying },
  { file: 'dict/kk/auth.ts', mod: kkAuth },
  { file: 'dict/kk/help.ts', mod: kkHelp },
];

/* The surfaces Kazakh law needs in Kazakh, as source files relative to
   src/. Every translatable string in these files must have Kazakh. */
const KK_SURFACES: readonly string[] = [
  // The public offer and the terms page
  'components/support/TermsDocument.tsx',
  'components/support/PurchaseTerms.tsx',
  'pages/terms.astro',
  // The privacy notice
  'pages/privacy.astro',
  // Seller details, the footer and the AI label
  'lib/legal/offer.ts',
  'components/legal/SellerDetails.tsx',
  'components/legal/AiEstimateNote.tsx',
  'components/WorkspaceFooter.astro',
  // Consent, the parent's declaration, the downloaded data, the deleted account
  'lib/legal/consent.ts',
  'components/legal/ConsentCheck.tsx',
  'lib/legal/export.ts',
  'components/auth/SignUpForm.tsx',
  'components/auth/ProfileForm.tsx',
  'components/auth/fields.tsx',
  'components/auth/shell.tsx',
  'pages/sign-up.astro',
  'components/auth/AccountDeleted.tsx',
  'pages/account-deleted.astro',
  // Plans and buying
  'components/trial/TrialPlans.tsx',
  'pages/plans.astro',
  'pages/plans/return.astro',
  'pages/account/receipt.astro',
  'components/access/AccessParts.tsx',
  'components/access/AccountAccess.tsx',
  'components/access/AllowanceNote.tsx',
  'components/access/AssessmentBalance.tsx',
  'components/access/PaidLocked.tsx',
  'components/access/PurchaseReturn.tsx',
  'components/access/Receipt.tsx',
  'components/access/UpgradeDialog.tsx',
  'components/access/access-state.ts',
  'components/access/assessment-refusal.ts',
  'lib/access/upgrade-pitch.ts',
];

/* Files where only some strings are consumer information: the rest of the
   file is course help and reads Russian. Each listed string must still be
   in that file (so a renamed sentence cannot quietly drop out of Kazakh). */
const KK_PARTIAL: Record<string, readonly string[]> = {
  // Help: what is free and paid, refunds, buying, and talking to a person.
  'pages/help.astro': [
    'What is free, and what is paid?',
    'Every lesson is free with an account: the explanations, worked examples, each lesson’s own short quiz and the vocabulary lists.',
    'Practice and guidance are paid: practice exercises and timed tests with band estimates, AI feedback on essays and recorded Speaking, live interviews with the AI examiner, full mock exams, the placement test, Mr EZ and the practice in your personal study plan.',
    'Practice and guidance last 30 days and then simply end. Nothing renews. The Plans page shows the price and what 30 days include.',
    'Can I get a refund?',
    'Yes. You can ask for a refund at any time during the 30 days, and we pay back the share you have not used. The used share is the larger of the days that have started and the AI assessments you have used.',
    'Ask through the support form, choosing a refund, or by email to the seller. The public offer has the full rule and a worked example.',
    'How do I get practice and guidance?',
    'Open the Plans page, sign in and pay once for 30 days. Your access starts as soon as the payment is confirmed, and your Account page shows when it ends.',
    'When you reach for something that comes with practice and guidance, the platform tells you what it adds and links to the Plans page. Your lessons stay open either way.',
    'Buying practice and guidance is not open yet. The Plans page shows the price and what 30 days include.',
    'Talk to a person',
    'Something not working, or a question these answers do not cover? Write to us. A person reads every message and replies by email.',
    'Or write directly:',
    'Ask a person',
    'Privacy',
    'Public offer',
    'Terms of use',
  ],
  // Account > Profile: the Delete account and Download my data rows.
  'components/AccountSettings.tsx': [
    'Delete account',
    'Removes your account and all your data at once. This cannot be undone.',
    'Delete my account',
    'Deleting your account removes, immediately and for good: your details, your progress and results, your essays and speaking feedback, your saved items and notes, your study plan, your conversations with Mr EZ and your messages to us. Any access you have paid for ends.',
    'Only a record of each payment is kept, without your name or email, because the law requires sales records to be kept.',
    'I understand that my account and all my data will be deleted and cannot be recovered.',
    'Deleting…',
    'Delete my account and all my data',
    'Cancel',
    'Your data',
    'Download a copy of everything your account holds, as one file.',
    'Your file is downloading.',
    'Your file is downloading, but some parts could not be read just now. Try again later for a complete copy.',
    'Your data could not be read just now. Please try again.',
    'Preparing…',
    'Download my data',
  ],
  // The account page's frame and its Profile and Access tabs.
  'pages/account.astro': ['Your account', 'Log in to see your details, your saved work and your results.', 'Log in', 'Create a free account', 'Account', 'Profile', 'Access', 'Saved and results'],
  // The support form's refund and AI-review reasons.
  'components/support/SupportForm.tsx': [
    'You came here to ask for a refund. Tell us which purchase it is for, and a person will answer by email.',
    'You came here to ask a person to review an AI-marked result. Tell us which essay or Speaking result it is and what you would like checked.',
  ],
  // The AI labels in Mr EZ's panel and the live examiner.
  'components/tutor/MrEzPanel.tsx': ['Mr EZ is an AI tutor, not a real person.'],
  'components/LiveExaminer.tsx': ['{name} is an AI voice, not a real person. Your interview is marked by AI.'],
};

const DASHES = /[–—]/;
const KAZAKH_LETTERS = /[әғқңөұүһі]/i;
const SKIP_DIRS = ['lib/i18n', 'data/tests', 'content'];

function surfaceItems(): Extracted[] {
  const items: Extracted[] = [];
  for (const rel of KK_SURFACES) items.push(...extractFromFile(rel));
  for (const [rel, keys] of Object.entries(KK_PARTIAL)) {
    const found = extractFromFile(rel);
    for (const key of keys) {
      const hit = found.find((item) => item.key === key);
      if (hit) items.push(hit);
    }
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* The locale itself                                                   */
/* ------------------------------------------------------------------ */

test('Kazakh is a supported locale, named in Kazakh and shown as KZ', () => {
  assert.deepEqual([...SUPPORTED_LOCALES], ['en', 'ru', 'kk']);
  assert.ok(isLocale('kk'));
  assert.equal(LOCALE_LABEL.kk, 'Қазақша');
  assert.deepEqual(LOCALE_SHORT, { en: 'EN', ru: 'RU', kk: 'KZ' });
  assert.equal(FALLBACK_LOCALE.kk, 'ru');
  assert.equal(DEVICE_LANGUAGE_LOCALE.kk, 'kk');
  assert.equal(DEVICE_LANGUAGE_LOCALE.ru, 'ru');
  assert.equal(DEVICE_LANGUAGE_LOCALE.en, undefined, 'English is the default, not a device mapping');
});

test('the content language of Kazakh is Russian, and nothing else moves', () => {
  assert.equal(contentLocale('kk'), 'ru');
  assert.equal(contentLocale('ru'), 'ru');
  assert.equal(contentLocale('en'), 'en');
  assert.equal(contentLocale(undefined), 'en');
  assert.equal(contentLocale('de'), 'en');
});

test('dates and numbers use kk-KZ for Kazakh where the runtime has it, and are unchanged otherwise', () => {
  const hasKazakh = /қазан/i.test(new Intl.DateTimeFormat('kk-KZ', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 9, 15)));
  assert.equal(intlLocale('kk'), hasKazakh ? 'kk-KZ' : 'ru-RU');
  assert.equal(intlLocale('ru'), 'ru-RU');
  assert.equal(intlLocale('en'), 'en-GB');
  assert.equal(intlLocale('en', 'en-US'), 'en-US');
  if (hasKazakh) {
    const date = new Intl.DateTimeFormat(intlLocale('kk'), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 9, 31));
    assert.match(date, /қазан/, 'a Kazakh date names the month in Kazakh');
  }
});

test('every place that hands a locale to Russian-only code maps Kazakh to Russian', () => {
  // The Workers, the tutor layer and the lesson files know only en and ru.
  // These are the doors a Kazakh locale would otherwise walk through.
  const doors: [string, RegExp][] = [
    ['lib/tutor/client.ts', /locale: contentLocale\(req\.locale \?\? getLocale\(\)\)/],
    ['lib/i18n/lesson-body.ts', /const locale = contentLocale\(getLocale\(\)\);/],
    ['lib/i18n/test-explanations.ts', /const locale = contentLocale\(interfaceLocale\);/],
    ['lib/writing/grader.ts', /locale: contentLocale\(getLocale\(\)\)/],
    ['lib/speaking/live/grade.ts', /locale: contentLocale\(getLocale\(\)\)/],
    ['components/WritingTester.tsx', /locale: contentLocale\(getLocale\(\)\)/],
    ['components/LiveExaminer.tsx', /locale: contentLocale\(getLocale\(\)\)/],
    ['components/support/SupportForm.tsx', /locale: contentLocale\(locale\)/],
    ['lib/learning/index.ts', /syncExplanationLocale\(contentLocale\(getLocale\(\)\)\)/],
    ['lib/trial/packs.ts', /contentLocale\(getLocale\(\)\) === 'ru' \? \['learning-index', 'ru-dictionary'\]/],
  ];
  for (const [rel, pattern] of doors) {
    const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
    assert.match(source, pattern, `src/${rel} must hand contentLocale(...) on, never the interface locale`);
  }
  // And nothing in the site compares a locale with 'ru' to pick Russian
  // content without going through contentLocale: such a check would read
  // English for a Kazakh student. (Formatting dates goes through intlLocale.)
  const offenders: string[] = [];
  const entries = fs.readdirSync(SRC_DIR, { recursive: true, encoding: 'utf8' }) as string[];
  for (const raw of entries) {
    const rel = raw.split(path.sep).join('/');
    if (!/\.(ts|tsx|astro)$/.test(rel)) continue;
    if (SKIP_DIRS.some((dir) => rel.startsWith(`${dir}/`))) continue;
    const source = fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
    if (/getLocale\(\) [!=]== 'ru'/.test(source)) offenders.push(`src/${rel}`);
    if (/locale === 'ru' \? 'ru-RU'/.test(source)) offenders.push(`src/${rel}`);
  }
  assert.deepEqual(offenders, [], 'compare through contentLocale() or intlLocale(), not against the literal ru');
});

/* ------------------------------------------------------------------ */
/* Coverage of the legal and buying surfaces                           */
/* ------------------------------------------------------------------ */

test('the surface lists name real files, and every partial string is still in its file', () => {
  const problems: string[] = [];
  for (const rel of [...KK_SURFACES, ...Object.keys(KK_PARTIAL)]) {
    if (!fs.existsSync(path.join(SRC_DIR, rel))) problems.push(`src/${rel} does not exist`);
  }
  for (const [rel, keys] of Object.entries(KK_PARTIAL)) {
    if (!fs.existsSync(path.join(SRC_DIR, rel))) continue;
    const found = new Set(extractFromFile(rel).map((item) => item.key));
    for (const key of keys) if (!found.has(key)) problems.push(`src/${rel} no longer has "${key}": update KK_PARTIAL`);
  }
  assert.deepEqual(problems, []);
  // A guard on the guard: the surfaces really do hold text.
  assert.ok(surfaceItems().length > 500, `expected the legal and buying surfaces to hold over 500 strings, found ${surfaceItems().length}`);
});

test('every string on the legal and buying surfaces has a Kazakh translation', () => {
  const missing: string[] = [];
  for (const item of surfaceItems()) {
    if (item.kind === 'plural') {
      const forms = kkMerged.plurals[item.key];
      if (!forms) {
        missing.push(`${item.file}: no Kazakh plural forms for "${item.key}" in src/lib/i18n/dict/kk/*.ts`);
        continue;
      }
      for (const form of ['one', 'few', 'many', 'other'] as const) {
        if (!forms[form]) missing.push(`${item.file}: Kazakh plural "${item.key}" is missing the "${form}" form`);
      }
      continue;
    }
    if (!kkMerged.strings[item.key]) missing.push(`${item.file}: no Kazakh for "${item.text}" in src/lib/i18n/dict/kk/*.ts`);
  }
  assert.deepEqual(missing, [], `Untranslated strings:\n  ${[...new Set(missing)].join('\n  ')}`);
});

test('every Kazakh value keeps exactly the placeholders of its English', () => {
  const problems: string[] = [];
  for (const { file, mod } of KK_BATCH_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      const english = key.includes('\u0004') ? key.split('\u0004')[1]! : key;
      const want = placeholders(english).sort().join();
      const got = placeholders(value).sort().join();
      if (want !== got) problems.push(`${file}: "${key}" has {${got}} but the English has {${want}}`);
    }
  }
  assert.deepEqual(problems, [], `Placeholder mismatches:\n  ${problems.join('\n  ')}`);
});

test('no Kazakh value contains an em dash or an en dash', () => {
  const problems: string[] = [];
  for (const { file, mod } of KK_BATCH_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      if (DASHES.test(value)) problems.push(`${file}: "${key}" contains a dash character; rephrase it`);
    }
    for (const [key, forms] of Object.entries(mod.plurals)) {
      for (const [form, value] of Object.entries(forms)) if (DASHES.test(value)) problems.push(`${file}: plural "${key}" (${form}) has a dash`);
    }
  }
  assert.deepEqual(problems, [], `Dash characters found:\n  ${problems.join('\n  ')}`);
});

test('the Kazakh batch files agree with each other and with the index', () => {
  const seen = new Map<string, { file: string; value: string }>();
  const conflicts: string[] = [];
  for (const { file, mod } of KK_BATCH_FILES) {
    assert.equal(typeof mod.strings, 'object', `${file} must export strings`);
    assert.equal(typeof mod.plurals, 'object', `${file} must export plurals`);
    for (const [key, value] of Object.entries(mod.strings)) {
      const previous = seen.get(key);
      if (previous && previous.value !== value) {
        conflicts.push(`"${key}": ${previous.file} says "${previous.value}", ${file} says "${value}"`);
      }
      if (!previous) seen.set(key, { file, value });
      assert.equal(kkMerged.strings[key], previous?.value ?? value, `${file}: "${key}" is not merged into dict/kk/index.ts`);
    }
  }
  assert.deepEqual(conflicts, [], `Conflicting Kazakh:\n  ${conflicts.join('\n  ')}`);
  assert.equal(kkMerged.BATCHES.length, KK_BATCH_FILES.length, 'dict/kk/index.ts and this test must list the same batches');
  const onDisk = fs
    .readdirSync(path.join(SRC_DIR, 'lib/i18n/dict/kk'))
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
    .map((name) => `dict/kk/${name}`)
    .sort();
  assert.deepEqual(onDisk, KK_BATCH_FILES.map((b) => b.file).sort(), 'every file in dict/kk/ must be a listed batch');
});

test('every Kazakh key is real English the site shows, and reads as Kazakh', () => {
  const problems: string[] = [];
  for (const { file, mod } of KK_BATCH_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      // Every English the site wraps already has Russian, so a Kazakh key the
      // Russian dictionary does not know is a typo or a dead sentence.
      if (!(key in ruMerged.strings)) problems.push(`${file}: "${key}" is not a key the site uses (no Russian for it either)`);
      const words = value.split(/\s+/).length;
      if (words > 6 && !KAZAKH_LETTERS.test(value)) problems.push(`${file}: "${key}" has no Kazakh letters; is it still Russian?`);
      if (words > 2 && value === ruMerged.strings[key]) problems.push(`${file}: "${key}" is the Russian, not Kazakh`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

/* ------------------------------------------------------------------ */
/* The fallback: Kazakh, then Russian, never English                   */
/* ------------------------------------------------------------------ */

/** A Kazakh dictionary as the loader builds it: Russian with Kazakh on top. */
const LAYERED: Dictionary = {
  strings: { Open: 'Ашу', 'Only in Russian': 'Только по-русски' },
  plurals: {
    '{n} lessons': { one: '{n} урок', few: '{n} урока', many: '{n} уроков', other: '{n} урока' },
    '{n} days': { one: '{n} күн', few: '{n} күн', many: '{n} күн', other: '{n} күн' },
  },
};

test('a Kazakh lookup with no Kazakh entry returns the Russian', () => {
  assert.equal(translateWith(LAYERED, 'kk', 'Open'), 'Ашу');
  assert.equal(translateWith(LAYERED, 'kk', 'Only in Russian'), 'Только по-русски');
  // Nothing at all: the English literal, never a blank or a key.
  assert.equal(translateWith(LAYERED, 'kk', 'Nowhere'), 'Nowhere');
  assert.equal(translateWith(null, 'kk', 'Open'), 'Open');
});

test('Kazakh counts with the Russian rules, so a Russian fallback plural is right', () => {
  const lessons = { one: '{n} lesson', other: '{n} lessons' };
  for (const [n, want] of [[1, '1 урок'], [3, '3 урока'], [5, '5 уроков'], [21, '21 урок'], [111, '111 уроков']] as const) {
    assert.equal(pluralWith(LAYERED, 'kk', n, lessons), want, `n = ${n}`);
  }
  const days = { one: '{n} day', other: '{n} days' };
  for (const n of [1, 2, 5, 21]) assert.equal(pluralWith(LAYERED, 'kk', n, days), `${n} күн`);
});

test('the real Kazakh dictionary is the Russian one with Kazakh on top', async () => {
  const kk = await loadDictionary('kk');
  assert.ok(kk, 'the kk dictionary should load');
  // A Kazakh line.
  assert.equal(t('Public offer', undefined, undefined, 'kk'), 'Жария оферта');
  assert.equal(t('Seller', undefined, undefined, 'kk'), 'Сатушы');
  // A course line with no Kazakh: the Russian, not the English.
  const courseOnly = Object.keys(ruMerged.strings).find((key) => !(key in kkMerged.strings) && ruMerged.strings[key] && !key.includes('{'))!;
  assert.ok(courseOnly);
  assert.equal(t(courseOnly, undefined, undefined, 'kk'), ruMerged.strings[courseOnly]);
  assert.equal(t('Progress report', undefined, undefined, 'kk'), 'Отчёт о прогрессе');
  // Placeholders still fill.
  assert.equal(t('Version of {date}', { date: '2026 ж. 2 қазан' }, undefined, 'kk'), 'Редакция күні: 2026 ж. 2 қазан');
  // Every Russian key is reachable from Kazakh, so nothing drops to English.
  for (const key of Object.keys(ruMerged.strings)) {
    assert.ok(key in kk!.strings, `"${key}" is in Russian but not reachable from Kazakh`);
  }
  // A real Russian plural through Kazakh.
  const pluralKey = Object.keys(ruMerged.plurals)[0]!;
  const forms = ruMerged.plurals[pluralKey]!;
  assert.equal(tn(5, { one: pluralKey, other: pluralKey }, undefined, 'kk'), forms.many.replace('{n}', '5'));
});

test('loading Kazakh changes nothing an English or Russian reader sees', async () => {
  await loadDictionary('kk');
  const ru = await loadDictionary('ru');
  assert.ok(ru);
  // No Kazakh leaks into the Russian dictionary.
  for (const key of Object.keys(kkMerged.strings)) {
    assert.equal(ru!.strings[key], ruMerged.strings[key], `"${key}" changed in the Russian dictionary`);
  }
  for (const [key, value] of Object.entries(ruMerged.strings)) assert.equal(ru!.strings[key], value);
  assert.equal(t('Public offer', undefined, undefined, 'ru'), 'Публичная оферта');
  assert.equal(t('Public offer', undefined, undefined, 'en'), 'Public offer');
  assert.equal(t('Public offer'), 'Public offer', 'the default locale is untouched');
  // The batch modules themselves are never written into.
  assert.ok(!Object.values(ruMerged.strings).includes('Жария оферта'));
  assert.equal(ruMerged.strings['Public offer'], 'Публичная оферта');
  assert.notEqual(getLoadedDictionary('ru'), getLoadedDictionary('kk'), 'two separate dictionaries');
});

test('Kazakh reads the Russian guidance parts, and a later merge never replaces Kazakh', async () => {
  assert.deepEqual(availableDictionaryParts('kk').sort(), [...DICTIONARY_PARTS].sort());
  await loadDictionaryPart('kk', 'strategies');
  assert.ok(isDictionaryPartLoaded('kk', 'strategies'));
  const sample = Object.keys(partStrategies.strings)[0]!;
  assert.equal(t(sample, undefined, undefined, 'kk'), partStrategies.strings[sample]);

  const kk = getLoadedDictionary('kk')!;
  mergeUnderOwn('kk', kk, { strings: { 'Public offer': 'Публичная оферта', 'A brand new paid line': 'Новая платная строка' } });
  assert.equal(kk.strings['Public offer'], 'Жария оферта', 'the paid Russian pack must not overwrite Kazakh');
  assert.equal(kk.strings['A brand new paid line'], 'Новая платная строка', 'but it does add Russian where Kazakh has none');
});

/* ------------------------------------------------------------------ */
/* The native speaker's review list                                    */
/* ------------------------------------------------------------------ */

test('the native speaker review file lists every Kazakh line the site shows', async () => {
  const review = fs.readFileSync(path.join(SRC_DIR, '..', 'docs', 'legal', 'KAZAKH-REVIEW.md'), 'utf8');
  const { SALES_COPY } = await import('../src/marketing/sales-copy.ts');
  const missing: string[] = [];
  for (const value of Object.values(kkMerged.strings)) if (!review.includes(value)) missing.push(value);
  for (const [key, entry] of Object.entries(SALES_COPY)) if (!review.includes(entry.kk)) missing.push(`${key}: ${entry.kk}`);
  assert.deepEqual(missing, [], 'docs/legal/KAZAKH-REVIEW.md is out of date: list every new Kazakh line there for the checker');
  assert.doesNotMatch(review, /[–—]/, 'the review file follows the no-dash rule too');
});
