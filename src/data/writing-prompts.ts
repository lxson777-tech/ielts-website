/* Writing practice prompts. Only authentic exam tasks: every prompt comes
   from the imported pool (tools/import_writing.py, PracticePTEOnline, reused
   with permission). The in-house prompts were removed on 2026-09-14 at Alex's
   request. The trainer lists whatever is here. */

import type { EssayPrompt } from '../lib/writing/schema';
import { IMPORTED_WRITING_PROMPTS } from './writing-prompts-imported';

/* The imported PracticePTEOnline pool (see tools/import_writing.py and
   docs/WRITING-IMPORT-RESULT.md). Every consumer (WritingTester,
   WritingHistory, the trainers/tests index pages) reads this single array. */
export const WRITING_PROMPTS: EssayPrompt[] = [...IMPORTED_WRITING_PROMPTS];

export function getWritingPrompt(id: string): EssayPrompt | undefined {
  return WRITING_PROMPTS.find((p) => p.id === id);
}
