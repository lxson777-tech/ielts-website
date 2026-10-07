/* Writing a game's answers where the rest of the site reads them.

   Nothing new is stored. Every answered word goes through the same two
   writers the practice round uses, under the student the game was started
   for (the owner is claimed at the click by the screen, exactly as
   src/components/vocab-round-owner.ts does for the round):

     - the spaced-review schedule in src/lib/vocab-review.ts, which decides
       when a word comes back and what the daily plan counts as due;
     - one event on the learner record (recordVocabularyReviewFor), which
       the study plan and Mr EZ read.

   Match and Sprint are RECOGNITION (picking or pairing the right word), so
   they are written exactly as a practice round answer is
   (recordVocabAnswer): never toward a word being "learnt". Spell it is
   RECALL, written through the review store's recall path, so two unaided
   right spellings on two different days make a word learnt. */

import type { CacheOwner } from '../learning/contracts/sync';
import { recordVocabularyReviewFor } from '../learning/store.browser';
import { rateFor, recordReviewOutcomeFor, type VocabCard } from '../vocab-review';
import { recordVocabAnswer, vocabActivityId } from '../../components/vocab-round-owner';
import { spellRecordPlan } from './spell';

/** Match and Sprint: one recognition answer, written as the practice round
    writes one (right first time "good", missed "again", right on a second
    go "hard" and assisted). */
export function recordGameRecognition(owner: CacheOwner, card: VocabCard, correct: boolean, retry: boolean): void {
  recordVocabAnswer(owner, card, correct, retry);
}

/** Spell it: one recall answer. */
export function recordSpelling(owner: CacheOwner, card: VocabCard, correct: boolean, hinted: boolean, retry: boolean): void {
  const plan = spellRecordPlan(correct, hinted, retry);
  /* The spaced-review state first: it is what must not be lost. */
  if (plan.schedule.kind === 'recall') {
    recordReviewOutcomeFor(owner, card.word, 'recall', plan.schedule.correct, plan.schedule.assisted);
  } else if (plan.schedule.kind === 'rate') {
    rateFor(owner, card.word, plan.schedule.grade);
  }
  try {
    recordVocabularyReviewFor(owner, {
      activityId: vocabActivityId(card.topic),
      subskill: 'recall-from-meaning',
      words: [{ word: card.word, correct, direction: 'recall' }],
      assistance: plan.evidence.assistance,
    });
  } catch {
    /* Evidence is additional to the game, never load-bearing for it. */
  }
}
