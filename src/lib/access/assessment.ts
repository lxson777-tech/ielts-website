/* Server-only allowance accounting. Never trust a browser's paid flag. */
import { TrialRefusal, type TrialRpc, TrialServiceError } from '../trial/gate';

export type AssessmentKind = 'writing' | 'speaking' | 'live' | 'feedback';
export interface AssessmentClaim { rpc: TrialRpc; userId: string; kind: AssessmentKind; requestId: string }

export async function reserveAssessment(rpc: TrialRpc, userId: string, kind: AssessmentKind, sessionId?: string): Promise<AssessmentClaim> {
  const requestId = crypto.randomUUID();
  const result = await rpc('assessment_reserve', {p_user:userId,p_kind:kind,p_request:requestId,p_session:sessionId ?? null});
  if (result.ok !== true) {
    const reason = String(result.reason);
    const message = reason === 'allowance-used'
      ? 'Your assessment allowance is used. Your lessons, practice and saved results are still available.'
      : reason === 'daily-limit' ? 'Today\'s assessment safety limit is reached. Please try again tomorrow.'
      : reason === 'paid-required' ? 'Live interviews are included with paid access.'
      : reason === 'already-requested' ? 'This interview already has a feedback request.'
      : reason === 'unknown-session' ? 'Feedback needs a live interview from your own account.'
      : reason === 'trial-ended' ? 'Start an active trial or buy access to request an assessment.' : null;
    if (!message) throw new TrialServiceError('Assessment allowance could not be checked.');
    throw new TrialRefusal('assessment-unavailable', message);
  }
  return {rpc,userId,kind,requestId};
}

export async function finishAssessment(claim: AssessmentClaim | null, success: boolean, sessionId?: string): Promise<void> {
  if (!claim) return;
  // A failed accounting write keeps the reservation counted (fail closed).
  await claim.rpc('assessment_finish', {p_user:claim.userId,p_kind:claim.kind,p_request:claim.requestId,p_success:success,p_session:sessionId ?? null});
}
