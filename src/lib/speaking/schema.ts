/* Speaking-section data contract. Mirrors src/lib/writing/schema.ts: the LLM
   provider is abstracted behind `SpeakingGrader` so it can be swapped without
   touching the UI. Unlike Writing, grading is audio-native (Pronunciation is
   a real scored criterion a transcript can't capture), so there is no
   text-based "essay" here — an attempt is one or more recorded audio clips,
   each tied to the exact question that was asked. */

import type { NextBandAdvice } from '../grading/next-band';

export type SpeakingCriterionKey =
  | 'fluencyCoherence'
  | 'lexicalResource'
  | 'grammaticalRange'
  | 'pronunciation';

export interface SpeakingCriterionMeta {
  key: SpeakingCriterionKey;
  label: string;
  short: string;
}

export const SPEAKING_CRITERIA: SpeakingCriterionMeta[] = [
  { key: 'fluencyCoherence', label: 'Fluency & Coherence', short: 'FC' },
  { key: 'lexicalResource', label: 'Lexical Resource', short: 'LR' },
  { key: 'grammaticalRange', label: 'Grammatical Range & Accuracy', short: 'GRA' },
  { key: 'pronunciation', label: 'Pronunciation', short: 'P' },
];

/* ── Prompt bank ────────────────────────────────────────────────────────── */

/** One topic-specific vocabulary suggestion, surfaced tap-to-reveal by the
    coach panel (same shape the writing prompts use for suggestedVocab). */
export interface TopicVocab {
  phrase: string;
  meaning: string;
  example: string;
}

export interface SpeakingQuestion {
  id: string;
  text: string;
  /** short idea angles ("think about…") shown as tap-to-reveal hints */
  ideas?: string[];
}

export interface Part1Topic {
  id: string;
  part: 'part1';
  topic: string;
  questions: SpeakingQuestion[];
  /** topic vocabulary for the coach panel's Vocab tab */
  vocab?: TopicVocab[];
  /** which IELTS question-pool window this topic was reported in, e.g. "2026 Jan to Apr" */
  period?: string;
}

export interface CueCard {
  id: string;
  part: 'part2and3';
  /** the cue-card headline, e.g. "Describe a memorable journey..." */
  topic: string;
  /** the "you should say" bullet points */
  bullets: string[];
  /** angle suggestions for the talk, shown during the prep minute */
  ideas?: string[];
  /** theme vocabulary for the coach panel's Vocab tab (Parts 2 and 3) */
  vocab?: TopicVocab[];
  /** Part 3 follow-up discussion questions on the same theme */
  part3Questions: SpeakingQuestion[];
  /** which IELTS question-pool window this cue card was reported in, e.g. "2026 May to Aug" */
  period?: string;
}

export type SpeakingPrompt = Part1Topic | CueCard;

/* ── Recorded answers ───────────────────────────────────────────────────── */

/** One recorded answer, ready to ship to the Worker. */
export interface AnsweredClip {
  /** exact text that was asked — grounds the model's grading, not a transcript */
  question: string;
  audioBase64: string;
  /** whatever MediaRecorder actually produced, passed through as-is */
  mimeType: string;
  durationMs: number;
}

export interface SpeakingAttemptPart1 {
  kind: 'part1';
  topic: string;
  answers: AnsweredClip[];
}

export interface SpeakingAttemptPart2and3 {
  kind: 'part2and3';
  cueCard: { topic: string; bullets: string[] };
  /** absent when practicing Part 3 in isolation, with no Part 2 monologue recorded */
  monologue?: AnsweredClip;
  followUps: AnsweredClip[];
}

export type SpeakingAttempt = SpeakingAttemptPart1 | SpeakingAttemptPart2and3;

/* ── Heuristic report (produced in-browser from the audio, no API) ────────
   No speech-to-text is in scope, so this can only measure acoustic
   properties: overall length vs. what's expected, and how much of the clip
   is silence (a proxy for hesitation/pausing). */

export interface AudioMechanicsReport {
  totalDurationMs: number;
  expectedMinMs: number;
  underLength: boolean;
  /** 0-1, fraction of audio below the adaptive noise floor */
  estSilenceRatio: number;
  longestSilenceMs: number;
  notes: string[];
}

/* ── The full result the UI renders ────────────────────────────────────── */

export interface SpeakingCriterionScore {
  /** whole band 0-9, per the official method */
  band: number;
  comment: string;
  tip?: string;
  /** Structured "how to reach the next band" advice from the AI examiner.
      Optional: older results and the offline stub grader don't have it. */
  nextBand?: NextBandAdvice;
}

/** A notable moment the model picked out from the audio (its own quote of
    what was said + a remark). Mirrors Writing's Moment type (see
    src/lib/writing/schema.ts); kept as a separate interface since the two
    graders' inputs differ (audio vs. text). */
export interface SpokenMoment {
  quote: string;
  note: string;
}

export interface SpeakingGradeResult {
  overallBand: number;
  criteria: Record<SpeakingCriterionKey, SpeakingCriterionScore>;
  mechanics: AudioMechanicsReport;
  moments: SpokenMoment[];
  strengths: string[];
  improvements: string[];
  /** 3 to 5 numbered steps, in priority order. Optional, see SpeakingCriterionScore.nextBand. */
  actionPlan?: string[];
  /** Which grader actually produced this result (drives the AI/sample badge). */
  grader: { name: string; live: boolean };
}

export type SpeakingAssessment = Pick<
  SpeakingGradeResult,
  'criteria' | 'moments' | 'strengths' | 'improvements' | 'actionPlan'
>;

/** The swappable model boundary. */
export interface SpeakingGrader {
  readonly name: string;
  readonly live: boolean;
  grade(attempt: SpeakingAttempt, mechanics: AudioMechanicsReport): Promise<SpeakingAssessment>;
}

/* ── Band assembly (same official method as writing/schema.ts) ──────────── */

export function overallSpeakingBand(criteria: Record<SpeakingCriterionKey, SpeakingCriterionScore>): number {
  const bands = SPEAKING_CRITERIA.map((c) => criteria[c.key].band);
  const avg = bands.reduce((a, b) => a + b, 0) / bands.length;
  return Math.round(avg * 2) / 2;
}

export function toSpeakingBand(n: number): number {
  const clamped = Math.max(0, Math.min(9, n));
  return Math.round(clamped * 2) / 2;
}
