/* The last four screens that recorded through the shared store belong to
 * the student they were opened for: the inline lesson quiz, the vocabulary
 * practice round, the spoken focused task, and (one race) the written
 * focused task.
 *
 * Run this file on its own with:
 *   node --import ./tests/ts-extension-loader.mjs --test tests/last-screens-owner.test.ts
 * The whole suite is `npm test`.
 *
 * WHY THIS FILE EXISTS
 * The follow-up to R2B-01 (tests/exercise-owner.test.ts) bound the focused
 * exercise and the lesson quick check to their student. Its builder reported
 * three more screens that looked the owner up once and recorded through the
 * shared learner store, which answers for whoever is on the page at the
 * press, and one small race in the written task:
 *
 *   src/scripts/lesson-quiz.ts             the quiz written into a lesson body
 *   src/components/VocabReview.tsx         the vocabulary practice round
 *   src/components/learning/SpokenFocusedTask.tsx
 *   src/components/learning/WritingFocusedTask.tsx  (a keystroke that lands
 *                                            just before the repaint after a
 *                                            hand-over)
 *
 * Each now binds at start, hands over when the owner changes, claims every
 * press (refused, recording nothing, for a student who has gone or from a tab
 * that missed the change) and records through a writer that names the owner.
 *
 * WHAT IS REAL AND WHAT IS MIRRORED
 * Real: the owner module (with this application's account session read from
 * the storage below, as in a browser), the learner store and its
 * explicit-owner writers, the vocabulary store (rateFor), the exercise-owner
 * helper, the two new helpers (src/components/vocab-round-owner.ts and
 * src/components/learning/spoken-task-owner.ts), the written draft store,
 * and THE INLINE QUIZ SCRIPT ITSELF, run against a few lines of fake DOM
 * shaped exactly like the markup tools/scrape_ielts_materials.py writes. The
 * React components cannot be imported here (the test loader does not read
 * JSX), so their steps are mirrored line for line, and the last tests read
 * the components' own source to check they still have that shape.
 *
 * Every student, token, answer and recording below is SYNTHETIC. No model,
 * grader or network is called.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';

/* ------------------------------------------------------------------ */
/* A browser, an account and a page, in memory                         */
/* ------------------------------------------------------------------ */

interface MemoryStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function memoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let local = memoryStorage();

/* Defined before anything under test is imported. */
(globalThis as Record<string, unknown>).window = {
  get localStorage() {
    return local;
  },
  get sessionStorage() {
    return memoryStorage();
  },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {
    return true;
  },
};

/* ── A few lines of DOM: exactly what the inline quiz script touches ── */

type Listener = (event: { type: string; target: FakeEl }) => void;

class FakeClassList {
  private names = new Set<string>();
  constructor(initial = '') {
    for (const name of initial.split(/\s+/).filter(Boolean)) this.names.add(name);
  }
  add(...names: string[]): void {
    for (const name of names) this.names.add(name);
  }
  remove(...names: string[]): void {
    for (const name of names) this.names.delete(name);
  }
  toggle(name: string, force?: boolean): boolean {
    const on = force ?? !this.names.has(name);
    if (on) this.names.add(name);
    else this.names.delete(name);
    return on;
  }
  contains(name: string): boolean {
    return this.names.has(name);
  }
  toString(): string {
    return [...this.names].sort().join(' ');
  }
}

const camel = (name: string) => name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

class FakeEl {
  readonly tagName: string;
  classList: FakeClassList;
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  children: FakeEl[] = [];
  parent: FakeEl | null = null;
  isRoot = false;
  hidden = false;
  disabled = false;
  value = '';
  options: { value: string }[] = [];
  offsetWidth = 0;
  private text = '';
  private listeners = new Map<string, Listener[]>();

  constructor(tag: string, className = '') {
    this.tagName = tag.toUpperCase();
    this.classList = new FakeClassList(className);
  }
  set className(value: string) {
    this.classList = new FakeClassList(value);
  }
  get className(): string {
    return this.classList.toString();
  }
  get textContent(): string {
    return this.children.length > 0 ? this.children.map((child) => child.textContent).join(' ') : this.text;
  }
  set textContent(value: string) {
    this.text = value;
    this.children = [];
  }
  get firstElementChild(): FakeEl | null {
    return this.children[0] ?? null;
  }
  get isConnected(): boolean {
    for (let at: FakeEl | null = this; at; at = at.parent) if (at.isRoot) return true;
    return false;
  }
  append(...kids: FakeEl[]): this {
    for (const kid of kids) {
      kid.parent = this;
      this.children.push(kid);
    }
    return this;
  }
  before(node: FakeEl): void {
    const parent = this.parent!;
    node.parent = parent;
    parent.children.splice(parent.children.indexOf(this), 0, node);
  }
  setAttribute(name: string, value: string): void {
    if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = value;
    else this.attributes.set(name, value);
  }
  getAttribute(name: string): string | null {
    if (name.startsWith('data-')) return this.dataset[camel(name.slice(5))] ?? null;
    return this.attributes.get(name) ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.getAttribute(name) !== null;
  }
  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  removeEventListener(): void {}
  /** Fire `type` here and let it bubble, as the browser does. */
  fire(type: string): void {
    const event = { type, target: this };
    for (let at: FakeEl | null = this; at; at = at.parent) for (const listener of at.listeners.get(type) ?? []) listener(event);
  }
  querySelectorAll(selector: string): FakeEl[] {
    const found: FakeEl[] = [];
    const walk = (el: FakeEl) => {
      for (const child of el.children) {
        if (matches(child, selector)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
  querySelector(selector: string): FakeEl | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

/** Tag, classes and attributes, which is every selector the script uses. */
function matches(el: FakeEl, selector: string): boolean {
  return selector.split(',').some((one) => {
    const parts = /^([a-z]+)?((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/.exec(one.trim());
    if (!parts) throw new Error(`the fake DOM does not understand ${one}`);
    if (parts[1] && el.tagName !== parts[1].toUpperCase()) return false;
    for (const name of (parts[2] ?? '').split('.').filter(Boolean)) if (!el.classList.contains(name)) return false;
    for (const attr of (parts[3] ?? '').match(/\[[^\]]+\]/g) ?? []) {
      const [, name, wanted] = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(attr)!;
      const value = el.getAttribute(name!);
      if (value === null || (wanted !== undefined && value !== wanted)) return false;
    }
    return true;
  });
}

let pageRoot = new FakeEl('body');
(globalThis as Record<string, unknown>).document = {
  querySelectorAll: (selector: string) => pageRoot.querySelectorAll(selector),
  querySelector: (selector: string) => pageRoot.querySelector(selector),
  createElement: (tag: string) => new FakeEl(tag),
  addEventListener() {},
  removeEventListener() {},
  documentElement: { lang: 'en', classList: new FakeClassList(), dataset: {} },
};

/* ── The account project, and a tutor that is never reached ── */

let held: { token: string; userId: string } | null = null;

(globalThis as Record<string, unknown>).__lastScreensSupabase = {
  auth: {
    async getSession() {
      const now = held;
      return { data: { session: now ? { access_token: now.token, user: { id: now.userId } } : null } };
    },
  },
};

/* SYNTHETIC and never reached. The account project address is given to
   the owner module, so it reads this application's own session key from
   the storage above exactly as it does in a browser. */
const ACCOUNT_URL = 'https://synthetic-last-screens.invalid';
(globalThis as Record<string, unknown>).__lastScreensEnv = {
  PUBLIC_MR_EZ_URL: 'https://synthetic-last-screens-tutor.invalid/tutor',
  PUBLIC_SUPABASE_URL: ACCOUNT_URL,
  PUBLIC_SUPABASE_ANON_KEY: 'SYNTHETIC-anon-key',
};

const ENV_PRELUDE = 'Object.defineProperty(import.meta, "env", { get: () => globalThis.__lastScreensEnv });\n';

registerHooks({
  load(url, context, next) {
    if (url.endsWith('/src/lib/auth/supabase.ts')) {
      return {
        format: 'module',
        shortCircuit: true,
        source:
          'export const getSupabase = () => globalThis.__lastScreensSupabase;\n' +
          'export const isAuthConfigured = () => true;\n',
      };
    }
    const loaded = next(url, context);
    if (url.endsWith('/src/lib/tutor/client.ts') || url.endsWith('/src/lib/store-owner.ts')) {
      const source =
        typeof loaded.source === 'string' ? loaded.source : Buffer.from(loaded.source as ArrayBuffer).toString('utf8');
      return { ...loaded, source: ENV_PRELUDE + source };
    }
    return loaded;
  },
});

globalThis.fetch = (async () => {
  throw new Error('nothing on these screens may reach the network');
}) as typeof fetch;

/* ------------------------------------------------------------------ */
/* The real modules                                                    */
/* ------------------------------------------------------------------ */

const storeOwner = await import('../src/lib/store-owner.ts');
const learner = await import('../src/lib/learning/store.browser.ts');
const owned = await import('../src/components/learning/exercise-owner.ts');
const lessonCheck = await import('../src/lib/learning/lesson-check.ts');
const quiz = await import('../src/scripts/lesson-quiz.ts');
const vocab = await import('../src/lib/vocab-review.ts');
const practice = await import('../src/lib/vocab-practice.ts');
const round = await import('../src/components/vocab-round-owner.ts');
const spoken = await import('../src/components/learning/spoken-task-owner.ts');
const spokenTask = await import('../src/components/learning/spoken-focused-task.ts');
const written = await import('../src/components/learning/written-focused-task.ts');
const { VOCABULARY_PARTS } = await import('../src/data/vocabulary.ts');
const { DEVICE_ID_KEY } = await import('../src/lib/learning/contracts/sync.ts');

import type { CacheOwner } from '../src/lib/learning/contracts/sync.ts';
import type { ExerciseClaimDeps, ExerciseRefusal, ExerciseSession } from '../src/components/learning/exercise-owner.ts';
import type { Queued } from '../src/components/vocab-round-owner.ts';
import type { SpokenTake } from '../src/components/learning/spoken-task-owner.ts';
import type { SpokenTaskView } from '../src/components/learning/spoken-focused-task.ts';
import type { VocabCard } from '../src/lib/vocab-review.ts';

const { currentOwner, onOwnerChange, ownerNamespace, userOwner, authSessionKeyFor, storedSessionAgrees } = storeOwner;
const { EXERCISE_OWNER_CHANGED_NOTE, claimExerciseCheck, exerciseIsCurrent, openExerciseSession } = owned;
/* The spoken task's own calm line (23 September 2026): its hand-over drops a
   recording in progress, so the exercises' "were kept" line was not true there. */
const { SPOKEN_TASK_OWNER_CHANGED_NOTE } = spoken;

/* ------------------------------------------------------------------ */
/* SYNTHETIC students                                                   */
/* ------------------------------------------------------------------ */

const A_ID = 'SYNTHETIC-LAST-SCREENS-STUDENT-A';
const B_ID = 'SYNTHETIC-LAST-SCREENS-STUDENT-B';
const A = userOwner(A_ID);
const B = userOwner(B_ID);
const NS_A = ownerNamespace(A);
const NS_B = ownerNamespace(B);
const A_SESSION = { token: 'SYNTHETIC-token-A', userId: A_ID };
const B_SESSION = { token: 'SYNTHETIC-token-B', userId: B_ID };
const SESSION_KEY = authSessionKeyFor(ACCOUNT_URL)!;

const now = () => new Date().toISOString();

/** Sign-in, account switch or sign-out as a tab that HEARS it: the account
    client stores the session (storage every tab shares), the shared owner
    moves first, then the learner record. */
function signInAs(owner: CacheOwner, session: { token: string; userId: string }): void {
  storeSession(session);
  storeOwner.setCurrentOwner(owner);
  learner.setLearnerOwner(owner);
}

/** Another tab signs in: only the stored session changes. A tab that
    missed the news still names its previous owner. */
function storeSession(session: { token: string; userId: string } | null): void {
  held = session;
  if (session) local.setItem(SESSION_KEY, JSON.stringify({ access_token: session.token, user: { id: session.userId } }));
  else local.removeItem(SESSION_KEY);
}

/** The owner on the page changes with no notification at all: what a
    screen whose listener missed the change sees at its next press. */
function ownerChangesSilently(session: { token: string; userId: string }): void {
  storeSession(session);
  storeOwner.resetStoreOwnerForTest();
}

function freshBrowser(): void {
  learner.resetLearningStoresForTest();
  local = memoryStorage();
  local.data.set(DEVICE_ID_KEY, 'SYNTHETIC-LAST-SCREENS-DEVICE');
  signInAs(A, A_SESSION);
}

interface StoredEvent {
  activityId: string;
  completion?: string;
  assistance?: string;
  outcome?: { kind: string; words?: { word: string; correct: boolean; direction: string }[] };
  items?: { itemId: string; firstAnswer: string; correct: boolean }[];
}

function eventsOf(owner: CacheOwner): StoredEvent[] {
  const raw = local.data.get(learner.learnerRecordKey(owner));
  if (!raw) return [];
  return (JSON.parse(raw) as { events: StoredEvent[] }).events;
}

function keysHolding(mark: string): string[] {
  return [...local.data.entries()].filter(([, value]) => value.includes(mark)).map(([key]) => key).sort();
}

/* ------------------------------------------------------------------ */
/* 1. The inline lesson quiz: the REAL script, on the scraper's markup  */
/* ------------------------------------------------------------------ */

const LESSON_KEY = 'reading-tfng';
const QUIZ_ACTIVITY = lessonCheck.lessonQuizActivityId(LESSON_KEY);
const QUIZ_RUN_KEY = (ns: string) => lessonCheck.lessonCheckProgressKey(ns, `lesson-quiz:${LESSON_KEY}:c0`);
const QUIZ = [
  { text: 'SYNTHETIC statement one about the passage.', answer: 'true' },
  { text: 'SYNTHETIC statement two about the passage.', answer: 'false' },
  { text: 'SYNTHETIC statement three about the passage.', answer: 'not given' },
  { text: 'SYNTHETIC statement four about the passage.', answer: 'true' },
];
/* A's answers to three of four: two right, one wrong ("true" for a
   "not given"). B never answers "not given" to question 2. */
const A_QUIZ = ['true', 'true', 'true', ''];

interface QuizPage {
  root: FakeEl;
  container: FakeEl;
  items: FakeEl[];
  selects: FakeEl[];
  btn: FakeEl;
  score: FakeEl;
}

/** A lesson page carrying one inline quiz, built the way
    build_reading_quiz_html writes it, with the script set up on it as
    LessonLayout does on astro:page-load. */
function openQuizPage(): QuizPage {
  const root = new FakeEl('body');
  root.isRoot = true;
  const body = new FakeEl('div', 'lesson-body');
  const container = new FakeEl('div', 'exercise-box');
  container.setAttribute('data-quiz', 'reading');
  const title = new FakeEl('p', 'quiz-h3');
  title.textContent = 'SYNTHETIC Reading Quiz';
  container.append(title);
  const items: FakeEl[] = [];
  const selects: FakeEl[] = [];
  QUIZ.forEach((question, index) => {
    const item = new FakeEl('div', 'quiz-item');
    item.setAttribute('data-answer', question.answer);
    const num = new FakeEl('span', 'quiz-num');
    num.textContent = `${index + 1}.`;
    const asked = new FakeEl('span', 'quiz-q');
    asked.textContent = question.text;
    const select = new FakeEl('select', 'quiz-select');
    select.options = [{ value: '' }, { value: 'true' }, { value: 'false' }, { value: 'not given' }];
    item.append(num, asked, select);
    container.append(item);
    items.push(item);
    selects.push(select);
  });
  const btn = new FakeEl('button', 'quiz-check-btn');
  btn.textContent = 'Check Answers';
  const score = new FakeEl('p', 'quiz-score');
  score.hidden = true;
  const source = new FakeEl('p', 'material-source');
  source.textContent = 'Source: SYNTHETIC';
  container.append(btn, score, source);
  body.append(container);
  root.append(body);
  pageRoot = root;
  quiz.initReadingQuiz({ lessonKey: LESSON_KEY });
  return { root, container, items, selects, btn, score };
}

/** The page is left: the quiz's markup is off the document, so its
    listener lets go at the next notification. */
function closeQuizPage(page: QuizPage): void {
  page.root.isRoot = false;
}

function answerQuiz(page: QuizPage, answers: readonly string[]): void {
  answers.forEach((value, index) => {
    if (!value) return;
    page.selects[index]!.value = value;
    page.selects[index]!.fire('change');
  });
}

const quizValues = (page: QuizPage) => page.selects.map((select) => select.value);
const quizMarks = (page: QuizPage) =>
  page.items.map((item) =>
    item.classList.contains('quiz-correct') ? 'right' : item.classList.contains('quiz-wrong') ? 'wrong' : '',
  );
const quizNote = (page: QuizPage) => page.container.querySelector('.quiz-owner-note');
const quizEventsOf = (owner: CacheOwner) => eventsOf(owner).filter((event) => event.activityId === QUIZ_ACTIVITY);

function quizRunOf(ns: string) {
  return lessonCheck.readLessonCheckProgress(local, QUIZ_RUN_KEY(ns), [QUIZ.length], now());
}

test('inline quiz, no switch: A answers and checks; the marking, the score, the event under A and the kept run are exactly what the quiz has always produced', { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);
  page.btn.fire('click');

  assert.deepEqual(quizMarks(page), ['right', 'wrong', 'wrong', ''], 'each answered question is marked, an untouched one is not');
  assert.equal(page.items[0]!.classList.contains('pq-pop'), true, 'a right answer pops');
  assert.equal(page.items[1]!.classList.contains('pq-shake'), true, 'a wrong one shakes');
  assert.equal(page.score.textContent, `1 / ${QUIZ.length} correct`, 'the score line, word for word');
  assert.equal(page.score.hidden, false);
  assert.equal(page.score.classList.contains('pq-in'), true);
  assert.equal(quizNote(page), null, 'no notice without an account change');
  assert.equal(page.btn.disabled, false);

  const events = quizEventsOf(A);
  assert.equal(events.length, 1, 'one press, one event, under A');
  assert.deepEqual(
    events[0]!.items!.map((item) => [item.firstAnswer, item.correct]),
    [
      ['true', true],
      ['true', false],
      ['true', false],
    ],
    'only the answered questions, as given',
  );
  assert.equal(events[0]!.completion, 'partial', 'one left blank');
  assert.equal(learner.learnerStoreFor(A), learner.getLearnerStore(), 'the current owner is written through the shared store');
  const run = quizRunOf(NS_A);
  assert.deepEqual(run?.units[0]?.drafts, A_QUIZ, 'the run is kept under A, as it always was');
  assert.equal(run?.units[0]?.checked, true);
  assert.deepEqual(quizEventsOf(B), []);

  /* A second press with nothing changed records nothing, and a second
     set-up on the same markup (the language swap and page-load racing)
     does not add a second listener. */
  quiz.initReadingQuiz({ lessonKey: LESSON_KEY });
  page.btn.fire('click');
  assert.equal(quizEventsOf(A).length, 1, 'still one event');

  /* Coming back to the lesson puts A's answers back. */
  closeQuizPage(page);
  const again = openQuizPage();
  assert.deepEqual(quizValues(again), A_QUIZ, 'A finds the answers on coming back');
  assert.deepEqual(quizMarks(again), ['', '', '', ''], 'unmarked until checked again');
  closeQuizPage(again);
});

test("inline quiz: B signs in in another tab; A's answers and marking leave the screen with the calm line, are kept in A's own run, and nothing of A's reaches B", { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);

  signInAs(B, B_SESSION);
  assert.deepEqual(quizValues(page), ['', '', '', ''], 'none of A’s answers on screen');
  assert.deepEqual(quizMarks(page), ['', '', '', '']);
  assert.equal(page.score.hidden, true);
  const note = quizNote(page);
  assert.ok(note, 'one calm line');
  assert.equal(note!.textContent, EXERCISE_OWNER_CHANGED_NOTE);
  assert.equal(note!.hidden, false);
  assert.equal(note!.getAttribute('role'), 'status');
  assert.equal(note!.dataset.i18nEn, EXERCISE_OWNER_CHANGED_NOTE, 'marked for the page translator with its English original');
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts, A_QUIZ, 'A’s answers are kept in A’s own run');
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, false, 'kept as unchecked');
  assert.equal(quizRunOf(NS_B), null, 'nothing under B');

  /* B answers and checks: recorded under B only, from B's own answers. */
  answerQuiz(page, ['false', 'false', '', '']);
  assert.equal(note!.hidden, true, 'the calm line goes once B carries on');
  page.btn.fire('click');
  assert.equal(quizEventsOf(B).length, 1);
  assert.deepEqual(quizEventsOf(B)[0]!.items!.map((item) => item.firstAnswer), ['false', 'false']);
  assert.deepEqual(quizEventsOf(A), [], 'nothing was recorded for A');
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts, A_QUIZ, 'A’s run untouched by B');

  /* A signs back in: A's own answers come back, unmarked. */
  signInAs(A, A_SESSION);
  assert.deepEqual(quizValues(page), A_QUIZ, 'A finds their answers where they were kept');
  assert.deepEqual(quizMarks(page), ['', '', '', '']);
  assert.deepEqual(quizEventsOf(A), [], 'still nothing recorded for A');
  closeQuizPage(page);
});

test('inline quiz: a check pressed after the switch, on a quiz whose listener missed it, is refused and records nothing for anybody', { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);

  ownerChangesSilently(B_SESSION);
  assert.equal(ownerNamespace(currentOwner()), NS_B, 'the page is B’s now');
  assert.deepEqual(quizValues(page), A_QUIZ, 'and this quiz was never told');

  page.btn.fire('click');
  assert.deepEqual(eventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(eventsOf(B), [], 'nothing recorded under B');
  assert.deepEqual(quizMarks(page), ['', '', '', ''], 'nothing marked');
  assert.equal(page.score.hidden, true, 'no score');
  assert.deepEqual(quizValues(page), ['', '', '', ''], 'the refusal handed the quiz over');
  assert.equal(quizNote(page)?.hidden, false);
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts, A_QUIZ, 'A’s answers are kept for A');
  assert.equal(quizRunOf(NS_B), null);
  closeQuizPage(page);
});

test("inline quiz: a tab that missed the switch (still naming A, while this device's session is B's) refuses the check, records nothing, and takes A's answers off the screen until it hears", { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);

  storeSession(B_SESSION);
  assert.equal(ownerNamespace(currentOwner()), NS_A, 'this tab still names A');
  assert.equal(storedSessionAgrees(A), false, 'but this device’s own session is B’s');

  page.btn.fire('click');
  assert.deepEqual(eventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(eventsOf(B), [], 'nothing recorded under B');
  assert.deepEqual(quizValues(page), ['', '', '', ''], 'A’s answers left the screen');
  assert.deepEqual(quizMarks(page), ['', '', '', '']);
  assert.equal(page.btn.disabled, true, 'nothing more can be checked here');
  assert.ok(page.selects.every((select) => select.disabled), 'nor answered');
  assert.equal(quizNote(page)?.textContent, EXERCISE_OWNER_CHANGED_NOTE);
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts, A_QUIZ, 'kept for A, in A’s own run');
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, false);
  assert.equal(quizRunOf(NS_B), null);

  /* The tab hears at last: it hands over to B, controls back. */
  storeOwner.setCurrentOwner(B);
  learner.setLearnerOwner(B);
  assert.equal(page.btn.disabled, false);
  assert.ok(page.selects.every((select) => !select.disabled));
  assert.deepEqual(quizValues(page), ['', '', '', ''], 'B has no run of their own');
  assert.deepEqual(quizRunOf(NS_A)?.units[0]?.drafts, A_QUIZ, 'the empty screen was not written over A’s run');
  closeQuizPage(page);
});

test("inline quiz: a check pressed before the switch is recorded under A only; after it A's marking and score are on nobody's screen", { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);
  page.btn.fire('click');
  assert.equal(quizEventsOf(A).length, 1);

  signInAs(B, B_SESSION);
  assert.deepEqual(quizMarks(page), ['', '', '', ''], 'A’s marking left the screen');
  assert.equal(page.score.hidden, true);
  assert.equal(page.score.textContent, '');
  assert.deepEqual(quizValues(page), ['', '', '', '']);
  assert.equal(quizEventsOf(A).length, 1, 'still once, under A');
  assert.deepEqual(quizEventsOf(B), [], 'nothing under B');
  assert.equal(quizRunOf(NS_A)?.units[0]?.checked, true, 'A’s checked run is left as it was');
  assert.deepEqual(keysHolding(`"${QUIZ_ACTIVITY}"`).filter((key) => key.includes(NS_B)), []);
  closeQuizPage(page);
});

test('inline quiz: a quiz whose page has gone stops listening, and changes nothing on a later switch', { timeout: 10_000 }, () => {
  freshBrowser();
  const page = openQuizPage();
  answerQuiz(page, A_QUIZ);
  closeQuizPage(page);
  const before = [...local.data.keys()].sort();
  signInAs(B, B_SESSION);
  signInAs(A, A_SESSION);
  assert.equal(quizNote(page), null, 'no hand-over on a page that has gone');
  assert.deepEqual(quizValues(page), A_QUIZ);
  assert.deepEqual(
    [...local.data.keys()].filter((key) => key.includes('ielts.learning.check')).sort(),
    before.filter((key) => key.includes('ielts.learning.check')),
    'no run written',
  );
});

/* ------------------------------------------------------------------ */
/* 2. The vocabulary practice round (VocabReview.tsx), mirrored          */
/* ------------------------------------------------------------------ */

const TOPIC = VOCABULARY_PARTS.find((part) => part.slug === 'environment')!.title;
const VOCAB_ACTIVITY = round.vocabActivityId(TOPIC);
assert.equal(VOCAB_ACTIVITY, 'review:vocabulary:environment');

interface VocabScreen {
  session: ExerciseSession | null;
  questions: Queued[];
  index: number;
  chosen: string | null;
  rightFirstTime: number;
  missed: VocabCard[];
  phase: 'active' | 'finished';
  note: string | null;
  withheld: boolean;
  stop(): void;
}

/** begin() */
function beginVocab(screen: VocabScreen): void {
  const opened = round.openVocabRound(TOPIC);
  screen.session = opened.session;
  screen.withheld = false;
  screen.questions = opened.questions;
  screen.index = 0;
  screen.chosen = null;
  screen.rightFirstTime = 0;
  screen.missed = [];
  screen.phase = opened.questions.length ? 'active' : 'finished';
}

/** The mount effect (start()) and the owner-change listener. */
function openVocab(listen = true): VocabScreen {
  const screen: VocabScreen = {
    session: null,
    questions: [],
    index: 0,
    chosen: null,
    rightFirstTime: 0,
    missed: [],
    phase: 'active',
    note: null,
    withheld: false,
    stop: () => {},
  };
  beginVocab(screen);
  if (listen) {
    screen.stop = onOwnerChange(() => {
      if (screen.session === null || exerciseIsCurrent(screen.session)) return;
      handOverVocab(screen);
    });
  }
  return screen;
}

/** handOver() */
function handOverVocab(screen: VocabScreen): void {
  beginVocab(screen);
  screen.note = EXERCISE_OWNER_CHANGED_NOTE;
}

/** choose(), with the claim. */
function chooseVocab(screen: VocabScreen, option: string, deps?: ExerciseClaimDeps): 'recorded' | 'ignored' | ExerciseRefusal {
  const current = screen.questions[screen.index];
  if (!current || screen.chosen !== null || screen.withheld) return 'ignored';
  const claim = claimExerciseCheck(screen.session, deps);
  if ('refused' in claim) {
    if (claim.refused === 'owner-changed') handOverVocab(screen);
    else {
      screen.withheld = true;
      screen.note = EXERCISE_OWNER_CHANGED_NOTE;
    }
    return claim.refused;
  }
  try {
    const correct = option === current.card.word;
    screen.chosen = option;
    screen.note = null;
    round.recordVocabAnswer(claim.binding.owner, current.card, correct, current.retry);
    if (current.retry) return 'recorded';
    if (correct) screen.rightFirstTime += 1;
    else {
      screen.missed = [...screen.missed, current.card];
      const pool = vocab.getTopicCards(TOPIC);
      screen.questions = [...screen.questions, { ...practice.buildQuestion(current.card, pool), retry: true }];
    }
  } finally {
    claim.binding.cancel();
  }
  return 'recorded';
}

/** next() */
function nextVocab(screen: VocabScreen): void {
  if (screen.index + 1 >= screen.questions.length) {
    screen.phase = 'finished';
    return;
  }
  screen.index += 1;
  screen.chosen = null;
}

const rightOf = (screen: VocabScreen) => screen.questions[screen.index]!.card.word;
const wrongOf = (screen: VocabScreen) => screen.questions[screen.index]!.options.find((option) => option !== rightOf(screen))!;

function vocabStateOf(owner: CacheOwner): Record<string, { reps: number; lapses: number; interval: number }> {
  const raw = local.data.get(storeOwner.scopedKeyFor(storeOwner.VOCAB_STORE_KEY, owner));
  return raw ? (JSON.parse(raw) as { cards: Record<string, { reps: number; lapses: number; interval: number }> }).cards : {};
}
const vocabEventsOf = (owner: CacheOwner) => eventsOf(owner).filter((event) => event.activityId === VOCAB_ACTIVITY);

test('vocabulary round, no switch: right first time, a miss, and the miss right on its second go are written under A exactly as before', { timeout: 10_000 }, () => {
  freshBrowser();
  assert.ok(vocab.getTopicCards(TOPIC).length >= 4, 'the topic has words to practise');
  const screen = openVocab();
  assert.equal(screen.session?.namespace, NS_A, 'bound to A when the round started');
  assert.equal(screen.questions.length, Math.min(round.ROUND_SIZE, vocab.getTopicCards(TOPIC).length));

  const first = rightOf(screen);
  assert.equal(chooseVocab(screen, first), 'recorded');
  nextVocab(screen);
  const second = rightOf(screen);
  assert.equal(chooseVocab(screen, wrongOf(screen)), 'recorded');
  assert.equal(screen.questions[screen.questions.length - 1]!.retry, true, 'the miss comes back at the end');

  /* Straight to the retry at the end of the round. */
  screen.index = screen.questions.length - 1;
  screen.chosen = null;
  assert.equal(rightOf(screen), second);
  assert.equal(chooseVocab(screen, second), 'recorded');
  screen.stop();

  const state = vocabStateOf(A);
  assert.equal(state[first]?.reps, 1, 'right first time is "good"');
  assert.equal(state[first]?.interval, 1);
  assert.equal(state[second]?.lapses, 1, 'the miss is "again"');
  assert.equal(state[second]?.reps, 1, 'and right on the second go is "hard"');
  const events = vocabEventsOf(A);
  assert.equal(events.length, 3, 'one event per answer, under A');
  /* Events written in the same millisecond may be held in any order. */
  const sorted = (rows: unknown[][]) => rows.map((row) => JSON.stringify(row)).sort();
  assert.deepEqual(
    sorted(events.map((event) => [event.outcome?.words?.[0]?.word, event.outcome?.words?.[0]?.correct, event.assistance])),
    sorted([
      [first, true, 'none'],
      [second, false, 'none'],
      [second, true, 'answer-shown'],
    ]),
  );
  assert.ok(events.every((event) => event.outcome?.words?.[0]?.direction === 'recognise'), 'recorded as recognition');
  assert.equal(screen.rightFirstTime, 1);
  assert.equal(screen.note, null, 'no notice without an account change');
  assert.deepEqual(vocabStateOf(B), {});
  assert.deepEqual(vocabEventsOf(B), []);
});

test("vocabulary round: the page changes to B mid-round; the screen hands over to B's own fresh round with the calm line, and nothing of A's round is written under B", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openVocab();
  const aWord = rightOf(screen);
  chooseVocab(screen, wrongOf(screen));
  assert.equal(screen.missed.length, 1);

  signInAs(B, B_SESSION);
  assert.equal(screen.session?.namespace, NS_B, 'handed over at once');
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE, 'one calm line');
  assert.equal(screen.index, 0);
  assert.equal(screen.chosen, null, 'A’s answer and its feedback left the screen');
  assert.deepEqual(screen.missed, [], 'and A’s missed words');
  assert.ok(screen.questions.every((question) => !question.retry), 'a fresh round, with no retry of A’s miss');
  assert.equal(vocabStateOf(A)[aWord]?.lapses, 1, 'A’s answer is still A’s');
  assert.deepEqual(vocabStateOf(B), {}, 'nothing of A’s in B’s schedule');
  assert.deepEqual(vocabEventsOf(B), [], 'nor in B’s record');

  /* B answers: under B only, and the calm line goes. */
  const bWord = rightOf(screen);
  assert.equal(chooseVocab(screen, bWord), 'recorded');
  screen.stop();
  assert.equal(screen.note, null);
  assert.equal(vocabStateOf(B)[bWord]?.reps, 1);
  assert.equal(vocabEventsOf(B).length, 1);
  assert.equal(vocabEventsOf(A).length, 1, 'A still has exactly their own one');
});

test('vocabulary round: a click after the switch, on a round whose listener missed it, is refused and writes nothing for anybody', { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openVocab(false);
  ownerChangesSilently(B_SESSION);
  assert.equal(chooseVocab(screen, rightOf(screen)), 'owner-changed', 'refused');
  assert.deepEqual(vocabStateOf(A), {}, 'nothing in A’s schedule');
  assert.deepEqual(vocabStateOf(B), {}, 'nothing in B’s');
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
  assert.equal(screen.session?.namespace, NS_B, 'the refusal handed the round over');
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE);
});

test("vocabulary round: a tab that missed the switch (still naming A, while this device's session is B's) refuses the click, writes nothing, and takes the round off the screen", { timeout: 10_000 }, () => {
  freshBrowser();
  const screen = openVocab();
  storeSession(B_SESSION);
  assert.equal(chooseVocab(screen, rightOf(screen)), 'device-changed');
  assert.equal(screen.withheld, true);
  assert.equal(screen.note, EXERCISE_OWNER_CHANGED_NOTE);
  assert.equal(chooseVocab(screen, rightOf(screen)), 'ignored', 'and nothing more is taken from it');
  screen.stop();
  assert.deepEqual(vocabStateOf(A), {});
  assert.deepEqual(vocabStateOf(B), {});
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
});

test('rateFor and recordVocabularyReviewFor write into the named owner only, and rate() is rateFor for the current owner', { timeout: 10_000 }, () => {
  freshBrowser();
  const [card] = vocab.getTopicCards(TOPIC);
  signInAs(B, B_SESSION);
  round.recordVocabAnswer(A, card!, false, false);
  assert.equal(vocabStateOf(A)[card!.word]?.lapses, 1, 'A’s schedule');
  assert.deepEqual(vocabStateOf(B), {}, 'not B’s, the owner on the page');
  assert.equal(vocabEventsOf(A).length, 1);
  assert.deepEqual(vocabEventsOf(B), []);
  assert.equal(learner.readLearnerRecord().events.length, 0, 'the record on the page, B’s, did not change');

  vocab.rate(card!.word, 'good');
  assert.equal(vocabStateOf(B)[card!.word]?.reps, 1, 'rate() writes the current owner’s copy, as it always has');
  assert.equal(vocabStateOf(A)[card!.word]?.reps, 0, 'and leaves A’s alone');
  assert.equal(vocab.rateFor(A, 'SYNTHETIC-not-a-card', 'good'), undefined, 'a word outside the card set is ignored');
});

/* ------------------------------------------------------------------ */
/* 3. The spoken focused task (SpokenFocusedTask.tsx), mirrored          */
/* ------------------------------------------------------------------ */

const SPOKEN_VIEW = {
  exerciseId: 'speaking-part1-extend-an-answer',
  activityId: 'focus:speaking-part1-extend-an-answer',
  contentVersion: 1,
  subskill: 'part1-extend-an-answer',
  part: 1,
  title: 'SYNTHETIC title',
  objective: 'SYNTHETIC objective',
  instruction: 'SYNTHETIC instruction',
  expectedMinutes: 5,
  promptId: 'p1-work',
  questionText: 'SYNTHETIC question',
  checklist: ['SYNTHETIC check'],
} as unknown as SpokenTaskView;
const spokenEventsOf = (owner: CacheOwner) => eventsOf(owner).filter((event) => event.activityId === SPOKEN_VIEW.activityId);

/* A microphone and a recorder that do exactly what the test says, when it
   says. Nothing is recorded from any real device. */
interface FakeStream {
  id: string;
  released: number;
}
interface FakeRecording {
  stopCalls: number;
  stop(): Promise<{ blob: string }>;
  finish(): void;
}
function fakeRecording(): FakeRecording {
  let resolve!: (segment: { blob: string }) => void;
  const done = new Promise<{ blob: string }>((r) => {
    resolve = r;
  });
  const recording: FakeRecording = {
    stopCalls: 0,
    stop: () => {
      recording.stopCalls += 1;
      return done;
    },
    finish: () => resolve({ blob: 'SYNTHETIC-recording-of-A' }),
  };
  return recording;
}
const mic = {
  gate: null as null | { promise: Promise<FakeStream>; release: (stream: FakeStream) => void },
  streams: [] as FakeStream[],
  recordings: [] as FakeRecording[],
};
function resetMic(): void {
  mic.gate = null;
  mic.streams = [];
  mic.recordings = [];
}
function requestMicFake(): Promise<FakeStream> {
  if (mic.gate) return mic.gate.promise;
  const stream = { id: `SYNTHETIC-mic-${mic.streams.length}`, released: 0 };
  mic.streams.push(stream);
  return Promise.resolve(stream);
}
function holdMic(): void {
  let release!: (stream: FakeStream) => void;
  const promise = new Promise<FakeStream>((r) => {
    release = r;
  });
  mic.gate = {
    promise,
    release: (stream) => {
      mic.streams.push(stream);
      release(stream);
    },
  };
}
const releaseFake = (stream: FakeStream) => {
  stream.released += 1;
};
function recordSegmentFake(): FakeRecording {
  const recording = fakeRecording();
  mic.recordings.push(recording);
  return recording;
}

interface SpokenScreen {
  exercise: ExerciseSession | null;
  take: SpokenTake<FakeStream, FakeRecording> | null;
  phase: 'ready' | 'recording' | 'reviewing';
  audio: string | null;
  recorded: boolean;
  saved: boolean;
  note: string | null;
  withheld: boolean;
  mounted: boolean;
  stop(): void;
}

/** The mount effect and the owner-change listener. */
function openSpoken(listen = true): SpokenScreen {
  const screen: SpokenScreen = {
    exercise: openExerciseSession(),
    take: null,
    phase: 'ready',
    audio: null,
    recorded: false,
    saved: false,
    note: null,
    withheld: false,
    mounted: true,
    stop: () => {},
  };
  if (listen) {
    screen.stop = onOwnerChange(() => {
      if (screen.exercise === null || exerciseIsCurrent(screen.exercise)) return;
      handOverSpoken(screen);
    });
  }
  return screen;
}

/** dropCurrentTake() */
function dropScreenTake(screen: SpokenScreen): void {
  const take = screen.take;
  screen.take = null;
  if (take) spoken.dropTake(take, releaseFake);
}

/** handOver() */
function handOverSpoken(screen: SpokenScreen): void {
  dropScreenTake(screen);
  screen.exercise = openExerciseSession();
  screen.audio = null;
  screen.recorded = false;
  screen.saved = false;
  screen.phase = 'ready';
  screen.withheld = false;
  screen.note = SPOKEN_TASK_OWNER_CHANGED_NOTE;
}

/** claimPress(), with withhold() folded in. */
function claimSpoken(screen: SpokenScreen, deps?: ExerciseClaimDeps) {
  if (screen.withheld) return null;
  const claim = claimExerciseCheck(screen.exercise, deps);
  if ('binding' in claim) return claim.binding;
  if (claim.refused === 'owner-changed') handOverSpoken(screen);
  else {
    dropScreenTake(screen);
    screen.withheld = true;
    screen.note = SPOKEN_TASK_OWNER_CHANGED_NOTE;
  }
  return null;
}

/** startRecording() */
async function startSpoken(screen: SpokenScreen): Promise<'refused' | 'dropped' | 'recording'> {
  const binding = claimSpoken(screen);
  if (!binding) return 'refused';
  binding.cancel();
  const take = spoken.openTake<FakeStream, FakeRecording>(screen.exercise!);
  screen.take = take;
  const stream = await requestMicFake();
  if (!screen.mounted || !spoken.takeIsLive(take, screen.exercise)) {
    releaseFake(stream);
    return 'dropped';
  }
  take.stream = stream;
  screen.phase = 'recording';
  take.recording = recordSegmentFake();
  return 'recording';
}

/** stopRecording() */
async function stopSpoken(screen: SpokenScreen): Promise<'nothing' | 'refused' | 'dropped' | 'shown'> {
  const take = screen.take;
  const handle = take?.recording;
  if (!take || !handle) return 'nothing';
  const binding = claimSpoken(screen);
  if (!binding) return 'refused';
  binding.cancel();
  take.recording = null;
  const segment = await handle.stop();
  if (!screen.mounted || !spoken.takeIsLive(take, screen.exercise)) return 'dropped';
  if (take.stream) {
    releaseFake(take.stream);
    take.stream = null;
  }
  screen.audio = segment.blob;
  screen.recorded = true;
  screen.phase = 'reviewing';
  return 'shown';
}

/** save() */
function saveSpoken(screen: SpokenScreen, deps?: ExerciseClaimDeps): 'refused' | 'recorded' {
  const binding = claimSpoken(screen, deps);
  if (!binding) return 'refused';
  try {
    spoken.recordSpokenPracticeFor(binding.owner, { view: SPOKEN_VIEW, hasRecording: screen.recorded, at: now() });
  } finally {
    binding.cancel();
  }
  screen.saved = true;
  return 'recorded';
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('spoken task, no switch: A records, listens back and presses "Done for now"; one practice event under A, the same draft as before, and the microphone let go', { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken();
  assert.equal(await startSpoken(screen), 'recording');
  assert.equal(screen.phase, 'recording');
  const stopping = stopSpoken(screen);
  mic.recordings[0]!.finish();
  assert.equal(await stopping, 'shown');
  assert.equal(screen.audio, 'SYNTHETIC-recording-of-A');
  assert.equal(mic.streams[0]!.released, 1, 'the microphone is released once the take is in');
  assert.equal(saveSpoken(screen), 'recorded');
  screen.stop();

  const events = spokenEventsOf(A);
  assert.equal(events.length, 1, 'one event, under A');
  const expected = spokenTask.spokenEvidenceDraft({ view: SPOKEN_VIEW, hasRecording: true, at: now() });
  assert.equal(events[0]!.completion, expected.completion);
  assert.equal(events[0]!.outcome?.kind, 'studied', 'practice done, never a grade');
  assert.equal(learner.learnerStoreFor(A), learner.getLearnerStore(), 'the current owner is written through the shared store');
  assert.deepEqual(spokenEventsOf(B), []);
  assert.equal(screen.note, null);
});

test('spoken task: the page changes hands during a recording; it is stopped and dropped, the microphone released, nothing is played back or recorded, and B sees an empty task', { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken();
  await startSpoken(screen);
  const recording = mic.recordings[0]!;

  signInAs(B, B_SESSION);
  assert.equal(recording.stopCalls, 1, 'the recorder was stopped at once');
  assert.equal(mic.streams[0]!.released, 1, 'and the microphone released');
  assert.equal(screen.take, null);
  assert.equal(screen.phase, 'ready', 'B sees an empty task');
  assert.equal(screen.audio, null);
  assert.equal(screen.note, SPOKEN_TASK_OWNER_CHANGED_NOTE, 'with the spoken task’s own calm line, which says the recording was not kept');
  assert.equal(screen.exercise?.namespace, NS_B);

  recording.finish();
  await tick();
  assert.equal(screen.audio, null, 'what the recorder handed back is thrown away');
  assert.equal(await stopSpoken(screen), 'nothing', 'nothing left to stop');
  screen.stop();
  assert.deepEqual(eventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(eventsOf(B), [], 'nothing recorded under B');
  assert.deepEqual(keysHolding('SYNTHETIC-recording-of-A'), [], 'the recording was kept nowhere');
});

test('spoken task: a stop pressed before the switch whose recording arrives after it is dropped, never shown to B', { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken();
  await startSpoken(screen);
  const stopping = stopSpoken(screen);
  signInAs(B, B_SESSION);
  mic.recordings[0]!.finish();
  assert.equal(await stopping, 'dropped');
  screen.stop();
  assert.equal(screen.audio, null);
  assert.equal(screen.recorded, false);
  assert.equal(mic.streams[0]!.released, 1, 'the hand-over released the microphone, once');
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
});

test('spoken task: a microphone given after the switch (the permission prompt was still open) is released at once and nothing is recorded', { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  holdMic();
  const screen = openSpoken();
  const starting = startSpoken(screen);
  signInAs(B, B_SESSION);
  const late = { id: 'SYNTHETIC-late-mic', released: 0 };
  mic.gate!.release(late);
  assert.equal(await starting, 'dropped');
  screen.stop();
  assert.equal(late.released, 1, 'released at once');
  assert.equal(mic.recordings.length, 0, 'no recorder was ever started');
  assert.equal(screen.phase, 'ready');
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
});

test('spoken task: "Done for now" pressed after the switch, on a screen whose listener missed it, is refused and records nothing for anybody', { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken(false);
  await startSpoken(screen);
  const stopping = stopSpoken(screen);
  mic.recordings[0]!.finish();
  await stopping;
  ownerChangesSilently(B_SESSION);

  assert.equal(saveSpoken(screen), 'refused');
  assert.deepEqual(eventsOf(A), [], 'nothing recorded under A');
  assert.deepEqual(eventsOf(B), [], 'nothing recorded under B');
  assert.equal(screen.exercise?.namespace, NS_B, 'the refusal handed the task over');
  assert.equal(screen.audio, null, 'A’s recording left the screen');
  assert.equal(await startSpoken(screen), 'recording', 'B can record for themselves');
});

test("spoken task: a tab that missed the switch (still naming A, while this device's session is B's) refuses a press, drops the recording under way, and records nothing", { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken();
  await startSpoken(screen);
  storeSession(B_SESSION);

  assert.equal(await stopSpoken(screen), 'refused', 'even a stop is refused');
  assert.equal(mic.recordings[0]!.stopCalls, 1, 'the recording is stopped');
  assert.equal(mic.streams[0]!.released, 1, 'and the microphone released');
  assert.equal(screen.withheld, true, 'the task leaves the screen');
  assert.equal(screen.note, SPOKEN_TASK_OWNER_CHANGED_NOTE);
  assert.equal(saveSpoken(screen), 'refused');
  mic.recordings[0]!.finish();
  await tick();
  screen.stop();
  assert.equal(screen.audio, null);
  assert.deepEqual(eventsOf(A), []);
  assert.deepEqual(eventsOf(B), []);
});

test("spoken task: \"Done for now\" pressed before the switch is kept under A only, and after it A's confirmation and recording are on nobody's screen", { timeout: 10_000 }, async () => {
  freshBrowser();
  resetMic();
  const screen = openSpoken();
  await startSpoken(screen);
  const stopping = stopSpoken(screen);
  mic.recordings[0]!.finish();
  await stopping;
  assert.equal(saveSpoken(screen), 'recorded');
  assert.equal(spokenEventsOf(A).length, 1);

  signInAs(B, B_SESSION);
  screen.stop();
  assert.equal(screen.saved, false, 'A’s confirmation left the screen');
  assert.equal(screen.audio, null);
  assert.equal(screen.recorded, false);
  assert.equal(spokenEventsOf(A).length, 1, 'still once, under A');
  assert.deepEqual(spokenEventsOf(B), [], 'nothing under B');
});

test('dropTake is safe to repeat, and a take that finished on its own releases nothing twice', { timeout: 10_000 }, () => {
  freshBrowser();
  const take = spoken.openTake<FakeStream, FakeRecording>(openExerciseSession());
  const stream = { id: 'SYNTHETIC-mic', released: 0 };
  const recording = fakeRecording();
  take.stream = stream;
  take.recording = recording;
  assert.equal(spoken.takeIsLive(take, take.session), true);
  spoken.dropTake(take, releaseFake);
  spoken.dropTake(take, releaseFake);
  assert.equal(recording.stopCalls, 1);
  assert.equal(stream.released, 1);
  assert.equal(spoken.takeIsLive(take, take.session), false, 'a dropped take never comes back');
});

test("spoken task: its calm line is its own and true (a recording on screen was not kept), never the exercises' \"were kept\" line, and it has Russian", { timeout: 10_000 }, async () => {
  /* The builder of the hand-over reported the borrowed line as untrue here:
     it says answers in progress "were kept", while this screen drops a
     recording in progress for everybody. */
  assert.notEqual(SPOKEN_TASK_OWNER_CHANGED_NOTE, EXERCISE_OWNER_CHANGED_NOTE);
  assert.match(SPOKEN_TASK_OWNER_CHANGED_NOTE, /^The account on this page changed\./, 'worded like the other screens');
  assert.match(SPOKEN_TASK_OWNER_CHANGED_NOTE, /recording/, 'it says what happened to the recording');
  assert.match(SPOKEN_TASK_OWNER_CHANGED_NOTE, /not kept/);
  assert.doesNotMatch(SPOKEN_TASK_OWNER_CHANGED_NOTE, /were kept|was kept for/, 'it claims a recording was kept');

  const { strings } = await import('../src/lib/i18n/dict/ru/learning-objectives.ts');
  const russian = strings[SPOKEN_TASK_OWNER_CHANGED_NOTE];
  assert.ok(russian, 'the spoken task’s calm line has no Russian beside the spoken task’s other strings');
  assert.match(russian, /[А-Яа-яЁё]/);
  assert.doesNotMatch(russian, /[\u2013\u2014]/, 'no dashes');

  /* And it is the one the screen shows, at both a hand-over and a refusal
     from a tab that missed the change. */
  const code = source('components/learning/SpokenFocusedTask.tsx');
  assert.doesNotMatch(code, /EXERCISE_OWNER_CHANGED_NOTE/, 'the spoken task borrows the exercises’ line again');
  assert.equal(code.split('setOwnerNote(SPOKEN_TASK_OWNER_CHANGED_NOTE);').length, 3, 'handOver() and withhold() both show it');
  assert.match(body(code, '  function withhold() {', /\n  \/\*\* The binding/), /setOwnerNote\(SPOKEN_TASK_OWNER_CHANGED_NOTE\);/);
});

/* ------------------------------------------------------------------ */
/* 4. The written task's keystroke race (WritingFocusedTask.tsx)         */
/* ------------------------------------------------------------------ */

const WRITTEN_ID = 'writing-task1-overview-guided';

interface WritingScreen {
  /** owner.current */
  owner: string;
  /** handOverNow.current */
  handOverNow: number;
  stop(): void;
}
/** One render: what it shows, and the hand-over it was made for. */
interface WritingRender {
  shownHandOver: number;
  text: string;
}

function openWriting(): { screen: WritingScreen; render: WritingRender } {
  const screen: WritingScreen = { owner: ownerNamespace(currentOwner()), handOverNow: 0, stop: () => {} };
  const render: WritingRender = { shownHandOver: 0, text: written.readWrittenDraft(local, screen.owner, WRITTEN_ID).draft };
  return { screen, render };
}

/** onType(), from a given render, with the autosave run at once. */
function typeFrom(screen: WritingScreen, render: WritingRender, value: string): 'saved' | 'ignored' {
  if (render.shownHandOver !== screen.handOverNow) return 'ignored';
  const whose = screen.owner;
  const kept = written.readWrittenDraft(local, whose, WRITTEN_ID);
  written.writeWrittenDraft(local, whose, WRITTEN_ID, { ...kept, draft: value });
  return 'saved';
}

/** The press of Check, from a given render: only its guard. */
function evaluateFrom(screen: WritingScreen, render: WritingRender): 'sent' | 'ignored' {
  return render.shownHandOver === screen.handOverNow ? 'sent' : 'ignored';
}

/** handOver(), and the render that follows it. */
function handOverWriting(screen: WritingScreen): WritingRender {
  screen.owner = ownerNamespace(currentOwner());
  screen.handOverNow += 1;
  return { shownHandOver: screen.handOverNow, text: written.readWrittenDraft(local, screen.owner, WRITTEN_ID).draft };
}

test("written task: a keystroke from the render made just before a hand-over is ignored, never saved under the incoming student, and the next render's keystrokes are theirs", { timeout: 10_000 }, () => {
  freshBrowser();
  const { screen, render } = openWriting();
  assert.equal(typeFrom(screen, render, 'SYNTHETIC overview by A'), 'saved', 'no switch: typing saves, as before');

  signInAs(B, B_SESSION);
  const bRender = handOverWriting(screen);
  assert.equal(bRender.text, '', 'B sees an empty task');

  /* The render still on screen shows A's text; a keystroke lands on it. */
  assert.equal(typeFrom(screen, render, 'SYNTHETIC overview by A, one more word'), 'ignored');
  assert.equal(evaluateFrom(screen, render), 'ignored', 'and a press of Check from it sends nothing');
  assert.equal(written.readWrittenDraft(local, NS_B, WRITTEN_ID).draft, '', 'nothing of A’s under B');
  assert.equal(written.readWrittenDraft(local, NS_A, WRITTEN_ID).draft, 'SYNTHETIC overview by A', 'A’s words are A’s');

  assert.equal(typeFrom(screen, bRender, 'SYNTHETIC overview by B'), 'saved');
  assert.equal(evaluateFrom(screen, bRender), 'sent');
  assert.equal(written.readWrittenDraft(local, NS_B, WRITTEN_ID).draft, 'SYNTHETIC overview by B');
  assert.equal(written.readWrittenDraft(local, NS_A, WRITTEN_ID).draft, 'SYNTHETIC overview by A');
});

/* ------------------------------------------------------------------ */
/* 5. The screens still have that shape                                 */
/* ------------------------------------------------------------------ */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function source(relative: string): string {
  return strip(fs.readFileSync(path.join(HERE, '..', 'src', relative), 'utf8')).replace(/\r\n/g, '\n');
}

function body(code: string, start: string, end: RegExp): string {
  const at = code.indexOf(start);
  assert.ok(at >= 0, `${start} is gone`);
  const rest = code.slice(at + start.length);
  const stop = rest.search(end);
  return start + (stop < 0 ? rest : rest.slice(0, stop));
}

/** In `fn`, the claim comes before `writer`, a refusal returns, the writer
    is given the owner the press was bound to, and the binding is let go. */
function assertClaimedBefore(fn: string, claim: RegExp, writer: RegExp, name: string): void {
  const claimAt = fn.search(claim);
  assert.ok(claimAt >= 0, `${name} no longer claims the press`);
  const writes = [...fn.matchAll(new RegExp(writer.source, 'g'))];
  assert.ok(writes.length > 0, `${name} no longer writes`);
  for (const write of writes) assert.ok(write.index! > claimAt, `${name} writes before it claims the press`);
  assert.match(fn, /binding\.owner/, `${name} writes without the owner it was bound to`);
  assert.match(fn, /binding\.cancel\(\);/, `${name} never lets go of its binding`);
}

test('source scan: the inline lesson quiz binds at set-up, hands over on an owner change, claims every check, and records through the explicit-owner writer', { timeout: 10_000 }, () => {
  const code = source('scripts/lesson-quiz.ts');
  assert.doesNotMatch(code, /getLearnerStore\(/, 'the shared store is back in the inline quiz');
  assert.doesNotMatch(code, /\.recordEvents\(/, 'events are written without naming their owner');
  assert.match(code, /recordEventsFor\(whose, write\.drafts\);/);
  assert.match(code, /function record\(whose: CacheOwner\): void \{/);

  /* Bound at set-up, and again at a hand-over, from the one helper. */
  assert.match(code, /const opened = openLessonCheck\(storage, runId, \[items\.length\], new Date\(\)\.toISOString\(\)\);\s*session = opened\.session;/);
  assert.match(code, /restore\(bind\(\)\);\s*\n\s*function save\(\)/, 'bound when the quiz is set up');

  /* The page changing hands hands the quiz over; a page that has gone lets go. */
  assert.match(
    code,
    /const stopListening = onOwnerChange\(\(\) => \{\s*if \(!container\.isConnected\) \{\s*stopListening\(\);\s*return;\s*\}\s*if \(exerciseIsCurrent\(session\)\) return;\s*handOver\(\);/,
  );
  const handOver = body(code, '    function handOver(): void {', /\n    \}\n/);
  for (const step of ['if (!withheld) keepForTheirStudent();', 'clearScreen();', 'setEnabled(true);', 'restore(bind());', 'showNote();']) {
    assert.ok(handOver.includes(step), `handOver() no longer does ${step}`);
  }
  const withhold = body(code, '    function withhold(): void {', /\n    \}\n/);
  for (const step of ['keepForTheirStudent();', 'clearScreen();', 'setEnabled(false);', 'withheld = true;', 'showNote();']) {
    assert.ok(withhold.includes(step), `withhold() no longer does ${step}`);
  }
  assert.match(code, /note\.textContent = t\(EXERCISE_OWNER_CHANGED_NOTE\);/, 'the calm line is the exercises’ own');

  /* A check is claimed before anything is recorded or marked. */
  const click = body(code, "    btn.addEventListener('click', () => {", /\n    \}\);\n/);
  assert.match(click, /const claim = claimExerciseCheck\(session\);\s*if \('refused' in claim\) \{\s*if \(claim\.refused === 'owner-changed'\) handOver\(\);\s*else withhold\(\);\s*return;\s*\}/);
  assertClaimedBefore(click, /const claim = claimExerciseCheck\(session\);/, /\brecord\(/, 'the check');
  assert.match(click, /record\(claim\.binding\.owner\);/);
  assert.ok(click.indexOf('record(claim.binding.owner);') < click.indexOf("classList.toggle('quiz-correct'"), 'recorded before a single mark appears, as before');
});

test('source scan: the vocabulary practice round binds at its start, hands over on an owner change, claims every answer, and writes through owner-named writers', { timeout: 10_000 }, () => {
  const code = source('components/VocabReview.tsx');
  assert.doesNotMatch(code, /getLearnerStore\(|recordVocabularyReview\(/, 'an answer is written through the shared store');
  assert.doesNotMatch(code, /\brate\(/, 'an answer moves the schedule of whoever is on the page');
  assert.match(code, /const opened = openVocabRound\(topic\);\s*const round = opened\.questions;\s*sessionRef\.current = opened\.session;\s*setSession\(opened\.session\);/);
  assert.match(
    code,
    /onOwnerChange\(\(\) => \{\s*if \(sessionRef\.current === null \|\| exerciseIsCurrent\(sessionRef\.current\)\) return;\s*handOver\(\);/,
  );
  assert.match(code, /const handOver = useCallback\(\(\) => \{\s*begin\(\);\s*setOwnerNote\(EXERCISE_OWNER_CHANGED_NOTE\);/);
  assert.match(code, /const live = session !== null && session === sessionRef\.current && !withheld;/);
  const choose = body(code, '  const choose = useCallback(', /\n  const next = useCallback/);
  assert.match(choose, /if \(!current \|\| chosen !== null \|\| !live\) return;/);
  assert.match(choose, /if \(claim\.refused === 'owner-changed'\) handOver\(\);\s*else withhold\(\);/);
  assertClaimedBefore(choose, /const claim = claimExerciseCheck\(session\);/, /recordVocabAnswer\(/, 'choose()');
  assert.match(choose, /recordVocabAnswer\(claim\.binding\.owner, current\.card, correct, isRetry\);/);
  assert.match(code, /\{!withheld && phase === 'active' && current && \(/, 'a withheld round is off the screen');

  const helper = source('components/vocab-round-owner.ts');
  assert.doesNotMatch(helper, /getLearnerStore\(|\brate\(/, 'the helper writes for whoever is on the page');
  assert.match(helper, /rateFor\(owner, card\.word, 'hard'\)/);
  assert.match(helper, /rateFor\(owner, card\.word, correct \? 'good' : 'again'\)/);
  assert.match(helper, /recordVocabularyReviewFor\(owner, \{/);
  assert.match(helper, /const session = openExerciseSession\(\);/);
});

test('source scan: the spoken task binds at open, hands over on an owner change, drops a take after every await, claims every press, and records through the explicit-owner writer', { timeout: 10_000 }, () => {
  const code = source('components/learning/SpokenFocusedTask.tsx');
  assert.doesNotMatch(code, /getLearnerStore\(|\.recordEvent\(/, 'the shared store is back in the spoken task');
  assert.equal(code.split('openExerciseSession()').length, 3, 'opened on mount and at a hand-over');
  assert.match(
    code,
    /onOwnerChange\(\(\) => \{\s*if \(exerciseRef\.current === null \|\| exerciseIsCurrent\(exerciseRef\.current\)\) return;\s*handOver\(\);/,
  );
  const handOver = body(code, '  function handOver() {', /\n  function withhold\(\)/);
  for (const step of [
    'dropCurrentTake();',
    'exerciseRef.current = opened;',
    'setExercise(opened);',
    'setAudioUrl(null);',
    'setSaved(false);',
    "setPhase('ready');",
    'setOwnerNote(SPOKEN_TASK_OWNER_CHANGED_NOTE);',
  ]) {
    assert.ok(handOver.includes(step), `handOver() no longer does ${step}`);
  }
  assert.match(body(code, '  function withhold() {', /\n  \/\*\* The binding/), /dropCurrentTake\(\);/);
  const claim = body(code, '  function claimPress()', /\n  async function startRecording/);
  assert.match(claim, /const claim = claimExerciseCheck\(exercise\);/);
  assert.match(claim, /if \(claim\.refused === 'owner-changed'\) handOver\(\);\s*else withhold\(\);/);

  const start = body(code, '  async function startRecording() {', /\n  async function stopRecording/);
  assert.ok(start.indexOf('const binding = claimPress();') < start.indexOf('requestMic()'), 'the microphone is asked for before the press is claimed');
  assert.match(start, /if \(!mounted\.current \|\| !takeIsLive\(take, exerciseRef\.current\)\) \{\s*releaseMic\(stream\);\s*return;\s*\}/);
  const stop = body(code, '  async function stopRecording() {', /\n  function recordAgain/);
  assert.ok(stop.indexOf('const binding = claimPress();') < stop.indexOf('await handle.stop()'));
  assert.match(stop, /await handle\.stop\(\);[\s\S]*?if \(!mounted\.current \|\| !takeIsLive\(take, exerciseRef\.current\)\) return;\s*if \(take\.stream\)/);

  const save = body(code, '  function save() {', /\n  function turnOffMicrophonePractice/);
  assertClaimedBefore(save, /const binding = claimPress\(\);/, /recordSpokenPracticeFor\(/, 'save()');
  assert.match(save, /recordSpokenPracticeFor\(binding\.owner, \{/);
  for (const fn of ['turnOffMicrophonePractice', 'turnOnMicrophonePractice']) {
    const text = body(code, `  function ${fn}() {`, /\n  \}\n/);
    assert.match(text, /const binding = claimPress\(\);\s*if \(!binding\) return;/, `${fn}() changes the plan without claiming the press`);
  }
  assert.match(code, /onChange=\{\(\) => toggleChecklist\(index\)\}/);
  assert.match(code, /\{withheld \? null : micUnavailable \? \(/, 'a withheld task is off the screen');
});

test('source scan: the written task ignores a keystroke, a Check and a help press from a render made before a hand-over', { timeout: 10_000 }, () => {
  const code = source('components/learning/WritingFocusedTask.tsx');
  assert.match(code, /function live\(\): boolean \{\s*return shownHandOver === handOverNow\.current;\s*\}/);
  assert.match(body(code, '  function onType(value: string) {', /\n  \}\n/), /^ {2}function onType\(value: string\) \{\s*if \(!live\(\)\) return;/);
  assert.match(body(code, '  async function evaluate() {', /const written = text;/), /if \(phase === 'asking'\) return;\s*if \(!live\(\)\) return;\s*$/);
  const handOver = body(code, '  function handOver() {', /\n  \/\*\* Write one attempt/);
  assert.match(handOver, /owner\.current = incoming;\s*handOverNow\.current \+= 1;\s*setShownHandOver\(handOverNow\.current\);/);
  assert.equal(code.split('onClick={() => live() && noteHelp(').length, 4, 'every help button on screen is guarded');
});
