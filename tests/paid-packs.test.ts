/* Paid content in the gated build (docs/paid-access/CONTRACT.md, builder A3).
 *
 * What is proved, with the REAL build step, the REAL content gate handler
 * and the REAL trial and paid-access migrations (PGlite):
 *   - tools/build-gated-content.mjs writes one pack per swapped module
 *     holding the real module's data, plus the full learning index, the
 *     Russian the trim leaves out, the vocabulary deck, the placement
 *     material and one view per focused exercise;
 *   - each stand-in's fill puts that data in place with the real module's
 *     shape, and its lookups then answer as the real module's do; a
 *     malformed pack changes nothing;
 *   - the gate hands those packs to a running paid grant only;
 *   - the browser's loader never asks for a pack unless paid access is
 *     running;
 *   - the leak audit fails a build that carries a pack or an inline chart.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildGatedContent, MODULE_PACKS, EXTRA_PACKS } from '../tools/build-gated-content.mjs';
import { createHandler as createGate } from '../workers/content-gate/src/index.ts';
import { createTrialDb } from '../tools/trial-db.mjs';
import { parseTrialStatus } from '../src/lib/trial/status.ts';
import type { TrialView } from '../src/lib/trial/client.ts';

import * as realModels from '../src/data/model-answers.ts';
import * as realImported from '../src/data/writing-prompts-imported.ts';
import * as realStructures from '../src/data/writing-structures.ts';
import * as realPlans from '../src/data/writing-plans.ts';
import * as realGuides from '../src/data/band-guides.ts';
import * as realSpeaking from '../src/data/speaking-prompts.ts';
import * as realCueCards from '../src/data/cue-cards.ts';
import * as realSpeakingGuides from '../src/data/speaking-structure-guides.ts';
import * as realFocused from '../src/data/focused-exercises.ts';
import { PLACEMENT } from '../src/data/placement.ts';

import * as lightModels from '../src/lib/trial/light/model-answers.ts';
import * as lightImported from '../src/lib/trial/light/writing-prompts-imported.ts';
import * as lightStructures from '../src/lib/trial/light/writing-structures.ts';
import * as lightPlans from '../src/lib/trial/light/writing-plans.ts';
import * as lightGuides from '../src/lib/trial/light/band-guides.ts';
import * as lightSpeaking from '../src/lib/trial/light/speaking-prompts.ts';
import * as lightCueCards from '../src/lib/trial/light/cue-cards.ts';
import * as lightSpeakingGuides from '../src/lib/trial/light/speaking-structure-guides.ts';
import * as lightFocused from '../src/lib/trial/light/focused-exercises.ts';
import * as lightParts from '../src/lib/trial/light/dict-part-empty.ts';
import { loadPacks, fetchPack, resetPacksForTest, setPackDepsForTest } from '../src/lib/trial/packs.ts';

const REPO = resolve(import.meta.dirname, '..');
const OUT = mkdtempSync(join(tmpdir(), 'gated-packs-'));
const built = await buildGatedContent(OUT);
const pack = (name: string) => JSON.parse(readFileSync(join(OUT, 'packs', `${name}.json`), 'utf8'));
/** As JSON carries it: what a pack can hold at all. */
const plain = (value: unknown) => JSON.parse(JSON.stringify(value));

test('the build writes every pack, and the manifest lists them', () => {
  assert.ok(built.keys > 0);
  const keys = new Set(JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')).keys as string[]);
  const expected = [
    ...MODULE_PACKS,
    ...EXTRA_PACKS,
    ...realFocused.ALL_FOCUSED_EXERCISES.map((e) => `focused-${e.id}`),
    ...realFocused.SPOKEN_FOCUSED_TASKS.map((t) => `speaking-focus-${t.id}`),
  ];
  for (const name of expected) assert.ok(keys.has(`packs/${name}.json`), name);
  // One pack per module the gated build swaps for a stand-in (astro.config.mjs).
  const config = readFileSync(join(REPO, 'astro.config.mjs'), 'utf8');
  const swapped = [...config.matchAll(/\['data\/([a-z-]+)\.ts', light\('\.\/src\/lib\/trial\/light\//g)].map((m) => m[1]);
  assert.ok(swapped.length >= 9, 'the swap list was found');
  for (const module of swapped) assert.ok(MODULE_PACKS.includes(module!), `no pack for swapped module ${module}`);
});

test('each module pack holds the real module data', () => {
  assert.deepEqual(pack('model-answers').MODEL_ANSWERS, plain(realModels.MODEL_ANSWERS));
  assert.deepEqual(pack('writing-structures'), plain({ WRITING_STRUCTURES: realStructures.WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE: realStructures.PROMPT_VARIANT_STRUCTURE }));
  assert.deepEqual(pack('writing-plans').WRITING_PLANS, plain(realPlans.WRITING_PLANS));
  assert.deepEqual(pack('band-guides'), plain({ WRITING_BAND_GUIDES: realGuides.WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES: realGuides.SPEAKING_BAND_GUIDES }));
  assert.deepEqual(pack('speaking-prompts'), plain({ SPEAKING_PART1_TOPICS: realSpeaking.SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS: realSpeaking.SPEAKING_CUE_CARDS }));
  assert.deepEqual(pack('cue-cards'), plain({ CUE_CARD_FAMILIES: realCueCards.CUE_CARD_FAMILIES, CUE_CARDS: realCueCards.CUE_CARDS }));
  assert.deepEqual(pack('speaking-structure-guides').SPEAKING_STRUCTURE_GUIDES, plain(realSpeakingGuides.SPEAKING_STRUCTURE_GUIDES));
  assert.deepEqual(pack('focused-exercises').SPOKEN_FOCUSED_TASKS, plain(realFocused.SPOKEN_FOCUSED_TASKS));
  assert.deepEqual(pack('focused-exercises').FOCUSED_EXERCISES, plain(realFocused.FOCUSED_EXERCISES));

  // Writing questions: every one, with each Task 1 chart carried inline,
  // because a gated build does not publish the chart files.
  const prompts = pack('writing-prompts-imported').IMPORTED_WRITING_PROMPTS as { id: string; promptHtml: string }[];
  assert.equal(prompts.length, realImported.IMPORTED_WRITING_PROMPTS.length);
  for (const [i, real] of realImported.IMPORTED_WRITING_PROMPTS.entries()) {
    const packed = prompts[i]!;
    assert.equal(packed.id, real.id);
    assert.ok(!packed.promptHtml.includes('/pics/writing/imported/'), `${real.id} still points at an unpublished chart`);
    const inlined = real.promptHtml.includes('/pics/writing/imported/');
    if (inlined) assert.match(packed.promptHtml, /src="data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]{200}/, real.id);
    else assert.equal(packed.promptHtml, real.promptHtml, real.id);
  }
});

test('the extra packs: full index, the Russian the trim removed, vocabulary, placement, focused views', () => {
  const index = JSON.parse(readFileSync(join(REPO, 'src/data/generated/learning-index.json'), 'utf8'));
  assert.deepEqual(pack('learning-index'), index);
  assert.ok(index.focusedExercises.some((e: { objective?: string }) => e.objective), 'the full index carries objectives');

  const ru = pack('ru-dictionary');
  assert.ok(Object.keys(ru.strings).length > 50 && Object.keys(ru.parts).length > 100 && Object.keys(ru.learning).length > 20);
  // Russian, apart from the example sentences that stay English by design.
  const values = [...Object.values(ru.strings), ...Object.values(ru.learning)] as string[];
  assert.ok(values.filter((v) => /[А-Яа-яЁё]/.test(v)).length > values.length * 0.8);

  const vocab = pack('vocabulary');
  assert.ok(vocab.cards.length > 500, 'the lesson deck, not the 146-word sampler');
  assert.equal(vocab.topics.length, 36);

  const placement = pack('placement');
  assert.equal(placement.listening.id, PLACEMENT.listening.drillId);
  assert.equal(placement.listening.durationMinutes, PLACEMENT.listening.minutes);
  assert.equal(placement.reading.id, PLACEMENT.reading.drillId);
  assert.equal(placement.writing.id, PLACEMENT.writing.promptId);
  assert.equal(placement.speaking.id, PLACEMENT.speaking.topicId);
  assert.ok(placement.speaking.questions.length > 0);

  const item = pack(`focused-${realFocused.FOCUSED_EXERCISES[0]!.id}`);
  assert.equal(item.item.exerciseId, realFocused.FOCUSED_EXERCISES[0]!.id);
  assert.ok(item.item.items.length > 0 && item.written === null);
  const written = pack(`focused-${realFocused.WRITTEN_FOCUSED_TASKS[0]!.id}`);
  assert.ok(written.written.promptHtml.length > 50 && written.item === null);
  const spoken = pack(`speaking-focus-${realFocused.SPOKEN_FOCUSED_TASKS[0]!.id}`);
  assert.ok(spoken.questionText.length > 5);
});

test('each stand-in, filled from its pack, has the real module shape and answers its lookups the same way', () => {
  lightModels.fillModelAnswers(pack('model-answers'));
  assert.deepEqual(plain(lightModels.MODEL_ANSWERS), plain(realModels.MODEL_ANSWERS));
  for (const id of ['pte-wt-121-task2', realModels.MODEL_ANSWERS[0]!.promptId]) {
    assert.deepEqual(plain(lightModels.getModelAnswers(id)), plain(realModels.getModelAnswers(id)));
    assert.deepEqual(lightModels.getModelBands(id), realModels.getModelBands(id));
  }

  // The questions are updated where they stand: a copy of the list made
  // before the fill (src/data/writing-prompts.ts) sees them too.
  const copy = [...lightImported.IMPORTED_WRITING_PROMPTS];
  assert.equal(copy[0]!.promptHtml, '');
  lightImported.fillImportedWritingPrompts(pack('writing-prompts-imported'));
  assert.equal(lightImported.IMPORTED_WRITING_PROMPTS.length, realImported.IMPORTED_WRITING_PROMPTS.length);
  assert.ok(copy.every((p) => p.promptHtml.length > 50), 'the earlier copy sees the questions');
  for (const [i, real] of realImported.IMPORTED_WRITING_PROMPTS.entries()) {
    const filled = lightImported.IMPORTED_WRITING_PROMPTS[i]!;
    assert.deepEqual([filled.id, filled.task, filled.variant, filled.title, filled.minWords], [real.id, real.task, real.variant, real.title, real.minWords]);
  }

  const structures = lightStructures.WRITING_STRUCTURES;
  lightStructures.fillWritingStructures(pack('writing-structures'));
  assert.equal(lightStructures.WRITING_STRUCTURES, structures, 'the same object');
  assert.deepEqual(plain(lightStructures.WRITING_STRUCTURES), plain(realStructures.WRITING_STRUCTURES));
  assert.deepEqual(lightStructures.PROMPT_VARIANT_STRUCTURE, realStructures.PROMPT_VARIANT_STRUCTURE);

  lightPlans.fillWritingPlans(pack('writing-plans'));
  const planId = Object.keys(realPlans.WRITING_PLANS)[0]!;
  assert.deepEqual(plain(lightPlans.getWritingPlan(planId)), plain(realPlans.getWritingPlan(planId)));
  assert.equal(Object.keys(lightPlans.WRITING_PLANS).length, Object.keys(realPlans.WRITING_PLANS).length);

  const ladder = lightGuides.WRITING_BAND_GUIDES.taskResponse;
  assert.equal(lightGuides.guideFor(ladder, 6), undefined, 'nothing before the fill');
  lightGuides.fillBandGuides(pack('band-guides'));
  assert.equal(lightGuides.WRITING_BAND_GUIDES.taskResponse, ladder, 'the same array');
  assert.deepEqual(plain(lightGuides.SPEAKING_BAND_GUIDES), plain(realGuides.SPEAKING_BAND_GUIDES));
  for (const band of [3, 5.5, 6, 7, 9]) {
    assert.deepEqual(
      plain(lightGuides.guideFor(lightGuides.WRITING_BAND_GUIDES.lexicalResource, band)),
      plain(realGuides.guideFor(realGuides.WRITING_BAND_GUIDES.lexicalResource, band)),
    );
  }

  lightSpeaking.fillSpeakingPrompts(pack('speaking-prompts'));
  assert.deepEqual(plain(lightSpeaking.SPEAKING_PART1_TOPICS), plain(realSpeaking.SPEAKING_PART1_TOPICS));
  assert.deepEqual(plain(lightSpeaking.SPEAKING_CUE_CARDS), plain(realSpeaking.SPEAKING_CUE_CARDS));

  lightCueCards.fillCueCards(pack('cue-cards'));
  assert.deepEqual(plain(lightCueCards.CUE_CARDS), plain(realCueCards.CUE_CARDS));
  assert.deepEqual(plain(lightCueCards.CUE_CARD_FAMILIES), plain(realCueCards.CUE_CARD_FAMILIES));

  const are = lightSpeakingGuides.SPEAKING_STRUCTURE_GUIDES.ARE;
  lightSpeakingGuides.fillSpeakingStructureGuides(pack('speaking-structure-guides'));
  assert.equal(lightSpeakingGuides.SPEAKING_STRUCTURE_GUIDES.ARE, are, 'the same object');
  assert.deepEqual(plain(lightSpeakingGuides.SPEAKING_STRUCTURE_GUIDES), plain(realSpeakingGuides.SPEAKING_STRUCTURE_GUIDES));

  lightFocused.fillFocusedExercises(pack('focused-exercises'));
  assert.deepEqual(plain(lightFocused.ALL_FOCUSED_EXERCISES), plain(realFocused.ALL_FOCUSED_EXERCISES));
  assert.deepEqual(lightFocused.RESERVED_CHECK_PAPER_IDS, realFocused.RESERVED_CHECK_PAPER_IDS);
  assert.deepEqual(lightFocused.RESERVED_CHECK_PROMPT_IDS, realFocused.RESERVED_CHECK_PROMPT_IDS);
  const some = realFocused.ALL_FOCUSED_EXERCISES[3]!;
  assert.deepEqual(plain(lightFocused.findFocusedExercise(some.id)), plain(some));
  assert.deepEqual(plain(lightFocused.focusedExercisesFor(some.subskill)), plain(realFocused.focusedExercisesFor(some.subskill)));
  const spoken = realFocused.SPOKEN_FOCUSED_TASKS[0]!;
  assert.deepEqual(plain(lightFocused.findSpokenFocusedTask(spoken.id)), plain(spoken));

  lightParts.fillDictionaryParts(pack('ru-dictionary').parts);
  assert.ok(Object.keys(lightParts.strings).length > 100);
});

test('a malformed pack is refused whole and changes nothing', () => {
  const before = plain(lightCueCards.CUE_CARDS);
  assert.throws(() => lightCueCards.fillCueCards({ CUE_CARDS: [] }));
  assert.throws(() => lightCueCards.fillCueCards({ CUE_CARD_FAMILIES: [], CUE_CARDS: 'nope' }));
  assert.throws(() => lightModels.fillModelAnswers([]));
  assert.deepEqual(plain(lightCueCards.CUE_CARDS), before);
});

/* ── The gate, serving the packs the build wrote ─────────────────────── */

const ORIGIN = 'https://lxson777-tech.github.io';
const SUPABASE_URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-dummy';
const PAID = 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa';
const TRIAL = 'bbbbbbbb-7777-4777-8777-bbbbbbbbbbbb';
const TOKENS: Record<string, string> = { 'token-paid': PAID, 'token-trial': TRIAL };

test('the gate hands the built packs to a running paid grant only', async () => {
  const db = await createTrialDb();
  await db.addUser(PAID, 'packs-paid@example.test');
  await db.addUser(TRIAL, 'packs-trial@example.test');
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    if (url === `${SUPABASE_URL}/auth/v1/user`) {
      const id = TOKENS[(headers.Authorization ?? '').replace('Bearer ', '')];
      return id ? new Response(JSON.stringify({ id })) : new Response('{}', { status: 401 });
    }
    const fn = url.slice(`${SUPABASE_URL}/rest/v1/rpc/`.length);
    return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), { role: headers.apikey === SERVICE_KEY ? 'service_role' : 'anon' })));
  }) as typeof fetch;
  const store = {
    get: async (key: string) => {
      const path = join(OUT, key);
      if (!existsSync(path)) return null;
      const text = readFileSync(path, 'utf8');
      return { size: text.length, text: async () => text, arrayBuffer: async () => new TextEncoder().encode(text).buffer };
    },
  };
  const gate = createGate({ fetch: fetchFn, store });
  const env = { ALLOWED_ORIGINS: ORIGIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } as never;
  const get = async (path: string, token?: string) => {
    const headers: Record<string, string> = { Origin: ORIGIN };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await gate.fetch(new Request(`https://gate.test${path}`, { headers }), env);
    return { status: r.status, text: await r.text() };
  };

  await db.rpc('trial_start', {}, { userId: TRIAL });
  const created = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: PAID })) as { orderId: string; amount: number; currency: string };
  await db.rpc(
    'access_order_paid',
    { p_order: created.orderId, p_provider: 'simulated', p_ref: `sim_${created.orderId.replace(/-/g, '')}`, p_amount: created.amount, p_currency: created.currency },
    { role: 'service_role' },
  );

  for (const name of ['model-answers', 'cue-cards', 'placement', `focused-${realFocused.FOCUSED_EXERCISES[0]!.id}`]) {
    assert.equal((await get(`/pack/${name}`)).status, 401, `signed out ${name}`);
    assert.equal((await get(`/pack/${name}`, 'token-trial')).status, 403, `trial ${name}`);
    const opened = await get(`/pack/${name}`, 'token-paid');
    assert.equal(opened.status, 200, `paid ${name}`);
    assert.deepEqual(JSON.parse(opened.text), pack(name));
  }
  await db.expirePaid(PAID);
  assert.equal((await get('/pack/model-answers', 'token-paid')).status, 403, 'ended paid access');
  await db.close();
});

/* ── The browser's loader ────────────────────────────────────────────── */

function viewOf(phase: TrialView['phase'], raw: Record<string, unknown> | null, userId = 'u-1'): TrialView {
  return { phase, userId: phase === 'signed-out' ? null : userId, status: raw ? parseTrialStatus(raw) : null, offsetMs: 0, failure: null };
}
const NOW = Date.parse('2026-09-29T12:00:00Z');
const base = { serverNow: '2026-09-29T12:00:00Z', questionnaire: null, limits: {}, sections: {} };
const TRIAL_ONLY = { ...base, state: 'active', startedAt: '2026-09-29T00:00:00Z', endsAt: '2026-10-02T00:00:00Z', paid: null };
const ENDED_PAID = { ...base, state: 'ended', startedAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-04T00:00:00Z', paid: { planId: 'month-1', startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-09-01T00:00:00Z' } };
const RUNNING_PAID = { ...base, state: 'none', paid: { planId: 'month-1', startsAt: '2026-09-20T00:00:00Z', endsAt: '2026-10-20T00:00:00Z' } };

test('the loader never asks for a pack without running paid access, and fills it when it has', async () => {
  const asked: string[] = [];
  const get = async (path: string) => {
    asked.push(path);
    const name = path.replace(/^pack\//, '');
    return { ok: true as const, text: readFileSync(join(OUT, 'packs', `${name}.json`), 'utf8') };
  };
  for (const view of [
    viewOf('signed-out', null),
    viewOf('checking', null),
    viewOf('error', null),
    viewOf('ready', TRIAL_ONLY),
    viewOf('ready', ENDED_PAID),
  ]) {
    resetPacksForTest();
    setPackDepsForTest({ gated: true, view: () => view, now: () => NOW, get });
    assert.deepEqual(await loadPacks(['model-answers', 'cue-cards']), { ok: false, reason: 'not-paid' });
    assert.deepEqual(await fetchPack('placement'), { ok: false, reason: 'not-paid' });
  }
  // Paid access, but not a gated build (the open site): never asks either.
  resetPacksForTest();
  setPackDepsForTest({ gated: false, view: () => viewOf('ready', RUNNING_PAID), now: () => NOW, get });
  assert.equal((await loadPacks(['model-answers'])).ok, false);
  assert.deepEqual(asked, [], 'no pack was requested for a non-paid account');

  // Running paid access in the gated build: asked once, filled, then cached.
  resetPacksForTest();
  setPackDepsForTest({ gated: true, view: () => viewOf('ready', RUNNING_PAID), now: () => NOW, get });
  assert.deepEqual(await loadPacks(['model-answers', 'learning-index']), { ok: true, value: undefined });
  assert.deepEqual(await loadPacks(['model-answers']), { ok: true, value: undefined });
  assert.deepEqual(asked.sort(), ['pack/learning-index', 'pack/model-answers']);
  assert.ok(lightModels.MODEL_ANSWERS.length > 0);
  const view = await fetchPack(`speaking-focus-${realFocused.SPOKEN_FOCUSED_TASKS[0]!.id}`);
  assert.equal(view.ok, true);

  // A refusal is reported and not remembered, so Try again asks again.
  resetPacksForTest();
  let refusals = 0;
  setPackDepsForTest({
    gated: true,
    view: () => viewOf('ready', RUNNING_PAID),
    now: () => NOW,
    get: async () => {
      refusals += 1;
      return { ok: false as const, status: 0, code: 'offline' };
    },
  });
  assert.deepEqual(await fetchPack('cue-cards'), { ok: false, reason: 'offline' });
  await fetchPack('cue-cards');
  assert.equal(refusals, 2);
  setPackDepsForTest(null);
  resetPacksForTest();
});

/* ── The leak audit refuses a build that carries paid material ───────── */

test('the leak audit fails a build carrying a pack or an inline Task 1 chart', () => {
  const run = (dir: string) =>
    spawnSync(process.execPath, ['--import', './tests/ts-extension-loader.mjs', 'tools/trial-content-audit.mjs', dir, '--json'], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  const clean = mkdtempSync(join(tmpdir(), 'audit-clean-'));
  writeFileSync(join(clean, 'index.html'), '<p>Nothing locked here.</p>');
  assert.equal(run(clean).status, 0);

  const withPack = mkdtempSync(join(tmpdir(), 'audit-pack-'));
  mkdirSync(join(withPack, 'packs'));
  writeFileSync(join(withPack, 'packs', 'empty.json'), '{}');
  const packRun = run(withPack);
  assert.equal(packRun.status, 1);
  assert.ok(JSON.parse(packRun.stdout).found.some((f: { items: string[] }) => f.items.includes('paid pack or private store')));

  const withChart = mkdtempSync(join(tmpdir(), 'audit-chart-'));
  const chart = readdirSync(join(REPO, 'public/pics/writing/imported')).find((f) => f.endsWith('.png'))!;
  const encoded = readFileSync(join(REPO, 'public/pics/writing/imported', chart)).toString('base64');
  writeFileSync(join(withChart, 'app.js'), `const x = "data:image/png;base64,${encoded}";`);
  const chartRun = run(withChart);
  assert.equal(chartRun.status, 1);
  assert.ok(JSON.parse(chartRun.stdout).found.some((f: { items: string[] }) => f.items.includes(`chart:${chart}`)));
});
