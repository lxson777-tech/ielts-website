/* Writing-section data contract. Shared by the heuristic engine
   (mechanics.ts), the grader seam (grader.ts), and the UI. The LLM provider
   is deliberately abstracted behind `EssayGrader` so it can be swapped
   (Claude / Gemini / open model) without touching anything else. */

export type WritingTask = 'task1' | 'task2';

/** A single topic-specific vocabulary suggestion for a prompt — distinct from the
    generic functional language in writing-structures.ts (which teaches phrases for
    the essay *type*, e.g. "stating an opinion"). These teach words for the essay's
    *subject matter*. */
export interface VocabSuggestion {
  phrase: string;
  meaning: string;
  example: string;
}

export interface EssayPrompt {
  id: string;
  task: WritingTask;
  /** finer type for lessons/filtering: 'opinion' | 'discussion' | 'letter' | 'chart' | … */
  variant: string;
  title: string;
  /** the question the student answers (small inline HTML allowed) */
  promptHtml: string;
  /** Task 1 Academic only: chart/graph/process image under /public */
  imageUrl?: string;
  /** 250 for Task 2, 150 for Task 1 */
  minWords: number;
  /** 40 for Task 2, 20 for Task 1 */
  suggestedMinutes: number;
  /** Topic vocabulary shown in the writing coach panel. */
  suggestedVocab: VocabSuggestion[];
}

export interface EssayInput {
  prompt: EssayPrompt;
  /** the student's raw essay text */
  essay: string;
}

/* ── The four official assessment criteria ─────────────────────────────────
   Same keys for both tasks; only the display label of the first differs
   (Task 2 = "Task Response", Task 1 = "Task Achievement"). */

export type CriterionKey =
  | 'taskResponse'
  | 'coherenceCohesion'
  | 'lexicalResource'
  | 'grammaticalRange';

export interface CriterionMeta {
  key: CriterionKey;
  label: string;
  task1Label?: string;
  short: string;
}

export const CRITERIA: CriterionMeta[] = [
  { key: 'taskResponse', label: 'Task Response', task1Label: 'Task Achievement', short: 'TR' },
  { key: 'coherenceCohesion', label: 'Coherence & Cohesion', short: 'CC' },
  { key: 'lexicalResource', label: 'Lexical Resource', short: 'LR' },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', short: 'GRA' },
];

/** Display label for a criterion, task-aware (TR vs TA). */
export function criterionLabel(meta: CriterionMeta, task: WritingTask): string {
  return task === 'task1' && meta.task1Label ? meta.task1Label : meta.label;
}

export interface CriterionScore {
  /** Whole band 0–9, per the official method (examiners award integers per
      criterion; half bands appear only in the averaged task score). */
  band: number;
  comment: string;
  /** One actionable sentence: what would lift this criterion to the next band. */
  tip?: string;
}

export interface Correction {
  original: string;
  fix: string;
  reason: string;
}

/* ── Heuristic report (produced in-browser, no API) ────────────────────── */

export interface MechanicsReport {
  wordCount: number;
  minWords: number;
  underLength: boolean;
  sentenceCount: number;
  avgSentenceLength: number;
  /** stdev of per-sentence word counts — low = monotonous, very high = run-ons */
  sentenceLengthSpread: number;
  /** type–token ratio, 0–1 (higher = more varied vocabulary) */
  lexicalDiversity: number;
  overusedWords: { word: string; count: number }[];
  linkingDevices: { word: string; count: number }[];
  /** linking-device occurrences per sentence */
  connectiveDensity: number;
  spellingFlags: { word: string; suggestion?: string }[];
  /** fraction of the prompt's key words that appear in the essay, 0–1 */
  topicOverlap: number;
  offTopicRisk: boolean;
  /** human-readable feedback lines derived from the metrics above */
  notes: string[];
}

/* ── The full result the UI renders ────────────────────────────────────── */

export interface GradeResult {
  overallBand: number;
  criteria: Record<CriterionKey, CriterionScore>;
  mechanics: MechanicsReport;
  corrections: Correction[];
  strengths: string[];
  improvements: string[];
  /** Which grader actually produced this result (the configured one may have
      failed over to the offline stub) — drives the AI/sample badge. */
  grader: { name: string; live: boolean };
}

/** The portion a language model produces; the rest of GradeResult is
    heuristic (`mechanics`) and the assembled `overallBand`. */
export type EssayAssessment = Pick<
  GradeResult,
  'criteria' | 'corrections' | 'strengths' | 'improvements'
>;

/** The swappable model boundary. Implementations may use any provider — the
    stub returns canned output so the whole flow runs with no key. */
export interface EssayGrader {
  /** Human label shown in the UI (e.g. "Sample grader", "Claude Haiku"). */
  readonly name: string;
  /** True once a real model is wired in (gates "AI-graded" badging). */
  readonly live: boolean;
  grade(input: EssayInput, mechanics: MechanicsReport): Promise<EssayAssessment>;
}

/* ── Band assembly ─────────────────────────────────────────────────────── */

/** Official method: the four criteria are equally weighted and the task score
    is their mean, with .25 rounded up to .5 and .75 up to the next whole band
    — which `Math.round` on the doubled value implements exactly. */
export function overallBand(criteria: Record<CriterionKey, CriterionScore>): number {
  const bands = CRITERIA.map((c) => criteria[c.key].band);
  const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
  return Math.round(avg * 2) / 2;
}

/** Clamp + snap any raw number to a valid IELTS band (0–9, nearest 0.5). */
export function toBand(n: number): number {
  const clamped = Math.max(0, Math.min(9, n));
  return Math.round(clamped * 2) / 2;
}
