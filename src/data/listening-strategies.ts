/* Strategy content for the Listening Trainer's live "how to approach it"
   panel, same entry shape as src/data/reading-strategies.ts. Covers only the
   question types that actually occur in the listening test data (grep
   `"type":` across src/data/tests/listening-full-*.ts): sentence-completion,
   multiple-choice, table-completion, multiple-answer, matching-features,
   categorisation, diagram-labelling. The schema has no separate "form
   completion" or "note completion" type: imported data represents those as
   sentence-completion (a single blank in running text) or table-completion
   (a grid of blanks), so the guidance for both mentions forms and notes
   directly. */

import type { QuestionType } from '../lib/tests/schema';
import { nt } from '../lib/i18n/translate';

export interface ListeningStrategy {
  /** The official question type name, kept in English for the same reason as
      in reading-strategies.ts: the student meets these words on the paper. */
  label: string;
  /** Advice, translated at the point of display by StrategyPanel. The
      Russian lives in the lazily loaded "strategies" dictionary part. */
  steps: string[];
  traps: string[];
}

type ListeningStrategyKey =
  | 'sentence'
  | 'mc'
  | 'table'
  | 'multiple-answer'
  | 'matching-features'
  | 'categorisation'
  | 'diagram';

export const LISTENING_STRATEGIES: Record<ListeningStrategyKey, ListeningStrategy> = {
  sentence: {
    label: 'Sentence, Note & Short-answer Completion',
    steps: [
      nt(
        'Before the audio starts, read the gaps and predict what type of word is missing: a name, a number, a date, a place, or a single noun.',
      ),
      nt('The answers come in the same order as the recording, so let each gap guide you to the next one as you listen.'),
      nt(
        'Listen for a signal that the speaker is about to correct themselves (for example, "sorry, I mean" or "actually, make that"). When that happens, the later version is the one that counts.',
      ),
      nt(
        'Numbers, dates and spellings are usually dictated directly. Write exactly what you hear, including any letters spelled out.',
      ),
      nt(
        'The speaker will often mention a detail first and then reject or change it. Do not commit to the first thing you hear if the sentence keeps going.',
      ),
      nt(
        'Check the word limit before you listen. A hyphenated word (for example, "well-known") counts as one word even though it has a hyphen.',
      ),
      nt(
        'Figures are accepted even when the instructions say "words", so write "15" rather than "fifteen" unless the limit says otherwise.',
      ),
    ],
    traps: [
      nt('writing the first number or word you hear, before the speaker corrects it'),
      nt('missing a spelled-out word because you stopped listening'),
      nt('going over the stated word limit'),
    ],
  },
  mc: {
    label: 'Multiple Choice',
    steps: [
      nt(
        'Read the question and every option before the audio for that part begins. There is no time to read once the speaker starts.',
      ),
      nt('Underline the key idea in each option so you know exactly what to listen for.'),
      nt(
        'The recording usually mentions all the options, but only one matches what is actually said. Expect the others to be distractors.',
      ),
      nt(
        'Listen for a correction or change of mind ("at first we thought... but actually"). The final statement is the one that counts, not the first.',
      ),
      nt(
        'Answers come in the same order as the questions, so once the topic of the next question begins, the current one is almost certainly finished.',
      ),
      nt('Choose the option that matches the meaning of what is said, not just a word you happen to recognise.'),
    ],
    traps: [
      nt('choosing an option because you heard its exact wording, when the speaker then rejected it'),
      nt('picking an answer before the speaker finishes the sentence'),
      nt('assuming the first idea mentioned is the final answer'),
    ],
  },
  table: {
    label: 'Table, Form & Note Completion',
    steps: [
      nt(
        'Look at the table, form or notes before listening. The headings and any given information show what kind of detail (a name, a number, an address) belongs in each gap.',
      ),
      nt(
        'The gaps are filled in the same order as the conversation, so treat each one as a signpost for where you are in the recording.',
      ),
      nt('Names and addresses are often spelled out letter by letter. Write down each letter as you hear it.'),
      nt(
        'Numbers, including phone numbers, dates and prices, are dictated directly. Write the figures, not the words, unless told otherwise.',
      ),
      nt('If the speaker corrects a detail (for example, changes a date or a spelling), keep the later version.'),
      nt('Check the stated word or figure limit for the gap. A hyphenated word counts as one word.'),
    ],
    traps: [
      nt('writing a detail that is later corrected by the speaker'),
      nt('missing letters while a name or address is being spelled'),
      nt('confusing similar-sounding numbers (for example, thirteen and thirty)'),
    ],
  },
  'multiple-answer': {
    label: 'Multiple Answer (choose more than one)',
    steps: [
      nt('Read all the options before listening. Note exactly how many you need to choose, the question states it.'),
      nt(
        'The recording will usually mention every option. Some are confirmed, some are rejected or replaced. Only the confirmed ones count.',
      ),
      nt(
        'Listen to the full discussion of each option. Do not select a choice the moment you hear it named, it may be dismissed moments later.',
      ),
      nt(
        'The correct options are not always confirmed in the same order as the printed list, so keep tracking every option until the part ends.',
      ),
      nt('Stop adjusting your answers once the topic clearly moves on. Speakers rarely return to an earlier point.'),
    ],
    traps: [
      nt('selecting an option as soon as it is mentioned, before hearing whether it is accepted or rejected'),
      nt('choosing too few or too many options'),
    ],
  },
  'matching-features': {
    label: 'Matching (features, people, places)',
    steps: [
      nt(
        'Read the list of options first and understand what each one represents: a person, a place, an opinion, or a service.',
      ),
      nt('The items to match usually come up in the order they appear in the recording, so follow along in order.'),
      nt("Listen for the description or opinion attached to each item, not just the item's name."),
      nt(
        'The same option can be used more than once unless the instructions say otherwise. Check the instructions before assuming each is used only once.',
      ),
      nt('Distractor options may be mentioned and then ruled out. Rely on what the speaker settles on, not on the first mention.'),
    ],
    traps: [
      nt('assuming each option can only be used once when the instructions do not say that'),
      nt("matching by the option's name rather than by the description actually given"),
    ],
  },
  categorisation: {
    label: 'Categorisation',
    steps: [
      nt('Read the category headings first and understand what belongs in each group.'),
      nt('Items to sort come up in the order they are discussed, so listen for one at a time.'),
      nt(
        'The speaker may place an item in one category and then move it, or compare it against another. Keep the final placement, not the first one mentioned.',
      ),
      nt('Some categories may end up with more items than others. Do not force an even split.'),
      nt('Listen for the reason given for each placement, it usually contains the exact clue that decides the category.'),
    ],
    traps: [
      nt('placing an item in the first category mentioned, before hearing the full reasoning'),
      nt('assuming categories are filled evenly'),
    ],
  },
  diagram: {
    label: 'Diagram / Map Labelling',
    steps: [
      nt(
        'Study the diagram or map before listening. Identify what is already labelled and where reference points (entrances, north) are.',
      ),
      nt(
        'The labels are usually described in a logical order, for example moving around a room or map. Follow the direction as it is described.',
      ),
      nt(
        'Listen for prepositions of place and direction (next to, opposite, past, turn left). These fix the exact position, not just the object named.',
      ),
      nt('Names and letters are sometimes spelled out. Write them exactly as dictated.'),
      nt('If the speaker changes direction or corrects a position, keep the corrected version.'),
    ],
    traps: [
      nt('placing a label based on the object mentioned, without listening to the direction word that fixes its position'),
      nt('losing track of your position on the diagram after a direction change'),
    ],
  },
};

/** Only the question types present in the listening data are mapped, a type
    with no listening data (e.g. tfng, matching-headings) has nothing to look
    up here, StrategyPanel treats a missing entry as "no panel for this
    type" rather than an error. */
export const LISTENING_QUESTION_TYPE_STRATEGY: Partial<Record<QuestionType, ListeningStrategyKey>> = {
  'sentence-completion': 'sentence',
  'multiple-choice': 'mc',
  'table-completion': 'table',
  'multiple-answer': 'multiple-answer',
  'matching-features': 'matching-features',
  categorisation: 'categorisation',
  'diagram-labelling': 'diagram',
};

/** Listening lesson slug (under /lessons/listening/<slug>, see
    src/data/listening.ts's LISTENING_PARTS) that teaches each strategy. Lets
    the weak-spot panel link straight from a question type to the lesson that
    covers it. No listening lesson names multiple-answer or categorisation
    directly, so both link to the closest sibling: choosing from options
    (multiple-choice) and sorting into groups (matching). */
export const STRATEGY_LESSON_SLUG: Record<ListeningStrategyKey, string> = {
  sentence: 'sentence-completion',
  mc: 'multiple-choice',
  table: 'form-completion',
  'multiple-answer': 'multiple-choice',
  'matching-features': 'matching',
  categorisation: 'matching',
  diagram: 'map-labelling',
};

/** The listening lesson slug for a question type, ready to drop into
    `/lessons/listening/${slug}`, or undefined if the type doesn't occur in
    the listening data (see LISTENING_QUESTION_TYPE_STRATEGY above). */
export function listeningLessonSlug(type: QuestionType): string | undefined {
  const key = LISTENING_QUESTION_TYPE_STRATEGY[type];
  return key ? STRATEGY_LESSON_SLUG[key] : undefined;
}
