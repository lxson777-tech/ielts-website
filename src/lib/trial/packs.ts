/* Paid material in the gated build: fetched through the content gate for a
   PAYING account, then put where the page's code already looks for it.

   BROWSER ONLY, and only in a gated build (PUBLIC_ACCESS_MODE=trial). There
   the public site carries empty stand-ins for the study material the trial
   does not include (src/lib/trial/light/), a trimmed learning index and
   trimmed Russian dictionaries. A paid account is entitled to all of it, on
   any device, so this module asks the gate for it as packs (GET /pack/<name>,
   written by tools/build-gated-content.mjs) with the student's sign-in, and:

     - a module pack is handed to its stand-in's fill function, which puts the
       real data inside the objects the stand-in already exported;
     - the learning index pack restores what the trim took out, in place;
     - the Russian pack is merged into the loaded dictionaries, now and
       whenever the student switches to Russian later;
     - a view pack (one focused exercise, the placement material) is simply
       returned to the page that asked.

   Three rules carry the weight:

   - NEVER FETCHED WITHOUT PAID ACCESS. Every entry point first checks the
     server's latest answer for the signed-in account (hasPaidAccess). A
     signed-out, trial or ended account never sends a single pack request.
     The gate refuses them anyway (trial_can_open answers not-included); this
     is so the browser never even asks.
   - PAID MATERIAL NEVER OUTLIVES THE ACCOUNT IN THIS TAB. The site moves
     between pages without reloading, so filled modules would otherwise stay
     in memory. Once anything is filled, a change of account, a sign-out, or
     paid access ending reloads the tab, which starts again from the empty
     stand-ins.
   - ONE REQUEST PER PACK PER SESSION. Each pack is fetched once for the
     account and kept in memory (never on the device's storage); a failure
     is not kept, so Try again asks again. */

import { fetchGated, type GatedResult } from './content';
import { onTrialChange, serverNow, trialView, type TrialView } from './client';
import { hasPaidAccess } from './status';
import { ACCESS_MODE } from './mode';
import { getLocale, onLocaleChange, notifyLocaleListeners } from '../i18n/locale';
import { loadDictionary } from '../i18n/dict/index';
/* The learning index as a gated build's browser imports it (the trimmed
   copy: astro.config.mjs), which applyLearningIndex restores in place. */
import trimmedIndex from '../../data/generated/learning-index.json' with { type: 'json' };
import { fillModelAnswers } from './light/model-answers';
import { fillImportedWritingPrompts } from './light/writing-prompts-imported';
import { fillWritingStructures } from './light/writing-structures';
import { fillWritingPlans } from './light/writing-plans';
import { fillBandGuides } from './light/band-guides';
import { fillSpeakingPrompts } from './light/speaking-prompts';
import { fillCueCards } from './light/cue-cards';
import { fillSpeakingStructureGuides } from './light/speaking-structure-guides';
import { fillFocusedExercises } from './light/focused-exercises';
import { fillDictionaryParts } from './light/dict-part-empty';

/** Packs that fill a module (or the index, or the dictionaries) in place. */
export type ModulePack =
  | 'model-answers'
  | 'writing-prompts-imported'
  | 'writing-structures'
  | 'writing-plans'
  | 'band-guides'
  | 'speaking-prompts'
  | 'cue-cards'
  | 'speaking-structure-guides'
  | 'focused-exercises'
  | 'learning-index'
  | 'ru-dictionary'
  | 'vocabulary';

export type PackFailure = 'not-paid' | 'signed-out' | 'offline' | 'unavailable';

export type PackOutcome<T = void> = { ok: true; value: T } | { ok: false; reason: PackFailure };

/** What this module talks to. Real in the browser; a test hands its own
    (setPackDepsForTest), because Node has no gated build, no account and no
    gate. */
interface PackDeps {
  gated: boolean;
  view: () => TrialView;
  now: () => number;
  get: (path: string) => Promise<GatedResult>;
}
const REAL_DEPS: PackDeps = { gated: ACCESS_MODE === 'trial', view: trialView, now: serverNow, get: fetchGated };
let deps: PackDeps = REAL_DEPS;

/** Is the signed-in account's paid access running, by the server's latest
    answer? False while that answer is not in yet, and always false outside
    a gated build. */
export function paidNow(view: TrialView = deps.view(), now: number = deps.now()): boolean {
  return deps.gated && view.phase === 'ready' && view.status !== null && hasPaidAccess(view.status, now);
}

/* ── Fetching, once per account ──────────────────────────────────────── */

let cacheOwner: string | null = null;
const cache = new Map<string, Promise<PackOutcome<unknown>>>();
/** The account whose paid material is in this tab's memory, if any. */
let filledFor: string | null = null;
const applied = new Set<ModulePack>();
let watching = false;

function failureFor(code: string, status: number): PackFailure {
  if (code === 'offline') return 'offline';
  if (code === 'sign-in-required' || status === 401) return 'signed-out';
  if (status === 403) return 'not-paid';
  return 'unavailable';
}

/** One pack's data, for the paid account signed in now. Never throws; never
    asks the gate unless paid access is running. */
export function fetchPack(name: string): Promise<PackOutcome<unknown>> {
  const view = deps.view();
  if (!paidNow(view)) return Promise.resolve({ ok: false, reason: 'not-paid' });
  if (cacheOwner !== view.userId) {
    cache.clear();
    cacheOwner = view.userId;
  }
  const cached = cache.get(name);
  if (cached) return cached;
  const request = deps.get(`pack/${name}`).then((result): PackOutcome<unknown> => {
    if (!result.ok) return { ok: false, reason: failureFor(result.code, result.status) };
    try {
      return { ok: true, value: JSON.parse(result.text) as unknown };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  });
  cache.set(name, request);
  // A failure is not remembered: Try again must really try again.
  void request.then((outcome) => {
    if (!outcome.ok && cache.get(name) === request) cache.delete(name);
  });
  return request;
}

/* ── Packs a free account opens ──────────────────────────────────────────
   The free-account model (1 October 2026): the vocabulary topic lists are
   free with an account, because they are the vocabulary lessons' own word
   tables. Their pack is read (never put in place as a module: the review
   deck inside it is practice, which stays paid) for any signed-in account.
   ALIGN AT MERGE with Builder G: the content door must open
   `pack:vocabulary` for any signed-in account with a profile. */
export const FREE_ACCOUNT_PACKS: readonly string[] = ['vocabulary'];

const freeCache = new Map<string, Promise<PackOutcome<unknown>>>();
let freeCacheOwner: string | null = null;

/** One free pack's data, for the account signed in now. Never throws; never
    asks the gate without a signed-in account. */
export function fetchFreePack(name: string): Promise<PackOutcome<unknown>> {
  const view = deps.view();
  if (!deps.gated || !FREE_ACCOUNT_PACKS.includes(name)) return Promise.resolve({ ok: false, reason: 'not-paid' });
  if (view.phase !== 'ready' || !view.userId) return Promise.resolve({ ok: false, reason: 'signed-out' });
  if (freeCacheOwner !== view.userId) {
    freeCache.clear();
    freeCacheOwner = view.userId;
  }
  const cached = freeCache.get(name);
  if (cached) return cached;
  const request = deps.get(`pack/${name}`).then((result): PackOutcome<unknown> => {
    if (!result.ok) return { ok: false, reason: failureFor(result.code, result.status) };
    try {
      return { ok: true, value: JSON.parse(result.text) as unknown };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  });
  freeCache.set(name, request);
  void request.then((outcome) => {
    if (!outcome.ok && freeCache.get(name) === request) freeCache.delete(name);
  });
  return request;
}

/* ── Putting a module pack in place ──────────────────────────────────── */

type IndexEntry = Record<string, unknown> & { id?: unknown };

/** The learning index as the gated build imports it (the trimmed copy),
    restored in place from the full one. */
async function applyLearningIndex(full: unknown): Promise<void> {
  const catalog = await import('../learning/catalog');
  const source = (full ?? {}) as Record<string, unknown>;
  const target = trimmedIndex as unknown as Record<string, unknown>;
  for (const field of ['focusedExercises', 'speakingPrompts', 'writingPrompts'] as const) {
    const real = Array.isArray(source[field]) ? (source[field] as IndexEntry[]) : [];
    const byId = new Map(real.map((entry) => [String(entry.id), entry]));
    const list = Array.isArray(target[field]) ? (target[field] as IndexEntry[]) : [];
    for (const entry of list) {
      const match = byId.get(String(entry.id));
      if (match) Object.assign(entry, match);
    }
  }
  /* The catalogue decoded its focused exercises when it loaded: give each
     its objective back where it stands. Its Writing and Speaking entries are
     the index's own objects, restored above. */
  const objectives = new Map(
    (Array.isArray(source.focusedExercises) ? (source.focusedExercises as IndexEntry[]) : []).map((entry) => [
      String(entry.id),
      entry.objective,
    ]),
  );
  for (const entry of catalog.LEARNING_INDEX.focusedExercises as unknown as IndexEntry[]) {
    const objective = objectives.get(String(entry.id));
    if (typeof objective === 'string') entry.objective = objective;
  }
}

interface RussianPack {
  strings: Record<string, string>;
  parts: Record<string, string>;
  learning: Record<string, string>;
}
let russian: RussianPack | null = null;
let russianWatched = false;

/** Merges the paid Russian into the loaded Russian dictionary. Only when
    the student reads Russian: an English student downloads no Russian. */
const mergedInto = new WeakSet<object>();
async function mergeRussian(): Promise<void> {
  if (!russian || getLocale() !== 'ru') return;
  const dict = await loadDictionary('ru');
  /* Once per dictionary: the signal below reaches this function's own
     listener too, so merging again would signal again, for ever. */
  if (!dict || !russian || mergedInto.has(dict)) return;
  mergedInto.add(dict);
  Object.assign(dict.strings, russian.strings, russian.parts);
  notifyLocaleListeners();
}

async function applyRussian(data: unknown): Promise<void> {
  const value = (data ?? {}) as Partial<RussianPack>;
  russian = { strings: value.strings ?? {}, parts: value.parts ?? {}, learning: value.learning ?? {} };
  const { RU_STRINGS } = await import('../learning/ru');
  Object.assign(RU_STRINGS, russian.learning);
  fillDictionaryParts(russian.parts);
  if (!russianWatched) {
    russianWatched = true;
    onLocaleChange(() => void mergeRussian());
  }
  await mergeRussian();
}

async function applyVocabulary(data: unknown): Promise<void> {
  const value = (data ?? {}) as { cards?: unknown };
  if (!Array.isArray(value.cards)) throw new Error('pack: vocabulary has no cards');
  const { replaceCardSet } = await import('../vocab-review');
  replaceCardSet(value.cards as Parameters<typeof replaceCardSet>[0]);
}

const FILL: Record<ModulePack, (data: unknown) => void | Promise<void>> = {
  'model-answers': fillModelAnswers,
  'writing-prompts-imported': fillImportedWritingPrompts,
  'writing-structures': fillWritingStructures,
  'writing-plans': fillWritingPlans,
  'band-guides': fillBandGuides,
  'speaking-prompts': fillSpeakingPrompts,
  'cue-cards': fillCueCards,
  'speaking-structure-guides': fillSpeakingStructureGuides,
  'focused-exercises': fillFocusedExercises,
  'learning-index': applyLearningIndex,
  'ru-dictionary': applyRussian,
  vocabulary: applyVocabulary,
};

const applying = new Map<ModulePack, Promise<PackOutcome>>();

/** Fetches each named module pack (once) and puts it in place. Resolves ok
    only when every one is in place. */
export async function loadPacks(names: readonly ModulePack[]): Promise<PackOutcome> {
  const view = deps.view();
  if (!paidNow(view)) return { ok: false, reason: 'not-paid' };
  watchAccount();
  const before = applied.size;
  const outcomes = await Promise.all(
    names.map((name) => {
      if (applied.has(name)) return Promise.resolve<PackOutcome>({ ok: true, value: undefined });
      const pending = applying.get(name);
      if (pending) return pending;
      const run = fetchPack(name).then(async (outcome): Promise<PackOutcome> => {
        if (!outcome.ok) return outcome;
        /* The account may have changed while this was on the way; its
           material is not put in place for anyone else. */
        if (deps.view().userId !== view.userId || !paidNow()) return { ok: false, reason: 'not-paid' };
        try {
          filledFor = view.userId;
          await FILL[name](outcome.value);
          applied.add(name);
          return { ok: true, value: undefined };
        } catch {
          return { ok: false, reason: 'unavailable' };
        }
      });
      applying.set(name, run);
      void run.finally(() => applying.delete(name));
      return run;
    }),
  );
  /* Other islands on the page (a score history, Mr EZ) rendered before the
     material arrived. Every island that shows text re-renders on this signal
     (src/lib/i18n/react.ts), so they now read the real titles and guides. */
  if (applied.size > before) notifyLocaleListeners();
  return outcomes.find((outcome) => !outcome.ok) ?? { ok: true, value: undefined };
}

/** The packs every paid page wants besides its own: the full learning index
    (titles, objectives, cue-card topics) and, for a Russian reader, the
    Russian that goes with them. */
export function commonPacks(): ModulePack[] {
  return getLocale() === 'ru' ? ['learning-index', 'ru-dictionary'] : ['learning-index'];
}

/** Is this pack already in place in this tab? */
export function packApplied(name: ModulePack): boolean {
  return applied.has(name);
}

/* ── Leaving no paid material behind ─────────────────────────────────── */

function watchAccount(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  onTrialChange((view) => {
    if (filledFor === null) return;
    const accountChanged = view.userId !== filledFor && view.phase !== 'no-accounts';
    const accessEnded = view.phase === 'ready' && view.userId === filledFor && !paidNow(view);
    if (accountChanged || accessEnded) {
      filledFor = null;
      window.location.reload();
    }
  });
  /* A Russian reader who opens a paid page in English and switches later
     still gets the paid Russian: ask for it on the switch. */
  onLocaleChange(() => {
    if (getLocale() === 'ru' && paidNow() && !applied.has('ru-dictionary')) void loadPacks(['ru-dictionary']);
  });
}

/** For tests only: stand-ins for the account, the clock and the gate. */
export function setPackDepsForTest(next: Partial<PackDeps> | null): void {
  deps = next ? { ...REAL_DEPS, ...next } : REAL_DEPS;
}

/** For tests only. */
export function resetPacksForTest(): void {
  cache.clear();
  freeCache.clear();
  freeCacheOwner = null;
  cacheOwner = null;
  filledFor = null;
  applied.clear();
  applying.clear();
  russian = null;
}
