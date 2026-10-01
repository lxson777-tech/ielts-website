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
import { journeyDays, journeyQuery, journeySteps, type JourneyAnswers } from '../src/lib/journey-plan.ts';
import { PAID_AI_ALLOWANCE } from '../src/lib/access/plans.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SALES_FILES = [
  'src/layouts/StoryLayout.astro',
  'src/components/home/NextChapter.astro',
  'src/components/home/QuestionJourney.astro',
  'src/components/home/SalesDemo.astro',
  'src/components/home/PricingPlans.astro',
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

test('an entry that carries markup is rendered as markup, not as escaped text', () => {
  const problems: string[] = [];
  for (const rel of SALES_FILES) {
    const source = read(rel);
    for (const m of source.matchAll(/data-sales="([^"]+)">\{sales\('([^']+)'\)\}/g)) {
      const key = m[2]!;
      if (isSalesKey(key) && /<[a-z]/.test(SALES_COPY[key].en)) problems.push(`${rel}: ${key} holds markup, render it with set:html`);
    }
  }
  assert.deepEqual(problems, []);
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
    faq: ['free', 'paid', 'cost', 'renewal', 'refund', 'unlimited', 'account', 'academic', 'official', 'exam', 'phone', 'speed'].flatMap((id) => [`faq.${id}.q`, `faq.${id}.a`]),
  };
  const missing = Object.values(ids).flat().filter((key) => !isSalesKey(key));
  assert.deepEqual(missing, []);
});

test('the free-account model is on the page in both languages, and no trial is', () => {
  // Alex, 1 October 2026: every lesson free with an account; practice and
  // guidance paid; no free trial anywhere.
  for (const [key, entry] of Object.entries(SALES_COPY)) {
    // ("пробный экзамен", a mock exam, is not a trial.)
    assert.doesNotMatch(entry.en, /trial|72-hour/i, `${key} (en) still mentions a trial`);
    assert.doesNotMatch(entry.ru, /пробн\S* (период|доступ)|72 час/i, `${key} (ru) still mentions a trial`);
  }
  assert.match(SALES_COPY['hero.label'].en, /free with an account/);
  assert.match(SALES_COPY['faq.free.a'].en, /Every lesson, with an account/);
  assert.match(SALES_COPY['faq.account.a'].en, /^Yes\. Lessons open with a free account/);
  assert.match(SALES_COPY['faq.account.a'].ru, /^Да\. Уроки открываются с бесплатным аккаунтом/);
  // The one name for what paying adds.
  assert.equal(SALES_COPY['price.paid.label'].en, 'Practice and guidance');
  assert.equal(SALES_COPY['price.paid.label'].ru, 'Практика и сопровождение');
  assert.match(SALES_COPY['journey.action.text'].ru, /практика и сопровождение/);
  assert.match(SALES_COPY['faq.unlimited.a'].en, /12 essay assessments, 6 recorded Speaking assessments/);
  assert.match(SALES_COPY['faq.academic.a'].en, /Academic IELTS/);
  assert.match(SALES_COPY['faq.academic.a'].ru, /Academic IELTS/);
  // Alex, 29 September 2026: fixed periods, no automatic renewal, no refunds after purchase.
  assert.match(SALES_COPY['price.status'].en, /no automatic renewal, no refunds after purchase/);
  assert.match(SALES_COPY['faq.renewal.a'].en, /never charged automatically/);
  assert.match(SALES_COPY['faq.refund.a'].en, /^No\. Payments are not refunded after purchase/);
  assert.match(SALES_COPY['faq.refund.a'].ru, /^Нет\. После покупки деньги не возвращаются/);
  assert.match(SALES_COPY['faq.refund.a'].en, /purchase terms/);
});

test('the allowances on the page are the approved ones', () => {
  // PAID_AI_ALLOWANCE (src/lib/access/plans.ts) is the approved wording; the
  // page's own sentences must name the same numbers. The mock exam and
  // placement allowances are the database's (2026-09-30-profitable-offer.sql).
  const approved = PAID_AI_ALLOWANCE;
  for (const fact of [/12 essay assessments/, /6 recorded Speaking assessments \(up to 5 minutes each\)/, /2 live interviews with feedback \(up to 15 minutes each\)/, /40 chat messages and 60 lesson-help requests per day/]) {
    assert.match(approved, fact, 'the approved allowance changed: update the sales copy with it');
  }
  const page = SALES_COPY['faq.unlimited.a'].en;
  assert.match(page, /12 essay assessments, 6 recorded Speaking assessments \(up to 5 minutes each\), 2 live interviews with feedback \(up to 15 minutes each\), 2 full mock exams, and the placement test once per account/);
  assert.match(page, /40 chat messages and 60 lesson-help requests a day/);
  assert.match(SALES_COPY['faq.unlimited.a'].ru, /12 проверок эссе, 6 проверок записей Speaking до 5 минут, 2 устных собеседования с разбором до 15 минут, 2 полных пробных экзамена/);
  assert.match(SALES_COPY['price.paid.2'].en, /^12 essay assessments and 6 recorded Speaking assessments$/);
  assert.match(SALES_COPY['price.paid.3'].en, /^2 live interviews/);
  assert.match(SALES_COPY['price.paid.4'].en, /^2 full mock exams and the placement test$/);
  const sql = fs.readFileSync(path.join(REPO_ROOT, 'supabase/migrations/2026-09-30-profitable-offer.sql'), 'utf8');
  assert.match(sql, /v_purpose = 'mock' then[\s\S]{0,200}allowance := 2;/, 'the mock exam allowance changed: update the sales copy with it');
});

test('the questionnaire plan says which days are free lessons', () => {
  const days = journeyDays({ band: '7', skill: 'reading', focus: 'method', time: '30' });
  assert.deepEqual(days.map((d) => d.access), ['free', 'paid', 'paid']);
  assert.equal(journeyQuery({ band: '7.5', skill: 'writing', focus: 'confidence', time: '15' }), '?journey=1&band=7.5&skill=writing&focus=confidence&time=15');
});

test('prices are formatted for each language from the one approved source', () => {
  assert.equal(tenge(10000, 'en'), '₸10,000');
  assert.equal(tenge(10000, 'ru').replace(/\s/g, ' '), '10 000 ₸');
  const en = salesVars('en');
  const ru = salesVars('ru');
  assert.equal(en.oneMonth, '₸12,990');
  assert.equal(en.threeMonths, '₸25,000');
  assert.equal(en.saving, '₸13,970');
  assert.match(salesText('faq.cost.a', 'ru'), /30 дней стоят 12\s990 ₸/);
  // Every placeholder is filled in both languages.
  for (const key of Object.keys(SALES_COPY) as SalesKey[]) {
    for (const locale of ['en', 'ru'] as const) {
      const text = salesText(key, locale, { count: 1, band: '7.0', skill: 'Reading', time: 30, focus: 'x' });
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
