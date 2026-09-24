/* Trial stand-in for src/data/writing-prompts-imported.ts (see ./README.md).
   Only what the public learning index already publishes: each question's id,
   task, type and title, with no question text. The trial's one essay question
   comes from the content gate (WritingTester, startTrialEssay). */

import type { EssayPrompt } from '../../writing/schema';
import index from '../../../data/generated/learning-index.json';

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
