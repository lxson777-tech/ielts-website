/* The essay grader sees a Task 1 question's chart (workers/grade-essay/src/
   task1-visual.ts), and only the site's own charts. No network: the model
   and the site are stubs, and the chart bytes are the real files in
   public/pics/writing/imported. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHandler, systemInstruction } from '../workers/grade-essay/src/index.ts';
import { TASK1_CHARTS } from '../workers/grade-essay/src/task1-charts.ts';
import { chartAddress, imageSources, MAX_VISUALS } from '../workers/grade-essay/src/task1-visual.ts';
import { IMPORTED_WRITING_PROMPTS } from '../src/data/writing-prompts-imported.ts';
// @ts-expect-error plain .mjs module without types
import { chartHashes } from '../tools/build-task1-chart-manifest.mjs';

const PROD = 'https://lxson777-tech.github.io';
const SITE = `${PROD}/ielts-website/`;
const OPENAI = 'https://api.openai.com/v1/responses';
const CHART = 'wt-132-task1.webp';
const chartBytes = (file: string) => readFileSync(new URL(`../public/pics/writing/imported/${file}`, import.meta.url));
const b64 = (file: string) => chartBytes(file).toString('base64');

const ESSAY =
  'The chart shows how many students used the university library in two years, and the table gives the reasons. ' +
  'Overall, use of the library rose, while borrowing books fell and studying in the building became the main reason.';

function env(overrides: Record<string, unknown> = {}) {
  return { ALLOWED_ORIGINS: `${PROD},http://localhost:4321`, OPENAI_API_KEY: 'sk-test-dummy', SITE_URL: SITE, GRADING_SAMPLES: '3', ...overrides } as never;
}

function assessment() {
  const c = { evidence: 'e', band: 6, comment: 'Comment.', tip: 'Tip.' };
  return { criteria: { taskResponse: c, coherenceCohesion: c, lexicalResource: c, grammaticalRange: c }, moments: [], strengths: [], improvements: [], actionPlan: [] };
}
const openaiReply = () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment()) }] }] });
const geminiReply = () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(assessment()) }] } }] });

/** A stub network: the model answers, and the site serves its real charts
    (or whatever `site` says). Records every address asked for. */
function network(site: (url: string) => Response | 'error' | null = (url) => {
  const m = url.match(/\/pics\/writing\/imported\/([A-Za-z0-9._-]+)$/);
  return m ? new Response(chartBytes(m[1]!), { status: 200, headers: { 'Content-Type': 'image/webp' } }) : null;
}) {
  const calls: { url: string; body?: Record<string, unknown> }[] = [];
  const fn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined });
    if (url.startsWith(OPENAI)) return new Response(JSON.stringify(openaiReply()), { status: 200 });
    if (url.includes('generativelanguage.googleapis.com')) return new Response(JSON.stringify(geminiReply()), { status: 200 });
    const r = site(url);
    if (r === 'error') throw new Error('network down');
    return r ?? new Response('not found', { status: 404 });
  }) as typeof fetch;
  return {
    fn,
    calls,
    model: () => calls.filter((c) => c.url.startsWith(OPENAI) || c.url.includes('generativelanguage')),
    other: () => calls.filter((c) => !c.url.startsWith(OPENAI) && !c.url.includes('generativelanguage')),
  };
}

async function grade(promptHtml: string, opts: { task?: 'task1' | 'task2'; origin?: string; envOverrides?: Record<string, unknown>; net?: ReturnType<typeof network> } = {}) {
  const net = opts.net ?? network();
  const res = await createHandler({ fetch: net.fn }).fetch(
    new Request('https://grader.example/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: opts.origin ?? PROD },
      body: JSON.stringify({ prompt: { task: opts.task ?? 'task1', variant: 'combination', promptHtml, minWords: 150 }, essay: ESSAY }),
    }),
    env(opts.envOverrides),
  );
  return { res, net };
}

type Content = { type: string; text?: string; image_url?: string; detail?: string }[];
const contentOf = (body: Record<string, unknown> | undefined) => ((body?.input as { content: Content }[])[0]!.content);
const images = (body: Record<string, unknown> | undefined) => contentOf(body).filter((c) => c.type === 'input_image');

const QUESTION = '<p>The chart and table below give information about library users at a university.</p><p>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>';
const withImg = (src: string) => `${QUESTION}<img src="${src}" alt="Chart" loading="lazy">`;

// ---- the list of charts the grader trusts ----

test('the chart list matches public/pics/writing/imported file for file (re-run tools/build-task1-chart-manifest.mjs)', () => {
  assert.deepEqual({ ...TASK1_CHARTS }, chartHashes());
});

test('every Task 1 question on the site names only charts the grader trusts, at most two each', () => {
  const task1 = IMPORTED_WRITING_PROMPTS.filter((p) => p.task === 'task1');
  assert.ok(task1.length >= 30);
  for (const p of task1) {
    const srcs = imageSources(p.promptHtml);
    assert.ok(srcs.length >= 1 && srcs.length <= MAX_VISUALS, `${p.id}: ${srcs.length} images`);
    for (const src of srcs) assert.ok(chartAddress(src, env() as never, PROD), `${p.id}: ${src} is not a trusted chart address`);
  }
});

// ---- a site-hosted Task 1 chart reaches the model ----

test('a site-hosted Task 1 chart is fetched once from the site and attached to every sample as image input', async () => {
  const { res, net } = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`));
  assert.equal(res.status, 200);
  assert.deepEqual(net.other().map((c) => c.url), [`${SITE}pics/writing/imported/${CHART}`]);
  const model = net.model();
  assert.equal(model.length, 3);
  for (const call of model) {
    const imgs = images(call.body);
    assert.equal(imgs.length, 1);
    assert.equal(imgs[0]!.image_url, `data:image/webp;base64,${b64(CHART)}`);
    assert.equal(imgs[0]!.detail, 'high');
    // The image comes after the text, and both sides are told it is there.
    assert.equal(contentOf(call.body)[0]!.type, 'input_text');
    assert.match(contentOf(call.body)[0]!.text!, /VISUAL: the question's image is attached/);
    assert.match(String(call.body!.instructions), /is attached to the message as an image/);
    assert.equal(call.body!.model, 'gpt-5.6-terra'); // the Worker's own default; wrangler.jsonc sets gpt-5.6-sol
  }
});

test('the address without the base path (plain Node withBase) resolves to the same chart', async () => {
  const { net } = await grade(withImg(`/pics/writing/imported/${CHART}`));
  assert.deepEqual(net.other().map((c) => c.url), [`${SITE}pics/writing/imported/${CHART}`]);
  assert.equal(images(net.model()[0]!.body).length, 1);
});

test('the two-map question attaches both images in order, and a third image is never attached', async () => {
  const two = `${QUESTION}<img src="/ielts-website/pics/writing/imported/wt-126-task1.webp"><img src='/ielts-website/pics/writing/imported/wt-126-task1-2.webp'><img src="/ielts-website/pics/writing/imported/${CHART}">`;
  const { net } = await grade(two);
  const imgs = images(net.model()[0]!.body);
  assert.deepEqual(imgs.map((i) => i.image_url), [`data:image/webp;base64,${b64('wt-126-task1.webp')}`, `data:image/webp;base64,${b64('wt-126-task1-2.webp')}`]);
  assert.equal(net.other().length, 2);
  assert.match(String(net.model()[0]!.body!.instructions), /attached to the message as 2 images, in the order the question shows them/);
});

test('a commercial build\'s inline chart is accepted when its bytes are a site chart, with nothing fetched, even though the question is long', async () => {
  const html = withImg(`data:image/png;base64,${b64('wt-123-task1.png')}`);
  assert.ok(html.length > 20000);
  const { res, net } = await grade(html);
  assert.equal(res.status, 200);
  assert.equal(net.other().length, 0);
  assert.deepEqual(images(net.model()[0]!.body).map((i) => i.image_url), [`data:image/png;base64,${b64('wt-123-task1.png')}`]);
});

test('local development: a localhost origin ALLOWED_ORIGINS lists is fetched from only when the request comes from it', async () => {
  const dev = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`), { origin: 'http://localhost:4321' });
  assert.deepEqual(dev.net.other().map((c) => c.url), [`http://localhost:4321/ielts-website/pics/writing/imported/${CHART}`]);
  // An unlisted localhost origin resolves against the real site instead.
  const other = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`), { origin: 'http://localhost:9999' });
  assert.deepEqual(other.net.other().map((c) => c.url), [`${SITE}pics/writing/imported/${CHART}`]);
  // An absolute localhost address from a production page is not fetched.
  const forged = await grade(withImg(`http://localhost:4321/ielts-website/pics/writing/imported/${CHART}`), { origin: PROD });
  assert.equal(forged.net.other().length, 0);
  assert.equal(images(forged.net.model()[0]!.body).length, 0);
});

test('Gemini rollback attaches the same chart as inline data', async () => {
  const { net } = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`), { envOverrides: { GRADER_PROVIDER: 'gemini', GEMINI_API_KEY: 'gk', GEMINI_MODEL: 'gemini-2.5-flash' } });
  const parts = (net.model()[0]!.body!.contents as { parts: Record<string, unknown>[] }[])[0]!.parts;
  assert.equal(parts.length, 2);
  assert.deepEqual(parts[1], { inline_data: { mime_type: 'image/webp', data: b64(CHART) } });
});

// ---- anything else is ignored, and grading runs on the text as before ----

async function textOnlyBaseline() {
  const { net } = await grade(QUESTION);
  return net.model()[0]!.body;
}

test('a foreign or untrusted image is never fetched or attached, and the request is exactly the text-only one', async () => {
  const baseline = await textOnlyBaseline();
  assert.equal(images(baseline).length, 0);
  assert.equal(contentOf(baseline).length, 1);
  const untrusted = [
    `https://evil.example/ielts-website/pics/writing/imported/${CHART}`, // another site, a real file name
    `//evil.example/pics/writing/imported/${CHART}`, // protocol-relative
    `${SITE}pics/writing/imported/not-a-chart.png`, // our site, unknown file
    `${SITE}pics/writing/start-task.png`, // our site, outside the chart folder
    `${SITE}pics/writing/imported/../start-task.png`,
    `${SITE}pics/writing/imported/${CHART}?x=1`,
    `/ielts-website/pics/writing/imported/%2e%2e%2fsecret`,
    'file:///etc/passwd',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // a real PNG, not ours
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
  ];
  for (const src of untrusted) {
    const { res, net } = await grade(withImg(src));
    assert.equal(res.status, 200, src);
    assert.deepEqual(net.other().map((c) => c.url).filter((u) => !u.startsWith(SITE)), [], `${src} fetched elsewhere`);
    assert.equal(net.other().length, 0, `${src} fetched`);
    assert.deepEqual(net.model()[0]!.body, baseline, `${src} changed the request`);
  }
});

test('a site address whose bytes are not that chart (changed, or redirected) is dropped after the fetch', async () => {
  const baseline = await textOnlyBaseline();
  const cases: ((url: string) => Response | 'error')[] = [
    () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    () => new Response(chartBytes('wt-131-task1.webp'), { status: 200 }), // another of our charts under this name
    () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/x.png' } }),
    () => new Response('gone', { status: 404 }),
    () => 'error',
  ];
  for (const site of cases) {
    const { res, net } = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`), { net: network(site) });
    assert.equal(res.status, 200);
    assert.equal(net.other().length, 1);
    assert.deepEqual(net.model()[0]!.body, baseline);
  }
});

test('a Task 1 question with no image is graded exactly as before: no fetch, no image, no visual instructions', async () => {
  const { res, net } = await grade(QUESTION);
  assert.equal(res.status, 200);
  assert.equal(net.other().length, 0);
  const body = net.model()[0]!.body!;
  assert.equal(body.instructions, systemInstruction('task1', 'combination'));
  assert.doesNotMatch(String(body.instructions), /attached to the message/);
  assert.doesNotMatch(contentOf(body)[0]!.text!, /VISUAL:/);
});

test('Task 2 is unchanged: even an <img> in the question is not fetched, and the request is text only', async () => {
  const { res, net } = await grade(withImg(`/ielts-website/pics/writing/imported/${CHART}`), { task: 'task2' });
  assert.equal(res.status, 200);
  assert.equal(net.other().length, 0);
  const body = net.model()[0]!.body!;
  assert.equal(body.instructions, systemInstruction('task2', 'combination'));
  assert.equal(contentOf(body).length, 1);
  assert.equal(contentOf(body)[0]!.type, 'input_text');
  assert.doesNotMatch(contentOf(body)[0]!.text!, /VISUAL:/);
});

test('a question whose text alone is over 20,000 characters is still refused', async () => {
  const { res, net } = await grade(`<p>${'x'.repeat(20001)}</p>`);
  assert.equal(res.status, 413);
  assert.equal(net.calls.length, 0);
});
