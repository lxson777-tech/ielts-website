/* Pure helpers behind the evidence a test, drill, retake or grader attempt
 * writes (WP12, docs/personal-learning/ARCHITECTURE.md section 7 "Test,
 * drill and grader recorders"). Shared by TestPlayer.tsx, MockExam.tsx,
 * WritingTester.tsx, SpeakingTester.tsx and LiveExaminer.tsx.
 *
 * WHY THIS IS A PLAIN .ts FILE, NOT PART OF A COMPONENT
 * tests/ts-extension-loader.mjs strips TypeScript types for node:test but
 * does not transform JSX, so a file the tests import directly must never
 * contain JSX. This mirrors the split WP11 already uses between
 * PracticeQuiz.tsx and src/scripts/lesson-quiz.ts: the component stays thin
 * glue, the judgement calls live here where they can be tested with no DOM.
 *
 * No storage, no clock of its own, no network: every function takes plain
 * data and returns plain data.
 */

import type { Paper } from '../lib/learning/contracts/catalog';
import type { AssistanceLevel, EvidenceMode } from '../lib/learning/contracts/evidence';
import type { ItemOutcomeDraft } from '../lib/learning/evidence';
import { drillActivityId, paperActivityId } from '../lib/learning/catalog';
import type { Question, QuestionGroup } from '../lib/tests/schema';

/* ── Test, drill and retake identity ─────────────────────────────────────── */

/** Strip the synthetic "-retake" suffix TestPlayer's buildRetakeTest appends
    (src/lib/i18n/test-explanations.ts's baseTestId does the same, for the
    same reason: the retake reuses the original paper's own Question objects
    and identity, it does not have a published page or a catalogue entry of
    its own). */
export function baseAttemptId(testId: string): string {
  return testId.replace(/-retake$/, '');
}

/** Drill ids are always `${sourceTestId}-drill-p${n}` (src/lib/tests/
    drills.ts). Checked after stripping "-retake" so a retake built from a
    drill's wrong questions is still recognised as one. */
export function isDrillAttemptId(testId: string): boolean {
  return /-drill-p\d+$/.test(baseAttemptId(testId));
}

export function isRetakeAttemptId(testId: string): boolean {
  return /-retake$/.test(testId);
}

/** Reading and Listening test/drill ids always start with the skill name
    (src/data/tests's own naming, e.g. "reading-full-014",
    "listening-full-003-drill-p2"). */
export function paperFromAttemptId(testId: string): Paper | undefined {
  const base = baseAttemptId(testId);
  if (base.startsWith('reading-')) return 'reading';
  if (base.startsWith('listening-')) return 'listening';
  return undefined;
}

/** The catalogue activity a submission, or an abandoned session, for this
    test id is evidence about: `drill:<id>` for a drill (including a retake
    built from one), `test:<id>` for a full paper (including a retake built
    from one). Matches src/lib/learning/catalog.ts's own id shapes exactly,
    so a retake writes against the very same activity as the paper or drill
    it retries, and the learner store links the retry automatically by
    shared item ids (store.browser.ts's earlierAttempt). */
export function attemptActivityId(testId: string): string {
  const base = baseAttemptId(testId);
  return isDrillAttemptId(base) ? drillActivityId(base) : paperActivityId(base);
}

/** 'assessment' for a timed full paper or a mock leg, 'practice' for a
    drill or a coaching retake. TestPlayer always renders the "retry the
    ones you got wrong" retake with attemptKind="drill" regardless of what
    is being retried, so this one flag already settles the live case. */
export function attemptEvidenceMode(attemptKind: 'full' | 'drill'): EvidenceMode {
  return attemptKind === 'full' ? 'assessment' : 'practice';
}

/** Same judgement from the test id alone, for a session discovered stale on
    the next load (see recordStaleSessionAbandonment in TestPlayer.tsx): a
    drill, or a retake of anything, is practice; a plain paper id is a timed
    assessment. */
export function attemptEvidenceModeFromId(testId: string): EvidenceMode {
  return isDrillAttemptId(testId) || isRetakeAttemptId(testId) ? 'practice' : 'assessment';
}

/* ── Question item identity ──────────────────────────────────────────────── */

/** A question id is unique only within its own paper (architecture section
    7's "Learner evidence" note: identity is the PAIR of paper id and
    question id). `baseId` is always the real paper's id, never a retake's
    synthetic one, so a retried question shares its first attempt's item id
    and the store links the two as a retry automatically. */
export function testItemId(baseId: string, questionId: string): string {
  return `${baseId}:${questionId}`;
}

export interface ScoredQuestionEntry {
  question: Question;
  group: QuestionGroup;
}

/** Every scored question the student SAW, not only the ones they answered,
    as ItemOutcomeDraft rows: recording one for a blank slot (empty
    firstAnswer) is what turns "record exposure for every question seen"
    into the exposure log automatically the moment the event is appended
    (each item's own key is added, see evidence.ts exposureKeysForEvent),
    and what makes a later re-sit of the same paper read as a repeat rather
    than fresh evidence. Unscored example questions are left out, matching
    the existing SCORED_TOTAL/scoredQuestionIds convention. */
export function buildQuestionItems(
  baseId: string,
  entries: readonly ScoredQuestionEntry[],
  answers: Readonly<Record<string, string>>,
  scoredIds: ReadonlySet<string>,
  assistedIds: ReadonlySet<string>,
): ItemOutcomeDraft[] {
  return entries
    .filter(({ question }) => question.scored !== false)
    .map(({ question, group }) => ({
      itemId: testItemId(baseId, question.id),
      firstAnswer: answers[question.id] ?? '',
      correct: scoredIds.has(question.id),
      assistance: (assistedIds.has(question.id) ? 'hint' : 'none') as AssistanceLevel,
      subskill: group.type,
    }));
}

/** True only when nothing at all was answered. The whole point of `blank`
    in the completion-state contract is that this can never be misread as
    "the student tried and got every one wrong" (architecture section 2.3;
    lead decision on honest wording). */
export function isEntirelyBlank(
  entries: readonly ScoredQuestionEntry[],
  answers: Readonly<Record<string, string>>,
): boolean {
  const scored = entries.filter((e) => e.question.scored !== false);
  return scored.length > 0 && scored.every((e) => !answers[e.question.id]);
}

/* ── Speaking deep links ─────────────────────────────────────────────────── */

/** Parses the query string the catalogue's speaking activities expect a
    student to be sent in on (architecture section 6.4, catalog.ts's
    speakingActivityId / speakingPart3ActivityId): `?part=1&topic=<id>` for
    a Part 1 topic, `?part=2&card=<id>` for a cue-card monologue, and
    `?part=3&card=<id>` for its follow-ups. Null for anything else, so a
    plain visit to the trainer keeps showing its normal menu. */
export type SpeakingDeepLink =
  | { part: 1; topicId: string }
  | { part: 2; cardId: string }
  | { part: 3; cardId: string };

export function parseSpeakingDeepLink(search: string): SpeakingDeepLink | null {
  const params = new URLSearchParams(search);
  const part = params.get('part');
  if (part === '1') {
    const topicId = params.get('topic');
    return topicId ? { part: 1, topicId } : null;
  }
  if (part === '2' || part === '3') {
    const cardId = params.get('card');
    return cardId ? { part: part === '2' ? 2 : 3, cardId } : null;
  }
  return null;
}
