/* The on-disk shape of the generated learning index, and the two pure
 * functions that move between it and the shape every reader actually uses.
 *
 * WHY THERE ARE TWO SHAPES
 * ------------------------
 * `GeneratedIndexV1` (contracts/catalog.ts) is the comfortable shape: every
 * paper lists its question ids, every lesson-check item names its own source
 * paper and question, every focused exercise spells out its item ids and
 * what it shares them with. That is what the planner, the catalogue and the
 * exposure logic read, and none of it changes here.
 *
 * The FILE is a different matter. It is bundled into the browser and into
 * the Mr EZ Worker, so its byte count is a real cost, and it is capped by
 * LEARNING_INDEX_MAX_BYTES. Written the comfortable way it had grown to
 * about 286 KB, over that cap, because the same handful of facts were
 * written out thousands of times:
 *
 *   - every paper holds exactly q1 to qN in order, so 70 papers spelled out
 *     2,800 question ids that a single count describes exactly;
 *   - every drill holds a contiguous run of its paper's questions, so 240
 *     drills spelled out another 2,900;
 *   - a drill's id is its paper's id plus its part number, written twice;
 *   - the 269 lesson-check items repeated their unit's paper id, repeated
 *     the type of the group they came from, restated a key that is their
 *     own position, and carried a flag that only ever said "this item has a
 *     source paper" a second time;
 *   - each focused exercise wrote its paper id once per item and then twice
 *     more inside `sharesItemsWith`.
 *
 * So the file says each of those things once, and `decodeLearningIndex()`
 * puts the comfortable shape back at import. Nothing is dropped: the
 * round-trip test in tests/learning-index.test.ts encodes the full index,
 * decodes it again and asserts it is identical, field for field, which is
 * what makes "more compact" different from "less complete".
 *
 * WHAT MAY AND MAY NOT BE DERIVED
 * -------------------------------
 * Only facts the generator itself constructs, and which a test proves:
 *   - a paper's question ids ARE q1..qN (asserted against the real papers);
 *   - a drill's id IS `<paper id>-drill-p<part>` (the same string
 *     src/lib/tests/drills.ts builds);
 *   - a drill's skill IS its paper's skill;
 *   - a lesson-check item's key IS `u<unit>-q<item>` (practiceKey);
 *   - a focused exercise's `sharesItemsWith` IS its source paper and, when
 *     it has one, the single-part drill over the same questions.
 * Anything a person wrote (a title, an objective, a provenance, a duration)
 * is never derived, because a derivation would silently invent it.
 *
 * DETERMINISM
 * -----------
 * Encoding is a pure rewrite: same input, same output, same key order. The
 * generator hashes the ENCODED file to make `indexVersion`, so the version
 * describes the bytes that are actually committed.
 */

import type {
  ContentProvenance,
  DrillIndexEntry,
  FocusedExerciseIndexEntry,
  GeneratedIndexV1,
  LessonCheckIndexEntry,
  LessonCheckItem,
  QuestionTypeCoverage,
  Paper,
  SpeakingPromptIndexEntry,
  Subskill,
  TestIndexEntry,
  VocabTopicIndexEntry,
  WritingPromptIndexEntry,
} from './contracts/catalog';

/** Bumped when the on-disk shape changes in a way an older reader could not
    understand. `1` was the long form this file replaced. `2` could only
    describe a lesson-check unit that takes one contiguous run of its
    paper's questions; `3` adds `questions` for a unit that does not (see
    CompactLessonCheckUnit), which a format 2 reader would have read as
    items with a paper but no question. */
export const LEARNING_INDEX_FORMAT = 3;

/* ── The compact shape ───────────────────────────────────────────────────── */

export interface CompactTestEntry {
  id: string;
  skill: 'reading' | 'listening';
  title: string;
  byType: Readonly<Record<string, number>>;
  /** Replaces questionIds. Every paper holds q1 to qN in order. */
  questionCount: number;
  durationMinutes: number;
  provenance: ContentProvenance;
}

export interface CompactDrillEntry {
  /** The drill's id is this plus `-drill-p<partNumber>`, and its skill is
      this paper's skill, so neither is written again. */
  sourceTestId: string;
  partNumber: number;
  title: string;
  byType: Readonly<Record<string, number>>;
  /** First and last question number of the contiguous run this drill takes
      from its paper, inclusive. Replaces questionIds. */
  questions: readonly [number, number];
  durationMinutes: number;
}

export interface CompactLessonCheckUnit {
  /** The paper this unit quotes, when it quotes one. Absent on the one
      hand-written unit (the paraphrase lesson's warm-up), whose items have
      no source paper. */
  paper?: string;
  /** The paper's question number for this unit's first item; the rest run
      on from it. Present when the unit takes one contiguous run of its
      paper's questions, the usual case. Absent when `paper` is, and when
      `questions` is present instead. */
  firstQuestion?: number;
  /** The paper's question number for every item, in order, written out
      only when the unit does NOT take one contiguous run: the paraphrase
      lesson's real passage quotes Test 20 questions 1 to 6, 12 and 13 and
      leaves 7 to 11 out. Never present alongside `firstQuestion`, and never
      without `paper`. */
  questions?: readonly number[];
  /** One entry when every item in the unit is the same type (the usual
      case), otherwise one per item. */
  types: readonly Subskill[];
  /** One content hash per item, in order. Its length is the item count, and
      the position in it is the item's key. */
  versions: readonly string[];
}

export interface CompactLessonCheckEntry {
  id: string;
  lessonKey: string;
  skill: 'reading' | 'listening';
  units: readonly CompactLessonCheckUnit[];
}

export interface CompactFocusedExerciseEntry {
  id: string;
  subskill: Subskill;
  paper: Paper;
  expectedMinutes: number;
  provenance: ContentProvenance;
  kind?: 'item-answers' | 'written-response' | 'authored-practice';
  role?: 'guided-practice' | 'independent-check';
  objective?: string;
  lessonKey?: string;
  lessonBlockId?: string;
  /** A written response: the one exam prompt it is built on. Its item id is
      `prompt:<id>` and it shares that item with `write:<id>`. */
  promptId?: string;
  /** An item-answers exercise built from a real paper. */
  paperId?: string;
  /** First and last question number inside `paperId`, inclusive. */
  questions?: readonly [number, number];
  /** The part number of the single-part drill holding the same questions,
      when there is one. */
  drillPart?: number;
  /** Item ids written out in full, for the one exercise that is built on
      neither a paper nor a prompt (authored items). Never derived. */
  itemIds?: readonly string[];
}

export interface CompactLearningIndexV1 {
  version: 1;
  /** LEARNING_INDEX_FORMAT. Present so a reader can refuse a shape it does
      not understand instead of silently mis-reading it. */
  format: number;
  indexVersion: string;
  tests: readonly CompactTestEntry[];
  drills: readonly CompactDrillEntry[];
  lessonChecks: readonly CompactLessonCheckEntry[];
  focusedExercises: readonly CompactFocusedExerciseEntry[];
  writingPrompts: readonly WritingPromptIndexEntry[];
  speakingPrompts: readonly SpeakingPromptIndexEntry[];
  /** `lessonKey` is dropped: it is always `vocabulary-<slug>`. */
  vocabTopics: readonly Omit<VocabTopicIndexEntry, 'lessonKey'>[];
  questionTypes: readonly QuestionTypeCoverage[];
}

/* ── Small shared conventions ────────────────────────────────────────────── */

/** `q14` to 14. */
function questionNumber(id: string): number {
  const n = Number(id.slice(1));
  if (!/^q\d+$/.test(id) || !Number.isFinite(n)) {
    throw new Error(`The index expects question ids shaped q<number>, not "${id}".`);
  }
  return n;
}

/** 14 to `q14`. */
function questionId(n: number): string {
  return `q${n}`;
}

function runOf(ids: readonly string[], where: string): readonly [number, number] {
  if (ids.length === 0) throw new Error(`${where} has no questions.`);
  const numbers = ids.map(questionNumber);
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i] !== numbers[0]! + i) {
      throw new Error(
        `${where} takes questions ${ids.join(', ')}, which is not one contiguous run. ` +
          'The compact index writes a first and last number; write the ids out instead.',
      );
    }
  }
  return [numbers[0]!, numbers[numbers.length - 1]!];
}

/** True when the numbers count up by one from the first, so a first
    number alone describes them. */
function isOneRun(numbers: readonly number[]): boolean {
  return numbers.every((n, i) => n === numbers[0]! + i);
}

function idsFromRun([from, to]: readonly [number, number]): string[] {
  const ids: string[] = [];
  for (let n = from; n <= to; n += 1) ids.push(questionId(n));
  return ids;
}

/** The single-part drill id, exactly as src/lib/tests/drills.ts builds it. */
export function drillIdFor(sourceTestId: string, partNumber: number): string {
  return `${sourceTestId}-drill-p${partNumber}`;
}

/** The unit-and-position key a lesson check question is known by, exactly
    as practiceKey() in src/lib/i18n/test-explanations.ts writes it. */
function practiceItemKey(unitIndex: number, itemIndex: number): string {
  return `u${unitIndex}-q${itemIndex}`;
}

/* ── Encode ──────────────────────────────────────────────────────────────── */

export function encodeLearningIndex(index: GeneratedIndexV1): CompactLearningIndexV1 {
  return {
    version: 1,
    format: LEARNING_INDEX_FORMAT,
    indexVersion: index.indexVersion,
    tests: index.tests.map((entry) => encodeTest(entry)),
    drills: index.drills.map((entry) => encodeDrill(entry)),
    lessonChecks: index.lessonChecks.map((entry) => encodeLessonCheck(entry)),
    focusedExercises: index.focusedExercises.map((entry) => encodeFocusedExercise(entry)),
    writingPrompts: index.writingPrompts,
    speakingPrompts: index.speakingPrompts,
    vocabTopics: index.vocabTopics.map((topic) => {
      if (topic.lessonKey !== undefined && topic.lessonKey !== `vocabulary-${topic.slug}`) {
        throw new Error(`Vocabulary topic ${topic.slug} has lesson key ${topic.lessonKey}, which the index cannot derive.`);
      }
      return { slug: topic.slug, title: topic.title, wordCount: topic.wordCount };
    }),
    questionTypes: index.questionTypes,
  };
}

function encodeTest(entry: TestIndexEntry): CompactTestEntry {
  entry.questionIds.forEach((id, i) => {
    if (id !== questionId(i + 1)) {
      throw new Error(`Paper ${entry.id} holds ${id} at position ${i + 1}. The compact index writes a count, which assumes q1 to qN in order.`);
    }
  });
  return {
    id: entry.id,
    skill: entry.skill,
    title: entry.title,
    byType: entry.byType,
    questionCount: entry.questionIds.length,
    durationMinutes: entry.durationMinutes,
    provenance: entry.provenance,
  };
}

function encodeDrill(entry: DrillIndexEntry): CompactDrillEntry {
  const expected = drillIdFor(entry.sourceTestId, entry.partNumber);
  if (entry.id !== expected) {
    throw new Error(`Drill ${entry.id} is not named after its paper and part (${expected}), so the compact index cannot rebuild its id.`);
  }
  if (!entry.sourceTestId.startsWith(`${entry.skill}-`)) {
    throw new Error(`Drill ${entry.id} is a ${entry.skill} drill of ${entry.sourceTestId}, so its skill cannot be read back off the paper id.`);
  }
  return {
    sourceTestId: entry.sourceTestId,
    partNumber: entry.partNumber,
    title: entry.title,
    byType: entry.byType,
    questions: runOf(entry.questionIds, `Drill ${entry.id}`),
    durationMinutes: entry.durationMinutes,
  };
}

function encodeLessonCheck(entry: LessonCheckIndexEntry): CompactLessonCheckEntry {
  /* Items arrive in unit order, keyed u<unit>-q<item>, so the key itself
     says which unit an item belongs to and the grouping needs nothing
     else. */
  const units: LessonCheckItem[][] = [];
  for (const item of entry.items) {
    const match = /^u(\d+)-q(\d+)$/.exec(item.itemKey);
    if (!match) throw new Error(`${entry.id} has an item key "${item.itemKey}", which is not u<unit>-q<item>.`);
    const unitIndex = Number(match[1]);
    const itemIndex = Number(match[2]);
    const unit = (units[unitIndex] ??= []);
    if (itemIndex !== unit.length) {
      throw new Error(`${entry.id} item ${item.itemKey} is out of order; the compact index reads the key off the position.`);
    }
    unit.push(item);
  }

  return {
    id: entry.id,
    lessonKey: entry.lessonKey,
    skill: entry.skill,
    units: units.map((items, unitIndex) => {
      const where = `${entry.id} unit ${unitIndex}`;
      if (!items || items.length === 0) throw new Error(`${where} has no items.`);
      const papers = new Set(items.map((item) => item.sourceTestId));
      if (papers.size > 1) throw new Error(`${where} quotes more than one paper (${[...papers].join(', ')}).`);
      for (const item of items) {
        if (item.fromImportedPaper !== (item.sourceTestId !== undefined)) {
          throw new Error(`${where} item ${item.itemKey} disagrees with itself about whether it came from a paper.`);
        }
      }
      const types = [...new Set(items.map((item) => item.type))];
      const unit: CompactLessonCheckUnit = {
        types: types.length === 1 ? types : items.map((item) => item.type),
        versions: items.map((item) => item.itemVersion),
      };
      const paper = items[0]!.sourceTestId;
      if (paper !== undefined) {
        const numbers = items.map((item) => questionNumber(item.sourceQuestionId ?? ''));
        /* The usual unit takes one contiguous run, so its first number says
           it all. A unit that skips some of its passage's questions writes
           every number out rather than claiming the ones it left out. */
        if (isOneRun(numbers)) {
          return { paper, firstQuestion: numbers[0], types: unit.types, versions: unit.versions };
        }
        if (new Set(numbers).size !== numbers.length) {
          throw new Error(`${where} quotes the same paper question twice (${numbers.map(questionId).join(', ')}).`);
        }
        return { paper, questions: numbers, types: unit.types, versions: unit.versions };
      }
      return unit;
    }),
  };
}

function encodeFocusedExercise(entry: FocusedExerciseIndexEntry): CompactFocusedExerciseEntry {
  const compact: CompactFocusedExerciseEntry = {
    id: entry.id,
    subskill: entry.subskill,
    paper: entry.paper,
    expectedMinutes: entry.expectedMinutes,
    provenance: entry.provenance,
  };
  if (entry.kind !== undefined) compact.kind = entry.kind;
  if (entry.role !== undefined) compact.role = entry.role;
  if (entry.objective !== undefined) compact.objective = entry.objective;
  if (entry.lessonKey !== undefined) compact.lessonKey = entry.lessonKey;
  if (entry.lessonBlockId !== undefined) compact.lessonBlockId = entry.lessonBlockId;

  if (entry.itemCount !== entry.itemIds.length) {
    throw new Error(`Focused exercise ${entry.id} claims ${entry.itemCount} items but names ${entry.itemIds.length}.`);
  }

  const promptId = entry.sourcePromptIds?.[0];
  if (promptId !== undefined) {
    if (entry.sourcePromptIds!.length !== 1) throw new Error(`Focused exercise ${entry.id} names more than one prompt.`);
    expectShares(entry, [`write:${promptId}`]);
    expectItems(entry, [`prompt:${promptId}`]);
    compact.promptId = promptId;
    return compact;
  }

  const paperId = entry.sourcePaperIds?.[0];
  if (paperId !== undefined) {
    if (entry.sourcePaperIds!.length !== 1) throw new Error(`Focused exercise ${entry.id} names more than one paper.`);
    const run = runOf(
      entry.itemIds.map((id) => {
        if (!id.startsWith(`${paperId}:`)) throw new Error(`Focused exercise ${entry.id} has an item "${id}" that does not belong to ${paperId}.`);
        return id.slice(paperId.length + 1);
      }),
      `Focused exercise ${entry.id}`,
    );
    const drill = (entry.sharesItemsWith ?? []).find((id) => id.startsWith('drill:'));
    const drillPart = drill === undefined ? undefined : drillPartOf(entry.id, paperId, drill);
    expectShares(entry, drill === undefined ? [`test:${paperId}`] : [`test:${paperId}`, drill]);
    compact.paperId = paperId;
    compact.questions = run;
    if (drillPart !== undefined) compact.drillPart = drillPart;
    return compact;
  }

  /* Neither a paper nor a prompt: authored items with ids of their own. */
  if (entry.sharesItemsWith !== undefined) {
    throw new Error(`Focused exercise ${entry.id} shares items with ${entry.sharesItemsWith.join(', ')} but names no source.`);
  }
  compact.itemIds = entry.itemIds;
  return compact;
}

function drillPartOf(exerciseId: string, paperId: string, drill: string): number {
  const prefix = `drill:${drillIdFor(paperId, 0).slice(0, -1)}`;
  if (!drill.startsWith(prefix)) {
    throw new Error(`Focused exercise ${exerciseId} shares items with ${drill}, which is not a single-part drill of ${paperId}.`);
  }
  return Number(drill.slice(prefix.length));
}

function expectShares(entry: FocusedExerciseIndexEntry, wanted: readonly string[]): void {
  const have = entry.sharesItemsWith ?? [];
  if (have.length !== wanted.length || have.some((id, i) => id !== wanted[i])) {
    throw new Error(
      `Focused exercise ${entry.id} shares items with [${have.join(', ')}], which the compact index cannot rebuild ` +
        `(it would write [${wanted.join(', ')}]).`,
    );
  }
}

function expectItems(entry: FocusedExerciseIndexEntry, wanted: readonly string[]): void {
  if (entry.itemIds.length !== wanted.length || entry.itemIds.some((id, i) => id !== wanted[i])) {
    throw new Error(`Focused exercise ${entry.id} names items [${entry.itemIds.join(', ')}] rather than [${wanted.join(', ')}].`);
  }
}

/* ── Decode ──────────────────────────────────────────────────────────────── */

/** The comfortable shape, rebuilt from the committed file. Pure, and cheap
    enough to run at module load: it allocates about three thousand small
    strings, which is a fraction of what the catalogue it feeds builds. */
export function decodeLearningIndex(compact: CompactLearningIndexV1): GeneratedIndexV1 {
  if (compact.format !== LEARNING_INDEX_FORMAT) {
    throw new Error(
      `The learning index is written in format ${compact.format}, and this build reads format ${LEARNING_INDEX_FORMAT}. ` +
        'Run `npm run learning:index`.',
    );
  }
  return {
    version: compact.version,
    indexVersion: compact.indexVersion,
    tests: compact.tests.map((entry) => ({
      id: entry.id,
      skill: entry.skill,
      title: entry.title,
      byType: entry.byType,
      questionIds: idsFromRun([1, entry.questionCount]),
      durationMinutes: entry.durationMinutes,
      provenance: entry.provenance,
    })),
    drills: compact.drills.map((entry) => ({
      id: drillIdFor(entry.sourceTestId, entry.partNumber),
      sourceTestId: entry.sourceTestId,
      skill: entry.sourceTestId.startsWith('listening-') ? 'listening' : 'reading',
      partNumber: entry.partNumber,
      title: entry.title,
      byType: entry.byType,
      questionIds: idsFromRun(entry.questions),
      durationMinutes: entry.durationMinutes,
    })),
    lessonChecks: compact.lessonChecks.map((entry) => ({
      id: entry.id,
      lessonKey: entry.lessonKey,
      skill: entry.skill,
      items: entry.units.flatMap((unit, unitIndex) => {
        if (unit.questions !== undefined && unit.questions.length !== unit.versions.length) {
          throw new Error(
            `${entry.id} unit ${unitIndex} names ${unit.questions.length} paper questions for ${unit.versions.length} items. ` +
              'Run `npm run learning:index`.',
          );
        }
        return unit.versions.map((itemVersion, itemIndex): LessonCheckItem => ({
          itemKey: practiceItemKey(unitIndex, itemIndex),
          itemVersion,
          type: (unit.types.length === 1 ? unit.types[0] : unit.types[itemIndex])!,
          fromImportedPaper: unit.paper !== undefined,
          sourceTestId: unit.paper,
          sourceQuestionId:
            unit.questions !== undefined
              ? questionId(unit.questions[itemIndex]!)
              : unit.firstQuestion === undefined
                ? undefined
                : questionId(unit.firstQuestion + itemIndex),
        }));
      }),
    })),
    focusedExercises: compact.focusedExercises.map((entry) => decodeFocusedExercise(entry)),
    writingPrompts: compact.writingPrompts,
    speakingPrompts: compact.speakingPrompts,
    vocabTopics: compact.vocabTopics.map((topic) => ({
      slug: topic.slug,
      title: topic.title,
      wordCount: topic.wordCount,
      lessonKey: `vocabulary-${topic.slug}`,
    })),
    questionTypes: compact.questionTypes,
  };
}

function decodeFocusedExercise(entry: CompactFocusedExerciseEntry): FocusedExerciseIndexEntry {
  const itemIds =
    entry.promptId !== undefined
      ? [`prompt:${entry.promptId}`]
      : entry.paperId !== undefined
        ? idsFromRun(entry.questions!).map((id) => `${entry.paperId}:${id}`)
        : [...(entry.itemIds ?? [])];

  const sharesItemsWith =
    entry.promptId !== undefined
      ? [`write:${entry.promptId}`]
      : entry.paperId !== undefined
        ? [`test:${entry.paperId}`, ...(entry.drillPart === undefined ? [] : [`drill:${drillIdFor(entry.paperId, entry.drillPart)}`])]
        : undefined;

  const decoded: FocusedExerciseIndexEntry = {
    id: entry.id,
    subskill: entry.subskill,
    paper: entry.paper,
    itemCount: itemIds.length,
    expectedMinutes: entry.expectedMinutes,
    provenance: entry.provenance,
    itemIds,
  };
  if (entry.kind !== undefined) decoded.kind = entry.kind;
  if (entry.role !== undefined) decoded.role = entry.role;
  if (entry.objective !== undefined) decoded.objective = entry.objective;
  if (entry.lessonKey !== undefined) decoded.lessonKey = entry.lessonKey;
  if (entry.lessonBlockId !== undefined) decoded.lessonBlockId = entry.lessonBlockId;
  if (entry.promptId !== undefined) decoded.sourcePromptIds = [entry.promptId];
  if (entry.paperId !== undefined) decoded.sourcePaperIds = [entry.paperId];
  if (sharesItemsWith !== undefined) decoded.sharesItemsWith = sharesItemsWith;
  return decoded;
}
