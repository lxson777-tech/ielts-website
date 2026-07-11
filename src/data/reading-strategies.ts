/* Strategy content ported from the "How to Approach It" sections of the
   reading lessons (src/content/lesson-bodies/reading-*.html) — surfaced live
   during drill practice instead of staying buried in the lesson pages. Keyed
   by lesson rather than QuestionType directly, since several question types
   share one lesson's technique (e.g. tfng and yes-no-notgiven are the same
   skill under a different name). */

import type { QuestionType } from '../lib/tests/schema';

export interface ReadingStrategy {
  label: string;
  steps: string[];
  traps: string[];
}

type StrategyKey = 'tfng' | 'mc' | 'headings' | 'para' | 'sentence' | 'diagram' | 'cat';

export const READING_STRATEGIES: Record<StrategyKey, ReadingStrategy> = {
  tfng: {
    label: 'True / False / Not Given',
    steps: [
      'Read each statement carefully and identify keywords.',
      'Scan the passage to locate the relevant section (answers appear in order).',
      'Read that section and the sentences around it — not just one line.',
      'Focus on meaning, not just word-matching. The passage will paraphrase the statement.',
      'Be especially careful with NOT GIVEN — ask: "does the passage give any information about this at all?"',
    ],
    traps: [
      '"believed" ≠ factual truth',
      'numbers without context (increase? decrease?)',
      'idiomatic expressions — read for meaning',
    ],
  },
  mc: {
    label: 'Multiple Choice',
    steps: [
      'Read the question and all three options carefully before looking at the passage.',
      'Identify differences between the options — they may be subtly different.',
      'Prepare paraphrases and synonyms for the question keywords.',
      'Scan the passage for the relevant section (answers come in order).',
      'Read the surrounding sentences — not just the one that matches.',
      'You may see information about all three options in the passage — only one is correct.',
      'Choose based on deeper meaning, not just word-matching.',
    ],
    traps: [
      'all options may appear in the passage — only one is accurate',
      'similar-sounding options with small but crucial differences',
    ],
  },
  headings: {
    label: 'Matching Headings',
    steps: [
      'Read through all the headings first and note synonyms/paraphrases.',
      'For each paragraph, read to find its central aim — what is the paragraph mainly about?',
      'Distinguish between the main idea and supporting examples or details.',
      'Eliminate headings that only match one sentence in the paragraph.',
      'Watch for headings that look similar — compare them carefully.',
      'Your answer must be a roman numeral (e.g. III).',
    ],
    traps: [
      'choosing a heading that matches one detail, not the whole paragraph',
      'headings with similar wording — look at meaning, not just words',
    ],
  },
  para: {
    label: 'Matching Paragraph Information',
    steps: [
      'Read all the statements first and identify keywords and paraphrases.',
      'Skim the passage to get a sense of what each paragraph covers.',
      'For each statement, scan the passage for keywords or synonyms.',
      'When you find the relevant section, confirm it contains the information in the statement.',
      'Remember: a paragraph can answer more than one question — check the instructions.',
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
      'Write the answer — check spelling and word count.',
    ],
    traps: [
      'paraphrasing instead of copying exact words',
      'going over the word limit',
      'ignoring grammar — the completed sentence must make grammatical sense',
    ],
  },
  diagram: {
    label: 'Diagram / Table Labelling',
    steps: [
      'Study the diagram first. What is it showing? What parts are labelled and what are blank?',
      'Read the passage and identify the section that describes it.',
      'Match each blank to the position on the diagram — think about location/function.',
      'Find the exact word(s) in the passage that name that part.',
      'Check the word limit — never exceed it.',
    ],
    traps: [
      'writing paraphrases instead of exact passage words',
      'exceeding the word limit',
      'misspelling technical terms',
    ],
  },
  cat: {
    label: 'Categorisation',
    steps: [
      'Read the categories carefully — understand what each one represents.',
      'Skim the passage to identify which section refers to each category.',
      'Read each statement and identify keywords.',
      'Locate the relevant passage section and decide which category the information belongs to.',
      "Don't panic if the same letter appears several times — that's normal.",
    ],
    traps: ['using general knowledge — rely only on the passage', 'assuming each category is used only once'],
  },
};

/* yes-no-notgiven, sentence-endings, table-completion, multiple-answer and
   matching-features have no dedicated lesson — they borrow the
   mechanically-closest sibling's strategy. matching-features → cat is
   confirmed by reading-cat.html itself ("Also called Classification or
   Matching Features"). */
export const QUESTION_TYPE_STRATEGY: Record<QuestionType, StrategyKey> = {
  tfng: 'tfng',
  'yes-no-notgiven': 'tfng',
  'multiple-choice': 'mc',
  'multiple-answer': 'mc',
  'matching-headings': 'headings',
  'paragraph-matching': 'para',
  'sentence-completion': 'sentence',
  'sentence-endings': 'sentence',
  'diagram-labelling': 'diagram',
  'table-completion': 'diagram',
  categorisation: 'cat',
  'matching-features': 'cat',
};
