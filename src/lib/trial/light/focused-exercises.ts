/* Trial stand-in for src/data/focused-exercises.ts (see ./README.md): the
   focused exercises, with their objectives, instructions, guiding
   questions, model notes and authored practice passages. None of them is in
   the trial, so a trial build's browser carries none: every registry is
   empty and every lookup finds nothing. The small helpers and the reason
   lists a student picks from after a wrong answer stay, because the open
   test screens use them; the lists come from src/data/mistake-reasons.ts,
   which holds no exercise content.

   A paid account's browser receives the registries through the gate (pack
   `focused-exercises`, src/lib/trial/packs.ts); fillFocusedExercises puts
   them in place and every lookup below then answers as the real module's
   does. */

import type {
  AnyFocusedExercise,
  AuthoredFocusedExercise,
  FocusedExercise,
  FocusedExerciseItem,
  FocusedExerciseRole,
  SpokenFocusedTask,
  WrittenFocusedTask,
} from '../../../data/focused-exercises';
import type { Subskill } from '../../learning/contracts/catalog';
import { paperItemId } from '../../learning/evidence';
import { packArray, packObject, replaceArray } from './fill';

export type * from '../../../data/focused-exercises';
export { MAX_REASON_NOTE_CHARS, MISTAKE_REASONS } from '../../../data/mistake-reasons';

export function isSharedItemId(item: FocusedExerciseItem, testId: string): boolean {
  return item.id === paperItemId(testId, item.questionId);
}

export function writtenItemId(promptId: string): string {
  return `prompt:${promptId}`;
}

export function isWrittenFocusedTask(entry: AnyFocusedExercise): entry is WrittenFocusedTask {
  return entry.kind === 'written-response';
}

export function authoredItemId(exerciseId: string, questionId: string): string {
  return `authored:${exerciseId}:${questionId}`;
}

export function isAuthoredFocusedExercise(entry: AnyFocusedExercise): entry is AuthoredFocusedExercise {
  return entry.kind === 'authored-practice';
}

export function isSpokenFocusedTask(entry: unknown): entry is SpokenFocusedTask {
  return typeof entry === 'object' && entry !== null && (entry as { kind?: unknown }).kind === 'spoken-response';
}

export const FOCUSED_EXERCISES: readonly FocusedExercise[] = [];
export const WRITTEN_FOCUSED_TASKS: readonly WrittenFocusedTask[] = [];
export const AUTHORED_FOCUSED_EXERCISES: readonly AuthoredFocusedExercise[] = [];
export const ALL_FOCUSED_EXERCISES: readonly AnyFocusedExercise[] = [];
export const SPOKEN_FOCUSED_TASKS: readonly SpokenFocusedTask[] = [];
export const RESERVED_CHECK_PAPER_IDS: readonly string[] = [];
export const RESERVED_CHECK_PROMPT_IDS: readonly string[] = [];

export function findFocusedExercise(id: string): AnyFocusedExercise | undefined {
  return ALL_FOCUSED_EXERCISES.find((exercise) => exercise.id === id);
}

export function focusedExercisesFor(subskill: Subskill, role?: FocusedExerciseRole): readonly AnyFocusedExercise[] {
  return ALL_FOCUSED_EXERCISES.filter(
    (exercise) => exercise.subskill === subskill && (role === undefined || exercise.role === role),
  );
}

export function focusedExerciseHref(id: string): string {
  return `/trainers/focused/${id}`;
}

export function findSpokenFocusedTask(id: string): SpokenFocusedTask | undefined {
  return SPOKEN_FOCUSED_TASKS.find((task) => task.id === id);
}

export function spokenFocusedTaskHref(id: string): string {
  return `/trainers/speaking-focus/${id}`;
}

/** Paid access only: the pack `focused-exercises` ({ FOCUSED_EXERCISES,
    WRITTEN_FOCUSED_TASKS, AUTHORED_FOCUSED_EXERCISES, SPOKEN_FOCUSED_TASKS }).
    The combined list and the two reserved lists are derived here by the
    real module's own rules. */
export function fillFocusedExercises(data: unknown): void {
  const pack = packObject(data, ['FOCUSED_EXERCISES', 'WRITTEN_FOCUSED_TASKS', 'AUTHORED_FOCUSED_EXERCISES', 'SPOKEN_FOCUSED_TASKS']);
  const items = packArray<FocusedExercise>(pack.FOCUSED_EXERCISES, 'FOCUSED_EXERCISES');
  const written = packArray<WrittenFocusedTask>(pack.WRITTEN_FOCUSED_TASKS, 'WRITTEN_FOCUSED_TASKS');
  const authored = packArray<AuthoredFocusedExercise>(pack.AUTHORED_FOCUSED_EXERCISES, 'AUTHORED_FOCUSED_EXERCISES');
  const spoken = packArray<SpokenFocusedTask>(pack.SPOKEN_FOCUSED_TASKS, 'SPOKEN_FOCUSED_TASKS');
  replaceArray(FOCUSED_EXERCISES, items);
  replaceArray(WRITTEN_FOCUSED_TASKS, written);
  replaceArray(AUTHORED_FOCUSED_EXERCISES, authored);
  replaceArray<AnyFocusedExercise>(ALL_FOCUSED_EXERCISES, [...items, ...written, ...authored]);
  replaceArray(SPOKEN_FOCUSED_TASKS, spoken);
  replaceArray(
    RESERVED_CHECK_PAPER_IDS,
    [...new Set(items.filter((exercise) => exercise.role === 'independent-check').map((exercise) => exercise.source.testId))].sort(),
  );
  replaceArray(
    RESERVED_CHECK_PROMPT_IDS,
    [...new Set(written.filter((task) => task.role === 'independent-check').map((task) => task.source.promptId))].sort(),
  );
}
