/* The free-account model on the platform screens (Builder P, Alex's
   decision of 1 October 2026; docs/paid-access/FREE-ACCOUNT-MODEL.md).

   Pure rules only, held without a browser: which page is paid and as what,
   the tier the browser shows from the server's answer, the once-only
   first-lesson nudge, a free account's Today, what the pop-up says paying
   adds, the paid-required refusal, and the retired /trial address. The
   dialog's keyboard behaviour and every entry point are proved in the
   browser (docs/paid-access/evidence, the Playwright run). */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { cleanRoute, paidFeatureForRoute, PAID_ROUTES } from '../src/lib/access/paid-routes.ts';
import { browserTier, opensEverything, readsLessons } from '../src/lib/access/tier.ts';
import { canUse, PAID_FEATURES, tierOf } from '../src/lib/access/model.ts';
import { FIRST_LESSON_NUDGE_KEY, markNudgeShown, nudgeAlreadyShown, nudgeKeyFor, shouldNudge } from '../src/lib/access/nudge.ts';
import { freeNextLessons, freeProgress, resolveStartingPoint, JOURNEY_DRAFT_KEY, STARTING_POINT_KEY } from '../src/lib/access/free-today.ts';
import { pitchPlan, pitchPrice, upgradePitch, PITCH_PRICE_LINE } from '../src/lib/access/upgrade-pitch.ts';
import { isPaidRequired, PAID_REQUIRED_CODE, UPGRADE_REASON } from '../src/lib/access/upgrade.ts';
import { refusalUpgradeFeature } from '../src/components/access/refusal-upgrade.ts';
import { isAssessmentRefusalCode, refusalKind, refusalMessage } from '../src/components/access/assessment-refusal.ts';
import { isGraderRefusalCode, isLiveRefusalCode } from '../src/lib/writing/refusal-code.ts';
import { parseTrialStatus, PAID_ALLOWANCE, type TrialStatus } from '../src/lib/trial/status.ts';
import type { TrialView } from '../src/lib/trial/client.ts';
import { AVAILABLE_PAID_PLANS } from '../src/lib/access/plans.ts';
import { buildCourse } from '../src/lib/course.ts';
import { interpolate, translateWith } from '../src/lib/i18n/translate.ts';
import * as ru from '../src/lib/i18n/dict/ru/index.ts';
import type { BrowserStorage } from '../src/lib/store-owner.ts';

const NOW = Date.parse('2026-10-01T09:00:00Z');
const D = 24 * 3600 * 1000;
const read = (p: string) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tRu = (text: string, vars?: Record<string, string | number>) => translateWith({ strings: ru.strings, plurals: ru.plurals }, 'ru', text, vars);

function memory(): BrowserStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function status(paid: Record<string, unknown> | null): TrialStatus {
  const empty = { test: null, tutorUsed: 0, tutorPending: 0 };
  return parseTrialStatus({
    state: 'none',
    startedAt: null,
    endsAt: null,
    serverNow: new Date(NOW).toISOString(),
    paid,
    limits: { hours: 72, testsPerSection: 1, tutorPerSection: 5 },
    sections: { reading: empty, listening: empty, writing: empty, speaking: empty },
  })!;
}

function view(phase: TrialView['phase'], s: TrialStatus | null = null): TrialView {
  return { phase, userId: phase === 'ready' || phase === 'checking' || phase === 'error' ? 'u-1' : null, status: s, offsetMs: 0, failure: phase === 'error' ? 'server' : null };
}

/* ── Which pages are paid ──────────────────────────────────────────────── */

test('every paid page names its feature, and lessons, the course, vocabulary lists, results and plans stay free', () => {
  const paid: Record<string, string> = {
    '/tests/reading-full-001': 'test',
    '/tests/mock': 'mock',
    '/tests/drills/reading-full-001-drill-p1': 'drill',
    '/trainers/reading': 'drill',
    '/trainers/reading/reading-full-001-drill-p1': 'drill',
    '/trainers/listening/listening-full-001-drill-p1': 'drill',
    '/trainers/writing': 'trainer',
    '/trainers/speaking': 'trainer',
    '/trainers/focused/reading-tfng-1': 'focused',
    '/trainers/speaking-focus/part2-1': 'focused',
    '/placement': 'placement',
    '/writing/checker': 'essay',
    '/writing/models': 'model-answers',
    '/speaking/examiner': 'live',
    '/speaking/recorded': 'speaking',
    '/speaking/cue-cards': 'cue-cards',
    '/learn/bands': 'band-guide',
  };
  for (const [route, feature] of Object.entries(paid)) assert.equal(paidFeatureForRoute(route), feature, route);
  for (const route of ['/', '/dashboard', '/start', '/learn', '/tests', '/trainers', '/review', '/report', '/plans', '/account', '/lessons/reading/tfng', '/lessons/vocabulary/environment', '/sign-up', '/trial', '/help']) {
    assert.equal(paidFeatureForRoute(route), null, `${route} is free`);
  }
  for (const route of PAID_ROUTES) assert.ok(paidFeatureForRoute(route), route);
});

test('a link is read as its clean route, whatever base, suffix, query or hash it carries', () => {
  assert.equal(cleanRoute('/ielts-website/tests/mock', '/ielts-website/'), '/tests/mock');
  assert.equal(cleanRoute('/ielts-website/tests/reading-full-001.html?x=1#top', '/ielts-website'), '/tests/reading-full-001');
  assert.equal(cleanRoute('/ielts-website/', '/ielts-website/'), '/');
  assert.equal(cleanRoute('/ielts-website/trainers/writing/', '/ielts-website/'), '/trainers/writing');
  assert.equal(cleanRoute('/tests', '/'), '/tests');
});

/* ── The tier in the browser ───────────────────────────────────────────── */

test('the tier comes from the server\'s answer, and "checking" or a failure is never read as free or paid', () => {
  const free = status(null);
  const paid = status({ planId: 'month-1', startsAt: new Date(NOW - D).toISOString(), endsAt: new Date(NOW + 29 * D).toISOString() });
  const gift = status({ planId: 'complimentary', startsAt: new Date(NOW - D).toISOString(), endsAt: new Date(NOW + 29 * D).toISOString(), kind: 'complimentary' });
  const ended = status({ planId: 'month-1', startsAt: new Date(NOW - 31 * D).toISOString(), endsAt: new Date(NOW - D).toISOString() });

  assert.equal(gift.paid?.kind, 'complimentary', 'the status keeps the grant kind');
  assert.equal(paid.paid?.kind, undefined, 'an older server without a kind is read as paid');
  assert.equal(status({ planId: 'x', startsAt: new Date(NOW).toISOString(), endsAt: new Date(NOW + D).toISOString(), kind: 'bogus' }).paid?.kind, undefined);

  assert.equal(browserTier(view('off'), NOW), 'open');
  assert.equal(browserTier(view('checking'), NOW), 'checking');
  assert.equal(browserTier(view('signed-out'), NOW), 'signed-out');
  assert.equal(browserTier(view('error'), NOW), 'error');
  assert.equal(browserTier(view('ready', free), NOW), 'free');
  assert.equal(browserTier(view('ready', paid), NOW), 'paid');
  assert.equal(browserTier(view('ready', gift), NOW), 'complimentary');
  assert.equal(browserTier(view('ready', ended), NOW), 'paid-ended');
  assert.equal(browserTier(view('ready', paid), NOW + 30 * D), 'paid-ended', 'by the server clock, without asking again');
  assert.equal(tierOf(paid.paid ? paid : null, false, NOW), 'signed-out');

  assert.deepEqual(['open', 'paid', 'complimentary'].map((t) => opensEverything(t as never)), [true, true, true]);
  assert.deepEqual(['free', 'paid-ended', 'signed-out', 'checking', 'error'].map((t) => opensEverything(t as never)), [false, false, false, false, false]);
  assert.deepEqual(['free', 'paid', 'complimentary', 'paid-ended'].map((t) => readsLessons(t as never)), [true, true, true, true]);
  assert.deepEqual(['signed-out', 'checking', 'error'].map((t) => readsLessons(t as never)), [false, false, false]);
});

test('canUse agrees with the screens: lessons for any account, every paid feature only with practice and guidance', () => {
  for (const tier of ['free', 'paid-ended'] as const) {
    for (const f of ['lesson', 'lesson-quiz', 'vocab-lists', 'course-map'] as const) assert.equal(canUse(tier, f), true);
    for (const f of PAID_FEATURES) assert.equal(canUse(tier, f), false, `${tier} ${f}`);
  }
  for (const tier of ['paid', 'complimentary'] as const) for (const f of PAID_FEATURES) assert.equal(canUse(tier, f), true);
  assert.equal(canUse('signed-out', 'lesson'), false);
  for (const f of PAID_FEATURES) assert.ok(UPGRADE_REASON[f], `the pop-up has a lead line for ${f}`);
});

/* ── The first-lesson nudge ────────────────────────────────────────────── */

test('the first-lesson nudge: a free account only, once, never during a timed check, never without storage', () => {
  const storage = memory();
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage }), true);
  for (const tier of ['paid', 'complimentary', 'signed-out', 'checking', 'error', 'open', 'paid-ended'] as const) {
    assert.equal(shouldNudge({ tier, userId: 'u-1', storage }), false, tier);
  }
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage, underExam: true }), false);
  assert.equal(shouldNudge({ tier: 'free', userId: null, storage }), false);
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage: null }), false);

  markNudgeShown(storage, 'u-1', new Date(NOW).toISOString());
  assert.equal(nudgeAlreadyShown(storage, 'u-1'), true);
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage }), false, 'never again for this account');
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-2', storage }), true, 'another account on the same device still gets its one');
  assert.ok(nudgeKeyFor('u-1').startsWith(FIRST_LESSON_NUDGE_KEY), 'stored under the account\'s own key');
  assert.notEqual(nudgeKeyFor('u-1'), nudgeKeyFor('u-2'));
});

test('the first-lesson nudge is per account across devices: a fresh device whose synced progress shows an earlier lesson stays quiet', () => {
  const freshDevice = memory();
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage: freshDevice, finishedBefore: 0 }), true, 'the first lesson of this account');
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage: freshDevice, finishedBefore: 1 }), false, 'not the first lesson of this account');
  assert.equal(shouldNudge({ tier: 'free', userId: 'u-1', storage: freshDevice, finishedBefore: 7 }), false);
});

test('the nudge listens only for the two ends of a lesson, and the dialog never opens for practice and guidance', () => {
  const layout = read('src/layouts/LessonLayout.astro');
  assert.match(layout, /if \(isTrialBuild\(\)\) announceLessonFinished\(slug\);/, '"Mark this lesson as studied" announces it, gated build only');
  assert.match(read('src/components/trial/GatedPracticeQuiz.tsx'), /onAllChecked=\{\(\) => announceLessonFinished\(lessonKey\)\}/, 'the lesson quiz, every part checked');
  const dialog = read('src/components/access/UpgradeDialog.tsx');
  assert.match(dialog, /if \(opensEverything\(tier\)\) return;/);
  assert.match(dialog, /markNudgeShown\(storage, view\.userId!/, 'marked the moment it is shown');
  assert.match(read('src/layouts/BaseLayout.astro'), /\{upgradeDialog && <UpgradeDialog client:load \/>\}/);
  for (const f of ['UpgradeDialog', 'PaidLocked', 'LessonInvite', 'FreeHome']) assert.doesNotMatch(read(`src/components/access/${f}.tsx`), /import '\.\/[a-z-]+\.css'/, `${f}: no page-level CSS import (it would reach the open build)`);
  assert.match(read('src/layouts/BaseLayout.astro'), /const upgradeDialog = ACCESS_MODE === 'trial';/, 'gated build only');
});

/* ── A free account's Today ────────────────────────────────────────────── */

test('Today\'s next lessons start from the chosen section, in course order, skipping what is studied', () => {
  const lessons = buildCourse().flatMap((m) => m.lessons);
  const none = () => false;
  const firstThree = freeNextLessons(lessons, none, null);
  assert.deepEqual(firstThree.map((l) => l.key), lessons.slice(0, 3).map((l) => l.key));
  const writing = freeNextLessons(lessons, none, { band: '7.5', skill: 'writing', focus: 'method', time: '30' });
  assert.ok(writing.every((l) => l.skill === 'writing'), 'the chosen section first');
  assert.deepEqual(writing.map((l) => l.key), lessons.filter((l) => l.skill === 'writing').slice(0, 3).map((l) => l.key));
  const studied = new Set(lessons.slice(0, 2).map((l) => l.key));
  const next = freeNextLessons(lessons, (k) => studied.has(k), null, 1);
  assert.equal(next[0]!.key, lessons[2]!.key);
  assert.deepEqual(freeProgress(lessons, (k) => studied.has(k)), { done: 2, total: lessons.length });
  assert.deepEqual(freeNextLessons(lessons, () => true, null), []);
});

test('the questionnaire answers: from the address (and saved), else saved, else the tab\'s draft; junk is ignored', () => {
  const local = memory();
  const session = memory();
  const link = '?journey=1&band=7.5&skill=writing&focus=method&time=30';
  assert.deepEqual(resolveStartingPoint({ search: link, userId: 'u-1', local, session }), { band: '7.5', skill: 'writing', focus: 'method', time: '30' });
  assert.ok([...local.data.keys()].some((k) => k.startsWith(STARTING_POINT_KEY)), 'saved for the account');
  assert.deepEqual(resolveStartingPoint({ search: '', userId: 'u-1', local, session })?.skill, 'writing', 'remembered on the next visit');
  assert.equal(resolveStartingPoint({ search: '', userId: 'u-2', local, session }), null, 'another account has none');
  session.setItem(JOURNEY_DRAFT_KEY, JSON.stringify({ band: '7', skill: 'speaking', focus: 'confidence', time: '15' }));
  assert.equal(resolveStartingPoint({ search: '', userId: 'u-2', local, session })?.skill, 'speaking', 'the sales website draft');
  assert.equal(resolveStartingPoint({ search: '?journey=1&band=9&skill=maths', userId: 'u-3', local: memory(), session: memory() }), null);
});

/* ── What the pop-up says ──────────────────────────────────────────────── */

test('the pop-up reads its numbers from the plan and the allowance, never re-typed', () => {
  const lines = upgradePitch();
  assert.equal(lines.length, 5);
  assert.deepEqual(lines[1]!.vars, { essays: PAID_ALLOWANCE.writing, speaking: PAID_ALLOWANCE.speaking });
  assert.deepEqual(lines[2]!.vars, { live: PAID_ALLOWANCE.live, mock: PAID_ALLOWANCE.mock });
  assert.deepEqual(PAID_ALLOWANCE, { writing: 12, speaking: 6, live: 2, mock: 2 });
  const plan = pitchPlan();
  assert.deepEqual(plan, { amount: AVAILABLE_PAID_PLANS[0]!.amount, days: AVAILABLE_PAID_PLANS[0]!.days });
  const en = interpolate(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, 'en'), days: plan.days });
  assert.equal(en, '12,990 KZT for 30 days. No automatic renewal.');
  const russian = tRu(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, 'ru'), days: plan.days }).replace(/[  ]/g, ' ');
  assert.equal(russian, '12 990 ₸ за 30 дней. Без автоматического продления.');
  assert.equal(interpolate(lines[1]!.text, lines[1]!.vars), '12 essay checks and 6 recorded Speaking checks');
  assert.equal(interpolate(lines[2]!.text, lines[2]!.vars), '2 live interviews, 2 mock exams and the placement test');
  for (const line of lines) assert.notEqual(tRu(line.text, line.vars), interpolate(line.text, line.vars), `Russian for "${line.text}"`);
  assert.equal(tRu('Get practice and guidance'), 'Подключить практику и сопровождение');
});

/* ── The paid-required refusal (HTTP 402) ──────────────────────────────── */

test('a 402 paid-required refusal is a refusal, never an outage, and opens the pop-up for its feature', () => {
  assert.equal(PAID_REQUIRED_CODE, 'paid-required');
  assert.equal(isPaidRequired(402, 'paid-required'), true);
  assert.equal(isPaidRequired(403, 'assessment-unavailable', 'paid-required'), true);
  assert.equal(isPaidRequired(402, ''), true);
  assert.equal(isPaidRequired(503, 'unavailable'), false);
  assert.equal(isGraderRefusalCode('paid-required'), true);
  assert.equal(isLiveRefusalCode('paid-required'), true);
  assert.equal(isAssessmentRefusalCode('paid-required'), true);
  assert.equal(refusalKind('paid-required', '', 'paid-required'), 'paid-required');
  assert.equal(refusalKind('paid-required'), 'paid-required');
  assert.equal(refusalUpgradeFeature('paid-required', 'writing'), 'essay');
  assert.equal(refusalUpgradeFeature('paid-required', 'speaking'), 'speaking');
  assert.equal(refusalUpgradeFeature('paid-required', 'live'), 'live');
  assert.equal(refusalUpgradeFeature('paid-required', 'mock'), 'mock');
  assert.equal(refusalUpgradeFeature('paid-required', 'placement'), 'placement');
  assert.equal(refusalUpgradeFeature('used-up', 'writing'), null, 'an allowance used is not an upgrade');
  const en = (text: string, vars?: Record<string, string | number>) => interpolate(text, vars);
  assert.match(refusalMessage({ kind: 'paid-required', what: 'writing' }, null, NOW, en, 'en'), /^AI feedback comes with practice and guidance\. Nothing was used\. Your essay is safe on this page\.$/);
  assert.match(read('src/lib/tutor/client.ts'), /if \(resp\.status === 402\) code = 'paid-required';/);
  assert.match(read('src/components/tutor/MrEzPanel.tsx'), /clientError\?\.code === PAID_REQUIRED_CODE\) openUpgrade\('tutor'/);
});

/* ── The trial is retired ─────────────────────────────────────────────── */

function runTrialRedirect(search: string, hash = ''): string {
  const page = read('src/pages/trial.astro');
  const body = page.slice(page.indexOf('define:vars={{ target }}>') + 'define:vars={{ target }}>'.length, page.indexOf('</script>'));
  let went = '';
  vm.runInNewContext(body, { target: '/ielts-website/sign-up', URLSearchParams, encodeURIComponent, location: { search, hash, replace: (to: string) => (went = to) } });
  return went;
}

test('/trial sends the student to sign-up, keeping the questionnaire answers', () => {
  assert.equal(runTrialRedirect(''), '/ielts-website/sign-up');
  assert.equal(
    runTrialRedirect('?journey=1&band=7.5&skill=writing&focus=method&time=30'),
    `/ielts-website/sign-up?next=${encodeURIComponent('/dashboard?journey=1&band=7.5&skill=writing&focus=method&time=30')}`,
  );
  assert.equal(runTrialRedirect('?next=%2Fplans'), '/ielts-website/sign-up?next=%2Fplans', 'a next of its own is kept as it is');
  assert.equal(runTrialRedirect('?journey=1&next=%2Fplans', '#x'), '/ielts-website/sign-up?journey=1&next=%2Fplans#x');
  const page = read('src/pages/trial.astro');
  assert.match(page, /const retired = ACCESS_MODE === 'trial';/, 'the gated build only; the open site keeps its page');
  assert.match(page, /<TrialJoin client:load \/>/);
});

test('no screen the gated build shows offers a trial', () => {
  for (const file of [
    'src/components/trial/TrialBlock.tsx',
    'src/components/trial/TrialGate.tsx',
    'src/components/trial/AccessHome.tsx',
    'src/components/access/UpgradeDialog.tsx',
    'src/components/access/PaidLocked.tsx',
    'src/components/access/LessonInvite.tsx',
    'src/components/access/FreeHome.tsx',
    'src/components/access/LessonPracticeNotice.tsx',
    'src/pages/tests/index.astro',
    'src/pages/trainers/index.astro',
  ]) {
    const calls = [...read(file).matchAll(/\bt\('([^']*)'/g)].map((m) => m[1]!);
    for (const text of calls) assert.doesNotMatch(text, /\btrial\b/i, `${file}: "${text}"`);
    assert.doesNotMatch(read(file), /href=\{withBase\('\/trial'\)\}/, `${file} links to /trial`);
  }
  assert.doesNotMatch(read('src/components/tutor/MrEzPanel.tsx'), /\/trial'/);
  assert.match(read('src/components/trial/useTrialTest.ts'), /return INACTIVE;\r?\n\}/, 'no paper is a trial test any more');
});

test('lesson bodies and the lesson\'s worked example are not in the gated build\'s pages', () => {
  assert.match(read('src/components/LessonBody.astro'), /\{gated \? <div data-lesson-body=\{slug\} data-lesson-gated \/> :/);
  assert.match(read('src/pages/lessons/listening.astro'), /\{!gated && <Fragment set:html=\{bodyBeforeCards\} \/>\}/);
  assert.match(read('src/pages/lessons/reading-task1.astro'), /\{!gated && <Fragment set:html=\{bodyAfterCards\} \/>\}/);
  assert.match(read('src/pages/lesson-bodies/[locale]/[slug].html.ts'), /if \(ACCESS_MODE === 'trial'\) return \[\];/);
  const writing = read('src/pages/lessons/writing/[part].astro');
  // The page passes only whether an example exists (2 October 2026), never the example.
  assert.match(writing, /<LessonModelExample client:load lesson=\{part\.slug\} available=\{hasExample\} \/>/, 'no example in the page');
  assert.match(writing, /const hasExample = hasLessonExample\(part\.slug\);/);
  assert.doesNotMatch(writing, /lessonExample\(/);
  assert.match(read('src/components/LessonModelExample.tsx'), /LESSON_EXAMPLE_PATH = \(lesson: string\): string => `example\/writing-\$\{lesson\}`/, 'G\'s door: example/writing-<slug>');
  assert.match(read('src/layouts/BaseLayout.astro'), /const gated = ACCESS_MODE === 'trial' && Boolean\(trialGate\);/, 'lessons sit behind the gate again');
});
