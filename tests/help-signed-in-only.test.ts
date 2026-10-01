/* Mr EZ's help buttons are for a signed-in student only (30 September 2026).
 *
 * WHY
 * The lesson page put "Explain this differently" and "Show me an example"
 * under every teaching block for everybody, and the focused exercises, the
 * lesson quick check and the written task showed their hint buttons to
 * everybody too. Mr EZ only ever reads a student's own record, so a visitor
 * who was not signed in could only get the lesson's own sentence and an
 * invitation to sign in, which read as a broken button. Now the controls
 * exist only while a student is signed in: they appear the moment one signs
 * in (no reload), go the moment they sign out, and nothing is shown in their
 * place.
 *
 * WHAT THIS PINS
 *   1. The one rule, mrEzHelpAvailable (src/components/learning/lesson-help.ts):
 *      unknown account, hidden; nobody signed in, hidden; signed in, shown.
 *   2. The watcher both surfaces follow, watchMrEzHelpAvailable, over a
 *      sequence of account states: a sign-out hides, a sign-in shows, and
 *      nothing in between is reported as a change.
 *   3. A build with no accounts configured (a bare dev server, a fork, the
 *      frozen snapshot the browser suite runs on): the REAL lifecycle
 *      answers "known, nobody", the buttons never appear, and nothing throws.
 *   4. Source scans: both surfaces that draw a help button consult the rule,
 *      and nothing else in the site draws one.
 *
 * Run with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/help-signed-in-only.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import type { User } from '@supabase/supabase-js';
import type { AccountState } from '../src/lib/auth/lifecycle.ts';

const help = await import('../src/components/learning/lesson-help.ts');
const lifecycle = await import('../src/lib/auth/lifecycle.ts');
const storeOwner = await import('../src/lib/store-owner.ts');

const { mrEzHelpAvailable, watchMrEzHelpAvailable } = help;

/** A SYNTHETIC signed-in student: only the fields the rule could look at. */
function student(id: string): User {
  return { id, email: `synthetic-${id}@example.test` } as unknown as User;
}

const UNKNOWN: AccountState = { user: null, known: false, settled: 0 };
const NOBODY: AccountState = { user: null, known: true, settled: 0 };
const A = student('synthetic-student-a');
const B = student('synthetic-student-b');

/** A stand-in for the app-wide lifecycle's subscription: calls a new
    listener at once with what is known now, then on every publish, exactly
    as onAccountChange does. */
function fakeAccount(initial: AccountState) {
  let state = initial;
  const listeners = new Set<(next: AccountState) => void>();
  return {
    subscribe(listener: (next: AccountState) => void): () => void {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(next: Partial<AccountState>): void {
      state = { ...state, ...next };
      for (const listener of listeners) listener(state);
    },
    listeners: () => listeners.size,
  };
}

/* ------------------------------------------------------------------ */
/* 1. The rule                                                         */
/* ------------------------------------------------------------------ */

test('the rule: hidden until the account has answered, hidden for nobody, shown for a signed-in student', { timeout: 10_000 }, () => {
  assert.equal(mrEzHelpAvailable(undefined), false, 'no state at all showed the buttons');
  assert.equal(mrEzHelpAvailable(null), false, 'a null state showed the buttons');
  assert.equal(mrEzHelpAvailable(UNKNOWN), false, 'an account that has not answered yet showed the buttons');
  assert.equal(
    mrEzHelpAvailable({ user: A, known: false, settled: 0 }),
    false,
    'a user on a state not yet known showed the buttons',
  );
  assert.equal(mrEzHelpAvailable(NOBODY), false, 'a visitor who is not signed in was shown the buttons');
  assert.equal(mrEzHelpAvailable({ user: A, known: true, settled: 0 }), true, 'a signed-in student lost the buttons');
  assert.equal(
    mrEzHelpAvailable({ user: A, known: true, settled: 3 }),
    true,
    'a signed-in student whose sign-in has finished lost the buttons',
  );
});

/* ------------------------------------------------------------------ */
/* 2. The watcher, over time                                           */
/* ------------------------------------------------------------------ */

test('the watcher: unknown then nobody stays hidden, a sign-in shows, a sign-out hides, and only flips are reported', { timeout: 10_000 }, () => {
  const account = fakeAccount(UNKNOWN);
  const heard: boolean[] = [];
  const stop = watchMrEzHelpAvailable((available) => heard.push(available), account.subscribe);

  assert.deepEqual(heard, [false], 'the first answer is not reported at once, or is not "hidden"');

  account.publish({ known: true, user: null });
  assert.deepEqual(heard, [false], 'the account answering "nobody" was reported as a change');

  account.publish({ known: true, user: A });
  assert.deepEqual(heard, [false, true], 'a sign-in did not show the buttons');

  account.publish({ settled: 1 });
  assert.deepEqual(heard, [false, true], "the same student's sign-in finishing was reported as a change");

  account.publish({ user: B, settled: 0 });
  assert.deepEqual(heard, [false, true], 'one student replacing another was reported as a flip');

  account.publish({ user: null, settled: 0 });
  assert.deepEqual(heard, [false, true, false], 'a switch to nobody did not hide the buttons');

  account.publish({ user: A });
  assert.deepEqual(heard, [false, true, false, true], 'a switch back to a student did not show them again');

  stop();
  assert.equal(account.listeners(), 0, 'the watcher did not unsubscribe');
  account.publish({ user: null });
  assert.deepEqual(heard, [false, true, false, true], 'a stopped watcher still heard the account');
});

test('the watcher: a page opened by a student already signed in shows the buttons on the first answer', { timeout: 10_000 }, () => {
  const account = fakeAccount({ user: A, known: true, settled: 1 });
  const heard: boolean[] = [];
  const stop = watchMrEzHelpAvailable((available) => heard.push(available), account.subscribe);
  assert.deepEqual(heard, [true]);
  stop();
});

test('the watcher: a cold load goes hidden, then shown once the lifecycle answers with the student', { timeout: 10_000 }, () => {
  const account = fakeAccount(UNKNOWN);
  const heard: boolean[] = [];
  const stop = watchMrEzHelpAvailable((available) => heard.push(available), account.subscribe);
  account.publish({ known: true, user: A });
  assert.deepEqual(heard, [false, true]);
  stop();
});

/* ------------------------------------------------------------------ */
/* 3. A build with no accounts configured                              */
/* ------------------------------------------------------------------ */

test('with no accounts configured, the real lifecycle answers "nobody", the buttons never appear, and nothing throws', { timeout: 10_000 }, async () => {
  /* The premise: this process has no account project, exactly like a bare
     dev server, a fork, or the frozen snapshot the browser suite runs on. */
  assert.equal(storeOwner.configuredAuthSessionKey(), null, 'this test process has accounts configured');

  lifecycle.resetAccountLifecycleForTest();
  const heard: boolean[] = [];
  let stop: (() => void) | null = null;
  try {
    assert.doesNotThrow(() => {
      /* The default subscription: the app-wide lifecycle itself. */
      stop = watchMrEzHelpAvailable((available) => heard.push(available));
    });
    for (let tick = 0; tick < 200 && !lifecycle.accountState().known; tick += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(lifecycle.accountState().known, true, 'the lifecycle never answered');
    assert.equal(lifecycle.accountState().user, null);
    assert.equal(mrEzHelpAvailable(lifecycle.accountState()), false);
    assert.deepEqual(heard, [false], 'a build with no accounts reported the buttons as available');
  } finally {
    (stop as (() => void) | null)?.();
    lifecycle.resetAccountLifecycleForTest();
  }
});

/* ------------------------------------------------------------------ */
/* 4. Source scans: both surfaces consult the rule                     */
/* ------------------------------------------------------------------ */

/** A source file with its line endings as \n, whatever the checkout wrote
    (this repository is checked out with CRLF on Windows). */
function source(relative: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'src', relative), 'utf8').replace(/\r\n/g, '\n');
}

/** The text of the first function starting at `start`, up to `end`. */
function body(text: string, start: string, end: RegExp): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `could not find ${start}`);
  const rest = text.slice(from);
  const stop = rest.slice(start.length).search(end);
  return stop < 0 ? rest : rest.slice(0, start.length + stop);
}

test('source scan: the rule is written once, in the help module, and reads the account only', { timeout: 10_000 }, () => {
  const module = source('components/learning/lesson-help.ts');
  assert.match(
    module,
    /export function mrEzHelpAvailable\(state: Pick<AccountState, 'known' \| 'user'> \| null \| undefined\): boolean \{\s*return Boolean\(state && state\.known && state\.user\);\s*\}/,
  );
  assert.match(module, /subscribe: AccountSubscription = onAccountChange,/);
  /* Nowhere else in the site spells the rule a second time. */
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|astro)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (/function mrEzHelpAvailable\b/.test(text) && !full.endsWith(path.join('learning', 'lesson-help.ts'))) {
          offenders.push(full);
        }
      }
    }
  };
  walk(path.join(process.cwd(), 'src'));
  assert.deepEqual(offenders, []);
  /* It only READS the account: no owner is set from here. */
  assert.doesNotMatch(module, /setCurrentOwner|moveOwnerOnce|announceStoresChanged/);
});

test('source scan: the lesson page mounter adds its controls only while the rule says yes, and takes them away when it says no', { timeout: 10_000 }, () => {
  const block = source('components/learning/lesson-block-help.ts');
  assert.match(block, /watchMrEzHelpAvailable,/, 'the lesson page does not import the watcher');

  /* The one place helpOn is set is the watcher's answer. */
  assert.equal((block.match(/^\s+helpOn = /gm) ?? []).length, 1, 'helpOn is set somewhere other than the watcher');
  assert.match(block, /^let helpOn = false;$/m, 'the lesson page starts out showing the controls');
  const follow = body(block, 'function followHelpAvailability(): void {', /\n\}\n/);
  assert.match(
    follow,
    /watchMrEzHelpAvailable\(\(available\) => \{\s*helpOn = available;\s*if \(!target\) return;\s*if \(available\) addControls\(target\.root, target\.options\);\s*else removeControls\(target\.root\);\s*\}\);/,
  );

  /* The controls are built in exactly one place, and it refuses while the
     rule says no. */
  assert.equal(block.split('buildControl(').length, 3, 'buildControl is called from more than one place');
  const add = body(block, 'function addControls(root: ParentNode, options: LessonBlockHelpOptions): void {', /\n\}\n/);
  assert.match(add, /^function addControls\([^)]*\): void \{\s*if \(!helpOn\) return;/);
  assert.ok(add.includes('buildControl('), 'addControls no longer builds the controls');

  /* The mounter stamps the ids for everybody but builds nothing itself. */
  const mount = body(block, 'export function mountLessonBlockHelp(options: LessonBlockHelpOptions): void {', /\n\}\n/);
  assert.ok(mount.includes('stampBlockIds(root, options.ids);'), 'the ids are no longer stamped for everybody');
  assert.doesNotMatch(mount, /buildControl\(/, 'the mounter builds controls without asking the rule');
  assert.match(mount, /if \(following\) \{\s*if \(helpOn\) addControls\(root, options\);\s*\} else \{\s*followHelpAvailability\(\);\s*\}/);

  /* Taking a control away lets go of a press still on its way. */
  const remove = body(block, 'function removeControls(root: ParentNode): void {', /\n\}\n/);
  assert.match(remove, /inFlight\.get\(node\)\?\.cancel\(\);/);
});

test('source scan: the shared hint control renders nothing until the rule says yes, and lets go on a sign-out', { timeout: 10_000 }, () => {
  const controls = source('components/learning/LessonHelpControls.tsx');
  assert.match(controls, /import \{[^}]*\bwatchMrEzHelpAvailable\b[^}]*\} from '\.\/lesson-help';/);
  assert.match(controls, /const \[helpOn, setHelpOn\] = useState\(false\);/, 'the control starts out shown');
  assert.equal(controls.split('setHelpOn(').length, 2, 'helpOn is set somewhere other than the watcher');
  assert.match(
    controls,
    /watchMrEzHelpAvailable\(\(available\) => \{\s*setHelpOn\(available\);\s*if \(available\) return;\s*asking\.current\?\.cancel\(\);\s*asking\.current = null;\s*repliesFor\.current = null;\s*setReplies\(\[\]\);\s*setBusy\(null\);\s*\}\)/,
  );
  /* Nothing is drawn before the gate: the only JSX is after it. */
  const gate = controls.indexOf('if (!helpOn) return null;');
  const jsx = controls.indexOf('<div className={`help-controls');
  assert.ok(gate > 0 && jsx > gate, 'the buttons can be drawn before the sign-in rule is asked');
});

test('source scan: no other surface draws a help button of its own', { timeout: 10_000 }, () => {
  const drawers: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|astro)$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (/["'`]help-control["'`]/.test(text)) drawers.push(path.relative(process.cwd(), full).replace(/\\/g, '/'));
      }
    }
  };
  walk(path.join(process.cwd(), 'src'));
  assert.deepEqual(drawers.sort(), [
    'src/components/learning/LessonHelpControls.tsx',
    'src/components/learning/lesson-block-help.ts',
  ]);
  /* And the three screens that host hints render them through the gated
     control, never a button of their own. */
  for (const host of ['components/learning/FocusedExercise.tsx', 'components/PracticeQuiz.tsx', 'components/learning/WritingFocusedTask.tsx']) {
    assert.match(source(host), /<LessonHelpControls\b/, `${host} no longer uses the shared control`);
  }
});
