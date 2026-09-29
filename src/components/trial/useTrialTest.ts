/* The trial's part in a test player: may this paper be started, start it on
   the server before the timer runs, and report it once it is submitted.

   Used by TestPlayer (Reading and Listening, marked in the browser) and by
   the Writing checker (graded by the essay Worker, which settles the test
   itself). A trial build only; on the open site `active` is false and every
   call is a no-op, so the players behave exactly as before.

   The order that matters: the server binds the section's one test to THIS
   paper before the clock starts. If that request fails, nothing is used and
   the student simply presses Start again. Once bound, a refresh or another
   device resumes the same sitting; a different paper in the section is
   refused by the database, not only by this screen. */

import { useCallback, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { beginTrialTest, finishTrialTest } from '../../lib/trial/client';
import { ACCESS_MODE } from '../../lib/trial/mode';
import { testSection, type TrialSection } from '../../lib/trial/offer';
import { useTrial } from '../../lib/trial/react';
import { hasPaidAccess, testAccess } from '../../lib/trial/status';
import { accountBlock, type TrialBlockReason } from './TrialBlock';

export interface TrialTestHook {
  /** True only in a trial build for a paper the trial governs. */
  active: boolean;
  section: TrialSection | null;
  /** Why this paper cannot be opened now, or null when it can (available,
      or begun and resumable). */
  block: TrialBlockReason | null;
  /** True when starting this paper will use the section's one test. */
  startUsesTest: boolean;
  /** Binds the section's test to this paper on the server. */
  begin(): Promise<boolean>;
  busy: boolean;
  error: string | null;
  /** The server's sitting id for this paper's test, once begun. */
  sittingId(): string | null;
  /** Reports a submitted Reading or Listening test. */
  finish(): void;
}

const INACTIVE: TrialTestHook = {
  active: false,
  section: null,
  block: null,
  startUsesTest: false,
  begin: async () => true,
  busy: false,
  error: null,
  sittingId: () => null,
  finish: () => undefined,
};

/** `skip` for a nested retake of a submitted paper, or a mock leg (the mock
    page is gated as a whole). */
export function useTrialTest(testId: string, skip = false): TrialTestHook {
  const { t } = useT();
  const trial = useTrial();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sittingRef = useRef<string | null>(null);

  const section = testSection(testId);
  /* Paid access (docs/paid-access/CONTRACT.md): every paper opens, and none
     of them is the trial's one test, so the trial takes no part here: the
     player behaves as it does on the open site. The Workers check the
     account's paid access for themselves before grading. */
  const paid = trial.phase === 'ready' && trial.status !== null && hasPaidAccess(trial.status, trial.now);
  const active = ACCESS_MODE === 'trial' && !skip && section !== null && !paid;

  let block: TrialBlockReason | null = null;
  let startUsesTest = false;
  if (active) {
    const account = accountBlock(trial);
    if (account) block = account;
    else {
      const access = testAccess(trial.status!, section!, testId, trial.now);
      if (access === 'available') startUsesTest = true;
      else if (access === 'in-progress') {
        sittingRef.current = trial.status!.sections[section!].test?.requestId ?? sittingRef.current;
      } else {
        block =
          access === 'used'
            ? 'test-used'
            : access === 'other-in-progress'
              ? 'test-other-in-progress'
              : access === 'ended'
                ? 'test-ended'
                : access === 'unavailable'
                  ? 'speaking-unavailable'
                  : access === 'no-trial'
                    ? 'no-trial'
                    : 'locked';
      }
    }
  }

  const begin = useCallback(async (): Promise<boolean> => {
    if (!active || !section) return true;
    setBusy(true);
    setError(null);
    const result = await beginTrialTest(section, testId);
    setBusy(false);
    if (result.ok) {
      sittingRef.current = result.requestId ?? null;
      return true;
    }
    setError(
      result.reason === 'offline'
        ? t('You seem to be offline. Nothing was used: press Start again once you are connected.')
        : result.reason === 'test-used' || result.reason === 'test-in-progress'
          ? t('This section’s trial test is already used.')
          : result.reason === 'trial-ended'
            ? t('Your trial has ended.')
            : t('We could not start the test just now. Nothing was used: please try again.'),
    );
    return false;
  }, [active, section, testId, t]);

  const finish = useCallback(() => {
    const id = sittingRef.current;
    if (!active || !id || (section !== 'reading' && section !== 'listening')) return;
    void finishTrialTest(section, id);
  }, [active, section]);

  if (!active) return INACTIVE;
  return { active, section, block, startUsesTest, begin, busy, error, sittingId: () => sittingRef.current, finish };
}
