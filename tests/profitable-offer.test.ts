import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialDb } from '../tools/trial-db.mjs';
import { audioDurationMs } from '../src/lib/access/audio-duration.ts';
import { createHandler } from '../workers/grade-essay/src/index.ts';

const A='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', B='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const service={role:'service_role' as const};

test('commercial offer: authoritative price, shared free assessment, paid quotas, failures, ownership and renewals', async () => {
  const db=await createTrialDb();
  try {
    await db.addUser(A,'paid@example.test'); await db.addUser(B,'trial@example.test');
    const reserve=(user:string,kind:string,id:string,session:string|null=null)=>db.rpc('assessment_reserve',{p_user:user,p_kind:kind,p_request:id,p_session:session},service) as Promise<any>;
    const finish=(user:string,kind:string,id:string,success:boolean,session:string|null=null)=>db.rpc('assessment_finish',{p_user:user,p_kind:kind,p_request:id,p_success:success,p_session:session},service);
    await db.rpc('trial_start',{}, {userId:B});
    assert.equal((await reserve(B,'live','trial-live-1')).reason,'paid-required');
    const race=await Promise.all([reserve(B,'writing','trial-write-1'),reserve(B,'speaking','trial-speak-1')]);
    assert.equal(race.filter(x=>x.ok).length,1,'only one shared free reservation');
    assert.equal(race[1].reason,'allowance-used');
    await finish(B,'writing','trial-write-1',false);
    assert.equal((await reserve(B,'speaking','trial-speak-2')).ok,true,'failure restores shared allowance');
    await finish(B,'speaking','trial-speak-2',true);
    assert.equal((await reserve(B,'writing','trial-write-2')).reason,'allowance-used');
    await assert.rejects(()=>db.rpc('assessment_reserve',{p_user:A,p_kind:'live',p_request:'forged-request'}, {userId:B}));
    const old=await db.rpc('access_order_create',{p_plan:'month-3'},{userId:A}) as any;
    assert.equal(old.ok,false,'paused plan cannot be bought through direct RPC');
    async function buy() {
      const o=await db.rpc('access_order_create',{p_plan:'month-1'},{userId:A}) as any;
      assert.equal(o.amount,12990);
      const result=await db.rpc('access_order_paid',{p_order:o.orderId,p_provider:'simulated',p_ref:`sim_${o.orderId}`,p_amount:o.amount,p_currency:'KZT'},service) as any;
      assert.equal(result.ok,true); return o;
    }
    const first=await buy();
    for (let i=0;i<12;i++) assert.equal((await reserve(A,'writing',`writing-${i.toString().padStart(3,'0')}`)).ok,true);
    assert.equal((await reserve(A,'writing','writing-extra')).reason,'allowance-used');
    // The real Worker must refuse before making any model request.
    let modelCalls=0;
    const fetchFn=(async(input:unknown,init?:RequestInit)=>{
      const url=String(input);
      if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:A}));
      if(url.includes('/rpc/'))return new Response(JSON.stringify(await db.rpc(url.split('/rpc/')[1],JSON.parse(String(init?.body)),service)));
      modelCalls++;throw new Error('No paid calls in tests');
    }) as typeof fetch;
    const handler=createHandler({fetch:fetchFn});
    const r=await handler.fetch(new Request('https://local.test',{method:'POST',headers:{Authorization:'Bearer synthetic'},body:JSON.stringify({prompt:{task:'task2',promptHtml:'Explain',minWords:250},essay:'This is a long enough example essay for the request validator to accept and check whether this account has any assessment allowance remaining.'})}),{ALLOWED_ORIGINS:'https://local.test',ACCESS_MODE:'trial',SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'fake',OPENAI_API_KEY:'fake'} as never);
    assert.equal(r.status,403);assert.equal(modelCalls,0);
    for(let i=0;i<6;i++)assert.equal((await reserve(A,'speaking',`speaking-${i}`)).ok,true);
    assert.equal((await reserve(A,'speaking','speaking-extra')).reason,'allowance-used');
    assert.equal((await reserve(A,'live','live-one')).ok,true);
    await finish(A,'live','live-one',true,'provider-session-one');
    assert.equal((await reserve(A,'live','live-two')).ok,true);
    await finish(A,'live','live-two',true,'provider-session-two');
    assert.equal((await reserve(A,'live','live-three')).reason,'allowance-used');
    assert.equal((await reserve(A,'feedback','feedback-one','provider-session-one')).ok,true);
    assert.equal((await reserve(A,'feedback','feedback-dup','provider-session-one')).reason,'already-requested');
    assert.equal((await reserve(A,'feedback','feedback-fake','not-my-session')).reason,'unknown-session');
    const balance=await db.rpc('assessment_balance',{}, {userId:A}) as any;
    assert.equal(balance.writingUsed,12);assert.equal(balance.speakingUsed,6);assert.equal(balance.liveUsed,2);
    await buy();
    assert.equal((await reserve(A,'writing','writing-early-renew')).reason,'allowance-used','future grant does not refill current period');
    await db.raw.query("update public.access_grants set starts_at=starts_at-interval '31 days',ends_at=ends_at-interval '31 days' where user_id=$1",[A]);
    assert.equal((await reserve(A,'writing','writing-next-period')).ok,true);
    assert.equal((await reserve(A,'feedback','feedback-after-expiry','provider-session-two')).ok,true,'finish an admitted interview after its grant expires');
    const refund=await db.rpc('access_order_refunded',{p_order:first.orderId,p_provider_ref:`sim_${first.orderId}`},service) as any;
    assert.equal(refund.ok,true);
    assert.equal((await reserve(A,'feedback','feedback-after-refund','provider-session-one')).reason,'unknown-session');
  } finally {await db.close();}
});

test('audio limit reads the file rather than client duration',()=>{
  function wav(seconds:number){const b=Buffer.alloc(44+seconds*16000*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b.toString('base64');}
  assert.equal(audioDurationMs(wav(301),'audio/wav'),301000);
  assert.throws(()=>audioDurationMs('not audio','audio/mp3'));
  const frame=Buffer.alloc(288);frame[0]=255;frame[1]=243;frame[2]=136; // MPEG2 Layer3 64kbps, 16kHz
  assert.equal(audioDurationMs(frame.toString('base64'),'audio/mp3'),36);
});
