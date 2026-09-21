/* The judgement calls behind one focused exercise, with no DOM in them.
 *
 * WHY A PLAIN .ts FILE
 * tests/ts-extension-loader.mjs strips TypeScript types for node:test but
 * does not transform JSX, so anything a test imports directly must be free
 * of it. Same split as PracticeQuiz.tsx / src/scripts/lesson-quiz.ts and
 * TestPlayer.tsx / src/components/attempt-recording.ts: the component is
 * glue, and everything that decides what a student's work MEANS lives here
 * where it can be tested with no browser.
 *
 * THE THREE RULES THIS FILE EXISTS TO KEEP
 * 1. The first answer is the first answer. What is recorded for an item is
 *    what the student had when they pressed check, before a single
 *    explanation, evidence line or tick appeared.
 * 2. Help makes an answer assisted, for good. A hint, an evidence sentence,
 *    an explanation or a word from the tutor all raise the item's
 *    assistance level, and it never comes back down.
 * 3. A cause is never observed. What is observed is a wrong answer; why it
 *    happened is what the student tells us, and every sentence built from
 *    it says so.
 */

import type { MistakeReason } from '../../data/focused-exercises';
import type { Paper, Subskill } from '../../lib/learning/contracts/catalog';
import type { AssistanceLevel, CompletionState, EvidenceMode } from '../../lib/learning/contracts/evidence';
import { ASSISTANCE_ORDER } from '../../lib/learning/contracts/evidence';
import type { ItemOutcomeDraft } from '../../lib/learning/evidence';

/* ── What the page hands the component ───────────────────────────────────── */

/** One question, already resolved from its real paper at build time. */
export interface FocusedItemView {
  /** `<testId>:<questionId>`: the same id the paper and its drill record,
      which is what makes answering it here spend it there too. */
  itemId: string;
  questionId: string;
  /** The question's number inside its own paper, for the label a student
      would see on the real thing. */
  number: number;
  /** "Paragraph B", "Section C": what this question points at. */
  label: string;
  /** The accepted answer, exactly as the paper has it. */
  answer: string;
  /** The publisher's own note on why that is the answer. Teaching prose, so
      it is translated where a translation exists. */
  explanation?: string;
  /** The exact sentence in the passage that decides it. Exam material, so
      it stays English in both languages. */
  evidence?: string;
}

export interface FocusedPassageView {
  label: string;
  title: string;
  paragraphs: readonly { label?: string; html: string }[];
}

export interface FocusedExerciseView {
  exerciseId: string;
  /** `focus:<exerciseId>`, the catalogue id every event is written against. */
  activityId: string;
  contentVersion: number;
  role: 'guided-practice' | 'independent-check';
  paper: Paper;
  subskill: Subskill;
  title: string;
  objective: string;
  expectedMinutes: number;
  /** The paper these questions come from, and the publisher line shown with
      them. Nothing here was written by this project. */
  testId: string;
  attribution: string;
  /** The lesson that teaches this question type, and the exact teaching
   *  block inside it, resolved at build time by the same function that
   *  stamps the ids onto the rendered page (src/lib/learning/lesson-blocks
   *  .ts). `lessonHref` therefore opens the lesson AT that block rather
   *  than at the top of a long page, and `blockId` is what a help request
   *  names. `blockHeading` and `blockText` are carried for one purpose
   *  only: the deterministic answer when there is no tutor. */
  lessonHref?: string;
  lessonKey?: string;
  blockId: string;
  blockHeading: string;
  blockText: string;
  /** The group's instructions as plain text, for the same fallback. */
  instructionText: string;
  passage: FocusedPassageView;
  instructionHtml: string;
  legendHtml?: string;
  /** The shared list of headings, as the paper prints them. */
  options: readonly string[];
  items: readonly FocusedItemView[];
  /** The typical wrong turnings for this question type, as data. */
  reasons: readonly MistakeReason[];
}

/* ── Marking ─────────────────────────────────────────────────────────────── */

/** The same leniency the rest of the site uses for a one-word answer: case
    and surrounding space never decide a mark. */
export function isCorrect(given: string, answer: string): boolean {
  const norm = (value: string) => value.toLowerCase().trim().replace(/\s+/g, ' ');
  return norm(given) !== '' && norm(given) === norm(answer);
}

export function countCorrect(
  items: readonly FocusedItemView[],
  answers: Readonly<Record<string, string>>,
): number {
  return items.filter((item) => isCorrect(answers[item.itemId] ?? '', item.answer)).length;
}

/** 'completed' when every question was answered, 'partial' when some were
    left blank, 'blank' when none was. A blank set is never read as a bad
    result; the policy ignores it. */
export function completionOf(
  items: readonly FocusedItemView[],
  answers: Readonly<Record<string, string>>,
): CompletionState {
  const answered = items.filter((item) => (answers[item.itemId] ?? '').trim() !== '').length;
  if (answered === 0) return 'blank';
  return answered === items.length ? 'completed' : 'partial';
}

/** Practice with help available, or a check with none. The mode is set by
    the exercise's own role and never by the student. */
export function modeFor(role: FocusedExerciseView['role']): EvidenceMode {
  return role === 'independent-check' ? 'assessment' : 'practice';
}

/* ── Assistance ──────────────────────────────────────────────────────────── */

/** What the student has been shown about one item so far. */
export interface ItemHelpState {
  /** Everything Mr EZ has already said about this item, oldest first, so
      the next hint does not repeat it. */
  hints: readonly string[];
  /** True once the sentence from the passage has been pointed at. */
  evidenceShown: boolean;
  /** True once the full explanation has been shown, which names the answer. */
  explanationShown: boolean;
  assistance: AssistanceLevel;
}

export const NO_HELP: ItemHelpState = {
  hints: [],
  evidenceShown: false,
  explanationShown: false,
  assistance: 'none',
};

export function raise(current: AssistanceLevel, next: AssistanceLevel): AssistanceLevel {
  return ASSISTANCE_ORDER.indexOf(next) > ASSISTANCE_ORDER.indexOf(current) ? next : current;
}

/** Assistance never comes down, so an answer that was helped once can never
    later read as independent. */
export function withHelp(state: ItemHelpState, change: Partial<ItemHelpState>): ItemHelpState {
  const next = { ...state, ...change };
  return { ...next, assistance: raise(state.assistance, change.assistance ?? state.assistance) };
}

/* ── Why it went wrong, in the student's own words ───────────────────────── */

/** What the student said about one wrong answer. Stored with the evidence,
    never turned into a finding. */
export interface StatedReason {
  /** A MistakeReason id from the exercise's own list. */
  reasonId: string;
  /** Anything they added, trimmed and capped by the caller. */
  note?: string;
}

/** The sentence the diagnosis is always wrapped in.
 *
 *  Exported so a test can hold this file to its own promise: the wording
 *  must hedge ("looks like", "worth checking") and must say whose account
 *  it rests on ("what you told us"). A component may never state a cause
 *  flatly, so it may never build this sentence for itself. */
export const TENTATIVE_DIAGNOSIS_SENTENCE =
  'This looks like {diagnosis}, going by what you told us. It is worth checking against the next one rather than taking it as settled.';

/** The sentence shown when what the student told us says nothing about
    method. No diagnosis is invented from it. */
export const NO_DIAGNOSIS_SENTENCE =
  'Thank you, that is recorded. It does not tell us much about method on its own, so the sentence below is the place to start.';

/** The sentence shown after a student says how they chose.
 *
 *  Always hedged, and always attributed to them, because it is a
 *  CONJECTURE about a cause and the only thing actually observed is the
 *  wrong answer. Returns null when what they told us says nothing about
 *  method ("I ran out of time", "I guessed"), where a diagnosis would be an
 *  invention. */
export function tentativeDiagnosis(
  reasons: readonly MistakeReason[],
  stated: StatedReason | null,
): string | null {
  if (!stated) return null;
  const reason = reasons.find((entry) => entry.id === stated.reasonId);
  if (!reason || !reason.diagnosis) return null;
  return reason.diagnosis;
}

/* ── What becomes evidence ───────────────────────────────────────────────── */

export interface SubmissionInputFor {
  view: FocusedExerciseView;
  answers: Readonly<Record<string, string>>;
  help: Readonly<Record<string, ItemHelpState>>;
  /** What the student said about each item, by item id. Stored on the item
      it belongs to, never turned into a finding. */
  stated?: Readonly<Record<string, StatedReason>>;
  /** Only these items, for a correction attempt. Every item, for the first
      press of check. */
  onlyItemIds?: readonly string[];
}

/** The per-item rows one press of check is worth.
 *
 *  `firstAnswer` is what the student had at that moment: the caller passes
 *  the answers as they stood, and the component never lets an explanation
 *  appear before this has been built. `assistance` is the level the item
 *  had reached BEFORE the answer was settled, which is what stops a correct
 *  answer after a hint counting as an independent demonstration. */
export function itemDrafts(input: SubmissionInputFor): ItemOutcomeDraft[] {
  const wanted = input.onlyItemIds ? new Set(input.onlyItemIds) : null;
  return input.view.items
    .filter((item) => !wanted || wanted.has(item.itemId))
    .map((item) => {
      const given = input.answers[item.itemId] ?? '';
      const help = input.help[item.itemId] ?? NO_HELP;
      const stated = input.stated?.[item.itemId];
      return {
        itemId: item.itemId,
        firstAnswer: given,
        correct: isCorrect(given, item.answer),
        assistance: help.assistance,
        subskill: input.view.subskill,
        ...(stated ? { statedReason: stated } : {}),
      };
    });
}

export function bySubskillOf(
  view: FocusedExerciseView,
  drafts: readonly ItemOutcomeDraft[],
): Record<string, { correct: number; total: number }> {
  const correct = drafts.filter((draft) => draft.correct).length;
  return { [view.subskill]: { correct, total: drafts.length } };
}

/* ── What the student is told afterwards ─────────────────────────────────── */

/** Everything the closing panel says, as keys and values rather than
 *  sentences, so the component can put them through t() and Russian gets
 *  the same structure.
 *
 *  Nothing here is a band, and nothing here claims mastery. The counts are
 *  exactly what happened; the certainty line says what one short set can
 *  and cannot support; the uncertain line names what is still unknown. */
export interface FocusedFeedback {
  demonstratedKey: string;
  demonstratedVars: Record<string, string | number>;
  certaintyKey: string;
  uncertainKey: string;
}

export function feedbackFor(input: {
  role: FocusedExerciseView['role'];
  correct: number;
  total: number;
  /** Items answered with help of any kind. */
  assisted: number;
}): FocusedFeedback {
  if (input.role === 'independent-check') {
    return {
      demonstratedKey: 'On questions you had not seen, with no help, you matched {correct} of {total}.',
      demonstratedVars: { correct: input.correct, total: input.total },
      certaintyKey:
        'That is one independent set. It is enough to move what your plan works on next, and it is not a band and not a final answer about this question type.',
      uncertainKey: 'What a short set cannot show is how this holds up under exam timing on a whole passage.',
    };
  }
  return {
    demonstratedKey: 'You worked {total} questions and got {correct} right, {assisted} of them with help.',
    demonstratedVars: { correct: input.correct, total: input.total, assisted: input.assisted },
    certaintyKey:
      'This was practice with help available, so it shows guided work rather than what you can do on your own. The check that follows is what shows that.',
    uncertainKey: 'Nothing here is a band, and one set is never mastery.',
  };
}

/** How many of this run's items had help of any kind before their answer
    was settled. */
export function assistedCount(
  items: readonly FocusedItemView[],
  help: Readonly<Record<string, ItemHelpState>>,
): number {
  return items.filter((item) => (help[item.itemId] ?? NO_HELP).assistance !== 'none').length;
}
