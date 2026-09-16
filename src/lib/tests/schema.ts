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
  /** Legacy per-part recording. Full listening tests should use
      PracticeTest.audioSrc so playback survives moving between parts. */
  src?: string;
  /** Sanitized original question layout shown above this part's inputs. */
  questionHtml?: string;
  transcriptHtml?: string;
  /** Where this part's audio begins/ends inside the shared recording
      (seconds). Used by the Listening Trainer's drill mode to jump straight
      to a part and stop at its end, without needing a separate audio file
      per part. Undefined means "play the whole shared recording". */
  startSeconds?: number;
  endSeconds?: number;
}

export type Stimulus = PassageStimulus | AudioStimulus;

export interface Question {
  id: string;
  /** False only when the authorized publisher source omits the question body.
      The numbered slot stays visible, but cannot lower the student's score. */
  scored?: boolean;
  textHtml?: string;
  /** sentence-completion: text around the inline input */
  before?: string;
  after?: string;
  /** multiple-choice: per-question options */
  options?: string[];
  /** Accepted answer(s); comparison is case-insensitive and trimmed. */
  answer: string | string[];
  /** One numbered question that requires several choices. The whole unordered
      set must match for this question to earn its single mark. This is
      intentionally separate from `answer`, where an array means alternative
      accepted spellings, and from `answerPairId`, where several numbered
      questions share an answer pool. */
  multiSelect?: {
    correctValues: string[];
    selectCount: number;
  };
  /** Questions sharing this id form an unordered answer pair. Each distinct
      correct selection earns one mark, regardless of which slot contains it. */
  answerPairId?: string;
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
  /** One complete recording for all four listening parts. */
  audioSrc?: string;
  /** Attribution for imported tests whose publisher authorized reuse. */
  source?: {
    name: string;
    url: string;
    permission: string;
  };
  parts: TestPart[];
}

export function questionCount(test: PracticeTest): number {
  return test.parts.reduce(
    (sum, part) => sum + part.groups.reduce((s, g) => s + g.questions.length, 0),
    0,
  );
}

/* IELTS accepts British and American spellings of the same word, so a student
   who writes "color" against a key that prints "colour" has earned the mark.
   A curated pair list, not a suffix rule: "-our to -or" would also turn "four"
   into "for". Each entry maps the British form to the American one, and both
   sides of a comparison are folded to the American form before matching. */
const SPELLING_PAIRS: Record<string, string> = {
  colour: 'color', colours: 'colors', coloured: 'colored', colourful: 'colorful',
  favour: 'favor', favours: 'favors', favourite: 'favorite', favourable: 'favorable',
  behaviour: 'behavior', behaviours: 'behaviors', labour: 'labor', labours: 'labors',
  neighbour: 'neighbor', neighbours: 'neighbors', neighbourhood: 'neighborhood',
  harbour: 'harbor', harbours: 'harbors', flavour: 'flavor', flavours: 'flavors',
  humour: 'humor', odour: 'odor', odours: 'odors', vapour: 'vapor', vapours: 'vapors',
  rumour: 'rumor', rumours: 'rumors', armour: 'armor', honour: 'honor', honours: 'honors',
  centre: 'center', centres: 'centers', metre: 'meter', metres: 'meters',
  litre: 'liter', litres: 'liters', theatre: 'theater', theatres: 'theaters',
  fibre: 'fiber', fibres: 'fibers', defence: 'defense', offence: 'offense',
  licence: 'license', practise: 'practice', practised: 'practiced', practising: 'practicing',
  analyse: 'analyze', analysed: 'analyzed', organise: 'organize', organised: 'organized',
  organisation: 'organization', organisations: 'organizations', realise: 'realize',
  realised: 'realized', recognise: 'recognize', recognised: 'recognized',
  specialise: 'specialize', specialised: 'specialized', catalogue: 'catalog',
  catalogues: 'catalogs', dialogue: 'dialog', programme: 'program', programmes: 'programs',
  grey: 'gray', tyre: 'tire', tyres: 'tires', plough: 'plow', mould: 'mold', moulds: 'molds',
  storey: 'story', storeys: 'stories', aluminium: 'aluminum', jewellery: 'jewelry',
  travelled: 'traveled', travelling: 'traveling', traveller: 'traveler', travellers: 'travelers',
  cancelled: 'canceled', cancelling: 'canceling', labelled: 'labeled', labelling: 'labeling',
  modelling: 'modeling', fuelled: 'fueled', woollen: 'woolen', enrol: 'enroll',
  skilful: 'skillful', fulfil: 'fulfill', instalment: 'installment', ageing: 'aging',
  judgement: 'judgment', cheque: 'check', draught: 'draft', kerb: 'curb', pyjamas: 'pajamas',
  sceptical: 'skeptical', moustache: 'mustache', aeroplane: 'airplane',
};

function foldSpelling(s: string): string {
  return s.replace(/[a-z]+/g, (word) => SPELLING_PAIRS[word] ?? word);
}

function normalizeAnswer(s: string): string {
  // Free-form typing is stored raw, so we mark on content, not formatting.
  // Forgiven: case; British vs American spelling (both are officially
  // accepted); extra/doubled spaces; curly vs straight quotes and dashes;
  // thousand-separator commas (5000 vs 5,000); currency symbols ($50 vs 50);
  // "%" vs "percent"/"per cent"; hyphenated vs spaced compounds (well-known vs
  // well known); and any leading/trailing punctuation or quote marks.
  const out = s
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
  return foldSpelling(out);
}

/* Everything normalizeAnswer forgives beyond case and stray spaces, in the
   order we test it. Case and spacing are safe to forgive silently (an examiner
   ignores them too); the rest are real differences from the printed key, so
   when one of them is what saved the answer the student is told, rather than
   being trained into a habit a real examiner may reject. */
const LENIENCY_RULES: { note: string; apply: (s: string) => string }[] = [
  { note: 'the currency symbol', apply: (s) => s.replace(/[£$€]/g, '') },
  { note: 'the comma inside the number', apply: (s) => s.replace(/(?<=\d),(?=\d)/g, '') },
  {
    note: 'writing percent out in words instead of using the % sign',
    apply: (s) => s.replace(/per\s*cent/g, 'percent').replace(/%/g, ' percent').replace(/\s+/g, ' ').trim(),
  },
  { note: 'the hyphen', apply: (s) => s.replace(/(?<=[a-z])-(?=[a-z])/g, ' ') },
  { note: 'the quotation marks', apply: (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"') },
  {
    note: 'the punctuation you added',
    apply: (s) => s.replace(/^["']+|["']+$/g, '').replace(/[.,;:!?]+$/, '').trim(),
  },
];

function foldCaseAndSpace(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export interface AnswerLeniency {
  /** The exact form to write in the real test, straight from the key. */
  expected: string;
  /** Plain-language list of what our marker let through. */
  forgiven: string[];
}

/** Why an answer we accepted would not have matched the printed key exactly.
    Returns null when the answer is wrong, when it matches the key apart from
    case and spacing (which cost nothing in the real test), or when it is a
    multi-select question, where there is nothing to spell. */
export function answerLeniency(question: Question, given: string): AnswerLeniency | null {
  if (question.multiSelect) return null;
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  const match = accepted.find((a) => normalizeAnswer(a) === normalizeAnswer(given));
  if (match === undefined) return null;

  let g = foldCaseAndSpace(given);
  let e = foldCaseAndSpace(match);
  const forgiven: string[] = [];
  for (const rule of LENIENCY_RULES) {
    if (g === e) break;
    const ng = rule.apply(g);
    const ne = rule.apply(e);
    // Only a rule that changes ONE side is doing the forgiving: if it rewrites
    // both the same way, the two forms already agreed on that point.
    if ((ng !== g) !== (ne !== e)) forgiven.push(rule.note);
    g = ng;
    e = ne;
  }
  return g === e && forgiven.length > 0 ? { expected: match, forgiven } : null;
}

/** The other wordings the key also accepts, so review can show them. Empty for
    a single-answer key. */
export function acceptedVariants(question: Question): string[] {
  if (question.multiSelect || !Array.isArray(question.answer)) return [];
  return question.answer.length > 1 ? [...question.answer] : [];
}

export function isCorrect(question: Question, given: string): boolean {
  if (question.multiSelect) {
    const selected = new Set(
      given
        .split('|')
        .map(normalizeAnswer)
        .filter(Boolean),
    );
    const correct = new Set(question.multiSelect.correctValues.map(normalizeAnswer));
    return selected.size === correct.size && [...selected].every((value) => correct.has(value));
  }
  const accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
  return accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(given));
}

/** Return the question ids that earn marks, including unordered answer pairs.
    Repeating one correct choice in both slots earns one mark, while entering
    the two correct choices in either order earns both marks. */
export function scoredQuestionIds(questions: Question[], answers: Record<string, string>): Set<string> {
  const scored = new Set<string>();
  const pairs = new Map<string, Question[]>();

  for (const question of questions) {
    if (question.scored === false) continue;
    if (question.answerPairId) {
      const pair = pairs.get(question.answerPairId) ?? [];
      pair.push(question);
      pairs.set(question.answerPairId, pair);
    } else if (isCorrect(question, answers[question.id] ?? '')) {
      scored.add(question.id);
    }
  }

  for (const pair of pairs.values()) {
    const accepted = new Set(
      pair.flatMap((question) => (Array.isArray(question.answer) ? question.answer : [question.answer]))
        .map(normalizeAnswer),
    );
    const used = new Set<string>();
    for (const question of pair) {
      const given = normalizeAnswer(answers[question.id] ?? '');
      if (given && accepted.has(given) && !used.has(given)) {
        used.add(given);
        scored.add(question.id);
      }
    }
  }

  return scored;
}

/* Official IELTS Academic Reading raw-score → band conversion, as published
   by the test owners (a representative table; the real cut-offs vary a point
   either way between versions). Each entry is [minimum raw out of 40, band];
   the first row whose minimum the score meets wins. Replaces the old coarse
   percentage buckets, which returned a full-band-wide range like "6.5 – 7"
   and read a whole band low around the boundaries (e.g. 30/40 is Band 7, but
   the old curve showed "6.5 – 7"). Academic Reading curve.
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

/* IELTS's published Listening guide gives the representative boundaries for
   Bands 4 to 9. As with Reading, precise cut-offs can vary slightly by test. */
const LISTENING_BAND_TABLE: [minRaw: number, band: number][] = [
  [39, 9.0],
  [37, 8.5],
  [35, 8.0],
  [32, 7.5],
  [30, 7.0],
  [26, 6.5],
  [23, 6.0],
  [18, 5.5],
  [16, 5.0],
  [13, 4.5],
  [11, 4.0],
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

export function listeningBand(raw: number, total: number): number {
  const scaled = total === 40 ? raw : Math.round((raw / total) * 40);
  for (const [minRaw, band] of LISTENING_BAND_TABLE) if (scaled >= minRaw) return band;
  return 0;
}

export function testBand(raw: number, total: number, skill: TestSkill = 'reading'): number {
  return skill === 'listening' ? listeningBand(raw, total) : readingBand(raw, total);
}

/** Display label for a result, e.g. "7.0" (callers supply the "Band" prefix). */
export function bandEstimate(raw: number, total: number, skill: TestSkill = 'reading'): string {
  const band = testBand(raw, total, skill);
  return band >= 2.5 ? band.toFixed(1) : 'below 2.5';
}

/** Numeric band for score-history charts and best-band comparisons. */
export function bandMidpoint(raw: number, total: number, skill: TestSkill = 'reading'): number {
  return testBand(raw, total, skill);
}
