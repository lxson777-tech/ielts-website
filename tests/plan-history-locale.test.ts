/* Plan history follows the language on screen (combined platform review,
 * 2026-09-23, P2: Course history stayed English in Russian).
 *
 * The oracle is the planner itself: the same plan is built twice, once with
 * explanationLocale 'en' and once with 'ru', and every history sentence the
 * English plan wrote must translate to EXACTLY the sentence the Russian plan
 * wrote, and back. Nothing here is hand-written expected Russian.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan, PLANNER_SENTENCES, replan } from '../src/lib/learning/planner.ts';
import { learningText } from '../src/lib/learning/ru.ts';
import { planHistoryText } from '../src/lib/learning/plan-history.ts';
import type { PersonalPlanV1, PlanChange, PlanOverride, ReplanTrigger } from '../src/lib/learning/contracts/plan.ts';
import type { Locale } from '../src/lib/i18n/locale.ts';
import {
  syntheticMatchingHeadings,
  syntheticMissedWeek,
  syntheticNew,
  syntheticSevenDay,
  syntheticStrongReadingWeakWriting,
  syntheticStuck,
  syntheticWeakReadingStrongWriting,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

function initial(profile: LearnerProfile, locale: Locale): PersonalPlanV1 {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: { ...profile.constraints, explanationLocale: locale },
  }).plan;
}

function next(
  profile: LearnerProfile,
  previous: PersonalPlanV1,
  trigger: ReplanTrigger,
  newOverrides?: PlanOverride[],
): { plan: PersonalPlanV1; changes: readonly PlanChange[] } {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return replan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    previous,
    trigger,
    now: profile.now,
    today: profile.today,
    ...(newOverrides ? { newOverrides } : {}),
  });
}

/** Parallel English and Russian history sentences for one profile: the
    initial plan, a shorter day, and choosing another skill. */
function parallelHistory(profile: LearnerProfile): { en: string; ru: string }[] {
  const pairs: { en: string; ru: string }[] = [];
  const en0 = initial(profile, 'en');
  const ru0 = initial(profile, 'ru');
  en0.history.forEach((change, index) => pairs.push({ en: change.summary, ru: ru0.history[index]!.summary }));

  const shorter: PlanOverride = { kind: 'less-time-today', date: profile.today, minutes: 15, createdAt: profile.now };
  const en1 = next(profile, en0, 'student-override', [shorter]);
  const ru1 = next(profile, ru0, 'student-override', [shorter]);
  en1.changes.forEach((change, index) => pairs.push({ en: change.summary, ru: ru1.changes[index]!.summary }));

  const other: PlanOverride = { kind: 'chose-other-skill', date: profile.today, paper: 'speaking', createdAt: profile.now };
  const en2 = next(profile, en0, 'student-override', [other]);
  const ru2 = next(profile, ru0, 'student-override', [other]);
  en2.changes.forEach((change, index) => pairs.push({ en: change.summary, ru: ru2.changes[index]!.summary }));

  const settings = next(profile, en0, 'settings-changed');
  const settingsRu = next(profile, ru0, 'settings-changed');
  settings.changes.forEach((change, index) => pairs.push({ en: change.summary, ru: settingsRu.changes[index]!.summary }));
  return pairs;
}

const PROFILES = [
  syntheticNew(),
  syntheticStrongReadingWeakWriting(),
  syntheticWeakReadingStrongWriting(),
  syntheticMatchingHeadings(),
  syntheticSevenDay(),
  syntheticMissedWeek(),
  syntheticStuck(),
];

const ALL = PROFILES.flatMap((profile) => parallelHistory(profile).map((pair) => ({ ...pair, profile: profile.name })));

test('the scenarios produce real, different English and Russian history', () => {
  assert.ok(ALL.length >= PROFILES.length * 2, `only ${ALL.length} history sentences`);
  assert.ok(ALL.some((pair) => pair.en !== pair.ru), 'the planner wrote no Russian at all');
});

test('every English history sentence reads in Russian exactly as the planner writes it', () => {
  const wrong = ALL.filter((pair) => planHistoryText('ru', pair.en) !== pair.ru);
  assert.deepEqual(
    wrong.slice(0, 3).map((pair) => ({ profile: pair.profile, en: pair.en, got: planHistoryText('ru', pair.en), want: pair.ru })),
    [],
    `${wrong.length} of ${ALL.length} sentences did not translate`,
  );
});

test('and every Russian one reads back in English exactly', () => {
  const wrong = ALL.filter((pair) => planHistoryText('en', pair.ru) !== pair.en);
  assert.deepEqual(
    wrong.slice(0, 3).map((pair) => ({ profile: pair.profile, ru: pair.ru, got: planHistoryText('en', pair.ru), want: pair.en })),
    [],
    `${wrong.length} of ${ALL.length} sentences did not translate back`,
  );
});

test('a sentence already in the language on screen is unchanged', () => {
  for (const pair of ALL) {
    assert.equal(planHistoryText('en', pair.en), pair.en);
    assert.equal(planHistoryText('ru', pair.ru), pair.ru);
  }
});

test('text the planner did not write is shown exactly as stored', () => {
  for (const text of ['My own note about Tuesday.', 'Что-то своё.', '']) {
    assert.equal(planHistoryText('ru', text), text);
    assert.equal(planHistoryText('en', text), text);
  }
});

/* Every change template, not only the ones the scenarios above happen to
   reach: each is filled the way describeChanges fills it (whole catalogue
   objectives as clauses, a real reason sentence, a status label, a nested
   "dropped" sentence, short values elsewhere), once in English and once in
   Russian through the planner's own learningText, and must round-trip. */
test('every plan-change template round-trips between English and Russian', () => {
  const objectives = CATALOGUE.activities
    .map((activity) => activity.objective)
    .filter((objective) => learningText('ru', objective) !== objective)
    .slice(0, 40);
  assert.ok(objectives.length >= 10, 'too few translated catalogue objectives to test with');
  const clause = (locale: Locale, english: string) => learningText(locale, english).replace(/[.!?]$/, '');
  const reason = (locale: Locale) => learningText(locale, PLANNER_SENTENCES.reasonMeasuredGap, { correct: 3, items: 9, occasions: 2, paper: 'Reading' });
  const dropped = (locale: Locale) => learningText(locale, PLANNER_SENTENCES.changeDropped, { count: 2 });
  const failures: string[] = [];
  let checked = 0;
  for (const [key, template] of Object.entries(PLANNER_SENTENCES)) {
    if (!key.startsWith('change')) continue;
    objectives.forEach((objective, index) => {
      const other = objectives[(index + 7) % objectives.length]!;
      const varsFor = (locale: Locale) => ({
        objective: clause(locale, objective),
        from: clause(locale, objective),
        to: clause(locale, other),
        why: reason(locale),
        dropped: dropped(locale),
        status: learningText(locale, 'rebuilt after some missed days'),
        paper: 'Listening',
        minutes: 15,
        regular: 60,
        days: 3,
        count: 2,
        attempts: 4,
        label: 'test:listening-full-001',
      });
      const en = learningText('en', template, varsFor('en')).trim();
      const ru = learningText('ru', template, varsFor('ru')).trim();
      checked += 1;
      if (planHistoryText('ru', en) !== ru) failures.push(`${key} en->ru: ${en}`);
      if (planHistoryText('en', ru) !== en) failures.push(`${key} ru->en: ${ru}`);
    });
  }
  assert.ok(checked >= 12 * 10, `only ${checked} filled templates`);
  assert.deepEqual(failures.slice(0, 4), [], `${failures.length} of ${checked * 2} did not round-trip`);
});
