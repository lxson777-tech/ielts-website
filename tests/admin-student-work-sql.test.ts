/* One student's work for the admin panel, run for real:
 * supabase/migrations/2026-10-05-admin-student-work.sql applied in PGlite on
 * top of the real supabase/schema.sql, 2026-09-21-learning.sql,
 * 2026-09-24-admin.sql and 2026-09-24-profiles.sql (what production has),
 * with Supabase's roles, grants and auth.uid() (tools/stand-in/admin-work.mjs).
 * Every assertion is the database itself deciding.
 *
 * The migration is NOT applied to any real project. Every account is a
 * synthetic uuid in a fresh database per test.
 *
 * Run on its own:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/admin-student-work-sql.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAdminWorkDb, ADMIN_WORK_MIGRATION } from '../tools/stand-in/admin-work.mjs';

const ADMIN = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const STUDENT = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const OTHER = 'cccccccc-3333-4333-8333-cccccccccccc';

type Db = Awaited<ReturnType<typeof createAdminWorkDb>>;
type Work = { tests: Array<Record<string, any>>; writing: Array<Record<string, any>>; speaking: Array<Record<string, any>> };

function readingEvent(id: string, at: string, items: unknown[] | undefined, activity = 'test:reading-full-001') {
  return {
    id,
    activityId: activity,
    contentVersion: 1,
    at,
    localDate: at.slice(0, 10),
    paper: 'reading',
    subskill: 'reading-tfng',
    mode: 'practice',
    completion: 'completed',
    assistance: 'none',
    seenBefore: false,
    outcome: { kind: 'scored', raw: 2, total: 40, bandEstimate: 2.5, secondsUsed: 1200 },
    ...(items ? { items } : {}),
    provenance: 'student',
  };
}

const ITEMS = [
  { itemId: 'reading-full-001:q1', firstAnswer: 'TRUE', correct: true, assistance: 'none', subskill: 'tfng' },
  { itemId: 'reading-full-001:q2', firstAnswer: 'FALSE', correct: false, assistance: 'none', subskill: 'tfng' },
  { itemId: 'reading-full-001:q3', firstAnswer: '', correct: false, assistance: 'none', subskill: 'tfng' },
];

async function addEvent(db: Db, user: string, event: Record<string, any>) {
  await db.raw.query(
    `insert into public.learning_events (user_id, event_id, event, occurred_at, activity_id, paper, mode)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [user, event.id, JSON.stringify(event), event.at, event.activityId, event.paper ?? null, event.mode],
  );
}

async function world(): Promise<Db> {
  const db = await createAdminWorkDb();
  await db.addUser(ADMIN, 'admin@example.test');
  await db.addUser(STUDENT, 'student@example.test');
  await db.addUser(OTHER, 'other@example.test');
  await db.makeAdmin(ADMIN);
  await addEvent(db, STUDENT, readingEvent('ev-1', '2026-10-01T09:00:00.000Z', ITEMS));
  await addEvent(db, STUDENT, readingEvent('legacy:old', '2026-09-01T09:00:00.000Z', undefined));
  await addEvent(db, STUDENT, readingEvent('ev-drill', '2026-10-02T09:00:00.000Z', [], 'drill:reading-full-001-drill-p2'));
  // Not a scored paper: a lesson check and the mock's own summary row.
  await addEvent(db, STUDENT, { ...readingEvent('ev-lesson', '2026-10-03T09:00:00.000Z', []), activityId: 'lesson:tfng', mode: 'lesson-check' });
  await addEvent(db, STUDENT, { ...readingEvent('ev-mock', '2026-10-03T10:00:00.000Z', []), activityId: 'test:mock', paper: undefined, mode: 'assessment' });
  // Someone else's paper, which must never appear in STUDENT's answer.
  await addEvent(db, OTHER, readingEvent('ev-other', '2026-10-04T09:00:00.000Z', ITEMS));
  const progress = {
    version: 1,
    writing: {
      'w-task2-001': [
        { at: '2026-10-01T10:00:00.000Z', overallBand: 6, criteria: { taskResponse: 6 }, wordCount: 260, live: true, essay: 'My essay text.', task: 'task2', promptTitle: 'Cities' },
      ],
    },
    speaking: [{ at: '2026-10-02T10:00:00.000Z', mode: 'part2', topic: 'A trip', overallBand: 6.5, criteria: { pronunciation: 6 }, live: true }],
  };
  await db.raw.query('insert into public.user_state (user_id, progress) values ($1, $2)', [STUDENT, JSON.stringify(progress)]);
  await db.raw.query('insert into public.user_state (user_id, progress) values ($1, $2)', [
    OTHER,
    JSON.stringify({ writing: { 'w-other': [{ at: '2026-10-01T10:00:00.000Z', overallBand: 8, essay: 'Not yours.' }] } }),
  ]);
  return db;
}

test('an admin gets the student\'s scored papers with every answer, newest first, and their essays and speaking scores', async () => {
  const db = await world();
  const work = (await db.studentWork(STUDENT, { userId: ADMIN })) as Work;
  assert.deepEqual(Object.keys(work).sort(), ['speaking', 'tests', 'writing']);
  assert.deepEqual(
    work.tests.map((t) => t.event_id),
    ['ev-drill', 'ev-1', 'legacy:old'],
    'scored reading papers and drills only, newest first; the lesson check and the mock summary are left out',
  );
  const full = work.tests.find((t) => t.event_id === 'ev-1')!;
  assert.equal(full.activity_id, 'test:reading-full-001');
  assert.equal(full.paper, 'reading');
  assert.deepEqual(full.event.items, ITEMS, 'every per-question answer comes back exactly as stored, blanks included');
  assert.equal(full.event.outcome.raw, 2);
  assert.equal(work.tests.find((t) => t.event_id === 'legacy:old')!.event.items, undefined, 'a moved-over attempt has no answers, and none are invented');
  assert.equal(work.writing.length, 1);
  assert.equal(work.writing[0]!.promptId, 'w-task2-001');
  assert.equal(work.writing[0]!.essay, 'My essay text.');
  assert.equal(work.writing[0]!.overallBand, 6);
  assert.deepEqual(work.speaking, [{ at: '2026-10-02T10:00:00.000Z', mode: 'part2', topic: 'A trip', overallBand: 6.5, criteria: { pronunciation: 6 } }]);
  await db.close();
});

test('it never returns another student\'s rows', async () => {
  const db = await world();
  const work = (await db.studentWork(STUDENT, { userId: ADMIN })) as Work;
  const text = JSON.stringify(work);
  assert.doesNotMatch(text, /ev-other|Not yours|w-other/);
  const other = (await db.studentWork(OTHER, { userId: ADMIN })) as Work;
  assert.deepEqual(other.tests.map((t) => t.event_id), ['ev-other']);
  assert.deepEqual(other.writing.map((w) => w.promptId), ['w-other']);
  assert.deepEqual(other.speaking, []);
  // A student with no saved state at all: empty lists, not an error.
  const nobody = (await db.studentWork(ADMIN, { userId: ADMIN })) as Work;
  assert.deepEqual(nobody, { tests: [], writing: [], speaking: [] });
  await db.close();
});

test('a signed-in student who is not an admin is refused, even asking about themselves', async () => {
  const db = await world();
  for (const target of [STUDENT, OTHER]) {
    await assert.rejects(db.studentWork(target, { userId: STUDENT }), (err: any) => err.code === '42501');
  }
  await db.close();
});

test('a signed-out visitor is refused before the function even runs', async () => {
  const db = await world();
  await assert.rejects(db.studentWork(STUDENT, { role: 'anon' }), (err: any) => err.code === '42501');
  await db.close();
});

test('the student\'s own row rules are unchanged: a student still reads only their own events', async () => {
  const db = await world();
  const rows = await db.select('select event_id from public.learning_events order by event_id', [], { userId: STUDENT });
  assert.ok(rows.length > 0 && rows.every((r: any) => r.event_id !== 'ev-other'));
  await db.close();
});

test('the cap holds: at most 200 papers come back', async () => {
  const db = await world();
  for (let i = 0; i < 205; i += 1) {
    const at = new Date(Date.UTC(2026, 6, 1, 0, i)).toISOString();
    await addEvent(db, OTHER, readingEvent(`bulk-${String(i).padStart(3, '0')}`, at, []));
  }
  const work = (await db.studentWork(OTHER, { userId: ADMIN })) as Work;
  assert.equal(work.tests.length, 200);
  assert.equal(work.tests[0]!.event_id, 'ev-other', 'the newest is first');
  await db.close();
});

test('the migration runs twice without error and keeps its discipline', async () => {
  const db = await world();
  await db.raw.exec(readFileSync(ADMIN_WORK_MIGRATION, 'utf8'));
  const work = (await db.studentWork(STUDENT, { userId: ADMIN })) as Work;
  assert.equal(work.tests.length, 3);
  await db.close();

  const sql = readFileSync(ADMIN_WORK_MIGRATION, 'utf8');
  assert.match(sql, /NOT applied to production/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /if not public\.is_admin\(\) then\s+raise exception 'admin only' using errcode = '42501';/);
  const revoke = sql.indexOf('revoke execute on function public.admin_student_work(uuid) from public, anon;');
  const grant = sql.indexOf('grant execute on function public.admin_student_work(uuid) to authenticated;');
  assert.ok(revoke > 0 && grant > revoke, 'revoke comes before grant');
  for (const line of sql.split('\n').filter((l) => /^\s*grant\b/i.test(l))) assert.doesNotMatch(line, /\banon\b/, line);
  assert.match(sql, /-- drop function if exists public\.admin_student_work\(uuid\);/);
  // It reads only the two tables it is for (is_admin reads admins), and
  // writes nothing, and leaves admin_list_users alone.
  const body = sql.replace(/^\s*--.*$/gm, '');
  const tables = new Set([...body.matchAll(/\bpublic\.([a-z_]+)\b/g)].map((m) => m[1]));
  assert.deepEqual([...tables].sort(), ['admin_student_work', 'is_admin', 'learning_events', 'user_state']);
  assert.doesNotMatch(body, /\b(insert|update|delete|truncate|drop|alter)\b/i);
  assert.doesNotMatch(body, /admin_list_users/);
});
