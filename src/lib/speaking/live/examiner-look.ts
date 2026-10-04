/* Which picture the live interview shows for the examiner.

   Alex, 4 October 2026: keep the circle (the "orb") for now. Ms. Taylor, the
   drawn examiner (src/components/speaking/ExaminerStage.tsx), is finished and
   ready behind this switch. To bring her back, change the value below to
   'taylor'. Nothing else needs to move: LiveExaminer mounts whichever stage
   this names, with the same audio levels, status line and controls. */

export type ExaminerLook = 'orb' | 'taylor';

export const EXAMINER_LOOK: ExaminerLook = 'orb';

/* ── the orb's colour state (pure, so it can be tested) ─────────────────
   One word says whose turn the circle is showing:
     speaking   the examiner has the turn (violet, ripples)
     listening  the student has the turn (green, the mic ring reacts)
     prep       the Part 2 preparation minute (amber, a pencil)
     quiet      connecting, or the test is over (neutral)
   The status line beside it is the source of meaning; this only picks the
   colour and the little icon, and it never contradicts the line. */

export type OrbMode = 'speaking' | 'listening' | 'prep' | 'quiet';

export function orbMode(input: {
  statusTone: 'examiner' | 'student' | 'quiet';
  stage: 'part1' | 'part2prep' | 'part2talk' | 'part3' | 'wrapup';
  connecting: boolean;
  over: boolean;
}): OrbMode {
  if (input.connecting || input.over) return 'quiet';
  if (input.statusTone === 'examiner') return 'speaking';
  if (input.stage === 'part2prep') return 'prep';
  if (input.statusTone === 'student') return 'listening';
  return 'quiet';
}

/** One smoothing step, so the circle follows the voice instead of jittering
    with every audio frame. `rate` is the share of the gap closed per step. */
export function smoothLevel(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

/** The writes the orb's three moving layers get for one pair of smoothed
    levels. Only transform and opacity are ever animated. */
export function orbFrame(examiner: number, student: number): {
  coreScale: number;
  glowOpacity: number;
  glowScale: number;
  micOpacity: number;
  micScale: number;
} {
  return {
    coreScale: 1 + examiner * 0.32,
    glowOpacity: 0.35 + examiner * 0.65,
    glowScale: 1 + examiner * 0.5,
    micOpacity: Math.min(1, student * 2.2),
    micScale: 1.04 + student * 0.28,
  };
}
