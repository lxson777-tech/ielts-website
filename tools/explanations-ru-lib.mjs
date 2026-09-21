/* The rules a translated set of answer explanations has to obey, in one
 * place.
 *
 * Background
 * ----------
 * Every practice test in src/data/tests/<id>.ts carries, on most of its
 * forty questions, an `explanation`: the short "why this is the answer"
 * note a student reads after submitting. A handful of grouped questions
 * carry an `explanationHtml` instead, shown once under the whole group.
 * Those notes are TEACHING, not exam material, so a Russian student
 * should read them in Russian. The passage, the transcript, the question,
 * the options and the answer itself all stay English (see
 * docs/EXPLANATION-TRANSLATION-BRIEF.md).
 *
 * The Russian lives in its own file per test, src/data/tests/ru/<id>.json,
 * published as a static file and fetched only when a Russian-locale
 * student actually reaches a review screen. Nothing at runtime checks that
 * such a file still matches the English it was translated from: a missing
 * or unknown key simply falls back to English, and an out-of-date entry is
 * still shown, because a slightly outdated Russian note beats an English
 * one for this audience. That is exactly why this module exists. Every
 * mistake a translator can make that a machine can see, a machine sees
 * here, before it reaches a student.
 *
 * It is plain Node with no dependencies, so tools/explanations-ru.mjs and
 * tests/explanations-ru.test.ts run the same code. Change a rule once.
 *
 * The file format
 * ---------------
 *   {
 *     "id": "reading-full-001",
 *     "locale": "ru",
 *     "entries": {
 *       "r1-q1": { "sha": "3f2a9c17c0d411ab", "ru": "…" },
 *       "group:r3-q31": { "sha": "8c0d11ab3f2a9c17", "ru": "<p>…</p>" }
 *     }
 *   }
 *
 * A key is either a question id (for that question's `explanation`) or
 * "group:" plus the id of a group's FIRST question (for that group's
 * `explanationHtml`). `sha` is the first 16 hex characters of the sha256
 * of the English note it was translated from, which is what makes
 * staleness visible: edit an English explanation and every translation of
 * it stops matching, so `check` and `npm test` go red while the site keeps
 * showing the old Russian.
 *
 * A file may be partial. Untranslated questions simply have no key, and
 * the student reads those notes in English.
 *
 * The rules, in the order they are reported:
 *   1. the file parses as JSON, is UTF-8 with no byte-order mark, and has
 *      the shape above, with `id` matching the file name;
 *   2. every key is a real entry of that test (a typo is silent at
 *      runtime, which is the worst kind of mistake);
 *   3. every `sha` matches the English as it stands today;
 *   4. every `ru` has Cyrillic in it (nobody pasted the English back);
 *   5. no em dash, en dash, figure dash or horizontal bar, the house rule
 *      shared with the interface dictionary and the lesson bodies;
 *   6. quoted English evidence survives: anything the English note quotes
 *      in double quotes, the exam words TRUE / FALSE / NOT GIVEN / YES /
 *      NO, and the answer itself when the English note names it;
 *   7. an `explanationHtml` translation keeps the same tags in the same
 *      order (it is dropped into the page as HTML).
 *
 * What it deliberately does NOT check is whether the Russian is any good.
 * That is docs/EXPLANATION-TRANSLATION-BRIEF.md's job.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* Registers the resolve hooks that let Node import the site's .ts modules
   with their extensionless specifiers, exactly as the focused tests do.
   Node 22.18+/24 strips the types themselves with no flag. Imported for
   the side effect only, and before any test module is loaded. */
import '../tests/ts-extension-loader.mjs';

/* Shared with the lesson-body checker rather than written twice: the same
   tolerant HTML scanner, used here only for the handful of grouped
   explanations that are HTML. */
import { tokenize, structure, describe, collapse } from './lesson-ru-lib.mjs';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DATA_DIR = path.join(REPO_ROOT, 'src', 'data');
export const TESTS_DIR = path.join(DATA_DIR, 'tests');
export const RU_DIR = path.join(TESTS_DIR, 'ru');

/** The two kinds of thing that carry explanations share one file format,
    one checker and one runtime loader, and differ only in where their
    English lives and how a note is keyed inside it:

      a practice TEST   src/data/tests/<id>.ts, keyed by question id
      a practice SET    the lesson pages' exercises, keyed by position

    A practice set's id is this prefix, the skill, and the key it has in
    READING_PRACTICE / LISTENING_PRACTICE, e.g. "practice-reading-tfng".
    That is also the file name under src/data/tests/ru/, so everything
    translated lives in one folder and is published by one route. */
export const PRACTICE_PREFIX = 'practice-';

/** The prefix marking an entry as a whole group's `explanationHtml`
    rather than one question's `explanation`. Must stay in step with
    GROUP_KEY_PREFIX in src/lib/i18n/test-explanations.ts. */
export const GROUP_KEY_PREFIX = 'group:';

/** How much of the sha256 goes in the file. Sixteen hex characters is
    eight bytes: far beyond any chance of two different explanations
    colliding, and short enough to read in a diff. */
export const SHA_LENGTH = 16;

/** The exam words that stay upper-case English inside a Russian sentence.
    Longest first, so "NOT GIVEN" is found before "NO". */
export const EXAM_TOKENS = ['NOT GIVEN', 'TRUE', 'FALSE', 'YES', 'NO'];

/* ------------------------------------------------------------------ */
/* Reading tests off disk                                              */
/* ------------------------------------------------------------------ */

/** Windows checkouts and Linux ones must hash the same, and an editor that
    saved a BOM must not change the identity of a string. */
export function normalise(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** The identity of one English explanation. */
export function hashEnglish(english) {
  return crypto.createHash('sha256').update(normalise(english), 'utf8').digest('hex').slice(0, SHA_LENGTH);
}

export function russianPath(testId) {
  return path.join(RU_DIR, `${testId}.json`);
}

export function isPracticeId(id) {
  return id.startsWith(PRACTICE_PREFIX);
}

/** Every practice test id in the repo, sorted. `index.ts` is the registry,
    not a test, and `ru` is a directory. */
export function testIds() {
  return fs
    .readdirSync(TESTS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && e.name !== 'index.ts')
    .map((e) => e.name.replace(/\.ts$/, ''))
    .sort();
}

/** Every test id that has a Russian file. Empty if nobody has started. */
export function translatedIds() {
  if (!fs.existsSync(RU_DIR)) return [];
  return fs
    .readdirSync(RU_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name.replace(/\.json$/, ''))
    .sort();
}

const loaded = new Map();

/**
 * Load one test module. These are big (a full test with its passages is
 * 60 KB or more), so each is loaded once per process and kept.
 *
 * Only ever called from Node: the tool and the test suite. Nothing here
 * reaches a browser bundle.
 */
export async function loadTest(testId) {
  if (loaded.has(testId)) return loaded.get(testId);
  const file = path.join(TESTS_DIR, `${testId}.ts`);
  if (!fs.existsSync(file)) throw new Error(`There is no test called "${testId}" in src/data/tests/.`);
  const mod = await import(pathToFileURL(file).href);
  /* The reading tests default-export their object and the listening ones
     export it by name (listeningFull001). Take whichever one is there,
     rather than making the importer care. */
  const test = [mod.default, ...Object.values(mod)].find(
    (value) => value && typeof value === 'object' && typeof value.id === 'string' && Array.isArray(value.parts),
  );
  if (!test) {
    throw new Error(
      `src/data/tests/${testId}.ts exports nothing that looks like a practice test ` +
        '(an object with an "id" and a "parts" array).',
    );
  }
  if (test.id !== testId) {
    throw new Error(`src/data/tests/${testId}.ts holds a test whose id is "${test.id}". They must match.`);
  }
  loaded.set(testId, test);
  return test;
}

/* The two lesson-page exercise banks, loaded once. LISTENING_PRACTICE is
   a module augmentation of the reading one's types, so both are read the
   same way. */
let practiceBanks = null;

async function loadPracticeBanks() {
  if (practiceBanks) return practiceBanks;
  const reading = await import(pathToFileURL(path.join(DATA_DIR, 'reading-practice.ts')).href);
  const listening = await import(pathToFileURL(path.join(DATA_DIR, 'listening-practice.ts')).href);
  practiceBanks = [
    { skill: 'reading', sets: reading.READING_PRACTICE ?? {} },
    { skill: 'listening', sets: listening.LISTENING_PRACTICE ?? {} },
  ];
  return practiceBanks;
}

/** Every practice-set id, e.g. "practice-reading-tfng", sorted. */
export async function practiceIds() {
  const banks = await loadPracticeBanks();
  return banks
    .flatMap(({ skill, sets }) => Object.keys(sets).map((key) => `${PRACTICE_PREFIX}${skill}-${key}`))
    .sort();
}

/** One lesson-page exercise set by id. */
export async function loadPracticeSet(id) {
  const banks = await loadPracticeBanks();
  for (const { skill, sets } of banks) {
    const prefix = `${PRACTICE_PREFIX}${skill}-`;
    if (!id.startsWith(prefix)) continue;
    const set = sets[id.slice(prefix.length)];
    if (set) return { id, skill, set };
  }
  throw new Error(
    `There is no practice set called "${id}". Its name is "${PRACTICE_PREFIX}", the skill, ` +
      'and the key it has in READING_PRACTICE or LISTENING_PRACTICE, e.g. practice-reading-tfng.',
  );
}

/* ------------------------------------------------------------------ */
/* What there is to translate                                          */
/* ------------------------------------------------------------------ */

/** Plain readable text from a snippet of question HTML. */
export function plain(html) {
  return collapse(
    String(html ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"'),
  );
}

/** The printed answer for one question, as a student would write it. */
export function answerText(question) {
  if (question.multiSelect) return question.multiSelect.correctValues.join(', ');
  return Array.isArray(question.answer) ? question.answer.join(' / ') : String(question.answer ?? '');
}

/** The question as it appears on the paper, for the translator's
    template. A blank in a table or on a diagram has no printed stem of
    its own, so say so rather than printing an empty string. */
export function questionPrompt(question, group) {
  if (question.textHtml) return plain(question.textHtml);
  if (question.before || question.after) {
    return collapse(`${plain(question.before)} ______ ${plain(question.after)}`);
  }
  if (group.type === 'table-completion') return '(a blank in the table above the questions)';
  if (group.type === 'diagram-labelling') return '(a numbered label on the diagram)';
  return '(no printed stem)';
}

/**
 * Every translatable note in a test, in the order a student meets them.
 *
 * Each entry carries everything the template and the checker need:
 *
 *   key       the id this note is stored under in the Russian file
 *   kind      'explanation' (plain text) or 'explanationHtml' (HTML)
 *   english   the note itself
 *   sha       its identity, the thing that goes stale
 *   number    the question number on the paper (1 to 40)
 *   prompt    the question as printed
 *   answer    the printed answer
 *   type      the question type, e.g. 'tfng'
 *   partLabel e.g. 'Passage 1' or 'Section 2'
 */
export function collectEntries(test) {
  const entries = [];
  let n = 0;
  for (const part of test.parts ?? []) {
    for (const group of part.groups ?? []) {
      const first = group.questions?.[0];
      for (const question of group.questions ?? []) {
        n += 1;
        if (!question.explanation) continue;
        entries.push({
          key: question.id,
          kind: 'explanation',
          english: question.explanation,
          sha: hashEnglish(question.explanation),
          number: n,
          prompt: questionPrompt(question, group),
          answer: answerText(question),
          evidence: question.evidence ?? '',
          instruction: plain(group.instructionHtml),
          type: group.type,
          partLabel: part.label,
          groupTitle: group.title,
        });
      }
      if (group.explanationHtml && first) {
        entries.push({
          key: `${GROUP_KEY_PREFIX}${first.id}`,
          kind: 'explanationHtml',
          english: group.explanationHtml,
          sha: hashEnglish(group.explanationHtml),
          number: n - (group.questions.length - 1),
          prompt: plain(group.instructionHtml),
          answer: (group.choices ?? [])
            .filter((c) => (Array.isArray(first.answer) ? first.answer : [first.answer]).includes(c.value))
            .map((c) => c.value)
            .join(', ') || answerText(first),
          type: group.type,
          partLabel: part.label,
          groupTitle: group.title,
        });
      }
    }
  }
  return entries;
}

/**
 * Every translatable note in one lesson-page exercise set.
 *
 * A practice question has no id of its own: the set is a plain list of
 * units, each a list of questions, generated from the test bank by
 * tools/build_reading_practice.py. So a note is keyed by where it sits,
 * "u0-q3" being the fourth question of the first unit. Those keys are
 * stable as long as nobody reorders a set, and the sha is what catches it
 * if somebody does: regenerate the bank and every moved question's
 * English stops matching, which turns `check` and `npm test` red.
 *
 * Must stay in step with practiceKey() in
 * src/lib/i18n/test-explanations.ts, which does the same arithmetic in
 * the browser.
 */
export function collectPracticeEntries({ id, skill, set }) {
  const entries = [];
  let n = 0;
  set.units.forEach((unit, ui) => {
    unit.questions.forEach((question, qi) => {
      n += 1;
      if (!question.explanation) return;
      const answer = Array.isArray(question.answer) ? question.answer[0] : question.answer;
      const option = (question.options ?? []).find((o) => o.value === answer);
      entries.push({
        key: `u${ui}-q${qi}`,
        kind: 'explanation',
        english: question.explanation,
        sha: hashEnglish(question.explanation),
        number: n,
        prompt: plain(question.prompt),
        answer: option?.label ?? String(answer ?? ''),
        type: question.kind,
        partLabel: `${skill} · ${set.title}`,
        groupTitle: unit.passages?.[0]?.title ?? unit.intro ?? '',
      });
    });
  });
  return entries;
}

/** Everything translatable in one id, whichever kind it names. */
export async function loadEntries(id) {
  if (isPracticeId(id)) return collectPracticeEntries(await loadPracticeSet(id));
  return collectEntries(await loadTest(id));
}

/** Every id that could be translated, tests then practice sets. */
export async function allIds() {
  return [...testIds(), ...(await practiceIds())];
}

/** How many characters of English a test has to translate. */
export function englishChars(entries) {
  return entries.reduce((sum, e) => sum + e.english.length, 0);
}

/* ------------------------------------------------------------------ */
/* Reading a Russian file                                              */
/* ------------------------------------------------------------------ */

/**
 * Parse one Russian file's raw text.
 *
 * Returns `{ ok, file, problems }`. Everything past a parse failure would
 * be noise, so a broken file returns with `file` null and one clear
 * problem naming the line.
 */
export function parseRussian(testId, raw) {
  const problems = [];
  if (raw.startsWith('\uFEFF')) {
    problems.push(
      'the file starts with a byte-order mark. Save it as UTF-8 without a BOM: JSON.parse ' +
        'refuses it, so the whole test would silently fall back to English.',
    );
    return { ok: false, file: null, problems };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    problems.push(
      `this is not valid JSON, so nothing in it can be used: ${error.message}. ` +
        'A stray trailing comma and an unescaped double quote inside a string are the two ' +
        'usual causes.',
    );
    return { ok: false, file: null, problems };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    problems.push('the file must be a JSON object with "id", "locale" and "entries".');
    return { ok: false, file: null, problems };
  }
  if (parsed.id !== testId) {
    problems.push(
      `"id" must be "${testId}", the name of the file. It reads ${JSON.stringify(parsed.id ?? null)}.`,
    );
  }
  if (parsed.locale !== 'ru') {
    problems.push(`"locale" must be "ru". It reads ${JSON.stringify(parsed.locale ?? null)}.`);
  }
  if (!parsed.entries || typeof parsed.entries !== 'object' || Array.isArray(parsed.entries)) {
    problems.push('"entries" must be an object of question id to { "sha": …, "ru": … }.');
    return { ok: false, file: null, problems };
  }

  return { ok: problems.length === 0, file: parsed, problems };
}

/* ------------------------------------------------------------------ */
/* The rules                                                           */
/* ------------------------------------------------------------------ */

const DASH_NAMES = {
  '\u2012': 'figure dash',
  '\u2013': 'en dash',
  '\u2014': 'em dash',
  '\u2015': 'horizontal bar',
};

function checkDashes(key, russian, problems) {
  const found = russian.match(/[\u2012-\u2015]/g);
  if (!found) return;
  const which = [...new Set(found)].map((c) => DASH_NAMES[c]).join(' and ');
  problems.push(
    `${key}: contains an ${which}. Dashes of this kind are not used anywhere on this site. ` +
      'Use a comma, a full stop, a colon or brackets, or rewrite the sentence.',
  );
}

function checkCyrillic(key, russian, problems) {
  if (!/[\u0400-\u04FF]/.test(russian)) {
    problems.push(
      `${key}: there is no Cyrillic in this note at all. It looks like the English was ` +
        'copied across without being translated.',
    );
  }
}

/** Quoted runs in a note.
 *
 * The imported explanations quote the passage with curly SINGLE quotes
 * (‘struggle to navigate through the mass of plants’), and occasionally
 * with double ones, so both are recognised.
 *
 * The single-quote pattern is written to survive an apostrophe inside the
 * quotation, which is the same character as the closing quote: it opens
 * only on ‘ (never used as an apostrophe) and closes on the first ’ that
 * is not followed by a letter. "the ‘world’s worst weed’" therefore reads
 * as one span, not two. */
export function quotedSpans(text) {
  const out = [];
  const patterns = [/[“"]([^“”"]{1,400})[”"]/g, /‘([\s\S]{1,400}?)’(?![a-zA-Z])/g];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const inner = collapse(m[1]);
      if (inner.length < 3) continue;
      // Only English evidence has to survive. A quotation the translator
      // wrote in Russian is theirs to phrase.
      if (/[\u0400-\u04FF]/.test(inner)) continue;
      if (!/[a-zA-Z]/.test(inner)) continue;
      out.push(inner);
    }
  }
  return out;
}

/** True when `needle` occurs in `hay`, ignoring case and how the text was
    wrapped or spaced. */
function containsLoose(hay, needle) {
  return collapse(hay).toLowerCase().includes(collapse(needle).toLowerCase());
}

/**
 * Words that stay English inside the Russian sentence.
 *
 * Three separate rules, each chosen so a correct translation cannot trip
 * it:
 *
 *   - every English phrase the note QUOTES must still be there, quoted.
 *     This is the evidence from the passage or the recording, and a
 *     student matches it against the text in front of them;
 *   - TRUE / FALSE / NOT GIVEN and YES / NO are printed on the paper in
 *     those words, so a note that names one must still name it;
 *   - the answer itself, when the English note spells it out. Held back
 *     for short answers (a paragraph letter, a roman numeral, a four
 *     letter word that a Russian sentence could legitimately drop) so the
 *     rule never fires on anything but a real omission.
 */
function checkEnglishKept(entry, russian, problems) {
  const english = entry.english;

  for (const span of quotedSpans(english)) {
    if (containsLoose(russian, span)) continue;
    problems.push(
      `${entry.key}: the English note quotes "${span.slice(0, 80)}", and the Russian does not. ` +
        'Words quoted from the passage, the recording or the question stay in English inside ' +
        'the Russian sentence: the student has to find them in the text in front of them.',
    );
    return; // one report per entry is enough to act on
  }

  for (const token of EXAM_TOKENS) {
    const inEnglish = new RegExp(`\\b${token}\\b`).test(english);
    if (!inEnglish) continue;
    if (new RegExp(`\\b${token}\\b`).test(russian)) continue;
    problems.push(
      `${entry.key}: the English note says ${token} and the Russian does not. ` +
        'TRUE, FALSE, NOT GIVEN, YES and NO are printed on the paper in those words and ' +
        'are never translated.',
    );
    return;
  }

  /* Held back deliberately for:
       - short answers (a paragraph letter, a roman numeral, a four letter
         word a Russian sentence could legitimately drop);
       - the verdict words, where "true" in the middle of an English
         sentence is ordinary prose as often as it is the answer. Those
         are covered by the upper-case rule above instead, which cannot
         misfire. */
  const answer = collapse(entry.answer);
  const isVerdict = EXAM_TOKENS.includes(answer.toUpperCase());
  const worthChecking =
    !isVerdict &&
    /[a-zA-Z]/.test(answer) &&
    !/[\u0400-\u04FF]/.test(answer) &&
    (answer.length >= 5 || (answer.length >= 4 && answer.includes(' ')));
  if (worthChecking && containsLoose(english, answer) && !containsLoose(russian, answer)) {
    problems.push(
      `${entry.key}: the English note names the answer, "${answer}", and the Russian does not. ` +
        'The answer is exam material and is written in English inside the Russian sentence.',
    );
  }
}

/** A translated `explanationHtml` is dropped into the page as HTML, so it
    has to carry the same tags in the same order as the English. */
function checkHtmlShape(entry, russian, problems) {
  const en = structure(tokenize(entry.english)).map((tk) => `${tk.kind}:${tk.name ?? ''}`);
  const ru = structure(tokenize(russian)).map((tk) => `${tk.kind}:${tk.name ?? ''}`);
  if (en.join(' ') === ru.join(' ')) return;
  const at = en.findIndex((v, i) => ru[i] !== v);
  const enTokens = structure(tokenize(entry.english));
  const ruTokens = structure(tokenize(russian));
  problems.push(
    `${entry.key}: this note is HTML and its tags must match the English one for one. ` +
      `English has ${en.length} tags, the Russian has ${ru.length}. ` +
      `The first difference is at tag ${at === -1 ? Math.min(en.length, ru.length) : at + 1}: ` +
      `English ${describe(enTokens[at === -1 ? Math.min(en.length, ru.length) : at])}, ` +
      `Russian ${describe(ruTokens[at === -1 ? Math.min(en.length, ru.length) : at])}.`,
  );
}

/* ------------------------------------------------------------------ */
/* The one entry point                                                 */
/* ------------------------------------------------------------------ */

/**
 * Check one test's Russian explanations against the English test.
 *
 * `entries` is what collectEntries() returned for that test; `raw` is the
 * Russian file's contents. Returns
 * `{ id, ok, counts, stale, unknown, problems }`, where every problem is
 * a full sentence naming the key and what to do. No exceptions, no
 * printing: the command line and the test format the same list their own
 * way.
 *
 * A PARTIAL file is not a failure. Anything not yet translated is read in
 * English by the student, which is the state the whole site was in before
 * this existed. Only something WRONG fails.
 */
export function validateExplanations({ id, entries, raw }) {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  const { file, problems } = parseRussian(id, raw);
  const counts = { total: entries.length, translated: 0, stale: 0, unknown: 0, missing: entries.length };

  if (!file) return { id, ok: false, counts, stale: 0, unknown: 0, problems };

  const staleKeys = [];
  const unknownKeys = [];

  for (const [key, value] of Object.entries(file.entries)) {
    const entry = byKey.get(key);
    if (!entry) {
      unknownKeys.push(key);
      problems.push(
        `"${key}" is not a question of ${id}. Either the id is mistyped, or the question it ` +
          'belonged to was renamed. A key nothing matches is silent at runtime, so it is ' +
          'reported here instead. Run `template` again for the current list of ids.',
      );
      continue;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      problems.push(`${key}: every entry must be an object { "sha": …, "ru": … }.`);
      continue;
    }
    const russian = value.ru;
    if (typeof russian !== 'string' || russian.trim() === '') {
      problems.push(`${key}: "ru" must be a non-empty string holding the Russian note.`);
      continue;
    }
    if (typeof value.sha !== 'string' || !/^[0-9a-f]{16}$/.test(value.sha)) {
      problems.push(
        `${key}: "sha" must be the sixteen hex characters printed by \`template\`, which is ` +
          `${entry.sha} for this question today. It reads ${JSON.stringify(value.sha ?? null)}.`,
      );
      continue;
    }

    counts.translated += 1;

    if (value.sha !== entry.sha) {
      staleKeys.push(key);
      problems.push(
        `${key}: stale. The English explanation has changed since this was translated. ` +
          `The file records ${value.sha}, the English now hashes to ${entry.sha}. ` +
          'The student still sees this Russian note, which is the right trade for a small ' +
          'edit and the wrong one for a rewritten answer, so re-read the English, bring the ' +
          'Russian up to date, and put the new sha in.',
      );
      // A stale entry is still checked for everything else: it is on
      // screen, so its dashes and its English evidence still matter.
    }

    checkCyrillic(key, russian, problems);
    checkDashes(key, russian, problems);
    checkEnglishKept(entry, russian, problems);
    if (entry.kind === 'explanationHtml') checkHtmlShape(entry, russian, problems);
  }

  counts.stale = staleKeys.length;
  counts.unknown = unknownKeys.length;
  counts.missing = counts.total - counts.translated;

  return { id, ok: problems.length === 0, counts, stale: staleKeys.length, unknown: unknownKeys.length, problems };
}

/** Read the English and its Russian file off disk and check them. */
export async function checkId(id) {
  const empty = { total: 0, translated: 0, stale: 0, unknown: 0, missing: 0 };
  let entries;
  try {
    entries = await loadEntries(id);
  } catch (error) {
    return { id, ok: false, counts: empty, stale: 0, unknown: 0, problems: [error.message] };
  }
  if (!fs.existsSync(russianPath(id))) {
    return {
      id,
      ok: false,
      counts: empty,
      stale: 0,
      unknown: 0,
      problems: [`there is no translation at src/data/tests/ru/${id}.json yet.`],
    };
  }
  return validateExplanations({ id, entries, raw: fs.readFileSync(russianPath(id), 'utf8') });
}

/** One row per test and per practice set: how much is translated, and how
    much has gone stale. */
export async function statusReport() {
  const translated = new Set(translatedIds());
  const rows = [];
  for (const id of await allIds()) {
    const entries = await loadEntries(id);
    const chars = englishChars(entries);
    if (!translated.has(id)) {
      rows.push({
        id,
        state: 'missing',
        total: entries.length,
        done: 0,
        stale: 0,
        unknown: 0,
        chars,
      });
      continue;
    }
    const result = validateExplanations({
      id,
      entries,
      raw: fs.readFileSync(russianPath(id), 'utf8'),
    });
    const { translated: done, stale, unknown, total } = result.counts;
    let state = 'partial';
    if (!result.ok && done === 0) state = 'broken';
    else if (stale > 0) state = 'stale';
    else if (done >= total && total > 0) state = 'translated';
    rows.push({ id, state, total, done, stale, unknown, chars });
  }
  return rows;
}

/**
 * The skeleton a translator fills in, with everything needed to write one
 * note without opening the 60 KB test file: the question as printed, the
 * correct answer, the English note and its sha.
 *
 * `ru` starts empty. Fill it in, delete the helper fields (everything
 * beginning with an underscore; the checker ignores them either way, and
 * the published file carries only the Russian), and save it as
 * src/data/tests/ru/<id>.json.
 */
export async function buildTemplate(id) {
  const entries = {};
  for (const entry of await loadEntries(id)) {
    entries[entry.key] = {
      sha: entry.sha,
      ru: '',
      _number: entry.number,
      _part: entry.partLabel,
      _type: entry.type,
      _instruction: entry.instruction || undefined,
      _question: entry.prompt,
      _answer: entry.answer,
      _evidence: entry.evidence || undefined,
      _english: entry.english,
    };
  }
  return { id, locale: 'ru', entries };
}

/**
 * The shape the site actually publishes: the Russian and nothing else.
 *
 * The sha and the translator's helper fields are for the checker and for
 * whoever reads the diff. A student downloads the notes, so the route at
 * src/pages/data/test-explanations/[locale]/[id].json.ts reduces each file
 * to this first. Roughly a third smaller, and it makes the runtime type a
 * plain string map with nothing to unwrap.
 *
 * Written here rather than in the route so that the test can assert the
 * published shape is exactly what the runtime reads.
 */
export function toPublished(file) {
  const entries = {};
  for (const [key, value] of Object.entries(file.entries ?? {})) {
    if (value && typeof value.ru === 'string' && value.ru.trim() !== '') entries[key] = value.ru;
  }
  return { id: file.id, locale: file.locale, entries };
}
