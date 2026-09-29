/* "Your suggested three days" on the trial's Today (src/lib/trial/routine.ts,
 * audit F08). The routine is the questionnaire's own generator
 * (src/lib/journey-plan.ts), mapped only to what the trial opens: the
 * section's lesson, the practice inside it, and the section's one test. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { journeyDays } from '../src/lib/journey-plan.ts';
import { TRIAL_OFFER, TRIAL_TEST_MINUTES, cleanQuestionnaire, type TrialQuestionnaire } from '../src/lib/trial/offer.ts';
import { PRACTICE_WHERE, trialRoutine } from '../src/lib/trial/routine.ts';
import { strings as ru } from '../src/lib/i18n/dict/ru/index.ts';

function every(): TrialQuestionnaire[] {
  const out: TrialQuestionnaire[] = [];
  for (const band of ['7', '7.5', '8']) for (const skill of ['reading', 'listening', 'writing', 'speaking']) for (const focus of ['method', 'confidence']) for (const time of ['15', '30', '60']) {
    out.push(cleanQuestionnaire({ band, skill, focus, time })!);
  }
  return out;
}

test('no questionnaire, no routine (nothing is made up for a student who skipped it)', () => {
  assert.equal(trialRoutine(null), null);
});

test('the three days are the sales page’s own, unchanged', () => {
  for (const q of every()) {
    const routine = trialRoutine(q)!;
    const sales = journeyDays(q);
    assert.deepEqual(routine.days.map((d) => [d.day, d.title, d.text, d.outcome]), sales.map((d) => [d.day, d.title, d.text, d.outcome]));
    assert.equal(routine.days[0].minutes, Number(q.time));
    assert.equal(routine.days[1].minutes, Number(q.time));
  }
});

test('every step links only to something the trial includes for that section', () => {
  for (const q of every()) {
    const routine = trialRoutine(q)!;
    const offer = TRIAL_OFFER[q.skill];
    const allowed = new Set([offer.lessonHref, offer.testHref]);
    for (const day of routine.days) assert.ok(allowed.has(day.link.href), `${q.skill} day ${day.day}: ${day.link.href}`);
    assert.deepEqual(routine.days.map((d) => d.link.kind), ['lesson', 'practice', 'test']);
    assert.equal(routine.days[2].link.href, offer.testHref);
    // No trainer, no other paper.
    for (const day of routine.days) assert.doesNotMatch(day.link.href, /trainers|reading-full-0(?!01)|listening-full-0(?!01)/);
  }
});

test('the timed test is kept apart from daily practice, with its real length', () => {
  const reading = trialRoutine(cleanQuestionnaire({ band: '7', skill: 'reading', focus: 'method', time: '15' }))!;
  assert.equal(reading.testMinutes, 60);
  assert.equal(reading.testLongerThanDaily, true);
  assert.equal(reading.days[2].timed, true);
  assert.equal(reading.days[2].minutes, 60);
  assert.ok(reading.days.slice(0, 2).every((d) => !d.timed));
  const speaking = trialRoutine(cleanQuestionnaire({ band: '7', skill: 'speaking', focus: 'confidence', time: '15' }))!;
  assert.equal(speaking.testMinutes, TRIAL_TEST_MINUTES.speaking);
  assert.equal(speaking.testLongerThanDaily, false);
  assert.equal(trialRoutine(cleanQuestionnaire({ band: '8', skill: 'reading', focus: 'method', time: '60' }))!.testLongerThanDaily, false);
});

test('only Day 2 says where the practice is, inside the lesson', () => {
  for (const q of every()) {
    const days = trialRoutine(q)!.days;
    assert.equal(days[0].where, null);
    assert.equal(days[1].where, PRACTICE_WHERE[q.skill]);
    assert.equal(days[2].where, null);
  }
});

test('every sentence the routine can show has Russian', () => {
  const missing = new Set<string>();
  for (const q of every()) {
    for (const day of trialRoutine(q)!.days) {
      for (const text of [day.title, day.text, day.outcome, day.where]) if (text && !ru[text]) missing.add(text);
    }
  }
  assert.deepEqual([...missing], []);
});

test('the minutes a Russian sentence can carry all take the same plural form', () => {
  // "около {minutes} минут": every value shown is a "many" number in Russian.
  const rules = new Intl.PluralRules('ru');
  const values = new Set<number>([15, 30, 60, ...Object.values(TRIAL_TEST_MINUTES)]);
  for (const n of values) assert.equal(rules.select(n), 'many', String(n));
});
