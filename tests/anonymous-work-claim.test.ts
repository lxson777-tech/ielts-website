/* Two things about "Work saved on this device" (AnonymousWorkClaim.tsx):
 * that it is actually reachable from a real app route, and that the rule
 * deciding when it shows or hides is exactly right.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/anonymous-work-claim.test.ts
 *
 * WHY THIS FILE EXISTS
 * A browser click-through against the local accounts stand-in (tests/browser/
 * f20_account_journey.py, docs/personal-learning/evidence/final/
 * results-account-journey.md) found the claim offer built, correct in
 * isolation, and completely unreachable: it was mounted only inside
 * AccountMenu.tsx, which only Nav.astro rendered, and no page in this build
 * renders Nav.astro any more (every app route uses WorkspaceHeader.astro /
 * WorkspaceMenu.tsx instead, and the fullscreen pages render neither). The
 * fix mounts it in src/components/learning/today/TodaySession.tsx, the one
 * screen every signed-in student reaches within one page load on any app
 * route. Part 1 below scans the real source tree the same way that review
 * did, so a future refactor that quietly detaches the claim again fails a
 * test instead of shipping silently. Part 2 pins the show/hide rule itself,
 * directly against the real store (no browser, no window, no mocking): the
 * five situations a student can be in.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { isAppRoute } from '../src/lib/platform-nav.ts';
import { createLearnerStore, anonymousOwner, deviceIdFrom, userOwner } from '../src/lib/learning/store.browser.ts';
import type { BrowserStorage } from '../src/lib/store-owner.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_DIR = path.join(REPO_ROOT, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const BASE_LAYOUT_PATH = path.join(SRC_DIR, 'layouts', 'BaseLayout.astro');
const WORKSPACE_HEADER_PATH = path.join(SRC_DIR, 'components', 'WorkspaceHeader.astro');
const DASHBOARD_PAGE_PATH = path.join(PAGES_DIR, 'dashboard.astro');

/* ================================================================== */
/* Part 1: reachable from a real app route                             */
/* ================================================================== */

function listAstroPages(): string[] {
  const entries = fs.readdirSync(PAGES_DIR, { recursive: true, encoding: 'utf8' }) as string[];
  return entries
    .map((rel) => rel.split(path.sep).join('/'))
    .filter((rel) => rel.endsWith('.astro'))
    .map((rel) => path.join(PAGES_DIR, rel))
    .filter((abs) => fs.statSync(abs).isFile());
}

/** The route Astro's file-based router would give this page, close enough
    for prefix matching against APP_ROUTE_PREFIXES (a dynamic segment like
    `[id]` still starts with the right prefix). */
function routeForPageFile(abs: string): string {
  let rel = path.relative(PAGES_DIR, abs).split(path.sep).join('/');
  rel = rel.replace(/\.astro$/, '').replace(/\/index$/, '');
  if (rel === 'index' || rel === '') return '/';
  return `/${rel}`;
}

function resolveRelativeImport(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.astro`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Whether this page renders BaseLayout with `bare` (no nav of any kind: the
    fullscreen test player and mock exam), resolved through at most one layer
    of wrapping layout (e.g. LessonLayout.astro, which never passes `bare`
    itself, exactly like BaseLayout.astro's own `isAppRoute` decides it). */
function resolveBareness(abs: string, visited: Set<string> = new Set()): boolean {
  if (visited.has(abs)) return false;
  visited.add(abs);
  const src = fs.readFileSync(abs, 'utf8');
  const baseLayoutTag = /<BaseLayout\b[\s\S]*?>/.exec(src);
  if (baseLayoutTag) return /\bbare\b/.test(baseLayoutTag[0]);
  for (const [, name, spec] of src.matchAll(/import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"]/g)) {
    if (new RegExp(`<${name}\\b`).test(src)) {
      const resolved = resolveRelativeImport(abs, spec);
      if (resolved) return resolveBareness(resolved, visited);
    }
  }
  return false;
}

/** Whether AnonymousWorkClaim is reachable by following real relative
    imports out of `startAbs`, to a generous but bounded depth. Conservative
    on purpose (it also walks into type-only imports and stylesheets), which
    only means it could say "reachable" a little too eagerly, never too
    late: a false negative is the one failure mode this test exists to
    catch, so erring the other way is the safe direction. */
function reachesAnonymousClaim(startAbs: string): boolean {
  const visited = new Set<string>();
  function walk(file: string): boolean {
    if (visited.has(file) || visited.size > 500) return false;
    visited.add(file);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
    const src = fs.readFileSync(file, 'utf8');
    if (/AnonymousWorkClaim/.test(src)) return true;
    for (const [, spec] of src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
      const resolved = resolveRelativeImport(file, spec);
      if (resolved && walk(resolved)) return true;
    }
    return false;
  }
  return walk(startAbs);
}

test('BaseLayout.astro really does give an app route the workspace header, not the old marketing nav', () => {
  const src = fs.readFileSync(BASE_LAYOUT_PATH, 'utf8');
  assert.match(
    src,
    /isAppRoute\s*\?\s*[\s\S]{0,80}<WorkspaceHeader/,
    'BaseLayout.astro no longer renders WorkspaceHeader for an app route, so this test\'s own scan would be checking the wrong chrome',
  );
});

test('every non-bare app-route page under src/pages resolves to the workspace shell (a real scan, not a fixed list)', () => {
  const pages = listAstroPages();
  assert.ok(pages.length > 20, `expected to find many pages under src/pages, found ${pages.length}`);

  const classified = pages.map((file) => {
    const route = routeForPageFile(file);
    const bare = resolveBareness(file);
    return { file, route, bare, appRoute: !bare && isAppRoute(route) };
  });

  const dashboard = classified.find((p) => p.route === '/dashboard');
  assert.ok(dashboard, 'src/pages/dashboard.astro was not found by the scan');
  assert.equal(dashboard!.appRoute, true, '/dashboard was not classified as an app route by the real scan');

  const workspacePages = classified.filter((p) => p.appRoute);
  assert.ok(
    workspacePages.length >= 10,
    `expected many real pages to resolve to the workspace shell, found ${workspacePages.length}: ${workspacePages.map((p) => p.route).join(', ')}`,
  );

  // The fullscreen players (the mock exam, a timed test, a timed drill) are
  // deliberately bare: they must still exist and still be found bare by the
  // scan, or this test would not actually be distinguishing "no nav" from
  // "workspace nav" at all.
  const bareRoutes = classified.filter((p) => p.bare).map((p) => p.route);
  assert.ok(bareRoutes.length > 0, 'expected at least one deliberately bare fullscreen page (e.g. a timed test player)');
});

test('AnonymousWorkClaim is reachable from the workspace header or the dashboard: built is not the same as mounted', () => {
  const fromHeader = reachesAnonymousClaim(WORKSPACE_HEADER_PATH);
  const fromDashboard = reachesAnonymousClaim(DASHBOARD_PAGE_PATH);
  assert.ok(
    fromHeader || fromDashboard,
    'AnonymousWorkClaim is not imported by anything reachable from src/components/WorkspaceHeader.astro or ' +
      'src/pages/dashboard.astro. A signed-in student on any real app route would never be offered the work ' +
      'they did signed out on this device (see docs/personal-learning/evidence/final/results-account-journey.md).',
  );
});

test('the dashboard page itself reaches the claim, so it shows within one page load of sign-in, not only from a menu', () => {
  assert.ok(
    reachesAnonymousClaim(DASHBOARD_PAGE_PATH),
    'src/pages/dashboard.astro does not reach AnonymousWorkClaim through its own component tree (LearningDashboard ' +
      '-> PlanToday -> TodaySession). A student who signs in from another page and lands on /dashboard should not ' +
      'have to find a menu to be offered their signed-out work.',
  );
});

/* ================================================================== */
/* Part 2: the show or hide rule, pure, against the real store         */
/* ================================================================== */

function memoryStorage(): BrowserStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/* The store's own `legacy` option is a seam for exactly this: a pure test
   with no progress.ts / study-plan.ts globals involved. The four older
   stores (vocab, notes, and the two this stub answers for) are read
   straight from storage, which is empty here, so they contribute nothing
   and cannot throw. */
const noLegacy = () => ({ progress: null, plan: null });

test('signed out: never offered, even with real work sitting on the device', () => {
  const storage = memoryStorage();
  const deviceId = deviceIdFrom(storage);
  const anon = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-a' });

  // A second store for the SAME anonymous owner, i.e. nobody has signed in:
  // the offer is a question for an account, never for the device itself.
  const stillAnonymous = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  assert.equal(stillAnonymous.describeAnonymousWork(), null, 'signed out was offered its own device work');
});

test('signed in, with unclaimed work on the device: offered, with the real counts', () => {
  const storage = memoryStorage();
  const deviceId = deviceIdFrom(storage);
  const anon = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-a' });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-b' });

  const studentA = createLearnerStore({ owner: userOwner('SYNTHETIC-A'), storage, legacy: noLegacy });
  const offer = studentA.describeAnonymousWork();
  assert.ok(offer, 'a signed-in student with unclaimed device work was offered nothing');
  assert.equal(offer!.summary.lessonsStudied, 2, 'the offer did not count the real lessons studied on the device');
});

test('after accepting: nothing left to offer, and the work is in the account', () => {
  const storage = memoryStorage();
  const deviceId = deviceIdFrom(storage);
  const anon = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-a' });

  const studentA = createLearnerStore({ owner: userOwner('SYNTHETIC-A'), storage, legacy: noLegacy });
  assert.ok(studentA.describeAnonymousWork(), 'fixture assumption: there was something to claim');
  const result = studentA.claimAnonymousWork();
  assert.equal(result.outcome, 'claimed');
  assert.equal(studentA.describeAnonymousWork(), null, 'the claimed work was offered again after being claimed');
  assert.equal(studentA.read().events.length, 1, 'the claimed lesson did not arrive in the account\'s own record');

  // Claiming twice adds nothing and is not offered again either.
  studentA.claimAnonymousWork();
  assert.equal(studentA.read().events.length, 1, 'claiming a second time changed what the account has');
});

test('after declining: never offered again to the same account, and nothing moved', () => {
  const storage = memoryStorage();
  const deviceId = deviceIdFrom(storage);
  const anon = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-a' });

  const studentA = createLearnerStore({ owner: userOwner('SYNTHETIC-A'), storage, legacy: noLegacy });
  studentA.declineAnonymousWork();
  assert.equal(studentA.describeAnonymousWork(), null, 'declined work was offered again to the same account');
  assert.equal(studentA.read().events.length, 0, 'declining moved the work into the account anyway');

  // Nothing was deleted: the device still has it, for the student who did
  // the work in the first place to come back to.
  const stillAnonymous = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  assert.equal(stillAnonymous.read().events.length, 1, 'declining lost the work it was supposed to leave alone');
});

test('a previous account\'s decision: a different account on the same device is never offered it either', () => {
  const storage = memoryStorage();
  const deviceId = deviceIdFrom(storage);
  const anon = createLearnerStore({ owner: anonymousOwner(deviceId), storage, legacy: noLegacy });
  anon.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-a' });

  const studentA = createLearnerStore({ owner: userOwner('SYNTHETIC-A'), storage, legacy: noLegacy });
  studentA.declineAnonymousWork(); // A has already decided about this device

  const studentB = createLearnerStore({ owner: userOwner('SYNTHETIC-B'), storage, legacy: noLegacy });
  assert.equal(studentB.describeAnonymousWork(), null, "student B was offered student A's decided-about device work");

  // The same holds the other way: had A claimed instead of declined, there
  // is nothing left under the anonymous owner at all for B to be offered.
  const storage2 = memoryStorage();
  const deviceId2 = deviceIdFrom(storage2);
  const anon2 = createLearnerStore({ owner: anonymousOwner(deviceId2), storage: storage2, legacy: noLegacy });
  anon2.recordLessonStudied({ lessonKey: 'SYNTHETIC-lesson-c' });
  const studentA2 = createLearnerStore({ owner: userOwner('SYNTHETIC-A2'), storage: storage2, legacy: noLegacy });
  studentA2.claimAnonymousWork();
  const studentB2 = createLearnerStore({ owner: userOwner('SYNTHETIC-B2'), storage: storage2, legacy: noLegacy });
  assert.equal(studentB2.describeAnonymousWork(), null, "student B was offered student A's claimed device work");
});
