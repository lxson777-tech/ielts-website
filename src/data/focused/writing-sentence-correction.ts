/* Sentence correction for a recurring grammar pattern.
 *
 * WHY THIS IS PROJECT-AUTHORED, GUIDED PRACTICE ONLY, EVER
 * The brief for this objective asks for it to be "built from the student's
 * own quoted sentences in the report". The real report shape
 * (src/lib/writing/schema.ts Moment) keeps a `quote` and a `note` for every
 * moment the marker singled out, but no separately stored "corrected
 * version": the note is the marker's own comment on the sentence, in prose,
 * not a rewrite. So there is no stored corrected sentence anywhere in the
 * data to reveal after an attempt, whoever the student is.
 *
 * What this package DOES do with the student's own report: the hand-off
 * (written-focused-task.ts's WRITING_OBJECTIVE_RULES, 'sentence-correction'
 * entry) reads the marker's own grammaticalRange comment, tip and next-band
 * advice for a grammar complaint and quotes it word for word, exactly the
 * way the overview hand-off quotes a Task Achievement comment. What it does
 * NOT do is manufacture a "corrected version" of the student's own sentence
 * that was never actually marked as one; that would be presenting an
 * invented rewrite as though it were the examiner's.
 *
 * So the practice ITSELF is one recurring, real IELTS pattern, written here
 * and checked by an IELTS teacher before it becomes anything more than
 * guided practice (lead decision Q1, exactly the precedent the sentence
 * endings lesson set): subject-verb agreement with "the number of" against
 * "a number of", two phrases that look alike and take opposite verb
 * numbers, and one of the commonest slips a Grammatical Range comment
 * names. Reused with permission means nothing here; nothing is claimed to
 * be an exam question, and the prompt shown for context is real (see
 * `promptId`), the broken sentence is not.
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Correct a sentence with a recurring subject-verb agreement slip, then write your own sentence using the same pattern correctly.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 5,
  maxWords: 40,
  checks: ['sentence-was-changed', 'length-in-range'],
} as const;

const ATTRIBUTION = 'Project-authored practice sentence, checked against a real recurring IELTS pattern; not exam material.';

const NOTICE = [
  '"The number of" is followed by a plural noun but takes a SINGULAR verb: "the number of visitors HAS grown".',
  '"A number of" means "several" and takes a PLURAL verb: "a number of visitors HAVE complained".',
  'The two phrases look almost identical and take opposite verb forms, which is exactly why this slip keeps recurring.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-sentence-correction-number-of',
  subskill: 'sentence-correction',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Sentence correction: "the number of" and "a number of"',
  objective: OBJECTIVE,
  instruction: 'Read the sentence below and rewrite it correctly. Write your correction, not a comment on what is wrong with it.',
  expectedMinutes: 6,
  provenance: 'project-authored',
  source: { promptId: 'pte-wt-119-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  correctionSentence:
    'The number of students who chooses to study abroad have risen sharply over the last decade, while a number of universities has struggled to keep pace.',
  correctionNote:
    'Two slips, both from the same confusion. "The number of students" is singular, so its verb should be "has risen", not "have risen", and the relative clause needs "choose" to agree with the plural "students", not "chooses". "A number of universities" means "several universities" and is plural, so its verb should be "have struggled", not "has struggled". Decide what the real subject of each verb is before choosing singular or plural.',
  transferPrompt:
    'Now write one sentence of your own using "a number of" with a correctly plural verb, about any IELTS topic.',
  guidingQuestions: [
    'Find every verb in the sentence and ask what its real subject is: "the number of X" or "a number of X"?',
    '"The number of X" behaves like "the number" on its own: singular.',
    '"A number of X" behaves like "several X": plural.',
  ],
  noticeInTheModel: NOTICE,
};

export const WRITING_SENTENCE_CORRECTION: readonly WrittenFocusedTask[] = [GUIDED];
