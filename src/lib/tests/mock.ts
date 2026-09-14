/* Mock Exam Day (src/components/MockExam.tsx): pure helpers for picking a
   default test pair, and a small localStorage store for the essays a mock
   sitting produces — recordWritingAttempt's shape requires a real band and
   per-criterion scores, which a mock (no AI grading) never has, so those
   essays live here instead. The individual Listening and Reading legs are
   recorded as ordinary full attempts by TestPlayer itself (see
   attemptKind="full" in MockExam.tsx); this file only adds the one
   combined "a mock happened" record. */

import type { PracticeTest } from './schema';
import { getBestBand, recordTestAttempt } from '../progress';

export interface TestPair {
  listening: PracticeTest;
  reading: PracticeTest;
}

function byId(a: PracticeTest, b: PracticeTest): number {
  return a.id.localeCompare(b.id);
}

/** 1-based test number from an id like "listening-full-004" (→ 4), falling
    back to the 1-based position in `orderedList` if the id doesn't end in
    digits — so a differently-named test still gets a sane label instead of
    NaN. */
export function testNumber(test: PracticeTest, orderedList: PracticeTest[]): number {
  const m = test.id.match(/(\d+)$/);
  if (m) return parseInt(m[1]!, 10);
  const i = orderedList.findIndex((t) => t.id === test.id);
  return i >= 0 ? i + 1 : 1;
}

/** The lowest-numbered Listening and Reading test the student has not yet
    completed as a full attempt (getBestBand already excludes drills). Once
    every test in a skill has a full attempt, the cycle just restarts at
    test 1 for that skill, so there is always a sensible default. Returns
    null only if a skill has no tests at all to offer. */
export function pickDefaultPair(allTests: PracticeTest[]): TestPair | null {
  const listening = allTests.filter((t) => t.skill === 'listening').sort(byId);
  const reading = allTests.filter((t) => t.skill === 'reading').sort(byId);
  if (listening.length === 0 || reading.length === 0) return null;
  const nextListening = listening.find((t) => !getBestBand(t.id, 'listening')) ?? listening[0]!;
  const nextReading = reading.find((t) => !getBestBand(t.id, 'reading')) ?? reading[0]!;
  return { listening: nextListening, reading: nextReading };
}

/** "Listening Test 4, Reading Test 4" style label for a chosen pair. */
export function pairLabel(allTests: PracticeTest[], pair: TestPair): string {
  const listening = allTests.filter((t) => t.skill === 'listening').sort(byId);
  const reading = allTests.filter((t) => t.skill === 'reading').sort(byId);
  return `Listening Test ${testNumber(pair.listening, listening)}, Reading Test ${testNumber(pair.reading, reading)}`;
}

export interface MockEssay {
  promptId: string;
  task: 'task1' | 'task2';
  text: string;
  wordCount: number;
}

export interface MockAttempt {
  id: string; // mock-<date>-<n>
  at: string; // ISO datetime the mock sitting started
  listeningTestId: string;
  listeningBand: number;
  listeningRaw: number;
  listeningTotal: number;
  readingTestId: string;
  readingBand: number;
  readingRaw: number;
  readingTotal: number;
  essays: MockEssay[];
  secondsUsed: number;
}

const MOCK_KEY = 'ielts.mock.v1';

function readStore(): MockAttempt[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(list: MockAttempt[]): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(list));
  } catch {
    /* storage blocked or full — nothing else to do client-side */
  }
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** mock-<date>-<n>, n counting only today's mock attempts already saved
    (so retaking Mock Exam Day twice in one day gets distinct ids). */
export function nextMockId(at: string): string {
  const date = localDateKey(at);
  const todayCount = readStore().filter((m) => m.id.startsWith(`mock-${date}-`)).length;
  return `mock-${date}-${todayCount + 1}`;
}

export function listMockAttempts(): MockAttempt[] {
  return readStore()
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function getMockAttempt(id: string): MockAttempt | undefined {
  return readStore().find((m) => m.id === id);
}

/** Save the mock's own record (essays included) and leave a matching marker
    in the shared progress store. TestAttempt only models one skill at a
    time ('reading' | 'listening'), and a mock day spans Listening, Reading
    and Writing — 'reading' is used as the nearest neutral value, the same
    fallback progress.ts itself uses for attempts recorded before the skill
    field existed. Marked kind: 'drill' so this combined marker never enters
    'full'-only band history (getBestBand, ScoreHistory's chart/table) —
    the real per-skill history already comes from the two ordinary 'full'
    attempts TestPlayer records for the Listening and Reading legs. This
    entry exists only so something in progress records that a mock sitting
    happened on this day. */
export function saveMockAttempt(attempt: MockAttempt): void {
  const list = readStore();
  list.push(attempt);
  writeStore(list);

  const combinedBand = Math.round(((attempt.listeningBand + attempt.readingBand) / 2) * 2) / 2;
  recordTestAttempt(attempt.id, {
    at: attempt.at,
    raw: attempt.listeningRaw + attempt.readingRaw,
    total: attempt.listeningTotal + attempt.readingTotal,
    band: combinedBand,
    bandLabel: `L ${attempt.listeningBand.toFixed(1)} · R ${attempt.readingBand.toFixed(1)}`,
    secondsUsed: attempt.secondsUsed,
    kind: 'drill',
    skill: 'reading',
  });
}
