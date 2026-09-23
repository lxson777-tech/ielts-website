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
import {
  currentOwner,
  deviceStorage,
  registerOwnerStampedStore,
  safeGet,
  safeRemove,
  safeSet,
  scopedKeyFor,
  type BrowserStorage,
  type OwnerBinding,
} from '../store-owner';
/* The same "is this still the student who started the sitting" rule the test
   player uses, imported rather than written a second time: a mock day and a
   single paper must not be able to disagree about whose work they are. The
   key rule comes from the same place, for the same reason. */
import {
  currentSessionOwner,
  ownerStillCurrent,
  unownedScopedKey,
  type PaperSittingStore,
  type TestSession,
} from '../test-session';

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
    through the adoption rule. A mock paused while signed out reaches an
    account only through the explicit "work saved on this device" claim,
    re-stamped for that account on the way (restampActiveMock below), and
    never over a paused mock the account already has. */
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

/** One timed paper of a mock day as it stands, kept INSIDE that sitting
    (third Codex round, R2B-03; see "The two timed papers, kept inside their
    own sitting" below). */
export interface MockLegSitting {
  /** The paper, always one of the sitting's own two. */
  testId: string;
  /** Epoch ms the paper started. */
  startedAt: number;
  /** Epoch ms the paper's clock runs out. A deadline, never a remaining
      count, for the same reason the Writing clock is one. */
  endsAt: number;
  /** The answers so far, by question id. Emptied once the paper is handed
      in, exactly as a standalone paper's sitting is cleared then. */
  answers: Record<string, string>;
  /** The paper's result once it was handed in INSIDE this sitting, else
      null. What picking the sitting back up counts as done. */
  result: MockLegResult | null;
}

export interface ActiveMock {
  version: 1;
  /** The owner who started this sitting, as store-owner.ts spells an owner. */
  owner: string;
  /** This sitting's own identity, made when it starts and never reused
      (R2B-03). The mock id cannot serve: it counts only the mocks already
      recorded today, so a sitting abandoned part way and a fresh one started
      the same day would share one. */
  sittingId: string;
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
      honest across a reload. The Listening and Reading clocks are in
      `legSittings` below, each paper's own. The short beat between two
      papers is not exam time and is not stored. */
  writingEndsAt: number | null;
  speakingBand: number | null;
  speakingCriteria: Record<string, number> | null;
  speakingSkipped: boolean;
  /** The Listening and Reading papers of THIS sitting as they stand, by
      test id: answers, deadline, and the result once handed in. Written by
      the test player through the leg functions below, never by the
      screen's own snapshot (see saveActiveMock). */
  legSittings: Record<string, MockLegSitting>;
  /** Epoch ms of the last write. */
  savedAt: number;
}

/** What the mock screen writes down: everything but the papers' own
    sittings, which are the test player's to write. */
export type ActiveMockSnapshot = Omit<ActiveMock, 'legSittings'> & {
  legSittings?: Record<string, MockLegSitting>;
};

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

function asAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [id, answer] of Object.entries(value as Record<string, unknown>)) {
    if (typeof answer === 'string') out[id] = answer;
  }
  return out;
}

/** One paper's stored sitting, or null when its clock cannot be read: a
    paper with no readable deadline is started again rather than guessed. */
function asLegSitting(value: unknown, testId: string): MockLegSitting | null {
  if (!value || typeof value !== 'object') return null;
  const leg = value as Partial<MockLegSitting>;
  const startedAt = asNumberOrNull(leg.startedAt);
  const endsAt = asNumberOrNull(leg.endsAt);
  if (startedAt === null || endsAt === null) return null;
  return { testId, startedAt, endsAt, answers: asAnswers(leg.answers), result: asLeg(leg.result) };
}

function asLegSittings(value: unknown): Record<string, MockLegSitting> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, MockLegSitting> = {};
  for (const [testId, raw] of Object.entries(value as Record<string, unknown>)) {
    const leg = asLegSitting(raw, testId);
    if (leg) out[testId] = leg;
  }
  return out;
}

/** A sitting written down before sitting ids existed (earlier in this same
    build) is named by its mock id and the moment it started, which together
    are unique for one student. */
function fallbackSittingId(mockId: string, startedAt: string): string {
  return `${mockId}@${startedAt}`;
}

/** A fresh identity for a sitting that is starting now. */
export function newMockSittingId(): string {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const random =
    typeof cryptoApi?.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `sitting-${random}`;
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
  const mockId = asText(parsed.mockId);
  const startedAt = asText(parsed.startedAt);
  return {
    version: 1,
    owner: parsed.owner,
    sittingId: asIdOrNull(parsed.sittingId) ?? fallbackSittingId(mockId, startedAt),
    mockId,
    startedAt,
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
    legSittings: asLegSittings(parsed.legSittings),
    savedAt: asNumberOrNull(parsed.savedAt) ?? 0,
  };
}

function sameSitting(a: { owner: string; sittingId: string }, b: { owner: string; sittingId: string }): boolean {
  return a.owner === b.owner && a.sittingId === b.sittingId;
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

/* WHO MAY WRITE THE RECORD, AND WHEN (fourth Codex round, 23 September 2026,
   R2C-02)
   The papers' own writes already had to name the sitting they belong to,
   but the screen's own saves and its tidy-up did not: any save carrying a
   different sitting id was taken as a replacement, and the tidy-up checked
   only the student. So a mock left open in one tab (M1, say in Writing)
   while the same student started a fresh one (M2) in another tab could
   still write: one keystroke in M1 replaced M2, papers and all, and
   finishing M1 deleted M2.

   Writing is now split in two, and only the first may change which sitting
   the record holds:
     - beginActiveMock: the student starting a new mock (which the resume
       offer tells them replaces an unfinished one). The one way a sitting
       takes the place of another. The explicit "work saved on this device"
       claim moves a record too, through restampActiveMock below, but only
       into an account with no paused mock of its own, and it keeps the
       sitting's identity and papers.
     - saveActiveMock and clearActiveMock: everything else, the screen's
       snapshot (the stage, the essays, the Writing deadline, the finished
       legs) and the tidy-up once a sitting is recorded. Both must name the
       SAME student and the SAME sitting as the stored record, and write
       nothing at all otherwise, exactly as the papers' own writes do.
   A screen whose sitting has been replaced finds out through
   mockSittingReplaced (after a refused write, and on the storage event
   another tab's write raises) and stops for good. */

/** Write down a sitting that is starting now: a fresh identity, and the
    papers the snapshot names (none, for a fresh mock). It takes the place of
    whatever sitting this student had written down, which is what "Start
    Mock Exam" means once a sitting is on offer. The only function here that
    may do that.
 *
 * Returns false, writing nothing, when the owner named on it is not the one
 * using this browser, it has no sitting id, or its stage has nothing to pick
 * up (the start screen, the results). */
export function beginActiveMock(state: ActiveMockSnapshot): boolean {
  if (!state.sittingId || !inProgress(state.stage)) return false;
  if (!state.owner || state.owner !== currentSessionOwner()) return false;
  const storage = deviceStorage();
  if (!storage) return false;
  return safeSet(
    storage,
    activeKeyNow(),
    JSON.stringify({ ...state, legSittings: state.legSittings ?? {}, savedAt: Date.now() }),
  );
}

/** Write down where the sitting stands now: the screen's snapshot of the
    stage, the finished legs, the essays and the Writing deadline. An
    ORDINARY save, so it only ever updates the record it came from: the
    stored record must be this browser's current owner's, in progress, and
    the SAME sitting (same student, same sitting id). Otherwise it returns
    false and writes nothing at all: a mock day that outlived its student is
    never copied into the next student's key, and a sitting that a newer one
    replaced (another tab started a fresh mock) never overwrites it
    (R2C-02). A stage with nothing to pick up is not written either.
 *
 * The two papers' own sittings are the test player's to write, so they are
 * kept exactly as stored, whatever the snapshot carries. A field this build
 * does not know about is carried across untouched. */
export function saveActiveMock(state: ActiveMockSnapshot): boolean {
  if (!inProgress(state.stage)) return false;
  const sitting = heldSitting({ owner: state.owner, sittingId: state.sittingId });
  if (!sitting) return false;
  const { legSittings: _papersAreThePlayers, ...snapshot } = state;
  return safeSet(
    sitting.storage,
    sitting.key,
    JSON.stringify({ ...sitting.raw, ...snapshot, legSittings: sitting.held.legSittings, savedAt: Date.now() }),
  );
}

/** Forget the sitting `ref` names, once it has been recorded. An ORDINARY
    clear: only when the stored record is that very sitting, of the student
    using this browser now. Another student's unfinished mock is under their
    own key and is not touched; a late tidy-up after a sign-in removes
    nothing; and a sitting that a newer one replaced can never remove the
    newer one (R2C-02). Returns whether anything was removed. */
export function clearActiveMock(ref: MockSittingRef): boolean {
  const sitting = heldSitting(ref);
  if (!sitting) return false;
  safeRemove(sitting.storage, sitting.key);
  return true;
}

/** True when the sitting `ref` names is no longer the one written down
    because a NEWER sitting of the same student has taken its place (the
    student started a fresh mock in another tab). A screen still showing
    `ref` then stops for good and never writes again (R2C-02).
 *
 * False in every other case, on purpose: while the sitting is still the
 * stored one; when the account on this browser changed (that has its own
 * stopped screen, and the sitting is still there for its student); and when
 * nothing is written down at all. */
export function mockSittingReplaced(ref: MockSittingRef): boolean {
  if (!ref.owner || !ref.sittingId || !ownerStillCurrent(ref.owner)) return false;
  const storage = deviceStorage();
  if (!storage) return false;
  const held = parseActive(safeGet(storage, activeKeyNow()));
  return !!held && inProgress(held.stage) && held.owner === ref.owner && held.sittingId !== ref.sittingId;
}

/** Whether a storage event another tab raised (its `key`, null when the
    whole storage was cleared) can concern the in-progress mock record. */
export function isActiveMockStorageKey(key: string | null): boolean {
  return key === null || key === ACTIVE_MOCK_KEY || key.startsWith(`${ACTIVE_MOCK_KEY}::`);
}

/** A written-down mock day held by `from`, re-stamped so that `to` can pick
    it up: the `owner` field names `to` and every other field (the stage,
    the finished legs, the essays, the Writing deadline, and the two papers'
    own sittings with their answers and deadlines) is exactly as it was
    stored. The papers carry no owner of their own, only the sitting does,
    so this one change is all the account's player needs to accept them.
    Owners are spelled as store-owner.ts spells them.
 *
 * Null when it is not `from`'s to hand over: not a sitting this file can
 * read, a sitting with nothing to pick up (the start screen or the results,
 * which loadActiveMock would not offer either), or one stamped with anybody
 * but `from`. Pure: it reads and writes nothing, and the explicit "work
 * saved on this device" claim in store-owner.ts is its only caller. */
export function restampActiveMock(raw: string, from: string, to: string): string | null {
  const held = parseActive(raw);
  if (!held || !inProgress(held.stage) || held.owner !== from) return null;
  /* The stored object itself, not the tidied read-back, so a field this
     build does not know about is carried across untouched. parseActive has
     already proved it is an object. */
  return JSON.stringify({ ...(JSON.parse(raw) as Record<string, unknown>), owner: to });
}

/* The claim carries a paused mock day with this rule. Born owner-scoped, it
   has no older build's value to park first. The papers' own sittings live
   inside the same value, so they travel with it and cannot be split from it. */
registerOwnerStampedStore(ACTIVE_MOCK_KEY, { restamp: restampActiveMock });

/* ── The two timed papers, kept inside their own sitting ─────────────────── */

/* WHY (third Codex round, 23 September 2026, R2B-03)
   A mock's Listening and Reading papers used to keep their answers and their
   deadline in the single per-student slot of src/lib/test-session.ts, the
   same slot as any paper opened on its own, found by nothing but the paper's
   id. Two things went wrong. A student who paused a mock on its Listening
   paper and opened a Reading drill in the meantime overwrote that slot, and
   the mock's Listening then started again from nothing with a fresh clock.
   And a new mock on a paper that happened to be in the slot picked up that
   older sitting's answers and deadline.

   So a paper of a mock is now kept INSIDE that mock sitting, in
   `legSittings`, and is only ever reached through the sitting's own identity
   (the student who started it and its sitting id). The standalone slot is
   never read or written for it. A fresh mock has a fresh identity and no
   papers; picking a sitting back up restores that sitting's papers and no
   other. Handing a paper in keeps its result with the sitting, which is what
   picking it up later counts as done (reconcileActiveMock). */

/** Which mock sitting a paper belongs to, as the test player is told it. */
export interface MockSittingRef {
  owner: string;
  sittingId: string;
}

interface HeldSitting {
  storage: BrowserStorage;
  key: string;
  /** The stored value itself, so a field this build does not know about is
      written back untouched. */
  raw: Record<string, unknown>;
  held: ActiveMock;
}

/** The written-down sitting `ref` names, when it is the current owner's own,
    still has something to pick up, and is still the SAME sitting. Null
    otherwise, including once somebody else is using this browser: a paper
    never reads or writes another student's sitting, or an older one. Every
    ordinary write goes through this, the screen's own (saveActiveMock,
    clearActiveMock) as well as the papers' (R2C-02). */
function heldSitting(ref: MockSittingRef): HeldSitting | null {
  if (!ref.owner || !ref.sittingId || !ownerStillCurrent(ref.owner)) return null;
  const storage = deviceStorage();
  if (!storage) return null;
  const key = activeKeyNow();
  const text = safeGet(storage, key);
  const held = parseActive(text);
  if (!held || !inProgress(held.stage) || !sameSitting(held, ref)) return null;
  return { storage, key, raw: JSON.parse(text!) as Record<string, unknown>, held };
}

function writeLegs(sitting: HeldSitting, legSittings: Record<string, MockLegSitting>): boolean {
  return safeSet(sitting.storage, sitting.key, JSON.stringify({ ...sitting.raw, legSittings, savedAt: Date.now() }));
}

function isPaperOf(held: ActiveMock, testId: string): boolean {
  return testId.length > 0 && (testId === held.listeningTestId || testId === held.readingTestId);
}

/** Paper `testId` of the sitting `ref`, still being sat: its answers and its
    deadline. Null when this browser's current owner holds no such sitting,
    or it was never started inside it, or it has already been handed in. */
export function loadMockLeg(ref: MockSittingRef, testId: string): MockLegSitting | null {
  const leg = heldSitting(ref)?.held.legSittings[testId];
  return leg && !leg.result ? leg : null;
}

/** Start paper `test` as a leg of the sitting `ref`: a fresh deadline and no
    answers, written into that sitting and nowhere else. Returns what was
    written, or null, writing nothing, when the sitting is not the current
    owner's, the paper is not one of its two, or the paper was already handed
    in inside it (a result is never replaced by a fresh start). */
export function startMockLeg(
  ref: MockSittingRef,
  test: Pick<PracticeTest, 'id' | 'durationMinutes'>,
  now: number = Date.now(),
): MockLegSitting | null {
  const sitting = heldSitting(ref);
  if (!sitting || !isPaperOf(sitting.held, test.id)) return null;
  if (sitting.held.legSittings[test.id]?.result) return null;
  const leg: MockLegSitting = {
    testId: test.id,
    startedAt: now,
    endsAt: now + test.durationMinutes * 60_000,
    answers: {},
    result: null,
  };
  return writeLegs(sitting, { ...sitting.held.legSittings, [test.id]: leg }) ? leg : null;
}

/** Save the answers of paper `testId` inside the sitting `ref`. False, and
    nothing written, once somebody else is using this browser, or when that
    paper is not being sat in that sitting. */
export function saveMockLegAnswers(ref: MockSittingRef, testId: string, answers: Record<string, string>): boolean {
  const sitting = heldSitting(ref);
  const leg = sitting?.held.legSittings[testId];
  if (!sitting || !leg || leg.result) return false;
  return writeLegs(sitting, { ...sitting.held.legSittings, [testId]: { ...leg, answers: { ...answers } } });
}

/** Paper `testId` was handed in inside the sitting `ref`: its result is kept
    with the sitting and its in-progress answers go, exactly as a standalone
    paper's sitting is cleared on submit. A no-op returning false once
    somebody else is using this browser. */
export function finishMockLeg(ref: MockSittingRef, testId: string, result: MockLegResult): boolean {
  const sitting = heldSitting(ref);
  if (!sitting || !isPaperOf(sitting.held, testId)) return false;
  const leg = sitting.held.legSittings[testId];
  const now = Date.now();
  const base: MockLegSitting = leg ?? { testId, startedAt: now, endsAt: now, answers: {}, result: null };
  return writeLegs(sitting, { ...sitting.held.legSittings, [testId]: { ...base, answers: {}, result: { ...result } } });
}

/** The result paper `testId` was handed in with inside the sitting `ref`, if
    it was. */
export function mockLegResult(ref: MockSittingRef, testId: string): MockLegResult | null {
  return heldSitting(ref)?.held.legSittings[testId]?.result ?? null;
}

/** One paper of the sitting `ref`, in the shape the test player uses for
    every paper (src/lib/test-session.ts, PaperSittingStore). The sitting it
    reads and writes is named by `ref` and nothing else, so it never touches
    the standalone slot and never finds an older sitting's answers. */
export function mockLegSitting(
  ref: MockSittingRef,
  test: Pick<PracticeTest, 'id' | 'durationMinutes'>,
): PaperSittingStore {
  const asSession = (leg: MockLegSitting): TestSession => ({
    version: 1,
    testId: leg.testId,
    startedAt: leg.startedAt,
    endsAt: leg.endsAt,
    answers: leg.answers,
    owner: ref.owner,
  });
  return {
    load: () => {
      const leg = loadMockLeg(ref, test.id);
      return leg ? asSession(leg) : null;
    },
    start: () => {
      const now = Date.now();
      /* Should the write fail (no room, or the sitting already gone), the
         paper still gets its clock on screen; it simply is not kept. */
      const leg = startMockLeg(ref, test, now) ?? {
        testId: test.id,
        startedAt: now,
        endsAt: now + test.durationMinutes * 60_000,
        answers: {},
        result: null,
      };
      return asSession(leg);
    },
    save: (answers, sittingOwner) => {
      if (sittingOwner && sittingOwner !== ref.owner) return false;
      return saveMockLegAnswers(ref, test.id, answers);
    },
    finish: (sittingOwner, outcome) => {
      if (sittingOwner && sittingOwner !== ref.owner) return;
      finishMockLeg(ref, test.id, outcome);
    },
  };
}

/* ── The Speaking leg leaving the screen without a band (R2B-02) ─────────── */

/* WHY (third Codex round, 23 September 2026, R2B-02)
   The live examiner used to report ANY exit without a band as the student
   cancelling Speaking, including the one where it did not choose to leave at
   all: the account on this browser changed, the mock's stopped screen took
   its place, and its unmount reported a cancellation. The mock then skipped
   Speaking, went to its results and, once the student was back, recorded the
   sitting without Speaking and forgot it. Now the two are told apart. */

/** How the interview left the screen without a band.
 * - 'cancelled': the student's own way out (Back on the examiner's error
 *   screen), or a speaking service that could not run the interview at all.
 * - 'suspended': the account using this browser changed and the mock's
 *   stopped screen took the examiner away. Not the student's choice. */
export type SpeakingExit = 'cancelled' | 'suspended';

/** What an examiner being taken off screen, before it reported anything,
    should report. `binding` is the one it made for the student on screen
    when it opened: an owner change since then is a suspension, anything
    else is a cancellation. Read before the binding is let go (a cancelled
    binding no longer says whether the owner changed). */
export function examinerLeftScreen(binding: Pick<OwnerBinding, 'state'>): SpeakingExit {
  return binding.state() === 'owner-changed' ? 'suspended' : 'cancelled';
}

/** The exit the mock acts on. A cancellation that arrives while the sitting's
    own student is no longer the one on this browser is treated as a
    suspension all the same: a mock never moves to its results on somebody
    else's watch. */
export function speakingExitFor(reported: SpeakingExit, sittingOwner: string): SpeakingExit {
  return reported === 'suspended' || !ownerStillCurrent(sittingOwner) ? 'suspended' : 'cancelled';
}

/** Where the sitting goes after the interview left without a band.
    Cancelled: Speaking is skipped and the sitting moves to its results.
    Suspended: nothing is skipped and nothing is recorded; the sitting goes
    back to the Speaking brief, where its own student starts or skips it once
    they are back. A grade that was still on its way is kept for that student
    by the examiner itself (runOwnedGrade in src/lib/store-owner.ts), and is
    not folded into this sitting. */
export function afterSpeakingExit(exit: SpeakingExit): { stage: MockStage; speakingSkipped: boolean } {
  return exit === 'suspended'
    ? { stage: 'speaking-brief', speakingSkipped: false }
    : { stage: 'results', speakingSkipped: true };
}

/** Seconds left on the Writing clock at `now`, from its stored deadline.
    Before Writing has started (no deadline yet) the whole hour is left. A
    deadline is never moved: a sitting picked up after it passed has no
    Writing time left at all. */
export function writingSecondsLeftAt(writingEndsAt: number | null, now: number, fullSeconds: number): number {
  if (writingEndsAt === null) return fullSeconds;
  return Math.max(0, Math.round((writingEndsAt - now) / 1000));
}

/** A written-down sitting, made ready to put back on screen.
 *
 * - A leg handed in INSIDE THIS SITTING before the page went away (after
 *   Submit, before "Back to results") counts as done, and the sitting moves
 *   on to the short beat before the next paper. Without this, the embedded
 *   player (which starts a mock leg straight away) would open a second
 *   sitting of a paper the student had already handed in. It is read from
 *   the sitting's own papers, never from the history by paper id: the same
 *   paper sat on its own during a pause, or in another mock, is not this
 *   sitting's leg (R2B-03).
 * - The live voice interview is never re-entered on its own: it opens a
 *   real-time session that costs real money, so a sitting picked up there
 *   lands on the Speaking brief, where the student starts or skips it.
 * - Nothing else changes. In particular no deadline is touched: the Writing
 *   clock and each paper's own clock carry on from where they stood. */
export function reconcileActiveMock(held: ActiveMock): ActiveMock {
  let next: ActiveMock = { ...held };
  const handedIn = (testId: string): MockLegResult | null => next.legSittings[testId]?.result ?? null;
  if (next.stage === 'listening' && !next.listening) {
    const done = handedIn(next.listeningTestId);
    if (done) next = { ...next, listening: done, stage: 'transition-reading' };
  }
  if (next.stage === 'reading' && !next.reading) {
    const done = handedIn(next.readingTestId);
    if (done) next = { ...next, reading: done, stage: 'transition-writing' };
  }
  if (next.stage === 'speaking') next = { ...next, stage: 'speaking-brief' };
  return next;
}
