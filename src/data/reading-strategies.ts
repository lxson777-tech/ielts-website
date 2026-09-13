/* Strategy content ported from the "How to Approach It" sections of the
   reading lessons (src/content/lesson-bodies/reading-*.html), surfaced live
   during drill practice instead of staying buried in the lesson pages. Keyed
   by lesson rather than QuestionType directly, since a couple of question
   types with no dedicated lesson (multiple-answer, categorisation) borrow
   the mechanically-closest sibling's strategy. See QUESTION_TYPE_STRATEGY
   below for exactly which. */

import type { QuestionType } from '../lib/tests/schema';

export interface ReadingStrategy {
  label: string;
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
      'Read each statement carefully and identify keywords.',
      'Scan the passage to locate the relevant section (answers appear in order).',
      'Read that section and the sentences around it. Not just one line.',
      'Focus on meaning, not just word-matching. The passage will paraphrase the statement.',
      'Be especially careful with NOT GIVEN. Ask: "does the passage give any information about this at all?"',
    ],
    traps: [
      '"believed" ≠ factual truth',
      'numbers without context (increase? decrease?)',
      'idiomatic expressions. Read for meaning',
    ],
  },
  mc: {
    label: 'Multiple Choice',
    steps: [
      'Read the question and all three options carefully before looking at the passage.',
      'Identify differences between the options. They may be subtly different.',
      'Prepare paraphrases and synonyms for the question keywords.',
      'Scan the passage for the relevant section (answers come in order).',
      'Read the surrounding sentences. Not just the one that matches.',
      'You may see information about all three options in the passage. Only one is correct.',
      'Choose based on deeper meaning, not just word-matching.',
    ],
    traps: [
      'all options may appear in the passage. Only one is accurate',
      'similar-sounding options with small but crucial differences',
    ],
  },
  headings: {
    label: 'Matching Headings',
    steps: [
      'Read through all the headings first and note synonyms/paraphrases.',
      'For each paragraph, read to find its central aim. What is the paragraph mainly about?',
      'Distinguish between the main idea and supporting examples or details.',
      'Eliminate headings that only match one sentence in the paragraph.',
      'Watch for headings that look similar. Compare them carefully.',
      'Your answer must be a roman numeral (e.g. III).',
    ],
    traps: [
      'choosing a heading that matches one detail, not the whole paragraph',
      'headings with similar wording. Look at meaning, not just words',
    ],
  },
  'matching-information': {
    label: 'Matching Information',
    steps: [
      'Read all the statements first and identify keywords and paraphrases.',
      'Skim the passage to get a sense of what each paragraph covers.',
      'For each statement, scan the passage for keywords or synonyms.',
      'When you find the relevant section, confirm it contains the information in the statement.',
      'Remember: a paragraph can answer more than one question. Check the instructions.',
    ],
    traps: ['confusing this with Matching Headings', 'forgetting that one letter can be used more than once'],
  },
  sentence: {
    label: 'Sentence Completion',
    steps: [
      'Read each incomplete sentence and identify keywords before searching.',
      'Think about what type of word is missing (noun, verb, adjective, number?).',
      'Scan the passage using keywords and synonyms to locate the relevant section.',
      'Read carefully around that section and identify the exact word(s) that complete the sentence logically and grammatically.',
      'Write the answer. Check spelling and word count.',
    ],
    traps: [
      'paraphrasing instead of copying exact words',
      'going over the word limit',
      'ignoring grammar. The completed sentence must make grammatical sense',
    ],
  },
  diagram: {
    label: 'Diagram / Table Labelling',
    steps: [
      'Study the diagram first. What is it showing? What parts are labelled and what are blank?',
      'Read the passage and identify the section that describes it.',
      'Match each blank to the position on the diagram. Think about location/function.',
      'Find the exact word(s) in the passage that name that part.',
      'Check the word limit. Never exceed it.',
    ],
    traps: [
      'writing paraphrases instead of exact passage words',
      'exceeding the word limit',
      'misspelling technical terms',
    ],
  },
  'matching-features': {
    label: 'Matching Features',
    steps: [
      'Read the options carefully. Understand what each one represents (people, theories, places, dates, or groups).',
      'Skim the passage to identify which section refers to each option.',
      'Read each statement and identify keywords.',
      'Locate the relevant passage section and decide which option the information belongs to.',
      "Don't panic if the same letter appears several times. That's normal.",
    ],
    traps: ['using general knowledge. Rely only on the passage', 'assuming each option is used only once'],
  },
  ynng: {
    label: 'Yes / No / Not Given',
    steps: [
      'Underline words in the statement that show it is about an opinion, not a fact.',
      'Scan for the matching part of the passage. Answers come in the same order as the passage.',
      "Check whose opinion is being reported. A view the writer only quotes from someone else is not automatically the writer's own.",
      'Compare the statement\'s strength to the writer\'s: an absolute claim is NO if the writer only hints at something weaker.',
      'If the writer never states a view on the exact point, choose NOT GIVEN. Do not guess what they would probably think.',
    ],
    traps: [
      "a strong opinion reported from someone else mistaken for the writer's own",
      'assuming NOT GIVEN means the writer disagrees, when they simply never mention it',
    ],
  },
  'sentence-endings': {
    label: 'Matching Sentence Endings',
    steps: [
      'Read every beginning first, and check what grammatical form each one needs to continue naturally.',
      'Read every ending too, and note its grammatical form before matching anything.',
      'Eliminate any ending whose grammar cannot follow a given beginning, even if the topic looks related.',
      'Scan the passage for the section covering each beginning\'s topic. Answers appear in passage order.',
      'Confirm the surviving ending against the passage\'s actual facts, not just how fluent it sounds.',
    ],
    traps: [
      'an ending that fits grammatically but contradicts the passage',
      'two endings that both sound plausible for the same beginning',
    ],
  },
  summary: {
    label: 'Summary, Note, Table & Flow-chart Completion',
    steps: [
      'Read the whole summary, notes, table, or flow-chart first, ignoring the gaps, to see what part of the passage it retells.',
      'For each gap, decide what kind of word is missing (a noun, a number, a process, a name?).',
      'Find the matching section in the passage. It usually keeps the same order as the gaps.',
      'If choosing from a box, compare each remaining option carefully. More than one may look tempting.',
      'Reread the completed sentence or step to check it makes grammatical sense and matches the passage.',
    ],
    traps: ['writing a paraphrase instead of the passage\'s exact word', 'going over the stated word limit'],
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
