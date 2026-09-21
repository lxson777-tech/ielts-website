/* Pure logic for the intake: turning answers on a form into PlanGoals and
 * PlanConstraints. No React, no storage, no i18n lookup — everything here is
 * plain data in, plain data out, so tests/intake.test.ts can exercise it
 * with no DOM (architecture section 1.7). Intake.tsx is the only caller in
 * the app.
 *
 * THE ONE RULE EVERYTHING HERE FOLLOWS
 * A field left out of `IntakeAnswers` (`undefined`) means "the student did
 * not touch this", and the previous value survives untouched. Nothing here
 * can invent a band, a date or a daily commitment: an empty answer set
 * fed through `buildGoals`/`buildConstraints` always returns the previous
 * goals/constraints unchanged, byte for byte. That is what makes "Answer
 * later" safe, and what makes an existing student's saved 25 minutes
 * survive a settings-page visit where they only changed their exam date.
 */

import type { Paper } from '../../../lib/learning/contracts/catalog';
import type {
  Confirmation,
  DailyMinutes,
  PlanConstraints,
  PlanGoals,
} from '../../../lib/learning/contracts/plan';
import { RECOMMENDED_DAILY_MINUTES } from '../../../lib/learning/contracts/plan';
import type { Locale } from '../../../lib/i18n/locale';

/** Everything one save (a first-visit finish, or a settings-page save) can
 *  carry. `examDate: null` is the one deliberate way to say "I do not have
 *  a date yet" rather than "not answered" — `undefined` always means
 *  unchanged. */
export interface IntakeAnswers {
  overallTargetBand?: number;
  perPaperMinimums?: Partial<Record<Paper, number | null>>;
  examDate?: string | null;
  studyDays?: 'daily' | 'weekdays';
  dailyMinutes?: DailyMinutes;
  /** The explicit answer to "Can you really give this most days?". Only
      read when `dailyMinutes` is actually part of this save; see
      `buildConstraints`. */
  availabilityConfirmed?: boolean;
  explanationLocale?: Locale;
  hardestPaper?: Paper;
}

/** What the daily-time step should show on load: the student's own
 *  confirmed number if they have one, otherwise the teacher's
 *  recommendation — shown as advice, never applied silently (architecture
 *  4.2, brief section 1, lead decision "R1.3-sixty-minutes"). */
export interface DailyTimeSelection {
  minutes: DailyMinutes;
  needsConfirmation: boolean;
}

export function initialDailyTimeSelection(constraints: PlanConstraints): DailyTimeSelection {
  if (constraints.regularDailyMinutesStatus === 'confirmed') {
    return { minutes: constraints.regularDailyMinutes, needsConfirmation: false };
  }
  return { minutes: RECOMMENDED_DAILY_MINUTES, needsConfirmation: true };
}

/** The three times the intake actually offers, recommended first. Narrower
 *  than the full `DAILY_MINUTE_CHOICES` on purpose: brief section 1 asks for
 *  60 prominent with 25 and 15 as the lighter alternatives, not a five-way
 *  menu that buries the recommendation. */
export const INTAKE_DAILY_MINUTES: readonly DailyMinutes[] = [60, 25, 15];

/** One rung lighter than `from`, for "let's be realistic" — never below the
 *  lightest option the intake offers. */
export function lighterDailyMinutes(from: DailyMinutes): DailyMinutes {
  const index = INTAKE_DAILY_MINUTES.indexOf(from);
  if (index === -1 || index === INTAKE_DAILY_MINUTES.length - 1) return 15;
  return INTAKE_DAILY_MINUTES[index + 1] as DailyMinutes;
}

/** Whether picking `next` (from what the student had before) needs a fresh
 *  "can you really give this" answer before it may be marked confirmed:
 *  always true for a plan that was never confirmed, and true again the
 *  moment a confirmed choice is changed to something else. Re-selecting the
 *  exact same confirmed number needs nothing further. */
export function needsFreshAvailabilityConfirm(previous: PlanConstraints, next: DailyMinutes): boolean {
  if (previous.regularDailyMinutesStatus !== 'confirmed') return true;
  return next !== previous.regularDailyMinutes;
}

export function buildConstraints(previous: PlanConstraints, answers: IntakeAnswers): PlanConstraints {
  const touched = answers.dailyMinutes !== undefined;
  const minutes = answers.dailyMinutes ?? previous.regularDailyMinutes;
  const needsFreshConfirm = touched
    ? needsFreshAvailabilityConfirm(previous, answers.dailyMinutes as DailyMinutes)
    : previous.regularDailyMinutesStatus !== 'confirmed';
  const status: Confirmation = needsFreshConfirm
    ? answers.availabilityConfirmed
      ? 'confirmed'
      : 'provisional'
    : 'confirmed';

  return {
    ...previous,
    regularDailyMinutes: minutes,
    regularDailyMinutesStatus: status,
    studyDays: answers.studyDays ?? previous.studyDays,
    explanationLocale: answers.explanationLocale ?? previous.explanationLocale,
  };
}

function paperMinimumsMerged(
  previous: PlanGoals['perPaperMinimums'],
  changes: NonNullable<IntakeAnswers['perPaperMinimums']>,
  status: Confirmation,
): PlanGoals['perPaperMinimums'] {
  const next = { ...previous };
  for (const paper of Object.keys(changes) as Paper[]) {
    const band = changes[paper];
    if (band === null || band === undefined) delete next[paper];
    else next[paper] = { band, status };
  }
  return next;
}

export function buildGoals(previous: PlanGoals, answers: IntakeAnswers, reportedAt: string): PlanGoals {
  const overallTarget =
    answers.overallTargetBand !== undefined
      ? { band: answers.overallTargetBand, status: 'confirmed' as const }
      : previous.overallTarget;

  const perPaperMinimums = answers.perPaperMinimums
    ? paperMinimumsMerged(previous.perPaperMinimums, answers.perPaperMinimums, 'confirmed')
    : previous.perPaperMinimums;

  const examDate =
    answers.examDate === undefined
      ? previous.examDate
      : answers.examDate === null
        ? null
        : { date: answers.examDate, status: 'confirmed' as const };

  const selfReportedHardestPaper = answers.hardestPaper
    ? { paper: answers.hardestPaper, reportedAt }
    : previous.selfReportedHardestPaper;

  return {
    overallTarget,
    perPaperMinimums,
    examDate,
    route: 'academic',
    selfReported: previous.selfReported,
    ...(selfReportedHardestPaper ? { selfReportedHardestPaper } : {}),
  };
}

/* ── Per-paper minimum inputs, round-tripped with the editable strings a
   <select> holds (SKILL_TARGET_BANDS values such as '6.5'). ─────────────── */

export function inputsFromPerPaperMinimums(minimums: PlanGoals['perPaperMinimums']): Partial<Record<Paper, string>> {
  const out: Partial<Record<Paper, string>> = {};
  for (const paper of Object.keys(minimums) as Paper[]) {
    const entry = minimums[paper];
    if (entry) out[paper] = entry.band.toFixed(1);
  }
  return out;
}

/** The changes to send, comparing what the selects show now against what
 *  they were loaded with. An untouched select (still equal to what it was
 *  loaded with, including "both blank") is left out entirely, so it can
 *  never overwrite a paper the student did not look at. A select cleared
 *  back to "Same as target" is the one deliberate way to remove an existing
 *  minimum, which is why it is told apart from "never set": that paper's
 *  entry is `null`, and `buildGoals` deletes it. */
export function perPaperMinimumsDiff(
  inputs: Partial<Record<Paper, string>>,
  loadedInputs: Partial<Record<Paper, string>>,
): NonNullable<IntakeAnswers['perPaperMinimums']> {
  const out: NonNullable<IntakeAnswers['perPaperMinimums']> = {};
  const papers = new Set<Paper>([...Object.keys(inputs), ...Object.keys(loadedInputs)] as Paper[]);
  for (const paper of papers) {
    const raw = inputs[paper] ?? '';
    const loaded = loadedInputs[paper] ?? '';
    if (raw === loaded) continue;
    if (!raw) {
      out[paper] = null;
      continue;
    }
    const band = Number(raw);
    if (Number.isFinite(band)) out[paper] = band;
  }
  return out;
}

/* ── The exam date, and its one deliberate "no date yet" ─────────────────── */

/** What to send for `examDate`, from the date input's raw value, the
 *  explicit "I do not have a date yet" toggle, and what the field was
 *  loaded with. A blank field the student never touched (nothing loaded,
 *  toggle never pressed) answers `undefined`: unchanged, still unset, never
 *  a fabricated date. A blank field that WAS loaded with a real date answers
 *  `null`: clearing a pre-filled date is itself the deliberate action. */
export function examDateAnswerFrom(input: {
  value: string;
  noDateConfirmed: boolean;
  loadedDate: string | null;
}): string | null | undefined {
  if (input.noDateConfirmed) return null;
  if (input.value) return input.value;
  return input.loadedDate === null ? undefined : null;
}

/* ── A recent score the student reports themselves ───────────────────────── */

/** What `recordSelfReported` (store.browser.ts) is called with. Shaped
 *  nothing like `PlanGoals.overallTarget` or an evidence estimate on
 *  purpose: no `status`, no `certainty`, nothing a policy reader could
 *  mistake for measured evidence. Returns null for a blank or unparsable
 *  band, so a half-filled optional field can never be recorded as a claim
 *  the student did not actually make. */
export interface SelfReportedEntry {
  paper?: Paper;
  band: number;
  takenOn: string;
}

export function selfReportedEntryFrom(input: {
  paper?: Paper | '';
  bandText: string;
  takenOn: string;
}): SelfReportedEntry | null {
  if (!input.bandText || !input.takenOn) return null;
  const band = Number(input.bandText);
  if (!Number.isFinite(band)) return null;
  return input.paper ? { paper: input.paper, band, takenOn: input.takenOn } : { band, takenOn: input.takenOn };
}
