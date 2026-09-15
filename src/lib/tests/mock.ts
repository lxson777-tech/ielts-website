/* Mock Exam Day (src/components/MockExam.tsx): pure helpers for picking a
   default test pair, and a small localStorage store for the essays a mock
   sitting produces — recordWritingAttempt's shape requires a real band and
   per-criterion scores, which a mock (no AI grading) never has, so those
   essays live here instead. The individual Listening and Reading legs are
   recorded as ordinary full attempts by TestPlayer itself (see
   attemptKind="full" in MockExam.tsx); the Speaking leg (2026-09) is the
   embedded live examiner, graded live, whose band is folded straight into
   this file's own combined record rather than progress.ts's separate
   SpeakingAttempt list — see saveMockAttempt below. This file only adds the
   one combined "a mock happened" record. */

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
  /** Overall band from the embedded live AI examiner (Part 1 interview, Part
      2 long turn, Part 3 discussion), when the student took the Speaking
      stage. Optional: absent both for every attempt recorded before Speaking
      joined the mock, and for a sitting where the student chose "Skip
      speaking" — check `speakingSkipped` to tell those two apart. */
  speakingBand?: number;
  /** True when the student pressed "Skip speaking" on the Speaking stage (or
      left the interview before it produced a report) on this sitting.
      Optional/absent for every attempt recorded before Speaking existed in
      the mock; treat a missing value the same as `false` there — those
      sittings simply had no Speaking stage to skip. */
  speakingSkipped?: boolean;
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

/** The official IELTS overall-band method: the mean of the component bands
    given, rounded to the nearest half band, with the official tie-break on
    the two fractions a mean of half-band scores can land on exactly between
    two half bands — .25 rounds up to the next half band, .75 rounds up to
    the next whole band (so 6.25 → 6.5, 6.75 → 7). `Math.round` on the
    doubled mean happens to implement exactly this: it rounds n.5 up for any
    positive n, and doubling turns both the .25 and .75 cases into a .5 it
    then rounds up. Works for any number of components (2 through 4 here —
    see the two callers below), not just the historical Listening+Reading
    pair, so both this file and the mock-summary screen share one
    implementation instead of drifting apart. */
export function overallMockBand(bands: number[]): number {
  if (bands.length === 0) return 0;
  const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
  return Math.round(mean * 2) / 2;
}

/** Save the mock's own record (essays included) and leave a matching marker
    in the shared progress store. TestAttempt only models one skill at a
    time ('reading' | 'listening'), and a mock day spans Listening, Reading,
    Writing and (now) Speaking — 'reading' is used as the nearest neutral
    value, the same fallback progress.ts itself uses for attempts recorded
    before the skill field existed. Marked kind: 'drill' so this combined
    marker never enters 'full'-only band history (getBestBand,
    ScoreHistory's chart/table) — the real per-skill history already comes
    from the two ordinary 'full' attempts TestPlayer records for the
    Listening and Reading legs (Speaking's live-test band deliberately isn't
    also pushed into progress.speaking: that list's SpeakingAttempt.mode is
    'part1' | 'part2' | 'part3' only, the same shape the standalone
    /speaking/examiner full test already leaves alone — see the `m !== 'full'`
    guard in LiveExaminer's finishTest). This entry exists only so something
    in progress records that a mock sitting happened on this day. */
export function saveMockAttempt(attempt: MockAttempt): void {
  const list = readStore();
  list.push(attempt);
  writeStore(list);

  const bands = [attempt.listeningBand, attempt.readingBand];
  if (attempt.speakingBand != null) bands.push(attempt.speakingBand);
  const combinedBand = overallMockBand(bands);
  const bandLabel =
    `L ${attempt.listeningBand.toFixed(1)} · R ${attempt.readingBand.toFixed(1)}` +
    (attempt.speakingBand != null ? ` · S ${attempt.speakingBand.toFixed(1)}` : '');
  recordTestAttempt(attempt.id, {
    at: attempt.at,
    raw: attempt.listeningRaw + attempt.readingRaw,
    total: attempt.listeningTotal + attempt.readingTotal,
    band: combinedBand,
    bandLabel,
    secondsUsed: attempt.secondsUsed,
    kind: 'drill',
    skill: 'reading',
  });
}
