/* Task 2, precise topic vocabulary: writing a body paragraph with the
 * specific words a topic needs, rather than the generic ones ("a big
 * problem", "good for people") that a Lexical Resource comment names by name
 * ("Range and precision of vocabulary for the topic", writing-task2-method's
 * own "How the Four Criteria Apply to Task 2" table).
 *
 * Both prompts are about technology, linked to the real "Technology &
 * Society" vocabulary topic (src/data/vocabulary.ts slug 'technology',
 * src/data/words.ts). The automatic check counts how many of that topic's
 * own curated words the student actually used (written-focused-task.ts's
 * hasEnoughTopicVocabulary), never a judgement of whether the paragraph is
 * well argued. Real exam prompts only, reused with the publisher's
 * permission confirmed on 11 September 2026 (see writing-task1-overview.ts).
 */

import type { WrittenFocusedTask } from '../focused-exercises';

const OBJECTIVE =
  'Write a Task 2 body paragraph using precise topic vocabulary for the subject, rather than generic words that could belong to any essay.';

const LESSON = { key: 'writing-task2-method', blockHeading: 'How the Four Criteria Apply to Task 2' } as const;

const RULES = {
  minWords: 40,
  maxWords: 100,
  checks: ['has-topic-vocabulary', 'no-informal-words', 'length-in-range'],
} as const;

const ATTRIBUTION = "PracticePTEOnline, reused with the publisher's permission.";

const NOTICE = [
  'It names the specific technology at issue (automation, artificial intelligence, data privacy) rather than saying "technology" over and over.',
  'It avoids the generic words a weaker answer leans on: "a big change", "good for people", "a lot of things".',
  'Every precise word is used accurately, in a sentence that could only be about this topic, not glued on to sound advanced.',
] as const;

const GUIDED: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-lexical-topic-vocabulary-guided',
  subskill: 'lexical-precision',
  paper: 'writing',
  role: 'guided-practice',
  title: 'Task 2 topic vocabulary: guided practice',
  objective: OBJECTIVE,
  instruction:
    'Write one body paragraph giving your view on driverless vehicles. Use the specific technology words for this topic rather than generic ones.',
  expectedMinutes: 8,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-112-task2', task: 'task2', form: 'advantages-disadvantages', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  guidingQuestions: [
    'What is the specific technology at issue here (automation, artificial intelligence, data collection), rather than "technology" in general?',
    'Which precise word names your real point: innovation, automation, cybersecurity, data privacy?',
    'Read your paragraph back. Could every sentence only be about driverless vehicles, or could it be pasted into any essay?',
  ],
  noticeInTheModel: NOTICE,
};

const CHECK: WrittenFocusedTask = {
  kind: 'written-response',
  id: 'writing-lexical-topic-vocabulary-check',
  subskill: 'lexical-precision',
  paper: 'writing',
  role: 'independent-check',
  title: 'Task 2 topic vocabulary: independent check',
  objective: OBJECTIVE,
  instruction:
    'A question you have not seen, on the same subject. Write one paragraph using precise topic vocabulary, on your own.',
  expectedMinutes: 7,
  provenance: 'publisher',
  source: { promptId: 'pte-wt-106-task2', task: 'task2', form: 'opinion', attribution: ATTRIBUTION },
  lesson: LESSON,
  rules: RULES,
  modelParagraphIndex: 1,
  noticeInTheModel: NOTICE,
};

export const WRITING_LEXICAL_TOPIC_VOCABULARY: readonly WrittenFocusedTask[] = [GUIDED, CHECK];
