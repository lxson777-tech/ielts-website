/* Mr EZ in Russian.

   Three separate things are pinned here, and they fail for different
   reasons, which is the point of keeping them apart:

   1. THE LANGUAGE TRAVELS. A request carries a locale, it is validated, and
      it reaches the prompt, the fingerprints and the sentences the code
      writes. A student who reads Russian never gets an English paragraph
      back, and never gets the other language's cached one either.
   2. THE PERSONA DOES NOT MOVE. MR_EZ_PERSONA is byte-identical in both
      languages. The language rules are a block appended after it, so there
      is one Mr EZ, not two.
   3. NOTHING STUDENT-VISIBLE IS LEFT IN ENGLISH BY ACCIDENT. The shared
      layer (insights, recommend, catalog, week, units, and the Worker's own
      simulation) is scanned for the sentences it writes, and every one of
      them has to be in src/lib/tutor/ru.ts. A new English sentence with no
      Russian fails this file and names itself.

   Nothing here calls a model, Supabase or the network. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseTutorRequest } from '../src/lib/tutor/schema.ts';
import { MR_EZ_PERSONA, RUSSIAN_REPLY_RULES, TASK_RULES, buildInstructions } from '../src/lib/tutor/prompt.ts';
import { RU_PLURALS, RU_STRINGS, formatDate, tutorCount, tutorText } from '../src/lib/tutor/ru.ts';
import { insightsFingerprint, readInsights, observationEvidence, observationText } from '../src/lib/tutor/insights.ts';
import { readWeek, weekFallbackText, weekFingerprint, weekWindowFor } from '../src/lib/tutor/week.ts';
import { readUnit, unitFallbackText, unitFingerprint } from '../src/lib/tutor/units.ts';
import { recommendNext, recommendationReason } from '../src/lib/tutor/recommend.ts';
import { activityBlurb, activityLabel, buildCatalog, practiseActivity } from '../src/lib/tutor/catalog.ts';
import { tutorErrorMessage } from '../src/lib/tutor/errors.ts';
import { loadDictionary } from '../src/lib/i18n/dict/index.ts';
import { t } from '../src/lib/i18n/translate.ts';
import { COURSE_UNITS, buildCourse, courseLessonCount } from '../src/lib/course.ts';
import { createHandler } from '../workers/mr-ez/src/index.ts';

import {
  GOOD_TOKEN,
  USER_A,
  baseEnv,
  emptyProgress,
  makeDeps,
  makeState,
  modelReply,
  post,
  type FakeState,
  type Recorder,
} from './mr-ez-harness.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/* ================================================================== */
/* The locale on the wire                                              */
/* ================================================================== */

test('a request with no locale is answered in English', () => {
  assert.equal(parseTutorRequest({ task: 'welcome' }).locale, 'en');
  assert.equal(parseTutorRequest({ task: 'chat', message: 'hi' }).locale, 'en');
});

test('only ru is honoured; anything else becomes English rather than a refusal', () => {
  assert.equal(parseTutorRequest({ task: 'welcome', locale: 'ru' }).locale, 'ru');
  for (const bad of ['RU', 'ru-RU', 'kk', 'de', '', 0, 1, true, null, {}, ['ru']]) {
    assert.equal(
      parseTutorRequest({ task: 'welcome', locale: bad }).locale,
      'en',
      `${JSON.stringify(bad)} should fall back to English, not refuse the turn`,
    );
  }
});

/* ================================================================== */
/* The prompt                                                          */
/* ================================================================== */

test('the persona is byte-identical in both languages, and the language rules sit after it', () => {
  for (const task of ['chat', 'welcome', 'explain', 'weekly', 'unit', 'debrief', 'item'] as const) {
    const english = buildInstructions(task, 'en');
    const russian = buildInstructions(task, 'ru');

    assert.equal(english, `${MR_EZ_PERSONA}\n\n${TASK_RULES[task]}`, `${task}: English is persona plus task rules`);
    assert.ok(russian.startsWith(`${MR_EZ_PERSONA}\n\n${TASK_RULES[task]}`), `${task}: Russian starts with exactly the same block`);
    assert.equal(russian, `${MR_EZ_PERSONA}\n\n${TASK_RULES[task]}\n\n${RUSSIAN_REPLY_RULES}`, `${task}: and adds only the language block`);
  }
});

test('only the Russian instructions ask for Russian, and they protect the English a student must recognise', () => {
  assert.doesNotMatch(buildInstructions('chat', 'en'), /Russian/);
  assert.doesNotMatch(MR_EZ_PERSONA, /[Ѐ-ӿ]/, 'the persona itself carries no Russian');

  const russian = buildInstructions('chat', 'ru');
  assert.match(russian, /reply in natural, warm Russian/);
  assert.match(russian, /"вы"/, 'the form of address is spelled out');
  assert.doesNotMatch(russian, /"ты"[^,]*only/);
  // The terms that must survive untranslated inside a Russian sentence.
  for (const term of [
    'IELTS',
    'Reading, Listening, Writing and Speaking',
    'True / False / Not Given',
    'Matching Headings',
    'Task Response',
    'Lexical Resource',
    'Part, Task and Passage',
  ]) {
    assert.ok(russian.includes(term), `the language rules must protect "${term}"`);
  }
  assert.match(russian, /em dashes and en dashes/);
  assert.match(russian, /"reason" is shown to the student/);
});

test('the language rules never ask for the student RECORD to be translated', () => {
  // The model reads English facts and writes Russian prose. Translating the
  // facts on the way in would be a new way to be wrong about what a student
  // actually did.
  assert.match(RUSSIAN_REPLY_RULES, /You read English and you write Russian/);
});

/* ================================================================== */
/* The shared Russian map                                              */
/* ================================================================== */

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}

/** En dash and em dash, built from their code points so this file does not
    itself contain the two characters it exists to ban. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

test('every Russian sentence keeps the placeholders its English key has', () => {
  const problems: string[] = [];
  for (const [english, russian] of Object.entries(RU_STRINGS)) {
    const want = placeholders(english);
    const got = placeholders(russian);
    if (want.join(',') !== got.join(',')) {
      problems.push(`"${english}": English has {${want.join('}, {')}}, Russian has {${got.join('}, {')}}`);
    }
  }
  for (const [english, forms] of Object.entries(RU_PLURALS)) {
    const want = placeholders(english);
    for (const [form, value] of Object.entries(forms)) {
      const got = placeholders(value);
      if (want.join(',') !== got.join(',')) {
        problems.push(`plural "${english}" (${form}): English has {${want.join('}, {')}}, Russian has {${got.join('}, {')}}`);
      }
    }
  }
  assert.deepEqual(problems, [], `Placeholder mismatches in src/lib/tutor/ru.ts:\n  ${problems.join('\n  ')}`);
});

test('no entry in the shared map contains an em dash or an en dash, in either language', () => {
  const problems: string[] = [];
  for (const [english, russian] of Object.entries(RU_STRINGS)) {
    if (DASHES.test(english)) problems.push(`English key "${english}" contains a dash character`);
    if (DASHES.test(russian)) problems.push(`Russian for "${english}" contains a dash character`);
  }
  for (const [english, forms] of Object.entries(RU_PLURALS)) {
    if (DASHES.test(english)) problems.push(`English plural key "${english}" contains a dash character`);
    for (const [form, value] of Object.entries(forms)) {
      if (DASHES.test(value)) problems.push(`Russian plural "${english}" (${form}) contains a dash character`);
    }
  }
  assert.deepEqual(problems, [], `Dash characters found:\n  ${problems.join('\n  ')}`);
});

test('every Russian plural has all four forms and none of them is empty', () => {
  for (const [english, forms] of Object.entries(RU_PLURALS)) {
    for (const form of ['one', 'few', 'many', 'other'] as const) {
      assert.ok(forms[form] && forms[form].length > 0, `plural "${english}" is missing the "${form}" form`);
    }
  }
});

test('the Russian form is right across the awkward numbers', () => {
  const lessons = { one: '{n} lesson', other: '{n} lessons' };
  const expected: [number, string][] = [
    [1, '1 урок'],
    [2, '2 урока'],
    [5, '5 уроков'],
    [11, '11 уроков'],
    [21, '21 урок'],
  ];
  for (const [n, want] of expected) {
    assert.equal(tutorCount('ru', n, lessons), want, `n = ${n}`);
    assert.equal(tutorCount('en', n, lessons), `${n} ${n === 1 ? 'lesson' : 'lessons'}`, `English, n = ${n}`);
  }

  // And the same five numbers through a whole counted sentence, where the
  // inflected word is in the middle rather than at the end.
  const days = {
    one: 'So far this week you studied on {n} day, for {minutes} in total.',
    other: 'So far this week you studied on {n} days, for {minutes} in total.',
  };
  const forms = [1, 2, 5, 11, 21].map((n) => tutorCount('ru', n, days, { minutes: '10 минут' }));
  assert.match(forms[0]!, /занимались 1 день,/);
  assert.match(forms[1]!, /занимались 2 дня,/);
  assert.match(forms[2]!, /занимались 5 дней,/);
  assert.match(forms[3]!, /занимались 11 дней,/);
  assert.match(forms[4]!, /занимались 21 день,/);
});

test('a missing entry falls back to readable English rather than a blank or a key name', () => {
  assert.equal(tutorText('ru', 'Nothing here has Russian yet.'), 'Nothing here has Russian yet.');
  assert.equal(tutorText('ru', 'Ready in {days} days', { days: 3 }), 'Ready in 3 days');
  assert.equal(
    tutorCount('ru', 3, { one: '{n} widget', other: '{n} widgets' }),
    '3 widgets',
    'an untranslated counted phrase still reads',
  );
  // English never looks anything up at all.
  assert.equal(tutorText('en', '{n} lessons', { n: 4 }), '4 lessons');
});

test('an unknown placeholder is left visible rather than blanked', () => {
  assert.equal(tutorText('en', 'Hi {nmae}', { name: 'Alex' }), 'Hi {nmae}');
});

test('a date is written the way each language writes one', () => {
  const english = formatDate('2026-09-10T10:00:00.000Z', 'en');
  const russian = formatDate('2026-09-10T10:00:00.000Z', 'ru');
  assert.ok(english.includes('10') && english.includes('2026'), english);
  assert.ok(russian.includes('10') && russian.includes('2026'), russian);
  assert.notEqual(english, russian, 'a Russian student should not read an English month name');
  assert.match(russian, /сентябр/);
  // Nonsense in, something readable out, never an exception or a blank.
  assert.equal(formatDate('not-a-date', 'ru'), 'not-a-date');
});

test('the English date is day first, because this helper is shared with a site whose every other date is', () => {
  /* Changed 2026-09-22. This asked Intl for a bare 'en', which resolves to
     United States ordering, so Mr EZ said "Your Reading result from
     August 15, 2026" while /tests, /report and the marking histories all
     wrote "15 Aug 2026". The helper is shared, so this one line is visible
     in two places: every date on /report, and the Worker's own
     "Your {kind} result from {date}" sentence. */
  assert.equal(formatDate('2026-08-15', 'en'), '15 August 2026');
  assert.equal(formatDate('2026-09-19', 'en'), '19 September 2026');
  assert.doesNotMatch(formatDate('2026-08-15', 'en'), /^August/);

  // And the Russian is ordinary Russian, without the "г." year marker,
  // which is correct in Russian but noise in a row of dates.
  assert.equal(formatDate('2026-09-19', 'ru'), '19 сентября 2026');
  assert.doesNotMatch(formatDate('2026-09-19', 'ru'), /\sг\.?$/);
});

/* ================================================================== */
/* The panel's own chrome                                              */
/* ================================================================== */

/* The three lines the panel opens with were raw JSX text with no
   translation call at all, so a Russian student opened Mr EZ and read
   English. There is no DOM here, so the words are checked against the real
   dictionary and the wiring against the component's own source. */

const PANEL_SOURCE = fs.readFileSync(path.join(REPO_ROOT, 'src/components/tutor/MrEzPanel.tsx'), 'utf8');

/** Exactly as they are written in MrEzPanel.tsx. "Let’s" carries a
    typographic apostrophe (U+2019), and the English literal IS the lookup
    key, so the character matters: a straight quote here would look right
    and miss silently. */
const PANEL_INTRO = [
  'A little guidance. A lot of progress.',
  'Let’s figure it out together.',
  'Understand a tricky question, learn from your results, or find your next step.',
];

test("the panel's opening lines are translated, and the apostrophe in the key matches the source exactly", async () => {
  await loadDictionary('ru');
  for (const line of PANEL_INTRO) {
    const russian = t(line, undefined, undefined, 'ru');
    assert.notEqual(russian, line, `the panel still opens with English: "${line}"`);
    assert.match(russian, /[Ѐ-ӿ]/, `"${line}" translates to "${russian}", which is not Russian`);
    assert.doesNotMatch(russian, DASHES, `"${line}"`);
    assert.equal(t(line, undefined, undefined, 'en'), line, 'English is untouched');
  }
  assert.ok(
    PANEL_INTRO[1]!.includes('’'),
    'fixture assumption: the source uses a typographic apostrophe, so the dictionary key must too',
  );
});

test("the panel's opening lines are routed through t(), not rendered as raw JSX text", () => {
  for (const line of PANEL_INTRO) {
    const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      PANEL_SOURCE,
      new RegExp(`\\{t\\('${escaped}'\\)\\}`),
      `MrEzPanel.tsx does not wrap "${line}" in t()`,
    );
    assert.doesNotMatch(
      PANEL_SOURCE,
      new RegExp(`>\\s*${escaped}\\s*<`),
      `MrEzPanel.tsx still renders "${line}" as raw text`,
    );
  }
});

test('the wordmark stays English in the panel: it is a brand, and IELTS is exam vocabulary', async () => {
  await loadDictionary('ru');
  // "Mr EZ" is rendered as a literal, never through the dictionary.
  assert.match(PANEL_SOURCE, /<strong>Mr EZ<\/strong>/, 'the name in the panel header is the wordmark, unwrapped');
  for (const line of PANEL_INTRO) {
    assert.ok(!line.includes('IELTS is EZ'), `the wordmark must not be inside a translatable line: "${line}"`);
  }
  // Where IELTS does appear in a translated panel string, it survives.
  assert.ok(t('Mr EZ, your IELTS tutor', undefined, undefined, 'ru').includes('IELTS'));
});

/* ================================================================== */
/* Coverage: what the shared layer writes, it can say in Russian        */
/* ================================================================== */

/* The files whose CODE writes sentences a student reads. Scanned rather
   than exercised, so a branch no fixture happens to reach is still caught. */
const SHARED_SOURCES = [
  'src/lib/tutor/insights.ts',
  'src/lib/tutor/recommend.ts',
  'src/lib/tutor/catalog.ts',
  'src/lib/tutor/week.ts',
  'src/lib/tutor/units.ts',
  'workers/mr-ez/src/index.ts',
  /* Added with the three learning AI tasks (work package 15). It writes the
     deterministic answers the student reads when no model answered, and the
     Worker runs it, so architecture section 1.6 puts its Russian in
     src/lib/tutor/ru.ts with everything else the Worker says. */
  'src/lib/learning/ai-prompt.ts',
];

/* Where a whole-sentence English template sits in each call that carries
   one. Everything else (a variable, a template literal) is skipped rather
   than guessed at, which is why the guard test below exists. */
const TEMPLATE_CALLS: { fn: string; index: number }[] = [
  { fn: 'tutorText', index: 1 },
  // the builder in insights.ts
  { fn: 'observation', index: 1 },
  // the builder in recommend.ts
  { fn: 'reason', index: 2 },
];

/** Split a call's arguments at top-level commas, respecting nesting and
    quotes. Same approach as the site's own coverage test. */
function readArguments(source: string, start: number): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]!;
    if (quote) {
      current += ch;
      if (ch === '\\') {
        current += source[i + 1] ?? '';
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' && depth === 0) {
      args.push(current);
      return args;
    }
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  return null;
}

/** The value of a plain quoted string literal, or null for anything else. */
function literal(arg: string | undefined): string | null {
  if (arg === undefined) return null;
  const text = arg.trim();
  const quote = text[0];
  if ((quote !== "'" && quote !== '"') || text.length < 2 || text[text.length - 1] !== quote) return null;
  let out = '';
  for (let i = 1; i < text.length - 1; i += 1) {
    const ch = text[i]!;
    if (ch === '\\') {
      const next = text[i + 1];
      out += next === 'n' ? '\n' : next === 't' ? '\t' : (next ?? '');
      i += 1;
      continue;
    }
    if (ch === quote) return null;
    out += ch;
  }
  return out;
}

/** Every plain quoted literal inside one argument expression.

    A template is not always written as a bare literal: insights.ts picks
    between three of them with a nested ternary, which is the clearest way
    to write "measured and worst / measured / tentative" and must not be a
    hole in this scanner. So a plain literal is read whole, and anything
    else has its quoted runs pulled out. Backticks are skipped: a template
    literal is not a translatable key and never should be. */
function literalsIn(arg: string | undefined): string[] {
  if (arg === undefined) return [];
  const whole = literal(arg);
  if (whole !== null) return [whole];

  const out: string[] = [];
  for (let i = 0; i < arg.length; i += 1) {
    const quote = arg[i];
    if (quote !== "'" && quote !== '"') continue;
    let j = i + 1;
    let raw = quote;
    while (j < arg.length) {
      const ch = arg[j]!;
      raw += ch;
      if (ch === '\\') {
        raw += arg[j + 1] ?? '';
        j += 2;
        continue;
      }
      j += 1;
      if (ch === quote) break;
    }
    const value = literal(raw);
    if (value) out.push(value);
    i = j - 1;
  }
  return out;
}

function findCalls(source: string, name: string): string[][] {
  const out: string[][] = [];
  const pattern = new RegExp(`(^|[^A-Za-z0-9_$.])${name}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const callIndex = match.index + match[1]!.length;
    /* The DECLARATION of a helper, not a call to it. Its parameter list is
       types, and a type like Pick<Observation, 'id' | 'kind'> would hand
       this scanner four "sentences" that are really property names. */
    if (/function\s+$/.test(source.slice(0, callIndex))) continue;
    const args = readArguments(source, match.index + match[0].length);
    if (args) out.push(args);
  }
  return out;
}

interface Found {
  key: string;
  file: string;
  kind: 'string' | 'plural';
}

function scanShared(): Found[] {
  const found: Found[] = [];
  for (const rel of SHARED_SOURCES) {
    const source = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

    for (const { fn, index } of TEMPLATE_CALLS) {
      for (const args of findCalls(source, fn)) {
        for (const key of literalsIn(args[index])) found.push({ key, file: rel, kind: 'string' });
      }
    }

    /* Counted phrases are always written as a { one, other } literal, so the
       `other` form can be read off without following the variable it may be
       assigned to first. That is what makes the conditional forms in
       week.ts reachable by a scanner at all. */
    for (const match of source.matchAll(/\bother:\s*('([^']*)'|"([^"]*)")/g)) {
      const key = match[2] ?? match[3];
      if (key) found.push({ key, file: rel, kind: 'plural' });
    }
  }
  return found;
}

/** The catalogue's own labels and blurbs, which are data rather than calls.
    Lesson titles are deliberately excluded: they come from the course
    registry and are translated by the site's dictionary instead. */
function catalogueKeys(): Found[] {
  const found: Found[] = [];
  for (const activity of buildCatalog()) {
    if (activity.kind === 'lesson') continue;
    found.push({ key: activity.label, file: 'src/lib/tutor/catalog.ts', kind: 'string' });
    found.push({ key: activity.blurb, file: 'src/lib/tutor/catalog.ts', kind: 'string' });
  }
  const drill = practiseActivity('practise:reading:tfng');
  assert.ok(drill?.labelTemplate && drill.blurbTemplate, 'a per-type drill must carry its templates');
  found.push({ key: drill!.labelTemplate!, file: 'src/lib/tutor/catalog.ts', kind: 'string' });
  found.push({ key: drill!.blurbTemplate!, file: 'src/lib/tutor/catalog.ts', kind: 'string' });
  return found;
}

test('the coverage scanner finds what it is supposed to find', () => {
  // A guard on the guard: if the scanner silently stops matching, every
  // assertion below goes quiet and the next English sentence ships.
  const keys = new Set(scanShared().map((f) => f.key));
  assert.ok(keys.has('{type} in {skill} is reliably strong.'), 'observation() templates in insights.ts');
  assert.ok(
    keys.has('{type} in {skill} is consistently the weakest question type.'),
    'a template chosen by a ternary is still found',
  );
  assert.ok(
    keys.has("Nothing is on record yet, so this is where today's session starts: {objective}"),
    'reason() templates in recommend.ts',
  );
  // Since 2026-09-22 the eight fixed units are a library, not the
  // student's route (src/lib/learning owns the real plan), so units.ts no
  // longer calls this a "course" or says "Next up": see its wrapText().
  assert.ok(keys.has('That was the last unit in the library.'), 'tutorText() calls in units.ts');
  assert.ok(keys.has('Simulated tutor reply (no AI was called).'), 'tutorText() calls in the Worker');
  assert.ok(keys.has('You completed {n} lessons.'), 'counted phrases written as { one, other } literals');
  assert.ok(
    keys.has('Last week you studied on {n} days out of {planned} planned, for {minutes} in total.'),
    'counted phrases assigned to a variable before use',
  );

  const catalogue = new Set(catalogueKeys().map((f) => f.key));
  assert.ok(catalogue.has('A complete mock exam'), 'fixed catalogue labels');
  assert.ok(catalogue.has('{type} drills in {skill}'), 'the per-type drill template');
});

test('every sentence the shared layer writes has Russian', () => {
  const missing: string[] = [];
  for (const item of [...scanShared(), ...catalogueKeys()]) {
    const where = item.kind === 'plural' ? RU_PLURALS : RU_STRINGS;
    if (!(item.key in where)) {
      missing.push(
        `${item.file}: no Russian for the ${item.kind === 'plural' ? 'counted phrase' : 'sentence'} "${item.key}". ` +
          `Add it to ${item.kind === 'plural' ? 'RU_PLURALS' : 'RU_STRINGS'} in src/lib/tutor/ru.ts.`,
      );
    }
  }
  assert.deepEqual(missing, [], `Untranslated shared-layer text:\n  ${missing.join('\n  ')}`);
});

test('the shared map holds nothing that no longer exists in the code', () => {
  const live = new Set([...scanShared(), ...catalogueKeys()].filter((f) => f.kind === 'string').map((f) => f.key));
  const livePlurals = new Set([...scanShared()].filter((f) => f.kind === 'plural').map((f) => f.key));

  const dead: string[] = [];
  for (const key of Object.keys(RU_STRINGS)) {
    if (!live.has(key)) dead.push(`RU_STRINGS: "${key}" is not written by any shared file any more. Delete it, or restore the English.`);
  }
  for (const key of Object.keys(RU_PLURALS)) {
    if (!livePlurals.has(key)) dead.push(`RU_PLURALS: "${key}" is not written by any shared file any more.`);
  }
  assert.deepEqual(dead, [], `Dead entries in src/lib/tutor/ru.ts:\n  ${dead.join('\n  ')}`);
});

/* ================================================================== */
/* The counted layer, in Russian                                       */
/* ================================================================== */

function plan(overrides: Record<string, unknown> = {}) {
  return { targetBand: '7.0', testDate: '', createdAt: '2026-09-01T00:00:00.000Z', done: [], ...overrides };
}

/** Two reading sittings with True/False/Not Given badly wrong in both: a
    MEASURED weakness, which is what the welcome line is built from. */
function tfngWeaknessProgress() {
  const sitting = (at: string) => ({
    at,
    raw: 20,
    total: 40,
    band: 6,
    bandLabel: '6',
    secondsUsed: 3600,
    kind: 'full' as const,
    skill: 'reading' as const,
    byType: { tfng: { correct: 2, total: 8 } },
  });
  return {
    ...emptyProgress(),
    tests: { r1: [sitting('2026-09-01T09:00:00.000Z')], r2: [sitting('2026-09-05T09:00:00.000Z')] },
  };
}

const NOW = new Date('2026-09-19T12:00:00.000Z');

function insightsFor(progress: unknown, studyPlan: unknown = plan()) {
  return readInsights(progress as never, studyPlan as never, courseLessonCount(buildCourse()), NOW);
}

test('a counted claim and its evidence are written in Russian, with the exam words left in English', () => {
  const insights = insightsFor(tfngWeaknessProgress());
  const weakness = insights.observations.find((o) => o.kind === 'weakness');
  assert.ok(weakness);

  const english = observationText(weakness!, 'en');
  const russian = observationText(weakness!, 'ru');
  assert.equal(english, 'True / False / Not Given in Reading is consistently the weakest question type.');
  assert.notEqual(russian, english);
  assert.match(russian, /[Ѐ-ӿ]/, 'the sentence is in Russian');
  assert.ok(russian.includes('True / False / Not Given'), 'the question type name stays English');
  assert.ok(russian.includes('Reading'), 'the paper name stays English');
  assert.doesNotMatch(russian, DASHES);

  assert.equal(observationEvidence(weakness!, 'en'), '4 of 16 correct across 2 sittings');
  const evidence = observationEvidence(weakness!, 'ru');
  assert.match(evidence, /4 из 16/);
  assert.match(evidence, /2 раза/, 'the Russian plural form follows the count');
});

test('the reason on a recommendation card is Russian, and the activity is unchanged', () => {
  const progress = tfngWeaknessProgress();
  const rec = recommendNext(insightsFor(progress), progress as never);

  const english = recommendationReason(rec, 'en');
  const russian = recommendationReason(rec, 'ru');
  assert.equal(english, rec.fallbackReason);
  assert.notEqual(russian, english);
  assert.match(russian, /[Ѐ-ӿ]/);
  /* CHANGED TWICE, and the rule under test never moved: an exam word inside
     a Russian sentence stays English, so the student recognises it on the
     real paper. Which exam word is in the sentence has moved, because the
     session this card is a view of has moved.
     - Originally the question type name, because the old rule 2 always
       fired on this fixture and named True / False / Not Given.
     - 2026-09-22 (work package 7): the card became a view of the student's
       one session, and with three of the four papers never sampled that
       session went and found out about one of them, so the word was
       Listening.
     - 2026-09-22 (fix round): 4 of 16 True / False / Not Given with Reading
       a band short of a confirmed target is a substantive weakness, and
       unknown pressure no longer outranks one (see
       UNKNOWN_PRESSURE_WITH_KNOWN_WEAKNESS), so the session is Reading and
       the paper name in the sentence is Reading. The fixture is unchanged;
       only the planner's judgement about it is. */
  assert.ok(russian.includes('Reading'), 'the paper name stays English');
  assert.doesNotMatch(russian, DASHES);
});

test('every recommendation rule has a Russian reason, whichever one fires', () => {
  const cases: { label: string; progress: unknown; studyPlan: unknown }[] = [
    { label: 'no goal at all', progress: emptyProgress(), studyPlan: null },
    { label: 'nothing marked yet', progress: emptyProgress(), studyPlan: plan() },
    { label: 'a measured weakness', progress: tfngWeaknessProgress(), studyPlan: plan() },
  ];
  for (const { label, progress, studyPlan } of cases) {
    const rec = recommendNext(insightsFor(progress, studyPlan), progress as never);
    const russian = recommendationReason(rec, 'ru');
    assert.ok(russian.length > 10, `${label} (rule ${rec.rule}): a usable reason`);
    assert.match(russian, /[Ѐ-ӿ]/, `${label} (rule ${rec.rule}): should be Russian`);
    assert.doesNotMatch(russian, DASHES, `${label} (rule ${rec.rule})`);
  }
});

test('a catalogue card is translated, except a lesson title, which is the site dictionary\'s job', () => {
  const mock = buildCatalog().find((a) => a.id === 'test:mock')!;
  assert.equal(activityLabel(mock, 'en'), 'A complete mock exam');
  assert.equal(activityLabel(mock, 'ru'), 'Полный пробный экзамен');
  assert.match(activityBlurb(mock, 'ru'), /[Ѐ-ӿ]/);

  const drill = practiseActivity('practise:reading:tfng')!;
  assert.equal(drill.label, 'True / False / Not Given drills in Reading');
  const russian = activityLabel(drill, 'ru');
  assert.ok(russian.includes('True / False / Not Given') && russian.includes('Reading'), russian);
  assert.match(russian, /Тренировки/);

  const lesson = buildCatalog().find((a) => a.kind === 'lesson')!;
  assert.equal(activityLabel(lesson, 'ru'), lesson.label, 'a lesson title falls through untouched, by design');
});

test('the weekly review written without a model is Russian, numbers and paper names intact', () => {
  const progress = {
    ...emptyProgress(),
    activity: {
      '2026-09-07': { minutes: 25, lessons: 1, attempts: 0 },
      '2026-09-08': { minutes: 35, lessons: 1, attempts: 0 },
      '2026-09-10': { minutes: 40, lessons: 0, attempts: 1 },
    },
    lessons: {
      'reading-tfng': { completedAt: '2026-09-07T09:00:00.000Z' },
      'reading-ynng': { completedAt: '2026-09-08T09:00:00.000Z' },
    },
    tests: {
      'reading-full-001': [
        {
          at: '2026-09-10T09:00:00.000Z',
          raw: 26,
          total: 40,
          band: 6.5,
          bandLabel: '6.5',
          secondsUsed: 3500,
          kind: 'full',
          skill: 'reading',
          byType: { tfng: { correct: 3, total: 10 } },
        },
      ],
    },
  };
  const window = weekWindowFor(new Date('2026-09-10T09:00:00.000Z'), 0);
  const facts = readWeek(progress as never, plan() as never, window, NOW, 0);

  const english = weekFallbackText(facts, 'en');
  assert.match(english, /you studied on 3 days out of 7 planned, for 100 minutes in total\./);

  const russian = weekFallbackText(facts, 'ru');
  assert.match(russian, /[Ѐ-ӿ]/);
  assert.match(russian, /3 дня из 7/);
  assert.match(russian, /100 минут/);
  assert.match(russian, /2 урока/);
  assert.ok(russian.includes('Reading'), 'the paper name stays English');
  assert.match(russian, /6\.5/, 'the band is written as it is');
  assert.doesNotMatch(russian, DASHES);

  // An empty week is kind in both languages.
  const emptyWeek = readWeek(emptyProgress() as never, plan() as never, window, NOW, 0);
  const emptyRussian = weekFallbackText(emptyWeek, 'ru');
  assert.match(emptyRussian, /[Ѐ-ӿ]/);
  assert.doesNotMatch(emptyRussian, DASHES);
});

test('a unit note written without a model is Russian for both kinds', () => {
  const progress = tfngWeaknessProgress();
  const intro = readUnit(5, progress as never, plan() as never, insightsFor(progress))!;
  const introRu = unitFallbackText(intro, 'intro', 'ru');
  assert.match(introRu, /[Ѐ-ӿ]/);
  assert.ok(introRu.includes('True / False / Not Given'), 'the question type name stays English');
  assert.doesNotMatch(introRu, DASHES);

  // Read from the course, not written out: the unit grows when lessons are added.
  const unitOneKeys = COURSE_UNITS[0]!.keys;
  const done = {
    ...emptyProgress(),
    lessons: Object.fromEntries(
      unitOneKeys.map((key, i) => [key, { completedAt: `2026-09-0${Math.min(i + 1, 6)}T09:00:00.000Z` }]),
    ),
  };
  const wrapFacts = readUnit(1, done as never, plan() as never, insightsFor(done))!;
  assert.match(unitFallbackText(wrapFacts, 'wrap', 'en'), new RegExp(`^You finished all ${unitOneKeys.length} lessons in `));
  const wrapRu = unitFallbackText(wrapFacts, 'wrap', 'ru');
  assert.match(wrapRu, new RegExp(`Вы прошли все ${unitOneKeys.length} урок`));
  assert.doesNotMatch(wrapRu, DASHES);
});

/* ================================================================== */
/* Caches must not leak a language                                     */
/* ================================================================== */

test('every fingerprint differs by language, so one is never served in the other', () => {
  const progress = tfngWeaknessProgress();
  const insights = insightsFor(progress);
  assert.notEqual(insightsFingerprint(insights, 'en'), insightsFingerprint(insights, 'ru'));
  assert.equal(insightsFingerprint(insights), insightsFingerprint(insights, 'en'), 'English is the default');

  const window = weekWindowFor(new Date('2026-09-10T09:00:00.000Z'), 0);
  const facts = readWeek(progress as never, plan() as never, window, NOW, 0);
  assert.notEqual(weekFingerprint(facts, 'en'), weekFingerprint(facts, 'ru'));
  assert.equal(weekFingerprint(facts), weekFingerprint(facts, 'en'));

  const unit = readUnit(5, progress as never, plan() as never, insights)!;
  assert.notEqual(unitFingerprint(unit, 'intro', '7.0', 'en'), unitFingerprint(unit, 'intro', '7.0', 'ru'));
  assert.notEqual(unitFingerprint(unit, 'wrap', '7.0', 'en'), unitFingerprint(unit, 'wrap', '7.0', 'ru'));
  assert.equal(unitFingerprint(unit, 'intro', '7.0'), unitFingerprint(unit, 'intro', '7.0', 'en'));
});

/* ================================================================== */
/* Errors                                                              */
/* ================================================================== */

test('the browser has its own wording for every code it knows, and defers on the ones it does not', () => {
  for (const code of [
    'not-configured',
    'sign-in-required',
    'limit-reached',
    'site-limit-reached',
    'too-long',
    'not-found',
    'busy',
    'unavailable',
  ] as const) {
    const message = tutorErrorMessage(code);
    assert.ok(message && message.length > 0, `${code} needs a message of ours`);
  }
  // The Worker's sentence for a bad request is more specific than anything a
  // code could carry ("That unit is not finished yet."), so it wins.
  assert.equal(tutorErrorMessage('bad-request'), null);
  assert.equal(tutorErrorMessage('a-code-from-a-newer-worker' as never), null);
});

test('a Russian student reads a Russian error', async () => {
  await loadDictionary('ru');
  const codes = ['not-configured', 'limit-reached', 'busy', 'unavailable', 'not-found'] as const;
  for (const code of codes) {
    const english = tutorErrorMessage(code, 'en')!;
    const russian = tutorErrorMessage(code, 'ru')!;
    assert.notEqual(russian, english, `${code} should not still be English`);
    assert.match(russian, /[Ѐ-ӿ]/, `${code}: ${russian}`);
    assert.doesNotMatch(russian, DASHES, code);
    assert.ok(russian.includes('Mr EZ'), `${code}: the name is a wordmark and stays as it is`);
  }
  assert.match(tutorErrorMessage('too-long', 'ru')!, /2000/, 'the cap is interpolated after lookup');
});

/* ================================================================== */
/* End to end, through the real Worker handler                         */
/* ================================================================== */

async function run(
  state: FakeState,
  body: unknown,
  envOverrides: Record<string, unknown> = {},
): Promise<{ response: Response; payload: Record<string, unknown>; recorder: Recorder }> {
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const response = await handle(post(body, GOOD_TOKEN), baseEnv(envOverrides));
  const payload = (await response.clone().json()) as Record<string, unknown>;
  return { response, payload, recorder };
}

function stateWithWeakness(): FakeState {
  const state = makeState();
  state.userState[USER_A] = { progress: tfngWeaknessProgress(), study_plan: plan() };
  return state;
}

test('a Russian request asks the model for Russian and still hands it English facts', async () => {
  const state = stateWithWeakness();
  state.openAi = { body: modelReply('Вот что я бы сделал дальше.', 'trainer:writing', 'Потому что.') };
  const { response, recorder } = await run(state, { task: 'chat', message: 'что делать дальше?', locale: 'ru' });
  assert.equal(response.status, 200);

  const sent = recorder.openAiCalls[0]!;
  assert.ok(sent.instructions.includes(RUSSIAN_REPLY_RULES), 'the language rules travelled with the turn');
  assert.ok(sent.instructions.startsWith(MR_EZ_PERSONA), 'and the persona is still first and unchanged');
  /* The record itself is English: the model reads English facts and writes
     Russian prose. Checked fence by fence, because the only Russian that
     may appear anywhere in this message is the student's own question. */
  for (const fence of ['GOALS', 'RESULTS', 'OBSERVATIONS', 'ACTIVITIES']) {
    const block = sent.userText.split(`<<<${fence}`)[1]?.split(`${fence}>>>`)[0];
    assert.ok(block, `the ${fence} block should be in the message`);
    assert.doesNotMatch(block!, /[Ѐ-ӿ]/, `${fence} must stay English`);
  }
  assert.match(sent.userText, /True \/ False \/ Not Given in Reading is consistently the weakest question type\./);
  // The student's own words are the one Russian thing, and they are quoted.
  assert.match(sent.userText.split('<<<STUDENT MESSAGE')[1] ?? '', /что делать дальше\?/);
});

test('an English request is byte-identical to what it was before any of this', async () => {
  const state = stateWithWeakness();
  const { recorder } = await run(state, { task: 'chat', message: 'what next?' });
  const sent = recorder.openAiCalls[0]!;
  assert.equal(sent.instructions, buildInstructions('chat', 'en'));
  assert.doesNotMatch(sent.instructions, /Russian/);
});

test('the two languages are two cache entries, and neither is served for the other', async () => {
  const state = stateWithWeakness();
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));

  await handle(post({ task: 'welcome' }), baseEnv());
  await handle(post({ task: 'welcome' }), baseEnv());
  assert.equal(recorder.openAiCalls.length, 1, 'reopening the dashboard in the same language is free');

  await handle(post({ task: 'welcome', locale: 'ru' }), baseEnv());
  assert.equal(recorder.openAiCalls.length, 2, 'switching language is a new answer, not the old one re-served');

  const again = (await (await handle(post({ task: 'welcome', locale: 'ru' }), baseEnv())).json()) as Record<string, unknown>;
  assert.equal(again.cached, true, 'and the Russian one caches in its own right');
  assert.equal(recorder.openAiCalls.length, 2);
});

test('a unit note cached in one language is not handed back in the other', async () => {
  const state = stateWithWeakness();
  const recorder: Recorder = { openAiCalls: [], urls: [] };
  const handle = createHandler(makeDeps(state, recorder));
  const body = { task: 'unit', unit: { unitId: 5, kind: 'intro' } };

  await handle(post(body), baseEnv());
  await handle(post(body), baseEnv());
  assert.equal(recorder.openAiCalls.length, 1);

  await handle(post({ ...body, locale: 'ru' }), baseEnv());
  assert.equal(recorder.openAiCalls.length, 2, 'the Russian note is written, not borrowed');
  assert.equal(state.notes.length, 1, 'and it replaces the stale row rather than piling up beside it');
});

test('the simulation speaks Russian too, and is no less obviously a simulation', async () => {
  const state = stateWithWeakness();
  const { response, payload } = await run(
    state,
    { task: 'chat', message: 'что дальше?', locale: 'ru' },
    { TUTOR_SIMULATE: 'on', OPENAI_API_KEY: undefined },
  );
  assert.equal(response.status, 200);
  assert.equal(payload.live, false);
  const text = String(payload.text);
  assert.match(text, /Симулированный ответ репетитора/, 'it says it is a simulation, in Russian');
  assert.ok(text.includes('True / False / Not Given'), 'the question type name stays English');
  assert.doesNotMatch(text, DASHES);

  const english = await run(state, { task: 'chat', message: 'what next?' }, { TUTOR_SIMULATE: 'on' });
  assert.match(String(english.payload.text), /Simulated tutor reply \(no AI was called\)\./);
});

test('a recommendation card that comes back from a Russian turn is in Russian', async () => {
  const state = makeState();
  state.userState[USER_A] = { progress: emptyProgress(), study_plan: null };
  const { payload } = await run(state, { task: 'welcome', locale: 'ru' }, { TUTOR_SIMULATE: 'on' });
  const rec = payload.recommendation as Record<string, unknown>;
  /* CHANGED 2026-09-22, personal learning work package 7: a student with no
     goal and nothing recorded used to be sent to /plan-settings. They now
     get the first teaching step of their plan, and the intake asks for the
     goal separately. The card is still Russian and its link is still chosen
     in code, which is what this test is for. A LESSON's label stays English
     on purpose: titles live in the course registry and the browser runs
     them through t() when it renders the card. */
  assert.equal(rec.id, 'lesson:reading-task1');
  assert.equal(rec.href, '/lessons/reading-task1', 'the link is chosen in code and never changes with the language');
  assert.match(String(rec.reason), /[Ѐ-ӿ]/);
});
