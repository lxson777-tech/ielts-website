/* The profile gate (src/lib/auth/profile-gate.ts): a signed-in student with
 * no complete profile is sent to /profile once, and only when it is safe.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/profile-gate.test.ts
 *
 * WHAT IS SIMULATED, AND WHAT IS NOT
 * Simulated: the account project. src/lib/auth/supabase.ts is replaced by a
 * stand-in whose `student_profiles` answer is set per test (the same load-
 * hook pattern as tests/account-isolation.test.ts), the browser's storage is
 * a Map, and the account lifecycle's subscription is a hand-driven fake so
 * each test decides exactly when "signed in" is announced. Everything else
 * is the shipping code: the gate itself, and the real profile module it
 * loads (cachedProfile, loadProfile, isProfileComplete, profileHref).
 *
 * Every student and value below is SYNTHETIC. */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

/* ------------------------------------------------------------------ */
/* A browser's storage, and an account project                          */
/* ------------------------------------------------------------------ */

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
};

type Answer = { data: unknown; error: unknown };
/** What the stand-in answers to a student_profiles read. Set per test. */
let answer: Answer = { data: null, error: null };
/** How many times anything asked the account project for a profile. */
let reads = 0;

(globalThis as Record<string, unknown>).__gateSupabase = {
  from(table: string) {
    assert.equal(table, 'student_profiles', 'the gate asked for a table it has no business reading');
    return {
      select() {
        return {
          eq(column: string, _userId: string) {
            assert.equal(column, 'user_id');
            return {
              async maybeSingle() {
                reads += 1;
                return answer;
              },
            };
          },
        };
      },
    };
  },
};

registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__gateSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    return next(url, context);
  },
});

const { startProfileGate } = await import('../src/lib/auth/profile-gate.ts');
import type { AccountState } from '../src/lib/auth/lifecycle.ts';

/* ------------------------------------------------------------------ */
/* The pieces the gate is handed                                         */
/* ------------------------------------------------------------------ */

const SYNTHETIC_USER = { id: 'synthetic-gate-student-1' } as AccountState['user'];

const COMPLETE_ROW = {
  user_id: 'synthetic-gate-student-1',
  first_name: 'Synthetic',
  last_name: 'Student',
  date_of_birth: '1999-05-05',
  phone: '+77012345678',
  city: 'Almaty',
  occupation: 'Work',
  source: 'friend',
  parent_name: null,
  parent_phone: null,
  parent_consent_at: null,
  updated_at: '2026-09-24T00:00:00.000Z',
};

interface Harness {
  emit: (state: AccountState) => void;
  changePage: (route: string) => void;
  navigated: string[];
  setRoute: (route: string) => void;
  setMustStay: (stay: boolean) => void;
  stop: () => void;
}

function startGate(initialRoute = '/dashboard'): Harness {
  let route = initialRoute;
  let mustStay = false;
  let listener: ((state: AccountState) => void) | null = null;
  let pageCallback: (() => void) | null = null;
  const navigated: string[] = [];
  const stop = startProfileGate({
    onAccountChange: (l) => {
      listener = l;
      return () => {
        listener = null;
      };
    },
    route: () => route,
    mustStay: () => mustStay,
    navigate: (href) => void navigated.push(href),
    onPageChange: (cb) => {
      pageCallback = cb;
      return () => {
        pageCallback = null;
      };
    },
  });
  return {
    emit: (state) => listener?.(state),
    changePage: (next) => {
      route = next;
      pageCallback?.();
    },
    navigated,
    setRoute: (next) => {
      route = next;
    },
    setMustStay: (stay) => {
      mustStay = stay;
    },
    stop,
  };
}

const signedIn = (settled = 0): AccountState => ({ user: SYNTHETIC_USER, known: true, settled });

/** Let the dynamic import and the profile read finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function reset(): void {
  store.clear();
  answer = { data: null, error: null };
  reads = 0;
}

/* ------------------------------------------------------------------ */
/* The four rules the gate must keep                                     */
/* ------------------------------------------------------------------ */

test('a signed-in student with no profile is sent to /profile, remembering where they were', async () => {
  reset();
  const gate = startGate('/tests/reading-full-001?from=plan');
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, ['/profile?next=%2Ftests%2Freading-full-001%3Ffrom%3Dplan']);
  gate.stop();
});

test('an incomplete saved profile counts as missing', async () => {
  reset();
  answer = { data: { ...COMPLETE_ROW, phone: '123' }, error: null };
  const gate = startGate('/dashboard');
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, ['/profile?next=%2Fdashboard']);
  gate.stop();
});

test('no redirect on an exempt route: the profile, sign-in, sign-up and password pages, and /admin', async () => {
  for (const route of ['/profile', '/profile?next=%2Fdashboard', '/sign-in', '/sign-up?next=%2Ftests', '/forgot-password', '/reset-password', '/admin']) {
    reset();
    const gate = startGate(route);
    gate.emit(signedIn());
    await settle();
    assert.deepEqual(gate.navigated, [], route);
    gate.stop();
  }
});

test('no redirect when the profile could not be asked for (loadProfile answers undefined)', async () => {
  reset();
  answer = { data: null, error: { message: 'relation "student_profiles" does not exist' } };
  const gate = startGate('/dashboard');
  gate.emit(signedIn());
  await settle();
  assert.equal(reads, 1, 'the gate did ask');
  assert.deepEqual(gate.navigated, [], 'an unanswered question is never treated as a missing profile');
  gate.stop();
});

test('redirects at most once per page, however often the account is announced', async () => {
  reset();
  const gate = startGate('/dashboard');
  gate.emit(signedIn(0));
  gate.emit(signedIn(0));
  gate.emit(signedIn(1)); // the first sync finishing
  await settle();
  gate.emit(signedIn(2)); // a later re-announcement
  await settle();
  assert.equal(gate.navigated.length, 1, `navigated: ${JSON.stringify(gate.navigated)}`);
  assert.equal(reads, 1, 'the same student on the same page is asked about once');
  gate.stop();
});

/* ------------------------------------------------------------------ */
/* And the cases around them                                              */
/* ------------------------------------------------------------------ */

test('a complete profile is left alone', async () => {
  reset();
  answer = { data: COMPLETE_ROW, error: null };
  const gate = startGate('/dashboard');
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, []);
  gate.stop();
});

test('nothing happens, and nothing is loaded, until a signed-in student is known', async () => {
  reset();
  const gate = startGate('/dashboard');
  gate.emit({ user: null, known: false, settled: 0 });
  gate.emit({ user: null, known: true, settled: 0 });
  gate.emit({ user: SYNTHETIC_USER, known: false, settled: 0 });
  await settle();
  assert.equal(reads, 0);
  assert.deepEqual(gate.navigated, []);
  gate.stop();
});

test('never while a timed paper is on screen (or on a full-screen page)', async () => {
  reset();
  const gate = startGate('/tests/reading-full-001');
  gate.setMustStay(true);
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, []);
  gate.stop();
});

test('a paper that starts while the profile is being fetched still stops the redirect', async () => {
  reset();
  const gate = startGate('/trainers/writing');
  gate.emit(signedIn());
  gate.setMustStay(true); // the exam mark appears before the answer arrives
  await settle();
  assert.deepEqual(gate.navigated, []);
  gate.stop();
});

test('an answer that arrives after the student has moved to another page is dropped', async () => {
  reset();
  const gate = startGate('/dashboard');
  gate.emit(signedIn());
  gate.changePage('/profile?next=%2Fdashboard'); // moved to an exempt page mid-question
  await settle();
  assert.deepEqual(gate.navigated, []);
  gate.stop();
});

test('after a client-side move to an ordinary page, the gate checks again', async () => {
  reset();
  const gate = startGate('/profile');
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, [], 'exempt on /profile');
  gate.changePage('/start');
  await settle();
  assert.deepEqual(gate.navigated, ['/profile?next=%2Fstart']);
  gate.stop();
});

test('a complete cached profile answers at once, and the server can still overrule it', async () => {
  reset();
  store.set(
    'ielts.profile.v1:synthetic-gate-student-1',
    JSON.stringify({
      firstName: 'Synthetic',
      lastName: 'Student',
      dateOfBirth: '1999-05-05',
      phone: '+77012345678',
      city: 'Almaty',
      occupation: 'Work',
      source: 'friend',
      parentName: null,
      parentPhone: null,
      parentConsentAt: null,
      updatedAt: '2026-09-24T00:00:00.000Z',
    }),
  );
  answer = { data: null, error: null }; // the row is gone on the server
  const gate = startGate('/dashboard');
  gate.emit(signedIn());
  await settle();
  assert.deepEqual(gate.navigated, ['/profile?next=%2Fdashboard']);
  assert.equal(store.has('ielts.profile.v1:synthetic-gate-student-1'), false, 'the stale cache is cleared');
  gate.stop();
});

test('the gate never decides whose work this is: it does not touch the store owner', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(here, '..', 'src', 'lib', 'auth', 'profile-gate.ts'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /store-owner/, 'profile-gate.ts must not import store-owner');
  assert.doesNotMatch(code, /setCurrentOwner|ensureOwnerResolved|startSyncForUser|stopSync/);
  assert.doesNotMatch(code, /from ['"]\.\/sync['"]/);
});
