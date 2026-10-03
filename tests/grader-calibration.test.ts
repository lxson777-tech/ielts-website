/* The paid calibration runner's money guard (tools/grader-calibration.mjs):
   pricing of the three usage shapes, the budget stop before a call is sent,
   and the one-retry limit. No network: the "real" fetch is a stub. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error plain .mjs module without types
import { costOf, estimateCost, makeBudgetFetch, wranglerVars } from '../tools/grader-calibration.mjs';

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
