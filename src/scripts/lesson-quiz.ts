/* Port of the legacy assets/quiz.js — runs against the migrated lesson
   HTML, which keeps its original markup hooks (data-quiz, .quiz-item…).

   These exercises are written straight into a lesson body by
   tools/scrape_ielts_materials.py, so they have no entry in the generated
   learning index and no lesson body file is ever edited to give them one
   (lead decision D2). They still feed the learner record: the lesson, the
   position and a hash of the question and its answer name each one, and
   every judgement about what an answer means is made by the shared module
   in src/lib/learning/lesson-check.ts, exactly as the React exercise
   does. What is left here is the DOM: find the items, read the answers,
   colour them in. */

import {
  AFTER_MARKING_SHOWN,
  lessonCheckDrafts,
  lessonCheckProgressKey,
  lessonQuizActivityId,
  lessonQuizItemIdentity,
  readLessonCheckProgress,
  writeLessonCheckProgress,
  type LessonCheckSubmission,
  type RecordedAnswers,
} from '../lib/learning/lesson-check';
import type { Subskill } from '../lib/learning/contracts/catalog';
import { UNCLASSIFIED_LESSON_SUBSKILL } from '../lib/learning/contracts/evidence';
import { getLearnerStore, ownerNamespace, type BrowserStorage } from '../lib/learning/store.browser';

export interface ReadingQuizOptions {
  /** The lesson this quiz sits on, e.g. 'reading-tfng'. Without it the
      answers have no stable name, so nothing is recorded and the quiz
      behaves exactly as it always did. */
  lessonKey?: string;
}

/** This browser's store, or null when there is not one. Never throws.
    Same guard as deviceStorage() in src/lib/learning/store.browser.ts. */
function deviceStorage(): BrowserStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

const TFNG_VALUES = ['true', 'false', 'not given'];

/** The question type, when the markup actually settles it. A question
    whose only three answers are True, False and Not Given is a True,
    False, Not Given question; that is read off the options, not guessed
    from the lesson it sits on. Anything else is filed under the
    placeholder heading, which decides where the answer is listed and
    nothing else: naming a type these questions never declared would put
    evidence under a heading it did not earn. */
function questionTypeOf(select: HTMLSelectElement): Subskill {
  const values = [...select.options].map((option) => option.value.toLowerCase().trim()).filter((value) => value !== '');
  const matchesTfng = values.length === TFNG_VALUES.length && TFNG_VALUES.every((value) => values.includes(value));
  return matchesTfng ? 'tfng' : UNCLASSIFIED_LESSON_SUBSKILL;
}

function questionTextOf(item: HTMLElement): string {
  const asked = item.querySelector<HTMLElement>('.quiz-q');
  return (asked?.textContent ?? item.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function initReadingQuiz(options: ReadingQuizOptions = {}): void {
  const lessonKey = options.lessonKey;
  const storage = deviceStorage();

  document.querySelectorAll<HTMLElement>('[data-quiz="reading"]').forEach((container, containerIndex) => {
    const btn = container.querySelector<HTMLButtonElement>('.quiz-check-btn');
    if (!btn) return;
    // This now runs both on astro:page-load and after a language swap
    // replaces the lesson body, and the two can land in either order on
    // the same nodes. Without this guard the check button would collect a
    // second listener and grade twice per click.
    if (container.dataset.quizBound) return;
    container.dataset.quizBound = 'true';

    const items = [...container.querySelectorAll<HTMLElement>('.quiz-item[data-answer]')];
    const controls = items.map((item) => item.querySelector('select'));
    /* The identity of every question in this quiz, worked out once from
       what the page holds. */
    const identities = items.map((item, index) => {
      const select = controls[index];
      return lessonKey && select
        ? lessonQuizItemIdentity(
            lessonKey,
            containerIndex,
            index,
            questionTextOf(item),
            item.dataset.answer ?? '',
            questionTypeOf(select),
          )
        : null;
    });

    /* The container is already in every question's own key (c0-i2), so
       the set is the lesson: naming it twice would put the container in
       the question's name twice over. The unfinished-work key does carry
       it, because two quizzes on one page are two exercises to come back
       to. */
    const setId = lessonKey ? `lesson-quiz:${lessonKey}` : null;
    const activityId = lessonKey ? lessonQuizActivityId(lessonKey) : null;
    const progressKey = (() => {
      if (!setId || !storage) return null;
      try {
        return lessonCheckProgressKey(ownerNamespace(getLearnerStore().owner()), `${setId}:c${containerIndex}`);
      } catch {
        return null;
      }
    })();

    let recorded: RecordedAnswers = {};

    /* Answers given before the student walked away are put back, so
       coming back to a half finished quiz is not starting again. */
    if (progressKey) {
      const held = readLessonCheckProgress(storage, progressKey, [items.length], new Date().toISOString());
      if (held) {
        recorded = held.recorded;
        held.units[0]?.drafts.forEach((draft, index) => {
          const select = controls[index];
          if (select && draft !== '') select.value = draft;
        });
      }
    }

    function save(): void {
      if (!progressKey || !setId) return;
      writeLessonCheckProgress(storage, progressKey, {
        version: 1,
        setId,
        updatedAt: new Date().toISOString(),
        units: [{ drafts: controls.map((control) => control?.value ?? ''), checked: true, attempt: 0 }],
        recorded,
      });
    }

    /** What the student had when they pressed check, as evidence. Only
        questions they actually answered: an untouched one is never
        marked, so nothing about it has been shown and there is no answer
        to record. */
    function record(): void {
      if (!setId || !activityId) return;
      const submissions: LessonCheckSubmission[] = [];
      items.forEach((_, index) => {
        const identity = identities[index];
        const given = controls[index]?.value ?? '';
        if (!identity || given === '') return;
        submissions.push({
          identity,
          given,
          correct: given.toLowerCase().trim() === (items[index]!.dataset.answer ?? '').toLowerCase().trim(),
          attempt: 0,
        });
      });
      if (submissions.length === 0) return;
      try {
        const write = lessonCheckDrafts(
          {
            activityId,
            paper: 'reading',
            at: new Date().toISOString(),
            /* Every submission here carries an answer, so the only
               question is whether any were left out. */
            completion: submissions.length === items.length ? 'completed' : 'partial',
            /* Checking marks each answer right or wrong without ever
               naming the answer, so a changed answer afterwards had a
               hint and not the answer itself. */
            repeatAssistance: AFTER_MARKING_SHOWN,
            setId,
          },
          submissions,
          recorded,
        );
        recorded = write.recorded;
        getLearnerStore().recordEvents(write.drafts);
        save();
      } catch {
        /* Nothing recorded, and the quiz carries on exactly as before.
           What was already saved stays saved: a failure here is no
           reason to throw away answers the student has given. */
      }
    }

    btn.addEventListener('click', () => {
      let correct = 0;
      // Recorded first, from the answers as they stand, so the first
      // answer is captured before a single right or wrong mark appears.
      record();
      items.forEach((item) => {
        const expected = (item.dataset.answer ?? '').toLowerCase().trim();
        const ctrl = item.querySelector('select');
        if (!ctrl || ctrl.value === '') return;
        const ok = ctrl.value.toLowerCase().trim() === expected;
        item.classList.toggle('quiz-correct', ok);
        item.classList.toggle('quiz-wrong', !ok);
        item.classList.remove('pq-pop', 'pq-shake');
        void item.offsetWidth; // restart the animation if this is a re-check
        item.classList.add(ok ? 'pq-pop' : 'pq-shake');
        if (ok) correct++;
      });
      const score = container.querySelector<HTMLElement>('.quiz-score');
      if (score) {
        score.textContent = `${correct} / ${items.length} correct`;
        score.hidden = false;
        score.classList.remove('pq-in');
        void score.offsetWidth;
        score.classList.add('pq-in');
      }
    });
  });
}
