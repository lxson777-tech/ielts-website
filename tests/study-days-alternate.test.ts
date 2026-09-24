/* "Every other day" as a real schedule rule (24 September 2026).
 *
 * What these pin:
 *   1. the rule itself: the anchor day is a study day, the next is not, the
 *      one after is, in both directions and across month, year and
 *      daylight-saving boundaries;
 *   2. a rest-day override still wins over it;
 *   3. an 'alternate' plan with no anchor counts every day, never no day;
 *   4. plans saved BEFORE this change (no 'alternate', no anchor) behave
 *      exactly as they did: 'daily', 'weekdays' and 'custom' are compared day
 *      by day against a copy of the previous isStudyDay, and an old plan
 *      round-trips through the real store unchanged;
 *   5. code older than this change reads an 'alternate' plan as every day
 *      (the seven-day customStudyDays fallback), not as no study days;
 *   6. the planner's own deadline maths counts it: seven days to the exam
 *      on "every other day" is four study days, not seven, and the schedule
 *      marks the days between as rest days;
 *   7. the old study-plan copy records it as 'daily';
 *   8. a sync conflict still resolves by PLAN_CONFLICT_RULE alone, whether
 *      or not either side carries the new fields.
 *
 * Every plan and profile here is SYNTHETIC.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import {
  addLocalDays,
  createInitialPlan,
  defaultPlanConstraints,
  isAlternateStudyDay,
  isStudyDay,
} from '../src/lib/learning/planner.ts';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { derivedSavedPlan } from '../src/lib/learning/adapters.ts';
import { resolvePlanConflict } from '../src/lib/learning/sync.browser.ts';
import { createPlanStore, personalPlanKey, userOwner } from '../src/lib/learning/store.browser.ts';
import type { PersonalPlanV1, PlanConstraints, PlanOverride } from '../src/lib/learning/contracts/plan.ts';
import { buildConstraints } from '../src/components/learning/intake/logic.ts';
import { PROFILE_TODAY, syntheticSevenDay, type LearnerProfile } from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();
const ANCHOR = '2026-09-24';

function alternate(anchor: string | null = ANCHOR): PlanConstraints {
  return defaultPlanConstraints({
    studyDays: 'alternate',
    customStudyDays: [0, 1, 2, 3, 4, 5, 6],
    ...(anchor ? { alternateAnchor: anchor } : {}),
  });
}

/** isStudyDay exactly as it was before 24 September 2026, copied here so the
    comparison cannot drift with the code under test. */
function previousIsStudyDay(date: string, constraints: PlanConstraints, overrides: readonly PlanOverride[]): boolean {
  if (overrides.some((override) => override.kind === 'rest-day' && override.date === date)) return false;
  if (constraints.studyDays === 'daily') return true;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  const day = Number.isNaN(parsed) ? 0 : new Date(parsed).getUTCDay();
  if (constraints.studyDays === 'weekdays') return day >= 1 && day <= 5;
  return (constraints.customStudyDays ?? []).includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6);
}

/* ── 1. The rule ─────────────────────────────────────────────────────────── */

test('the day "every other day" was chosen is a study day, the next is not, the one after is', () => {
  const c = alternate();
  assert.equal(isStudyDay(ANCHOR, c, []), true, 'anchor day');
  assert.equal(isStudyDay('2026-09-25', c, []), false, 'the next day rests');
  assert.equal(isStudyDay('2026-09-26', c, []), true, 'the day after studies');
  assert.equal(isStudyDay('2026-09-27', c, []), false);
  assert.equal(isStudyDay('2026-09-23', c, []), false, 'the day before the anchor rests');
  assert.equal(isStudyDay('2026-09-22', c, []), true, 'two days before the anchor studies');
});

test('the rhythm holds across a month end, a year end and a leap day', () => {
  const c = alternate('2026-09-30');
  assert.equal(isStudyDay('2026-10-01', c, []), false);
  assert.equal(isStudyDay('2026-10-02', c, []), true);
  /* 92 days from 30 September is 31 December: even, a study day. */
  assert.equal(isStudyDay('2026-12-31', c, []), true);
  assert.equal(isStudyDay('2027-01-01', c, []), false);
  const leap = alternate('2028-02-28');
  assert.equal(isStudyDay('2028-02-29', leap, []), false);
  assert.equal(isStudyDay('2028-03-01', leap, []), true);
});

test('a daylight-saving weekend does not shift the rhythm (days are counted as calendar days)', () => {
  /* Europe moved its clocks on 29 March 2026 and 25 October 2026. The keys
     are calendar days, so neither change can make a day count twice. */
  const spring = alternate('2026-03-28');
  assert.deepEqual(
    ['2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'].map((d) => isStudyDay(d, spring, [])),
    [true, false, true, false],
  );
  const autumn = alternate('2026-10-24');
  assert.deepEqual(
    ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'].map((d) => isStudyDay(d, autumn, [])),
    [true, false, true, false],
  );
});

test('over four weeks, exactly every second day is a study day', () => {
  const c = alternate();
  const days = Array.from({ length: 28 }, (_, i) => addLocalDays(ANCHOR, i));
  const pattern = days.map((d) => isStudyDay(d, c, []));
  assert.deepEqual(
    pattern,
    days.map((_, i) => i % 2 === 0),
  );
  assert.equal(pattern.filter(Boolean).length, 14);
});

/* ── 2. Overrides still win ──────────────────────────────────────────────── */

test('a rest-day override on an "every other day" study day still makes it a rest day', () => {
  const c = alternate();
  const overrides: PlanOverride[] = [
    { kind: 'rest-day', date: '2026-09-26', createdAt: '2026-09-24T08:00:00.000Z' } as PlanOverride,
  ];
  assert.equal(isStudyDay('2026-09-26', c, []), true, 'a study day without the override');
  assert.equal(isStudyDay('2026-09-26', c, overrides), false, 'the override wins');
  assert.equal(isStudyDay('2026-09-28', c, overrides), true, 'and only on its own date');
});

/* ── 3. No anchor: every day, never no day ───────────────────────────────── */

test('an "every other day" plan with no anchor, or an unreadable one, counts every day', () => {
  const noAnchor = alternate(null);
  const garbled = defaultPlanConstraints({ studyDays: 'alternate', alternateAnchor: 'not-a-date' });
  for (let i = 0; i < 14; i += 1) {
    const day = addLocalDays(ANCHOR, i);
    assert.equal(isStudyDay(day, noAnchor, []), true, `${day} with no anchor`);
    assert.equal(isStudyDay(day, garbled, []), true, `${day} with a garbled anchor`);
  }
  assert.equal(isAlternateStudyDay('2026-09-25', undefined), true);
});

/* ── 4. Plans from before this change ────────────────────────────────────── */

test('"daily", "weekdays" and "custom" plans without the new fields behave exactly as before', () => {
  const variants: PlanConstraints[] = [
    defaultPlanConstraints({ studyDays: 'daily' }),
    defaultPlanConstraints({ studyDays: 'weekdays' }),
    defaultPlanConstraints({ studyDays: 'custom', customStudyDays: [2, 4] }),
    defaultPlanConstraints({ studyDays: 'custom', customStudyDays: [] }),
    defaultPlanConstraints({ studyDays: 'custom' }),
  ];
  const overrides: PlanOverride[] = [
    { kind: 'rest-day', date: '2026-09-29', createdAt: '2026-09-24T08:00:00.000Z' } as PlanOverride,
  ];
  for (const c of variants) {
    assert.equal('alternateAnchor' in c, false, 'an old plan has no anchor field at all');
    for (let i = -10; i < 60; i += 1) {
      const day = addLocalDays(ANCHOR, i);
      for (const o of [[], overrides]) {
        assert.equal(
          isStudyDay(day, c, o),
          previousIsStudyDay(day, c, o),
          `${c.studyDays} ${JSON.stringify(c.customStudyDays)} on ${day}`,
        );
      }
    }
  }
});

test('an old plan (no new fields) round-trips through the real store and a no-change intake save, byte for byte', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  const owner = userOwner('synthetic-old-plan');
  const profile = syntheticSevenDay({ constraints: { studyDays: 'weekdays' } });
  const { plan } = planFor(profile);
  const old: PersonalPlanV1 = { ...plan, confirmed: true };
  assert.equal('alternateAnchor' in old.constraints, false);

  const written = createPlanStore({ storage, owner, legacyPlan: { read: () => null, write: () => {} } });
  written.save(old);
  const raw = data.get(personalPlanKey(owner));
  assert.ok(raw, 'the plan was written under its owner');

  const reread = createPlanStore({ storage, owner, legacyPlan: { read: () => null, write: () => {} } }).read();
  assert.ok(reread);
  assert.equal(JSON.stringify(reread.constraints), JSON.stringify(old.constraints), 'constraints read back unchanged');

  const resaved = buildConstraints(reread.constraints, {});
  assert.equal(JSON.stringify(resaved), JSON.stringify(old.constraints), 'a save that answered nothing changes nothing');
  const sameDays = buildConstraints(reread.constraints, { studyDays: 'weekdays' });
  assert.equal(JSON.stringify(sameDays), JSON.stringify(old.constraints), 're-sending the same days changes nothing');
});

/* ── 5. Older code reading a new plan ────────────────────────────────────── */

test('code from before this change reads an "every other day" plan as every day, never as no day', () => {
  const c = alternate();
  for (let i = 0; i < 14; i += 1) {
    const day = addLocalDays(ANCHOR, i);
    assert.equal(previousIsStudyDay(day, c, []), true, `${day} under the previous code`);
  }
});

/* ── 6. The planner's deadline maths ─────────────────────────────────────── */

function planFor(profile: LearnerProfile) {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });
}

test('seven days to the exam on "every other day" is four study days in the honest scope note, not seven', () => {
  const everyDay = planFor(syntheticSevenDay()).plan;
  const everyOther = planFor(
    syntheticSevenDay({
      constraints: { studyDays: 'alternate', alternateAnchor: PROFILE_TODAY, customStudyDays: [0, 1, 2, 3, 4, 5, 6] },
    }),
  ).plan;

  assert.match(everyDay.scopeNote ?? '', /There are 7 study days left and 15 minutes a day, which is about 105 minutes/);
  assert.match(
    everyOther.scopeNote ?? '',
    /There are 4 study days left and 15 minutes a day, which is about 60 minutes/,
    'offsets 0, 2, 4 and 6 of the seven days before the exam',
  );
});

test('the schedule marks the days between as rest days', () => {
  const { plan } = planFor(
    syntheticSevenDay({
      constraints: { studyDays: 'alternate', alternateAnchor: PROFILE_TODAY, customStudyDays: [0, 1, 2, 3, 4, 5, 6] },
    }),
  );
  const exam = plan.goals.examDate?.date;
  for (const day of plan.schedule) {
    if (day.date === exam) continue;
    const offset = Math.round((Date.parse(`${day.date}T00:00:00Z`) - Date.parse(`${PROFILE_TODAY}T00:00:00Z`)) / 86_400_000);
    if (offset % 2 === 0) assert.notEqual(day.kind, 'rest', `${day.date} (offset ${offset}) is a study day`);
    else assert.equal(day.kind, 'rest', `${day.date} (offset ${offset}) rests`);
  }
});

/* ── 7. The old study-plan copy ──────────────────────────────────────────── */

test('the old study-plan copy records "every other day" as every day', () => {
  const { plan } = planFor(
    syntheticSevenDay({
      constraints: { studyDays: 'alternate', alternateAnchor: PROFILE_TODAY, customStudyDays: [0, 1, 2, 3, 4, 5, 6] },
    }),
  );
  const saved = derivedSavedPlan({ ...plan, confirmed: true }, null);
  assert.ok(saved);
  assert.equal(saved.studyDays, 'daily');
});

/* ── 8. Sync conflicts ───────────────────────────────────────────────────── */

test('a sync conflict is decided by PLAN_CONFLICT_RULE alone, with or without the new fields', () => {
  const base = planFor(syntheticSevenDay()).plan;
  const localNew: PersonalPlanV1 = {
    ...base,
    confirmed: true,
    revision: 3,
    constraints: { ...base.constraints, studyDays: 'alternate', alternateAnchor: ANCHOR, customStudyDays: [0, 1, 2, 3, 4, 5, 6] },
  };
  const serverOld: PersonalPlanV1 = { ...base, confirmed: true, revision: 5 };

  /* The account holds a newer plan from a device without the new fields:
     it wins, and nothing of the losing plan's schedule is carried into it. */
  const lost = resolvePlanConflict(localNew, serverOld);
  assert.equal(lost.winner, 'server');
  assert.equal(lost.plan?.constraints.studyDays, base.constraints.studyDays);
  assert.equal('alternateAnchor' in (lost.plan?.constraints ?? {}), false);

  /* And the other way round: the newer "every other day" plan wins intact. */
  const won = resolvePlanConflict({ ...serverOld, revision: 2 }, { ...localNew, revision: 6 });
  assert.equal(won.winner, 'server');
  assert.equal(won.plan?.constraints.studyDays, 'alternate');
  assert.equal(won.plan?.constraints.alternateAnchor, ANCHOR);
});
