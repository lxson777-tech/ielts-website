/* Generalized practice-test schema. Reading tests use a passage stimulus;
   future listening tests plug in an audio stimulus — the player's rendering
   of the stimulus pane is the only skill-specific branch. */

import { nt } from '../i18n/translate';

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
  /** Accepted answer(s). Compared the way an examiner reads them (case,
      spacing, British/American spelling, numbers in words or figures and
      so on are forgiven; see normalizeAnswer), never by "near enough". */
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
  /** How a number counts against `wordLimit`. Normally left out and read
      from the instruction (src/lib/tests/word-limit.ts): 'and-or' for
      "AND/OR A NUMBER" (a number does not count against the words), 'or' for
      "OR A NUMBER" (a word or a number), 'only' for "ONE NUMBER", 'none'
      when a number counts as a word. Set it only where the instruction text
      cannot be read reliably. */
  numberRule?: 'and-or' | 'or' | 'only' | 'none';
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

/** A piece of display text as a dictionary key plus the values to fill into
    it. Needed for text that is COMPOSED rather than written out, where the
    finished English sentence cannot itself be a dictionary key: a drill's
    name is built from a part label and a passage title, so the key has to be
    the template and the parts have to arrive as values. See
    src/lib/tests/drills.ts. */
export interface TranslatableText {
  /** The English template, marked with nt() where it is written. */
  key: string;
  /** Values for the key's `{placeholders}`. Passage titles and part labels
      are exam material and stay English inside a Russian sentence. */
  vars?: Record<string, string | number>;
}

export interface PracticeTest {
  id: string;
  skill: TestSkill;
  title: string;
  description: string;
  /** Present only when `title` was composed (drills). When it is absent the
      title is hand-written and is its own key. Read both through
      practiceTestTitle() rather than branching at the call site. */
  titleText?: TranslatableText;
  descriptionText?: TranslatableText;
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

/** The shape of `t` from useT(), passed in rather than imported so this
    module stays free of any i18n runtime (it is shared with the test data
    and the per-test JSON endpoint). */
export type TranslateFn = (text: string, vars?: Record<string, string | number>) => string;

/** A test's name in the student's language. A hand-authored title is its own
    key; a composed one (a drill) carries its template and values. Either way
    an untranslated title falls back to the English already on screen. */
export function practiceTestTitle(test: PracticeTest, t: TranslateFn): string {
  return test.titleText ? t(test.titleText.key, test.titleText.vars) : t(test.title);
}

/** The blurb under the name, same rule as practiceTestTitle(). */
export function practiceTestDescription(test: PracticeTest, t: TranslateFn): string {
  return test.descriptionText ? t(test.descriptionText.key, test.descriptionText.vars) : t(test.description);
}

export function questionCount(test: PracticeTest): number {
  return test.parts.reduce(
    (sum, part) => sum + part.groups.reduce((s, g) => s + g.questions.length, 0),
    0,
  );
}

/* ── How a typed answer is marked ────────────────────────────────────────────

   The rule is the one an IELTS examiner applies: the answer must be the right
   word or number, spelt correctly, but HOW it is written does not matter when
   the official marking scheme accepts both forms. Two layers do this:

   1. normalizeAnswer() removes formatting that an examiner ignores or that we
      forgive with a note (case, spacing, quotes, currency symbols, thousand
      commas, "%" vs "percent", a hyphen between two words, punctuation at the
      ends). The forgiving ones are listed in LENIENCY_RULES below so review
      can tell the student the exact form to write.
   2. foldEquivalentForms() then folds the forms IELTS itself treats as the
      SAME answer, silently, because writing either costs nothing on test day:
      British and American spelling, whole numbers in words or figures, the
      spacing or hyphens inside a phone number or long code, and a clock time
      written 10.45 pm or 10:45pm.

   What is deliberately NOT forgiven: a misspelling, a wrong plural or word
   form, a different number. Every fold below is a closed list or a strict
   pattern, never "near enough", so an answer that differs by one letter is
   still wrong unless that letter is a recognised spelling variant. Everything
   is a handful of precompiled regular expressions and one map lookup per
   word, so marking a whole paper in the browser stays instant. */

/* IELTS accepts British and American spellings of the same word, so a student
   who writes "color" against a key that prints "colour" has earned the mark.
   A curated pair list, not a suffix rule: "-our to -or" would also turn "four"
   into "for", and "-ise to -ize" would turn "advertise" into a word that does
   not exist. Each entry maps the British form to the American one, and both
   sides of a comparison are folded to the American form before matching.

   A pair is left OUT when the American form is also a different, common word,
   because folding it would accept the wrong word: cheque/check ("a security
   check"), draught/draft ("a first draft"), kerb/curb ("to curb spending") and
   storey/story ("a short story"). */
const SPELLING_PAIRS: Record<string, string> = {
  colour: 'color', colours: 'colors', coloured: 'colored', colourful: 'colorful',
  colourless: 'colorless',
  favour: 'favor', favours: 'favors', favoured: 'favored', favourite: 'favorite',
  favourites: 'favorites', favourable: 'favorable',
  behaviour: 'behavior', behaviours: 'behaviors', behavioural: 'behavioral',
  labour: 'labor', labours: 'labors', laboured: 'labored', labourer: 'laborer', labourers: 'laborers',
  neighbour: 'neighbor', neighbours: 'neighbors', neighbourhood: 'neighborhood',
  neighbourhoods: 'neighborhoods', neighbouring: 'neighboring',
  harbour: 'harbor', harbours: 'harbors', flavour: 'flavor', flavours: 'flavors', flavoured: 'flavored',
  humour: 'humor', odour: 'odor', odours: 'odors', vapour: 'vapor', vapours: 'vapors',
  rumour: 'rumor', rumours: 'rumors', armour: 'armor', honour: 'honor', honours: 'honors',
  honourable: 'honorable', endeavour: 'endeavor', endeavours: 'endeavors', parlour: 'parlor',
  saviour: 'savior', splendour: 'splendor', tumour: 'tumor', tumours: 'tumors', vigour: 'vigor',
  rigour: 'rigor', clamour: 'clamor', demeanour: 'demeanor', candour: 'candor',
  centre: 'center', centres: 'centers', centred: 'centered', metre: 'meter', metres: 'meters',
  kilometre: 'kilometer', kilometres: 'kilometers', centimetre: 'centimeter', centimetres: 'centimeters',
  millimetre: 'millimeter', millimetres: 'millimeters', millilitre: 'milliliter', millilitres: 'milliliters',
  litre: 'liter', litres: 'liters', theatre: 'theater', theatres: 'theaters',
  fibre: 'fiber', fibres: 'fibers', calibre: 'caliber', sombre: 'somber', lustre: 'luster',
  meagre: 'meager', spectre: 'specter', manoeuvre: 'maneuver', manoeuvres: 'maneuvers',
  defence: 'defense', defences: 'defenses', offence: 'offense', offences: 'offenses',
  pretence: 'pretense', licence: 'license', licences: 'licenses',
  practise: 'practice', practised: 'practiced', practising: 'practicing',
  analyse: 'analyze', analysed: 'analyzed', analyses: 'analyzes', analysing: 'analyzing',
  paralyse: 'paralyze', paralysed: 'paralyzed', catalyse: 'catalyze',
  catalogue: 'catalog', catalogues: 'catalogs', catalogued: 'cataloged', dialogue: 'dialog',
  dialogues: 'dialogs', analogue: 'analog',
  programme: 'program', programmes: 'programs',
  grey: 'gray', tyre: 'tire', tyres: 'tires', plough: 'plow', ploughs: 'plows', mould: 'mold',
  moulds: 'molds', mouldy: 'moldy', aluminium: 'aluminum', jewellery: 'jewelry',
  jeweller: 'jeweler', jewellers: 'jewelers', sulphur: 'sulfur', cosy: 'cozy', doughnut: 'donut',
  doughnuts: 'donuts',
  travelled: 'traveled', travelling: 'traveling', traveller: 'traveler', travellers: 'travelers',
  cancelled: 'canceled', cancelling: 'canceling', labelled: 'labeled', labelling: 'labeling',
  modelled: 'modeled', modelling: 'modeling', fuelled: 'fueled', fuelling: 'fueling',
  levelled: 'leveled', levelling: 'leveling', signalled: 'signaled', signalling: 'signaling',
  marvellous: 'marvelous', counsellor: 'counselor', counsellors: 'counselors',
  counselling: 'counseling', stencilled: 'stenciled', stencilling: 'stenciling',
  totalled: 'totaled', dialled: 'dialed', channelled: 'channeled', tunnelled: 'tunneled',
  quarrelled: 'quarreled', woollen: 'woolen', woollens: 'woolens',
  enrol: 'enroll', enrols: 'enrolls', enrolment: 'enrollment', enrolments: 'enrollments',
  skilful: 'skillful', wilful: 'willful', fulfil: 'fulfill', fulfils: 'fulfills',
  fulfilment: 'fulfillment', instalment: 'installment', instalments: 'installments',
  distil: 'distill', ageing: 'aging', judgement: 'judgment', judgements: 'judgments',
  pyjamas: 'pajamas', sceptical: 'skeptical', sceptic: 'skeptic', moustache: 'mustache',
  aeroplane: 'airplane', aeroplanes: 'airplanes', foetus: 'fetus', oestrogen: 'estrogen',
  paediatric: 'pediatric', paediatrician: 'pediatrician', anaesthetic: 'anesthetic',
  haemoglobin: 'hemoglobin', orthopaedic: 'orthopedic', encyclopaedia: 'encyclopedia',
  archaeology: 'archeology', archaeologist: 'archeologist', archaeologists: 'archeologists',
  archaeological: 'archeological', mediaeval: 'medieval',
};

/* The -ise / -ize family, generated rather than typed out, but ONLY for these
   stems. Many common -ise words have no -ize form at all (advertise, advise,
   exercise, compromise, surprise, revise, supervise), which is why this is a
   list and not a rule. Each stem gets its usual endings: organise, organised,
   organises, organising, organiser(s), organisation(s), organisational. */
const ISE_STEMS = [
  'organ', 'reorgan', 'disorgan', 'real', 'recogn', 'special', 'fertil', 'civil', 'global',
  'urban', 'industrial', 'modern', 'privat', 'minim', 'maxim', 'apolog', 'emphas', 'summar',
  'categor', 'priorit', 'util', 'standard', 'character', 'memor', 'steril', 'immun', 'hospital',
  'colon', 'harmon', 'mobil', 'immobil', 'optim', 'final', 'author', 'local', 'symbol', 'stabil',
  'sympath', 'visual', 'capital', 'social', 'hypothes', 'jeopard', 'legal', 'neutral', 'normal',
  'public', 'scrutin', 'subsid', 'synthes', 'vapor', 'energ', 'computer', 'digit', 'commercial',
  'central', 'decentral', 'personal', 'critic', 'familiar', 'general', 'material', 'monopol',
  'pressur', 'revolution', 'sanit', 'secular', 'national', 'international', 'rational', 'motor',
  'mechan', 'equal', 'fossil', 'pasteur', 'vandal', 'item', 'custom', 'patron', 'agon',
  'antagon', 'bapt', 'dramat', 'econom', 'galvan', 'magnet', 'metabol', 'polar', 'popular',
  'random', 'regular', 'terror', 'theor', 'trivial', 'vital', 'human', 'sensit', 'desensit',
  'demoral', 'democrat', 'fantas', 'mesmer', 'ostrac', 'philosoph', 'plagiar', 'pulver',
  'western', 'token', 'container', 'miniatur', 'caramel',
];
const ISE_ENDINGS: [british: string, american: string][] = [
  ['ise', 'ize'], ['ised', 'ized'], ['ises', 'izes'], ['ising', 'izing'], ['iser', 'izer'],
  ['isers', 'izers'], ['isation', 'ization'], ['isations', 'izations'], ['isational', 'izational'],
];
for (const stem of ISE_STEMS) {
  for (const [british, american] of ISE_ENDINGS) {
    SPELLING_PAIRS[stem + british] ??= stem + american;
  }
}

/** British form to American form, read-only. Exported for the key-check
    script (tools/marker-key-check.mjs), which uses it to generate the
    variants a student might type. */
export const SPELLING_VARIANTS: Readonly<Record<string, string>> = SPELLING_PAIRS;

/* Spellings that differ by a hyphen or a space at the start of the word, so a
   one-word map cannot see them: co-operate / cooperate, co-ordinator /
   coordinator, e-mail / email. Both forms are standard and an examiner takes
   either, so this is a spelling fold, not a forgiven hyphen. The pattern runs
   on text where a hyphen may already have become a space. */
const PREFIX_COMPOUNDS = /\b(co)[- ]?(operat|ordinat|educat)|\b(e)[- ]?(mail)/g;

/* Whole numbers written as words count the same as figures ("three" = "3"),
   as the IELTS marking scheme accepts either. One to a hundred is covered,
   including "twenty-one" / "twenty one" and "a hundred" / "one hundred".
   "a" and "an" on their own are NEVER read as 1: "a bedroom" is not
   "1 bedroom" for this marker. */
const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
  'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const NUMBER_WORD_RE = new RegExp(
  `\\b(?:(?:a|one)[ -]hundred|(${TENS.slice(2).join('|')})(?:[ -](${UNITS.slice(1, 10).join('|')}))?|(${UNITS.join('|')}))\\b`,
  'g',
);
function foldNumberWords(s: string): string {
  return s.replace(NUMBER_WORD_RE, (whole, tens: string | undefined, unit: string | undefined, single: string | undefined) => {
    if (tens) return String(TENS.indexOf(tens) * 10 + (unit ? UNITS.indexOf(unit) : 0));
    if (single) return String(UNITS.indexOf(single));
    return whole.endsWith('hundred') ? '100' : whole;
  });
}

/* A phone number, account number or long code is the same answer with or
   without the spaces or hyphens between its digit groups: "0207 946 0321" =
   "02079460321" = "0207-946-0321". Only runs of SEVEN or more digits are
   joined, so short things that look alike but mean something different keep
   their separator: an age range "5-12" is not "512", and "10 12" is two
   numbers. A year range such as "1990-1995" is also left as it is. */
const DIGIT_GROUPS_RE = /\d+(?:[ -]+\d+)+/g;
const YEAR_RANGE_RE = /^(?:1\d|20)\d\d\s*-\s*(?:1\d|20)\d\d$/;
function joinDigitGroups(s: string): string {
  return s.replace(DIGIT_GROUPS_RE, (run) => {
    const digits = run.replace(/[ -]+/g, '');
    if (digits.length < 7 || YEAR_RANGE_RE.test(run)) return run;
    return digits;
  });
}

/* A clock time is written 10.45 or 10:45 in IELTS answers, and both are
   right. But a bare "4.50" may just as well be a price, and "4:50" is not a
   way to write £4.50, so the dot and the colon are only folded when am or pm
   follows and the answer can only be a time ("7.30 pm" = "7:30pm"). A bare
   time key that should also take the colon form lists it in the data, as the
   Listening review of 3 October 2026 did for the clock-time questions. */
const CLOCK_TIME_RE = /(?<![\d.:])([01]?\d|2[0-3])[.:]([0-5]\d)(?=\s*[ap]\.?m\b)/g;
/* "9.30am", "9.30 am" and "9.30 a.m." are one time; only the spacing and dots
   of am/pm are folded, never the letters, so "am" and "pm" stay different. */
const AM_PM_RE = /(?<=\d)\s*([ap])\.?m\b\.?/g;

function foldSpelling(s: string): string {
  return s
    .replace(PREFIX_COMPOUNDS, (_whole, co?: string, coRest?: string, e?: string, mail?: string) =>
      co ? `${co}${coRest}` : `${e}${mail}`)
    .replace(/[a-z]+/g, (word) => SPELLING_PAIRS[word] ?? word);
}

/** The forms IELTS treats as the same answer, folded to one form. Applied to
    BOTH the key and what the student typed, after lower-casing, so neither
    direction is favoured. Pure and deterministic. */
function foldEquivalentForms(s: string): string {
  return joinDigitGroups(foldNumberWords(foldSpelling(s)).replace(/(?<=\d) *- *(?=\d)/g, '-'))
    .replace(CLOCK_TIME_RE, '$1:$2')
    .replace(AM_PM_RE, ' $1m');
}

/** The form a typed answer is compared in. Exported so any other place that
    marks a typed answer (lesson practice, for one) can compare exactly as
    the tests do; prefer answerMatches() where a whole key is at hand. */
export function normalizeAnswer(s: string): string {
  // Free-form typing is stored raw, so we mark on content, not formatting.
  // Forgiven: case; extra/doubled spaces; curly vs straight quotes and dashes;
  // thousand-separator commas (5000 vs 5,000); currency symbols ($50 vs 50);
  // "%" vs "percent"/"per cent"; hyphenated vs spaced compounds (well-known vs
  // well known); and any leading/trailing punctuation or quote marks. Then
  // the forms IELTS treats as identical are folded (foldEquivalentForms).
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
  return foldEquivalentForms(out);
}

/** True when `given` would earn the mark against any of `accepted`, using the
    same comparison as the test player. Shared so every place that marks a
    typed answer (focused exercises, drills, lesson practice) agrees with the
    full paper. An empty answer never matches. */
export function answerMatches(given: string, accepted: string | readonly string[]): boolean {
  const g = normalizeAnswer(given);
  if (g === '') return false;
  const pool = typeof accepted === 'string' ? [accepted] : accepted;
  return pool.some((a) => normalizeAnswer(a) === g);
}

/* Everything normalizeAnswer forgives beyond case and stray spaces, in the
   order we test it. Case and spacing are safe to forgive silently (an examiner
   ignores them too); the rest are real differences from the printed key, so
   when one of them is what saved the answer the student is told, rather than
   being trained into a habit a real examiner may reject. */
/* The notes are read out to the student in the review panel, so they are
   marked with nt(): the English is stored here unchanged (these strings are
   also what tests/answer-leniency.test.ts asserts on) and translated where it
   is rendered, in AnswerReview inside src/components/TestPlayer.tsx. */
const LENIENCY_RULES: { note: string; apply: (s: string) => string }[] = [
  { note: nt('the currency symbol'), apply: (s) => s.replace(/[£$€]/g, '') },
  { note: nt('the comma inside the number'), apply: (s) => s.replace(/(?<=\d),(?=\d)/g, '') },
  {
    note: nt('writing percent out in words instead of using the % sign'),
    apply: (s) => s.replace(/per\s*cent/g, 'percent').replace(/%/g, ' percent').replace(/\s+/g, ' ').trim(),
  },
  { note: nt('the hyphen'), apply: (s) => s.replace(/(?<=[a-z])-(?=[a-z])/g, ' ') },
  { note: nt('the quotation marks'), apply: (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"') },
  {
    note: nt('the punctuation you added'),
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

  // The forms IELTS treats as identical (spelling variants, a number in words
  // or figures, digit-group spacing, 10.45 pm vs 10:45pm) are folded first, on both
  // sides, so they never produce a note: they are not forgiveness.
  let g = foldEquivalentForms(foldCaseAndSpace(given));
  let e = foldEquivalentForms(foldCaseAndSpace(match));
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
  // Folded once more, because a rule (stripping a final full stop, say) can
  // be what lets an equivalent form be recognised: "10.45 a.m." loses its
  // final full stop before it can be read as "10:45 am".
  const same = g === e || foldEquivalentForms(g) === foldEquivalentForms(e);
  return same && forgiven.length > 0 ? { expected: match, forgiven } : null;
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

/* IELTS Academic Reading raw-score to band conversion, the table published in
   IDP and British Council material (a representative table; the real
   cut-offs vary a point either way between test versions). It matches the
   four reference points ielts.org gives: 15 = 5.0, 23 = 6.0, 30 = 7.0,
   35 = 8.0. In full: 39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, 33-34 = 7.5,
   30-32 = 7.0, 27-29 = 6.5, 23-26 = 6.0, 19-22 = 5.5, 15-18 = 5.0,
   13-14 = 4.5, 10-12 = 4.0, then 8-9 = 3.5, 6-7 = 3.0, 4-5 = 2.5.
   Each entry is [minimum raw out of 40, band]; the first row whose minimum
   the score meets wins. The Academic table is used rather than the General
   Training one (which needs more correct answers for the same band) because
   every passage on this site is Academic-style. */
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

/* IELTS Listening raw-score to band conversion, the widely published table
   (IDP and British Council material), which matches the four reference
   points ielts.org gives: 16 = 5.0, 23 = 6.0, 30 = 7.0, 35 = 8.0. In full:
   39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, 32-34 = 7.5, 30-31 = 7.0,
   26-29 = 6.5, 23-25 = 6.0, 18-22 = 5.5, 16-17 = 5.0, 13-15 = 4.5,
   10-12 = 4.0, then 8-9 = 3.5, 6-7 = 3.0, 4-5 = 2.5. Band 4.0 starts at 10
   (until 3 October 2026 it started at 11, one point stricter than the
   published table). As with Reading, precise cut-offs vary slightly by test. */
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

export function listeningBand(raw: number, total: number): number {
  const scaled = total === 40 ? raw : Math.round((raw / total) * 40);
  for (const [minRaw, band] of LISTENING_BAND_TABLE) if (scaled >= minRaw) return band;
  return 0;
}

export function testBand(raw: number, total: number, skill: TestSkill = 'reading'): number {
  return skill === 'listening' ? listeningBand(raw, total) : readingBand(raw, total);
}

/** Display label for a result, e.g. "7.0" (callers supply the "Band" prefix).
    The one worded case is marked with nt() and translated where it is shown
    (a stored attempt keeps the English, so old history stays readable). */
export function bandEstimate(raw: number, total: number, skill: TestSkill = 'reading'): string {
  const band = testBand(raw, total, skill);
  return band >= 2.5 ? band.toFixed(1) : nt('below 2.5');
}

/** Numeric band for score-history charts and best-band comparisons. */
export function bandMidpoint(raw: number, total: number, skill: TestSkill = 'reading'): number {
  return testBand(raw, total, skill);
}
