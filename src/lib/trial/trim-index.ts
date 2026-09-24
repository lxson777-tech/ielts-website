/* The learning index as a trial build publishes it.

   src/data/generated/learning-index.json is public on the open site (the
   browser imports it, and /data/learning-index.json serves it). Most of it
   is ids, counts and titles, but three fields carry study material the trial
   does not include (Alex, 24 September 2026: lock the remaining material):
   - a focused exercise's objective sentence;
   - a Part 2 cue card's headline, which is the cue card's question itself;
   - a Writing question's title, which is the question's opening words.

   A trial build publishes this copy instead: objectives removed (the
   catalogue already falls back to a general sentence), cue-card headlines
   and Writing titles replaced by plain labels. The trial's own essay
   question and its lesson example keep their titles: the trial shows both.

   Used by the trial build plugin in astro.config.mjs (the browser's copy)
   and by src/pages/data/learning-index.json.ts (the published file). */

import { TRIAL_WRITING } from './offer';

type Entry = Record<string, unknown>;

export function trialLearningIndex<T>(index: T): T {
  const copy = JSON.parse(JSON.stringify(index)) as Record<string, unknown>;
  const kept = new Set<string>([TRIAL_WRITING.essayPromptId, TRIAL_WRITING.examplePromptId]);

  const focused = copy.focusedExercises;
  if (Array.isArray(focused)) {
    for (const exercise of focused as Entry[]) delete exercise.objective;
  }

  const speaking = copy.speakingPrompts;
  if (Array.isArray(speaking)) {
    for (const prompt of speaking as Entry[]) {
      if (prompt.part === 2) prompt.topic = 'Part 2 cue card';
    }
  }

  const writing = copy.writingPrompts;
  if (Array.isArray(writing)) {
    for (const prompt of writing as Entry[]) {
      if (typeof prompt.id === 'string' && kept.has(prompt.id)) continue;
      prompt.title = prompt.task === 'task1' ? 'Task 1 question' : 'Task 2 question';
    }
  }

  return copy as T;
}
