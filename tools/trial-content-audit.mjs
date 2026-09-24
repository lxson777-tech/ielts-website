/* Does any public file of a build still carry locked course content?
 *
 * The trial's locked door (docs/TRIAL-IMPLEMENTATION.md, "Protecting the
 * content") only means something if a trial build publishes no lesson body,
 * no question, no answer, no passage and no transcript. This reads the real
 * content (every practice paper in src/data/tests, every lesson body in
 * src/content/lesson-bodies, English and Russian), takes a few distinctive
 * phrases from each, and searches every file under a build folder for them.
 *
 *   node --import ./tests/ts-extension-loader.mjs tools/trial-content-audit.mjs [dist] [--json]
 *
 * Phrases are runs of plain words (letters, digits, spaces), so they survive
 * however a page stores text: inside HTML, inside an island's JSON props,
 * inside a JavaScript chunk.
 *
 * Since 24 September 2026 (Alex: lock the remaining study material too) it
 * also reads the supporting material the trial does not include: every Band 8
 * model answer, every Writing question, the writing coach's structures,
 * phrase bank and per-question plans, every band guide step, the Russian
 * translations of the band guides and the coach, every cue card with its
 * model talk and Part 3 answers, every Part 1 question and the speaking
 * coach's methods and phrases.
 *
 * Two kinds of finding:
 *   LEAK    any phrase of a practice paper (passage, transcript, answer
 *           notes), or two or more phrases of the same lesson or the same
 *           piece of material in one file: real content in a public file.
 *           Exits 1.
 *   SHARED  a single phrase of a lesson, found once: a line the lesson
 *           shares with something public by design (a cue-card question in
 *           the public question list, a one-line strategy tip). Reported,
 *           never hidden, but not a failure.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const DIST = resolve(REPO, args.find((a) => !a.startsWith('--')) ?? 'dist');
const AS_JSON = args.includes('--json');
/* Named exceptions, each with its reason (tools/trial-content-allowed.json). */
const ALLOWED = JSON.parse(readFileSync(resolve(REPO, 'tools/trial-content-allowed.json'), 'utf8')).allowed.map((a) => ({
  file: new RegExp(a.file),
  items: new RegExp(a.items),
  reason: a.reason,
}));

const decode = (html) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Up to `count` phrases of 6 to 9 plain words each, spread through `text`. */
function phrases(text, count = 3) {
  const words = decode(text).split(' ');
  const out = [];
  const plain = (w) => /^[A-Za-z0-9Ѐ-ӿ]+,?$/.test(w);
  for (let start = 0; start < words.length && out.length < count; start += Math.max(12, Math.floor(words.length / (count + 1)))) {
    const run = [];
    for (let i = start; i < words.length && run.length < 8; i++) {
      if (plain(words[i])) run.push(words[i]);
      else if (run.length) break;
    }
    const phrase = run.join(' ');
    if (run.length >= 6 && phrase.length >= 30) out.push(phrase);
  }
  return out;
}

async function sentinels() {
  const list = [];
  const { ALL_TESTS } = await import('../src/data/tests/index.ts');
  for (const test of ALL_TESTS) {
    for (const part of test.parts) {
      const s = part.stimulus;
      const stimulusText = s.kind === 'passage' ? s.paragraphs.map((p) => p.html).join(' ') : `${s.transcriptHtml ?? ''} ${s.questionHtml ?? ''}`;
      for (const p of phrases(stimulusText, 2)) list.push({ kind: 'test', id: test.id, phrase: p });
      const explained = part.groups.flatMap((g) => g.questions.map((q) => q.explanation ?? q.evidence ?? '')).join(' ');
      for (const p of phrases(explained, 2)) list.push({ kind: 'answers', id: test.id, phrase: p });
    }
  }
  const bodies = resolve(REPO, 'src/content/lesson-bodies');
  for (const dir of [bodies, join(bodies, 'ru')]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.html')) continue;
      const slug = file.replace(/\.html$/, '');
      for (const p of phrases(readFileSync(join(dir, file), 'utf8'), 3)) {
        list.push({ kind: dir === bodies ? 'lesson' : 'lesson-ru', id: slug, phrase: p });
      }
    }
  }
  await materialSentinels(list);
  return list;
}

/** Every string inside a value, joined: plans and guides are nested data. */
function allStrings(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(allStrings).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(allStrings).join(' ');
  return '';
}

/** The supporting material (kinds other than test, answers and lesson). */
async function materialSentinels(list) {
  const add = (kind, id, text, count) => {
    for (const p of phrases(text, count)) list.push({ kind, id, phrase: p });
  };
  const { MODEL_ANSWERS } = await import('../src/data/model-answers.ts');
  for (const m of MODEL_ANSWERS) add('model', m.promptId, m.text.join(' '), 3);
  const { WRITING_PROMPTS } = await import('../src/data/writing-prompts.ts');
  for (const p of WRITING_PROMPTS) add('prompt', p.id, p.promptHtml, 2);
  const { WRITING_STRUCTURES } = await import('../src/data/writing-structures.ts');
  for (const [variant, s] of Object.entries(WRITING_STRUCTURES)) add('coach', `writing-${variant}`, allStrings(s), 4);
  const { WRITING_PLANS } = await import('../src/data/writing-plans.ts');
  for (const [id, plan] of Object.entries(WRITING_PLANS)) add('plan', id, allStrings(plan), 3);
  const { WRITING_BAND_GUIDES, SPEAKING_BAND_GUIDES } = await import('../src/data/band-guides.ts');
  for (const [skill, ladders] of [['writing', WRITING_BAND_GUIDES], ['speaking', SPEAKING_BAND_GUIDES]]) {
    for (const [criterion, steps] of Object.entries(ladders)) {
      for (const step of steps) {
        add('guide', `${skill}-${criterion}-${step.from}`, `${step.whatChanges} ${step.doThis.join(' ')} ${step.practice}`, 2);
      }
    }
  }
  const { CUE_CARDS } = await import('../src/data/cue-cards.ts');
  for (const card of CUE_CARDS) add('cue-model', card.id, `${card.model.join(' ')} ${card.part3.map((x) => x.a).join(' ')}`, 3);
  const { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } = await import('../src/data/speaking-prompts.ts');
  for (const topic of SPEAKING_PART1_TOPICS) add('part1', topic.id, allStrings(topic.questions), 2);
  for (const card of SPEAKING_CUE_CARDS) add('cue-card', card.id, `${card.bullets.join(' ')} ${allStrings(card.part3Questions)} ${allStrings(card.ideas ?? [])}`, 2);
  const { SPEAKING_STRUCTURE_GUIDES } = await import('../src/data/speaking-structure-guides.ts');
  for (const [method, guide] of Object.entries(SPEAKING_STRUCTURE_GUIDES)) add('coach', `speaking-${method}`, allStrings(guide), 4);
  const { ALL_FOCUSED_EXERCISES, SPOKEN_FOCUSED_TASKS } = await import('../src/data/focused-exercises.ts');
  for (const ex of [...ALL_FOCUSED_EXERCISES, ...SPOKEN_FOCUSED_TASKS]) {
    // Everything a focused exercise says except its id, title and links.
    const { id, title, source, lesson, ...rest } = ex;
    add('focused', id, allStrings(rest), 3);
  }
  for (const part of ['band-guides', 'structures']) {
    const { strings } = await import(`../src/lib/i18n/dict/ru/parts/${part}.ts`);
    const values = Object.values(strings).filter((v) => typeof v === 'string' && v.length > 60);
    // In groups of ten translations, so one shared sentence never counts as a leak.
    for (let i = 0; i < values.length; i += 10) add(`${part}-ru`, `${part}-${i / 10 + 1}`, values.slice(i, i + 10).join(' '), 4);
  }
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (['.html', '.js', '.mjs', '.json', '.css', '.txt', '.xml'].includes(extname(name))) yield path;
  }
}

const decodeFile = (text) =>
  text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;|&#34;/g, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\\n|\\t/g, ' ')
    .replace(/\s+/g, ' ');

async function main() {
  if (!existsSync(DIST)) {
    console.error(`No build at ${DIST}. Build first.`);
    process.exit(2);
  }
  const marks = await sentinels();
  const found = [];
  for (const path of files(DIST)) {
    const text = decodeFile(readFileSync(path, 'utf8'));
    const hits = marks.filter((m) => text.includes(m.phrase));
    if (hits.length) {
      const perItem = new Map();
      for (const h of hits) perItem.set(`${h.kind}:${h.id}`, (perItem.get(`${h.kind}:${h.id}`) ?? 0) + 1);
      const leak = hits.some((h) => h.kind === 'test' || h.kind === 'answers') || [...perItem.values()].some((n) => n >= 2);
      const file = relative(DIST, path).replace(/\\/g, '/');
      const allowed = ALLOWED.find((a) => a.file.test(file) && [...perItem.keys()].every((k) => a.items.test(k)));
      found.push({
        file,
        verdict: leak ? (allowed ? 'ALLOWED' : 'LEAK') : 'SHARED',
        ...(allowed ? { reason: allowed.reason } : {}),
        items: [...perItem.keys()],
        phrases: [...new Set(hits.map((h) => h.phrase))].slice(0, 5),
      });
    }
  }
  const summary = {
    build: relative(REPO, DIST) || '.',
    phrasesChecked: marks.length,
    tests: new Set(marks.filter((m) => m.kind === 'test' || m.kind === 'answers').map((m) => m.id)).size,
    material: new Set(marks.filter((m) => !['test', 'answers', 'lesson', 'lesson-ru'].includes(m.kind)).map((m) => `${m.kind}:${m.id}`)).size,
    lessonBodies: new Set(marks.filter((m) => m.kind.startsWith('lesson')).map((m) => `${m.kind}:${m.id}`)).size,
    filesLeaking: found.filter((f) => f.verdict === 'LEAK').length,
    filesSharingALine: found.filter((f) => f.verdict === 'SHARED').length,
    filesAllowed: found.filter((f) => f.verdict === 'ALLOWED').length,
    found,
  };
  if (AS_JSON) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(
      `Checked ${summary.phrasesChecked} phrases from ${summary.tests} papers, ${summary.lessonBodies} lesson bodies and ${summary.material} pieces of supporting material against ${summary.build}.`,
    );
    console.log(
      `${summary.filesLeaking} file(s) leak locked content; ${summary.filesSharingALine} share a single line; ${summary.filesAllowed} named exception(s).`,
    );
    for (const f of found.slice(0, 60)) {
      console.log(`  ${f.verdict.padEnd(7)} ${f.file}: ${f.items.slice(0, 6).join(', ')}${f.items.length > 6 ? ` (+${f.items.length - 6})` : ''}`);
      if (f.verdict === 'SHARED') console.log(`          "${f.phrases[0]}"`);
      if (f.verdict === 'ALLOWED') console.log(`          ${f.reason}`);
    }
    if (found.length > 60) console.log(`  ... and ${found.length - 60} more files`);
  }
  process.exit(summary.filesLeaking ? 1 : 0);
}

await main();
