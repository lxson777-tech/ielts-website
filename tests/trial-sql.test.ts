/* The trial's rules, run for real: supabase/migrations/2026-09-23-trial.sql
 * applied to an in-memory Postgres (PGlite) with Supabase's roles, grants
 * and auth.uid() (tools/trial-db.mjs). Every assertion here is the database
 * itself deciding, not a JavaScript copy of it.
 *
 * The migration is a PROPOSAL, not applied to any real project. These tests
 * are the evidence offered for applying it; they are not evidence about the
 * live project, which has never seen it.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/trial-sql.test.ts
 *
 * Every account is a synthetic uuid created in a fresh database per test.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrialDb, TRIAL_MIGRATION } from '../tools/trial-db.mjs';
import {
  TRIAL_HOURS,
  TRIAL_OFFER,
  TRIAL_SPEAKING_SESSIONS,
  TRIAL_STALE_MINUTES,
  TRIAL_TESTS_PER_SECTION,
  TRIAL_TUTOR_PER_SECTION,
  trialOfferItems,
} from '../src/lib/trial/offer.ts';
import { parseTrialStatus } from '../src/lib/trial/status.ts';

const A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const B = 'bbbbbbbb-0000-4000-8000-00000000000b';

type Db = Awaited<ReturnType<typeof createTrialDb>>;

async function world(): Promise<Db> {
  const db = await createTrialDb();
  await db.addUser(A, 'synthetic-a@example.test');
  await db.addUser(B, 'synthetic-b@example.test');
  return db;
}

const asA = { userId: A };
const asB = { userId: B };
const service = { role: 'service_role' as const };

async function reserve(db: Db, user: string, section: string, request: string) {
  return db.rpc(
    'trial_tutor_reserve',
    { p_user: user, p_section: section, p_request: request, p_activity: `lesson:${section}-x` },
    service,
  );
}

async function settle(db: Db, user: string, kind: string, request: string) {
  return db.rpc('trial_usage_settle', { p_user: user, p_kind: kind, p_request: request }, service);
}

async function release(db: Db, user: string, kind: string, request: string) {
  return db.rpc('trial_usage_release', { p_user: user, p_kind: kind, p_request: request }, service);
}

/* ── The file and the shared constants agree ─────────────────────────── */

test('the migration states the same limits and the same trial items as src/lib/trial/offer.ts', () => {
  const sql = readFileSync(TRIAL_MIGRATION, 'utf8');
  assert.equal(TRIAL_HOURS, 72);
  assert.equal((sql.match(/interval '72 hours'/g) ?? []).length >= 2, true, 'three-day window in the table and at the start');
  assert.match(sql, /'testsPerSection', 1/);
  assert.equal(TRIAL_TESTS_PER_SECTION, 1);
  assert.match(sql, /used >= 5/);
  assert.match(sql, /'tutorPerSection', 5/);
  assert.equal(TRIAL_TUTOR_PER_SECTION, 5);
  assert.match(sql, /interval '5 minutes'/);
  assert.equal(TRIAL_STALE_MINUTES, 5);
  assert.match(sql, /claim\.sessions >= 2/);
  assert.equal(TRIAL_SPEAKING_SESSIONS, 2);
});

test('the seeded trial items are exactly TRIAL_OFFER', async () => {
  const db = await world();
  const rows = (await db.select('select item_id, section, kind, enabled from public.trial_offer_items order by item_id', [], { role: 'anon' })) as {
    item_id: string;
    section: string;
    kind: string;
    enabled: boolean;
  }[];
  const expected = trialOfferItems()
    .map((i) => ({ item_id: i.itemId, section: i.section, kind: i.kind, enabled: i.enabled }))
    .sort((x, y) => x.item_id.localeCompare(y.item_id));
  assert.deepEqual(rows, expected);
  assert.equal(TRIAL_OFFER.speaking.testEnabled, true, 'the Speaking test is a Part 1 interview (Alex, 23 September)');
  await db.close();
});

/* ── Starting and the clock ──────────────────────────────────────────── */

test('no trial until the student starts one, and the answer says so', async () => {
  const db = await world();
  const status = parseTrialStatus(await db.rpc('trial_status', {}, asA));
  assert.equal(status?.state, 'none');
  await db.close();
});

test('signed-out callers can neither read nor start a trial', async () => {
  const db = await world();
  await assert.rejects(db.rpc('trial_status', {}, { role: 'anon' }), (err: { status: number }) => err.status === 403);
  await assert.rejects(db.rpc('trial_start', {}, { role: 'anon' }), (err: { status: number }) => err.status === 403);
  // A signed-in role with no user in the token is refused by the function.
  await assert.rejects(db.rpc('trial_start', {}, { role: 'authenticated' }), (err: { status: number }) => err.status === 401);
  await db.close();
});

test('a trial runs 72 hours from the server start and starting again never restarts it', async () => {
  const db = await world();
  const first = parseTrialStatus(await db.rpc('trial_start', {}, asA));
  assert.ok(first && first.state === 'active');
  assert.equal(Date.parse(first.endsAt!) - Date.parse(first.startedAt!), 72 * 3600 * 1000);

  // A day later (another device, a second sign-up redirect, after signing out
  // and back in): the same trial comes back, with the same clock.
  await db.rewind(A, 24 * 60);
  const again = parseTrialStatus(await db.rpc('trial_start', { p_questionnaire: { band: '8', skill: 'reading', focus: 'method', time: '60' } }, asA));
  assert.ok(again);
  assert.equal(again.startedAt, (parseTrialStatus(await db.rpc('trial_status', {}, asA)))!.startedAt);
  assert.ok(Date.parse(again.endsAt!) - Date.parse(again.serverNow) < 48 * 3600 * 1000 + 5000, 'about 48 hours left, not 72');
  assert.equal(again.questionnaire, null, 'a second start cannot rewrite the first one either');
  await db.close();
});

test('the 72-hour boundary comes from the stored timestamp', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await db.rewind(A, 72 * 60 - 1);
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asA))?.state, 'active', 'one minute left');
  await db.rewind(A, 1);
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asA))?.state, 'ended', 'exactly 72 hours');
  await db.close();
});

test('the questionnaire is kept only when every answer is one the public site offers', async () => {
  const db = await world();
  const good = parseTrialStatus(await db.rpc('trial_start', { p_questionnaire: { band: '7.5', skill: 'writing', focus: 'confidence', time: '30' } }, asA));
  assert.deepEqual(good?.questionnaire, { band: '7.5', skill: 'writing', focus: 'confidence', time: '30' });
  const bad = parseTrialStatus(await db.rpc('trial_start', { p_questionnaire: { band: '9', skill: 'writing', focus: 'method', time: '30', level: 'C1' } }, asB));
  assert.equal(bad?.questionnaire, null);
  await db.close();
});

test('the browser cannot write the trial tables directly, whatever it tries', async () => {
  const db = await world();
  const before = parseTrialStatus(await db.rpc('trial_start', {}, asA))!;
  await assert.rejects(
    db.select(`insert into public.trial_accounts (user_id, started_at, ends_at) values ($1, now(), now() + interval '72 hours')`, [B], asB),
  );
  await db.select(`update public.trial_accounts set ends_at = ends_at + interval '30 days', started_at = started_at + interval '30 days' where user_id = $1`, [A], asA);
  await db.select(`delete from public.trial_accounts where user_id = $1`, [A], asA);
  const status = parseTrialStatus(await db.rpc('trial_status', {}, asA));
  assert.ok(status && status.state === 'active');
  assert.equal(status.startedAt, before.startedAt, 'start unchanged');
  assert.equal(status.endsAt, before.endsAt, 'end unchanged');
  await assert.rejects(
    db.select(`insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status) values ($1, 'tutor', 'reading', 'forged-000', 'x', 'released')`, [A], asA),
  );
  await db.close();
});

test('one student never sees or changes another student’s trial', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await reserve(db, A, 'reading', 'a-req-0001');
  await settle(db, A, 'tutor', 'a-req-0001');
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asB))?.state, 'none');
  assert.deepEqual(await db.select('select * from public.trial_accounts', [], asB), []);
  assert.deepEqual(await db.select('select * from public.trial_usage', [], asB), []);
  assert.equal((await db.select('select * from public.trial_usage', [], asA)).length, 1);
  await db.close();
});

/* ── Mr EZ: five answered messages per section ───────────────────────── */

test('five settled messages per section, then refused; the other sections keep their own five', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  for (let i = 1; i <= 5; i++) {
    const r = await reserve(db, A, 'reading', `read-000${i}`);
    assert.equal(r.ok, true, `message ${i}`);
    await settle(db, A, 'tutor', `read-000${i}`);
  }
  const sixth = await reserve(db, A, 'reading', 'read-0006');
  assert.deepEqual({ ok: sixth.ok, reason: sixth.reason }, { ok: false, reason: 'allowance-used' });
  assert.equal((await reserve(db, A, 'writing', 'write-0001')).ok, true);
  const status = parseTrialStatus(await db.rpc('trial_status', {}, asA))!;
  assert.equal(status.sections.reading.tutorUsed, 5);
  assert.equal(status.sections.writing.tutorPending, 1);
  assert.equal(status.sections.listening.tutorUsed, 0);
  await db.close();
});

test('a failed request is released and never counted; retrying it re-uses the same row', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  for (let i = 1; i <= 4; i++) {
    await reserve(db, A, 'listening', `lis-000${i}`);
    await settle(db, A, 'tutor', `lis-000${i}`);
  }
  assert.equal((await reserve(db, A, 'listening', 'lis-fail-1')).ok, true);
  await release(db, A, 'tutor', 'lis-fail-1');
  // The failure did not use the fifth message: two more attempts at it fail
  // and are released, and the fifth is still there.
  for (const key of ['lis-fail-2', 'lis-fail-3']) {
    assert.equal((await reserve(db, A, 'listening', key)).ok, true);
    await release(db, A, 'tutor', key);
  }
  // Retry of the first failure with its own key succeeds this time.
  assert.equal((await reserve(db, A, 'listening', 'lis-fail-1')).ok, true);
  await settle(db, A, 'tutor', 'lis-fail-1');
  const rows = await db.select(`select count(*)::int as n from public.trial_usage where request_id = 'lis-fail-1'`, [], service);
  assert.equal((rows[0] as { n: number }).n, 1, 'one row for the request, however many tries');
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asA))!.sections.listening.tutorUsed, 5);
  assert.equal((await reserve(db, A, 'listening', 'lis-0006')).reason, 'allowance-used');
  await db.close();
});

test('a settled request replays for free, a duplicate in flight is refused, and settled is never refunded', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await reserve(db, A, 'writing', 'w-req-0001');
  assert.equal((await reserve(db, A, 'writing', 'w-req-0001')).reason, 'in-flight', 'double click while answering');
  await settle(db, A, 'tutor', 'w-req-0001');
  const replay = await reserve(db, A, 'writing', 'w-req-0001');
  assert.deepEqual({ ok: replay.ok, replay: replay.replay }, { ok: true, replay: true });
  assert.equal((await release(db, A, 'tutor', 'w-req-0001')).ok, false, 'the browser closing after an answer changes nothing');
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asA))!.sections.writing.tutorUsed, 1);
  await db.close();
});

test('parallel requests from several tabs cannot take more than five', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  const results = await Promise.all(
    Array.from({ length: 9 }, (_, i) => reserve(db, A, 'speaking', `tab-req-${String(i).padStart(3, '0')}`)),
  );
  assert.equal(results.filter((r) => r.ok).length, 5);
  assert.equal(results.filter((r) => r.reason === 'allowance-used').length, 4);
  await db.close();
});

test('a reservation abandoned for five minutes stops counting', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  for (let i = 1; i <= 5; i++) await reserve(db, A, 'reading', `dead-000${i}`);
  assert.equal((await reserve(db, A, 'reading', 'next-0001')).reason, 'allowance-used');
  await db.ageUsage(A, 6);
  assert.equal((await reserve(db, A, 'reading', 'next-0001')).ok, true);
  await db.close();
});

test('a message reserved before the end is still counted after it; nothing new starts after it', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await reserve(db, A, 'reading', 'late-0001');
  await db.rewind(A, 72 * 60);
  assert.equal((await settle(db, A, 'tutor', 'late-0001')).ok, true);
  assert.equal((await reserve(db, A, 'reading', 'late-0002')).reason, 'trial-ended');
  assert.equal((await reserve(db, B, 'reading', 'none-0001')).reason, 'trial-required');
  await db.close();
});

test('the Workers’ functions refuse a student’s own sign-in', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  for (const [fn, args] of [
    ['trial_tutor_reserve', { p_user: A, p_section: 'reading', p_request: 'self-0001', p_activity: 'x' }],
    ['trial_usage_settle', { p_user: A, p_kind: 'tutor', p_request: 'self-0001' }],
    ['trial_usage_release', { p_user: A, p_kind: 'tutor', p_request: 'self-0001' }],
    ['trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'self-0001' }],
    ['trial_state', { p_user: B }],
  ] as const) {
    await assert.rejects(db.rpc(fn, args, asA), (err: { status: number }) => err.status === 403, fn);
  }
  await db.close();
});

/* ── One test per section ────────────────────────────────────────────── */

test('the section test is bound to one paper: resumable, never swappable, used once', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  const begin = (activity: string, request: string) =>
    db.rpc('trial_test_begin', { p_section: 'reading', p_activity: activity, p_request: request }, asA);

  assert.equal((await begin('reading-full-002', 'sit-other-1')).reason, 'not-in-trial');
  const first = await begin('reading-full-001', 'sit-read-01');
  assert.deepEqual({ ok: first.ok, resumed: first.resumed }, { ok: true, resumed: false });
  const resumed = await begin('reading-full-001', 'sit-read-02');
  assert.deepEqual({ ok: resumed.ok, resumed: resumed.resumed, requestId: resumed.requestId }, { ok: true, resumed: true, requestId: 'sit-read-01' });

  await db.rpc('trial_test_finish', { p_section: 'reading', p_request: 'sit-read-01' }, asA);
  assert.equal((await begin('reading-full-001', 'sit-read-03')).reason, 'test-used');
  const status = parseTrialStatus(await db.rpc('trial_status', {}, asA))!;
  assert.equal(status.sections.reading.test?.status, 'settled');
  assert.equal(status.sections.listening.test, null);
  await db.close();
});

test('two tabs starting the section test at once get one sitting between them', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  const [one, two] = await Promise.all([
    db.rpc('trial_test_begin', { p_section: 'listening', p_activity: 'listening-full-001', p_request: 'tab-one-01' }, asA),
    db.rpc('trial_test_begin', { p_section: 'listening', p_activity: 'listening-full-001', p_request: 'tab-two-01' }, asA),
  ]);
  assert.equal(one.ok && two.ok, true);
  assert.equal(one.requestId, two.requestId, 'the second tab resumes the first tab’s sitting');
  // And the database itself refuses a second live test in a section.
  await assert.rejects(
    db.select(
      `insert into public.trial_usage (user_id, kind, section, request_id, activity_id, status) values ($1, 'test', 'listening', 'forced-0001', 'listening-full-002', 'reserved')`,
      [A],
      service,
    ),
  );
  await db.close();
});

test('the Speaking test begins like the others, and allows two interviews at most', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  const start = (request = 'sit-speak-1') =>
    db.rpc('trial_speaking_session_start', { p_user: A, p_request: request }, service);
  assert.equal((await start()).reason, 'no-test', 'nothing begun yet');
  const begun = await db.rpc('trial_test_begin', { p_section: 'speaking', p_activity: 'speaking-test', p_request: 'sit-speak-1' }, asA);
  assert.equal(begun.ok, true);
  assert.equal((await start()).ok, true);
  // An interview that never opened is given back.
  await db.rpc('trial_speaking_session_release', { p_user: A, p_request: 'sit-speak-1' }, service);
  assert.equal((await start()).ok, true);
  assert.equal((await start()).ok, true);
  assert.equal((await start()).reason, 'sessions-used');
  await assert.rejects(db.rpc('trial_speaking_session_start', { p_user: A, p_request: 'sit-speak-1' }, asA), (err: { status: number }) => err.status === 403, 'Workers only');
  // Once graded, no further interview under it.
  await db.rpc('trial_test_lease', { p_user: A, p_section: 'speaking', p_request: 'sit-speak-1' }, service);
  await db.rpc('trial_usage_settle', { p_user: A, p_kind: 'test', p_request: 'sit-speak-1' }, service);
  assert.equal((await start()).reason, 'test-used');
  await db.close();
});

test('a test begun before the end can be finished after it; a new one cannot be begun', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-late-01' }, asA);
  await db.rewind(A, 72 * 60 + 5);
  const resume = await db.rpc('trial_test_begin', { p_section: 'reading', p_activity: 'reading-full-001', p_request: 'sit-late-02' }, asA);
  assert.equal(resume.ok, true);
  const fresh = await db.rpc('trial_test_begin', { p_section: 'listening', p_activity: 'listening-full-001', p_request: 'sit-late-03' }, asA);
  assert.equal(fresh.reason, 'trial-ended');
  await db.close();
});

test('Writing is used only when its grader settles it; a failed grade leaves it available', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-1' }, service)).reason, 'no-test');
  await db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-write-1' }, asA);
  // The browser cannot mark a server-graded test as done.
  assert.equal((await db.rpc('trial_test_finish', { p_section: 'writing', p_request: 'sit-write-1' }, asA)).reason, 'graded-by-server');

  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-1' }, service)).ok, true);
  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-1' }, service)).reason, 'in-flight', 'a second submit while grading');
  await release(db, A, 'test', 'sit-write-1'); // the grader failed
  assert.equal(parseTrialStatus(await db.rpc('trial_status', {}, asA))!.sections.writing.test?.status, 'reserved', 'still available to submit');

  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-1' }, service)).ok, true);
  await settle(db, A, 'test', 'sit-write-1'); // graded
  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-1' }, service)).reason, 'test-used');
  assert.equal((await release(db, A, 'test', 'sit-write-1')).ok, false, 'a graded test is never given back');
  await db.close();
});

test('a grading lease abandoned by a crashed Worker expires after five minutes', async () => {
  const db = await world();
  await db.rpc('trial_start', {}, asA);
  await db.rpc('trial_test_begin', { p_section: 'writing', p_activity: 'writing-checker', p_request: 'sit-write-2' }, asA);
  await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-2' }, service);
  await db.ageUsage(A, 6);
  assert.equal((await db.rpc('trial_test_lease', { p_user: A, p_section: 'writing', p_request: 'sit-write-2' }, service)).ok, true);
  await db.close();
});
