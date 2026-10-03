/* The paid calibration runner's money guard (tools/grader-calibration.mjs):
   pricing of the three usage shapes, the budget stop before a call is sent,
   and the one-retry limit. No network: the "real" fetch is a stub. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error plain .mjs module without types
import { costOf, estimateCost, gradeEssays, makeBudgetFetch, makeChartFetch, wranglerVars } from '../tools/grader-calibration.mjs';
import { fileURLToPath } from 'node:url';

const RESPONSES = 'https://api.openai.com/v1/responses';

test('prices Responses, Chat Completions and transcription usage', () => {
  assert.equal(costOf('gpt-5.6-sol', { input_tokens: 1_000_000, output_tokens: 0 }), 2);
  assert.equal(costOf('gpt-5.6-sol-2026-09-01', { input_tokens: 0, output_tokens: 1_000_000 }), 12);
  // 1M audio tokens at $32 plus 1M text tokens at $4.
  assert.equal(costOf('gpt-audio-1.5', { prompt_tokens: 2_000_000, completion_tokens: 0, prompt_tokens_details: { audio_tokens: 1_000_000 } }), 36);
  assert.equal(costOf('gpt-4o-transcribe-diarize', { type: 'duration', seconds: 60 }), 0.006);
  assert.equal(costOf('gpt-5.6-sol', null), null);
});

test('estimates inline audio as audio, not as text', () => {
  const b64 = 'A'.repeat(40_000); // 30,000 bytes, 7.5 s at 32 kbps
  const withAudio = estimateCost('https://api.openai.com/v1/chat/completions', {
    body: JSON.stringify({ model: 'gpt-audio-1.5', messages: [{ content: [{ input_audio: { data: b64, format: 'mp3' } }] }] }),
  });
  // 75 audio tokens at $32/M is tiny; 40,000 characters as text would be ~$0.046.
  assert.ok(withAudio < 0.07, String(withAudio));
});

test('estimates an attached chart as image tokens, not as its base64 text', () => {
  const chart = readFileSync(new URL('../public/pics/writing/imported/wt-123-task1.png', import.meta.url)).toString('base64');
  const body = (withImage: boolean) =>
    JSON.stringify({
      model: 'gpt-5.6-sol',
      input: [{ role: 'user', content: [{ type: 'input_text', text: 'x' }, ...(withImage ? [{ type: 'input_image', image_url: `data:image/png;base64,${chart}`, detail: 'high' }] : [])] }],
    });
  const extra = estimateCost(RESPONSES, { body: body(true) }) - estimateCost(RESPONSES, { body: body(false) });
  // 3,000 image tokens at $2/M is $0.006 (the 183k base64 characters as text would be about $0.10).
  assert.ok(extra > 0.0059 && extra < 0.0065, String(extra));
});

test('chart fetches are answered from disk, never the network, and images per model call are counted', async () => {
  const seen: string[] = [];
  const next = async (input: unknown) => {
    seen.push(String(input));
    return new Response('{}', { status: 200 });
  };
  const context: Record<string, unknown> = {};
  const f = makeChartFetch(next, { context });
  const chart = await f('https://lxson777-tech.github.io/ielts-website/pics/writing/imported/wt-132-task1.webp');
  assert.equal(chart.status, 200);
  const bytes = new Uint8Array(await chart.arrayBuffer());
  assert.deepEqual(bytes, new Uint8Array(readFileSync(new URL('../public/pics/writing/imported/wt-132-task1.webp', import.meta.url))));
  assert.equal((await f('http://localhost:4321/ielts-website/pics/writing/imported/missing.png')).status, 404);
  await f(RESPONSES, { method: 'POST', body: JSON.stringify({ input: [{ content: [{ type: 'input_text' }, { type: 'input_image' }] }] }) });
  assert.deepEqual(seen, [RESPONSES]);
  assert.deepEqual(context.imagesSent, [1]);
});

function harness(budgetUsd: number, totalUsd = 0, status = 200) {
  const dir = mkdtempSync(join(tmpdir(), 'grader-cal-'));
  const ledgerPath = join(dir, 'ledger.json');
  const ledger = { budgetUsd, totalUsd, calls: [] as unknown[] };
  let sent = 0;
  const realFetch = async () => {
    sent++;
    return new Response(JSON.stringify({ model: 'gpt-5.6-sol', usage: { input_tokens: 10_000, output_tokens: 2_000 } }), { status });
  };
  const context: Record<string, unknown> = { label: 'test', attempts: {} };
  const f = makeBudgetFetch({ realFetch, ledger, ledgerPath, budgetUsd, context });
  return { f, ledger, ledgerPath, context, sent: () => sent };
}

test('records actual usage and the running total on disk', async () => {
  const h = harness(5);
  const resp = await h.f(RESPONSES, { method: 'POST', body: JSON.stringify({ model: 'gpt-5.6-sol', input: 'x' }) });
  assert.equal(resp.status, 200);
  assert.equal(h.sent(), 1);
  // 10k in at $2/M + 2k out at $12/M = $0.044
  assert.ok(Math.abs(h.ledger.totalUsd - 0.044) < 1e-9);
  const onDisk = JSON.parse(readFileSync(h.ledgerPath, 'utf8'));
  assert.equal(onDisk.calls.length, 1);
  assert.ok(!JSON.stringify(onDisk).includes('Bearer'));
});

test('refuses to send a call that would pass the budget', async () => {
  const h = harness(5, 4.95);
  const resp = await h.f(RESPONSES, { method: 'POST', body: JSON.stringify({ model: 'gpt-5.6-sol', input: 'x' }) });
  assert.equal(resp.status, 400);
  assert.equal(h.sent(), 0);
  assert.equal(h.context.budgetStop, true);
});

test('allows one retry per endpoint and no more', async () => {
  const h = harness(5, 0, 500);
  const call = () => h.f(RESPONSES, { method: 'POST', body: JSON.stringify({ model: 'gpt-5.6-sol', input: 'x' }) });
  await call();
  await call();
  const third = await call();
  assert.equal(h.sent(), 2);
  assert.equal(third.status, 400);
});

test('reads the deployed vars from a wrangler.jsonc with comments', () => {
  const vars = wranglerVars(new URL('../workers/grade-essay/wrangler.jsonc', import.meta.url));
  assert.equal(vars.OPENAI_MODEL, 'gpt-5.6-sol');
  assert.equal(vars.GRADING_SAMPLES, '3');
});

test('a Task 1 item reaches the (stubbed) model with its chart: a site chart, and an item\'s own chartFile', async () => {
  const criterion = { evidence: 'e', band: 6, comment: 'c', tip: 't' };
  const assessment = {
    criteria: { taskResponse: criterion, coherenceCohesion: criterion, lexicalResource: criterion, grammaticalRange: criterion },
    moments: [],
    strengths: [],
    improvements: [],
    actionPlan: [],
  };
  const sentImages: string[][] = [];
  const budgetFetchFor = (item: string, onReply?: (endpoint: string, data: unknown) => void) => {
    const context: Record<string, unknown> = { label: item, attempts: {} };
    const fetch = async (input: unknown, init?: RequestInit) => {
      assert.ok(String(input).startsWith(RESPONSES), `only the model is called, not ${String(input)}`);
      const body = JSON.parse(String(init?.body));
      sentImages.push(
        body.input[0].content
          .filter((c: { type: string }) => c.type === 'input_image')
          .map((c: { image_url: string }) => c.image_url.slice(0, 22)),
      );
      const data = { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(assessment) }] }] };
      onReply?.(RESPONSES, data);
      return new Response(JSON.stringify(data), { status: 200 });
    };
    return { context, fetch };
  };
  const essay =
    'The chart shows how the number of trips children made to school changed between the two years, with car trips ' +
    'rising sharply while walking fell to about half of its earlier level overall.';
  const items = [
    { id: 'site', task: 'task1', variant: 'chart', minWords: 150, officialBand: 6, essay, promptHtml: '<p>The chart below shows X.</p><img src="/ielts-website/pics/writing/imported/wt-124-task1.png">' },
    { id: 'own', task: 'task1', variant: 'chart', minWords: 150, officialBand: 4, essay, promptHtml: '<p>The chart below shows Y.</p>', chartFile: 'public/pics/writing/process-example-glass-recycling.png' },
  ];
  const env = { ALLOWED_ORIGINS: 'https://lxson777-tech.github.io,http://localhost:4321', OPENAI_API_KEY: 'sk-test', GRADING_SAMPLES: '1', ACCESS_MODE: 'open' };
  const workerPath = fileURLToPath(new URL('../workers/grade-essay/src/index.ts', import.meta.url));
  const results = await gradeEssays({ items, workerPath, env, budgetFetchFor });
  assert.deepEqual(results.map((r: { imagesSent: number[] }) => r.imagesSent), [[1], [1]]);
  assert.deepEqual(sentImages, [['data:image/png;base64,'], ['data:image/png;base64,']]);
});
