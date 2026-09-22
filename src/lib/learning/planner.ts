/* The one planner. Pure: inputs in, a plan out.
 *
 * WHAT IT REPLACES
 * Three engines answer "what next" today and they disagree with each other
 * on the same screen (the audit's first reproduced finding). This module is
 * the single answer; `courseStatus`, `getTodayPlan` and `recommendNext`
 * become adapters over `plan.activeSession` in the next package.
 *
 * THE FOUR RULES THAT SHAPE EVERYTHING BELOW
 *
 * 1. The budget is a constraint. Session assembly asserts it, the schedule
 *    asserts it per day, and the audit's 255-minute day is therefore not
 *    representable.
 * 2. The active session is stable. It changes on four triggers and nothing
 *    else. A page refresh, a sync that brought nothing and a late AI reply
 *    all read the stored session as it is. A replan that changes nothing
 *    writes nothing.
 * 3. Nothing is invented. No exam date, no starting band, no promise about a
 *    score. A passed date asks for a new one; it never reads as finished.
 * 4. Every number is counted here and only the wording is left to a model.
 *    An AI proposal is checked against the plan revision, the evidence
 *    version, the catalogue and the offered shortlist, and a refusal always
 *    has a name.
 *
 * PURE
 * No storage, no clock, no network. `now` and `today` are arguments; ids are
 * hashes of content. The same input always produces the same plan.
 */

import type {
  CatalogueActivity,
  LearningCatalogueV1,
  Paper,
  Subskill,
} from './contracts/catalog';
import { PAPERS } from './contracts/catalog';
import type { LearnerRecordV1 } from './contracts/evidence';
import type {
  AbilityEstimate,
  GapAssessment,
  PolicyOutputV1,
  PolicyScope,
  PolicyScopeKey,
  PolicyThresholds,
} from './contracts/policy';
import { DEFAULT_POLICY_THRESHOLDS } from './contracts/policy';
import type {
  DailyMinutes,
  Milestone,
  PersonalPlanV1,
  PlanAlternative,
  PlanChange,
  PlanConstraints,
  PlanGoals,
  PlanOverride,
  PlanSession,
  PlanStatus,
  PlannerWeights,
  ReplanTrigger,
  ScheduledDay,
  SessionEvidenceRef,
  VocabularySignalV1,
} from './contracts/plan';
import {
  DAILY_MINUTE_CHOICES,
  DEFAULT_PLANNER_WEIGHTS,
  DIAGNOSTIC_MAX_SESSIONS,
  PLAN_HISTORY_MAX,
  RECOMMENDED_DAILY_MINUTES,
  RECOVERY_MAX_BUDGET_MULTIPLE,
  RECOVERY_TRIGGER_MISSED_DAYS,
  SCHEDULE_HORIZON_DAYS,
  SHORT_DEADLINE_DAYS,
} from './contracts/plan';
import type { LearningAiVersions, ProposalDisagreement, ProposalRejectionCode } from './contracts/ai';
import { MAX_PROPOSAL_CANDIDATES } from './contracts/ai';
import { LEARNING_INDEX, coverageFit, findActivity, learningCatalogue, prerequisiteClosure } from './catalog';
import { canonicalJson, hashContent } from './evidence';
import { scopeKeyOf } from './policy';
import type { Locale } from '../i18n/locale';
import { learningText } from './ru';
import type { EligibilityContext, LearnerFacts, PlannedObjective } from './session';
import {
  assembleSession,
  calendarDaysBetween,
  checkpointPaper,
  ineligibleReason,
  isEligible,
  learnerFacts,
  practiceOptions,
  sessionMinutes,
  subskillKey,
  teachOptions,
  teachingPath,
} from './session';

/* ── Every sentence this file can write ──────────────────────────────────── */

/** All the English this module produces, in one place.
 *
 *  Plain English literals, which are ALSO the lookup keys for Russian
 *  (architecture section 1.6): every access below goes through
 *  `sentence()`/`learningText()` from `./ru`, following the exact pattern
 *  `src/lib/tutor/ru.ts` uses, because this module is imported by the Mr EZ
 *  Worker and cannot read the site's own lazy dictionary. `{name}` is filled
 *  after lookup, the same convention as t() in src/lib/i18n/translate.ts, so
 *  Russian may reorder them.
 *
 *  Every one of them is written to the same rule: state what was counted,
 *  say when it is uncertain, promise no band and claim no mastery. */
export const PLANNER_SENTENCES = {
  /* Reasons for today's objective. */
  reasonMeasuredGap:
    'You answered {correct} of {items} of these on your own across {occasions} sittings. That is below what {paper} needs for your target, so it is the most useful hour you have.',
  reasonMeasuredBandGap:
    'Your measured {paper} is around band {band} and you need at least {required}. Closing that is the most useful hour you have, and the estimate can still move either way.',
  reasonThinGap:
    'One result puts this below what you need. It is a single occasion rather than a settled picture, so this is a second look rather than a conclusion.',
  reasonUnknownPaper:
    'Nothing has been measured for {paper} yet, so the plan cannot say where you are. A short sample changes that.',
  reasonDueReview:
    'You last showed this {days} days ago. Spacing says it is time to prove it again rather than let it fade.',
  reasonCoverage:
    '{paper} has had nothing recorded for {days} days, so it is due a turn before it goes cold.',
  reasonDeadline:
    'There are {days} days left, and this is work that can still move in that time.',
  reasonSelfReported:
    'You told us {paper} feels hardest. That is your own account rather than a measurement, so it only sets the starting order and the first real result will correct it.',
  reasonStartHere:
    'Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.',
  reasonKeepSharp:
    'Everything measured here is already at or above what you need, so this keeps it sharp rather than fixing a problem.',
  reasonStudentChose: 'You chose this, so the plan follows it and keeps the evidence it produces.',
  reasonPlanning:
    'The exam date on this plan has passed. Nothing here is finished; the plan needs a new date or a new goal before it can pace anything.',

  /* Evidence sentences that sit beside a reason. */
  evidenceNone: 'Nothing independent recorded for this yet.',
  evidenceCounted:
    '{correct} of {items} answered on your own across {occasions} sittings, most recently {days} days ago.',
  evidenceGoal: 'You need at least band {band} in {paper}.',
  evidenceDue: 'Due for review since {date}.',
  evidenceSelfReported: 'You reported band {band} on {date}, which we have not measured.',

  /* Change history. */
  changeInitial: 'Your plan is set up. Today is {objective}.',
  changeObjective: 'Today moves from {from} to {to}. {why}',
  changeStatus: 'The plan is now {status}. {why}',
  changeRecovery:
    'You missed {days} study days, so the week was rebuilt from where you actually are rather than piling the old days on top. {dropped}',
  changeDropped: '{count} things no longer fit before the exam and were taken off the plan.',
  changeNothingDropped: 'Nothing had to be dropped.',
  changeOverrideShorter: 'You asked for a shorter day, so today is {minutes} minutes. Your regular {regular} minutes are unchanged.',
  changeOverrideSkill: 'You chose {paper} today, so the plan follows that and uses whatever it shows.',
  changeOverrideCommitment: 'You accepted a longer session for {label}, so today is given over to it.',
  changeTeacherInput:
    '{objective} has not improved after {attempts} independent tries, so the plan stops offering more of the same drill and moves on. This one is worth a teacher looking at.',
  changeGoal: 'Your goal or your settings changed, so the priorities were worked out again.',

  /* Honest scope. */
  /* Four short sentences, never one long one. Every surface that shows a
     scope note splits it at its own sentence boundaries and collapses
     what is past the first (scopeNoteView in
     src/components/learning/today/todayViewModel.ts), so a run-on here
     arrives on the screen as a wall of text that cannot be broken up.
     The lists inside it are joined with commas and a final "and" for the
     same reason: "A and B and C" read as one breathless clause. */
  scopeShortDeadline:
    'There are {days} study days left and {minutes} minutes a day, which is about {total} minutes in total. That is enough to work on {covered}. {missed} will not get real coverage in the time left. No plan can promise a band.',
  scopeNoDate:
    'There is no exam date on this plan, so the pacing is provisional. Add a date and the plan will pace itself to it.',
  scopeDatePassed:
    'The exam date has passed. Set a new date or change the goal, and the plan will rebuild around it.',
  scopeNoShortSample:
    'There is nothing short enough in the library to sample {paper} in one sitting yet, so {paper} stays unknown until there is time for a full task.',
  scopeRecovering: 'You are picking this back up after {days} missed days, so today is a normal day and nothing has been stacked on it.',

  /* Milestones. */
  milestoneDiagnostic: 'Take a short {paper} sample so the plan stops guessing',
  milestoneObjective: '{objective} shown on questions you have not seen',
  milestoneCheckpoint: 'Sit a full {paper} paper under exam timing',
  milestoneDroppedNoTime: 'There are not enough study days left before the exam to reach this.',

  /* Alternatives. */
  altShorter: 'I have less time today: {minutes} minutes instead',
  altOtherSkill: 'Work on {paper} instead today',
  altDeferDiagnostic: 'Skip the {paper} sample for now and leave it marked unknown',

  /* Proposal refusals. */
  rejectStalePlan: 'That suggestion was made against an older version of the plan.',
  rejectStaleEvidence: 'That suggestion was made before your latest result came in.',
  rejectStaleIndex: 'That suggestion was made against an older version of the library.',
  rejectMalformed: 'That suggestion did not name an activity.',
  rejectUnknown: 'That suggestion named something that is not in the library.',
  rejectUnavailable: 'That activity cannot be scheduled: {reason}',
  rejectNotInShortlist: 'That activity was not one of the ones offered.',
  rejectPrerequisite: 'Something else has to come first before that one is useful.',
  rejectOverBudget: 'That activity needs {minutes} minutes and today has {budget}.',
  rejectOverride: 'You asked to skip that one.',
  rejectUnderAssessment: 'A timed paper is running, so nothing may be suggested until it is finished.',

  /* The synthetic "set a new goal" objective (planningObjective), previously
     a bare string literal outside this table. */
  objectiveNewGoal: 'Set a new exam date, or change the goal you are working towards.',

  /* buildSchedule's week, previously bare string literals outside this
     table. scheduleReviewFocus's {objective} is already-translated text (see
     objectiveFor in scoreObjectives) when it comes from a PlannedObjective,
     and is translated at the same call site when it comes straight off the
     catalogue (the day after a whole paper, reviewOwed). */
  scheduleExamDay: 'Exam day.',
  scheduleRestDay: 'Rest day.',
  scheduleKeepMoving: 'Keep the four papers moving.',
  scheduleReviewFocus: 'Go back over {objective}',
  scheduleReviewFallback: 'the paper you sat',

  /* shortDeadlineNote's list fallbacks, previously bare string literals. */
  scopeOneThing: 'the one thing that fits',
  scopeEverythingElse: 'Everything else',

  /* validatePlanProposal's one inline reason, previously a bare string
     literal passed straight as the {reason} value. */
  rejectUnavailableSurface: 'it needs something you said you cannot use right now.',
} as const;

/** Fill `{name}` placeholders after lookup, the same way t() does, so a
    translation may reorder them.

    A substituted value can itself be a complete sentence (a catalogue or
    session objective always ends in its own '.'), and it can land right
    next to the template's own terminal punctuation: "Today is {objective}."
    rendered "...within the word limit.." for a real student, a reported
    bug. Every call site that KNOWS it is handing over a whole sentence
    should still strip its own trailing stop first (see asClause below,
    used for exactly that), because that also fixes the different problem
    of a full stop immediately followed by lower-case template words
    ("from {from} to ..."). This is the backstop for whatever that misses:
    a run of two or more terminal marks left anywhere in the filled string
    collapses to the last one. Nothing this site ever writes uses a real
    ellipsis or an intentional "?!" , so collapsing is always safe. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  const filled = template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
  return filled.replace(/[.!?]{2,}/g, (run) => run[run.length - 1]!);
}

/** One PLANNER_SENTENCES entry, translated then filled, in one call. The
    shorthand every function below uses once it has a `locale` in scope. */
function sentence(locale: Locale, template: string, vars?: Record<string, string | number>): string {
  return fill(learningText(locale, template), vars);
}

/** Strips a single trailing '.', '!' or '?' from a complete sentence, so it
    can be spliced into a bigger one without doubling the stop when the
    surrounding template supplies its own terminal punctuation ("Today is
    {objective}." with an objective that is already a whole sentence used
    to render "...within the word limit..", a real reported bug), and
    without reading as a run-on when the template's own words continue
    straight after it instead ("Today moves from {from} to ..."). A
    catalogue or session objective is always a complete sentence on its
    own; every template below that folds one into a bigger sentence takes
    it through this first rather than trust its own ending.

    Previously a one-off `entry.objective.objective.replace(/\.$/, '')` at
    buildMilestones' own call site; pulled out here, fixed to catch '!' and
    '?' too, and reused everywhere else with the same problem (personal
    learning fix round, 2026-09-22). */
export function asClause(text: string): string {
  return text.replace(/[.!?]+$/, '');
}

const PAPER_LABEL: Readonly<Record<Paper, string>> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

const STATUS_LABEL: Readonly<Record<PlanStatus, string>> = {
  'on-track': 'running to your exam date',
  'provisional-no-date': 'running without an exam date, so the pacing is provisional',
  recovering: 'rebuilt after some missed days',
  'date-passed': 'waiting for a new exam date or a new goal',
  'exam-imminent': 'on the last day or two before your exam',
  'goal-met': 'showing every requirement met on measured evidence',
};

/* ── Defaults a new plan starts from ─────────────────────────────────────── */

/** A student who has told us nothing yet. Sixty minutes is Alex's
 *  recommended commitment and it is marked `provisional`, which is the whole
 *  point: it is a suggestion the intake asks them to confirm, never a
 *  setting made on their behalf. An existing student's own number arrives
 *  through `constraints` and is copied through untouched. */
export function defaultPlanConstraints(over: Partial<PlanConstraints> = {}): PlanConstraints {
  return {
    regularDailyMinutes: RECOMMENDED_DAILY_MINUTES,
    regularDailyMinutesStatus: 'provisional',
    studyDays: 'daily',
    explanationLocale: 'en',
    tzOffsetMinutes: 0,
    ...over,
  };
}

/** No goals at all: nothing invented, everything unknown. */
export function emptyPlanGoals(): PlanGoals {
  return { overallTarget: null, perPaperMinimums: {}, examDate: null, route: 'academic', selfReported: [] };
}

/* ── Inputs ──────────────────────────────────────────────────────────────── */

export interface PlannerInput {
  catalogue?: LearningCatalogueV1;
  record: LearnerRecordV1;
  /** Already computed from the record and the goals by evaluateEvidence. */
  policy: PolicyOutputV1;
  previous: PersonalPlanV1 | null;
  trigger: ReplanTrigger;
  /** ISO instant. Passed in, never read from a clock here. */
  now: string;
  /** The student's own calendar date, YYYY-MM-DD. */
  today: string;
  /** Supplied on `initial` and `settings-changed`; otherwise the previous
      plan's own goals and constraints are kept exactly as they are. */
  goals?: PlanGoals;
  constraints?: PlanConstraints;
  /** Overrides the student just made. Merged with the ones already on the
      plan; expired ones are dropped. */
  newOverrides?: readonly PlanOverride[];
  weights?: PlannerWeights;
  thresholds?: PolicyThresholds;
  /** What the browser knows about this student's vocabulary, gathered by
      the orchestration layer (src/lib/learning/index.ts) and handed in as
      plain data. Additive and optional: absent means no vocabulary state
      is available, which is always true on the Worker, and the session's
      recall step then behaves exactly as it did before. */
  vocabulary?: VocabularySignalV1 | null;
}

export interface ReplanResult {
  plan: PersonalPlanV1;
  /** Empty when nothing changed. A replan that changes nothing writes
      nothing, which is what makes the active session stable. */
  changes: readonly PlanChange[];
}

/* ── Scoring ─────────────────────────────────────────────────────────────── */

/** One objective, its score and every term that made it, so a test can
    point at the reason a choice came out the way it did. */
export interface ScoredObjective {
  objective: PlannedObjective;
  score: number;
  terms: {
    gap: number;
    weakness: number;
    unknown: number;
    dueReview: number;
    coverage: number;
    deadline: number;
    recency: number;
    strength: number;
    prerequisite: number;
    borrowedFit: number;
    selfReported: number;
    incumbent: number;
  };
  /** The activity a day in the schedule would carry for this objective. */
  primaryActivityId: string | null;
  primaryMinutes: number;
}

const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

/* ── Dates ───────────────────────────────────────────────────────────────── */

export function addLocalDays(date: string, days: number): string {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return date;
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}

function weekdayOf(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(parsed) ? 0 : new Date(parsed).getUTCDay();
}

export function isStudyDay(date: string, constraints: PlanConstraints, overrides: readonly PlanOverride[]): boolean {
  if (overrides.some((override) => override.kind === 'rest-day' && override.date === date)) return false;
  if (constraints.studyDays === 'daily') return true;
  const day = weekdayOf(date);
  if (constraints.studyDays === 'weekdays') return day >= 1 && day <= 5;
  return (constraints.customStudyDays ?? []).includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6);
}

/* ── The entry points ────────────────────────────────────────────────────── */

/** A student's first plan. Nothing about them is invented: no band, no exam
    date, and sixty minutes only as a recommendation the intake confirms. */
export function createInitialPlan(input: Omit<PlannerInput, 'previous' | 'trigger'>): ReplanResult {
  return replan({ ...input, previous: null, trigger: 'initial' });
}

export function replan(input: PlannerInput): ReplanResult {
  const catalogue = input.catalogue ?? learningCatalogue();
  const thresholds = input.thresholds ?? DEFAULT_POLICY_THRESHOLDS;
  const weights = input.weights ?? DEFAULT_PLANNER_WEIGHTS;
  const previous = input.previous;
  const { policy, record, now, today } = input;

  const goals = input.goals ?? previous?.goals ?? emptyPlanGoals();
  const constraints = input.constraints ?? previous?.constraints ?? defaultPlanConstraints();
  const overrides = liveOverrides([...(previous?.overrides ?? []), ...(input.newOverrides ?? [])], today);
  /* The one place this is read from. Every sentence produced below, directly
     or through a helper that receives `constraints`, is baked in this
     language: architecture section 1.6, following src/lib/tutor/ru.ts's
     precedent of translating in code rather than at render time, because the
     Worker never sees the site's own dictionary. */
  const locale = constraints.explanationLocale;

  const facts = learnerFacts(record, policy, thresholds);
  const notes: string[] = [];

  /* What today can actually hold. A temporary short day is an override and
     never touches `constraints.regularDailyMinutes`. */
  const shortDay = overrides.find((o) => o.kind === 'less-time-today' && o.date === today);
  const acceptedToday = overrides.find((o) => o.kind === 'accepted-longer-commitment' && o.date === today);
  const budgetMinutes: number =
    shortDay?.kind === 'less-time-today' ? shortDay.minutes : constraints.regularDailyMinutes;

  const daysToExam = goals.examDate ? calendarDaysBetween(today, goals.examDate.date) : null;
  const missedDays = previous ? missedStudyDays(previous, facts, constraints, overrides, today) : 0;
  const status = planStatus({ goals, policy, daysToExam, missedDays, previous });

  /* Deferred papers stay outstanding and unknown; they are simply not
     scheduled. */
  const deferred = new Set(
    overrides.filter((o) => o.kind === 'deferred-diagnostic').map((o) => (o as { paper: Paper }).paper),
  );
  const diagnosticsOutstanding = policy.diagnosticsOutstanding;

  /* Score every objective the library can actually serve. */
  const scored = scoreObjectives({
    catalogue,
    facts,
    policy,
    goals,
    constraints,
    overrides,
    today,
    daysToExam,
    budgetMinutes,
    thresholds,
    weights,
    previous,
    status,
  });

  const chosen = pickObjective(scored, previous, weights);

  /* Which paper today's short sample is for. A sample is meant to be taken
     cold, so a paper OTHER than the one being taught today is preferred:
     that is also what spreads the four samples across the first sessions. */
  const diagnosticPaper = nextDiagnosticPaper({
    outstanding: diagnosticsOutstanding,
    deferred,
    goals,
    record,
    status,
    avoidPaper: chosen?.objective.paper,
  });

  /* Build the session. If the winner yields nothing that fits today, fall
     down the ranking rather than inventing a session out of nothing. */
  let assembled = chosen ? buildFor(chosen) : null;
  if (assembled && assembled.session.steps.length === 0) assembled = null;
  if (!assembled) {
    for (const candidate of scored) {
      if (chosen && candidate.objective.scopeKey === chosen.objective.scopeKey) continue;
      const attempt = buildFor(candidate);
      if (attempt.session.steps.length > 0) {
        assembled = attempt;
        break;
      }
    }
  }
  if (!assembled) assembled = buildFor(planningObjective(status, locale));

  function buildFor(candidate: ScoredObjective) {
    return assembleSession({
      catalogue,
      record,
      policy,
      facts,
      objective: candidate.objective,
      budgetMinutes,
      today,
      overrides,
      unavailableSurfaces: constraints.unavailable ?? [],
      thresholds,
      locale,
      vocabulary: input.vocabulary ?? null,
      diagnosticPaper: status === 'date-passed' ? undefined : diagnosticPaper ?? undefined,
      chosenByStudent: candidate.objective.chosenActivityId !== undefined || chosenByOverride(overrides, candidate, today),
      acceptedCommitment:
        acceptedToday?.kind === 'accepted-longer-commitment'
          ? { activityId: acceptedToday.activityId, minutes: acceptedToday.minutes, acceptedAt: acceptedToday.createdAt }
          : undefined,
    });
  }

  const session = assembled.session;

  if (assembled.diagnosticUnavailable && diagnosticPaper) {
    notes.push(sentence(locale, PLANNER_SENTENCES.scopeNoShortSample, { paper: PAPER_LABEL[diagnosticPaper] }));
  }

  /* The week around it. Every day is asserted against its own budget, which
     is what makes the audit's 255-minute day impossible. */
  const schedule = buildSchedule({
    today,
    session,
    scored,
    chosenKey: session.objectiveScope,
    constraints,
    overrides,
    goals,
    budgetMinutes,
    reviewNeeded: assembled.reviewNeeded,
    catalogue,
  });

  const milestones = buildMilestones({
    scored,
    diagnosticsOutstanding,
    deferred,
    goals,
    today,
    daysToExam,
    catalogue,
    facts,
    policy,
    overrides,
    thresholds,
    constraints,
  });

  const alternatives = buildAlternatives({
    scored,
    session,
    longerCommitments: assembled.longerCommitments,
    diagnosticPaper: assembled.diagnosticPaper,
    budgetMinutes,
    locale,
    build: (candidate, minutes) =>
      assembleSession({
        catalogue,
        record,
        policy,
        facts,
        objective: candidate.objective,
        budgetMinutes: minutes,
        today,
        overrides,
        unavailableSurfaces: constraints.unavailable ?? [],
        thresholds,
        locale,
        vocabulary: input.vocabulary ?? null,
      }).session,
  });

  /* Honest scope, in plain words. */
  if (status === 'date-passed') notes.push(learningText(locale, PLANNER_SENTENCES.scopeDatePassed));
  if (status === 'provisional-no-date') notes.push(learningText(locale, PLANNER_SENTENCES.scopeNoDate));
  if (status === 'recovering') {
    notes.push(sentence(locale, PLANNER_SENTENCES.scopeRecovering, { days: missedDays }));
  }
  if (daysToExam !== null && daysToExam >= 0 && daysToExam <= SHORT_DEADLINE_DAYS) {
    notes.push(shortDeadlineNote({ scored, chosenKey: session.objectiveScope, daysToExam, budgetMinutes, constraints, overrides, today }));
  }
  for (const stuck of policy.needsTeacherInput) {
    notes.push(
      sentence(locale, PLANNER_SENTENCES.changeTeacherInput, {
        objective: humanScope(stuck.scopeKey),
        attempts: stuck.consecutiveUnimprovedAttempts,
      }),
    );
  }

  const candidate: PersonalPlanV1 = {
    version: 1,
    revision: previous ? previous.revision + 1 : 1,
    evidenceVersion: policy.evidenceVersion,
    status,
    confirmed: goals.overallTarget?.status === 'confirmed' || (previous?.confirmed ?? false),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    goals,
    constraints,
    activeSession: session,
    schedule,
    milestones,
    alternatives,
    overrides,
    history: previous?.history ?? [],
    diagnosticsOutstanding,
    scopeNote: notes.length > 0 ? notes.join(' ') : undefined,
  };

  /* Stability. A replan that changes nothing returns the plan it was given:
     same session id, same revision, no history entry. */
  if (previous && !materiallyDifferent(previous, candidate)) {
    return { plan: { ...previous, evidenceVersion: policy.evidenceVersion }, changes: [] };
  }

  const changes = describeChanges({
    previous,
    candidate,
    trigger: input.trigger,
    missedDays,
    overrides: input.newOverrides ?? [],
    policy,
    constraints,
  });

  const plan: PersonalPlanV1 = {
    ...candidate,
    history: [...(previous?.history ?? []), ...changes].slice(-PLAN_HISTORY_MAX),
  };
  return { plan, changes };
}

function chosenByOverride(overrides: readonly PlanOverride[], candidate: ScoredObjective, today: string): boolean {
  return overrides.some(
    (override) =>
      (override.kind === 'chose-objective' &&
        override.date === today &&
        override.scopeKey === candidate.objective.scopeKey) ||
      (override.kind === 'chose-other-skill' && override.date === today && override.paper === candidate.objective.paper),
  );
}

/* ── Overrides ───────────────────────────────────────────────────────────── */

/** Drop overrides that have expired. A temporary short day is temporary:
    it dies with its own date and never edits the regular commitment. */
export function liveOverrides(overrides: readonly PlanOverride[], today: string): readonly PlanOverride[] {
  const seen = new Set<string>();
  const kept: PlanOverride[] = [];
  for (const override of overrides) {
    const alive =
      'date' in override
        ? override.date >= today
        : override.until === undefined || override.until >= today;
    if (!alive) continue;
    const key = canonicalJson(override);
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(override);
  }
  return kept;
}

/* ── Status ──────────────────────────────────────────────────────────────── */

function planStatus(input: {
  goals: PlanGoals;
  policy: PolicyOutputV1;
  daysToExam: number | null;
  missedDays: number;
  previous: PersonalPlanV1 | null;
}): PlanStatus {
  const { goals, policy, daysToExam, missedDays } = input;

  /* A date in the past is a date in the past. There is no branch here that
     can say "complete": the audit found an expired plan rendering a
     plan-complete heading while introductory lessons were still owed. */
  if (daysToExam !== null && daysToExam < 0) return 'date-passed';
  if (goalMet(goals, policy)) return 'goal-met';
  if (daysToExam !== null && daysToExam <= 1) return 'exam-imminent';
  if (missedDays >= RECOVERY_TRIGGER_MISSED_DAYS) return 'recovering';
  if (!goals.examDate) return 'provisional-no-date';
  return 'on-track';
}

/** The only state that may say the goal is reached, and it says it about the
    goal rather than about the library. Requires measured evidence: opening
    every page is not a band. */
export function goalMet(goals: PlanGoals, policy: PolicyOutputV1): boolean {
  const target = goals.overallTarget;
  if (!target || target.status !== 'confirmed') return false;
  if (!policy.overall || policy.overall.certainty !== 'measured') return false;
  if (policy.overall.band < target.band) return false;
  for (const paper of PAPERS) {
    const minimum = goals.perPaperMinimums[paper];
    if (!minimum || minimum.status !== 'confirmed') continue;
    const estimate = policy.estimates.find((e) => e.scopeKey === `paper:${paper}`);
    if (!estimate || estimate.certainty !== 'measured' || estimate.band === null) return false;
    if (estimate.band < minimum.band) return false;
  }
  return true;
}

/** Study days between the last recorded work and today with nothing on
    them. Rest days and non-study days do not count as missed. */
export function missedStudyDays(
  previous: PersonalPlanV1,
  facts: LearnerFacts,
  constraints: PlanConstraints,
  overrides: readonly PlanOverride[],
  today: string,
): number {
  const lastActive = facts.activeDates[0] ?? previous.createdAt.slice(0, 10);
  let missed = 0;
  for (let day = addLocalDays(lastActive, 1); day < today; day = addLocalDays(day, 1)) {
    if (isStudyDay(day, constraints, overrides)) missed += 1;
    if (missed > 60) break;
  }
  return missed;
}

/* ── Candidate objectives ────────────────────────────────────────────────── */

interface ScoringInput {
  catalogue: LearningCatalogueV1;
  facts: LearnerFacts;
  policy: PolicyOutputV1;
  goals: PlanGoals;
  constraints: PlanConstraints;
  overrides: readonly PlanOverride[];
  today: string;
  daysToExam: number | null;
  budgetMinutes: number;
  thresholds: PolicyThresholds;
  weights: PlannerWeights;
  previous: PersonalPlanV1 | null;
  status: PlanStatus;
}

/** Every objective worth considering, scored, best first.
 *
 *  An objective is a scope plus a subskill. The candidates come from the
 *  catalogue rather than from a fixed course order: a subskill is a
 *  candidate when the library really has something to teach or practise it
 *  with, which is what stops the plan pointing at material that does not
 *  exist. */
export function scoreObjectives(input: ScoringInput): readonly ScoredObjective[] {
  const { catalogue, facts, policy, goals, today, weights } = input;
  const locale = input.constraints.explanationLocale;

  if (input.status === 'date-passed') return [scoreOne(planningObjective('date-passed', locale).objective, input, {})];

  const gapByScope = new Map(policy.gaps.map((gap) => [gap.scopeKey, gap]));
  const chosenSkill = input.overrides.find((o) => o.kind === 'chose-other-skill' && o.date === today);
  const chosenObjective = input.overrides.find((o) => o.kind === 'chose-objective' && o.date === today);
  const restrictPaper = chosenSkill?.kind === 'chose-other-skill' ? chosenSkill.paper : null;

  /* Which activities the failing drills are, so a fourth variation of
     something going nowhere is not offered (lead decision Q2). */
  const stuckScopes = new Set(policy.needsTeacherInput.map((entry) => entry.scopeKey));

  const pairs = new Map<string, { paper: Paper; subskill: Subskill }>();
  for (const activity of catalogue.activities) {
    if (!activity.paper || activity.unavailable) continue;
    if (activity.kind === 'reference' || activity.kind === 'planning') continue;
    if (restrictPaper && activity.paper !== restrictPaper) continue;
    for (const entry of activity.covers ?? [{ subskill: activity.subskill, fit: 'direct' as const }]) {
      pairs.set(`${activity.paper}|${entry.subskill}`, { paper: activity.paper, subskill: entry.subskill });
    }
  }

  const out: ScoredObjective[] = [];
  for (const { paper, subskill } of pairs.values()) {
    const scope: PolicyScope = { kind: 'subskill', paper, subskill };
    const objective = objectiveFor(scope, paper, subskill, input, gapByScope);
    if (!objective) continue;
    if (chosenObjective?.kind === 'chose-objective' && chosenObjective.scopeKey === objective.scopeKey) {
      objective.chosenActivityId = chosenObjective.activityId;
      objective.reason = learningText(locale, PLANNER_SENTENCES.reasonStudentChose);
    }
    out.push(scoreOne(objective, input, { gapByScope, stuck: stuckScopes.has(objective.scopeKey) }));
  }

  /* Checkpoint objectives: a whole paper under timing, when there is unseen
     material for it and it would answer a real question. */
  for (const paper of PAPERS) {
    if (restrictPaper && paper !== restrictPaper) continue;
    const checkpoint = checkpointPaper(paper, eligibilityFor(input, Number.POSITIVE_INFINITY));
    if (!checkpoint) continue;
    const estimate = facts.estimateByScope.get(`paper:${paper}`);
    const freshness = policy.freshness.find((entry) => entry.paper === paper);
    const worthwhile =
      (estimate && estimate.certainty !== 'unknown' && freshness?.state !== 'fresh') ||
      (input.daysToExam !== null && input.daysToExam <= SHORT_DEADLINE_DAYS * 2);
    if (!worthwhile) continue;
    out.push(
      scoreOne(
        {
          scope: { kind: 'paper', paper },
          scopeKey: `paper:${paper}`,
          paper,
          subskill: checkpoint.subskill,
          objective: checkpoint.objective,
          reason: reasonFor({ kind: 'coverage', paper, days: freshness?.daysSinceLatest ?? 0, locale }),
          evidenceRefs: evidenceRefsFor(estimate, gapByScope.get(`paper:${paper}`), null, goals, paper, locale),
          intent: 'assess',
        },
        input,
        { gapByScope },
      ),
    );
  }

  /* Ties are broken by the order IELTS itself lists the papers, then by how
     much of that question type the real papers actually contain, and only
     then by the scope key. Two runs over the same evidence therefore rank
     identically, and a brand-new student with no evidence anywhere starts
     on the type they will meet most often rather than on whichever one
     sorts first alphabetically. */
  const paperRank = (entry: ScoredObjective): number =>
    entry.objective.paper ? PAPERS.indexOf(entry.objective.paper) : PAPERS.length;
  return out.sort(
    (a, b) =>
      b.score - a.score ||
      paperRank(a) - paperRank(b) ||
      materialWeight(b.objective) - materialWeight(a.objective) ||
      (a.objective.scopeKey < b.objective.scopeKey ? -1 : 1),
  );
}

/** Questions of each type across the 70 imported papers, per paper, counted
 *  by the generated index rather than assumed.
 *
 *  Used for ONE thing: breaking an exact tie between two objectives. For a
 *  student with no evidence at all in a paper every question type scores the
 *  same, and the order the ids happen to sort in decided what they were
 *  taught first. That is how a brand-new student was being started on
 *  Matching Features, which is a third as common as sentence completion.
 *  Frequency is not a teaching judgement and never outranks one: it only
 *  settles what nothing else can. The paper is still chosen by the score,
 *  so the paper the student said feels hardest still comes first. */
const QUESTION_FREQUENCY: ReadonlyMap<string, number> = new Map<string, number>(
  LEARNING_INDEX.questionTypes.flatMap((coverage): [string, number][] => [
    [`reading|${coverage.type}`, coverage.reading.questions],
    [`listening|${coverage.type}`, coverage.listening.questions],
  ]),
);

function materialWeight(objective: PlannedObjective): number {
  if (!objective.paper) return 0;
  return QUESTION_FREQUENCY.get(`${objective.paper}|${objective.subskill}`) ?? 0;
}

function eligibilityFor(input: ScoringInput, minutes: number): EligibilityContext {
  return {
    catalogue: input.catalogue,
    facts: input.facts,
    policy: input.policy,
    today: input.today,
    overrides: input.overrides,
    unavailableSurfaces: input.constraints.unavailable ?? [],
    minutes,
    thresholds: input.thresholds,
  };
}

/** Build the objective for one scope, or null when the library has nothing
    for it that this student could do today. */
function objectiveFor(
  scope: PolicyScope,
  paper: Paper,
  subskill: Subskill,
  input: ScoringInput,
  gapByScope: ReadonlyMap<PolicyScopeKey, GapAssessment>,
): PlannedObjective | null {
  const context = eligibilityFor(input, Number.POSITIVE_INFINITY);
  const where = { paper, subskill };
  /* What one session would teach, and what it would then practise with the
     teaching counted as done. An objective with nothing to practise is not
     an objective: an overview lesson is a step inside a session, never a
     session's own point. */
  const path = teachingPath(where, context);
  const satisfiedIds = new Set(path.map((activity) => activity.id));
  const practise = practiceOptions(where, Number.POSITIVE_INFINITY, input.catalogue).find((a) =>
    isEligible(a, { ...context, satisfiedIds }),
  );
  if (!practise) return null;
  const anchor = path[path.length - 1] ?? practise;

  const scopeKey = scopeKeyOf(scope);
  const estimate = input.facts.estimateByScope.get(scopeKey);
  const paperEstimate = input.facts.estimateByScope.get(`paper:${paper}`);
  const gap = gapByScope.get(`paper:${paper}`);
  const due = input.policy.dueReview.find((entry) => entry.scopeKey === scopeKey) ?? null;

  const strong =
    input.facts.strongSubskills.has(subskillKey(paper, subskill)) || input.facts.strongPapers.has(paper);
  const intent: PlannedObjective['intent'] = strong ? 'demonstrate' : due ? 'review' : 'learn';
  const locale = input.constraints.explanationLocale;

  return {
    scope,
    scopeKey,
    paper,
    subskill,
    /* The catalogue is one shared, locale-independent object (imported once,
       serving every student and both languages), so its English objective
       sentence is translated HERE, once, where it is copied onto this
       student's plan. Everything downstream (milestones, alternatives,
       the session's own objective, change history) reads this same already
       translated field rather than the catalogue again, which is also what
       closes the bug the integration builder reported: a Russian tutor
       recommendation interpolating the catalogue's still English objective
       into an otherwise Russian sentence. */
    objective: learningText(locale, anchor.objective),
    reason: reasonFor({
      kind: reasonKindFor({ estimate, paperEstimate, gap, due, strong, hasAnyEvidence: input.facts.activeDates.length > 0 }),
      paper,
      estimate,
      paperEstimate,
      gap,
      due,
      days: input.policy.freshness.find((entry) => entry.paper === paper)?.daysSinceLatest ?? 0,
      today: input.today,
      daysToExam: input.daysToExam,
      goals: input.goals,
      locale,
    }),
    evidenceRefs: evidenceRefsFor(estimate ?? paperEstimate, gap, due, input.goals, paper, locale),
    intent,
  };
}

function planningObjective(status: PlanStatus, locale: Locale): ScoredObjective {
  const objective: PlannedObjective = {
    scope: { kind: 'vocabulary' },
    scopeKey: 'plan',
    subskill: 'exam-format',
    objective: learningText(locale, PLANNER_SENTENCES.objectiveNewGoal),
    reason: learningText(locale, status === 'date-passed' ? PLANNER_SENTENCES.reasonPlanning : PLANNER_SENTENCES.reasonStartHere),
    evidenceRefs: [{ kind: 'no-evidence', ref: 'plan', evidence: learningText(locale, PLANNER_SENTENCES.evidenceNone) }],
    intent: 'plan',
  };
  return {
    objective,
    score: 0,
    terms: {
      gap: 0,
      weakness: 0,
      unknown: 0,
      dueReview: 0,
      coverage: 0,
      deadline: 0,
      recency: 0,
      strength: 0,
      prerequisite: 0,
      borrowedFit: 0,
      selfReported: 0,
      incumbent: 0,
    },
    primaryActivityId: 'tool:plan',
    primaryMinutes: 5,
  };
}

/* ── The terms ───────────────────────────────────────────────────────────── */

function scoreOne(
  objective: PlannedObjective,
  input: ScoringInput,
  extra: { gapByScope?: ReadonlyMap<PolicyScopeKey, GapAssessment>; stuck?: boolean },
): ScoredObjective {
  const { facts, policy, goals, weights, thresholds, today } = input;
  const paper = objective.paper;
  const gapByScope = extra.gapByScope ?? new Map(policy.gaps.map((gap) => [gap.scopeKey, gap]));

  const gap = paper ? gapByScope.get(`paper:${paper}`) : undefined;
  const estimate = facts.estimateByScope.get(objective.scopeKey);
  const paperEstimate = paper ? facts.estimateByScope.get(`paper:${paper}`) : undefined;

  /* gapPressure. Uses BOTH targets: the per-paper minimum where one is set,
     otherwise the overall target. A paper already meeting its own minimum
     scores zero even when it is the student's lowest, which is the audit's
     finding 2 and acceptance scenario 3. Three bands short is as far as the
     term goes: past that the plan is not short of priorities, and the scale
     has to leave room for a three-band gap to outrank a two-band one. */
  let gapTerm = 0;
  if (gap && !gap.meetsRequirement && gap.shortfall !== null && gap.shortfall > 0) {
    gapTerm = clamp01(gap.shortfall / 3);
  }
  /* The overall average can be short while every minimum is met, so it is a
     separate, smaller term, and it is zero when the average is already
     there. It fills the headroom left above the paper's own gap rather than
     being added on top: adding it would push every paper to the ceiling at
     a demanding target and lose the difference between a two-band gap and a
     three-and-a-half-band one, which is exactly what the audit's finding 2
     is about. The mean it uses is internal and never reported;
     PolicyOutputV1.overall stays the only figure a screen may show. */
  const overallShortfall = overallShortfallOf(goals, policy, facts);
  if (overallShortfall > 0 && gap?.contributesToOverallShortfall) {
    gapTerm = gapTerm + (1 - gapTerm) * clamp01(overallShortfall / 3) * 0.25;
  }

  /* weakness. The paper gap says which paper; this says which part of it.
     Without it every question type in a short paper scores the same and the
     plan picks alphabetically instead of picking the thing the student keeps
     getting wrong. Only measured or tentative accuracy counts: a guess about
     a type nobody has sampled is not a weakness. */
  let weaknessTerm = 0;
  if (
    estimate &&
    estimate.percent !== null &&
    (estimate.certainty === 'measured' || estimate.certainty === 'tentative') &&
    estimate.percent < thresholds.weakPercent
  ) {
    weaknessTerm = clamp01((thresholds.weakPercent - estimate.percent) / thresholds.weakPercent);
  }

  /* unknownPressure. A paper nobody has ever touched is the strongest case
     for finding out; an unknown question type inside a paper that IS known
     is a much weaker one, because the staged diagnostic already samples the
     paper alongside whatever today's objective is. */
  let unknownTerm = 0;
  if (paper && policy.diagnosticsOutstanding.includes(paper)) {
    unknownTerm = facts.activeDates.length === 0 ? 1 : 0.45;
  } else if (estimate?.certainty === 'unknown') {
    unknownTerm = 0.2;
  }

  const due = policy.dueReview.find((entry) => entry.scopeKey === objective.scopeKey);
  const dueTerm = due ? clamp01(0.5 + calendarDaysBetween(due.dueOn, today) / 28) : 0;

  const freshness = paper ? policy.freshness.find((entry) => entry.paper === paper) : undefined;
  const coverageTerm =
    freshness?.state === 'stale' ? 1 : freshness?.state === 'none' ? 0.8 : freshness?.state === 'ageing' ? 0.5 : 0;

  /* deadlinePressure. Inside SHORT_DEADLINE_DAYS it flips sign for anything
     that would need a new teaching chain: with a week left, consolidating
     what is nearly there beats starting three new question types. */
  const startingFromScratch =
    (estimate === undefined || estimate.certainty === 'unknown' || estimate.certainty === 'limited') &&
    objective.intent === 'learn';
  let deadlineTerm = 0;
  if (input.daysToExam !== null && input.daysToExam >= 0) {
    const base = clamp01(1 - input.daysToExam / 60);
    /* Inside the short window a new teaching chain is a cost rather than a
       benefit: with a week left, consolidating what is nearly there beats
       starting three question types from nothing. Outside it, a deadline
       pushes everything equally, including the work that needs teaching
       first. */
    deadlineTerm = input.daysToExam <= SHORT_DEADLINE_DAYS && startingFromScratch ? -base : base;
  }

  /* recencyPenalty: do not grind the same drill day after day. A scope
     flagged for teacher review takes the maximum, so the plan moves on
     rather than offering a fourth variation of a failing drill. */
  let recencyTerm = 0;
  if (extra.stuck) {
    recencyTerm = 1;
  } else if (paper) {
    const last = facts.lastWorkedBySubskill.get(subskillKey(paper, objective.subskill));
    if (last) {
      const days = calendarDaysBetween(last, today);
      const spacing = thresholds.reviewSpacingDays[0] ?? 3;
      recencyTerm = days <= 0 ? 1 : days === 1 ? 0.6 : days === 2 ? 0.35 : days < spacing ? 0.2 : 0;
    }
  }

  /* demonstratedStrength: this is what stops a strong Reading student being
     taught Reading. */
  let strengthTerm = 0;
  if (policy.strengths.includes(objective.scopeKey)) strengthTerm = 1;
  else if (paper && facts.strongPapers.has(paper)) strengthTerm = 0.8;
  else if (gap?.meetsRequirement && paperEstimate?.certainty === 'measured') strengthTerm = 0.5;

  const prerequisiteTerm = clamp01(unmetPrerequisiteDepth(objective, input) / 3);

  /* Does the library have a lesson about THIS type, or only one about the
     type next door? Five lessons are deliberately borrowed, and a borrowed
     lesson teaches less, so a direct one wins first. */
  const teacher = teachOptions(objective, input.catalogue)[0];
  const borrowedTerm =
    teacher !== undefined && coverageFit(teacher, objective.subskill) === 'borrowed' ? 1 : 0;

  /* What the student told us. Small, clearly labelled, and multiplied by
     zero the moment there is real evidence about that paper. */
  let selfReportedTerm = 0;
  if (paper) {
    const measured = paperEstimate && paperEstimate.certainty !== 'unknown' && paperEstimate.certainty !== 'self-reported';
    if (!measured) {
      if (goals.selfReportedHardestPaper?.paper === paper) selfReportedTerm += 1;
      const reported = goals.selfReported.find((score) => score.paper === paper);
      const required = goals.perPaperMinimums[paper]?.band ?? goals.overallTarget?.band ?? null;
      if (reported && required !== null && reported.band < required) {
        selfReportedTerm += clamp01((required - reported.band) / 3);
      }
      selfReportedTerm = clamp01(selfReportedTerm);
    }
  }

  const terms = {
    gap: gapTerm,
    weakness: weaknessTerm,
    unknown: unknownTerm,
    dueReview: dueTerm,
    coverage: coverageTerm,
    deadline: deadlineTerm,
    recency: recencyTerm,
    strength: strengthTerm,
    prerequisite: prerequisiteTerm,
    borrowedFit: borrowedTerm,
    selfReported: selfReportedTerm,
    incumbent: 0,
  };

  const score =
    weights.gap * terms.gap +
    weights.weakness * terms.weakness +
    weights.unknown * terms.unknown +
    weights.dueReview * terms.dueReview +
    weights.coverage * terms.coverage +
    weights.deadline * terms.deadline -
    weights.recency * terms.recency -
    weights.strength * terms.strength -
    weights.prerequisite * terms.prerequisite -
    weights.borrowedFit * terms.borrowedFit +
    weights.selfReported * terms.selfReported;

  const context = eligibilityFor(input, input.budgetMinutes);
  const satisfiedIds = new Set(teachingPath(objective, eligibilityFor(input, Number.POSITIVE_INFINITY)).map((a) => a.id));
  const primary =
    practiceOptions(objective, input.budgetMinutes, input.catalogue).find((a) =>
      isEligible(a, { ...context, satisfiedIds }),
    ) ?? teachOptions(objective, input.catalogue).find((a) => isEligible(a, { ...context, satisfiedIds }));

  return {
    objective,
    score: Math.round(score * 1e6) / 1e6,
    terms,
    primaryActivityId: primary?.id ?? null,
    primaryMinutes: primary?.expectedMinutes ?? 0,
  };
}

/** The overall average shortfall, or zero. Computed from the papers that
    have a band so that a student short overall is pushed even when every
    minimum is met. Never reported anywhere: PolicyOutputV1.overall stays the
    only figure a screen may show, and it is null far more often. */
function overallShortfallOf(goals: PlanGoals, policy: PolicyOutputV1, facts: LearnerFacts): number {
  const target = goals.overallTarget?.band;
  if (target === undefined) return 0;
  const bands = PAPERS.map((paper) => facts.estimateByScope.get(`paper:${paper}`))
    .filter((estimate): estimate is AbilityEstimate => estimate !== undefined && estimate.band !== null)
    .filter((estimate) => estimate.certainty !== 'self-reported')
    .map((estimate) => estimate.band as number);
  if (bands.length === 0) return 0;
  const mean = bands.reduce((sum, band) => sum + band, 0) / bands.length;
  return Math.max(0, target - mean);
}

/** How much a student would have to do FIRST before this objective could be
 *  started at all: the shortest way in, not the nicest one.
 *
 *  It used to ask only about `teachOptions(...)[0]`, the single activity
 *  that happened to sort first. That was fine while teaching meant lessons,
 *  and it broke on 22 September 2026 when WP18 to WP22 added 93 focused
 *  exercises. A subskill with a real lesson of its own (reading sentence
 *  completion) was charged for that lesson's prerequisites, while a subskill
 *  with no lesson at all (reading table completion) was charged nothing,
 *  because its first teaching option was a prerequisite-free focused
 *  exercise. The planner was rewarding a question type for having LESS
 *  teaching material, and a brand new student was started on the type the
 *  papers contain 67 questions of instead of the one they contain 431 of.
 *
 *  So the term is the MINIMUM across every way of teaching the objective.
 *  If any route can be started today, the objective can be started today,
 *  which is exactly what the score is trying to say. */
function unmetPrerequisiteDepth(objective: PlannedObjective, input: ScoringInput): number {
  const routes = teachOptions(objective, input.catalogue);
  const anchors = routes.length > 0 ? routes : practiceOptions(objective, Number.POSITIVE_INFINITY, input.catalogue);
  if (anchors.length === 0) return 0;
  let shortest = Number.POSITIVE_INFINITY;
  for (const anchor of anchors) {
    shortest = Math.min(shortest, unmetPrerequisitesOf(anchor.id, input));
    if (shortest === 0) break;
  }
  return shortest;
}

/** The prerequisites of one activity that this student has not already
    satisfied, by completion or by proven strength. */
function unmetPrerequisitesOf(activityId: string, input: ScoringInput): number {
  const context = eligibilityFor(input, Number.POSITIVE_INFINITY);
  let unmet = 0;
  for (const id of prerequisiteClosure(activityId, input.catalogue)) {
    if (input.facts.completedActivityIds.has(id)) continue;
    const activity = findActivity(id, input.catalogue);
    if (!activity) continue;
    if (input.facts.strongSubskills.has(subskillKey(activity.paper, activity.subskill))) continue;
    if (activity.paper !== undefined && input.facts.strongPapers.has(activity.paper)) continue;
    if (ineligibleReason(activity, context) === 'prerequisite-unmet') continue;
    unmet += 1;
  }
  return unmet;
}

/* ── Picking, with the stability rule ────────────────────────────────────── */

/** The incumbent objective is re-scored with a bonus and only replaced when
 *  a challenger beats it by more than the margin.
 *
 *  This is the brief's "do not force different tasks merely to make a test
 *  pass if the same task remains sensible": a plan that swaps under a
 *  working student for a rounding difference is worse than one that holds
 *  its line. */
export function pickObjective(
  scored: readonly ScoredObjective[],
  previous: PersonalPlanV1 | null,
  weights: PlannerWeights,
): ScoredObjective | null {
  if (scored.length === 0) return null;
  const challenger = scored[0]!;
  if (!previous) return challenger;

  const incumbent = scored.find((entry) => entry.objective.scopeKey === previous.activeSession.objectiveScope);
  if (!incumbent) return challenger;

  const withBonus = incumbent.score + weights.incumbent;
  if (challenger.score > withBonus + weights.replanMargin) return challenger;
  return { ...incumbent, score: withBonus, terms: { ...incumbent.terms, incumbent: weights.incumbent } };
}

/* ── Staged diagnostics ──────────────────────────────────────────────────── */

/** Which paper today's short sample is for, or null.
 *
 *  One per session, inside the first DIAGNOSTIC_MAX_SESSIONS sessions, in
 *  the order the student's own answer about what feels hardest suggests and
 *  then the standard paper order. A deferred paper is skipped and stays
 *  outstanding, so every screen shows it as unknown rather than guessing. */
export function nextDiagnosticPaper(input: {
  outstanding: readonly Paper[];
  deferred: ReadonlySet<Paper>;
  goals: PlanGoals;
  record: LearnerRecordV1;
  status: PlanStatus;
  /** Today's own paper. A sample of the paper being taught this hour is no
      longer a cold sample, so another outstanding paper is taken first. */
  avoidPaper?: Paper;
}): Paper | null {
  if (input.status === 'date-passed') return null;
  const diagnosticsSoFar = new Set(
    input.record.events.filter((event) => event.mode === 'diagnostic').map((event) => event.localDate),
  ).size;
  if (diagnosticsSoFar >= DIAGNOSTIC_MAX_SESSIONS) return null;

  const hardest = input.goals.selfReportedHardestPaper?.paper;
  const order = hardest ? [hardest, ...PAPERS.filter((paper) => paper !== hardest)] : [...PAPERS];
  const available = order.filter((paper) => input.outstanding.includes(paper) && !input.deferred.has(paper));
  return available.find((paper) => paper !== input.avoidPaper) ?? available[0] ?? null;
}

/* ── Reasons and evidence ────────────────────────────────────────────────── */

type ReasonKind =
  | 'measured-gap'
  | 'thin-gap'
  | 'unknown'
  | 'due-review'
  | 'coverage'
  | 'deadline'
  | 'self-reported'
  | 'start-here'
  | 'keep-sharp';

function reasonKindFor(input: {
  estimate?: AbilityEstimate;
  paperEstimate?: AbilityEstimate;
  gap?: GapAssessment;
  due: { dueOn: string; daysSinceDemonstrated: number } | null;
  strong: boolean;
  hasAnyEvidence: boolean;
}): ReasonKind {
  if (!input.hasAnyEvidence) return 'start-here';
  if (input.due) return 'due-review';
  if (input.strong) return 'keep-sharp';
  const estimate = input.estimate;
  if (estimate && estimate.certainty === 'measured' && estimate.percent !== null) return 'measured-gap';
  if (input.gap && !input.gap.meetsRequirement && (input.gap.shortfall ?? 0) > 0) {
    return input.paperEstimate?.certainty === 'measured' ? 'measured-gap' : 'thin-gap';
  }
  if (input.paperEstimate?.certainty === 'unknown') return 'unknown';
  if (input.paperEstimate?.certainty === 'self-reported') return 'self-reported';
  return 'coverage';
}

function reasonFor(input: {
  kind: ReasonKind;
  paper: Paper;
  estimate?: AbilityEstimate;
  paperEstimate?: AbilityEstimate;
  gap?: GapAssessment;
  due?: { dueOn: string; daysSinceDemonstrated: number } | null;
  days?: number;
  today?: string;
  daysToExam?: number | null;
  goals?: PlanGoals;
  locale: Locale;
}): string {
  const paper = PAPER_LABEL[input.paper];
  const { locale } = input;
  switch (input.kind) {
    case 'measured-gap': {
      /* Prefer the counted items for this exact objective. When the paper is
         measured but this part of it has never been sampled on its own,
         there are no items to count, and quoting "0 of 0" would be worse
         than saying plainly what the band gap is. */
      const evidence = input.estimate?.evidence;
      if (evidence && evidence.independentItems > 0) {
        return sentence(locale, PLANNER_SENTENCES.reasonMeasuredGap, {
          correct: evidence.independentCorrect,
          items: evidence.independentItems,
          occasions: evidence.independentOccasions,
          paper,
        });
      }
      const band = input.paperEstimate?.band;
      const required = input.gap?.requiredBand;
      if (band != null && required != null) {
        return sentence(locale, PLANNER_SENTENCES.reasonMeasuredBandGap, { paper, band, required });
      }
      return learningText(locale, PLANNER_SENTENCES.reasonThinGap);
    }
    case 'thin-gap':
      return learningText(locale, PLANNER_SENTENCES.reasonThinGap);
    case 'unknown':
      return sentence(locale, PLANNER_SENTENCES.reasonUnknownPaper, { paper });
    case 'due-review':
      return sentence(locale, PLANNER_SENTENCES.reasonDueReview, { days: input.due?.daysSinceDemonstrated ?? 0 });
    case 'coverage':
      return sentence(locale, PLANNER_SENTENCES.reasonCoverage, { paper, days: input.days ?? input.estimate?.evidence.daysSinceLatest ?? 0 });
    case 'deadline':
      return sentence(locale, PLANNER_SENTENCES.reasonDeadline, { days: input.daysToExam ?? 0 });
    case 'self-reported':
      return sentence(locale, PLANNER_SENTENCES.reasonSelfReported, { paper });
    case 'keep-sharp':
      return learningText(locale, PLANNER_SENTENCES.reasonKeepSharp);
    case 'start-here':
      return learningText(locale, PLANNER_SENTENCES.reasonStartHere);
  }
}

/** Exactly the evidence standing behind a choice, so the explanation is
    checkable and a model cannot embellish it. */
function evidenceRefsFor(
  estimate: AbilityEstimate | undefined,
  gap: GapAssessment | undefined,
  due: { scopeKey: string; dueOn: string } | null,
  goals: PlanGoals,
  paper: Paper,
  locale: Locale,
): readonly SessionEvidenceRef[] {
  const refs: SessionEvidenceRef[] = [];
  if (estimate && estimate.evidence.independentOccasions > 0) {
    refs.push({
      kind: 'estimate',
      ref: estimate.scopeKey,
      evidence: sentence(locale, PLANNER_SENTENCES.evidenceCounted, {
        correct: estimate.evidence.independentCorrect,
        items: estimate.evidence.independentItems,
        occasions: estimate.evidence.independentOccasions,
        days: estimate.evidence.daysSinceLatest ?? 0,
      }),
    });
  }
  if (gap?.requiredBand != null) {
    refs.push({
      kind: 'goal',
      ref: gap.scopeKey,
      evidence: sentence(locale, PLANNER_SENTENCES.evidenceGoal, { band: gap.requiredBand, paper: PAPER_LABEL[paper] }),
    });
  }
  if (due) {
    refs.push({
      kind: 'due-review',
      ref: due.scopeKey,
      evidence: sentence(locale, PLANNER_SENTENCES.evidenceDue, { date: due.dueOn }),
    });
  }
  const reported = goals.selfReported.find((score) => score.paper === paper);
  if (reported) {
    refs.push({
      kind: 'estimate',
      ref: `self-reported:${paper}`,
      evidence: sentence(locale, PLANNER_SENTENCES.evidenceSelfReported, { band: reported.band, date: reported.takenOn }),
    });
  }
  if (refs.length === 0) {
    refs.push({ kind: 'no-evidence', ref: `paper:${paper}`, evidence: learningText(locale, PLANNER_SENTENCES.evidenceNone) });
  }
  return refs;
}

function humanScope(scopeKey: PolicyScopeKey): string {
  const parts = scopeKey.split(':');
  const last = parts[parts.length - 1] ?? scopeKey;
  return last.replace(/-/g, ' ');
}

/* ── The week ────────────────────────────────────────────────────────────── */

function buildSchedule(input: {
  today: string;
  session: PlanSession;
  scored: readonly ScoredObjective[];
  chosenKey: PolicyScopeKey;
  constraints: PlanConstraints;
  overrides: readonly PlanOverride[];
  goals: PlanGoals;
  budgetMinutes: number;
  reviewNeeded: { activityId: string; minutes: number } | null;
  catalogue: LearningCatalogueV1;
}): readonly ScheduledDay[] {
  const days: ScheduledDay[] = [];
  const queue = input.scored.filter(
    (entry) => entry.objective.scopeKey !== input.chosenKey && entry.primaryActivityId !== null,
  );
  const placed = new Set<string>(input.session.steps.map((step) => step.activityId));
  let lastPaper: Paper | undefined = input.session.paper;
  let reviewOwed = input.reviewNeeded;
  /* Only a whole paper makes a day an assessment day. A fifteen-minute
     sample does not earn a rest day after it. */
  let previousWasAssessment = input.session.steps.some(
    (step) => findInCatalogue(step.activityId, input.catalogue)?.kind === 'full-test',
  );

  const locale = input.constraints.explanationLocale;

  for (let offset = 0; offset < SCHEDULE_HORIZON_DAYS; offset += 1) {
    const date = addLocalDays(input.today, offset);

    if (input.goals.examDate?.date === date) {
      days.push({
        date,
        budgetMinutes: 0,
        focus: learningText(locale, PLANNER_SENTENCES.scheduleExamDay),
        activityIds: [],
        kind: 'exam-day',
      });
      continue;
    }
    if (!isStudyDay(date, input.constraints, input.overrides)) {
      days.push({
        date,
        budgetMinutes: 0,
        focus: learningText(locale, PLANNER_SENTENCES.scheduleRestDay),
        activityIds: [],
        kind: 'rest',
      });
      continue;
    }

    if (offset === 0) {
      days.push({
        date,
        budgetMinutes: input.session.budgetMinutes,
        focus: input.session.objective,
        activityIds: [...new Set(input.session.steps.map((step) => step.activityId))],
        kind: previousWasAssessment ? 'assessment' : 'study',
      });
      continue;
    }

    const budget = input.constraints.regularDailyMinutes;

    /* The day after a whole paper is its review. Reading forty explanations
       is its own session, never a tail on the paper itself. */
    if (reviewOwed && reviewOwed.minutes <= budget) {
      const activity = findActivity(reviewOwed.activityId, input.catalogue);
      const reviewObjective = activity
        ? learningText(locale, activity.objective)
        : learningText(locale, PLANNER_SENTENCES.scheduleReviewFallback);
      days.push({
        date,
        budgetMinutes: budget,
        focus: sentence(locale, PLANNER_SENTENCES.scheduleReviewFocus, { objective: reviewObjective }),
        activityIds: [reviewOwed.activityId],
        kind: 'light-review',
      });
      reviewOwed = null;
      previousWasAssessment = false;
      continue;
    }

    const activityIds: string[] = [];
    let minutes = 0;
    let focus = learningText(locale, PLANNER_SENTENCES.scheduleKeepMoving);
    let kind: ScheduledDay['kind'] = previousWasAssessment ? 'light-review' : 'study';
    previousWasAssessment = false;

    /* Two passes: first something from a paper other than yesterday's, so a
       week does not become six days of Reading, then anything that fits.
       Nothing is planned twice in the same week. */
    for (const preferDifferentPaper of [true, false]) {
      for (const entry of queue) {
        if (activityIds.length >= 2) break;
        const id = entry.primaryActivityId;
        if (id === null || placed.has(id)) continue;
        if (preferDifferentPaper && entry.objective.paper === lastPaper) continue;
        if (minutes + entry.primaryMinutes > budget) continue;
        if (activityIds.length === 0) {
          focus = entry.objective.objective;
          lastPaper = entry.objective.paper;
        }
        activityIds.push(id);
        placed.add(id);
        minutes += entry.primaryMinutes;
        const activity = findActivity(id, input.catalogue);
        if (activity?.kind === 'full-test') {
          kind = 'assessment';
          previousWasAssessment = true;
          break;
        }
      }
      if (activityIds.length > 0) break;
    }
    days.push({ date, budgetMinutes: budget, focus, activityIds, kind });
  }

  assertScheduleFits(days, input.catalogue, input.session);
  return days;
}

function findInCatalogue(id: string, catalogue: LearningCatalogueV1): CatalogueActivity | undefined {
  return findActivity(id, catalogue);
}

/** No day may be planned past its own budget. The audit found a 255-minute
    day under a 15-minute setting; this is the assertion that makes that
    impossible rather than merely warned about. */
export function assertScheduleFits(
  days: readonly ScheduledDay[],
  catalogue: LearningCatalogueV1,
  session: PlanSession,
): void {
  for (const day of days) {
    const minutes =
      day.date === session.date
        ? sessionMinutes(session)
        : day.activityIds.reduce((total, id) => total + (findActivity(id, catalogue)?.expectedMinutes ?? 0), 0);
    if (minutes > day.budgetMinutes) {
      throw new Error(`Scheduled day ${day.date} plans ${minutes} minutes against a budget of ${day.budgetMinutes}`);
    }
  }
}

/* ── Milestones ──────────────────────────────────────────────────────────── */

function buildMilestones(input: {
  scored: readonly ScoredObjective[];
  diagnosticsOutstanding: readonly Paper[];
  deferred: ReadonlySet<Paper>;
  goals: PlanGoals;
  today: string;
  daysToExam: number | null;
  catalogue: LearningCatalogueV1;
  facts: LearnerFacts;
  policy: PolicyOutputV1;
  overrides: readonly PlanOverride[];
  thresholds: PolicyThresholds;
  constraints: PlanConstraints;
}): readonly Milestone[] {
  const out: Milestone[] = [];
  const horizon = input.daysToExam;
  const locale = input.constraints.explanationLocale;

  input.diagnosticsOutstanding.forEach((paper, index) => {
    if (input.deferred.has(paper)) return;
    out.push({
      id: `milestone:diagnostic:${paper}`,
      label: sentence(locale, PLANNER_SENTENCES.milestoneDiagnostic, { paper: PAPER_LABEL[paper] }),
      targetDate: horizon === null ? null : addLocalDays(input.today, Math.min(index + 1, Math.max(horizon, 0))),
      scopeKey: `paper:${paper}`,
      state: 'planned',
    });
  });

  const labelled = new Set(out.map((milestone) => milestone.label));
  for (const entry of input.scored) {
    if (out.length >= 5) break;
    if (entry.objective.intent === 'plan') continue;
    /* entry.objective.objective is already translated (see objectiveFor):
       this only wraps the "shown on questions you have not seen" frame
       around it. */
    const label = sentence(locale, PLANNER_SENTENCES.milestoneObjective, {
      objective: asClause(entry.objective.objective),
    });
    if (labelled.has(label)) continue;
    labelled.add(label);
    const days = 7 * (out.length + 1);
    const fits = horizon === null || days <= horizon;
    out.push({
      id: `milestone:objective:${entry.objective.scopeKey}`,
      label,
      targetDate: horizon === null ? null : addLocalDays(input.today, Math.min(days, Math.max(horizon, 0))),
      scopeKey: entry.objective.scopeKey,
      state: fits ? 'planned' : 'dropped',
      droppedReason: fits ? undefined : learningText(locale, PLANNER_SENTENCES.milestoneDroppedNoTime),
    });
  }

  if (horizon !== null && horizon >= 3) {
    const context: EligibilityContext = {
      catalogue: input.catalogue,
      facts: input.facts,
      policy: input.policy,
      today: input.today,
      overrides: input.overrides,
      unavailableSurfaces: input.constraints.unavailable ?? [],
      minutes: Number.POSITIVE_INFINITY,
      thresholds: input.thresholds,
    };
    for (const paper of PAPERS) {
      const checkpoint = checkpointPaper(paper, context);
      if (!checkpoint) continue;
      const fits = checkpoint.expectedMinutes <= input.constraints.regularDailyMinutes;
      out.push({
        id: `milestone:checkpoint:${paper}`,
        label: sentence(locale, PLANNER_SENTENCES.milestoneCheckpoint, { paper: PAPER_LABEL[paper] }),
        targetDate: addLocalDays(input.today, Math.max(0, horizon - 3)),
        scopeKey: `paper:${paper}`,
        state: fits ? 'planned' : 'dropped',
        droppedReason: fits ? undefined : learningText(locale, PLANNER_SENTENCES.milestoneDroppedNoTime),
      });
      break;
    }
  }

  return out.slice(0, 6);
}

/* ── Alternatives ────────────────────────────────────────────────────────── */

function buildAlternatives(input: {
  scored: readonly ScoredObjective[];
  session: PlanSession;
  longerCommitments: readonly PlanAlternative[];
  diagnosticPaper: Paper | null;
  budgetMinutes: number;
  locale: Locale;
  build: (candidate: ScoredObjective, minutes: number) => PlanSession;
}): readonly PlanAlternative[] {
  const out: PlanAlternative[] = [];
  const { locale } = input;
  const winner = input.scored.find((entry) => entry.objective.scopeKey === input.session.objectiveScope);
  /* A planning session is one question. "I have less time today" and
     "choose another skill" have nothing to offer against it. */
  if (winner?.objective.intent === 'plan' || input.session.objectiveScope === 'plan') return out;

  /* "I have less time today": the next choice down, built for real so
     accepting it is instant and honest about what would fit. */
  const shorter = [...DAILY_MINUTE_CHOICES].reverse().find((minutes) => minutes < input.budgetMinutes);
  if (shorter !== undefined && winner) {
    const sketch = input.build(winner, shorter);
    if (sketch.steps.length > 0) {
      out.push({
        kind: 'shorter',
        label: sentence(locale, PLANNER_SENTENCES.altShorter, { minutes: shorter }),
        sessionSketch: {
          objective: sketch.objective,
          activityIds: [...new Set(sketch.steps.map((step) => step.activityId))],
          minutes: sessionMinutes(sketch),
        },
      });
    }
  }

  /* "Choose another skill": the best objective from a different paper. */
  const other = input.scored.find(
    (entry) => entry.objective.paper !== undefined && entry.objective.paper !== input.session.paper,
  );
  if (other?.objective.paper) {
    const sketch = input.build(other, input.budgetMinutes);
    if (sketch.steps.length > 0) {
      out.push({
        kind: 'other-skill',
        label: sentence(locale, PLANNER_SENTENCES.altOtherSkill, { paper: PAPER_LABEL[other.objective.paper] }),
        sessionSketch: {
          objective: sketch.objective,
          activityIds: [...new Set(sketch.steps.map((step) => step.activityId))],
          minutes: sessionMinutes(sketch),
        },
      });
    }
  }

  const seen = new Set<string>();
  for (const commitment of input.longerCommitments) {
    const key = commitment.sessionSketch.activityIds.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(commitment);
    if (seen.size >= 2) break;
  }

  if (input.diagnosticPaper) {
    out.push({
      kind: 'defer-diagnostic',
      label: sentence(locale, PLANNER_SENTENCES.altDeferDiagnostic, { paper: PAPER_LABEL[input.diagnosticPaper] }),
      sessionSketch: {
        objective: input.session.objective,
        activityIds: [
          ...new Set(input.session.steps.filter((step) => step.role !== 'assess').map((step) => step.activityId)),
        ],
        minutes: input.session.steps
          .filter((step) => step.role !== 'assess')
          .reduce((total, step) => total + step.minutes, 0),
      },
    });
  }

  return out;
}

/* ── Honest scope ────────────────────────────────────────────────────────── */

function shortDeadlineNote(input: {
  scored: readonly ScoredObjective[];
  chosenKey: PolicyScopeKey;
  daysToExam: number;
  budgetMinutes: number;
  constraints: PlanConstraints;
  overrides: readonly PlanOverride[];
  today: string;
}): string {
  const locale = input.constraints.explanationLocale;
  let studyDays = 0;
  for (let offset = 0; offset < input.daysToExam; offset += 1) {
    if (isStudyDay(addLocalDays(input.today, offset), input.constraints, input.overrides)) studyDays += 1;
  }
  const total = studyDays * input.constraints.regularDailyMinutes;

  /* How much of the ranking those minutes really reach. Everything past it
     is named as not covered rather than quietly left on a list. entry
     .objective.objective is already translated (see objectiveFor). */
  const covered: string[] = [];
  const missed: string[] = [];
  let spent = 0;
  for (const entry of input.scored) {
    if (entry.objective.intent === 'plan') continue;
    const label = entry.objective.objective.replace(/\.$/, '');
    if (spent + entry.primaryMinutes <= total && covered.length < 3) {
      covered.push(label);
      spent += entry.primaryMinutes;
    } else if (missed.length < 2) {
      missed.push(label);
    }
  }

  return sentence(locale, PLANNER_SENTENCES.scopeShortDeadline, {
    days: studyDays,
    minutes: input.constraints.regularDailyMinutes,
    total,
    covered: joinList(covered) || learningText(locale, PLANNER_SENTENCES.scopeOneThing),
    missed: joinList(missed) || learningText(locale, PLANNER_SENTENCES.scopeEverythingElse),
  });
}

/** "A", "A and B", "A, B and C". Never "A and B and C", which is what this
    replaced: three items joined by two "and"s read as one breathless
    clause inside an already long sentence. */
function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/* ── What changed ────────────────────────────────────────────────────────── */

/** Whether anything a student would notice actually changed. The evidence
    version alone does not count: new evidence that leaves the same session
    sensible must not move the plan. */
function materiallyDifferent(previous: PersonalPlanV1, candidate: PersonalPlanV1): boolean {
  return (
    canonicalJson(comparable(previous)) !== canonicalJson(comparable(candidate))
  );
}

function comparable(plan: PersonalPlanV1) {
  return {
    status: plan.status,
    confirmed: plan.confirmed,
    goals: plan.goals,
    constraints: plan.constraints,
    session: {
      objectiveScope: plan.activeSession.objectiveScope,
      steps: plan.activeSession.steps.map((step) => `${step.role}|${step.activityId}|${step.minutes}`),
      budget: plan.activeSession.budgetMinutes,
      date: plan.activeSession.date,
      extended: plan.activeSession.extendedCommitment ?? null,
    },
    schedule: plan.schedule.map((day) => `${day.date}|${day.kind}|${day.budgetMinutes}|${day.activityIds.join(',')}`),
    milestones: plan.milestones.map((milestone) => `${milestone.id}|${milestone.state}`),
    alternatives: plan.alternatives.map((alt) => `${alt.kind}|${alt.sessionSketch.activityIds.join(',')}`),
    overrides: plan.overrides,
    diagnosticsOutstanding: plan.diagnosticsOutstanding,
    scopeNote: plan.scopeNote ?? null,
  };
}

function describeChanges(input: {
  previous: PersonalPlanV1 | null;
  candidate: PersonalPlanV1;
  trigger: ReplanTrigger;
  missedDays: number;
  overrides: readonly PlanOverride[];
  policy: PolicyOutputV1;
  constraints: PlanConstraints;
}): readonly PlanChange[] {
  const { previous, candidate, trigger } = input;
  const locale = input.constraints.explanationLocale;
  const at = candidate.updatedAt;
  const fromRevision = previous?.revision ?? 0;
  const toRevision = candidate.revision;
  const changes: PlanChange[] = [];

  const add = (summary: string, detail?: PlanChange['detail']) =>
    changes.push({ at, trigger, summary, detail, fromRevision, toRevision });

  if (!previous) {
    add(sentence(locale, PLANNER_SENTENCES.changeInitial, { objective: asClause(candidate.activeSession.objective) }), {
      addedActivityIds: candidate.activeSession.steps.map((step) => step.activityId),
      scopeKeys: [candidate.activeSession.objectiveScope],
    });
    return changes;
  }

  for (const override of input.overrides) {
    if (override.kind === 'less-time-today') {
      add(
        sentence(locale, PLANNER_SENTENCES.changeOverrideShorter, {
          minutes: override.minutes,
          regular: input.constraints.regularDailyMinutes,
        }),
      );
    }
    if (override.kind === 'chose-other-skill') {
      add(sentence(locale, PLANNER_SENTENCES.changeOverrideSkill, { paper: PAPER_LABEL[override.paper] }));
    }
    if (override.kind === 'accepted-longer-commitment') {
      add(sentence(locale, PLANNER_SENTENCES.changeOverrideCommitment, { label: override.activityId }));
    }
  }

  if (previous.status !== candidate.status) {
    if (candidate.status === 'recovering') {
      const dropped = candidate.milestones.filter((milestone) => milestone.state === 'dropped').length;
      add(
        sentence(locale, PLANNER_SENTENCES.changeRecovery, {
          days: input.missedDays,
          dropped:
            dropped > 0
              ? sentence(locale, PLANNER_SENTENCES.changeDropped, { count: dropped })
              : learningText(locale, PLANNER_SENTENCES.changeNothingDropped),
        }),
        { scopeKeys: [candidate.activeSession.objectiveScope] },
      );
    } else {
      add(
        sentence(locale, PLANNER_SENTENCES.changeStatus, {
          status: learningText(locale, STATUS_LABEL[candidate.status]),
          why: candidate.scopeNote ?? '',
        }).trim(),
      );
    }
  }

  if (previous.activeSession.objectiveScope !== candidate.activeSession.objectiveScope) {
    add(
      sentence(locale, PLANNER_SENTENCES.changeObjective, {
        from: asClause(previous.activeSession.objective),
        to: asClause(candidate.activeSession.objective),
        why: candidate.activeSession.reason,
      }),
      {
        removedActivityIds: previous.activeSession.steps.map((step) => step.activityId),
        addedActivityIds: candidate.activeSession.steps.map((step) => step.activityId),
        scopeKeys: [previous.activeSession.objectiveScope, candidate.activeSession.objectiveScope],
      },
    );
  }

  for (const stuck of input.policy.needsTeacherInput) {
    const already = previous.history.some((entry) => entry.summary.includes(humanScope(stuck.scopeKey)));
    if (already) continue;
    add(
      sentence(locale, PLANNER_SENTENCES.changeTeacherInput, {
        objective: humanScope(stuck.scopeKey),
        attempts: stuck.consecutiveUnimprovedAttempts,
      }),
      { scopeKeys: [stuck.scopeKey] },
    );
  }

  if (changes.length === 0 && trigger === 'settings-changed') {
    add(learningText(locale, PLANNER_SENTENCES.changeGoal));
  }
  if (changes.length === 0) {
    add(
      sentence(locale, PLANNER_SENTENCES.changeObjective, {
        from: asClause(previous.activeSession.objective),
        to: asClause(candidate.activeSession.objective),
        why: candidate.activeSession.reason,
      }),
      { scopeKeys: [candidate.activeSession.objectiveScope] },
    );
  }
  return changes;
}

/* ── The AI boundary ─────────────────────────────────────────────────────── */

/** The eligible alternatives a model may choose among.
 *
 *  The model cannot reach anything outside this list: prerequisites are
 *  satisfied, the budget holds, nothing is blocked by an override and
 *  nothing unavailable is in it. Small on purpose, so the prompt stays
 *  short and every id in it resolves. */
export function proposalShortlist(input: {
  plan: PersonalPlanV1;
  record: LearnerRecordV1;
  policy: PolicyOutputV1;
  catalogue?: LearningCatalogueV1;
  today: string;
  budgetMinutes?: number;
  thresholds?: PolicyThresholds;
  weights?: PlannerWeights;
}): readonly CatalogueActivity[] {
  const catalogue = input.catalogue ?? learningCatalogue();
  const thresholds = input.thresholds ?? DEFAULT_POLICY_THRESHOLDS;
  const facts = learnerFacts(input.record, input.policy, thresholds);
  const budget = input.budgetMinutes ?? input.plan.activeSession.budgetMinutes;

  const scored = scoreObjectives({
    catalogue,
    facts,
    policy: input.policy,
    goals: input.plan.goals,
    constraints: input.plan.constraints,
    overrides: input.plan.overrides,
    today: input.today,
    daysToExam: input.plan.goals.examDate ? calendarDaysBetween(input.today, input.plan.goals.examDate.date) : null,
    budgetMinutes: budget,
    thresholds,
    weights: input.weights ?? DEFAULT_PLANNER_WEIGHTS,
    previous: input.plan,
    status: input.plan.status,
  });

  const context: EligibilityContext = {
    catalogue,
    facts,
    policy: input.policy,
    today: input.today,
    overrides: input.plan.overrides,
    unavailableSurfaces: input.plan.constraints.unavailable ?? [],
    minutes: budget,
    thresholds,
    /* The same rule validatePlanProposal applies, for the same reason: the
       shortlist and the check on what comes back must agree, or the model
       would be offered something that is then refused. */
    satisfiedIds: sessionSatisfiedIds(input.plan),
  };

  const out = new Map<string, CatalogueActivity>();
  /* Whatever today's session already names comes first: the model must be
     able to agree with the deterministic choice. */
  for (const step of input.plan.activeSession.steps) {
    const activity = findActivity(step.activityId, catalogue);
    if (activity) out.set(activity.id, activity);
  }
  for (const entry of scored) {
    if (out.size >= MAX_PROPOSAL_CANDIDATES) break;
    if (!entry.primaryActivityId) continue;
    const activity = findActivity(entry.primaryActivityId, catalogue);
    if (activity && isEligible(activity, context)) out.set(activity.id, activity);
  }
  return [...out.values()].slice(0, MAX_PROPOSAL_CANDIDATES);
}

/** Activity ids today's session already carries, which therefore satisfy a
 *  prerequisite for anything proposed alongside them.
 *
 *  `except` leaves the proposal itself out, so an activity can never be its
 *  own prerequisite. Everything else in the session counts: the student
 *  either has done it or is committed to doing it today, and the teaching
 *  in front of a practice step is the whole reason the step is there. */
function sessionSatisfiedIds(plan: PersonalPlanV1, except?: string): ReadonlySet<string> {
  return new Set(
    plan.activeSession.steps
      .map((step) => step.activityId)
      .filter((activityId) => activityId !== except),
  );
}

export interface ProposalCheck {
  plan: PersonalPlanV1;
  record: LearnerRecordV1;
  policy: PolicyOutputV1;
  catalogue?: LearningCatalogueV1;
  /** The versions the model's reply was computed against. */
  versions: LearningAiVersions;
  /** The ids that were actually offered to it. */
  shortlist: readonly string[];
  proposedActivityId: string | null;
  reason?: string;
  today: string;
  at: string;
  budgetMinutes?: number;
  thresholds?: PolicyThresholds;
  /** True while a timed paper is running. Checked here as well as at the
      Worker, because a hidden button is not a boundary. */
  underAssessment?: boolean;
}

export type ProposalVerdict =
  | { accepted: true; activity: CatalogueActivity; disagreement: ProposalDisagreement | null }
  | { accepted: false; rejection: ProposalRejectionCode; message: string; disagreement: ProposalDisagreement };

/** Check one AI proposal against the plan it claims to be about.
 *
 *  Every refusal has a name, and a disagreement is recorded whether or not
 *  the proposal was accepted: model self-evaluation alone is not evidence,
 *  so the disagreements are the reviewable material. */
export function validatePlanProposal(input: ProposalCheck): ProposalVerdict {
  const catalogue = input.catalogue ?? learningCatalogue();
  const locale = input.plan.constraints.explanationLocale;
  const deterministicChoiceId =
    input.plan.activeSession.steps.find((step) => step.role === 'practise')?.activityId ??
    input.plan.activeSession.steps[0]?.activityId ??
    '';

  const refuse = (rejection: ProposalRejectionCode, message: string): ProposalVerdict => ({
    accepted: false,
    rejection,
    message,
    disagreement: {
      at: input.at,
      sessionId: input.plan.activeSession.id,
      deterministicChoiceId,
      modelChoiceId: input.proposedActivityId,
      accepted: false,
      rejection,
      reason: input.reason,
    },
  });

  if (input.underAssessment) return refuse('blocked-under-assessment', learningText(locale, PLANNER_SENTENCES.rejectUnderAssessment));
  if (input.versions.planRevision !== input.plan.revision) {
    return refuse('stale-plan-revision', learningText(locale, PLANNER_SENTENCES.rejectStalePlan));
  }
  if (input.versions.evidenceVersion !== input.policy.evidenceVersion) {
    return refuse('stale-evidence-version', learningText(locale, PLANNER_SENTENCES.rejectStaleEvidence));
  }
  if (input.versions.indexVersion !== catalogue.indexVersion) {
    return refuse('stale-index-version', learningText(locale, PLANNER_SENTENCES.rejectStaleIndex));
  }
  if (!input.proposedActivityId) return refuse('malformed-response', learningText(locale, PLANNER_SENTENCES.rejectMalformed));

  const activity = findActivity(input.proposedActivityId, catalogue);
  if (!activity) return refuse('unknown-activity', learningText(locale, PLANNER_SENTENCES.rejectUnknown));
  if (activity.unavailable) {
    /* activity.unavailable.reason is catalogue English, translated here at
       the point of use, the same rule objectiveFor follows for
       activity.objective (see the comment there). */
    return refuse(
      'unavailable',
      sentence(locale, PLANNER_SENTENCES.rejectUnavailable, { reason: learningText(locale, activity.unavailable.reason) }),
    );
  }
  if (!input.shortlist.includes(activity.id)) {
    return refuse('not-in-shortlist', learningText(locale, PLANNER_SENTENCES.rejectNotInShortlist));
  }

  const thresholds = input.thresholds ?? DEFAULT_POLICY_THRESHOLDS;
  const facts = learnerFacts(input.record, input.policy, thresholds);
  const budget = input.budgetMinutes ?? input.plan.activeSession.budgetMinutes;
  const context: EligibilityContext = {
    catalogue,
    facts,
    policy: input.policy,
    today: input.today,
    overrides: input.plan.overrides,
    unavailableSurfaces: input.plan.constraints.unavailable ?? [],
    minutes: budget,
    thresholds,
    allowHub: true,
    /* An earlier step of the same session satisfies a later step's
       prerequisite. Session assembly has always worked this way (see
       `satisfied` in assembleSession), which is how a new student can be
       taught the overview and then practise a question type in the same
       hour. Without the same rule here, the session's own practise step
       was refused as prerequisite-unmet the moment a model proposed it:
       its prerequisite is the teach step immediately above it. */
    satisfiedIds: sessionSatisfiedIds(input.plan, activity.id),
  };

  const reason = ineligibleReason(activity, context);
  if (reason === 'prerequisite-unmet') return refuse('prerequisite-unmet', learningText(locale, PLANNER_SENTENCES.rejectPrerequisite));
  if (reason === 'skipped-by-student') return refuse('blocked-by-override', learningText(locale, PLANNER_SENTENCES.rejectOverride));
  if (reason === 'over-budget' || reason === 'indivisible-over-budget') {
    return refuse(
      'over-budget',
      sentence(locale, PLANNER_SENTENCES.rejectOverBudget, { minutes: activity.expectedMinutes, budget }),
    );
  }
  if (reason === 'unavailable' || reason === 'surface-unavailable') {
    return refuse(
      'unavailable',
      sentence(locale, PLANNER_SENTENCES.rejectUnavailable, {
        reason: learningText(locale, PLANNER_SENTENCES.rejectUnavailableSurface),
      }),
    );
  }

  const disagreed = activity.id !== deterministicChoiceId;
  return {
    accepted: true,
    activity,
    disagreement: disagreed
      ? {
          at: input.at,
          sessionId: input.plan.activeSession.id,
          deterministicChoiceId,
          modelChoiceId: activity.id,
          accepted: true,
          reason: input.reason,
        }
      : null,
  };
}

/** A stable print of the plan for cache keys and for "is this reply still
    about the plan it was written for". */
export function planFingerprint(plan: PersonalPlanV1): string {
  return hashContent(canonicalJson({ ...comparable(plan), revision: plan.revision }));
}
