/* Support requests, run for real: supabase/migrations/2026-09-24-admin.sql
 * and 2026-09-30-support.sql applied to an in-memory Postgres (PGlite) with
 * Supabase's roles and auth.uid() (tools/stand-in/support.mjs, on top of
 * tools/trial-db.mjs). Every assertion is the database itself deciding.
 *
 * The migration is LOCAL ONLY and has never been applied to a real project.
 *
 * Re-audit R01 (30 September 2026) is proved here at the database: anonymous
 * callers cannot reach it at all, a signed-out request is limited by its
 * sender (a hash the support Worker supplies) before anything shared is
 * counted, a refusal stores nothing, and one sender can no longer shut
 * everyone else out. The Worker's half is tests/support-worker.test.ts.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/support-sql.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSupportDb, SUPPORT_MIGRATION } from '../tools/stand-in/support.mjs';
import { SUPPORT_LIMITS, SUPPORT_TOPICS } from '../src/lib/support.ts';

const A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const ADMIN = 'cccccccc-0000-4000-8000-00000000000c';

type Db = Awaited<ReturnType<typeof createSupportDb>>;

async function world(): Promise<Db> {
  const db = await createSupportDb();
  await db.addUser(A, 'student-a@example.test');
  await db.addUser(B, 'student-b@example.test');
  await db.addUser(ADMIN, 'owner@example.test');
  await db.makeAdmin(ADMIN);
  return db;
}

const asA = { userId: A };
const asB = { userId: B };
const asAdmin = { userId: ADMIN };
const anon = { role: 'anon' as const };
const service = { role: 'service_role' as const };

const MESSAGE = 'The Listening recording stopped halfway through the test.';

/** Two senders, as the support Worker would name them: a keyed hash, never
    an address. */
const SOURCE_1 = '1'.repeat(64);
const SOURCE_2 = '2'.repeat(64);

type Answer = { ok: boolean; id?: string; reason?: string };

let counter = 0;
/** One signed-out request, exactly as the support Worker sends it. Every
    call uses a new made-up email unless one is given. */
function visitor(db: Db, source: string, over: Record<string, unknown> = {}): Promise<Answer> {
  counter += 1;
  return db.rpc(
    'support_request_visitor',
    { p_source_hash: source, p_email: `made-up-${counter}@example.test`, p_topic: 'question', p_message: MESSAGE, ...over },
    service,
  ) as Promise<Answer>;
}

const stored = async (db: Db) => Number((await db.raw.query<{ n: number }>('select count(*)::int as n from public.support_requests')).rows[0]!.n);
const age = (db: Db, interval: string) => db.raw.query(`update public.support_requests set created_at = created_at - interval '${interval}'`);

async function refused(work: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(work, (err: Error) => pattern.test(err.message) || pattern.test(String((err as { code?: string }).code)));
}

test('the limits are the ones the design states, in one place', async () => {
  const db = await world();
  const limits = (await db.rpc('support_limits', {}, service)) as Record<string, number>;
  assert.deepEqual(limits, { accountPerDay: 5, sourcePerHour: 3, sourcePerDay: 6, emailPerDay: 3, visitorsPerHour: 300, sourceKeepHours: 24 });
  await db.close();
});

test('a signed-in student can send a request, stamped with their own account', async () => {
  const db = await world();
  const sent = (await db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_context: 'mr-ez', p_page: '/lessons/reading/paraphrase', p_locale: 'ru' }, asA)) as { id: string };
  assert.match(sent.id, /^[0-9a-f-]{36}$/);
  const { rows } = await db.raw.query<{ user_id: string; contact_email: string | null; context: string; page: string; locale: string; source_hash: string | null }>(
    'select user_id, contact_email, context, page, locale, source_hash from public.support_requests',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.user_id, A);
  assert.equal(rows[0]!.contact_email, null);
  assert.equal(rows[0]!.context, 'mr-ez');
  assert.equal(rows[0]!.locale, 'ru');
  assert.equal(rows[0]!.source_hash, null, 'a signed-in request carries no source');
  await db.close();
});

test('R01: an anonymous caller cannot reach the database at all, by function or by table', async () => {
  const db = await world();
  // The old way in: the function the signed-out form used to call.
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: 'visitor@example.test' }, anon), /permission denied|42501/);
  // The new function is the Worker's alone: not anon, and not a student either.
  const direct = { p_source_hash: SOURCE_1, p_email: 'visitor@example.test', p_topic: 'problem', p_message: MESSAGE, p_challenged: true };
  await refused(db.rpc('support_request_visitor', direct, anon), /permission denied|42501/);
  await refused(db.rpc('support_request_visitor', direct, asA), /permission denied|42501/);
  await refused(db.rpc('support_source_cleanup', {}, anon), /permission denied|42501/);
  await refused(db.rpc('support_source_cleanup', {}, asA), /permission denied|42501/);
  await refused(db.rpc('support_limits', {}, anon), /permission denied|42501/);
  // Nor around the functions.
  await refused(
    db.select("insert into public.support_requests (contact_email, topic, message) values ('v@example.test', 'other', 'hello there, world') returning id", [], anon),
    /permission denied/,
  );
  await refused(db.select('select * from public.support_requests', [], anon), /permission denied/);
  assert.equal(await stored(db), 0, 'nothing was stored by any of it');
  await db.close();
});

test('students cannot read requests, not even their own, nor list them through the admin function', async () => {
  const db = await world();
  await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asA);
  await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asB);
  await refused(db.select('select * from public.support_requests', [], asA), /permission denied/);
  await refused(db.select('select * from public.support_requests', [], anon), /permission denied/);
  await refused(db.rpc('support_admin_list', {}, asA), /admin only|42501/);
  await refused(db.rpc('support_admin_list', {}, anon), /permission denied|42501/);
  await refused(db.rpc('support_admin_mark', { p_id: '00000000-0000-4000-8000-000000000000' }, asB), /admin only|42501/);
  // Nor write around the function.
  await refused(
    db.select("insert into public.support_requests (user_id, topic, message) values ($1, 'other', 'hello there, world') returning id", [A], asA),
    /permission denied/,
  );
  await refused(db.select('update public.support_requests set answered_at = now()', [], asA), /permission denied/);
  await refused(db.select('delete from public.support_requests', [], asB), /permission denied/);
  await db.close();
});

test('the admin reads every request newest first through is_admin, and can mark one answered and undo it', async () => {
  const db = await world();
  await db.rpc('support_request_create', { p_topic: 'question', p_message: 'First message from student A.' }, asA);
  await age(db, '1 hour');
  const sent = await visitor(db, SOURCE_1, { p_topic: 'account', p_message: 'Second message, a visitor.', p_email: 'Visitor@Example.test' });
  assert.equal(sent.ok, true);
  const list = (await db.rpc('support_admin_list', {}, asAdmin)) as Array<{
    id: string;
    message: string;
    account_email: string | null;
    contact_email: string | null;
    answered_at: string | null;
  }>;
  assert.equal(list.length, 2);
  assert.equal(list[0]!.message, 'Second message, a visitor.');
  assert.equal(list[0]!.contact_email, 'visitor@example.test', 'the email is stored lower-cased');
  assert.equal(list[0]!.account_email, null);
  assert.equal(list[1]!.account_email, 'student-a@example.test');
  assert.ok(!('source_hash' in list[0]!), 'the admin list never carries the source hash');

  const marked = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: true }, asAdmin)) as { answeredAt: string };
  assert.ok(marked.answeredAt);
  const again = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: true }, asAdmin)) as { answeredAt: string };
  assert.equal(again.answeredAt, marked.answeredAt, 'marking twice keeps the first time');
  const undone = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: false }, asAdmin)) as { answeredAt: string | null };
  assert.equal(undone.answeredAt, null);
  await refused(db.rpc('support_admin_mark', { p_id: '00000000-0000-4000-8000-000000000000' }, asAdmin), /support-not-found/);
  await db.close();
});

test('a signed-out request needs a valid email and a real source, and can never claim an account', async () => {
  const db = await world();
  assert.deepEqual(await visitor(db, SOURCE_1, { p_email: null }), { ok: false, reason: 'email-required' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_email: '   ' }), { ok: false, reason: 'email-required' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_email: 'not-an-email' }), { ok: false, reason: 'email-invalid' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_email: `${'a'.repeat(250)}@example.test` }), { ok: false, reason: 'email-invalid' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_topic: 'refund-now' }), { ok: false, reason: 'topic' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_message: 'too short' }), { ok: false, reason: 'message-length' });
  // The source must be the Worker's hash: 64 hex characters, never an address.
  for (const bad of [null, '', '203.0.113.7', 'A'.repeat(64), '1'.repeat(63)]) {
    assert.deepEqual(await visitor(db, bad as string), { ok: false, reason: 'bad-source' }, `source ${bad}`);
  }
  assert.equal(await stored(db), 0, 'a refused request stores nothing');

  const ok = await visitor(db, SOURCE_1, { p_email: 'visitor@example.test', p_context: 'help', p_page: '/help', p_locale: 'ru' });
  assert.equal(ok.ok, true);
  const { rows } = await db.raw.query<{ user_id: string | null; source_hash: string; context: string; locale: string }>(
    'select user_id, source_hash, context, locale from public.support_requests',
  );
  assert.equal(rows[0]!.user_id, null);
  assert.equal(rows[0]!.source_hash, SOURCE_1);
  assert.equal(rows[0]!.context, 'help');
  assert.equal(rows[0]!.locale, 'ru');
  await db.close();
});

test('length limits and topics are enforced by the database, matching the site', async () => {
  const db = await world();
  assert.deepEqual([...SUPPORT_TOPICS], ['problem', 'question', 'account', 'other']);
  const sql = readFileSync(SUPPORT_MIGRATION, 'utf8');
  assert.match(sql, new RegExp(`between ${SUPPORT_LIMITS.messageMin} and ${SUPPORT_LIMITS.messageMax}`));
  assert.match(sql, new RegExp(`<= ${SUPPORT_LIMITS.emailMax}`));

  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: 'too short' }, asA), /support-message-length/);
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: '          padded   ' }, asA), /support-message-length/);
  await refused(
    db.rpc('support_request_create', { p_topic: 'problem', p_message: 'x'.repeat(SUPPORT_LIMITS.messageMax + 1) }, asA),
    /support-message-length/,
  );
  assert.ok(await db.rpc('support_request_create', { p_topic: 'problem', p_message: 'x'.repeat(SUPPORT_LIMITS.messageMax) }, asA));
  await refused(db.rpc('support_request_create', { p_topic: 'refund-now', p_message: MESSAGE }, asA), /support-topic/);
  // A bad context is dropped and a long page cut, never refused.
  await db.rpc('support_request_create', { p_topic: 'other', p_message: MESSAGE, p_context: 'DROP TABLE', p_page: `/${'p'.repeat(400)}` }, asB);
  const { rows } = await db.raw.query<{ context: string | null; page: string }>('select context, page from public.support_requests where user_id = $1', [B]);
  assert.equal(rows[0]!.context, null);
  assert.equal(rows[0]!.page.length, 200);
  // The same for a visitor.
  assert.equal((await visitor(db, SOURCE_1, { p_message: 'x'.repeat(SUPPORT_LIMITS.messageMax) })).ok, true);
  assert.equal((await visitor(db, SOURCE_1, { p_context: 'DROP TABLE', p_page: `/${'p'.repeat(400)}` })).ok, true);
  await db.close();
});

test('signed in: five a day per account, unchanged, and untouched by anything visitors do', async () => {
  const db = await world();
  for (let i = 0; i < 5; i += 1) await db.rpc('support_request_create', { p_topic: 'question', p_message: `${MESSAGE} ${i}` }, asA);
  await refused(db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asA), /support-rate-limited/);
  // Another student is unaffected.
  assert.ok(await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asB));
  // Even with the visitors' shared breaker wide open, a student still gets through.
  await db.raw.exec(`
    insert into public.support_requests (contact_email, topic, message, source_hash)
    select 'bulk-' || g || '@example.test', 'question', 'Bulk visitor row number ' || g, md5(g::text) || md5((g + 1)::text)
    from generate_series(1, 300) g`);
  assert.deepEqual(await visitor(db, SOURCE_1), { ok: false, reason: 'busy' });
  assert.ok(await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asB));
  // A day later the first account may write again.
  await age(db, '25 hours');
  assert.ok(await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asA));
  await db.close();
});

test('R01: one sender gets three an hour whatever emails it invents, and cannot shut anyone else out', async () => {
  const db = await world();
  const answers: Answer[] = [];
  // The audit's attack, and then some: forty requests, forty different emails, one sender.
  for (let i = 0; i < 40; i += 1) answers.push(await visitor(db, SOURCE_1));
  assert.deepEqual(answers.slice(0, 3).map((a) => a.ok), [true, true, true]);
  assert.ok(answers.slice(3).every((a) => a.ok === false && a.reason === 'source-hour'), 'every request after the third is refused for this sender');
  assert.equal(await stored(db), 3, 'thirty-seven refusals stored nothing and used up nothing');
  // A different, legitimate visitor is accepted straight away.
  const other = await visitor(db, SOURCE_2, { p_email: 'locked-out-student@example.test', p_topic: 'account' });
  assert.equal(other.ok, true);
  assert.equal(await stored(db), 4);
  await db.close();
});

test('per sender: three an hour, six a day, and both windows reopen on time', async () => {
  const db = await world();
  for (let i = 0; i < 3; i += 1) assert.equal((await visitor(db, SOURCE_1)).ok, true);
  assert.equal((await visitor(db, SOURCE_1)).reason, 'source-hour');
  await age(db, '61 minutes');
  for (let i = 0; i < 3; i += 1) assert.equal((await visitor(db, SOURCE_1)).ok, true, 'the hour reopened');
  assert.equal((await visitor(db, SOURCE_1)).reason, 'source-hour');
  await age(db, '61 minutes');
  // The hour is clear again, but this sender has had six today.
  assert.equal((await visitor(db, SOURCE_1)).reason, 'source-day');
  assert.equal(await stored(db), 6);
  assert.equal((await visitor(db, SOURCE_2)).ok, true, 'another sender is unaffected');
  await age(db, '23 hours');
  assert.equal((await visitor(db, SOURCE_1)).ok, true, 'the day reopened');
  await db.close();
});

test('per reply address: three a day, whoever sends, checked after the sender', async () => {
  const db = await world();
  const email = { p_email: 'one-inbox@example.test' };
  assert.equal((await visitor(db, SOURCE_1, email)).ok, true);
  assert.equal((await visitor(db, SOURCE_2, email)).ok, true);
  assert.equal((await visitor(db, '3'.repeat(64), { p_email: 'One-Inbox@Example.test' })).ok, true);
  assert.deepEqual(await visitor(db, '4'.repeat(64), email), { ok: false, reason: 'email-day' });
  // Order: a sender already over its own limit is told so, not the email reason.
  for (let i = 0; i < 2; i += 1) assert.equal((await visitor(db, SOURCE_1)).ok, true);
  assert.deepEqual(await visitor(db, SOURCE_1, email), { ok: false, reason: 'source-hour' });
  await db.close();
});

test('the shared breaker comes last, counts only stored requests, and never stops a challenged request', async () => {
  const db = await world();
  // 297 accepted signed-out requests in the last hour, from 297 senders.
  await db.raw.exec(`
    insert into public.support_requests (contact_email, topic, message, source_hash)
    select 'bulk-' || g || '@example.test', 'question', 'Bulk visitor row number ' || g, md5(g::text) || md5((g + 1)::text)
    from generate_series(1, 297) g`);
  // Refusals do not count towards it: a blocked sender can hammer all day.
  for (let i = 0; i < 3; i += 1) assert.equal((await visitor(db, SOURCE_1)).ok, true);
  for (let i = 0; i < 20; i += 1) assert.equal((await visitor(db, SOURCE_1)).reason, 'source-hour');
  assert.equal(await stored(db), 300);

  // Now it is open (300 or more in the hour). An unchallenged request is refused...
  assert.deepEqual(await visitor(db, SOURCE_2), { ok: false, reason: 'busy' });
  assert.deepEqual(await visitor(db, SOURCE_2, { p_challenged: false }), { ok: false, reason: 'busy' });
  assert.equal(await stored(db), 300, 'and the refusal stored nothing');
  // ...a sender over its own limit still hears its own reason first...
  assert.deepEqual(await visitor(db, SOURCE_1), { ok: false, reason: 'source-hour' });
  assert.deepEqual(await visitor(db, SOURCE_1, { p_challenged: true }), { ok: false, reason: 'source-hour' }, 'the bot check does not lift the sender limit');
  // ...and a request that passed the bot check goes through.
  assert.equal((await visitor(db, SOURCE_2, { p_challenged: true })).ok, true);
  assert.equal(await stored(db), 301);

  // An hour later the breaker has closed by itself.
  await age(db, '61 minutes');
  assert.equal((await visitor(db, '5'.repeat(64))).ok, true);
  await db.close();
});

test('the source hash is erased once it is older than the daily limit needs, and the request stays', async () => {
  const db = await world();
  assert.equal((await visitor(db, SOURCE_1, { p_email: 'old@example.test' })).ok, true);
  assert.equal((await visitor(db, SOURCE_2, { p_email: 'recent@example.test' })).ok, true);
  await db.raw.query("update public.support_requests set created_at = now() - interval '25 hours' where contact_email = 'old@example.test'");
  await db.raw.query("update public.support_requests set created_at = now() - interval '23 hours' where contact_email = 'recent@example.test'");

  // The Worker's hourly schedule calls this.
  assert.deepEqual(await db.rpc('support_source_cleanup', {}, service), { ok: true, cleared: 1 });
  const row = async (email: string) =>
    (await db.raw.query<{ source_hash: string | null; message: string }>('select source_hash, message from public.support_requests where contact_email = $1', [email])).rows[0]!;
  assert.equal(await stored(db), 2, 'no request was removed');
  assert.equal((await row('old@example.test')).source_hash, null, 'past 24 hours: erased');
  assert.equal((await row('old@example.test')).message, MESSAGE, 'the message itself stays');
  assert.equal((await row('recent@example.test')).source_hash, SOURCE_2, 'inside 24 hours: still needed for the daily limit');
  assert.deepEqual(await db.rpc('support_source_cleanup', {}, service), { ok: true, cleared: 0 });

  // Every visitor request runs the same cleanup first, even one that is then refused.
  await db.raw.query("update public.support_requests set created_at = now() - interval '25 hours' where contact_email = 'recent@example.test'");
  for (let i = 0; i < 3; i += 1) assert.equal((await visitor(db, '6'.repeat(64))).ok, true);
  assert.equal((await row('recent@example.test')).source_hash, null);
  await db.raw.query("update public.support_requests set source_hash = $1 where contact_email = 'old@example.test'", [SOURCE_1]);
  assert.equal((await visitor(db, '6'.repeat(64))).reason, 'source-hour');
  assert.equal((await row('old@example.test')).source_hash, null, 'a refused request still cleaned up');
  assert.equal(await stored(db), 5);
  await db.close();
});

test('the migration keeps its discipline: row security on, revoke before grant, nothing for anon, rollback commented, local only', () => {
  const sql = readFileSync(SUPPORT_MIGRATION, 'utf8');
  assert.match(sql, /alter table public\.support_requests enable row level security/);
  assert.match(sql, /revoke all on table public\.support_requests from public, anon, authenticated/);
  assert.doesNotMatch(sql, /create policy/i, 'no policy: the table is reachable only through the functions');
  for (const fn of ['support_limits', 'support_request_create', 'support_source_cleanup', 'support_request_visitor', 'support_admin_list', 'support_admin_mark']) {
    const revoke = sql.indexOf(`revoke execute on function public.${fn}`);
    const grant = sql.indexOf(`grant execute on function public.${fn}`);
    assert.ok(revoke > 0 && grant > revoke, `${fn}: revoke comes before grant`);
    assert.match(sql, new RegExp(`-- drop function if exists public\\.${fn}\\(`), `${fn}: in the commented rollback`);
  }
  // R01: nothing in this file is granted to the anonymous role, and the
  // visitor function, the cleanup and the limits are the service role's alone.
  const grants = sql.split('\n').filter((line) => /^\s*grant\b/i.test(line));
  assert.ok(grants.length >= 6);
  for (const line of grants) assert.doesNotMatch(line, /\banon\b|\bpublic;/, line);
  assert.match(sql, /revoke execute on function public\.support_request_create\(text, text, text, text, text, text\) from public, anon;/);
  assert.match(sql, /grant execute on function public\.support_request_create\(text, text, text, text, text, text\) to authenticated;/);
  for (const fn of ['support_request_visitor', 'support_source_cleanup', 'support_limits']) {
    assert.match(sql, new RegExp(`revoke execute on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated;`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role;`));
  }
  assert.match(sql, /grant execute on function public\.support_admin_list\(integer\) to authenticated;/);
  assert.match(sql, /-- drop table if exists public\.support_requests;/);
  assert.match(sql, /NOT applied to production/);
});

test('the migration can be run twice without error or loss', async () => {
  const db = await world();
  assert.equal((await visitor(db, SOURCE_1)).ok, true);
  await db.raw.exec(readFileSync(SUPPORT_MIGRATION, 'utf8'));
  assert.equal(await stored(db), 1);
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: 'v@example.test' }, anon), /permission denied|42501/);
  await db.close();
});
