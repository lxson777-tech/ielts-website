/* The generated learning index: one small file describing everything a
 * personal plan is allowed to schedule.
 *
 *     npm run learning:index
 *
 * WHY IT EXISTS
 * -------------
 * The planner and the Mr EZ Worker both need to know what material exists:
 * which papers contain which question types, which single-part drills come
 * from which paper, which prompts and topics are available, and how long
 * each thing takes. The material itself is far too big to carry. The 70
 * papers under src/data/tests are about 3.7 MB of passages, transcripts,
 * options and answers, and a Cloudflare Worker cannot bundle that.
 *
 * So this script reads the big data once, at build time, and writes
 * src/data/generated/learning-index.json: ids, counts, question types,
 * durations and provenance, and NOTHING a student could read. No passage,
 * no transcript, no question text, no option, no answer, no audio. The
 * index is committed, and tests/learning-index.test.ts fails when the
 * committed copy no longer matches what this script produces, the same way
 * tests/explanations-ru.test.ts guards stale translations.
 *
 * SHAPE AND SIZE
 * --------------
 * The cap is LEARNING_INDEX_MAX_BYTES (262,144 bytes, in
 * src/lib/learning/contracts/catalog.ts).
 *
 * This script builds the COMFORTABLE shape (GeneratedIndexV1: every
 * question id spelled out, every lesson-check item naming its own paper and
 * question), and then writes the COMPACT shape defined in
 * src/lib/learning/index-format.ts. On 22 September 2026, after WP18 to
 * WP22 added 93 focused exercises where 7 had been, the comfortable shape
 * reached 286,068 bytes, over the cap; the compact one is about 175,000,
 * roughly a third under it.
 *
 * Nothing was dropped to get there. The compact file says each fact once
 * (a paper holds q1 to qN, so it writes N; a drill holds a contiguous run,
 * so it writes the first and last number; a drill's id is its paper plus
 * its part, so it writes neither twice), and decodeLearningIndex() puts the
 * comfortable shape back at import. The round-trip is asserted in
 * tests/learning-index.test.ts, which is what makes "compact" different
 * from "incomplete".
 *
 * The FORMATTING is compressed too: a list of plain values and an object
 * whose fields are all plain values each stay on one line, which saves
 * about 30 KB of indentation and line endings.
 *
 * If the data grows past the cap again, compress the shape further before
 * dropping anything the planner needs. The drill titles (about 27 KB of
 * real passage names) and the focused exercises' objective sentences (about
 * 10 KB) are the two biggest remaining blocks, and both are real content
 * that a student reads. Only then raise the cap, and raise it on purpose.
 *
 * DETERMINISM
 * -----------
 * Running this twice on unchanged data must produce identical bytes, or the
 * staleness test becomes noise. So: every list is sorted by a stable key,
 * every object is built in a fixed field order, and there is no timestamp
 * anywhere in the file. `indexVersion` is a hash of the content itself,
 * which is the only version that can be checked rather than trusted.
 *
 * THE VOCABULARY TRAP
 * -------------------
 * src/lib/vocab-review.ts builds its flashcard deck from words.ts PLUS
 * every vocabulary lesson body, and it reads those bodies with
 * import.meta.glob, which only exists under Astro/Vite. Under plain Node it
 * silently falls back to words.ts alone: 146 words across 14 topics instead
 * of 719 across 36. This script runs under plain Node, so it does NOT touch
 * that deck. It reads the 36 lesson bodies off disk itself and asks the
 * pure, exported buildVocabTopicData() for each topic's real word count, so
 * the index always describes the full library. See risk 6 in
 * docs/personal-learning/ARCHITECTURE.md.
 *
 * HOW TO RUN IT
 * -------------
 * The site's data files are TypeScript that import each other without file
 * extensions, which Node cannot resolve on its own, so this runs behind the
 * same loader the test suite uses (see the "test" script in package.json):
 *
 *     node --import ./tests/ts-extension-loader.mjs tools/generate-learning-index.mjs
 *
 * which is exactly what `npm run learning:index` does. The building blocks
 * are exported so tests/learning-index.test.ts runs the very same code,
 * rather than a second copy of it that could drift.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ALL_TESTS } from '../src/data/tests/index.ts';
import { ALL_LISTENING_DRILLS, ALL_READING_DRILLS } from '../src/lib/tests/drills.ts';
import { READING_PRACTICE } from '../src/data/reading-practice.ts';
import { LISTENING_PRACTICE } from '../src/data/listening-practice.ts';
import { READING_PARTS } from '../src/data/reading.ts';
import { LISTENING_PARTS } from '../src/data/listening.ts';
import { QUESTION_TYPE_STRATEGY } from '../src/data/reading-strategies.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { MODEL_ANSWERS } from '../src/data/model-answers.ts';
import { SPEAKING_CUE_CARDS, SPEAKING_PART1_TOPICS } from '../src/data/speaking-prompts.ts';
import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { buildVocabTopicData } from '../src/lib/vocab-review.ts';
import { encodeLearningIndex } from '../src/lib/learning/index-format.ts';
import { segmentLessonBody } from '../src/lib/learning/lesson-blocks.ts';

/* ------------------------------------------------------------------ */
/* Where things live                                                   */
/* ------------------------------------------------------------------ */

export const REPO_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Must stay in step with LEARNING_INDEX_SOURCE in
    src/lib/learning/contracts/catalog.ts. */
export const INDEX_FILE = path.join(REPO_ROOT, 'src', 'data', 'generated', 'learning-index.json');

const LESSON_BODIES_DIR = path.join(REPO_ROOT, 'src', 'content', 'lesson-bodies');

/** The focused exercise registries, both kinds. Read by name at generate
    time: ALL_FOCUSED_EXERCISES when it exists, FOCUSED_EXERCISES otherwise,
    so an older checkout of the data file still indexes. */
const FOCUSED_EXERCISES_FILE = path.join(REPO_ROOT, 'src', 'data', 'focused-exercises.ts');

/** Same length the explanation translations use for their content hashes
    (tools/explanations-ru-lib.mjs): eight bytes, far beyond any chance of a
    collision, short enough to read in a diff. */
const HASH_LENGTH = 16;

/* ------------------------------------------------------------------ */
/* Hashing, the same way everywhere                                    */
/* ------------------------------------------------------------------ */

/** A Windows checkout and a Linux one must hash the same, and an editor
    that saved a byte-order mark must not change a thing's identity. */
function normalise(text) {
  return String(text).replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function shortHash(text) {
  return createHash('sha256').update(normalise(text), 'utf8').digest('hex').slice(0, HASH_LENGTH);
}

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

/** Question counts per type for one collection of parts, with the keys in
    alphabetical order so the written JSON is byte-stable. */
function countByType(parts) {
  const counts = new Map();
  for (const part of parts) {
    for (const group of part.groups) {
      counts.set(group.type, (counts.get(group.type) ?? 0) + group.questions.length);
    }
  }
  const out = {};
  for (const type of [...counts.keys()].sort()) out[type] = counts.get(type);
  return out;
}

function questionIdsOf(parts) {
  const ids = [];
  for (const part of parts) for (const group of part.groups) for (const question of group.questions) ids.push(question.id);
  return ids;
}

/** An imported exam paper, or something this project wrote. Every one of
    the 70 papers carries its publisher's attribution, so in practice this
    always answers 'imported-paper'; the rule is written out so an
    unattributed paper could never quietly pass as official material. */
function paperProvenance(test) {
  return test.source ? 'imported-paper' : 'project-authored';
}

function byId(a, b) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* Full papers                                                         */
/* ------------------------------------------------------------------ */

export function buildTests() {
  return ALL_TESTS.map((test) => ({
    id: test.id,
    skill: test.skill,
    title: test.title,
    byType: countByType(test.parts),
    questionIds: questionIdsOf(test.parts),
    durationMinutes: test.durationMinutes,
    provenance: paperProvenance(test),
  })).sort(byId);
}

/* ------------------------------------------------------------------ */
/* Single-part drills                                                  */
/* ------------------------------------------------------------------ */

export function buildDrills() {
  const sourceById = new Map(ALL_TESTS.map((test) => [test.id, test]));
  return [...ALL_READING_DRILLS, ...ALL_LISTENING_DRILLS]
    .map((drill) => {
      const source = sourceById.get(drill.sourceTestId);
      if (!source) throw new Error(`Drill ${drill.id} names a paper that does not exist: ${drill.sourceTestId}`);
      return {
        id: drill.id,
        sourceTestId: drill.sourceTestId,
        skill: drill.test.skill,
        partNumber: drill.partIndex + 1,
        title: drill.test.title,
        byType: countByType(drill.test.parts),
        questionIds: questionIdsOf(drill.test.parts),
        durationMinutes: drill.test.durationMinutes,
      };
    })
    .sort(byId);
}

/* ------------------------------------------------------------------ */
/* Lesson quick checks (the PracticeQuiz sets)                         */
/* ------------------------------------------------------------------ */

/* A practice question has no id of its own: its position is its name
   (practiceKey in src/lib/i18n/test-explanations.ts). The index carries
   that key plus a content hash, so a rewritten or reordered question is
   detectable instead of silently inheriting the previous question's
   evidence.

   It also carries where the question came from. Every unit except the
   hand-written paraphrase drill is lifted from a real paper and says so in
   its own words ("Academic Reading Test 19, Questions 24 to 28", or for
   listening "Listening Test 12, Part 4, Questions 31 to 34"). Resolving
   that sentence back to the paper gives three things nothing else can: the
   real question type, honest exposure (sitting this check spends those
   paper questions), and proof that the check quotes material that exists.
   The unit's questions are matched to the paper's in order, which is how
   tools/build_reading_practice.py and build_listening_practice.py wrote
   them; the count is checked, so a range that no longer lines up fails
   loudly here rather than mislabelling a question. */
const UNIT_SOURCE_RE = /Test (\d+),(?:\s*Part \d+,)?\s*Questions (\d+) to (\d+)/;

/** The lesson slug each practice set belongs to maps to one subskill, used
    only where a unit has no paper to resolve (the hand-written paraphrase
    drill). Question types are never guessed from the lesson: they come from
    the paper, because five lessons deliberately teach a neighbouring type
    (see section 6.2 of the architecture). */
const HAND_WRITTEN_SUBSKILL = { 'reading/paraphrase': 'paraphrase' };

function paperIdFor(skill, number) {
  return `${skill}-full-${String(number).padStart(3, '0')}`;
}

/** The source sentence for one unit: listening carries it on the audio
    segment, reading on each question. */
function unitSourceText(skill, unit) {
  if (skill === 'listening') return unit.segment?.source ?? null;
  return unit.questions.find((question) => question.source)?.source ?? null;
}

function resolveUnitSource(skill, unit, testsById, label) {
  const text = unitSourceText(skill, unit);
  if (!text) return null;
  const match = UNIT_SOURCE_RE.exec(text);
  if (!match) throw new Error(`${label}: cannot read which paper "${text}" means.`);
  const testId = paperIdFor(skill, Number(match[1]));
  const test = testsById.get(testId);
  if (!test) throw new Error(`${label}: "${text}" points at ${testId}, which does not exist.`);
  const from = Number(match[2]);
  const to = Number(match[3]);
  if (to - from + 1 !== unit.questions.length) {
    throw new Error(
      `${label}: "${text}" covers ${to - from + 1} questions but the unit has ${unit.questions.length}. ` +
        'The exercise and the paper have drifted apart; fix the source line or rebuild the set.',
    );
  }
  const typeByQuestionId = new Map();
  for (const part of test.parts) for (const group of part.groups) for (const question of group.questions) {
    typeByQuestionId.set(question.id, group.type);
  }
  const questions = [];
  for (let n = from; n <= to; n += 1) {
    const questionId = `q${n}`;
    const type = typeByQuestionId.get(questionId);
    if (!type) throw new Error(`${label}: ${testId} has no question ${questionId}.`);
    questions.push({ questionId, type });
  }
  return { testId, questions };
}

/** What identifies one practice question: the prompt a student reads and
    the answer it accepts. Options are deliberately left out, so reordering
    the distractors does not throw away evidence, while changing the
    question or its key does. */
function practiceItemVersion(question) {
  const answer = Array.isArray(question.answer) ? question.answer.join('|') : String(question.answer ?? '');
  return shortHash(`${question.prompt}\n${answer}`);
}

export function buildLessonChecks() {
  const testsById = new Map(ALL_TESTS.map((test) => [test.id, test]));
  const registrySlugs = {
    reading: new Set(READING_PARTS.map((part) => part.slug)),
    listening: new Set(LISTENING_PARTS.map((part) => part.slug)),
  };
  const entries = [];

  for (const [skill, bank] of [['reading', READING_PRACTICE], ['listening', LISTENING_PRACTICE]]) {
    for (const slug of Object.keys(bank).sort()) {
      const label = `${skill}/${slug}`;
      if (!registrySlugs[skill].has(slug)) {
        throw new Error(`Practice set ${label} has no lesson page. Add it to src/data/${skill}.ts or remove the set.`);
      }
      const set = bank[slug];
      const items = [];
      set.units.forEach((unit, unitIndex) => {
        const resolved = resolveUnitSource(skill, unit, testsById, `${label} unit ${unitIndex}`);
        unit.questions.forEach((question, questionIndex) => {
          const from = resolved?.questions[questionIndex];
          const type = from ? from.type : HAND_WRITTEN_SUBSKILL[label];
          if (!type) {
            throw new Error(
              `${label} unit ${unitIndex} has no source paper and no hand-written subskill. ` +
                'Add its source line, or name its subskill in HAND_WRITTEN_SUBSKILL.',
            );
          }
          items.push({
            itemKey: `u${unitIndex}-q${questionIndex}`,
            itemVersion: practiceItemVersion(question),
            type,
            fromImportedPaper: Boolean(resolved),
            sourceTestId: resolved?.testId,
            sourceQuestionId: from?.questionId,
          });
        });
      });
      entries.push({ id: `practice-${skill}-${slug}`, lessonKey: `${skill}-${slug}`, skill, items });
    }
  }
  return entries.sort(byId);
}

/* ------------------------------------------------------------------ */
/* Focused exercises (authored later, in WP18)                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Lesson blocks the exercises point at                                */
/* ------------------------------------------------------------------ */

/* Every focused exercise names the lesson it is built on AND the HEADING of
   the block inside it ("How to Approach It", "The Four Paragraphs"). A
   heading is not a link: the deep links the lesson pages publish are block
   IDS, which are derived at build time from the body's own markup (lead
   decision D2, src/lib/learning/lesson-blocks.ts). Resolving the heading to
   that id here is what lets a session's teach step open the lesson AT the
   part it is about rather than at the top.

   Only the blocks the exercises really reference are resolved: 25 headings
   across 15 lessons, not all 433 blocks in the library. A heading that no
   longer matches resolves to nothing, and the step falls back to the top of
   the lesson, which is a worse link but never a wrong one. The tripwire is
   tests/lesson-blocks.test.ts, which lists every exercise whose heading has
   stopped matching, in English AND in Russian. */

function lessonBodyPath(lessonKey, locale) {
  return locale === 'en'
    ? path.join(LESSON_BODIES_DIR, `${lessonKey}.html`)
    : path.join(LESSON_BODIES_DIR, locale, `${lessonKey}.html`);
}

/** Block id by `<lesson key>\n<heading>`, for the headings passed in. Only
    the English body decides an id: a Russian body's blocks are the same
    blocks by position and carry the same ids (see lesson-blocks.ts). */
export function resolveLessonBlocks(wanted) {
  const byLesson = new Map();
  for (const { lessonKey, heading } of wanted) {
    if (!byLesson.has(lessonKey)) byLesson.set(lessonKey, new Set());
    byLesson.get(lessonKey).add(heading);
  }
  const resolved = new Map();
  for (const lessonKey of [...byLesson.keys()].sort()) {
    const file = lessonBodyPath(lessonKey, 'en');
    if (!existsSync(file)) {
      throw new Error(`A focused exercise names lesson "${lessonKey}", which has no body at ${file}.`);
    }
    const blocks = segmentLessonBody(readFileSync(file, 'utf8'));
    for (const heading of byLesson.get(lessonKey)) {
      const block = blocks.find((entry) => entry.heading === heading);
      if (block) resolved.set(`${lessonKey}\n${heading}`, block.id);
    }
  }
  return resolved;
}

/* An exercise names a real paper, a part and a group, or a real exam prompt
   (see src/data/focused-exercises.ts). Everything below is carried through
   so the catalogue can answer three questions without ever loading a paper
   or a prompt bank: what this exercise is for, which material it would
   spend, and which other activities hold the same questions.

   Two kinds, and the difference matters to every one of those answers. An
   item-answers exercise has real questions with a real key, so it carries
   its item ids and its source paper. A written response has one prompt and
   one piece of the student's own writing, so its single item IS the prompt
   (writtenItemId), and what it would spend is that prompt. */
export async function buildFocusedExercises() {
  if (!existsSync(FOCUSED_EXERCISES_FILE)) return [];
  const module = await import(pathToFileURL(FOCUSED_EXERCISES_FILE).href);
  const authored = module.ALL_FOCUSED_EXERCISES ?? module.FOCUSED_EXERCISES ?? [];
  const writtenItemId = module.writtenItemId ?? ((promptId) => `prompt:${promptId}`);
  const blockIds = resolveLessonBlocks(
    authored
      .filter((exercise) => exercise.lesson)
      .map((exercise) => ({ lessonKey: exercise.lesson.key, heading: exercise.lesson.blockHeading })),
  );
  return authored
    .map((exercise) => {
      const written = exercise.kind === 'written-response';
      const source = exercise.source;
      const entry = {
        id: exercise.id,
        subskill: exercise.subskill,
        paper: exercise.paper,
        itemCount: written ? 1 : exercise.items.length,
        expectedMinutes: exercise.expectedMinutes,
        provenance: exercise.provenance ?? 'project-authored',
        itemIds: written ? [writtenItemId(source.promptId)] : exercise.items.map((item) => item.id),
      };
      if (exercise.kind) entry.kind = exercise.kind;
      if (exercise.role) entry.role = exercise.role;
      if (exercise.objective) entry.objective = exercise.objective;
      if (exercise.lesson) {
        entry.lessonKey = exercise.lesson.key;
        /* Absent, never guessed, when the heading no longer matches. */
        const blockId = blockIds.get(`${exercise.lesson.key}\n${exercise.lesson.blockHeading}`);
        if (blockId) entry.lessonBlockId = blockId;
      }
      if (written) {
        entry.sourcePromptIds = [source.promptId];
        entry.sharesItemsWith = [`write:${source.promptId}`];
      } else if (source?.testId) {
        entry.sourcePaperIds = [source.testId];
        entry.sharesItemsWith = [`test:${source.testId}`, ...(source.drillId ? [`drill:${source.drillId}`] : [])];
      }
      return entry;
    })
    .sort(byId);
}

/* ------------------------------------------------------------------ */
/* Writing prompts                                                     */
/* ------------------------------------------------------------------ */

export function buildWritingPrompts() {
  const bandsByPrompt = new Map();
  for (const model of MODEL_ANSWERS) {
    const bands = bandsByPrompt.get(model.promptId) ?? [];
    bands.push(model.band);
    bandsByPrompt.set(model.promptId, bands);
  }
  return WRITING_PROMPTS.map((prompt) => ({
    id: prompt.id,
    task: prompt.task,
    title: prompt.title,
    form: prompt.variant,
    minWords: prompt.minWords,
    suggestedMinutes: prompt.suggestedMinutes,
    /* Which model answers exist for this prompt, by band. A pilot that
       teaches from a contrast between two models needs to know there is
       more than one before it offers the comparison. */
    modelAnswerBands: [...(bandsByPrompt.get(prompt.id) ?? [])].sort((a, b) => a - b),
    provenance: prompt.source ? 'publisher' : 'project-authored',
  })).sort(byId);
}

/* ------------------------------------------------------------------ */
/* Speaking prompts                                                    */
/* ------------------------------------------------------------------ */

export function buildSpeakingPrompts() {
  const part1 = SPEAKING_PART1_TOPICS.map((topic) => ({
    id: topic.id,
    part: 1,
    topic: topic.topic,
    questionCount: topic.questions.length,
    provenance: 'project-authored',
  }));
  /* A cue card is one two-minute talk (so questionCount is 1, the thing the
     student actually does in Part 2) and carries its own Part 3 follow-ups,
     counted separately because Part 3 is scheduled as its own objective. */
  const part2 = SPEAKING_CUE_CARDS.map((card) => ({
    id: card.id,
    part: 2,
    topic: card.topic,
    questionCount: 1,
    part3QuestionCount: card.part3Questions.length,
    provenance: 'project-authored',
  }));
  return [...part1, ...part2].sort(byId);
}

/* ------------------------------------------------------------------ */
/* Vocabulary topics                                                   */
/* ------------------------------------------------------------------ */

/** Every vocabulary lesson body on disk, slug to raw HTML, sorted. Read
    here rather than through src/lib/vocab-review.ts's card deck, which
    under plain Node sees only words.ts (see the header). */
export function readVocabularyFragments() {
  const files = readdirSync(LESSON_BODIES_DIR)
    .filter((name) => /^vocabulary-[a-z0-9-]+\.html$/.test(name))
    .sort();
  return files.map((name) => ({
    slug: /^vocabulary-([a-z0-9-]+)\.html$/.exec(name)[1],
    raw: readFileSync(path.join(LESSON_BODIES_DIR, name), 'utf8'),
  }));
}

export function buildVocabTopics() {
  const bySlug = new Map(VOCABULARY_PARTS.map((part) => [part.slug, part]));
  const topics = readVocabularyFragments().map(({ slug, raw }) => {
    const part = bySlug.get(slug);
    if (!part) {
      throw new Error(`There is a vocabulary lesson body for "${slug}" but no topic in src/data/vocabulary.ts.`);
    }
    const data = buildVocabTopicData(raw, slug, part.title);
    return { slug, title: part.title, wordCount: data.wordCount, lessonKey: `vocabulary-${slug}` };
  });
  const found = new Set(topics.map((topic) => topic.slug));
  for (const part of VOCABULARY_PARTS) {
    if (!found.has(part.slug)) {
      throw new Error(`Vocabulary topic "${part.slug}" has no lesson body at ${LESSON_BODIES_DIR}.`);
    }
  }
  return topics.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

/* ------------------------------------------------------------------ */
/* Question-type coverage, including the types with no material        */
/* ------------------------------------------------------------------ */

/* QUESTION_TYPE_STRATEGY is a Record<QuestionType, ...>, so TypeScript
   itself guarantees it names every type in the schema's union. That makes
   its keys the one enumeration that cannot fall behind when a type is
   added, which matters because the whole point of this section is to state
   plainly which types have NO questions in any paper. */
export function buildQuestionTypeCoverage() {
  const blank = () => ({ questions: 0, papers: 0, drills: 0 });
  const coverage = new Map();
  for (const type of Object.keys(QUESTION_TYPE_STRATEGY)) {
    coverage.set(type, { reading: blank(), listening: blank() });
  }
  const note = (skill, type, field, amount) => {
    if (!coverage.has(type)) {
      throw new Error(
        `The papers contain a question type "${type}" that is not in the schema's union. ` +
          'Add it to QuestionType in src/lib/tests/schema.ts first.',
      );
    }
    coverage.get(type)[skill][field] += amount;
  };

  for (const test of ALL_TESTS) {
    const counts = countByType(test.parts);
    for (const [type, n] of Object.entries(counts)) {
      note(test.skill, type, 'questions', n);
      note(test.skill, type, 'papers', 1);
    }
  }
  for (const drill of [...ALL_READING_DRILLS, ...ALL_LISTENING_DRILLS]) {
    for (const type of Object.keys(countByType(drill.test.parts))) {
      note(drill.test.skill, type, 'drills', 1);
    }
  }

  return [...coverage.keys()].sort().map((type) => {
    const entry = coverage.get(type);
    const absent = entry.reading.questions === 0 && entry.listening.questions === 0;
    return { type, absent, reading: entry.reading, listening: entry.listening };
  });
}

/* ------------------------------------------------------------------ */
/* The whole index                                                     */
/* ------------------------------------------------------------------ */

export async function buildLearningIndex() {
  const body = {
    version: 1,
    indexVersion: '',
    tests: buildTests(),
    drills: buildDrills(),
    lessonChecks: buildLessonChecks(),
    focusedExercises: await buildFocusedExercises(),
    writingPrompts: buildWritingPrompts(),
    speakingPrompts: buildSpeakingPrompts(),
    vocabTopics: buildVocabTopics(),
    questionTypes: buildQuestionTypeCoverage(),
  };
  /* The version IS the content: hash the file as it would be written with
     the field blank, then fill it in. Nothing else can be checked rather
     than trusted, and a timestamp here would make the file impossible to
     reproduce. The hash is taken over the COMPACT rendering, because that
     is what is committed and what a reader downloads. */
  body.indexVersion = shortHash(render(encodeLearningIndex(body)));
  return body;
}

/* ------------------------------------------------------------------ */
/* Writing it out                                                      */
/* ------------------------------------------------------------------ */

/** JSON that a person can still read in a diff, and a machine reproduces
    byte for byte.
 *
 *  Two things stay on one line, which together save about 70 KB of pure
 *  indentation and line endings and cost no information at all:
 *    - a list of plain values (question ids, model bands);
 *    - an object whose every field is a plain value (a byType tally, one
 *      lesson-check item, one vocabulary topic).
 *  Anything with a list or an object inside it is indented as usual, so
 *  the file still reads as a document rather than a wall.
 *
 *  Keys are written in the order they were built, never re-sorted here, so
 *  field order lives with the field. */
function render(value, depth = 0) {
  const pad = '  '.repeat(depth);
  const padInner = '  '.repeat(depth + 1);
  const isPlain = (item) => item === null || typeof item !== 'object';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(isPlain)) return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
    return `[\n${value.map((item) => padInner + render(item, depth + 1)).join(',\n')}\n${pad}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined);
    if (keys.length === 0) return '{}';
    if (keys.every((key) => isPlain(value[key]))) {
      return `{ ${keys.map((key) => `${JSON.stringify(key)}: ${JSON.stringify(value[key])}`).join(', ')} }`;
    }
    const fields = keys.map((key) => `${padInner}${JSON.stringify(key)}: ${render(value[key], depth + 1)}`);
    return `{\n${fields.join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}

/** The exact bytes of the committed file, for the index the caller built.
    The argument is the comfortable shape; the file is the compact one. */
export function serialiseIndex(index) {
  return `${render(encodeLearningIndex(index))}\n`;
}

/* ------------------------------------------------------------------ */
/* Command line                                                        */
/* ------------------------------------------------------------------ */

export function summarise(index) {
  const lessonCheckItems = index.lessonChecks.reduce((n, entry) => n + entry.items.length, 0);
  const absent = index.questionTypes.filter((entry) => entry.absent).map((entry) => entry.type);
  return [
    `index version ${index.indexVersion}`,
    `${index.tests.length} papers, ${index.drills.length} drills`,
    `${index.lessonChecks.length} lesson checks (${lessonCheckItems} items)`,
    `${index.focusedExercises.length} focused exercises`,
    `${index.writingPrompts.length} writing prompts, ${index.speakingPrompts.length} speaking prompts`,
    `${index.vocabTopics.length} vocabulary topics (${index.vocabTopics.reduce((n, t) => n + t.wordCount, 0)} words)`,
    absent.length
      ? `question types with no questions in any paper: ${absent.join(', ')}`
      : 'every question type in the schema occurs in at least one paper',
  ].join('\n');
}

const runDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  const index = await buildLearningIndex();
  const text = serialiseIndex(index);
  mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
  writeFileSync(INDEX_FILE, text, 'utf8');
  console.log(summarise(index));
  console.log(`wrote ${path.relative(REPO_ROOT, INDEX_FILE)} (${Buffer.byteLength(text, 'utf8')} bytes)`);
}
