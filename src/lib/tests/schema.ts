/* Generalized practice-test schema. Reading tests use a passage stimulus;
   future listening tests plug in an audio stimulus — the player's rendering
   of the stimulus pane is the only skill-specific branch. */

export type TestSkill = 'reading' | 'listening';

export type QuestionType =
  | 'paragraph-matching'
  | 'sentence-completion'
  | 'tfng'
  | 'yes-no-notgiven'
  | 'multiple-choice'
  | 'matching-headings'
  | 'matching-features' // statement → person/thing from a shared list
  | 'sentence-endings' // stem → correct ending from a shared list
  | 'categorisation'
  | 'multiple-answer' // pick N correct statements from a longer list
  | 'diagram-labelling';

export interface DiagramSpec {
  image: string; // path under /public, prefixed with base at render
  alt: string;
  /** one marker per question in the group, in order; x/y are % of the image box */
  markers: { x: number; y: number }[];
}

export interface PassageStimulus {
  kind: 'passage';
  label: string; // 'Reading Passage 1'
  title: string;
  instructionHtml: string;
  paragraphs: { label?: string; html: string }[];
}

export interface AudioStimulus {
  kind: 'audio';
  label: string; // 'Section 1'
  src: string;
  transcriptHtml?: string;
}

export type Stimulus = PassageStimulus | AudioStimulus;

export interface Question {
  id: string;
  textHtml?: string;
  /** sentence-completion: text around the inline input */
  before?: string;
  after?: string;
  /** multiple-choice: per-question options */
  options?: string[];
  /** Accepted answer(s); comparison is case-insensitive and trimmed. */
  answer: string | string[];
  /** Post-submit review: a short "why this is the answer" note. */
  explanation?: string;
  /** Post-submit review: the exact supporting sentence from the passage. */
  evidence?: string;
}

export interface QuestionGroup {
  title: string;
  type: QuestionType;
  instructionHtml: string;
  /** shared dropdown options for paragraph-matching / matching-* / sentence-endings / categorisation */
  options?: string[];
  /** optional key/legend shown above the group (e.g. heading list, category names, sentence endings) */
  legendHtml?: string;
  /** diagram-labelling: image + numbered pins, one per question */
  diagram?: DiagramSpec;
  /** multiple-answer: how many statements to select (= number of questions in the group) */
  selectCount?: number;
  /** multiple-answer: the labelled statements to choose from */
  choices?: { value: string; label: string }[];
  /** Post-submit review note for group-scored types (e.g. multiple-answer),
      shown once under the whole group. */
  explanationHtml?: string;
  questions: Question[];
}

export interface TestPart {
  label: string; // 'Passage 1' | 'Section 1'
  stimulus: Stimulus;
  groups: QuestionGroup[];
}

export interface PracticeTest {
  id: string;
  skill: TestSkill;
  title: string;
  description: string;
  durationMinutes: number;
  parts: TestPart[];
}

export function questionCount(test: PracticeTest): number {
  return test.parts.reduce(
    (sum, part) => sum + part.groups.reduce((s, g) => s + g.questions.length, 0),
    0,
  );
}

export function isCorrect(question: Question, given: string): boolean {
  // Free-form typing is stored raw, so normalise here: case, extra spaces
  // (including doubles between words), and curly apostrophes all forgiven.
  const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

/* Band thresholds carried over verbatim from the legacy player. */
export function bandEstimate(raw: number, total: number): string {
  const p = raw / total;
  if (p >= 0.92) return '8.5 – 9';
  if (p >= 0.77) return '7.5 – 8';
  if (p >= 0.62) return '6.5 – 7';
  if (p >= 0.46) return '5.5 – 6';
  if (p >= 0.38) return '5.0';
  return 'Below 5';
}

/** Midpoint of the band estimate range, for score-history charts. */
export function bandMidpoint(raw: number, total: number): number {
  const p = raw / total;
  if (p >= 0.92) return 8.75;
  if (p >= 0.77) return 7.75;
  if (p >= 0.62) return 6.75;
  if (p >= 0.46) return 5.75;
  if (p >= 0.38) return 5.0;
  return 4.0;
}
