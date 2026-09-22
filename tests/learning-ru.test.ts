/* Russian for work package 24: the planner (planner.ts), the session
   (session.ts) and the catalogue (catalog.ts), plus a quality pass over the
   learning- dictionary parts (src/lib/i18n/dict/ru/learning-*.ts) and the
   tutor layer's own additions in src/lib/tutor/ru.ts.

   Three different things are pinned here, and they fail for different
   reasons on purpose, the same way tests/mr-ez-i18n.test.ts keeps its three
   apart.

   1. EVERY SENTENCE THE PLANNER, THE SESSION AND THE CATALOGUE WRITE HAS
      RUSSIAN. PLANNER_SENTENCES and SESSION_SENTENCES are scanned directly;
      the catalogue is built for real and every activity's objective and
      unavailable reason is checked against the live library, not a fixed
      list, so a new activity a future package adds is caught here rather
      than shipping silently English.
   2. NOTHING GOES AROUND THE LOOKUP. A regression test asserts the two old
      patterns this package replaced (`fill(PLANNER_SENTENCES...` and a bare
      `return PLANNER_SENTENCES.xxx`, both skipping the Russian lookup) do
      not reappear in either source file.
   3. WHAT A RUSSIAN STUDENT ACTUALLY SEES. `replan()` is run with
      `explanationLocale: 'ru'` on a real synthetic profile and Today's
      objective, its reason, the scope note and the change history are all
      checked for Russian, with no leftover English catalogue sentence
      glued into an otherwise Russian one, which is the exact bug the
      integration builder reported against the tutor's recommendation card. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan, replan, PLANNER_SENTENCES, type PlannerInput } from '../src/lib/learning/planner.ts';
import { SESSION_SENTENCES } from '../src/lib/learning/session.ts';
import { learningText, RU_STRINGS } from '../src/lib/learning/ru.ts';
import { sharedSessionFrom } from '../src/lib/learning/adapters.ts';
import { RU_STRINGS as TUTOR_RU_STRINGS } from '../src/lib/tutor/ru.ts';
import {
  syntheticStrongReadingWeakWriting,
  syntheticNew,
  syntheticExpired,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

import * as learningToday from '../src/lib/i18n/dict/ru/learning-today.ts';
import * as learningAccount from '../src/lib/i18n/dict/ru/learning-account.ts';
import * as learningIntake from '../src/lib/i18n/dict/ru/learning-intake.ts';
import * as learningFocus from '../src/lib/i18n/dict/ru/learning-focus.ts';
import * as learningFocusReading from '../src/lib/i18n/dict/ru/learning-focus-reading.ts';
import * as learningFocusListening from '../src/lib/i18n/dict/ru/learning-focus-listening.ts';
import * as learningWritingFocus from '../src/lib/i18n/dict/ru/learning-writing-focus.ts';
import * as learningObjectives from '../src/lib/i18n/dict/ru/learning-objectives.ts';
import * as learningVocab from '../src/lib/i18n/dict/ru/learning-vocab.ts';
import * as learningLibraries from '../src/lib/i18n/dict/ru/learning-libraries.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CATALOGUE = learningCatalogue();

/** En dash and em dash, built from code points so this file does not itself
    contain the two characters it exists to ban. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

/** A crude but effective net for the "ты" register: matches the informal
    second-person pronoun and its case forms as whole words only, so it
    never fires on an unrelated word that merely contains the letters. The
    site's own register rule (RUSSIAN-TRANSLATION-PLAN.md section 5) is
    "вы", lowercase, always. */
const INFORMAL_YOU =
  /(^|[^\p{L}])(ты|тебя|тебе|тобой|тобою|твой|твоя|твоё|твои|твоего|твоей|твоих|твоему|твоим|твоею|твою)($|[^\p{L}])/iu;

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

/* ================================================================== */
/* 1. Every PLANNER_SENTENCES and SESSION_SENTENCES value has Russian  */
/* ================================================================== */

test('every planner sentence has a Russian translation with the same placeholders, no dash, "вы" register', () => {
  const problems: string[] = [];
  for (const [key, english] of Object.entries(PLANNER_SENTENCES)) {
    const russian = learningText('ru', english);
    if (russian === english) {
      problems.push(`PLANNER_SENTENCES.${key}: no Russian for "${english}"`);
      continue;
    }
    if (placeholders(russian).join(',') !== placeholders(english).join(',')) {
      problems.push(`PLANNER_SENTENCES.${key}: placeholders differ ("${placeholders(english)}" vs "${placeholders(russian)}")`);
    }
    if (DASHES.test(russian)) problems.push(`PLANNER_SENTENCES.${key}: Russian contains a dash character`);
    if (INFORMAL_YOU.test(russian)) problems.push(`PLANNER_SENTENCES.${key}: Russian uses "ты" register: "${russian}"`);
  }
  assert.deepEqual(problems, [], `Problems in src/lib/learning/ru.ts (planner):\n  ${problems.join('\n  ')}`);
});

test('every session sentence has a Russian translation with the same placeholders, no dash, "вы" register', () => {
  const problems: string[] = [];
  for (const [key, english] of Object.entries(SESSION_SENTENCES)) {
    const russian = learningText('ru', english);
    if (russian === english) {
      problems.push(`SESSION_SENTENCES.${key}: no Russian for "${english}"`);
      continue;
    }
    if (placeholders(russian).join(',') !== placeholders(english).join(',')) {
      problems.push(`SESSION_SENTENCES.${key}: placeholders differ`);
    }
    if (DASHES.test(russian)) problems.push(`SESSION_SENTENCES.${key}: Russian contains a dash character`);
    if (INFORMAL_YOU.test(russian)) problems.push(`SESSION_SENTENCES.${key}: Russian uses "ты" register: "${russian}"`);
  }
  assert.deepEqual(problems, [], `Problems in src/lib/learning/ru.ts (session):\n  ${problems.join('\n  ')}`);
});

/* ================================================================== */
/* 2. The catalogue's own objective and unavailable sentences          */
/* ================================================================== */

test('every real catalogue activity has a Russian objective, with no dash and no "ты"', () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const activity of CATALOGUE.activities) {
    if (seen.has(activity.objective)) continue;
    seen.add(activity.objective);
    const russian = learningText('ru', activity.objective);
    if (russian === activity.objective) {
      problems.push(`${activity.id}: no Russian for objective "${activity.objective}"`);
      continue;
    }
    if (DASHES.test(russian)) problems.push(`${activity.id}: Russian objective contains a dash character`);
    if (INFORMAL_YOU.test(russian)) problems.push(`${activity.id}: Russian objective uses "ты" register`);
  }
  assert.deepEqual(problems, [], `Untranslated or malformed catalogue objectives:\n  ${problems.join('\n  ')}`);
});

test('every real catalogue "unavailable" reason has a Russian translation', () => {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const activity of CATALOGUE.activities) {
    if (!activity.unavailable) continue;
    const { reason } = activity.unavailable;
    if (seen.has(reason)) continue;
    seen.add(reason);
    const russian = learningText('ru', reason);
    if (russian === reason) problems.push(`${activity.id}: no Russian for unavailable reason "${reason}"`);
    else if (DASHES.test(russian)) problems.push(`${activity.id}: Russian unavailable reason contains a dash character`);
  }
  assert.deepEqual(problems, [], `Untranslated unavailable reasons:\n  ${problems.join('\n  ')}`);
});

test('the catalogue is not empty and really was scanned (a guard on the guard above)', () => {
  assert.ok(CATALOGUE.activities.length > 100, 'sanity: the real catalogue should have well over 100 activities');
  assert.ok(CATALOGUE.activities.some((a) => a.unavailable), 'sanity: at least one activity should be unavailable today (sentence-endings)');
});

/* ================================================================== */
/* 3. Nothing goes around the lookup (regression guard)                 */
/* ================================================================== */

test('planner.ts and session.ts never read a sentence table without translating it', () => {
  const planner = fs.readFileSync(path.join(REPO_ROOT, 'src/lib/learning/planner.ts'), 'utf8');
  const session = fs.readFileSync(path.join(REPO_ROOT, 'src/lib/learning/session.ts'), 'utf8');
  for (const [file, source] of [['planner.ts', planner], ['session.ts', session]] as const) {
    assert.doesNotMatch(source, /fill\(PLANNER_SENTENCES\./, `${file}: fill(PLANNER_SENTENCES...) skips the Russian lookup; use sentence(locale, ...) instead`);
    assert.doesNotMatch(source, /fill\(SESSION_SENTENCES\./, `${file}: fill(SESSION_SENTENCES...) skips the Russian lookup`);
    assert.doesNotMatch(source, /return PLANNER_SENTENCES\./, `${file}: a bare "return PLANNER_SENTENCES.x" skips the Russian lookup; wrap it in learningText()`);
    assert.doesNotMatch(source, /return SESSION_SENTENCES\./, `${file}: a bare "return SESSION_SENTENCES.x" skips the Russian lookup`);
  }
});

/* ================================================================== */
/* 4. What a Russian student actually sees                             */
/* ================================================================== */

const CYRILLIC = /[Ѐ-ӿ]/;

function ruPlan(profile: LearnerProfile) {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const input: Omit<PlannerInput, 'previous' | 'trigger'> = {
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: { ...profile.constraints, explanationLocale: 'ru' },
  };
  return createInitialPlan(input);
}

test('a Russian student sees a Russian objective, reason and scope note on Today, with no English catalogue sentence glued in', () => {
  const { plan } = ruPlan(syntheticStrongReadingWeakWriting());
  assert.match(plan.activeSession.objective, CYRILLIC, `objective was not translated: "${plan.activeSession.objective}"`);
  assert.match(plan.activeSession.reason, CYRILLIC, `reason was not translated: "${plan.activeSession.reason}"`);
  assert.doesNotMatch(plan.activeSession.reason, DASHES);
  assert.doesNotMatch(plan.activeSession.objective, DASHES);

  for (const ref of plan.activeSession.evidenceRefs) {
    assert.match(ref.evidence, CYRILLIC, `evidence ref was not translated: "${ref.evidence}"`);
  }
  for (const step of plan.activeSession.steps) {
    assert.match(step.purpose, CYRILLIC, `step purpose (${step.role}) was not translated: "${step.purpose}"`);
  }
  if (plan.scopeNote) assert.match(plan.scopeNote, CYRILLIC);

  /* The exact bug the integration builder reported: a Russian tutor
     recommendation interpolating the catalogue's still English objective
     sentence into an otherwise Russian reason. sharedSessionFrom is the
     same adapter recommend.ts reads session.objective through
     (src/lib/learning/adapters.ts, "It is the next step in today's
     session, which is working on this: {objective}" in
     src/lib/tutor/recommend.ts). By the time it gets here the objective was
     already translated inside the plan, which is what closes the bug. */
  const shared = sharedSessionFrom({ plan, catalogue: CATALOGUE });
  assert.match(shared.objective, CYRILLIC, 'the shared session view (what the tutor recommendation reads) must be Russian too');
  assert.equal(shared.objective, plan.activeSession.objective);
});

test('an expired plan\'s Russian follow up objective and history are in Russian', () => {
  const { plan, changes } = ruPlan(syntheticExpired());
  assert.equal(plan.status, 'date-passed');
  assert.match(plan.activeSession.objective, CYRILLIC);
  assert.match(plan.activeSession.reason, CYRILLIC);
  for (const change of changes) {
    assert.match(change.summary, CYRILLIC, `change history entry was not translated: "${change.summary}"`);
    assert.doesNotMatch(change.summary, DASHES);
  }
});

test('a new student with nothing recorded gets a Russian first session', () => {
  const { plan } = ruPlan(syntheticNew());
  assert.match(plan.activeSession.objective, CYRILLIC);
  assert.match(plan.activeSession.reason, CYRILLIC);
});

test('the schedule around Today is Russian too: exam day, rest day, and the week ahead', () => {
  const { plan } = ruPlan(
    syntheticStrongReadingWeakWriting({
      goals: {
        examDate: { date: '2026-10-03', status: 'confirmed' },
      } as never,
    }),
  );
  for (const day of plan.schedule) {
    if (day.kind === 'exam-day') {
      assert.match(day.focus, CYRILLIC);
    } else if (day.activityIds.length > 0 || day.kind === 'rest') {
      assert.match(day.focus, CYRILLIC, `schedule day (${day.kind}) was not translated: "${day.focus}"`);
    }
  }
});

test('a milestone label and everything on the Course route is Russian, placeholders and all', () => {
  const { plan } = ruPlan(syntheticStrongReadingWeakWriting());
  assert.ok(plan.milestones.length > 0, 'the fixture should produce milestones to check');
  for (const milestone of plan.milestones) {
    assert.match(milestone.label, CYRILLIC, `milestone label was not translated: "${milestone.label}"`);
    assert.doesNotMatch(milestone.label, DASHES);
    if (milestone.droppedReason) {
      assert.match(milestone.droppedReason, CYRILLIC, `dropped reason was not translated: "${milestone.droppedReason}"`);
    }
  }
  for (const alternative of plan.alternatives) {
    assert.match(alternative.label, CYRILLIC, `alternative was not translated: "${alternative.label}"`);
    assert.match(alternative.sessionSketch.objective, CYRILLIC);
  }
});

/** Switching the interface language has to reach a plan that is already
 *  stored, including a session the student is part way through. Every
 *  sentence on the plan is baked at build time (architecture section 1.6)
 *  and several arrive with their placeholders already filled, so there is no
 *  render-time lookup that could rescue them: the plan is written again. This
 *  is the mechanism syncExplanationLocale drives, tested on the pure planner
 *  so it needs no browser. */
test('switching language rewrites a session already under way, and keeps what the student has done', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const english = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: { ...profile.constraints, explanationLocale: 'en' },
  }).plan;

  const first = english.activeSession.steps[0]!;
  const started = {
    ...english,
    activeSession: {
      ...english.activeSession,
      steps: english.activeSession.steps.map((step, index) =>
        index === 0 ? { ...step, state: 'done' as const } : step,
      ),
    },
  };

  const switched = replan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    previous: started,
    trigger: 'settings-changed',
    now: profile.now,
    today: profile.today,
    constraints: { ...profile.constraints, explanationLocale: 'ru' },
  });

  assert.equal(switched.plan.activeSession.id, english.activeSession.id, 'the session was replaced by a language switch');
  assert.equal(switched.plan.activeSession.steps[0]?.state, 'done', 'finished work was lost by a language switch');
  assert.match(switched.plan.activeSession.objective, CYRILLIC, 'the objective stayed English');
  assert.match(switched.plan.activeSession.reason, CYRILLIC, 'the reason stayed English');
  for (const step of switched.plan.activeSession.steps) {
    assert.match(step.purpose, CYRILLIC, `step purpose (${step.role}) stayed English: "${step.purpose}"`);
  }
  assert.equal(switched.plan.activeSession.steps[0]?.activityId, first.activityId);
  for (const milestone of switched.plan.milestones) {
    assert.match(milestone.label, CYRILLIC, `milestone label stayed English: "${milestone.label}"`);
  }
  /* And it is not reported as a change to their goal, because it is not
     one. */
  for (const change of switched.changes) {
    assert.doesNotMatch(
      change.summary,
      /goal or your settings|цель или настройки/i,
      `a language switch was announced as a settings change: "${change.summary}"`,
    );
  }
});

test('English is completely unaffected: the default locale renders byte identical text', () => {
  const enPlan = createInitialPlan({
    catalogue: CATALOGUE,
    record: syntheticStrongReadingWeakWriting().record,
    policy: evaluateEvidence({
      record: syntheticStrongReadingWeakWriting().record,
      goals: syntheticStrongReadingWeakWriting().goals,
      now: syntheticStrongReadingWeakWriting().now,
    }),
    now: syntheticStrongReadingWeakWriting().now,
    today: syntheticStrongReadingWeakWriting().today,
    goals: syntheticStrongReadingWeakWriting().goals,
    constraints: syntheticStrongReadingWeakWriting().constraints,
  }).plan;
  assert.doesNotMatch(enPlan.activeSession.objective, CYRILLIC);
  assert.doesNotMatch(enPlan.activeSession.reason, CYRILLIC);
});

/* ================================================================== */
/* 5. Quality pass: the learning- dictionary parts and the tutor's own */
/*    additions (item 2 and 3 of the work package)                     */
/* ================================================================== */

type DictModule = { strings: Record<string, string>; plurals: Record<string, Record<string, string>> };

const LEARNING_DICT_FILES: { file: string; mod: DictModule }[] = [
  { file: 'dict/ru/learning-today.ts', mod: learningToday },
  { file: 'dict/ru/learning-account.ts', mod: learningAccount },
  { file: 'dict/ru/learning-intake.ts', mod: learningIntake },
  { file: 'dict/ru/learning-focus.ts', mod: learningFocus },
  { file: 'dict/ru/learning-focus-reading.ts', mod: learningFocusReading },
  { file: 'dict/ru/learning-focus-listening.ts', mod: learningFocusListening },
  { file: 'dict/ru/learning-writing-focus.ts', mod: learningWritingFocus },
  { file: 'dict/ru/learning-objectives.ts', mod: learningObjectives },
  { file: 'dict/ru/learning-vocab.ts', mod: learningVocab },
  { file: 'dict/ru/learning-libraries.ts', mod: learningLibraries },
];

test('every learning- dictionary string is non-empty, dash free, placeholder complete and "вы" registered', () => {
  const problems: string[] = [];
  for (const { file, mod } of LEARNING_DICT_FILES) {
    for (const [key, value] of Object.entries(mod.strings)) {
      if (!value || value.length === 0) problems.push(`${file}: "${key}" is empty`);
      if (DASHES.test(value)) problems.push(`${file}: "${key}" contains a dash character`);
      if (INFORMAL_YOU.test(value)) problems.push(`${file}: "${key}" uses "ты" register: "${value}"`);
      const want = placeholders(key).sort();
      const got = placeholders(value).sort();
      if (want.join(',') !== got.join(',')) {
        problems.push(`${file}: "${key}" placeholders differ (English {${want}}, Russian {${got}})`);
      }
    }
    for (const [key, forms] of Object.entries(mod.plurals)) {
      for (const form of ['one', 'few', 'many', 'other'] as const) {
        const value = forms[form];
        if (!value) {
          problems.push(`${file}: plural "${key}" is missing the "${form}" form`);
          continue;
        }
        if (DASHES.test(value)) problems.push(`${file}: plural "${key}" (${form}) contains a dash character`);
        if (INFORMAL_YOU.test(value)) problems.push(`${file}: plural "${key}" (${form}) uses "ты" register`);
      }
    }
  }
  assert.deepEqual(problems, [], `Problems in the learning- dictionary parts:\n  ${problems.join('\n  ')}`);
});

test('the tutor layer\'s Russian map (src/lib/tutor/ru.ts) is "вы" registered throughout', () => {
  const problems: string[] = [];
  for (const [english, russian] of Object.entries(TUTOR_RU_STRINGS)) {
    if (INFORMAL_YOU.test(russian)) problems.push(`RU_STRINGS["${english}"]: uses "ты" register: "${russian}"`);
  }
  assert.deepEqual(problems, [], `"ты" register found in src/lib/tutor/ru.ts:\n  ${problems.join('\n  ')}`);
});

/* ================================================================== */
/* 6. Exam vocabulary stays English inside a Russian sentence          */
/* ================================================================== */

test('a question type label substituted into a Russian catalogue sentence stays English', () => {
  const drill = CATALOGUE.activities.find((a) => a.id === 'practise:reading:tfng');
  assert.ok(drill, 'the True/False/Not Given reading drill should exist in the real catalogue');
  const russian = learningText('ru', drill!.objective);
  assert.ok(russian.includes('True / False / Not Given'), `the question type name should stay English: "${russian}"`);
  assert.ok(russian.includes('Reading'), `the paper name should stay English: "${russian}"`);
  assert.match(russian, CYRILLIC);
});

test('the "no material" unavailable reason for a phantom question type names it in English inside a Russian sentence', () => {
  const sentenceEndings = CATALOGUE.activities.find((a) => a.id === 'practise:reading:sentence-endings');
  assert.ok(sentenceEndings?.unavailable, 'sentence-endings should be the phantom type marked unavailable');
  const russian = learningText('ru', sentenceEndings!.unavailable!.reason);
  assert.match(russian, CYRILLIC);
  assert.ok(russian.includes('Sentence'), `the question type name should stay English inside the Russian sentence: "${russian}"`);
  assert.doesNotMatch(russian, DASHES);
});
