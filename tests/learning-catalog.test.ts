/* The activity catalogue.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-catalog.test.ts
 * The whole suite is `npm test`, which globs tests/*.test.ts.
 *
 * What is being defended, and why each of these can fail on its own:
 *
 * 1. Every lesson the site publishes is in the catalogue. A lesson that
 *    falls out of it stops being discoverable and stops being schedulable,
 *    and nothing else would notice.
 * 2. Every id the tutor already emits still resolves, to the same page.
 *    Those ids are in Supabase, inside saved recommendations and notes, so
 *    renaming one turns a student's saved next step into a dead link.
 * 3. Every route is a real page in this repo, checked against the
 *    filesystem the way tests/tutor-insights.test.ts already does, and
 *    every in-place task names a real entry in the generated index.
 * 4. Prerequisites exist, do not loop, and are not a disguised course
 *    order. Being lesson 41 of 76 must never mean "do the other 40 first".
 * 5. Question types with real questions have somewhere to learn them and
 *    somewhere to practise them, and the types with none say so in plain
 *    words instead of linking to an empty filter.
 * 6. It stays small. The Mr EZ Worker imports this as well as the index.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  LEARNING_INDEX,
  LESSONS_WITHOUT_RUSSIAN,
  SPEAKING_CRITERION_OBJECTIVES,
  TESTS_WITHOUT_RUSSIAN_EXPLANATIONS,
  WRITING_CRITERION_OBJECTIVES,
  activitiesForPaper,
  activitiesForSubskill,
  activitiesThatTeach,
  activityHref,
  buildLearningCatalogue,
  checksForSubskill,
  coverageFit,
  findActivity,
  learningCatalogue,
  practiceForSubskill,
  practiseActivityId,
  practiseHref,
  prerequisiteClosure,
  speakingCriterionMaterial,
  subskillMaterial,
  unavailableActivities,
  writingCriterionMaterial,
} from '../src/lib/learning/catalog.ts';

import { LEARNING_CATALOGUE_MAX_BYTES } from '../src/lib/learning/contracts/catalog.ts';
import type { CatalogueActivity, QuestionTypeCoverage } from '../src/lib/learning/contracts/catalog.ts';
import { buildCatalog, practiseActivity } from '../src/lib/tutor/catalog.ts';
import { buildCourse } from '../src/lib/course.ts';
import { englishSlugs, russianSlugs } from '../tools/lesson-ru-lib.mjs';

const catalogue = learningCatalogue();
const activities = catalogue.activities;
const byKind = (kind: string): CatalogueActivity[] => activities.filter((a) => a.kind === kind);

/* ------------------------------------------------------------------ */
/* 1. Everything the site has is in here                               */
/* ------------------------------------------------------------------ */

test('all 76 lessons are present, discoverable and linked to their own page', () => {
  const lessons = buildCourse().flatMap((unit) => unit.lessons);
  assert.equal(lessons.length, 76, 'the course itself still publishes 76 lessons');
  for (const lesson of lessons) {
    const activity = findActivity(`lesson:${lesson.key}`);
    assert.ok(activity, `${lesson.key} is in the catalogue`);
    assert.equal(activity.kind, 'lesson');
    assert.equal(activityHref(activity), lesson.href, `${lesson.key} points at its own page`);
    assert.equal(
      activity.expectedMinutes,
      lesson.minutes,
      `${lesson.key} keeps the honest minutes its registry already carries`,
    );
    assert.equal(
      activity.completionEvidence,
      'self-marked',
      'a lesson visit proves studying and nothing more',
    );
    assert.ok(activity.objective.length > 20, `${lesson.key} says what the student can do afterwards`);
  }
  assert.equal(byKind('lesson').length, 76, 'and nothing else calls itself a lesson');
});

test('every drill, paper, prompt, topic and check in the index became an activity', () => {
  const counts = {
    'lesson-check': LEARNING_INDEX.lessonChecks.length,
    'focused-exercise': LEARNING_INDEX.focusedExercises.length,
    'vocab-review': LEARNING_INDEX.vocabTopics.length + 1, // + the all-due review
  };
  for (const [kind, expected] of Object.entries(counts)) {
    assert.equal(byKind(kind).length, expected, `${kind} count`);
  }
  for (const drill of LEARNING_INDEX.drills) assert.ok(findActivity(`drill:${drill.id}`), drill.id);
  for (const paper of LEARNING_INDEX.tests) assert.ok(findActivity(`test:${paper.id}`), paper.id);
  for (const prompt of LEARNING_INDEX.writingPrompts) assert.ok(findActivity(`write:${prompt.id}`), prompt.id);
  for (const prompt of LEARNING_INDEX.speakingPrompts) {
    assert.ok(findActivity(`speak:${prompt.id}`), prompt.id);
    if (prompt.part3QuestionCount) {
      assert.ok(findActivity(`speak:${prompt.id}:part3`), `${prompt.id} part 3`);
    }
  }
  for (const topic of LEARNING_INDEX.vocabTopics) {
    assert.ok(findActivity(`review:vocabulary:${topic.slug}`), topic.slug);
  }
});

test('Writing Task 1 and Task 2 are kept apart, and Speaking is kept apart by part', () => {
  const writing = byKind('graded-task').filter((a) => a.paper === 'writing' && a.id.startsWith('write:'));
  const task1 = writing.filter((a) => a.criterion === 'taskAchievement');
  const task2 = writing.filter((a) => a.criterion === 'taskResponse');
  assert.equal(task1.length, 30);
  assert.equal(task2.length, 30);

  const task1Objectives = new Set(task1.map((a) => a.objective));
  const task2Objectives = new Set(task2.map((a) => a.objective));
  for (const objective of task1Objectives) {
    assert.ok(!task2Objectives.has(objective), `"${objective}" must not be shared with Task 2`);
  }
  for (const activity of task1) assert.ok(activity.subskill.startsWith('task1-'));
  for (const activity of task2) {
    assert.ok(
      activity.subskill.startsWith('task2-') || activity.subskill === 'task-length-and-timing',
      activity.subskill,
    );
  }

  /* And the same split across everything in the catalogue, not only the
     prompts: no single objective sentence may describe both tasks. */
  const seenBy = new Map<string, Set<string>>();
  for (const activity of activities) {
    if (!activity.subskill.startsWith('task1-') && !activity.subskill.startsWith('task2-')) continue;
    const task = activity.subskill.slice(0, 5);
    const set = seenBy.get(activity.objective) ?? new Set<string>();
    set.add(task);
    seenBy.set(activity.objective, set);
  }
  for (const [objective, tasks] of seenBy) {
    assert.equal(tasks.size, 1, `"${objective}" is used for both Task 1 and Task 2`);
  }

  const part1 = activities.filter((a) => a.subskill.startsWith('part1-'));
  const part2 = activities.filter((a) => a.subskill.startsWith('part2-'));
  const part3 = activities.filter((a) => a.subskill.startsWith('part3-'));
  assert.ok(part1.length > 0 && part2.length > 0 && part3.length > 0, 'all three Speaking parts are schedulable');
});

test('the supporting libraries are all reachable as activities', () => {
  for (const id of ['tool:models', 'tool:cue-cards', 'tool:bands', 'tool:saved', 'tool:report', 'tool:plan']) {
    const activity = findActivity(id);
    assert.ok(activity, id);
    assert.ok(
      activity.completionEvidence === 'none' || activity.kind === 'planning',
      `${id} is reference or planning material, never a source of evidence`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* 2. Ids already stored in Supabase still resolve, to the same page    */
/* ------------------------------------------------------------------ */

test('every id the tutor catalogue emits resolves here, to the same route', () => {
  const tutor = buildCatalog();
  assert.ok(tutor.length > 80, 'the tutor catalogue is populated');
  for (const old of tutor) {
    const now = findActivity(old.id);
    assert.ok(now, `${old.id} still resolves`);
    assert.equal(activityHref(now), old.href, `${old.id} still points at ${old.href}`);
  }
});

test('every synthesised practise id resolves, to the same trainer filter', () => {
  const types = LEARNING_INDEX.questionTypes.map((t: QuestionTypeCoverage) => t.type);
  assert.equal(types.length, 12, 'all twelve question types in the schema are covered');
  for (const skill of ['reading', 'listening'] as const) {
    for (const type of types) {
      const id = practiseActivityId(skill, type);
      const old = practiseActivity(id);
      assert.ok(old, `${id} resolved in the tutor catalogue`);
      const now = findActivity(id);
      assert.ok(now, `${id} still resolves`);
      assert.equal(activityHref(now), old.href, `${id} still points at ${old.href}`);
      assert.equal(activityHref(now), practiseHref(skill, type as never));
    }
  }
});

test('an id nobody defined resolves to nothing rather than to a guess', () => {
  assert.equal(findActivity('lesson:does-not-exist'), undefined);
  assert.equal(findActivity('practise:writing:tfng'), undefined);
  assert.equal(findActivity('practise:reading:not-a-type'), undefined);
  assert.equal(findActivity('drill:../../etc/passwd'), undefined);
});

test('no two activities share an id', () => {
  const seen = new Set<string>();
  for (const activity of activities) {
    assert.ok(!seen.has(activity.id), `${activity.id} is defined twice`);
    seen.add(activity.id);
  }
  assert.equal(seen.size, activities.length);
});

/* ------------------------------------------------------------------ */
/* 3. Every link goes somewhere real                                   */
/* ------------------------------------------------------------------ */

const PAGES = 'src/pages';

/** Does this unprefixed site path correspond to a real page in this repo?
    The same filesystem walk tests/tutor-insights.test.ts uses, including
    Astro's dynamic `[param]` routes, rather than a hand-kept list that
    would rot the first time a page moved. */
function routeExists(path: string): boolean {
  const clean = path.split('#')[0].split('?')[0].replace(/^\//, '');
  const segments = clean ? clean.split('/') : [];

  function walk(dir: string, rest: string[]): boolean {
    if (rest.length === 0) return existsSync(join(dir, 'index.astro'));
    const [head, ...tail] = rest;
    if (tail.length === 0) {
      if (existsSync(join(dir, `${head}.astro`))) return true;
      if (existsSync(join(dir, head, 'index.astro'))) return true;
      return readdirSync(dir).some((entry) => /^\[.+\]\.astro$/.test(entry));
    }
    if (existsSync(join(dir, head))) return walk(join(dir, head), tail);
    return false;
  }

  return walk(PAGES, segments);
}

test('the route check can tell a real page from an invented one', () => {
  assert.ok(routeExists('/tests'), 'a real index page');
  assert.ok(routeExists('/lessons/reading/headings'), 'a real dynamic route');
  assert.ok(routeExists('/tests#reading-tests'), 'a hash is not part of the path');
  assert.equal(routeExists('/nowhere-at-all'), false);
  assert.equal(routeExists('/lessons/nothing/here'), false);
});

test('every route in the catalogue is a page that exists', () => {
  for (const activity of activities) {
    if (activity.target.kind !== 'route') continue;
    const href = activityHref(activity) as string;
    assert.ok(routeExists(href), `${activity.id} -> ${href} is a real page`);
  }
});

test('every in-place task names a real entry in the generated index', () => {
  const sections: Record<string, Set<string>> = {
    drills: new Set(LEARNING_INDEX.drills.map((d) => d.id)),
    tests: new Set(LEARNING_INDEX.tests.map((t) => t.id)),
    lessonChecks: new Set(LEARNING_INDEX.lessonChecks.map((c) => c.id)),
    writingPrompts: new Set(LEARNING_INDEX.writingPrompts.map((p) => p.id)),
    speakingPrompts: new Set(LEARNING_INDEX.speakingPrompts.map((p) => p.id)),
    vocabTopics: new Set(LEARNING_INDEX.vocabTopics.map((t) => t.slug)),
    focusedExercises: new Set(LEARNING_INDEX.focusedExercises.map((e) => e.id)),
  };
  let checked = 0;
  for (const activity of activities) {
    if (activity.target.kind !== 'task') continue;
    const { section, id } = activity.target.indexRef;
    assert.ok(sections[section]?.has(id), `${activity.id} points at a missing ${section} entry "${id}"`);
    checked += 1;
  }
  assert.ok(checked > 100, 'the speaking prompts really are in-place tasks, so this proved something');
});

/* ------------------------------------------------------------------ */
/* 4. Prerequisites: real, acyclic, and not a course order in disguise  */
/* ------------------------------------------------------------------ */

test('every prerequisite id resolves to a real activity', () => {
  for (const activity of activities) {
    for (const id of activity.prerequisites) {
      assert.ok(findActivity(id), `${activity.id} requires ${id}, which does not exist`);
    }
  }
});

test('the prerequisite graph has no cycle', () => {
  const state = new Map<string, 'open' | 'done'>();
  const trail: string[] = [];

  function visit(id: string): void {
    const seen = state.get(id);
    if (seen === 'done') return;
    assert.notEqual(seen, 'open', `prerequisite cycle: ${[...trail, id].join(' -> ')}`);
    state.set(id, 'open');
    trail.push(id);
    for (const next of findActivity(id)?.prerequisites ?? []) visit(next);
    trail.pop();
    state.set(id, 'done');
  }

  for (const activity of activities) visit(activity.id);
  assert.equal(state.size >= activities.length, true);
});

test('prerequisites follow the course structure: overview first, method before task type', () => {
  assert.deepEqual(findActivity('lesson:reading-task1')?.prerequisites, [], 'an overview needs nothing');
  assert.deepEqual(findActivity('lesson:writing')?.prerequisites, []);

  assert.deepEqual(findActivity('lesson:writing-charts')?.prerequisites, [
    'lesson:writing',
    'lesson:writing-method',
  ]);
  assert.deepEqual(findActivity('lesson:writing-opinion')?.prerequisites, [
    'lesson:writing',
    'lesson:writing-task2-method',
  ]);
  assert.deepEqual(findActivity('lesson:reading-headings')?.prerequisites, [
    'lesson:reading-task1',
    'lesson:reading-paraphrase',
  ]);
  assert.deepEqual(findActivity('lesson:speaking-part3')?.prerequisites, [
    'lesson:speaking',
    'lesson:speaking-part2',
  ]);

  const closure = prerequisiteClosure('lesson:speaking-part3');
  assert.deepEqual([...closure].sort(), ['lesson:speaking', 'lesson:speaking-part1', 'lesson:speaking-part2']);
  assert.ok(!closure.includes('lesson:speaking-part3'), 'an activity is never its own prerequisite');
});

test('nothing is required merely because it comes earlier in the eight units', () => {
  const lessons = buildCourse().flatMap((unit) => unit.lessons);
  for (let i = 1; i < lessons.length; i += 1) {
    const activity = findActivity(`lesson:${lessons[i]!.key}`) as CatalogueActivity;
    const previous = `lesson:${lessons[i - 1]!.key}`;
    if (activity.prerequisites.includes(previous)) {
      /* The only chains allowed are the teaching ones, and those are all
         inside one paper. A vocabulary topic can never gate a Reading
         lesson just by sitting above it in the unit list. */
      const before = findActivity(previous) as CatalogueActivity;
      assert.equal(
        before.domain,
        activity.domain,
        `${activity.id} requires ${previous} across two different papers, which is unit position, not teaching`,
      );
    }
  }

  /* A vocabulary topic is never gated on anything but the overview, and a
     student may start any paper on day one. */
  for (const activity of byKind('lesson')) {
    if (activity.domain !== 'vocabulary') continue;
    assert.ok(activity.prerequisites.length <= 1, `${activity.id} has ${activity.prerequisites.length}`);
  }
  const roots = byKind('lesson').filter((a) => a.prerequisites.length === 0);
  assert.equal(roots.length, 5, 'exactly the five overviews are free to start with');

  /* And no activity claims to be compulsory. The catalogue has no such
     field, and nothing may smuggle one in through a tag. */
  for (const activity of activities) {
    for (const tag of activity.tags ?? []) {
      assert.ok(!/mandatory|required|compulsory/i.test(tag), `${activity.id} carries "${tag}"`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 5. Question types: taught, practised, or honestly unavailable        */
/* ------------------------------------------------------------------ */

test('every question type the papers really contain can be learnt and practised', () => {
  for (const coverage of LEARNING_INDEX.questionTypes as QuestionTypeCoverage[]) {
    for (const skill of ['reading', 'listening'] as const) {
      const counts = coverage[skill];
      if (counts.questions === 0) continue;
      const teach = activitiesThatTeach(coverage.type as never).filter((a) => a.paper === skill);
      assert.ok(teach.length > 0, `${skill}/${coverage.type} has no lesson`);

      const practise = practiceForSubskill(coverage.type as never, 60).filter((a) => a.paper === skill);
      assert.ok(practise.length > 0, `${skill}/${coverage.type} has no practice`);

      const hub = findActivity(practiseActivityId(skill, coverage.type)) as CatalogueActivity;
      assert.equal(hub.unavailable, undefined, `${skill}/${coverage.type} has ${counts.drills} drills`);
    }
  }
});

test('a question type with no questions is marked unavailable and says so plainly', () => {
  const absent = (LEARNING_INDEX.questionTypes as QuestionTypeCoverage[]).filter((t) => t.absent);
  assert.deepEqual(absent.map((t) => t.type), ['sentence-endings'], 'the phantom type, measured not assumed');

  for (const skill of ['reading', 'listening'] as const) {
    const hub = findActivity(practiseActivityId(skill, 'sentence-endings')) as CatalogueActivity;
    assert.ok(hub, 'the id still resolves, because it is already stored in Supabase');
    assert.equal(hub.unavailable?.code, 'no-material');
    assert.match(hub.unavailable?.reason ?? '', /no paper in the library/i);
    assert.ok(!/[–—]/.test(hub.unavailable?.reason ?? ''), 'no dashes in anything a student reads');
  }

  /* The lesson stays: lead decision Q1 keeps it and has a focused set
     authored later. What it must NOT do is point at unrelated work. */
  const lesson = findActivity('lesson:reading-matching-sentence-endings') as CatalogueActivity;
  assert.ok(lesson, 'the lesson is kept');
  assert.equal(lesson.unavailable, undefined);

  const material = subskillMaterial('sentence-endings');
  assert.ok(material.teach.length > 0, 'there is still somewhere to learn it');
  assert.equal(material.practise.length, 0, 'but nowhere real to practise it');
  assert.equal(material.checks.length, 0, 'and it can never be an independent check');
  assert.ok((material.unavailable ?? '').length > 20, 'and the catalogue says why in a sentence');
});

test('a practise link only exists where a real drill contains that type', () => {
  for (const coverage of LEARNING_INDEX.questionTypes as QuestionTypeCoverage[]) {
    for (const skill of ['reading', 'listening'] as const) {
      const hub = findActivity(practiseActivityId(skill, coverage.type)) as CatalogueActivity;
      const available = hub.unavailable === undefined;
      assert.equal(
        available,
        coverage[skill].drills > 0,
        `${skill}/${coverage.type}: ${coverage[skill].drills} drills but available=${available}`,
      );
      if (!available) continue;
      const drills = activitiesForSubskill(coverage.type as never).filter(
        (a) => a.kind === 'drill' && a.paper === skill && a.id.startsWith('drill:'),
      );
      assert.ok(drills.length > 0, `${skill}/${coverage.type} resolves to a real drill`);
    }
  }
});

test('the borrowed lesson mappings are recorded as borrowed, not passed off as direct', () => {
  const borrowed: [string, string, string][] = [
    ['lesson:reading-mc', 'multiple-answer', 'reading'],
    ['lesson:listening-multiple-choice', 'multiple-answer', 'listening'],
    ['lesson:reading-matching-features', 'categorisation', 'reading'],
    ['lesson:listening-matching', 'categorisation', 'listening'],
    ['lesson:reading-summary-completion', 'table-completion', 'reading'],
    ['lesson:listening-form-completion', 'table-completion', 'listening'],
    ['lesson:listening-map-labelling', 'diagram-labelling', 'listening'],
  ];
  for (const [id, subskill] of borrowed) {
    const activity = findActivity(id) as CatalogueActivity;
    assert.equal(
      coverageFit(activity, subskill as never),
      'borrowed',
      `${id} teaches ${subskill} only by neighbouring type`,
    );
  }
  /* And a direct one really is direct, so the flag means something. */
  const tfng = findActivity('lesson:reading-tfng') as CatalogueActivity;
  assert.equal(coverageFit(tfng, 'tfng'), 'direct');
  assert.equal(coverageFit(tfng, 'matching-headings'), null, 'and a lesson never claims what it does not teach');
});

/* ------------------------------------------------------------------ */
/* 6. The lookups the planner is going to call                          */
/* ------------------------------------------------------------------ */

test('practice for a subskill respects the minutes left and never returns the unavailable', () => {
  for (const minutes of [8, 20, 60]) {
    for (const activity of practiceForSubskill('matching-headings', minutes)) {
      assert.ok(activity.expectedMinutes <= minutes, `${activity.id} is ${activity.expectedMinutes} min`);
      assert.equal(activity.unavailable, undefined);
    }
  }
  const short = practiceForSubskill('matching-headings', 8);
  const long = practiceForSubskill('matching-headings', 60);
  assert.ok(long.length >= short.length, 'a bigger budget never offers less');
  assert.ok(long.length > 0, 'Matching Headings has 79 real questions, so there is something to do');
  assert.ok(
    long[0]!.expectedMinutes >= long[long.length - 1]!.expectedMinutes,
    'the largest thing that fits comes first, so a session fills its slot',
  );
});

test('checks name the papers they would spend, so the planner can keep material unseen', () => {
  const checks = checksForSubskill('matching-headings');
  assert.ok(checks.length > 0);
  for (const check of checks) {
    assert.ok(check.activity.verified, `${check.activity.id} is verified material`);
    assert.ok(check.sourceTestIds.length > 0, `${check.activity.id} names its source papers`);
    for (const id of check.sourceTestIds) {
      assert.ok(findActivity(`test:${id}`), `${id} is a real paper`);
    }
  }
  const drill = checks.find((c) => c.activity.kind === 'drill');
  assert.ok(drill, 'a single-part drill is the cheapest honest check');
  assert.deepEqual(drill.activity.sharesItemsWith, [`test:${drill.sourceTestIds[0]}`]);
});

test('a paper and its drills know they share questions', () => {
  const paper = findActivity('test:reading-full-001') as CatalogueActivity;
  assert.ok(paper.sharesItemsWith && paper.sharesItemsWith.length >= 3, 'a Reading paper has three parts');
  for (const drillId of paper.sharesItemsWith) {
    const drill = findActivity(drillId) as CatalogueActivity;
    assert.ok(drill, drillId);
    assert.deepEqual(drill.sourcePaperIds, ['reading-full-001']);
  }
});

test('a criterion turns into objectives a student can actually work on', () => {
  for (const criterion of Object.keys(WRITING_CRITERION_OBJECTIVES) as (keyof typeof WRITING_CRITERION_OBJECTIVES)[]) {
    const material = writingCriterionMaterial(criterion);
    assert.ok(material.objectives.length > 0, `${criterion} is broken into objectives`);
  }
  for (const criterion of ['taskAchievement', 'taskResponse', 'coherenceCohesion'] as const) {
    assert.ok(writingCriterionMaterial(criterion).activities.length > 0, `${criterion} has something to do`);
  }

  /* Task Achievement and Task Response must not collapse into each other:
     they are the same criterion key on two different skills. */
  const ta = new Set(WRITING_CRITERION_OBJECTIVES.taskAchievement);
  for (const objective of WRITING_CRITERION_OBJECTIVES.taskResponse) {
    assert.ok(!ta.has(objective), `${objective} is claimed by both Writing tasks`);
  }

  /* The honest gap, stated rather than hidden. There is no short-form
     Writing practice in the library at all today: the smallest unit is a
     full essay, so the objectives behind Lexical Resource and Grammatical
     Range have nothing yet. A later work package authors them, and this
     assertion is what will notice when it does. */
  assert.deepEqual([...writingCriterionMaterial('lexicalResource').missingObjectives], ['lexical-precision']);
  assert.deepEqual(
    [...writingCriterionMaterial('grammaticalRange').missingObjectives],
    ['sentence-correction', 'complex-sentence-range'],
  );
  for (const subskill of ['lexical-precision', 'sentence-correction', 'complex-sentence-range'] as const) {
    const material = subskillMaterial(subskill);
    assert.equal(material.practise.length, 0);
    assert.ok((material.unavailable ?? '').length > 20, `${subskill} says plainly that there is nothing yet`);
  }

  for (const criterion of Object.keys(SPEAKING_CRITERION_OBJECTIVES) as (keyof typeof SPEAKING_CRITERION_OBJECTIVES)[]) {
    const material = speakingCriterionMaterial(criterion);
    assert.ok(material.objectives.length > 0, `${criterion} is broken into objectives`);
  }
  assert.ok(speakingCriterionMaterial('fluencyCoherence').activities.length > 100, 'every prompt works on fluency');

  /* Pronunciation is the one that can only be judged from audio, and no
     text-only activity pretends otherwise. */
  const pronunciation = speakingCriterionMaterial('pronunciation');
  assert.deepEqual(
    [...pronunciation.missingObjectives],
    ['pronunciation-stress-and-rhythm', 'pronunciation-individual-sounds'],
    'pronunciation is re-checked on a new recording only, so it has no activity of its own yet',
  );
  for (const activity of pronunciation.activities) {
    assert.ok(
      (activity.tags ?? []).includes('needs-microphone'),
      `${activity.id} claims to move pronunciation without a recording`,
    );
  }
});

test('lookups by paper and by subskill return what they say they return', () => {
  for (const paper of ['reading', 'listening', 'writing', 'speaking'] as const) {
    const found = activitiesForPaper(paper);
    assert.ok(found.length > 10, `${paper} has activities`);
    for (const activity of found) assert.equal(activity.paper, paper);
  }
  assert.equal(activitiesForPaper('reading').some((a) => a.domain === 'vocabulary'), false);

  const headings = activitiesForSubskill('matching-headings');
  assert.ok(headings.some((a) => a.id === 'lesson:reading-headings'));
  assert.ok(headings.some((a) => a.id === 'check:practice-reading-headings'));
  assert.ok(headings.some((a) => a.kind === 'drill'));
});

/* ------------------------------------------------------------------ */
/* 7. Honesty: provenance, verification, language, availability         */
/* ------------------------------------------------------------------ */

test('authored material is marked as authored and as unverified', () => {
  const paper = findActivity('test:reading-full-001') as CatalogueActivity;
  assert.equal(paper.provenance, 'imported-paper');
  assert.equal(paper.verified, true);

  const prompt = findActivity('write:pte-wt-103-task1') as CatalogueActivity;
  assert.equal(prompt.provenance, 'publisher');
  assert.equal(prompt.verified, true);

  const lesson = findActivity('lesson:reading-tfng') as CatalogueActivity;
  assert.equal(lesson.provenance, 'project-authored');
  assert.equal(lesson.verified, false, 'nobody has teacher-checked the lessons, and the catalogue says so');

  /* The one lesson check built from questions this project wrote rather
     than lifted from a paper. */
  const paraphrase = findActivity('check:practice-reading-paraphrase') as CatalogueActivity;
  assert.equal(paraphrase.provenance, 'project-authored');
  assert.equal(paraphrase.verified, false);
  assert.deepEqual(paraphrase.sourcePaperIds, [], 'it spends no paper, because it quotes none');

  /* Unverified material can never become an independent check. */
  for (const check of checksForSubskill('paraphrase')) {
    assert.notEqual(check.activity.id, 'check:practice-reading-paraphrase');
  }
});

test('a full paper and the mock are indivisible, with their true duration', () => {
  const reading = findActivity('test:reading-full-001') as CatalogueActivity;
  assert.equal(reading.indivisible, true);
  assert.equal(reading.expectedMinutes, 60);

  const listening = findActivity('test:listening-full-001') as CatalogueActivity;
  assert.equal(listening.indivisible, true);
  assert.equal(listening.expectedMinutes, 40);

  const mock = findActivity('test:mock') as CatalogueActivity;
  assert.equal(mock.indivisible, true);
  assert.ok(mock.expectedMinutes > 160, 'the mock is the whole exam, not an hour');

  /* Nothing indivisible is ever offered inside a short budget. */
  for (const activity of practiceForSubskill('timing-and-transfer', 25)) {
    assert.ok(!activity.indivisible || activity.expectedMinutes <= 25, activity.id);
  }
  /* A drill is divisible-sized and is what a short day gets instead. */
  const drill = findActivity('drill:listening-full-001-drill-p1') as CatalogueActivity;
  assert.equal(drill.indivisible, false);
  assert.equal(drill.expectedMinutes, 8);
});

test('the explanation languages match what is really translated on disk', () => {
  const english = new Set(englishSlugs());
  const russian = new Set(russianSlugs());
  const missing = [...english].filter((slug) => !russian.has(slug)).sort();
  assert.deepEqual(
    [...LESSONS_WITHOUT_RUSSIAN].sort(),
    missing,
    'LESSONS_WITHOUT_RUSSIAN in src/lib/learning/catalog.ts is out of date with src/content/lesson-bodies/ru/',
  );

  const untranslated = new Set(TESTS_WITHOUT_RUSSIAN_EXPLANATIONS);
  for (const lesson of buildCourse().flatMap((unit) => unit.lessons)) {
    const activity = findActivity(`lesson:${lesson.key}`) as CatalogueActivity;
    const expected = russian.has(lesson.key) ? ['en', 'ru'] : ['en'];
    assert.deepEqual([...activity.explanationLocales], expected, lesson.key);
  }
  for (const paper of LEARNING_INDEX.tests) {
    const activity = findActivity(`test:${paper.id}`) as CatalogueActivity;
    const expected = untranslated.has(paper.id) ? ['en'] : ['en', 'ru'];
    assert.deepEqual([...activity.explanationLocales], expected, paper.id);
  }
});

test('nothing a student reads contains a dash', () => {
  for (const activity of activities) {
    assert.ok(!/[–—]/.test(activity.objective), `${activity.id}: ${activity.objective}`);
    assert.ok(!/[–—]/.test(activity.unavailable?.reason ?? ''), activity.id);
  }
});

test('the unavailable list is exactly the seven dead practise filters', () => {
  const blocked = unavailableActivities();
  assert.deepEqual(
    blocked.map((a) => a.id).sort(),
    [
      'practise:listening:matching-headings',
      'practise:listening:paragraph-matching',
      'practise:listening:sentence-endings',
      'practise:listening:tfng',
      'practise:listening:yes-no-notgiven',
      'practise:reading:diagram-labelling',
      'practise:reading:sentence-endings',
    ],
    'these are the filters that would have matched nothing',
  );
  for (const activity of blocked) assert.ok(activity.unavailable?.reason);
});

/* ------------------------------------------------------------------ */
/* 8. Reproducible, and small enough for the Worker                     */
/* ------------------------------------------------------------------ */

test('the catalogue is a pure function of the index', () => {
  const once = buildLearningCatalogue(LEARNING_INDEX);
  const twice = buildLearningCatalogue(LEARNING_INDEX);
  assert.equal(JSON.stringify(once), JSON.stringify(twice), 'two runs disagree, so nothing here is cacheable');
  assert.equal(once.catalogueVersion, twice.catalogueVersion);
  assert.equal(once.indexVersion, LEARNING_INDEX.indexVersion);
  assert.match(once.catalogueVersion, /^[0-9a-f]{16}$/);
});

test('the version changes when an activity changes, and only then', () => {
  const base = buildLearningCatalogue(LEARNING_INDEX);

  const reordered = {
    ...LEARNING_INDEX,
    drills: [...LEARNING_INDEX.drills].reverse(),
  };
  assert.equal(
    buildLearningCatalogue(reordered).catalogueVersion,
    base.catalogueVersion,
    'assembly order is not content, so shuffling the index must not invalidate a cache',
  );

  const shorter = {
    ...LEARNING_INDEX,
    drills: LEARNING_INDEX.drills.slice(0, -1),
  };
  assert.notEqual(
    buildLearningCatalogue(shorter).catalogueVersion,
    base.catalogueVersion,
    'losing a drill must invalidate anything cached against the catalogue',
  );
});

test('the catalogue serialises small enough for the Worker to import', () => {
  const bytes = Buffer.byteLength(JSON.stringify(catalogue), 'utf8');
  assert.ok(
    bytes <= LEARNING_CATALOGUE_MAX_BYTES,
    `the catalogue is ${bytes} bytes, over the ${LEARNING_CATALOGUE_MAX_BYTES} byte cap. ` +
      'The Worker bundles the generated index as well, so raise the cap deliberately or carry less.',
  );
  /* And it carries no content: no passage, question, option or answer. */
  const text = JSON.stringify(catalogue);
  assert.ok(text.length > 0);
  assert.ok(!/"passage"|"transcript"|"options"|"answer"/.test(text), 'the catalogue names material, never holds it');
});

test('the whole catalogue is the size the report says it is', () => {
  const kinds = new Map<string, number>();
  for (const activity of activities) kinds.set(activity.kind, (kinds.get(activity.kind) ?? 0) + 1);
  assert.deepEqual(
    [...kinds.entries()].sort(),
    [
      ['drill', 266],
      ['full-test', 73],
      ['graded-task', 189],
      ['lesson', 76],
      ['lesson-check', 22],
      ['planning', 1],
      ['reference', 5],
      ['vocab-review', 37],
    ],
    'the counts in the work package report, asserted so they cannot drift silently',
  );
  assert.equal(activities.length, 669);
  assert.equal(byKind('focused-exercise').length, 0, 'none are authored yet, and the catalogue does not pretend');
});
