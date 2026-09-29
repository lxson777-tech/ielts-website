import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyDays,journeySkills,journeySteps,trialQuery,validJourney} from '../src/lib/journey-plan.ts';
import {questionnaireFromSearch,TRIAL_SECTIONS} from '../src/lib/trial/offer.ts';

test('three-day plans cover every skill, focus and time without promising a score',()=>{
 for(const skill of ['reading','listening','writing','speaking']) for(const focus of ['method','confidence']) for(const time of ['15','30','60']) {
  const answers={band:'7.5',skill,focus,time};
  assert.ok(validJourney(answers));
  const days=journeyDays(answers);
  assert.deepEqual(days.map(d=>d.day),[1,2,3]);
  assert.ok(days.every(d=>d.minutes===Number(time)&&d.outcome.length>20));
  assert.equal(new Set(days.map(d=>d.text)).size,3);
  assert.match(days[2].text,/fresh|different topic/);
  assert.equal(journeySteps(answers).reduce((sum,s)=>sum+Number(s.split(' ')[0]),0),Number(time));
 }
});
test('plans change with the selected skill and obstacle',()=>{
 const base={band:'7.5',skill:'speaking',focus:'method',time:'30'};
 assert.notEqual(journeyDays(base)[0].text,journeyDays({...base,focus:'confidence'})[0].text);
 assert.notEqual(journeyDays(base)[2].text,journeyDays({...base,skill:'writing'})[2].text);
 assert.equal(validJourney({...base,skill:'unknown'}),false);
});
test('every questionnaire answer reaches the trial page exactly as chosen', () => {
 for (const band of ['7', '7.5', '8']) for (const skill of ['reading', 'listening', 'writing', 'speaking']) for (const focus of ['method', 'confidence']) for (const time of ['15', '30', '60']) {
  const answers = { band, skill, focus, time };
  assert.ok(validJourney(answers));
  assert.deepEqual(questionnaireFromSearch(trialQuery(answers)), answers);
 }
 // The questionnaire offers exactly the trial's four sections.
 assert.deepEqual(Object.keys(journeySkills).sort(), [...TRIAL_SECTIONS].sort());
});
