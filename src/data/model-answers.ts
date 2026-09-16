/* Model-answer bank for the Writing section: one Band 8 model for every one of
   the 60 real exam tasks in writing-prompts.ts, written against the prompt, its
   generated plan and, for Task 1, the chart image itself. Drives /writing/models
   and the Model answer tab in the Writing Trainer. Prompt text stays in
   writing-prompts.ts; this file references prompts by id only.

   The models live in src/data/models-real/ in batches of five, which is how they
   were written and how they are easiest to re-check. ModelBand still allows 6,
   7 and 8.5 so a lower or higher band model can be added beside a Band 8 one
   later, which is how a student sees the difference between bands. */

import type { WritingTask } from '../lib/writing/schema';
import { BATCH_01 } from './models-real/batch-01';
import { BATCH_02 } from './models-real/batch-02';
import { BATCH_03 } from './models-real/batch-03';
import { BATCH_04 } from './models-real/batch-04';
import { BATCH_05 } from './models-real/batch-05';
import { BATCH_06 } from './models-real/batch-06';
import { BATCH_07 } from './models-real/batch-07';
import { BATCH_08 } from './models-real/batch-08';
import { BATCH_09 } from './models-real/batch-09';
import { BATCH_10 } from './models-real/batch-10';
import { BATCH_11 } from './models-real/batch-11';
import { BATCH_12 } from './models-real/batch-12';

export type ModelBand = 6 | 7 | 8 | 8.5;

export interface ModelAnswerCriteria {
  /** Task 2 only. */
  taskResponse?: string;
  /** Task 1 only. */
  taskAchievement?: string;
  coherence: string;
  lexical: string;
  grammar: string;
}

export interface ModelHighlight {
  /** Exact substring of the essay text (must appear in one of the
      paragraphs) that gets wrapped and made hoverable in the UI. */
  phrase: string;
  note: string;
}

export interface ModelAnswer {
  promptId: string;
  task: WritingTask;
  band: ModelBand;
  /** Paragraphs, in order. Joined with blank lines for word counting and
      rendered as separate <p> elements. */
  text: string[];
  highlights: ModelHighlight[];
  criteria: ModelAnswerCriteria;
}

/* Band 8 models for the 60 real exam tasks, one per task, written against the
   prompt, its generated plan and (for Task 1) the chart image itself. They
   live in src/data/models-real/ in batches of five, which is how they were
   written and how they are easiest to re-check.

   The 59 older in-house models that used to sit here were deleted on
   2026-09-16: they answered invented prompts that were removed in September,
   several of them General Training letters, so no student could ever reach
   them. Git history keeps them if they are ever wanted back. */
export const MODEL_ANSWERS: ModelAnswer[] = [
  ...BATCH_01,
  ...BATCH_02,
  ...BATCH_03,
  ...BATCH_04,
  ...BATCH_05,
  ...BATCH_06,
  ...BATCH_07,
  ...BATCH_08,
  ...BATCH_09,
  ...BATCH_10,
  ...BATCH_11,
  ...BATCH_12,
];

/** All model answers for a given prompt, in ascending band order. */
export function getModelAnswers(promptId: string): ModelAnswer[] {
  return MODEL_ANSWERS.filter((m) => m.promptId === promptId).sort((a, b) => a.band - b.band);
}

/** The distinct bands available for a prompt (3 for most Task 2 prompts,
    2 for Task 1 and any Task 2 prompt past the twelve-prompt cap). */
export function getModelBands(promptId: string): ModelBand[] {
  return getModelAnswers(promptId).map((m) => m.band);
}
