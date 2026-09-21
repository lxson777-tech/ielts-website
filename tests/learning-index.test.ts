/* The generated learning index, and the boundary that keeps it necessary.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-index.test.ts
 * The whole suite is `npm test`, which globs tests/*.test.ts.
 *
 * Five things are checked here, and each of them fails for a different
 * reason:
 *
 * 1. The committed src/data/generated/learning-index.json is exactly what
 *    tools/generate-learning-index.mjs produces from the data as it stands.
 *    Add a paper, reword a practice question, write a vocabulary topic, and
 *    this goes red until `npm run learning:index` is run, the same way
 *    tests/explanations-ru.test.ts goes red on a stale translation.
 * 2. It is small, and it carries no content. The whole reason it exists is
 *    that the real material is 3.7 MB and a Cloudflare Worker cannot hold
 *    it.
 * 3. Everything it names is real: every paper, drill, lesson-check item,
 *    prompt and topic resolves to a record in the site's own data.
 * 4. The question-type counts are the truth, including the types with no
 *    questions at all. A "practise your weak type" link that dead-ends is
 *    worse than no link, so the absent types are stated rather than left to
 *    be discovered.
 * 5. Nothing under src/lib/learning/ imports the big data or touches a
 *    browser API. That boundary is the only thing keeping the Worker
 *    bundle small, and it is invisible until it is broken, which is
 *    exactly why it is asserted.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  INDEX_FILE,
  REPO_ROOT,
  buildLearningIndex,
  serialiseIndex,
} from '../tools/generate-learning-index.mjs';

import {
  LEARNING_INDEX_MAX_BYTES,
  LEARNING_INDEX_PATH,
  LEARNING_INDEX_SOURCE,
} from '../src/lib/learning/contracts/catalog.ts';

import { ALL_TESTS } from '../src/data/tests/index.ts';
import { ALL_LISTENING_DRILLS, ALL_READING_DRILLS } from '../src/lib/tests/drills.ts';
import { READING_PRACTICE } from '../src/data/reading-practice.ts';
import { LISTENING_PRACTICE } from '../src/data/listening-practice.ts';
import { QUESTION_TYPE_STRATEGY } from '../src/data/reading-strategies.ts';
import { WRITING_PROMPTS } from '../src/data/writing-prompts.ts';
import { MODEL_ANSWERS } from '../src/data/model-answers.ts';
import { SPEAKING_CUE_CARDS, SPEAKING_PART1_TOPICS } from '../src/data/speaking-prompts.ts';
import { VOCABULARY_PARTS } from '../src/data/vocabulary.ts';
import { CARD_SET } from '../src/lib/vocab-review.ts';

const committedText = readFileSync(INDEX_FILE, 'utf8');
const index = JSON.parse(committedText);

const REGENERATE =
  'Run `npm run learning:index` and commit src/data/generated/learning-index.json.';

/* ------------------------------------------------------------------ */
/* 1. The committed file is not stale                                  */
/* ------------------------------------------------------------------ */

/** The first line the two copies disagree on, so a red test names the
    change instead of leaving a developer to diff 8,000 lines by hand. */
function firstDifference(committed: string, fresh: string): string {
  const left = committed.split('\n');
  const right = fresh.split('\n');
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if (left[i] !== right[i]) {
      return `first difference at line ${i + 1}:\n  committed: ${left[i] ?? '(end of file)'}\n  fresh:     ${right[i] ?? '(end of file)'}`;
    }
  }
  return 'the lines are identical, so the difference is in the line endings or a trailing newline';
}

test('the committed index is exactly what the generator produces today', async () => {
  const fresh = serialiseIndex(await buildLearningIndex());
  if (fresh !== committedText) {
    const freshVersion = JSON.parse(fresh).indexVersion;
    assert.fail(
      `src/data/generated/learning-index.json no longer matches the site's data. ${REGENERATE}\n` +
        (freshVersion === index.indexVersion
          ? 'The version stamps match, so the committed file was edited by hand rather than regenerated.\n'
          : `committed version ${index.indexVersion}, fresh version ${freshVersion}.\n`) +
        firstDifference(committedText, fresh),
    );
  }
});

test('running the generator twice produces identical bytes', async () => {
  const once = serialiseIndex(await buildLearningIndex());
  const twice = serialiseIndex(await buildLearningIndex());
  assert.equal(once, twice, 'the generator is not deterministic, so the staleness check above is noise');
});

test('the index version is a hash of the content, and there is no timestamp', () => {
  assert.match(index.indexVersion, /^[0-9a-f]{16}$/);
  assert.equal(index.generatedAt, undefined, 'a run timestamp would make the file impossible to reproduce');
});

test('the contract constants point at this file and this route', () => {
  assert.equal(LEARNING_INDEX_SOURCE, path.relative(REPO_ROOT, INDEX_FILE).replace(/\\/g, '/'));
  /* Astro prefixes page routes with the site base at build time, so the
     stored path is unprefixed and callers apply withBase(). The route file
     is what puts it at this URL. */
  const route = path.join(REPO_ROOT, 'src', 'pages', `${LEARNING_INDEX_PATH.replace(/^\//, '')}.ts`);
  assert.ok(statSync(route).isFile(), `${LEARNING_INDEX_PATH} has no endpoint at ${route}`);
});

/* ------------------------------------------------------------------ */
/* 2. Small, and carrying no content                                   */
/* ------------------------------------------------------------------ */

test('the index stays under its size cap', () => {
  const bytes = Buffer.byteLength(committedText, 'utf8');
  assert.ok(
    bytes < LEARNING_INDEX_MAX_BYTES,
    `the index is ${bytes} bytes, over the ${LEARNING_INDEX_MAX_BYTES} byte cap. ` +
      'Compress the shape (question ids are derivable from a from/to pair) rather than dropping ' +
      'anything the planner needs, and raise the cap only on purpose.',
  );
});

test('no passage, transcript, question, option or answer reached the index', () => {
  /* The longest string in the file is a drill name that quotes its
     passage's title (159 characters today). Anything much longer than that
     would be real content, which is the one thing this file may never
     hold. */
  const tooLong: string[] = [];
  const walk = (value: unknown, where: string): void => {
    if (typeof value === 'string') {
      if (value.length > 300) tooLong.push(`${where} (${value.length} characters)`);
    } else if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) walk(inner, `${where}.${key}`);
    }
  };
  walk(index, 'index');
  assert.deepEqual(tooLong, []);

  for (const banned of ['promptHtml', 'transcriptHtml', 'paragraphs', 'explanation', 'audioSrc']) {
    assert.ok(!committedText.includes(`"${banned}"`), `the index carries a "${banned}" field`);
  }
});

/* ------------------------------------------------------------------ */
/* 3. Everything the index names is real                               */
/* ------------------------------------------------------------------ */

const testsById = new Map(ALL_TESTS.map((t) => [t.id, t]));

function questionIdsOfTest(testId: string): Set<string> {
  const paper = testsById.get(testId);
  const ids = new Set<string>();
  for (const part of paper?.parts ?? []) for (const group of part.groups) for (const q of group.questions) ids.add(q.id);
  return ids;
}

test('every paper in the index is a real paper, with its real questions', () => {
  assert.equal(index.tests.length, ALL_TESTS.length);
  for (const entry of index.tests) {
    const paper = testsById.get(entry.id);
    assert.ok(paper, `the index names a paper that does not exist: ${entry.id}`);
    assert.equal(entry.skill, paper.skill);
    assert.equal(entry.durationMinutes, paper.durationMinutes);
    const real = questionIdsOfTest(entry.id);
    assert.equal(entry.questionIds.length, real.size, `${entry.id} question count`);
    for (const id of entry.questionIds) assert.ok(real.has(id), `${entry.id} has no question ${id}`);
    const total = Object.values(entry.byType).reduce((n: number, v) => n + (v as number), 0);
    assert.equal(total, entry.questionIds.length, `${entry.id}: byType and questionIds disagree`);
  }
});

test('every drill in the index is a real drill, sharing its questions with a real paper', () => {
  const drillsById = new Map([...ALL_READING_DRILLS, ...ALL_LISTENING_DRILLS].map((d) => [d.id, d]));
  assert.equal(index.drills.length, drillsById.size);
  for (const entry of index.drills) {
    const drill = drillsById.get(entry.id);
    assert.ok(drill, `the index names a drill that does not exist: ${entry.id}`);
    assert.equal(entry.sourceTestId, drill.sourceTestId);
    assert.equal(entry.partNumber, drill.partIndex + 1);
    assert.equal(entry.durationMinutes, drill.test.durationMinutes);
    const fromPaper = questionIdsOfTest(entry.sourceTestId);
    assert.ok(fromPaper.size > 0, `${entry.id} names a paper that does not exist: ${entry.sourceTestId}`);
    for (const id of entry.questionIds) {
      assert.ok(fromPaper.has(id), `${entry.id} claims question ${id}, which ${entry.sourceTestId} does not have`);
    }
    assert.ok(entry.questionIds.length > 0, `${entry.id} has no questions`);
  }
});

test('every drill of every paper is indexed, so "unseen material" can be counted', () => {
  for (const paper of ALL_TESTS) {
    const indexed = index.drills.filter((d: { sourceTestId: string }) => d.sourceTestId === paper.id);
    assert.equal(indexed.length, paper.parts.length, `${paper.id} has ${paper.parts.length} parts but ${indexed.length} drills`);
  }
});

test('every lesson check in the index is a real exercise set, item for item', () => {
  const banks: [string, Record<string, { units: { questions: unknown[] }[] }>][] = [
    ['reading', READING_PRACTICE],
    ['listening', LISTENING_PRACTICE],
  ];
  const expected = banks.flatMap(([skill, bank]) => Object.keys(bank).map((slug) => `practice-${skill}-${slug}`));
  assert.deepEqual([...index.lessonChecks.map((c: { id: string }) => c.id)].sort(), [...expected].sort());

  for (const entry of index.lessonChecks) {
    const bank = entry.skill === 'reading' ? READING_PRACTICE : LISTENING_PRACTICE;
    const slug = entry.id.replace(`practice-${entry.skill}-`, '');
    const set = bank[slug];
    assert.ok(set, `${entry.id} names an exercise set that does not exist`);
    assert.equal(entry.lessonKey, `${entry.skill}-${slug}`);

    /* Positional identity: the key IS the question's place in the set (see
       practiceKey in src/lib/i18n/test-explanations.ts), so the index must
       name every position and invent none. */
    const keys: string[] = [];
    set.units.forEach((unit, ui) => unit.questions.forEach((_, qi) => keys.push(`u${ui}-q${qi}`)));
    assert.deepEqual(entry.items.map((item: { itemKey: string }) => item.itemKey), keys, `${entry.id} item keys`);

    for (const item of entry.items) {
      assert.match(item.itemVersion, /^[0-9a-f]{16}$/, `${entry.id} ${item.itemKey} content hash`);
      assert.equal(item.fromImportedPaper, item.sourceTestId !== undefined);
      if (item.sourceTestId) {
        const real = questionIdsOfTest(item.sourceTestId);
        assert.ok(real.size > 0, `${entry.id} ${item.itemKey} names a paper that does not exist`);
        assert.ok(
          real.has(item.sourceQuestionId),
          `${entry.id} ${item.itemKey} claims ${item.sourceTestId} ${item.sourceQuestionId}, which does not exist`,
        );
      }
    }
  }
});

test('a lesson check is typed from the paper it quotes, not from the lesson it sits on', () => {
  /* The matching-sentence-endings lesson's own check is built from ten real
     questions that the papers label `sentence-completion`, because no paper
     contains a sentence-endings group at all (see the coverage test below).
     Reading the type off the lesson would have recorded ten pieces of
     evidence about a type the student has never actually met. */
  const endings = index.lessonChecks.find((c: { id: string }) => c.id === 'practice-reading-matching-sentence-endings');
  assert.ok(endings, 'the matching-sentence-endings lesson check is missing');
  assert.ok(endings.items.length > 0);
  for (const item of endings.items) assert.notEqual(item.type, 'sentence-endings');

  /* And the one hand-written set, which quotes no paper, is typed by what
     it teaches instead. */
  const paraphrase = index.lessonChecks.find((c: { id: string }) => c.id === 'practice-reading-paraphrase');
  assert.ok(paraphrase);
  for (const item of paraphrase.items) {
    assert.equal(item.type, 'paraphrase');
    assert.equal(item.fromImportedPaper, false);
  }
});

test('every writing prompt in the index is a real prompt with its real model answers', () => {
  const byId = new Map(WRITING_PROMPTS.map((p) => [p.id, p]));
  assert.equal(index.writingPrompts.length, WRITING_PROMPTS.length);
  for (const entry of index.writingPrompts) {
    const prompt = byId.get(entry.id);
    assert.ok(prompt, `the index names a writing prompt that does not exist: ${entry.id}`);
    assert.equal(entry.task, prompt.task);
    assert.equal(entry.form, prompt.variant);
    assert.equal(entry.minWords, prompt.minWords);
    const bands = MODEL_ANSWERS.filter((m) => m.promptId === entry.id).map((m) => m.band).sort((a, b) => a - b);
    assert.deepEqual(entry.modelAnswerBands, bands, `${entry.id} model answer bands`);
  }
});

test('every speaking prompt in the index is a real topic or cue card', () => {
  const part1 = new Map(SPEAKING_PART1_TOPICS.map((t) => [t.id, t]));
  const cueCards = new Map(SPEAKING_CUE_CARDS.map((c) => [c.id, c]));
  assert.equal(index.speakingPrompts.length, part1.size + cueCards.size);
  for (const entry of index.speakingPrompts) {
    if (entry.part === 1) {
      const topic = part1.get(entry.id);
      assert.ok(topic, `the index names a Part 1 topic that does not exist: ${entry.id}`);
      assert.equal(entry.questionCount, topic.questions.length);
      assert.equal(entry.part3QuestionCount, undefined);
    } else {
      const card = cueCards.get(entry.id);
      assert.ok(card, `the index names a cue card that does not exist: ${entry.id}`);
      assert.equal(entry.questionCount, 1, 'a cue card is one two-minute talk');
      assert.equal(entry.part3QuestionCount, card.part3Questions.length);
    }
  }
});

/* ------------------------------------------------------------------ */
/* 3b. Vocabulary: the count that differs between Node and the build   */
/* ------------------------------------------------------------------ */

test('the index sees every vocabulary topic, not only the ones plain Node can see', () => {
  /* WHICH NUMBER THIS ASSERTS, AND WHY.
   *
   * There are three different vocabulary counts in this repo and they are
   * all correct about different things:
   *
   *   36 topics / 718 words  the lesson library: what the 36 vocabulary
   *                          lesson bodies teach (35 topics of 20 words
   *                          plus conjunctions, which has 18). THIS is
   *                          what the index carries and what this test
   *                          asserts, because it is what a plan can
   *                          schedule: a topic is a page a student opens.
   *   719 words / 36 topics  the flashcard deck (CARD_SET in
   *                          src/lib/vocab-review.ts) in the REAL Astro
   *                          build: words.ts merged with every lesson
   *                          body and deduplicated by word, which is one
   *                          more than 718 because the two sets overlap
   *                          imperfectly.
   *   146 words / 14 topics  that same deck under PLAIN NODE, which is
   *                          what this test runner is. vocab-review.ts
   *                          reads the lesson bodies with
   *                          import.meta.glob, a Vite feature that does
   *                          not exist here, so it silently falls back to
   *                          words.ts alone.
   *
   * The trap (risk 6 in docs/personal-learning/ARCHITECTURE.md) is that a
   * generator run under Node would index 14 topics and look fine. So the
   * generator reads the 36 lesson bodies off disk itself, and the check
   * below is that the index is NOT the crippled Node view. The exact
   * totals are pinned by the staleness test at the top of this file
   * rather than hard-coded here, so writing a new topic does not need
   * this number edited too. */
  assert.equal(index.vocabTopics.length, VOCABULARY_PARTS.length);
  assert.equal(index.vocabTopics.length, 36, 'the vocabulary library is 36 topics');

  const slugs = index.vocabTopics.map((t: { slug: string }) => t.slug).sort();
  assert.deepEqual(slugs, VOCABULARY_PARTS.map((p) => p.slug).sort());

  const total = index.vocabTopics.reduce((n: number, t: { wordCount: number }) => n + t.wordCount, 0);
  assert.ok(
    total > CARD_SET.length,
    `the index indexed ${total} words, no more than the ${CARD_SET.length} plain Node can see. ` +
      'The generator has fallen back to the words.ts-only card set instead of reading the lesson bodies.',
  );
  for (const topic of index.vocabTopics) {
    assert.ok(topic.wordCount >= 18, `${topic.slug} teaches only ${topic.wordCount} words`);
    assert.equal(topic.lessonKey, `vocabulary-${topic.slug}`);
  }
});

/* ------------------------------------------------------------------ */
/* 4. Question-type coverage, present and absent                       */
/* ------------------------------------------------------------------ */

/** Questions per type per skill, counted here from the papers themselves so
    the index is compared with the data and not with itself. */
function countTypes() {
  const counts: Record<string, Record<string, number>> = { reading: {}, listening: {} };
  const papers: Record<string, Record<string, Set<string>>> = { reading: {}, listening: {} };
  for (const paper of ALL_TESTS) {
    for (const part of paper.parts) {
      for (const group of part.groups) {
        counts[paper.skill][group.type] = (counts[paper.skill][group.type] ?? 0) + group.questions.length;
        (papers[paper.skill][group.type] ??= new Set()).add(paper.id);
      }
    }
  }
  return { counts, papers };
}

test('every question type in the schema is in the index, with the real counts', () => {
  const schemaTypes = Object.keys(QUESTION_TYPE_STRATEGY).sort();
  assert.deepEqual(index.questionTypes.map((t: { type: string }) => t.type), schemaTypes);

  const { counts, papers } = countTypes();
  for (const entry of index.questionTypes) {
    for (const skill of ['reading', 'listening'] as const) {
      assert.equal(entry[skill].questions, counts[skill][entry.type] ?? 0, `${entry.type} ${skill} questions`);
      assert.equal(entry[skill].papers, papers[skill][entry.type]?.size ?? 0, `${entry.type} ${skill} papers`);
    }
  }
});

test('a type with no drill cannot be offered as practice, and the index says which', () => {
  const drillTypes = { reading: new Set<string>(), listening: new Set<string>() };
  for (const drill of [...ALL_READING_DRILLS, ...ALL_LISTENING_DRILLS]) {
    for (const group of drill.test.parts[0].groups) drillTypes[drill.test.skill].add(group.type);
  }
  for (const entry of index.questionTypes) {
    for (const skill of ['reading', 'listening'] as const) {
      assert.equal(
        entry[skill].drills > 0,
        drillTypes[skill].has(entry.type),
        `${entry.type} ${skill}: the index and the real drills disagree about whether it can be practised`,
      );
    }
  }
});

test('sentence-endings has no questions in any of the 70 papers, and is marked absent', () => {
  /* Verified from the data, not taken on trust: the architecture's section
     6.2 expected zero and zero is what the papers contain. The type is in
     the schema union, it has a label, a strategy, a lesson page and a tutor
     catalogue entry, and nothing to practise. */
  const endings = index.questionTypes.find((t: { type: string }) => t.type === 'sentence-endings');
  assert.ok(endings, 'sentence-endings is missing from the index');
  assert.equal(endings.absent, true);
  assert.deepEqual(endings.reading, { questions: 0, papers: 0, drills: 0 });
  assert.deepEqual(endings.listening, { questions: 0, papers: 0, drills: 0 });

  const absent = index.questionTypes.filter((t: { absent: boolean }) => t.absent).map((t: { type: string }) => t.type);
  assert.deepEqual(absent, ['sentence-endings'], 'the list of types with no material anywhere has changed');
});

test('a type absent from one skill is still marked present overall', () => {
  /* tfng, yes-no-notgiven, matching-headings and paragraph-matching are
     Reading-only, and diagram-labelling is Listening-only. `absent` means
     "nowhere at all", so none of these is absent; the per-skill zero is
     what a listening plan reads. */
  for (const type of ['tfng', 'yes-no-notgiven', 'matching-headings', 'paragraph-matching']) {
    const entry = index.questionTypes.find((t: { type: string }) => t.type === type);
    assert.equal(entry.absent, false, `${type} exists in Reading`);
    assert.equal(entry.listening.questions, 0, `${type} does not occur in Listening`);
  }
  const diagram = index.questionTypes.find((t: { type: string }) => t.type === 'diagram-labelling');
  assert.equal(diagram.absent, false);
  assert.equal(diagram.reading.questions, 0, 'diagram-labelling does not occur in Reading');
});

/* ------------------------------------------------------------------ */
/* 5. The import boundary under src/lib/learning/                      */
/* ------------------------------------------------------------------ */

const LEARNING_DIR = path.join(REPO_ROOT, 'src', 'lib', 'learning');

/** The three modules that pull in the 3.70 MiB of passages and
    transcripts, as absolute paths with forward slashes. */
const BANNED_MODULES = [
  'src/data/tests',
  'src/lib/tests/drills',
  'src/lib/plan/schedule',
].map((relative) => path.join(REPO_ROOT, relative).replace(/\\/g, '/'));

const BROWSER_GLOBALS = ['window', 'document', 'localStorage', 'fetch'];

function learningFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return learningFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Source with its comments removed, and again with its string contents
    blanked out.
 *
 *  Both passes matter. The imports live inside strings, so the import scan
 *  needs them kept; the browser globals must not be found inside a comment
 *  explaining the rule (contracts/index.ts names all four) nor inside an
 *  error message, so the identifier scan needs both gone. A small state
 *  machine rather than a regex, because `//` inside a string is not a
 *  comment. A regular expression literal cannot begin with `//` (that is an
 *  empty regex, which is not valid JavaScript), so there is no ambiguity to
 *  resolve here. */
function splitSource(source: string): { withStrings: string; bare: string } {
  let withStrings = '';
  let bare = '';
  let i = 0;
  const push = (text: string, keep: boolean) => {
    withStrings += text;
    bare += keep ? text : ' '.repeat(text.length);
  };
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    const quote = source[i];
    if (quote === '"' || quote === "'" || quote === '`') {
      let j = i + 1;
      while (j < source.length && source[j] !== quote) j += source[j] === '\\' ? 2 : 1;
      push(source.slice(i, Math.min(j + 1, source.length)), false);
      i = j + 1;
      continue;
    }
    push(source[i]!, true);
    i += 1;
  }
  return { withStrings, bare };
}

function importedSpecifiers(source: string): string[] {
  const found: string[] = [];
  const re = /\b(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) found.push(match[1]!);
  return found;
}

/** Everything wrong with one file, given its path and its source. Taking
    the source as an argument rather than reading it is what lets the
    self-check below run this very function over deliberately bad code
    without writing a file anywhere. */
function breaches(file: string, source: string): string[] {
  const where = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  const { withStrings, bare } = splitSource(source);
  const found: string[] = [];

  for (const specifier of importedSpecifiers(withStrings)) {
    if (!specifier.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(file), specifier).replace(/\\/g, '/').replace(/\.tsx?$/, '');
    if (BANNED_MODULES.some((target) => resolved === target || resolved.startsWith(`${target}/`))) {
      found.push(`${where} imports ${specifier}`);
    }
  }

  if (!file.endsWith('.browser.ts')) {
    for (const global of BROWSER_GLOBALS) {
      if (new RegExp(`\\b${global}\\b`).test(bare)) found.push(`${where} uses ${global}`);
    }
  }
  return found;
}

test('nothing under src/lib/learning imports the big data or touches a browser API', () => {
  const files = learningFiles(LEARNING_DIR);
  assert.ok(files.length > 0, 'the scan found no files at all, so it is proving nothing');
  const offences = files.flatMap((file) => breaches(file, readFileSync(file, 'utf8')));
  assert.deepEqual(
    offences,
    [],
    'src/data/tests, src/lib/tests/drills.ts and src/lib/plan/schedule.ts carry 3.70 MiB of passages and ' +
      'transcripts, and the planner, catalogue and evidence layer all run inside a Cloudflare Worker as ' +
      'well as a browser. The learning layer reads the generated index instead, and anything that needs ' +
      'localStorage or fetch belongs in a *.browser.ts file.',
  );
});

test('the boundary scan can actually see a breach', () => {
  /* A check that only ever passes proves nothing, so the same function is
     run over source it has to reject. The bad code is a string here, never
     a file: nothing on disk is created or changed to test this. */
  const offender = path.join(LEARNING_DIR, 'planner.ts');
  const bad = [
    "import { ALL_TESTS } from '../../data/tests';",
    "import { getDrill } from '../tests/drills';",
    "const saved = localStorage.getItem('k');",
    'const el = document.body;',
  ].join('\n');
  assert.deepEqual(breaches(offender, bad), [
    'src/lib/learning/planner.ts imports ../../data/tests',
    'src/lib/learning/planner.ts imports ../tests/drills',
    'src/lib/learning/planner.ts uses document',
    'src/lib/learning/planner.ts uses localStorage',
  ]);

  /* A *.browser.ts file may hold the browser half, but never the big data. */
  const browserFile = path.join(LEARNING_DIR, 'store.browser.ts');
  assert.deepEqual(breaches(browserFile, bad), [
    'src/lib/learning/store.browser.ts imports ../../data/tests',
    'src/lib/learning/store.browser.ts imports ../tests/drills',
  ]);

  /* And the scan is not fooled by prose. contracts/index.ts spells out all
     four forbidden globals in its own header, which a naive scanner would
     report; stripping comments is what stops it. */
  const rulesFile = path.join(LEARNING_DIR, 'contracts', 'index.ts');
  assert.ok(statSync(rulesFile).isFile());
  const rules = readFileSync(rulesFile, 'utf8');
  assert.ok(rules.includes('localStorage'), 'contracts/index.ts really does name the forbidden globals');
  assert.deepEqual(breaches(rulesFile, rules), []);
});
