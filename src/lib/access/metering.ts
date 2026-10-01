import type { AssessmentClaim } from './assessment';
/* Store provider usage only, never essays, recordings or model replies. Rates
   and invoices are reconciled separately; missing usage is not zero cost.

   The record is written after each provider answer and before that answer
   is used. It waits at most `timeoutMs` (review P2-5, 1 October 2026): a
   database that does not answer costs the student a moment, never the grade
   they have already paid for. A record that could not be written is logged,
   and that call reads as unknown cost. */
export const METER_TIMEOUT_MS = 3000;

export function meteredFetch(fetchFn: typeof fetch, claim: AssessmentClaim | null, timeoutMs = METER_TIMEOUT_MS): typeof fetch {
  if (!claim) return fetchFn;
  return async (input, init) => {
    const url=String(input);
    if (!url.startsWith('https://api.openai.com/') && !url.startsWith('https://generativelanguage.googleapis.com/')) return fetchFn(input,init);
    let response: Response;
    const record=async(status:number,usage:unknown,model:unknown)=>{
      let timer: ReturnType<typeof setTimeout> | undefined;
      const write = Promise.resolve()
        .then(() => claim.rpc('assessment_meter', {p_user:claim.userId,p_kind:claim.kind,p_request:claim.requestId,p_status:status,p_model:typeof model==='string'?model.slice(0,100):null,p_usage:usage??null}))
        .then(() => undefined);
      const late = new Promise<'late'>((resolve) => { timer = setTimeout(() => resolve('late'), timeoutMs); });
      try {
        const outcome = await Promise.race([write, late]);
        if (outcome === 'late') console.error('assessment metering timed out',claim.requestId);
      } catch {
        console.error('assessment metering unavailable',claim.requestId);
      } finally {
        clearTimeout(timer);
      }
    };
    try {response=await fetchFn(input,init);} catch(error) {await record(0,null,null);throw error;}
    const body=await response.clone().json().catch(()=>null) as Record<string,unknown>|null;
    await record(response.status,body?.usage ?? body?.usageMetadata ?? null,body?.model ?? null);
    return response;
  };
}
