/* A student deleting their own account, run for real:
 * supabase/migrations/2026-10-02-account-deletion.sql after every other
 * migration, in PGlite with Supabase's roles and auth.uid()
 * (tools/trial-db.mjs). The database itself decides every assertion.
 *
 *   node --import ./tests/ts-extension-loader.mjs --test tests/account-deletion-sql.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrialDb, DELETION_MIGRATION } from '../tools/trial-db.mjs';

const A = 'aaaaaaaa-7777-4777-8777-aaaaaaaaaaaa';
const B = 'bbbbbbbb-8888-4888-8888-bbbbbbbbbbbb';
const service = { role: 'service_role' as const };
type Db = Awaited<ReturnType<typeof createTrialDb>>;

async function world(): Promise<Db> {
  const db = await createTrialDb();
  await db.addUser(A, 'delete-a@example.test');
  await db.addUser(B, 'delete-b@example.test');
  for (const id of [A, B]) {
    await db.raw.query(`insert into public.user_state (user_id, progress) values ($1, '{"lessons":{"reading-tfng":1}}')`, [id]);
  }
  return db;
}

async function buy(db: Db, as: { userId: string }) {
  const created = (await db.rpc('access_order_create', { p_plan: 'month-1' }, as)) as Record<string, unknown>;
  assert.equal(created.ok, true, JSON.stringify(created));
  const orderId = created.orderId as string;
  const ref = `sim_${orderId.replace(/-/g, '')}`;
  await db.rpc('access_order_mark_pending', { p_order: orderId, p_provider: 'simulated', p_ref: ref }, service);
  const paid = (await db.rpc('access_order_paid', { p_order: orderId, p_provider: 'simulated', p_ref: ref, p_amount: created.amount, p_currency: created.currency }, service)) as Record<string, unknown>;
  assert.equal(paid.ok, true, JSON.stringify(paid));
  return orderId;
}

async function count(db: Db, sql: string, params: unknown[]) {
  return Number((await db.raw.query(sql, params)).rows[0]?.n ?? 0);
}

test('a student deletes their own account: the sign-in and every row of theirs are gone at once', async () => {
  const db = await world();
  await db.rpc('delete_my_account', {}, { userId: A });
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [A]), 0);
  assert.equal(await count(db, 'select count(*)::int as n from public.user_state where user_id = $1', [A]), 0);
  // The other student is untouched.
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [B]), 1);
  assert.equal(await count(db, 'select count(*)::int as n from public.user_state where user_id = $1', [B]), 1);
});

test('a student who has paid can delete too: access goes, the sale stays as an anonymous record', async () => {
  const db = await world();
  const orderId = await buy(db, { userId: A });
  await db.rpc('delete_my_account', {}, { userId: A });
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [A]), 0);
  assert.equal(await count(db, 'select count(*)::int as n from public.access_grants where user_id = $1', [A]), 0);
  const kept = (await db.raw.query('select user_id, amount, status, receipt_number from public.payment_orders where id = $1', [orderId])).rows[0] as Record<string, unknown>;
  assert.ok(kept, 'the sale record is kept for tax');
  assert.equal(kept.user_id, null, 'and no longer names the person');
  assert.equal(kept.status, 'paid');
  assert.ok(Number(kept.amount) > 0);
});

test('nobody can delete an account that is not their own, and a visitor cannot call it', async () => {
  const db = await world();
  await assert.rejects(() => db.rpc('delete_my_account', {}, { role: 'anon' }));
  // The function takes no argument: B calling it deletes B, never A.
  await db.rpc('delete_my_account', {}, { userId: B });
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [A]), 1);
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [B]), 0);
});

test('the deletion file runs on a database without the paid-access tables (production today)', async () => {
  const db = await createTrialDb({ migrations: [] });
  await db.raw.exec(readFileSync(DELETION_MIGRATION, 'utf8'));
  await db.addUser(A, 'delete-a@example.test');
  await db.rpc('delete_my_account', {}, { userId: A });
  assert.equal(await count(db, 'select count(*)::int as n from auth.users where id = $1', [A]), 0);
});
