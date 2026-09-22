/* The judgement calls behind one written focused task, with no DOM in them.
 *
 * WHY A PLAIN .ts FILE
 * The same split as ./focused-exercise.ts: tests/ts-extension-loader.mjs
 * strips TypeScript types for node:test but does not transform JSX, so
 * anything a test imports directly must be free of it. The component is
 * glue; everything that decides what a student's writing MEANS lives here
 * where it can be tested with no browser.
 *
 * THE FOUR RULES THIS FILE EXISTS TO KEEP
 * 1. A gap is found from EVIDENCE, never from a guess. Either the marker
 *    said something about the overview, in which case the student is shown
 *    the marker's own sentence word for word, or a plain visible check of
 *    their own text found something, in which case it is called a check and
 *    not a judgement, or nothing is known and it says so.
 * 2. Nothing here is ever a band. Not the verdict, not the checks, not the
 *    wording. A reply with a number in it is refused and the automatic
 *    checks are shown instead, because this platform has calibrated graders
 *    and a cheap number beside them would be believed.
 * 3. Help makes an attempt assisted, for good. Opening the prompt's guiding
 *    questions, reading the model overview and being talked through the
 *    work by Mr EZ all raise the level, and it never comes back down.
 * 4. The student's words are never lost. The draft store below is written
 *    on every keystroke and survives a failed evaluation, a closed tab and
 *    a refused write, and it keeps the original beside the revision so the
 *    two can be read as before and after.
 */

import { countWords } from '../../lib/writing/mechanics';
import type { WrittenCheckId } from '../../data/focused-exercises';
import type { Paper, Subskill } from '../../lib/learning/contracts/catalog';
import type { AssistanceLevel, CompletionState, EvidenceMode } from '../../lib/learning/contracts/evidence';
import type { EvidenceDraft, ItemOutcomeDraft } from '../../lib/learning/evidence';
import { promptExposureKey } from '../../lib/learning/evidence';
import { raise } from './focused-exercise';

/* ── What the page hands the component ───────────────────────────────────── */

export interface WrittenTaskView {
  exerciseId: string;
  /** `focus:<exerciseId>`, the catalogue id every event is written against. */
  activityId: string;
  contentVersion: number;
  role: 'guided-practice' | 'independent-check';
  paper: Paper;
  subskill: Subskill;
  title: string;
  /** THE sentence the work is judged against, and the only one. Shown to
      the student, because they are owed the standard they are held to, and
      read by the Worker from the catalogue rather than from the request. */
  objective: string;
  /** What to do, in the student's own terms. */
  instruction: string;
  expectedMinutes: number;
  minWords: number;
  maxWords: number;
  checks: readonly WrittenCheckId[];
  /** The prompt, exactly as the Writing trainer shows it: the publisher's
      own wording and their own chart, in their own markup. */
  promptId: string;
  promptTitle: string;
  promptHtml: string;
  /** chart, process, map, table, combination. */
  form: string;
  attribution: string;
  /** The one item every attempt on this task is recorded against, which is
      what links a revision to the attempt it revises. */
  itemId: string;
  /** The prompt's own "Build your overview" questions, written by an IELTS
      teacher on 19 September 2026 to lead a student to their own answer.
      Empty on a check: that is what makes a check a check. */
  guidingQuestions: readonly string[];
  /** The band 8 model's overview paragraph. Never rendered before the
      student's own attempt; after one it is "one way to write it". */
  modelOverview: string | null;
  noticeInTheModel: readonly string[];
  /** The teaching block this practises, resolved at build time exactly as
      an item-answers exercise resolves it. */
  lessonHref?: string;
  lessonKey?: string;
  blockId: string;
  blockHeading: string;
  blockText: string;
  /* ── WP20 additions, sentence correction only. Absent on every other
     task, which renders exactly as it did before. ── */
  /** The broken sentence the student is shown and corrects. */
  correctionSentence?: string;
  /** What was wrong with it, shown after the attempt alongside it, never as
      a rewritten "correct" version (see writing-sentence-correction.ts). */
  correctionNote?: string;
  /** What to ask for once the correction is submitted, to check the pattern
      on a sentence the student writes themselves. */
  transferPrompt?: string;
}

/* ── Reading the band 8 model ────────────────────────────────────────────── */

/** Sentence openings that announce a summary rather than a detail. Used in
    two places: finding the overview inside a model answer, and the
    automatic check on the student's own text. Kept as one list so the
    check and the model agree about what an overview sounds like. */
const SUMMARISING_OPENERS =
  /^\s*(overall|in general|generally speaking|broadly|in summary|to summarise|taken as a whole|it is (immediately )?clear that|the most (striking|noticeable|obvious|significant) )/i;

/** Split text into sentences. Crude on purpose: an overview is one or two
    of them, and a splitter that handled every edge case would be a bigger
    thing than the feature it serves. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/** The overview paragraph of a band 8 Task 1 model answer.
 *
 *  Deterministic and checkable rather than positional: the paragraph that
 *  OPENS with a summarising word is the overview, and every Task 1 model in
 *  the library has exactly one. Falls back to the second paragraph, which
 *  is where the four paragraph method puts it, and to null when there is no
 *  second paragraph at all rather than offering the introduction as though
 *  it were the overview. */
export function modelOverviewOf(paragraphs: readonly string[]): string | null {
  const signalled = paragraphs.find((paragraph) => SUMMARISING_OPENERS.test(paragraph));
  if (signalled) return signalled.trim();
  return paragraphs[1]?.trim() ?? null;
}

/** "One way to write it" for any of the WP20 objectives: the model
    paragraph at a fixed position (every band 8 model in the library runs
    introduction, overview, first detail or body paragraph, second detail
    paragraph or conclusion, in that order and always four long, verified by
    tests/writing-speaking-objectives.test.ts against every real model in
    the library). `index` is `WrittenFocusedTask.modelParagraphIndex`;
    undefined keeps Pilot B's own overview extraction exactly as it was. */
export function modelParagraphFor(paragraphs: readonly string[], index: number | undefined): string | null {
  if (index === undefined) return modelOverviewOf(paragraphs);
  return paragraphs[index]?.trim() ?? null;
}

/* ── The automatic checks ────────────────────────────────────────────────── */

/** One plain, visible rule over the words the student typed.
 *
 *  These are shown when nothing judged the work, and they are labelled as
 *  automatic checks every time. They are not a verdict and they never add
 *  up to one: four passes do not mean the overview is good, and one failure
 *  does not mean it is wrong. What they do is give a student with no tutor
 *  something real to do, which is to look at their own sentence against the
 *  model afterwards. */
export interface WrittenCheckResult {
  id: WrittenCheckId;
  passed: boolean;
  /** What was looked for, in plain words. A dictionary key. */
  labelKey: string;
  /** What was found. A dictionary key, with its own variables. */
  resultKey: string;
  resultVars?: Record<string, string | number>;
}

/** Words that join a second main point onto the first. Counted because an
    overview of two features is usually one sentence with a contrast in it,
    not two sentences. */
const JOINING_WORDS = /\b(while|whilst|whereas|although|though|but|meanwhile)\b|\bin contrast\b|\bcompared with\b/gi;

/** Anything that reads as a figure. Digits settle most of it; the two
    spellings of per cent catch the student who writes the number out. */
const FIGURES = /\d+(?:[.,]\d+)?%?|%|\bper ?cents?\b|\bpercent(?:age)?s?\b/gi;

export function hasSummarisingSignal(text: string): boolean {
  return sentencesOf(text).some((sentence) => SUMMARISING_OPENERS.test(sentence));
}

/** Every figure the text contains, as the student wrote it. */
export function figuresIn(text: string): string[] {
  return text.match(FIGURES) ?? [];
}

/** How many main points the text makes, counted the only way a machine
 *  honestly can: one per sentence, plus one for every word that joins a
 *  second point onto the first. "Overall, X rose while Y fell" is two.
 *  Said in exactly those words on the screen, so the student can see what
 *  was counted rather than trusting a number. */
export function mainFeatureCount(text: string): number {
  const sentences = sentencesOf(text);
  const joins = (text.match(JOINING_WORDS) ?? []).length;
  return sentences.length + joins;
}

export function wordsIn(text: string): number {
  return countWords(text);
}

export const CHECK_LABELS: Readonly<Record<WrittenCheckId, string>> = {
  'summarising-signal': 'Does it open as a summary?',
  'two-main-features': 'Does it make more than one point?',
  'no-figures': 'Is it free of figures?',
  'length-in-range': 'Is it about the right length?',
  'has-figures': 'Does it give at least one figure?',
  'has-comparison-language': 'Does it compare rather than list?',
  'has-trend-language': 'Does it use a trend verb?',
  'has-sequencing-language': 'Does it mark the sequence?',
  'has-change-language': 'Does it use location or change language?',
  'has-position-statement': 'Does it state a position?',
  'has-example-signal': 'Does it give a signalled example?',
  'has-enough-sentences': 'Is there a topic sentence, development and a link?',
  'no-mechanical-linker-opening': 'Does it avoid opening with a mechanical linker?',
  'has-conclusion-signal': 'Does it signal that this is the conclusion?',
  'has-topic-vocabulary': 'Does it use precise topic vocabulary?',
  'no-informal-words': 'Is it free of informal words?',
  'is-paraphrased-not-copied': 'Is it paraphrased rather than copied?',
  'no-repeated-trend-word': 'Does it avoid repeating the same trend or quantity word?',
  'has-subordinate-clause': 'Does it use a subordinate clause?',
  'has-range-of-structures': 'Does it use more than one kind of structure?',
  'sentence-was-changed': 'Did you actually change the sentence?',
};

/* ── WP20: one automatic check per new Writing objective ─────────────────── */

/** Words that carry a comparison between two things, rather than one figure
    sitting next to another with no link. */
const COMPARISON_WORDS =
  /\b(than|whereas|while|compared (?:with|to)|in comparison (?:with|to)|respectively|unlike|by contrast|in contrast (?:with|to))\b/i;

/** An accurate trend verb, whichever direction it names. */
const TREND_WORDS =
  /\b(ros[ei]|rising|fell|falling|fall|grew|growing|grow|grows|declin(?:e|ed|ing)|drop(?:ped|ping)?|increas(?:e|ed|ing)|decreas(?:e|ed|ing)|fluctuat(?:e|ed|ing)|peak(?:ed|ing)?|plummet(?:ed|ing)?|surg(?:e|ed|ing)|remain(?:ed|ing)? (?:stable|steady|constant|unchanged)|doubled|halved|stayed (?:the same|stable|steady|constant))\b/i;

/** A word that marks a stage's place in a sequence. */
const SEQUENCING_WORDS =
  /\b(first(?:ly)?|second(?:ly)?|third(?:ly)?|then|next|after (?:that|this)|following (?:this|that)|once|before|finally|subsequently|at (?:this|the (?:next|final|last)) stage|at the (?:beginning|start|end))\b/i;

/** Location or change vocabulary a map description needs. */
const CHANGE_WORDS =
  /\b(replaced by|was built|were built|was demolished|were demolished|changed into|converted into|became|disappeared|was added|were added|located|situated|to the (?:north|south|east|west|north-?east|north-?west|south-?east|south-?west)|new .*(?:was|were) (?:built|constructed|added))\b/i;

/** A first-person stance, the sentence that turns a paraphrase of the
    question into a position. */
const POSITION_WORDS =
  /\b(i (?:believe|think|agree|disagree|would argue|feel)|in my (?:opinion|view)|this essay will (?:argue|discuss|examine)|my (?:view|position) is)\b/i;

/** A signalled example, rather than a second general statement. */
const EXAMPLE_WORDS = /\b(for example|for instance|such as|a good example (?:of this )?is|to illustrate)\b/i;

/** A mechanical linker at the very start of a sentence: the shape a
    "firstly, secondly, moreover" paragraph takes. */
const MECHANICAL_OPENER = /^(firstly|secondly|thirdly|moreover|furthermore|additionally|in addition|also)\b/i;

/** A conclusion signal. */
const CONCLUSION_WORDS = /\b(in conclusion|to conclude|overall|in summary|to summarise|to sum up)\b/i;

/* ── WP20b: checks for the coverage round's Lexical Resource and
   Grammatical Range objectives (docs/personal-learning/TEACHER-REVIEW-
   writing-speaking.md, "Added in the coverage round"). Same rule as every
   check above: a plain, visible pattern over the words the student typed,
   shown as a check and never as a judgement. */

/** The technology topic's own curated words (src/data/words.ts, the
    "Technology & Society" vocabulary topic, src/data/vocabulary.ts slug
    'technology'), copied here rather than imported: this file is read by
    the browser and by tests with no Vite, and the real word bank is built
    at Astro's import.meta.glob time (see src/lib/vocab-review.ts's own
    header on exactly this constraint). Used only by
    writing-lexical-topic-vocabulary.ts's two real prompts, both about a
    piece of technology. */
const LEXICAL_PRECISION_TOPIC_WORDS = [
  'artificial intelligence',
  'automation',
  'digital divide',
  'surveillance',
  'data privacy',
  'innovation',
  'algorithm',
  'misinformation',
  'cybersecurity',
  'remote working',
] as const;

export const MIN_TOPIC_VOCABULARY_WORDS = 3;

export function topicVocabularyWordsFound(text: string): string[] {
  const lower = text.toLowerCase();
  return LEXICAL_PRECISION_TOPIC_WORDS.filter((word) => lower.includes(word));
}

export function hasEnoughTopicVocabulary(text: string): boolean {
  return topicVocabularyWordsFound(text).length >= MIN_TOPIC_VOCABULARY_WORDS;
}

/** A short, explicit list of informal words and phrases that do not belong
    in a Task 2 paragraph. Deliberately small: this is a check on register,
    not a style guide, and a long list would start catching words that are
    fine in context. */
const INFORMAL_WORDS = ['kids', 'stuff', 'guys', 'gonna', 'wanna', 'okay', 'cool', 'awesome', 'a lot', 'things'] as const;

export function informalWordsFound(text: string): string[] {
  const lower = text.toLowerCase();
  return INFORMAL_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(lower));
}

export function hasNoInformalWords(text: string): boolean {
  return informalWordsFound(text).length === 0;
}

/** Ordinary function and instruction words, plus the exam's own boilerplate
    ("give reasons for your answer", "write at least 250 words"), which
    appears on every prompt and would otherwise count as "copied" on every
    single attempt regardless of how well the question itself was
    paraphrased. Not exhaustive: a check on overlap, not a full parser. */
const PARAPHRASE_STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'has', 'will', 'would', 'should', 'could', 'your', 'their',
  'give', 'giving', 'gave', 'reasons', 'reason', 'answer', 'answers', 'include', 'including', 'relevant',
  'examples', 'example', 'own', 'knowledge', 'experience', 'extent', 'agree', 'disagree', 'opinion',
  'statement', 'views', 'view', 'both', 'discuss', 'least', 'write', 'words', 'strong', 'some', 'people',
  'think', 'believe', 'because', 'many', 'more', 'most', 'other', 'others', 'these', 'those', 'what',
  'which', 'when', 'where', 'while', 'about', 'they', 'them', 'than', 'then', 'also', 'such', 'each',
]);

function plainTextOf(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function significantWords(text: string): Set<string> {
  const words = (text.toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((word) => !PARAPHRASE_STOPWORDS.has(word));
  return new Set(words);
}

export const MAX_COPIED_PROMPT_WORDS = 3;

/** How many of the prompt's own significant words the student's text
    reuses verbatim. A count, not a judgement of paraphrase quality: a low
    number cannot tell good paraphrasing from lucky wording, only that the
    student did not simply lift the question. */
export function copiedPromptWordCount(studentText: string, promptHtml: string): number {
  const promptWords = significantWords(plainTextOf(promptHtml));
  const studentWords = significantWords(studentText);
  let shared = 0;
  for (const word of promptWords) if (studentWords.has(word)) shared += 1;
  return shared;
}

export function isParaphrasedNotCopied(studentText: string, promptHtml: string): boolean {
  return copiedPromptWordCount(studentText, promptHtml) <= MAX_COPIED_PROMPT_WORDS;
}

/** Quantity phrases, counted alongside trend words: "avoiding repetition
    ... through synonyms for trends and quantities" names both. */
const QUANTITY_WORDS =
  /\b(a lot of|many|several|numerous|a (?:large|small|significant) (?:number|proportion|percentage) of|the majority of|a majority of|a minority of|most)\b/gi;

/** Global counterparts of TREND_WORDS and QUANTITY_WORDS, for counting
    repeats rather than a single presence test. */
const TREND_WORDS_GLOBAL = new RegExp(TREND_WORDS.source, 'gi');

export const MAX_TREND_WORD_REPEATS = 2;

/** The most-repeated trend or quantity word in the text, whichever one word
    or phrase (matched exactly, case-insensitively) appears most often. Null
    when nothing in either list was used at all. */
export function mostRepeatedTrendOrQuantityWord(text: string): { word: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const pattern of [TREND_WORDS_GLOBAL, QUANTITY_WORDS]) {
    pattern.lastIndex = 0;
    for (const match of text.toLowerCase().matchAll(pattern)) {
      const key = match[0];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let top: { word: string; count: number } | null = null;
  for (const [word, count] of counts) {
    if (!top || count > top.count) top = { word, count };
  }
  return top;
}

export function noRepeatedTrendWord(text: string): boolean {
  const top = mostRepeatedTrendOrQuantityWord(text);
  return !top || top.count <= MAX_TREND_WORD_REPEATS;
}

/** A subordinating conjunction joining two ideas into one sentence. */
const SUBORDINATE_WORDS =
  /\b(because|although|though|since|while|whereas|if|unless|when|whenever|even though|given that|so that)\b/i;

export function hasSubordinateClause(text: string): boolean {
  return SUBORDINATE_WORDS.test(text);
}

/** A relative clause introduced by a relative pronoun. */
const RELATIVE_CLAUSE_WORDS = /\b(which|who|whom|whose|that)\b/i;

/** A passive verb: a form of be followed by a past participle. Crude (it
    will miss irregular participles that do not end in ed/en, and it can
    over-match "is interested" as a passive when it is really an adjective),
    which is exactly why this is shown as a count of a SIGNAL, never as a
    judgement of whether the passive is used correctly. */
const PASSIVE_VOICE_WORDS = /\b(?:is|are|was|were|been|being|be)\s+\w+(?:ed|en)\b/i;

/** A conditional: "if" paired with a modal that marks the result as
    hypothetical rather than a plain future fact. */
const CONDITIONAL_WORDS = /\bif\b[^.!?]{0,60}\b(would|could|might|will)\b/i;

export interface StructureSignal {
  id: 'relative-clause' | 'subordinate-clause' | 'passive-voice' | 'conditional';
  present: boolean;
}

/** Which of four structure kinds appear in the text, each checked once,
    independently of the others. A count of distinct kinds, never a count of
    total sentences or a judgement of correctness: "how many DIFFERENT
    structures did you reach for", which is what a range actually means. */
export function structureSignalsIn(text: string): StructureSignal[] {
  return [
    { id: 'relative-clause', present: RELATIVE_CLAUSE_WORDS.test(text) },
    { id: 'subordinate-clause', present: SUBORDINATE_WORDS.test(text) },
    { id: 'passive-voice', present: PASSIVE_VOICE_WORDS.test(text) },
    { id: 'conditional', present: CONDITIONAL_WORDS.test(text) },
  ];
}

export function distinctStructureCount(text: string): number {
  return structureSignalsIn(text).filter((signal) => signal.present).length;
}

/** At least this many distinct structure kinds is what "a range" means
    here: one kind, however well used, is not a range. */
export const MIN_STRUCTURE_RANGE = 2;

export function hasRangeOfStructures(text: string): boolean {
  return distinctStructureCount(text) >= MIN_STRUCTURE_RANGE;
}

export function hasComparisonLanguage(text: string): boolean {
  return COMPARISON_WORDS.test(text);
}

export function hasTrendLanguage(text: string): boolean {
  return TREND_WORDS.test(text);
}

export function hasSequencingLanguage(text: string): boolean {
  return SEQUENCING_WORDS.test(text);
}

export function hasChangeLanguage(text: string): boolean {
  return CHANGE_WORDS.test(text);
}

export function hasPositionStatement(text: string): boolean {
  return POSITION_WORDS.test(text);
}

export function hasExampleSignal(text: string): boolean {
  return EXAMPLE_WORDS.test(text);
}

export function hasConclusionSignal(text: string): boolean {
  return CONCLUSION_WORDS.test(text);
}

/** A topic sentence, its development and a link back to the question is at
    least three sentences; this counts what can honestly be counted, which
    is sentences, not whether any one of the three jobs was really done. */
export function hasEnoughSentences(text: string): boolean {
  return sentencesOf(text).length >= 3;
}

/** The paragraph does not open with a connector that only announces a list
    (Firstly, Moreover, In addition), whatever it does further in. */
export function opensWithoutMechanicalLinker(text: string): boolean {
  const first = sentencesOf(text)[0];
  return !first || !MECHANICAL_OPENER.test(first);
}

/** The one check sentence correction can honestly run: the student typed
    something different from the sentence they were shown. It says nothing
    about whether the change is right, which is what the marker's own note,
    read after the attempt, is for. */
export function sentenceWasChanged(text: string, original: string | undefined): boolean {
  const normalise = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!original) return text.trim().length > 0;
  return normalise(text) !== normalise(original) && text.trim().length > 0;
}

/** The minimum number of main points a passing overview makes. Two,
    because "the main trends" is plural in the descriptor itself. */
export const MIN_MAIN_FEATURES = 2;

export function runAutomaticChecks(
  text: string,
  rules: { minWords: number; maxWords: number; checks: readonly WrittenCheckId[] },
  /** Sentence correction only: the sentence the student was shown, so
      'sentence-was-changed' can tell a real edit from the original typed
      back unchanged. `promptHtml` (WP20b) is task2-paraphrase-the-question
      only: the real prompt's own markup, so 'is-paraphrased-not-copied' can
      compare the student's words against it. Every other check ignores
      whichever of these it does not need. */
  context?: { original?: string; promptHtml?: string },
): WrittenCheckResult[] {
  const words = wordsIn(text);
  const figures = figuresIn(text);
  const features = mainFeatureCount(text);
  const signal = hasSummarisingSignal(text);
  const changed = sentenceWasChanged(text, context?.original);
  const topicWords = topicVocabularyWordsFound(text);
  const informal = informalWordsFound(text);
  const copiedCount = context?.promptHtml ? copiedPromptWordCount(text, context.promptHtml) : 0;
  const repeatedTrend = mostRepeatedTrendOrQuantityWord(text);
  const structureCount = distinctStructureCount(text);

  const results: Record<WrittenCheckId, WrittenCheckResult> = {
    'summarising-signal': {
      id: 'summarising-signal',
      passed: signal,
      labelKey: CHECK_LABELS['summarising-signal'],
      resultKey: signal
        ? 'It opens with a summarising word, so a reader knows straight away that this is the big picture.'
        : 'No sentence starts with a summarising word such as "Overall". An examiner looks for the overview first, so it is worth signalling.',
    },
    'two-main-features': {
      id: 'two-main-features',
      passed: features >= MIN_MAIN_FEATURES,
      labelKey: CHECK_LABELS['two-main-features'],
      resultKey:
        features >= MIN_MAIN_FEATURES
          ? 'Counting sentences and joining words such as "while", this makes {count} points.'
          : 'Counting sentences and joining words such as "while", this makes {count} point. The descriptor asks for the main features, which is more than one.',
      resultVars: { count: features },
    },
    'no-figures': {
      id: 'no-figures',
      passed: figures.length === 0,
      labelKey: CHECK_LABELS['no-figures'],
      resultKey:
        figures.length === 0
          ? 'No figures, which is what keeps an overview an overview.'
          : 'This contains {count} figure or figures, starting with "{first}". Figures belong in the detail paragraphs.',
      resultVars: { count: figures.length, first: figures[0] ?? '' },
    },
    'length-in-range': {
      id: 'length-in-range',
      passed: words >= rules.minWords && words <= rules.maxWords,
      labelKey: CHECK_LABELS['length-in-range'],
      resultKey:
        words >= rules.minWords && words <= rules.maxWords
          ? '{words} words, inside the {min} to {max} this task asks for.'
          : '{words} words, against the {min} to {max} this task asks for.',
      resultVars: { words, min: rules.minWords, max: rules.maxWords },
    },
    'has-figures': {
      id: 'has-figures',
      passed: figures.length > 0,
      labelKey: CHECK_LABELS['has-figures'],
      resultKey:
        figures.length > 0
          ? 'It gives {count} figure or figures, starting with "{first}".'
          : 'No figures at all. A detail paragraph is where the numbers belong.',
      resultVars: { count: figures.length, first: figures[0] ?? '' },
    },
    'has-comparison-language': {
      id: 'has-comparison-language',
      passed: hasComparisonLanguage(text),
      labelKey: CHECK_LABELS['has-comparison-language'],
      resultKey: hasComparisonLanguage(text)
        ? 'It uses a comparing word, so the relationship between the two is stated rather than left for the reader to find.'
        : 'No comparing word (than, compared with, whereas). Check whether this reads as two things listed rather than compared.',
    },
    'has-trend-language': {
      id: 'has-trend-language',
      passed: hasTrendLanguage(text),
      labelKey: CHECK_LABELS['has-trend-language'],
      resultKey: hasTrendLanguage(text)
        ? 'It uses a trend verb, so the direction of the movement is stated.'
        : 'No trend verb found (rose, fell, grew, fluctuated...). A figure with no verb does not say what happened.',
    },
    'has-sequencing-language': {
      id: 'has-sequencing-language',
      passed: hasSequencingLanguage(text),
      labelKey: CHECK_LABELS['has-sequencing-language'],
      resultKey: hasSequencingLanguage(text)
        ? 'It marks the stages with a sequencing word, so the order is stated.'
        : 'No sequencing word found (first, then, after that, finally). The order is left to the reader to work out.',
    },
    'has-change-language': {
      id: 'has-change-language',
      passed: hasChangeLanguage(text),
      labelKey: CHECK_LABELS['has-change-language'],
      resultKey: hasChangeLanguage(text)
        ? 'It uses location or change language, so the change and where it happened are both stated.'
        : 'No location or change language found (was replaced by, to the north, was built). Check the change is actually named.',
    },
    'has-position-statement': {
      id: 'has-position-statement',
      passed: hasPositionStatement(text),
      labelKey: CHECK_LABELS['has-position-statement'],
      resultKey: hasPositionStatement(text)
        ? 'It states a position in the first person, so a reader knows where you stand.'
        : 'No first-person position statement found (I believe, in my opinion). A paraphrase of the question is not the same as a position on it.',
    },
    'has-example-signal': {
      id: 'has-example-signal',
      passed: hasExampleSignal(text),
      labelKey: CHECK_LABELS['has-example-signal'],
      resultKey: hasExampleSignal(text)
        ? 'It signals a specific example, so the claim is not left to stand on its own.'
        : 'No example signal found (for example, for instance, such as). Check the claim is actually followed by one.',
    },
    'has-enough-sentences': {
      id: 'has-enough-sentences',
      passed: hasEnoughSentences(text),
      labelKey: CHECK_LABELS['has-enough-sentences'],
      resultKey: hasEnoughSentences(text)
        ? 'It runs to {count} sentences, enough room for a topic sentence, its development and a link.'
        : 'Only {count} sentence or sentences. A topic sentence, its development and a link back to the question need at least three.',
      resultVars: { count: sentencesOf(text).length },
    },
    'no-mechanical-linker-opening': {
      id: 'no-mechanical-linker-opening',
      passed: opensWithoutMechanicalLinker(text),
      labelKey: CHECK_LABELS['no-mechanical-linker-opening'],
      resultKey: opensWithoutMechanicalLinker(text)
        ? 'It does not open with a mechanical linker, so whatever connects it has to be the sense, not the word.'
        : 'It opens with a mechanical linker (Firstly, Moreover, In addition). That connects two SENTENCES, not necessarily two IDEAS.',
    },
    'has-conclusion-signal': {
      id: 'has-conclusion-signal',
      passed: hasConclusionSignal(text),
      labelKey: CHECK_LABELS['has-conclusion-signal'],
      resultKey: hasConclusionSignal(text)
        ? 'It signals that this is the conclusion, so a reader knows the essay is closing.'
        : 'No conclusion signal found (in conclusion, overall, to conclude). Check it reads as a close rather than another point.',
    },
    'has-topic-vocabulary': {
      id: 'has-topic-vocabulary',
      passed: topicWords.length >= MIN_TOPIC_VOCABULARY_WORDS,
      labelKey: CHECK_LABELS['has-topic-vocabulary'],
      resultKey:
        topicWords.length >= MIN_TOPIC_VOCABULARY_WORDS
          ? 'It uses {count} topic word or words for this subject, starting with "{first}".'
          : 'It uses {count} topic word or words for this subject, against the {min} this task asks for.',
      resultVars: { count: topicWords.length, first: topicWords[0] ?? '', min: MIN_TOPIC_VOCABULARY_WORDS },
    },
    'no-informal-words': {
      id: 'no-informal-words',
      passed: informal.length === 0,
      labelKey: CHECK_LABELS['no-informal-words'],
      resultKey:
        informal.length === 0
          ? 'No informal words found from the short list this check looks for.'
          : 'It uses {count} informal word or words, starting with "{first}". A Task 2 paragraph keeps a more formal register.',
      resultVars: { count: informal.length, first: informal[0] ?? '' },
    },
    'is-paraphrased-not-copied': {
      id: 'is-paraphrased-not-copied',
      passed: copiedCount <= MAX_COPIED_PROMPT_WORDS,
      labelKey: CHECK_LABELS['is-paraphrased-not-copied'],
      resultKey:
        copiedCount <= MAX_COPIED_PROMPT_WORDS
          ? 'It shares {count} word or words with the question\'s own wording, inside the {max} this check allows.'
          : 'It shares {count} word or words with the question\'s own wording, against the {max} this check allows. Try replacing a few with your own.',
      resultVars: { count: copiedCount, max: MAX_COPIED_PROMPT_WORDS },
    },
    'no-repeated-trend-word': {
      id: 'no-repeated-trend-word',
      passed: !repeatedTrend || repeatedTrend.count <= MAX_TREND_WORD_REPEATS,
      labelKey: CHECK_LABELS['no-repeated-trend-word'],
      resultKey: !repeatedTrend
        ? 'No trend or quantity word repeats, so there is nothing for this check to flag.'
        : repeatedTrend.count <= MAX_TREND_WORD_REPEATS
          ? '"{word}" appears {count} time or times, inside the {max} this check allows.'
          : '"{word}" appears {count} time or times, against the {max} this check allows. Try a synonym for one of them.',
      resultVars: repeatedTrend
        ? { word: repeatedTrend.word, count: repeatedTrend.count, max: MAX_TREND_WORD_REPEATS }
        : { word: '', count: 0, max: MAX_TREND_WORD_REPEATS },
    },
    'has-subordinate-clause': {
      id: 'has-subordinate-clause',
      passed: hasSubordinateClause(text),
      labelKey: CHECK_LABELS['has-subordinate-clause'],
      resultKey: hasSubordinateClause(text)
        ? 'It uses a subordinating word (because, although, since...), so the two ideas are joined into one sentence.'
        : 'No subordinating word found (because, although, since, while, when, if). The two ideas are not yet joined into one sentence.',
    },
    'has-range-of-structures': {
      id: 'has-range-of-structures',
      passed: structureCount >= MIN_STRUCTURE_RANGE,
      labelKey: CHECK_LABELS['has-range-of-structures'],
      resultKey:
        structureCount >= MIN_STRUCTURE_RANGE
          ? 'It uses {count} different kind or kinds of structure (a relative clause, a subordinate clause, a passive, a conditional).'
          : 'It uses {count} different kind or kinds of structure, against the {min} this check asks for. This counts variety, not whether each one is correct.',
      resultVars: { count: structureCount, min: MIN_STRUCTURE_RANGE },
    },
    'sentence-was-changed': {
      id: 'sentence-was-changed',
      passed: changed,
      labelKey: CHECK_LABELS['sentence-was-changed'],
      resultKey: changed
        ? 'This is different from the sentence you were shown, which is what a correction has to be.'
        : 'This looks the same as the sentence you were shown. A correction has to actually change something.',
    },
  };

  return rules.checks.map((id) => results[id]);
}

/* ── Nothing here is ever a band ─────────────────────────────────────────── */

export type WrittenVerdict = 'met' | 'partly' | 'not-yet';

/** What came back from asking Mr EZ, once this side has checked it too. */
export interface WrittenEvaluation {
  verdict: WrittenVerdict;
  observations: readonly string[];
  nextMove: string;
  /** False when nothing actually looked at the work: AI off, over its cap,
      unreachable, or a reply this side refused. A verdict with judged false
      is NOT a verdict and the screen must not show it as one. */
  judged: boolean;
  /** Live, simulated or nothing at all. A simulated reply is never shown as
      a live one. */
  source: 'live' | 'simulated' | 'none';
  /** Named when a reply was refused here, so the reason is reviewable
      rather than swallowed. */
  refused?: string;
}

/** Half bands and anything a number beside a scoring word. The same rule
 *  src/lib/learning/ai-prompt.ts applies at the Worker, repeated on this
 *  side deliberately: a reply can reach a screen from a cache, from another
 *  device's sync or from a Worker running older code, and the one thing
 *  that must never happen is an uncalibrated number in front of a student
 *  who has a calibrated grader one page away. */
const BAND_WORDS = /(band|bands|score|scored|scores|scoring|grade|graded|out of \d|балл|балла|баллов|баллы|оценк)/i;
const HALF_BAND = /\b\d\.[05]\b/;
const BAND_PROXIMITY = 30;

export function looksLikeABand(text: string): boolean {
  if (HALF_BAND.test(text)) return true;
  const lower = text.toLowerCase();
  for (const match of lower.matchAll(/\d/g)) {
    const at = match.index ?? 0;
    if (BAND_WORDS.test(lower.slice(Math.max(0, at - BAND_PROXIMITY), at + BAND_PROXIMITY))) return true;
  }
  return false;
}

/** The reply as it arrived from the tutor client, narrowed to what this
    screen reads. */
export interface EvaluationReply {
  verdict?: unknown;
  observations?: unknown;
  suggestions?: unknown;
  judged?: unknown;
  live?: unknown;
}

/** Take the reply, or refuse it and say why.
 *
 *  Refusing costs the student the deterministic answer below, which is a
 *  real thing to read. Accepting a bad one costs them a number they will
 *  believe. */
export function acceptEvaluation(reply: EvaluationReply): WrittenEvaluation | { refused: string } {
  const verdict = reply.verdict;
  if (verdict !== 'met' && verdict !== 'partly' && verdict !== 'not-yet') return { refused: 'bad-verdict' };

  const observations = Array.isArray(reply.observations)
    ? reply.observations.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  if (observations.length < 2) return { refused: 'too-few-observations' };

  const suggestions = Array.isArray(reply.suggestions)
    ? reply.suggestions.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  const nextMove = suggestions[0] ?? '';
  if (!nextMove) return { refused: 'no-next-move' };

  const whole = [...observations, nextMove].join(' ');
  if (looksLikeABand(whole)) return { refused: 'band-claim' };

  /* `judged: false` is the Worker saying nothing looked at this. The words
     beside it are the deterministic fallback, not a verdict, and they are
     passed through with judged false so the screen says so. */
  const judged = reply.judged === true;
  return {
    verdict,
    observations,
    nextMove,
    judged,
    source: reply.live === true ? 'live' : 'simulated',
  };
}

/** What the student is told when nothing judged their writing.
 *
 *  Honest above all: this does NOT say the objective was missed, because
 *  nothing looked at it. It restates the objective, hands the checking back
 *  to them against the model, and is labelled an automatic check
 *  everywhere it appears. */
export function unjudgedEvaluation(refused?: string): WrittenEvaluation {
  return {
    verdict: 'not-yet',
    observations: [],
    nextMove: '',
    judged: false,
    source: 'none',
    ...(refused ? { refused } : {}),
  };
}

/* ── What becomes evidence ───────────────────────────────────────────────── */

/** What has been shown to the student about this task so far. */
export interface WrittenHelpState {
  /** True once the prompt's guiding questions have been opened. */
  guidingQuestionsOpened: boolean;
  /** True once the band 8 overview has been shown. */
  modelShown: boolean;
  /** True once Mr EZ has judged an attempt and the student has read it. */
  tutorJudged: boolean;
  assistance: AssistanceLevel;
}

export const NO_WRITTEN_HELP: WrittenHelpState = {
  guidingQuestionsOpened: false,
  modelShown: false,
  tutorJudged: false,
  assistance: 'none',
};

/** Assistance never comes down, so an attempt written after the guiding
 *  questions were opened can never later read as unaided work.
 *
 *  `assistance` in the change is what Mr EZ's own reply says this item has
 *  reached (a hint, a worked example, an explanation). It is raised in like
 *  everything else and can never lower what the flags already set. */
export function withWrittenHelp(
  state: WrittenHelpState,
  change: Partial<Omit<WrittenHelpState, 'assistance'>> & { assistance?: AssistanceLevel },
): WrittenHelpState {
  const next = { ...state, ...change, assistance: state.assistance };
  let level = raise(state.assistance, change.assistance ?? state.assistance);
  if (next.guidingQuestionsOpened) level = raise(level, 'hint');
  if (next.modelShown) level = raise(level, 'worked-example');
  if (next.tutorJudged) level = raise(level, 'tutor-explained');
  return { ...next, assistance: level };
}

/** Practice with help available, a check with none, or a short sample taken
 *  to find out where the student is.
 *
 *  The mode is set by the exercise's own role and by the step the plan put
 *  it in, never by the student. A diagnostic is capped at tentative by the
 *  policy however well it goes, which is exactly right for two sentences. */
export function modeForWritten(
  role: WrittenTaskView['role'],
  stepRole?: string | null,
): EvidenceMode {
  if (stepRole === 'assess') return 'diagnostic';
  return role === 'independent-check' ? 'assessment' : 'practice';
}

/** 'completed' when something was written, 'blank' when nothing was. A
    blank attempt is never read as a bad result; the policy ignores it. */
export function completionOfWritten(text: string): CompletionState {
  return text.trim().length === 0 ? 'blank' : 'completed';
}

/** The guiding questions this task actually offers.
 *
 *  A check offers none, whatever the prompt carries, and that is what makes
 *  it a check. Decided here rather than in the page so the rule is one line
 *  that a test can hold, instead of a condition inside a template. */
export function guidingQuestionsFor(
  role: WrittenTaskView['role'],
  hints: readonly string[] | undefined,
): readonly string[] {
  return role === 'independent-check' ? [] : (hints ?? []);
}

/** May the band 8 overview be shown yet?
 *
 *  Only after the student's own attempt, in either kind of task. Before one
 *  it is not a model, it is the answer, and Alex's teaching principle from
 *  19 September 2026 is that trainers guide the student to the answer and
 *  do not give it. One line, here, so that it is a rule with a test rather
 *  than a condition inside a template. */
export function mayShowModel(attempts: readonly WrittenAttemptRecord[]): boolean {
  return attempts.length > 0;
}

/** The one item row an attempt is worth.
 *
 *  `firstAnswer` is marked `written`, so the learner store keeps it up to
 *  MAX_WRITTEN_RESPONSE_CHARS rather than the 120 an ordinary gap fill
 *  gets. That matters: an overview is one or two sentences, and at 120 the
 *  record held an excerpt the before and after comparison could not use.
 *  The student's own full text still lives in the draft store below, which
 *  is per owner and per exercise; this is the copy the policy and the
 *  tutor reason over, and it is now a whole overview rather than the start
 *  of one. A whole essay is graded evidence and never comes through here
 *  at all. `correct` follows the objective judgement, and is
 *  false whenever nothing judged the work, so an unjudged attempt can never
 *  be counted as a demonstration. */
export function writtenItemDraft(input: {
  view: WrittenTaskView;
  text: string;
  help: WrittenHelpState;
  met: boolean;
}): ItemOutcomeDraft {
  return {
    itemId: input.view.itemId,
    firstAnswer: input.text.trim(),
    written: true,
    correct: input.met,
    assistance: input.help.assistance,
    subskill: input.view.subskill,
  };
}

/** One attempt, as the learner record holds it.
 *
 *  Built here rather than in the component so that every rule it encodes
 *  can be tested with no browser, and there are five of them:
 *
 *  - `met` is true only when something actually JUDGED the work. A tutor
 *    that was off, over its cap or unreachable is not a failure and is
 *    never recorded as one, so an unjudged attempt carries met false and
 *    byModel false and the policy reads it as work done rather than as a
 *    demonstration.
 *  - `taskScope` is always the task the prompt really is, which is what
 *    keeps Task 1 evidence out of the Task 2 scope.
 *  - `assistance` comes from the help state, which only ever rises.
 *  - `sourceMaterial` names the prompt, so writing about this chart marks
 *    it met and a later check built on it is correctly not unseen.
 *  - the revision is NOT named here. The learner store links a second go to
 *    the first by their shared item id, which is the one way a surface
 *    cannot get it wrong. */
export function writtenEvidenceDraft(input: {
  view: WrittenTaskView;
  text: string;
  help: WrittenHelpState;
  evaluation: WrittenEvaluation;
  at: string;
  task: 'task1' | 'task2';
  stepRole?: string | null;
  sessionId?: string;
  locale?: string;
}): EvidenceDraft {
  const met = input.evaluation.judged && input.evaluation.verdict === 'met';
  return {
    activityId: input.view.activityId,
    contentVersion: input.view.contentVersion,
    at: input.at,
    paper: input.view.paper,
    subskill: input.view.subskill,
    mode: modeForWritten(input.view.role, input.stepRole),
    completion: completionOfWritten(input.text),
    assistance: input.help.assistance,
    taskScope: { kind: 'writing-task', task: input.task },
    outcome: {
      kind: 'objective',
      met,
      subskill: input.view.subskill,
      ...(input.evaluation.judged ? { feedback: input.evaluation.observations.join(' ') } : {}),
      byModel: input.evaluation.judged,
    },
    items: [writtenItemDraft({ view: input.view, text: input.text, help: input.help, met })],
    sourceMaterial: [promptExposureKey(input.view.promptId)],
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.locale === 'en' || input.locale === 'ru' ? { locale: input.locale } : {}),
  };
}

/* ── Finding the gap, from evidence and never from a guess ───────────────── */

/** Exactly what src/lib/progress.ts stores for one graded essay, narrowed
    to the parts this reads. Nothing is inferred that is not in the box. */
export interface GradedWritingAttempt {
  at: string;
  promptId: string;
  task?: 'task1' | 'task2';
  essay?: string;
  promptTitle?: string;
  live?: boolean;
  report?: {
    criteria?: Record<string, { band?: number; comment?: string; tip?: string; nextBand?: { gap?: string; actions?: readonly { do?: string }[] } }>;
    moments?: readonly { quote?: string; note?: string }[];
    improvements?: readonly string[];
    grader?: { name?: string; live?: boolean };
  };
}

export type OverviewGapBasis = 'marker' | 'automatic-check' | 'nothing-found' | 'no-evidence';

/** Where in the marker's report the sentence came from, so the screen can
    say so rather than presenting it as a floating claim. */
export type MarkerSource =
  | 'task-achievement-comment'
  | 'task-achievement-tip'
  /** WP20: the same two sources, worded for any criterion rather than only
      Task Achievement, used by findWritingGap's generalised rules. */
  | 'criterion-comment'
  | 'criterion-tip'
  | 'next-band-advice'
  | 'quoted-moment'
  | 'improvement';

export interface OverviewGapFinding {
  basis: OverviewGapBasis;
  /** True when there is a real reason to work on the overview. */
  found: boolean;
  /** The marker's own sentence, word for word, when the basis is 'marker'. */
  quote?: string;
  where?: MarkerSource;
  /** Which automatic checks failed, when the basis is 'automatic-check'. */
  failedChecks?: readonly WrittenCheckId[];
  /** The attempt this is about, when there is one. */
  promptId?: string;
  promptTitle?: string;
  at?: string;
}

/** What the marker calls it. Deliberately narrow: "main features" on its
    own is the task instruction and appears in almost every report. */
const OVERVIEW_WORD = '(?:overview|overall statement|summary (?:paragraph|statement))';

/** How close a complaint has to sit to that word for it to be ABOUT it.
 *
 *  This is the whole trick, and a first draft of this rule got it wrong.
 *  Looking for an overview word anywhere in a sentence and a negative word
 *  anywhere else in the same sentence reads "A clear overview separates the
 *  trends from the detail and quotes no figures" as a complaint, because of
 *  the "no" forty characters away that belongs to the figures. So the two
 *  have to sit next to each other, in one order or the other, with no more
 *  than a clause between them. */
const NEAR = '[^.!?]{0,40}';

/** One sentence of the marker's own words that says the overview was
 *  missing, weak, or needs to change.
 *
 *  Returns the sentence itself, so the student reads what the examiner
 *  wrote rather than our paraphrase of it, and null for a sentence that
 *  praises the overview. Getting that second case right is what the
 *  adjacency rule above is for: the cost of a false positive is telling a
 *  student an examiner asked for work the examiner never asked for. */
export function overviewComplaintIn(text: string | undefined): string | null {
  return markerComplaintIn(text, OVERVIEW_WORD);
}

/** The same rule as overviewComplaintIn, generalised to any objective
 *  (WP20): a marker's sentence counts only when the objective's own keyword
 *  sits close enough to a word that says something is missing, weak, or
 *  being asked for. `keyword` is a regex alternation fragment, e.g.
 *  `key features|main features`; it is inserted inside `\b(?:...)\b` so it
 *  must already be escaped where it needs to be (every keyword in
 *  WRITING_OBJECTIVE_RULES below is plain words, so none of them do). */
export function markerComplaintIn(text: string | undefined, keyword: string): string | null {
  if (!text) return null;
  const missing = new RegExp(
    `\\b(?:no|not|never|without|lacks?|lacking|missing|absent|omits?|omitted)\\b${NEAR}\\b(?:${keyword})\\b` +
      `|\\b(?:${keyword})\\b${NEAR}\\b(?:missing|absent|lacking|nowhere|not (?:there|present|clear|stated))\\b`,
    'i',
  );
  const weak = new RegExp(
    `\\b(?:${keyword})\\b${NEAR}\\b(?:weak|weaker|unclear|vague|generic|buried|thin|underdeveloped|limited|too general|merged|hard to find)\\b` +
      `|\\b(?:weak|weaker|unclear|vague|generic|buried|thin|underdeveloped|merged)\\b${NEAR}\\b(?:${keyword})\\b`,
    'i',
  );
  const askedFor = new RegExp(
    `\\b(?:should|needs? to|must|would benefit|try to|add|include|write|move|separate out|start(?:ing)? with|give)\\b${NEAR}\\b(?:${keyword})\\b` +
      `|\\b(?:${keyword})\\b${NEAR}\\b(?:should|needs? to|must|would benefit)\\b`,
    'i',
  );
  for (const sentence of sentencesOf(text)) {
    if (missing.test(sentence) || weak.test(sentence) || askedFor.test(sentence)) return sentence;
  }
  return null;
}

/** The most recent Task 1 attempt, or undefined when there is none. */
export function latestTask1(attempts: readonly GradedWritingAttempt[]): GradedWritingAttempt | undefined {
  return [...attempts]
    .filter((attempt) => attempt.task === 'task1')
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0];
}

/** The most recent Task 2 attempt, or undefined when there is none. Same
    rule as latestTask1, kept as its own function so Task 1 and Task 2
    evidence never merge into one lookup by accident. */
export function latestTask2(attempts: readonly GradedWritingAttempt[]): GradedWritingAttempt | undefined {
  return [...attempts]
    .filter((attempt) => attempt.task === 'task2')
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0];
}

/** The single most recent Writing attempt of either task, for the one rule
    that genuinely applies to both (sentence correction: a grammar slip is a
    grammar slip whichever task it was written in). */
export function latestEither(attempts: readonly GradedWritingAttempt[]): GradedWritingAttempt | undefined {
  return [...attempts].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))[0];
}

/** Is there a reason to work on this student's overview?
 *
 *  Three bases, in order of how much they are worth:
 *
 *  1. 'marker'. The calibrated grader said something about the overview in
 *     its Task Achievement comment, its tip, its next band advice, one of
 *     the moments it quoted, or its list of improvements. The sentence is
 *     handed back word for word so the student reads what the marker wrote
 *     and not our paraphrase of it. Only a LIVE grade counts: the offline
 *     stub's wording is canned, and quoting it as a marker would be a lie.
 *  2. 'automatic-check'. Nothing was said about the overview, so their own
 *     essay is checked for one: no summarising signal anywhere, or a
 *     summarising sentence with figures in it. Called a check on the
 *     screen, never a judgement.
 *  3. 'no-evidence'. No Task 1 has been written at all, so nothing is
 *     known. That is a reason to take a short sample, not a reason to
 *     claim a weakness.
 *
 *  'nothing-found' is the fourth answer and the one that keeps the other
 *  three honest: a Task 1 was written, the marker liked the overview and
 *  the text check found nothing, so this objective is not the gap. */
export function findOverviewGap(attempts: readonly GradedWritingAttempt[]): OverviewGapFinding {
  const attempt = latestTask1(attempts);
  if (!attempt) return { basis: 'no-evidence', found: false };

  const about = { promptId: attempt.promptId, promptTitle: attempt.promptTitle, at: attempt.at };
  const report = attempt.report;
  const live = attempt.live === true || report?.grader?.live === true;

  if (report && live) {
    const achievement = report.criteria?.taskResponse;
    const sources: { where: MarkerSource; text: string | undefined }[] = [
      { where: 'task-achievement-comment', text: achievement?.comment },
      { where: 'task-achievement-tip', text: achievement?.tip },
      { where: 'next-band-advice', text: achievement?.nextBand?.gap },
      ...(achievement?.nextBand?.actions ?? []).map((action) => ({
        where: 'next-band-advice' as const,
        text: action.do,
      })),
      ...(report.moments ?? []).map((moment) => ({ where: 'quoted-moment' as const, text: moment.note })),
      ...(report.improvements ?? []).map((line) => ({ where: 'improvement' as const, text: line })),
    ];
    for (const source of sources) {
      const quote = overviewComplaintIn(source.text);
      if (quote) return { basis: 'marker', found: true, quote, where: source.where, ...about };
    }
  }

  const essay = attempt.essay ?? '';
  if (essay.trim()) {
    const failed = failedOverviewChecksIn(essay);
    if (failed.length > 0) return { basis: 'automatic-check', found: true, failedChecks: failed, ...about };
  }

  return { basis: 'nothing-found', found: false, ...about };
}

/** The transparent check of a whole Task 1 essay: is there an overview in
 *  it at all, and if there is, does it stay out of the figures?
 *
 *  Only these two, because they are the two that can be seen in the words
 *  themselves. Whether an overview names the RIGHT features is a judgement
 *  and is not attempted here. */
export function failedOverviewChecksIn(essay: string): WrittenCheckId[] {
  const overview = sentencesOf(essay).find((sentence) => SUMMARISING_OPENERS.test(sentence));
  if (!overview) return ['summarising-signal'];
  return figuresIn(overview).length > 0 ? ['no-figures'] : [];
}

/* ── WP20: the same finding, generalised to every new Writing objective ──── */

/** One objective's rule for finding a gap: which criterion a marker's
 *  comment about it would sit under, the keyword that says the comment is
 *  ABOUT this objective (see markerComplaintIn), and the one honest,
 *  whole-essay automatic check to fall back on when there is a live report
 *  but nothing in it names this objective by keyword. Four objectives
 *  (paragraph organisation, cohesion, the conclusion, sentence correction)
 *  have no `essayLooksFine`: there is no whole-essay pattern that honestly
 *  stands in for "is this paragraph organised", so those four are marker
 *  evidence only, and say so by finding nothing rather than guessing. */
export interface WritingObjectiveRule {
  subskill: string;
  task: 'task1' | 'task2' | 'either';
  /** A regex alternation fragment; see markerComplaintIn. */
  keyword: string;
  criterionKey: 'taskResponse' | 'taskAchievement' | 'coherenceCohesion' | 'lexicalResource' | 'grammaticalRange';
  essayLooksFine?: (essay: string) => boolean;
  /** The guided WrittenFocusedTask id the hand-off points at. */
  handoffTaskId: string;
  /** The card's headline, in the student's own terms. */
  headlineKey: string;
}

/** Every WP20 objective except the overview, which keeps findOverviewGap
    exactly as it was (see findWritingGap). Priority order: Task 1 objectives
    first (nearest to the overview pilot this extends), then Task 2, then
    the one rule that reads either task (sentence correction). */
export const WRITING_OBJECTIVE_RULES: readonly WritingObjectiveRule[] = [
  {
    subskill: 'task1-select-key-features',
    task: 'task1',
    keyword: 'key features|main features|which features (?:to|you) (?:select|choose|report)',
    criterionKey: 'taskResponse',
    essayLooksFine: (essay) => figuresIn(essay).length > 0,
    handoffTaskId: 'writing-task1-select-key-features-guided',
    headlineKey: 'Work on selecting key features',
  },
  {
    subskill: 'task1-compare-and-group',
    task: 'task1',
    keyword: 'compar(?:e|ed|ing|ison)|listing (?:the )?(?:figures|categories)',
    criterionKey: 'taskResponse',
    essayLooksFine: hasComparisonLanguage,
    handoffTaskId: 'writing-task1-compare-and-group-guided',
    headlineKey: 'Work on comparing rather than listing',
  },
  {
    subskill: 'task1-data-language',
    task: 'task1',
    keyword: 'data language|trend language|accuracy of (?:the )?figures',
    criterionKey: 'taskResponse',
    essayLooksFine: hasTrendLanguage,
    handoffTaskId: 'writing-task1-data-language-guided',
    headlineKey: 'Work on describing the trend accurately',
  },
  {
    subskill: 'task1-process-sequence',
    task: 'task1',
    keyword: 'sequenc(?:e|ing)|order of (?:the )?stages',
    criterionKey: 'taskResponse',
    essayLooksFine: hasSequencingLanguage,
    handoffTaskId: 'writing-task1-process-sequence-guided',
    headlineKey: 'Work on the order of the process',
  },
  {
    subskill: 'task1-map-change',
    task: 'task1',
    keyword: 'location language|change language|describing the change',
    criterionKey: 'taskResponse',
    essayLooksFine: hasChangeLanguage,
    handoffTaskId: 'writing-task1-map-change-guided',
    headlineKey: 'Work on describing the change',
  },
  {
    subskill: 'task2-position-and-thesis',
    task: 'task2',
    keyword: '(?:clear )?position|thesis|introduction',
    criterionKey: 'taskResponse',
    essayLooksFine: hasPositionStatement,
    handoffTaskId: 'writing-task2-position-and-thesis-guided',
    headlineKey: 'Work on your introduction',
  },
  {
    subskill: 'task2-support-a-claim',
    task: 'task2',
    keyword: 'example|explanation|unsupported|support(?:s|ed|ing)? (?:the|your|this) (?:claim|argument|point)',
    criterionKey: 'taskResponse',
    essayLooksFine: hasExampleSignal,
    handoffTaskId: 'writing-task2-support-a-claim-guided',
    headlineKey: 'Work on supporting your claims',
  },
  {
    subskill: 'paragraph-organisation',
    task: 'task2',
    keyword: 'topic sentences?|paragraph structure|body paragraphs?',
    criterionKey: 'coherenceCohesion',
    handoffTaskId: 'writing-task2-paragraph-organisation-guided',
    headlineKey: 'Work on organising a body paragraph',
  },
  {
    subskill: 'cohesion-and-linking',
    task: 'task2',
    keyword: 'cohesion|linking words?|linkers?|mechanical',
    criterionKey: 'coherenceCohesion',
    handoffTaskId: 'writing-task2-cohesion-and-linking-guided',
    headlineKey: 'Work on cohesion',
  },
  {
    subskill: 'task2-conclusion',
    task: 'task2',
    keyword: 'conclusion',
    criterionKey: 'taskResponse',
    handoffTaskId: 'writing-task2-conclusion-guided',
    headlineKey: 'Work on your conclusion',
  },
  /* ── WP20b additions (2026-09-22): the coverage round's Lexical Resource
     and Grammatical Range objectives. Placed before sentence-correction so
     their more specific keywords are tried first; sentence-correction's own
     broad "grammar" catch-all stays exactly as it was, as the fallback for
     anything none of these five name specifically. */
  {
    subskill: 'lexical-precision',
    task: 'task2',
    keyword: 'precise vocabulary|topic vocabulary|vocabulary (?:range|precision)|word choice|generic (?:word|vocabulary)',
    criterionKey: 'lexicalResource',
    essayLooksFine: hasEnoughTopicVocabulary,
    handoffTaskId: 'writing-lexical-topic-vocabulary-guided',
    headlineKey: 'Work on precise topic vocabulary',
  },
  {
    subskill: 'task2-paraphrase-the-question',
    task: 'task2',
    keyword: 'paraphrase|paraphrasing|own words|copying the question|copied the question|lifted (?:the |from the )?question',
    criterionKey: 'lexicalResource',
    handoffTaskId: 'writing-task2-paraphrase-the-question-guided',
    headlineKey: 'Work on paraphrasing the question',
  },
  {
    subskill: 'task1-avoid-repetition',
    task: 'task1',
    keyword: 'repetition|repeated (?:word|words|vocabulary)|repeats (?:the )?same|synonyms?',
    criterionKey: 'lexicalResource',
    handoffTaskId: 'writing-task1-avoid-repetition-guided',
    headlineKey: 'Work on varying your trend and quantity words',
  },
  {
    subskill: 'collocation-accuracy',
    task: 'either',
    keyword: 'collocations?',
    criterionKey: 'lexicalResource',
    handoffTaskId: 'writing-collocation-accuracy-guided',
    headlineKey: 'Work on collocation accuracy',
  },
  {
    subskill: 'complex-sentences-with-purpose',
    task: 'task2',
    keyword: 'complex sentences?|subordinate clauses?|combine (?:two )?(?:simple )?sentences?',
    criterionKey: 'grammaticalRange',
    handoffTaskId: 'writing-task2-complex-sentences-guided',
    headlineKey: 'Work on combining sentences',
  },
  {
    subskill: 'complex-sentence-range',
    task: 'task2',
    keyword: 'range of structures?|variety of (?:structures?|sentences?)|sentence variety|same (?:sentence )?structure',
    criterionKey: 'grammaticalRange',
    handoffTaskId: 'writing-task2-structure-range-guided',
    headlineKey: 'Work on a range of structures',
  },
  {
    subskill: 'sentence-correction',
    task: 'either',
    keyword: 'grammar|sentence structure|tense|subject.verb agreement|articles?',
    criterionKey: 'grammaticalRange',
    handoffTaskId: 'writing-sentence-correction-number-of',
    headlineKey: 'Work on this grammar pattern',
  },
  {
    subskill: 'recurring-pattern-accuracy',
    task: 'either',
    keyword: 'articles?|tense consistency|inconsistent tenses?',
    criterionKey: 'grammaticalRange',
    handoffTaskId: 'writing-recurring-pattern-accuracy-guided',
    headlineKey: 'Work on this grammar pattern',
  },
];

/** One rule's finding for one set of attempts, or null when this rule has
    nothing to say (no attempt of the task it reads, no marker complaint,
    and either no automatic check or the essay passes it). Never a definite
    "nothing-found" answer the way findOverviewGap gives one for ITS single
    objective: with eleven rules to try, "this one has nothing" just means
    try the next one. */
function findRuleGap(rule: WritingObjectiveRule, attempts: readonly GradedWritingAttempt[]): OverviewGapFinding | null {
  const attempt =
    rule.task === 'either' ? latestEither(attempts) : rule.task === 'task1' ? latestTask1(attempts) : latestTask2(attempts);
  if (!attempt) return null;

  const about = { promptId: attempt.promptId, promptTitle: attempt.promptTitle, at: attempt.at };
  const report = attempt.report;
  const live = attempt.live === true || report?.grader?.live === true;

  if (report && live) {
    const criterion = report.criteria?.[rule.criterionKey];
    const sources: { where: MarkerSource; text: string | undefined }[] = [
      { where: 'criterion-comment', text: criterion?.comment },
      { where: 'criterion-tip', text: criterion?.tip },
      { where: 'next-band-advice', text: criterion?.nextBand?.gap },
      ...(criterion?.nextBand?.actions ?? []).map((action) => ({ where: 'next-band-advice' as const, text: action.do })),
      ...(report.moments ?? []).map((moment) => ({ where: 'quoted-moment' as const, text: moment.note })),
      ...(report.improvements ?? []).map((line) => ({ where: 'improvement' as const, text: line })),
    ];
    for (const source of sources) {
      const quote = markerComplaintIn(source.text, rule.keyword);
      if (quote) return { basis: 'marker', found: true, quote, where: source.where, ...about };
    }
  }

  const essay = attempt.essay ?? '';
  if (essay.trim() && rule.essayLooksFine && !rule.essayLooksFine(essay)) {
    return { basis: 'automatic-check', found: true, ...about };
  }

  return null;
}

/** One objective's finding, plus which one it is and where to hand off to. */
export interface WritingGapFinding extends OverviewGapFinding {
  subskill: string;
  handoffTaskId: string;
  headlineKey: string;
}

/** The gap-finding rule generalised across every WP20 objective, and the
 *  ONE calm hand-off it is allowed to offer.
 *
 *  The overview keeps first refusal: findOverviewGap is Pilot B's own
 *  function, unchanged, and its own tests hold it to the exact wording it
 *  always had. Everything else tries in the fixed priority order of
 *  WRITING_OBJECTIVE_RULES and stops at the first rule with something real
 *  to say. That is "at most one hand-off per report": the loop returns on
 *  the first finding, never collects more than one. */
export function findWritingGap(attempts: readonly GradedWritingAttempt[]): WritingGapFinding | null {
  const overview = findOverviewGap(attempts);
  if (overview.found) {
    return {
      ...overview,
      subskill: 'task1-overview',
      handoffTaskId: 'writing-task1-overview-guided',
      headlineKey: 'Work on your overview',
    };
  }
  for (const rule of WRITING_OBJECTIVE_RULES) {
    const finding = findRuleGap(rule, attempts);
    if (finding) {
      return { ...finding, subskill: rule.subskill, handoffTaskId: rule.handoffTaskId, headlineKey: rule.headlineKey };
    }
  }
  return null;
}

const GENERIC_MARKER_SOURCE_LABEL: Readonly<Record<MarkerSource, string>> = {
  'task-achievement-comment': 'From your Task Achievement comment.',
  'task-achievement-tip': "From the marker's tip on Task Achievement.",
  'criterion-comment': "From the marker's comment.",
  'criterion-tip': "From the marker's tip.",
  'next-band-advice': "From the marker's advice on reaching the next band.",
  'quoted-moment': 'From a moment the marker quoted from your report.',
  improvement: "From the marker's list of what to improve.",
};

/** Same job as overviewHandoffText, generalised: builds the hand-off card
    from a WritingGapFinding for ANY objective rather than only the
    overview. overviewHandoffText itself is unchanged and still used by
    WorkOnOverview's own tests. */
export function writingHandoffText(finding: WritingGapFinding): OverviewHandoffText | null {
  if (!finding.found) return null;
  if (finding.basis === 'marker') {
    return {
      headlineKey: finding.headlineKey,
      bodyKey: 'The examiner who marked this report said something relevant here.',
      quote: finding.quote,
      sourceKey: finding.where ? GENERIC_MARKER_SOURCE_LABEL[finding.where] : undefined,
    };
  }
  return {
    headlineKey: finding.headlineKey,
    bodyKey:
      'An automatic check of your own report found something worth a closer look here. That is a check of the words you typed, not a judgement of your writing.',
  };
}

/* ── Keeping the student's words ─────────────────────────────────────────── */

/** The three methods of a Storage object, and nothing else. Taken as an
    interface so a test can hand in a few lines of memory, exactly the way
    src/lib/learning/store.browser.ts does. */
export interface WrittenDraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** One saved attempt at a written task, in the student's own full words. */
export interface WrittenAttemptRecord {
  at: string;
  text: string;
  /** The learner record event this attempt produced, when one was written. */
  evidenceId?: string;
  /** The attempt this one revises. */
  revisionOf?: string;
}

export interface WrittenTaskDraft {
  /** What is in the box right now, sent or not. */
  draft: string;
  /** Everything submitted so far, oldest first, so the original and the
      revision can be read side by side. */
  attempts: readonly WrittenAttemptRecord[];
}

export const EMPTY_WRITTEN_DRAFT: WrittenTaskDraft = { draft: '', attempts: [] };

/** Per viewer and per exercise, scoped by the same owner namespace the
 *  learner record uses, so one student's unfinished overview can never
 *  surface for the next one signed in on this browser. Convenience
 *  storage, never evidence: it is what stops a failed evaluation or a
 *  closed tab losing the words, and what the before and after panel
 *  reads. */
export const WRITTEN_DRAFT_PREFIX = 'ielts.learning.written.v1';

export function writtenDraftKey(ownerNamespace: string, exerciseId: string): string {
  return `${WRITTEN_DRAFT_PREFIX}::${ownerNamespace}::${exerciseId}`;
}

export function readWrittenDraft(
  storage: WrittenDraftStorage | null,
  ownerNamespace: string,
  exerciseId: string,
): WrittenTaskDraft {
  if (!storage) return EMPTY_WRITTEN_DRAFT;
  try {
    const raw = storage.getItem(writtenDraftKey(ownerNamespace, exerciseId));
    if (!raw) return EMPTY_WRITTEN_DRAFT;
    const parsed = JSON.parse(raw) as Partial<WrittenTaskDraft>;
    return {
      draft: typeof parsed.draft === 'string' ? parsed.draft : '',
      attempts: Array.isArray(parsed.attempts)
        ? parsed.attempts.filter((entry): entry is WrittenAttemptRecord => typeof entry?.text === 'string')
        : [],
    };
  } catch {
    /* Corrupt or blocked reads as nothing kept, exactly the way the learner
       record treats corrupt JSON. The exercise still works. */
    return EMPTY_WRITTEN_DRAFT;
  }
}

export function writeWrittenDraft(
  storage: WrittenDraftStorage | null,
  ownerNamespace: string,
  exerciseId: string,
  value: WrittenTaskDraft,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(writtenDraftKey(ownerNamespace, exerciseId), JSON.stringify(value));
    return true;
  } catch {
    /* A full or blocked browser store costs the copy, never the work: the
       text is still in this tab's own state. */
    return false;
  }
}

/** Add one submitted attempt, keeping everything before it. The draft box
    is left holding the same words, so a student who submitted and is about
    to revise does not find an empty box. */
export function withAttempt(held: WrittenTaskDraft, attempt: WrittenAttemptRecord): WrittenTaskDraft {
  return { draft: attempt.text, attempts: [...held.attempts, attempt] };
}

/* ── What the student is told afterwards ─────────────────────────────────── */

/** Everything the closing panel says, as keys and values rather than
 *  sentences, so the component puts them through t() and Russian gets the
 *  same structure. Nothing here is a band and nothing claims mastery. */
export interface WrittenFeedbackText {
  demonstratedKey: string;
  demonstratedVars?: Record<string, string | number>;
  certaintyKey: string;
  uncertainKey: string;
}

export function writtenFeedbackFor(input: {
  role: WrittenTaskView['role'];
  evaluation: WrittenEvaluation;
  assisted: boolean;
}): WrittenFeedbackText {
  if (!input.evaluation.judged) {
    return {
      demonstratedKey:
        'Nothing looked at your writing this time, so there is no judgement of it here. The checks below are automatic: they look at the words you typed and nothing else.',
      certaintyKey:
        'This is recorded as written but not judged, which is what it is. It changes nothing about what your plan thinks you can do.',
      uncertainKey: 'Read your own sentence against the model below and mark the words that meet the objective.',
    };
  }
  if (input.role === 'independent-check') {
    return {
      demonstratedKey:
        'On a visual you had not seen, with no guiding questions and no help, Mr EZ judged this against the one objective above.',
      certaintyKey:
        'That is one short sample judged against one objective. It is enough to move what your plan works on next, and it is not a band and not a score for a whole report.',
      uncertainKey:
        'What two sentences cannot show is whether the rest of the report holds up under twenty minutes. A full Task 1 marked by the examiner is what shows that.',
    };
  }
  return {
    demonstratedKey: input.assisted
      ? 'You wrote this with the guiding questions available, so it shows guided work rather than what you can do on your own.'
      : 'You wrote this without opening the guiding questions.',
    certaintyKey:
      'This was practice. The check that follows, on a chart you have not seen, is what shows whether the method travels.',
    uncertainKey: 'Nothing here is a band, and one overview is never mastery.',
  };
}

/* ── The hand-off from a graded report ───────────────────────────────────── */

/** What the "Work on your overview" card says, built from the finding so
 *  the wording can never drift from the evidence behind it.
 *
 *  `quote` is the marker's own sentence and is rendered as a quotation, in
 *  English, because it is what an examiner wrote about this student's own
 *  work. Everything around it is translated. */
export interface OverviewHandoffText {
  headlineKey: string;
  bodyKey: string;
  bodyVars?: Record<string, string | number>;
  /** Shown as a quotation under the body, never reworded. */
  quote?: string;
  /** One line naming where the quote came from. */
  sourceKey?: string;
}

const MARKER_SOURCE_LABEL: Readonly<Record<MarkerSource, string>> = {
  'task-achievement-comment': 'From your Task Achievement comment.',
  'task-achievement-tip': "From the marker's tip on Task Achievement.",
  /* Never actually produced by findOverviewGap, which only ever names the
     two sources above for itself; carried here only so this record stays
     exhaustive over MarkerSource now that WP20's generalised rules added
     two more values to that type (see GENERIC_MARKER_SOURCE_LABEL, which is
     what findWritingGap's own entries actually use). */
  'criterion-comment': "From the marker's comment.",
  'criterion-tip': "From the marker's tip.",
  'next-band-advice': "From the marker's advice on reaching the next band.",
  'quoted-moment': 'From a moment the marker quoted from your report.',
  improvement: "From the marker's list of what to improve.",
};

export function overviewHandoffText(finding: OverviewGapFinding): OverviewHandoffText | null {
  if (!finding.found) return null;
  if (finding.basis === 'marker') {
    return {
      headlineKey: 'Work on your overview',
      bodyKey: 'The examiner who marked this report said something about your overview.',
      quote: finding.quote,
      sourceKey: finding.where ? MARKER_SOURCE_LABEL[finding.where] : undefined,
    };
  }
  const missingSignal = (finding.failedChecks ?? []).includes('summarising-signal');
  return {
    headlineKey: 'Work on your overview',
    bodyKey: missingSignal
      ? 'An automatic check of your own report found no sentence that opens as a summary. That is a check of the words you typed, not a judgement of your writing.'
      : 'An automatic check of your own report found figures inside the sentence that summarises it. That is a check of the words you typed, not a judgement of your writing.',
  };
}
