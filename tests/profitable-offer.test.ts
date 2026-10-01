import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTrialDb, TRIAL_MIGRATION, PAID_MIGRATION, PRE_FREE_MIGRATIONS } from '../tools/trial-db.mjs';

/* The tests marked HISTORY run the migrations as they stood before the
   free-account model retired the trial (1 October 2026,
   supabase/migrations/2026-10-01-free-account.sql): they prove what those
   files did, trial assessment included. What a project runs today is
   proved in tests/free-account-sql.test.ts. */
import { audioDurationMs } from '../src/lib/access/audio-duration.ts';
import { createHandler } from '../workers/grade-essay/src/index.ts';
import { reserveAssessment } from '../src/lib/access/assessment.ts';
import { meteredFetch } from '../src/lib/access/metering.ts';
import { serviceRpc, TrialRefusal, TrialServiceError } from '../src/lib/trial/gate.ts';

const A='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', B='bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';
const service={role:'service_role' as const};

test('HISTORY commercial offer: authoritative price, shared free assessment, paid quotas, failures, ownership and renewals', async () => {
  const db=await createTrialDb({ migrations: PRE_FREE_MIGRATIONS });
  try {
    await db.addUser(A,'paid@example.test'); await db.addUser(B,'trial@example.test');
    const reserve=(user:string,kind:string,id:string,session:string|null=null)=>db.rpc('assessment_reserve',{p_user:user,p_kind:kind,p_request:id,p_session:session},service) as Promise<any>;
    const finish=(user:string,kind:string,id:string,success:boolean,session:string|null=null)=>db.rpc('assessment_finish',{p_user:user,p_kind:kind,p_request:id,p_success:success,p_session:session},service);
    await db.rpc('trial_start',{}, {userId:B});
    assert.equal((await reserve(B,'live','trial-live-1')).reason,'paid-required');
    /* Two requests sent together. PGlite is a single connection, so they
       run one after the other: this proves the counting rule (Writing and
       Speaking share one free assessment), NOT behaviour under concurrency.
       Concurrency is handled by the per-account advisory lock in
       assessment_reserve, which only a real multi-connection Postgres can
       exercise (review P2-2, 1 October 2026). */
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

/* ── Review of 1 October 2026: the server half (Builder M) ─────────────
   Every test below runs the REAL migrations in PGlite (tools/trial-db.mjs).
   PGlite is ONE connection: two calls "at the same time" run one after the
   other, so nothing here proves behaviour under real concurrency. What
   serialises concurrent calls in production is the per-account advisory
   lock, the same one the payment functions take; the tests only check that
   the lock is there and that the counting rules are right. */

const OFFER_FILE = new URL('../supabase/migrations/2026-09-30-profitable-offer.sql', import.meta.url);
const ADMIN_FILE = new URL('../supabase/migrations/2026-09-24-admin.sql', import.meta.url);
const C = 'cccccccc-1111-4111-8111-cccccccccccc';

async function offerWorld(migrations?: string[]) {
  const db = await createTrialDb(migrations ? { migrations } : {});
  await db.addUser(A, 'paid@example.test');
  await db.addUser(B, 'trial@example.test');
  const reserve = (user: string, kind: string, id: string, session: string | null = null, purpose?: string) =>
    db.rpc('assessment_reserve', { p_user: user, p_kind: kind, p_request: id, p_session: session, ...(purpose ? { p_purpose: purpose } : {}) }, service) as Promise<any>;
  const finish = (user: string, kind: string, id: string, success: boolean, session: string | null = null) =>
    db.rpc('assessment_finish', { p_user: user, p_kind: kind, p_request: id, p_success: success, p_session: session }, service) as Promise<any>;
  const buyFor = async (user: string) => {
    const o = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: user })) as any;
    const paid = (await db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId}`, p_amount: o.amount, p_currency: 'KZT' }, service)) as any;
    assert.equal(paid.ok, true);
    return o;
  };
  const age = (user: string, minutes: number) =>
    db.raw.query(`update public.assessment_usage set created_at = created_at - make_interval(mins => $2::int), updated_at = updated_at - make_interval(mins => $2::int) where user_id = $1`, [user, minutes]);
  const balance = (user: string) => db.rpc('assessment_balance', {}, { userId: user }) as Promise<any>;
  return { db, reserve, finish, buyFor, age, balance };
}

test('P1-5: a reservation abandoned for 15 minutes with no successful provider call is released; one the provider answered stays counted', async () => {
  const w = await offerWorld();
  try {
    await w.buyFor(A);
    for (let i = 0; i < 12; i++) assert.equal((await w.reserve(A, 'writing', `w-stale-${String(i).padStart(2, '0')}`)).ok, true);
    // Two of them reached the provider and got a reply before the Worker died.
    await w.db.rpc('assessment_meter', { p_user: A, p_kind: 'writing', p_request: 'w-stale-00', p_status: 200, p_model: 'm', p_usage: null }, service);
    await w.db.rpc('assessment_meter', { p_user: A, p_kind: 'writing', p_request: 'w-stale-01', p_status: 200, p_model: 'm', p_usage: null }, service);
    // One only ever saw a provider error.
    await w.db.rpc('assessment_meter', { p_user: A, p_kind: 'writing', p_request: 'w-stale-02', p_status: 503, p_model: null, p_usage: null }, service);
    assert.equal((await w.reserve(A, 'writing', 'w-too-soon')).reason, 'allowance-used', 'fresh reservations count');
    assert.equal((await w.balance(A)).writingUsed, 12);
    await w.age(A, 16);
    assert.equal((await w.balance(A)).writingUsed, 2, 'the balance already ignores the stale ten');
    assert.equal((await w.reserve(A, 'writing', 'w-after-stale')).ok, true);
    const rows = await w.db.select(`select request_id, status, release_reason from public.assessment_usage where user_id = $1 and request_id like 'w-stale-%' order by request_id`, [A], service) as any[];
    assert.deepEqual(rows.slice(0, 3).map((r) => [r.request_id, r.status, r.release_reason]), [
      ['w-stale-00', 'reserved', null], ['w-stale-01', 'reserved', null], ['w-stale-02', 'released', 'stale']]);
    assert.equal(rows.filter((r) => r.release_reason === 'stale').length, 10);
    // A Worker that answers late with a success still settles it: the student got the grade.
    assert.equal((await w.finish(A, 'writing', 'w-stale-05', true)).ok, true);
    assert.equal((await w.balance(A)).writingUsed, 4);
    // A late failure changes nothing.
    assert.equal((await w.finish(A, 'writing', 'w-stale-06', false)).ok, false);
  } finally { await w.db.close(); }
});

test('P1-5: only an admin can give an assessment back, and the record says who and why', async () => {
  const db = await createTrialDb({ migrations: [TRIAL_MIGRATION, fileURLToPath(ADMIN_FILE), PAID_MIGRATION, fileURLToPath(OFFER_FILE)] });
  try {
    await db.addUser(A, 'paid@example.test');
    await db.addUser(C, 'owner@example.test');
    await db.raw.query('insert into public.admins (user_id, note) values ($1, $2)', [C, 'test admin']);
    const o = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: A })) as any;
    await db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId}`, p_amount: o.amount, p_currency: 'KZT' }, service);
    await db.rpc('assessment_reserve', { p_user: A, p_kind: 'writing', p_request: 'w-support-1', p_session: null }, service);
    await db.rpc('assessment_finish', { p_user: A, p_kind: 'writing', p_request: 'w-support-1', p_success: true, p_session: null }, service);
    const list = (await db.rpc('assessment_admin_usage', { p_user: A }, { userId: C })) as any[];
    assert.equal(list.length, 1);
    assert.equal(list[0].status, 'settled');
    await assert.rejects(db.rpc('assessment_admin_give_back', { p_id: list[0].id, p_note: 'mine' }, { userId: A }), /admin only|42501/);
    await assert.rejects(db.rpc('assessment_admin_usage', { p_user: A }, { userId: A }), /admin only|42501/);
    await assert.rejects(db.rpc('assessment_admin_give_back', { p_id: list[0].id, p_note: 'x' }, { role: 'anon' }), /permission denied|admin only|42501/);
    const given = (await db.rpc('assessment_admin_give_back', { p_id: list[0].id, p_note: 'Grade never shown: phone slept' }, { userId: C })) as any;
    assert.equal(given.ok, true);
    assert.equal(((await db.rpc('assessment_balance', {}, { userId: A })) as any).writingUsed, 0);
    const row = (await db.select('select status, release_reason, released_by, release_note from public.assessment_usage where request_id = $1', ['w-support-1'], service))[0] as any;
    assert.deepEqual(row, { status: 'released', release_reason: 'admin', released_by: C, release_note: 'Grade never shown: phone slept' });
    assert.deepEqual(await db.rpc('assessment_admin_give_back', { p_id: list[0].id, p_note: 'again' }, { userId: C }), { ok: false, reason: 'already-released' });
  } finally { await db.close(); }
});

test('P1-6: placement (once per account) and full mock exams (2 per purchase) never use the 2 live interviews', async () => {
  const w = await offerWorld();
  try {
    await w.db.rpc('trial_start', {}, { userId: B });
    // A trial includes no live interview of any kind.
    assert.equal((await w.reserve(B, 'live', 'trial-place-1', null, 'placement')).reason, 'paid-required');
    assert.equal((await w.reserve(B, 'live', 'trial-mock-1', null, 'mock')).reason, 'paid-required');
    await w.buyFor(A);
    assert.equal((await w.reserve(A, 'live', 'place-0001', null, 'placement')).ok, true);
    await w.finish(A, 'live', 'place-0001', true, 'sess-place');
    assert.equal((await w.reserve(A, 'live', 'place-0002', null, 'placement')).reason, 'placement-used');
    for (const id of ['mock-0001', 'mock-0002']) {
      assert.equal((await w.reserve(A, 'live', id, null, 'mock')).ok, true);
      await w.finish(A, 'live', id, true, `sess-${id}`);
    }
    assert.equal((await w.reserve(A, 'live', 'mock-0003', null, 'mock')).reason, 'mock-allowance-used');
    // The two practice interviews are untouched.
    const b = await w.balance(A);
    assert.equal(b.liveUsed, 0);
    assert.equal(b.mockUsed, 2);
    assert.equal(b.placementUsed, true);
    for (const id of ['live-0001', 'live-0002']) assert.equal((await w.reserve(A, 'live', id)).ok, true);
    assert.equal((await w.reserve(A, 'live', 'live-0003')).reason, 'allowance-used');
    // Feedback on a mock interview works like any other live interview.
    assert.equal((await w.reserve(A, 'feedback', 'fb-mock-1', 'sess-mock-0001')).ok, true);
    // Only a live interview can be a placement or a mock; anything else is refused.
    assert.equal((await w.reserve(A, 'writing', 'w-mock-01', null, 'mock')).reason, 'invalid-request');
    assert.equal((await w.reserve(A, 'live', 'odd-0001', null, 'free')).reason, 'invalid-request');
    // A new purchase brings 2 new mock exams, but never a second placement.
    await w.db.raw.query("update public.access_grants set starts_at = starts_at - interval '31 days', ends_at = ends_at - interval '31 days' where user_id = $1", [A]);
    await w.buyFor(A);
    assert.equal((await w.reserve(A, 'live', 'mock-0004', null, 'mock')).ok, true);
    assert.equal((await w.reserve(A, 'live', 'place-0003', null, 'placement')).reason, 'placement-used');
  } finally { await w.db.close(); }
});

test('P1-4: a paid live interview the examiner never began is given back, only within the window and only once', async () => {
  const w = await offerWorld();
  try {
    await w.buyFor(A);
    assert.equal((await w.reserve(A, 'live', 'live-drop-1')).ok, true);
    await w.finish(A, 'live', 'live-drop-1', true, 'sess-drop-1');
    // Another account cannot give it back.
    assert.equal(((await w.db.rpc('assessment_live_give_back', { p_user: B, p_session: 'sess-drop-1' }, service)) as any).ok, false);
    assert.deepEqual(await w.db.rpc('assessment_live_give_back', { p_user: A, p_session: 'sess-drop-1' }, service), { ok: true, kind: 'live', purpose: 'practice' });
    assert.equal((await w.balance(A)).liveUsed, 0);
    assert.equal(((await w.db.rpc('assessment_live_give_back', { p_user: A, p_session: 'sess-drop-1' }, service)) as any).ok, false, 'only once');
    // Too old: the window is the examiner rule's 90 seconds plus the handshake.
    assert.equal((await w.reserve(A, 'live', 'live-drop-2')).ok, true);
    await w.finish(A, 'live', 'live-drop-2', true, 'sess-drop-2');
    await w.db.raw.query("update public.assessment_usage set created_at = now() - interval '3 minutes' where request_id = 'live-drop-2'");
    assert.equal(((await w.db.rpc('assessment_live_give_back', { p_user: A, p_session: 'sess-drop-2' }, service)) as any).reason, 'too-late');
    // Feedback already asked for: the interview clearly happened.
    assert.equal((await w.reserve(A, 'live', 'live-drop-3')).ok, true);
    await w.finish(A, 'live', 'live-drop-3', true, 'sess-drop-3');
    assert.equal((await w.reserve(A, 'feedback', 'fb-drop-3', 'sess-drop-3')).ok, true);
    assert.equal(((await w.db.rpc('assessment_live_give_back', { p_user: A, p_session: 'sess-drop-3' }, service)) as any).reason, 'feedback-requested');
    // The browser cannot call it.
    await assert.rejects(w.db.rpc('assessment_live_give_back', { p_user: A, p_session: 'sess-drop-2' }, { userId: A }));
  } finally { await w.db.close(); }
});

test('P2-2: reservations take the same per-account advisory lock as the payment functions, not a row lock on auth.users', () => {
  const sql = readFileSync(OFFER_FILE, 'utf8');
  assert.doesNotMatch(sql, /from auth\.users[^;]*for update/i);
  assert.match(sql, /pg_advisory_xact_lock\(hashtext\('access:' \|\| p_user::text\)\)/);
});

test('P2-1: the offer migration carries a commented rollback and runs twice without error', async () => {
  const sql = readFileSync(OFFER_FILE, 'utf8');
  assert.match(sql, /-- ── Rollback/);
  assert.match(sql, /-- drop function if exists public\.assessment_reserve/);
  assert.match(sql, /-- drop table if exists public\.assessment_usage/);
  const w = await offerWorld();
  try {
    await w.buyFor(A);
    assert.equal((await w.reserve(A, 'writing', 'w-rerun-01')).ok, true);
    await w.db.raw.exec(sql);
    await w.db.raw.exec(sql);
    assert.equal((await w.balance(A)).writingUsed, 1);
  } finally { await w.db.close(); }
});

test('HISTORY P2-3: a trial-only account can be deleted; an account with payment records still cannot', async () => {
  const w = await offerWorld(PRE_FREE_MIGRATIONS);
  try {
    await w.db.rpc('trial_start', {}, { userId: B });
    assert.equal((await w.reserve(B, 'writing', 'w-delete-1')).ok, true);
    await w.db.rpc('assessment_meter', { p_user: B, p_kind: 'writing', p_request: 'w-delete-1', p_status: 200, p_model: 'm', p_usage: null }, service);
    await w.finish(B, 'writing', 'w-delete-1', true);
    await w.db.raw.query('delete from auth.users where id = $1', [B]);
    assert.equal(((await w.db.select('select count(*)::int as n from public.assessment_usage where user_id = $1', [B], service))[0] as any).n, 0);
    await w.buyFor(A);
    await w.reserve(A, 'writing', 'w-delete-2');
    await assert.rejects(w.db.raw.query('delete from auth.users where id = $1', [A]), /foreign key|violates/);
  } finally { await w.db.close(); }
});

test('P2-4: requests that failed at the provider (outage) do not count toward the 24-a-day cap; charged failures do', async () => {
  const w = await offerWorld();
  try {
    await w.buyFor(A);
    // A provider outage: 30 attempts, each answered 503 and given back.
    for (let i = 0; i < 30; i++) {
      const id = `w-outage-${String(i).padStart(2, '0')}`;
      assert.equal((await w.reserve(A, 'writing', id)).ok, true, `attempt ${i}`);
      await w.db.rpc('assessment_meter', { p_user: A, p_kind: 'writing', p_request: id, p_status: 503, p_model: null, p_usage: null }, service);
      await w.finish(A, 'writing', id, false);
    }
    assert.equal((await w.reserve(A, 'writing', 'w-after-outage')).ok, true, 'the outage did not lock the student out');
  } finally { await w.db.close(); }
  const v = await offerWorld();
  try {
    await v.buyFor(A);
    // Failures the provider charged for (it answered, the grade was unusable) count.
    for (let i = 0; i < 24; i++) {
      const id = `w-charged-${String(i).padStart(2, '0')}`;
      assert.equal((await v.reserve(A, 'writing', id)).ok, true, `attempt ${i}`);
      await v.db.rpc('assessment_meter', { p_user: A, p_kind: 'writing', p_request: id, p_status: 200, p_model: 'm', p_usage: null }, service);
      await v.finish(A, 'writing', id, false);
    }
    assert.equal((await v.reserve(A, 'writing', 'w-charged-xx')).reason, 'daily-limit');
  } finally { await v.db.close(); }
  const f = await offerWorld();
  try {
    await f.buyFor(A);
    // A flood of attempts that never reach the provider is still bounded.
    for (let i = 0; i < 60; i++) {
      const id = `w-flood-${String(i).padStart(2, '0')}`;
      assert.equal((await f.reserve(A, 'writing', id)).ok, true, `attempt ${i}`);
      await f.finish(A, 'writing', id, false);
    }
    assert.equal((await f.reserve(A, 'writing', 'w-flood-xx')).reason, 'daily-limit');
  } finally { await f.db.close(); }
});

test('P2-5: a database that does not answer is a quick, closed refusal, never a hang', { timeout: 10_000 }, async () => {
  const never = (async (_input: unknown, init?: RequestInit) => new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  })) as typeof fetch;
  const started = Date.now();
  await assert.rejects(serviceRpc(never, 'https://db.test', 'key', 50)('access_paid_now', { p_user: A }), (err: unknown) => err instanceof TrialServiceError);
  assert.ok(Date.now() - started < 2000);
  // A stub that ignores the abort signal entirely is still cut off.
  const deaf = (async () => new Promise<Response>(() => undefined)) as typeof fetch;
  await assert.rejects(serviceRpc(deaf, 'https://db.test', 'key', 50)('access_paid_now', { p_user: A }), (err: unknown) => err instanceof TrialServiceError);
  // Metering never holds a graded answer hostage: a silent database is skipped.
  const claim = { rpc: (() => new Promise(() => undefined)) as never, userId: A, kind: 'writing' as const, requestId: 'req-meter-1' };
  const provider = (async () => new Response(JSON.stringify({ usage: { total_tokens: 1 } }))) as unknown as typeof fetch;
  const t0 = Date.now();
  const response = await meteredFetch(provider, claim, 50)('https://api.openai.com/v1/responses');
  assert.equal(response.status, 200);
  assert.ok(Date.now() - t0 < 2000);
});

test('refusals carry a specific reason and the numbers the screens need', async () => {
  const w = await offerWorld();
  try {
    await w.buyFor(A);
    for (let i = 0; i < 12; i++) await w.reserve(A, 'writing', `w-reason-${String(i).padStart(2, '0')}`);
    const rpc = (async (fn: string, args: Record<string, unknown>) => w.db.rpc(fn, args, service)) as never;
    await assert.rejects(reserveAssessment(rpc, A, 'writing'), (err: unknown) =>
      err instanceof TrialRefusal && err.code === 'assessment-unavailable' && err.reason === 'allowance-used'
        && err.details?.kind === 'writing' && err.details?.limit === 12 && err.details?.used === 12);
    await reserveAssessment(rpc, A, 'live', undefined, 'placement');
    await assert.rejects(reserveAssessment(rpc, A, 'live', undefined, 'placement'), (err: unknown) =>
      err instanceof TrialRefusal && err.reason === 'placement-used');
  } finally { await w.db.close(); }
});
