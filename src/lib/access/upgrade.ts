/* Opening the upgrade pop-up from anywhere (docs/paid-access/FREE-ACCOUNT-MODEL.md).

   One dialog (src/components/access/UpgradeDialog.tsx) is mounted by
   BaseLayout in the gated build. Any island or page script asks for it with
   openUpgrade(feature); the dialog listens for the event. Nothing here
   grants anything: the dialog only explains and links to /plans. */

import type { PaidFeature } from './model';
import { nt } from '../i18n/translate';

export const UPGRADE_EVENT = 'ielts:upgrade';

/* What the server answers an account without practice and guidance (Builder
   G's interface, free-account model of 1 October 2026). ALIGN AT MERGE: if G
   names them differently, change only these two lines.
   - The AI Workers (essay, recorded Speaking, live examiner, Mr EZ) refuse
     BEFORE any provider call with HTTP 402 { code: 'paid-required',
     reason: 'paid-required' }.
   - The content door answers 402 or 403 for a paid item (a paper, a pack, a
     writing prompt or model from the bank). */
export const PAID_REQUIRED_CODE = 'paid-required';
export const PAID_REQUIRED_STATUS = 402;

/** Whether a Worker's reply is the paid-required refusal. */
export function isPaidRequired(status: number, code: string | null | undefined, reason?: string | null): boolean {
  return code === PAID_REQUIRED_CODE || reason === PAID_REQUIRED_CODE || (status === PAID_REQUIRED_STATUS && !code);
}

export interface UpgradeRequest {
  feature: PaidFeature | 'first-lesson';
  /** Where the request came from, for the dialog's return link. */
  from?: string;
}

export function openUpgrade(feature: UpgradeRequest['feature'], opts: { from?: string } = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<UpgradeRequest>(UPGRADE_EVENT, { detail: { feature, from: opts.from } }));
}

export function onUpgrade(listener: (request: UpgradeRequest) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<UpgradeRequest>).detail);
  window.addEventListener(UPGRADE_EVENT, handler);
  return () => window.removeEventListener(UPGRADE_EVENT, handler);
}

/** The line each upgrade pop-up leads with. Marked with nt() so the Russian
    coverage test requires a translation for every one; the dialog shows
    them with t(). */
export const UPGRADE_REASON: Record<PaidFeature, string> = {
  test: nt('Timed practice tests with a band estimate come with practice and guidance.'),
  drill: nt('Practice drills come with practice and guidance.'),
  trainer: nt('The trainers come with practice and guidance.'),
  focused: nt('Focused exercises on your weak question types come with practice and guidance.'),
  mock: nt('Full mock exams come with practice and guidance.'),
  placement: nt('The placement test, which builds your plan from your real level, comes with practice and guidance.'),
  essay: nt('Essay feedback against the official criteria comes with practice and guidance.'),
  speaking: nt('Speaking feedback on your recordings comes with practice and guidance.'),
  live: nt('Live interviews with the AI examiner come with practice and guidance.'),
  tutor: nt('Mr EZ, your personal tutor, comes with practice and guidance.'),
  'plan-practice': nt('Your daily practice plan comes with practice and guidance.'),
  'vocab-review': nt('Vocabulary practice and review come with practice and guidance.'),
  'model-answers': nt('The model answer bank comes with practice and guidance.'),
  'cue-cards': nt('The cue card bank comes with practice and guidance.'),
  'band-guide': nt('The band-by-band guide comes with practice and guidance.'),
};
