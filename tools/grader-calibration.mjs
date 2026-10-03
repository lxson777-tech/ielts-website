/**
 * Grader calibration runner: grades official, examiner-marked material with
 * the REAL essay and speaking Worker handlers, locally in Node, against the
 * REAL OpenAI API, under a hard spending cap. Nothing is deployed and
 * wrangler is never involved.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/grader-calibration.mjs \
 *     --paper essay --input .tmp/grader-check/essays.json --out .tmp/grader-check/essay-new.json
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/grader-calibration.mjs \
 *     --paper speaking-anchors --out .tmp/grader-check/speaking-new.json
 *
 * Options:
 *   --paper essay | speaking-anchors
 *   --input <json>     essays: [{ id, task, variant, minWords, promptHtml, essay, officialBand }]
 *   --worker <path>    the Worker module to run (default: the current one in
 *                      workers/). Point it at an older copy (for example
 *                      `git show <rev>:workers/grade-essay/src/index.ts` saved
 *                      under .tmp/) to compare before and after.
 *   --out <json>       where the results go (keep it under .tmp/)
 *   --ledger <json>    running spend log shared across runs
 *                      (default .tmp/grader-check/ledger.json)
 *   --budget <usd>     hard cap for the ledger's total (default 5)
 *   --env-file <path>  where OPENAI_API_KEY is read from when it is not in the
 *                      environment (default: this checkout's .env, then the
 *                      main checkout's .env)
 *
 * Worker settings come from that Worker's wrangler.jsonc vars (model, effort,
 * GRADING_SAMPLES, anchors), exactly as deployed, with ACCESS_MODE forced to
 * "open" so no database is involved.
 *
 * Money rules, enforced in the fetch handed to the Worker:
 *   - before every OpenAI call, an upper-bound estimate of its cost is added
 *     to the ledger total plus everything still in flight; if that would pass
 *     the budget the call is not sent (the Worker sees a failed call);
 *   - after every call the usage the API returns is priced and appended to the
 *     ledger on disk, so the total survives between runs;
 *   - a call to the same endpoint is attempted at most twice per grading (one
 *     retry), however many retries the Worker itself would make.
 * The key is read at run time, sent only in the Authorization header the
 * Worker builds, and never printed or written anywhere.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ── prices, US dollars per million tokens ──
   gpt-5.6-sol: workers/grade-essay/README.md ("about $2 per million input
   tokens and $12 per million output tokens"). Audio input at $32 per million:
   workers/grade-speaking/README.md. The text rates for the audio and
   transcription models are not written down in this repo, so they are set
   on the high side on purpose. Cached input is charged at the full rate. */
export const PRICES = {
  'gpt-5.6-sol': { text_in: 2, out: 12 },
  'gpt-audio-1.5': { text_in: 4, audio_in: 32, out: 16 },
  'gpt-4o-transcribe-diarize': { text_in: 2.5, audio_in: 6, out: 10, per_minute: 0.006 },
};
const FALLBACK_PRICE = { text_in: 5, audio_in: 40, out: 20, per_minute: 0.01 };

function priceFor(model) {
  const m = String(model ?? '');
  const key = Object.keys(PRICES).find((k) => m === k || m.startsWith(`${k}-`));
  return key ? PRICES[key] : FALLBACK_PRICE;
}

/** Prices one API reply's `usage` object (Responses, Chat Completions or
    Transcriptions shape). Returns null when there is no usage to price. */
export function costOf(model, usage) {
  if (!usage || typeof usage !== 'object') return null;
  const p = priceFor(model);
  const M = 1_000_000;
  // Transcription billed by duration.
  if (usage.type === 'duration' && typeof usage.seconds === 'number') {
    return (usage.seconds / 60) * (p.per_minute ?? FALLBACK_PRICE.per_minute);
  }
  // Responses API and Transcriptions token usage.
  if (typeof usage.input_tokens === 'number') {
    const det = usage.input_token_details ?? usage.input_tokens_details ?? {};
    const audio = typeof det.audio_tokens === 'number' ? det.audio_tokens : 0;
    const text = usage.input_tokens - audio;
    const out = typeof usage.output_tokens === 'number' ? usage.output_tokens : 0;
    return (text * p.text_in + audio * (p.audio_in ?? FALLBACK_PRICE.audio_in) + out * p.out) / M;
  }
  // Chat Completions.
  if (typeof usage.prompt_tokens === 'number') {
    const det = usage.prompt_tokens_details ?? {};
    const audio = typeof det.audio_tokens === 'number' ? det.audio_tokens : 0;
    const text = usage.prompt_tokens - audio;
    const out = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0;
    return (text * p.text_in + audio * (p.audio_in ?? FALLBACK_PRICE.audio_in) + out * p.out) / M;
  }
  return null;
}

/** Upper-bound estimate for a call before it is sent, from the request body
    alone: text at ~3.5 characters a token, inline base64 MP3 at 32 kbps
    (4,000 bytes a second, 10 audio tokens a second), and generous output
    allowances (reasoning tokens included). */
export function estimateCost(url, init) {
  const body = init?.body;
  if (typeof body === 'string') {
    let parsed = null;
    try { parsed = JSON.parse(body); } catch { /* not JSON */ }
    const model = parsed?.model;
    const p = priceFor(model);
    // Pull base64 audio out so it is priced as audio, not as text.
    let audioSeconds = 0;
    const textOnly = body.replace(/"data":"([A-Za-z0-9+/=]{200,})"/g, (_m, b64) => {
      audioSeconds += (b64.length * 0.75) / 4000;
      return '""';
    });
    const textTokens = textOnly.length / 3.5;
    const outTokens = url.includes('/chat/completions') ? 4000 : 12000;
    return (textTokens * p.text_in + audioSeconds * 10 * (p.audio_in ?? FALLBACK_PRICE.audio_in) + outTokens * p.out) / 1_000_000;
  }
  // Multipart transcription upload: price the file size as audio.
  if (body && typeof body.get === 'function') {
    const file = body.get('file');
    const bytes = file && typeof file.size === 'number' ? file.size : 2_000_000;
    const seconds = bytes / 4000;
    return (seconds / 60) * 0.006 * 3 + (seconds * 10 * 6 + 4000 * 10) / 1_000_000;
  }
  return 0.25;
}

/* ── ledger ── */

export function loadLedger(path) {
  if (!existsSync(path)) return { budgetUsd: null, totalUsd: 0, calls: [] };
  return JSON.parse(readFileSync(path, 'utf8'));
}
function saveLedger(path, ledger) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(ledger, null, 1));
}

export class BudgetStop extends Error {}

/** The fetch handed to the Worker. `context.label` names the item being
    graded; `context.attempts` counts attempts per endpoint for this item. */
export function makeBudgetFetch({ realFetch, ledger, ledgerPath, budgetUsd, context, onReply }) {
  let inFlight = 0;
  return async (input, init) => {
    const url = String(input);
    if (!url.startsWith('https://api.openai.com/')) {
      throw new Error(`calibration runner refuses non-OpenAI call: ${url.slice(0, 80)}`);
    }
    const endpoint = url.replace(/\?.*$/, '');
    const attempts = (context.attempts[endpoint] ?? 0) + 1;
    if (attempts > 2 * (context.callsPerEndpoint?.[endpoint] ?? 1)) {
      context.refused = `retry limit on ${endpoint}`;
      return new Response(JSON.stringify({ error: { message: 'calibration runner: retry limit reached' } }), { status: 400 });
    }
    const estimate = estimateCost(url, init);
    if (ledger.totalUsd + inFlight + estimate > budgetUsd) {
      context.refused = `budget: total ${ledger.totalUsd.toFixed(4)} + in flight ${inFlight.toFixed(4)} + estimate ${estimate.toFixed(4)} > ${budgetUsd}`;
      context.budgetStop = true;
      return new Response(JSON.stringify({ error: { message: 'calibration runner: budget stop' } }), { status: 400 });
    }
    context.attempts[endpoint] = attempts;
    inFlight += estimate;
    const started = Date.now();
    let resp;
    try {
      resp = await realFetch(input, init);
    } catch (err) {
      inFlight -= estimate;
      ledger.calls.push({ at: new Date().toISOString(), item: context.label, endpoint, status: 0, estimateUsd: estimate, costUsd: null, note: 'network error' });
      saveLedger(ledgerPath, ledger);
      throw err;
    }
    let data = null;
    try { data = await resp.clone().json(); } catch { /* not JSON */ }
    const model = data?.model ?? (() => { try { return JSON.parse(init.body).model; } catch { return init?.body?.get?.('model') ?? null; } })();
    const cost = costOf(model, data?.usage);
    // A failed call with no usage is recorded at its estimate, to stay safe.
    const charged = cost ?? (resp.ok ? estimate : 0);
    inFlight -= estimate;
    ledger.totalUsd += charged;
    ledger.calls.push({
      at: new Date().toISOString(),
      item: context.label,
      endpoint,
      model,
      status: resp.status,
      ms: Date.now() - started,
      usage: data?.usage ?? null,
      estimateUsd: Number(estimate.toFixed(5)),
      costUsd: Number(charged.toFixed(5)),
      priced: cost !== null,
      runningTotalUsd: Number(ledger.totalUsd.toFixed(5)),
    });
    saveLedger(ledgerPath, ledger);
    if (!resp.ok) {
      const msg = data?.error?.message ? String(data.error.message).slice(0, 200) : '';
      console.log(`  ${context.label}: ${endpoint.split('/v1/')[1]} HTTP ${resp.status} ${msg}`);
    }
    if (onReply && resp.ok && data) onReply(endpoint, data);
    console.log(`  ${context.label}: ${endpoint.split('/v1/')[1]} ${model ?? ''} $${charged.toFixed(4)} (running $${ledger.totalUsd.toFixed(4)})`);
    return resp;
  };
}

/* ── key and settings ── */

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

/** The main checkout's folder, when this is a git worktree. */
function mainCheckout() {
  const dotGit = resolve(REPO, '.git');
  try {
    const txt = readFileSync(dotGit, 'utf8');
    const m = txt.match(/gitdir:\s*(.+)\s*$/m);
    if (m) return resolve(m[1].trim(), '..', '..', '..');
  } catch { /* .git is a folder: this is the main checkout */ }
  return REPO;
}

/** OPENAI_API_KEY from the environment, else from a .env file. Never logged. */
export function loadKey(envFile) {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const candidates = envFile ? [envFile] : [resolve(REPO, '.env'), resolve(mainCheckout(), '.env')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const key = parseDotEnv(readFileSync(file, 'utf8')).OPENAI_API_KEY;
    if (key) return key;
  }
  throw new Error('OPENAI_API_KEY not found in the environment or a .env file');
}

/** A wrangler.jsonc's vars, with comments stripped. */
export function wranglerVars(path) {
  const raw = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
  return JSON.parse(raw).vars ?? {};
}

/* ── grading ── */

const ESSAY_KEYS = ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRange'];
const SPEAKING_KEYS = ['fluencyCoherence', 'lexicalResource', 'grammaticalRange', 'pronunciation'];
const overall = (bands) => Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2;

function responsesText(data) {
  for (const item of data?.output ?? []) {
    if (item?.type !== 'message') continue;
    for (const c of item.content ?? []) if (c?.type === 'output_text') return c.text;
  }
  return null;
}

async function gradeEssays({ items, workerPath, env, budgetFetchFor }) {
  const mod = await import(pathToFileURL(workerPath).href);
  let analyzeEssay = null;
  try {
    ({ analyzeEssay } = await import(pathToFileURL(resolve(REPO, 'src/lib/writing/mechanics.ts')).href));
  } catch (err) {
    console.log(`  (mechanics signals unavailable: ${err.message})`);
  }
  const results = [];
  for (const item of items) {
    const runs = [];
    const { fetch: f, context } = budgetFetchFor(item.id, (endpoint, data) => {
      const txt = responsesText(data);
      try {
        const j = JSON.parse(txt);
        runs.push(Object.fromEntries(ESSAY_KEYS.map((k) => [k, j.criteria?.[k]?.band])));
      } catch { /* unusable run, the Worker drops it too */ }
    });
    const samples = Number(env.GRADING_SAMPLES ?? 3);
    context.callsPerEndpoint = { 'https://api.openai.com/v1/responses': samples };
    const handler = mod.createHandler({ fetch: f });
    const prompt = { id: item.id, task: item.task, variant: item.variant, title: item.id, promptHtml: item.promptHtml, minWords: item.minWords };
    let mechanics;
    try { mechanics = analyzeEssay ? analyzeEssay({ prompt, essay: item.essay }) : undefined; } catch { mechanics = undefined; }
    const req = new Request('http://localhost/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4321' },
      body: JSON.stringify({ prompt: { task: item.task, variant: item.variant, promptHtml: item.promptHtml, minWords: item.minWords }, essay: item.essay, mechanics }),
    });
    console.log(`grading ${item.id} (official ${item.officialBand})`);
    const resp = await handler.fetch(req, env);
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
      results.push({ id: item.id, officialBand: item.officialBand, error: body?.error ?? `HTTP ${resp.status}`, refused: context.refused ?? null, runs });
      if (context.budgetStop) { console.log('BUDGET STOP'); break; }
      continue;
    }
    const criteria = Object.fromEntries(ESSAY_KEYS.map((k) => [k, body.criteria[k].band]));
    results.push({
      id: item.id,
      task: item.task,
      officialBand: item.officialBand,
      band: overall(Object.values(criteria)),
      criteria,
      runs: runs.map((r) => ({ ...r, overall: overall(Object.values(r)) })),
      comments: Object.fromEntries(ESSAY_KEYS.map((k) => [k, body.criteria[k].comment])),
    });
  }
  return results;
}

async function gradeSpeakingAnchors({ workerPath, env, budgetFetchFor, only }) {
  const mod = await import(pathToFileURL(workerPath).href);
  const { SPEAKING_ANCHORS } = await import(pathToFileURL(resolve(REPO, 'workers/grade-speaking/src/anchors.ts')).href);
  const results = [];
  for (const anchor of SPEAKING_ANCHORS) {
    if (only && !only.includes(anchor.band)) continue;
    const id = `anchor-${anchor.band}`;
    const { fetch: f, context } = budgetFetchFor(id);
    const handler = mod.createHandler({ fetch: f, sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 15000))) });
    const durationMs = Math.round(((anchor.audioBase64.length * 0.75) / 4000) * 1000);
    const req = new Request('http://localhost/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:4321' },
      body: JSON.stringify({
        kind: 'part1',
        part1: {
          topic: 'Official sample excerpt',
          answers: [{ question: 'Official IELTS sample, examiner question not included', audioBase64: anchor.audioBase64, mimeType: 'audio/mpeg', durationMs }],
        },
        mechanics: { totalDurationMs: durationMs },
      }),
    });
    console.log(`grading ${id}`);
    const resp = await handler.fetch(req, env);
    const body = await resp.json().catch(() => null);
    if (!resp.ok) {
      results.push({ id, officialBand: anchor.band, error: body?.error ?? `HTTP ${resp.status}`, refused: context.refused ?? null });
      if (context.budgetStop) { console.log('BUDGET STOP'); break; }
      continue;
    }
    const criteria = Object.fromEntries(SPEAKING_KEYS.map((k) => [k, body.criteria[k].band]));
    results.push({
      id,
      officialBand: anchor.band,
      band: overall(Object.values(criteria)),
      criteria,
      comments: Object.fromEntries(SPEAKING_KEYS.map((k) => [k, body.criteria[k].comment])),
    });
  }
  return results;
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  }
  return out;
}

async function main() {
  const a = args(process.argv.slice(2));
  const paper = a.paper;
  if (paper !== 'essay' && paper !== 'speaking-anchors') throw new Error('--paper essay | speaking-anchors');
  const workerDir = paper === 'essay' ? 'workers/grade-essay' : 'workers/grade-speaking';
  const workerPath = resolve(REPO, a.worker ?? `${workerDir}/src/index.ts`);
  const ledgerPath = resolve(REPO, a.ledger ?? '.tmp/grader-check/ledger.json');
  const budgetUsd = Number(a.budget ?? 5);
  const ledger = loadLedger(ledgerPath);
  ledger.budgetUsd = budgetUsd;
  const env = { ...wranglerVars(resolve(REPO, workerDir, 'wrangler.jsonc')), ACCESS_MODE: 'open', OPENAI_API_KEY: loadKey(a['env-file']) };
  const label = a.label ?? (a.worker ? 'old' : 'new');
  console.log(`${paper}, ${label} grader (${workerPath.replace(REPO, '.')}), model settings from ${workerDir}/wrangler.jsonc; ledger $${ledger.totalUsd.toFixed(4)} of $${budgetUsd}`);
  const budgetFetchFor = (item, onReply) => {
    const context = { label: `${label}/${item}`, attempts: {} };
    return { context, fetch: makeBudgetFetch({ realFetch: (i, init) => fetch(i, init), ledger, ledgerPath, budgetUsd, context, onReply }) };
  };
  const results =
    paper === 'essay'
      ? await gradeEssays({ items: JSON.parse(readFileSync(resolve(REPO, a.input), 'utf8')), workerPath, env, budgetFetchFor })
      : await gradeSpeakingAnchors({ workerPath, env, budgetFetchFor, only: a.only ? String(a.only).split(',').map(Number) : null });
  const out = resolve(REPO, a.out ?? `.tmp/grader-check/${paper}-${label}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ paper, grader: label, worker: workerPath.replace(REPO, '.'), settings: { ...env, OPENAI_API_KEY: undefined }, results }, null, 1));
  for (const r of results) console.log(`${r.id}: official ${r.officialBand}, graded ${r.band ?? r.error}${r.criteria ? ` ${JSON.stringify(r.criteria)}` : ''}`);
  console.log(`ledger total $${ledger.totalUsd.toFixed(4)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
