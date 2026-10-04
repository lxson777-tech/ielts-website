/* Inline chart zoom (4 October 2026, Alex: "we need to add the option to
 * zoom in on the picture without having to open it when clicking on it").
 *
 * Two things are pinned here:
 *   1. The zoom arithmetic in src/lib/chart-zoom.ts: the scale ceiling that
 *      keeps a chart sharp, the clamping that never shows empty margin, the
 *      clicked point staying under the pointer, and the pan limits.
 *   2. The essay grader request is unchanged. The screens split a question's
 *      HTML around its chart only to DISPLAY it (src/lib/writing/
 *      prompt-charts.ts); the split is lossless, and every screen still hands
 *      the grader the prompt object itself, whose promptHtml carries the
 *      original <img> the Worker matches against its chart list.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CLICK_SCALE,
  IDENTITY,
  MAX_SCALE,
  clampView,
  clickScaleFor,
  followPointer,
  isZoomed,
  maxScaleFor,
  panBy,
  pinchView,
  stepZoom,
  toggleAt,
  wheelScale,
  zoomAt,
  zoomPercent,
  type ZoomView,
} from '../src/lib/chart-zoom.ts';
import { hasChart, splitPromptHtml, tagAttribute } from '../src/lib/writing/prompt-charts.ts';
import { IMPORTED_WRITING_PROMPTS } from '../src/data/writing-prompts-imported.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { imageSources } from '../workers/grade-essay/src/task1-visual.ts';

const FRAME = { w: 400, h: 300 };
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
const read = (rel: string) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

/** Where picture point q (unscaled) appears in the frame. */
const screenOf = (v: ZoomView, qx: number, qy: number) => ({ x: v.x + v.s * qx, y: v.y + v.s * qy });
/** Which picture point sits under frame point p. */
const pictureAt = (v: ZoomView, px: number, py: number) => ({ x: (px - v.x) / v.s, y: (py - v.y) / v.s });

function assertCoversFrame(v: ZoomView) {
  assert.ok(v.x <= 1e-9 && v.y <= 1e-9, `left/top edge inside the frame: ${JSON.stringify(v)}`);
  assert.ok(v.x + v.s * FRAME.w >= FRAME.w - 1e-9, `right edge inside the frame: ${JSON.stringify(v)}`);
  assert.ok(v.y + v.s * FRAME.h >= FRAME.h - 1e-9, `bottom edge inside the frame: ${JSON.stringify(v)}`);
}

/* ── 1. The arithmetic ──────────────────────────────────────────────── */

test('the ceiling is 1.5x the picture own pixels, never above 4x', () => {
  // A 518px chart drawn 330px wide (the trainer's height cap): 518/330*1.5.
  assert.ok(near(maxScaleFor(518, 330), (518 / 330) * 1.5));
  // A big source cannot go past 4x.
  assert.equal(maxScaleFor(4000, 300), MAX_SCALE);
  // Drawn at its own size: 1.5x, the smallest ceiling worth offering.
  assert.equal(maxScaleFor(500, 500), 1.5);
  // Not loaded yet: the click scale, so the first click still zooms.
  assert.equal(maxScaleFor(0, 330), CLICK_SCALE);
  assert.equal(maxScaleFor(500, 0), CLICK_SCALE);
  // A click zooms to 2.5x unless the ceiling is lower.
  assert.equal(clickScaleFor(4), 2.5);
  assert.equal(clickScaleFor(2.2), 2.2);
});

test('clamping keeps the scale in range and never shows empty margin', () => {
  assert.deepEqual(clampView({ s: 0.5, x: -40, y: 10 }, FRAME, 4), { s: 1, x: 0, y: 0 });
  assert.equal(clampView({ s: 9, x: 0, y: 0 }, FRAME, 4).s, 4);
  assert.equal(clampView({ s: 3, x: 0, y: 0 }, FRAME, 2.2).s, 2.2);
  // Pushed past the top-left: snaps to the edge.
  assert.deepEqual(clampView({ s: 2, x: 50, y: 30 }, FRAME, 4), { s: 2, x: 0, y: 0 });
  // Pushed past the bottom-right: snaps to w - s*w, h - s*h.
  assert.deepEqual(clampView({ s: 2, x: -9999, y: -9999 }, FRAME, 4), { s: 2, x: -400, y: -300 });
});

test('zooming at a point keeps that point of the chart exactly under the pointer', () => {
  const points = [
    [0, 0],
    [400, 300],
    [123, 77],
    [200, 150],
    [390, 12],
  ];
  for (const [px, py] of points) {
    for (const start of [IDENTITY, { s: 1.8, x: -100, y: -60 }]) {
      const before = pictureAt(start, px, py);
      const after = zoomAt(start, 2.5, px, py, FRAME, 4);
      assert.equal(after.s, 2.5);
      const p = screenOf(after, before.x, before.y);
      assert.ok(near(p.x, px, 1e-6) && near(p.y, py, 1e-6), `point (${px}, ${py}) moved to (${p.x}, ${p.y})`);
      assertCoversFrame(after);
    }
  }
});

test('a click zooms in centred on the clicked point, and a second click zooms back out', () => {
  const zoomed = toggleAt(IDENTITY, 300, 90, FRAME, 4);
  assert.equal(zoomed.s, 2.5);
  const under = pictureAt(zoomed, 300, 90);
  assert.ok(near(under.x, 300) && near(under.y, 90), 'the clicked figure stays under the pointer');
  assert.ok(isZoomed(zoomed));
  assert.deepEqual(toggleAt(zoomed, 10, 10, FRAME, 4), { s: 1, x: 0, y: 0 });
  // A chart whose ceiling is below 2.5x zooms to its ceiling.
  assert.equal(toggleAt(IDENTITY, 100, 100, FRAME, 1.9).s, 1.9);
});

test('pointer panning shows what is under the pointer and reaches every edge, never beyond', () => {
  const s = 2.5;
  // The corners of the frame show the corners of the chart.
  assert.deepEqual(followPointer(s, 0, 0, FRAME, 4), { s, x: -0, y: -0 });
  const br = followPointer(s, 400, 300, FRAME, 4);
  assert.ok(near(br.x, FRAME.w - s * FRAME.w) && near(br.y, FRAME.h - s * FRAME.h));
  // Outside the frame (pointer just leaving): still clamped.
  assertCoversFrame(followPointer(s, -50, 900, FRAME, 4));
  // The chart point under the pointer is the same share of the chart as the
  // pointer is of the frame, so a click followed by a move does not jump.
  for (const [px, py] of [
    [100, 200],
    [333, 12],
  ]) {
    const v = followPointer(s, px, py, FRAME, 4);
    const q = pictureAt(v, px, py);
    assert.ok(near(q.x, px) && near(q.y, py));
    const clicked = toggleAt(IDENTITY, px, py, FRAME, 4);
    assert.ok(near(clicked.x, v.x) && near(clicked.y, v.y), 'click and follow agree');
  }
});

test('panning by a drag or an arrow key stops at the chart edges', () => {
  const v = { s: 2, x: -100, y: -100 };
  assert.deepEqual(panBy(v, 30, -20, FRAME, 4), { s: 2, x: -70, y: -120 });
  assert.deepEqual(panBy(v, 5000, 5000, FRAME, 4), { s: 2, x: 0, y: 0 });
  assert.deepEqual(panBy(v, -5000, -5000, FRAME, 4), { s: 2, x: -400, y: -300 });
  // Unzoomed there is nothing to pan.
  assert.deepEqual(panBy(IDENTITY, 50, 50, FRAME, 4), { s: 1, x: 0, y: 0 });
});

test('a pinch scales with the finger distance, 1x to 4x, about the fingers midpoint', () => {
  const start = { view: IDENTITY, distance: 100, mx: 120, my: 80 };
  const doubled = pinchView(start, 200, 120, 80, FRAME, 4);
  assert.equal(doubled.s, 2);
  const q = pictureAt(doubled, 120, 80);
  assert.ok(near(q.x, 120) && near(q.y, 80), 'the pinched point stays under the fingers');
  assert.equal(pinchView(start, 1000, 120, 80, FRAME, 4).s, 4);
  assert.deepEqual(pinchView(start, 40, 120, 80, FRAME, 4), { s: 1, x: 0, y: 0 });
  // Moving both fingers while pinching also pans.
  const moved = pinchView(start, 200, 150, 100, FRAME, 4);
  const q2 = pictureAt(moved, 150, 100);
  assert.ok(near(q2.x, 120) && near(q2.y, 80));
  assertCoversFrame(moved);
});

test('the + and - steps zoom about the frame centre, and the wheel zooms the right way', () => {
  const inOnce = stepZoom(IDENTITY, 1, FRAME, 4);
  assert.equal(inOnce.s, 1.5);
  const c = pictureAt(inOnce, 200, 150);
  assert.ok(near(c.x, 200) && near(c.y, 150));
  assert.equal(stepZoom(stepZoom(inOnce, 1, FRAME, 4), 1, FRAME, 4).s, 3.375);
  assert.equal(stepZoom({ s: 3.5, x: 0, y: 0 }, 1, FRAME, 4).s, 4);
  assert.deepEqual(stepZoom(inOnce, -1, FRAME, 4), { s: 1, x: 0, y: 0 });
  assert.ok(wheelScale(2, -100) > 2, 'scrolling up zooms in');
  assert.ok(wheelScale(2, 100) < 2, 'scrolling down zooms out');
  assert.equal(zoomPercent(2.5), 250);
});

/* ── 2. The grader request is unchanged ─────────────────────────────── */

const ALL_PROMPTS = [...IMPORTED_WRITING_PROMPTS, ...WRITING_PROMPTS];

test('the display split is lossless for every writing question in the bank', () => {
  assert.ok(ALL_PROMPTS.length > 50);
  for (const p of ALL_PROMPTS) {
    const segments = splitPromptHtml(p.promptHtml);
    assert.equal(segments.map((s) => s.raw).join(''), p.promptHtml, `${p.id}: the split changed the question`);
    for (const s of segments) {
      if (s.kind === 'html') assert.ok(!/<img\b/i.test(s.raw), `${p.id}: an image was left in the wording`);
    }
  }
});

test('every Task 1 chart the grader sees is the chart the student can zoom, with its alt text', () => {
  const withCharts = IMPORTED_WRITING_PROMPTS.filter((p) => p.task === 'task1' && /<img\b/i.test(p.promptHtml));
  assert.ok(withCharts.length >= 25, `expected the imported Task 1 charts, found ${withCharts.length}`);
  for (const p of withCharts) {
    const charts = splitPromptHtml(p.promptHtml).filter((s) => s.kind === 'chart');
    // The Worker reads these same sources out of the same, untouched string.
    assert.deepEqual(
      charts.map((c) => (c.kind === 'chart' ? c.src : '')),
      imageSources(p.promptHtml),
      `${p.id}: the zoomable charts differ from what the grader matches`,
    );
    for (const c of charts) {
      if (c.kind !== 'chart') continue;
      assert.match(c.src, /\/pics\/writing\/imported\//);
      assert.ok(c.alt.length > 0, `${p.id}: alt text lost`);
      assert.equal(c.alt, tagAttribute(c.raw, 'alt'));
    }
    assert.ok(hasChart(p.promptHtml));
  }
  // A Task 2 question has no chart and renders as one piece of wording.
  const t2 = IMPORTED_WRITING_PROMPTS.find((p) => p.task === 'task2')!;
  assert.deepEqual(splitPromptHtml(t2.promptHtml), [{ kind: 'html', raw: t2.promptHtml }]);
});

test('the grader still receives the prompt object itself, with its original promptHtml', () => {
  // The request body: the prompt's own promptHtml, byte for byte.
  const grader = read('src/lib/writing/grader.ts');
  assert.match(grader, /promptHtml: input\.prompt\.promptHtml,/);
  // The trainer and Checker submit the prompt they were showing, as is.
  const tester = read('src/components/WritingTester.tsx');
  assert.match(tester, /const submitted = \{ prompt, essay, wordCount \};/);
  assert.match(tester, /gradeEssay\(\{ prompt: submitted\.prompt, essay: submitted\.essay \}, trialGrading\)/);
  // The placement test likewise.
  assert.match(read('src/components/placement/PlacementWriting.tsx'), /gradeEssay\(\{ prompt, essay: text \}\)/);
  // The split is display only: no screen builds a prompt from its segments,
  // and only the display component uses it.
  for (const rel of [
    'src/components/WritingTester.tsx',
    'src/components/MockExam.tsx',
    'src/components/placement/PlacementWriting.tsx',
    'src/components/learning/WritingFocusedTask.tsx',
    'src/lib/writing/grader.ts',
  ]) {
    assert.ok(!read(rel).includes('splitPromptHtml'), `${rel} must not split the question itself`);
  }
  const display = read('src/components/PromptWithCharts.tsx');
  assert.match(display, /splitPromptHtml\(html\)/);
  assert.ok(!/promptHtml\s*=/.test(display), 'the display component never writes a promptHtml');
});

test('the old click-to-open handler is gone and the larger view lives on behind Full size', () => {
  const tester = read('src/components/WritingTester.tsx');
  assert.ok(!tester.includes('handlePromptClick'), 'a plain click no longer opens the lightbox');
  assert.ok(!tester.includes('View larger: click the chart'), 'the old hint is replaced');
  const chart = read('src/components/ZoomableChart.tsx');
  assert.match(chart, /createPortal\(/, 'the larger view is portalled out of any transformed ancestor');
  assert.match(chart, /t\('Full size'\)/);
});
