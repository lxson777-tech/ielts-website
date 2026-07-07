/* Speaking-section data contract. Mirrors src/lib/writing/schema.ts: the LLM
   provider is abstracted behind `SpeakingGrader` so it can be swapped without
   touching the UI. Unlike Writing, grading is audio-native (Pronunciation is
   a real scored criterion a transcript can't capture), so there is no
   text-based "essay" here — an attempt is one or more recorded audio clips,
   each tied to the exact question that was asked. */

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

export interface SpeakingQuestion {
  id: string;
  text: string;
}

export interface Part1Topic {
  id: string;
  part: 'part1';
  topic: string;
  questions: SpeakingQuestion[];
}

export interface CueCard {
  id: string;
  part: 'part2and3';
  /** the cue-card headline, e.g. "Describe a memorable journey..." */
  topic: string;
  /** the "you should say" bullet points */
  bullets: string[];
  /** Part 3 follow-up discussion questions on the same theme */
  part3Questions: SpeakingQuestion[];
}

export type SpeakingPrompt = Part1Topic | CueCard;

/* ── Recorded answers ───────────────────────────────────────────────────── */

/** One recorded answer, ready to ship to the Worker. */
export interface AnsweredClip {
  /** exact text the avatar asked — grounds the model's grading, not a transcript */
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
  monologue: AnsweredClip;
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
}

/** A notable moment the model picked out from the audio (its own quote of
    what was said + a remark) — replaces Writing's `corrections`, since
    there's no transcript to slice exact error-spans from. */
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
  /** Which grader actually produced this result (drives the AI/sample badge). */
  grader: { name: string; live: boolean };
}

export type SpeakingAssessment = Pick<
  SpeakingGradeResult,
  'criteria' | 'moments' | 'strengths' | 'improvements'
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
