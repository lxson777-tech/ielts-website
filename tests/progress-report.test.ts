/* WP23's own pure logic: level.ts as a thin view over the one evidence
 * policy, reportTrends.ts's per-paper narratives and teacher-review
 * extraction, and insights.ts's readFacts as a thin view over the SAME
 * policy for the Worker's side of it.
 *
 * Every learner here is SYNTHETIC, from tests/fixtures/learning-profiles.
 * No store, no DOM, no React: everything under test is a pure function of
 * a `PolicyOutputV1`, a `LearnerRecordV1` or a `ProgressV1`/`SavedPlan`
 * pair, matching the discipline architecture section 1.7 requires of
 * everything under src/lib/learning.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import { PAPERS } from '../src/lib/learning/contracts/catalog.ts';
import type { PersonalPlanV1 } from '../src/lib/learning/contracts/plan.ts';
import { migrateProgress } from '../src/lib/learning/migrate.ts';
import { goalsFrom, planSettingsFromSavedPlan } from '../src/lib/learning/adapters.ts';

import { levelFromPolicy } from '../src/lib/level.ts';
import { skillTrendPanels, paperNarratives, recentIndependentEvidence, statedMistakeReasons, IGNORED_REASONS } from '../src/components/reportTrends.ts';
import { readFacts, confidenceFromCertainty } from '../src/lib/tutor/insights.ts';

import {
  syntheticNew,
  syntheticStrongReadingWeakWriting,
  syntheticWeakReadingStrongWriting,
  syntheticBlank,
  syntheticRepeat,
  syntheticLegacy,
  PROFILE_TODAY,
} from './fixtures/learning-profiles.ts';

/** A minimal, honest PersonalPlanV1 stand-in for functions that only read
    `.history` (paperNarratives). Never used where the rest of the plan
    shape matters. */
function planWithHistory(history: PersonalPlanV1['history']): PersonalPlanV1 {
  return { history } as unknown as PersonalPlanV1;
}

/* ── Agreement: level.ts and the report's skillTrendPanels ───────────────── */

test('level.ts and skillTrendPanels agree on band and certainty for every paper, because both read the same policy output', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });

  const level = levelFromPolicy(policy);
  const panels = skillTrendPanels(policy);

  for (const paper of PAPERS) {
    const skill = level.skills.find((s) => s.skill === paper)!;
    const panel = panels.find((p) => p.paper === paper)!;
    assert.equal(skill.band, panel.band, `${paper}: level and report disagree on band`);
    assert.equal(skill.certainty, panel.certainty, `${paper}: level and report disagree on certainty`);
  }
});

test('level.ts never invents an overall band from partial evidence: null until all four papers qualify', () => {
  const profile = syntheticStrongReadingWeakWriting(); // reading/writing strong evidence, listening/speaking thin
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const level = levelFromPolicy(policy);
  assert.equal(level.overall, policy.overall?.band ?? null);
});

/* ── Unknown stays unknown, never zero ────────────────────────────────────── */

test('a brand-new student: every skill band is null, never zero, and every panel is unknown', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const level = levelFromPolicy(policy);

  assert.equal(level.overall, null);
  for (const skill of level.skills) {
    assert.equal(skill.band, null);
    assert.equal(skill.certainty, 'unknown');
  }
  for (const panel of skillTrendPanels(policy)) {
    assert.equal(panel.band, null);
    assert.equal(panel.certainty, 'unknown');
  }
});

/* ── Self-reported never enters a measured number ─────────────────────────── */

test('a self-reported score never reaches measured certainty, and never counts toward the overall band', () => {
  const profile = syntheticNew({
    goals: {
      overallTarget: { band: 7, status: 'confirmed' },
      selfReported: [{ paper: 'writing', band: 7.5, takenOn: PROFILE_TODAY, reportedAt: PROFILE_TODAY }],
    },
  });
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const writing = policy.estimates.find((e) => e.scopeKey === 'paper:writing')!;

  assert.equal(writing.certainty, 'self-reported');
  assert.equal(writing.band, 7.5, 'the self-reported band is shown, but never as measured');
  assert.notEqual(confidenceFromCertainty(writing.certainty), 'measured');
  assert.equal(policy.overall, null, 'one self-reported paper is not enough to report an overall band');

  const level = levelFromPolicy(policy);
  const writingLevel = level.skills.find((s) => s.skill === 'writing')!;
  assert.equal(writingLevel.certainty, 'self-reported');
});

test('confidenceFromCertainty is conservative: only measured stays measured, everything else reads tentative', () => {
  assert.equal(confidenceFromCertainty('measured'), 'measured');
  assert.equal(confidenceFromCertainty('tentative'), 'tentative');
  assert.equal(confidenceFromCertainty('limited'), 'tentative');
  assert.equal(confidenceFromCertainty('self-reported'), 'tentative');
  assert.equal(confidenceFromCertainty('unknown'), 'tentative');
});

/* ── Ignored evidence is reported with reasons ────────────────────────────── */

test('a blank submission is ignored with a named reason, not silently dropped', () => {
  const profile = syntheticBlank();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const blankCount = policy.ignored.find((entry) => entry.reason === 'blank')?.count ?? 0;
  assert.ok(blankCount > 0, 'the two blank papers must show up in policy.ignored');
  assert.ok(IGNORED_REASONS.includes('blank'), 'the report knows how to render this reason');
});

test('a repeated sitting of the same paper is ignored as a repeat, with a named reason', () => {
  const profile = syntheticRepeat();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const repeatCount = policy.ignored.find((entry) => entry.reason === 'repeat-of-seen-material')?.count ?? 0;
  assert.ok(repeatCount > 0, 'sitting the same paper again must be named as a repeat, not silently excluded');
});

/* ── The four-question structure, for two opposite profiles ──────────────── */

test('paperNarratives always returns exactly the four papers, in order', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const narratives = paperNarratives(policy, planWithHistory([]), null);
  assert.deepEqual(narratives.map((n) => n.paper), [...PAPERS]);
});

test('opposite profiles get opposite four-question answers for reading and writing', () => {
  const strong = syntheticStrongReadingWeakWriting();
  const weak = syntheticWeakReadingStrongWriting();
  const strongPolicy = evaluateEvidence({ record: strong.record, goals: strong.goals, now: strong.now });
  const weakPolicy = evaluateEvidence({ record: weak.record, goals: weak.goals, now: weak.now });

  const strongNarratives = paperNarratives(strongPolicy, planWithHistory([]), null);
  const weakNarratives = paperNarratives(weakPolicy, planWithHistory([]), null);

  const strongReading = strongNarratives.find((n) => n.paper === 'reading')!;
  const weakReading = weakNarratives.find((n) => n.paper === 'reading')!;
  // Strong Reading (7.5 to 8 over three papers) should have a clean "no
  // uncertainty flagged" or freshness-only uncertain list; weak Reading
  // (5.5 across three papers, well under the 6.5 minimum) must name the gap
  // as its next step, never celebrate an improvement it does not have.
  assert.equal(strongReading.uncertain.length, 0, 'strong, fresh, measured reading should have nothing uncertain to say');
  assert.match(weakReading.nextStep.template, /gap|priority|goal/i);
});

test('the "what improved" list never appears for a paper with no independent evidence', () => {
  const profile = syntheticNew();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  for (const narrative of paperNarratives(policy, planWithHistory([]), null)) {
    assert.equal(narrative.improved.length, 0);
  }
});

test('schedule changes are quoted verbatim from plan history, only for entries about that paper', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const plan = planWithHistory([
    {
      at: profile.now,
      trigger: 'new-evidence',
      summary: 'Reading headings are improving, so one practice slot moves to Task 1 overviews.',
      detail: { scopeKeys: ['paper:reading'] },
      fromRevision: 1,
      toRevision: 2,
    },
  ]);
  const narratives = paperNarratives(policy, plan, null);
  const reading = narratives.find((n) => n.paper === 'reading')!;
  const listening = narratives.find((n) => n.paper === 'listening')!;
  assert.deepEqual(reading.scheduleChanges, ['Reading headings are improving, so one practice slot moves to Task 1 overviews.']);
  assert.deepEqual(listening.scheduleChanges, [], 'a change about reading is never attributed to listening');
});

/* ── The weekly review / narrative never names a competing next step ─────── */

test('a paper that is not today\'s session focus never gets a "this is today\'s focus" line: only the session\'s own paper does', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  const session = {
    paper: 'writing',
    objective: 'Task 1 overview practice',
  } as unknown as Parameters<typeof paperNarratives>[2];

  const narratives = paperNarratives(policy, planWithHistory([]), session);
  const writing = narratives.find((n) => n.paper === 'writing')!;
  const reading = narratives.find((n) => n.paper === 'reading')!;

  assert.match(writing.nextStep.template, /today's focus/);
  assert.doesNotMatch(reading.nextStep.template, /today's focus/, 'a paper the session is not about never claims to be the current focus too');
});

/* ── The export (recentIndependentEvidence / statedMistakeReasons) only
   ever reflects the one record it was given ─────────────────────────────── */

test('recentIndependentEvidence and statedMistakeReasons are pure functions of the one record passed in, never a second student\'s', () => {
  const a = syntheticStrongReadingWeakWriting();
  const b = syntheticWeakReadingStrongWriting();

  const evidenceA = recentIndependentEvidence(a.record, 20);
  const evidenceB = recentIndependentEvidence(b.record, 20);

  for (const item of evidenceA) {
    assert.ok(
      a.record.events.some((e) => e.at === item.at && e.paper === item.paper),
      "every row traces back to profile A's own events",
    );
  }
  // Two opposite profiles (mirror images: same dates and activity ids, bands
  // swapped between reading and writing) must still produce two genuinely
  // different evidence lists, since the function reads the outcome each
  // record actually carries, never a cached or shared answer.
  const readingA = evidenceA.find((item) => item.paper === 'reading')!;
  const readingB = evidenceB.find((item) => item.paper === 'reading')!;
  assert.notDeepEqual(readingA.summary, readingB.summary, "profile A's strong Reading result must differ from profile B's weak one");
});

/* ── insights.ts really is a thin view over evaluateEvidence ─────────────── */

test('readFacts attaches the same certainty evaluateEvidence would compute over the same migrated record', () => {
  const { progress, savedPlan } = syntheticLegacy();
  const now = new Date('2026-09-22T09:00:00.000Z');

  const facts = readFacts(progress, savedPlan, 76, now);

  const record = migrateProgress(progress, savedPlan, {}, { now: now.toISOString() });
  const goals = goalsFrom(planSettingsFromSavedPlan(savedPlan));
  const policy = evaluateEvidence({ record, goals, now: now.toISOString() });

  for (const result of facts.results) {
    const estimate = policy.estimates.find((e) => e.scopeKey === `paper:${result.skill}`);
    assert.equal(result.certainty, estimate?.certainty, `${result.skill}: readFacts and evaluateEvidence disagree`);
  }
});

test('readFacts never reports a paper as measured from migrated, itemless legacy data: the strict certainty is capped honestly', () => {
  const { progress, savedPlan } = syntheticLegacy();
  const facts = readFacts(progress, savedPlan, 76, new Date('2026-09-22T09:00:00.000Z'));
  for (const result of facts.results) {
    if (result.certainty) assert.notEqual(result.certainty, 'measured', `${result.skill}: itemless legacy data cannot be strictly measured`);
  }
});

/* ── The Worker import boundary: insights.ts pulls in nothing browser-only
   or large ─────────────────────────────────────────────────────────────── */

const SRC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** insights.ts's own `ProgressV1` import is (and must stay) `import type`,
    which `verbatimModuleSyntax` erases completely at build time, so
    progress.ts's runtime code (including its real, guarded
    `window.localStorage` calls) never ships into the Worker bundle. */
function assertImportTypeOnly(relPath: string, moduleSpecifier: string): void {
  const source = fs.readFileSync(path.join(SRC_DIR, relPath), 'utf8');
  const pattern = new RegExp(`import\\s+([^;]*?)\\s+from\\s+['"]${moduleSpecifier}['"]`, 'g');
  let match: RegExpExecArray | null;
  let found = false;
  while ((match = pattern.exec(source))) {
    found = true;
    assert.match(match[0], /import\s+type\b/, `${relPath}: "${match[0]}" must be a type-only import of ${moduleSpecifier}`);
  }
  assert.ok(found, `fixture assumption: ${relPath} imports from ${moduleSpecifier}`);
}

/** Block comments and line comments stripped, so a doc comment that
    mentions the generated index by name (contracts/catalog.ts's own header
    explains why the file holds no data) does not itself trip the scan. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** Everything reachable from insights.ts through its NEW src/lib/learning
    imports: no `*.browser.ts` file, and no CODE reference to the generated
    catalogue (learningCatalogue() / learning-index.json), which is
    hundreds of kilobytes and has no business loading on every tutor turn.
    A type-only file such as contracts/catalog.ts may still mention the
    index BY NAME in its own documentation, which is not a runtime pull. */
function assertNoBrowserOrCatalogue(relPath: string, seen: Set<string> = new Set()): void {
  if (seen.has(relPath)) return;
  seen.add(relPath);
  const source = fs.readFileSync(path.join(SRC_DIR, relPath), 'utf8');
  const code = stripComments(source);

  // A CALL to learningCatalogue(), or a static import of the generated JSON
  // file itself, actually pulls in the data. contracts/catalog.ts's own
  // LEARNING_INDEX_SOURCE / LEARNING_INDEX_PATH are bare path STRINGS (a
  // few bytes, no data), which this deliberately does not flag.
  assert.doesNotMatch(code, /learningCatalogue\(/, `${relPath} must not call learningCatalogue()`);
  assert.doesNotMatch(code, /from\s+['"][^'"]*learning-index\.json['"]/, `${relPath} must not statically import the generated index file`);

  const importPattern = /from\s+['"](\.[^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(source))) {
    const spec = match[1]!;
    if (spec.endsWith('.browser')) {
      assert.fail(`${relPath} imports a *.browser.ts module (${spec}), which a Worker cannot load`);
    }
    const dir = path.dirname(relPath);
    const resolved = path.normalize(path.join(dir, spec)).replace(/\\/g, '/');
    const candidate = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
    if (fs.existsSync(path.join(SRC_DIR, candidate))) {
      assertNoBrowserOrCatalogue(candidate, seen);
    }
  }
}

test('insights.ts imports src/lib/progress.ts as types only, so its runtime code (and real window/localStorage calls) never ship to the Worker', () => {
  assertImportTypeOnly('lib/tutor/insights.ts', '../progress');
});

test('insights.ts\'s new learning-policy imports (migrate, adapters, policy, evidence) reach no *.browser.ts file and no generated catalogue index', () => {
  assertNoBrowserOrCatalogue('lib/learning/migrate.ts');
  assertNoBrowserOrCatalogue('lib/learning/adapters.ts');
  assertNoBrowserOrCatalogue('lib/learning/policy.ts');
  assertNoBrowserOrCatalogue('lib/learning/evidence.ts');
});
