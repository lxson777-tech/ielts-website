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
   colour them in.

   WHOSE QUIZ IT IS (the follow-up to R2B-01, 23 September 2026). This
   script used to look the owner up once, for the unfinished-work key, and
   record every check through the SHARED learner store, which answers for
   whoever is on the page at the press. So student A's answers could stay on
   screen after the page changed hands, and a press of check recorded them
   into student B's record. Each quiz is now an exercise session
   (src/components/learning/exercise-owner.ts), the same one the React quick
   check uses, bound to the owner on the page when the quiz is set up:

     - when the owner changes, the answers on screen are kept in their own
       student's unfinished-work copy (only when they differ from it), the
       answers and the marking leave the screen with one calm line, and the
       quiz is bound again to the incoming student, with their own copy put
       back if they have one;
     - a check is claimed first (claimExerciseCheck) and refused, recording
       nothing, for a student who is no longer here or from a tab that
       missed the change; a refusal from such a tab keeps the answers for
       their student and takes them off the screen, controls disabled, until
       the tab hears who is here;
     - what a check records goes through recordEventsFor under the student
       the press was claimed for.

   With no account change the quiz does exactly what it always did. */

import {
  AFTER_MARKING_SHOWN,
  lessonCheckDrafts,
  lessonQuizActivityId,
  lessonQuizItemIdentity,
  readLessonCheckProgress,
  writeLessonCheckProgress,
  type LessonCheckProgressV1,
  type LessonCheckSubmission,
  type RecordedAnswers,
} from '../lib/learning/lesson-check';
import type { Subskill } from '../lib/learning/contracts/catalog';
import type { CacheOwner } from '../lib/learning/contracts/sync';
import { UNCLASSIFIED_LESSON_SUBSKILL } from '../lib/learning/contracts/evidence';
import { recordEventsFor, type BrowserStorage } from '../lib/learning/store.browser';
import { onOwnerChange } from '../lib/store-owner';
import { t } from '../lib/i18n/translate';
import {
  EXERCISE_OWNER_CHANGED_NOTE,
  claimExerciseCheck,
  exerciseIsCurrent,
  openLessonCheck,
  type ExerciseSession,
} from '../components/learning/exercise-owner';

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
    /* The same button, for the helpers below, which the null check above
       does not reach. */
    const checkButton: HTMLButtonElement = btn;

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
    /* This quiz's own unfinished-work set: the lesson, and which quiz on
       the page it is. */
    const runId = setId ? `${setId}:c${containerIndex}` : undefined;

    /* Whose quiz this is, fixed HERE, for the owner on the page now, and
       moved to the incoming student only by handOver below. The
       unfinished-work key comes from the same session, so the answers on
       screen and the key they are kept under always belong to one
       student. */
    let session: ExerciseSession;
    let progressKey: string | null = null;
    let recorded: RecordedAnswers = {};
    /* True when this tab missed an account change and refused a check:
       the answers are off the screen and the controls disabled until the
       tab hears who is here. */
    let withheld = false;
    let note: HTMLElement | null = null;

    /** Bind the quiz to the owner on the page right now and read their
        unfinished copy, if they have one. */
    function bind(): LessonCheckProgressV1 | null {
      const opened = openLessonCheck(storage, runId, [items.length], new Date().toISOString());
      session = opened.session;
      progressKey = storage && runId ? opened.key : null;
      return progressKey ? opened.held : null;
    }

    /** Answers given before the student walked away are put back, so
        coming back to a half finished quiz is not starting again. */
    function restore(held: LessonCheckProgressV1 | null): void {
      if (!held) return;
      recorded = held.recorded;
      held.units[0]?.drafts.forEach((draft, index) => {
        const select = controls[index];
        if (select && draft !== '') select.value = draft;
      });
    }

    restore(bind());

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
    function record(whose: CacheOwner): void {
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
        recordEventsFor(whose, write.drafts);
        save();
      } catch {
        /* Nothing recorded, and the quiz carries on exactly as before.
           What was already saved stays saved: a failure here is no
           reason to throw away answers the student has given. */
      }
    }

    /** The answers on screen, kept for the student they belong to (the
        session's) before they leave the screen. Written only when they
        differ from what that student's copy already holds, and never
        marked as checked. */
    function keepForTheirStudent(): void {
      if (!progressKey || !setId) return;
      const drafts = controls.map((control) => control?.value ?? '');
      const now = new Date().toISOString();
      const held = readLessonCheckProgress(storage, progressKey, [items.length], now)?.units[0]?.drafts;
      if (drafts.every((draft, index) => draft === (held?.[index] ?? ''))) return;
      writeLessonCheckProgress(storage, progressKey, {
        version: 1,
        setId,
        updatedAt: now,
        units: [{ drafts, checked: false, attempt: 0 }],
        recorded,
      });
    }

    /** Nothing of anybody's answers or marking left on screen. */
    function clearScreen(): void {
      controls.forEach((control) => {
        if (control) control.value = '';
      });
      items.forEach((item) => item.classList.remove('quiz-correct', 'quiz-wrong', 'pq-pop', 'pq-shake'));
      const score = container.querySelector<HTMLElement>('.quiz-score');
      if (score) {
        score.textContent = '';
        score.hidden = true;
        score.classList.remove('pq-in');
      }
    }

    function setEnabled(enabled: boolean): void {
      controls.forEach((control) => {
        if (control) control.disabled = !enabled;
      });
      checkButton.disabled = !enabled;
    }

    /** The one calm line, the React exercises' own. Marked for the page's
        translator with its English original, so a later language switch
        re-translates it like any other marked text. */
    function showNote(): void {
      if (!note) {
        note = document.createElement('p');
        note.className = 'focused-rule quiz-owner-note';
        note.setAttribute('role', 'status');
        note.setAttribute('data-i18n', '');
        note.dataset.i18nEn = EXERCISE_OWNER_CHANGED_NOTE;
        checkButton.before(note);
      }
      note.textContent = t(EXERCISE_OWNER_CHANGED_NOTE);
      note.hidden = false;
    }

    /* The page changed hands, here or in another tab. The answers on
       screen go to their own student's copy, the screen is cleared, and
       the quiz is bound to the incoming student, with their own copy put
       back if they have one. */
    function handOver(): void {
      if (!withheld) keepForTheirStudent();
      clearScreen();
      setEnabled(true);
      withheld = false;
      recorded = {};
      restore(bind());
      showNote();
    }

    /* This tab missed the account change: it still names the previous
       student, but this device's account session is somebody else's.
       Nothing is recorded; the answers are kept for their student and
       leave the screen until this tab hears who is here. */
    function withhold(): void {
      keepForTheirStudent();
      clearScreen();
      setEnabled(false);
      withheld = true;
      showNote();
    }

    /* A sign-out, sign-in or account switch, from this tab or another. The
       same owner being told its stores changed replaces nothing. A quiz
       whose markup has left the page (a navigation, or a language swap of
       the lesson body) stops listening. */
    const stopListening = onOwnerChange(() => {
      if (!container.isConnected) {
        stopListening();
        return;
      }
      if (exerciseIsCurrent(session)) return;
      handOver();
    });

    /* The calm line goes once the student carries on. */
    container.addEventListener('change', () => {
      if (note && !withheld) note.hidden = true;
    });

    btn.addEventListener('click', () => {
      if (withheld) return;
      /* Accepted only for the student whose quiz this is, and bound to
         them before anything is recorded. A refusal records nothing and
         marks nothing. */
      const claim = claimExerciseCheck(session);
      if ('refused' in claim) {
        if (claim.refused === 'owner-changed') handOver();
        else withhold();
        return;
      }
      try {
        let correct = 0;
        // Recorded first, from the answers as they stand, so the first
        // answer is captured before a single right or wrong mark appears.
        record(claim.binding.owner);
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
      } finally {
        claim.binding.cancel();
      }
    });
  });
}
