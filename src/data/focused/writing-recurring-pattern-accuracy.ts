/* Recurring pattern accuracy: articles, the other half of Grammatical Range
 * accuracy beyond writing-sentence-correction.ts's subject-verb agreement
 * pattern. Chosen because article errors (an extra "the" on an uncountable
 * or general noun, a missing "the" on a unique, specific one) are one of the
 * most frequent recurring slips in real IELTS Task 2 writing, and because
 * lead decision Q1's own precedent (the sentence endings lesson, and
 * writing-sentence-correction.ts) already established the shape for this:
 * a real recurring pattern, written here, checked by a teacher before it is
 * anything more than guided practice.
 *
 * WHY THIS IS PROJECT-AUTHORED, GUIDED PRACTICE ONLY, EVER
 * Same reasoning as writing-sentence-correction.ts: the real graded report
 * keeps a quoted moment and the marker's own comment about it, never a
 * separately stored "corrected version". The hand-off (written-focused-
 * task.ts's WRITING_OBJECTIVE_RULES, 'recurring-pattern-accuracy' entry)
 * reads the marker's own grammaticalRange comment for an article, tense or
 * agreement complaint and quotes it word for word; it never manufactures a
 * corrected version of the student's own sentence.
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE = 'Correct a sentence with three article slips, then write your own sentence using "the environment" correctly.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 5,
  maxWords: 40,
  checks: ['sentence-was-changed', 'length-in-range'],
} as const;

const ATTRIBUTION = 'Project-authored practice sentence, checked against a real recurring IELTS pattern; not exam material.';

const NOTICE = [
  '"Public transport" and "traffic" are uncountable, general nouns here, so they take NO article: "Public transport... reduces traffic", not "the public transport" or "a traffic".',
  '"The environment" is one specific, shared thing, so it always takes "the": "helps the environment", never "helps environment".',
  'Deciding whether a noun is general or specific, one of many or the one everyone means, is what article accuracy actually tests.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-recurring-pattern-accuracy-guided',
  subskill: 'recurring-pattern-accuracy',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Grammar pattern: articles',
  objective: OBJECTIVE,
  instruction: 'Read the sentence below and rewrite it correctly. Write your correction, not a comment on what is wrong with it.',
  expectedMinutes: 6,
  provenance: 'project-authored',
  source: { promptId: 'pte-wt-130-task2', task: 'task2', form: 'discussion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  piece: 'sentence',
  modelParagraphIndex: 1,
  correctionSentence: 'The public transport should be improved because it reduces a traffic and helps environment in the city.',
  correctionNote:
    'Three article slips, all from the same confusion between general and specific. "Public transport" and "traffic" are being used generally here, so neither takes an article: "Public transport... reduces traffic". "The environment" is one specific, shared thing, so it always takes "the": "helps THE environment". Ask whether each noun means "one specific thing everyone would recognise" or "this kind of thing in general" before choosing an article.',
  transferPrompt: 'Now write one sentence of your own using "the environment" correctly, about any IELTS topic.',
  guidingQuestions: [
    'Find every noun that could take an article and ask: is this general, or one specific thing?',
    '"Public transport" and "traffic" here are general: no article.',
    '"The environment" is always specific: always "the".',
  ],
  noticeInTheModel: NOTICE,
};

export const WRITING_RECURRING_PATTERN_ACCURACY: readonly WrittenFocusedTask[] = [GUIDED];
