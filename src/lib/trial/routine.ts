/* "Your suggested three days" on the trial's Today (audit F08, 29 September
   2026).

   The public questionnaire promises a Day 1, Day 2 and Day 3 routine. The
   answers already reach the server with the trial (trial_state's
   `questionnaire`); this turns them back into the SAME three days, by
   calling the sales page's own generator (src/lib/journey-plan.ts), and
   points each day only at something the trial opens: the section's lesson,
   the practice inside that lesson, and the section's one test.

   Nothing new is scheduled and nothing new is allowed: no second test, no
   trainer, no timer. Day 3's fresh attempt IS the section's included test,
   which is a timed sitting of its own, so its length is given separately
   from the daily minutes the student chose.

   Pure: no browser. The component translates the English it is handed; the
   Russian for every sentence the generator can produce is checked by
   tests/trial-routine.test.ts. */

import { journeyDays, type JourneyAnswers } from '../journey-plan';
import { nt } from '../i18n/translate';
import { TRIAL_OFFER, TRIAL_TEST_MINUTES, type TrialQuestionnaire, type TrialSection } from './offer';

export type RoutineLinkKind = 'lesson' | 'practice' | 'test';

export interface RoutineDay {
  day: number;
  /** English, from the questionnaire's generator. */
  title: string;
  text: string;
  outcome: string;
  /** Minutes this day takes: the chosen daily time, or the test's length. */
  minutes: number;
  /** True for the timed test, a separate sitting from daily practice. */
  timed: boolean;
  link: { kind: RoutineLinkKind; href: string };
  /** Where in the linked page the day's work is, in English. */
  where: string | null;
}

export interface TrialRoutine {
  section: TrialSection;
  dailyMinutes: number;
  testMinutes: number;
  /** True when the timed test is longer than the chosen daily time. */
  testLongerThanDaily: boolean;
  days: RoutineDay[];
}

/** Where each section's supported practice is, inside its included lesson. */
export const PRACTICE_WHERE: Record<TrialSection, string> = {
  reading: nt('The practice questions are at the end of the lesson.'),
  listening: nt('The practice questions are at the end of the lesson.'),
  writing: nt('Use the method and the Band 8 example in the lesson as your support.'),
  speaking: nt('Use the practice questions in the lesson. Answer them out loud, then compare with the lesson’s advice.'),
};

export function trialRoutine(q: TrialQuestionnaire | null): TrialRoutine | null {
  if (!q) return null;
  const answers: JourneyAnswers = { band: q.band, skill: q.skill, focus: q.focus, time: q.time };
  const generated = journeyDays(answers);
  if (generated.length !== 3) return null;
  const offer = TRIAL_OFFER[q.skill];
  const dailyMinutes = Number(q.time);
  const testMinutes = TRIAL_TEST_MINUTES[q.skill];
  const links: RoutineDay['link'][] = [
    { kind: 'lesson', href: offer.lessonHref },
    { kind: 'practice', href: offer.lessonHref },
    { kind: 'test', href: offer.testHref },
  ];
  return {
    section: q.skill,
    dailyMinutes,
    testMinutes,
    testLongerThanDaily: testMinutes > dailyMinutes,
    days: generated.map((day, index) => ({
      day: day.day,
      title: day.title,
      text: day.text,
      outcome: day.outcome,
      minutes: index === 2 ? testMinutes : day.minutes,
      timed: index === 2,
      link: links[index],
      where: index === 1 ? PRACTICE_WHERE[q.skill] : null,
    })),
  };
}
