/* The judgement calls behind one spoken focused task, with no DOM in them.
 *
 * WHY THIS SCREEN NEVER GRADES ITSELF
 * The calibrated Speaking grader judges Pronunciation from real audio and
 * the other three criteria from a diarized transcript, and both cost money
 * and a sign-in. A focused speaking objective has to be usable with none of
 * that: record yourself, listen back, and check yourself against a short
 * checklist. Nothing here ever produces a verdict, a band, or a claim that
 * an objective was "met": what gets recorded is that the student practised,
 * which checklist a they said yes to, and nothing more. Sending the SAME
 * idea to the real grader afterwards is one explicit, labelled, separate
 * step through the existing SpeakingTester flow (see SpokenFocusedTask.tsx),
 * never automatic.
 *
 * PRONUNCIATION, SPECIFICALLY (lead decision Q6)
 * No feedback of any kind may be produced from text or a transcript for
 * pronunciation. This file never scores pronunciation and never infers it
 * from a checklist tick; a pronunciation objective can only be SET from a
 * real audio-graded result (src/components/tutor/speaking-gap.ts) and
 * re-checked only on a NEW recording graded from audio, through the real
 * trainer. `pronunciationNote`, when a task carries one, is a plain,
 * static sentence saying exactly this, never a judgement.
 */

import type { Subskill } from '../../lib/learning/contracts/catalog';
import type { AssistanceLevel, CompletionState, EvidenceMode } from '../../lib/learning/contracts/evidence';
import type { EvidenceDraft } from '../../lib/learning/evidence';
import { promptExposureKey } from '../../lib/learning/evidence';

/* ── What the page hands the component ───────────────────────────────────── */

export interface SpokenTaskView {
  exerciseId: string;
  /** `focus:<exerciseId>`, the catalogue id every event is written against. */
  activityId: string;
  contentVersion: number;
  subskill: Subskill;
  part: 1 | 2 | 3;
  title: string;
  objective: string;
  instruction: string;
  expectedMinutes: number;
  /** A real Part 1 topic id or cue card id (src/data/speaking-prompts.ts),
      resolved at build time so the question on screen is never invented. */
  promptId: string;
  /** The question text the student answers, resolved from the real prompt. */
  questionText: string;
  checklist: readonly string[];
  lessonHref?: string;
  lessonKey?: string;
  blockId: string;
  blockHeading: string;
  blockText: string;
  pronunciationNote?: string;
}

/* ── Self-check, never a verdict ─────────────────────────────────────────── */

/** One tick per checklist line, by index. Ticking is the student marking
    their OWN recording, never a system judgement. */
export type ChecklistState = Readonly<Record<number, boolean>>;

export function emptyChecklist(): ChecklistState {
  return {};
}

export function toggleChecklistItem(state: ChecklistState, index: number): ChecklistState {
  return { ...state, [index]: !state[index] };
}

export function checkedCount(state: ChecklistState): number {
  return Object.values(state).filter(Boolean).length;
}

/* ── Recording and its recovery ──────────────────────────────────────────── */

/** Every way recording can fail to happen, so the recovery message can be
    plain and specific rather than one generic "something went wrong". */
export type MicProblem = 'permission-denied' | 'unavailable' | 'recording-failed' | 'unsupported';

export function micProblemText(problem: MicProblem): string {
  switch (problem) {
    case 'permission-denied':
      return 'The microphone permission was not given, so nothing was recorded. Allow it in your browser and try again, or turn off microphone practice below.';
    case 'unavailable':
      return 'No microphone was found on this device. Try again on a device with one, or turn off microphone practice below.';
    case 'recording-failed':
      return 'The recording did not save properly. Nothing was lost that you had not already recorded; try recording again.';
    case 'unsupported':
      return "This browser cannot record audio. Try a recent version of Chrome, Edge, Firefox or Safari, or turn off microphone practice below.";
  }
}

/** True once there is something to listen back to. A checklist with
    nothing recorded is not a real self-check. */
export function canSelfCheck(hasRecording: boolean): boolean {
  return hasRecording;
}

/* ── What becomes evidence ───────────────────────────────────────────────── */

/** 'completed' once a recording was made and listened back to, whatever the
    checklist says: the checklist is the student's own read of their own
    work, and a low score on it is still real practice, not a failure. */
export function completionOfSpoken(hasRecording: boolean): CompletionState {
  return hasRecording ? 'completed' : 'blank';
}

export function modeForSpoken(stepRole?: string | null): EvidenceMode {
  return stepRole === 'assess' ? 'diagnostic' : 'practice';
}

/** One self-check pass, recorded as `studied`, exactly what "opened a page
 *  and worked through it" is (contracts/evidence.ts StudiedResult): never
 *  `objective-judged`, because nothing here judged anything. The catalogue
 *  activity's own `completionEvidence` says the same thing
 *  (src/lib/learning/catalog.ts's buildSpokenFocusedActivities,
 *  'self-marked'), so a report reading this event and a report reading the
 *  activity it belongs to agree about what kind of evidence it is. */
export function spokenEvidenceDraft(input: {
  view: SpokenTaskView;
  hasRecording: boolean;
  assistance?: AssistanceLevel;
  at: string;
  sessionId?: string;
  locale?: string;
}): EvidenceDraft {
  return {
    activityId: input.view.activityId,
    contentVersion: input.view.contentVersion,
    at: input.at,
    paper: 'speaking',
    subskill: input.view.subskill,
    mode: modeForSpoken(),
    completion: completionOfSpoken(input.hasRecording),
    assistance: input.assistance ?? 'none',
    taskScope: { kind: 'speaking-part', part: input.view.part },
    outcome: { kind: 'studied', estimatedMinutes: input.view.expectedMinutes },
    sourceMaterial: [promptExposureKey(input.view.promptId)],
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.locale === 'en' || input.locale === 'ru' ? { locale: input.locale } : {}),
  };
}
