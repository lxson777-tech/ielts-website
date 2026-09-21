/* The Russian dictionary: every batch file merged into one object.

   Split by batch so five parallel translation agents never edit the same
   file. Adding a batch is one import and one entry in each spread below.

   If two batches translate the same English key differently, the merge here
   silently keeps the last one — which is why tests/i18n.test.ts fails on a
   conflicting duplicate and tells you which files disagree. The fix for a
   genuine conflict is a `ctx` on one of the two call sites, not a rename. */

import * as shell from './shell';
import * as dashboardPlan from './dashboard-plan';
import * as courseLessons from './course-lessons';
import * as courseData from './course-data';
import * as testsPlayer from './tests-player';
import * as trainersWritingSpeaking from './trainers-writing-speaking';
import * as accountAuthVocab from './account-auth-vocab';
import * as tutor from './tutor';
import * as pages from './pages';
import * as trainersDrills from './trainers-drills';
import * as learningIntake from './learning-intake';
import * as learningToday from './learning-today';
import * as learningAccount from './learning-account';
import * as learningFocus from './learning-focus';

/** Every batch module, in merge order. The test imports this same list. */
export const BATCHES = [
  shell,
  dashboardPlan,
  courseLessons,
  courseData,
  testsPlayer,
  trainersWritingSpeaking,
  accountAuthVocab,
  tutor,
  pages,
  trainersDrills,
  learningIntake,
  learningToday,
  learningAccount,
  learningFocus,
];

export const strings: Record<string, string> = Object.assign({}, ...BATCHES.map((b) => b.strings));

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = Object.assign(
  {},
  ...BATCHES.map((b) => b.plurals),
);
