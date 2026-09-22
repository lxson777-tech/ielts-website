/* Pure view-model helpers for the Today block (WP8).
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/today-surface.test.ts
 * The whole suite is `npm test`.
 *
 * Covers state selection for every screen Today can show, step status
 * mapping, the main button's start/continue choice, and the old "Course
 * view" preference mapping ('order' -> 'route'). The last two tests build a
 * real plan from the shared synthetic profiles (tests/fixtures/
 * learning-profiles.ts) through the real planner, so the screen selection is
 * checked against actual planner output and not only against hand-built
 * fixtures.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addsSomethingBeside,
  dailyMinutesGoal,
  daysUntil,
  focusAreas,
  FOCUS_CERTAINTY_LABEL,
  isSessionFinished,
  mainAction,
  mapStoredCourseView,
  scopeNoteView,
  selectTodayScreen,
  sessionKicker,
  splitScopeNote,
  stepForeignPaper,
  stepPurposeAddsSomething,
  stepStatus,
  stepTitleFor,
  whyThisView,
  type TodayScreenInput,
} from '../src/components/learning/today/todayViewModel.ts';
import { selectTutorMood, tutorReachable } from '../src/components/tutor/mrez-mood.ts';
import { CERTAINTY_LABEL } from '../src/components/reportTrends.ts';
import { CERTAINTY_ORDER } from '../src/lib/learning/contracts/policy.ts';
import { isDeferralActive, INTAKE_DEFER_DAYS } from '../src/components/learning/today/intakeDeferral.ts';
import { learningCatalogue } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { createInitialPlan, defaultPlanConstraints, emptyPlanGoals } from '../src/lib/learning/planner.ts';
import { sharedSessionFrom } from '../src/lib/learning/adapters.ts';
import type { PersonalPlanV1, SessionStep } from '../src/lib/learning/contracts/plan.ts';
import { syntheticExpired, syntheticNew, syntheticMatchingHeadings } from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

/* ------------------------------------------------------------------ */
/* adapters.ts: a step's real title, against the real catalogue        */
/* ------------------------------------------------------------------ */

function step(over: Partial<SessionStep>): SessionStep {
  return {
    stepId: 's1',
    role: 'teach',
    activityId: 'lesson:reading-task1',
    contentVersion: 1,
    minutes: 8,
    purpose: 'TEACH, Start with what this question type actually asks you for.',
    state: 'pending',
    ...over,
  };
}

function planWith(steps: readonly SessionStep[]): PersonalPlanV1 {
  return {
    version: 1,
    revision: 1,
    evidenceVersion: 1,
    status: 'on-track',
    confirmed: true,
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
    goals: emptyPlanGoals(),
    constraints: defaultPlanConstraints({ regularDailyMinutesStatus: 'confirmed', regularDailyMinutes: 60 }),
    activeSession: {
      id: 'session:1',
      date: '2026-09-22',
      objective: 'Practise.',
      objectiveScope: 'reading:sentence-completion',
      subskill: 'sentence-completion',
      paper: 'reading',
      reason: 'Synthetic fixture.',
      evidenceRefs: [],
      steps,
      budgetMinutes: 25,
      state: 'active',
    },
    schedule: [],
    milestones: [],
    alternatives: [],
    overrides: [],
    history: [],
    diagnosticsOutstanding: [],
  };
}

test('sharedSessionFrom: two TEACH steps for different lessons no longer read identically (item 2, the exact reported bug)', () => {
  const overview = step({ stepId: 's1', activityId: 'lesson:reading-task1' });
  const sentenceCompletion = step({ stepId: 's2', activityId: 'lesson:reading-sentence' });
  const session = sharedSessionFrom({ plan: planWith([overview, sentenceCompletion]), catalogue: CATALOGUE });
  assert.equal(session.steps[0]!.title, 'Reading Overview');
  assert.equal(session.steps[1]!.title, 'Sentence Completion');
  // Before item 2, only `purpose` was shown, and both steps share it.
  assert.equal(session.steps[0]!.purpose, session.steps[1]!.purpose);
  // The real fix: the titles differ even though the purpose does not.
  assert.notEqual(session.steps[0]!.title, session.steps[1]!.title);
});

test('sharedSessionFrom: a lesson-check step\'s title is its parent lesson\'s, from its first prerequisite', () => {
  const check = step({ activityId: 'check:practice-reading-sentence', role: 'practise' });
  const session = sharedSessionFrom({ plan: planWith([check]), catalogue: CATALOGUE });
  assert.equal(session.steps[0]!.title, 'Sentence Completion');
});

test('sharedSessionFrom: a drill has no catalogue title yet, so the shared view honestly says null (reported to the lead)', () => {
  const drill = step({ activityId: 'drill:reading-full-001-drill-p1', role: 'practise' });
  const session = sharedSessionFrom({ plan: planWith([drill]), catalogue: CATALOGUE });
  assert.equal(session.steps[0]!.title, null);
  assert.equal(session.steps[0]!.paper, 'reading');
});

test('sharedSessionFrom: regularDailyMinutesStatus is carried onto the shared session view (item 5)', () => {
  const session = sharedSessionFrom({ plan: planWith([step({})]), catalogue: CATALOGUE });
  assert.equal(session.regularDailyMinutesStatus, 'confirmed');
});

function screenInput(over: Partial<TodayScreenInput> = {}): TodayScreenInput {
  return {
    confirmed: true,
    planStatus: 'on-track',
    finished: false,
    intakeDeferred: false,
    intakeInProgress: false,
    ...over,
  };
}

/* ------------------------------------------------------------------ */
/* selectTodayScreen                                                   */
/* ------------------------------------------------------------------ */

test('selectTodayScreen: an unconfirmed goal asks first, every time but once deferred', () => {
  assert.equal(selectTodayScreen(screenInput({ confirmed: false })), 'intake');
  // Deferring reveals whatever the plan would otherwise show, not a second
  // "answer this" screen the same visit.
  assert.equal(selectTodayScreen(screenInput({ confirmed: false, intakeDeferred: true })), 'active');
});

test('selectTodayScreen: a passed exam date wins over "finished", it is never a completion message', () => {
  const input = screenInput({ planStatus: 'date-passed', finished: true });
  assert.equal(selectTodayScreen(input), 'date-passed');
});

test('selectTodayScreen: finished today shows once every step is done or skipped', () => {
  assert.equal(selectTodayScreen(screenInput({ finished: true })), 'finished');
});

test('selectTodayScreen: the ordinary states (provisional, recovering, exam-imminent, goal-met) are all "active"', () => {
  for (const planStatus of ['on-track', 'provisional-no-date', 'recovering', 'exam-imminent', 'goal-met'] as const) {
    assert.equal(selectTodayScreen(screenInput({ planStatus })), 'active', planStatus);
  }
});

test('selectTodayScreen: intakeInProgress holds the intake screen even once confirmed flips true (item 3)', () => {
  // The exact regression this field exists to close: saving inside the
  // intake confirms the plan mid-render. Without the latch, `confirmed:
  // true` alone would already switch the screen to 'active' and unmount
  // the intake before its own "plan saved" outcome could paint.
  const input = screenInput({ confirmed: true, intakeInProgress: true });
  assert.equal(selectTodayScreen(input), 'intake');
});

test('selectTodayScreen: intakeInProgress wins over a passed date or a finished session too', () => {
  assert.equal(selectTodayScreen(screenInput({ intakeInProgress: true, planStatus: 'date-passed' })), 'intake');
  assert.equal(selectTodayScreen(screenInput({ intakeInProgress: true, finished: true })), 'intake');
});

test('selectTodayScreen: once intakeInProgress is cleared, an already-confirmed plan shows normally', () => {
  // What the intake's own onDone does: stop the latch, and the screen
  // underneath (already confirmed by the save) is free to show.
  const input = screenInput({ confirmed: true, intakeInProgress: false });
  assert.equal(selectTodayScreen(input), 'active');
});

/* ------------------------------------------------------------------ */
/* isSessionFinished                                                    */
/* ------------------------------------------------------------------ */

test('isSessionFinished: state completed is finished regardless of the steps', () => {
  assert.equal(isSessionFinished({ state: 'completed', steps: [{ stepId: 'a', state: 'pending' }] as never }), true);
});

test('isSessionFinished: no steps at all is not finished, there is nothing to have demonstrated', () => {
  assert.equal(isSessionFinished({ state: 'active', steps: [] }), false);
});

test('isSessionFinished: every step done or skipped is finished', () => {
  const steps = [{ stepId: 'a', state: 'done' }, { stepId: 'b', state: 'skipped' }] as never;
  assert.equal(isSessionFinished({ state: 'active', steps }), true);
});

test('isSessionFinished: one pending step is not finished', () => {
  const steps = [{ stepId: 'a', state: 'done' }, { stepId: 'b', state: 'pending' }] as never;
  assert.equal(isSessionFinished({ state: 'active', steps }), false);
});

/* ------------------------------------------------------------------ */
/* stepStatus                                                          */
/* ------------------------------------------------------------------ */

test('stepStatus: done and skipped are read straight off the step', () => {
  assert.equal(stepStatus({ stepId: 'a', state: 'done' }, null), 'done');
  assert.equal(stepStatus({ stepId: 'a', state: 'skipped' }, 'a'), 'skipped');
});

test('stepStatus: the session\'s current step id is what makes a pending step read as current', () => {
  assert.equal(stepStatus({ stepId: 'a', state: 'pending' }, 'a'), 'current');
  assert.equal(stepStatus({ stepId: 'b', state: 'pending' }, 'a'), 'upcoming');
  assert.equal(stepStatus({ stepId: 'a', state: 'in-progress' }, 'a'), 'current');
});

/* ------------------------------------------------------------------ */
/* mainAction                                                          */
/* ------------------------------------------------------------------ */

test('mainAction: Start until a step has moved, Continue once any step has', () => {
  assert.equal(mainAction([{ state: 'pending' }, { state: 'pending' }]), 'start');
  assert.equal(mainAction([{ state: 'in-progress' }, { state: 'pending' }]), 'continue');
  assert.equal(mainAction([{ state: 'done' }, { state: 'pending' }]), 'continue');
});

test('mainAction: a refresh mid-session must not show Start again over work already begun', () => {
  // The exact regression this function exists for: a step already 'done'
  // (from an earlier visit) must never be read as a fresh, untouched
  // session on the next page load.
  assert.equal(mainAction([{ state: 'done' }]), 'continue');
});

/* ------------------------------------------------------------------ */
/* mapStoredCourseView: the old "Course view" preference                */
/* ------------------------------------------------------------------ */

test('mapStoredCourseView: the pre-rework "order" value becomes "route"', () => {
  assert.equal(mapStoredCourseView('order'), 'route');
});

test('mapStoredCourseView: "sections" is carried forward unchanged', () => {
  assert.equal(mapStoredCourseView('sections'), 'sections');
});

test('mapStoredCourseView: nothing stored, or anything unrecognised, falls back to "route"', () => {
  assert.equal(mapStoredCourseView(null), 'route');
  assert.equal(mapStoredCourseView(''), 'route');
  assert.equal(mapStoredCourseView('something-corrupted'), 'route');
});

/* ------------------------------------------------------------------ */
/* daysUntil and focusAreas                                            */
/* ------------------------------------------------------------------ */

test('daysUntil: whole days ahead, positive when the date has not arrived yet', () => {
  assert.equal(daysUntil('2026-10-01', '2026-09-22'), 9);
  assert.equal(daysUntil('2026-09-22', '2026-09-22'), 0);
  assert.equal(daysUntil('2026-09-15', '2026-09-22'), -7);
});

test('focusAreas: with no policy figures, an outstanding paper is unknown and a touched one is limited, never a number', () => {
  // The plan alone supports exactly these two words: diagnosticsOutstanding
  // IS "no usable evidence of any kind", and every other paper has been
  // touched by something real but the plan cannot say how much.
  const areas = focusAreas(['reading', 'listening', 'writing', 'speaking'], ['writing', 'speaking']);
  assert.deepEqual(areas, [
    { paper: 'reading', certainty: 'limited' },
    { paper: 'listening', certainty: 'limited' },
    { paper: 'writing', certainty: 'unknown' },
    { paper: 'speaking', certainty: 'unknown' },
  ]);
});

test('focusAreas: the real certainty wins when the caller has it, all five words come through', () => {
  const areas = focusAreas(['reading', 'listening', 'writing', 'speaking'], ['speaking'], {
    reading: 'measured',
    listening: 'tentative',
    writing: 'limited',
    speaking: 'self-reported',
  });
  assert.deepEqual(areas.map((a) => a.certainty), ['measured', 'tentative', 'limited', 'self-reported']);
  // A self-reported claim is real evidence the student gave us, so it is
  // not "unknown", but it is never measured work either, and the word the
  // panel shows for it says exactly that.
  assert.equal(FOCUS_CERTAINTY_LABEL['self-reported'], 'Self-reported');
});

test('focusAreas: unknown reads as unknown, never as a zero and never as a number', () => {
  const [area] = focusAreas(['reading'], ['reading']);
  assert.equal(area!.certainty, 'unknown');
  const word = FOCUS_CERTAINTY_LABEL[area!.certainty];
  assert.equal(word, 'Unknown');
  assert.ok(!/\d/.test(word), 'a certainty word must never contain a digit');
  assert.ok(!/%/.test(word), 'a certainty word must never be a percentage');
});

test('focusAreas: every certainty word this panel can show is free of digits and percentages', () => {
  for (const certainty of CERTAINTY_ORDER) {
    const word = FOCUS_CERTAINTY_LABEL[certainty];
    assert.ok(word, `${certainty} has no word`);
    assert.ok(!/[\d%]/.test(word), `${certainty} reads as a number: ${word}`);
  }
});

test('FOCUS_CERTAINTY_LABEL is the progress report\'s own vocabulary, so /report and the focus panel agree', () => {
  // Re-exported, not copied. If this ever fails, the two pages have started
  // saying different things about the same paper, which is the whole reason
  // the one evidence policy exists.
  assert.equal(FOCUS_CERTAINTY_LABEL, CERTAINTY_LABEL);
});

/* ------------------------------------------------------------------ */
/* Against the real planner, for two of the states above                */
/* ------------------------------------------------------------------ */

function sessionFor(profile: ReturnType<typeof syntheticNew>) {
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
  return { plan, session: sharedSessionFrom({ plan, catalogue: CATALOGUE }) };
}

test('SYNTHETIC-new (no goal, no evidence) selects the intake screen through the real planner', () => {
  const { plan, session } = sessionFor(syntheticNew());
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
    intakeInProgress: false,
  });
  assert.equal(screen, 'intake');
});

test('SYNTHETIC-expired (exam date ten days past) selects date-passed through the real planner, never finished', () => {
  const { plan, session } = sessionFor(syntheticExpired());
  assert.equal(plan.status, 'date-passed');
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
    intakeInProgress: false,
  });
  assert.equal(screen, 'date-passed');
});

test('SYNTHETIC-matching-headings (confirmed goal, evidence on record) selects the active session', () => {
  const { plan, session } = sessionFor(syntheticMatchingHeadings());
  assert.equal(plan.confirmed, true);
  const screen = selectTodayScreen({
    confirmed: plan.confirmed,
    planStatus: plan.status,
    finished: isSessionFinished(session),
    intakeDeferred: false,
    intakeInProgress: false,
  });
  assert.equal(screen, 'active');
  // The session actually has steps to show, not an empty shell.
  assert.ok(session.steps.length > 0);
});

/* ------------------------------------------------------------------ */
/* sessionKicker and the step title/purpose split (item 1 and item 2)  */
/* ------------------------------------------------------------------ */

test('sessionKicker: names the paper and humanises the subskill, never translating the type', () => {
  assert.deepEqual(sessionKicker('reading', 'sentence-completion'), { paper: 'reading', type: 'sentence completion' });
});

test('sessionKicker: null when the session has no single paper (a mock, a planning step)', () => {
  assert.equal(sessionKicker(undefined, 'exam-format'), null);
});

test('stepTitleFor: the catalogue title wins, then the caller\'s composed fallback, then purpose', () => {
  assert.equal(stepTitleFor({ title: 'Sentence Completion', purpose: 'Practise.' }, 'Reading drill'), 'Sentence Completion');
  assert.equal(stepTitleFor({ title: null, purpose: 'Practise.' }, 'Reading drill'), 'Reading drill');
  assert.equal(stepTitleFor({ title: null, purpose: 'Practise.' }, ''), 'Practise.');
});

test('stepPurposeAddsSomething: the exact regression, two same-role steps with one generic purpose sentence', () => {
  // Before item 2, both a "Reading overview" TEACH step and a "Sentence
  // Completion" TEACH step showed only this purpose text and read
  // identically. Now the title tells them apart; the purpose is a second
  // line only when it is not just repeating the title.
  const purpose = 'TEACH, Start with what this question type actually asks you for.';
  assert.equal(stepPurposeAddsSomething('Reading overview', purpose), true);
  assert.equal(stepPurposeAddsSomething('Sentence Completion', purpose), true);
  assert.equal(stepPurposeAddsSomething('Sentence Completion', 'Sentence Completion'), false);
  assert.equal(stepPurposeAddsSomething('Sentence Completion', '   '), false);
});

test('stepForeignPaper: flags a step from a different paper than the session, e.g. a Listening sample inside Reading', () => {
  assert.equal(stepForeignPaper('listening', 'reading'), 'listening');
  assert.equal(stepForeignPaper('reading', 'reading'), null);
  assert.equal(stepForeignPaper(undefined, 'reading'), null);
  assert.equal(stepForeignPaper('reading', undefined), null);
});

/* ------------------------------------------------------------------ */
/* dailyMinutesGoal (item 5)                                            */
/* ------------------------------------------------------------------ */

test('dailyMinutesGoal: no target at all while the daily minutes were never confirmed', () => {
  // The exact bug: a brand-new student with no confirmed daily time used
  // to see "0 / 25 min today", a number nobody chose. Now there is no
  // number until one is confirmed.
  assert.equal(dailyMinutesGoal('provisional', 60), null);
  assert.equal(dailyMinutesGoal(undefined, 25), null);
});

test('dailyMinutesGoal: once confirmed, today\'s actual budget is the target on an ordinary day', () => {
  assert.equal(dailyMinutesGoal('confirmed', 60), 60);
});

test('dailyMinutesGoal: on a temporary short day, today\'s shorter budget shows, the regular figure is untouched elsewhere', () => {
  // budgetMinutes is already the short-day figure by the time this runs
  // (chooseLessTimeToday only ever changes today's budget, never
  // regularDailyMinutes itself, see adapters.ts/planner.ts), so passing
  // it straight through is both the ordinary-day and the short-day rule.
  assert.equal(dailyMinutesGoal('confirmed', 15), 15);
});

/* ------------------------------------------------------------------ */
/* scopeNoteView and splitScopeNote (item 7)                           */
/* ------------------------------------------------------------------ */

test('splitScopeNote: breaks a planner-concatenated note into its own sentences, without changing a word', () => {
  const note = 'There is no exam date on this plan, so the pacing is provisional. Add a date and the plan will pace itself to it.';
  assert.deepEqual(splitScopeNote(note), [
    'There is no exam date on this plan, so the pacing is provisional.',
    'Add a date and the plan will pace itself to it.',
  ]);
});

test('scopeNoteView: null for nothing to show', () => {
  assert.equal(scopeNoteView(null), null);
  assert.equal(scopeNoteView(''), null);
  assert.equal(scopeNoteView(undefined), null);
});

test('scopeNoteView: a note of one to three sentences shows in full, no collapsing needed', () => {
  const note = 'One. Two. Three.';
  const view = scopeNoteView(note);
  assert.deepEqual(view, { headline: 'One.', inline: ['Two.', 'Three.'], collapsed: [] });
});

test('scopeNoteView: more than three sentences collapses everything past the headline behind "and N more"', () => {
  // The brief's own example: a seven day, fifteen minute plan whose scope
  // note used to read as one long run-on paragraph. This is presentation
  // only: planner.ts still writes every sentence, this just decides where
  // the reading breaks.
  const note = 'One. Two. Three. Four. Five.';
  const view = scopeNoteView(note);
  assert.deepEqual(view, { headline: 'One.', inline: [], collapsed: ['Two.', 'Three.', 'Four.', 'Five.'] });
});

/* ------------------------------------------------------------------ */
/* isDeferralActive: "answer later" persisted for a few days (item 4)  */
/* ------------------------------------------------------------------ */

test('isDeferralActive: false with nothing recorded', () => {
  assert.equal(isDeferralActive(null, '2026-09-22'), false);
});

test('isDeferralActive: true on the day it was recorded, and for the rest of the window', () => {
  assert.equal(isDeferralActive('2026-09-22', '2026-09-22'), true);
  assert.equal(isDeferralActive('2026-09-22', '2026-09-25', INTAKE_DEFER_DAYS), true);
});

test('isDeferralActive: false once the window has passed', () => {
  assert.equal(isDeferralActive('2026-09-22', '2026-09-22', 4), true); // day 0, inside a 4-day window
  assert.equal(isDeferralActive('2026-09-22', '2026-09-26', 4), false); // day 4, the window has closed
});

test('isDeferralActive: a record that looks like it is from the future never counts as active', () => {
  // Costs a re-ask at worst, never a reason to ask less.
  assert.equal(isDeferralActive('2026-09-25', '2026-09-22'), false);
});

/* ------------------------------------------------------------------ */
/* whyThisView: the evidence, never the headline again (item 11d)       */
/* ------------------------------------------------------------------ */

test('addsSomethingBeside: an exact repeat adds nothing, and neither does a sentence the shown text already contains', () => {
  assert.equal(addsSomethingBeside('Due for review since 2026-09-01.', 'Due for review since 2026-09-01'), false);
  assert.equal(addsSomethingBeside('  DUE for   review since 2026-09-01!  ', 'Due for review since 2026-09-01.'), false);
  assert.equal(
    addsSomethingBeside('You need at least band 7 in Reading.', 'You need at least band 7 in Reading, so this comes first.'),
    false,
  );
  assert.equal(addsSomethingBeside('You need at least band 7 in Reading.', 'Nothing has been measured yet.'), true);
  assert.equal(addsSomethingBeside('   ', 'Anything.'), false);
});

test('whyThisView: the exact reported bug, the reason sentence from the top of the card is never repeated', () => {
  // On a build with no AI configured, MrEzWelcome speaks session.reason
  // verbatim at the top of the card. "Why this" used to print the same
  // string underneath it.
  const reason = 'Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.';
  const view = whyThisView(
    [
      { kind: 'no-evidence', evidence: reason },
      { kind: 'estimate', evidence: '12 of 20 answered on your own across 2 sittings, most recently 4 days ago.' },
    ],
    [reason, 'Read a short passage for detail.'],
  );
  assert.deepEqual(view.evidence, ['12 of 20 answered on your own across 2 sittings, most recently 4 days ago.']);
});

test('whyThisView: keeps the planner\'s own evidence sentences, in order, and says them once', () => {
  const view = whyThisView(
    [
      { kind: 'estimate', evidence: '8 of 20 answered on your own across 2 sittings, most recently 3 days ago.' },
      { kind: 'goal', evidence: 'You need at least band 7 in Reading.' },
      { kind: 'goal', evidence: 'You need at least band 7 in Reading.' },
      { kind: 'due-review', evidence: 'Due for review since 2026-09-14.' },
    ],
    ['Practise matching headings under timing.'],
  );
  assert.deepEqual(view.evidence, [
    '8 of 20 answered on your own across 2 sittings, most recently 3 days ago.',
    'You need at least band 7 in Reading.',
    'Due for review since 2026-09-14.',
  ]);
  assert.equal(view.restsOnNothingRecorded, false);
});

test('whyThisView: a plan resting on nothing recorded says so, and never claims a finding', () => {
  const view = whyThisView(
    [{ kind: 'no-evidence', evidence: 'Nothing independent recorded for this yet.' }],
    ['Start with how the Reading paper works.'],
  );
  assert.equal(view.restsOnNothingRecorded, true);
  assert.deepEqual(view.evidence, ['Nothing independent recorded for this yet.']);
});

test('whyThisView: no refs at all, or refs that only repeat the card, leave the evidence half empty', () => {
  assert.deepEqual(whyThisView([], ['Anything.']), { evidence: [], restsOnNothingRecorded: false });
  assert.deepEqual(whyThisView(null, ['Anything.']), { evidence: [], restsOnNothingRecorded: false });
  assert.deepEqual(whyThisView(undefined, ['Anything.']), { evidence: [], restsOnNothingRecorded: false });
  const same = 'You need at least band 7 in Reading.';
  assert.deepEqual(whyThisView([{ kind: 'goal', evidence: same }], [same]).evidence, []);
});

test('whyThisView against the REAL planner: a brand-new student sees evidence, not the reason line again', () => {
  const { plan, session } = sessionFor(syntheticNew());
  const view = whyThisView(plan.activeSession.evidenceRefs, [session.reason, session.objective]);
  // The planner always attaches at least one ref (evidenceRefsFor falls
  // back to the no-evidence sentence), and it is never the reason itself.
  assert.ok(plan.activeSession.evidenceRefs.length > 0, 'the planner attached no evidence at all');
  for (const line of view.evidence) {
    assert.notEqual(line.trim().toLowerCase(), session.reason.trim().toLowerCase());
    assert.notEqual(line.trim().toLowerCase(), session.objective.trim().toLowerCase());
  }
});

test('whyThisView against the REAL planner: a student with evidence on record gets counted sentences', () => {
  const { plan, session } = sessionFor(syntheticMatchingHeadings());
  const view = whyThisView(plan.activeSession.evidenceRefs, [session.reason, session.objective]);
  assert.ok(view.evidence.length > 0, 'a student with real evidence saw no evidence sentence');
  for (const line of view.evidence) {
    assert.notEqual(line.trim().toLowerCase(), session.reason.trim().toLowerCase());
  }
});

/* ------------------------------------------------------------------ */
/* Mr EZ's face: mood follows reachability, not the drawer (item 9)     */
/* ------------------------------------------------------------------ */
/* These live in this file because it is this work package's own test
   file; the function under test is src/components/tutor/mrez-mood.ts. */

function faceInput(over: Partial<Parameters<typeof selectTutorMood>[0]> = {}) {
  return {
    configured: true,
    signedIn: true,
    busy: false,
    failed: false,
    blocked: false,
    lastReplyMood: null,
    ...over,
  };
}

test('selectTutorMood: the exact reported bug, an unconfigured build stays unavailable however the panel is used', () => {
  // Before item 9 the launcher read `open ? 'explaining' : mood`, so
  // pressing it flipped the avatar to "explaining" on a build with no
  // tutor at all. Nothing about opening a drawer is an input here now.
  const noTutor = faceInput({ configured: false });
  assert.equal(selectTutorMood(noTutor), 'unavailable');
  assert.equal(tutorReachable(noTutor), false);
});

test('selectTutorMood: signed out is unavailable too, he cannot answer without knowing whose record to read', () => {
  assert.equal(selectTutorMood(faceInput({ signedIn: false })), 'unavailable');
  // Not resolved yet is not the same as signed out.
  assert.equal(selectTutorMood(faceInput({ signedIn: null })), 'idle');
});

test('selectTutorMood: a failed attempt is unavailable, not thinking and not explaining', () => {
  assert.equal(selectTutorMood(faceInput({ failed: true })), 'unavailable');
  assert.equal(selectTutorMood(faceInput({ failed: true, lastReplyMood: 'explaining' })), 'unavailable');
});

test('selectTutorMood: unreachable beats a reply that arrived earlier', () => {
  // A conversation restored from storage on a build with no tutor must not
  // leave his face mid-explanation.
  assert.equal(selectTutorMood(faceInput({ configured: false, lastReplyMood: 'celebrating' })), 'unavailable');
});

test('selectTutorMood: thinking only while a request is genuinely in flight, on a reachable tutor', () => {
  assert.equal(selectTutorMood(faceInput({ busy: true })), 'thinking');
  assert.equal(selectTutorMood(faceInput({ busy: true, configured: false })), 'unavailable');
});

test('selectTutorMood: under exam conditions he rests rather than explains', () => {
  assert.equal(selectTutorMood(faceInput({ blocked: true, lastReplyMood: 'explaining' })), 'idle');
});

test('selectTutorMood: a real reply\'s own mood is what shows once one has arrived', () => {
  assert.equal(selectTutorMood(faceInput({ lastReplyMood: 'explaining' })), 'explaining');
  assert.equal(selectTutorMood(faceInput({ lastReplyMood: 'encouraging' })), 'encouraging');
  assert.equal(selectTutorMood(faceInput()), 'idle');
});

test('selectTutorMood: with no live tutor the face is only ever idle or unavailable', () => {
  // The rule stated as a rule: nothing that is not reachable may show a
  // face that suggests he is about to say something.
  for (const lastReplyMood of [null, 'idle', 'thinking', 'explaining', 'encouraging', 'celebrating', 'unavailable'] as const) {
    for (const busy of [false, true]) {
      for (const blocked of [false, true]) {
        for (const unreachable of [{ configured: false }, { signedIn: false as const }, { failed: true }]) {
          const mood = selectTutorMood(faceInput({ lastReplyMood, busy, blocked, ...unreachable }));
          assert.ok(
            mood === 'idle' || mood === 'unavailable',
            `unreachable tutor showed "${mood}" for ${JSON.stringify({ lastReplyMood, busy, blocked, ...unreachable })}`,
          );
        }
      }
    }
  }
});
