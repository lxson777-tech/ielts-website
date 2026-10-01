/* The admin panel's access tools (src/components/admin/admin-access.ts),
 * against the REAL database answers: every migration in PGlite
 * (tools/trial-db.mjs), the admin function's own replies fed to the panel's
 * pure helpers. Proves the panel offers the right buttons and says the right
 * thing for each state, and that what it shows is what the database holds.
 * The database's own refusals are in tests/free-account-sql.test.ts.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrialDb } from '../tools/trial-db.mjs';
import {
  accessTag,
  allowanceLines,
  availableActions,
  changeSummary,
  currentGrant,
  refusalText,
  tierSentence,
  type AccountAccess,
  type AccessOverview,
  type ComplimentaryAnswer,
} from '../src/components/admin/admin-access.ts';

const STUDENT = 'aaaaaaaa-8888-4888-8888-aaaaaaaaaaaa';
const ALEX = 'adadadad-8888-4888-8888-adadadadadad';
const asAlex = { userId: ALEX };

async function world() {
  const db = await createTrialDb();
  await db.addUser(STUDENT, 'panel-student@example.test');
  await db.addUser(ALEX, 'alex-admin@example.test');
  await db.addProfile(STUDENT);
  await db.makeAdmin(ALEX);
  const access = async () => (await db.rpc('access_admin_grants', { p_user: STUDENT }, asAlex)) as AccountAccess;
  const act = async (action: string) => (await db.rpc('access_admin_complimentary', { p_user: STUDENT, p_action: action, p_note: 'Panel test' }, asAlex)) as ComplimentaryAnswer;
  const overview = async () => ((await db.rpc('access_admin_overview', {}, asAlex)) as AccessOverview[]).find((o) => o.userId === STUDENT);
  return { db, access, act, overview };
}

test('a free account: only "Give free access" is offered, and the row carries no tag', async () => {
  const w = await world();
  const access = await w.access();
  assert.equal(access.tier, 'free');
  assert.deepEqual(availableActions(access), { give: true, renew: false, stop: false });
  assert.equal(currentGrant(access.grants), null);
  assert.match(tierSentence(access), /every lesson/);
  assert.equal(accessTag(await w.overview()), null);
  await w.db.close();
});

test('after Give: the grant, its kind, end date and allowances are shown; Renew and Stop are offered, Give is not', async () => {
  const w = await world();
  const given = await w.act('give');
  assert.equal(given.ok, true);
  if (!given.ok) return;
  assert.match(changeSummary(given), /^Free access given until \d{1,2} [A-Z][a-z]{2} \d{4}\.$/);
  const access = given.status;
  const grant = currentGrant(access.grants)!;
  assert.deepEqual([grant.kind, grant.running, grant.note, grant.grantedByEmail], ['complimentary', true, 'Panel test', 'alex-admin@example.test']);
  assert.deepEqual(availableActions(access), { give: false, renew: true, stop: true });
  assert.deepEqual(allowanceLines(grant).map((l) => [l.label, l.used, l.limit]), [
    ['Essay checks', 0, 12],
    ['Recorded Speaking checks', 0, 6],
    ['Live practice interviews', 0, 2],
    ['Mock exam interviews', 0, 2],
  ]);
  // A use shows up in the panel's numbers.
  await w.db.rpc('assessment_reserve', { p_user: STUDENT, p_kind: 'writing', p_request: 'panel-essay-1' }, { role: 'service_role' });
  assert.equal(allowanceLines(currentGrant((await w.access()).grants)!)[0]!.used, 1);
  const tag = accessTag(await w.overview());
  assert.equal(tag?.tone, 'gift');
  assert.match(tag!.text, /^Free access until /);
  assert.match(tierSentence(access), /same allowances/);
  await w.db.close();
});

test('Renew: another 30 days after the last; three periods ahead turns Renew off', async () => {
  const w = await world();
  await w.act('give');
  const renewed = await w.act('renew');
  assert.equal(renewed.ok, true);
  if (!renewed.ok) return;
  assert.match(changeSummary(renewed), /^Renewed: another 30 days, from .+ until .+\.$/);
  await w.act('renew');
  const access = await w.access();
  assert.deepEqual(availableActions(access), { give: false, renew: false, stop: true });
  const refused = await w.act('renew');
  assert.equal(refused.ok, false);
  if (refused.ok) return;
  assert.match(refusalText(refused.reason), /Three free periods/);
  await w.db.close();
});

test('Stop: the student is back to lessons only; Give is offered again; the row says it ended', async () => {
  const w = await world();
  await w.act('give');
  const stopped = await w.act('stop');
  assert.equal(stopped.ok, true);
  if (!stopped.ok) return;
  assert.equal(changeSummary(stopped), 'Free access stopped. The student is back to lessons only.');
  const access = stopped.status;
  assert.equal(access.tier, 'paid-ended');
  assert.deepEqual(availableActions(access), { give: true, renew: true, stop: false });
  assert.equal(currentGrant(access.grants)!.running, false);
  assert.deepEqual(accessTag(await w.overview()), { text: 'Free access ended', tone: 'ended' });
  assert.match(tierSentence(access), /Lessons only/);
  const again = await w.act('stop');
  assert.equal(again.ok, false);
  if (again.ok) return;
  assert.equal(refusalText(again.reason), 'There is no free access to stop.');
  await w.db.close();
});

test('a paid student: the row says paid until, and free access queues after it', async () => {
  const w = await world();
  const o = (await w.db.rpc('access_order_create', { p_plan: 'month-1' }, { userId: STUDENT })) as { orderId: string; amount: number };
  await w.db.rpc('access_order_paid', { p_order: o.orderId, p_provider: 'simulated', p_ref: `sim_${o.orderId}`, p_amount: o.amount, p_currency: 'KZT' }, { role: 'service_role' });
  assert.equal(accessTag(await w.overview())?.tone, 'paid');
  const given = await w.act('give');
  assert.equal(given.ok, true);
  if (!given.ok) return;
  assert.match(changeSummary(given), /after the access already running/);
  assert.equal(currentGrant(given.status.grants)!.kind, 'paid', 'the running paid grant is the current one');
  await w.db.close();
});
