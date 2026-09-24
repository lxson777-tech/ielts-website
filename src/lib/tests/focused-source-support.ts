import type { QuestionGroup } from './schema';
import { withBase } from '../url';

/** Imported Listening sheets sometimes carry their legend/diagram only in
 * questionHtml. Match the numbered group, never infer choices from answers. */
export function focusedSourceSupport(questionHtml: string, firstNumber: number, group: QuestionGroup) {
  const section = [...questionHtml.matchAll(/<section\b[^>]*data-question-start="(\d+)"[^>]*data-question-end="(\d+)"[^>]*>([\s\S]*?)<\/section>/g)]
    .find(match => firstNumber >= Number(match[1]) && firstNumber <= Number(match[2]))?.[3] ?? '';
  const legend = section.match(/<dl\b[^>]*class="listening-source-legend"[^>]*>[\s\S]*?<\/dl>/)?.[0] ?? '';
  const choices = [...legend.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map(match => match[1]!.trim());
  const images = group.type === 'diagram-labelling' ? [...section.matchAll(/<img\b[^>]*>/g)].map(match => match[0].replace(/src="(\/[^"]+)"/, (_all, path: string) => `src="${withBase(path)}"`)).join('') : '';
  return {
    options: group.options?.length ? group.options : choices,
    legendHtml: group.legendHtml || legend || images || undefined,
    freeText: group.type === 'sentence-completion' || group.type === 'table-completion' || (group.type === 'diagram-labelling' && !group.options?.length),
  };
}
