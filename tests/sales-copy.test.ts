/* The sales page's two languages (src/marketing/sales-copy.ts) and the
   questionnaire's plan (src/lib/journey-plan.ts).

   The sales page has its own small bilingual table rather than the
   workspace dictionary, so it gets its own guard: every key the markup uses
   exists, every entry has both languages, the Russian follows the same rules
   as the workspace's (no dashes, same placeholders, same line breaks), and
   the plan reads as whole Russian sentences for every combination of
   answers. The runtime ignores an unknown key, so this test is what stops a
   typo from leaving English on a Russian page. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SALES_COPY, isSalesKey, salesText, salesVars, tenge, type SalesKey } from '../src/marketing/sales-copy.ts';
import { journeyDays, journeySteps, type JourneyAnswers } from '../src/lib/journey-plan.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SALES_FILES = [
  'src/layouts/StoryLayout.astro',
  'src/components/home/NextChapter.astro',
  'src/components/home/QuestionJourney.astro',
  'src/components/home/SalesDemo.astro',
  'src/components/home/TrialPricing.astro',
];
const SCRIPT_FILES = ['src/scripts/question-journey.ts', 'src/scripts/next-chapter.ts', 'src/marketing/sales-i18n.ts'];

const DASHES = /[–—]/;
const ALLOWED_TAGS = new Set(['br', 'span', 'em', 'b', 'small', 'mark', 'a']);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<\/?([a-z]+)/g)].map((m) => m[1]!);

// Comments hold examples (data-sales="key"), not keys.
const read = (rel: string) =>
  fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

test('every entry has English and Russian that follow the translation rules', () => {
  const problems: string[] = [];
  for (const [key, entry] of Object.entries(SALES_COPY)) {
    if (!entry.en.trim()) problems.push(`${key}: empty English`);
    if (!entry.ru.trim()) problems.push(`${key}: empty Russian`);
    if (DASHES.test(entry.ru) || DASHES.test(entry.en)) problems.push(`${key}: contains an em or en dash`);
    if (placeholders(entry.en).join() !== placeholders(entry.ru).join()) {
      problems.push(`${key}: placeholders differ (${placeholders(entry.en)} vs ${placeholders(entry.ru)})`);
    }
    // Same markup in both: the accent spans and line breaks carry the design.
    if (tags(entry.en).join() !== tags(entry.ru).join()) problems.push(`${key}: markup differs between English and Russian`);
    for (const tag of tags(entry.ru)) if (!ALLOWED_TAGS.has(tag)) problems.push(`${key}: <${tag}> is not an allowed tag`);
    // A Russian entry that is still the English (paper names aside) is a miss.
    if (entry.ru === entry.en && /[a-z]{4,}/.test(entry.en.replace(/Reading|Listening|Writing|Speaking|IELTS|EZ/g, ''))) {
      problems.push(`${key}: Russian is identical to the English`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every data-sales key in the sales page markup and scripts exists', () => {
  const missing: string[] = [];
  let found = 0;
  for (const rel of [...SALES_FILES, ...SCRIPT_FILES]) {
    const source = read(rel);
    const keys = [
      ...[...source.matchAll(/data-sales="([^"]+)"/g)].map((m) => m[1]!),
      ...[...source.matchAll(/sales\('([^']+)'/g)].map((m) => m[1]!),
      ...[...source.matchAll(/say\('([^']+)'/g)].map((m) => m[1]!),
      ...[...source.matchAll(/salesText\('([^']+)'/g)].map((m) => m[1]!),
      ...[...source.matchAll(/data-sales-attr="([^"]+)"/g)].flatMap((m) => m[1]!.split(',').map((p) => p.split(':')[1]!.trim())),
      ...[...source.matchAll(/'aria-label:([\w.]+)'/g)].map((m) => m[1]!),
    ];
    for (const key of keys) {
      found += 1;
      if (!isSalesKey(key)) missing.push(`${rel}: "${key}"`);
    }
  }
  assert.ok(found > 100, `the key scan should find the page's keys (found ${found})`);
  assert.deepEqual(missing, [], 'These keys are not in src/marketing/sales-copy.ts');
});

test('keys built from a template in the markup all exist', () => {
  const ids = {
    demo: ['speaking', 'coach', 'lessons'].flatMap((id) => ['label', 'title', 'text', 'alt', 'zoom'].map((p) => `demo.${id}.${p}`)),
    journey: [
      ...['band', 'skill', 'focus', 'time'].flatMap((q) => [`journey.chip.${q}`, `journey.step.${q}`, `journey.q.${q}`, `journey.n.${q}`]),
      ...['7', '7.5', '8'].flatMap((v) => [`journey.o.band.${v}`, `journey.d.band.${v}`]),
      ...['speaking', 'writing', 'reading', 'listening'].flatMap((v) => [`journey.o.skill.${v}`, `journey.d.skill.${v}`]),
      ...['method', 'confidence'].flatMap((v) => [`journey.o.focus.${v}`, `journey.d.focus.${v}`, `journey.plan.focus.${v}`]),
      ...['15', '30', '60'].flatMap((v) => [`journey.o.time.${v}`, `journey.d.time.${v}`]),
    ],
    skills: ['reading', 'listening', 'writing', 'speaking'].flatMap((id) => ['headline', 'text', 'm1', 'm2', 'm3'].map((p) => `skill.${id}.${p}`)),
    faq: ['trial', 'cost', 'refund', 'unlimited', 'start', 'account', 'official', 'exam', 'phone', 'speed'].flatMap((id) => [`faq.${id}.q`, `faq.${id}.a`]),
  };
  const missing = Object.values(ids).flat().filter((key) => !isSalesKey(key));
  assert.deepEqual(missing, []);
});

test('the corrected trial wording is on the page in both languages', () => {
  const start = SALES_COPY['faq.start.a'];
  assert.match(start.en, /one lesson and one test in each section/);
  assert.match(start.en, /Part 1, about five minutes/);
  assert.doesNotMatch(start.en, /full test in each section/);
  assert.match(start.ru, /один урок и один тест в каждой части/);
  assert.match(start.ru, /Part 1/);
  assert.match(start.en + SALES_COPY['price.includes.1'].en, /Academic IELTS/);
  assert.match(start.ru + SALES_COPY['price.includes.1'].ru, /Academic IELTS/);
  // Alex, 29 September 2026: fixed periods, no automatic renewal, no refunds.
  assert.match(SALES_COPY['price.status'].en, /never renews automatically/);
  assert.match(SALES_COPY['faq.refund.a'].en, /no refunds after purchase/);
});

test('prices are formatted for each language from the one approved source', () => {
  assert.equal(tenge(10000, 'en'), '₸10,000');
  assert.equal(tenge(10000, 'ru').replace(/\s/g, ' '), '10 000 ₸');
  const en = salesVars('en');
  const ru = salesVars('ru');
  assert.equal(en.oneMonth, '₸10,000');
  assert.equal(en.threeMonths, '₸25,000');
  assert.equal(en.saving, '₸5,000');
  assert.equal(en.tutorMessages, '5 Mr EZ messages');
  assert.equal(ru.tutorMessages, '5 сообщений Mr EZ');
  assert.match(salesText('faq.cost.a', 'ru'), /Один месяц стоит 10\s000 ₸/);
  // Every placeholder is filled in both languages.
  for (const key of Object.keys(SALES_COPY) as SalesKey[]) {
    for (const locale of ['en', 'ru'] as const) {
      const text = salesText(key, locale, { count: 1, band: '7.0', skill: 'Reading', time: 30, day: 1, minutes: 30, outcome: 'x', title: 'x' });
      assert.doesNotMatch(text, /\{\w+\}/, `${key} (${locale}) leaves a placeholder unfilled: ${text}`);
    }
  }
});

test('the plan is whole Russian sentences for every combination of answers', () => {
  for (const band of ['7', '7.5', '8'])
    for (const skill of ['speaking', 'writing', 'reading', 'listening'])
      for (const focus of ['method', 'confidence'])
        for (const time of ['15', '30', '60']) {
          const answers: JourneyAnswers = { band, skill, focus, time };
          const ru = [...journeyDays(answers, 'ru').flatMap((d) => [d.title, d.text, d.outcome]), ...journeySteps(answers, 'ru')];
          const en = [...journeyDays(answers, 'en').flatMap((d) => [d.title, d.text, d.outcome]), ...journeySteps(answers, 'en')];
          for (const line of ru) {
            assert.ok(/[а-яё]/i.test(line), `${JSON.stringify(answers)}: "${line}" has no Russian`);
            assert.doesNotMatch(line, DASHES, `${JSON.stringify(answers)}: "${line}" has a dash`);
            // Only paper names and Part numbers may stay English.
            const rest = line.replace(/Reading|Listening|Writing|Speaking|Part \d/g, '');
            assert.doesNotMatch(rest, /[A-Za-z]{2,}/, `${JSON.stringify(answers)}: "${line}" still holds English`);
          }
          // Same shape in both languages, and the minutes add up in Russian too.
          assert.equal(ru.length, en.length);
          assert.equal(journeySteps(answers, 'ru').reduce((sum, s) => sum + Number(s.split(' ')[0]), 0), Number(time));
        }
  // English is unchanged by the Russian: the default is still English.
  assert.equal(journeySteps({ band: '7', skill: 'reading', focus: 'confidence', time: '15' })[0], '2 min: Choose one reading task and a single thing to improve.');
});
