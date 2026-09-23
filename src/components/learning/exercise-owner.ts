/* Whose exercise is on screen (the follow-up to R2B-01 for the focused
 * Reading and Listening exercise and the lesson quick check, 23 September
 * 2026).
 *
 * WHY THIS FILE EXISTS
 * R2B-01 made the essay editor an editing session bound to one student
 * (../writing-editor-owner.ts), and the written focused task followed
 * (WritingFocusedTask.tsx). The two other screens that host the lesson help
 * buttons did not. FocusedExercise.tsx and PracticeQuiz.tsx looked the owner
 * up once, for their in-progress copy, and then recorded through the SHARED
 * learner store, which answers for whoever is on the page at the press. So
 * student A could answer part of an exercise, the page could change hands (a
 * sign-out and sign-in from the avatar menu, or in another tab), A's answers
 * stayed on screen, and a press of check recorded them, with their score and
 * the help A had, into student B's learner record.
 *
 * WHAT REPLACES IT
 * An exercise session, bound to the owner on the page at the moment the
 * exercise is opened or restored, and never re-resolved after that:
 *
 *   - the in-progress copy is read and written under that owner's key only,
 *     from the render that holds that owner's answers, so a copy can never
 *     land under the key of whoever took over;
 *   - when the owner changes (this tab's menu or another tab), the screen
 *     hands over: the outgoing student's answers stay in their own
 *     in-progress copy (they are already there, it is written on every
 *     change), their help replies still on the way are let go of (the help
 *     buttons do that themselves, see LessonHelpControls.tsx), and the
 *     screen opens the incoming student's own copy of the same exercise, or
 *     an empty one, with one calm line saying why;
 *   - a check is accepted only from a session whose owner is still the one
 *     on the page (claimExerciseCheck). It is bound at the press, and
 *     everything it records (the answers, the score, the evidence, the help
 *     each answer had) goes through a writer that takes that owner
 *     (recordSubmissionFor and recordEventsFor in
 *     src/lib/learning/store.browser.ts), never through one that asks who
 *     is on the page;
 *   - a tab that missed the account change still names the previous student
 *     as its owner. At the press it also asks this device's stored account
 *     session (storedSessionAgrees in src/lib/store-owner.ts); when that
 *     names somebody else, nothing is recorded and the answers leave the
 *     screen until the tab hears who is here.
 *
 * Both checks record synchronously, at the press, so there is no late
 * result to keep: the one thing that can arrive after the page changed
 * hands is a help reply. The focused exercise keeps it in its own student's
 * in-progress copy (keepFocusedHelpFor); the quick check has never kept help
 * in its copy, so a late reply there is let go of and recorded for nobody.
 *
 * Pure apart from the owner module and the storage it is handed, so
 * tests/exercise-owner.test.ts drives every case with a Map and no browser.
 */

import type { CacheOwner } from '../../lib/learning/contracts/sync';
import type { AssistanceLevel } from '../../lib/learning/contracts/evidence';
import { nt } from '../../lib/i18n/translate';
import {
  lessonCheckProgressKey,
  readLessonCheckProgress,
  type LessonCheckProgressV1,
} from '../../lib/learning/lesson-check';
import {
  bindToCurrentOwner,
  currentOwner,
  ownerNamespace,
  sameOwner,
  storedSessionAgrees,
  type BrowserStorage,
  type OwnerBinding,
} from '../../lib/store-owner';
import {
  NO_HELP,
  applyFocusedProgress,
  focusedProgressAction,
  readFocusedProgress,
  withHelp,
  type FocusedProgressStorage,
  type ItemHelpState,
  type RestoredFocusedProgress,
} from './focused-exercise';

/** Shown when the page changes hands (a sign-out, a sign-in or a switch,
    here or in another tab), and when a tab that missed that change refuses
    a check. Names nobody and shows nothing of the previous student's
    answers, which are kept in their own in-progress copy. */
export const EXERCISE_OWNER_CHANGED_NOTE = nt(
  'The account on this page changed. Any answers in progress were kept for the student who was working on them.',
);

/* ── The session ─────────────────────────────────────────────────────────── */

export interface ExerciseSession {
  /** Whose answers these are: the current owner when the exercise was opened
      or restored. Never changes afterwards. */
  readonly owner: CacheOwner;
  /** ownerNamespace(owner), the spelling every per-owner key uses. */
  readonly namespace: string;
}

/** Open, or restore, an exercise for the owner on the page right now. The
    owner is fixed HERE, once. */
export function openExerciseSession(): ExerciseSession {
  const owner = currentOwner();
  return { owner, namespace: ownerNamespace(owner) };
}

/** The owner on the page is still this session's. False for no session. */
export function exerciseIsCurrent(session: ExerciseSession | null): boolean {
  return session !== null && sameOwner(currentOwner(), session.owner);
}

/** Why a press was refused.
 *    'owner-changed'   the owner on the page is somebody else now; the
 *                      screen hands over.
 *    'device-changed'  this tab still names the session's owner, but this
 *                      device's stored account session names somebody else:
 *                      the tab missed the change. */
export type ExerciseRefusal = 'owner-changed' | 'device-changed';

export type ExerciseClaim = { binding: OwnerBinding } | { refused: ExerciseRefusal };

export interface ExerciseClaimDeps {
  /** Whether this device's stored account session still agrees `owner` is
      the student here. storedSessionAgrees by default; a test names its own. */
  deviceAgrees?: (owner: CacheOwner) => boolean;
}

/** The binding a check is recorded under, or why there is none.
 *
 * A refusal records nothing at all: no answers, no score, no evidence, no
 * help. The caller hands over ('owner-changed') or takes the answers off the
 * screen ('device-changed'). The caller cancels the binding once the press
 * has been recorded. */
export function claimExerciseCheck(session: ExerciseSession | null, deps: ExerciseClaimDeps = {}): ExerciseClaim {
  if (session === null || !exerciseIsCurrent(session)) return { refused: 'owner-changed' };
  const agrees = deps.deviceAgrees ?? ((owner: CacheOwner) => storedSessionAgrees(owner));
  if (!agrees(session.owner)) return { refused: 'device-changed' };
  const binding = bindToCurrentOwner();
  if (!sameOwner(binding.owner, session.owner)) {
    binding.cancel();
    return { refused: 'owner-changed' };
  }
  return { binding };
}

/* ── The focused exercise (FocusedExercise.tsx) ──────────────────────────── */

export interface OpenedFocusedExercise {
  session: ExerciseSession;
  /** The owner's own half finished run of this exercise, or nothing. */
  restored: RestoredFocusedProgress;
}

/** Open, or restore, one focused exercise for the owner on the page now:
    the session, and that owner's in-progress copy. Used on mount and at a
    hand-over alike. */
export function openFocusedExercise(
  storage: FocusedProgressStorage | null,
  view: { exerciseId: string; items: readonly { itemId: string }[] },
  now: string,
): OpenedFocusedExercise {
  const session = openExerciseSession();
  return { session, restored: readFocusedProgress(storage, session.namespace, view, now) };
}

/** The help state a restored copy stands for: each item's level, and
    nothing else (the hint prose is never kept, see focused-exercise.ts). */
export function helpFromRestored(
  assistance: Readonly<Record<string, AssistanceLevel>>,
): Record<string, ItemHelpState> {
  const help: Record<string, ItemHelpState> = {};
  for (const [itemId, level] of Object.entries(assistance)) help[itemId] = withHelp(NO_HELP, { assistance: level });
  return help;
}

/** Keep the boxes as they stand, under the SESSION's owner, or drop the
    copy once the run is recorded. The component's keeping effect makes this
    one call from the render that holds these answers, so the answers and the
    key always belong to the same student. False when the browser refused a
    write. */
export function keepFocusedProgress(
  storage: FocusedProgressStorage | null,
  session: ExerciseSession,
  exerciseId: string,
  state: {
    answers: Readonly<Record<string, string>>;
    help: Readonly<Record<string, ItemHelpState>>;
    settled: boolean;
  },
  now: string,
): boolean {
  return applyFocusedProgress(
    storage,
    session.namespace,
    exerciseId,
    focusedProgressAction({ exerciseId, answers: state.answers, help: state.help, settled: state.settled, now }),
  );
}

/** A help reply for `owner` (the student who pressed) that arrived after
 *  the screen let go of their answers: raise that item's level in THEIR
 *  in-progress copy, so their next check records the answer as helped.
 *
 *  Only an item that already has an answer in the copy can carry it: the
 *  copy keeps a level beside an answer and nowhere else, exactly as a reload
 *  does. Help only ever raises a level, so keeping it can never make later
 *  work read as more independent than it was. True when it was written. */
export function keepFocusedHelpFor(
  storage: FocusedProgressStorage | null,
  owner: CacheOwner,
  view: { exerciseId: string; items: readonly { itemId: string }[] },
  itemId: string,
  assistance: AssistanceLevel,
  now: string,
): boolean {
  const namespace = ownerNamespace(owner);
  const held = readFocusedProgress(storage, namespace, view, now);
  if (held.answers[itemId] === undefined) return false;
  const help = helpFromRestored(held.assistance);
  help[itemId] = withHelp(help[itemId] ?? NO_HELP, { assistance });
  return applyFocusedProgress(
    storage,
    namespace,
    view.exerciseId,
    focusedProgressAction({ exerciseId: view.exerciseId, answers: held.answers, help, settled: false, now }),
  );
}

/* ── The lesson quick check (PracticeQuiz.tsx) ───────────────────────────── */

export interface OpenedLessonCheck {
  session: ExerciseSession;
  /** Where this owner's unfinished run of the set is kept, or null for a
      check with no set id (it keeps and records nothing, as before). */
  key: string | null;
  /** That owner's unfinished run, or null. */
  held: LessonCheckProgressV1 | null;
}

/** Open, or restore, one lesson quick check for the owner on the page now.
    Used on mount and at a hand-over alike. */
export function openLessonCheck(
  storage: BrowserStorage | null,
  setId: string | undefined,
  unitSizes: readonly number[],
  now: string,
): OpenedLessonCheck {
  const session = openExerciseSession();
  if (!setId) return { session, key: null, held: null };
  const key = lessonCheckProgressKey(session.namespace, setId);
  return { session, key, held: readLessonCheckProgress(storage, key, unitSizes, now) };
}
