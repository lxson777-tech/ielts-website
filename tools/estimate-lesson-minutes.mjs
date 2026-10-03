/* How long a lesson page really takes: the number shown as "25 min" on every
 * lesson, in the course list and in the study calendar.
 *
 *     node --import ./tests/ts-extension-loader.mjs tools/estimate-lesson-minutes.mjs           (print the table)
 *     node --import ./tests/ts-extension-loader.mjs tools/estimate-lesson-minutes.mjs --write   (set every registry's minutes)
 *
 * WHY (Alex, 3 October 2026)
 * --------------------------
 * The minutes on a lesson must be honest for the WHOLE page a student works
 * through, not only the teaching text. Before this, most part lessons
 * counted only the teaching: Reading Yes / No / Not Given said 12 minutes
 * for about 4,000 words plus a set of real test questions.
 *
 * THE RULE, IN PLAIN WORDS
 * ------------------------
 * A lesson's time is the sum of five things on its page:
 *
 *   1. Reading the teaching text. Every English word of the lesson body
 *      (src/content/lesson-bodies/<key>.html), read at 130 words a minute,
 *      a comfortable pace for an English learner reading to understand.
 *      Model answers and worked examples inside the body count as reading.
 *      The words of a "Show Practice Exercise" block do not, because those
 *      are timed as exercise items instead (point 2).
 *   2. Practice exercises written into the body ("Show Practice Exercise",
 *      the gap-fills on every Vocabulary lesson): 1 minute per item.
 *   3. "Practice with real test questions" on a Reading lesson
 *      (src/data/reading-practice.ts): 1.5 minutes per question, which
 *      includes reading that question's share of the passage. A question
 *      with no passage behind it (the warm-up sentences of Spotting
 *      Paraphrase) gets 1 minute.
 *   4. "Practice with real test questions" on a Listening lesson
 *      (src/data/listening-practice.ts): the length of every recording on
 *      the page, played once, plus 0.5 minute per question to read it,
 *      answer it and check it.
 *   5. The worked Band 8 example under a Writing lesson (the task, the
 *      model answer and the examiner's notes): read at 130 words a minute.
 *   6. The practice section of a Speaking lesson, where the page asks the
 *      student to answer out loud: half a minute per Part 1 question (a
 *      Part 1 answer is two or three sentences), 3 minutes per Part 2 cue
 *      card (1 minute to prepare and 2 to talk, as in the exam) and 1 minute
 *      per Part 3 question (think briefly, then 30 to 60 seconds of talk, as
 *      the lesson itself says).
 *
 * Every page also carries the small "Vocabulary quick check" (one word at a
 * time): half a minute.
 *
 * The total is rounded to the nearest 5 minutes, and is never less than 10.
 *
 * Nothing here is measured from students, and nothing is random: the same
 * files always give the same numbers. tests/lesson-minutes.test.ts fails
 * when a registry's minutes no longer match this estimate, so a lesson that
 * grows (a new section, more practice questions) is caught and this script
 * is re-run with --write, followed by `npm run learning:index`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSONS } from '../src/data/lessons.ts';
import { READING_PARTS } from '../src/data/reading.ts';
import { LISTENING_PARTS } from '../src/data/listening.ts';
import { WRITING_PARTS } from '../src/data/writing.ts';
import { SPEAKING_PARTS } from '../src/data/speaking.ts';
import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { READING_PRACTICE } from '../src/data/reading-practice.ts';
import { LISTENING_PRACTICE } from '../src/data/listening-practice.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { getModelAnswers } from '../src/data/model-answers.ts';
import { LESSON_EXAMPLE_VARIANTS } from '../src/lib/access/lesson-examples.server.ts';
import { TRIAL_WRITING } from '../src/lib/trial/offer.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The numbers of the rule above, in one place. */
export const RULE = Object.freeze({
  wordsPerMinute: 130,
  bodyExerciseItemMinutes: 1,
  readingQuestionMinutes: 1.5,
  readingQuestionWithoutPassageMinutes: 1,
  listeningQuestionMinutes: 0.5,
  speakingPart1QuestionMinutes: 0.5,
  speakingCueCardMinutes: 3,
  speakingPart3QuestionMinutes: 1,
  quickCheckMinutes: 0.5,
  roundTo: 5,
  minimum: 10,
});

/** Where each lesson's `minutes` is written, so --write can find it. */
const REGISTRIES = [
  { base: 'reading', file: 'src/data/reading.ts', parts: READING_PARTS },
  { base: 'listening', file: 'src/data/listening.ts', parts: LISTENING_PARTS },
  { base: 'writing', file: 'src/data/writing.ts', parts: WRITING_PARTS },
  { base: 'speaking', file: 'src/data/speaking.ts', parts: SPEAKING_PARTS },
  { base: 'vocabulary', file: 'src/data/vocabulary.ts', parts: VOCABULARY_PARTS },
];
const OVERVIEW_FILE = 'src/data/lessons.ts';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: ' ', rarr: ' ', larr: ' ', mdash: ' ', ndash: ' ', hellip: ' ' };

/** The words a student sees in an HTML fragment. Tags and comments go,
    entities become their character, and a word is any run of characters
    that holds at least one letter or digit (so a lone "/" or "=" is not). */
export function countWords(html) {
  const text = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? ' ');
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Split a lesson body into its teaching text and its "Show Practice
    Exercise" blocks, counting the items (<li>) in those blocks. */
export function splitBody(html) {
  let exerciseItems = 0;
  const teaching = html.replace(/<details\b[^>]*>\s*<summary>\s*Show Practice Exercise\s*<\/summary>[\s\S]*?<\/details>/gi, (block) => {
    exerciseItems += (block.match(/<li\b/gi) ?? []).length;
    return ' ';
  });
  return { teachingWords: countWords(teaching), exerciseItems };
}

/** What a Speaking lesson's practice section (id="practice", to the end of
    the body) asks the student to say out loud: Part 1 question lists
    (.topic-practice), Part 2 cue cards (.cue-card) and Part 3 discussion
    questions (a .passage-box that opens with "Question"). */
export function speakingPractice(html) {
  const at = html.search(/id="practice"/);
  if (at === -1) return { part1Questions: 0, cueCards: 0, part3Questions: 0, minutes: 0 };
  const section = html.slice(at);
  let part1Questions = 0;
  for (const block of section.match(/class="topic-practice"[\s\S]*?<\/ol>/g) ?? []) {
    part1Questions += (block.match(/<li\b/g) ?? []).length;
  }
  const cueCards = (section.match(/class="cue-card"/g) ?? []).length;
  const part3Questions = (section.match(/class="passage-box">\s*<strong>Question/g) ?? []).length;
  const minutes =
    part1Questions * RULE.speakingPart1QuestionMinutes +
    cueCards * RULE.speakingCueCardMinutes +
    part3Questions * RULE.speakingPart3QuestionMinutes;
  return { part1Questions, cueCards, part3Questions, minutes };
}

function bodyHtml(key) {
  return readFileSync(resolve(ROOT, 'src/content/lesson-bodies', `${key}.html`), 'utf8');
}

function readingPractice(slug) {
  const set = READING_PRACTICE[slug];
  if (!set) return { questions: 0, minutes: 0 };
  let questions = 0;
  let minutes = 0;
  for (const unit of set.units) {
    const per = unit.passages?.length ? RULE.readingQuestionMinutes : RULE.readingQuestionWithoutPassageMinutes;
    questions += unit.questions.length;
    minutes += unit.questions.length * per;
  }
  return { questions, minutes };
}

function listeningPractice(slug) {
  const set = LISTENING_PRACTICE[slug];
  if (!set) return { questions: 0, recordingMinutes: 0, minutes: 0 };
  const clips = new Map();
  let questions = 0;
  for (const unit of set.units) {
    questions += unit.questions.length;
    const seg = unit.segment;
    if (!seg) continue;
    if (typeof seg.startSeconds !== 'number' || typeof seg.endSeconds !== 'number') {
      throw new Error(`Listening practice "${slug}" has a recording with no start or end time, so its length is unknown.`);
    }
    clips.set(`${seg.src}|${seg.startSeconds}|${seg.endSeconds}`, seg.endSeconds - seg.startSeconds);
  }
  const recordingMinutes = [...clips.values()].reduce((a, b) => a + b, 0) / 60;
  return { questions, recordingMinutes, minutes: recordingMinutes + questions * RULE.listeningQuestionMinutes };
}

/** The same worked example the Writing lesson page shows (see
    src/lib/access/lesson-examples.server.ts): the first prompt of the
    lesson's variants that has a model answer. */
function writingExampleWords(slug) {
  const variants = LESSON_EXAMPLE_VARIANTS[slug] ?? [];
  for (const prompt of WRITING_PROMPTS) {
    if (prompt.id === TRIAL_WRITING.essayPromptId || !variants.includes(prompt.variant)) continue;
    const model = getModelAnswers(prompt.id)[0];
    if (!model) continue;
    const criteria = Object.values(model.criteria).filter((v) => typeof v === 'string').join(' ');
    return countWords(prompt.promptHtml) + countWords(model.text.join(' ')) + countWords(criteria);
  }
  return 0;
}

export function roundMinutes(raw) {
  return Math.max(RULE.minimum, Math.round(raw / RULE.roundTo) * RULE.roundTo);
}

/** One lesson's estimate, with the pieces that make it up. */
export function estimateLesson(key, skill, slug) {
  const html = bodyHtml(key);
  const { teachingWords, exerciseItems } = splitBody(html);
  const speaking = skill === 'speaking' && slug ? speakingPractice(html) : { part1Questions: 0, cueCards: 0, part3Questions: 0, minutes: 0 };
  const reading = skill === 'reading' && slug ? readingPractice(slug) : { questions: 0, minutes: 0 };
  const listening = skill === 'listening' && slug ? listeningPractice(slug) : { questions: 0, recordingMinutes: 0, minutes: 0 };
  const exampleWords = skill === 'writing' && slug ? writingExampleWords(slug) : 0;
  const parts = {
    teaching: teachingWords / RULE.wordsPerMinute,
    exercises: exerciseItems * RULE.bodyExerciseItemMinutes,
    practice: reading.minutes + listening.minutes + speaking.minutes,
    example: exampleWords / RULE.wordsPerMinute,
    quickCheck: RULE.quickCheckMinutes,
  };
  const raw = Object.values(parts).reduce((a, b) => a + b, 0);
  return {
    key,
    teachingWords,
    exerciseItems,
    practiceQuestions: reading.questions + listening.questions + speaking.part1Questions + speaking.cueCards + speaking.part3Questions,
    recordingMinutes: listening.recordingMinutes,
    exampleWords,
    parts,
    raw,
    minutes: roundMinutes(raw),
  };
}

/** Every lesson in the registries: the five overviews and every part. */
export function estimateAllLessons() {
  const rows = LESSONS.map((l) => ({
    ...estimateLesson(l.slug, l.skill, null),
    file: OVERVIEW_FILE,
    slug: l.slug,
    title: l.title,
    current: l.minutes,
  }));
  for (const { base, file, parts } of REGISTRIES) {
    for (const p of parts) {
      rows.push({
        ...estimateLesson(`${base}-${p.slug}`, base, p.slug),
        file,
        slug: p.slug,
        title: p.title,
        current: p.minutes,
      });
    }
  }
  return rows;
}

/** Replace the `minutes: N` belonging to the entry whose slug is `slug`.
    Entries are object literals, one or several lines long; the minutes
    field is the first one after the slug and before the next slug. */
export function setMinutesInSource(source, slug, minutes) {
  const slugRe = new RegExp(`slug:\\s*'${slug.replace(/[-]/g, '\\-')}'`);
  const match = slugRe.exec(source);
  if (!match) throw new Error(`No entry with slug '${slug}'`);
  const from = match.index + match[0].length;
  const nextSlug = source.slice(from).search(/slug:\s*'/);
  const end = nextSlug === -1 ? source.length : from + nextSlug;
  const window = source.slice(from, end);
  const minutesRe = /minutes:\s*\d+/;
  if (!minutesRe.test(window)) throw new Error(`Entry '${slug}' has no minutes field`);
  return source.slice(0, from) + window.replace(minutesRe, `minutes: ${minutes}`) + source.slice(end);
}

function writeAll(rows) {
  const byFile = new Map();
  for (const row of rows) {
    const list = byFile.get(row.file) ?? [];
    list.push(row);
    byFile.set(row.file, list);
  }
  for (const [file, list] of byFile) {
    const path = resolve(ROOT, file);
    let source = readFileSync(path, 'utf8');
    for (const row of list) source = setMinutesInSource(source, row.slug, row.minutes);
    writeFileSync(path, source);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rows = estimateAllLessons();
  const fmt = (n) => n.toFixed(1).padStart(5);
  console.log('key'.padEnd(36), 'words  items  qs  audio  teach  exer  pract  examp  raw    old  new');
  for (const r of rows) {
    console.log(
      r.key.padEnd(36),
      String(r.teachingWords).padStart(5),
      String(r.exerciseItems).padStart(6),
      String(r.practiceQuestions).padStart(3),
      fmt(r.recordingMinutes),
      fmt(r.parts.teaching),
      fmt(r.parts.exercises),
      fmt(r.parts.practice),
      fmt(r.parts.example),
      fmt(r.raw),
      String(r.current ?? '-').padStart(4),
      String(r.minutes).padStart(4),
    );
  }
  if (process.argv.includes('--write')) {
    writeAll(rows);
    console.log(`\nWrote minutes for ${rows.length} lessons.`);
  }
}
