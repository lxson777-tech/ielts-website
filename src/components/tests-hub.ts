/* Pure logic for the Tests page (/tests), simplified 8 October 2026.
 *
 * Two small decisions the page makes from the student's saved attempts,
 * kept here so they can be tested without a browser:
 *   - the "Last: Band 6.5" line on the Reading and Listening tiles;
 *   - what "Your results" shows: one friendly line for a student with no
 *     attempts at all, otherwise which tab opens first and which of the two
 *     blocks (score history, weak spots) each tab has anything to show for.
 *
 * The rules match the components that draw the data: ScoreHistory counts
 * full papers only (a drill's band means little), TypeAnalytics counts every
 * attempt that carries a per-type breakdown, drills included. */

import type { TestAttempt, TypeStat } from '../lib/progress';

export type HubSkill = 'reading' | 'listening';
export const HUB_SKILLS: readonly HubSkill[] = ['reading', 'listening'];

export interface AttemptRow {
  testId: string;
  attempt: TestAttempt;
}

/** Attempts recorded before the skill field existed were all Reading. */
export function attemptSkill(attempt: TestAttempt): HubSkill {
  return attempt.skill === 'listening' ? 'listening' : 'reading';
}

function isFull(attempt: TestAttempt): boolean {
  return attempt.kind !== 'drill';
}

/** The band of the most recent full paper per skill, as shown on a tile
    ("6.5"). A skill with no full paper, or whose last band is below the
    table (shown elsewhere in words), gets no line at all. */
export function lastBands(rows: readonly AttemptRow[]): Partial<Record<HubSkill, string>> {
  const out: Partial<Record<HubSkill, string>> = {};
  const latest: Partial<Record<HubSkill, TestAttempt>> = {};
  for (const { attempt } of rows) {
    if (!isFull(attempt)) continue;
    const skill = attemptSkill(attempt);
    const current = latest[skill];
    if (!current || attempt.at.localeCompare(current.at) > 0) latest[skill] = attempt;
  }
  for (const skill of HUB_SKILLS) {
    const attempt = latest[skill];
    if (attempt && Number.isFinite(attempt.band) && attempt.band >= 2.5) out[skill] = attempt.band.toFixed(1);
  }
  return out;
}

export interface SkillResults {
  /** Full papers in the score history. */
  history: number;
  /** Question types with at least one answer (the weak spots list). */
  types: number;
}

export interface ResultsState {
  /** False: show the one friendly line instead of any tabs. */
  hasAny: boolean;
  skills: Record<HubSkill, SkillResults>;
  /** The tab to open first: the skill of the latest attempt that shows up
      in either block, else Reading. */
  initial: HubSkill;
}

export function resultsState(rows: readonly AttemptRow[], typeStats: Record<HubSkill, readonly TypeStat[]>): ResultsState {
  const skills: Record<HubSkill, SkillResults> = {
    reading: { history: 0, types: typeStats.reading.filter((s) => s.total > 0).length },
    listening: { history: 0, types: typeStats.listening.filter((s) => s.total > 0).length },
  };
  for (const { attempt } of rows) if (isFull(attempt)) skills[attemptSkill(attempt)].history += 1;

  const shows = (skill: HubSkill) => skills[skill].history > 0 || skills[skill].types > 0;
  let initial: HubSkill = 'reading';
  let latestAt = '';
  for (const { attempt } of rows) {
    const skill = attemptSkill(attempt);
    if (!shows(skill)) continue;
    if (attempt.at.localeCompare(latestAt) > 0) {
      latestAt = attempt.at;
      initial = skill;
    }
  }
  if (!latestAt && !shows('reading') && shows('listening')) initial = 'listening';

  return { hasAny: shows('reading') || shows('listening'), skills, initial };
}
