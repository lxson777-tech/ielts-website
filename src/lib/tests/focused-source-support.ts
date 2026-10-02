import type { Question, QuestionGroup } from './schema';
import { withBase } from '../url';

/** Imported Listening papers keep the publisher's question sheet in the
 * part's `questionHtml`, one `<section data-question-start data-question-end>`
 * per numbered group. Many imported groups carry nothing of their own: each
 * question is only a "Question N" placeholder, and the table, form, notes,
 * flow chart, map or question stem that makes it answerable exists ONLY in
 * that section. The full test player shows the whole sheet, so it works
 * there; the focused page shows one group, so it must show that group's own
 * section, or the student gets "Complete the table below" and empty boxes.
 *
 * What is passed through, in order of preference:
 *   - the group's own `legendHtml`, when the data already has one;
 *   - the group's WHOLE section (header removed, since the page prints the
 *     instruction itself) when every question in the group is a placeholder.
 *     Only a section whose range is exactly this group's range qualifies,
 *     so the focused page never shows more of the paper than this group;
 *   - otherwise, as before: the section's `<dl>` legend (menus, boxes) or,
 *     for a diagram, its picture.
 * Choices are read from the legend, never inferred from the answers. */

/** A question with no wording of its own: no text around a gap, and a text
 * that is empty or only "Question N". */
export function isPlaceholderQuestion(question: Pick<Question, 'textHtml' | 'before' | 'after'>): boolean {
  if ((question.before ?? '').trim() || (question.after ?? '').trim()) return false;
  const text = (question.textHtml ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text === '' || /^question\s+\d+$/i.test(text);
}

/** Root-relative image paths in the sheet, under the site's base path (the
 * same rewrite TestPlayer's questionAssets makes for the full sheet). */
function withAssetBase(html: string): string {
  return html.replace(/\bsrc="(\/(?!\/)[^"]*)"/g, (_all, path: string) => `src="${withBase(path)}"`);
}

export function focusedSourceSupport(questionHtml: string, firstNumber: number, group: QuestionGroup) {
  const lastNumber = firstNumber + group.questions.length - 1;
  const match = [...questionHtml.matchAll(/<section\b[^>]*data-question-start="(\d+)"[^>]*data-question-end="(\d+)"[^>]*>([\s\S]*?)<\/section>/g)]
    .find(candidate => firstNumber >= Number(candidate[1]) && firstNumber <= Number(candidate[2]));
  const section = match?.[3] ?? '';
  const ownSection = match != null && Number(match[1]) === firstNumber && Number(match[2]) === lastNumber;
  const legend = section.match(/<dl\b[^>]*class="listening-source-legend"[^>]*>[\s\S]*?<\/dl>/)?.[0] ?? '';
  const choices = [...legend.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map(found => found[1]!.trim());
  const images = group.type === 'diagram-labelling' ? withAssetBase([...section.matchAll(/<img\b[^>]*>/g)].map(found => found[0]).join('')) : '';
  const placeholdersOnly = group.questions.length > 0 && group.questions.every(isPlaceholderQuestion);
  const body = section.replace(/<header\b[^>]*class="listening-source-header"[^>]*>[\s\S]*?<\/header>/, '').trim();
  /* Wrapped in the full player's own class so the sheet's tables, gaps,
     figures and rows are styled exactly as they are there (global.css). */
  const sheet = placeholdersOnly && ownSection && body ? `<div class="listening-question-paper focused-source-sheet">${withAssetBase(body)}</div>` : '';
  return {
    options: group.options?.length ? group.options : choices,
    legendHtml: group.legendHtml || sheet || legend || images || undefined,
    freeText: group.type === 'sentence-completion' || group.type === 'table-completion' || (group.type === 'diagram-labelling' && !group.options?.length),
  };
}
