/* The one evidence policy, as working code.
 *
 * contracts/policy.ts says what an estimate IS and what may never be claimed.
 * This file is the single computation behind it: one pass over a learner
 * record that produces every number the planner, the tutor and the reports
 * are allowed to use. Today three separate policies answer the same question
 * differently (architecture section 1.3); after the callers are moved over,
 * this is the only answer there is.
 *
 * PURE, AND TIMELESS
 * No storage, no network, no clock of its own. The caller passes `now`, so
 * the same record and the same instant always produce the same output, which
 * is what makes the whole thing testable and what lets the Mr EZ Worker run
 * the identical code the site runs.
 *
 * WHAT IT WILL NOT DO
 *   - a completion click never moves an ability estimate (it is `studied`);
 *   - an answer that needed a hint never moves one either (it is guided
 *     practice, counted and shown, never a demonstration);
 *   - a repeat of material already met is not fresh evidence;
 *   - a blank or abandoned submission is thrown out with a named reason,
 *     never read as a bad result;
 *   - a partial exercise never sets a band;
 *   - a migrated legacy row never rises above `limited`, and a short
 *     diagnostic sample never rises above `tentative`;
 *   - a score the student told us about is shown with its date and is never
 *     mixed into a measured number;
 *   - Writing Task 1 and Task 2 are separate, Speaking parts are separate,
 *     and vocabulary is never a fifth paper;
 *   - an overall band is null unless all four papers genuinely qualify.
 *
 * EVERY THRESHOLD IS PROVISIONAL.
 * The weighing lives in the small named functions under "The weighing"
 * below, and every number it uses comes from `PolicyThresholds`. They are
 * starting values chosen to preserve what the tutor already did well. None
 * of them is validated IELTS science and nothing in the interface may
 * present them as such.
 */

import type { Paper, SpeakingCriterion, Subskill, WritingCriterion } from './contracts/catalog';
import { PAPERS } from './contracts/catalog';
import type {
  EvidenceEvent,
  EvidenceMode,
  EvidenceProvenance,
  ItemOutcome,
  LearnerRecordV1,
  SelfReportedScore,
} from './contracts/evidence';
import { WHOLE_ACTIVITY_SUBSKILL } from './contracts/evidence';
import type { PlanGoals } from './contracts/plan';
import type {
  AbilityEstimate,
  Certainty,
  EvidenceCount,
  EvidenceFreshness,
  GapAssessment,
  IgnoredReason,
  PolicyOutputV1,
  PolicyScope,
  PolicyScopeKey,
  PolicyThresholds,
  RepeatedDifficulty,
  ReviewDue,
} from './contracts/policy';
import {
  BAND_CEILING,
  BAND_FLOOR,
  CERTAINTY_ORDER,
  DEFAULT_POLICY_THRESHOLDS,
  DIAGNOSTIC_MAX_CERTAINTY,
  LEGACY_MAX_CERTAINTY,
  MIN_REPORTABLE_BAND,
  OVERALL_MIN_CERTAINTY,
  PARTIAL_EXERCISE_CAN_SET_BAND,
  SELF_REPORTED_MAX_CERTAINTY,
  SUMMARY_MAX_CERTAINTY,
} from './contracts/policy';
import type { EvidenceContext, EvidenceUse } from './evidence';
import { canonicalJson, classifyAll, groupIntoOccasions, hashContent, independentItems } from './evidence';

/* ── What goes in ────────────────────────────────────────────────────────── */

export interface PolicyInput {
  record: LearnerRecordV1;
  /** The student's goals. Left out for somebody who has not set any yet, in
      which case every requirement is simply unknown rather than invented. */
  goals?: PlanGoals;
  /** The instant to judge recency against. Passed in, never read from a
      clock here, so the output is reproducible. */
  now: string;
  thresholds?: PolicyThresholds;
  /** activityId to that activity's current contentVersion. Evidence about an
      older version is set aside with a named reason. */
  contentVersions?: Readonly<Record<string, number>>;
}

/** A student who has told us nothing. Used when `goals` is left out, so the
    policy never has to guess a target to have something to compare with. */
export const NO_GOALS_YET: PlanGoals = {
  overallTarget: null,
  perPaperMinimums: {},
  examDate: null,
  route: 'academic',
  selfReported: [],
};

/* ── Scopes ──────────────────────────────────────────────────────────────── */

/** The four criteria the calibrated Writing grader returns
    (src/lib/writing/schema.ts CRITERIA). */
const WRITING_CRITERIA: readonly WritingCriterion[] = [
  'taskResponse',
  'coherenceCohesion',
  'lexicalResource',
  'grammaticalRange',
];

/** The four the Speaking grader returns (src/lib/speaking/schema.ts). */
const SPEAKING_CRITERIA: readonly SpeakingCriterion[] = [
  'fluencyCoherence',
  'lexicalResource',
  'grammaticalRange',
  'pronunciation',
];

/** Task Achievement and Task Response are the SAME criterion under two
    labels: the official name changes between Task 1 and Task 2, and the
    grader already stores one key and labels it per task
    (criterionLabel in src/lib/writing/schema.ts). Folding the alias in here
    is what stops one paper growing a fifth criterion. */
const CRITERION_ALIASES: Readonly<Record<string, string>> = { taskAchievement: 'taskResponse' };

const VOCABULARY_SUBSKILLS: ReadonlySet<string> = new Set([
  'recognise-meaning',
  'recall-from-meaning',
  'use-in-a-sentence',
  'collocation',
  'topic-breadth',
]);

/** A stable string for a scope, used as a map key, in change history and in
    cache keys. Parsed back by scopeFromKey. */
export function scopeKeyOf(scope: PolicyScope): PolicyScopeKey {
  switch (scope.kind) {
    case 'paper':
      return `paper:${scope.paper}`;
    case 'writing-task':
      return `writing-task:${scope.task}`;
    case 'speaking-part':
      return `speaking-part:${scope.part}`;
    case 'criterion':
      return `criterion:${scope.paper}:${scope.criterion}`;
    case 'subskill':
      return `subskill:${scope.paper}:${scope.subskill}`;
    case 'vocabulary':
      return 'vocabulary';
  }
}

/** The inverse, for a stored key. Null when the key is not one this policy
    produces, which a caller should treat as "no longer known" rather than
    guessing at it. */
export function scopeFromKey(key: PolicyScopeKey): PolicyScope | null {
  const parts = key.split(':');
  if (key === 'vocabulary') return { kind: 'vocabulary' };
  if (parts[0] === 'paper' && isPaper(parts[1])) return { kind: 'paper', paper: parts[1] };
  if (parts[0] === 'writing-task' && (parts[1] === 'task1' || parts[1] === 'task2')) {
    return { kind: 'writing-task', task: parts[1] };
  }
  if (parts[0] === 'speaking-part' && (parts[1] === '1' || parts[1] === '2' || parts[1] === '3')) {
    return { kind: 'speaking-part', part: Number(parts[1]) as 1 | 2 | 3 };
  }
  if (parts[0] === 'criterion' && (parts[1] === 'writing' || parts[1] === 'speaking') && parts[2]) {
    return { kind: 'criterion', paper: parts[1], criterion: parts[2] as WritingCriterion | SpeakingCriterion };
  }
  if (parts[0] === 'subskill' && isPaper(parts[1]) && parts[2]) {
    return { kind: 'subskill', paper: parts[1], subskill: parts[2] as Subskill };
  }
  return null;
}

function isPaper(value: string | undefined): value is Paper {
  return value !== undefined && (PAPERS as readonly string[]).includes(value);
}

/** The paper a scope belongs to, or undefined for vocabulary, which belongs
    to all four and is scored as none of them. */
export function paperOfScope(scope: PolicyScope): Paper | undefined {
  switch (scope.kind) {
    case 'paper':
      return scope.paper;
    case 'writing-task':
      return 'writing';
    case 'speaking-part':
      return 'speaking';
    case 'criterion':
      return scope.paper;
    case 'subskill':
      return scope.paper;
    case 'vocabulary':
      return undefined;
  }
}

/** True for the scopes an IELTS band is a meaningful answer for. A subskill
    is an accuracy, not a band, and saying "your Matching Headings band is
    6.5" would be inventing a scale that does not exist. */
function isBandScope(scope: PolicyScope): boolean {
  return scope.kind === 'paper' || scope.kind === 'writing-task' || scope.kind === 'speaking-part' || scope.kind === 'criterion';
}

const SCOPE_KIND_ORDER: readonly PolicyScope['kind'][] = [
  'paper',
  'writing-task',
  'speaking-part',
  'criterion',
  'subskill',
  'vocabulary',
];

/** Display order: the four papers first, then the parts of them, then the
    detail. Stable, so two runs list the same things the same way. */
function scopeSortKey(scope: PolicyScope): string {
  const kind = String(SCOPE_KIND_ORDER.indexOf(scope.kind)).padStart(2, '0');
  const paper = paperOfScope(scope);
  const paperIndex = paper ? String(PAPERS.indexOf(paper)).padStart(2, '0') : '99';
  return `${kind}:${paperIndex}:${scopeKeyOf(scope)}`;
}

/** Every scope the platform always has an opinion about, even when that
    opinion is "we have never seen this". Reporting them all is what lets a
    screen show unknown as unknown instead of as a low score. */
function baselineScopes(): PolicyScope[] {
  return [
    ...PAPERS.map((paper): PolicyScope => ({ kind: 'paper', paper })),
    { kind: 'writing-task', task: 'task1' },
    { kind: 'writing-task', task: 'task2' },
    { kind: 'speaking-part', part: 1 },
    { kind: 'speaking-part', part: 2 },
    { kind: 'speaking-part', part: 3 },
    ...WRITING_CRITERIA.map((criterion): PolicyScope => ({ kind: 'criterion', paper: 'writing', criterion })),
    ...SPEAKING_CRITERIA.map((criterion): PolicyScope => ({ kind: 'criterion', paper: 'speaking', criterion })),
    { kind: 'vocabulary' },
  ];
}

/* ── Days and bands ──────────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / MS_PER_DAY));
}

/** YYYY-MM-DD, `days` after a YYYY-MM-DD. Calendar arithmetic on the
    student's own local date, which the record already stores, so the answer
    does not depend on the machine this runs on. */
function addDays(localDate: string, days: number): string {
  const parsed = Date.parse(`${localDate}T00:00:00Z`);
  if (Number.isNaN(parsed)) return localDate;
  return new Date(parsed + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Round to the nearest half band.
 *
 * This is the official overall rule: an average ending in .25 rounds up to
 * the next half band and .75 up to the next whole band, which is exactly
 * what nearest-half does. The same three lines already exist as
 * `toHalfBand` in src/lib/level.ts, `overallBand` and `toBand` in
 * src/lib/writing/schema.ts, and in the Speaking equivalent. It is written
 * out again here rather than imported for the same reason evidence.ts
 * repeats localDateFromIso: nothing under src/lib/learning may depend on the
 * browser stores those modules read, because this code also runs inside a
 * Worker. tests/learning-policy.test.ts pins the two against each other so
 * they cannot drift. */
export function toHalfBand(band: number): number {
  return Math.round(band * 2) / 2;
}

function clampBand(band: number): number {
  return Math.max(BAND_FLOOR, Math.min(BAND_CEILING, band));
}

/* ── The weighing ────────────────────────────────────────────────────────── */

/* Five things decide how much one piece of work is worth, and each is its
   own named, configurable rule so a teacher review can argue with one of
   them without touching the others:

     how recent it is        recencyWeight()
     how much of it there is evidenceAmount(), and patternMinItems and
                             tentativeMinItems in ladderCertainty()
     independent occasions   patternMinOccasions and bandMeasuredMinPapers
                             in ladderCertainty()
     unseen material         unseenWeight()
     assistance              assistanceWeight()

   plus formWeight(), which separates a whole paper from a single-passage
   sample of one. All of them are PROVISIONAL rules, not validated IELTS
   science, and nothing in the interface may present them as such. */

/** How much a result is worth given how many results have come after it.
    Positional, not per-day, which is the rule src/lib/level.ts already
    applies. Past `recentWindow` it stops counting rather than fading for
    ever. */
export function recencyWeight(positionFromNewest: number, thresholds: PolicyThresholds): number {
  if (positionFromNewest >= thresholds.recentWindow) return 0;
  return thresholds.recencyDecay ** positionFromNewest;
}

/** How much the SHAPE of the work is worth. A whole paper under timing is
    the real thing; a single-passage drill is a smaller, noisier sample of
    it, so it contributes proportionally less. */
export function formWeight(whole: boolean, thresholds: PolicyThresholds): number {
  return whole ? 1 : thresholds.drillWeight;
}

/** How much help costs. Independent work is worth its full weight; work
    that needed a hint is worth `assistedWeight` of one, which is enough to
    show that practice happened and never enough to reach the independent
    thresholds `tentative` and `measured` ask for; a completion click is
    worth nothing at all, because it demonstrates nothing. */
export function assistanceWeight(use: EvidenceUse, thresholds: PolicyThresholds): number {
  if (use === 'independent') return 1;
  if (use === 'assisted') return thresholds.assistedWeight;
  return 0;
}

/** Whether the material was new. A second pass over questions the student
    has already answered says nothing about what they can do with unseen
    material, so it weighs nothing toward ability. */
export function unseenWeight(seenBefore: boolean): number {
  return seenBefore ? 0 : 1;
}

interface PolicySample {
  eventId: string;
  activityId: string;
  at: string;
  localDate: string;
  occasionKey: string;
  use: EvidenceUse;
  ignoredReason?: IgnoredReason;
  provenance: EvidenceProvenance;
  mode: EvidenceMode;
  seenBefore: boolean;
  independentTotal: number;
  independentCorrect: number;
  assistedTotal: number;
  assistedCorrect: number;
  band: number | null;
  whole: boolean;
  section: string | null;
  /** True for a folded-up block of counts from the local soft cap, which has
      no item detail and never will (SUMMARY_MAX_CERTAINTY). */
  fromSummary: boolean;
  /** Occasions this sample stands for. One for a real event, because the
      sittings are grouped from the events themselves; the block's own count
      for a folded-up summary, which no longer has events to group. */
  summaryOccasions: number;
}

/** Everything about one sample rolled into a single multiplier. */
export function sampleWeight(
  sample: Pick<PolicySample, 'use' | 'whole' | 'seenBefore'>,
  positionFromNewest: number,
  thresholds: PolicyThresholds,
): number {
  return (
    formWeight(sample.whole, thresholds) *
    assistanceWeight(sample.use, thresholds) *
    unseenWeight(sample.seenBefore) *
    recencyWeight(positionFromNewest, thresholds)
  );
}

/** How much evidence a scope holds, counted in independent-item
    equivalents. An assisted item is worth `assistedWeight` of one: enough to
    say that something is going on (`limited`), never enough to reach the
    independent counts the higher rungs require. */
function evidenceAmount(count: EvidenceCount, thresholds: PolicyThresholds): number {
  return count.independentItems + thresholds.assistedWeight * count.assistedItems;
}

/* ── Turning events into samples ─────────────────────────────────────────── */

interface ScopeContribution {
  scope: PolicyScope;
  independentTotal: number;
  independentCorrect: number;
  assistedTotal: number;
  assistedCorrect: number;
  band: number | null;
  whole: boolean;
  section: string | null;
}

function countOf(items: readonly ItemOutcome[]): { total: number; correct: number } {
  return { total: items.length, correct: items.filter((item) => item.correct).length };
}

interface SubskillCount {
  independentTotal: number;
  independentCorrect: number;
  assistedTotal: number;
  assistedCorrect: number;
}

function emptySubskillCount(): SubskillCount {
  return { independentTotal: 0, independentCorrect: 0, assistedTotal: 0, assistedCorrect: 0 };
}

/** Which subskills one event is evidence about, and how much.
 *
 * The event's own `subskill` is a placeholder on anything that covers a
 * whole activity (WHOLE_ACTIVITY_SUBSKILL): a 40-question paper does not
 * have one subskill. The real breakdown is per item where the surface
 * recorded items, and `outcome.bySubskill` where it did not, which is all a
 * migrated row has ever had. Item detail wins, so nothing is counted twice. */
function subskillCounts(
  event: EvidenceEvent,
  use: EvidenceUse,
  independent: readonly ItemOutcome[],
  assisted: readonly ItemOutcome[],
): Map<Subskill, SubskillCount> {
  const counts = new Map<Subskill, SubskillCount>();
  const bump = (subskill: Subskill, change: Partial<SubskillCount>) => {
    const held = counts.get(subskill) ?? emptySubskillCount();
    counts.set(subskill, {
      independentTotal: held.independentTotal + (change.independentTotal ?? 0),
      independentCorrect: held.independentCorrect + (change.independentCorrect ?? 0),
      assistedTotal: held.assistedTotal + (change.assistedTotal ?? 0),
      assistedCorrect: held.assistedCorrect + (change.assistedCorrect ?? 0),
    });
  };

  const outcome = event.outcome;
  if (outcome.kind === 'studied') {
    // A completion click is about something, so it belongs on that
    // subskill's list of work done. Its counts are all zero, which is what
    // stops it moving anything: it appears as `studiedOccasions` and as
    // nothing else.
    if (event.subskill !== WHOLE_ACTIVITY_SUBSKILL) counts.set(event.subskill, emptySubskillCount());
    return counts;
  }
  if (outcome.kind === 'objective') {
    const correct = outcome.met ? 1 : 0;
    if (use === 'independent') bump(outcome.subskill, { independentTotal: 1, independentCorrect: correct });
    else if (use === 'assisted') bump(outcome.subskill, { assistedTotal: 1, assistedCorrect: correct });
    return counts;
  }
  if (outcome.kind === 'recall') {
    if (use === 'independent') bump(event.subskill, { independentTotal: outcome.reviewed, independentCorrect: outcome.correct });
    else if (use === 'assisted') bump(event.subskill, { assistedTotal: outcome.reviewed, assistedCorrect: outcome.correct });
    return counts;
  }

  const fallback = event.subskill === WHOLE_ACTIVITY_SUBSKILL ? undefined : event.subskill;
  let attributed = false;
  for (const item of independent) {
    const subskill = item.subskill ?? fallback;
    if (!subskill) continue;
    bump(subskill, { independentTotal: 1, independentCorrect: item.correct ? 1 : 0 });
    attributed = true;
  }
  for (const item of assisted) {
    const subskill = item.subskill ?? fallback;
    if (!subskill) continue;
    bump(subskill, { assistedTotal: 1, assistedCorrect: item.correct ? 1 : 0 });
    attributed = true;
  }
  if (attributed) return counts;

  if (outcome.kind === 'scored') {
    for (const [key, tally] of Object.entries(outcome.bySubskill)) {
      if (!tally || typeof tally.total !== 'number') continue;
      if (use === 'independent') bump(key as Subskill, { independentTotal: tally.total, independentCorrect: tally.correct });
      else if (use === 'assisted') bump(key as Subskill, { assistedTotal: tally.total, assistedCorrect: tally.correct });
    }
  }
  return counts;
}

/** Every scope one event is evidence about, with the counts and the band it
    may support in each. */
function contributionsFor(event: EvidenceEvent, use: EvidenceUse, context: EvidenceContext): ScopeContribution[] {
  const out: ScopeContribution[] = [];
  const independent = independentItems(event, context);
  const independentIds = new Set(independent.map((item) => item.itemId));
  const assisted = (event.items ?? []).filter((item) => !independentIds.has(item.itemId));
  const outcome = event.outcome;

  // A whole thing: a complete paper under timing, or a full graded task. A
  // partial attempt is never one, which is what PARTIAL_EXERCISE_CAN_SET_BAND
  // says in the contract.
  const finished = event.completion === 'completed';
  const whole =
    finished &&
    ((outcome.kind === 'scored' && outcome.bandEstimate !== undefined) || outcome.kind === 'graded');
  const canSetBand = whole || PARTIAL_EXERCISE_CAN_SET_BAND;

  const vocabulary = outcome.kind === 'recall' || VOCABULARY_SUBSKILLS.has(event.subskill);
  const section =
    event.taskScope?.kind === 'writing-task'
      ? event.taskScope.task
      : event.taskScope?.kind === 'speaking-part'
        ? `part${event.taskScope.part}`
        : null;

  /* The paper. Vocabulary supports all four papers and is never scored as
     one of them, so it contributes to none. */
  if (event.paper && !vocabulary) {
    const paperBand =
      canSetBand && outcome.kind === 'scored' && outcome.bandEstimate !== undefined
        ? floorReadingBand(event.paper, outcome.bandEstimate)
        : canSetBand && outcome.kind === 'graded'
          ? outcome.overallBand
          : null;

    let counts = emptySubskillCount();
    if (outcome.kind === 'scored') {
      if ((event.items ?? []).length > 0) {
        const ind = countOf(independent);
        const ass = countOf(assisted);
        counts = {
          independentTotal: ind.total,
          independentCorrect: ind.correct,
          assistedTotal: ass.total,
          assistedCorrect: ass.correct,
        };
      } else if (use === 'independent') {
        counts = { independentTotal: outcome.total, independentCorrect: outcome.raw, assistedTotal: 0, assistedCorrect: 0 };
      } else {
        counts = { independentTotal: 0, independentCorrect: 0, assistedTotal: outcome.total, assistedCorrect: outcome.raw };
      }
    } else if (outcome.kind === 'objective') {
      const correct = outcome.met ? 1 : 0;
      counts =
        use === 'independent'
          ? { independentTotal: 1, independentCorrect: correct, assistedTotal: 0, assistedCorrect: 0 }
          : { independentTotal: 0, independentCorrect: 0, assistedTotal: 1, assistedCorrect: correct };
    }

    out.push({ scope: { kind: 'paper', paper: event.paper }, ...counts, band: paperBand, whole, section });
  }

  /* Writing Task 1 and Task 2, and the three Speaking parts, kept apart:
     they are marked on different criteria and behave differently. */
  if (event.taskScope && outcome.kind === 'graded') {
    const scope: PolicyScope =
      event.taskScope.kind === 'writing-task'
        ? { kind: 'writing-task', task: event.taskScope.task }
        : { kind: 'speaking-part', part: event.taskScope.part };
    out.push({
      scope,
      independentTotal: 0,
      independentCorrect: 0,
      assistedTotal: 0,
      assistedCorrect: 0,
      band: canSetBand ? outcome.overallBand : null,
      whole,
      section,
    });
  }

  /* The four official criteria, as the grader reported them. */
  if (outcome.kind === 'graded' && (event.paper === 'writing' || event.paper === 'speaking')) {
    const known: readonly string[] = event.paper === 'writing' ? WRITING_CRITERIA : SPEAKING_CRITERIA;
    for (const [rawKey, value] of Object.entries(outcome.criteria)) {
      const key = CRITERION_ALIASES[rawKey] ?? rawKey;
      if (!known.includes(key) || typeof value !== 'number') continue;
      out.push({
        scope: { kind: 'criterion', paper: event.paper, criterion: key as WritingCriterion | SpeakingCriterion },
        independentTotal: 0,
        independentCorrect: 0,
        assistedTotal: 0,
        assistedCorrect: 0,
        band: canSetBand ? value : null,
        whole,
        section,
      });
    }
  }

  /* The subskills, which is where accuracy lives. */
  if (event.paper && !vocabulary) {
    for (const [subskill, counts] of subskillCounts(event, use, independent, assisted)) {
      out.push({ scope: { kind: 'subskill', paper: event.paper, subskill }, ...counts, band: null, whole: false, section: null });
    }
  }

  /* Vocabulary: supporting knowledge, never a fifth paper. */
  if (vocabulary) {
    let counts = emptySubskillCount();
    if (outcome.kind === 'recall') {
      counts =
        use === 'independent'
          ? { independentTotal: outcome.reviewed, independentCorrect: outcome.correct, assistedTotal: 0, assistedCorrect: 0 }
          : { independentTotal: 0, independentCorrect: 0, assistedTotal: outcome.reviewed, assistedCorrect: outcome.correct };
    } else {
      const ind = countOf(independent);
      const ass = countOf(assisted);
      counts = {
        independentTotal: ind.total,
        independentCorrect: ind.correct,
        assistedTotal: ass.total,
        assistedCorrect: ass.correct,
      };
    }
    out.push({ scope: { kind: 'vocabulary' }, ...counts, band: null, whole: false, section: null });
  }

  return out;
}

/** The official Academic Reading table starts at 2.5 and `readingBand`
    returns 0 below it, which is not a real band and would drag an average
    into nonsense. Floored the same way src/lib/level.ts floors it. */
function floorReadingBand(paper: Paper, band: number): number {
  return paper === 'reading' || paper === 'listening' ? Math.max(MIN_REPORTABLE_BAND, band) : band;
}

/* ── Counting ────────────────────────────────────────────────────────────── */

function tally(samples: readonly PolicySample[], now: string): EvidenceCount {
  const usable = samples.filter((sample) => sample.use !== 'excluded');
  const independentSamples = usable.filter((sample) => sample.use === 'independent');
  // Sittings are grouped from the events, so distinct occasion keys is the
  // count. Folded-up summary blocks have no events left to group and carry
  // their own count instead; they are added afterwards.
  const occasions = (list: readonly PolicySample[]) =>
    new Set(list.filter((sample) => !sample.fromSummary).map((sample) => sample.occasionKey)).size;

  const counted = usable.filter((sample) => sample.use !== 'study');
  const latestIndependent = independentSamples.reduce<string | null>(
    (latest, sample) => (latest === null || sample.at > latest ? sample.at : latest),
    null,
  );
  const latestAny = usable.reduce<string | null>((latest, sample) => (latest === null || sample.at > latest ? sample.at : latest), null);

  const ignored = new Map<IgnoredReason, number>();
  for (const sample of samples) {
    if (sample.ignoredReason) ignored.set(sample.ignoredReason, (ignored.get(sample.ignoredReason) ?? 0) + 1);
  }

  return {
    independentOccasions: occasions(independentSamples.filter((sample) => sample.independentTotal > 0 || sample.whole)),
    assistedOccasions: occasions(usable.filter((sample) => sample.use === 'assisted')),
    independentItems: counted.reduce((sum, sample) => sum + sample.independentTotal, 0),
    independentCorrect: counted.reduce((sum, sample) => sum + sample.independentCorrect, 0),
    assistedItems: counted.reduce((sum, sample) => sum + sample.assistedTotal, 0),
    wholeAttempts: independentSamples.filter((sample) => sample.whole).length,
    studiedOccasions: occasions(usable.filter((sample) => sample.use === 'study')),
    daysSinceLatest: latestIndependent === null ? null : daysBetween(latestIndependent, now),
    latestAt: latestAny,
    ignored: [...ignored.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([reason, count]) => ({ reason, count })),
  };
}

/** Occasions from the summary blocks are counts, not sittings, so they are
    added after the fact rather than grouped. */
function addSummaryCounts(count: EvidenceCount, samples: readonly PolicySample[]): EvidenceCount {
  const summaries = samples.filter((sample) => sample.fromSummary && sample.use !== 'excluded');
  if (summaries.length === 0) return count;
  const sum = (use: EvidenceUse) =>
    summaries.filter((sample) => sample.use === use).reduce((total, sample) => total + sample.summaryOccasions, 0);
  return {
    ...count,
    independentOccasions: count.independentOccasions + sum('independent'),
    assistedOccasions: count.assistedOccasions + sum('assisted'),
    studiedOccasions: count.studiedOccasions + sum('study'),
  };
}

/* ── Certainty ───────────────────────────────────────────────────────────── */

export function certaintyRank(certainty: Certainty): number {
  return CERTAINTY_ORDER.indexOf(certainty);
}

/** The lower of two, which is how every cap in this file is applied: a cap
    can only ever bring a claim down. */
export function lowerCertainty(a: Certainty, b: Certainty): Certainty {
  return certaintyRank(a) <= certaintyRank(b) ? a : b;
}

/** The ladder, before any cap.
 *
 * A band scope asks for whole attempts, because a band comes from a whole
 * paper or a full graded task and from nothing else. An accuracy scope asks
 * for items across separate sittings, which is the rule the tutor already
 * applied: eight questions inside one sitting is still one occasion. */
function ladderCertainty(count: EvidenceCount, bandScope: boolean, thresholds: PolicyThresholds): Certainty {
  if (bandScope) {
    if (count.wholeAttempts >= thresholds.bandMeasuredMinPapers && count.independentOccasions >= thresholds.patternMinOccasions) {
      return 'measured';
    }
    if (count.wholeAttempts >= 1) return 'tentative';
  } else {
    if (count.independentOccasions >= thresholds.patternMinOccasions && count.independentItems >= thresholds.patternMinItems) {
      return 'measured';
    }
    if (count.independentOccasions >= 1 && count.independentItems >= thresholds.tentativeMinItems) return 'tentative';
  }
  if (evidenceAmount(count, thresholds) > 0 || count.independentOccasions > 0 || count.assistedOccasions > 0) {
    return 'limited';
  }
  return 'unknown';
}

/* ── One estimate ────────────────────────────────────────────────────────── */

/** Recency-weighted mean, newest first, over the samples that may carry a
    number. The same shape as weightedBand() in src/lib/level.ts. */
function weightedMean(
  samples: readonly PolicySample[],
  valueOf: (sample: PolicySample) => number,
  thresholds: PolicyThresholds,
): number | null {
  const ordered = [...samples].sort((a, b) => (a.at === b.at ? (a.eventId < b.eventId ? -1 : 1) : a.at < b.at ? -1 : 1));
  const recent = ordered.slice(-thresholds.recentWindow);
  let weighted = 0;
  let total = 0;
  for (let i = recent.length - 1, position = 0; i >= 0; i -= 1, position += 1) {
    const sample = recent[i]!;
    const weight = sampleWeight(sample, position, thresholds);
    weighted += valueOf(sample) * weight;
    total += weight;
  }
  return total === 0 ? null : weighted / total;
}

/** Accuracy over independent items only, weighted the same way. */
function weightedAccuracy(samples: readonly PolicySample[], thresholds: PolicyThresholds): number | null {
  const scoring = samples.filter((sample) => sample.use !== 'excluded' && sample.use !== 'study' && sample.independentTotal > 0);
  if (scoring.length === 0) return null;
  const ordered = [...scoring].sort((a, b) => (a.at === b.at ? (a.eventId < b.eventId ? -1 : 1) : a.at < b.at ? -1 : 1));
  const recent = ordered.slice(-thresholds.recentWindow);
  let correct = 0;
  let total = 0;
  for (let i = recent.length - 1, position = 0; i >= 0; i -= 1, position += 1) {
    const sample = recent[i]!;
    // Assistance is already accounted for: only items answered unaided on
    // unseen material are in independentTotal, so the weight here is about
    // shape and recency alone.
    const weight = formWeight(sample.whole, thresholds) * recencyWeight(position, thresholds);
    correct += sample.independentCorrect * weight;
    total += sample.independentTotal * weight;
  }
  return total === 0 ? null : (correct / total) * 100;
}

/** Newer half's mean minus older half's mean, in the scope's own unit
    (bands for a band scope, percentage points for an accuracy one). Needs
    `trendMinSamples` results, below which the difference is noise. Never
    joins two different papers: a trend belongs to exactly one scope. */
function trendOf(values: readonly number[], thresholds: PolicyThresholds): number | null {
  if (values.length < thresholds.trendMinSamples) return null;
  const half = Math.floor(values.length / 2);
  const mean = (xs: readonly number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
  return Math.round((mean(values.slice(-half)) - mean(values.slice(0, half))) * 10) / 10;
}

interface EstimateContext {
  now: string;
  thresholds: PolicyThresholds;
  selfReported: readonly SelfReportedScore[];
}

function estimateFor(scope: PolicyScope, samples: readonly PolicySample[], context: EstimateContext): AbilityEstimate {
  const { thresholds } = context;
  const bandScope = isBandScope(scope);
  const count = addSummaryCounts(tally(samples, context.now), samples);
  const usable = samples.filter((sample) => sample.use !== 'excluded');
  const independentSamples = usable.filter((sample) => sample.use === 'independent');

  let certainty = ladderCertainty(count, bandScope, thresholds);

  /* The caps. Each one can only bring the claim down. */
  const contributing = usable.filter((sample) => sample.use !== 'study');
  if (contributing.length > 0 && contributing.every((sample) => sample.provenance === 'legacy')) {
    certainty = lowerCertainty(certainty, LEGACY_MAX_CERTAINTY);
  }
  if (contributing.length > 0 && contributing.every((sample) => sample.fromSummary)) {
    certainty = lowerCertainty(certainty, SUMMARY_MAX_CERTAINTY);
  }
  if (independentSamples.length > 0 && independentSamples.every((sample) => sample.mode === 'diagnostic')) {
    certainty = lowerCertainty(certainty, DIAGNOSTIC_MAX_CERTAINTY);
  }
  if (count.daysSinceLatest !== null && count.daysSinceLatest > thresholds.freshnessDays) {
    // Still true of the student once, no longer current. Decays toward
    // tentative rather than vanishing.
    certainty = lowerCertainty(certainty, 'tentative');
  }
  if (scope.kind === 'paper' && (scope.paper === 'writing' || scope.paper === 'speaking')) {
    const sections = new Set(independentSamples.map((sample) => sample.section).filter((section): section is string => section !== null));
    if (sections.size < thresholds.paperCoverageMinSections) certainty = lowerCertainty(certainty, 'tentative');
  }

  /* What the student told us, kept beside the estimate and never inside it. */
  const paper = paperOfScope(scope);
  const claim =
    scope.kind === 'paper' && paper
      ? context.selfReported.filter((score) => score.paper === paper).slice(-1)[0]
      : undefined;
  if (certainty === 'unknown' && claim) certainty = SELF_REPORTED_MAX_CERTAINTY;

  /* The number. Only independent, whole, unseen work may set one. */
  const bandSamples = independentSamples.filter((sample) => sample.band !== null && sample.whole && !sample.seenBefore);
  const rawBand =
    bandScope && certainty !== 'unknown' && certainty !== 'self-reported'
      ? weightedMean(bandSamples, (sample) => sample.band as number, thresholds)
      : null;
  const band =
    rawBand !== null
      ? toHalfBand(rawBand)
      : certainty === 'self-reported' && claim
        ? claim.band
        : null;
  const percent = bandScope ? null : weightedAccuracy(usable, thresholds);

  const margin = thresholds.marginByCertainty[certainty] ?? 0;
  const centre = rawBand ?? band;
  const range: readonly [number, number] | null =
    band === null || centre === null
      ? null
      : [clampBand(toHalfBand(centre - margin)), clampBand(toHalfBand(centre + margin))];

  const ordered = [...independentSamples].sort((a, b) => (a.at === b.at ? (a.eventId < b.eventId ? -1 : 1) : a.at < b.at ? -1 : 1));
  const trend = bandScope
    ? trendOf(
        ordered.filter((sample) => sample.band !== null && sample.whole).map((sample) => sample.band as number),
        thresholds,
      )
    : trendOf(
        ordered.filter((sample) => sample.independentTotal > 0).map((sample) => (sample.independentCorrect / sample.independentTotal) * 100),
        thresholds,
      );

  return {
    scope,
    scopeKey: scopeKeyOf(scope),
    certainty,
    band: band === null ? null : clampBand(band),
    range,
    percent: percent === null ? null : Math.round(percent * 10) / 10,
    evidence: count,
    trend,
    needsAssessment: count.independentOccasions === 0 && count.assistedOccasions === 0,
    selfReported: claim ? { band: claim.band, takenOn: claim.takenOn, reportedAt: claim.reportedAt } : undefined,
  };
}

/* ── The overall band ────────────────────────────────────────────────────── */

/** Four papers, averaged, rounded to the nearest half band. Null unless
    every one of the four qualifies, which means real evidence from a
    complete paper or a full graded task at `OVERALL_MIN_CERTAINTY` or
    better. Null is the honest answer far more often than a report page
    tends to admit. */
function overallFrom(
  estimates: readonly AbilityEstimate[],
  thresholds: PolicyThresholds,
): PolicyOutputV1['overall'] {
  const papers = PAPERS.map((paper) => estimates.find((estimate) => estimate.scopeKey === `paper:${paper}`));
  const qualified = papers.filter(
    (estimate): estimate is AbilityEstimate =>
      estimate !== undefined &&
      estimate.band !== null &&
      estimate.evidence.wholeAttempts >= 1 &&
      certaintyRank(estimate.certainty) >= certaintyRank(OVERALL_MIN_CERTAINTY),
  );
  if (qualified.length < PAPERS.length) return null;

  const mean = qualified.reduce((sum, estimate) => sum + (estimate.band as number), 0) / qualified.length;
  const certainty = qualified.reduce<Certainty>((lowest, estimate) => lowerCertainty(lowest, estimate.certainty), 'measured');
  const margin = thresholds.marginByCertainty[certainty] ?? 0;
  return {
    band: toHalfBand(mean),
    certainty,
    range: [clampBand(toHalfBand(mean - margin)), clampBand(toHalfBand(mean + margin))],
  };
}

/* ── Gaps ────────────────────────────────────────────────────────────────── */

/** What this scope has to reach: the student's own minimum for its paper
    where they set one, otherwise their overall target. Null when they have
    told us neither, because an invented target is worse than no target. */
export function requiredBandFor(scope: PolicyScope, goals: PlanGoals): number | null {
  const paper = paperOfScope(scope);
  const minimum = paper ? goals.perPaperMinimums[paper]?.band : undefined;
  return minimum ?? goals.overallTarget?.band ?? null;
}

function gapsFrom(estimates: readonly AbilityEstimate[], goals: PlanGoals): GapAssessment[] {
  const target = goals.overallTarget?.band ?? null;
  const gaps = estimates
    .filter((estimate) => isBandScope(estimate.scope))
    .map((estimate): GapAssessment => {
      const requiredBand = requiredBandFor(estimate.scope, goals);
      // A self-reported number is not a measurement, so it never settles
      // whether a requirement is met.
      const measured = estimate.certainty === 'self-reported' ? null : estimate.band;
      const shortfall = requiredBand === null || measured === null ? null : Math.round((requiredBand - measured) * 100) / 100;
      return {
        scopeKey: estimate.scopeKey,
        scope: estimate.scope,
        requiredBand,
        shortfall,
        meetsRequirement: requiredBand !== null && measured !== null && measured >= requiredBand,
        contributesToOverallShortfall: target !== null && measured !== null && measured < target,
      };
    });

  // Biggest shortfall first, so "what should we work on" reads straight off
  // the top. Unknowns sit after the known gaps: they are a reason to
  // measure, not a measured gap.
  return gaps.sort((a, b) => {
    if (a.shortfall === null && b.shortfall === null) return a.scopeKey < b.scopeKey ? -1 : 1;
    if (a.shortfall === null) return 1;
    if (b.shortfall === null) return -1;
    if (a.shortfall !== b.shortfall) return b.shortfall - a.shortfall;
    return a.scopeKey < b.scopeKey ? -1 : 1;
  });
}

/* ── Spaced review ───────────────────────────────────────────────────────── */

/** Something already demonstrated, coming round again on the spacing ladder.
    This is retention, not weakness: a scope the student is failing is a gap
    and belongs in `gaps`, not here. */
function dueReviewFrom(
  byScope: ReadonlyMap<PolicyScopeKey, { scope: PolicyScope; samples: PolicySample[] }>,
  estimates: readonly AbilityEstimate[],
  now: string,
  thresholds: PolicyThresholds,
): ReviewDue[] {
  const due: ReviewDue[] = [];
  const today = now.slice(0, 10);

  for (const estimate of estimates) {
    if (estimate.scope.kind !== 'subskill' && estimate.scope.kind !== 'vocabulary') continue;
    if (estimate.evidence.independentOccasions < 1) continue;
    if (estimate.percent !== null && estimate.percent < thresholds.weakPercent) continue;

    const held = byScope.get(estimate.scopeKey);
    const independent = (held?.samples ?? []).filter((sample) => sample.use === 'independent' && !sample.fromSummary);
    const latest = independent.reduce<PolicySample | null>((best, sample) => (best === null || sample.at > best.at ? sample : best), null);
    if (!latest) continue;

    const ladder = thresholds.reviewSpacingDays;
    const step = Math.min(Math.max(estimate.evidence.independentOccasions - 1, 0), ladder.length - 1);
    const dueOn = addDays(latest.localDate, ladder[step] ?? ladder[ladder.length - 1] ?? 0);
    if (dueOn > today) continue;

    due.push({
      scopeKey: estimate.scopeKey,
      // The activity that last demonstrated it. A real id from the student's
      // own history, so the link always resolves; the planner may swap in
      // fresher material of the same kind.
      activityId: latest.activityId,
      dueOn,
      daysSinceDemonstrated: daysBetween(latest.at, now),
    });
  }
  return due.sort((a, b) => (a.dueOn === b.dueOn ? (a.scopeKey < b.scopeKey ? -1 : 1) : a.dueOn < b.dueOn ? -1 : 1));
}

/* ── Going nowhere ───────────────────────────────────────────────────────── */

/** Consecutive independent occasions below `weakPercent`, none of them an
    improvement on the one before it. At `repeatedDifficultyLimit` the
    planner stops offering more of the same drill and the scope is listed for
    a teacher (lead decision Q2). */
function repeatedDifficultyFrom(
  byScope: ReadonlyMap<PolicyScopeKey, { scope: PolicyScope; samples: PolicySample[] }>,
  thresholds: PolicyThresholds,
): RepeatedDifficulty[] {
  const flagged: RepeatedDifficulty[] = [];

  for (const [key, held] of byScope) {
    // The planner's question is "should I offer this drill a fourth time",
    // so this is about the thing being practised, not about a whole paper.
    if (held.scope.kind !== 'subskill' && held.scope.kind !== 'vocabulary') continue;
    const attempts = occasionAccuracies(held.samples);
    if (attempts.length === 0) continue;

    let run = 0;
    for (let i = attempts.length - 1; i >= 0; i -= 1) {
      const here = attempts[i]!;
      if (here.percent >= thresholds.weakPercent) break;
      const before = attempts[i - 1];
      run += 1;
      if (before && here.percent > before.percent + thresholds.improvementMarginPercent) break;
    }
    if (run < thresholds.repeatedDifficultyLimit) continue;

    flagged.push({
      scopeKey: key,
      scope: held.scope,
      consecutiveUnimprovedAttempts: run,
      since: attempts[attempts.length - run]!.at,
    });
  }
  return flagged.sort((a, b) => (a.scopeKey < b.scopeKey ? -1 : 1));
}

/** One accuracy per independent sitting, oldest first. */
function occasionAccuracies(samples: readonly PolicySample[]): { at: string; percent: number }[] {
  const byOccasion = new Map<string, { at: string; correct: number; total: number }>();
  for (const sample of samples) {
    if (sample.use !== 'independent' || sample.independentTotal === 0 || sample.fromSummary) continue;
    const held = byOccasion.get(sample.occasionKey) ?? { at: sample.at, correct: 0, total: 0 };
    byOccasion.set(sample.occasionKey, {
      at: held.at < sample.at ? held.at : sample.at,
      correct: held.correct + sample.independentCorrect,
      total: held.total + sample.independentTotal,
    });
  }
  return [...byOccasion.values()]
    .map((entry) => ({ at: entry.at, percent: (entry.correct / entry.total) * 100 }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/* ── Freshness ───────────────────────────────────────────────────────────── */

function freshnessFrom(
  latestByPaper: ReadonlyMap<Paper, string>,
  now: string,
  thresholds: PolicyThresholds,
): EvidenceFreshness[] {
  return PAPERS.map((paper) => {
    const latest = latestByPaper.get(paper);
    if (!latest) return { paper, daysSinceLatest: null, state: 'none' as const };
    const days = daysBetween(latest, now);
    const state = days <= thresholds.freshnessDays ? 'fresh' : days <= thresholds.staleDays ? 'ageing' : 'stale';
    return { paper, daysSinceLatest: days, state };
  });
}

/* ── The fingerprint ─────────────────────────────────────────────────────── */

/** A short, stable print of everything the policy concluded, for cache keys
    and for "has anything meaningful changed since we planned this".
 *
 * Deliberately excludes anything that moves on its own: no `computedAt`, no
 * day counts, no ages. Reopening a page a day later must not invalidate a
 * cached, paid-for AI reply. It DOES include the thresholds, so a teacher
 * changing one invalidates everything computed under the old ones. */
export function policyFingerprint(output: Omit<PolicyOutputV1, 'fingerprint'>, thresholds: PolicyThresholds): string {
  return hashContent(
    canonicalJson({
      thresholds,
      estimates: output.estimates.map((estimate) => ({
        key: estimate.scopeKey,
        certainty: estimate.certainty,
        band: estimate.band,
        percent: estimate.percent,
        trend: estimate.trend,
        needsAssessment: estimate.needsAssessment,
        independentOccasions: estimate.evidence.independentOccasions,
        independentItems: estimate.evidence.independentItems,
        independentCorrect: estimate.evidence.independentCorrect,
        assistedOccasions: estimate.evidence.assistedOccasions,
        studiedOccasions: estimate.evidence.studiedOccasions,
        wholeAttempts: estimate.evidence.wholeAttempts,
        selfReported: estimate.selfReported,
      })),
      overall: output.overall,
      gaps: output.gaps.map((gap) => ({
        key: gap.scopeKey,
        requiredBand: gap.requiredBand,
        shortfall: gap.shortfall,
        meetsRequirement: gap.meetsRequirement,
      })),
      dueReview: output.dueReview.map((review) => `${review.scopeKey}|${review.activityId}|${review.dueOn}`),
      unknownScopes: output.unknownScopes,
      strengths: output.strengths,
      needsTeacherInput: output.needsTeacherInput.map((entry) => `${entry.scopeKey}|${entry.consecutiveUnimprovedAttempts}`),
      diagnosticsOutstanding: output.diagnosticsOutstanding,
      freshness: output.freshness.map((entry) => `${entry.paper}|${entry.state}`),
      ignored: output.ignored,
      selfReported: output.selfReported,
    }),
  );
}

/* ── The one pass ────────────────────────────────────────────────────────── */

/** Everything the policy has to say about one student at one instant.
 *
 * Pure: the same record, goals and `now` always give the same answer, down
 * to the fingerprint. */
export function evaluateEvidence(input: PolicyInput): PolicyOutputV1 {
  const { record, now } = input;
  const goals = input.goals ?? NO_GOALS_YET;
  const thresholds = input.thresholds ?? DEFAULT_POLICY_THRESHOLDS;

  const superseded = new Set<string>();
  for (const event of record.events) if (event.supersedes) superseded.add(event.supersedes);
  const context: EvidenceContext = { contentVersions: input.contentVersions, supersededIds: superseded };

  const breakdown = classifyAll(record.events, context);
  const useById = new Map(breakdown.classifications.map((entry) => [entry.event.id, entry]));
  const occasionByEvent = new Map<string, string>();
  for (const occasion of groupIntoOccasions(record.events)) {
    for (const event of occasion.events) occasionByEvent.set(event.id, occasion.key);
  }

  const byScope = new Map<PolicyScopeKey, { scope: PolicyScope; samples: PolicySample[] }>();
  const push = (scope: PolicyScope, sample: PolicySample) => {
    const key = scopeKeyOf(scope);
    const held = byScope.get(key) ?? { scope, samples: [] };
    held.samples.push(sample);
    byScope.set(key, held);
  };
  for (const scope of baselineScopes()) {
    byScope.set(scopeKeyOf(scope), { scope, samples: [] });
  }

  const ignoredTotals = new Map<IgnoredReason, number>();
  const noteIgnored = (reason: IgnoredReason) => ignoredTotals.set(reason, (ignoredTotals.get(reason) ?? 0) + 1);
  /** The most recent work of any kind per paper, INCLUDING what was dropped
      for being too old, so freshness can say "stale" rather than "none". */
  const latestByPaper = new Map<Paper, string>();
  const touchedPapers = new Set<Paper>();

  for (const event of record.events) {
    const verdict = useById.get(event.id);
    if (!verdict) continue;

    let use: EvidenceUse = verdict.use;
    let ignoredReason: IgnoredReason | undefined =
      verdict.use === 'excluded' ? (verdict.reason as IgnoredReason) : undefined;
    // A repeat still counts as guided practice, and it is still not fresh
    // evidence, so it is named in `ignored` as well. Same choice classifyAll
    // makes.
    if (verdict.use === 'assisted' && verdict.reason === 'repeat-of-seen-material') {
      ignoredReason = 'repeat-of-seen-material';
    }
    if (use !== 'excluded' && daysBetween(event.at, now) > thresholds.staleDays) {
      use = 'excluded';
      ignoredReason = 'older-than-window';
    }
    if (ignoredReason) noteIgnored(ignoredReason);

    if (event.paper) {
      const held = latestByPaper.get(event.paper);
      if (!held || event.at > held) latestByPaper.set(event.paper, event.at);
      if (use === 'independent' || use === 'assisted') touchedPapers.add(event.paper);
    }

    for (const contribution of contributionsFor(event, use, context)) {
      push(contribution.scope, {
        eventId: event.id,
        activityId: event.activityId,
        at: event.at,
        localDate: event.localDate,
        occasionKey: occasionByEvent.get(event.id) ?? `sitting:${event.localDate}`,
        use,
        ignoredReason,
        provenance: event.provenance,
        mode: event.mode,
        seenBefore: event.seenBefore,
        independentTotal: contribution.independentTotal,
        independentCorrect: contribution.independentCorrect,
        assistedTotal: contribution.assistedTotal,
        assistedCorrect: contribution.assistedCorrect,
        band: contribution.band,
        whole: contribution.whole,
        section: contribution.section,
        fromSummary: false,
        summaryOccasions: 0,
      });
    }
  }

  /* Blocks the local soft cap folded away. Counts only, no item detail, so a
     scope resting on them alone can never rise above SUMMARY_MAX_CERTAINTY,
     and a long-running student's history still shows how much work was
     done. */
  for (const summary of record.summaries ?? []) {
    for (const entry of summary.tallies) {
      if (!entry.paper) continue;
      const scope: PolicyScope = { kind: 'subskill', paper: entry.paper, subskill: entry.subskill };
      const shared = {
        activityId: '',
        at: entry.latestAt,
        localDate: entry.latestAt.slice(0, 10),
        provenance: entry.provenance,
        mode: entry.mode,
        seenBefore: false,
        band: null,
        whole: false,
        section: null,
        fromSummary: true,
      };
      if (entry.independentOccasions > 0 || entry.independentItems > 0) {
        push(scope, {
          ...shared,
          eventId: `${summary.id}:${entry.subskill}:independent`,
          occasionKey: `${summary.id}:${entry.subskill}:independent`,
          use: 'independent',
          independentTotal: entry.independentItems,
          independentCorrect: entry.correctItems,
          assistedTotal: 0,
          assistedCorrect: 0,
          summaryOccasions: entry.independentOccasions,
        });
      }
      if (entry.assistedOccasions > 0) {
        push(scope, {
          ...shared,
          eventId: `${summary.id}:${entry.subskill}:assisted`,
          occasionKey: `${summary.id}:${entry.subskill}:assisted`,
          use: 'assisted',
          independentTotal: 0,
          independentCorrect: 0,
          assistedTotal: 0,
          assistedCorrect: 0,
          summaryOccasions: entry.assistedOccasions,
        });
      }
      if (entry.studiedCount > 0) {
        push(scope, {
          ...shared,
          eventId: `${summary.id}:${entry.subskill}:studied`,
          occasionKey: `${summary.id}:${entry.subskill}:studied`,
          use: 'study',
          independentTotal: 0,
          independentCorrect: 0,
          assistedTotal: 0,
          assistedCorrect: 0,
          summaryOccasions: entry.studiedCount,
        });
      }
    }
  }

  /* Self-reported scores: the record's list plus anything the goals carry,
     deduplicated, kept apart from everything measured. */
  const selfReported = mergeSelfReported(record.selfReported, goals.selfReported);

  const estimates = [...byScope.values()]
    .sort((a, b) => (scopeSortKey(a.scope) < scopeSortKey(b.scope) ? -1 : 1))
    .map((held) => estimateFor(held.scope, held.samples, { now, thresholds, selfReported }));

  const gaps = gapsFrom(estimates, goals);
  const requiredByScope = new Map(gaps.map((gap) => [gap.scopeKey, gap.requiredBand]));

  const strengths = estimates
    .filter((estimate) => {
      if (estimate.certainty !== 'measured') return false;
      if (estimate.percent !== null) return estimate.percent >= thresholds.strongPercent;
      const required = requiredByScope.get(estimate.scopeKey) ?? null;
      return estimate.band !== null && required !== null && estimate.band >= required;
    })
    .map((estimate) => estimate.scopeKey);

  const shell: Omit<PolicyOutputV1, 'fingerprint'> = {
    version: 1,
    evidenceVersion: record.evidenceVersion,
    computedAt: now,
    estimates,
    gaps,
    dueReview: dueReviewFrom(byScope, estimates, now, thresholds),
    unknownScopes: estimates.filter((estimate) => estimate.certainty === 'unknown').map((estimate) => estimate.scopeKey),
    overall: overallFrom(estimates, thresholds),
    freshness: freshnessFrom(latestByPaper, now, thresholds),
    strengths,
    needsTeacherInput: repeatedDifficultyFrom(byScope, thresholds),
    diagnosticsOutstanding: PAPERS.filter((paper) => !touchedPapers.has(paper)),
    ignored: [...ignoredTotals.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([reason, count]) => ({ reason, count })),
    selfReported: selfReported.map((score) => ({
      paper: score.paper,
      band: score.band,
      takenOn: score.takenOn,
      reportedAt: score.reportedAt,
    })),
  };

  return { ...shell, fingerprint: policyFingerprint(shell, thresholds) };
}

function mergeSelfReported(
  fromRecord: readonly SelfReportedScore[],
  fromGoals: PlanGoals['selfReported'],
): SelfReportedScore[] {
  const byKey = new Map<string, SelfReportedScore>();
  for (const score of fromRecord) byKey.set(`${score.paper ?? '-'}|${score.band}|${score.takenOn}`, score);
  for (const score of fromGoals) {
    const key = `${score.paper ?? '-'}|${score.band}|${score.takenOn}`;
    if (!byKey.has(key)) byKey.set(key, { id: `goal:${key}`, ...score });
  }
  return [...byKey.values()].sort((a, b) => (a.takenOn === b.takenOn ? (a.id < b.id ? -1 : 1) : a.takenOn < b.takenOn ? -1 : 1));
}
