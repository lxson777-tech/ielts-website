/* Trial stand-in for src/data/speaking-prompts.ts (see ./README.md): the
   Part 1 topics and the cue cards, with their questions, ideas and topic
   vocabulary. The trial's Speaking test (a Part 1 interview) needs only a
   topic's id and name: the live examiner Worker reads the questions from its
   own copy of the bank. So a trial build carries each Part 1 topic's id and
   name, which the public learning index already lists, and no cue cards.

   A paid account's browser receives the whole bank through the gate (pack
   `speaking-prompts`, src/lib/trial/packs.ts). */

import type { CueCard, Part1Topic } from '../../speaking/schema';
import index from '../../../data/generated/learning-index.json' with { type: 'json' };
import { mergeById, packArray, packObject, replaceArray } from './fill';

type IndexSpeakingPrompt = { id: string; part: number; topic: string };

export const SPEAKING_PART1_TOPICS: Part1Topic[] = ((index as { speakingPrompts?: IndexSpeakingPrompt[] }).speakingPrompts ?? [])
  .filter((p) => p.part === 1)
  .map((p) => ({ id: p.id, part: 'part1', topic: p.topic, questions: [] }));

export const SPEAKING_CUE_CARDS: CueCard[] = [];

/** Paid access only: the pack `speaking-prompts`
    ({ SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS }). */
export function fillSpeakingPrompts(data: unknown): void {
  const pack = packObject(data, ['SPEAKING_PART1_TOPICS', 'SPEAKING_CUE_CARDS']);
  mergeById(SPEAKING_PART1_TOPICS, packArray<Part1Topic>(pack.SPEAKING_PART1_TOPICS, 'SPEAKING_PART1_TOPICS'));
  replaceArray(SPEAKING_CUE_CARDS, packArray<CueCard>(pack.SPEAKING_CUE_CARDS, 'SPEAKING_CUE_CARDS'));
}
