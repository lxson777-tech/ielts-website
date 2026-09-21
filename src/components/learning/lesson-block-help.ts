/* Block ids on the rendered lesson, and one quiet help control per block.
 *
 * WHY IT IS DONE IN THE PAGE AND NOT IN THE LESSON FILES
 * Lead decision D2: no lesson body file is ever edited. The ids are DERIVED
 * by src/lib/learning/lesson-blocks.ts from the markup the bodies already
 * have, worked out at build time from the ENGLISH body, and stamped onto
 * the rendered headings here. The Russian body of the same lesson is a
 * translation of the same structure, so stamping by position gives it the
 * SAME ids, which is what lets one block id mean one teaching point in both
 * languages, in the published block file and in a tutoring turn.
 *
 * THE RULE, IN STEP WITH segmentLessonBody
 * One block per <h2> or <h3>, in document order, inside the lesson body
 * only. Headings inside the generated lesson-card grid are skipped: that
 * grid is built by Astro and is not part of the fragment the ids were
 * computed from (see LESSON_CARDS_ATTR in src/lib/i18n/lesson-body.ts).
 *
 * WHY THE CONTROLS ARE REBUILT RATHER THAN REUSED
 * Reading in Russian replaces the whole body with innerHTML, which drops
 * every listener. A control that survived that would look alive and do
 * nothing, so each pass removes what it made last time and builds it again.
 */

import { t } from '../../lib/i18n/translate';
import { getLocale } from '../../lib/i18n/locale';
import type { LessonHelpKind } from '../../lib/learning/contracts/ai';
import { askContext } from './learning-versions';
import { HELP_SOURCE_NOTE, requestLessonHelp, type HelpResult } from './lesson-help';

/** Marks a control this module made, so the next pass can clear it. */
const HELP_NODE_CLASS = 'lesson-block-help';

/** The heading elements one lesson body would stamp, in order.
 *
 *  Exported so the same rule can be checked without a browser: the count
 *  must equal the number of blocks segmentLessonBody finds in the same
 *  body, in English and in Russian alike. */
export function headingsToStamp(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('h2, h3')].filter(
    (heading) => !heading.closest('[data-lesson-cards]'),
  );
}

/** Put the derived ids on the rendered headings, in order.
 *
 *  Returns how many were stamped. A body with more headings than ids (a
 *  translation that has drifted) leaves the extra ones alone rather than
 *  inventing a name for them. */
export function stampBlockIds(root: ParentNode, ids: readonly string[]): number {
  const headings = headingsToStamp(root);
  let stamped = 0;
  headings.forEach((heading, index) => {
    const id = ids[index];
    if (!id) return;
    heading.id = id;
    heading.dataset.lessonBlock = id;
    /* A deep link lands on the heading, and the sticky workspace header is
       108px tall, so without this the heading sits under it. */
    heading.style.scrollMarginTop = '96px';
    stamped += 1;
  });
  return stamped;
}

/** The text of one block: its heading and everything up to the next one.
    The same span segmentLessonBody cuts, read off the page so the
    deterministic answer has something real to say when the tutor cannot be
    reached. */
export function blockTextOf(heading: HTMLElement): string {
  const parts: string[] = [heading.textContent ?? ''];
  let node: Element | null = heading.nextElementSibling;
  while (node && !/^H[23]$/.test(node.tagName)) {
    parts.push(node.textContent ?? '');
    node = node.nextElementSibling;
  }
  return parts
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}

export interface LessonBlockHelpOptions {
  lessonKey: string;
  lessonTitle?: string;
  /** The block ids, derived from the English body at build time. */
  ids: readonly string[];
  /** Where to look. Defaults to the lesson body on this page. */
  root?: ParentNode | null;
}

/** Stamp the ids and add the help controls. Safe to call again after a
    language swap or a client side navigation. */
export function mountLessonBlockHelp(options: LessonBlockHelpOptions): void {
  const root = options.root ?? document.querySelector('[data-lesson-body]');
  if (!root || options.ids.length === 0) return;

  /* A control left behind by an earlier pass has no listeners any more. */
  root.querySelectorAll(`.${HELP_NODE_CLASS}`).forEach((node) => node.remove());
  stampBlockIds(root, options.ids);

  for (const heading of headingsToStamp(root)) {
    const blockId = heading.dataset.lessonBlock;
    if (!blockId) continue;
    const control = buildControl({
      lessonKey: options.lessonKey,
      lessonTitle: options.lessonTitle,
      blockId,
      heading,
    });
    /* At the END of the block, where a student has just read it, rather
       than under the heading where it would shout before they have read a
       word. */
    const end = endOfBlock(heading);
    end.after(control);
  }

  scrollToHashBlock(root);
}

/** The last element of this block, which is what the control goes after. */
function endOfBlock(heading: HTMLElement): Element {
  let last: Element = heading;
  let node: Element | null = heading.nextElementSibling;
  while (node && !/^H[23]$/.test(node.tagName)) {
    last = node;
    node = node.nextElementSibling;
  }
  return last;
}

/** A deep link to a block lands before this script has stamped anything, so
    the browser finds no such id and stays at the top. Put that right. */
function scrollToHashBlock(root: ParentNode): void {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const target = root.querySelector<HTMLElement>(`[data-lesson-block="${CSS.escape(hash)}"]`);
  if (!target) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

/* ── The teaching block a quick check belongs to ─────────────────────────── */

export interface LessonBlockContext {
  lessonKey: string;
  lessonTitle?: string;
  blockId: string;
  blockHeading: string;
  blockText: string;
}

/** The teaching block behind the quick check at the bottom of a lesson.
 *
 *  Read off the page the check is sitting on, so the help a student gets on
 *  a question is grounded in the lesson they have just read rather than in
 *  the lesson's title. The LAST block is taken: every question-type lesson
 *  in the library ends with the block that explains how to do it ("How to
 *  Approach It"), which is what a student stuck on a question needs.
 *
 *  Null on a server render, on a page with no lesson body, and before the
 *  ids are stamped, and every caller treats that as "no help controls"
 *  rather than as an error. */
export function currentLessonBlockContext(): LessonBlockContext | null {
  if (typeof document === 'undefined') return null;
  const article = document.querySelector<HTMLElement>('.lesson-body[data-lesson-blocks]');
  const body = article?.querySelector('[data-lesson-body]');
  if (!article || !body) return null;
  const slug = (body as HTMLElement).dataset.lessonBody;
  if (!slug) return null;
  const headings = headingsToStamp(body);
  const heading = headings[headings.length - 1];
  if (!heading || !heading.dataset.lessonBlock) return null;
  return {
    lessonKey: slug,
    lessonTitle: article.dataset.lessonTitle,
    blockId: heading.dataset.lessonBlock,
    blockHeading: heading.textContent ?? '',
    blockText: blockTextOf(heading),
  };
}

const KINDS: readonly LessonHelpKind[] = ['explain', 'example'];

const KIND_LABEL: Readonly<Record<LessonHelpKind, string>> = {
  hint: 'Give me a hint',
  explain: 'Explain this differently',
  example: 'Show me an example',
};

function buildControl(input: {
  lessonKey: string;
  lessonTitle?: string;
  blockId: string;
  heading: HTMLElement;
}): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = `${HELP_NODE_CLASS} help-controls`;

  const row = document.createElement('div');
  row.className = 'help-controls-row';
  const replies = document.createElement('div');
  replies.className = 'help-replies';
  replies.setAttribute('aria-live', 'polite');

  const buttons: HTMLButtonElement[] = [];
  const given: string[] = [];

  for (const kind of KINDS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'help-control';
    button.textContent = t(KIND_LABEL[kind]);
    button.addEventListener('click', () => {
      void ask(kind, button);
    });
    buttons.push(button);
    row.append(button);
  }

  async function ask(kind: LessonHelpKind, button: HTMLButtonElement): Promise<void> {
    buttons.forEach((entry) => {
      entry.disabled = true;
    });
    const label = button.textContent;
    button.textContent = t('Asking Mr EZ...');
    const context = askContext();
    let result: HelpResult;
    try {
      result = await requestLessonHelp({
        kind,
        lessonKey: input.lessonKey,
        blockId: input.blockId,
        lessonTitle: input.lessonTitle,
        blockHeading: input.heading.textContent ?? '',
        blockText: blockTextOf(input.heading),
        /* A lesson block is read, not answered, so there is no attempt and
           no item: an explanation here is about the teaching, and the
           Worker still refuses to hand over an answer that has not been
           tried. */
        attempted: true,
        previousHints: [...given],
        assistanceSoFar: 'none',
        versions: context.versions,
        sessionId: context.sessionId,
        locale: getLocale(),
      });
    } finally {
      buttons.forEach((entry) => {
        entry.disabled = false;
      });
      button.textContent = label;
    }
    given.push(result.text);
    replies.append(buildReply(result));
  }

  wrap.append(row, replies);
  return wrap;
}

function buildReply(result: HelpResult): HTMLElement {
  const reply = document.createElement('div');
  reply.className = `help-reply is-${result.source}`;
  const text = document.createElement('p');
  text.className = 'help-reply-text';
  text.textContent = result.text;
  reply.append(text);
  const note = HELP_SOURCE_NOTE[result.source];
  if (note) {
    const line = document.createElement('p');
    line.className = 'help-reply-note';
    line.textContent = result.unavailableReason ? `${t(note)} ${result.unavailableReason}` : t(note);
    reply.append(line);
  }
  return reply;
}
