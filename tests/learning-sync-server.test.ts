/* The Supabase stand-in's three personal learning tables, served locally for
 * free by tools/mr-ez-dev-server.mjs: learning_events, learning_plan,
 * learning_companions. The real schema for these is a PROPOSAL,
 * supabase/migrations/2026-09-21-learning.sql, never applied to any real
 * project (see supabase/README.md). This file proves the dev server's copy
 * of that design actually behaves the way the schema and
 * src/lib/learning/contracts/sync.ts say it must, so the sync layer the next
 * work package writes has something real to run against before Alex ever
 * touches production.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/learning-sync-server.test.ts
 * The whole suite is `npm test`.
 *
 * This imports the REAL dev server module, not a reimplementation of it, and
 * lets it bind an OS-assigned free port (MR_EZ_DEV_PORT=0) inside this same
 * process, then talks to it over real HTTP exactly the way the browser's
 * Supabase client would. `LIVE` in that module is only true when
 * process.argv carries `--live`, which `node --test` never passes, so
 * nothing here can reach a real model or spend a cent.
 *
 * What is proved, in order:
 *   1. Sending the same evidence batch twice stores one copy of each event.
 *   2. One student can never read or write another student's rows, across
 *      all three tables (two distinct signed-up accounts).
 *   3. The plan's conflict rule, PLAN_CONFLICT_RULE in
 *      src/lib/learning/contracts/sync.ts: a lower revision is rejected and
 *      the winner is handed back; a confirmed plan beats an unconfirmed one
 *      regardless of revision. Exercised across two devices of the same
 *      account (two separate sign-ins, two tokens, one user id), which is
 *      what a real conflict looks like.
 *   4. Companions round-trip by kind without clobbering each other.
 *   5. Endpoints that existed before this package touched anything still
 *      answer.
 *   6. A static, structural read of the SQL migration file itself.
 *
 * Every account here is a made-up test fixture created fresh against the
 * dev server's in-memory store; nothing in this file is a real student, and
 * nothing here is synced anywhere but that in-memory store.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* ── Start the real dev server on a free port ──────────────────────────── */

process.env.MR_EZ_DEV_PORT = '0';
const dev = await import('../tools/mr-ez-dev-server.mjs');

if (!dev.server.listening) {
  await new Promise<void>((resolve, reject) => {
    dev.server.once('listening', () => resolve());
    dev.server.once('error', reject);
  });
}

const address = dev.server.address();
if (address === null || typeof address === 'string') {
  throw new Error('dev server did not report a bound port');
}
const base = `http://127.0.0.1:${address.port}`;

test.after(() => {
  dev.server.close();
});

/* ── Small helpers over the real HTTP surface ──────────────────────────── */

interface Session {
  token: string;
  userId: string;
}

let emailCounter = 0;

/** Signs up a fresh account, or signs in again with the SAME email to model
    a second device on an existing account: the dev server's /signup always
    returns a brand new access token, but the same user id when the email
    already exists, exactly like opening the site in a second browser and
    signing in again. */
async function signIn(email: string): Promise<Session> {
  const res = await fetch(`${base}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'synthetic-test-password-1' }),
  });
  assert.equal(res.status, 200, `sign-in for ${email} must succeed`);
  const body = (await res.json()) as { access_token: string; user: { id: string } };
  return { token: body.access_token, userId: body.user.id };
}

function freshEmail(label: string): string {
  emailCounter += 1;
  return `${label}-${emailCounter}@example.test`;
}

function authHeaders(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra };
}

async function restGet(token: string, path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: authHeaders(token) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function restPost(
  token: string,
  path: string,
  body: unknown,
  prefer = 'return=representation',
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'POST',
    headers: authHeaders(token, { Prefer: prefer }),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** A synthetic EvidenceEvent-shaped row. The `event` payload is a stand-in,
    not a real EvidenceEvent: this file tests the server's storage and
    isolation rules, not the shape the contract defines (that is covered by
    tests/learning-evidence.test.ts against the real types). */
function makeEventRow(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    event_id: `ev:synthetic-${Math.random().toString(36).slice(2)}`,
    event: { kind: 'synthetic-test-fixture' },
    occurred_at: '2026-09-20T10:00:00.000Z',
    activity_id: 'reading:matching-headings:drill-1',
    paper: 'reading',
    mode: 'practice',
    ...overrides,
  };
}

/* ── 1. Idempotent evidence writes ──────────────────────────────────────── */

test('the same evidence batch sent twice stores one copy of each event', async () => {
  const student = await signIn(freshEmail('evidence-student'));
  const events = [
    makeEventRow({ user_id: student.userId, event_id: 'ev:fixture-1' }),
    makeEventRow({ user_id: student.userId, event_id: 'ev:fixture-2' }),
  ];

  const first = await restPost(
    student.token,
    'learning_events?on_conflict=user_id,event_id',
    events,
    'resolution=ignore-duplicates,return=representation',
  );
  assert.equal(first.status, 201);
  assert.equal(first.body.length, 2, 'both new events are stored the first time');

  const second = await restPost(
    student.token,
    'learning_events?on_conflict=user_id,event_id',
    events,
    'resolution=ignore-duplicates,return=representation',
  );
  assert.equal(second.status, 201);
  assert.equal(second.body.length, 0, 'resending the identical batch inserts nothing new');

  const stored = await restGet(student.token, `learning_events?user_id=eq.${student.userId}&select=event_id`);
  assert.equal(stored.body.length, 2, 'exactly one copy of each event is held, not four');
});

/* ── 2. Account isolation, all three tables ─────────────────────────────── */

test('one student can never read or write another student’s rows', async () => {
  const a = await signIn(freshEmail('student-a'));
  const b = await signIn(freshEmail('student-b'));

  await restPost(
    a.token,
    'learning_events?on_conflict=user_id,event_id',
    [makeEventRow({ user_id: a.userId, event_id: 'ev:a-owns-this' })],
    'return=representation',
  );
  await restPost(
    a.token,
    'learning_plan?on_conflict=user_id',
    { user_id: a.userId, plan: { note: 'a’s plan' }, revision: 1, confirmed: false, updated_at: '2026-09-20T10:00:00.000Z' },
    'resolution=merge-duplicates,return=representation',
  );
  await restPost(
    a.token,
    'learning_companions?on_conflict=user_id,kind',
    { user_id: a.userId, kind: 'vocab', data: { note: 'a’s vocab' }, revision: 1 },
    'resolution=merge-duplicates,return=representation',
  );

  // B asking directly for A's rows gets nothing, on all three tables.
  const bReadsAEvents = await restGet(b.token, `learning_events?user_id=eq.${a.userId}`);
  assert.deepEqual(bReadsAEvents.body, []);
  const bReadsAPlan = await restGet(b.token, `learning_plan?user_id=eq.${a.userId}`);
  assert.deepEqual(bReadsAPlan.body, []);
  const bReadsACompanions = await restGet(b.token, `learning_companions?user_id=eq.${a.userId}`);
  assert.deepEqual(bReadsACompanions.body, []);

  // B cannot write a row naming A as the owner: the whole write is refused,
  // exactly what a real `with check (auth.uid() = user_id)` violation does.
  const bWritesAEvent = await restPost(b.token, 'learning_events?on_conflict=user_id,event_id', [
    makeEventRow({ user_id: a.userId, event_id: 'ev:should-be-refused' }),
  ]);
  assert.equal(bWritesAEvent.status, 403);

  const bWritesAPlan = await restPost(b.token, 'learning_plan?on_conflict=user_id', {
    user_id: a.userId,
    plan: { note: 'hijack attempt' },
    revision: 99,
    confirmed: true,
    updated_at: '2026-09-22T10:00:00.000Z',
  });
  assert.equal(bWritesAPlan.status, 403);

  const bWritesACompanions = await restPost(b.token, 'learning_companions?on_conflict=user_id,kind', {
    user_id: a.userId,
    kind: 'vocab',
    data: { note: 'hijack attempt' },
    revision: 99,
  });
  assert.equal(bWritesACompanions.status, 403);

  // A's own data is untouched and still readable, so the isolation above is
  // about ownership, not a broken endpoint.
  const aReadsOwnEvents = await restGet(a.token, `learning_events?user_id=eq.${a.userId}`);
  assert.equal(aReadsOwnEvents.body.length, 1);
  const aReadsOwnPlan = await restGet(a.token, `learning_plan?user_id=eq.${a.userId}`);
  assert.equal(aReadsOwnPlan.body[0].revision, 1);
  const aReadsOwnCompanions = await restGet(a.token, `learning_companions?user_id=eq.${a.userId}&kind=eq.vocab`);
  assert.deepEqual(aReadsOwnCompanions.body[0].data, { note: 'a’s vocab' });
});

/* ── 3. The plan conflict rule ───────────────────────────────────────────── */

test('a plan with a lower revision is rejected and the winner is returned', async () => {
  const email = freshEmail('plan-student');
  const deviceOne = await signIn(email);
  const deviceTwo = await signIn(email); // second sign-in, same account: a second device
  assert.equal(deviceTwo.userId, deviceOne.userId, 'signing in again on the same email is the same account');

  const push = (token: string, fields: Record<string, unknown>) =>
    restPost(
      token,
      'learning_plan?on_conflict=user_id',
      { user_id: deviceOne.userId, ...fields },
      'resolution=merge-duplicates,return=representation',
    );

  const first = await push(deviceOne.token, {
    plan: { revision: 1 },
    revision: 1,
    confirmed: false,
    updated_at: '2026-09-20T10:00:00.000Z',
  });
  assert.equal(first.body[0].revision, 1);

  // Device two pushes a genuinely stale revision.
  const stale = await push(deviceTwo.token, {
    plan: { revision: 0 },
    revision: 0,
    confirmed: false,
    updated_at: '2026-09-20T09:00:00.000Z',
  });
  assert.equal(stale.status, 201, 'a rejected write is still a normal successful response, not an error');
  assert.equal(stale.body[0].revision, 1, 'the stale write is dropped; the row that actually won comes back');
  assert.deepEqual(stale.body[0].plan, { revision: 1 }, 'the winning plan content is what device two must rebuild from');

  // A genuinely higher revision from device two does win.
  const higher = await push(deviceTwo.token, {
    plan: { revision: 2 },
    revision: 2,
    confirmed: false,
    updated_at: '2026-09-20T11:00:00.000Z',
  });
  assert.equal(higher.body[0].revision, 2, 'a real advance is accepted');

  const settled = await restGet(deviceOne.token, `learning_plan?user_id=eq.${deviceOne.userId}`);
  assert.equal(settled.body[0].revision, 2, 'the stored row reflects the accepted write, not the rejected one');
});

test('a confirmed plan beats an unconfirmed one regardless of revision', async () => {
  const student = await signIn(freshEmail('confirmed-plan-student'));
  const push = (fields: Record<string, unknown>) =>
    restPost(
      student.token,
      'learning_plan?on_conflict=user_id',
      { user_id: student.userId, ...fields },
      'resolution=merge-duplicates,return=representation',
    );

  const confirmed = await push({
    plan: { revision: 1, label: 'confirmed' },
    revision: 1,
    confirmed: true,
    updated_at: '2026-09-20T10:00:00.000Z',
  });
  assert.equal(confirmed.body[0].confirmed, true);
  assert.equal(confirmed.body[0].revision, 1);

  // A much higher revision, but unconfirmed: it must still lose.
  const higherButUnconfirmed = await push({
    plan: { revision: 99, label: 'unconfirmed challenger' },
    revision: 99,
    confirmed: false,
    updated_at: '2026-09-25T10:00:00.000Z',
  });
  assert.equal(higherButUnconfirmed.body[0].confirmed, true, 'the confirmed plan is still the winner');
  assert.equal(higherButUnconfirmed.body[0].revision, 1, 'its revision is untouched by the unconfirmed challenger');
  assert.deepEqual(higherButUnconfirmed.body[0].plan, { revision: 1, label: 'confirmed' });
});

/* ── 4. Companions round-trip by kind ───────────────────────────────────── */

test('companions round-trip by kind without clobbering each other', async () => {
  const student = await signIn(freshEmail('companions-student'));
  const put = (kind: string, data: unknown) =>
    restPost(
      student.token,
      'learning_companions?on_conflict=user_id,kind',
      { user_id: student.userId, kind, data, revision: 1 },
      'resolution=merge-duplicates,return=representation',
    );

  await put('vocab', { cards: { improve: { ease: 2.4 } } });
  await put('notes', { bookmarks: ['lesson:writing-task-1-overview'] });
  await put('preferences', { locale: 'ru' });

  const vocab = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}&kind=eq.vocab`);
  const notes = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}&kind=eq.notes`);
  const preferences = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}&kind=eq.preferences`);

  assert.equal(vocab.body.length, 1);
  assert.deepEqual(vocab.body[0].data, { cards: { improve: { ease: 2.4 } } });
  assert.equal(notes.body.length, 1);
  assert.deepEqual(notes.body[0].data, { bookmarks: ['lesson:writing-task-1-overview'] });
  assert.equal(preferences.body.length, 1);
  assert.deepEqual(preferences.body[0].data, { locale: 'ru' });

  // Updating one kind does not touch another.
  await put('vocab', { cards: { improve: { ease: 2.6 } } });
  const vocabAgain = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}&kind=eq.vocab`);
  const notesUnchanged = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}&kind=eq.notes`);
  assert.deepEqual(vocabAgain.body[0].data, { cards: { improve: { ease: 2.6 } } });
  assert.deepEqual(notesUnchanged.body[0].data, { bookmarks: ['lesson:writing-task-1-overview'] });

  const wholeStudent = await restGet(student.token, `learning_companions?user_id=eq.${student.userId}`);
  assert.equal(wholeStudent.body.length, 3, 'three kinds, three rows, none overwriting another');
});

/* ── 5. Everything that existed before this package still works ────────── */

test('endpoints that existed before this package still respond', async () => {
  const settings = await fetch(`${base}/auth/v1/settings`);
  assert.equal(settings.status, 200);

  const tutorConfig = await fetch(`${base}/tutor`);
  assert.equal(tutorConfig.status, 200);
  const tutorBody = (await tutorConfig.json()) as { live: boolean };
  assert.equal(tutorBody.live, false, 'this test run never talks to a real model');

  const student = await signIn(freshEmail('legacy-endpoint-student'));
  const push = await fetch(`${base}/rest/v1/user_state`, {
    method: 'POST',
    headers: authHeaders(student.token, { Prefer: 'resolution=merge-duplicates,return=representation' }),
    body: JSON.stringify({ user_id: student.userId, progress: { version: 1 }, study_plan: null }),
  });
  assert.equal(push.status, 201, 'the pre-existing user_state table is untouched by this package’s changes');
});

/* ── 6. A structural read of the SQL proposal itself ────────────────────── */

test('the SQL migration defines all three tables with row level security and no destructive statement outside its rollback comments', () => {
  const sqlPath = fileURLToPath(new URL('../supabase/migrations/2026-09-21-learning.sql', import.meta.url));
  const sql = readFileSync(sqlPath, 'utf8');

  for (const table of ['learning_events', 'learning_plan', 'learning_companions']) {
    assert.match(
      sql,
      new RegExp(`create table if not exists public\\.${table} \\(`),
      `${table} is created`,
    );
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security;`),
      `${table} has row level security turned on`,
    );
  }

  // The migration legitimately mentions `touch_user_state_updated_at`, the
  // shared trigger function schema.sql already defines and this file
  // reuses for learning_companions, so a bare substring check on
  // "user_state" would misfire on that function name. What must never
  // appear is a reference to the user_state TABLE itself.
  assert.doesNotMatch(sql, /public\.user_state\b/, 'the migration never references the existing user_state table');

  const rollbackMarker = 'Rollback (NOT executed';
  const rollbackStart = sql.indexOf(rollbackMarker);
  assert.ok(rollbackStart > 0, 'a commented rollback section exists');
  const bodyBeforeRollback = sql.slice(0, rollbackStart);

  // "drop policy if exists" and "drop trigger if exists" are the SAME
  // idempotent recreate-on-rerun idiom supabase/schema.sql already uses
  // (its own header: "Idempotent: drop then recreate so re-running the
  // script never errors"). They drop a POLICY or a TRIGGER, immediately
  // followed by a fresh create, never a table and never a row, so they are
  // deliberately not flagged by this check. What must never appear outside
  // the rollback comments is an actually destructive statement.
  assert.doesNotMatch(bodyBeforeRollback, /drop\s+table/i, 'no table is dropped outside the rollback comments');
  assert.doesNotMatch(bodyBeforeRollback, /\bdelete\s+from\b/i, 'no row is deleted outside the rollback comments');
  assert.doesNotMatch(bodyBeforeRollback, /\btruncate\b/i, 'nothing is truncated outside the rollback comments');
});
