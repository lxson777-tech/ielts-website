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
 * THE FOUR RULES THIS FILE EXISTS TO KEEP
 * 1. The first answer is the first answer. What is recorded for an item is
 *    what the student had when they pressed check, before a single
 *    explanation, evidence line or tick appeared.
 * 2. Help makes an answer assisted, for good. A hint, an evidence sentence,
 *    an explanation or a word from the tutor all raise the item's
 *    assistance level, and it never comes back down.
 * 3. A cause is never observed. What is observed is a wrong answer; why it
 *    happened is what the student tells us, and every sentence built from
 *    it says so.
 * 4. Half finished work is not lost. The in-progress store at the bottom of
 *    this file keeps the answers a student has given, per owner and per
 *    exercise, so a reload in the middle of a set brings them back with the
 *    help each one had already had. It is cleared the moment the set is
 *    checked and recorded.
 */

import type { MistakeReason } from '../../data/focused-exercises';
import type { Paper, Subskill } from '../../lib/learning/contracts/catalog';
import type { AssistanceLevel, CompletionState, EvidenceMode } from '../../lib/learning/contracts/evidence';
import { ASSISTANCE_ORDER } from '../../lib/learning/contracts/evidence';
import type { ItemOutcomeDraft } from '../../lib/learning/evidence';

/* ── What the page hands the component ───────────────────────────────────── */

/** One question, already resolved from its real paper at build time.
 *
 *  Pilot A's shape covers a question answered by picking one value from a
 *  SHARED list (`FocusedExerciseView.options`): matching headings, matching
 *  information, matching features, categorisation, sentence endings. WP18a
 *  extends this additively for the other Reading types, which the real
 *  papers shape differently and which FocusedExercise.tsx branches on by
 *  which optional field is present, never by `subskill` (so a future type
 *  reusing one of these shapes needs no new branch):
 *
 *   - `options` (per item): multiple choice and multiple answer, where each
 *     ITEM has its own value list rather than the group sharing one. Values
 *     are the paper's own letters (A, B, C...), which is what the answer key
 *     and the shared `isCorrect()` still compare against.
 *   - `before`/`after`: sentence completion and the free-text half of table
 *     completion, where the student types a word rather than choosing one.
 *     `before` is set (even to `''`) exactly when this is a free-text item;
 *     that, not the subskill, is what the component checks.
 *   - `answer` as an array: multiple answer's real material always shares
 *     one accepted pair across two numbered questions (see schema.ts's
 *     `answerPairId`), so both items in the pair carry the same accepted
 *     set and `isCorrect()` accepts membership in it from either slot. */
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
  /** The accepted answer, exactly as the paper has it. An array only for a
      multiple answer pair, where either accepted value earns the mark
      whichever of the two numbered slots it is written in. */
  answer: string | readonly string[];
  /** The publisher's own note on why that is the answer. Teaching prose, so
      it is translated where a translation exists. */
  explanation?: string;
  /** The exact sentence in the passage that decides it. Exam material, so
      it stays English in both languages. */
  evidence?: string;
  /** This item's OWN value list, letter and label together, when the group
      does not share one list across every item (multiple choice: each
      question has its own four options; multiple answer: the pair's shared
      pool, offered on both slots). Overrides `FocusedExerciseView.options`
      for this item only. */
  options?: readonly { value: string; label: string }[];
  /** Sentence text either side of the blank, for a free-text item. `before`
      is set, even to `''`, exactly when this item takes typed text rather
      than a choice; that is the check the component makes, not the
      subskill. */
  before?: string;
  after?: string;
  /** A short clip around this item's own evidence, for a Listening
   *  exercise's "hear that again" control (WP18b/WP19, 2026-09-22). Set
   *  only when the transcript's own timestamps let the evidence sentence be
   *  located reliably (see locateEvidenceWindow below); absent means the
   *  exercise falls back to showing `evidence` as text only, exactly as
   *  Reading already does, rather than guessing an offset that could cut
   *  the answer off. Unused outside Listening. */
  audioReplay?: AudioSegmentWindow;
}

export interface FocusedPassageView {
  label: string;
  title: string;
  paragraphs: readonly { label?: string; html: string }[];
}

/* ── Audio stimulus (Listening, WP18b/WP19) ──────────────────────────────── */

/** A span of the shared recording, in seconds from its own start. The same
    convention src/lib/tests/schema.ts's AudioStimulus already uses for
    startSeconds/endSeconds, so a window here can be handed straight to an
    <audio> element with no conversion. */
export interface AudioSegmentWindow {
  startSeconds: number;
  endSeconds: number;
}

/** What a Listening focused exercise plays, in place of `passage`. The
 *  recording itself is never copied or re-encoded: this is a byte range of
 *  the same file every full paper and drill already stream from. */
export interface FocusedAudioView {
  /** The one recording all four parts share (PracticeTest.audioSrc, or the
      part's own legacy src when the paper has no shared one). Unprefixed;
      the caller applies withBase()/asset(). */
  recordingSrc: string;
  /** 'Part 2', for the label a student would see on the real thing. */
  partLabel: string;
  /** The part's own bounds. The segment actually played is never wider than
      this and never narrower than one located item's own window, so a
      check always plays at least as much as the part it is drawn from
      needs, whatever the transcript could locate. */
  part: AudioSegmentWindow;
  /** What is actually offered for playback: the part's own bounds by
      default, or a tighter window around this exercise's items when every
      one of them could be located in the transcript (see
      groupAudioWindow). Never wider than `part` and never narrower than
      covering every located item in full. */
  segment: AudioSegmentWindow;
  /** True when `segment` was narrowed to the exercise's own items rather
      than falling back to the whole part. Shown to the student as "just
      this part" versus "the section covering these questions", and read by
      tests/focused-listening-types.test.ts to check the fallback is honest. */
  narrowed: boolean;
}

/* ── Locating a moment in a transcript ───────────────────────────────────── */

/** One paragraph of a transcript, plain text, with the second it starts at
    (absolute in the shared recording, the same axis as startSeconds and
    endSeconds). Built once per transcript and reused for every item, so a
    group of six items parses the same HTML six times, not thirty-six. */
export interface TranscriptParagraph {
  startSeconds: number;
  text: string;
}

/** HTML entities the automatic transcripts actually use (see any
    src/data/tests/listening-full-*.ts), decoded before matching so an
    evidence line written with a plain straight quote still finds the
    transcript's &#x27;. Deliberately small: this is matching text a
    publisher wrote, not sanitising arbitrary HTML. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

/** Case, curly quotes and repeated whitespace never decide whether a
    transcript line matches an evidence sentence, the same leniency the rest
    of the site gives a typed answer (src/lib/tests/schema.ts's
    normalizeAnswer). */
function normaliseForMatch(value: string): string {
  return decodeEntities(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip tags after the timestamp marker has already been read off a
    paragraph, leaving plain text an evidence sentence can be searched in. */
function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

const TRANSCRIPT_PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
const TIMESTAMP_RE = /<span class="ts">\[(\d{1,2}):(\d{2})\]<\/span>/;

/** Every timestamped paragraph of a transcript, in order, each carrying the
 *  second it starts at.
 *
 *  Only paragraphs that open with a `[mm:ss]` marker are kept: the
 *  automatic transcript's own note ("Automatic transcript. It may contain
 *  small recognition errors...") carries none and is correctly dropped.
 *  Timestamps are ABSOLUTE in the shared recording (checked against every
 *  part's own startSeconds when this was built: a part beginning at 535.39
 *  seconds opens its transcript at [08:55]), so a paragraph's second can be
 *  compared straight against AudioStimulus.startSeconds/endSeconds with no
 *  conversion. */
export function parseTranscriptParagraphs(transcriptHtml: string): readonly TranscriptParagraph[] {
  const out: TranscriptParagraph[] = [];
  let match: RegExpExecArray | null;
  TRANSCRIPT_PARAGRAPH_RE.lastIndex = 0;
  while ((match = TRANSCRIPT_PARAGRAPH_RE.exec(transcriptHtml))) {
    const inner = match[1] ?? '';
    const ts = TIMESTAMP_RE.exec(inner);
    if (!ts) continue;
    const seconds = Number(ts[1]) * 60 + Number(ts[2]);
    const text = stripTags(inner.slice((ts.index ?? 0) + ts[0].length));
    out.push({ startSeconds: seconds, text });
  }
  return out;
}

/** Where one evidence sentence sits in a transcript, or null when it cannot
 *  be found reliably.
 *
 *  The window is the WHOLE paragraph the sentence starts in, through to the
 *  start of the next paragraph (or `partEndSeconds` for the transcript's
 *  last one): paragraph boundaries are the one thing in this data that is
 *  exact rather than inferred, so using them, instead of the matched
 *  sentence's own guessed length, is what keeps this from ever cutting an
 *  answer off mid-word. A sentence that cannot be found (rare: the survey
 *  behind this package located about 96 percent of Listening evidence
 *  lines this way; the rest were free paraphrase in the explanation rather
 *  than a quoted line) returns null, and the caller falls back to showing
 *  `evidence` as text only, never a guessed offset. */
export function locateEvidenceWindow(
  paragraphs: readonly TranscriptParagraph[],
  evidence: string,
  partEndSeconds: number,
): AudioSegmentWindow | null {
  const needle = normaliseForMatch(evidence);
  if (!needle) return null;
  const index = paragraphs.findIndex((paragraph) => normaliseForMatch(paragraph.text).includes(needle));
  if (index === -1) return null;
  const start = paragraphs[index]!.startSeconds;
  const next = paragraphs[index + 1];
  const end = next ? next.startSeconds : partEndSeconds;
  return { startSeconds: start, endSeconds: Math.max(end, start) };
}

/** A short clip around one located evidence line, for the "hear that again"
 *  control after a wrong answer: from three seconds before the paragraph
 *  starts (so the clause is not cut into mid-word), through to the start of
 *  the NEXT paragraph, exactly as locateEvidenceWindow bounds it. Clamped
 *  to the part, so a replay can never reach into a different question
 *  group's audio. */
export function replayWindow(
  located: AudioSegmentWindow,
  part: AudioSegmentWindow,
  preRollSeconds = 3,
): AudioSegmentWindow {
  return {
    startSeconds: Math.max(part.startSeconds, located.startSeconds - preRollSeconds),
    endSeconds: Math.min(part.endSeconds, located.endSeconds),
  };
}

/** The segment one exercise offers for playback, and each item's own replay
 *  window inside it.
 *
 *  Narrowed only when EVERY item's evidence could be located: one
 *  unlocatable item among six means the group could contain material this
 *  page has no way to bound safely, so the honest fallback is the part's
 *  own bounds, unnarrowed, rather than a window that might cut the
 *  unlocated item's answer off. An item that IS located still gets its own
 *  `audioReplay` clip even when the group as a whole did not narrow, so a
 *  single hard-to-place item never costs the other five their "hear that
 *  again" button. */
export function groupAudioWindow(
  transcriptHtml: string,
  items: readonly { itemId: string; evidence?: string }[],
  part: AudioSegmentWindow,
): { segment: AudioSegmentWindow; narrowed: boolean; itemWindows: ReadonlyMap<string, AudioSegmentWindow> } {
  const paragraphs = parseTranscriptParagraphs(transcriptHtml);
  const itemWindows = new Map<string, AudioSegmentWindow>();
  const located: AudioSegmentWindow[] = [];
  let allLocated = items.length > 0;

  for (const item of items) {
    const window = item.evidence ? locateEvidenceWindow(paragraphs, item.evidence, part.endSeconds) : null;
    if (window) {
      itemWindows.set(item.itemId, window);
      located.push(window);
    } else {
      allLocated = false;
    }
  }

  if (!allLocated || located.length === 0) {
    return { segment: part, narrowed: false, itemWindows };
  }

  const startSeconds = Math.max(part.startSeconds, Math.min(...located.map((w) => w.startSeconds)));
  const endSeconds = Math.min(part.endSeconds, Math.max(...located.map((w) => w.endSeconds)));
  return { segment: { startSeconds, endSeconds }, narrowed: true, itemWindows };
}

/** Which items a seek or a replay to `atSeconds` should mark as assisted.
 *
 *  When the exercise has at least one located `audioReplay` window, only
 *  the items whose own window contains the target second are affected: a
 *  student scrubbing near question 3's answer has not necessarily heard
 *  question 6's again. When NONE of the exercise's items could be located
 *  (an unnarrowed, whole-part segment with no item windows at all), there
 *  is nothing to discriminate by, so every item still unanswered is marked:
 *  the honest reading of "I do not know which answer they were listening
 *  for again" is "any of them still open", not "none of them". */
export function itemsAffectedBySeek(
  items: readonly { itemId: string; audioReplay?: AudioSegmentWindow }[],
  atSeconds: number,
): readonly string[] {
  const withWindows = items.filter((item) => item.audioReplay);
  if (withWindows.length === 0) return items.map((item) => item.itemId);
  return withWindows
    .filter((item) => atSeconds >= item.audioReplay!.startSeconds && atSeconds <= item.audioReplay!.endSeconds)
    .map((item) => item.itemId);
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
      them. Nothing here was written by this project, UNLESS `authored` is
      true (WP18a's sentence endings set, lead decision Q1): then `testId`
      is a synthetic `authored:<id>` that names nothing real, and
      `attribution` says plainly that this was written for the site rather
      than taken from an exam, which FocusedExercise.tsx shows instead of
      its usual "Real exam material." line. */
  testId: string;
  attribution: string;
  authored?: boolean;
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
  /** Exactly one of `passage` or `audio` is set, by paper: Reading shows the
   *  passage it was written against, Listening plays the recording segment
   *  it was heard in (WP18b/WP19, 2026-09-22). Kept as two optional fields
   *  rather than a discriminated union so every exercise written before
   *  Listening had a stimulus of its own keeps compiling unchanged. */
  passage?: FocusedPassageView;
  audio?: FocusedAudioView;
  instructionHtml: string;
  legendHtml?: string;
  /** The shared list of headings, as the paper prints them. Ignored for an
      item that carries its own `options` (see FocusedItemView), and unused
      by a free-text item. */
  options: readonly string[];
  items: readonly FocusedItemView[];
  /** The typical wrong turnings for this question type, as data. */
  reasons: readonly MistakeReason[];
  /** The stated word limit ("NO MORE THAN TWO WORDS"), for a free-text
      exercise (sentence completion, table completion). Undefined when
      nothing in the group is free text. Table completion's own grid is not
      reproduced here: `legendHtml` already carries the publisher's table
      with its numbered blanks as printed, which is shown as read-only
      context above the same numbered free-text items every other free-text
      exercise uses (see FocusedItemView.before), so answering it needs no
      second interactive widget. */
  wordLimit?: number;
}

/* ── Marking ─────────────────────────────────────────────────────────────── */

/** The same leniency the rest of the site uses for a one-word answer: case
    and surrounding space never decide a mark. An array answer is a multiple
    answer pair (see FocusedItemView.answer): the given value only has to be
    A member of the accepted set, because the real pair's two numbered slots
    share one pool and either slot may carry either accepted value. */
export function isCorrect(given: string, answer: string | readonly string[]): boolean {
  const norm = (value: string) => value.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalisedGiven = norm(given);
  if (normalisedGiven === '') return false;
  if (Array.isArray(answer)) return answer.some((candidate) => norm(candidate) === normalisedGiven);
  return normalisedGiven === norm(answer as string);
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

/* ── Pausing and coming back ─────────────────────────────────────────────── */

/* A student answered three of six matching-headings questions, reloaded the
   page, and found "0 of 6 answered" with all three gone (reproduced against
   a production build, 22 September 2026). Nothing had reached the learner
   record either, because a focused exercise records one event when check is
   pressed and check had not been pressed.
   The written focused task never had this problem: it keeps a draft per
   owner and per exercise (written-focused-task.ts's WRITTEN_DRAFT_PREFIX),
   and the lesson quick check keeps an unfinished run the same way
   (src/lib/learning/lesson-check.ts's LESSON_CHECK_PROGRESS_KEY). What
   follows is that same store for this surface, with the same three
   guarantees, and the decisions are here rather than in the component so a
   test can hold them with no browser:

     PER OWNER, ALWAYS. The key carries the owner namespace the learner
     record itself uses, so one student's half answered exercise can never
     be restored for the next one signed in on this browser (architecture
     finding R7.4-account-isolation). This is an isolation guarantee, not a
     convenience: a read for owner B never returns a single answer written
     by owner A, because it never looks at owner A's key.

     THE HELP COMES BACK WITH THE ANSWER. Restoring the answers on their own
     would make a reload a way to launder an assisted answer into an
     independent one: the answer given after a hint would survive and the
     hint would not. So the assistance level each item had reached is kept
     beside its answer and restored with it. Rule 2 of this file holds
     across a reload. The hint PROSE is deliberately not kept (it is tutor
     wording, not evidence); the only cost is that the next hint may repeat
     an earlier one.

     NOTHING SURVIVES COMPLETION. Once check has been pressed the run is in
     the learner record, and a copy left behind would restore a finished
     exercise over a fresh visit. focusedProgressAction returns 'clear' for
     a settled set, so the component cannot get this out of step.

   Convenience storage, never evidence: every read and every write is
   wrapped, and a browser with storage blocked or full loses the resumption
   and nothing else. */

/** localStorage key for an exercise that was started and not finished.
    Follows the naming the two stores above already use, and is a NEW key:
    nothing existing is renamed or reset. */
export const FOCUSED_PROGRESS_KEY = 'ielts.learning.focus.v1';

/** Unfinished exercises older than this are dropped rather than restored. A
    month later the page is a fresh start, not a resumption. The same window
    LESSON_CHECK_PROGRESS_DAYS uses, deliberately. */
export const FOCUSED_PROGRESS_DAYS = 30;

/** The three methods of a Storage object, and nothing else. Taken as an
    interface so a test can hand in a few lines of memory, exactly the way
    written-focused-task.ts and store.browser.ts do. */
export interface FocusedProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FocusedProgressV1 {
  version: 1;
  /** The exercise this belongs to. Checked on the way back in, so a key
      that somehow holds another exercise's run restores nothing. */
  exerciseId: string;
  updatedAt: string;
  /** What is in each box, by item id. Only boxes with something in them. */
  answers: Readonly<Record<string, string>>;
  /** The assistance each item had reached when it was written, so a
      restored answer is never read as unaided work. */
  assistance: Readonly<Record<string, AssistanceLevel>>;
}

/** What a restored exercise hands back to the screen. Empty records, never
    null, so the caller has nothing to branch on. */
export interface RestoredFocusedProgress {
  answers: Record<string, string>;
  assistance: Record<string, AssistanceLevel>;
}

export const NOTHING_RESTORED: RestoredFocusedProgress = { answers: {}, assistance: {} };

export function focusedProgressKey(ownerNamespace: string, exerciseId: string): string {
  return `${FOCUSED_PROGRESS_KEY}::${ownerNamespace}::${exerciseId}`;
}

/** What is worth keeping from the boxes as they stand.
 *
 *  Only the boxes with something in them: a blank is not an answer, and
 *  keeping one would restore an empty selection over a fresh page for no
 *  gain. An item's assistance rides along only when help really was used,
 *  so the stored row stays small and 'none' is never written out.
 *  Returns null when there is nothing to keep, which is what tells the
 *  caller to hold no copy at all rather than an empty one. */
export function focusedProgressToStore(
  exerciseId: string,
  answers: Readonly<Record<string, string>>,
  help: Readonly<Record<string, ItemHelpState>>,
  now: string,
): FocusedProgressV1 | null {
  const kept: Record<string, string> = {};
  const levels: Record<string, AssistanceLevel> = {};
  for (const [itemId, value] of Object.entries(answers)) {
    if (typeof value !== 'string' || value.trim() === '') continue;
    kept[itemId] = value;
    const level = help[itemId]?.assistance;
    if (level && level !== 'none') levels[itemId] = level;
  }
  if (Object.keys(kept).length === 0) return null;
  return { version: 1, exerciseId, updatedAt: now, answers: kept, assistance: levels };
}

/** Keep the boxes as they stand, or drop the copy entirely.
 *
 *  One function, so "what is held while working, and that nothing is held
 *  once it is over" is a single decision with a single test instead of two
 *  calls a component could get out of step. 'clear' for a set that has been
 *  checked (it is in the learner record by then) and for a set with nothing
 *  in it (an exercise opened and left alone leaves no row behind). */
export type FocusedProgressAction =
  | { kind: 'keep'; progress: FocusedProgressV1 }
  | { kind: 'clear' };

export function focusedProgressAction(input: {
  exerciseId: string;
  answers: Readonly<Record<string, string>>;
  help: Readonly<Record<string, ItemHelpState>>;
  /** True once check has been pressed and the run recorded. */
  settled: boolean;
  now: string;
}): FocusedProgressAction {
  if (input.settled) return { kind: 'clear' };
  const progress = focusedProgressToStore(input.exerciseId, input.answers, input.help, input.now);
  return progress ? { kind: 'keep', progress } : { kind: 'clear' };
}

/** Read a half finished exercise back, or nothing when there is nothing
 *  usable.
 *
 *  Usable means: this owner's key, this exercise, this shape, this version,
 *  and recent. Anything else, including a value another program left at the
 *  key and a half written one, is ignored rather than trusted: every field
 *  is checked on the way in, unknown item ids are dropped (a question that
 *  is no longer in the exercise has nowhere to go), and an assistance level
 *  that is not one of the five in the contract is dropped too. Never
 *  throws, so a blocked or full store costs the student the resumption and
 *  nothing else. */
export function readFocusedProgress(
  storage: FocusedProgressStorage | null,
  ownerNamespace: string,
  view: { exerciseId: string; items: readonly { itemId: string }[] },
  now: string,
): RestoredFocusedProgress {
  if (!storage) return { answers: {}, assistance: {} };
  let raw: string | null = null;
  try {
    raw = storage.getItem(focusedProgressKey(ownerNamespace, view.exerciseId));
  } catch {
    return { answers: {}, assistance: {} };
  }
  if (!raw) return { answers: {}, assistance: {} };
  let parsed: Partial<FocusedProgressV1>;
  try {
    parsed = JSON.parse(raw) as Partial<FocusedProgressV1>;
  } catch {
    return { answers: {}, assistance: {} };
  }
  if (!parsed || parsed.version !== 1) return { answers: {}, assistance: {} };
  if (parsed.exerciseId !== view.exerciseId) return { answers: {}, assistance: {} };
  const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '';
  if (!withinDays(updatedAt, now, FOCUSED_PROGRESS_DAYS)) return { answers: {}, assistance: {} };

  const held = parsed.answers;
  if (!held || typeof held !== 'object' || Array.isArray(held)) return { answers: {}, assistance: {} };
  const heldLevels =
    parsed.assistance && typeof parsed.assistance === 'object' && !Array.isArray(parsed.assistance)
      ? (parsed.assistance as Record<string, unknown>)
      : {};

  const wanted = new Set(view.items.map((item) => item.itemId));
  const answers: Record<string, string> = {};
  const assistance: Record<string, AssistanceLevel> = {};
  for (const [itemId, value] of Object.entries(held as Record<string, unknown>)) {
    if (!wanted.has(itemId)) continue;
    if (typeof value !== 'string' || value.trim() === '') continue;
    answers[itemId] = value;
    const level = heldLevels[itemId];
    if (typeof level === 'string' && ASSISTANCE_ORDER.includes(level as AssistanceLevel)) {
      assistance[itemId] = level as AssistanceLevel;
    }
  }
  return { answers, assistance };
}

/** Put the decision into the browser store.
 *
 *  Returns false only when a write was wanted and the browser refused it,
 *  which is what the screen says plainly rather than pretending the work is
 *  safe. A clear that will not go away is inert: the key is namespaced and
 *  every field is checked on the way back in. */
export function applyFocusedProgress(
  storage: FocusedProgressStorage | null,
  ownerNamespace: string,
  exerciseId: string,
  action: FocusedProgressAction,
): boolean {
  if (!storage) return false;
  const key = focusedProgressKey(ownerNamespace, exerciseId);
  if (action.kind === 'clear') {
    try {
      storage.removeItem(key);
    } catch {
      /* Nothing to do and nothing at risk. */
    }
    return true;
  }
  try {
    storage.setItem(key, JSON.stringify(action.progress));
    return true;
  } catch {
    return false;
  }
}

/** Whether `from` is no more than `days` before `to`. The same rule
    src/lib/learning/lesson-check.ts applies to an unfinished quick check,
    copied rather than imported: that module's own withinDays is private to
    it, and this file is deliberately importable with no learning-store
    dependencies at all. An unreadable date is never "recent". */
function withinDays(from: string, to: string, days: number): boolean {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end - start <= days * 24 * 60 * 60 * 1000;
}
