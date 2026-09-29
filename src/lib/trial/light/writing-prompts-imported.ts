/* Trial stand-in for src/data/writing-prompts-imported.ts (see ./README.md).
   Only what the public learning index already publishes: each question's id,
   task, type and title, with no question text. The trial's one essay question
   comes from the content gate (WritingTester, startTrialEssay).

   A paid account's browser receives every question through the gate (pack
   `writing-prompts-imported`, src/lib/trial/packs.ts; its Task 1 charts come
   inside it, because a gated build does not publish them), and
   fillImportedWritingPrompts updates each entry where it stands, so the copy
   src/data/writing-prompts.ts made of this list sees the questions too. */

import type { EssayPrompt } from '../../writing/schema';
import index from '../../../data/generated/learning-index.json' with { type: 'json' };
import { mergeById, packArray, packObject } from './fill';

type IndexPrompt = { id: string; task: 'task1' | 'task2'; title: string; form?: string; minWords?: number; suggestedMinutes?: number };

export const IMPORTED_WRITING_PROMPTS: EssayPrompt[] = ((index as { writingPrompts?: IndexPrompt[] }).writingPrompts ?? []).map(
  (p) => ({
    id: p.id,
    task: p.task,
    variant: p.form ?? '',
    title: p.title,
    promptHtml: '',
    minWords: p.minWords ?? (p.task === 'task2' ? 250 : 150),
    suggestedMinutes: p.suggestedMinutes ?? (p.task === 'task2' ? 40 : 20),
    suggestedVocab: [],
  }),
);

/** Paid access only: the pack `writing-prompts-imported` ({ IMPORTED_WRITING_PROMPTS }). */
export function fillImportedWritingPrompts(data: unknown): void {
  const pack = packObject(data, ['IMPORTED_WRITING_PROMPTS']);
  mergeById(IMPORTED_WRITING_PROMPTS, packArray<EssayPrompt>(pack.IMPORTED_WRITING_PROMPTS, 'IMPORTED_WRITING_PROMPTS'));
}
