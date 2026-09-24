/* Trial stand-in for src/data/model-answers.ts (see ./README.md). A trial
   build carries no model answers; the trial's one example comes from the
   content gate (LessonModelExample). */

import type { ModelAnswer, ModelBand } from '../../../data/model-answers';

export type { ModelAnswer, ModelAnswerCriteria, ModelBand, ModelHighlight } from '../../../data/model-answers';

export const MODEL_ANSWERS: ModelAnswer[] = [];

export function getModelAnswers(_promptId: string): ModelAnswer[] {
  return [];
}

export function getModelBands(_promptId: string): ModelBand[] {
  return [];
}
