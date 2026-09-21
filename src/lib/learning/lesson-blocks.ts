/* Cutting a lesson into teaching blocks, without touching a lesson file.
 *
 * WHY THIS EXISTS
 * The tutor is supposed to help with the exact paragraph the student is
 * reading, not with "the True / False / Not Given lesson". That needs a name
 * for each teaching point. Lead decision D2 settled how we get one: NOT by
 * hand editing anchor ids into 76 English bodies, which would desynchronise
 * every Russian translation (they are guarded by a hash of the English
 * source, see tools/lesson-ru-lib.mjs). Instead the identity is DERIVED by
 * this one pure function, from markup the bodies already have.
 *
 * THE RULE, AND WHY THIS ONE
 * A block starts at a heading (`<h2>` or `<h3>`) and runs to the next one.
 * Anything before the first heading joins the first block rather than
 * becoming a headless block of its own, so the block count is exactly the
 * heading count and a body with no headings is one block.
 *
 * Every one of the 76 English bodies and its Russian translation carry the
 * same number of `<h2>` and `<h3>` elements (they are translations of the
 * same structure, and the checker keeps them that way), so the same rule run
 * over either language produces the same blocks in the same order. That is
 * what lets the Russian text of a block be served under the ENGLISH block's
 * id, which is what the ids are made from.
 *
 * `<div class="section">` was the other candidate and is too coarse: 68 of
 * the 76 lessons are a single section, so it would make "the block" mean
 * "the whole lesson" and a tutoring turn would carry 20 KB of prose.
 *
 * AN ID IS A POSITION PLUS A CONTENT HASH
 * `b3-1a2b3c4d`: third block, and a short hash of its English plain text. The
 * position keeps ids readable and ordered; the hash means a rewritten block
 * is a NEW block rather than one that quietly inherits the old one's
 * references. The hash is always of the English, so the Russian body of the
 * same lesson yields the same ids by position.
 *
 * PURE, BECAUSE THREE CALLERS RUN IT
 * The lesson layout stamps these ids onto the rendered headings at build
 * time, the /data/lesson-blocks/<slug>.json endpoint publishes the text, and
 * the tests recompute both. No DOM, no fetch, no storage: a string in, plain
 * objects out.
 */

import { hashContent } from './evidence';

/** One teaching point inside a lesson body. */
export interface LessonBlock {
  /** `b<index>-<hash>`. Stable while the block's own text is unchanged. */
  id: string;
  /** Position in the body, from zero. Part of the id. */
  index: number;
  /** The heading this block starts with, as plain text. Empty only for a
      body with no headings at all, which is then a single block. */
  heading: string;
  /** Which heading element it was, so a caller can stamp the id onto the
      same element it came from. Null on a body with no headings. */
  headingTag: 'h2' | 'h3' | null;
  /** The whole block as plain text, tags stripped and entities decoded.
      Exam material (question wordings, worked examples, the exact English a
      student has to recognise) is kept verbatim; only the markup goes. */
  text: string;
  /** Characters of plain text. What the ceiling below is measured against. */
  chars: number;
  /** Where the block starts and ends in the SOURCE HTML, half open, so a
      build step can splice without parsing the body a second time. */
  start: number;
  end: number;
  /** Where this block's heading tag starts in the source HTML. Equal to
      `start` for every block after the first; for the first it points past
      whatever preamble the body opens with. Null when there is no heading. */
  headingStart: number | null;
}

/** The largest plain-text block we are willing to put in a tutoring turn.
 *
 *  A block is one teaching point and the reply is two or three sentences
 *  about it, so a block the size of a whole lesson would be both expensive
 *  and vague. Measured across all 76 lessons (433 blocks) on 22 September
 *  2026: the median block is a few hundred characters, six blocks are over
 *  2,500, and the widest is 5,025, the cue card bank in speaking-part2,
 *  which is a list of real exam prompts rather than prose. 6,000 characters
 *  is roughly 1,500 tokens, which is the same order as a whole Mr EZ prompt
 *  today and a sane ceiling for one turn.
 *
 *  The number earns its keep as a tripwire: a lesson body whose headings
 *  went missing would segment into one 20 KB block and fail the assertion in
 *  tests/lesson-blocks.test.ts instead of quietly becoming expensive.
 *  Provisional. */
export const LESSON_BLOCK_MAX_CHARS = 6000;

/** Length of the hash in a block id. Eight hex characters is 32 bits, which
    is plenty to notice a block being rewritten inside one lesson. The
    position in front of it is what keeps ids unique. */
const BLOCK_HASH_CHARS = 8;

/* ── Reading the HTML ────────────────────────────────────────────────────── */

/** A Windows checkout and a Linux one must produce the same ids, and an
    editor that saved a byte order mark must not rename every block. Same
    rule normaliseForHash applies in lesson-check.ts, repeated here so this
    file stays free of the lesson-check module. */
function normalise(html: string): string {
  return String(html).replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** The named entities that actually appear in the lesson bodies, plus the
    four every HTML file can carry. Anything else is left alone rather than
    guessed at: an unknown entity read literally is a small wart, and a wrong
    expansion would change what the student is told. */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '...',
  middot: '·',
  rarr: '→',
  larr: '←',
  times: '×',
  divide: '÷',
  eacute: 'é',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** Elements whose closing tag ends a line of reading. Without this a list of
    six traps collapses into one run-on sentence and the model is asked to
    teach from mush. */
const LINE_BREAKING = /^\/?(p|div|li|ul|ol|br|h[1-6]|tr|table|section|hr|blockquote|dd|dt|dl)\b/i;

/** Plain text of an HTML fragment. Comments go (the Russian bodies open with
    a source hash comment, which is bookkeeping and not teaching), tags go,
    entities are decoded, and the words between them are untouched. */
export function blockPlainText(html: string): string {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, ' ');
  const withoutScripts = withoutComments.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ');
  const separated = withoutScripts.replace(/<\s*(\/?[a-zA-Z][^\s>/]*)[^>]*>/g, (_whole, tag: string) =>
    LINE_BREAKING.test(tag) ? '\n' : ' ',
  );
  return decodeEntities(separated)
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── Segmenting ──────────────────────────────────────────────────────────── */

interface HeadingHit {
  tag: 'h2' | 'h3';
  start: number;
  text: string;
}

const HEADING_RE = /<(h2|h3)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;

function headings(html: string): HeadingHit[] {
  const out: HeadingHit[] = [];
  HEADING_RE.lastIndex = 0;
  let match = HEADING_RE.exec(html);
  while (match) {
    out.push({
      tag: match[1]!.toLowerCase() as 'h2' | 'h3',
      start: match.index,
      text: blockPlainText(match[2] ?? '').replace(/\n+/g, ' '),
    });
    match = HEADING_RE.exec(html);
  }
  return out;
}

/** Cut one lesson body into its teaching blocks.
 *
 *  Deterministic: the same string always yields the same blocks and the same
 *  ids. Never empty for a non-empty body.
 *
 *  `ids` is how a TRANSLATION is given the English body's ids. Pass the
 *  English block ids in and the returned blocks carry them by position,
 *  which is the whole point of hashing the English: one lesson, one set of
 *  block names, two languages. Leave it out for the English body itself. */
export function segmentLessonBody(html: string, ids?: readonly string[]): LessonBlock[] {
  const source = normalise(html);
  const hits = headings(source);
  const idFor = (index: number, text: string): string =>
    ids?.[index] ?? `b${index}-${hashContent(text).slice(0, BLOCK_HASH_CHARS)}`;

  if (hits.length === 0) {
    const text = blockPlainText(source);
    if (!text) return [];
    return [
      {
        id: idFor(0, text),
        index: 0,
        heading: '',
        headingTag: null,
        text,
        chars: text.length,
        start: 0,
        end: source.length,
        headingStart: null,
      },
    ];
  }

  return hits.map((hit, index) => {
    const start = index === 0 ? 0 : hit.start;
    const end = index + 1 < hits.length ? hits[index + 1]!.start : source.length;
    const text = blockPlainText(source.slice(start, end));
    return {
      id: idFor(index, text),
      index,
      heading: hit.text,
      headingTag: hit.tag,
      text,
      chars: text.length,
      start,
      end,
      headingStart: hit.start,
    };
  });
}

/** The translated text of each block, keyed by the ENGLISH block's id.
 *
 *  Both bodies are segmented by the same rule, so block n of one is block n
 *  of the other. A translation with a different number of blocks is a
 *  translation that has drifted from its source: the overlap is still served
 *  (a student reading Russian gets the blocks that do line up) and the rest
 *  is simply absent, because inventing an alignment would put the wrong
 *  paragraph in front of them. tests/lesson-blocks.test.ts asserts the
 *  counts match for every lesson, so drift is caught before it ships. */
export function alignTranslatedBlocks(
  english: readonly LessonBlock[],
  translated: readonly LessonBlock[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const shared = Math.min(english.length, translated.length);
  for (let index = 0; index < shared; index += 1) {
    const text = translated[index]!.text;
    if (text) out[english[index]!.id] = text;
  }
  return out;
}

/* ── What the endpoint publishes, and what reads it back ─────────────────── */

/** One lesson's blocks as `/data/lesson-blocks/<slug>.json` serves them.
 *
 *  Same shape and same reasoning as the published test JSON
 *  (src/pages/data/tests/[id].json.ts): a Cloudflare Worker cannot bundle
 *  1.6 MB of lesson bodies, so it fetches the one small file it needs and
 *  validates it before using a word of it. */
export interface PublishedLessonBlocks {
  slug: string;
  /** Bumped when this file's SHAPE changes, never when a lesson is edited
      (a lesson edit changes block ids, which is the real signal). */
  version: 1;
  blocks: readonly PublishedLessonBlock[];
}

export interface PublishedLessonBlock {
  id: string;
  index: number;
  heading: string;
  /** English, always. Exam material stays English in both languages. */
  text: string;
  chars: number;
  /** The Russian explanation of the same block, when the lesson has a
      translation. Absent, never empty, when it does not. */
  ru?: string;
  /** The Russian heading, on the same terms. */
  ruHeading?: string;
}

/** Build the published file for one lesson. `russianHtml` is optional: 76 of
    76 lessons have a translation today, and a lesson that loses one must
    still publish its English. */
export function publishLessonBlocks(
  slug: string,
  englishHtml: string,
  russianHtml?: string | null,
): PublishedLessonBlocks {
  const english = segmentLessonBody(englishHtml);
  const ids = english.map((block) => block.id);
  const translated = russianHtml ? segmentLessonBody(russianHtml, ids) : [];
  const ruText = alignTranslatedBlocks(english, translated);
  const ruHeadings: Record<string, string> = {};
  const shared = Math.min(english.length, translated.length);
  for (let index = 0; index < shared; index += 1) {
    const heading = translated[index]!.heading;
    if (heading) ruHeadings[english[index]!.id] = heading;
  }

  return {
    slug,
    version: 1,
    blocks: english.map((block) => ({
      id: block.id,
      index: block.index,
      heading: block.heading,
      text: block.text,
      chars: block.chars,
      ...(ruText[block.id] ? { ru: ruText[block.id] } : {}),
      ...(ruHeadings[block.id] ? { ruHeading: ruHeadings[block.id] } : {}),
    })),
  };
}

/** Is this really one of our published lesson-block files? The Worker asks
    before it grounds a word of teaching in it, exactly like isSiteTest in
    src/lib/tutor/test-items.ts: a redirect, a stale deploy or a
    misconfigured base path must refuse the turn rather than teach from the
    wrong lesson. */
export function isPublishedLessonBlocks(value: unknown): value is PublishedLessonBlocks {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.slug !== 'string' || record.version !== 1) return false;
  if (!Array.isArray(record.blocks) || record.blocks.length === 0) return false;
  return record.blocks.every((entry) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false;
    const block = entry as Record<string, unknown>;
    return (
      typeof block.id === 'string' &&
      block.id.length > 0 &&
      typeof block.index === 'number' &&
      typeof block.heading === 'string' &&
      typeof block.text === 'string' &&
      (block.ru === undefined || typeof block.ru === 'string') &&
      (block.ruHeading === undefined || typeof block.ruHeading === 'string')
    );
  });
}

/** A lesson slug we are willing to put in a URL path. Same conservative
    shape the tutor's test ids go through: letters, digits and hyphens only,
    so nothing a caller names can traverse or become an absolute URL. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isLessonSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_RE.test(value);
}

/** A block id we are willing to look up. The shape this file writes and
    nothing else, so a client cannot smuggle prose through the id field. */
const BLOCK_ID_RE = /^b\d{1,3}-[0-9a-f]{4,32}$/;

export function isLessonBlockId(value: unknown): value is string {
  return typeof value === 'string' && BLOCK_ID_RE.test(value);
}

/** The one block a request named, in the language the student reads. The
    English text is always returned beside it: exam wording, accepted answers
    and the phrases a student has to recognise stay English whatever language
    the explanation is in. */
export function readPublishedBlock(
  published: PublishedLessonBlocks,
  blockId: string,
): PublishedLessonBlock | null {
  return published.blocks.find((block) => block.id === blockId) ?? null;
}
