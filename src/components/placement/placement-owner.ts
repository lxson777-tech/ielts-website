/* Whose placement test is on screen.
 *
 * THE RULE, THE SAME ONE EVERY SCREEN THAT RECORDS WORK FOLLOWS
 * The placement is a session bound to the student on the page at the moment
 * it is opened (or restored), never re-resolved after that, exactly like the
 * focused exercise and the lesson quick check (../learning/exercise-owner.ts,
 * whose session and press claim this file reuses rather than copies):
 *
 *   - the resume state is read and written under that student's own key
 *     only (src/lib/placement/state.ts), so one student's answers or essay
 *     can never land under another's;
 *   - when the account on the page changes (this tab's menu or another
 *     tab), the screen hands over: the outgoing student's sitting stays in
 *     their own resume state exactly as it was (it is written on every
 *     change), the part on screen is taken down, and the screen opens the
 *     incoming student's own placement, with one calm line saying why;
 *   - a press (start, submit an essay, skip or carry on) is accepted only
 *     from a session whose student is still the one on the page, and a tab
 *     that missed the change is caught by asking this device's stored
 *     account session (claimExerciseCheck, storedSessionAgrees);
 *   - everything a press records goes through a writer that takes the
 *     owner (recordWritingGradedFor, recordWritingAttemptFor and
 *     settlePlacementPart below), bound at the press, so a grade that comes
 *     back after the page changed hands lands with the student who wrote
 *     the essay and nobody else.
 *
 * The Listening and Reading papers are the test player's own sittings (the
 * placement sitting store in src/lib/placement/state.ts) and follow its
 * rules; the Speaking interview is the live examiner's, which binds its own
 * grade to the student who spoke.
 *
 * No JSX, so tests/placement.test.ts drives every case with a Map.
 */

import type { CacheOwner } from '../../lib/learning/contracts/sync';
import type { EvidenceEvent } from '../../lib/learning/contracts/evidence';
import { nt } from '../../lib/i18n/translate';
import { writingActivityId } from '../../lib/learning/catalog';
import { recordWritingGradedFor } from '../../lib/learning/store.browser';
import { recordWritingAttemptFor } from '../../lib/progress';
import { ownerNamespace, type BrowserStorage } from '../../lib/store-owner';
import type { EssayPrompt, GradeResult } from '../../lib/writing/schema';
import {
  placementEvidence,
  readPlacementState,
  settlePlacementPart,
  startPlacementState,
  updatePlacementState,
  type PlacementStateV1,
} from '../../lib/placement/state';
import {
  claimExerciseCheck,
  exerciseIsCurrent,
  openExerciseSession,
  type ExerciseClaim,
  type ExerciseClaimDeps,
  type ExerciseSession,
} from '../learning/exercise-owner';

/** Shown when the page changes hands while a placement is open, and when a
    tab that missed that change refuses a press. Names nobody and shows
    nothing of the previous student's work. */
export const PLACEMENT_OWNER_CHANGED_NOTE = nt(
  'The account on this page changed. The placement test in progress was kept for the student who was taking it.',
);

export type PlacementSession = ExerciseSession;

export interface OpenedPlacement {
  session: PlacementSession;
  /** That student's sitting in progress on this device, or null. */
  state: PlacementStateV1 | null;
}

/** Open, or restore, the placement for the student on the page now. Used on
    mount and at a hand-over alike. */
export function openPlacement(storage: BrowserStorage | null): OpenedPlacement {
  const session = openExerciseSession();
  return { session, state: readPlacementState(storage, session.namespace) };
}

/** The student on the page is still this placement's. */
export const placementIsCurrent = exerciseIsCurrent;

/** The binding a press is recorded under, or why there is none. The caller
    cancels the binding once the press has done its work (or, for an essay
    sent to be graded, hands it to runOwnedGrade). */
export function claimPlacementPress(session: PlacementSession | null, deps: ExerciseClaimDeps = {}): ExerciseClaim {
  return claimExerciseCheck(session, deps);
}

/** Begin the sitting for the session's student, after a claimed press. */
export function beginPlacementFor(
  storage: BrowserStorage | null,
  session: PlacementSession,
  nowIso: string,
): { state: PlacementStateV1; saved: boolean } {
  return startPlacementState(storage, session.namespace, nowIso);
}

/** Start the Writing clock for `ownerNs`'s sitting, once. A clock already
    running is never restarted: a reload does not hand back time. */
export function startWritingFor(
  storage: BrowserStorage | null,
  ownerNs: string,
  sittingId: string,
  nowMs: number,
  minutes: number,
): PlacementStateV1 | null {
  return updatePlacementState(storage, ownerNs, sittingId, (state) =>
    state.writing ? null : { ...state, writing: { startedAt: nowMs, endsAt: nowMs + minutes * 60_000, essay: '' } },
  );
}

/** Keep the essay as it stands, under the sitting's own student. */
export function keepEssayFor(
  storage: BrowserStorage | null,
  ownerNs: string,
  sittingId: string,
  essay: string,
): boolean {
  return (
    updatePlacementState(storage, ownerNs, sittingId, (state) =>
      state.writing && !state.outcomes.writing ? { ...state, writing: { ...state.writing, essay } } : null,
    ) !== null
  );
}

/** The graded essay, kept for `owner`: the student who wrote it and pressed
 *  submit, whoever is on the page by the time the grade comes back.
 *
 *  Three writes, all to that student: the learner evidence (diagnostic, the
 *  sitting's session id, the placement's source key), the writing history
 *  the report page reads (the same row the Writing trainer writes), and the
 *  part's outcome in their own resume state, so their sitting moves on when
 *  they are next the one on the page. Returns the evidence event, or null
 *  when the store refused it. */
export function keepPlacementWritingGrade(
  storage: BrowserStorage | null,
  owner: CacheOwner,
  sittingId: string,
  submitted: { prompt: EssayPrompt; essay: string; wordCount: number },
  graded: Pick<GradeResult, 'overallBand' | 'criteria' | 'grader' | 'moments' | 'strengths' | 'improvements' | 'actionPlan' | 'mechanics'>,
  at: string,
): EvidenceEvent | null {
  const criteria: Record<string, number> = {};
  for (const key of Object.keys(graded.criteria)) {
    criteria[key] = graded.criteria[key as keyof typeof graded.criteria].band;
  }
  const evidence = placementEvidence(sittingId);
  const event = recordWritingGradedFor(owner, {
    activityId: writingActivityId(submitted.prompt.id),
    paper: 'writing',
    promptId: submitted.prompt.id,
    task: submitted.prompt.task,
    at,
    overallBand: graded.overallBand,
    criteria,
    wordCount: submitted.wordCount,
    grader: graded.grader,
    legacyRef: { store: 'writing', key: submitted.prompt.id, at },
    mode: evidence.mode,
    sessionId: evidence.sessionId,
    sourceMaterial: evidence.sourceMaterial,
  });
  recordWritingAttemptFor(owner, submitted.prompt.id, {
    at,
    overallBand: graded.overallBand,
    criteria,
    wordCount: submitted.wordCount,
    live: graded.grader.live,
    essay: submitted.essay,
    promptTitle: submitted.prompt.title,
    task: submitted.prompt.task,
    report: {
      criteria: graded.criteria,
      moments: graded.moments,
      strengths: graded.strengths,
      improvements: graded.improvements,
      actionPlan: graded.actionPlan,
      mechanics: {
        wordCount: graded.mechanics.wordCount,
        sentenceCount: graded.mechanics.sentenceCount,
        lexicalDiversity: graded.mechanics.lexicalDiversity,
        linkingDevices: graded.mechanics.linkingDevices,
        underLength: graded.mechanics.underLength,
        notes: graded.mechanics.notes,
      },
      grader: graded.grader,
    },
  });
  /* Only a live grade settles the part as assessed. The grader has no stub
     any more, so this is belt and braces: a grade that was not live is kept
     in the history and the record (which excludes it) and the part reads
     as not yet assessed. */
  settlePlacementPart(
    storage,
    ownerNamespace(owner),
    sittingId,
    'writing',
    graded.grader.live
      ? { kind: 'graded', band: graded.overallBand, at }
      : { kind: 'not-assessed', reason: 'failed', at },
  );
  return event;
}
