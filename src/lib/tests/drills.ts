/* Single-part timed drills, built on the fly from the full tests' parts (no
   separate content to author). Fills the gap between an untimed practice quiz
   and a full exam: one passage or one listening part, a realistic per-part
   time budget, instant scoring and the same review/evidence features as a
   full test. Recorded attempts are tagged `kind: 'drill'` (see progress.ts)
   so they don't skew the full-test band history.

   Trade-off: a drill reuses a part that also appears in its full test, so
   drilling it "spends" that part, taking the full test afterwards means one
   of its parts is no longer unseen. Worth it for the pacing practice; flag to
   the user if this becomes a problem once more tests are authored. */

import type { PracticeTest } from './schema';
import { ALL_TESTS } from '../../data/tests';

export interface DrillMeta {
  id: string;
  test: PracticeTest;
  sourceTestId: string;
  sourceTitle: string;
  /** 0-based index of the drilled part within its source test. Always
      derive a "Part N" / "Passage N" display from this, never from the
      part's own label string (imported listening data spells that label
      differently test to test, and it's being renamed across the whole
      dataset separately from this file). */
  partIndex: number;
}

function passageTitle(test: PracticeTest, partIndex: number): string {
  const stimulus = test.parts[partIndex]!.stimulus;
  return stimulus.kind === 'passage' ? stimulus.title : stimulus.label;
}

/** Shared drill builder: lifts one part out of a full test into its own
    single-part PracticeTest. Carries `audioSrc` through so a listening drill
    can still play the shared recording (a prior bug dropped it here, which
    silently left drills for listening tests with no audio at all). */
function buildDrill(
  source: PracticeTest,
  partIndex: number,
  opts: { title: string; description: string; minutes: number },
): PracticeTest {
  const part = source.parts[partIndex]!;
  return {
    id: `${source.id}-drill-p${partIndex + 1}`,
    skill: source.skill,
    title: opts.title,
    description: opts.description,
    durationMinutes: opts.minutes,
    audioSrc: source.audioSrc,
    parts: [part],
  };
}

function buildReadingDrill(source: PracticeTest, partIndex: number): PracticeTest {
  const part = source.parts[partIndex]!;
  const questionCount = part.groups.reduce((s, g) => s + g.questions.length, 0);
  const minutes = Math.max(10, Math.round(source.durationMinutes / source.parts.length));
  return buildDrill(source, partIndex, {
    title: `${part.label} Drill: ${passageTitle(source, partIndex)}`,
    description: `One timed passage from "${source.title}", ${questionCount} questions in ${minutes} minutes. Good for practicing pace on a single passage without committing to a full exam.`,
    minutes,
  });
}

/** Trailing digits of a test id (e.g. "listening-full-003" -> "3"), used for
    a short, source-agnostic drill title. Falls back to the full title if the
    id doesn't end in a number. */
function testNumber(test: PracticeTest): string {
  const m = test.id.match(/(\d+)$/);
  return m ? String(parseInt(m[1], 10)) : test.title;
}

function buildListeningDrill(source: PracticeTest, partIndex: number): PracticeTest {
  const part = source.parts[partIndex]!;
  const questionCount = part.groups.reduce((s, g) => s + g.questions.length, 0);
  const minutes = 8;
  return buildDrill(source, partIndex, {
    title: `Test ${testNumber(source)} · Part ${partIndex + 1}`,
    description: `One timed part from "${source.title}", ${questionCount} questions in about ${minutes} minutes. Good for practicing pace on a single part without committing to a full test.`,
    minutes,
  });
}

export const ALL_READING_DRILLS: DrillMeta[] = ALL_TESTS.filter((test) => test.skill === 'reading').flatMap((test) =>
  test.parts.map((_, i) => {
    const drill = buildReadingDrill(test, i);
    return { id: drill.id, test: drill, sourceTestId: test.id, sourceTitle: test.title, partIndex: i };
  }),
);

export const ALL_LISTENING_DRILLS: DrillMeta[] = ALL_TESTS.filter((test) => test.skill === 'listening').flatMap((test) =>
  test.parts.map((_, i) => {
    const drill = buildListeningDrill(test, i);
    return { id: drill.id, test: drill, sourceTestId: test.id, sourceTitle: test.title, partIndex: i };
  }),
);

/** Back-compat alias: existing imports (reading trainer pages, the old
    /tests/drills/[id] redirect) expect a flat reading-only list. */
export const ALL_DRILLS: DrillMeta[] = ALL_READING_DRILLS;

export function getDrill(id: string): DrillMeta | undefined {
  return ALL_READING_DRILLS.find((d) => d.id === id) ?? ALL_LISTENING_DRILLS.find((d) => d.id === id);
}
