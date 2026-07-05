/* Writing practice prompts. Original material. Drives the essay checker at
   /writing/checker; more prompts can be added freely — the checker lists
   whatever is here. */

import type { EssayPrompt } from '../lib/writing/schema';

export const WRITING_PROMPTS: EssayPrompt[] = [
  {
    id: 'w2-technology-social',
    task: 'task2',
    variant: 'opinion',
    title: 'Technology & sociability',
    promptHtml:
      'Some people believe that modern technology is making people less sociable. <strong>To what extent do you agree or disagree?</strong> Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-university-purpose',
    task: 'task2',
    variant: 'discussion',
    title: 'The purpose of university',
    promptHtml:
      'Some people think the main purpose of university education is to prepare students for employment, while others believe it should develop knowledge for its own sake. <strong>Discuss both views and give your own opinion.</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-city-traffic',
    task: 'task2',
    variant: 'problem-solution',
    title: 'Traffic in cities',
    promptHtml:
      'Traffic congestion in large cities is getting worse every year. <strong>What problems does this cause, and what measures could governments take to solve them?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w1-letter-neighbour',
    task: 'task1',
    variant: 'letter',
    title: 'Letter to a neighbour (General Training)',
    promptHtml:
      'You are planning to hold a party at your home, and you are worried the noise may disturb your neighbour. Write a letter to your neighbour. In your letter: <em>explain the reason for the party · describe what you will do to limit the noise · invite them to attend</em>.',
    minWords: 150,
    suggestedMinutes: 20,
  },
];

export function getWritingPrompt(id: string): EssayPrompt | undefined {
  return WRITING_PROMPTS.find((p) => p.id === id);
}
