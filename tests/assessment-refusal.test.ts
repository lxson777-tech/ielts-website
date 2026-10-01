/* A used-up allowance is a refusal, not an outage (review of the paid offer,
   1 October 2026: P1-2, P1-5, P1-6, P2-6, P2-9, P2-12). Builder S.

   What is held here:
   - every 'assessment-*' / 'allowance-*' code, and the trial and sign-in
     codes, is a refusal for all three grader clients and the live examiner;
     an outage code is not;
   - today's single code 'assessment-unavailable' is read through the
     server's own sentence, so its reason still reaches the student;
   - the messages say what happened and what to do, in English and Russian,
     with the date the next 30-day period starts;
   - "assessments left" shows nothing misleading and follows the server;
   - the open build keeps the live mock at 18 minutes and publishes no
     /speaking/recorded page. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ASSESSMENT_REFUSAL_CODES,
  ASSESSMENT_REFUSAL_REASONS,
  ALLOWANCE_REFUSAL_CODE,
  interviewGivenBackMessage,
  SERVER_SENTENCES,
  isAssessmentRefusalCode,
  refusalIsFinal,
  refusalKind,
  refusalMessage,
  refusalOffersPlans,
  type Translate,
} from '../src/components/access/assessment-refusal.ts';
import { isGraderRefusalCode, isLiveRefusalCode } from '../src/lib/writing/refusal-code.ts';
import { PAID_ALLOWANCE, assessmentBalance, parseTrialStatus, type TrialStatus } from '../src/lib/trial/status.ts';
import { PAID_AI_ALLOWANCE } from '../src/lib/access/plans.ts';
import { t as translate } from '../src/lib/i18n/translate.ts';
import { loadDictionary } from '../src/lib/i18n/dict/index.ts';
import { SALES_COPY } from '../src/marketing/sales-copy.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const NOW = Date.parse('2026-10-10T09:00:00Z');
const en: Translate = (text, vars, ctx) => translate(text, vars, ctx, 'en');
const ru: Translate = (text, vars, ctx) => translate(text, vars, ctx, 'ru');

/** A trial_status reply the way the server writes it. */
function status(extra: { paidEnds?: string; trial?: 'none' | 'active' | 'ended'; assessments?: Record<string, unknown> }): TrialStatus {
  const trial = extra.trial ?? 'none';
  const parsed = parseTrialStatus({
    state: trial,
    serverNow: new Date(NOW).toISOString(),
    ...(trial === 'none'
      ? {}
      : {
          startedAt: '2026-10-08T09:00:00Z',
          endsAt: trial === 'active' ? '2026-10-11T09:00:00Z' : '2026-10-09T09:00:00Z',
        }),
    paid: extra.paidEnds ? { planId: 'month-1', startsAt: '2026-10-01T09:00:00Z', endsAt: extra.paidEnds } : null,
    assessments: extra.assessments,
    sections: {},
  });
  assert.ok(parsed, 'the stand-in reply parses');
  return parsed;
}

/* ── Which codes are refusals ───────────────────────────────────────── */

test('every allowance, trial and sign-in code is a refusal for the graders and the live examiner', () => {
  for (const code of ['assessment-unavailable', 'assessment-used-up', 'assessment-mock-used-up', 'allowance-used', 'trial-ended', 'trial-test-used']) {
    assert.ok(isGraderRefusalCode(code), `grader: ${code}`);
    assert.ok(isLiveRefusalCode(code), `live: ${code}`);
  }
  assert.ok(isGraderRefusalCode('sign-in-required'));
  for (const code of ['', 'unavailable', 'busy', 'daily-limit', 'not-configured']) {
    assert.equal(isGraderRefusalCode(code), false, `outage, not a refusal: ${code}`);
    assert.equal(isLiveRefusalCode(code), false, `outage, not a refusal: ${code}`);
  }
  for (const code of Object.keys(ASSESSMENT_REFUSAL_CODES)) assert.ok(isAssessmentRefusalCode(code), code);
  assert.ok(isAssessmentRefusalCode('assessment-something-new'), 'an unknown assessment-* code is still a refusal');
  assert.equal(isAssessmentRefusalCode('trial-test-used'), false, 'the trial test codes keep their own sentences');
});

test("the server's reason picks the sentence: Builder M's six reasons", () => {
  const code = ALLOWANCE_REFUSAL_CODE;
  assert.equal(refusalKind(code, '', 'allowance-used'), 'used-up');
  assert.equal(refusalKind(code, '', 'mock-allowance-used'), 'mock-used-up');
  assert.equal(refusalKind(code, '', 'placement-used'), 'placement-taken');
  assert.equal(refusalKind(code, '', 'trial-ended'), 'trial-ended');
  assert.equal(refusalKind(code, '', 'paid-required'), 'paid-required');
  assert.equal(refusalKind(code, '', 'daily-limit'), 'daily-limit');
  /* Every reason the server can send has a sentence here. */
  const server = read('src/lib/access/assessment.ts');
  const block = server.slice(server.indexOf('const REFUSAL_MESSAGES'), server.indexOf('};', server.indexOf('const REFUSAL_MESSAGES')));
  const reasons = [...block.matchAll(/^\s*'([a-z-]+)':/gm)].map((m) => m[1]);
  assert.ok(reasons.length >= 6, reasons.join(','));
  for (const reason of reasons) assert.ok(reason in ASSESSMENT_REFUSAL_REASONS, `reason with no sentence: ${reason}`);
  /* The reason wins over the generic sentence. */
  assert.equal(refusalKind(code, 'Your assessment allowance is used. Your lessons, practice and saved results are still available.', 'mock-allowance-used'), 'mock-used-up');
});

test('a given-back interview is said as given back, per allowance, in both languages', async () => {
  assert.match(interviewGivenBackMessage('practice', en), /does not count as one of your live interviews/);
  assert.match(interviewGivenBackMessage('mock', en), /full mock exams/);
  assert.match(interviewGivenBackMessage('placement', en), /placement interview is still yours/);
  await loadDictionary('ru');
  for (const purpose of ['practice', 'mock', 'placement']) {
    assert.notEqual(interviewGivenBackMessage(purpose, ru), interviewGivenBackMessage(purpose, en), purpose);
  }
  const link = read('src/lib/speaking/live/link.ts');
  assert.match(link, /answer\?\.interviewGivenBack === true/);
  assert.match(read('src/components/LiveExaminer.tsx'), /onInterviewGivenBack: \(purpose\) => \{/);
});

test("a reply without a reason is read through the server's sentence; an unknown one falls back to its words", () => {
  for (const [sentence, kind] of Object.entries(SERVER_SENTENCES)) {
    assert.equal(refusalKind(ALLOWANCE_REFUSAL_CODE, sentence), kind, sentence);
  }
  /* The exact sentences src/lib/access/assessment.ts sends today. */
  const server = read('src/lib/access/assessment.ts');
  for (const sentence of Object.keys(SERVER_SENTENCES)) {
    assert.ok(server.includes(sentence.replace(/'/g, "\\'")), `assessment.ts still sends: ${sentence}`);
  }
  assert.equal(refusalKind(ALLOWANCE_REFUSAL_CODE, 'Something else entirely.'), 'other');
  assert.equal(refusalKind('assessment-used-up'), 'used-up');
  assert.equal(refusalKind('assessment-mock-used-up'), 'mock-used-up');
  assert.equal(refusalKind('assessment-placement-taken'), 'placement-taken');
  assert.equal(refusalKind('assessment-new-reason', 'Server words.'), 'other');
});

test('a used-up allowance offers the Plans page and no retry; a daily limit offers a retry', () => {
  assert.ok(refusalIsFinal('used-up') && refusalOffersPlans('used-up'));
  assert.ok(refusalIsFinal('mock-used-up') && refusalOffersPlans('mock-used-up'));
  assert.ok(refusalIsFinal('placement-taken'));
  assert.ok(refusalIsFinal('trial-ended') && refusalOffersPlans('trial-ended'));
  assert.equal(refusalIsFinal('daily-limit'), false);
  assert.equal(refusalIsFinal('already-requested'), false);
  assert.equal(refusalIsFinal('other'), false);
});

/* ── The messages ───────────────────────────────────────────────────── */

const paidNoQueue = () =>
  status({ paidEnds: '2026-10-31T09:00:00Z', assessments: { writingUsed: 12, speakingUsed: 6, liveUsed: 2, mockUsed: 2, endsAt: '2026-10-31T09:00:00Z' } });
const paidQueued = () =>
  status({ paidEnds: '2026-11-30T09:00:00Z', assessments: { writingUsed: 12, endsAt: '2026-10-31T09:00:00Z' } });

test('paid essays used up: says so plainly, when the period ends, and that the essay is kept', () => {
  const text = refusalMessage({ kind: 'used-up', what: 'writing' }, paidNoQueue(), NOW, en, 'en');
  assert.match(text, /You have used all 12 essay assessments in this 30-day period\./);
  assert.match(text, /This 30-day period ends on 31 October 2026\./);
  assert.match(text, /Plans page/);
  assert.match(text, /Your essay is safe on this page\./);
  assert.doesNotMatch(text, /could not reach|try again in a minute/i);
});

test('a next period already bought: the date it starts with a fresh set', () => {
  const text = refusalMessage({ kind: 'used-up', what: 'writing' }, paidQueued(), NOW, en, 'en');
  assert.match(text, /Your next 30-day period starts on 31 October 2026, with a fresh set of assessments\./);
});

test('recordings, interviews, mocks and the placement each get their own sentence', () => {
  const s = paidNoQueue();
  assert.match(refusalMessage({ kind: 'used-up', what: 'speaking' }, s, NOW, en, 'en'), /all 6 recorded Speaking assessments/);
  assert.match(refusalMessage({ kind: 'used-up', what: 'speaking' }, s, NOW, en, 'en'), /recorded answers are still on this page/);
  assert.match(refusalMessage({ kind: 'used-up', what: 'live' }, s, NOW, en, 'en'), /both live interviews/);
  assert.match(refusalMessage({ kind: 'used-up', what: 'mock' }, s, NOW, en, 'en'), /both full mock exams/);
  assert.match(refusalMessage({ kind: 'mock-used-up', what: 'mock' }, s, NOW, en, 'en'), /this Speaking interview cannot start/);
  assert.match(refusalMessage({ kind: 'placement-taken', what: 'placement' }, s, NOW, en, 'en'), /once per account/);
  assert.match(refusalMessage({ kind: 'used-up', what: 'placement' }, s, NOW, en, 'en'), /all 12 essay assessments/);
});

test("a trial's one assessment, an ended trial, and the server's own words", () => {
  const trial = status({ trial: 'active', assessments: { trialUsed: 1 } });
  assert.match(refusalMessage({ kind: 'used-up', what: 'writing' }, trial, NOW, en, 'en'), /one trial AI assessment has been used/);
  assert.match(refusalMessage({ kind: 'trial-ended', what: 'speaking' }, null, NOW, en, 'en'), /Your trial has ended/);
  assert.equal(
    refusalMessage({ kind: 'other', what: 'live', serverMessage: 'A brand new reason.' }, null, NOW, en, 'en'),
    'A brand new reason.',
  );
  assert.match(refusalMessage({ kind: 'other', what: 'live' }, null, NOW, en, 'en'), /Nothing was used/);
});

test('every refusal message is in Russian, with the date in Russian (P2-12)', async () => {
  await loadDictionary('ru');
  const s = paidNoQueue();
  const used = refusalMessage({ kind: 'used-up', what: 'writing' }, s, NOW, ru, 'ru');
  assert.match(used, /Вы использовали все 12 проверок эссе/);
  assert.match(used, /31 октября 2026\./);
  assert.doesNotMatch(used, /г\.\./, 'no double full stop after a Russian date');
  assert.match(used, /Ваше эссе сохранено/);
  const queued = refusalMessage({ kind: 'used-up', what: 'writing' }, paidQueued(), NOW, ru, 'ru');
  assert.match(queued, /Следующий 30-дневный период начнётся 31 октября 2026/);
  for (const kind of ['used-up', 'mock-used-up', 'placement-taken', 'trial-ended', 'daily-limit', 'paid-required', 'already-requested', 'unknown-session', 'other'] as const) {
    for (const what of ['writing', 'speaking', 'live', 'feedback', 'mock', 'placement'] as const) {
      const english = refusalMessage({ kind, what }, s, NOW, en, 'en');
      const russian = refusalMessage({ kind, what }, s, NOW, ru, 'ru');
      assert.notEqual(russian, english, `${kind}/${what} has Russian`);
      assert.doesNotMatch(russian, /[a-z]{4,} [a-z]{4,} [a-z]{4,}/, `${kind}/${what} has no English sentence left: ${russian}`);
    }
  }
  /* The Workers' own English, shown through the fallback, is Russian too. */
  for (const sentence of Object.keys(SERVER_SENTENCES)) {
    assert.notEqual(ru(sentence), sentence, `Russian for the server's: ${sentence}`);
  }
});

/* ── Assessments left ───────────────────────────────────────────────── */

test('assessments left: nothing for no access or an ended trial; the server counts for paid access', () => {
  assert.equal(assessmentBalance(null, NOW).kind, 'none');
  assert.equal(assessmentBalance(status({ assessments: {} }), NOW).kind, 'none', 'signed in, no trial, no access');
  assert.equal(assessmentBalance(status({ trial: 'ended', assessments: { trialUsed: 0 } }), NOW).kind, 'none', 'ended trial');
  assert.equal(assessmentBalance(status({ paidEnds: '2026-10-05T09:00:00Z', assessments: { writingUsed: 1 } }), NOW).kind, 'none', 'ended paid access');
  const paid = assessmentBalance(
    status({ paidEnds: '2026-10-31T09:00:00Z', assessments: { writingUsed: 3, speakingUsed: 1, liveUsed: 2, mockUsed: 1, endsAt: '2026-10-31T09:00:00Z' } }),
    NOW,
  );
  assert.deepEqual(paid, { kind: 'paid', writing: 9, speaking: 5, live: 0, mock: 1, placementTaken: false, periodEndsAt: '2026-10-31T09:00:00Z', nextPeriodStartsAt: null });
});

test('the balance fields the client expects are read, including placement as a count or a flag', () => {
  const a = status({ paidEnds: '2026-10-31T09:00:00Z', assessments: { mockUsed: 2, placementUsed: 1 } }).assessments!;
  assert.equal(a.mockUsed, 2);
  assert.equal(a.placementTaken, true);
  assert.equal(status({ assessments: { placementUsed: true } }).assessments!.placementTaken, true);
  assert.equal(status({ assessments: {} }).assessments!.placementTaken, false);
  assert.equal(status({ assessments: { mockUsed: 'two' } }).assessments!.mockUsed, 0, 'a malformed count is zero, never a guess');
});

test('the shown allowance is the approved one, word for word with the offer', () => {
  assert.deepEqual(PAID_ALLOWANCE, { writing: 12, speaking: 6, live: 2, mock: 2 });
  assert.match(PAID_AI_ALLOWANCE, /12 essay assessments, 6 recorded Speaking assessments \(up to 5 minutes each\), and 2 live interviews/);
});

/* ── The screens use it ─────────────────────────────────────────────── */

test('every assessment screen words a refusal instead of "could not reach the service"', () => {
  for (const file of [
    'src/components/WritingTester.tsx',
    'src/components/SpeakingTester.tsx',
    'src/components/LiveExaminer.tsx',
    'src/components/placement/PlacementWriting.tsx',
  ]) {
    const src = read(file);
    assert.match(src, /isAssessmentRefusalCode\(/, `${file} recognises allowance refusals`);
    assert.match(src, /refusalMessage\(/, `${file} words them`);
  }
  assert.match(read('src/lib/speaking/grader.ts'), /isGraderRefusalCode\(code\)\) throw new GraderRefusal/);
  assert.match(read('src/lib/speaking/live/grade.ts'), /isGraderRefusalCode\(code\)\) throw new GraderRefusal/);
  assert.match(read('src/lib/writing/grader.ts'), /isGraderRefusalCode\(code\)\) throw new GraderRefusal/);
});

test('the paid counts are asked again after a graded essay or recording (P2-6)', () => {
  assert.match(read('src/components/WritingTester.tsx'), /if \(trialTest\.active \|\| isTrialBuild\(\)\) void refreshTrial\(\)/);
  assert.match(read('src/components/SpeakingTester.tsx'), /if \(trialTest\.active \|\| isTrialBuild\(\)\) void refreshTrial\(\)/);
});

test('the placement test and mock exams say what they use before starting (P1-6)', () => {
  assert.match(read('src/components/placement/Placement.tsx'), /<AllowanceNote use="placement" \/>/);
  assert.match(read('src/components/placement/PlacementWriting.tsx'), /<AllowanceNote use="placement-writing" \/>/);
  assert.match(read('src/components/placement/PlacementSpeaking.tsx'), /<AllowanceNote use="placement-speaking" \/>/);
  const mock = read('src/components/MockExam.tsx');
  assert.match(mock, /<AllowanceNote use="mock" \/>/);
  assert.match(mock, /<AllowanceNote use="mock-speaking" \/>/);
  assert.match(mock, /mockSpeakingAllowed\(usePaidBalance\(\)\)/);
  const note = read('src/components/access/AllowanceNote.tsx');
  assert.match(note, /if \(!isTrialBuild\(\) \|\| trial\.phase !== 'ready'\) return null;/, 'nothing on the open site');
});

test('no "Your result is saved" where an interrupted assessment has no result (P1-5)', () => {
  const block = read('src/components/trial/TrialBlock.tsx');
  const used = block.slice(block.indexOf("case 'assessment-used':"), block.indexOf("case 'checking':"));
  assert.doesNotMatch(used, /result is saved/i);
  assert.match(used, /INTERRUPTED_GIVEN_BACK/);
});

/* ── The open build is today's live site (P2-9) ─────────────────────── */

/* Lesson help buttons follow the PUBLISHED rule on main (d0491ff, 30
   September): signed-in students only, on every build. That rule has its own
   tests (tests/help-signed-in-only.test.ts); this one only checks that the
   part-of-lesson scroll still runs for everyone. */
test('the open build keeps its 18-minute live mock, its part-of-lesson scroll and no recorded Speaking page', () => {
  assert.match(read('src/components/LiveExaminer.tsx'), /const HARD_STOP_MS = \(isTrialBuild\(\) \? 15 : 18\) \* 60_000;/);
  const help = read('src/components/learning/lesson-block-help.ts');
  const mount = help.slice(help.indexOf('stampBlockIds(root, options.ids);'), help.indexOf('/** Take every control this module made out of'));
  assert.doesNotMatch(mount, /\breturn;/, 'no early return skips the part-of-lesson scroll');
  assert.match(mount, /scrollToHashBlock\(root\);\r?\n\}/, 'the scroll is the last thing, for everyone');
  assert.match(read('src/pages/speaking/[gatedPage].astro'), /isTrialBuild\(\) \? \[\{ params: \{ gatedPage: 'recorded' \} \}\] : \[\]/);
  assert.match(read('src/pages/trainers/speaking.astro'), /\{gated && \(\s*\/\*[\s\S]*?\*\/\s*<a href=\{withBase\('\/speaking\/examiner'\)\}/);
  assert.match(read('src/layouts/LessonLayout.astro'), /if \(isTrialBuild\(\)\) onOwnerChange\(\(\) => refreshLessonBlocks\(\)\);/);
  /* The open site's live session request is byte-for-byte what it was. */
  assert.match(read('src/components/LiveExaminer.tsx'), /purpose: isTrialBuild\(\) \? \(placement \? 'placement' : mock \? 'mock' : undefined\) : undefined,/);
});

test('the refund answer says no refunds after purchase, in both languages (P2-10)', () => {
  // Wording settled by the free-account website (Builder W, 1 October 2026).
  assert.match(SALES_COPY['faq.refund.a'].en, /^No\. Payments are not refunded after purchase\./);
  assert.match(SALES_COPY['faq.refund.a'].ru, /^Нет\. После покупки деньги не возвращаются\./);
});
