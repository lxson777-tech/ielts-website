/* Trial stand-in for src/data/model-answers.ts (see ./README.md). A trial
   build carries no model answers; the trial's one example comes from the
   content gate (LessonModelExample). A paid account's browser receives the
   real list through the gate (pack `model-answers`, src/lib/trial/packs.ts)
   and fillModelAnswers puts it in place. */

import type { ModelAnswer, ModelBand } from '../../../data/model-answers';
import { packArray, packObject, replaceArray } from './fill';

export type { ModelAnswer, ModelAnswerCriteria, ModelBand, ModelHighlight } from '../../../data/model-answers';

export const MODEL_ANSWERS: ModelAnswer[] = [];

/** All model answers for a given prompt, in ascending band order (the real
    module's rule, over whatever this stand-in holds). */
export function getModelAnswers(promptId: string): ModelAnswer[] {
  return MODEL_ANSWERS.filter((m) => m.promptId === promptId).sort((a, b) => a.band - b.band);
}

export function getModelBands(promptId: string): ModelBand[] {
  return getModelAnswers(promptId).map((m) => m.band);
}

/** Paid access only: the pack `model-answers` ({ MODEL_ANSWERS }). */
export function fillModelAnswers(data: unknown): void {
  const pack = packObject(data, ['MODEL_ANSWERS']);
  replaceArray(MODEL_ANSWERS, packArray<ModelAnswer>(pack.MODEL_ANSWERS, 'MODEL_ANSWERS'));
}
