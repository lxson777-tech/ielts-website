/* One session, seen three ways.
 *
 * WHAT THIS IS FOR
 * `courseStatus`, `getTodayPlan` and `recommendNext` each used to decide for
 * themselves what a student should do next, and on /dashboard all three ran
 * at once and named three different things (the audit's first reproduced
 * finding). They keep their signatures, because nine screens call them, but
 * each one is now a VIEW of the same `plan.activeSession`. This file holds
 * the shared view they read and the small mappings each of them needs.
 *
 * WHY THE PLAN ARRIVES THROUGH A PROVIDER
 * `src/lib/course.ts` is imported by the Mr EZ Worker, and the persisted
 * plan lives in `store.browser.ts`, which a Worker must never load: its
 * store is a per-process singleton and a Worker serves every student from
 * one process. So nothing here reaches for storage. The browser entry point
 * (`src/lib/learning/index.ts`) installs a provider on load, and anything
 * that has no provider falls back to deriving a plan from what it was given
 * or, failing that, to the library position. A missing provider therefore
 * costs accuracy, never a crash and never a wrong link.
 *
 * NOTHING RUNTIME IS IMPORTED THAT IS NOT NEEDED
 * The type imports below are erased at build time. The only runtime imports
 * are the two tiny helpers from the old study plan and the named constants
 * from the plan contract, because `src/lib/course.ts` imports this file and
 * every page that shows a course card imports that. The catalogue, which is
 * a few hundred kilobytes, is passed IN rather than imported here.
 */

import type { Locale } from '../i18n/locale';
import type { SavedPlan } from '../study-plan';
import { PLAN_SKILLS, sanitiseSkillTargets } from '../study-plan';
import type {
  ActivityKind,
  ActivityTarget,
  CatalogueActivity,
  LearningCatalogueV1,
  Paper,
  Subskill,
} from './contracts/catalog';
import type { PolicyScopeKey } from './contracts/policy';
import type {
  Confirmation,
  DailyMinutes,
  PersonalPlanV1,
  PlanConstraints,
  PlanGoals,
  PlanSession,
  PlanStatus,
  SessionStep,
  SessionStepRole,
} from './contracts/plan';
import { DAILY_MINUTE_CHOICES, RECOMMENDED_DAILY_MINUTES } from './contracts/plan';

/* ── The shared view ─────────────────────────────────────────────────────── */

/** One step of the current session, flattened with everything the three
    surfaces need and nothing they do not. `href` is unprefixed, the same
    convention as `CourseLesson.href`: callers apply `withBase()`. */
export interface SharedStepView {
  stepId: string;
  role: SessionStepRole;
  activityId: string;
  /** From the catalogue. Null when the id no longer resolves, which happens
      when the library moved under a stored plan; the step is still shown,
      honestly, as something with no destination. */
  kind: ActivityKind | null;
  paper?: Paper;
  subskill: Subskill;
  minutes: number;
  purpose: string;
  state: SessionStep['state'];
  href: string | null;
  /** The activity's own one-sentence objective, in English. A surface with a
      real title for this id should prefer its own. */
  objective: string;
  indivisible: boolean;
  /** The `progress.lessons` key when this step is a library lesson, so the
      course view can find the same lesson in `COURSE_UNITS`. */
  lessonKey: string | null;
}

/** Everything every surface reads. Built once from the plan, so two screens
    rendering at the same instant cannot disagree. */
export interface SharedSessionView {
  sessionId: string;
  /** The local date this session is for. */
  date: string;
  objective: string;
  objectiveScope: PolicyScopeKey;
  reason: string;
  paper?: Paper;
  subskill: Subskill;
  budgetMinutes: number;
  state: PlanSession['state'];
  steps: readonly SharedStepView[];
  /** The step the student is on: the first that is neither done nor skipped.
      Null once every step is finished. */
  current: SharedStepView | null;
  /** The one activity id every surface names. The current step's, or the
      last step's once the session is finished. */
  activityId: string | null;
  planStatus: PlanStatus;
  planRevision: number;
  evidenceVersion: number;
  confirmed: boolean;
  targetBand: number | null;
  examDate: string | null;
  regularDailyMinutes: number;
  /** What honestly will not fit, when the planner had to leave real work
      out. Never a promise about a band. */
  scopeNote: string | null;
  /** Study days with nothing recorded on them, counted by whoever built this
      view and had the record to count from. Zero when nobody counted. */
  missedStudyDays: number;
  /** True when this session was worked out on the spot rather than read from
      the student's stored plan, which is what the Mr EZ Worker does until it
      is given the synced plan. The choice is the same; only its permanence
      differs, and a surface may say so. */
  derived: boolean;
}

/* ── Building it ─────────────────────────────────────────────────────────── */

/** The path a step sends the student to, or null for a task run in place.
 *
 *  The same rule as `activityHref` in catalog.ts, rewritten over the target
 *  alone so that this file can stay free of the catalogue module and the
 *  generated index it carries. */
export function stepHref(target: ActivityTarget): string | null {
  if (target.kind !== 'route') return null;
  const query = target.query ?? {};
  const pairs = Object.keys(query)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key] as string)}`);
  return target.href + (pairs.length ? `?${pairs.join('&')}` : '') + (target.hash ? `#${target.hash}` : '');
}

/** The `progress.lessons` key a library lesson is filed under, or null. */
export function lessonKeyOf(activityId: string): string | null {
  return activityId.startsWith('lesson:') ? activityId.slice('lesson:'.length) : null;
}

function activityById(id: string, catalogue: LearningCatalogueV1): CatalogueActivity | undefined {
  return catalogue.activities.find((activity) => activity.id === id);
}

function stepView(step: SessionStep, catalogue: LearningCatalogueV1): SharedStepView {
  const activity = activityById(step.activityId, catalogue);
  return {
    stepId: step.stepId,
    role: step.role,
    activityId: step.activityId,
    kind: activity?.kind ?? null,
    paper: activity?.paper,
    subskill: activity?.subskill ?? 'exam-format',
    minutes: step.minutes,
    purpose: step.purpose,
    state: step.state,
    href: activity ? stepHref(activity.target) : null,
    objective: activity?.objective ?? step.purpose,
    indivisible: activity?.indivisible ?? false,
    lessonKey: lessonKeyOf(step.activityId),
  };
}

export interface SharedSessionInput {
  plan: PersonalPlanV1;
  catalogue: LearningCatalogueV1;
  /** Counted by the caller, which is the one that holds the record. */
  missedStudyDays?: number;
  derived?: boolean;
}

export function sharedSessionFrom(input: SharedSessionInput): SharedSessionView {
  const { plan, catalogue } = input;
  const session = plan.activeSession;
  const steps = session.steps.map((step) => stepView(step, catalogue));
  const current = steps.find((step) => step.state !== 'done' && step.state !== 'skipped') ?? null;
  return {
    sessionId: session.id,
    date: session.date,
    objective: session.objective,
    objectiveScope: session.objectiveScope,
    reason: session.reason,
    paper: session.paper,
    subskill: session.subskill,
    budgetMinutes: session.budgetMinutes,
    state: session.state,
    steps,
    current,
    activityId: current?.activityId ?? steps[steps.length - 1]?.activityId ?? null,
    planStatus: plan.status,
    planRevision: plan.revision,
    evidenceVersion: plan.evidenceVersion,
    confirmed: plan.confirmed,
    targetBand: plan.goals.overallTarget?.band ?? null,
    examDate: plan.goals.examDate?.date ?? null,
    regularDailyMinutes: plan.constraints.regularDailyMinutes,
    scopeNote: plan.scopeNote ?? null,
    missedStudyDays: input.missedStudyDays ?? 0,
    derived: input.derived ?? false,
  };
}

/* ── The provider ────────────────────────────────────────────────────────── */

export type SharedSessionProvider = () => SharedSessionView | null;

let provider: SharedSessionProvider | null = null;

/** Installed once, by the browser entry point, as a side effect of loading
    it. Everything else asks through `currentSharedSession()`. */
export function setSharedSessionProvider(next: SharedSessionProvider | null): void {
  provider = next;
}

/** The session every surface should be showing, or null when nothing has
    been wired up yet (a server render, the Worker, a test that has not
    installed one). A null answer is a reason to fall back, never a reason to
    invent a second opinion. */
export function currentSharedSession(): SharedSessionView | null {
  if (!provider) return null;
  try {
    return provider();
  } catch {
    /* A broken plan must not take a page down with it. The caller falls back
       to what it can work out on its own. */
    return null;
  }
}

/* ── What the migration needs from the catalogue ─────────────────────────── */

/** Lesson key to the subskill it teaches, and to its estimated minutes.
 *
 *  The one-time migration of old lesson completions needs both, and so does
 *  anything that works a plan out from `ProgressV1` on the spot (the Mr EZ
 *  Worker, and a page that has not wired the browser stores up). Kept here,
 *  where the catalogue is an argument rather than an import, so the Worker
 *  can reach it: `store.browser.ts` re-exports it as `lessonMapsFrom` for
 *  the browser, and both therefore file a completion under the same
 *  subskill. Two different answers would be two different plans. */
export function lessonMapsFor(catalogue: LearningCatalogueV1): {
  lessonSubskills: Record<string, Subskill>;
  lessonMinutes: Record<string, number>;
} {
  const lessonSubskills: Record<string, Subskill> = {};
  const lessonMinutes: Record<string, number> = {};
  for (const activity of catalogue.activities) {
    if (activity.kind !== 'lesson') continue;
    const lessonKey = lessonKeyOf(activity.id);
    if (lessonKey === null) continue;
    lessonSubskills[lessonKey] = activity.subskill;
    lessonMinutes[lessonKey] = activity.expectedMinutes;
  }
  return { lessonSubskills, lessonMinutes };
}

/* ── The old settings, read forward ──────────────────────────────────────── */

/** Everything the old world knew about a student's goal, in one shape, so
    that the browser (which reads `SavedPlan`) and the Worker (which reads
    `StudentInsights.goals`) build exactly the same `PlanGoals`. */
export interface LegacyPlanSettings {
  /** '6.5', '7.0' and so on, or null when never set. */
  targetBand: string | null;
  /** ISO yyyy-mm-dd, or null/'' when there is no booked date. */
  examDate: string | null;
  perPaperTargets: Partial<Record<Paper, string>>;
  dailyMinutes?: number;
  studyDays?: 'daily' | 'weekdays';
  /** `SavedPlan.defaulted`, or `StudentGoals.guessed`: true when the
      platform fabricated this on the student's first visit and they have
      never confirmed any of it. */
  defaulted: boolean;
  createdAt?: string;
  explanationLocale?: Locale;
  tzOffsetMinutes?: number;
}

function bandNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const band = Number(value);
  return Number.isFinite(band) ? band : null;
}

export function planSettingsFromSavedPlan(saved: SavedPlan | null): LegacyPlanSettings | null {
  if (!saved) return null;
  const targets = sanitiseSkillTargets(saved.skillTargets) ?? {};
  const perPaperTargets: Partial<Record<Paper, string>> = {};
  for (const skill of PLAN_SKILLS) {
    const band = targets[skill];
    if (band) perPaperTargets[skill] = band;
  }
  return {
    targetBand: saved.targetBand || null,
    examDate: saved.testDate || null,
    perPaperTargets,
    dailyMinutes: saved.dailyMinutes,
    studyDays: saved.studyDays,
    defaulted: saved.defaulted === true,
    createdAt: saved.createdAt || undefined,
  };
}

/** Architecture section 4.2, exactly.
 *
 *  `defaulted === true` means the platform made this up on the first page
 *  view, so every field comes across as `provisional`: the intake asks again
 *  and sixty minutes is offered as the recommendation. Anything else,
 *  including a plan saved before the field existed, is a plan the student
 *  actually saved, so their target, their date, their per-paper minimums and
 *  their own daily minutes come across untouched and confirmed. The cost of
 *  the ambiguity around a pre-`defaulted` plan is that the student is not
 *  re-asked, which is the right way round: their settings survive. */
export function goalsFrom(settings: LegacyPlanSettings | null): PlanGoals {
  const empty: PlanGoals = {
    overallTarget: null,
    perPaperMinimums: {},
    examDate: null,
    route: 'academic',
    selfReported: [],
  };
  if (!settings) return empty;
  const status: Confirmation = settings.defaulted ? 'provisional' : 'confirmed';
  const target = bandNumber(settings.targetBand);
  const perPaperMinimums: PlanGoals['perPaperMinimums'] = {};
  for (const [paper, band] of Object.entries(settings.perPaperTargets)) {
    const value = bandNumber(band);
    if (value !== null) perPaperMinimums[paper as Paper] = { band: value, status };
  }
  return {
    overallTarget: target === null ? null : { band: target, status },
    perPaperMinimums,
    examDate: settings.examDate ? { date: settings.examDate, status } : null,
    route: 'academic',
    selfReported: [],
  };
}

function asDailyMinutes(value: number | undefined): DailyMinutes | null {
  if (value === undefined) return null;
  return (DAILY_MINUTE_CHOICES as readonly number[]).includes(value) ? (value as DailyMinutes) : null;
}

/** The regular commitment, carried over exactly when the student chose it.
 *
 *  A fabricated plan's twenty-five minutes is NOT carried over: it was never
 *  a choice, and requirement R1.3 is that a new plan is offered sixty as the
 *  recommendation. A saved plan's own number is carried over untouched, even
 *  when it is not one of the five the intake offers, in which case the
 *  nearest offered value is used and the status stays confirmed. */
export function constraintsFrom(
  settings: LegacyPlanSettings | null,
  over: Partial<PlanConstraints> = {},
): PlanConstraints {
  const chosen = settings && !settings.defaulted ? asDailyMinutes(settings.dailyMinutes ?? 25) : null;
  return {
    regularDailyMinutes: chosen ?? RECOMMENDED_DAILY_MINUTES,
    regularDailyMinutesStatus: chosen === null ? 'provisional' : 'confirmed',
    studyDays: settings?.studyDays ?? 'daily',
    explanationLocale: settings?.explanationLocale ?? 'en',
    tzOffsetMinutes: settings?.tzOffsetMinutes ?? 0,
    ...over,
  };
}

/* ── The derived copy the old screens still read (lead decision D1) ──────── */

function legacyStudyDays(constraints: PlanConstraints): SavedPlan['studyDays'] {
  if (constraints.studyDays !== 'custom') return constraints.studyDays;
  /* The old store has no way to say "Tuesdays and Thursdays". Monday to
     Friday is representable; anything else is recorded as every day, which
     over-counts study days rather than hiding one. */
  const days = [...(constraints.customStudyDays ?? [])].sort();
  const weekdays = [1, 2, 3, 4, 5];
  return days.length === weekdays.length && days.every((day, index) => day === weekdays[index])
    ? 'weekdays'
    : 'daily';
}

/** The `SavedPlan` written beside `PersonalPlanV1` so the screens that have
 *  not been rewired yet keep working. Lead decision D1: it is WRITTEN and
 *  never read back as the truth, and a test asserts the two never disagree
 *  on target band, exam date or daily minutes.
 *
 *  Null when there is nothing honest to write: an unconfirmed plan with no
 *  existing copy to shadow would only put the platform's own guesses into a
 *  store that syncs, where they could overwrite a real setting made on
 *  another device. A provisional value never replaces something the student
 *  actually saved. */
export function derivedSavedPlan(plan: PersonalPlanV1, existing: SavedPlan | null): SavedPlan | null {
  if (!plan.confirmed && !existing) return null;

  const target = plan.goals.overallTarget;
  const exam = plan.goals.examDate;
  const minutes = plan.constraints.regularDailyMinutes;
  const minutesConfirmed = plan.constraints.regularDailyMinutesStatus === 'confirmed';

  const skillTargets: NonNullable<SavedPlan['skillTargets']> = { ...(existing?.skillTargets ?? {}) };
  for (const skill of PLAN_SKILLS) {
    const minimum = plan.goals.perPaperMinimums[skill];
    if (minimum && minimum.status === 'confirmed') skillTargets[skill] = minimum.band.toFixed(1);
  }

  const derived: SavedPlan = {
    targetBand:
      target && target.status === 'confirmed'
        ? target.band.toFixed(1)
        : existing?.targetBand ?? (target ? target.band.toFixed(1) : '7.0'),
    testDate:
      exam && exam.status === 'confirmed' ? exam.date : existing?.testDate ?? (exam ? exam.date : ''),
    /* The personal plan is the truth, so the shadow has to win the old
       last-write-wins merge in src/lib/study-plan.ts rather than lose to a
       stale copy of itself from another tab. */
    createdAt: plan.updatedAt,
    startDate: existing?.startDate ?? plan.createdAt.slice(0, 10),
    done: existing?.done ?? [],
    doneKeys: existing?.doneKeys ?? [],
    dailyMinutes: minutesConfirmed ? minutes : existing?.dailyMinutes ?? minutes,
    studyDays: legacyStudyDays(plan.constraints),
    defaulted: !plan.confirmed,
  };
  if (Object.keys(skillTargets).length > 0) derived.skillTargets = skillTargets;
  return derived;
}

/* ── Mapping a step onto the shapes the old surfaces hold ────────────────── */

/** What the old Today list calls this kind of work. Cosmetic: it picks the
    label and the icon, and completion now comes from the session's own step
    state rather than from re-deriving it per type. */
export function legacyItemType(
  step: SharedStepView,
): 'lesson' | 'drill' | 'test' | 'vocab' | 'review' | 'mock' {
  if (step.activityId === 'test:mock') return 'mock';
  switch (step.kind) {
    case 'lesson':
      return 'lesson';
    case 'vocab-review':
      return 'vocab';
    case 'full-test':
      return 'test';
    case 'reference':
    case 'planning':
      return 'review';
    default:
      return step.role === 'recap' || step.role === 'review' ? 'review' : 'drill';
  }
}

/** The nearest id in the Mr EZ catalogue (`src/lib/tutor/catalog.ts`).
 *
 *  That catalogue is deliberately smaller than this one: it lists lessons,
 *  the practice hubs, the trainers and the tools, because every id it hands
 *  the model has to resolve again on the way back or the reply is dropped.
 *  A session step naming one exact drill therefore has to be answered with
 *  the filtered drill page for its question type, which is the same place
 *  the student would land anyway. The exact planned id travels beside it, so
 *  nothing is lost and the three surfaces can still be compared. */
export function tutorActivityIdFor(step: SharedStepView): string {
  if (step.activityId.startsWith('lesson:')) return step.activityId;
  if (step.activityId.startsWith('practise:')) return step.activityId;
  if (TUTOR_FIXED_IDS.has(step.activityId)) return step.activityId;
  if (step.activityId.startsWith('review:vocabulary')) return 'review:vocabulary';
  if ((step.paper === 'reading' || step.paper === 'listening') && isQuestionType(step.subskill)) {
    return `practise:${step.paper}:${step.subskill}`;
  }
  switch (step.paper) {
    case 'reading':
      return step.kind === 'full-test' ? 'test:reading' : 'trainer:reading';
    case 'listening':
      return step.kind === 'full-test' ? 'test:listening' : 'trainer:listening';
    case 'writing':
      return step.kind === 'reference' ? 'tool:models' : 'trainer:writing';
    case 'speaking':
      return 'trainer:speaking';
    default:
      /* No paper: the mock, vocabulary and the reference shelves. A
         planning step is the settings page; anything else with nothing to
         practise is the progress report, which is where a student goes to
         see where they stand. */
      if (step.kind === 'planning') return 'tool:plan';
      if (step.kind === 'full-test') return 'test:mock';
      if (step.kind === 'vocab-review') return 'review:vocabulary';
      return 'tool:report';
  }
}

/** The fixed ids `src/lib/tutor/catalog.ts` holds, written out rather than
 *  imported: that file imports `src/lib/course.ts`, which imports this one,
 *  and a cycle would break the Worker bundle. A test in
 *  tests/learning-adapters.test.ts checks every id a session can name really
 *  does resolve there, so this list cannot drift in silence. */
const TUTOR_FIXED_IDS: ReadonlySet<string> = new Set([
  'test:reading',
  'test:listening',
  'test:mock',
  'trainer:reading',
  'trainer:listening',
  'trainer:writing',
  'trainer:speaking',
  'trainer:examiner',
  'review:vocabulary',
  'tool:models',
  'tool:bands',
  'tool:report',
  'tool:plan',
]);

/** The twelve values `QuestionType` holds in src/lib/tests/schema.ts, which
    are also the Reading and Listening subskills the catalogue uses. Written
    out rather than imported so that this file pulls in nothing. */
const QUESTION_TYPES: ReadonlySet<string> = new Set([
  'paragraph-matching',
  'sentence-completion',
  'tfng',
  'yes-no-notgiven',
  'multiple-choice',
  'matching-headings',
  'matching-features',
  'sentence-endings',
  'categorisation',
  'multiple-answer',
  'diagram-labelling',
  'table-completion',
]);

export function isQuestionType(subskill: Subskill | string): boolean {
  return QUESTION_TYPES.has(subskill);
}
