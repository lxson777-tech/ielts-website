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
import { getAttempts, getBestBand, recordTestAttempt } from '../progress';
import { currentOwner, deviceStorage, safeGet, safeRemove, safeSet, scopedKeyFor } from '../store-owner';
/* The same "is this still the student who started the sitting" rule the test
   player uses, imported rather than written a second time: a mock day and a
   single paper must not be able to disagree about whose work they are. The
   key rule comes from the same place, for the same reason. */
import { currentSessionOwner, ownerStillCurrent, unownedScopedKey } from '../test-session';

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

/* The store's base key, unchanged. What actually reaches localStorage is
   this plus the owner, for example 'ielts.mock.v1::u:9f0c'.

   WHOSE MOCK SITTINGS (23 September 2026)
   This was a device-wide pile with nobody's name on it, exactly like the
   active test session and the four older stores before it (see
   src/lib/store-owner.ts's header and src/lib/progress.ts's). A mock day
   carries the student's own essays, so a second student signing in on the
   same browser could read the first one's writing. Every read and write
   below now resolves its key through store-owner.ts. The old device-wide
   key keeps its value for good: it is copied, once, into the ANONYMOUS
   device owner's key and nowhere else (see adoptUnownedIntoDevice in
   src/lib/test-session.ts, and the R2-01 note in that file's header for why
   the device's history stamp is not allowed to answer this question). No
   signed-in account ever inherits it automatically. */
export const MOCK_STORE_KEY = 'ielts.mock.v1';

const MOCK_KEY = MOCK_STORE_KEY;

/** Where the CURRENT owner's copy of the mock history lives, having first
    parked an older build's device-wide copy with the anonymous device owner
    (never with a signed-in account; see src/lib/test-session.ts). */
function keyNow(base: string): string {
  return unownedScopedKey(deviceStorage(), base, currentOwner());
}

function readStore(): MockAttempt[] {
  const storage = deviceStorage();
  if (!storage) return [];
  try {
    const raw = safeGet(storage, keyNow(MOCK_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(list: MockAttempt[]): void {
  const storage = deviceStorage();
  if (!storage) return;
  /* safeSet swallows a blocked or full store: a mock record is a
     nice-to-have, never a reason to lose the results screen. */
  safeSet(storage, keyNow(MOCK_KEY), JSON.stringify(list));
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

/** The owner a mock sitting is bound to, captured by MockExam.tsx when the
    sitting begins and handed back to saveMockAttempt when it ends. */
export function currentMockOwner(): string {
  return currentSessionOwner();
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
    in progress records that a mock sitting happened on this day.

    Returns false, writing nothing at all, when `sittingOwner` (the owner the
    sitting began under, see currentMockOwner) is no longer the owner of this
    browser. */
export function saveMockAttempt(attempt: MockAttempt, sittingOwner?: string): boolean {
  /* Finding 1 of the 23 September 2026 review, the mock's half of it: a mock
     day that outlived the student who sat it (they signed out, or somebody
     else signed in on this browser part way through) records nothing at all,
     rather than filing four papers and two essays under whoever happens to
     be signed in when the results screen appears. */
  if (!ownerStillCurrent(sittingOwner)) return false;

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
  return true;
}

/* ── The mock sitting that is still running ──────────────────────────────── */

/* WHY THIS STORE EXISTS (second Codex round, 23 September 2026, R2-03)
   A mock day is nearly three hours long and it used to live entirely in one
   React component's memory: the stage, the papers chosen, the two essays,
   the legs already finished. A refresh, a stray navigation, or a sign-out
   and a sign-in threw all of it away, and the only thing on offer was a
   fresh mock, which is not a small loss to a student two papers in.

   It is now written down as it goes, under the owner who is sitting it, so
   that it survives a reload and so that it can be handed back to that same
   student and to nobody else. Every timed leg keeps its DEADLINE rather
   than a remaining count, so a sitting put down and picked up again cannot
   buy the student more exam time than the clock allowed. */

/** The base key. What reaches localStorage is this plus the owner, for
    example 'ielts.mock.active.v1::u:9f0c'. Born owner-scoped, so unlike the
    history above it has no device-wide past to adopt and is never read
    through the adoption rule. */
export const ACTIVE_MOCK_KEY = 'ielts.mock.active.v1';

/** The stages a mock sitting moves through, in order. Named here rather
    than in the screen so that what is written down and what is read back
    cannot drift apart. */
export type MockStage =
  | 'start'
  | 'listening'
  | 'transition-reading'
  | 'reading'
  | 'transition-writing'
  | 'writing'
  | 'speaking-brief'
  | 'speaking'
  | 'results';

const MOCK_STAGES: readonly MockStage[] = [
  'start',
  'listening',
  'transition-reading',
  'reading',
  'transition-writing',
  'writing',
  'speaking-brief',
  'speaking',
  'results',
] as const;

/** One finished paper of a mock day, as the screen hands it over. */
export interface MockLegResult {
  raw: number;
  total: number;
  band: number;
  bandLabel: string;
  secondsUsed: number;
}

export interface ActiveMock {
  version: 1;
  /** The owner who started this sitting, as store-owner.ts spells an owner. */
  owner: string;
  mockId: string;
  /** ISO datetime the sitting started. */
  startedAt: string;
  stage: MockStage;
  listeningTestId: string;
  readingTestId: string;
  /** The two Writing prompts drawn for this sitting, so picking the sitting
      back up does not quietly hand the student different questions. */
  task1PromptId: string | null;
  task2PromptId: string | null;
  listening: MockLegResult | null;
  reading: MockLegResult | null;
  essay1: string;
  essay2: string;
  /** Epoch ms the Writing hour runs out, null before Writing starts. A
      deadline, never a remaining count: that is what keeps the clock
      honest across a reload. The Listening and Reading clocks are not
      here because they never were: each leg's deadline is the in-progress
      sitting in src/lib/test-session.ts, under the same owner. The short
      beat between two papers is not exam time and is not stored. */
  writingEndsAt: number | null;
  speakingBand: number | null;
  speakingCriteria: Record<string, number> | null;
  speakingSkipped: boolean;
  /** Epoch ms of the last write. */
  savedAt: number;
}

function isStage(value: unknown): value is MockStage {
  return typeof value === 'string' && (MOCK_STAGES as readonly string[]).includes(value);
}

function asLeg(value: unknown): MockLegResult | null {
  if (!value || typeof value !== 'object') return null;
  const leg = value as Partial<MockLegResult>;
  if (typeof leg.raw !== 'number' || typeof leg.total !== 'number' || typeof leg.band !== 'number') return null;
  return {
    raw: leg.raw,
    total: leg.total,
    band: leg.band,
    bandLabel: typeof leg.bandLabel === 'string' ? leg.bandLabel : String(leg.band),
    secondsUsed: typeof leg.secondsUsed === 'number' ? leg.secondsUsed : 0,
  };
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asIdOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Read a stored sitting back field by field. The version, the owner and
    the stage decide whose it is and where it stands, so a record missing any
    of them is not a sitting at all. Every other field falls back to "not
    done yet" rather than failing the whole record: a damaged essay field
    must not cost a student the papers they already finished. */
function parseActive(raw: string | null): ActiveMock | null {
  if (!raw) return null;
  let parsed: Partial<ActiveMock> | null;
  try {
    parsed = JSON.parse(raw) as Partial<ActiveMock> | null;
  } catch {
    return null;
  }
  if (!parsed || parsed.version !== 1) return null;
  if (typeof parsed.owner !== 'string' || parsed.owner.length === 0) return null;
  if (!isStage(parsed.stage)) return null;
  const criteria = parsed.speakingCriteria;
  return {
    version: 1,
    owner: parsed.owner,
    mockId: asText(parsed.mockId),
    startedAt: asText(parsed.startedAt),
    stage: parsed.stage,
    listeningTestId: asText(parsed.listeningTestId),
    readingTestId: asText(parsed.readingTestId),
    task1PromptId: asIdOrNull(parsed.task1PromptId),
    task2PromptId: asIdOrNull(parsed.task2PromptId),
    listening: asLeg(parsed.listening),
    reading: asLeg(parsed.reading),
    essay1: asText(parsed.essay1),
    essay2: asText(parsed.essay2),
    writingEndsAt: asNumberOrNull(parsed.writingEndsAt),
    speakingBand: asNumberOrNull(parsed.speakingBand),
    speakingCriteria: criteria && typeof criteria === 'object' ? (criteria as Record<string, number>) : null,
    speakingSkipped: parsed.speakingSkipped === true,
    savedAt: asNumberOrNull(parsed.savedAt) ?? 0,
  };
}

/** A stage with something to pick up. The start screen has nothing yet, and
    a sitting that reached its results has been recorded in the history. */
function inProgress(stage: MockStage): boolean {
  return stage !== 'start' && stage !== 'results';
}

/** Where the CURRENT owner's in-progress sitting is kept. */
function activeKeyNow(): string {
  return scopedKeyFor(ACTIVE_MOCK_KEY, currentOwner());
}

/** The sitting the CURRENT owner has in progress, if any. A record stamped
    with somebody else is never returned, even from this owner's own key:
    the stamp is checked rather than trusted, exactly as an unfinished
    single paper is (see read() in src/lib/test-session.ts). A sitting that
    never left the start screen, or that has reached its results, has
    nothing to pick up and is not offered either. */
export function loadActiveMock(): ActiveMock | null {
  const storage = deviceStorage();
  if (!storage) return null;
  const held = parseActive(safeGet(storage, activeKeyNow()));
  if (!held || !inProgress(held.stage)) return null;
  return held.owner === currentSessionOwner() ? held : null;
}

/** Write the sitting down, under the owner named on it, and only while that
    is still the owner of this browser. Returns false and writes nothing at
    all once somebody else has signed in: a mock day that outlived its
    student is never copied into the next student's key. A stage with
    nothing to pick up (the start screen, the results) is not written
    either. */
export function saveActiveMock(state: ActiveMock): boolean {
  if (!inProgress(state.stage)) return false;
  if (!ownerStillCurrent(state.owner)) return false;
  const storage = deviceStorage();
  if (!storage) return false;
  return safeSet(storage, activeKeyNow(), JSON.stringify({ ...state, savedAt: Date.now() }));
}

/** Forget the CURRENT owner's in-progress sitting, once it has been
    recorded or the student has chosen to start again. Another student's
    unfinished mock on this browser is under their own key and is not
    touched, and passing the owner the sitting started under makes this a
    no-op after a sign-in, so a late tidy-up cannot wipe the new student's
    own sitting. */
export function clearActiveMock(sittingOwner?: string): void {
  if (!ownerStillCurrent(sittingOwner)) return;
  const storage = deviceStorage();
  if (!storage) return;
  safeRemove(storage, activeKeyNow());
}

/** Seconds left on the Writing clock at `now`, from its stored deadline.
    Before Writing has started (no deadline yet) the whole hour is left. A
    deadline is never moved: a sitting picked up after it passed has no
    Writing time left at all. */
export function writingSecondsLeftAt(writingEndsAt: number | null, now: number, fullSeconds: number): number {
  if (writingEndsAt === null) return fullSeconds;
  return Math.max(0, Math.round((writingEndsAt - now) / 1000));
}

/** The result of `testId` if the CURRENT owner submitted it as a full paper
    at or after `sinceIso` (the moment the mock started), else null. A leg
    submitted just before the page went away (after Submit, before "Back to
    results") is already in the history, and must count as done rather than
    be sat a second time. */
export function legFinishedSince(testId: string, sinceIso: string): MockLegResult | null {
  if (!testId || !sinceIso) return null;
  const since = getAttempts(testId).filter(
    ({ attempt }) => (attempt.kind ?? 'full') === 'full' && attempt.at >= sinceIso,
  );
  const last = since[since.length - 1]?.attempt;
  if (!last) return null;
  return { raw: last.raw, total: last.total, band: last.band, bandLabel: last.bandLabel, secondsUsed: last.secondsUsed };
}

/** A written-down sitting, made ready to put back on screen.
 *
 * - A leg submitted before the page went away counts as done, and the
 *   sitting moves on to the short beat before the next paper. Without this,
 *   the embedded player (which starts a mock leg straight away) would open a
 *   second sitting of a paper the student had already handed in.
 * - The live voice interview is never re-entered on its own: it opens a
 *   real-time session that costs real money, so a sitting picked up there
 *   lands on the Speaking brief, where the student starts or skips it.
 * - Nothing else changes. In particular no deadline is touched: the Writing
 *   clock and each paper's own clock carry on from where they stood. */
export function reconcileActiveMock(held: ActiveMock): ActiveMock {
  let next: ActiveMock = { ...held };
  if (next.stage === 'listening' && !next.listening) {
    const done = legFinishedSince(next.listeningTestId, next.startedAt);
    if (done) next = { ...next, listening: done, stage: 'transition-reading' };
  }
  if (next.stage === 'reading' && !next.reading) {
    const done = legFinishedSince(next.readingTestId, next.startedAt);
    if (done) next = { ...next, reading: done, stage: 'transition-writing' };
  }
  if (next.stage === 'speaking') next = { ...next, stage: 'speaking-brief' };
  return next;
}
