/* The browser entry point for the learning layer, and the ONLY place
 * `replan()` is ever called.
 *
 * WHY ONE PLACE
 * The audit's second failure mode is a plan that moves under a working
 * student. If any screen could replan, a refresh, a late AI reply or a
 * second island mounting would each be able to change what the student is
 * doing halfway through doing it. So every surface READS
 * `getCurrentSession()` and nothing else, and the five things that may
 * legitimately move the plan are the five functions below:
 *
 *   ensurePlan()                initial, and new-day
 *   onEvidenceRecorded()        new-evidence, and only when it is meaningful
 *   updateGoalsAndConstraints() settings-changed
 *   applyOverride()             student-override
 *   markStepStarted / markStepDone   progress through today, no replan at all
 *
 * A page render is not on that list. Neither is a route change, a focus
 * event, a sync pull that brought nothing new, or an AI reply.
 *
 * NOT FOR THE WORKER
 * This file loads `store.browser.ts`, whose stores are per-process
 * singletons. A Cloudflare Worker serves every student from one process, so
 * importing this there would be a data-leak shape, not a performance
 * problem. The Worker imports `adapters.ts`, `planner.ts` and the rest,
 * which are pure. Nothing under `src/lib/tutor` may import this file.
 */

import { getProgress, onProgressChange, type ProgressV1 } from '../progress';
import { getLocale, onLocaleChange, type Locale } from '../i18n/locale';
import type { SavedPlan } from '../study-plan';
import {
  certaintyByPaperFrom,
  constraintsFrom,
  goalsFrom,
  setSharedSessionProvider,
  sharedSessionFrom,
  type SharedSessionView,
} from './adapters';
import { learningCatalogue } from './catalog';
import type { LearningCatalogueV1, Paper } from './contracts/catalog';
import type {
  DailyMinutes,
  PersonalPlanV1,
  PlanConstraints,
  PlanGoals,
  PlanOverride,
  PlanSession,
  ReplanTrigger,
  VocabularySignalV1,
} from './contracts/plan';
import type { PolicyOutputV1, PolicyScopeKey } from './contracts/policy';
import type { CacheOwner } from './contracts/sync';
import { canonicalJson } from './evidence';
import { createInitialPlan, missedStudyDays, replan } from './planner';
import { evaluateEvidence } from './policy';
import { learnerFacts } from './session';
import {
  configureLearnerStore,
  configurePlanStore,
  getLearnerStore,
  getPlanStore,
  lessonMapsFrom,
  resetLearningStoresForTest,
  setLearningOwner as setOwnerOnBothStores,
  type BrowserStorage,
  type LearnerStoreOptions,
  type PlanStoreOptions,
} from './store.browser';

/* ── Setting up ──────────────────────────────────────────────────────────── */

/** What the orchestration layer asks the vocabulary module for, and what it
    hands to the planner. See VocabularySignalV1 and readVocabularySignal. */
export type VocabularyReader = (input: {
  /** The student's own calendar date. */
  today: string;
  /** The words today's work is about: the objective sentence, and the
      prompt or lesson behind it. Matched against the real word lists by
      relevantVocabTopics(), never guessed from the paper. */
  focusText: string;
  /** Lexical Resource bands the graders really returned, most recent
      first. Empty when nothing has been graded. */
  lexicalResourceBands: readonly number[];
}) => VocabularySignalV1 | null;

export interface LearningOptions {
  /** Where both stores keep their copies. Defaults to this browser's own. */
  storage?: BrowserStorage | null;
  owner?: CacheOwner;
  /** The clock. Passed in by tests so two runs produce the same plan. */
  now?: () => string;
  /** The student's own calendar date. Defaults to this device's. */
  today?: () => string;
  /** The old stores, read as plain objects. */
  legacy?: LearnerStoreOptions['legacy'];
  legacyPlan?: PlanStoreOptions['legacyPlan'];
  catalogue?: LearningCatalogueV1;
  /** Where the vocabulary signal comes from. Left out, the real one is
      loaded on demand (see vocabularySignalFor). Passed in by tests, and
      by anything that wants to switch it off. */
  vocabulary?: VocabularyReader | null;
}

let clock: () => string = () => new Date().toISOString();
let localToday: () => string = () => localDateKey(new Date());
let catalogueOverride: LearningCatalogueV1 | null = null;

/** The student's calendar date, the same way src/lib/plan/date.ts does it:
    from the device's own clock, never from a UTC slice, so "today" matches
    the day on their wall. */
function localDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function catalogue(): LearningCatalogueV1 {
  return catalogueOverride ?? learningCatalogue();
}

/** Hand both stores what only the application knows, before anything reads
 *  them. Everything is optional; with no call at all the stores use this
 *  browser, this clock and the real catalogue, which is what the site
 *  wants. */
export function configureLearning(options: LearningOptions = {}): void {
  if (options.now) clock = options.now;
  if (options.today) localToday = options.today;
  if (options.catalogue) catalogueOverride = options.catalogue;
  if (options.vocabulary !== undefined) vocabularyReader = options.vocabulary;
  configureLearnerStore({
    ...(options.storage !== undefined ? { storage: options.storage } : {}),
    ...(options.owner ? { owner: options.owner } : {}),
    ...(options.now ? { now: options.now } : {}),
    ...(options.legacy ? { legacy: options.legacy } : {}),
    lessonSubskills: () => lessonMapsFrom(catalogue()).lessonSubskills,
    lessonMinutes: () => lessonMapsFrom(catalogue()).lessonMinutes,
  });
  configurePlanStore({
    ...(options.storage !== undefined ? { storage: options.storage } : {}),
    ...(options.owner ? { owner: options.owner } : {}),
    ...(options.now ? { now: options.now } : {}),
    ...(options.legacyPlan ? { legacyPlan: options.legacyPlan } : {}),
  });
}

/* The one line that wires the catalogue's lesson maps into the learner
   store's one-time migration, done on load so that a page which only
   records a lesson completion still files it under the right subskill. */
configureLearning();

/* ── Vocabulary, gathered here and handed to the planner ─────────────────── */

/* WHY IT IS LOADED ON DEMAND
 *
 * src/lib/vocab-review.ts builds the whole flashcard deck at module load,
 * out of words.ts plus all 36 vocabulary lesson bodies, which is about
 * 292 KB of HTML. THIS file is imported by the account menu and the lesson
 * layout, which are on every page of the site, so a plain import would put
 * the entire vocabulary library into every page's bundle to answer a
 * question only the plan asks. sync.browser.ts loads it the same way and
 * for the same reason.
 *
 * So the deck is fetched once, in the background, the first time a plan is
 * built, and the answer is cached for the rest of the session. A plan built
 * before it arrives simply gets no vocabulary signal, which is the same
 * thing the Worker always gets and behaves exactly as this did before. The
 * first plan a brand new student ever gets is the one case that can happen
 * in practice, and that student has no vocabulary history for it to have
 * reported anyway.
 *
 * THE 146-WORD TRAP
 * The reader below passes the FULL card set explicitly. Under plain Node,
 * and inside a Worker, vocab-review's own default deck silently falls back
 * to words.ts alone: 146 words across 14 topics instead of 719 across 36
 * (risk 6 in docs/personal-learning/ARCHITECTURE.md). A default argument
 * would quietly plan around a fifth of the library.
 */

let vocabularyReader: VocabularyReader | null = null;
let vocabularyLoading = false;
/** Bumped by resetLearningForTest(), so a load that was already in flight
    cannot install itself over a test that has just cleared the reader. */
let vocabularyGeneration = 0;

/** Start loading the real vocabulary reader, once. Fire and forget: nothing
    waits on it, and a failure leaves the signal absent rather than breaking
    a plan. */
function primeVocabularyReader(): void {
  if (vocabularyReader || vocabularyLoading) return;
  vocabularyLoading = true;
  const generation = vocabularyGeneration;
  void import('../vocab-review')
    .then((vocab) => {
      if (generation !== vocabularyGeneration) return;
      vocabularyLoading = false;
      vocabularyReader = ({ today, focusText, lexicalResourceBands }) => {
        const store = vocab.readVocabSyncSnapshot();
        /* CARD_SET explicitly, never the parameter default. See above. */
        const cards = vocab.CARD_SET;
        const due = vocab.vocabRecallDueSummary(cards, store, today);
        const relevant = focusText ? vocab.relevantVocabTopics(focusText, cards) : [];
        const problems = vocab.observedVocabProblems(store, cards, lexicalResourceBands);
        return {
          dueCount: due.count,
          dueByTopic: slugsByTopicTitle(due.byTopic, vocab.vocabTopicSlugFor),
          relevantTopics: relevant.map((topic) => topic.slug),
          problems: problems.map((problem) => ({
            reason: problem.reason,
            ...(problem.word ? { word: problem.word } : {}),
            ...(problem.topic ? { topic: vocab.vocabTopicSlugFor(problem.topic) ?? undefined } : {}),
            ...(problem.lapses !== undefined ? { lapses: problem.lapses } : {}),
          })),
        };
      };
    })
    .catch(() => {
      /* Left null. A plan with no vocabulary signal is a plan, not an
         error, and the recall step falls back to what it did before. */
      if (generation === vocabularyGeneration) vocabularyLoading = false;
    });
}

/** The due counts arrive keyed by a topic's TITLE (that is what a card
    carries); the catalogue's review activities are keyed by its slug. */
function slugsByTopicTitle(
  byTitle: Readonly<Record<string, number>>,
  slugFor: (title: string) => string | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [title, count] of Object.entries(byTitle)) {
    const slug = slugFor(title);
    if (slug) out[slug] = (out[slug] ?? 0) + count;
  }
  return out;
}

/** Lexical Resource bands the graders really returned, newest first, read
    off the policy rather than out of the record a second time. */
function lexicalResourceBandsFrom(policy: PolicyOutputV1): number[] {
  const bands: number[] = [];
  for (const paper of ['writing', 'speaking'] as const) {
    const estimate = policy.estimates.find((entry) => entry.scopeKey === `criterion:${paper}:lexicalResource`);
    if (estimate?.band !== null && estimate?.band !== undefined) bands.push(estimate.band);
  }
  return bands;
}

/** The vocabulary signal for a plan about to be built, or null when the
    deck has not arrived yet (see the note above). */
function vocabularySignalFor(policy: PolicyOutputV1, previous: PersonalPlanV1 | null, today: string): VocabularySignalV1 | null {
  primeVocabularyReader();
  if (!vocabularyReader) return null;
  /* What today's work is ABOUT, in the plan's own words. The previous
     session's objective is the only text available before the new session
     exists, and it is the right text: a replan almost always keeps the
     objective, and a student with no previous plan has no vocabulary
     history for a topic match to matter to. */
  const focusText = previous ? `${previous.activeSession.objective} ${previous.activeSession.reason}` : '';
  try {
    return vocabularyReader({ today, focusText, lexicalResourceBands: lexicalResourceBandsFrom(policy) });
  } catch {
    return null;
  }
}

/* ── The plan, and the five things that may move it ──────────────────────── */

/** The plan this student is on, building their first one if they have none
 *  and rebuilding it when the calendar day has turned.
 *
 *  Safe to call on every render. With a plan already stored for today it
 *  reads and returns it, touching nothing: the only replans it can cause
 *  are `initial` (there was no plan) and `new-day` (the date moved), which
 *  are two of the five allowed triggers. */
export function ensurePlan(): PersonalPlanV1 {
  /* Subscribed here rather than when this module loads: building the stores
     is what fixes their storage, their owner and their clock, and doing it
     at load time would freeze them before configureLearning() has been
     called. Idempotent, so this costs one boolean after the first call. */
  watchEvidence();
  watchLocale();
  const store = getPlanStore();
  const stored = store.read();
  const now = clock();
  const today = localToday();

  if (!stored) {
    const settings = store.legacySettings();
    const goals = goalsFrom(settings);
    /* The first plan is written in the language the student is reading the
       site in, unless the old store already recorded one. Without this a
       Russian student's very first plan was built in English and stayed
       English until something else happened to rebuild it (see
       syncExplanationLocale). Their own recorded preference always wins. */
    const constraints = constraintsFrom(settings, {
      explanationLocale: settings?.explanationLocale ?? getLocale(),
    });
    const record = getLearnerStore().read();
    const policy = evaluateEvidence({ record, goals, now });
    const { plan } = createInitialPlan({
      catalogue: catalogue(),
      record,
      policy,
      now,
      today,
      goals,
      constraints,
      vocabulary: vocabularySignalFor(policy, null, today),
    });
    lastPlanningSignature = planningSignature(policy);
    return store.save(plan);
  }

  if (stored.activeSession.date !== today) return runReplan('new-day', { previous: stored, now, today });

  /* Same day, same plan. Nothing is recomputed, which is the point. */
  return stored;
}

interface ReplanOptions {
  previous: PersonalPlanV1;
  now: string;
  today: string;
  goals?: PlanGoals;
  constraints?: PlanConstraints;
  newOverrides?: readonly PlanOverride[];
}

function runReplan(trigger: ReplanTrigger, options: ReplanOptions): PersonalPlanV1 {
  const record = getLearnerStore().read();
  const goals = options.goals ?? options.previous.goals;
  const policy = evaluateEvidence({ record, goals, now: options.now });
  const { plan, changes } = replan({
    catalogue: catalogue(),
    record,
    policy,
    previous: options.previous,
    trigger,
    now: options.now,
    today: options.today,
    goals: options.goals,
    constraints: options.constraints,
    newOverrides: options.newOverrides,
    vocabulary: vocabularySignalFor(policy, options.previous, options.today),
  });
  lastPlanningSignature = planningSignature(policy);
  /* A replan that changed nothing returns the plan it was given, and
     writing it again would only churn the store and every subscriber. */
  if (changes.length === 0 && plan.revision === options.previous.revision) {
    return plan.evidenceVersion === options.previous.evidenceVersion
      ? options.previous
      : getPlanStore().save(plan);
  }
  return getPlanStore().save(plan);
}

/** Keep the plan's explanation language in step with the interface's.
 *
 *  WHY THE PLAN HAS A LANGUAGE AT ALL
 *  Every sentence the shared layer writes is baked in the language
 *  `constraints.explanationLocale` names, at the moment the plan is built
 *  (architecture section 1.6). It has to be: the Mr EZ Worker imports the
 *  planner and has no access to the site's lazy dictionary chunk, so the
 *  layer translates in code rather than at render time.
 *
 *  THE COST, AND WHY THIS FUNCTION EXISTS
 *  A plan built in English stays English until it is built again, which is
 *  what a Russian student saw: an English objective, English step purposes
 *  and English milestone labels inside an otherwise Russian page. Several of
 *  those sentences arrive with their placeholders already filled (a
 *  milestone label carries a whole catalogue objective inside it), so no
 *  render-time lookup can rescue them. The plan has to be written again.
 *
 *  Switching language IS a settings change, so it goes through the one
 *  trigger for one. Idempotent, and it costs a string compare when the two
 *  already agree. Null when there is no plan yet: the first one built will
 *  pick the language up from the constraints anyway. */
export function syncExplanationLocale(locale: Locale): PersonalPlanV1 | null {
  const stored = getPlanStore().read();
  if (!stored) return null;
  if (stored.constraints.explanationLocale === locale) return stored;
  return runReplan('settings-changed', {
    previous: stored,
    now: clock(),
    today: localToday(),
    constraints: { ...stored.constraints, explanationLocale: locale },
  });
}

let unsubscribeLocale: (() => void) | null = null;

/** Follow the interface language, so pressing RU rewrites the plan's own
 *  sentences without every screen having to remember to ask. Idempotent, and
 *  deliberately a SUBSCRIPTION rather than a check inside `ensurePlan`:
 *  reading a plan must never be able to write one, and the language only
 *  changes when the student changes it. */
export function watchLocale(): () => void {
  if (unsubscribeLocale) return unsubscribeLocale;
  const sync = () => {
    try {
      syncExplanationLocale(getLocale());
    } catch {
      /* See below. */
    }
  };
  /* Once, now, as well as on every change: the Russian dictionary chunk
     finishes loading early in a page's life (BaseLayout does it), and its
     notification can easily land before the first island asks for a plan,
     so a plan stored in the other language would otherwise wait for the
     next switch that never comes. */
  sync();
  const off = onLocaleChange(() => {
    try {
      syncExplanationLocale(getLocale());
    } catch {
      /* A plan that cannot be rebuilt must not break the language switch.
         The interface is already Russian; the plan's own sentences catch up
         the next time it is rebuilt. */
    }
  });
  unsubscribeLocale = () => {
    off();
    unsubscribeLocale = null;
  };
  return unsubscribeLocale;
}

/** Goals or constraints the student edited. The one trigger that may change
    their regular daily commitment: a short day is an override, never this. */
export function updateGoalsAndConstraints(next: {
  goals?: PlanGoals;
  constraints?: PlanConstraints;
}): PersonalPlanV1 {
  const previous = ensurePlan();
  return runReplan('settings-changed', {
    previous,
    now: clock(),
    today: localToday(),
    goals: next.goals ?? previous.goals,
    constraints: next.constraints ?? previous.constraints,
  });
}

/** Something the student asked for that bends today without rewriting their
    settings. Recorded on the plan, and in its change history. */
export function applyOverride(override: PlanOverride): PersonalPlanV1 {
  const previous = ensurePlan();
  return runReplan('student-override', {
    previous,
    now: clock(),
    today: localToday(),
    newOverrides: [override],
  });
}

/** "I have less time today." The regular commitment is untouched. */
export function chooseLessTimeToday(minutes: DailyMinutes): PersonalPlanV1 {
  return applyOverride({ kind: 'less-time-today', date: localToday(), minutes, createdAt: clock() });
}

/** "Work on something else today." */
export function chooseOtherSkill(paper: Paper): PersonalPlanV1 {
  return applyOverride({ kind: 'chose-other-skill', date: localToday(), paper, createdAt: clock() });
}

/** The student picked one exact objective, and optionally one exact
    activity inside it. Scored normally, but it wins ties. */
export function chooseObjective(scopeKey: PolicyScopeKey, activityId?: string): PersonalPlanV1 {
  return applyOverride({
    kind: 'chose-objective',
    date: localToday(),
    scopeKey,
    activityId,
    createdAt: clock(),
  });
}

/** "Not this one." Blocked until `until`, or for good. */
export function skipActivity(activityId: string, until?: string): PersonalPlanV1 {
  return applyOverride({ kind: 'skip-activity', activityId, until, createdAt: clock() });
}

/** The student put off a short sample of one paper. It stays outstanding
    and every screen keeps showing that paper as unknown. */
export function deferDiagnostic(paper: Paper, until?: string): PersonalPlanV1 {
  return applyOverride({ kind: 'deferred-diagnostic', paper, until, createdAt: clock() });
}

/** The student agreed to give a whole paper the time it needs. */
export function acceptLongerCommitment(activityId: string, minutes: number): PersonalPlanV1 {
  return applyOverride({
    kind: 'accepted-longer-commitment',
    date: localToday(),
    activityId,
    minutes,
    createdAt: clock(),
  });
}

/* ── Progress through today ──────────────────────────────────────────────── */

/** Mark a step of the current session started or finished.
 *
 *  This is NOT a replan. It records where the student has got to so that a
 *  refresh, a closed tab or a walk away and come back all resume on the
 *  same step instead of starting the hour again. The revision moves,
 *  because the stored plan really did change and an AI reply written
 *  against the older one is no longer about this plan. */
function setStepState(stepId: string, state: PlanSession['steps'][number]['state'], evidenceIds?: readonly string[]): PersonalPlanV1 {
  const plan = ensurePlan();
  const session = plan.activeSession;
  if (!session.steps.some((step) => step.stepId === stepId)) return plan;

  const steps = session.steps.map((step) =>
    step.stepId === stepId
      ? {
          ...step,
          state,
          evidenceIds:
            evidenceIds && evidenceIds.length > 0
              ? [...new Set([...(step.evidenceIds ?? []), ...evidenceIds])]
              : step.evidenceIds,
        }
      : step,
  );
  if (canonicalJson(steps) === canonicalJson(session.steps)) return plan;

  const finished = steps.every((step) => step.state === 'done' || step.state === 'skipped');
  return getPlanStore().save({
    ...plan,
    revision: plan.revision + 1,
    updatedAt: clock(),
    activeSession: { ...session, steps, state: finished ? 'completed' : session.state },
  });
}

export function markStepStarted(stepId: string): PersonalPlanV1 {
  return setStepState(stepId, 'in-progress');
}

export function markStepDone(stepId: string, evidenceIds?: readonly string[]): PersonalPlanV1 {
  return setStepState(stepId, 'done', evidenceIds);
}

export function markStepSkipped(stepId: string): PersonalPlanV1 {
  return setStepState(stepId, 'skipped');
}

/** Tick off any step of today's session that the record now says was done.
 *
 *  Before this, every surface had to remember to call markStepDone, and a
 *  surface that forgot left a student looking at a step they had just
 *  finished. The evidence is the better signal anyway: it is written by the
 *  activity itself, it names the activity, and it knows how the work ended.
 *
 *  An event completes a step when it is ABOUT that step's activity, it
 *  finished (a blank or abandoned attempt never ticks anything off), and it
 *  belongs to this session or to today. Matching on the session id alone
 *  would miss work opened straight from the library that happens to be
 *  exactly what today asked for, which is the case the audit's "direct
 *  entry" scenario is about.
 *
 *  Idempotent: a step already done is left alone, and setStepState returns
 *  the plan untouched when nothing changed, so no revision is burned. The
 *  explicit markStepDone calls keep working exactly as they did. */
export function completeStepsFromEvidence(): PersonalPlanV1 | null {
  const stored = getPlanStore().read();
  if (!stored) return null;
  const session = stored.activeSession;
  if (session.state !== 'active') return stored;

  const record = getLearnerStore().read();
  const today = localToday();
  let plan = stored;
  for (const step of session.steps) {
    if (step.state === 'done' || step.state === 'skipped') continue;
    /* Newest first: the same activity can have several events, and the one
       that just arrived is the one this is about. */
    const event = [...record.events]
      .reverse()
      .find(
        (entry) =>
          entry.activityId === step.activityId &&
          (entry.completion === 'completed' || entry.completion === 'partial') &&
          (entry.sessionId === session.id || entry.localDate === today),
      );
    if (event) plan = markStepDone(step.stepId, [event.id]);
  }
  return plan;
}

/* ── What counts as meaningful evidence ──────────────────────────────────── */

/** Exactly the `new-evidence` trigger the architecture defines: an event
 *  whose outcome changes an estimate's certainty, percent or due-review set.
 *
 *  Deliberately narrower than the policy's own fingerprint, which also moves
 *  when a lesson is merely ticked off (it counts studied occasions). A
 *  completion click is studied, never measured, so it must not be able to
 *  change what the student is working on mid-session. Scopes with nothing
 *  known about them are left out for the same reason: reading a new lesson
 *  brings a new scope into the list without saying anything about it. */
function planningSignature(policy: PolicyOutputV1): string {
  return canonicalJson({
    estimates: policy.estimates
      .filter((estimate) => estimate.certainty !== 'unknown')
      .map(
        (estimate) =>
          `${estimate.scopeKey}|${estimate.certainty}|${estimate.band}|${estimate.percent}|${estimate.needsAssessment}`,
      ),
    gaps: policy.gaps.map((gap) => `${gap.scopeKey}|${gap.requiredBand}|${gap.shortfall}|${gap.meetsRequirement}`),
    dueReview: policy.dueReview.map((due) => `${due.scopeKey}|${due.activityId}|${due.dueOn}`),
    strengths: policy.strengths,
    needsTeacherInput: policy.needsTeacherInput.map(
      (entry) => `${entry.scopeKey}|${entry.consecutiveUnimprovedAttempts}`,
    ),
    diagnosticsOutstanding: policy.diagnosticsOutstanding,
    overall: policy.overall,
  });
}

let lastPlanningSignature: string | null = null;

/** Replan if, and only if, the new evidence actually changed what is known.
 *
 *  Returns the plan either way, so a caller can tell whether it moved by
 *  comparing the revision. A no-op write and a studied-only event both come
 *  back with the same plan they went in with. */
export function onEvidenceRecorded(): PersonalPlanV1 {
  const previous = ensurePlan();
  const now = clock();
  const record = getLearnerStore().read();
  const policy = evaluateEvidence({ record, goals: previous.goals, now });
  const signature = planningSignature(policy);
  if (lastPlanningSignature !== null && signature === lastPlanningSignature) {
    lastPlanningSignature = signature;
    return previous;
  }
  lastPlanningSignature = signature;
  return runReplan('new-evidence', { previous, now, today: localToday() });
}

let unsubscribeEvidence: (() => void) | null = null;

/** Follow the learner record, so finishing a drill updates the plan without
 *  every screen having to remember to ask. Idempotent: calling it twice
 *  leaves one subscription. */
export function watchEvidence(): () => void {
  if (unsubscribeEvidence) return unsubscribeEvidence;
  const off = getLearnerStore().subscribe(() => {
    /* Progress through today first, then whether what was learnt changes
       the plan. In that order, because a replan reads the session it is
       about and should see the step as finished. */
    completeStepsFromEvidence();
    onEvidenceRecorded();
  });
  unsubscribeEvidence = () => {
    off();
    unsubscribeEvidence = null;
  };
  return unsubscribeEvidence;
}

/* ── What every surface reads ────────────────────────────────────────────── */

let sessionCache: { key: string; view: SharedSessionView } | null = null;

/** The one current session, as the three adapters and every screen see it.
 *
 *  Builds the plan if there is none, and never moves it otherwise. Three
 *  islands on one screen call this during the same render, so the answer is
 *  memoised against the only three things it depends on. */
export function getCurrentSession(): SharedSessionView {
  const plan = ensurePlan();
  const record = getLearnerStore().read();
  const today = localToday();
  const key = `${plan.revision}|${record.evidenceVersion}|${today}`;
  if (sessionCache && sessionCache.key === key) return sessionCache.view;

  const policy = evaluateEvidence({ record, goals: plan.goals, now: clock() });
  const facts = learnerFacts(record, policy);
  const view = sharedSessionFrom({
    plan,
    catalogue: catalogue(),
    /* The number the plan was actually rebuilt around, which is the only
       honest answer once the rebuild has happened: from that moment the
       active session is dated today and the run of missed days is behind
       it, so recomputing gives zero. The pure function is the fallback for
       a plan stored before the field existed. See
       PersonalPlanV1.missedStudyDays. */
    missedStudyDays:
      plan.missedStudyDays ?? missedStudyDays(plan, facts, plan.constraints, plan.overrides, today),
    /* One policy pass, already computed above, so the focus panel can name
       each paper's certainty in the same words /report uses instead of
       repeating "has evidence recorded" four times. */
    certaintyByPaper: certaintyByPaperFrom(policy.estimates),
  });
  sessionCache = { key, view };
  return view;
}

const sessionProvider = (): SharedSessionView | null => {
  try {
    /* No store at all means a server render, the Astro build or a Node
       test: there is no student here, so there is no plan to serve and
       building one in memory that nothing can save would only give the
       surfaces a second opinion. They fall back to what they were handed.
       A browser that merely refused the write ('quota', 'blocked') still
       has a student, and still gets the session from memory. */
    if (getPlanStore().status().problem === 'unavailable') return null;
    return getCurrentSession();
  } catch {
    /* A plan that cannot be built must not take a page down. The three
       adapters fall back to what they can work out on their own. */
    return null;
  }
};

/* Installed on load, so `courseStatus`, `getTodayPlan` and `recommendNext`
   all see the same session the moment anything imports this module. The
   evidence subscription waits for the first ensurePlan(), because that is
   the first moment the stores are configured. */
setSharedSessionProvider(sessionProvider);

/** Importing this module is what wires the three adapters to the student's
 *  real plan, and a bare side-effect import is easy to delete by accident.
 *  Call this from anything that needs the wiring and does not otherwise use
 *  the module: it does nothing except be impossible to tree-shake away. */
export function ensureLearningWired(): void {
  /* Deliberately empty. The wiring is this module's load-time side effect. */
}

/** Sign-in, account switch, or sign-out with null. Both stores move
    together: one student's record and one student's plan belong to the same
    owner or neither does. */
export function setLearningOwner(owner: CacheOwner | null): void {
  sessionCache = null;
  lastPlanningSignature = null;
  setOwnerOnBothStores(owner);
}

/** Drop everything this module and both stores hold, so the next call
    rebuilds from the current options. For tests only; no screen calls it. */
export function resetLearningForTest(): void {
  sessionCache = null;
  lastPlanningSignature = null;
  catalogueOverride = null;
  clock = () => new Date().toISOString();
  localToday = () => localDateKey(new Date());
  /* A test's plan must not depend on whether a background import happened
     to finish first. Cleared here, and a load already in flight is told to
     drop what it was about to install. */
  vocabularyGeneration += 1;
  vocabularyReader = null;
  vocabularyLoading = false;
  if (unsubscribeEvidence) unsubscribeEvidence();
  if (unsubscribeLocale) unsubscribeLocale();
  resetLearningStoresForTest();
  configureLearning();
  setSharedSessionProvider(sessionProvider);
}

/** The old stores, for anything that still needs them alongside the plan. */
export function legacyStores(): { progress: ProgressV1 | null; plan: SavedPlan | null } {
  return { progress: getProgress(), plan: getPlanStore().legacyPlan() };
}

export { onProgressChange };
export { onLearnerRecordChange, onPersonalPlanChange, readLearnerRecord, readPersonalPlan } from './store.browser';
export type { SharedSessionView, SharedStepView } from './adapters';
