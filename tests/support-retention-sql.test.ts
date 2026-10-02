/* Support messages: 12 months for a signed-out visitor's message, and a
 * student's own copy (supabase/migrations/2026-10-02-support-retention.sql,
 * 2 October 2026). Run for real in PGlite on top of the support migration
 * (tools/stand-in/support.mjs), and through the REAL support Worker's
 * hourly schedule.
 *
 * LOCAL ONLY: the migration has never been applied to a real project.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/support-retention-sql.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSupportDb, SUPPORT_RETENTION_MIGRATION } from '../tools/stand-in/support.mjs';
import { cleanup, hourly, retention } from '../workers/support/src/index.ts';

const A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const SOURCE = '3'.repeat(64);
const MESSAGE = 'A question about the Reading test timings, please.';

type Db = Awaited<ReturnType<typeof createSupportDb>>;
const service = { role: 'service_role' as const };
const anon = { role: 'anon' as const };

async function world(): Promise<Db> {
  const db = await createSupportDb();
  await db.addUser(A, 'student-a@example.test');
  await db.addUser(B, 'student-b@example.test');
  return db;
}

let n = 0;
async function visitorMessage(db: Db) {
  n += 1;
  const answer = (await db.rpc(
    'support_request_visitor',
    { p_source_hash: `${n % 10}`.repeat(64), p_email: `visitor-${n}@example.test`, p_topic: 'question', p_message: MESSAGE },
    service,
  )) as { ok: boolean; id: string };
  assert.equal(answer.ok, true);
  return answer.id;
}

async function studentMessage(db: Db, userId: string, message = MESSAGE) {
  const answer = (await db.rpc('support_request_create', { p_topic: 'question', p_message: message, p_context: 'ai-review' }, { userId })) as { id: string };
  return answer.id;
}

const ageBy = (db: Db, id: string, interval: string) =>
  db.raw.query(`update public.support_requests set created_at = now() - interval '${interval}' where id = $1`, [id]);
const ids = async (db: Db) => (await db.raw.query<{ id: string }>('select id from public.support_requests order by created_at')).rows.map((r) => r.id);

async function refused(work: Promise<unknown>) {
  await assert.rejects(work, (err: Error) => /permission denied|42501/.test(err.message) || /42501/.test(String((err as { code?: string }).code)));
}

test('the retention period is 12 months, in one place, and only the service role may run the cleanup', async () => {
  const db = await world();
  assert.deepEqual(await db.rpc('support_retention', {}, service), { visitorKeepMonths: 12 });
  for (const opts of [anon, { userId: A }]) {
    await refused(db.rpc('support_retention', {}, opts));
    await refused(db.rpc('support_visitor_retention', {}, opts));
  }
  await db.close();
});

test('a signed-out message is deleted after 12 months; a younger one stays, and a signed-in student’s message is never touched', async () => {
  const db = await world();
  const old = await visitorMessage(db);
  const young = await visitorMessage(db);
  const mine = await studentMessage(db, A);
  await ageBy(db, old, '12 months 1 day');
  await ageBy(db, young, '11 months 27 days');
  await ageBy(db, mine, '3 years');
  assert.deepEqual(await db.rpc('support_visitor_retention', {}, service), { ok: true, deleted: 1 });
  const left = await ids(db);
  assert.ok(!left.includes(old), 'the year-old visitor message is gone');
  assert.ok(left.includes(young), 'an eleven-month-old visitor message stays');
  assert.ok(left.includes(mine), 'a signed-in student’s message goes with the account, not by age');
  assert.deepEqual(await db.rpc('support_visitor_retention', {}, service), { ok: true, deleted: 0 }, 'nothing twice');
  await db.close();
});

test('a student’s messages still go with their account', async () => {
  const db = await world();
  await studentMessage(db, A);
  await db.raw.query('delete from auth.users where id = $1', [A]);
  assert.equal((await ids(db)).length, 0);
  await db.close();
});

test('a student reads their own messages, nobody else’s, and never a source hash', async () => {
  const db = await world();
  await studentMessage(db, A, 'My first message about the essay band.');
  await studentMessage(db, A, 'My second message about the essay band.');
  await studentMessage(db, B, 'Student B writes something private here.');
  await visitorMessage(db);
  const mine = (await db.rpc('support_my_requests', {}, { userId: A })) as Record<string, unknown>[];
  assert.equal(mine.length, 2);
  assert.ok(mine.every((r) => String(r.message).startsWith('My ')));
  assert.ok(mine.every((r) => !('source_hash' in r) && !('user_id' in r)));
  assert.equal(mine[0]!.context, 'ai-review');
  assert.deepEqual(Object.keys(mine[0]!).sort(), ['answered_at', 'contact_email', 'context', 'created_at', 'id', 'locale', 'message', 'page', 'topic']);
  assert.deepEqual(await db.rpc('support_my_requests', {}, { userId: B }).then((r) => (r as unknown[]).length), 1);
  await refused(db.rpc('support_my_requests', {}, anon));
  await db.close();
});

test('the new reasons are accepted as the request’s context', async () => {
  const db = await world();
  for (const context of ['refund', 'ai-review']) {
    const answer = (await db.rpc('support_request_create', { p_topic: 'account', p_message: MESSAGE, p_context: context }, { userId: A })) as { id: string };
    const row = (await db.raw.query<{ context: string }>('select context from public.support_requests where id = $1', [answer.id])).rows[0]!;
    assert.equal(row.context, context);
  }
  await db.close();
});

test('the Worker’s hourly schedule runs both cleanups, and the hash cleanup still runs on a database without the retention function', async () => {
  const db = await world();
  const old = await visitorMessage(db);
  await ageBy(db, old, '13 months');
  const fetchFn = (async (input: unknown, init?: RequestInit) => {
    const fn = String(input).split('/rest/v1/rpc/')[1]!;
    try {
      return new Response(JSON.stringify(await db.rpc(fn, JSON.parse(String(init?.body)), service)));
    } catch (err) {
      return new Response(JSON.stringify({ message: (err as Error).message }), { status: 404 });
    }
  }) as typeof fetch;
  const env = { ALLOWED_ORIGINS: 'https://example.test', SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };
  assert.equal(await retention({ fetch: fetchFn }, env as never), 1);
  assert.equal(await retention({ fetch: fetchFn }, { ALLOWED_ORIGINS: 'x' } as never), null, 'not configured');

  const again = await visitorMessage(db);
  await ageBy(db, again, '13 months');
  await hourly({ fetch: fetchFn }, env as never);
  assert.ok(!(await ids(db)).includes(again));

  await db.raw.exec('drop function public.support_visitor_retention()');
  const fresh = await visitorMessage(db);
  await ageBy(db, fresh, '25 hours');
  await hourly({ fetch: fetchFn }, env as never); // must not throw
  const row = (await db.raw.query<{ source_hash: string | null }>('select source_hash from public.support_requests where id = $1', [fresh])).rows[0]!;
  assert.equal(row.source_hash, null, 'the hash was still erased');
  assert.equal(await cleanup({ fetch: fetchFn }, env as never), 0);
  await db.close();
});

test('the migration keeps the support file’s discipline: revoke before grant, nothing for anon, rollback commented, local only, runs twice', async () => {
  const sql = readFileSync(SUPPORT_RETENTION_MIGRATION, 'utf8');
  for (const fn of ['support_retention', 'support_visitor_retention', 'support_my_requests']) {
    const revoke = sql.indexOf(`revoke execute on function public.${fn}`);
    const grant = sql.indexOf(`grant execute on function public.${fn}`);
    assert.ok(revoke > 0 && grant > revoke, `${fn}: revoke comes before grant`);
    assert.match(sql, new RegExp(`-- drop function if exists public\\.${fn}\\(`), `${fn}: in the commented rollback`);
  }
  for (const line of sql.split('\n').filter((l) => /^\s*grant\b/i.test(l))) assert.doesNotMatch(line, /\banon\b|\bpublic;/, line);
  assert.match(sql, /grant execute on function public\.support_visitor_retention\(\) to service_role;/);
  assert.match(sql, /grant execute on function public\.support_my_requests\(\) to authenticated;/);
  assert.match(sql, /NOT applied to production/);
  assert.doesNotMatch(sql, /[–—]/, 'no en or em dashes');

  const db = await world();
  await visitorMessage(db);
  await db.raw.exec(sql);
  assert.equal((await ids(db)).length, 1);
  await db.close();
});
