/* The placement test's material, resolved from the real data. BUILD SIDE
   ONLY: it reads the practice papers, the Writing questions and the
   Speaking bank, so it is imported by src/pages/placement.astro's
   frontmatter (the open build writes it into the page) and by
   tools/build-gated-content.mjs (the gated build's paid pack `placement`),
   never by anything that runs in the browser.

   The material is named in src/data/placement.ts and nowhere else. A
   drill's own clock is replaced by the placement's for its part, so the four
   parts fit the forty minutes (see src/data/placement.ts for why). Anything
   the data does not have is null, and the page says "not available" calmly
   instead of failing. */

import { getDrill } from '../tests/drills';
import { getWritingPrompt } from '../../data/writing-prompts';
import { SPEAKING_PART1_TOPICS } from '../../data/speaking-prompts';
import { PLACEMENT } from '../../data/placement';
import type { PracticeTest } from '../tests/schema';
import type { EssayPrompt } from '../writing/schema';
import type { Part1Topic } from '../speaking/schema';

export interface PlacementMaterial {
  listening: PracticeTest | null;
  reading: PracticeTest | null;
  writing: EssayPrompt | null;
  speaking: Part1Topic | null;
}

export const NO_PLACEMENT_MATERIAL: PlacementMaterial = { listening: null, reading: null, writing: null, speaking: null };

function paper(drillId: string, minutes: number): PracticeTest | null {
  const drill = getDrill(drillId);
  return drill ? { ...drill.test, durationMinutes: minutes } : null;
}

export function placementMaterial(): PlacementMaterial {
  return {
    listening: paper(PLACEMENT.listening.drillId, PLACEMENT.listening.minutes),
    reading: paper(PLACEMENT.reading.drillId, PLACEMENT.reading.minutes),
    writing: getWritingPrompt(PLACEMENT.writing.promptId) ?? null,
    speaking: SPEAKING_PART1_TOPICS.find((topic) => topic.id === PLACEMENT.speaking.topicId) ?? null,
  };
}
