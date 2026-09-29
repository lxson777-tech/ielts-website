/* Support requests, run for real: supabase/migrations/2026-09-24-admin.sql
 * and 2026-09-30-support.sql applied to an in-memory Postgres (PGlite) with
 * Supabase's roles and auth.uid() (tools/stand-in/support.mjs, on top of
 * tools/trial-db.mjs). Every assertion is the database itself deciding.
 *
 * The migration is LOCAL ONLY and has never been applied to a real project.
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

const MESSAGE = 'The Listening recording stopped halfway through the test.';

async function refused(work: Promise<unknown>, pattern: RegExp) {
  await assert.rejects(work, (err: Error) => pattern.test(err.message) || pattern.test(String((err as { code?: string }).code)));
}

test('a signed-in student can send a request, stamped with their own account', async () => {
  const db = await world();
  const sent = (await db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_context: 'mr-ez', p_page: '/lessons/reading/paraphrase', p_locale: 'ru' }, asA)) as { id: string };
  assert.match(sent.id, /^[0-9a-f-]{36}$/);
  const { rows } = await db.raw.query<{ user_id: string; contact_email: string | null; context: string; page: string; locale: string }>(
    'select user_id, contact_email, context, page, locale from public.support_requests',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.user_id, A);
  assert.equal(rows[0]!.contact_email, null);
  assert.equal(rows[0]!.context, 'mr-ez');
  assert.equal(rows[0]!.locale, 'ru');
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
  await db.raw.query("update public.support_requests set created_at = now() - interval '1 hour'");
  await db.rpc('support_request_create', { p_topic: 'account', p_message: 'Second message, a visitor.', p_email: 'Visitor@Example.test' }, anon);
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

  const marked = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: true }, asAdmin)) as { answeredAt: string };
  assert.ok(marked.answeredAt);
  const again = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: true }, asAdmin)) as { answeredAt: string };
  assert.equal(again.answeredAt, marked.answeredAt, 'marking twice keeps the first time');
  const undone = (await db.rpc('support_admin_mark', { p_id: list[1]!.id, p_answered: false }, asAdmin)) as { answeredAt: string | null };
  assert.equal(undone.answeredAt, null);
  await refused(db.rpc('support_admin_mark', { p_id: '00000000-0000-4000-8000-000000000000' }, asAdmin), /support-not-found/);
  await db.close();
});

test('a signed-out visitor must give a valid email to be answered', async () => {
  const db = await world();
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE }, anon), /support-email-required/);
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: '   ' }, anon), /support-email-required/);
  await refused(db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: 'not-an-email' }, anon), /support-email-invalid/);
  await refused(
    db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: `${'a'.repeat(250)}@example.test` }, anon),
    /support-email-invalid/,
  );
  const ok = await db.rpc('support_request_create', { p_topic: 'problem', p_message: MESSAGE, p_email: 'visitor@example.test' }, anon);
  assert.ok(ok);
  // A visitor's request can never claim an account.
  const { rows } = await db.raw.query<{ user_id: string | null }>('select user_id from public.support_requests');
  assert.equal(rows[0]!.user_id, null);
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
  await db.close();
});

test('gentle limits: five a day per account, three a day per visitor email', async () => {
  const db = await world();
  for (let i = 0; i < 5; i += 1) await db.rpc('support_request_create', { p_topic: 'question', p_message: `${MESSAGE} ${i}` }, asA);
  await refused(db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asA), /support-rate-limited/);
  // Another student is unaffected.
  assert.ok(await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asB));
  for (let i = 0; i < 3; i += 1) {
    await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE, p_email: 'v@example.test' }, anon);
  }
  await refused(db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE, p_email: 'V@example.test' }, anon), /support-rate-limited/);
  // A day later the account may write again.
  await db.raw.query("update public.support_requests set created_at = now() - interval '25 hours'");
  assert.ok(await db.rpc('support_request_create', { p_topic: 'question', p_message: MESSAGE }, asA));
  await db.close();
});

test('the migration keeps its discipline: row security on, revoke before grant, rollback commented, local only', () => {
  const sql = readFileSync(SUPPORT_MIGRATION, 'utf8');
  assert.match(sql, /alter table public\.support_requests enable row level security/);
  assert.match(sql, /revoke all on table public\.support_requests from public, anon, authenticated/);
  assert.doesNotMatch(sql, /create policy/i, 'no policy: the table is reachable only through the functions');
  for (const fn of ['support_request_create', 'support_admin_list', 'support_admin_mark']) {
    const revoke = sql.indexOf(`revoke execute on function public.${fn}`);
    const grant = sql.indexOf(`grant execute on function public.${fn}`);
    assert.ok(revoke > 0 && grant > revoke, `${fn}: revoke comes before grant`);
  }
  assert.match(sql, /grant execute on function public\.support_admin_list\(integer\) to authenticated;/);
  assert.doesNotMatch(sql, /support_admin_list\(integer\) to anon/);
  assert.match(sql, /-- drop table if exists public\.support_requests;/);
  assert.match(sql, /NOT applied to production/);
});
