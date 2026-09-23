/* What a TRIAL build's browser code gets instead of src/data/tests.

   The full practice papers (passages, transcripts, questions, answers) are
   3.9 MB and, on the open site, several islands import them straight into the
   browser (the mock exam, the score history's titles, the study plan, the
   drill list). A trial build must not ship them in any public file, so the
   Vite plugin in astro.config.mjs points those imports here instead, for the
   browser bundle only. Pages still build from the real data on the server.

   Only what the committed learning index already publishes is here: each
   paper's id, paper, title and length. Every paper's content comes from the
   content gate (workers/content-gate) when a student may open it. */

import index from '../../data/generated/learning-index.json';
import type { PracticeTest } from '../tests/schema';

export const ALL_TESTS: PracticeTest[] = (index.tests as { id: string; skill: 'reading' | 'listening'; title: string; durationMinutes: number }[]).map(
  (t) =>
    ({
      id: t.id,
      skill: t.skill,
      title: t.title,
      description: '',
      durationMinutes: t.durationMinutes,
      parts: [],
    }) as unknown as PracticeTest,
);

export function getTest(id: string): PracticeTest | undefined {
  return ALL_TESTS.find((t) => t.id === id);
}
