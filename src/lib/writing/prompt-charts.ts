/* Splitting a writing question's HTML around its chart images, for DISPLAY
   only.

   A Task 1 question is one HTML string (`promptHtml`): the wording, then an
   <img> of the chart. To let a student zoom into the chart in place, the
   screens render the wording as before and hand each <img> to
   ZoomableChart (src/components/ZoomableChart.tsx).

   What this must never do is change what the essay grader receives. The
   grader request is built from the prompt object itself
   (src/lib/writing/grader.ts sends `input.prompt.promptHtml`), and nothing
   here writes back to it. The split is also lossless: joining every
   segment's `raw` gives back the original string character for character,
   which tests/chart-zoom.test.ts checks for every question in the bank.

   The HTML is our own authored data (src/data/writing-prompts*.ts), never
   user input, the same trust the Html component already extends to it. */

export type PromptSegment =
  | { kind: 'html'; raw: string }
  | { kind: 'chart'; raw: string; src: string; alt: string };

const IMG_TAG = /<img\b[^>]*>/gi;

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** One attribute's value from a single tag, or '' when it is absent. */
export function tagAttribute(tag: string, name: string): string {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(pattern);
  if (!m) return '';
  return decodeEntities(m[1] ?? m[2] ?? m[3] ?? '');
}

/** The question HTML as alternating wording and chart segments. A question
    with no image comes back as one 'html' segment holding the whole string. */
export function splitPromptHtml(html: string): PromptSegment[] {
  const segments: PromptSegment[] = [];
  let last = 0;
  for (const m of html.matchAll(IMG_TAG)) {
    const at = m.index ?? 0;
    const tag = m[0];
    const src = tagAttribute(tag, 'src');
    if (!src) continue; // not a picture we can show; leave it in the wording
    if (at > last) segments.push({ kind: 'html', raw: html.slice(last, at) });
    segments.push({ kind: 'chart', raw: tag, src, alt: tagAttribute(tag, 'alt') });
    last = at + tag.length;
  }
  if (last < html.length || segments.length === 0) segments.push({ kind: 'html', raw: html.slice(last) });
  return mergeAdjacentHtml(segments);
}

/* An <img> skipped above (no src) leaves two wording segments side by side;
   they are one run of wording. */
function mergeAdjacentHtml(segments: PromptSegment[]): PromptSegment[] {
  const out: PromptSegment[] = [];
  for (const seg of segments) {
    const prev = out[out.length - 1];
    if (seg.kind === 'html' && prev?.kind === 'html') prev.raw += seg.raw;
    else out.push({ ...seg });
  }
  return out;
}

/** Whether a question shows at least one chart. */
export function hasChart(html: string): boolean {
  return splitPromptHtml(html).some((s) => s.kind === 'chart');
}
