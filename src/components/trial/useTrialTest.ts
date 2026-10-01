/* The trial's part in a test player, RETIRED with the trial (the
   free-account model, Alex, 1 October 2026; docs/paid-access/
   FREE-ACCOUNT-MODEL.md).

   Used by TestPlayer, the Writing checker, the recorded Speaking page and
   the live examiner, which all ask it whether a paper is "the section's one
   trial test". No paper is any more: a free account never reaches a paper
   (its page is locked and every link to it opens the upgrade pop-up), and
   practice and guidance opens every paper with no trial rules. So the hook
   is always inactive and every player behaves as it does on the open site.
   The Workers check the account's access for themselves before grading.

   The shape is kept so the players need no change; the trial's database
   functions stay (nothing deleted) and are simply no longer called. */

import type { TrialSection } from '../../lib/trial/offer';
import type { TrialBlockReason } from './TrialBlock';

export interface TrialTestHook {
  /** Always false since the trial was retired. */
  active: boolean;
  section: TrialSection | null;
  block: TrialBlockReason | null;
  startUsesTest: boolean;
  begin(): Promise<boolean>;
  busy: boolean;
  error: string | null;
  sittingId(): string | null;
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

export function useTrialTest(_testId: string, _skip = false): TrialTestHook {
  return INACTIVE;
}
