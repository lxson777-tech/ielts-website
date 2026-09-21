/* Lesson quick checks, as evidence.
 *
 * WHAT THIS FILE IS FOR
 * A lesson page ends with a few real questions. Until now answering them
 * changed nothing: the score appeared, the page forgot it, and the only
 * thing the platform kept about a lesson was the completion click (the
 * audit's reproduced finding 4, "completion is not understanding"). This
 * module turns those answers into the same evidence everything else
 * records, and it holds every judgement the two quiz surfaces share so
 * that neither of them has to make one of its own.
 *
 * THE THREE THINGS IT DECIDES
 *   1. WHAT A QUESTION IS CALLED. Positional, plus a content hash, exactly
 *      as tools/generate-learning-index.mjs computes it (architecture
 *      section 2.2). A question lifted from a real paper is named by THAT
 *      paper's own id for it, so sitting the paper later knows the student
 *      has met the question before.
 *   2. WHICH ANSWER COUNTS. The first one, captured when the student
 *      pressed check and therefore before any explanation, correct answer
 *      or transcript appeared. A later go at the same question is a retry
 *      and is recorded as assisted, never as a first answer.
 *   3. WHAT WAS SHOWN BEFORE IT. Assistance is set by the surface from
 *      what the student could actually see, not from what they say.
 *
 * PURE ON PURPOSE
 * No DOM, no storage of its own, no clock. Storage arrives as an
 * interface, the instant arrives as a string, and the callers
 * (PracticeQuiz.tsx and scripts/lesson-quiz.ts) are thin glue over this,
 * so all of it can be tested with no browser (architecture section 1.7).
 */

import type { Locale } from '../i18n/locale';
import type { Paper, Subskill } from './contracts/catalog';
import type { AssistanceLevel, CompletionState, EvidenceMode } from './contracts/evidence';
import type { BrowserStorage } from './store.browser';
import { hashContent, paperExposureKey, type EvidenceDraft, type ItemOutcomeDraft } from './evidence';

/* ── Identity ────────────────────────────────────────────────────────────── */

/** What one quick-check question is called, and where it came from.
 *
 *  Written into src/data/reading-practice.ts by the identity stamp
 *  (PRACTICE_ITEM_IDENTITY), which holds the same values the generated
 *  index does for all 269 items. tests/lesson-check-evidence.test.ts
 *  recomputes both from tools/generate-learning-index.mjs and fails when
 *  they disagree, so the browser and the index cannot drift apart. */
export interface LessonCheckItemIdentity {
  /** `u0-q3`: the unit and the question inside it, exactly what
      practiceKey(unitIndex, questionIndex) produces in
      src/lib/i18n/test-explanations.ts. A practice question has no id of
      its own, so its position is its name. */
  key: string;
  /** Short hash of the English prompt and its answer. It changes when the
      question changes, which is how a rewritten question is detectable
      instead of quietly inheriting the old one's evidence. */
  version: string;
  /** The question type, measured from the paper this question was lifted
      from, never assumed from the lesson it sits on: five lessons
      deliberately teach a neighbouring type (architecture section 6.2). */
  type: Subskill;
  /** The paper it was lifted from, and that paper's own id for it. Absent
      on the one hand written set (the reading paraphrase drill). */
  testId?: string;
  questionId?: string;
}

/** The lesson-check activity in the catalogue, e.g.
    `check:practice-reading-tfng`. Kept in step with checkActivityId in
    src/lib/learning/catalog.ts, which this file cannot import: the
    catalogue carries the generated index, and a lesson page has no other
    reason to download 227 KB of it. The test pins the two together. */
export function lessonCheckActivityId(setId: string): string {
  return `check:${setId}`;
}

/** `contentVersion` for every lesson-check activity, as buildCheckActivities
    stamps it. Same reason for the copy, same test. */
export const LESSON_CHECK_CONTENT_VERSION = 1;

/** Every lesson-check event is recorded in this mode: a check inside a
    lesson page, where help is available. */
export const LESSON_CHECK_MODE: EvidenceMode = 'lesson-check';

/** One question of a real paper, named the same way wherever it is met.
 *
 *  This is the whole point of recording the source: a lesson check, a
 *  single-part drill and the full paper can all ask question 24 of Reading
 *  Test 19, and the student has only answered it once. Question ids are
 *  unique inside a paper and not across the bank, so the pair is the item.
 *  Every surface that asks a real paper's question must name it this way. */
export function paperItemId(testId: string, questionId: string): string {
  return `${testId}:${questionId}`;
}

/** What a quick-check question is called in the learner record.
 *
 *  The paper's own name for it when it has one, so exposure crosses
 *  surfaces; otherwise the set and the position, which is all a hand
 *  written question has. */
export function lessonCheckItemId(setId: string, identity: LessonCheckItemIdentity): string {
  if (identity.testId && identity.questionId) return paperItemId(identity.testId, identity.questionId);
  return `${lessonCheckActivityId(setId)}:${identity.key}`;
}

/** The positional key, the same string practiceKey() builds. Duplicated
    rather than imported because that module is a React hook file that
    fetches translations, and this one runs in the Worker too. The test
    asserts the two agree. */
export function lessonCheckItemKey(unitIndex: number, questionIndex: number): string {
  return `u${unitIndex}-q${questionIndex}`;
}

/* ── Identity for a quiz written into a lesson body ──────────────────────── */

/** The inline `data-quiz` exercises (see tools/scrape_ielts_materials.py)
    are plain HTML inside a lesson body, with no entry in the generated
    index and no source paper named anywhere in the markup. They still get
    a stable name: the lesson, the position, and a hash of the question and
    its answer, which is the same rule the index uses, applied to what the
    page actually holds. Lesson body files are never edited to add one
    (lead decision D2). */
export function lessonQuizActivityId(lessonKey: string): string {
  return `check:lesson-quiz:${lessonKey}`;
}

export function lessonQuizItemIdentity(
  lessonKey: string,
  containerIndex: number,
  itemIndex: number,
  question: string,
  answer: string,
  type: Subskill,
): LessonCheckItemIdentity {
  return {
    key: `c${containerIndex}-i${itemIndex}`,
    /* Sixteen characters, the same length the index's hashes carry. A
       different function from the index's sha256, because this identity
       is never compared with one: nothing in the index describes these. */
    version: hashContent(`${normaliseForHash(question)}\n${normaliseForHash(answer)}`).slice(0, 16),
    type,
  };
}

/** A Windows checkout and a Linux one must hash the same, and an editor
    that saved a byte order mark must not change a question's identity.
    The rule tools/generate-learning-index.mjs applies, in one place. */
export function normaliseForHash(text: string): string {
  return String(text).replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/* ── Assistance ──────────────────────────────────────────────────────────── */

/** Nothing had been shown about this question when the answer was given. */
export const FIRST_GO_ASSISTANCE: AssistanceLevel = 'none';

/** PracticeQuiz prints the correct answer and its explanation the moment a
    unit is checked, so every later go at those questions has had the
    answer in front of it. */
export const AFTER_ANSWER_SHOWN: AssistanceLevel = 'answer-shown';

/** The inline lesson-body quiz marks each question right or wrong and
    stops there, without ever naming the answer. Knowing an answer is
    wrong is help, and it is less help than being told the answer. */
export const AFTER_MARKING_SHOWN: AssistanceLevel = 'hint';

/* ── Turning answers into evidence ───────────────────────────────────────── */

/** One question as it stood when the student pressed check. */
export interface LessonCheckSubmission {
  identity: LessonCheckItemIdentity;
  /** Exactly what they had. An empty string means they left it blank,
      which is not the same as getting it wrong. */
  given: string;
  correct: boolean;
  /** Which go this is at this question: 0 the first, 1 after a reset, and
      so on. Not the same as a changed answer: pressing check twice on the
      same go is one answer, not two. */
  attempt: number;
  /** Set only when a surface really did show something before the answer
      was given. Left out, a first go is unassisted and a later go carries
      the context's repeat level. */
  assistance?: AssistanceLevel;
  /** Seconds on this question, when the surface measures it honestly.
      Omitted rather than estimated. */
  seconds?: number;
}

export interface LessonCheckContext {
  /** 'practice-reading-tfng', or the lesson key for an inline quiz. */
  activityId: string;
  contentVersion?: number;
  paper: Paper;
  /** ISO instant the check was pressed. */
  at: string;
  locale?: Locale;
  sessionId?: string;
  /** How the go ended: 'completed' when every question was answered,
      'partial' when some were left blank. */
  completion: CompletionState;
  /** What a second and later go has had in front of it on this surface. */
  repeatAssistance: AssistanceLevel;
  /** The set id, for naming a hand written question. */
  setId: string;
}

/** What has already been written for each question of this run, so a
    second press of check is not a second row. */
export type RecordedAnswers = Readonly<Record<string, { answer: string; attempt: number }>>;

export interface LessonCheckWrite {
  /** The one draft this press of check is worth, ready for
      LearnerStore.recordEvents, or nothing at all when no answer changed.
      The store fills in the retry link, the seen-before flags and the
      event id. */
  drafts: readonly EvidenceDraft[];
  /** The answers map to keep for the rest of this run. */
  recorded: RecordedAnswers;
}

/** Build the evidence for one press of check.
 *
 * ONE PRESS IS ONE EVENT, and that is not a detail. A lesson check asks
 * several questions about the same passage, so every one of its questions
 * shares that passage. Written one question at a time, the second question
 * would find the passage already in the exposure log, put there a
 * millisecond earlier by the first, and the student's very first go would
 * be filed as a repeat of itself. Kept together, the log is consulted once,
 * before any of it is written, and the go is a repeat only when the
 * material really had been met before.
 *
 * A question is included when this is the first answer to it, or when the
 * student has been round again (a new `attempt`) or changed what they had
 * since the last row. Pressing check twice with nothing altered records
 * nothing, because nothing else happened.
 *
 * Nothing here decides whether an answer counts towards an ability
 * estimate. That is classifyEvidence's job, and it is what makes an
 * assisted or repeated answer harmless: it is still recorded, it is simply
 * not independent. */
export function lessonCheckDrafts(
  context: LessonCheckContext,
  submissions: readonly LessonCheckSubmission[],
  already: RecordedAnswers = {},
): LessonCheckWrite {
  const recorded: Record<string, { answer: string; attempt: number }> = { ...already };
  const items: ItemOutcomeDraft[] = [];
  const sources = new Set<string>();
  const bySubskill: Record<string, { correct: number; total: number }> = {};
  const seenTypes: Subskill[] = [];
  let correct = 0;

  for (const submission of submissions) {
    const itemId = lessonCheckItemId(context.setId, submission.identity);
    const held = recorded[itemId];
    if (held && held.attempt === submission.attempt && held.answer === submission.given) continue;

    const assistance =
      submission.assistance ??
      (held === undefined && submission.attempt === 0 ? FIRST_GO_ASSISTANCE : context.repeatAssistance);
    const subskill = submission.identity.type;

    items.push({
      itemId,
      itemVersion: submission.identity.version,
      subskill,
      firstAnswer: submission.given,
      correct: submission.correct,
      assistance,
      ...(submission.seconds === undefined ? {} : { seconds: submission.seconds }),
    });
    /* Sitting this check spends the paper's question, so a later sitting
       of that paper is correctly a repeat rather than fresh evidence. */
    if (submission.identity.testId) sources.add(paperExposureKey(submission.identity.testId));
    const tally = (bySubskill[subskill] ??= { correct: 0, total: 0 });
    tally.total += 1;
    if (submission.correct) tally.correct += 1;
    if (submission.correct) correct += 1;
    seenTypes.push(subskill);
    recorded[itemId] = { answer: submission.given, attempt: submission.attempt };
  }

  if (items.length === 0) return { drafts: [], recorded: already };

  return {
    drafts: [
      {
        activityId: context.activityId,
        contentVersion: context.contentVersion ?? LESSON_CHECK_CONTENT_VERSION,
        at: context.at,
        paper: context.paper,
        subskill: dominantType(seenTypes),
        mode: LESSON_CHECK_MODE,
        completion: context.completion,
        sessionId: context.sessionId,
        locale: context.locale,
        sourceMaterial: sources.size > 0 ? [...sources].sort() : undefined,
        outcome: { kind: 'scored', raw: correct, total: items.length, bySubskill },
        items,
      },
    ],
    recorded,
  };
}

/** The question type a go is mostly made of, for the heading the event
    sits under. Every question also carries its own, which is what the
    counting actually uses. Ties break alphabetically so two runs agree,
    the same rule the catalogue's dominantType applies. */
function dominantType(types: readonly Subskill[]): Subskill {
  const counts = new Map<Subskill, number>();
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1);
  let winner = types[0]!;
  let most = 0;
  for (const type of [...counts.keys()].sort()) {
    const count = counts.get(type) ?? 0;
    if (count > most) {
      most = count;
      winner = type;
    }
  }
  return winner;
}

/** 'completed' when every question of this go was answered, 'partial' when
    some were left blank, 'blank' when none of them was. A blank go is
    excluded from every estimate rather than read as a bad result. */
export function completionOf(submissions: readonly LessonCheckSubmission[]): CompletionState {
  if (submissions.length === 0) return 'blank';
  const answered = submissions.filter((submission) => submission.given.trim() !== '').length;
  if (answered === 0) return 'blank';
  return answered === submissions.length ? 'completed' : 'partial';
}

/* ── Pausing and coming back ─────────────────────────────────────────────── */

/** localStorage key holding an unfinished quick check. Namespaced by
    owner exactly as the learner record is, so one student's half finished
    exercise is never restored for another (architecture finding
    R7.4-account-isolation). */
export const LESSON_CHECK_PROGRESS_KEY = 'ielts.learning.check.v1';

/** Unfinished quick checks older than this are dropped rather than
    restored. A month later the page is a fresh start, not a resumption.
    Provisional. */
export const LESSON_CHECK_PROGRESS_DAYS = 30;

export interface LessonCheckUnitProgress {
  /** What is currently in each box, whether or not it was checked. */
  drafts: readonly string[];
  checked: boolean;
  /** Which go this unit is on: 0 the first, 1 after "try this again". */
  attempt: number;
}

export interface LessonCheckProgressV1 {
  version: 1;
  setId: string;
  updatedAt: string;
  units: readonly LessonCheckUnitProgress[];
  /** What has already been written, so coming back and pressing check
      again does not record a second first answer. */
  recorded: RecordedAnswers;
}

export function lessonCheckProgressKey(ownerNamespace: string, setId: string): string {
  return `${LESSON_CHECK_PROGRESS_KEY}::${ownerNamespace}::${setId}`;
}

/** Read an unfinished check back, or null when there is nothing usable.
 *
 * Usable means: this set, this shape (the same units with the same number
 * of questions), and recent. A set that has been rewritten since fails
 * that test and starts clean, which is right: restoring answers into
 * questions that have changed would be worse than losing them. Never
 * throws, so a blocked or full store costs the student nothing. */
export function readLessonCheckProgress(
  storage: BrowserStorage | null,
  key: string,
  expectedUnitSizes: readonly number[],
  now: string,
): LessonCheckProgressV1 | null {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: Partial<LessonCheckProgressV1>;
  try {
    parsed = JSON.parse(raw) as Partial<LessonCheckProgressV1>;
  } catch {
    return null;
  }
  if (parsed?.version !== 1 || !Array.isArray(parsed.units)) return null;
  if (parsed.units.length !== expectedUnitSizes.length) return null;
  const units: LessonCheckUnitProgress[] = [];
  for (let i = 0; i < parsed.units.length; i += 1) {
    const unit = parsed.units[i] as Partial<LessonCheckUnitProgress> | undefined;
    if (!unit || !Array.isArray(unit.drafts) || unit.drafts.length !== expectedUnitSizes[i]) return null;
    if (unit.drafts.some((draft) => typeof draft !== 'string')) return null;
    units.push({
      drafts: unit.drafts,
      checked: unit.checked === true,
      attempt: typeof unit.attempt === 'number' && unit.attempt >= 0 ? unit.attempt : 0,
    });
  }
  const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '';
  if (!withinDays(updatedAt, now, LESSON_CHECK_PROGRESS_DAYS)) return null;
  return {
    version: 1,
    setId: typeof parsed.setId === 'string' ? parsed.setId : '',
    updatedAt,
    units,
    recorded: isRecordedAnswers(parsed.recorded) ? parsed.recorded : {},
  };
}

/** Keep an unfinished check. Returns false when the browser refused it,
    which costs the student a resumption and nothing else: the answers
    already recorded are in the learner record either way. */
export function writeLessonCheckProgress(
  storage: BrowserStorage | null,
  key: string,
  progress: LessonCheckProgressV1,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearLessonCheckProgress(storage: BrowserStorage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* The key is namespaced and shape checked on the way back in, so one
       that will not go away is inert rather than harmful. */
  }
}

function isRecordedAnswers(value: unknown): value is RecordedAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (entry) =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as { answer?: unknown }).answer === 'string' &&
      typeof (entry as { attempt?: unknown }).attempt === 'number',
  );
}

function withinDays(from: string, to: string, days: number): boolean {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end - start <= days * 24 * 60 * 60 * 1000;
}
