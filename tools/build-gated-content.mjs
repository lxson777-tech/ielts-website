/* Collects the course content a commercial build (PUBLIC_ACCESS_MODE=trial,
 * the name stays) must NOT publish into one private folder, for the content
 * gate (workers/content-gate) to hand out only to a student allowed to open
 * it.
 *
 * The free-account model (Alex, 1 October 2026,
 * docs/paid-access/FREE-ACCOUNT-MODEL.md) puts the lessons behind the door
 * again: a lesson body, its worked example and its own quiz are served here
 * to any signed-in account with a completed profile, and never published
 * in a signed-out page. Everything else here is paid.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/build-gated-content.mjs [out-dir]
 *
 * Default out-dir: gated-content/ (git-ignored). In production that folder is
 * uploaded to a PRIVATE storage bucket the gate reads from (an R2 bucket bound
 * as CONTENT); locally the stand-in serves it from disk. Nothing in it is ever
 * copied into dist/, the public site.
 *
 * What goes in, key by key (the same keys the gate reads):
 *   lessons/en/<slug>.html        every lesson body, English
 *   lessons/ru/<slug>.html        every lesson body with a Russian translation
 *   tests/<id>.json               every practice paper and drill, whole, as the
 *                                 test player needs it (passages, transcripts,
 *                                 questions, answers, explanations)
 *   explanations/ru/<id>.json     the Russian answer explanations
 *   practice/<set id>.json        a Reading or Listening lesson's practice quiz
 *   examples/writing-<slug>.json  a Writing lesson's one worked example,
 *                                 {prompt, model}, its charts inline (the
 *                                 gate's /example/<lesson key>, opened with
 *                                 the lesson)
 *   prompts/<prompt id>.json      a Writing question
 *   models/<prompt id>.json       a Band 8 model with its question
 *   data/tests/<id>.json          the compact paper Mr EZ reads (toSiteTest)
 *   data/lesson-blocks/<slug>.json  the lesson blocks Mr EZ reads
 *   packs/<name>.json             paid material the gated build's browser
 *                                 does not carry (paidPacks below), for a
 *                                 running paid grant only
 *   manifest.json                 every key, for checking an upload, plus the
 *                                 listening recordings to upload from public/
 *
 * Each item is shaped exactly as the open site's own endpoints shape it
 * (src/pages/data/..., src/pages/lesson-bodies/...), so the pages cannot tell
 * where it came from.
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = resolve(REPO, 'gated-content');
/* The same rewrite the lesson pages apply (src/pages/lessons/**), with the
   GitHub Pages base spelled out because plain Node has no BASE_URL. */
const BASE = '/ielts-website';
const pics = (html) => html.replaceAll('../pics/', `${BASE}/pics/`);

export async function buildGatedContent(out = DEFAULT_OUT) {
  const OUT = resolve(out);
  const keys = [];
  const put = (key, content) => {
    const path = join(OUT, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    keys.push(key);
  };

  const { ALL_TESTS } = await import('../src/data/tests/index.ts');
  const { ALL_DRILLS, ALL_LISTENING_DRILLS } = await import('../src/lib/tests/drills.ts');
  const { toSiteTest } = await import('../src/lib/tutor/test-items.ts');
  const { publishLessonBlocks } = await import('../src/lib/learning/lesson-blocks.ts');

  // Lesson bodies, both languages.
  const bodies = resolve(REPO, 'src/content/lesson-bodies');
  const russian = new Map();
  if (existsSync(join(bodies, 'ru'))) {
    for (const file of readdirSync(join(bodies, 'ru'))) {
      if (file.endsWith('.html')) russian.set(file.replace(/\.html$/, ''), readFileSync(join(bodies, 'ru', file), 'utf8'));
    }
  }
  for (const file of readdirSync(bodies)) {
    const path = join(bodies, file);
    if (!file.endsWith('.html') || statSync(path).isDirectory()) continue;
    const slug = file.replace(/\.html$/, '');
    const english = readFileSync(path, 'utf8');
    put(`lessons/en/${slug}.html`, pics(english));
    const ru = russian.get(slug) ?? null;
    if (ru) put(`lessons/ru/${slug}.html`, pics(ru));
    put(`data/lesson-blocks/${slug}.json`, JSON.stringify(publishLessonBlocks(slug, english, ru)));
  }

  // Practice papers and drills, whole, plus Mr EZ's compact copy.
  for (const test of ALL_TESTS) {
    put(`tests/${test.id}.json`, JSON.stringify(test));
    put(`data/tests/${test.id}.json`, JSON.stringify(toSiteTest(test)));
  }
  for (const drill of [...ALL_DRILLS, ...ALL_LISTENING_DRILLS]) {
    put(`tests/${drill.id}.json`, JSON.stringify(drill.test));
  }

  // The practice quizzes inside the Reading and Listening lessons, opened
  // with their lesson (the gate's /practice/<set id>).
  const { READING_PRACTICE } = await import('../src/data/reading-practice.ts');
  const { LISTENING_PRACTICE } = await import('../src/data/listening-practice.ts');
  for (const [slug, set] of Object.entries(READING_PRACTICE)) put(`practice/practice-reading-${slug}.json`, JSON.stringify(set));
  for (const [slug, set] of Object.entries(LISTENING_PRACTICE)) put(`practice/practice-listening-${slug}.json`, JSON.stringify(set));

  // Each Writing lesson's one worked example, exactly as the open build's
  // lesson page passes it (src/lib/access/lesson-examples.server.ts), for
  // the gate's /example/<lesson key>. Opened with its lesson, for any
  // signed-in account; the rest of the model bank stays paid.
  const { WRITING_PARTS } = await import('../src/data/writing.ts');
  const { lessonExample } = await import('../src/lib/access/lesson-examples.server.ts');
  for (const part of WRITING_PARTS) {
    const example = withCwd(REPO, () => lessonExample(part.slug));
    if (example) put(`examples/writing-${part.slug}.json`, JSON.stringify(example));
  }

  // Writing questions and Band 8 models (Alex, 24 September 2026: lock the
  // remaining material). Every question, and every model with its question,
  // for the gate's /prompt/<id> and /model/<id>: the bank, paid only.
  const { WRITING_PROMPTS } = await import('../src/data/writing-prompts.ts');
  const { getModelAnswers } = await import('../src/data/model-answers.ts');
  for (const prompt of WRITING_PROMPTS) {
    put(`prompts/${prompt.id}.json`, JSON.stringify(prompt));
    const model = getModelAnswers(prompt.id)[0];
    if (model) put(`models/${prompt.id}.json`, JSON.stringify({ prompt, model }));
  }

  // Russian answer explanations, published exactly as the open site does.
  const explained = resolve(REPO, 'src/data/tests/ru');
  if (existsSync(explained)) {
    for (const file of readdirSync(explained)) {
      if (!file.endsWith('.json')) continue;
      const id = file.replace(/\.json$/, '');
      const source = JSON.parse(readFileSync(join(explained, file), 'utf8'));
      const entries = {};
      for (const [key, value] of Object.entries(source.entries ?? {})) {
        if (value && typeof value.ru === 'string' && value.ru.trim() !== '') entries[key] = value.ru;
      }
      put(`explanations/ru/${id}.json`, JSON.stringify({ id, locale: 'ru', entries }));
    }
  }

  // Paid material (docs/paid-access/CONTRACT.md, "Paid content in the gated
  // build"): everything a gated build's browser does not carry, as packs the
  // gate hands to a running paid grant only (GET /pack/<name>).
  for (const [name, content] of await paidPacks()) put(`packs/${name}.json`, JSON.stringify(content));

  // Listening recordings: the bucket holds them under audio/listening/<file>
  // (the gate's signed /audio/<file> links read them). They are uploaded
  // straight from public/audio/listening, not copied here (530 MB), so the
  // manifest names each one with its source for the upload.
  const audioDir = resolve(REPO, 'public/audio/listening');
  const audio = existsSync(audioDir)
    ? readdirSync(audioDir)
        .filter((file) => /^test-\d{3}\.mp3$/.test(file))
        .sort()
        .map((file) => ({ key: `audio/listening/${file}`, source: `public/audio/listening/${file}` }))
    : [];

  put('manifest.json', JSON.stringify({ keys: [...keys].sort(), audio }, null, 1));
  return { out: OUT, keys: keys.length };
}

/** lessonExample reads chart files relative to the working directory (the
    repository, when the site builds); this script may be run from anywhere. */
function withCwd(dir, work) {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return work();
  } finally {
    process.chdir(before);
  }
}

/* ── Paid packs ────────────────────────────────────────────────────────────
 * One pack per module a gated build swaps for an empty stand-in
 * (TRIAL_SWAPS in astro.config.mjs, src/lib/trial/light/), holding that
 * module's exported data exactly as the real module exports it, plus:
 *   learning-index         the untrimmed learning index
 *   ru-dictionary          the Russian entries a gated build's dictionaries
 *                          leave out (src/lib/trial/trim-dictionary.ts): the
 *                          main dictionary's, the band-guide and coach parts,
 *                          and the study plan's own (src/lib/learning/ru.ts)
 *   vocabulary             the vocabulary review deck and topic pages, built
 *                          from the vocabulary lessons
 *   placement              the placement test's material (src/pages/placement.astro)
 *   focused-<id>           one focused exercise's page view
 *   speaking-focus-<id>    one spoken focused task's page view
 * Each fill function in src/lib/trial/light/ (and src/lib/trial/packs.ts)
 * reads exactly these keys; tests/paid-packs.test.ts holds them together.
 *
 * The Task 1 charts are not published by a gated build (astro.config.mjs,
 * TRIAL_UNPUBLISHED), so a pack carries each chart it names inline, as a
 * data address, and the page needs nothing from public/pics/writing/imported. */

/** The pack names, for the gate's `pack:<name>` items and the tests. */
export const MODULE_PACKS = [
  'model-answers',
  'writing-prompts-imported',
  'writing-structures',
  'writing-plans',
  'band-guides',
  'speaking-prompts',
  'cue-cards',
  'speaking-structure-guides',
  'focused-exercises',
];
export const EXTRA_PACKS = ['learning-index', 'ru-dictionary', 'vocabulary', 'placement'];
const SAFE_PACK = /^[a-z0-9][a-z0-9-]{0,99}$/;

const IMAGE_TYPES = { '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

/** Every Task 1 chart a piece of JSON names, replaced by the chart itself. */
function inlineTask1Charts(json) {
  return json.replace(/(?:\/ielts-website)?\/pics\/writing\/imported\/([A-Za-z0-9._-]+)/g, (whole, file) => {
    const path = resolve(REPO, 'public/pics/writing/imported', file);
    const type = IMAGE_TYPES[file.slice(file.lastIndexOf('.')).toLowerCase()];
    if (!type || !existsSync(path)) throw new Error(`build-gated-content: ${whole} is named by a pack but is not in public/pics/writing/imported`);
    return `data:${type};base64,${readFileSync(path).toString('base64')}`;
  });
}

/** Plain Node has no BASE_URL, so withBase() there leaves the site's base
    off; the pages add it at build time. The one place a view carries a
    based address is a focused exercise's legend images. */
function withSiteBase(html) {
  return typeof html === 'string' ? html.replace(/src="\/(?!ielts-website\/)/g, `src="${BASE}/`) : html;
}

async function paidPacks() {
  const packs = new Map();
  const add = (name, content) => {
    if (!SAFE_PACK.test(name)) throw new Error(`build-gated-content: pack name ${name} is not one the gate accepts`);
    packs.set(name, JSON.parse(inlineTask1Charts(JSON.stringify(content))));
  };

  const modelAnswers = await import('../src/data/model-answers.ts');
  add('model-answers', { MODEL_ANSWERS: modelAnswers.MODEL_ANSWERS });
  const imported = await import('../src/data/writing-prompts-imported.ts');
  add('writing-prompts-imported', { IMPORTED_WRITING_PROMPTS: imported.IMPORTED_WRITING_PROMPTS });
  const structures = await import('../src/data/writing-structures.ts');
  add('writing-structures', {
    WRITING_STRUCTURES: structures.WRITING_STRUCTURES,
    PROMPT_VARIANT_STRUCTURE: structures.PROMPT_VARIANT_STRUCTURE,
  });
  const plans = await import('../src/data/writing-plans.ts');
  add('writing-plans', { WRITING_PLANS: plans.WRITING_PLANS });
  const guides = await import('../src/data/band-guides.ts');
  add('band-guides', { WRITING_BAND_GUIDES: guides.WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES: guides.SPEAKING_BAND_GUIDES });
  const speaking = await import('../src/data/speaking-prompts.ts');
  add('speaking-prompts', { SPEAKING_PART1_TOPICS: speaking.SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS: speaking.SPEAKING_CUE_CARDS });
  const cueCards = await import('../src/data/cue-cards.ts');
  add('cue-cards', { CUE_CARD_FAMILIES: cueCards.CUE_CARD_FAMILIES, CUE_CARDS: cueCards.CUE_CARDS });
  const speakingGuides = await import('../src/data/speaking-structure-guides.ts');
  add('speaking-structure-guides', { SPEAKING_STRUCTURE_GUIDES: speakingGuides.SPEAKING_STRUCTURE_GUIDES });
  const focused = await import('../src/data/focused-exercises.ts');
  add('focused-exercises', {
    FOCUSED_EXERCISES: focused.FOCUSED_EXERCISES,
    WRITTEN_FOCUSED_TASKS: focused.WRITTEN_FOCUSED_TASKS,
    AUTHORED_FOCUSED_EXERCISES: focused.AUTHORED_FOCUSED_EXERCISES,
    SPOKEN_FOCUSED_TASKS: focused.SPOKEN_FOCUSED_TASKS,
  });

  // The untrimmed learning index (src/lib/trial/trim-index.ts trims it).
  add('learning-index', JSON.parse(readFileSync(resolve(REPO, 'src/data/generated/learning-index.json'), 'utf8')));

  // The Russian a gated build's browser does not carry.
  const { lockedSentences } = await import('../src/lib/trial/trim-dictionary.ts');
  const locked = lockedSentences();
  const { strings: mainRu } = await import('../src/lib/i18n/dict/ru/index.ts');
  const { RU_STRINGS: learningRu } = await import('../src/lib/learning/ru.ts');
  const pick = (source) => Object.fromEntries(Object.entries(source).filter(([english]) => locked.has(english)));
  const parts = {};
  for (const part of ['band-guides', 'structures']) Object.assign(parts, (await import(`../src/lib/i18n/dict/ru/parts/${part}.ts`)).strings);
  add('ru-dictionary', { strings: pick(mainRu), parts, learning: pick(learningRu) });

  // The vocabulary review deck and topic pages, from the vocabulary lessons
  // (the gated build's browser copy of src/lib/vocab-review.ts has none).
  const vocab = await import('../src/lib/vocab-review.ts');
  const { VOCABULARY_PARTS } = await import('../src/data/vocabulary.ts');
  const bodies = resolve(REPO, 'src/content/lesson-bodies');
  const fragments = {};
  for (const file of readdirSync(bodies)) {
    if (/^vocabulary-[a-z-]+\.html$/.test(file)) fragments[`../content/lesson-bodies/${file}`] = readFileSync(join(bodies, file), 'utf8');
  }
  add('vocabulary', {
    cards: vocab.buildCardSetFromFragments(fragments),
    topics: VOCABULARY_PARTS.map((part) => {
      const raw = fragments[`../content/lesson-bodies/vocabulary-${part.slug}.html`];
      if (!raw) throw new Error(`build-gated-content: missing vocabulary lesson ${part.slug}`);
      return vocab.buildVocabTopicData(raw, part.slug, part.title);
    }),
  });

  // The placement test's material, exactly as src/pages/placement.astro resolves it.
  const { placementMaterial } = await import('../src/lib/placement/material.ts');
  add('placement', placementMaterial());

  // One focused exercise's view per pack, as its page builds it.
  const { focusedPageView, spokenTaskView } = await import('../src/lib/tests/focused-views.ts');
  const lessonBody = (key) => {
    const path = join(bodies, `${key}.html`);
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
  };
  for (const exercise of focused.ALL_FOCUSED_EXERCISES) {
    const view = focusedPageView(exercise, lessonBody);
    if (view.item?.legendHtml) view.item.legendHtml = withSiteBase(view.item.legendHtml);
    add(`focused-${exercise.id}`, view);
  }
  for (const task of focused.SPOKEN_FOCUSED_TASKS) add(`speaking-focus-${task.id}`, spokenTaskView(task, lessonBody));

  for (const name of [...MODULE_PACKS, ...EXTRA_PACKS]) {
    if (!packs.has(name)) throw new Error(`build-gated-content: pack ${name} was not written`);
  }
  return packs;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildGatedContent(process.argv[2] ? resolve(REPO, process.argv[2]) : DEFAULT_OUT);
  console.log(`wrote ${result.keys} items to ${result.out}`);
}
