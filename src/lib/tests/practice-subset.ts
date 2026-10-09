/* The pure rules behind the practice settings on a paper's start screen
   (Alex, 9 October 2026). No React, no storage, so tests can run them.

   Three jobs:
   1. Choosing passages or parts builds a SUBSET paper. A single chosen part
      gets the very id its existing drill has (`${source}-drill-p${n}`, see
      drills.ts), so it lines up with the drill catalogue. Several, but not
      all, parts get `${source}-drill-p1-p3`. Every part is the same object
      as in the full paper, so scoring and ids are untouched.
   2. A "check unit": the set of question ids that one Check press marks
      together (a multiple-answer group, or the questions of one shared
      answer pool, are marked as a whole; everything else one by one).
   3. Whether a sitting earns a band at all (see resultKindOf). */

import type { PracticeTest, Question, QuestionGroup } from './schema';
import { clockMinutes, isExamConditions, selectedParts, type PracticeSettings } from './practice-settings';
import { listeningDrillMinutes } from './drills';

/** Matches the part numbers a drill-style id ends with: `-drill-p2`,
    `-drill-p1-p3`. A "-retake" suffix is looked past. */
const DRILL_TAIL = /-drill-(p\d+(?:-p\d+)*)$/;

/** The 1-based part numbers a drill-style paper id names, in order, or null
    when the id is not a drill id. `reading-full-016-drill-p1-p3` is [1, 3]. */
export function drillPartNumbers(testId: string): number[] | null {
  const m = DRILL_TAIL.exec(testId.replace(/-retake$/, ''));
  return m ? m[1]!.split('-').map((p) => parseInt(p.slice(1), 10)) : null;
}

/** The full paper a drill-style id was lifted from; any other id unchanged. */
export function sourcePaperOf(testId: string): string {
  return testId.replace(/-retake$/, '').replace(DRILL_TAIL, '');
}

/** The id of the paper holding only the parts at `indices` (0-based) of a
    source with `partCount` parts. All parts: the source's own id. One part:
    the existing drill id. Several: the same scheme with every number. */
export function subsetId(sourceId: string, indices: readonly number[], partCount: number): string {
  if (indices.length >= partCount) return sourceId;
  return `${sourceId}-drill-${indices.map((i) => `p${i + 1}`).join('-')}`;
}

/** Minutes on the paper's own clock for the chosen parts. All parts: the
    paper's own minutes. Reading: its share of the paper (never under ten, the
    single-passage drill's floor). Listening: each part's drill minutes, which
    cover that part's own recording plus a minute. */
export function subsetMinutes(source: PracticeTest, indices: readonly number[]): number {
  if (indices.length >= source.parts.length) return source.durationMinutes;
  if (source.skill === 'listening') {
    return indices.reduce((sum, i) => sum + listeningDrillMinutes(source.parts[i]!), 0);
  }
  return Math.max(10, Math.round((source.durationMinutes * indices.length) / source.parts.length));
}

/** The paper a student sits once the settings are chosen: `source` itself for
    every part, otherwise a paper of just the chosen parts. */
export function buildPracticePaper(source: PracticeTest, settings: PracticeSettings): PracticeTest {
  const indices = selectedParts(settings, source.parts.length);
  if (indices.length >= source.parts.length) return source;
  return {
    ...source,
    id: subsetId(source.id, indices, source.parts.length),
    durationMinutes: subsetMinutes(source, indices),
    parts: indices.map((i) => source.parts[i]!),
  };
}

/** Minutes the countdown will run for the chosen settings, or null when there
    is no timer. */
export function paperClockMinutes(source: PracticeTest, settings: PracticeSettings): number | null {
  return clockMinutes(buildPracticePaper(source, settings).durationMinutes, settings.timer);
}

/** True when a timer will run (exam time or extra time). */
export function timerRuns(settings: PracticeSettings): boolean {
  return settings.timer !== 'off';
}

/** What kind of result this sitting is. Only a full paper sat in exam
    conditions is 'full' (it earns a band and counts as exam evidence);
    anything taken with a setting changed, and every drill, is 'drill'
    (practice: no band). `pageKind` is how the page opened the paper. */
export function resultKindOf(
  pageKind: 'full' | 'drill',
  settings: PracticeSettings,
  source: Pick<PracticeTest, 'skill' | 'parts'>,
): 'full' | 'drill' {
  if (pageKind === 'drill') return 'drill';
  return isExamConditions(settings, source.parts.length, source.skill === 'listening') ? 'full' : 'drill';
}

/** The ids one Check press marks together for `question` in `group`. A
    multiple-answer group is one widget, and numbered questions that share an
    answer pool (`answerPairId`) are marked together too, because showing the
    answer to one would show it for the other. Everything else is on its own. */
export function checkUnit(group: QuestionGroup, question: Question): string[] {
  if (group.type === 'multiple-answer' && !group.questions.some((q) => q.multiSelect)) {
    return group.questions.map((q) => q.id);
  }
  if (question.answerPairId) {
    return group.questions.filter((q) => q.answerPairId === question.answerPairId).map((q) => q.id);
  }
  return [question.id];
}
