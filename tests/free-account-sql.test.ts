/* The free-account model, run for real: every migration a project runs
 * today, ending with supabase/migrations/2026-10-01-free-account.sql, in an
 * in-memory Postgres (PGlite) with Supabase's roles, grants and auth.uid()
 * (tools/trial-db.mjs). Every assertion is the database itself deciding.
 *
 * Alex's decision of 1 October 2026 (docs/paid-access/FREE-ACCOUNT-
 * MODEL.md): every lesson is free with an account; practice, tests and
 * personal guidance are paid; the trial is retired; Alex can give
 * complimentary access, 30 days at a time, from /admin.
 *
 * The migration is a PROPOSAL, not applied to any real project. Every
 * account is a synthetic uuid in a fresh database per test.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/free-account-sql.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTrialDb, FREE_MIGRATION } from '../tools/trial-db.mjs';
import { canUse, tierOf, type AccessTier, type PaidFeature } from '../src/lib/access/model.ts';
import type { TrialStatus } from '../src/lib/trial/status.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STUDENT = 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-7777-4777-8777-bbbbbbbbbbbb';
const ALEX = 'adadadad-7777-4777-8777-adadadadadad';
const service = { role: 'service_role' as const };
const asStudent = { userId: STUDENT };
const asAlex = { userId: ALEX };
const DAY = 86_400_000;
const ms = (value: unknown) => new Date(value as string).getTime();

type Db = Awaited<ReturnType<typeof createTrialDb>>;
type Json = Record<string, any>;

async function world(): Promise<Db> {
  const db = await createTrialDb();
  await db.addUser(STUDENT, 'student@example.test');
  await db.addUser(OTHER, 'other@example.test');
  await db.addUser(ALEX, 'alex-admin@example.test');
  await db.addProfile(STUDENT);
  await db.addProfile(OTHER);
  await db.makeAdmin(ALEX);
  return db;
}

const canOpen = (db: Db, item: string, user: string | null = STUDENT) =>
  db.rpc('trial_can_open', { p_user: user, p_item: item }, service) as Promise<Json>;
const reserve = (db: Db, kind: string, id: string, user = STUDENT, purpose?: string, session: string | null = null) =>
  db.rpc('assessment_reserve', { p_user: user, p_kind: kind, p_request: id, p_session: session, ...(purpose ? { p_purpose: purpose } : {}) }, service) as Promise<Json>;
const finish = (db: Db, kind: string, id: string, success: boolean, user = STUDENT, session: string | null = null) =>
  db.rpc('assessment_finish', { p_user: user, p_kind: kind, p_request: id, p_success: success, p_session: session }, service);
const complimentary = (db: Db, action: string, user = STUDENT, as: { userId?: string; role?: 'anon' } = asAlex, note?: string) =>
  db.rpc('access_admin_complimentary', { p_user: user, p_action: action, ...(note !== undefined ? { p_note: note } : {}) }, as) as Promise<Json>;
const status = (db: Db, user = STUDENT) => db.rpc('trial_status', {}, { userId: user }) as Promise<Json>;

async function buy(db: Db, user = STUDENT) {
  const o = (await db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: user })) as Json;
  const paid = (await db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId.replace(/-/g, '')}`, p_amount: o.amount, p_currency: o.currency }, service)) as Json;
  assert.equal(paid.ok, true, JSON.stringify(paid));
  return o.orderId as string;
}

async function grantsOf(db: Db, user = STUDENT) {
  return (await db.select(
    'select kind, order_id, plan_id, starts_at, ends_at, revoked_at, stopped_at, granted_by, note from public.access_grants where user_id = $1 order by starts_at',
    [user],
    service,
  )) as Json[];
}

const LESSON_ITEMS = ['lesson:reading-tfng', 'lesson:writing-task2-method', 'lesson:listening-part1', 'lesson:vocabulary-education'];
const PAID_ITEMS = ['test:reading-full-001', 'test:reading-full-001-drill-p1', 'practice:speaking-focus-x', 'pack:model-answers', 'writing-prompt:pte-wt-121-task2', 'writing-model:pte-wt-121-task2'];

/* ── The open check ──────────────────────────────────────────────────── */

test('signed out or unknown: nothing opens; malformed items are not included', async () => {
  const db = await world();
  for (const item of [...LESSON_ITEMS, ...PAID_ITEMS]) {
    assert.deepEqual(await canOpen(db, item, null), { ok: false, reason: 'sign-in-required' }, item);
    assert.deepEqual(await canOpen(db, item, 'cccccccc-0000-4000-8000-cccccccccccc'), { ok: false, reason: 'sign-in-required' }, item);
  }
  for (const bad of ['lesson:../secret', 'admin:everything', 'pack:', 'lesson:READING', '', 'lesson']) {
    assert.deepEqual(await canOpen(db, bad), { ok: false, reason: 'not-included' }, bad);
  }
  await db.close();
});

test('a free account opens every lesson item and is refused every paid one; without a profile, lessons wait for it', async () => {
  const db = await world();
  for (const item of LESSON_ITEMS) assert.deepEqual(await canOpen(db, item), { ok: true, tier: 'free' }, item);
  for (const item of PAID_ITEMS) assert.deepEqual(await canOpen(db, item), { ok: false, reason: 'paid-required' }, item);
  const NO_PROFILE = 'dddddddd-7777-4777-8777-dddddddddddd';
  await db.addUser(NO_PROFILE);
  assert.deepEqual(await canOpen(db, 'lesson:reading-tfng', NO_PROFILE), { ok: false, reason: 'profile-required' });
  assert.deepEqual(await canOpen(db, 'test:reading-full-001', NO_PROFILE), { ok: false, reason: 'paid-required' });
  await db.close();
});

test('paid and complimentary access open everything; when they end the account is free again with every lesson open', async () => {
  const db = await world();
  await buy(db);
  for (const item of [...LESSON_ITEMS, ...PAID_ITEMS]) assert.deepEqual(await canOpen(db, item), { ok: true, tier: 'paid', paid: true }, item);
  await db.expirePaid(STUDENT);
  for (const item of LESSON_ITEMS) assert.equal((await canOpen(db, item)).ok, true, `ended ${item}`);
  for (const item of PAID_ITEMS) assert.equal((await canOpen(db, item)).reason, 'paid-required', `ended ${item}`);

  assert.equal((await complimentary(db, 'give', OTHER)).ok, true);
  for (const item of [...LESSON_ITEMS, ...PAID_ITEMS]) assert.deepEqual(await canOpen(db, item, OTHER), { ok: true, tier: 'complimentary', paid: true }, item);
  await db.close();
});

/* ── The trial, retired ──────────────────────────────────────────────── */

test('the trial is retired: starting one is refused, and an existing trial grants nothing, but every row stays', async () => {
  const db = await world();
  const refused = (await db.rpc('trial_start', { p_questionnaire: null }, asStudent)) as Json;
  assert.deepEqual([refused.ok, refused.code, refused.reason], [false, 'trial-retired', 'trial-retired']);
  assert.equal(refused.status.access.tier, 'free', 'the answer still says what the account has');
  assert.equal(((await db.select('select count(*)::int as n from public.trial_accounts', [], service))[0] as Json).n, 0, 'nothing started');
  await assert.rejects(db.rpc('trial_start', {}, { role: 'anon' }), /permission denied|sign in/);

  // An account that started a trial before it was retired (inside its 72 hours, with a begun test and messages).
  await db.raw.query("insert into public.trial_accounts (user_id, started_at, ends_at) values ($1, now(), now() + interval '72 hours')", [OTHER]);
  await db.raw.query("insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status) values ($1, 'test', 'reading', 'sit-old-trial-1', 'reading-full-001', 'reserved'), ($1, 'tutor', 'reading', 'msg-old-trial-1', 'lesson:reading-paraphrase', 'settled')", [OTHER]);
  assert.equal((await canOpen(db, 'test:reading-full-001', OTHER)).reason, 'paid-required', 'a test begun in the trial no longer opens');
  assert.equal((await canOpen(db, 'lesson:reading-paraphrase', OTHER)).tier, 'free', 'lessons open as for any account');
  // The trial's own assessment is gone; what remains is the free account's lifetime try (2026-10-10-free-taster.sql), one of each.
  assert.equal((await reserve(db, 'live', 'old-trial-live', OTHER)).reason, 'paid-required', 'no trial live interview');
  assert.equal((await reserve(db, 'writing', 'old-trial-essay', OTHER)).ok, true, 'the free essay try, not a trial assessment');
  assert.equal((await reserve(db, 'writing', 'old-trial-essay2', OTHER)).reason, 'taster-used');
  assert.deepEqual(await db.rpc('trial_tutor_reserve', { p_user: OTHER, p_section: 'reading', p_request: 'msg-old-trial-2', p_activity: 'lesson:reading-paraphrase' }, service), { ok: false, reason: 'trial-retired' });
  assert.deepEqual(await db.rpc('trial_test_lease', { p_user: OTHER, p_section: 'reading', p_request: 'sit-old-trial-1' }, service), { ok: false, reason: 'trial-retired' });
  assert.deepEqual(await db.rpc('trial_speaking_session_start', { p_user: OTHER, p_request: 'sit-old-trial-1' }, service), { ok: false, reason: 'trial-retired' });
  assert.equal(((await db.rpc('trial_test_begin', { p_section: 'listening', p_activity: 'listening-full-001', p_request: 'sit-old-trial-2' }, { userId: OTHER })) as Json).reason, 'trial-retired');
  // Its history is untouched.
  assert.equal(((await db.select('select count(*)::int as n from public.trial_usage where user_id = $1', [OTHER], service))[0] as Json).n, 2);
  const s = await status(db, OTHER);
  assert.equal(s.trialRetired, true);
  assert.equal(s.state, 'active', 'the old trial is still reported as a record');
  assert.equal(s.sections.reading.tutorUsed, 1);
  assert.equal(s.assessments.trialLimit, 0, 'and it allows no assessment');
  await db.close();
});

/* ── The AI allowance ────────────────────────────────────────────────── */

test('a free account gets only its one lifetime writing and speaking try (never live, mock or placement); complimentary access carries exactly the paid allowances', async () => {
  const db = await world();
  assert.equal((await reserve(db, 'live', 'free-live-1')).reason, 'paid-required', 'live');
  // (On another free account: the free tries count toward the 24-a-day safety limit, which the complimentary run below fills.)
  for (const kind of ['writing', 'speaking']) {
    assert.equal((await reserve(db, kind, `free-${kind}-1`, OTHER)).ok, true, `${kind}: the one free try`);
    assert.equal((await reserve(db, kind, `free-${kind}-2`, OTHER)).reason, 'taster-used', `${kind}: then used`);
  }
  assert.equal((await reserve(db, 'live', 'free-place-1', STUDENT, 'placement')).reason, 'paid-required');
  assert.equal((await reserve(db, 'feedback', 'free-feedback', STUDENT, undefined, 'live_none')).reason, 'unknown-session');

  assert.equal((await complimentary(db, 'give')).ok, true);
  for (const [kind, limit] of [['writing', 12], ['speaking', 6], ['live', 2]] as const) {
    for (let i = 0; i < limit; i++) {
      const r = await reserve(db, kind, `comp-${kind}-${String(i).padStart(3, '0')}`);
      assert.deepEqual([r.ok, r.used, r.limit], [true, i + 1, limit], `${kind} ${i}`);
    }
    const over = await reserve(db, kind, `comp-${kind}-over`);
    assert.deepEqual([over.ok, over.reason, over.limit], [false, 'allowance-used', limit], kind);
  }
  for (let i = 0; i < 2; i++) assert.equal((await reserve(db, 'live', `comp-mock-${i}xx`, STUDENT, 'mock')).ok, true);
  assert.equal((await reserve(db, 'live', 'comp-mock-over', STUDENT, 'mock')).reason, 'mock-allowance-used');
  assert.equal((await reserve(db, 'live', 'comp-place-1', STUDENT, 'placement')).ok, true);
  assert.equal((await reserve(db, 'live', 'comp-place-2', STUDENT, 'placement')).reason, 'placement-used');

  const balance = (await db.rpc('assessment_balance', {}, asStudent)) as Json;
  assert.deepEqual(
    [balance.kind, balance.writingUsed, balance.speakingUsed, balance.liveUsed, balance.mockUsed, balance.placementUsed, balance.trialLimit],
    ['complimentary', 12, 6, 2, 2, true, 0],
  );
  assert.deepEqual(balance.limits, { writing: 12, speaking: 6, live: 2, mock: 2, placement: 1 });

  // The placement interview is once per ACCOUNT: a later paid grant does not bring it back.
  await complimentary(db, 'stop');
  await buy(db);
  assert.equal((await reserve(db, 'live', 'paid-place-1', STUDENT, 'placement')).reason, 'placement-used');
  assert.equal((await reserve(db, 'writing', 'paid-writing-1')).used, 1, 'a new grant counts from zero');
  await db.close();
});

/* ── Complimentary access: Alex only ─────────────────────────────────── */

test('only an admin can give, renew, stop or list complimentary access; a student cannot give themselves anything', async () => {
  const db = await world();
  for (const action of ['give', 'renew', 'stop']) {
    await assert.rejects(complimentary(db, action, STUDENT, asStudent), /admin only|42501/, `student ${action}`);
    await assert.rejects(complimentary(db, action, STUDENT, { role: 'anon' }), /permission denied|42501/, `anon ${action}`);
  }
  await assert.rejects(db.rpc('access_admin_grants', { p_user: STUDENT }, asStudent), /admin only|42501/);
  await assert.rejects(db.rpc('access_admin_overview', {}, asStudent), /admin only|42501/);
  await assert.rejects(db.rpc('access_admin_overview', {}, { role: 'anon' }), /permission denied|42501/);
  // Nor straight into the table, nor through a helper.
  await assert.rejects(
    db.select("insert into public.access_grants (user_id, kind, starts_at, ends_at) values ($1, 'complimentary', now(), now() + interval '30 days')", [STUDENT], asStudent),
    /permission denied|row-level security/,
  );
  for (const fn of ['access_rechain', 'access_tier', 'access_running_grant', 'access_profile_complete', 'trial_status_for']) {
    await assert.rejects(db.rpc(fn, { p_user: STUDENT }, asStudent), /permission denied/, fn);
  }
  await assert.rejects(db.rpc('access_can_open', { p_user: STUDENT, p_item: 'test:reading-full-001' }, asStudent), /permission denied/);
  await assert.rejects(db.rpc('access_paid_now', { p_user: STUDENT }, asStudent), /permission denied/);
  assert.deepEqual(await grantsOf(db), [], 'nothing was written');
  assert.equal((await canOpen(db, 'test:reading-full-001')).reason, 'paid-required');
  await db.close();
});

test('give: 30 days from now, recorded with who gave it; refused while one is running; the student sees kind complimentary', async () => {
  const db = await world();
  const before = Date.now();
  const given = await complimentary(db, 'give', STUDENT, asAlex, '  Existing centre student, September group  ');
  assert.equal(given.ok, true, JSON.stringify(given));
  assert.equal(ms(given.grant.endsAt) - ms(given.grant.startsAt), 30 * DAY);
  assert.ok(ms(given.grant.startsAt) >= before - 5000 && ms(given.grant.startsAt) <= Date.now() + 5000, 'from now');
  const [row] = await grantsOf(db);
  assert.deepEqual([row!.kind, row!.order_id, row!.plan_id, row!.granted_by, row!.note], ['complimentary', null, null, ALEX, 'Existing centre student, September group']);
  assert.deepEqual(await complimentary(db, 'give'), { ok: false, reason: 'already-given' }, 'a second give is a renew, not a double grant');

  const s = await status(db);
  assert.deepEqual([s.paid.kind, s.paid.planId, s.access.tier, s.access.profileComplete], ['complimentary', 'complimentary', 'complimentary', true]);
  // The shared model reads the same tier from the server's reply.
  assert.equal(tierOf(s as TrialStatus, true, ms(s.serverNow)), 'complimentary');
  assert.deepEqual(await db.rpc('access_paid_now', { p_user: STUDENT }, service), { paid: true, kind: 'complimentary', endsAt: given.grant.endsAt });

  // What Alex sees for the account.
  const listed = (await db.rpc('access_admin_grants', { p_user: STUDENT }, asAlex)) as Json;
  assert.equal(listed.tier, 'complimentary');
  assert.deepEqual(listed.grants.map((g: Json) => [g.kind, g.running, g.grantedByEmail, g.used.writing, g.limits.writing]), [['complimentary', true, 'alex-admin@example.test', 0, 12]]);
  const overview = (await db.rpc('access_admin_overview', {}, asAlex)) as Json[];
  assert.deepEqual(overview.find((o) => o.userId === STUDENT), { userId: STUDENT, tier: 'complimentary', kind: 'complimentary', endsAt: given.grant.endsAt });
  assert.equal(overview.find((o) => o.userId === OTHER)!.tier, 'free');
  assert.deepEqual(await complimentary(db, 'give', 'eeeeeeee-0000-4000-8000-eeeeeeeeeeee'), { ok: false, reason: 'no-account' });
  assert.deepEqual(await complimentary(db, 'extend'), { ok: false, reason: 'invalid-action' });
  await db.close();
});

test('give queues after a running paid grant; renew adds 30 days after the last; at most three complimentary periods ahead', async () => {
  const db = await world();
  assert.deepEqual(await complimentary(db, 'renew'), { ok: false, reason: 'not-given' }, 'nothing to renew yet');
  await buy(db);
  const paidEnd = ms((await grantsOf(db))[0]!.ends_at);
  const given = await complimentary(db, 'give');
  assert.equal(ms(given.grant.startsAt), paidEnd, 'queued straight after the paid period, no overlap, no gap');
  assert.equal((await status(db)).paid.kind, 'paid', 'the paid grant is the running one');
  const renewed = await complimentary(db, 'renew');
  assert.equal(ms(renewed.grant.startsAt), ms(given.grant.endsAt));
  assert.equal(ms(renewed.grant.endsAt) - ms(renewed.grant.startsAt), 30 * DAY);
  assert.equal((await complimentary(db, 'renew')).ok, true);
  assert.deepEqual(await complimentary(db, 'renew'), { ok: false, reason: 'too-far-ahead' });
  // A purchase now queues after everything already given.
  const chainEnd = Math.max(...(await grantsOf(db)).map((g) => ms(g.ends_at)));
  await buy(db);
  const last = (await grantsOf(db)).at(-1)!;
  assert.deepEqual([last.kind, ms(last.starts_at)], ['paid', chainEnd]);
  await db.close();
});

test('stop: the running complimentary period ends now, queued ones never start, later paid time moves up with no gap', async () => {
  const db = await world();
  assert.deepEqual(await complimentary(db, 'stop'), { ok: false, reason: 'nothing-to-stop' });
  await complimentary(db, 'give');
  await complimentary(db, 'renew');
  await buy(db); // queued after both complimentary periods
  assert.equal((await reserve(db, 'writing', 'comp-before-stop')).ok, true);
  const stopped = await complimentary(db, 'stop');
  assert.deepEqual([stopped.ok, stopped.stopped], [true, 2]);
  const grants = await grantsOf(db);
  const comps = grants.filter((g) => g.kind === 'complimentary').sort((a, b) => ms(a.starts_at) - ms(b.starts_at));
  const [running, queued] = comps;
  const paid = grants.find((g) => g.kind === 'paid');
  assert.ok(ms(running!.ends_at) <= Date.now() + 1000 && running!.stopped_at, 'the running one ended now');
  assert.ok(queued!.revoked_at && queued!.stopped_at, 'the queued one will never start');
  assert.equal(paid!.kind, 'paid');
  assert.ok(Math.abs(ms(paid!.starts_at) - Date.now()) < 5000, 'the paid period moved up to now');
  assert.equal(ms(paid!.ends_at) - ms(paid!.starts_at), 30 * DAY, 'and kept its full 30 days');
  assert.equal((await status(db)).paid.kind, 'paid');
  // Its uses stay recorded against the stopped grant; the paid grant counts from zero.
  assert.equal((await reserve(db, 'writing', 'paid-after-stop')).used, 1);
  const listed = (await db.rpc('access_admin_grants', { p_user: STUDENT }, asAlex)) as Json;
  assert.equal(listed.grants.find((g: Json) => g.stoppedAt && !g.revokedAt).used.writing, 1);
  await db.close();
});

test('stop returns a complimentary-only account to free: lessons open, practice and AI refused', async () => {
  const db = await world();
  await complimentary(db, 'give');
  assert.equal((await canOpen(db, 'test:reading-full-001')).ok, true);
  await complimentary(db, 'stop');
  assert.equal((await canOpen(db, 'test:reading-full-001')).reason, 'paid-required');
  assert.equal((await canOpen(db, 'lesson:reading-tfng')).ok, true);
  assert.equal((await reserve(db, 'live', 'after-stop-1')).reason, 'paid-required');
  assert.equal((await reserve(db, 'writing', 'after-stop-2')).ok, true, 'back to free: the lifetime try is still there');
  const s = await status(db);
  assert.deepEqual([s.access.tier, s.paid.kind], ['paid-ended', 'complimentary']);
  assert.equal(tierOf(s as TrialStatus, true, ms(s.serverNow)), 'paid-ended');
  // And it can be given again later.
  assert.equal((await complimentary(db, 'give')).ok, true);
  assert.equal((await canOpen(db, 'test:reading-full-001')).tier, 'complimentary');
  await db.close();
});

/* ── Records and deletion ────────────────────────────────────────────── */

test('the table holds its shape: paid needs an order and a plan, complimentary has neither', async () => {
  const db = await world();
  const orderId = await buy(db);
  await assert.rejects(
    db.raw.query("insert into public.access_grants (user_id, kind, starts_at, ends_at) values ($1, 'paid', now(), now() + interval '1 day')", [OTHER]),
    /access_grants_kind_check/,
  );
  await assert.rejects(
    db.raw.query("insert into public.access_grants (user_id, kind, order_id, starts_at, ends_at) values ($1, 'complimentary', $2, now(), now() + interval '1 day')", [OTHER, orderId]),
    /access_grants_kind_check|duplicate key/,
  );
  await assert.rejects(
    db.raw.query("insert into public.access_grants (user_id, kind, plan_id, starts_at, ends_at) values ($1, 'complimentary', 'month-1', now(), now() + interval '1 day')", [OTHER]),
    /access_grants_kind_check/,
  );
  await assert.rejects(db.raw.query("insert into public.access_grants (user_id, kind, starts_at, ends_at) values ($1, 'gift', now(), now() + interval '1 day')", [OTHER]), /access_grants_kind_check/);
  assert.equal((await grantsOf(db))[0]!.kind, 'paid', 'an existing paid grant reads as paid');
  await db.close();
});

test('deleting an account: complimentary access does not block it, and since 2 October 2026 neither does a payment (the sale stays, anonymous)', async () => {
  const db = await world();
  await complimentary(db, 'give', OTHER);
  assert.equal((await reserve(db, 'writing', 'comp-delete-1', OTHER)).ok, true);
  await finish(db, 'writing', 'comp-delete-1', true, OTHER);
  await db.raw.query('delete from auth.users where id = $1', [OTHER]);
  assert.deepEqual(await grantsOf(db, OTHER), [], 'its grants went with it');
  assert.equal(((await db.select('select count(*)::int as n from public.assessment_usage where user_id = $1', [OTHER], service))[0] as Json).n, 0);

  await buy(db);
  await complimentary(db, 'give');
  // The admin who gave access can leave: the record keeps the grant, without the name.
  await db.raw.query('delete from public.admins where user_id = $1', [ALEX]);
  await db.raw.query('delete from auth.users where id = $1', [ALEX]);
  assert.equal((await grantsOf(db)).find((g) => g.kind === 'complimentary')!.granted_by, null);
  // A paying student can be deleted too (2026-10-02-account-deletion.sql):
  // the grants go, the order stays as a sale that names nobody.
  await db.raw.query('delete from auth.users where id = $1', [STUDENT]);
  assert.deepEqual(await grantsOf(db), [], 'the paid and complimentary grants went with the account');
  const orders = (await db.select('select user_id, status from public.payment_orders', [], service)) as Json[];
  assert.ok(orders.length >= 1 && orders.every((o) => o.user_id === null), 'the sale is kept, anonymous');
  await db.close();
});

test('the migration is idempotent: running it again keeps every grant, order and rule', async () => {
  const db = await world();
  await buy(db);
  await complimentary(db, 'give', OTHER);
  const before = await grantsOf(db);
  await db.raw.exec(readFileSync(FREE_MIGRATION, 'utf8'));
  await db.raw.exec(readFileSync(FREE_MIGRATION, 'utf8'));
  assert.deepEqual(await grantsOf(db), before);
  assert.equal((await canOpen(db, 'test:reading-full-001', OTHER)).tier, 'complimentary');
  assert.equal((await canOpen(db, 'lesson:reading-tfng')).tier, 'paid');
  assert.equal(((await db.rpc('trial_start', {}, { userId: OTHER })) as Json).code, 'trial-retired');
  const sql = readFileSync(FREE_MIGRATION, 'utf8');
  assert.match(sql, /-- ── Rollback \(run by hand, never by a script\)/);
  assert.match(sql, /revoke all on function public\.access_admin_complimentary\(uuid, text, text\) from public, anon;/);
  await db.close();
});

/* ── The shared model agrees with the database ───────────────────────── */

test('src/lib/access/model.ts canUse agrees with the database for every tier', async () => {
  const db = await world();
  const ITEM: Record<'lesson' | PaidFeature, string> = {
    lesson: 'lesson:reading-tfng',
    test: 'test:reading-full-001',
    drill: 'test:reading-full-001-drill-p1',
    trainer: 'pack:writing-structures',
    focused: 'pack:focused-tfng-1',
    mock: 'test:reading-full-002',
    placement: 'pack:placement',
    essay: 'writing-prompt:pte-wt-121-task2',
    speaking: 'pack:speaking-prompts',
    live: 'pack:speaking-prompts',
    tutor: 'pack:learning-index',
    'plan-practice': 'practice:plan-1',
    'vocab-review': 'pack:vocabulary',
    'model-answers': 'writing-model:pte-wt-121-task2',
    'cue-cards': 'pack:cue-cards',
    'band-guide': 'pack:band-guides',
  };
  const tiers: [AccessTier, () => Promise<void>][] = [
    ['free', async () => {}],
    ['paid', async () => { await buy(db); }],
    ['paid-ended', async () => { await db.expirePaid(STUDENT); }],
    ['complimentary', async () => { await complimentary(db, 'give'); }],
  ];
  for (const [tier, become] of tiers) {
    await become();
    assert.equal((await status(db)).access.tier, tier, `the server's tier is ${tier}`);
    for (const [feature, item] of Object.entries(ITEM)) {
      assert.equal((await canOpen(db, item)).ok, canUse(tier, feature as PaidFeature), `${tier} ${feature}`);
    }
  }
  await db.close();
});

/* ── The leak audit protects lessons again ───────────────────────────── */

test('the leak audit fails a public file that carries a lesson body or a lesson quiz', () => {
  const run = (dir: string) =>
    spawnSync(process.execPath, ['--import', './tests/ts-extension-loader.mjs', 'tools/trial-content-audit.mjs', dir, '--json'], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  const body = readFileSync(join(REPO, 'src/content/lesson-bodies/reading-tfng.html'), 'utf8');
  const withLesson = mkdtempSync(join(tmpdir(), 'audit-lesson-'));
  writeFileSync(join(withLesson, 'index.html'), `<main>${body}</main>`);
  const lessonRun = run(withLesson);
  assert.equal(lessonRun.status, 1, lessonRun.stderr);
  const summary = JSON.parse(lessonRun.stdout);
  assert.ok(summary.lessonPhrases > 100, `lesson bodies are sentinels again (${summary.lessonPhrases} phrases)`);
  assert.ok(summary.lessonQuizzes > 10, `and lesson quizzes (${summary.lessonQuizzes})`);
  assert.ok(summary.found.some((f: Json) => f.verdict === 'LEAK' && f.items.includes('lesson:reading-tfng')));

  const ru = readdirSync(join(REPO, 'src/content/lesson-bodies/ru')).find((f) => f.endsWith('.html'))!;
  const withRussian = mkdtempSync(join(tmpdir(), 'audit-lesson-ru-'));
  writeFileSync(join(withRussian, 'page.html'), readFileSync(join(REPO, 'src/content/lesson-bodies/ru', ru), 'utf8'));
  assert.equal(run(withRussian).status, 1, 'a Russian lesson body too');
});

test('the paid-required sentence the Workers send has the same Russian in the dictionary', async () => {
  const { PAID_REQUIRED_TEXT } = await import('../src/lib/trial/gate.ts');
  const { strings } = await import('../src/lib/i18n/dict/ru/g-free.ts');
  assert.equal(strings[PAID_REQUIRED_TEXT.en], PAID_REQUIRED_TEXT.ru);
  const { REFUSALS } = await import('../workers/content-gate/src/index.ts');
  for (const [, message] of Object.values(REFUSALS)) assert.ok(strings[message], `Russian for "${message}"`);
});
