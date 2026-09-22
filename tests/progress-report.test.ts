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
import {
  skillTrendPanels,
  paperNarratives,
  recentIndependentEvidence,
  statedMistakeReasons,
  selfReportedScores,
  IGNORED_REASONS,
} from '../src/components/reportTrends.ts';
import { readFacts, confidenceFromCertainty } from '../src/lib/tutor/insights.ts';
import { recordSelfReportedScore } from '../src/lib/learning/evidence.ts';
import { formatDate } from '../src/lib/tutor/ru.ts';
import { t } from '../src/lib/i18n/translate.ts';
import { loadDictionary } from '../src/lib/i18n/dict/index.ts';
import { QUESTION_TYPE_LABEL } from '../src/lib/tests/question-types.ts';

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

/* ── A self-reported score reaches the report, named and dated ───────────── */

/* The fix round's item 7, reproduced. A tester saved a Speaking 6.5 taken on
   15 August 2026 through the real "Add a recent score, if you have one"
   control in plan settings. It was on the learner record, and /report showed
   neither the words "self-reported" nor that date anywhere.
   `recordSelfReportedScore` is the same function that control saves through
   (store.browser.ts's recordSelfReported calls it), so the row below is
   identical to the one the tester produced, down to its derived id. */
const CLAIM = { paper: 'speaking' as const, band: 6.5, takenOn: '2026-08-15', reportedAt: '2026-09-22T02:18:31.338Z' };

/** The tester's exact row, byte for byte: the id is derived from the paper,
    band and date, so reproducing the input reproduces the id. If this ever
    fails, the test has stopped reproducing the real saved shape. */
const CLAIM_ID = 'self:eb60063801bba76245a04b7a37647eb6';

test('the self-reported row this suite uses is the same shape the real plan-settings control saves', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const record = recordSelfReportedScore(profile.record, CLAIM);
  assert.deepEqual(record.selfReported, [{ ...CLAIM, id: CLAIM_ID }]);
});

test('a self-reported Speaking 6.5 taken on 2026-08-15 reaches the report named as self-reported and carrying that date', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const record = recordSelfReportedScore(profile.record, CLAIM);
  const policy = evaluateEvidence({ record, goals: profile.goals, now: profile.now });

  const reported = selfReportedScores(policy);
  assert.equal(reported.length, 1, 'the score saved on the learner record must reach the report');
  assert.deepEqual(reported[0], { paper: 'speaking', band: 6.5, takenOn: '2026-08-15', reportedAt: CLAIM.reportedAt });

  // The date is the student's own, unchanged, and readable in both
  // languages through the site's shared formatter. Only the parts are
  // pinned, not the word order: how a locale orders day, month and year is
  // formatDate's business (src/lib/tutor/ru.ts), not this report's.
  const english = formatDate(reported[0]!.takenOn, 'en');
  for (const part of ['15', 'August', '2026']) {
    assert.ok(english.includes(part), `the English date must carry ${part}, got "${english}"`);
  }
  const russian = formatDate(reported[0]!.takenOn, 'ru');
  assert.ok(russian.includes('2026'), `the Russian date must carry the year, got "${russian}"`);
  assert.notEqual(russian, english, 'a Russian page must not be handed the English date string');
});

test('a record with no self-reported score produces no self-reported output at all: nothing is invented to fill the block', () => {
  for (const profile of [syntheticNew(), syntheticStrongReadingWeakWriting(), syntheticWeakReadingStrongWriting()]) {
    const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
    assert.deepEqual(selfReportedScores(policy), [], `${profile.name}: no claim on record means no claim on the report`);
  }
});

test('the learner record and the plan goals agree: the same claim reaches the report whichever of the two the student\'s score was saved to', () => {
  const profile = syntheticStrongReadingWeakWriting();

  // Side one: what the real control writes (the learner record).
  const fromRecord = evaluateEvidence({
    record: recordSelfReportedScore(profile.record, CLAIM),
    goals: profile.goals,
    now: profile.now,
  });
  // Side two: the older place the same kind of claim can sit (plan goals).
  const fromGoals = evaluateEvidence({
    record: profile.record,
    goals: { ...profile.goals, selfReported: [CLAIM] },
    now: profile.now,
  });

  assert.deepEqual(selfReportedScores(fromRecord), selfReportedScores(fromGoals));
  assert.equal(selfReportedScores(fromRecord).length, 1);
});

test('a self-reported score is never averaged into a measured number, never a trend, and never satisfies a requirement', () => {
  // Nothing measured anywhere, a confirmed target of 7, and a claim of 6.5
  // for Speaking. The claim may be shown; it may not settle anything.
  const profile = syntheticNew({ goals: { overallTarget: { band: 7, status: 'confirmed' } } });
  const record = recordSelfReportedScore(profile.record, CLAIM);
  const policy = evaluateEvidence({ record, goals: profile.goals, now: profile.now });

  const speaking = skillTrendPanels(policy).find((panel) => panel.paper === 'speaking')!;
  assert.equal(speaking.certainty, 'self-reported', 'the claim is labelled as the student\'s own account, never as measured');
  assert.equal(speaking.trend, null, 'one number the student told us is not a trend');
  assert.equal(speaking.independentOccasions, 0, 'a claim is not an occasion of work done here');
  assert.equal(speaking.meetsRequirement, false, 'a self-reported 6.5 never satisfies a target of 7');

  const gap = policy.gaps.find((entry) => entry.scopeKey === 'paper:speaking')!;
  assert.equal(gap.shortfall, null, 'the distance to a target cannot be computed from a claim');
  assert.equal(gap.meetsRequirement, false);

  assert.equal(policy.overall, null, 'the four papers are never averaged into one line, least of all from a claim');

  // And the paper's own narrative says so in plain words.
  const narrative = paperNarratives(policy, planWithHistory([]), null).find((entry) => entry.paper === 'speaking')!;
  assert.ok(
    narrative.uncertain.some((line) => /self-reported/i.test(line.template)),
    'the report must say out loud that Speaking rests on a self-reported score only',
  );
});

test('the report renders a self-reported date through the shared locale-aware formatter, never a hand-rolled English one', () => {
  const source = fs.readFileSync(fileURLToPath(new URL('../src/components/ProgressReport.tsx', import.meta.url)), 'utf8');

  assert.match(source, /import\s*\{\s*formatDate\s*\}\s*from\s*'\.\.\/lib\/tutor\/ru'/, 'the shared date helper must be imported');

  // The self-reported rows are the ones this item is about: each of their
  // two date holes goes through formatDate, not through the page's own
  // en-GB fmtDate (a Russian page must not be handed an English date).
  for (const template of ['{paper}: band {band}, taken {date}', 'Overall: band {band}, taken {date}']) {
    const at = source.indexOf(template);
    assert.ok(at > -1, `the self-reported row "${template}" is no longer rendered`);
    const row = source.slice(at, at + 240);
    assert.match(row, /formatDate\(/, `the "${template}" row still formats its date by hand`);
    assert.doesNotMatch(row, /fmtDate\(/, `the "${template}" row uses the page's English-only fmtDate`);
  }
});

/* ── /report in Russian: nothing the tester found is English any more ─────── */

/* A tester read the whole site at ?lang=ru on a 390px phone and wrote down
   what was still in English on /report. Each string below is one of those
   findings. The report is a React tree and these tests run under plain
   node:test with no DOM, so the two halves are checked where they actually
   live: the WORDS against the real dictionary (which is what `t()` reads),
   and the WIRING against the component's own source. A string that is
   translated but not routed through `t()`, or routed but not translated,
   fails one half or the other. */

const REPORT_SOURCE = fs.readFileSync(
  fileURLToPath(new URL('../src/components/ProgressReport.tsx', import.meta.url)),
  'utf8',
);
const REPORT_PAGE_SOURCE = fs.readFileSync(
  fileURLToPath(new URL('../src/pages/report.astro', import.meta.url)),
  'utf8',
);

/** Everything the tester recorded as still-English interface text on
    /report, with the surface it appears on. */
const TESTER_FINDINGS: { text: string; where: string }[] = [
  // The page's own subtitle, marked in three pieces because it carries a
  // link in the middle (report.astro).
  { text: 'Everything from your', where: "the page subtitle's first clause" },
  { text: 'account page', where: 'the link inside the page subtitle' },
  { text: 'laid out for printing or saving as a PDF.', where: "the page subtitle's last clause" },
  // The four paper names, as bare section headings and row labels.
  { text: 'Reading', where: 'a bare paper heading' },
  { text: 'Listening', where: 'a bare paper heading' },
  { text: 'Writing', where: 'a bare paper heading' },
  { text: 'Speaking', where: 'a bare paper heading' },
  { text: 'Vocabulary', where: 'the lessons-per-skill table' },
  // The subskill labels that are NOT exam vocabulary: what an evidence row
  // says when the activity was a whole one with no single subskill.
  { text: 'full paper', where: 'an evidence row for a whole Reading or Listening paper' },
  { text: 'essay', where: 'an evidence row for a whole graded essay' },
  { text: 'speaking part', where: 'an evidence row for a whole graded Speaking answer' },
];

/** The exam's own words, which must still be English inside the Russian
    view: every question type name describeSubskill can produce (hyphens
    undone, as it produces them), plus the criterion names. A student has to
    recognise these exact words on the real paper. */
const EXAM_WORDS: string[] = [
  ...Object.keys(QUESTION_TYPE_LABEL).map((type) => type.replace(/-/g, ' ')),
  ...Object.values(QUESTION_TYPE_LABEL),
  'task response',
  'task achievement',
  'coherence and cohesion',
  'lexical resource',
  'grammatical range',
];

test('every interface string the tester found in English on /report has real Russian', async () => {
  await loadDictionary('ru');
  const stillEnglish: string[] = [];
  for (const { text, where } of TESTER_FINDINGS) {
    const russian = t(text, undefined, undefined, 'ru');
    if (russian === text) {
      stillEnglish.push(`"${text}" (${where}) has no Russian in the dictionary`);
      continue;
    }
    if (!/[Ѐ-ӿ]/.test(russian)) {
      stillEnglish.push(`"${text}" (${where}) translates to "${russian}", which is not Russian`);
    }
  }
  assert.deepEqual(stillEnglish, [], `Still English on the Russian /report:\n  ${stillEnglish.join('\n  ')}`);

  // And English is untouched: the literal in the source is what an English
  // student still reads, byte for byte.
  for (const { text } of TESTER_FINDINGS) {
    assert.equal(t(text, undefined, undefined, 'en'), text, `English must be unchanged for "${text}"`);
  }
});

test("the exam's own names for its question types and criteria are still English inside the Russian report", async () => {
  await loadDictionary('ru');
  const translated: string[] = [];
  for (const word of EXAM_WORDS) {
    const russian = t(word, undefined, undefined, 'ru');
    if (russian !== word) translated.push(`"${word}" became "${russian}", but a student must recognise it on the real paper`);
  }
  assert.deepEqual(translated, [], `Exam wording was translated:\n  ${translated.join('\n  ')}`);
});

test('every paper name and subskill label on the report is routed through t(), not rendered raw', () => {
  /* The words above are useless if the component never asks for them. Every
     SKILL_LABEL read and every subskillLabel read has to be wrapped, and
     the old "translate vocabulary only, leave the four papers raw" branch
     must be gone. */
  const rawLabelReads = [...REPORT_SOURCE.matchAll(/(.{0,8})SKILL_LABEL\[/g)].filter(
    (m) => !/t\($/.test(m[1]!) && !/^const |^: Record/.test(m[1]!.trimStart()),
  );
  assert.deepEqual(
    rawLabelReads.map((m) => m[0]),
    [],
    'a SKILL_LABEL lookup is rendered without t() around it',
  );

  for (const match of REPORT_SOURCE.matchAll(/item\.subskillLabel \?(.{0,60})/g)) {
    assert.match(match[1]!, /t\(item\.subskillLabel\)/, 'an evidence row renders its subskill label without t()');
  }

  // The four paper names are marked with nt() so the i18n coverage scanner
  // can find them here, since the lookup itself is by variable.
  for (const paper of ['Reading', 'Listening', 'Writing', 'Speaking', 'Vocabulary']) {
    assert.match(REPORT_SOURCE, new RegExp(`nt\\('${paper}'\\)`), `SKILL_LABEL must mark ${paper} with nt()`);
  }
});

test("the report page's subtitle is marked for translation in pieces that keep the English word order", () => {
  for (const { text } of TESTER_FINDINGS.slice(0, 3)) {
    assert.ok(
      REPORT_PAGE_SOURCE.includes(`data-i18n>${text}<`),
      `the subtitle clause "${text}" is not marked with data-i18n`,
    );
  }
  // Marked in three pieces, in the English order, so an English reader sees
  // exactly the sentence that was there before.
  const rendered = [...REPORT_PAGE_SOURCE.matchAll(/data-i18n[^>]*>([^<]+)</g)].map((m) => m[1]!);
  const subtitle = rendered.slice(-3).join(' ');
  assert.equal(subtitle, 'Everything from your account page laid out for printing or saving as a PDF.');
});

/* ── Dates: correct in both languages, and one formatter for the page ─────── */

test('the report holds no date formatter of its own: every date goes through the shared locale-aware helper', () => {
  assert.doesNotMatch(
    REPORT_SOURCE,
    /toLocaleDateString/,
    'ProgressReport.tsx must not format a date by hand: that is what gave a Russian student "19 Sept 2026"',
  );
  // The old helper is gone, name and all, so nothing can quietly call it again.
  assert.doesNotMatch(REPORT_SOURCE, /\bfmtDate\(/, 'the hand-rolled fmtDate must no longer be called');

  /* Every date the page renders now passes the reader's locale along with
     it. The pattern allows one level of nested parentheses, because one
     call site is formatDate(new Date().toISOString(), locale). */
  const dateCalls = [...REPORT_SOURCE.matchAll(/formatDate\((?:[^()]|\([^()]*\))*\)/g)].map((m) => m[0]);
  assert.ok(dateCalls.length >= 6, `expected every date row to call formatDate, found ${dateCalls.length}`);
  for (const call of dateCalls) {
    assert.match(call, /,\s*locale\)/, `${call} does not pass the reader's locale`);
  }
});

test('the shared date helper writes the day first in English, agreeing with the rest of the site', () => {
  // en-GB, like ScoreHistory, WritingHistory, SpeakingHistory and
  // SavedItems all ask for. A bare 'en' gave United States order
  // ("August 15, 2026") on a site whose every other date is day-first.
  assert.equal(formatDate('2026-08-15', 'en'), '15 August 2026');
  assert.equal(formatDate('2026-09-19', 'en'), '19 September 2026');
  assert.doesNotMatch(formatDate('2026-08-15', 'en'), /^August/, 'United States order is not this site\'s order');
});

test('the shared date helper writes a real Russian date, with no English month and no year marker', () => {
  assert.equal(formatDate('2026-09-19', 'ru'), '19 сентября 2026');
  assert.equal(formatDate('2026-08-15', 'ru'), '15 августа 2026');
  for (const month of ['Sept', 'September', 'Aug', 'August']) {
    assert.ok(!formatDate('2026-09-19', 'ru').includes(month), `a Russian date must not carry "${month}"`);
  }
  // Nonsense in, something readable out, in both languages.
  assert.equal(formatDate('not-a-date', 'ru'), 'not-a-date');
  assert.equal(formatDate('not-a-date', 'en'), 'not-a-date');
});

test('every date the report can actually render is right in both languages, for a real synthetic learner', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const record = recordSelfReportedScore(profile.record, CLAIM);
  const policy = evaluateEvidence({ record, goals: profile.goals, now: profile.now });

  const dates = [
    ...recentIndependentEvidence(record, 20).map((item) => item.at),
    ...statedMistakeReasons(record, 20).map((item) => item.at),
    ...selfReportedScores(policy).map((score) => score.takenOn),
  ];
  assert.ok(dates.length > 0, 'the fixture must give the report some dated rows to check');

  for (const iso of dates) {
    const english = formatDate(iso, 'en');
    const russian = formatDate(iso, 'ru');
    const [year, month, day] = iso.slice(0, 10).split('-') as [string, string, string];

    for (const written of [english, russian]) {
      assert.ok(written.includes(year), `${iso}: "${written}" lost the year`);
      assert.ok(written.includes(String(Number(day))), `${iso}: "${written}" lost the day`);
      assert.ok(!written.includes(month === '09' ? '09' : `-${month}`), `${iso}: "${written}" still looks like a raw key`);
    }
    assert.match(russian, /[Ѐ-ӿ]/, `${iso}: the Russian date "${russian}" has no Russian in it`);
    assert.notEqual(russian, english, `${iso}: a Russian page must not be handed "${english}"`);
    // Day first in both, which is the order this site uses.
    assert.ok(english.startsWith(String(Number(day))), `${iso}: English "${english}" is not day first`);
    assert.ok(russian.startsWith(String(Number(day))), `${iso}: Russian "${russian}" is not day first`);
  }
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

test('recentIndependentEvidence never renders the evidence layer\'s whole-activity placeholder as a subskill', () => {
  // A confirmed Reading paper, a graded Writing essay, a Listening paper and
  // a graded Speaking answer are all WHOLE activities: the evidence layer
  // files each one under WHOLE_ACTIVITY_SUBSKILL ('timing-strategy') because
  // a forty-question paper does not have one subskill. The fix round's bug:
  // that internal placeholder used to reach the progress report verbatim,
  // reading as "Reading, timing strategy, 24 of 40" as if it were a taught
  // skill. It must now read as the kind of activity it was instead.
  const profile = syntheticStrongReadingWeakWriting();
  const evidence = recentIndependentEvidence(profile.record, 20);
  assert.ok(evidence.length >= 4, 'the fixture has whole-activity evidence across every paper to check');

  for (const item of evidence) {
    assert.notEqual(item.subskillLabel, 'timing-strategy', `${item.paper} at ${item.at}: the raw placeholder leaked`);
    assert.notEqual(item.subskillLabel, 'timing strategy', `${item.paper} at ${item.at}: the hyphen-undone placeholder leaked`);
  }

  const reading = evidence.find((item) => item.paper === 'reading');
  assert.equal(reading?.subskillLabel, 'full paper', 'a whole Reading paper reads as a full paper');
  const listening = evidence.find((item) => item.paper === 'listening');
  assert.equal(listening?.subskillLabel, 'full paper', 'a whole Listening paper reads as a full paper');
  const writing = evidence.find((item) => item.paper === 'writing');
  assert.equal(writing?.subskillLabel, 'essay', 'a whole graded essay reads as an essay');
  const speaking = evidence.find((item) => item.paper === 'speaking');
  assert.equal(speaking?.subskillLabel, 'speaking part', 'a whole graded Speaking answer reads as a speaking part');
});

test('the whole-activity placeholder cannot reach the report in either language, and the three words that replace it are Russian in Russian', async () => {
  await loadDictionary('ru');

  /* Two ways the internal placeholder could surface now that these labels
     go through t(): the label itself could leak (the bug already fixed
     above), or a translation could be keyed to the leaked spelling and so
     quietly legitimise it. Neither is allowed, in either language. */
  const banned = ['timing-strategy', 'timing strategy'];
  for (const profile of [syntheticNew(), syntheticStrongReadingWeakWriting(), syntheticWeakReadingStrongWriting()]) {
    const rows = [
      ...recentIndependentEvidence(profile.record, 20),
      ...statedMistakeReasons(profile.record, 20),
    ];
    for (const row of rows) {
      if (!row.subskillLabel) continue;
      for (const locale of ['en', 'ru'] as const) {
        const rendered = t(row.subskillLabel, undefined, undefined, locale);
        for (const leak of banned) {
          assert.ok(
            !rendered.includes(leak),
            `${profile.name} (${locale}): an evidence row rendered "${rendered}", which carries the internal placeholder`,
          );
        }
      }
    }
  }
  for (const leak of banned) {
    assert.equal(t(leak, undefined, undefined, 'ru'), leak, `"${leak}" must have no dictionary entry: it is never shown`);
  }

  // The three words that stand in for it instead do have real Russian.
  assert.equal(t('full paper', undefined, undefined, 'ru'), 'полный тест');
  assert.equal(t('essay', undefined, undefined, 'ru'), 'эссе');
  assert.match(t('speaking part', undefined, undefined, 'ru'), /[Ѐ-ӿ]/);
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
