/* One session, three surfaces, one answer.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-adapters.test.ts
 * The whole suite is `npm test`.
 *
 * THE REGRESSION THIS FILE EXISTS FOR
 * From the audit (docs/audits/personal-learning-plan-2026-09-21.md,
 * reproduced example 1): with a confirmed Band 7 goal and two Reading
 * attempts holding 2 of 16 correct Matching Headings answers, Mr EZ chose
 * Matching Headings, Today chose the Speaking Overview and Part 1
 * Interview, and the course card chose the Speaking Overview. Three engines,
 * three answers, one screen. The first test below is that exact learner, and
 * it asserts the three now name the SAME activity: before the student does
 * anything, after they finish a step, and after they go and do something
 * else entirely.
 *
 * Also here: the three other reproduced findings these adapters own. A
 * target that changes nothing (example 2), a day that does not fit its own
 * budget (example 3), and an expired plan that reads as finished
 * (example 5).
 *
 * Every learner is SYNTHETIC and comes from tests/fixtures/learning-profiles.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCourse, courseStatus } from '../src/lib/course.ts';
import { getTodayPlan } from '../src/lib/plan/schedule.ts';
import { recommendNext } from '../src/lib/tutor/recommend.ts';
import { readInsights } from '../src/lib/tutor/insights.ts';
import { courseLessonCount } from '../src/lib/course.ts';
import {
  configureLearning,
  ensurePlan,
  getCurrentSession,
  markStepDone,
  onEvidenceRecorded,
  resetLearningForTest,
} from '../src/lib/learning/index.ts';
import {
  currentSharedSession,
  lessonMapsFor,
  stepHref,
  tutorActivityIdFor,
  type SharedStepView,
} from '../src/lib/learning/adapters.ts';
import { findActivity, learningCatalogue, lessonBlockFor } from '../src/lib/learning/catalog.ts';
import { segmentLessonBody } from '../src/lib/learning/lesson-blocks.ts';
import { readEnglish } from '../tools/lesson-ru-lib.mjs';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan } from '../src/lib/learning/planner.ts';
import { getLearnerStore, learnerRecordKey, lessonMapsFrom, userOwner, type BrowserStorage } from '../src/lib/learning/store.browser.ts';
import { findActivity as findTutorActivity } from '../src/lib/tutor/catalog.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import type { ProgressV1 } from '../src/lib/progress.ts';
import type { SavedPlan } from '../src/lib/study-plan.ts';
import {
  PROFILE_TODAY,
  daysAfter,
  daysBefore,
  syntheticExpired,
  syntheticMatchingHeadings,
  syntheticNew,
  syntheticNoGoalReadingHistory,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();
const LESSON_TOTAL = courseLessonCount(buildCourse());
const NOW = `${PROFILE_TODAY}T09:00:00.000Z`;

/* ------------------------------------------------------------------ */
/* A browser, in nine lines of memory                                  */
/* ------------------------------------------------------------------ */

function memoryStore(seed: Record<string, string> = {}): BrowserStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function emptyProgress(): ProgressV1 {
  return { version: 1, lessons: {}, tests: {}, writing: {}, speaking: [], activity: {} };
}

/** The old study plan this learner would have saved, so the goals the
    fixture carries reach the plan the way they really would. */
function savedPlanFor(profile: LearnerProfile): SavedPlan {
  return {
    targetBand: (profile.goals.overallTarget?.band ?? 7).toFixed(1),
    testDate: profile.goals.examDate?.date ?? '',
    createdAt: `${daysBefore(30, profile.today)}T08:00:00.000Z`,
    startDate: daysBefore(30, profile.today),
    done: [],
    doneKeys: [],
    dailyMinutes: 60,
    studyDays: 'daily',
  };
}

/** Put one synthetic learner into a browser and wire both stores onto it,
    so courseStatus, getTodayPlan and recommendNext all read the same
    persisted plan the way they do on a real /dashboard. */
function seed(profile: LearnerProfile): { saved: SavedPlan; record: LearnerRecordV1 } {
  resetLearningForTest();
  const owner = userOwner('synthetic-audit');
  /* A record with its migration stamp already on it, so the one-time
     migration of the old stores does not run over the top of it. */
  const record: LearnerRecordV1 = {
    ...profile.record,
    migration: {
      migrationVersion: 1,
      at: NOW,
      lessonsMigrated: 0,
      testAttemptsMigrated: 0,
      writingAttemptsMigrated: 0,
      speakingAttemptsMigrated: 0,
      planStepsMigrated: 0,
      lessonsWithoutSubskill: 0,
      skipped: [],
    },
  };
  const saved = savedPlanFor(profile);
  const storage = memoryStore({ [learnerRecordKey(owner)]: JSON.stringify(record) });
  let legacy: SavedPlan | null = saved;
  configureLearning({
    storage,
    owner,
    catalogue: CATALOGUE,
    now: () => profile.now,
    today: () => profile.today,
    legacy: () => ({ progress: emptyProgress(), plan: legacy }),
    legacyPlan: {
      read: () => legacy,
      write: (next) => {
        legacy = next;
      },
    },
  });
  return { saved, record };
}

/** What each of the three surfaces says the next activity is. */
function threeAnswers(saved: SavedPlan) {
  const progress = emptyProgress();
  const course = courseStatus(buildCourse(), progress);
  const today = getTodayPlan(saved, progress, new Date(NOW));
  const insights = readInsights(progress, saved, LESSON_TOTAL, new Date(NOW));
  const rec = recommendNext(insights, progress);
  return {
    course: course.session?.activityId ?? null,
    today: today?.nextActivityId ?? null,
    tutor: rec.plannedActivityId,
    courseLesson: course.next?.key ?? null,
    todayStatus: today?.status ?? null,
    todayFinished: today?.finished ?? null,
    todayMinutes: (today?.items ?? []).reduce((total, item) => total + item.minutes, 0),
    recommendation: rec,
  };
}

test.afterEach(() => resetLearningForTest());

/* ------------------------------------------------------------------ */
/* 1. The audit's contradiction, reproduced as a regression            */
/* ------------------------------------------------------------------ */

test('regression: Today, the course card and Mr EZ name the same activity', () => {
  const profile = syntheticMatchingHeadings();
  const { saved } = seed(profile);

  const before = threeAnswers(saved);
  assert.ok(before.course, 'the course card reads the shared session');
  assert.equal(before.today, before.course, 'Today and the course card agree');
  assert.equal(before.tutor, before.course, 'and so does Mr EZ');

  /* The plan really is about the thing the evidence names. */
  const session = getCurrentSession();
  assert.equal(session.objectiveScope, 'subskill:reading:matching-headings');
  assert.match(session.reason, /on your own across/, 'and it says what was counted');

  /* After the student finishes the step they were on. */
  markStepDone(session.steps[0]!.stepId);
  const afterStep = threeAnswers(saved);
  assert.notEqual(afterStep.course, before.course, 'the session moved on');
  assert.equal(afterStep.today, afterStep.course, 'Today and the course card still agree');
  assert.equal(afterStep.tutor, afterStep.course, 'and so does Mr EZ');

  /* After a voluntary activity somewhere else entirely. Direct entry into a
     lesson from /learn is normal, it updates the record, and it must not
     create a second plan or split the three answers apart. */
  getLearnerStore().recordLessonStudied({ lessonKey: 'speaking-part1', at: profile.now, subskill: 'fluency-repair' });
  onEvidenceRecorded();
  const afterVoluntary = threeAnswers(saved);
  assert.equal(afterVoluntary.today, afterVoluntary.course);
  assert.equal(afterVoluntary.tutor, afterVoluntary.course);
  assert.equal(
    afterVoluntary.course,
    afterStep.course,
    'a lesson opened voluntarily is studied, not measured, so it does not move the session',
  );
});

test('the session teaches before it drills, and stops teaching once it has', () => {
  const profile = syntheticMatchingHeadings();
  seed(profile);
  const session = getCurrentSession();

  const roles = session.steps.map((step) => step.role);
  const teachAt = roles.indexOf('teach');
  const practiseAt = roles.indexOf('practise');
  assert.ok(teachAt >= 0 && practiseAt >= 0, 'a session for a weak type teaches and then practises');
  assert.ok(teachAt < practiseAt, 'reading about a type you have never been taught beats grinding questions on it');

  /* Finish the teaching, and the next thing Mr EZ names is the practice. */
  for (const step of session.steps.filter((entry) => entry.role === 'teach')) markStepDone(step.stepId);
  const rec = recommendNext(readInsights(emptyProgress(), null, LESSON_TOTAL, new Date(NOW)), emptyProgress());
  assert.equal(rec.plannedActivityId, session.steps[practiseAt]!.activityId);
  assert.equal(rec.activity.href, '/trainers/reading?type=matching-headings', 'and it is a real, filtered drill page');
});

test('regression: with no goal set, the weekly card names the same activity as the shared session, never the retired course wording', () => {
  // The fix round's reproduction: fresh storage (no goal, no exam date) plus
  // two old Reading attempts was enough to make Mr EZ's recommendation card
  // on /report name a lesson ("Listening Overview, 8 min") with the retired
  // fixed-course engine's own reason ("the course is ordered so each lesson
  // builds..."), while the SAME page's "today's focus" line, built from the
  // same shared session, named a different activity entirely.
  const profile = syntheticNoGoalReadingHistory();
  const { saved } = seed(profile);

  const session = getCurrentSession();
  const insights = readInsights(emptyProgress(), saved, LESSON_TOTAL, new Date(NOW));
  const rec = recommendNext(insights, emptyProgress());

  assert.equal(rec.plannedActivityId, session.activityId, 'Mr EZ names the same activity as the shared session');
  assert.doesNotMatch(
    rec.fallbackReason,
    /ordered so each lesson|course is ordered|next in the course/i,
    'never the retired fixed-course wording',
  );
  assert.match(
    rec.fallbackReason,
    /today's session/,
    "worded as the session's next step, the same phrasing the report's own next-step line uses",
  );
});

/* ------------------------------------------------------------------ */
/* 2. The other reproduced findings these adapters own                 */
/* ------------------------------------------------------------------ */

test('regression: an expired plan asks for a new date, and never reports finished', () => {
  const profile = syntheticExpired();
  const { saved } = seed(profile);
  const answers = threeAnswers(saved);

  assert.equal(answers.todayStatus, 'date-passed');
  assert.equal(answers.todayFinished, false, 'a passed date is not a finished course');
  assert.equal(answers.today, 'tool:plan', 'it asks for a new date or a new goal');
  assert.equal(answers.tutor, answers.today, 'and Mr EZ says the same');
  assert.equal(answers.recommendation.rule, 'plan-date-passed');
  assert.match(answers.recommendation.fallbackReason, /has passed/);
});

test('regression: a fifteen-minute day is a fifteen-minute day', () => {
  const profile = syntheticNew({
    goals: { overallTarget: { band: 7, status: 'confirmed' }, examDate: { date: daysAfter(7), status: 'confirmed' } },
    constraints: { regularDailyMinutes: 15, regularDailyMinutesStatus: 'confirmed' },
  });
  const { saved } = seed(profile);
  /* The saved plan the adapters read their budget from has to say fifteen
     too, or this would be testing the fixture rather than the plan. */
  const withBudget: SavedPlan = { ...saved, dailyMinutes: 15, testDate: daysAfter(7) };
  resetLearningForTest();
  seedWith(profile, withBudget);

  const answers = threeAnswers(withBudget);
  assert.ok(answers.todayMinutes <= 15, `the audit found a 255-minute day, this one is ${answers.todayMinutes}`);
  assert.equal(answers.today, answers.course);
  assert.equal(answers.tutor, answers.course);
});

test('regression: changing the target changes what Today names', () => {
  const profile = syntheticMatchingHeadings();
  const low = seedWith(profile, { ...savedPlanFor(profile), targetBand: '6.0', skillTargets: { reading: '5.5' } });
  const lowAnswer = getCurrentSession().objectiveScope;

  resetLearningForTest();
  const high = seedWith(profile, { ...savedPlanFor(profile), targetBand: '9.0', skillTargets: { writing: '9.0', speaking: '9.0' } });
  const highAnswer = getCurrentSession().objectiveScope;

  assert.ok(low.targetBand !== high.targetBand);
  assert.notEqual(lowAnswer, highAnswer, 'the target the student is aiming at changes the priorities');
});

/** seed(), with the old study plan spelled out rather than derived. */
function seedWith(profile: LearnerProfile, saved: SavedPlan): SavedPlan {
  resetLearningForTest();
  const owner = userOwner('synthetic-audit');
  const record: LearnerRecordV1 = {
    ...profile.record,
    migration: {
      migrationVersion: 1,
      at: NOW,
      lessonsMigrated: 0,
      testAttemptsMigrated: 0,
      writingAttemptsMigrated: 0,
      speakingAttemptsMigrated: 0,
      planStepsMigrated: 0,
      lessonsWithoutSubskill: 0,
      skipped: [],
    },
  };
  const storage = memoryStore({ [learnerRecordKey(owner)]: JSON.stringify(record) });
  let legacy: SavedPlan | null = saved;
  configureLearning({
    storage,
    owner,
    catalogue: CATALOGUE,
    now: () => profile.now,
    today: () => profile.today,
    legacy: () => ({ progress: emptyProgress(), plan: legacy }),
    legacyPlan: { read: () => legacy, write: (next) => { legacy = next; } },
  });
  ensurePlan();
  return saved;
}

/* ------------------------------------------------------------------ */
/* 3. The library stays a library                                      */
/* ------------------------------------------------------------------ */

test('all 76 lessons stay listed and in course order, whatever the plan says', () => {
  const profile = syntheticMatchingHeadings();
  seed(profile);
  const modules = buildCourse();
  const keys = modules.flatMap((module) => module.lessons.map((lesson) => lesson.key));
  assert.equal(keys.length, 76, 'the curriculum library is untouched');
  assert.equal(new Set(keys).size, 76);

  const status = courseStatus(modules, emptyProgress());
  assert.equal(status.totalLessons, 76);
  assert.ok(status.next, 'and the course card still has a place in the library to point at');
  assert.ok(keys.includes(status.next!.key));
});

test('with no plan wired up at all, every surface falls back rather than guessing', () => {
  resetLearningForTest();
  configureLearning({ storage: null });
  assert.equal(currentSharedSession(), null, 'a server render has no student and no plan');

  const status = courseStatus(buildCourse(), emptyProgress());
  assert.equal(status.session, null);
  assert.equal(status.next!.key, 'speaking', 'the library position, which is the best the library alone can do');
  assert.equal(getTodayPlan(null, emptyProgress(), new Date(NOW)), null, 'and Today shows its empty state');
});

/* ------------------------------------------------------------------ */
/* 4. The mapping onto the shapes the old surfaces hold                */
/* ------------------------------------------------------------------ */

test('every activity a session can name maps onto a real Mr EZ catalogue entry', () => {
  for (const activity of CATALOGUE.activities) {
    const step: SharedStepView = {
      stepId: 'step',
      role: 'practise',
      activityId: activity.id,
      kind: activity.kind,
      paper: activity.paper,
      subskill: activity.subskill,
      minutes: activity.expectedMinutes,
      purpose: '',
      state: 'pending',
      href: stepHref(activity.target),
      objective: activity.objective,
      indivisible: activity.indivisible,
      lessonKey: activity.id.startsWith('lesson:') ? activity.id.slice('lesson:'.length) : null,
    };
    const id = tutorActivityIdFor(step);
    assert.ok(findTutorActivity(id), `${activity.id} maps to ${id}, which must resolve or the card would 404`);
  }
});

test('the two lesson maps agree, so the Worker files a completion where the browser does', () => {
  assert.deepEqual(lessonMapsFor(CATALOGUE), lessonMapsFrom(CATALOGUE));
});

/* ------------------------------------------------------------------ */
/* 5. The planner tuning this package owns                             */
/* ------------------------------------------------------------------ */

test('a brand new student starts on the question type the real papers are full of', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });

  /* With no evidence anywhere, every Reading question type scores the same,
     and the tie used to be broken by whichever id sorted first, which is how
     a first session was Matching Features (210 questions in the 70 papers)
     rather than sentence completion (431). Frequency is not a teaching
     judgement and never outranks one; it only settles what nothing else
     can. */
  assert.equal(plan.activeSession.objectiveScope, 'subskill:reading:sentence-completion');
});

test('and the paper the student says feels hardest still chooses the paper', () => {
  for (const paper of ['listening', 'writing', 'speaking'] as const) {
    const profile = syntheticNew({
      goals: { selfReportedHardestPaper: { paper, reportedAt: `${daysBefore(1)}T09:00:00.000Z` } },
    });
    const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
    const { plan } = createInitialPlan({
      catalogue: CATALOGUE,
      record: profile.record,
      policy,
      now: profile.now,
      today: profile.today,
      goals: profile.goals,
      constraints: profile.constraints,
    });
    assert.equal(plan.activeSession.paper, paper, `${paper} was named as the hardest and must come first`);
    assert.match(
      plan.scopeNote ?? plan.activeSession.reason,
      /./,
      'and nothing about a self-reported answer is presented as a measurement',
    );
    /* Added 22 September 2026. This test only ever checked the PAPER, so it
       stayed green through the regression above and the Listening student
       was quietly started on table completion (44 questions in the papers)
       instead of sentence completion (629). Inside the chosen paper the
       same rule has to hold as outside it. */
    if (paper === 'listening') {
      assert.equal(plan.activeSession.objectiveScope, 'subskill:listening:sentence-completion');
    }
  }
});

test('adding focused exercises for other types does not change who goes first', () => {
  /* The regression above, stated as the rule that caused it.
   *
   * `unmetPrerequisiteDepth` charges an objective for the work a student
   * would have to do before it can be started. It used to look at ONE
   * teaching activity, whichever sorted first. Reading sentence completion
   * owns a lesson, so it was charged for that lesson's prerequisites;
   * reading table completion owns no lesson, so its first teaching option
   * was a prerequisite-free focused exercise and it was charged nothing.
   * Having more material made a subskill score worse, and on 22 September
   * 2026, when 93 focused exercises landed where 7 had been, that flipped
   * the first session of every new student.
   *
   * So: run the same brand new student against the catalogue as it is, and
   * against the catalogue as it was before those exercises existed. The
   * first objective has to be the same either way. Teaching material is
   * added to help a student, and adding it must not move somebody onto a
   * different question type. */
  const firstObjective = (catalogue: typeof CATALOGUE): string => {
    const profile = syntheticNew();
    const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
    const { plan } = createInitialPlan({
      catalogue,
      record: profile.record,
      policy,
      now: profile.now,
      today: profile.today,
      goals: profile.goals,
      constraints: profile.constraints,
    });
    return plan.activeSession.objectiveScope;
  };

  const withoutFocused = {
    ...CATALOGUE,
    activities: CATALOGUE.activities.filter((activity) => activity.kind !== 'focused-exercise'),
  };
  assert.equal(firstObjective(withoutFocused), 'subskill:reading:sentence-completion');
  assert.equal(firstObjective(CATALOGUE), firstObjective(withoutFocused));
});

/* ------------------------------------------------------------------ */
/* 6. A teach step opens the lesson AT the part it is about             */
/* ------------------------------------------------------------------ */

test('a teach step opens the lesson at the block it teaches from, not at the top', () => {
  /* Lesson pages are long. A session that says "read the Matching
     Headings lesson" and drops the student at the top of it has handed
     them a reading list. Every focused exercise already names the lesson
     AND the heading inside it that it teaches from; the generated index
     turns that heading into the block id the lesson layout stamps on its
     own headings at build time, so the step can link straight to it. */
  const profile = syntheticMatchingHeadings();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const { plan } = createInitialPlan({
    catalogue: CATALOGUE,
    record: profile.record,
    policy,
    now: profile.now,
    today: profile.today,
    goals: profile.goals,
    constraints: profile.constraints,
  });
  assert.equal(plan.activeSession.objectiveScope, 'subskill:reading:matching-headings');

  const teach = plan.activeSession.steps.filter((step) => step.activityId === 'lesson:reading-headings');
  assert.equal(teach.length, 1, 'the Matching Headings lesson is taught');
  const blockId = teach[0]!.blockId;
  assert.ok(blockId, 'the step names the block it opens at');

  /* And it is a real anchor on that page, not a guess: the same id the
     layout stamps, found at the heading the exercise names. */
  const blocks = segmentLessonBody(readEnglish('reading-headings'));
  const block = blocks.find((entry) => entry.id === blockId);
  assert.ok(block, `${blockId} is not a block of the reading-headings lesson`);
  assert.equal(block.heading, 'How to Approach It');

  const activity = findActivity('lesson:reading-headings', CATALOGUE);
  assert.ok(activity);
  assert.equal(stepHref(activity.target, blockId), `/lessons/reading/headings#${blockId}`);
});

test('a lesson with nothing pointing into it still links to the top of the page', () => {
  /* The fallback, stated. Nothing names a block of the Reading overview,
     and a heading that is renamed in a lesson body resolves to nothing in
     the index, so both cases come out here as "no anchor". A link to the
     top of the right page is a worse link; a link to an anchor that is no
     longer there would be a broken one. */
  const overview = findActivity('lesson:reading-task1', CATALOGUE);
  assert.ok(overview);
  assert.equal(lessonBlockFor('matching-headings', overview, CATALOGUE), null);
  assert.equal(stepHref(overview.target, null), '/lessons/reading-task1');
  assert.equal(stepHref(overview.target, undefined), '/lessons/reading-task1');

  /* And a drill, which is not a lesson at all, never gains an anchor. */
  const drill = findActivity('drill:reading-full-001-drill-p1', CATALOGUE);
  assert.ok(drill);
  assert.equal(lessonBlockFor('matching-headings', drill, CATALOGUE), null);
});

/* ------------------------------------------------------------------ */
/* 7. The browser gathers the vocabulary signal and hands it over       */
/* ------------------------------------------------------------------ */

test('the browser layer passes vocabulary through to the plan, and asks about today', () => {
  /* The planner is pure and runs in a Cloudflare Worker, so it can never
     read the flashcard deck or this device's review state. This file's
     layer gathers a small summary and passes it in as plain data. The
     reader is injected here so the test does not depend on a 292 KB deck
     loading in the background. */
  const profile = syntheticMatchingHeadings();
  seed(profile);
  const asked: { today: string; focusText: string; lexicalResourceBands: readonly number[] }[] = [];
  configureLearning({
    vocabulary: (input) => {
      asked.push(input);
      return {
        dueCount: 7,
        dueByTopic: { education: 7 },
        relevantTopics: ['education'],
        problems: [],
      };
    },
  });

  const session = getCurrentSession();
  assert.ok(asked.length > 0, 'the plan asked about vocabulary');
  assert.equal(asked[0]!.today, profile.today, 'and it asked about this student\'s own date');

  const recall = session.steps.find((step) => step.role === 'recall');
  assert.ok(recall, 'words due today reach the session');
  assert.equal(recall.activityId, 'review:vocabulary:education');
  assert.equal(recall.href, '/review?topic=education', 'and it opens that topic, not the whole deck');
});

test('with no vocabulary reader at all the plan is built exactly as before', () => {
  /* The Worker's case, and any browser where the deck has not loaded yet. */
  const profile = syntheticMatchingHeadings();
  seed(profile);
  configureLearning({ vocabulary: null });
  const session = getCurrentSession();
  assert.equal(session.steps.find((step) => step.role === 'recall'), undefined);
  assert.ok(session.steps.length > 0, 'and it is still a real session');
});
