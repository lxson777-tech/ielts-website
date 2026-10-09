/* Free AI tries, run for real (Alex, 10 October 2026): every migration a
 * project runs today, ending with supabase/migrations/2026-10-10-free-taster.sql,
 * in an in-memory Postgres (PGlite) with Supabase's roles and grants
 * (tools/trial-db.mjs). Every assertion is the database itself deciding.
 *
 * A free account (and a paid-ended one) may try the AI a little, once, for
 * its whole life: 10 Mr EZ requests, 1 essay check, 1 recorded Speaking
 * check. Never a live interview, a mock exam or the placement test. Paid
 * accounts never touch the tries and keep 12 / 6 / 2.
 *
 * The migration is a PROPOSAL, not applied to any real project.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/free-taster.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrialDb, TASTER_MIGRATION } from '../tools/trial-db.mjs';
import { TASTER_LIMITS, TASTER_FEATURES, TASTER_USED_CODE, parseTaster, tasterLeft, canTryFree } from '../src/lib/access/taster.ts';
import { parseTrialStatus } from '../src/lib/trial/status.ts';
import { TASTER_USED_TEXT } from '../src/lib/trial/gate.ts';
import { strings as ruGate } from '../src/lib/i18n/dict/ru/g-free.ts';

const STUDENT = 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-7777-4777-8777-bbbbbbbbbbbb';
const service = { role: 'service_role' as const };
const asStudent = { userId: STUDENT };

type Db = Awaited<ReturnType<typeof createTrialDb>>;
type Json = Record<string, any>;

async function world(): Promise<Db> {
  const db = await createTrialDb();
  await db.addUser(STUDENT, 'student@example.test');
  await db.addUser(OTHER, 'other@example.test');
  await db.addProfile(STUDENT);
  await db.addProfile(OTHER);
  return db;
}

const reserve = (db: Db, kind: string, id: string, user = STUDENT, purpose?: string) =>
  db.rpc('assessment_reserve', { p_user: user, p_kind: kind, p_request: id, p_session: null, ...(purpose ? { p_purpose: purpose } : {}) }, service) as Promise<Json>;
const finish = (db: Db, kind: string, id: string, success: boolean, user = STUDENT) =>
  db.rpc('assessment_finish', { p_user: user, p_kind: kind, p_request: id, p_success: success, p_session: null }, service);
const tutor = (db: Db, id: string, user = STUDENT) => db.rpc('tutor_taster_reserve', { p_user: user, p_request: id }, service) as Promise<Json>;
const release = (db: Db, id: string, user = STUDENT) => db.rpc('tutor_taster_release', { p_user: user, p_request: id }, service) as Promise<Json>;
const status = (db: Db, user = STUDENT) => db.rpc('trial_status', {}, { userId: user }) as Promise<Json>;
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`;

async function buy(db: Db, user = STUDENT) {
  const o = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: user })) as Json;
  const paid = (await db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId.replace(/-/g, '')}`, p_amount: o.amount, p_currency: o.currency }, service)) as Json;
  assert.equal(paid.ok, true, JSON.stringify(paid));
}

/* ── The limits are in one place and match the shared contract ───────── */

test('the SQL limits are the shared TASTER_LIMITS, from one function', async () => {
  const db = await world();
  for (const feature of TASTER_FEATURES) {
    const rows = (await db.raw.query('select public.taster_limit($1) as n', [feature])).rows as Json[];
    assert.equal(rows[0].n, TASTER_LIMITS[feature], feature);
  }
  assert.equal(((await db.raw.query("select public.taster_limit('live') as n")).rows as Json[])[0].n, 0, 'nothing else is a free try');
  // The limits appear as numbers in exactly one place in the file.
  const sql = readFileSync(TASTER_MIGRATION, 'utf8');
  assert.equal((sql.match(/when 'tutor' then 10/g) ?? []).length, 1);
  assert.equal(/12 when 'speaking' then 6/.test(sql), true, 'the paid allowances are carried over unchanged');
  await db.close();
});

test('the migration is idempotent and says plainly that it is not applied', async () => {
  const db = await world();
  const sql = readFileSync(TASTER_MIGRATION, 'utf8');
  await db.raw.exec(sql);
  await db.raw.exec(sql);
  assert.match(sql, /NOT APPLIED to any real Supabase project/);
  assert.equal((await reserve(db, 'writing', 'idem-0001')).ok, true);
  await db.close();
});

test('the service-only functions are not callable by a student or a visitor', async () => {
  const db = await world();
  await assert.rejects(db.rpc('tutor_taster_reserve', { p_user: STUDENT, p_request: 'student-call-01' }, asStudent), /permission denied/);
  await assert.rejects(db.rpc('tutor_taster_release', { p_user: STUDENT, p_request: 'student-call-01' }, asStudent), /permission denied/);
  await assert.rejects(db.rpc('tutor_taster_reserve', { p_user: STUDENT, p_request: 'anon-call-0001' }, { role: 'anon' }), /permission denied/);
  await assert.rejects(db.rpc('taster_status', { p_user: STUDENT }, asStudent), /permission denied/);
  await assert.rejects(db.select('insert into public.tutor_taster_uses (user_id, request_id) values ($1, $2)', [STUDENT, 'insert-direct-1'], asStudent), /permission denied|row-level/);
  await assert.rejects(db.select('update public.tutor_taster_uses set status = $1', ['released'], asStudent), /permission denied|row-level/);
  await db.close();
});

/* ── Writing and speaking: one each, ever ────────────────────────────── */

test('a free account gets exactly one writing and one speaking check, then taster-used', async () => {
  const db = await world();
  for (const kind of ['writing', 'speaking']) {
    const first = await reserve(db, kind, `${kind}-try-0001`);
    assert.deepEqual([first.ok, first.used, first.limit, first.kind], [true, 1, 1, kind]);
    await finish(db, kind, `${kind}-try-0001`, true);
    const second = await reserve(db, kind, `${kind}-try-0002`);
    assert.deepEqual([second.ok, second.reason, second.kind, second.used, second.limit], [false, 'taster-used', kind, 1, 1], kind);
  }
  // The usage row is recorded with no grant.
  const rows = (await db.select('select kind, grant_id, status from public.assessment_usage where user_id = $1 order by kind', [STUDENT], service)) as Json[];
  assert.deepEqual(rows.map((r) => [r.kind, r.grant_id, r.status]), [['speaking', null, 'settled'], ['writing', null, 'settled']]);
  await db.close();
});

test('a try is not used up while it is still being answered twice, and a failed grading gives it back', async () => {
  const db = await world();
  assert.equal((await reserve(db, 'writing', 'writing-fail-01')).ok, true);
  // Reserved counts at once: a second essay at the same moment cannot also be free.
  assert.equal((await reserve(db, 'writing', 'writing-fail-02')).reason, 'taster-used');
  // The same request again is the existing already-requested answer, not a second try.
  assert.equal((await reserve(db, 'writing', 'writing-fail-01')).reason, 'already-requested');
  // The grader failed: the reservation is released and the try is still there.
  await finish(db, 'writing', 'writing-fail-01', false);
  const again = await reserve(db, 'writing', 'writing-fail-03');
  assert.deepEqual([again.ok, again.used], [true, 1]);
  await finish(db, 'writing', 'writing-fail-03', true);
  assert.equal((await reserve(db, 'writing', 'writing-fail-04')).reason, 'taster-used');
  await db.close();
});

test('live, mock, placement and interview feedback stay paid for a free account', async () => {
  const db = await world();
  assert.equal((await reserve(db, 'live', 'free-live-0001')).reason, 'paid-required');
  assert.equal((await reserve(db, 'live', 'free-mock-0001', STUDENT, 'mock')).reason, 'paid-required');
  assert.equal((await reserve(db, 'live', 'free-place-0001', STUDENT, 'placement')).reason, 'paid-required');
  assert.equal((await reserve(db, 'feedback', 'free-feed-0001')).reason, 'unknown-session');
  // A mock or placement label on an essay is not a way in.
  assert.equal((await reserve(db, 'writing', 'free-wmock-0001', STUDENT, 'mock')).reason, 'invalid-request');
  assert.equal((await reserve(db, 'speaking', 'free-splace-001', STUDENT, 'placement')).reason, 'invalid-request');
  // None of that used a try.
  assert.equal((await reserve(db, 'writing', 'free-write-0001')).ok, true);
  await db.close();
});

test('the retired trial assessment counts against the lifetime try', async () => {
  const db = await world();
  // How the retired trial recorded its one assessment: a ledger row with no grant.
  await db.raw.query("insert into public.assessment_usage (user_id, grant_id, kind, request_id, status) values ($1, null, 'writing', 'old-trial-essay1', 'settled')", [STUDENT]);
  assert.equal((await reserve(db, 'writing', 'after-trial-0001')).reason, 'taster-used', 'already had its one writing try');
  assert.equal((await reserve(db, 'speaking', 'after-trial-0002')).ok, true, 'a different kind is unaffected');
  assert.equal((await status(db)).taster.writing.used, 1);
  await db.close();
});

test('tries belong to one account; another free account has its own', async () => {
  const db = await world();
  assert.equal((await reserve(db, 'writing', 'mine-write-0001')).ok, true);
  assert.equal((await reserve(db, 'writing', 'other-write-001', OTHER)).ok, true);
  assert.equal((await tutor(db, 'mine-tutor-0001')).ok, true);
  assert.equal((await status(db, OTHER)).taster.tutor.used, 0);
  await db.close();
});

/* ── Mr EZ tries ─────────────────────────────────────────────────────── */

test('ten Mr EZ tries are reserved, the eleventh is taster-used', async () => {
  const db = await world();
  for (let i = 1; i <= 10; i++) {
    const r = await tutor(db, id('tutor-req', i));
    assert.deepEqual([r.ok, r.fresh, r.used, r.limit, r.kind], [true, true, i, 10, 'tutor'], `try ${i}`);
  }
  const over = await tutor(db, id('tutor-req', 11));
  assert.deepEqual(over, { ok: false, reason: 'taster-used', kind: 'tutor', used: 10, limit: 10 });
  assert.equal((await status(db)).taster.tutor.used, 10);
  await db.close();
});

test('a released Mr EZ try is not counted and can be spent again', async () => {
  const db = await world();
  for (let i = 1; i <= 10; i++) await tutor(db, id('tutor-req', i));
  assert.equal((await tutor(db, 'tutor-req-extra')).reason, 'taster-used');
  assert.deepEqual(await release(db, id('tutor-req', 4)), { ok: true });
  assert.equal((await status(db)).taster.tutor.used, 9);
  const reused = await tutor(db, 'tutor-req-extra');
  assert.deepEqual([reused.ok, reused.fresh, reused.used], [true, true, 10]);
  // Releasing twice, or an unknown id, is harmless.
  assert.deepEqual(await release(db, id('tutor-req', 4)), { ok: false });
  assert.deepEqual(await release(db, 'never-reserved-1'), { ok: false });
  // A released id can be reserved again on a retry (and counts again).
  assert.equal((await tutor(db, id('tutor-req', 4))).reason, 'taster-used');
  await db.close();
});

test('the same Mr EZ request id never charges twice', async () => {
  const db = await world();
  const first = await tutor(db, 'same-request-01');
  const replay = await tutor(db, 'same-request-01');
  assert.deepEqual([first.fresh, first.used], [true, 1]);
  assert.deepEqual([replay.ok, replay.fresh, replay.used], [true, false, 1]);
  assert.equal((await status(db)).taster.tutor.used, 1);
  // A replay still works when the ten are used.
  for (let i = 2; i <= 10; i++) await tutor(db, id('tutor-req', i));
  const late = await tutor(db, 'same-request-01');
  assert.deepEqual([late.ok, late.fresh, late.used], [true, false, 10]);
  assert.equal((await tutor(db, 'another-request1')).reason, 'taster-used');
  await db.close();
});

test('a malformed request id or an unknown account is refused', async () => {
  const db = await world();
  assert.equal((await tutor(db, 'short')).reason, 'invalid-request');
  assert.equal((await tutor(db, 'x'.repeat(129))).reason, 'invalid-request');
  assert.equal((await tutor(db, 'ghost-request-1', 'cccccccc-7777-4777-8777-cccccccccccc')).reason, 'sign-in-required');
  assert.equal((await status(db)).taster.tutor.used, 0);
  await db.close();
});

/* ── Paid accounts never touch the tries ─────────────────────────────── */

test('a paid account keeps 12 / 6 / 2, takes no try, and its Mr EZ call records nothing', async () => {
  const db = await world();
  await buy(db);
  for (const [kind, limit] of [['writing', 12], ['speaking', 6], ['live', 2]] as const) {
    for (let i = 1; i <= limit; i++) {
      const r = await reserve(db, kind, id(`paid-${kind}`, i));
      assert.deepEqual([r.ok, r.used, r.limit], [true, i, limit], `${kind} ${i}`);
    }
    const over = await reserve(db, kind, id(`paid-${kind}`, 99));
    assert.deepEqual([over.reason, over.limit], ['allowance-used', limit], kind);
  }
  const paidTutor = await tutor(db, 'paid-tutor-0001');
  assert.deepEqual([paidTutor.ok, paidTutor.paid, paidTutor.fresh], [true, true, false]);
  const rows = (await db.select('select grant_id from public.assessment_usage where user_id = $1', [STUDENT], service)) as Json[];
  assert.equal(rows.every((r) => r.grant_id !== null), true, 'every paid use is on its grant');
  assert.equal(((await db.select('select count(*)::int as n from public.tutor_taster_uses', [], service))[0] as Json).n, 0);
  assert.deepEqual((await status(db)).taster, { tutor: { used: 0, limit: 10 }, writing: { used: 0, limit: 1 }, speaking: { used: 0, limit: 1 } });
  await db.close();
});

test('a free try used before buying does not shrink the purchase, and the purchase does not use up a free try', async () => {
  const db = await world();
  assert.equal((await reserve(db, 'writing', 'before-buy-0001')).ok, true);
  await finish(db, 'writing', 'before-buy-0001', true);
  await buy(db);
  for (let i = 1; i <= 12; i++) assert.equal((await reserve(db, 'writing', id('after-buy', i))).ok, true, `paid ${i}`);
  assert.equal((await reserve(db, 'writing', 'after-buy-0013')).reason, 'allowance-used');
  const balance = (await db.rpc('assessment_balance', {}, asStudent)) as Json;
  assert.deepEqual([balance.writingUsed, balance.limits.writing, balance.trialUsed], [12, 12, 1]);
  await db.close();
});

test('a paid-ended account is free again and sees the tries it has left', async () => {
  const db = await world();
  await buy(db);
  assert.equal((await reserve(db, 'writing', 'paid-write-0001')).ok, true);
  await finish(db, 'writing', 'paid-write-0001', true);
  await db.expirePaid(STUDENT);
  assert.equal(((await status(db)).access as Json).tier, 'paid-ended');
  // The paid essay was on the grant: it does not count against the lifetime try.
  assert.deepEqual((await status(db)).taster.writing, { used: 0, limit: 1 });
  const t = await reserve(db, 'writing', 'ended-write-0001');
  assert.deepEqual([t.ok, t.limit], [true, 1]);
  await finish(db, 'writing', 'ended-write-0001', true);
  assert.equal((await reserve(db, 'writing', 'ended-write-0002')).reason, 'taster-used');
  // Live stays paid, and Mr EZ gets its ten.
  assert.equal((await reserve(db, 'live', 'ended-live-0001')).reason, 'paid-required');
  const m = await tutor(db, 'ended-tutor-0001');
  assert.deepEqual([m.ok, m.fresh, m.used], [true, true, 1]);
  await db.close();
});

/* ── The status reply ────────────────────────────────────────────────── */

test('trial_status carries taster counts for every account, and the site parser reads them', async () => {
  const db = await world();
  const fresh = await status(db);
  assert.deepEqual(fresh.taster, { tutor: { used: 0, limit: 10 }, writing: { used: 0, limit: 1 }, speaking: { used: 0, limit: 1 } });
  for (const key of ['state', 'access', 'trialRetired', 'assessments', 'paid', 'serverNow']) assert.ok(key in fresh, `${key} is still there`);

  for (let i = 1; i <= 3; i++) await tutor(db, id('tutor-req', i));
  await tutor(db, id('tutor-req', 4));
  await release(db, id('tutor-req', 4));
  assert.equal((await reserve(db, 'speaking', 'status-speak-001')).ok, true);
  await finish(db, 'speaking', 'status-speak-001', true);
  const used = await status(db);
  assert.deepEqual(used.taster, { tutor: { used: 3, limit: 10 }, writing: { used: 0, limit: 1 }, speaking: { used: 1, limit: 1 } });

  const parsed = parseTaster(used.taster)!;
  assert.deepEqual([tasterLeft(parsed, 'tutor'), tasterLeft(parsed, 'writing'), tasterLeft(parsed, 'speaking')], [7, 1, 0]);
  assert.equal(canTryFree('free', parsed, 'tutor'), true);
  assert.equal(canTryFree('free', parsed, 'speaking'), false);
  assert.equal(canTryFree('paid', parsed, 'tutor'), false, 'a paid account uses its own allowance');
  assert.deepEqual(parseTrialStatus(used)?.taster, parsed, 'the whole status parser carries it');
  await db.close();
});

test('the refusal code and sentences the Workers send are the shared ones, in Russian too', () => {
  assert.equal(TASTER_USED_CODE, 'taster-used');
  for (const kind of ['tutor', 'writing', 'speaking'] as const) {
    const text = TASTER_USED_TEXT[kind];
    assert.equal(ruGate[text.en], text.ru, `Russian for the ${kind} sentence`);
    assert.equal(/[–—]/.test(text.en + text.ru), false, 'no dashes');
  }
});
