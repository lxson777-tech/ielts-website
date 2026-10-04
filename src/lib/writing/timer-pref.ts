/* Whether the Writing trainer shows its clock (Alex, 4 October 2026: the timer
   is optional in the trainer; the checker, which is exam conditions, always
   shows it).

   A per-device display preference, not student data: it is not owned by an
   account and never travels with one, which is why it lives here rather than
   in the owner-bound learner store, and why WritingTester itself never
   touches storage (tests/delayed-grade-owner.test.ts). */

const TIMER_PREF_KEY = 'ielts.writing.timer.v1';

/** True when this device asked to see the trainer's clock. Hidden by default. */
export function readTrainerTimerShown(): boolean {
  try {
    return localStorage.getItem(TIMER_PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeTrainerTimerShown(on: boolean): void {
  try {
    localStorage.setItem(TIMER_PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* not remembered; the choice still holds for this visit */
  }
}
