/* Trial stand-in for src/data/focused-exercises.ts (see ./README.md): the
   focused exercises, with their objectives, instructions, guiding
   questions, model notes and authored practice passages. None of them is in
   the trial, so a trial build's browser carries none: every registry is
   empty and every lookup finds nothing. The small helpers and the reason
   lists a student picks from after a wrong answer stay, because the open
   test screens use them; the lists come from src/data/mistake-reasons.ts,
   which holds no exercise content. */

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

export function findFocusedExercise(_id: string): AnyFocusedExercise | undefined {
  return undefined;
}

export function focusedExercisesFor(_subskill: Subskill, _role?: FocusedExerciseRole): readonly AnyFocusedExercise[] {
  return [];
}

export function focusedExerciseHref(id: string): string {
  return `/trainers/focused/${id}`;
}

export function findSpokenFocusedTask(_id: string): SpokenFocusedTask | undefined {
  return undefined;
}

export function spokenFocusedTaskHref(id: string): string {
  return `/trainers/speaking-focus/${id}`;
}
