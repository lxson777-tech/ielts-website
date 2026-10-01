/** Build-only selection. Publish one worked example per writing lesson,
 * never the model bank or the question-selection lists. */
import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { WRITING_PROMPTS } from '../../data/writing-prompts';
import { getModelAnswers } from '../../data/model-answers';
import { TRIAL_WRITING } from '../trial/offer';

export const LESSON_EXAMPLE_VARIANTS: Record<string, string[]> = {
  method: ['chart', 'table', 'combination', 'process', 'map'],
  charts: ['chart', 'table', 'combination'], process: ['process'], maps: ['map'],
  'task2-method': ['opinion', 'discussion', 'advantages-disadvantages', 'problem-solution', 'two-part'],
  opinion: ['opinion'], discussion: ['discussion'], advantages: ['advantages-disadvantages'],
  problem: ['problem-solution'], twopart: ['two-part'],
};

export function lessonExample(lesson: string) {
  const variants = LESSON_EXAMPLE_VARIANTS[lesson] ?? [];
  for (const source of WRITING_PROMPTS) {
    if (source.id === TRIAL_WRITING.essayPromptId) continue;
    if (!variants.includes(source.variant)) continue;
    const model = getModelAnswers(source.id)[0];
    if (!model) continue;
    const prompt = { ...source };
    const inlineImage = (url: string) => {
      const path = resolve('public', url.replace(/^\/(?:ielts-website\/)?/, ''));
      const type = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' } as Record<string,string>)[extname(path)];
      if (!type) throw new Error('Unsupported lesson example image');
      return `data:${type};base64,${readFileSync(path).toString('base64')}`;
    };
    if (prompt.imageUrl) prompt.imageUrl = inlineImage(prompt.imageUrl);
    prompt.promptHtml = prompt.promptHtml.replace(/src="(\/(?:ielts-website\/)?pics\/writing\/imported\/[a-zA-Z0-9_.-]+)"/g, (_, url: string) => `src="${inlineImage(url)}"`);
    return { prompt, model };
  }
  return null;
}
