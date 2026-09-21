/* Strategy content ported from the "How to Approach It" sections of the
   reading lessons (src/content/lesson-bodies/reading-*.html), surfaced live
   during drill practice instead of staying buried in the lesson pages. Keyed
   by lesson rather than QuestionType directly, since a couple of question
   types with no dedicated lesson (multiple-answer, categorisation) borrow
   the mechanically-closest sibling's strategy. See QUESTION_TYPE_STRATEGY
   below for exactly which. */

import type { QuestionType } from '../lib/tests/schema';
import { nt } from '../lib/i18n/translate';

export interface ReadingStrategy {
  /** The official question type name, exactly as it appears on the real exam
      paper. Never translated: a Russian student has to recognise these exact
      English words in the instructions. */
  label: string;
  /** Advice, so it IS translated. Marked with nt() here and put through t()
      by StrategyPanel. The Russian lives in the lazily loaded "strategies"
      dictionary part, not in the main chunk. */
  steps: string[];
  traps: string[];
}

type StrategyKey =
  | 'tfng'
  | 'ynng'
  | 'mc'
  | 'headings'
  | 'matching-information'
  | 'sentence'
  | 'sentence-endings'
  | 'diagram'
  | 'matching-features'
  | 'summary';

export const READING_STRATEGIES: Record<StrategyKey, ReadingStrategy> = {
  tfng: {
    label: 'True / False / Not Given',
    steps: [
      nt('Read each statement carefully and identify keywords.'),
      nt('Scan the passage to locate the relevant section (answers appear in order).'),
      nt('Read that section and the sentences around it. Not just one line.'),
      nt('Focus on meaning, not just word-matching. The passage will paraphrase the statement.'),
      nt('Be especially careful with NOT GIVEN. Ask: "does the passage give any information about this at all?"'),
    ],
    traps: [
      nt('"believed" ≠ factual truth'),
      nt('numbers without context (increase? decrease?)'),
      nt('idiomatic expressions. Read for meaning'),
    ],
  },
  mc: {
    label: 'Multiple Choice',
    steps: [
      nt('Read the question and all of the options carefully before looking at the passage.'),
      nt('Identify differences between the options. They may be subtly different.'),
      nt('Prepare paraphrases and synonyms for the question keywords.'),
      nt('Scan the passage for the relevant section (answers come in order).'),
      nt('Read the surrounding sentences. Not just the one that matches.'),
      nt(
        'You may see information about several of the options in the passage. Unless the instructions ask for more than one answer, only one is correct.',
      ),
      nt('Choose based on deeper meaning, not just word-matching.'),
    ],
    traps: [
      nt('every option may appear somewhere in the passage. Appearing is not the same as answering the question'),
      nt('similar-sounding options with small but crucial differences'),
    ],
  },
  headings: {
    label: 'Matching Headings',
    steps: [
      nt('Read through all the headings first and note synonyms/paraphrases.'),
      nt('For each paragraph, read to find its central aim. What is the paragraph mainly about?'),
      nt('Distinguish between the main idea and supporting examples or details.'),
      nt('Eliminate headings that only match one sentence in the paragraph.'),
      nt('Watch for headings that look similar. Compare them carefully.'),
      nt('Your answer must be a roman numeral, written the way it appears in the list (e.g. iii).'),
    ],
    traps: [
      nt('choosing a heading that matches one detail, not the whole paragraph'),
      nt('headings with similar wording. Look at meaning, not just words'),
    ],
  },
  'matching-information': {
    label: 'Matching Information',
    steps: [
      nt('Read all the statements first and identify keywords and paraphrases.'),
      nt('Skim the passage to get a sense of what each paragraph covers.'),
      nt('For each statement, scan the passage for keywords or synonyms.'),
      nt('When you find the relevant section, confirm it contains the information in the statement.'),
      nt('Remember: a paragraph can answer more than one question. Check the instructions.'),
    ],
    traps: [
      nt('confusing this with Matching Headings'),
      nt('forgetting that one letter can be used more than once when the instructions allow it'),
      nt('expecting the answers in passage order. This is one of the types that does not follow it'),
    ],
  },
  sentence: {
    label: 'Sentence Completion',
    steps: [
      nt('Read each incomplete sentence and identify keywords before searching.'),
      nt('Think about what type of word is missing (noun, verb, adjective, number?).'),
      nt('Scan the passage using keywords and synonyms to locate the relevant section.'),
      nt(
        'Read carefully around that section and identify the exact word(s) that complete the sentence logically and grammatically.',
      ),
      nt('Write the answer. Check spelling and word count.'),
    ],
    traps: [
      nt('paraphrasing instead of copying exact words'),
      nt('going over the word limit'),
      nt('ignoring grammar. The completed sentence must make grammatical sense'),
    ],
  },
  diagram: {
    label: 'Diagram / Table Labelling',
    steps: [
      nt('Study the diagram first. What is it showing? What parts are labelled and what are blank?'),
      nt('Read the passage and identify the section that describes it.'),
      nt('Match each blank to the position on the diagram. Think about location/function.'),
      nt('Find the exact word(s) in the passage that name that part.'),
      nt('Check the word limit. Never exceed it.'),
    ],
    traps: [
      nt('writing paraphrases instead of exact passage words'),
      nt('exceeding the word limit'),
      nt('misspelling technical terms'),
    ],
  },
  'matching-features': {
    label: 'Matching Features',
    steps: [
      nt('Read the options carefully. Understand what each one represents (people, theories, places, dates, or groups).'),
      nt('Skim the passage to identify which section refers to each option.'),
      nt('Read each statement and identify keywords.'),
      nt('Locate the relevant passage section and decide which option the information belongs to.'),
      nt("Don't panic if the same letter appears several times. That's normal."),
    ],
    traps: [nt('using general knowledge. Rely only on the passage'), nt('assuming each option is used only once')],
  },
  ynng: {
    label: 'Yes / No / Not Given',
    steps: [
      nt('Underline words in the statement that show it is about an opinion, not a fact.'),
      nt('Scan for the matching part of the passage. Answers come in the same order as the passage.'),
      nt(
        "Check whose opinion is being reported. A view the writer only quotes from someone else is not automatically the writer's own.",
      ),
      nt(
        "Compare the statement's strength to the writer's: an absolute claim is NO if the writer only hints at something weaker.",
      ),
      nt(
        'If the writer never states a view on the exact point, choose NOT GIVEN. Do not guess what they would probably think.',
      ),
    ],
    traps: [
      nt("a strong opinion reported from someone else mistaken for the writer's own"),
      nt('assuming NOT GIVEN means the writer disagrees, when they simply never mention it'),
    ],
  },
  'sentence-endings': {
    label: 'Matching Sentence Endings',
    steps: [
      nt('Read every beginning first, and check what grammatical form each one needs to continue naturally.'),
      nt('Read every ending too, and note its grammatical form before matching anything.'),
      nt('Eliminate any ending whose grammar cannot follow a given beginning, even if the topic looks related.'),
      nt("Scan the passage for the section covering each beginning's topic. Answers appear in passage order."),
      nt("Confirm the surviving ending against the passage's actual facts, not just how fluent it sounds."),
    ],
    traps: [
      nt('an ending that fits grammatically but contradicts the passage'),
      nt('two endings that both sound plausible for the same beginning'),
    ],
  },
  summary: {
    label: 'Summary, Note, Table & Flow-chart Completion',
    steps: [
      nt(
        'Read the whole summary, notes, table, or flow-chart first, ignoring the gaps, to see what part of the passage it retells.',
      ),
      nt('For each gap, decide what kind of word is missing (a noun, a number, a process, a name?).'),
      nt(
        'Find the part of the passage the task is drawn from. The answers usually all sit inside that one part, though not necessarily in the order of the gaps.',
      ),
      nt('If choosing from a box, compare each remaining option carefully. More than one may look tempting.'),
      nt('Reread the completed sentence or step to check it makes grammatical sense and matches the passage.'),
    ],
    traps: [nt("writing a paraphrase instead of the passage's exact word"), nt('going over the stated word limit')],
  },
};

/* multiple-answer has no dedicated lesson, it borrows the
   mechanically-closest sibling's strategy (mc). categorisation has no
   dedicated lesson either, it is the older name for matching-features and
   borrows that lesson's strategy directly. */
export const QUESTION_TYPE_STRATEGY: Record<QuestionType, StrategyKey> = {
  tfng: 'tfng',
  'yes-no-notgiven': 'ynng',
  'multiple-choice': 'mc',
  'multiple-answer': 'mc',
  'matching-headings': 'headings',
  'paragraph-matching': 'matching-information',
  'sentence-completion': 'sentence',
  'sentence-endings': 'sentence-endings',
  'diagram-labelling': 'diagram',
  'table-completion': 'summary',
  categorisation: 'matching-features',
  'matching-features': 'matching-features',
};

/** Reading lesson slug (under /lessons/reading/<slug>, see
    src/data/reading.ts's READING_PARTS) that teaches each strategy. Lets the
    weak-spot panel link straight from a question type to the lesson that
    covers it. multiple-answer and categorisation link to the lesson for the
    sibling strategy they borrow, same as above. */
export const STRATEGY_LESSON_SLUG: Record<StrategyKey, string> = {
  tfng: 'tfng',
  ynng: 'ynng',
  mc: 'mc',
  headings: 'headings',
  'matching-information': 'matching-information',
  sentence: 'sentence',
  'sentence-endings': 'matching-sentence-endings',
  diagram: 'diagram',
  'matching-features': 'matching-features',
  summary: 'summary-completion',
};

/** The reading lesson slug for a question type, ready to drop into
    `/lessons/reading/${slug}`. */
export function readingLessonSlug(type: QuestionType): string {
  return STRATEGY_LESSON_SLUG[QUESTION_TYPE_STRATEGY[type]];
}
