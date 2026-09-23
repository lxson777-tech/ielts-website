/* Whose vocabulary practice round is on screen (the follow-up to R2B-01 for
 * the vocabulary practice round, 23 September 2026).
 *
 * WHY THIS FILE EXISTS
 * The practice round (VocabReview.tsx) recorded every answer through two
 * writers that ask who is on the page at the click: rate() in
 * src/lib/vocab-review.ts, which moves the word in the spaced-review
 * schedule, and the shared learner store. So student A could be half way
 * through a round, the page could change hands (a sign-out and sign-in from
 * the avatar menu, or in another tab), A's round stayed on screen, and the
 * next click wrote an answer to A's question into student B's schedule and
 * B's learner record.
 *
 * WHAT REPLACES IT
 * The round is an exercise session (./learning/exercise-owner.ts), bound to
 * the student on the page at the moment the round starts and never
 * re-resolved after that:
 *
 *   - its words are chosen from that student's own schedule;
 *   - every answer is claimed at the click (claimExerciseCheck), refused
 *     for a student who is no longer here or from a tab that missed the
 *     change, and written through writers that take that owner (rateFor
 *     and recordVocabularyReviewFor), never through ones that ask who is on
 *     the page;
 *   - when the owner changes the screen hands over: a fresh round from the
 *     incoming student's own schedule, with the calm line the other
 *     exercises use. The outgoing student's answers were each written at
 *     their own click, under them, so nothing of theirs is lost and nothing
 *     of theirs is shown.
 *
 * Every answer is written synchronously at the click, so there is no late
 * result to keep.
 *
 * Pure apart from the owner module, the two stores and the card set, so
 * tests/last-screens-owner.test.ts drives it with a Map and no browser.
 */

import type { CacheOwner } from '../lib/learning/contracts/sync';
import { VOCABULARY_PARTS } from '../data/vocabulary';
import { recordVocabularyReviewFor } from '../lib/learning/store.browser';
import { buildQuestion, type PracticeQuestion } from '../lib/vocab-practice';
import { getPracticeRound, getTopicCards, rateFor, vocabAssistanceLevel, type VocabCard } from '../lib/vocab-review';
import { openExerciseSession, type ExerciseSession } from './learning/exercise-owner';

/** A question in the round's queue. `retry` marks the second showing of a
    word missed earlier in the same round. */
export type Queued = PracticeQuestion & { retry: boolean };

export const ROUND_SIZE = 10;

/** The catalogue's own vocabReviewActivityId() (src/lib/learning/catalog.ts)
    produces exactly this string from a topic slug. Duplicated as a literal
    format here, rather than imported, because catalog.ts is a different
    work package's file and pulls in the generated learning index; if that
    format ever changes, this line and catalog.ts's must change together. */
export function vocabActivityId(topicTitle: string): string {
  const slug = VOCABULARY_PARTS.find((p) => p.title === topicTitle)?.slug;
  return slug ? `review:vocabulary:${slug}` : 'review:vocabulary';
}

export interface OpenedVocabRound {
  /** Whose round this is: the owner on the page when it started. */
  session: ExerciseSession;
  questions: Queued[];
}

/** Start a round for the owner on the page right now, from that owner's
    own schedule. The owner is fixed HERE, once. Used when the round first
    opens, for "Practise another round", and at a hand-over alike. */
export function openVocabRound(topic: string, size = ROUND_SIZE): OpenedVocabRound {
  const session = openExerciseSession();
  const pool = getTopicCards(topic);
  const questions = getPracticeRound(topic, size).map((card) => ({ ...buildQuestion(card, pool), retry: false }));
  return { session, questions };
}

/** Writes one answered question to `owner`'s learner record. Never lets a
    storage or sync hiccup interrupt the round: the local spaced-review
    state (rateFor()) is the one thing that must not be lost, and it is
    saved separately, before this is ever called. */
function recordEvidenceFor(owner: CacheOwner, topicTitle: string, word: string, correct: boolean, assisted: boolean): void {
  try {
    recordVocabularyReviewFor(owner, {
      activityId: vocabActivityId(topicTitle),
      subskill: 'recognise-meaning',
      words: [{ word, correct, direction: 'recognise' }],
      assistance: vocabAssistanceLevel(assisted),
    });
  } catch {
    /* Evidence is additional to the round, never load-bearing for it. */
  }
}

/** One answer, written under `owner`, the student the round belongs to
 *  (the caller has claimed the click for them). Exactly what the round has
 *  always written: right first time is "good", missed is "again", right on
 *  the second go is "hard"; a second go comes after the answer was shown,
 *  so it is recorded as assisted. The spaced-review state first, then the
 *  evidence. */
export function recordVocabAnswer(owner: CacheOwner, card: VocabCard, correct: boolean, retry: boolean): void {
  if (retry) {
    if (correct) rateFor(owner, card.word, 'hard');
    // The answer was shown the first time round, so this go is assisted.
    recordEvidenceFor(owner, card.topic, card.word, correct, true);
    return;
  }
  rateFor(owner, card.word, correct ? 'good' : 'again');
  recordEvidenceFor(owner, card.topic, card.word, correct, false);
}
