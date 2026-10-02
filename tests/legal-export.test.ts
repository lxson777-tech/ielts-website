/* "Download my data" (src/lib/legal/export.ts, 2 October 2026).
 *
 * - Every table the migrations create for a student's rows is either read
 *   into the file or named in it as not readable, so a new table cannot be
 *   silently left out.
 * - A table or function this database lacks is skipped and named, never a
 *   failure; a real failure is reported, and the rest still comes back.
 * - Only this student's browser items go in: never another account's on a
 *   shared computer, never the sign-in token.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/legal-export.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  EXPORT_FORMAT,
  EXPORT_TABLES,
  NOT_READABLE,
  belongsToStudent,
  browserItems,
  buildExport,
  collectAccountData,
  exportFileName,
  isMissingError,
  type StorageLike,
} from '../src/lib/legal/export.ts';
import { CONSENT_VERSION } from '../src/lib/legal/consent.ts';

const ME = 'aaaaaaaa-0000-4000-8000-00000000000a';
const OTHER = 'bbbbbbbb-0000-4000-8000-00000000000b';

function sqlFiles(): string {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  return [readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'), ...files.map((f) => readFileSync(new URL(f, dir), 'utf8'))].join('\n');
}

test('every table that holds a student’s rows is read into the file or named as not readable', () => {
  const sql = sqlFiles();
  const covered = new Set([...EXPORT_TABLES.map((t) => t.table), ...NOT_READABLE.map((t) => t.table)]);
  // Read through support_my_requests(); admins hold the owner's own role, not a student's data.
  const elsewhere = new Set(['support_requests', 'admins']);
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+) \(([\s\S]*?)\n\);/g)];
  assert.ok(tables.length >= 15);
  for (const [, name, body] of tables) {
    const holdsStudentRows = /user_id\s+uuid[^\n]*references (auth\.users|public\.trial_accounts)/.test(body!) || /references public\.assessment_usage/.test(body!);
    if (!holdsStudentRows) continue;
    assert.ok(covered.has(name!) || elsewhere.has(name!), `${name}: add it to EXPORT_TABLES or NOT_READABLE in src/lib/legal/export.ts`);
  }
  // And every table read for the student really has a "select own" policy.
  for (const { table } of EXPORT_TABLES) {
    assert.match(sql, new RegExp(`on public\\.${table}[\\s\\S]{0,80}for select[^;]*auth\\.uid\\(\\) = user_id`), `${table}: no select-own policy`);
  }
});

test('missing tables and functions are recognised, other errors are not', () => {
  assert.equal(isMissingError({ code: 'PGRST205', message: 'Could not find the table public.x in the schema cache' }), true);
  assert.equal(isMissingError({ code: 'PGRST202', message: 'Could not find the function public.support_my_requests' }), true);
  assert.equal(isMissingError({ code: '42P01', message: 'relation does not exist' }), true);
  assert.equal(isMissingError(null, 404), true);
  assert.equal(isMissingError({ code: '42501', message: 'permission denied for table x' }), false);
  assert.equal(isMissingError({ code: '', message: 'Failed to fetch' }), false);
  assert.equal(isMissingError(null), false);
});

class FakeStorage implements StorageLike {
  private items: Record<string, string>;
  constructor(items: Record<string, string>) {
    this.items = items;
  }
  get length() {
    return Object.keys(this.items).length;
  }
  key(i: number) {
    return Object.keys(this.items)[i] ?? null;
  }
  getItem(k: string) {
    return this.items[k] ?? null;
  }
}

test('only this student’s browser items go in, never another account’s or the sign-in', () => {
  assert.equal(belongsToStudent(`ielts.profile.v1:${ME}`, ME), true);
  assert.equal(belongsToStudent(`ielts.progress.v1::u:${ME}`, ME), true);
  assert.equal(belongsToStudent('ielts.progress.v1', ME), true, 'signed-out work on this device');
  assert.equal(belongsToStudent(`ielts.profile.v1:${OTHER}`, ME), false);
  assert.equal(belongsToStudent('sb-project-auth-token', ME), false);
  assert.equal(belongsToStudent('somebody-else.key', ME), false);
  const items = browserItems(
    new FakeStorage({
      [`ielts.profile.v1:${ME}`]: '{"firstName":"Test"}',
      [`ielts.profile.v1:${OTHER}`]: '{"firstName":"Other"}',
      'ielts.locale.v1': 'ru',
      'sb-local-auth-token': '{"access_token":"secret"}',
    }),
    ME,
  );
  assert.deepEqual(items, { 'ielts.locale.v1': 'ru', [`ielts.profile.v1:${ME}`]: { firstName: 'Test' } });
  assert.deepEqual(browserItems(null, ME), {});
});

/** A stand-in for the Supabase client: the calls export.ts makes, answered
    from `rows` by table, with per-table errors. */
function fakeClient(opts: { rows: Record<string, unknown[]>; errors?: Record<string, { code: string; message: string; status?: number }>; rpc?: unknown }) {
  const calls: { table: string; user: string; from: number; to: number }[] = [];
  return {
    calls,
    client: {
      from(table: string) {
        return {
          select() {
            return {
              eq(_col: string, user: string) {
                return {
                  async range(from: number, to: number) {
                    calls.push({ table, user, from, to });
                    const err = opts.errors?.[table];
                    if (err) return { data: null, error: err, status: err.status ?? 400 };
                    const all = (opts.rows[table] ?? []).filter((r) => (r as { user_id: string }).user_id === user);
                    return { data: all.slice(from, to + 1), error: null, status: 200 };
                  },
                };
              },
            };
          },
        };
      },
      async rpc(fn: string) {
        assert.equal(fn, 'support_my_requests');
        return opts.rpc as { data: unknown; error: unknown; status: number };
      },
    },
  };
}

test('reading: every table is asked for this student only, pages are followed, a missing table is skipped and a failure reported', async () => {
  const events = Array.from({ length: 1500 }, (_, i) => ({ user_id: ME, event_id: `e${i}` }));
  const { client, calls } = fakeClient({
    rows: {
      student_profiles: [{ user_id: ME, first_name: 'Test' }],
      learning_events: events,
    },
    errors: {
      payment_orders: { code: 'PGRST205', message: 'Could not find the table public.payment_orders in the schema cache', status: 404 },
      mr_ez_notes: { code: '', message: 'Failed to fetch' },
    },
    rpc: { data: [{ id: 'r1', message: 'Hello there, a question.' }], error: null, status: 200 },
  });
  const read = await collectAccountData(client as never, ME);
  assert.ok(calls.every((c) => c.user === ME));
  assert.equal(calls.filter((c) => c.table === 'learning_events').length, 2, 'two pages for 1,500 rows');
  const by = Object.fromEntries(read.tables.map((t) => [t.table, t]));
  assert.equal(by.learning_events!.rows.length, 1500);
  assert.equal(by.student_profiles!.status, 'ok');
  assert.equal(by.payment_orders!.status, 'missing');
  assert.equal(by.mr_ez_notes!.status, 'failed');
  assert.equal(read.supportMessages.status, 'ok');

  const file = buildExport({
    user: {
      id: ME,
      email: 'student@example.test',
      created_at: '2026-10-01T10:00:00Z',
      last_sign_in_at: '2026-10-02T08:00:00Z',
      app_metadata: { providers: ['email'] },
      user_metadata: { consent_version: CONSENT_VERSION, consent_at: '2026-10-01T10:00:00Z' },
    },
    ...read,
    localStorage: { 'ielts.locale.v1': 'en' },
    sessionStorage: {},
    now: new Date('2026-10-02T09:00:00Z'),
    translate: (s) => s,
  });
  assert.equal(file.format, EXPORT_FORMAT);
  assert.equal(file.exportedAt, '2026-10-02T09:00:00.000Z');
  assert.equal(file.account.email, 'student@example.test');
  assert.equal((file.account.metadata as Record<string, string>).consent_version, CONSENT_VERSION);
  assert.equal(file.database.student_profiles!.description, 'Your details from the profile form.');
  assert.equal(file.database.support_requests!.rows.length, 1);
  assert.ok(!('payment_orders' in file.database));
  assert.deepEqual(file.notOnThisSite, ['payment_orders']);
  assert.deepEqual(file.couldNotBeRead, ['mr_ez_notes']);
  assert.deepEqual(file.notIncluded.map((n) => n.table), NOT_READABLE.map((n) => n.table));
  assert.deepEqual(file.thisBrowser.localStorage, { 'ielts.locale.v1': 'en' });
  // It is plain JSON all the way down.
  assert.deepEqual(JSON.parse(JSON.stringify(file)), file);
});

test('a database without the support function: messages are named as not on this site, not as a failure', async () => {
  const { client } = fakeClient({ rows: {}, rpc: { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.support_my_requests' }, status: 404 } });
  const read = await collectAccountData(client as never, ME);
  assert.equal(read.supportMessages.status, 'missing');
  const file = buildExport({
    user: { id: ME, email: 'student@example.test', created_at: '', last_sign_in_at: undefined, app_metadata: {}, user_metadata: {} },
    ...read,
    localStorage: {},
    sessionStorage: {},
    now: new Date('2026-10-02T09:00:00Z'),
    translate: (s) => s,
  });
  assert.deepEqual(file.notOnThisSite, ['support_requests']);
  assert.equal(file.couldNotBeRead, undefined);
});

test('descriptions are written in the student’s language, and the file is named by date', () => {
  const file = buildExport({
    user: { id: ME, email: 'x@example.test', created_at: '', last_sign_in_at: undefined, app_metadata: {}, user_metadata: {} },
    tables: [{ table: 'user_state', status: 'ok', rows: [] }],
    supportMessages: { status: 'ok', rows: [] },
    localStorage: {},
    sessionStorage: {},
    now: new Date('2026-10-02T09:00:00Z'),
    translate: (s) => `RU:${s}`,
  });
  assert.equal(file.database.user_state!.description, 'RU:Your saved progress and study plan.');
  assert.match(file.about, /^RU:/);
  assert.equal(exportFileName(new Date('2026-10-02T23:30:00Z')), 'ielts-is-ez-my-data-2026-10-02.json');
});

test('Account > Profile offers the download on both builds', () => {
  const settings = readFileSync(new URL('../src/components/AccountSettings.tsx', import.meta.url), 'utf8');
  assert.match(settings, /<DownloadMyData user=\{user\} \/>/);
  // Not wrapped in a build switch (the deletion row is; this one is not).
  const at = settings.indexOf('<DownloadMyData user={user} />');
  const before = settings.slice(Math.max(0, at - 200), at);
  assert.doesNotMatch(before, /ACCOUNT_DELETION_ENABLED &&|isTrialBuild\(\) &&/);
});
