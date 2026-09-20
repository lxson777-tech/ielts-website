/* Which questions to send Mr EZ after a paper is marked.

   One pure function, written once and shared by the two places that ask him
   about a finished attempt: the whole-paper debrief card and the per
   question "why was my answer wrong?" button.

   The rule it has to mirror exactly is the one the SCORE uses. TestPlayer
   scores a paper with `scoredQuestionIds()` in ../tests/schema, which skips
   any question flagged `scored === false` (a slot whose body is missing
   from the published source, shown to the student but excluded from the
   mark) and treats every other question as worth one mark, including the
   members of an unordered answer pair. So "wrong" here means: counted by
   the score, and not in the set of ids that earned a mark. The count this
   returns is therefore always `scored total - raw score`, which is what the
   card says out loud, and a mismatch would be a visible lie.

   A blank answer is included, with `given` as an empty string. Leaving a
   question out is a real and different mistake from getting it wrong, and
   the Worker is written to tell the two apart.

   NOTE: like ./test-items.ts, this file must never import `src/data/tests`.
   It takes the test object it is given. */

import type { PracticeTest } from '../tests/schema';
import { MAX_GIVEN_CHARS, MAX_REVIEW_ITEMS } from './test-items';
import type { TutorReviewItem } from './schema';

/** True when a question counts towards the score, and so towards the
    "you missed N of M" line. The single place this rule is spelled out on
    the browser side; it is the same test `scoredQuestionIds()` applies. */
export function isScoredQuestion(question: { scored?: boolean }): boolean {
  return question.scored !== false;
}

/** Every scored question the student got wrong or left blank, in test order,
    as the flat `{ questionId, given }` pairs the tutor request carries.

    `correctIds` is the set returned by `scoredQuestionIds()` (the ids that
    EARNED a mark), so this is simply "scored, minus the ones that scored".

    Capped both ways before it leaves the browser: at most MAX_REVIEW_ITEMS
    questions, and each answer cut to MAX_GIVEN_CHARS. The Worker re-checks
    both, because the browser is not a source of truth; doing it here just
    means a well-behaved client never sends a request that will be refused. */
export function wrongItems(
  test: PracticeTest,
  answers: Record<string, string>,
  correctIds: ReadonlySet<string>,
): TutorReviewItem[] {
  const items: TutorReviewItem[] = [];
  const seen = new Set<string>();
  for (const part of test.parts) {
    for (const group of part.groups) {
      for (const question of group.questions) {
        if (items.length >= MAX_REVIEW_ITEMS) return items;
        if (!isScoredQuestion(question)) continue;
        if (correctIds.has(question.id)) continue;
        if (seen.has(question.id)) continue;
        seen.add(question.id);
        items.push({
          questionId: question.id,
          given: (answers[question.id] ?? '').slice(0, MAX_GIVEN_CHARS),
        });
      }
    }
  }
  return items;
}
