/* Single-passage timed drills, built on the fly from the full tests' parts —
   no separate content to author. Fills the gap between an untimed practice
   quiz and a full 60-minute exam: one passage, a realistic per-passage time
   budget, instant scoring and the same review/evidence features as a full
   test. Recorded attempts are tagged `kind: 'drill'` (see progress.ts) so
   they don't skew the full-test band history.

   Trade-off: a drill reuses a passage that also appears in its full test, so
   drilling it "spends" that passage — taking the full test afterwards means
   one of its three passages is no longer unseen. Worth it for the pacing
   practice; flag to the user if this becomes a problem once tests 6–10 (with
   more passages to rotate through) are authored. */

import type { PracticeTest } from './schema';
import { ALL_TESTS } from '../../data/tests';

export interface DrillMeta {
  id: string;
  test: PracticeTest;
  sourceTestId: string;
  sourceTitle: string;
}

function passageTitle(test: PracticeTest, partIndex: number): string {
  const stimulus = test.parts[partIndex]!.stimulus;
  return stimulus.kind === 'passage' ? stimulus.title : stimulus.label;
}

function buildDrill(source: PracticeTest, partIndex: number): PracticeTest {
  const part = source.parts[partIndex]!;
  const questionCount = part.groups.reduce((s, g) => s + g.questions.length, 0);
  const minutes = Math.max(10, Math.round(source.durationMinutes / source.parts.length));
  return {
    id: `${source.id}-drill-p${partIndex + 1}`,
    skill: source.skill,
    title: `${part.label} Drill — ${passageTitle(source, partIndex)}`,
    description: `One timed passage from "${source.title}" — ${questionCount} questions in ${minutes} minutes. Good for practicing pace on a single passage without committing to a full exam.`,
    durationMinutes: minutes,
    parts: [part],
  };
}

export const ALL_DRILLS: DrillMeta[] = ALL_TESTS.flatMap((test) =>
  test.parts.map((_, i) => {
    const drill = buildDrill(test, i);
    return { id: drill.id, test: drill, sourceTestId: test.id, sourceTitle: test.title };
  }),
);

export function getDrill(id: string): DrillMeta | undefined {
  return ALL_DRILLS.find((d) => d.id === id);
}
