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
  | 'diagram-labelling'
  | 'table-completion'; // table/flow-chart grid with blanks

export interface DiagramSpec {
  image: string; // path under /public, prefixed with base at render
  alt: string;
  /** one marker per question in the group, in order; x/y are % of the image box */
  markers: { x: number; y: number }[];
}

export type TableCell = string | { questionId: string };

export interface TableSpec {
  /** optional header labels, one per column */
  headerRow?: string[];
  /** each row is an array of cells: plain text, or a blank tied to a question id */
  rows: TableCell[][];
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
  /** table-completion: a table grid with blanks wired to question ids */
  table?: TableSpec;
  /** Free-text groups only (sentence-completion / diagram-labelling /
      table-completion): the stated word limit, e.g. 2 for "NO MORE THAN TWO
      WORDS". Drives the live word-count warning in the player. */
  wordLimit?: number;
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
  // Free-form typing is stored raw, so we mark on content, not formatting.
  // Forgiven: case; extra/doubled spaces; curly vs straight quotes and dashes;
  // thousand-separator commas (5000 vs 5,000); currency symbols ($50 vs 50);
  // "%" vs "percent"/"per cent"; hyphenated vs spaced compounds (well-known vs
  // well known); and any leading/trailing punctuation or quote marks.
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‒–—―−]/g, '-')
      .replace(/[£$€]/g, '')
      .replace(/(?<=\d),(?=\d)/g, '')
      .replace(/per\s*cent/g, 'percent')
      .replace(/%/g, ' percent')
      .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .replace(/[.,;:!?]+$/, '')
      .trim();
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  return accepted.some((a) => norm(a) === norm(given));
}

/* Official IELTS Academic Reading raw-score → band conversion, as published
   by the test owners (a representative table; the real cut-offs vary a point
   either way between versions). Each entry is [minimum raw out of 40, band];
   the first row whose minimum the score meets wins. Replaces the old coarse
   percentage buckets, which returned a full-band-wide range like "6.5 – 7"
   and read a whole band low around the boundaries (e.g. 30/40 is Band 7, but
   the old curve showed "6.5 – 7"). Academic only — General Training reading
   uses a more lenient table and the app's passages are Academic-style. */
const READING_BAND_TABLE: [minRaw: number, band: number][] = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [33, 7.5],
  [30, 7.0],
  [27, 6.5],
  [23, 6.0],
  [19, 5.5],
  [15, 5.0],
  [13, 4.5],
  [10, 4.0],
  [8, 3.5],
  [6, 3.0],
  [4, 2.5],
];

/** Exact Academic Reading band for a raw score. The official table is defined
    over 40 questions, so shorter single-passage drills are scaled onto the
    same curve (raw → nearest /40 equivalent) to stay comparable. Returns 0 for
    a score below the lowest tabulated band. */
export function readingBand(raw: number, total: number): number {
  const scaled = total === 40 ? raw : Math.round((raw / total) * 40);
  for (const [minRaw, band] of READING_BAND_TABLE) if (scaled >= minRaw) return band;
  return 0;
}

/** Display label for a result, e.g. "7.0" (callers supply the "Band" prefix). */
export function bandEstimate(raw: number, total: number): string {
  const band = readingBand(raw, total);
  return band >= 2.5 ? band.toFixed(1) : 'below 2.5';
}

/** Numeric band for score-history charts and best-band comparisons. */
export function bandMidpoint(raw: number, total: number): number {
  return readingBand(raw, total);
}
