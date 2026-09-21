/* Building one session for one objective inside one budget.
 *
 * THE BUDGET IS THE POINT
 * The audit found a fifteen-minute plan producing a 255-minute day. Nothing
 * here warns about that: `assembleSession` throws if the steps it built do
 * not fit, and every caller goes through it. A step is allotted the smallest
 * of its role's cap, its activity's own estimate and the minutes still free,
 * so trimming happens while the session is being built rather than being
 * discovered afterwards.
 *
 * NEVER PAD
 * A session is as long as the useful work in it, not as long as the budget.
 * A student with a measured strength on the objective gets no teaching step.
 * A student who has already read the lesson goes straight to practice. The
 * minutes that are left over stay unspent.
 *
 * INDIVISIBLE MEANS INDIVISIBLE
 * A full paper, a mock and a graded essay are never cut down. One of them
 * either fits the budget and becomes the whole session, or it does not fit
 * and comes back as a longer commitment for the student to accept, which is
 * what `longerCommitments` is for. Its review is a separate session on a
 * later day (`reviewNeeded`), because reading forty explanations is its own
 * half hour.
 *
 * PURE
 * No storage, no clock, no network. `now` and `today` are arguments and ids
 * are hashes of the content, so the same input always builds the same
 * session.
 */

import type {
  CatalogueActivity,
  LearningCatalogueV1,
  Paper,
  Subskill,
} from './contracts/catalog';
import type { LearnerRecordV1 } from './contracts/evidence';
import type {
  AbilityEstimate,
  PolicyOutputV1,
  PolicyScope,
  PolicyScopeKey,
  PolicyThresholds,
} from './contracts/policy';
import { DEFAULT_POLICY_THRESHOLDS } from './contracts/policy';
import type {
  PlanAlternative,
  PlanOverride,
  PlanSession,
  SessionEvidenceRef,
  SessionStep,
  SessionStepRole,
} from './contracts/plan';
import {
  BUDGET_OVERRUN_ALLOWANCE,
  CHECK_MAX_MINUTES,
  DIAGNOSTIC_MAX_MINUTES_PER_SESSION,
  MIN_STEP_MINUTES,
  PRACTISE_MIN_SHARE,
  RECALL_MAX_MINUTES,
  RECAP_MAX_MINUTES,
  TEACH_MAX_MINUTES,
} from './contracts/plan';
import {
  activitiesThatTeach,
  checksForSubskill,
  findActivity,
  practiceForSubskill,
  prerequisiteClosure,
} from './catalog';
import { canonicalJson, hashContent, paperExposureKey, seenKeys } from './evidence';

/* ── Every sentence this file can write ──────────────────────────────────── */

/** All the English this module produces, in one place.
 *
 *  They are plain literals for now. A later package routes them through the
 *  existing English and Russian system (architecture section 1.6); keeping
 *  them together is what makes that one edit rather than a search. Each one
 *  says what the student will do, claims nothing about a band, and says so
 *  when something is uncertain. */
export const SESSION_SENTENCES = {
  recall: 'Bring back what you already did on this before anything new.',
  teach: 'Read the part of the lesson that explains this, not the whole page.',
  teachFirst: 'Start with what this question type actually asks you for.',
  practise: 'Work through real questions with help available when you get stuck.',
  practiseTimed: 'Sit this under exam timing, on your own.',
  independentCheck: 'Answer a short set you have not seen, with no help, so the result means something.',
  assess: 'A short sample to find out where you are. It is too short to be a band.',
  checkpoint: 'A whole paper under timing, to see where this stands now.',
  recap: 'Go back over what you got wrong and say the rule in your own words.',
  review: 'Go back over the marked work while it is still fresh.',
  plan: 'Set a new exam date, or change the goal you are working towards.',
  longerCommitment: 'This one cannot be cut in half, so it needs more time than today has.',
} as const;

/* ── What the planner hands over ─────────────────────────────────────────── */

/** The one thing this session is for. The planner decides WHICH objective;
    this module decides what a session for it looks like. */
export interface PlannedObjective {
  scope: PolicyScope;
  scopeKey: PolicyScopeKey;
  paper?: Paper;
  subskill: Subskill;
  /** One sentence, the student's language: what they will be able to do. */
  objective: string;
  /** Why this, built from counted evidence. */
  reason: string;
  evidenceRefs: readonly SessionEvidenceRef[];
  /** What kind of move this is. `demonstrate` skips teaching and goes
      straight to unseen material, `assess` is a checkpoint paper, and
      `plan` is the settings session a passed exam date produces. */
  intent: 'learn' | 'demonstrate' | 'assess' | 'review' | 'plan';
  /** Set when the student picked this objective or this exact activity. */
  chosenActivityId?: string;
}

/* ── Counted facts about one learner ─────────────────────────────────────── */

/** Everything the planner keeps asking about, counted once from the record
    and the policy output. Never read from storage. */
export interface LearnerFacts {
  /** Activities with at least one `completed` event. */
  completedActivityIds: ReadonlySet<string>;
  /** activityId to the local date it was last worked on. */
  lastWorkedByActivity: ReadonlyMap<string, string>;
  /** `<paper>|<subskill>` to the local date it was last worked on. */
  lastWorkedBySubskill: ReadonlyMap<string, string>;
  /** Exposure keys: items, source papers and prompts already met. */
  seen: ReadonlySet<string>;
  /** `<paper>|<subskill>` demonstrated well enough to skip teaching it. */
  strongSubskills: ReadonlySet<string>;
  /** Papers demonstrated strongly enough that teaching any of their parts
      would be padding. */
  strongPapers: ReadonlySet<Paper>;
  estimateByScope: ReadonlyMap<PolicyScopeKey, AbilityEstimate>;
  /** Local dates with any recorded work, newest first. */
  activeDates: readonly string[];
}

export const subskillKey = (paper: Paper | undefined, subskill: Subskill): string =>
  `${paper ?? '-'}|${subskill}`;

export function learnerFacts(
  record: LearnerRecordV1,
  policy: PolicyOutputV1,
  thresholds: PolicyThresholds = DEFAULT_POLICY_THRESHOLDS,
): LearnerFacts {
  const completedActivityIds = new Set<string>();
  const lastWorkedByActivity = new Map<string, string>();
  const lastWorkedBySubskill = new Map<string, string>();
  const dates = new Set<string>();

  for (const event of record.events) {
    if (event.completion === 'completed') completedActivityIds.add(event.activityId);
    const held = lastWorkedByActivity.get(event.activityId);
    if (!held || event.localDate > held) lastWorkedByActivity.set(event.activityId, event.localDate);
    const key = subskillKey(event.paper, event.subskill);
    const heldScope = lastWorkedBySubskill.get(key);
    if (!heldScope || event.localDate > heldScope) lastWorkedBySubskill.set(key, event.localDate);
    dates.add(event.localDate);
  }

  const estimateByScope = new Map(policy.estimates.map((estimate) => [estimate.scopeKey, estimate]));
  const strongSubskills = new Set<string>();
  const strongPapers = new Set<Paper>();
  for (const scopeKey of policy.strengths) {
    const estimate = estimateByScope.get(scopeKey);
    if (!estimate) continue;
    if (estimate.scope.kind === 'subskill') {
      strongSubskills.add(subskillKey(estimate.scope.paper, estimate.scope.subskill));
      continue;
    }
    /* A whole paper measured at or above what it has to reach makes its
       parts redundant to teach. This is how a strong Reading student stops
       being taught Reading. */
    if (estimate.scope.kind === 'paper' && estimate.certainty === 'measured') {
      if (estimate.percent === null || estimate.percent >= thresholds.strongPercent) {
        strongPapers.add(estimate.scope.paper);
      }
    }
  }

  return {
    completedActivityIds,
    lastWorkedByActivity,
    lastWorkedBySubskill,
    seen: seenKeys(record),
    strongSubskills,
    strongPapers,
    estimateByScope,
    activeDates: [...dates].sort().reverse(),
  };
}

/* ── Eligibility ─────────────────────────────────────────────────────────── */

export type IneligibleReason =
  | 'unavailable'
  | 'prerequisite-unmet'
  | 'skipped-by-student'
  | 'over-budget'
  | 'indivisible-over-budget'
  | 'surface-unavailable'
  | 'too-recent'
  | 'seen-before'
  | 'hub';

export interface EligibilityContext {
  catalogue: LearningCatalogueV1;
  facts: LearnerFacts;
  policy: PolicyOutputV1;
  today: string;
  overrides: readonly PlanOverride[];
  unavailableSurfaces: readonly ('microphone' | 'audio' | 'long-session')[];
  /** Minutes still free. An indivisible activity that does not fit becomes a
      longer commitment rather than a candidate. */
  minutes: number;
  thresholds: PolicyThresholds;
  /** Ids the student asked for, which skip the recency rule. */
  chosenActivityIds?: readonly string[];
  /** True when the activity has to be material the student has never met. */
  requireUnseen?: boolean;
  /** Allow hub links ("go to the drills page and pick something"). They name
      no items, so they can never be an independent check. */
  allowHub?: boolean;
  /** Activities this very session is about to teach. A prerequisite the
      session covers in its own first step is satisfied by the time the step
      after it runs, which is how a brand-new student can be taught the
      overview and then practise a question type in the same hour instead of
      spending an hour on the overview alone. */
  satisfiedIds?: ReadonlySet<string>;
}

/** The first reason this activity cannot be scheduled right now, or null
    when it can. */
export function ineligibleReason(
  activity: CatalogueActivity,
  context: EligibilityContext,
): IneligibleReason | null {
  if (activity.unavailable) return 'unavailable';

  const skipped = context.overrides.some(
    (override) =>
      override.kind === 'skip-activity' &&
      override.activityId === activity.id &&
      (override.until === undefined || override.until >= context.today),
  );
  if (skipped) return 'skipped-by-student';

  if (!context.allowHub && (activity.tags ?? []).includes('hub')) return 'hub';

  if ((activity.tags ?? []).includes('needs-microphone') && context.unavailableSurfaces.includes('microphone')) {
    return 'surface-unavailable';
  }
  if (activity.paper === 'listening' && context.unavailableSurfaces.includes('audio')) {
    return 'surface-unavailable';
  }
  if (activity.indivisible && context.unavailableSurfaces.includes('long-session')) {
    return 'surface-unavailable';
  }

  if (!prerequisitesSatisfied(activity, context)) return 'prerequisite-unmet';

  if (activity.expectedMinutes > context.minutes) {
    return activity.indivisible ? 'indivisible-over-budget' : 'over-budget';
  }

  if (context.requireUnseen && !isUnseen(activity, context.facts)) return 'seen-before';

  const chosen = (context.chosenActivityIds ?? []).includes(activity.id);
  if (!chosen) {
    const last = context.facts.lastWorkedByActivity.get(activity.id);
    const spacing = context.thresholds.reviewSpacingDays[0] ?? 3;
    const dueAgain = context.policy.dueReview.some((due) => due.activityId === activity.id);
    if (last && !dueAgain && calendarDaysBetween(last, context.today) < spacing) return 'too-recent';
  }

  return null;
}

export function isEligible(activity: CatalogueActivity, context: EligibilityContext): boolean {
  return ineligibleReason(activity, context) === null;
}

/** A prerequisite counts as satisfied when the activity behind it was
    completed, OR when its subskill is already demonstrated strongly. The
    second half is how a strong student skips redundant teaching. A
    prerequisite id that no longer resolves is not a barrier: a stale
    reference must never block somebody forever. */
function prerequisitesSatisfied(activity: CatalogueActivity, context: EligibilityContext): boolean {
  for (const id of activity.prerequisites) {
    if (context.facts.completedActivityIds.has(id)) continue;
    if (context.satisfiedIds?.has(id)) continue;
    const prerequisite = findActivity(id, context.catalogue);
    if (!prerequisite) continue;
    if (context.facts.strongSubskills.has(subskillKey(prerequisite.paper, prerequisite.subskill))) continue;
    if (prerequisite.paper !== undefined && context.facts.strongPapers.has(prerequisite.paper)) continue;
    return false;
  }
  return true;
}

/** True when none of this activity's material has been met before: not its
    source papers, not the activities it shares items with, not itself. Used
    for the independent check, where a remembered answer would make the
    result meaningless. */
export function isUnseen(activity: CatalogueActivity, facts: LearnerFacts): boolean {
  for (const testId of activity.sourcePaperIds ?? []) {
    if (facts.seen.has(paperExposureKey(testId))) return false;
  }
  if (facts.lastWorkedByActivity.has(activity.id)) return false;
  for (const shared of activity.sharesItemsWith ?? []) {
    if (facts.lastWorkedByActivity.has(shared)) return false;
  }
  return true;
}

/* ── Material for one objective ──────────────────────────────────────────── */

/* The catalogue's own lookups are by subskill alone, and several subskills
   live on both Reading and Listening (`sentence-completion` is on both, and
   `exam-format` is on all four papers, because every paper has an overview
   lesson). Asking for material about "the Reading paper's format" therefore
   has to say Reading, or the shortest overview in the library answers for
   every paper at once. These three wrappers are the only way this module
   and the planner reach the catalogue. */

export function teachOptions(
  objective: Pick<PlannedObjective, 'paper' | 'subskill'>,
  catalogue: LearningCatalogueV1,
): readonly CatalogueActivity[] {
  return activitiesThatTeach(objective.subskill, catalogue).filter(
    (activity) => objective.paper === undefined || activity.paper === objective.paper,
  );
}

export function practiceOptions(
  objective: Pick<PlannedObjective, 'paper' | 'subskill'>,
  minutes: number,
  catalogue: LearningCatalogueV1,
): readonly CatalogueActivity[] {
  return practiceForSubskill(objective.subskill, minutes, catalogue).filter(
    (activity) => objective.paper === undefined || activity.paper === objective.paper,
  );
}

export function checkOptions(
  objective: Pick<PlannedObjective, 'paper' | 'subskill'>,
  catalogue: LearningCatalogueV1,
): readonly { activity: CatalogueActivity; sourceTestIds: readonly string[] }[] {
  return checksForSubskill(objective.subskill, catalogue).filter(
    (entry) => objective.paper === undefined || entry.activity.paper === objective.paper,
  );
}

/** How many teaching steps one session may hold. Two: the thing itself,
    and at most one thing that genuinely has to come first. Three lessons in
    a row is a reading list, not a session. */
export const TEACH_MAX_STEPS = 2;

/** The ordered teaching this objective needs, outermost prerequisite first.
 *
 *  A brand-new student has not read the paper's overview, so every lesson
 *  about a question type is blocked behind it. Returning the overview AND
 *  the lesson lets one session do both and then practise, instead of
 *  spending an hour on an overview and calling it a day. Anything already
 *  completed, or already demonstrated strongly, drops out of the path. */
export function teachingPath(
  objective: Pick<PlannedObjective, 'paper' | 'subskill'>,
  context: EligibilityContext,
): readonly CatalogueActivity[] {
  const target = teachOptions(objective, context.catalogue).find((activity) => {
    const reason = ineligibleReason(activity, { ...context, minutes: Number.POSITIVE_INFINITY });
    return reason === null || reason === 'prerequisite-unmet';
  });
  if (!target) return [];

  const before: CatalogueActivity[] = [];
  for (const id of prerequisiteClosure(target.id, context.catalogue)) {
    if (context.facts.completedActivityIds.has(id)) continue;
    const activity = findActivity(id, context.catalogue);
    if (!activity || activity.kind !== 'lesson') continue;
    if (context.facts.strongSubskills.has(subskillKey(activity.paper, activity.subskill))) continue;
    if (activity.paper !== undefined && context.facts.strongPapers.has(activity.paper)) continue;
    if (ineligibleReason(activity, { ...context, minutes: Number.POSITIVE_INFINITY }) !== null) continue;
    before.push(activity);
  }
  // Closure order is nearest first, so the deepest prerequisite is taught
  // first and the target last.
  return [...before.reverse(), target].slice(-TEACH_MAX_STEPS);
}

/** Whole days between two local dates. Both are YYYY-MM-DD in the student's
    own zone, so this is calendar arithmetic and never a time zone question. */
export function calendarDaysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/* ── Building a session ──────────────────────────────────────────────────── */

export interface SessionRequest {
  catalogue: LearningCatalogueV1;
  record: LearnerRecordV1;
  policy: PolicyOutputV1;
  facts: LearnerFacts;
  objective: PlannedObjective;
  budgetMinutes: number;
  today: string;
  overrides: readonly PlanOverride[];
  unavailableSurfaces?: readonly ('microphone' | 'audio' | 'long-session')[];
  thresholds?: PolicyThresholds;
  /** Sample this paper with one short `assess` step, capped at
      DIAGNOSTIC_MAX_MINUTES_PER_SESSION. */
  diagnosticPaper?: Paper;
  chosenByStudent?: boolean;
  /** An indivisible activity the student explicitly agreed to give more time
      to. It becomes the whole session and the budget rises to hold it. */
  acceptedCommitment?: { activityId: string; minutes: number; acceptedAt: string };
}

export interface AssembledSession {
  session: PlanSession;
  /** Indivisible activities worth doing that today cannot hold. The student
      accepts one explicitly, or it is scheduled on a day with room. */
  longerCommitments: readonly PlanAlternative[];
  /** Set when the session is a whole paper whose review belongs on a later
      day. The planner places it; this module only says it is owed. */
  reviewNeeded: { activityId: string; minutes: number } | null;
  /** True when a diagnostic was asked for and nothing in the library is
      short enough to give it. Said out loud rather than skipped in silence. */
  diagnosticUnavailable: boolean;
  /** The paper actually sampled, when one was. */
  diagnosticPaper: Paper | null;
}

interface StepPlan {
  role: SessionStepRole;
  activity: CatalogueActivity;
  minutes: number;
  purpose: string;
}

/** Display order. Allocation happens by need, display happens in this
    order, so a recap is always last even though it is the first thing to be
    dropped when the minutes run out. */
const ROLE_ORDER: readonly SessionStepRole[] = [
  'recall',
  'teach',
  'practise',
  'feedback',
  'independent-check',
  'assess',
  'review',
  'recap',
];

export function assembleSession(request: SessionRequest): AssembledSession {
  const thresholds = request.thresholds ?? DEFAULT_POLICY_THRESHOLDS;
  const surfaces = request.unavailableSurfaces ?? [];
  const { objective, facts, policy, catalogue } = request;

  const longerCommitments: PlanAlternative[] = [];
  const steps: StepPlan[] = [];

  const context = (minutes: number, over: Partial<EligibilityContext> = {}): EligibilityContext => ({
    catalogue,
    facts,
    policy,
    today: request.today,
    overrides: request.overrides,
    unavailableSurfaces: surfaces,
    minutes,
    thresholds,
    chosenActivityIds: objective.chosenActivityId ? [objective.chosenActivityId] : [],
    ...over,
  });

  /* An accepted longer commitment IS the session. Nothing is added around
     it: the student agreed to one long thing, not to one long thing plus a
     recap that pushes it over. */
  const accepted = request.acceptedCommitment;
  const acceptedActivity = accepted ? findActivity(accepted.activityId, catalogue) : undefined;
  if (accepted && acceptedActivity) {
    const budget = Math.max(request.budgetMinutes, accepted.minutes, acceptedActivity.expectedMinutes);
    steps.push({
      role: acceptedActivity.kind === 'full-test' ? 'assess' : 'practise',
      activity: acceptedActivity,
      minutes: acceptedActivity.expectedMinutes,
      purpose: acceptedActivity.kind === 'full-test' ? SESSION_SENTENCES.practiseTimed : SESSION_SENTENCES.practise,
    });
    return {
      session: finish(request, steps, budget, accepted),
      longerCommitments: [],
      reviewNeeded: reviewOwedFor(acceptedActivity),
      diagnosticUnavailable: false,
      diagnosticPaper: null,
    };
  }

  const budget = request.budgetMinutes;

  /* A planning session has exactly one step and no teaching around it. */
  if (objective.intent === 'plan') {
    const planning = findActivity('tool:plan', catalogue);
    if (planning) {
      steps.push({
        role: 'review',
        activity: planning,
        minutes: Math.min(planning.expectedMinutes, budget),
        purpose: SESSION_SENTENCES.plan,
      });
    }
    return {
      session: finish(request, steps, budget),
      longerCommitments: [],
      reviewNeeded: null,
      diagnosticUnavailable: false,
      diagnosticPaper: null,
    };
  }

  /* A checkpoint paper is its own session. It is indivisible, so it either
     fits whole or it is offered as a longer commitment and the session
     falls back to ordinary work on the same objective. */
  if (objective.intent === 'assess' && objective.paper) {
    const checkpoint = checkpointPaper(objective.paper, context(budget, { requireUnseen: true }));
    if (checkpoint) {
      steps.push({
        role: 'assess',
        activity: checkpoint,
        minutes: checkpoint.expectedMinutes,
        purpose: SESSION_SENTENCES.checkpoint,
      });
      return {
        session: finish(request, steps, budget),
        longerCommitments: [],
        reviewNeeded: reviewOwedFor(checkpoint),
        diagnosticUnavailable: false,
        diagnosticPaper: null,
      };
    }
    const tooBig = checkpointPaper(objective.paper, context(Number.POSITIVE_INFINITY, { requireUnseen: true }));
    if (tooBig) longerCommitments.push(longerCommitmentFor(tooBig, objective));
  }

  /* Reserve the recap up front so the useful work is sized against what is
     really left, then hand back anything the recap does not need. */
  const recapReserve =
    budget >= 10 ? Math.min(RECAP_MAX_MINUTES, Math.max(MIN_STEP_MINUTES, Math.round(budget * 0.1))) : 0;
  let free = budget - recapReserve;

  /* 1. A diagnostic sample, when one is owed. Hard-capped: a short sample
        finds a learning need and is never a band. */
  let diagnosticUnavailable = false;
  let diagnosticPaper: Paper | null = null;
  if (request.diagnosticPaper) {
    const cap = Math.min(DIAGNOSTIC_MAX_MINUTES_PER_SESSION, free);
    const candidates = diagnosticCandidates(request.diagnosticPaper, context(Number.POSITIVE_INFINITY));
    const sample = candidates.find((activity) => activity.expectedMinutes <= cap);
    if (sample) {
      const minutes = Math.min(sample.expectedMinutes, cap);
      steps.push({ role: 'assess', activity: sample, minutes, purpose: SESSION_SENTENCES.assess });
      free -= minutes;
      diagnosticPaper = request.diagnosticPaper;
    } else {
      diagnosticUnavailable = true;
      if (candidates[0]) longerCommitments.push(longerCommitmentFor(candidates[0], objective));
    }
  }

  /* 2. Recall, only when spacing says something related is actually due. */
  const due =
    policy.dueReview.find((entry) => entry.scopeKey === objective.scopeKey) ??
    policy.dueReview.find((entry) => samePaper(entry.scopeKey, objective.paper));
  if (due && free >= MIN_STEP_MINUTES) {
    const activity = findActivity(due.activityId, catalogue);
    if (activity && isEligible(activity, context(free, { chosenActivityIds: [activity.id] }))) {
      const minutes = Math.min(activity.expectedMinutes, RECALL_MAX_MINUTES, free);
      if (minutes >= MIN_STEP_MINUTES) {
        steps.push({ role: 'recall', activity, minutes, purpose: SESSION_SENTENCES.recall });
        free -= minutes;
      }
    }
  }

  /* 3. Teach, only when teaching is actually needed. A measured strength
        gets nothing here, and neither does a student who has already read
        the lesson and simply needs the practice. Anything taught here
        satisfies its own prerequisite for the steps that follow. */
  const satisfied = new Set<string>();
  const path = teachingPath(objective, context(Number.POSITIVE_INFINITY));
  if (teachingNeeded(objective, facts, path[path.length - 1], thresholds)) {
    for (const activity of path) {
      if (free < MIN_STEP_MINUTES) break;
      /* Practice is protected before teaching is: a student learns by doing,
         and a lesson that eats the whole session is exactly the padding the
         brief forbids. */
      const practiseFloor = Math.max(0, Math.min(Math.floor(budget * PRACTISE_MIN_SHARE), free - MIN_STEP_MINUTES));
      const teachCap = Math.min(TEACH_MAX_MINUTES, Math.max(0, free - practiseFloor));
      const minutes = Math.min(activity.expectedMinutes, teachCap);
      if (minutes < MIN_STEP_MINUTES) break;
      const purpose = facts.completedActivityIds.has(activity.id)
        ? SESSION_SENTENCES.teach
        : SESSION_SENTENCES.teachFirst;
      steps.push({ role: 'teach', activity, minutes, purpose });
      satisfied.add(activity.id);
      free -= minutes;
    }
  }

  /* 4. Practise: the largest thing that still fits, so the slot is filled
        once rather than padded with three small ones. Feedback happens on
        the practice screen and costs minutes here, not a step of its own. */
  const practiseCandidates = practiceOptions(objective, free, catalogue);
  const practisable = (candidate: CatalogueActivity): boolean =>
    isEligible(candidate, context(free, { satisfiedIds: satisfied }));

  /* Look ahead to the check before choosing what to practise on. Most
     question types have exactly one short unseen check in the library, and
     a drill lifted from the same paper would spend it. Preferring a drill
     from a different paper is what keeps the teach, practise, check loop
     whole instead of losing its last step to an accident of which paper
     came first. */
  const checkAhead = checkOptions(objective, catalogue).find(
    (entry) =>
      entry.activity.expectedMinutes <= Math.min(CHECK_MAX_MINUTES, free) &&
      isEligible(entry.activity, context(free, { requireUnseen: true, chosenActivityIds: [], satisfiedIds: satisfied })),
  );
  const wouldSpendTheCheck = (candidate: CatalogueActivity): boolean => {
    if (!checkAhead) return false;
    if (candidate.id === checkAhead.activity.id) return true;
    const reserved = new Set<string>([
      ...(checkAhead.activity.sourcePaperIds ?? []),
      ...(checkAhead.activity.sharesItemsWith ?? []),
    ]);
    return (
      (candidate.sourcePaperIds ?? []).some((id) => reserved.has(id)) ||
      (candidate.sharesItemsWith ?? []).some((id) => reserved.has(id))
    );
  };
  const practise =
    practiseCandidates.find((candidate) => practisable(candidate) && !wouldSpendTheCheck(candidate)) ??
    practiseCandidates.find(practisable);
  if (practise && free >= MIN_STEP_MINUTES) {
    const minutes = practise.indivisible ? practise.expectedMinutes : Math.min(practise.expectedMinutes, free);
    if (minutes <= free && minutes >= MIN_STEP_MINUTES) {
      steps.push({
        role: 'practise',
        activity: practise,
        minutes,
        purpose: SESSION_SENTENCES.practise,
      });
      free -= minutes;
    }
  }

  /* Anything indivisible and worth doing that today could not hold comes
     back as an explicit longer commitment rather than being trimmed. The
     whole teaching path counts as satisfied here, not only the part that
     fitted today: a longer commitment is a future session, and by the time
     the student reaches it the lessons in front of it will have been read. */
  const eventuallySatisfied = new Set(path.map((activity) => activity.id));
  for (const candidate of practiceOptions(objective, Number.POSITIVE_INFINITY, catalogue)) {
    if (!candidate.indivisible || candidate.expectedMinutes <= budget) continue;
    const blocked = ineligibleReason(candidate, context(Number.POSITIVE_INFINITY, { satisfiedIds: eventuallySatisfied }));
    /* An unmet prerequisite is not a reason to withhold the offer. This is
       an explicit choice for another day, never the default, and the lesson
       in front of it is what the plan is teaching in the meantime. Anything
       else that makes an activity unschedulable still does. */
    if (blocked !== null && blocked !== 'prerequisite-unmet') continue;
    longerCommitments.push(longerCommitmentFor(candidate, objective));
    if (longerCommitments.length >= 2) break;
  }

  /* 5. Independent check on material never met.
        Practice above is guided: hints are available and the answers are
        explained, so however fresh its questions were it does not show what
        the student can do alone. A whole paper or a graded task already is
        an independent demonstration, so nothing is added after one. */
  const alreadyIndependent = practise ? practise.kind === 'full-test' || practise.kind === 'graded-task' : false;
  if (free >= MIN_STEP_MINUTES && !alreadyIndependent) {
    const checkCap = Math.min(CHECK_MAX_MINUTES, free);
    /* The practice step is about to spend its own paper's questions, so a
       check drawn from the same paper would not be unseen by the time the
       student reached it. The record cannot know that yet, because none of
       this has happened. */
    const spentHere = new Set<string>([
      ...(practise?.sourcePaperIds ?? []),
      ...(practise?.sharesItemsWith ?? []),
      ...(practise ? [practise.id] : []),
    ]);
    const check = checkOptions(objective, catalogue).find(
      (entry) =>
        entry.activity.id !== practise?.id &&
        entry.activity.expectedMinutes <= checkCap &&
        !(entry.activity.sourcePaperIds ?? []).some((id) => spentHere.has(id)) &&
        !(entry.activity.sharesItemsWith ?? []).some((id) => spentHere.has(id)) &&
        isEligible(entry.activity, context(checkCap, { requireUnseen: true, chosenActivityIds: [], satisfiedIds: satisfied })),
    );
    if (check) {
      const minutes = Math.min(check.activity.expectedMinutes, checkCap);
      steps.push({
        role: 'independent-check',
        activity: check.activity,
        minutes,
        purpose: SESSION_SENTENCES.independentCheck,
      });
      free -= minutes;
    }
  }

  /* 6. Recap, out of the minutes reserved for it, and only when there is
        something to recap. */
  const recapTarget = steps.find((step) => step.role === 'practise') ?? steps.find((step) => step.role === 'teach');
  const recapMinutes = Math.min(RECAP_MAX_MINUTES, recapReserve + free);
  if (recapTarget && recapMinutes >= MIN_STEP_MINUTES) {
    steps.push({
      role: 'recap',
      activity: recapTarget.activity,
      minutes: recapMinutes,
      purpose: SESSION_SENTENCES.recap,
    });
  }

  const wholePaper = steps.find((step) => step.activity.kind === 'full-test');
  return {
    session: finish(request, steps, budget),
    longerCommitments,
    reviewNeeded: wholePaper ? reviewOwedFor(wholePaper.activity) : null,
    diagnosticUnavailable,
    diagnosticPaper,
  };
}

function samePaper(scopeKey: PolicyScopeKey, paper: Paper | undefined): boolean {
  return paper !== undefined && scopeKey.includes(`:${paper}`);
}

/** A whole timed paper needs its own later session to go through the
    answers. Forty explanations is not five minutes at the end of the hour. */
function reviewOwedFor(activity: CatalogueActivity): { activityId: string; minutes: number } | null {
  if (activity.kind !== 'full-test') return null;
  return { activityId: activity.id, minutes: Math.min(30, Math.round(activity.expectedMinutes / 2)) };
}

function longerCommitmentFor(activity: CatalogueActivity, objective: PlannedObjective): PlanAlternative {
  return {
    kind: 'longer-commitment',
    label: `${activity.objective} ${SESSION_SENTENCES.longerCommitment}`,
    sessionSketch: {
      objective: objective.objective,
      activityIds: [activity.id],
      minutes: activity.expectedMinutes,
    },
  };
}

/** Whether this objective needs a teaching step at all.
 *
 *  No, when the scope is a measured strength: teaching somebody what they
 *  have already demonstrated is the padding the brief forbids. Yes, when
 *  nothing is known yet or the evidence is thin. Otherwise only when the
 *  lesson behind it has never been studied, so a measured weakness on a
 *  lesson the student has already read goes straight to practice. */
export function teachingNeeded(
  objective: PlannedObjective,
  facts: LearnerFacts,
  teachActivity: CatalogueActivity | undefined,
  thresholds: PolicyThresholds = DEFAULT_POLICY_THRESHOLDS,
): boolean {
  if (objective.intent === 'demonstrate' || objective.intent === 'assess') return false;
  if (facts.strongSubskills.has(subskillKey(objective.paper, objective.subskill))) return false;
  if (objective.paper !== undefined && facts.strongPapers.has(objective.paper)) return false;

  const estimate = facts.estimateByScope.get(objective.scopeKey);
  if (estimate?.certainty === 'measured' && estimate.percent !== null && estimate.percent >= thresholds.strongPercent) {
    return false;
  }
  if (
    estimate === undefined ||
    estimate.certainty === 'unknown' ||
    estimate.certainty === 'self-reported' ||
    estimate.certainty === 'limited'
  ) {
    return true;
  }
  return teachActivity !== undefined && !facts.completedActivityIds.has(teachActivity.id);
}

/** Real, marked, short samples for one paper, shortest first.
 *
 *  A diagnostic has to produce real marks: scored items, a scored paper, or
 *  a report from one of the calibrated graders. Unverified authored material
 *  is allowed ONLY where a calibrated grader does the marking; lead decision
 *  Q1 bars it from checks and assessment because the material itself would
 *  be deciding the answer, which a grader-marked task does not let it do. */
const DIAGNOSTIC_EVIDENCE = new Set(['scored-items', 'scored-paper', 'graded-rubric']);

export function diagnosticCandidates(paper: Paper, context: EligibilityContext): CatalogueActivity[] {
  return context.catalogue.activities
    .filter((activity) => {
      if (activity.paper !== paper) return false;
      if (!DIAGNOSTIC_EVIDENCE.has(activity.completionEvidence)) return false;
      if (!activity.verified && activity.completionEvidence !== 'graded-rubric') return false;
      /* A diagnostic is taken cold: refusing to sample somebody until they
         have read the lesson first is exactly the guess it exists to
         replace, so an unmet prerequisite is not a barrier here. */
      const reason = ineligibleReason(activity, {
        ...context,
        minutes: Number.POSITIVE_INFINITY,
        requireUnseen: true,
        chosenActivityIds: [],
      });
      return reason === null || reason === 'prerequisite-unmet';
    })
    .sort((a, b) => a.expectedMinutes - b.expectedMinutes || (a.id < b.id ? -1 : 1));
}

/** The shortest unseen whole paper for this skill, for a checkpoint. Papers
    with no exposure are reserved for exactly this, which is why the filter
    is on `unseen-reserved` material rather than on any paper at all. */
export function checkpointPaper(paper: Paper, context: EligibilityContext): CatalogueActivity | undefined {
  return context.catalogue.activities
    .filter(
      (activity) =>
        activity.kind === 'full-test' &&
        activity.paper === paper &&
        ineligibleReason(activity, { ...context, requireUnseen: true }) === null,
    )
    .sort((a, b) => a.expectedMinutes - b.expectedMinutes || (a.id < b.id ? -1 : 1))[0];
}

/* ── Finishing, and the assertion that makes the budget real ─────────────── */

function finish(
  request: SessionRequest,
  planned: readonly StepPlan[],
  budgetMinutes: number,
  extendedCommitment?: { activityId: string; minutes: number; acceptedAt: string },
): PlanSession {
  const ordered = [...planned].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const id = sessionId(request, ordered, budgetMinutes);
  const steps: SessionStep[] = ordered.map((step, index) => ({
    stepId: `${id}:${index + 1}:${step.role}`,
    role: step.role,
    activityId: step.activity.id,
    contentVersion: step.activity.contentVersion,
    minutes: step.minutes,
    purpose: step.purpose,
    state: 'pending',
  }));

  const session: PlanSession = {
    id,
    date: request.today,
    objective: request.objective.objective,
    objectiveScope: request.objective.scopeKey,
    paper: request.objective.paper,
    subskill: request.objective.subskill,
    reason: request.objective.reason,
    evidenceRefs: request.objective.evidenceRefs,
    steps,
    budgetMinutes,
    extendedCommitment,
    state: 'active',
    chosenByStudent: request.chosenByStudent,
  };

  assertWithinBudget(session);
  return session;
}

function sessionId(request: SessionRequest, steps: readonly StepPlan[], budgetMinutes: number): string {
  return `sess:${hashContent(
    canonicalJson({
      date: request.today,
      scope: request.objective.scopeKey,
      subskill: request.objective.subskill,
      budget: budgetMinutes,
      steps: steps.map((step) => `${step.role}|${step.activity.id}|${step.minutes}`),
    }),
  )}`;
}

export function sessionMinutes(session: PlanSession): number {
  return session.steps.reduce((total, step) => total + step.minutes, 0);
}

/** The budget is a constraint, not a warning. Called on every session this
    module builds, and worth calling on anything arriving from storage. */
export function assertWithinBudget(session: PlanSession): void {
  const total = sessionMinutes(session);
  const allowed = session.budgetMinutes * (1 + BUDGET_OVERRUN_ALLOWANCE);
  if (total > allowed) {
    throw new Error(
      `Session ${session.id} plans ${total} minutes against a budget of ${session.budgetMinutes}: ` +
        session.steps.map((step) => `${step.role} ${step.minutes}`).join(', '),
    );
  }
  for (const step of session.steps) {
    if (step.minutes <= 0) throw new Error(`Session ${session.id} has a step with no minutes: ${step.stepId}`);
  }
}
