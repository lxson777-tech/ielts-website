/* The free AI tries on the screens (Alex, 10 October 2026): which offer each
   kind of account sees at each moment, the counter and card wording in both
   languages, the upgrade reason when the server says a try is used, offers
   suppressed during a timed task, and the numbers read from the constants.

   Pure rules only, held without a browser. Every entry point, the counter
   going down and the open build showing nothing new are proved in the
   browser run (Python Playwright against the local stand-in). */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TASTER_FEATURES,
  TASTER_LIMITS,
  TASTER_USED_CODE,
  parseTaster,
  type TasterStatus,
} from '../src/lib/access/taster.ts';
import {
  DIALOG_TRY_BUTTON,
  DIALOG_TRY_LEAD,
  DIALOG_USED_HEADING,
  LESSON_END_COPY,
  TASTER_ROUTES,
  TUTOR_COUNTER,
  afterUseLine,
  allTastersSpent,
  anyTasterOffered,
  dialogTasterLead,
  dialogUsedLead,
  lessonEndTaster,
  offerTaster,
  offeredTasters,
  paidFeatureOfTaster,
  tasterForPaidFeature,
  tasterSpent,
} from '../src/lib/access/taster-offers.ts';
import { isPaidRequired, isTasterUsed } from '../src/lib/access/upgrade.ts';
import { paidFeatureForRoute } from '../src/lib/access/paid-routes.ts';
import { refusalUpgradeFeature } from '../src/components/access/refusal-upgrade.ts';
import {
  isAssessmentRefusalCode,
  refusalIsFinal,
  refusalKind,
  refusalMessage,
  refusalOffersPlans,
} from '../src/components/access/assessment-refusal.ts';
import { isGraderRefusalCode, isLiveRefusalCode } from '../src/lib/writing/refusal-code.ts';
import { PAID_ALLOWANCE } from '../src/lib/trial/status.ts';
import { pitchPlan, pitchPrice, PITCH_PRICE_LINE } from '../src/lib/access/upgrade-pitch.ts';
import { TASTER_OWN_MAX, TASTER_OWN_MIN, TASTER_QUESTIONS, TASTER_QUESTION_TEXT, ownQuestion } from '../src/lib/access/taster-questions.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { interpolate, pluralWith, translateWith } from '../src/lib/i18n/translate.ts';
import * as ru from '../src/lib/i18n/dict/ru/index.ts';
import * as pTaster from '../src/lib/i18n/dict/ru/p-taster.ts';
import type { BrowserTier } from '../src/lib/access/tier.ts';

const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const en = (text: string, vars?: Record<string, string | number>) => interpolate(text, vars);
const dict = { strings: ru.strings, plurals: ru.plurals };
const tRu = (text: string, vars?: Record<string, string | number>) => translateWith(dict, 'ru', text, vars);

function status(tutor = 0, writing = 0, speaking = 0): TasterStatus {
  return {
    tutor: { used: tutor, limit: TASTER_LIMITS.tutor },
    writing: { used: writing, limit: TASTER_LIMITS.writing },
    speaking: { used: speaking, limit: TASTER_LIMITS.speaking },
  };
}

const ALL_USED = status(TASTER_LIMITS.tutor, TASTER_LIMITS.writing, TASTER_LIMITS.speaking);
const NEVER_ELIGIBLE: BrowserTier[] = ['signed-out', 'paid', 'complimentary', 'open', 'checking', 'error'];

/* ── Which tier is offered what ───────────────────────────────────────── */

test('a free account, or one whose paid access ended, is offered every try that is left', () => {
  for (const tier of ['free', 'paid-ended'] as BrowserTier[]) {
    assert.deepEqual(offeredTasters(tier, status()), [...TASTER_FEATURES]);
    assert.equal(anyTasterOffered(tier, status()), true);
  }
});

test('a paid account, a complimentary one and a visitor are never offered a try', () => {
  for (const tier of NEVER_ELIGIBLE) {
    for (const feature of TASTER_FEATURES) {
      assert.equal(offerTaster(tier, status(), feature), false, `${tier} ${feature}`);
    }
    assert.equal(anyTasterOffered(tier, status()), false, tier);
    assert.equal(lessonEndTaster('writing', tier, status()), null, `${tier} lesson end`);
    assert.equal(dialogTasterLead('essay', tier, status()), null, `${tier} dialog`);
  }
});

test('the open build (tier open) and an unknown server answer offer nothing', () => {
  assert.equal(anyTasterOffered('open', status()), false);
  assert.equal(anyTasterOffered('free', null), false, 'an older server that reports no tries offers none');
  assert.equal(lessonEndTaster('reading', 'free', null), null);
  assert.equal(parseTaster(undefined), null);
  assert.equal(parseTaster({ tutor: { used: 1, limit: 10 } }), null);
});

test('each kind of try is offered only while some of it is left', () => {
  const s = status(TASTER_LIMITS.tutor, 0, 0);
  assert.equal(offerTaster('free', s, 'tutor'), false);
  assert.equal(offerTaster('free', s, 'writing'), true);
  assert.equal(offerTaster('free', status(TASTER_LIMITS.tutor - 1), 'tutor'), true, 'the last question is still offered');
  assert.deepEqual(offeredTasters('free', status(3, TASTER_LIMITS.writing, 0)), ['tutor', 'speaking']);
  assert.equal(tasterSpent(s, 'tutor'), true);
  assert.equal(tasterSpent(s, 'writing'), false);
  assert.equal(allTastersSpent('free', ALL_USED), true);
  assert.equal(allTastersSpent('free', s), false);
  assert.equal(allTastersSpent('paid', ALL_USED), false, 'a paid account is not "spent"');
  assert.equal(allTastersSpent('free', null), false, 'unknown is not spent');
});

test('a try switched off (limit 0) is neither offered nor called used', () => {
  const off: TasterStatus = { ...status(), writing: { used: 0, limit: 0 } };
  assert.equal(offerTaster('free', off, 'writing'), false);
  assert.equal(tasterSpent(off, 'writing'), false);
});

/* ── Offers are suppressed during a timed task ────────────────────────── */

test('no offer is ever drawn while a timed task is running', () => {
  for (const feature of TASTER_FEATURES) {
    assert.equal(offerTaster('free', status(), feature, true), false, feature);
    assert.equal(lessonEndTaster('writing', 'free', status(), true), null);
  }
  assert.equal(anyTasterOffered('free', status(), true), false);
  assert.deepEqual(offeredTasters('free', status(), true), []);
});

test('the screens read the same flag the testers set on <body>', () => {
  const ui = read('src/components/access/taster-ui.tsx');
  assert.match(ui, /dataset\.examRunning === 'true'/);
  assert.match(ui, /attributeFilter: \['data-exam-running'\]/);
  assert.match(ui, /offerTaster\(tier, taster, feature, underExam\)/, 'every offer goes through the exam-aware rule');
  assert.match(read('src/components/WritingTester.tsx'), /document\.body\.dataset\.examRunning = 'true'/, 'the checker still sets it');
});

/* ── The lesson-end card by the lesson's skill ────────────────────────── */

test('a lesson ends with the try that matches what it taught', () => {
  assert.equal(lessonEndTaster('writing', 'free', status()), 'writing');
  assert.equal(lessonEndTaster('speaking', 'free', status()), 'speaking');
  for (const skill of ['reading', 'listening', 'vocabulary', 'grammar', '']) {
    assert.equal(lessonEndTaster(skill, 'free', status()), 'tutor', skill);
  }
});

test('when that lesson\'s own try is used the card falls back to today\'s notice', () => {
  assert.equal(lessonEndTaster('writing', 'free', status(0, TASTER_LIMITS.writing, 0)), null);
  assert.equal(lessonEndTaster('speaking', 'free', status(0, 0, TASTER_LIMITS.speaking)), null);
  assert.equal(lessonEndTaster('reading', 'free', status(TASTER_LIMITS.tutor)), null);
  /* Another try being left does not stand in for the lesson's own. */
  assert.equal(lessonEndTaster('writing', 'free', status(0, TASTER_LIMITS.writing, 0)), null);
  const notice = read('src/components/access/LessonPracticeNotice.tsx');
  assert.match(notice, /data-lesson-practice-notice=\{paid \? 'paid' : 'free'\}/, 'today\'s notice is still the fallback');
  assert.match(notice, /paid \? null : lessonEndTaster/, 'never for paid access');
  assert.match(read('src/layouts/LessonLayout.astro'), /ACCESS_MODE === 'trial' && <LessonPracticeNotice client:load skill=\{lesson\.skill\} \/>/, 'gated build only, with the lesson skill');
});

/* ── The upgrade pop-up ───────────────────────────────────────────────── */

test('the pop-up leads with the try while one is left, and says so once it is used', () => {
  assert.deepEqual(dialogTasterLead('essay', 'free', status()), { kind: 'try', taster: 'writing' });
  assert.deepEqual(dialogTasterLead('speaking', 'paid-ended', status()), { kind: 'try', taster: 'speaking' });
  assert.deepEqual(dialogTasterLead('tutor', 'free', status()), { kind: 'try', taster: 'tutor' });
  assert.deepEqual(dialogTasterLead('essay', 'free', status(0, 1, 0)), { kind: 'used', taster: 'writing' });
  assert.equal(dialogTasterLead('test', 'free', status()), null, 'a paper has no free try');
  assert.equal(dialogTasterLead('live', 'free', status()), null, 'the live interview is never a free try');
  assert.equal(dialogTasterLead('first-lesson', 'free', status()), null);
  assert.equal(dialogTasterLead('essay', 'free', null), null);
});

test('only essay, Speaking and Mr EZ map to a try, and back', () => {
  assert.equal(tasterForPaidFeature('tutor'), 'tutor');
  assert.equal(tasterForPaidFeature('essay'), 'writing');
  assert.equal(tasterForPaidFeature('speaking'), 'speaking');
  for (const f of ['test', 'drill', 'trainer', 'focused', 'mock', 'placement', 'live', 'plan-practice', 'vocab-review', 'model-answers', 'cue-cards', 'band-guide', 'first-lesson'] as const) {
    assert.equal(tasterForPaidFeature(f), null, f);
  }
  for (const f of TASTER_FEATURES) assert.equal(tasterForPaidFeature(paidFeatureOfTaster(f)), f);
});

test('the pop-up\'s try buttons go to the try, never to a paid page', () => {
  assert.equal(TASTER_ROUTES.writing, '/try/essay');
  assert.equal(TASTER_ROUTES.speaking, '/try/speaking');
  for (const route of Object.values(TASTER_ROUTES)) {
    assert.equal(paidFeatureForRoute(route), null, `${route} must not be a paid route (the click guard would open the pop-up)`);
  }
  const dialog = read('src/components/access/UpgradeDialog.tsx');
  assert.match(dialog, /dialogTasterLead\(request\.feature, currentTier\(\), trialView\(\)\.status\?\.taster \?\? null\)/);
  assert.match(dialog, /signedOut\s*\?\s*null/, 'never for a visitor who is not signed in');
});

/* ── A refused try becomes the pop-up, never an error page ────────────── */

test('a 402 taster-used is told apart from paid-required', () => {
  assert.equal(TASTER_USED_CODE, 'taster-used');
  assert.equal(isTasterUsed(402, 'taster-used'), true);
  assert.equal(isTasterUsed(402, 'assessment-unavailable', 'taster-used'), true);
  assert.equal(isTasterUsed(402, 'paid-required'), false);
  assert.equal(isTasterUsed(402, ''), false, 'a bare 402 stays paid-required');
  assert.equal(isPaidRequired(402, ''), true);
  assert.equal(isPaidRequired(402, 'taster-used'), false, 'taster-used is not paid-required');
});

test('the graders treat taster-used as a refusal with its own pop-up reason', () => {
  assert.equal(isGraderRefusalCode('taster-used'), true);
  assert.equal(isLiveRefusalCode('taster-used'), false, 'the live interview has no free try');
  assert.equal(isAssessmentRefusalCode('taster-used'), true);
  assert.equal(refusalKind('taster-used'), 'taster-used');
  assert.equal(refusalKind('assessment-unavailable', '', 'taster-used'), 'taster-used');
  assert.equal(refusalIsFinal('taster-used'), true, '"try again" would only be refused again');
  assert.equal(refusalOffersPlans('taster-used'), true);
  assert.equal(refusalUpgradeFeature('taster-used', 'writing'), 'essay');
  assert.equal(refusalUpgradeFeature('taster-used', 'speaking'), 'speaking');
  const refusal = read('src/components/access/refusal-upgrade.ts');
  assert.match(refusal, /kind === 'taster-used' \? \{ reason: 'taster-used' \}/, 'the pop-up is opened with the specific reason');
});

test('a used-up try is said in words, in both languages, and keeps the work', () => {
  const writing = refusalMessage({ kind: 'taster-used', what: 'writing' }, null, 0, en, 'en');
  assert.equal(writing, 'You have already used your free essay check. Nothing was used. Your essay is safe on this page.');
  const speaking = refusalMessage({ kind: 'taster-used', what: 'speaking' }, null, 0, en, 'en');
  assert.equal(speaking, 'You have already used your free Speaking check. Nothing was used. Your recorded answers are still on this page.');
  const ruText = refusalMessage({ kind: 'taster-used', what: 'writing' }, null, 0, tRu, 'ru');
  assert.match(ruText, /бесплатн/);
  assert.doesNotMatch(ruText, /Nothing was used/);
});

test('the tutor client and panel route taster-used to the pop-up', () => {
  assert.match(read('src/lib/tutor/schema.ts'), /\| 'taster-used'/);
  assert.match(read('src/lib/tutor/errors.ts'), /case 'taster-used':/);
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /clientError\?\.code === 'taster-used'/);
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /openUpgrade\('tutor', \{ from: currentRoute\(\), reason: 'taster-used' \}\)/);
  assert.match(read('src/components/learning/lesson-help.ts'), /error\.code === 'taster-used'\) openUpgrade\('tutor', \{ reason: 'taster-used' \}\)/);
});

/* ── Mr EZ: the counter and the buttons ───────────────────────────────── */

test('the counter reads "Free tries: 7 of 10 left" from the limit, in both languages', () => {
  assert.equal(en(TUTOR_COUNTER, { left: 7, total: TASTER_LIMITS.tutor }), `Free tries: 7 of ${TASTER_LIMITS.tutor} left`);
  assert.equal(tRu(TUTOR_COUNTER, { left: 7, total: TASTER_LIMITS.tutor }), `Бесплатные попытки: осталось 7 из ${TASTER_LIMITS.tutor}`);
  const ui = read('src/components/access/taster-ui.tsx');
  assert.match(ui, /left: taster\.left\('tutor'\), total: TASTER_LIMITS\.tutor/, 'the total is the constant');
});

test('Mr EZ\'s launcher and lesson buttons only keep the upgrade attribute when no question is left', () => {
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /data-paid-feature=\{ACCESS_MODE === 'trial' && !freeTries \? 'tutor' : undefined\}/);
  assert.match(read('src/components/learning/LessonHelpControls.tsx'), /data-paid-feature=\{isTrialBuild\(\) && !freeTries \? 'tutor' : undefined\}/);
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /const needsUpgrade = ACCESS_MODE === 'trial' && \(tier === 'free' \|\| tier === 'paid-ended'\) && !freeTries;/);
});

test('the count of free tries left follows the plural rules in Russian', () => {
  const forms = { one: '{n} free try left', other: '{n} free tries left' };
  const plural = (n: number) => pluralWith(dict, 'ru', n, forms);
  assert.equal(plural(1), 'Осталась 1 бесплатная попытка');
  assert.equal(plural(2), 'Осталось 2 бесплатные попытки');
  assert.equal(plural(5), 'Осталось 5 бесплатных попыток');
  assert.equal(plural(21), 'Осталась 21 бесплатная попытка');
  assert.equal(pluralWith(null, 'en', 1, forms), '1 free try left');
  assert.equal(pluralWith(null, 'en', 7, forms), '7 free tries left');
});

/* ── The card after a try is used: numbers from the constants ─────────── */

test('the after-use card names the paid allowance from the constants', () => {
  const essay = afterUseLine('writing');
  assert.deepEqual(essay.vars, { n: PAID_ALLOWANCE.writing });
  assert.equal(
    en(essay.text, essay.vars),
    `That was your free essay check. Practice and guidance gives you ${PAID_ALLOWANCE.writing} essay checks every 30 days, plus timed tests, Mr EZ and a study plan.`,
  );
  const speaking = afterUseLine('speaking');
  assert.deepEqual(speaking.vars, { n: PAID_ALLOWANCE.speaking });
  assert.match(en(speaking.text, speaking.vars), new RegExp(`gives you ${PAID_ALLOWANCE.speaking} recorded Speaking checks`));
  assert.equal(afterUseLine('tutor').vars, undefined);
  assert.deepEqual(dialogUsedLead('writing').vars, { n: PAID_ALLOWANCE.writing });
  assert.deepEqual(dialogUsedLead('speaking').vars, { n: PAID_ALLOWANCE.speaking });
});

test('no allowance, limit or price is typed into the new screens', () => {
  for (const file of [
    'src/lib/access/taster-offers.ts',
    'src/components/access/taster-ui.tsx',
    'src/components/access/TasterTry.tsx',
    'src/components/access/LessonPracticeNotice.tsx',
  ]) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(source, /\b(12|6)\b[^\n]*(essay|Speaking)/i, `${file}: an allowance is typed in`);
    assert.doesNotMatch(source, /12[,.\s]?990|KZT/, `${file}: a price is typed in`);
    assert.doesNotMatch(source, /\b10\b[^\n]*(questions|tries)/i, `${file}: the Mr EZ limit is typed in`);
  }
  const plan = pitchPlan();
  assert.equal(en(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, 'en'), days: plan.days }), '12,990 KZT for 30 days. No automatic renewal.');
});

test('the result and the end-of-lesson cards are shown only from the server\'s own count', () => {
  const ui = read('src/components/access/taster-ui.tsx');
  assert.match(ui, /!tasterSpent\(taster\.taster, feature\)/, 'the after card needs the count to say used');
  assert.match(ui, /eligible = taster\.tier === 'free' \|\| taster\.tier === 'paid-ended'/);
});

/* ── The two try pages ────────────────────────────────────────────────── */

test('the essay and Speaking try pages exist only in the gated build', () => {
  const page = read('src/pages/try/[kind].astro');
  assert.match(page, /isTrialBuild\(\)\s*\?\s*\[/);
  assert.match(page, /: \[\];/, 'the open build generates no page');
  assert.match(page, /trialGate=\{\{ kind: 'free'/, 'any signed-in account opens it; a visitor gets the invitation');
});

test('the free essay questions are not the paid bank and the student\'s own text is escaped', () => {
  assert.ok(TASTER_QUESTIONS.length >= 3);
  const bank = new Set(WRITING_PROMPTS.map((p) => p.promptHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()));
  for (const q of TASTER_QUESTIONS) {
    const text = TASTER_QUESTION_TEXT[q.id]!;
    assert.ok(text && text.length > TASTER_OWN_MIN, q.id);
    assert.equal(q.task, 'task2');
    assert.ok(!q.id.startsWith('pte-'), 'not an id from the imported bank');
    assert.ok(![...bank].some((b) => b.includes(text)), `${q.id} must not be a paid-bank question`);
    assert.doesNotMatch(q.promptHtml, /<(script|img)\b/i);
  }
  assert.equal(new Set(TASTER_QUESTIONS.map((q) => q.id)).size, TASTER_QUESTIONS.length);
  assert.equal(ownQuestion('too short'), null);
  assert.equal(ownQuestion('x'.repeat(TASTER_OWN_MAX + 1)), null);
  const own = ownQuestion('<script>alert(1)</script> Some people say that cities are too crowded. Discuss.');
  assert.ok(own);
  assert.doesNotMatch(own!.promptHtml, /<script>/);
  assert.match(own!.promptHtml, /&lt;script&gt;/);
});

test('the try pages use no paid pack and keep the paid page protections', () => {
  const tryPage = read('src/components/access/TasterTry.tsx');
  assert.doesNotMatch(tryPage, /fetchGated|loadPacks|commonPacks/, 'nothing is fetched through the paid content gate');
  const checker = read('src/pages/writing/checker.astro');
  assert.match(checker, /feature: 'essay'/, 'the Writing checker is still a paid page');
  assert.match(read('src/lib/access/paid-routes.ts'), /'\/writing\/checker': 'essay'/);
  assert.match(read('src/lib/access/paid-routes.ts'), /'\/speaking\/recorded': 'speaking'/);
});

/* ── Wording rules ────────────────────────────────────────────────────── */

test('no new screen says "trial", and no new text has a dash', () => {
  const files = [
    'src/lib/access/taster-offers.ts',
    'src/lib/access/taster-events.ts',
    'src/lib/access/taster-questions.ts',
    'src/components/access/taster-ui.tsx',
    'src/components/access/TasterTry.tsx',
    'src/components/access/LessonPracticeNotice.tsx',
    'src/components/access/taster.css',
    'src/lib/i18n/dict/ru/p-taster.ts',
    'src/pages/try/[kind].astro',
  ];
  for (const file of files) {
    const source = read(file);
    const literals = [...source.matchAll(/\b(?:t|tn|nt)\(\s*'([^']*)'/g)].map((m) => m[1]!);
    for (const text of literals) assert.doesNotMatch(text, /\btrial\b/i, `${file}: "${text}"`);
    assert.doesNotMatch(source, /[–—]/, `${file} has an en or em dash`);
  }
  for (const value of [...Object.values(pTaster.strings), ...Object.values(pTaster.plurals).flatMap((forms) => Object.values(forms))]) {
    assert.doesNotMatch(value, /[–—]/, `Russian has a dash: ${value}`);
  }
});

test('every English line of the new offers has Russian, with the same placeholders', () => {
  const lines = [
    TUTOR_COUNTER,
    ...Object.values(DIALOG_TRY_LEAD),
    ...Object.values(DIALOG_TRY_BUTTON),
    ...Object.values(DIALOG_USED_HEADING),
    ...Object.values(LESSON_END_COPY).flatMap((c) => [c.title, c.button]),
    afterUseLine('writing').text,
    afterUseLine('speaking').text,
    afterUseLine('tutor').text,
    dialogUsedLead('writing').text,
    dialogUsedLead('speaking').text,
    dialogUsedLead('tutor').text,
  ];
  for (const line of lines) {
    const russian = ru.strings[line];
    assert.ok(russian, `no Russian for "${line}"`);
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    assert.equal(vars(russian), vars(line), `placeholders differ in "${line}"`);
  }
});
