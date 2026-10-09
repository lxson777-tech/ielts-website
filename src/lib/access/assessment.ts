/* Server-only allowance accounting. Never trust a browser's paid flag.

   The database (supabase/migrations/2026-09-30-profitable-offer.sql) decides
   every allowance; this file asks it and turns a refusal into a TrialRefusal
   the Workers return as
     { error, code: 'assessment-unavailable', reason, kind?, purpose?, used?, limit? }
   so a screen can tell "used up" from "the service is down". */
import { TrialRefusal, type TrialRpc, TrialServiceError, paidRequired, tasterUsed } from '../trial/gate';

export type AssessmentKind = 'writing' | 'speaking' | 'live' | 'feedback';
/** Which allowance a live interview uses (Alex, 1 October 2026): the 2
    practice interviews, the placement test's once-per-account interview, or
    one of the 2 full mock exams of a purchase. Only `live` takes anything
    but 'practice'. The database caps each one, so the label cannot buy more. */
export type AssessmentPurpose = 'practice' | 'placement' | 'mock';
export interface AssessmentClaim { rpc: TrialRpc; userId: string; kind: AssessmentKind; requestId: string }

/** English fallback text for each refusal reason. The screens show their
    own wording from the reason; these only reach a student whose page does
    not know the reason yet. */
const REFUSAL_MESSAGES: Record<string, string> = {
  'allowance-used': 'Your assessment allowance is used. Your lessons, practice and saved results are still available.',
  'mock-allowance-used': 'You have used the two full mock exams of this purchase. Your lessons, practice and saved results are still available.',
  'placement-used': 'The placement test can be taken once per account, and yours is already taken.',
  'daily-limit': 'Today\'s assessment safety limit is reached. Please try again tomorrow.',
  'paid-required': 'Live interviews are included with paid access.',
  'already-requested': 'This interview already has a feedback request.',
  'unknown-session': 'Feedback needs a live interview from your own account.',
  'trial-ended': 'Start an active trial or buy access to request an assessment.',
};

export async function reserveAssessment(
  rpc: TrialRpc,
  userId: string,
  kind: AssessmentKind,
  sessionId?: string,
  purpose: AssessmentPurpose = 'practice',
): Promise<AssessmentClaim> {
  const requestId = crypto.randomUUID();
  const result = await rpc('assessment_reserve', {
    p_user: userId, p_kind: kind, p_request: requestId, p_session: sessionId ?? null, p_purpose: purpose,
  });
  if (result.ok !== true) {
    const reason = String(result.reason);
    /* No paid or complimentary access (2026-10-01-free-account.sql): the
       free account's one refusal, HTTP 402, the same from every Worker. */
    if (reason === 'paid-required') throw paidRequired();
    /* A free account's lifetime try of this kind is used up (10 October
       2026, 2026-10-10-free-taster.sql): HTTP 402 with its own code, not an
       assessment-unavailable refusal, so a screen can offer the upgrade. */
    if (reason === 'taster-used' && (kind === 'writing' || kind === 'speaking')) {
      throw tasterUsed(kind, typeof result.used === 'number' ? result.used : undefined, typeof result.limit === 'number' ? result.limit : undefined);
    }
    const message = REFUSAL_MESSAGES[reason];
    if (!message) throw new TrialServiceError('Assessment allowance could not be checked.');
    const details = typeof result.limit === 'number'
      ? { kind: String(result.kind ?? kind), purpose: String(result.purpose ?? purpose), used: Number(result.used), limit: result.limit }
      : undefined;
    throw new TrialRefusal('assessment-unavailable', message, reason, details);
  }
  return {rpc,userId,kind,requestId};
}

export async function finishAssessment(claim: AssessmentClaim | null, success: boolean, sessionId?: string): Promise<void> {
  if (!claim) return;
  // A failed accounting write keeps the reservation counted until the
  // database's own 15-minute stale rule releases it (fail closed).
  await claim.rpc('assessment_finish', {p_user:claim.userId,p_kind:claim.kind,p_request:claim.requestId,p_success:success,p_session:sessionId ?? null});
}

/** Gives back a paid live interview the examiner never began (review P1-4).
    The caller has already checked its own session record; the database
    checks again against what it holds. Resolves to the purpose given back
    ('practice' | 'placement' | 'mock'), or null when nothing was. */
export async function giveBackLiveInterview(rpc: TrialRpc, userId: string, providerSessionId: string): Promise<AssessmentPurpose | null> {
  const result = await rpc('assessment_live_give_back', { p_user: userId, p_session: providerSessionId });
  if (result.ok !== true) return null;
  const purpose = String(result.purpose);
  return purpose === 'placement' || purpose === 'mock' ? purpose : 'practice';
}
