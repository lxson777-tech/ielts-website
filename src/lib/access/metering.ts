import type { AssessmentClaim } from './assessment';
/* Store provider usage only, never essays, recordings or model replies. Rates
   and invoices are reconciled separately; missing usage is not zero cost. */
export function meteredFetch(fetchFn: typeof fetch, claim: AssessmentClaim | null): typeof fetch {
  if (!claim) return fetchFn;
  return async (input, init) => {
    const url=String(input);
    if (!url.startsWith('https://api.openai.com/') && !url.startsWith('https://generativelanguage.googleapis.com/')) return fetchFn(input,init);
    let response: Response;
    const record=async(status:number,usage:unknown,model:unknown)=>{
      await claim.rpc('assessment_meter', {p_user:claim.userId,p_kind:claim.kind,p_request:claim.requestId,p_status:status,p_model:typeof model==='string'?model.slice(0,100):null,p_usage:usage??null})
        .catch(()=>console.error('assessment metering unavailable',claim.requestId));
    };
    try {response=await fetchFn(input,init);} catch(error) {await record(0,null,null);throw error;}
    const body=await response.clone().json().catch(()=>null) as Record<string,unknown>|null;
    await record(response.status,body?.usage ?? body?.usageMetadata ?? null,body?.model ?? null);
    return response;
  };
}
