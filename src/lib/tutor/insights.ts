/* What we actually know about a student, worked out in code.

   This file exists because of one specific failure mode. Hand a language
   model a student's history and ask "what are they struggling with" and it
   will confidently announce a recurring weakness off a single wrong answer,
   because that is what the words in the data suggest. A student who is told
   "you keep failing True/False/Not Given" after getting two of them wrong
   once has been misled, and Mr EZ's whole value is that he is honest.

   So nothing here is inferred by a model. Every number is counted, every
   claim carries its evidence, and every claim is stamped either MEASURED
   (enough evidence to call it a pattern) or TENTATIVE (seen, but once, or
   thinly). The prompt then forbids the model from upgrading a tentative
   observation into a pattern, and the deterministic fallbacks used when the
   model is unavailable respect the same line.

   Pure functions over a ProgressV1 blob and a SavedPlan — no localStorage,
   no browser APIs — so the tutor Worker can run exactly the same code over
   the copy of that blob it reads from Supabase.

   ONE EVIDENCE POLICY (WP23, 2026-09-22)
   The thresholds above used to be a private copy, duplicated by hand from
   the ones src/lib/level.ts and src/components/ProgressReport.tsx each kept
   for themselves (architecture section 1.3, "the three competing evidence
   policies"). They are gone. The numbers below come from
   `DEFAULT_POLICY_THRESHOLDS` in src/lib/learning/contracts/policy.ts, the
   one place a teacher review changes them now.

   readFacts() also runs the real evidence policy (evaluateEvidence, over a
   record built on the spot from this same ProgressV1 with migrateProgress)
   and attaches its own five-level `certainty` to every SkillResults,
   TypeAccuracy and CriterionTrend row, ADDITIVELY: nothing that read `total`,
   `correct`, `percent` or `sittings` before needs to change. That field is
   the honest, strict answer, and because ProgressV1 has only ever held
   per-type tallies, never one answer at a time, it is capped at `limited`
   the same way any other coarse, itemless evidence is (LEGACY_MAX_CERTAINTY
   in policy.ts). This file's own `confidence` ('measured' | 'tentative')
   keeps deciding what Mr EZ may say the way it always has, off the SAME
   threshold numbers, because the Worker that reads this every turn has not
   been rewired to read the richer, item-level record yet (that is a later
   package, not this one) and a "measured" claim it already made correctly
   off a repeated type-accuracy pattern should not quietly become
   "tentative" under it. `confidenceFromCertainty()` is exported below for
   any caller that wants the conservative five-to-two collapse instead. */

import type { ProgressV1, TestAttempt, WritingAttempt, SpeakingAttempt } from '../progress';
import type { SavedPlan } from '../study-plan';
import { PLAN_SKILLS, skillTargetFor, daysUntilTest, type PlanSkill } from '../study-plan';
import { questionTypeLabel } from '../tests/question-types';
import { CRITERIA as WRITING_CRITERIA } from '../writing/schema';
import type { Locale } from '../i18n/locale';
import { tutorText, tutorCount, type CountForms, type TextVars } from './ru';
import { goalsFrom, planSettingsFromSavedPlan } from '../learning/adapters';
import { migrateProgress } from '../learning/migrate';
import { evaluateEvidence } from '../learning/policy';
import { DEFAULT_POLICY_THRESHOLDS } from '../learning/contracts/policy';
import type { Certainty, PolicyOutputV1, PolicyScopeKey } from '../learning/contracts/policy';

/* ── Evidence thresholds ───────────────────────────────────────────────────
   Read, never redefined. See the header comment above. */
const THRESHOLDS = DEFAULT_POLICY_THRESHOLDS;

export type ScoredSkill = 'reading' | 'listening';
export type GradedSkill = 'writing' | 'speaking';

export type Confidence = 'measured' | 'tentative';

/** The conservative five-to-two collapse WP23's report asks every exported
    two-level shape to use: 'measured' stays 'measured', and everything else
    (that is, 'tentative', 'limited', 'self-reported' and 'unknown') reads as
    'tentative'. 'limited' and 'self-reported' are never 'measured'. */
export function confidenceFromCertainty(certainty: Certainty): Confidence {
  return certainty === 'measured' ? 'measured' : 'tentative';
}

/* ── Measured facts ────────────────────────────────────────────────────── */

export interface SkillResults {
  skill: PlanSkill;
  attempts: number;
  /** Most recent band and when, or null when never attempted. */
  latestBand: number | null;
  latestAt: string | null;
  bestBand: number | null;
  /** The band this student is aiming at in this paper. */
  target: string | null;
  /** The one evidence policy's own certainty for this paper, added by
      readFacts() (see this file's header comment). Undefined when this row
      was built by a caller with no plan/instant to run the policy against,
      e.g. a direct call to a function that only takes `progress`. */
  certainty?: Certainty;
}

export interface TypeAccuracy {
  skill: ScoredSkill;
  type: string;
  label: string;
  correct: number;
  total: number;
  percent: number;
  /** Separate sittings that contributed. One sitting is not a pattern. */
  sittings: number;
  /** The policy's own certainty for this subskill. See SkillResults.certainty. */
  certainty?: Certainty;
}

export interface CriterionTrend {
  skill: GradedSkill;
  key: string;
  label: string;
  /** Bands across the recent window, oldest first. */
  bands: number[];
  meanBand: number;
  /** How often it was the lowest (or joint-lowest) criterion in the window. */
  timesLowest: number;
  graded: number;
  /** The policy's own certainty for this criterion. See SkillResults.certainty. */
  certainty?: Certainty;
}

export interface StudentFacts {
  lessonsCompleted: number;
  lessonsTotal: number;
  /** The last few lessons finished, newest first, as course keys. */
  recentLessonKeys: string[];
  results: SkillResults[];
  typeAccuracy: TypeAccuracy[];
  criterionTrends: CriterionTrend[];
  /** Days with any recorded study in the last 14. */
  activeDaysLast14: number;
  /** Minutes recorded in the last 7 days. */
  minutesLast7: number;
}

export interface StudentGoals {
  targetBand: string | null;
  /** ISO yyyy-mm-dd, or null when they have not set one. */
  examDate: string | null;
  daysUntilExam: number | null;
  perSkillTargets: Partial<Record<PlanSkill, string>>;
  /** True when the plan is the one the app fabricated on first visit, i.e.
      the student has never actually told us their goal. */
  guessed: boolean;
}

/** One thing worth saying about this student, with the evidence behind it
    and how far we are entitled to push it.

    `text` and `evidence` are ENGLISH, always, and they are what goes into
    the FACTS blocks the model reads. The four fields beside them are how
    the same two sentences are rebuilt in the student's own language:
    `template`/`vars` for the claim, `evidenceForms`/`evidenceCount`/
    `evidenceVars` for the counting. Use observationText() and
    observationEvidence() rather than reading `text`/`evidence` directly
    anywhere a student will see the result. */
export interface Observation {
  id: string;
  kind: 'weakness' | 'strength' | 'habit' | 'gap';
  confidence: Confidence;
  /** The one evidence policy's own five-level certainty for the scope this
      observation is about, when it is about one exact scope (a subskill or
      a criterion). `confidence` above is `confidenceFromCertainty(this)`
      EXCEPT where noted in this file's header comment: a subskill or
      criterion pattern Mr EZ already called 'measured' off the raw counts
      keeps reading 'measured' even though the strict policy view of the
      same itemless data is capped lower, and `certainty` is where that
      strict view still lives, honestly, for anything that wants it. */
  certainty?: Certainty;
  /** Neutral wording in English, already safe to show verbatim. */
  text: string;
  /** The whole-sentence English template `text` was rendered from. It is
      also the lookup key for the Russian version (src/lib/tutor/ru.ts). */
  template: string;
  vars: TextVars;
  /** The counting behind it, in English, e.g. "9 of 16 correct across 3
      sittings". */
  evidence: string;
  /** The English one/other forms `evidence` was rendered from, plus the
      number the plural turns on and the rest of its holes. */
  evidenceForms: CountForms;
  evidenceCount: number;
  evidenceVars: TextVars;
  /** Catalogue id of the activity that addresses it, when there is one. */
  activityId?: string;
}

/** The claim, in the student's language. English is the source of truth and
    the key, so 'en' is a straight read of what was already rendered. */
export function observationText(o: Observation, locale: Locale): string {
  return locale === 'en' ? o.text : tutorText(locale, o.template, o.vars);
}

/** The counting behind the claim, in the student's language. */
export function observationEvidence(o: Observation, locale: Locale): string {
  return locale === 'en'
    ? o.evidence
    : tutorCount(locale, o.evidenceCount, o.evidenceForms, o.evidenceVars);
}

/* The two counted phrases every observation's evidence is written with,
   spelled out once so the English, the Russian key and the coverage test
   cannot drift apart. */
const SITTINGS_FORMS: CountForms = {
  one: '{correct} of {total} correct across {n} sitting',
  other: '{correct} of {total} correct across {n} sittings',
};
const MARKED_PIECES_FORMS: CountForms = {
  one: 'lowest in {lowest} of {n} marked piece',
  other: 'lowest in {lowest} of {n} marked pieces',
};
const ATTEMPTS_FORMS: CountForms = { one: '{n} attempt', other: '{n} attempts' };
const ACTIVE_DAYS_FORMS: CountForms = {
  one: '{n} active day in the last 14',
  other: '{n} active days in the last 14',
};

/** Build one observation, rendering its English text and evidence eagerly
    and keeping everything needed to render them again in another language. */
function observation(
  base: Pick<Observation, 'id' | 'kind' | 'confidence' | 'activityId' | 'certainty'>,
  template: string,
  vars: TextVars,
  evidenceForms: CountForms,
  evidenceCount: number,
  evidenceVars: TextVars = {},
): Observation {
  return {
    ...base,
    template,
    vars,
    text: tutorText('en', template, vars),
    evidenceForms,
    evidenceCount,
    evidenceVars,
    evidence: tutorCount('en', evidenceCount, evidenceForms, evidenceVars),
  };
}

export interface StudentInsights {
  /** False for a brand-new student: no tests, no graded work. Drives the
      "ask for their target band instead of inventing a current one" path. */
  hasAnyResults: boolean;
  goals: StudentGoals;
  facts: StudentFacts;
  observations: Observation[];
}

/* ── Goals ─────────────────────────────────────────────────────────────── */

export function readGoals(plan: SavedPlan | null): StudentGoals {
  const perSkillTargets: Partial<Record<PlanSkill, string>> = {};
  for (const skill of PLAN_SKILLS) {
    const t = plan?.skillTargets?.[skill];
    if (t) perSkillTargets[skill] = t;
  }
  const examDate = plan?.testDate ? plan.testDate : null;
  return {
    targetBand: plan?.targetBand ?? null,
    examDate,
    daysUntilExam: examDate ? daysUntilTest(examDate) : null,
    perSkillTargets,
    guessed: Boolean(plan?.defaulted),
  };
}

/* ── Counting ──────────────────────────────────────────────────────────── */

function fullAttemptsFor(progress: ProgressV1, skill: ScoredSkill): TestAttempt[] {
  return Object.values(progress.tests ?? {})
    .flat()
    .filter((a) => (a.skill ?? 'reading') === skill && a.kind !== 'drill')
    .sort((a, b) => a.at.localeCompare(b.at));
}

function allAttemptsFor(progress: ProgressV1, skill: ScoredSkill): TestAttempt[] {
  return Object.values(progress.tests ?? {})
    .flat()
    .filter((a) => (a.skill ?? 'reading') === skill)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function writingAttempts(progress: ProgressV1): WritingAttempt[] {
  return Object.values(progress.writing ?? {})
    .flat()
    .sort((a, b) => a.at.localeCompare(b.at));
}

function speakingAttempts(progress: ProgressV1): SpeakingAttempt[] {
  return [...(progress.speaking ?? [])].sort((a, b) => a.at.localeCompare(b.at));
}

/** Per-question-type accuracy, with the number of separate sittings that
    contributed. Drills count here (they are still real evidence about a
    question type) even though they are excluded from band history, where a
    single-passage drill would be misleading. */
export function typeAccuracy(progress: ProgressV1): TypeAccuracy[] {
  const acc = new Map<string, { correct: number; total: number; sittings: number; skill: ScoredSkill }>();
  for (const skill of ['reading', 'listening'] as const) {
    for (const attempt of allAttemptsFor(progress, skill)) {
      if (!attempt.byType) continue;
      for (const [type, v] of Object.entries(attempt.byType)) {
        if (v.total <= 0) continue;
        const id = `${skill}:${type}`;
        const cur = acc.get(id) ?? { correct: 0, total: 0, sittings: 0, skill };
        cur.correct += v.correct;
        cur.total += v.total;
        cur.sittings += 1;
        acc.set(id, cur);
      }
    }
  }
  return [...acc.entries()]
    .map(([id, v]) => {
      const type = id.slice(id.indexOf(':') + 1);
      return {
        skill: v.skill,
        type,
        label: questionTypeLabel(type),
        correct: v.correct,
        total: v.total,
        percent: Math.round((v.correct / v.total) * 100),
        sittings: v.sittings,
      };
    })
    .sort((a, b) => a.percent - b.percent);
}

/** How each assessment criterion has moved across the recent graded window,
    and how often it was the weakest one. */
export function criterionTrends(progress: ProgressV1): CriterionTrend[] {
  const out: CriterionTrend[] = [];

  const windows: { skill: GradedSkill; rows: { criteria: Record<string, number> }[]; labels: Record<string, string> }[] = [
    {
      skill: 'writing',
      rows: writingAttempts(progress).slice(-THRESHOLDS.criterionWindow),
      labels: Object.fromEntries(WRITING_CRITERIA.map((c) => [c.key, c.label])),
    },
    {
      skill: 'speaking',
      rows: speakingAttempts(progress).slice(-THRESHOLDS.criterionWindow),
      labels: {
        fluencyCoherence: 'Fluency & Coherence',
        lexicalResource: 'Lexical Resource',
        grammaticalRange: 'Grammatical Range & Accuracy',
        pronunciation: 'Pronunciation',
      },
    },
  ];

  for (const { skill, rows, labels } of windows) {
    if (rows.length === 0) continue;
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r.criteria ?? {})))];
    // Which criterion was lowest in each graded piece. Ties all count, since
    // "joint weakest" is still weakest.
    const lowestCount = new Map<string, number>();
    for (const row of rows) {
      const entries = Object.entries(row.criteria ?? {}).filter(([, b]) => typeof b === 'number');
      if (entries.length === 0) continue;
      const min = Math.min(...entries.map(([, b]) => b));
      for (const [key, band] of entries) {
        if (band === min) lowestCount.set(key, (lowestCount.get(key) ?? 0) + 1);
      }
    }
    for (const key of keys) {
      const bands = rows.map((r) => r.criteria?.[key]).filter((b): b is number => typeof b === 'number');
      if (bands.length === 0) continue;
      out.push({
        skill,
        key,
        label: labels[key] ?? key,
        bands,
        meanBand: Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 10) / 10,
        timesLowest: lowestCount.get(key) ?? 0,
        graded: bands.length,
      });
    }
  }
  return out;
}

function countActivity(progress: ProgressV1, days: number, today: Date): { activeDays: number; minutes: number } {
  const activity = progress.activity ?? {};
  let activeDays = 0;
  let minutes = 0;
  for (let i = 0; i < days; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const row = activity[key];
    if (row && (row.minutes > 0 || row.lessons > 0 || row.attempts > 0)) activeDays += 1;
    minutes += row?.minutes ?? 0;
  }
  return { activeDays, minutes };
}

/* The one evidence policy, run over this same ProgressV1.
 *
 * A pure, on-the-spot pass: no storage, nothing cached. `migrateProgress`
 * reads this exact `progress`/`plan` forward into a `LearnerRecordV1` the
 * same way the one-time account migration does (src/lib/learning/migrate.ts)
 * and `evaluateEvidence` judges it. Every row therefore carries
 * `provenance: 'legacy'`, honestly, because ProgressV1 has only ever held
 * per-type tallies, never one answer at a time, which is what caps the
 * strict `certainty` this attaches at `limited` (see this file's header
 * comment for why `confidence` does not follow it down). */
function policyForProgress(progress: ProgressV1, plan: SavedPlan | null, now: Date): PolicyOutputV1 {
  const nowIso = now.toISOString();
  const record = migrateProgress(progress, plan, {}, { now: nowIso });
  const goals = goalsFrom(planSettingsFromSavedPlan(plan));
  return evaluateEvidence({ record, goals, now: nowIso });
}

function certaintyOf(policy: PolicyOutputV1, scopeKey: PolicyScopeKey): Certainty | undefined {
  return policy.estimates.find((estimate) => estimate.scopeKey === scopeKey)?.certainty;
}

/* ── Facts ─────────────────────────────────────────────────────────────── */

export function readFacts(
  progress: ProgressV1,
  plan: SavedPlan | null,
  lessonsTotal: number,
  now: Date = new Date(),
): StudentFacts {
  const policy = policyForProgress(progress, plan, now);
  const results: SkillResults[] = [];

  for (const skill of ['reading', 'listening'] as const) {
    const attempts = fullAttemptsFor(progress, skill);
    const last = attempts[attempts.length - 1] ?? null;
    results.push({
      skill,
      attempts: attempts.length,
      latestBand: last?.band ?? null,
      latestAt: last?.at ?? null,
      bestBand: attempts.length ? Math.max(...attempts.map((a) => a.band)) : null,
      target: skillTargetFor(plan, skill),
      certainty: certaintyOf(policy, `paper:${skill}`),
    });
  }

  const writing = writingAttempts(progress);
  const lastWriting = writing[writing.length - 1] ?? null;
  results.push({
    skill: 'writing',
    attempts: writing.length,
    latestBand: lastWriting?.overallBand ?? null,
    latestAt: lastWriting?.at ?? null,
    bestBand: writing.length ? Math.max(...writing.map((a) => a.overallBand)) : null,
    target: skillTargetFor(plan, 'writing'),
    certainty: certaintyOf(policy, 'paper:writing'),
  });

  const speaking = speakingAttempts(progress);
  const lastSpeaking = speaking[speaking.length - 1] ?? null;
  results.push({
    skill: 'speaking',
    attempts: speaking.length,
    latestBand: lastSpeaking?.overallBand ?? null,
    latestAt: lastSpeaking?.at ?? null,
    bestBand: speaking.length ? Math.max(...speaking.map((a) => a.overallBand)) : null,
    target: skillTargetFor(plan, 'speaking'),
    certainty: certaintyOf(policy, 'paper:speaking'),
  });

  const recentLessonKeys = Object.entries(progress.lessons ?? {})
    .sort((a, b) => b[1].completedAt.localeCompare(a[1].completedAt))
    .slice(0, 5)
    .map(([key]) => key);

  const last14 = countActivity(progress, 14, now);
  const last7 = countActivity(progress, 7, now);

  const types = typeAccuracy(progress).map((row) => ({
    ...row,
    certainty: certaintyOf(policy, `subskill:${row.skill}:${row.type}`),
  }));
  const criteria = criterionTrends(progress).map((row) => ({
    ...row,
    certainty: certaintyOf(policy, `criterion:${row.skill}:${row.key}`),
  }));

  return {
    lessonsCompleted: Object.keys(progress.lessons ?? {}).length,
    lessonsTotal,
    recentLessonKeys,
    results,
    typeAccuracy: types,
    criterionTrends: criteria,
    activeDaysLast14: last14.activeDays,
    minutesLast7: last7.minutes,
  };
}

/* ── Observations ──────────────────────────────────────────────────────── */

const SKILL_LABEL: Record<PlanSkill, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** Turn counted facts into things worth saying, each stamped with how much
    evidence stands behind it. Ordered most useful first. */
export function readObservations(facts: StudentFacts): Observation[] {
  const out: Observation[] = [];

  /* typeAccuracy is already sorted worst-first, so the first weak type here
     is genuinely THE weakest and may be called that. Everything after it is
     "consistently weak", not "the weakest" — three question types cannot all
     be the worst one, and a student who reads that stops believing the rest
     of what Mr EZ tells them. */
  let namedWeakest = false;
  for (const t of facts.typeAccuracy) {
    if (t.percent >= THRESHOLDS.weakPercent) continue;
    const pattern = t.total >= THRESHOLDS.patternMinItems && t.sittings >= THRESHOLDS.patternMinOccasions;
    if (!pattern && t.total < THRESHOLDS.tentativeMinItems) continue;
    const superlative = pattern && !namedWeakest;
    if (pattern) namedWeakest = true;
    out.push(
      observation(
        {
          id: `weak:${t.skill}:${t.type}`,
          kind: 'weakness',
          confidence: pattern ? 'measured' : 'tentative',
          certainty: t.certainty,
          activityId: `practise:${t.skill}:${t.type}`,
        },
        pattern
          ? superlative
            ? '{type} in {skill} is consistently the weakest question type.'
            : '{type} in {skill} is consistently weak too, though not as weak as the type above.'
          : '{type} in {skill} went badly the one time it came up. Not enough evidence yet to call it a pattern.',
        { type: t.label, skill: SKILL_LABEL[t.skill] },
        SITTINGS_FORMS,
        t.sittings,
        { correct: t.correct, total: t.total },
      ),
    );
  }

  for (const t of facts.typeAccuracy) {
    if (t.percent < THRESHOLDS.strongPercent || t.total < THRESHOLDS.patternMinItems) continue;
    out.push(
      observation(
        {
          id: `strong:${t.skill}:${t.type}`,
          kind: 'strength',
          confidence: t.sittings >= THRESHOLDS.patternMinOccasions ? 'measured' : 'tentative',
          certainty: t.certainty,
        },
        '{type} in {skill} is reliably strong.',
        { type: t.label, skill: SKILL_LABEL[t.skill] },
        SITTINGS_FORMS,
        t.sittings,
        { correct: t.correct, total: t.total },
      ),
    );
  }

  for (const c of facts.criterionTrends) {
    if (c.timesLowest === 0) continue;
    const pattern = c.graded >= THRESHOLDS.criterionMinGraded && c.timesLowest >= THRESHOLDS.criterionMinGraded;
    if (!pattern && c.graded > 1) continue; // lowest once out of several is noise
    out.push(
      observation(
        {
          id: `criterion:${c.skill}:${c.key}`,
          kind: 'weakness',
          confidence: pattern ? 'measured' : 'tentative',
          certainty: c.certainty,
          activityId: c.skill === 'writing' ? 'trainer:writing' : 'trainer:speaking',
        },
        pattern
          ? '{criterion} is the lowest {skill} criterion most times it is marked (average band {band}).'
          : '{criterion} was the lowest criterion in the one {skill} piece marked so far (band {band}). One piece is not a pattern.',
        {
          criterion: c.label,
          // The paper name, capitalised, because it stays English inside a
          // Russian sentence and a paper is a proper noun on this site.
          skill: SKILL_LABEL[c.skill],
          band: pattern ? c.meanBand : (c.bands[c.bands.length - 1] ?? 0),
        },
        MARKED_PIECES_FORMS,
        c.graded,
        { lowest: c.timesLowest },
      ),
    );
  }

  for (const r of facts.results) {
    if (r.attempts > 0 || !r.target) continue;
    out.push(
      observation(
        {
          id: `gap:${r.skill}`,
          kind: 'gap',
          confidence: 'measured',
          certainty: r.certainty,
          activityId:
            r.skill === 'writing' ? 'trainer:writing' : r.skill === 'speaking' ? 'trainer:speaking' : `test:${r.skill}`,
        },
        'No {skill} result recorded yet, so there is no band estimate for that paper.',
        { skill: SKILL_LABEL[r.skill] },
        ATTEMPTS_FORMS,
        0,
      ),
    );
  }

  if (facts.activeDaysLast14 >= 8) {
    out.push(
      observation(
        { id: 'habit:consistent', kind: 'habit', confidence: 'measured' },
        'Study days have been consistent over the last fortnight.',
        {},
        ACTIVE_DAYS_FORMS,
        facts.activeDaysLast14,
      ),
    );
  }

  /* Sort by kind, then by how much evidence stands behind it, and STOP
     there. Array.prototype.sort is stable, so equally-ranked observations
     keep the order they were pushed in — and type weaknesses were pushed in
     worst-score-first order (typeAccuracy sorts by percentage). An earlier
     version added `a.id.localeCompare(b.id)` as a final tie-break, which
     threw that away: a student who was 11/18 on Matching Headings and 4/15
     on True/False/Not Given was told Matching Headings was their weakest
     type, purely because "matching-headings" sorts before "tfng". The
     ordering here decides what the dashboard recommends, so it has to mean
     severity, not alphabet. */
  const order: Record<Observation['kind'], number> = { weakness: 0, gap: 1, strength: 2, habit: 3 };
  return out.sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    if (a.confidence !== b.confidence) return a.confidence === 'measured' ? -1 : 1;
    return 0;
  });
}

export function readInsights(
  progress: ProgressV1,
  plan: SavedPlan | null,
  lessonsTotal: number,
  now: Date = new Date(),
): StudentInsights {
  const facts = readFacts(progress, plan, lessonsTotal, now);
  const hasAnyResults = facts.results.some((r) => r.attempts > 0);
  return {
    hasAnyResults,
    goals: readGoals(plan),
    facts,
    observations: readObservations(facts),
  };
}

/** A short, stable fingerprint of everything a recommendation depends on.
    When this is unchanged, the saved recommendation is still valid and the
    dashboard must NOT pay for a new one. Deliberately excludes anything
    time-based apart from the exam countdown in whole days, so simply
    reopening the dashboard never invalidates it.

    The LOCALE is part of it. The cached welcome is a paragraph of prose in
    one language, so a student who switches to Russian must not be handed
    the English one back (and the other way round). Folding it into the
    hashed string keeps that out of the database schema entirely: two
    languages are simply two different fingerprints.

    The student's FIRST NAME is folded in when there is one, because a
    welcome may greet them by it: a welcome cached before they filled in
    their profile is rewritten once with the name, and again if they change
    it. It is appended only when present, so the fingerprint of a student
    with no profile is exactly what it was before names existed and nothing
    already cached is thrown away for them. */
export function insightsFingerprint(
  insights: StudentInsights,
  locale: Locale = 'en',
  firstName?: string | null,
): string {
  const { goals, facts } = insights;
  const parts = [
    locale,
    goals.targetBand ?? '-',
    goals.examDate ?? '-',
    String(goals.daysUntilExam ?? '-'),
    `L${facts.lessonsCompleted}`,
    facts.results.map((r) => `${r.skill}:${r.attempts}:${r.latestBand ?? '-'}`).join(','),
    facts.typeAccuracy.map((t) => `${t.skill}:${t.type}:${t.correct}/${t.total}`).join(','),
    insights.observations.map((o) => `${o.id}:${o.confidence}`).join(','),
  ];
  if (firstName) parts.push(`name:${firstName}`);
  return fnv1a(parts.join('|'));
}

/** Small non-cryptographic hash — this is a cache key, not a secret. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
