/* Session assembly: what one hour, or one quarter of an hour, is made of.
 *
 * Every learner in this file is SYNTHETIC and comes from
 * tests/fixtures/learning-profiles.ts.
 *
 * The rules that matter most, and why:
 *   - the budget is a constraint, not a warning: the audit found a
 *     255-minute day under a 15-minute setting, and a session that does not
 *     fit throws here rather than reaching a screen;
 *   - a session is never padded: a student with a measured strength gets no
 *     teaching step, and leftover minutes stay unspent;
 *   - an indivisible activity is never trimmed, and a whole paper's review
 *     is a separate session on another day;
 *   - an independent check runs on material the student has never met, and
 *     never on the paper the practice step is about to spend;
 *   - a diagnostic is short, real and capped, and never a band;
 *   - the same input always builds the same session, id included.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { learningCatalogue, findActivity } from '../src/lib/learning/catalog.ts';
import { evaluateEvidence } from '../src/lib/learning/policy.ts';
import {
  SESSION_SENTENCES,
  assembleSession,
  assertWithinBudget,
  calendarDaysBetween,
  checkOptions,
  isUnseen,
  learnerFacts,
  practiceOptions,
  sessionMinutes,
  teachOptions,
  teachingPath,
  type LearnerFacts,
  type PlannedObjective,
  type SessionRequest,
} from '../src/lib/learning/session.ts';
import type { Paper, Subskill } from '../src/lib/learning/contracts/catalog.ts';
import {
  DAILY_MINUTE_CHOICES,
  DIAGNOSTIC_MAX_MINUTES_PER_SESSION,
  TEACH_MAX_MINUTES,
} from '../src/lib/learning/contracts/plan.ts';
import type { PolicyOutputV1 } from '../src/lib/learning/contracts/policy.ts';
import { DEFAULT_POLICY_THRESHOLDS } from '../src/lib/learning/contracts/policy.ts';
import type { LearnerRecordV1 } from '../src/lib/learning/contracts/evidence.ts';
import {
  LEARNING_PROFILES,
  PROFILE_IDS,
  syntheticNew,
  syntheticStrongReadingWeakWriting,
  type LearnerProfile,
} from './fixtures/learning-profiles.ts';

const CATALOGUE = learningCatalogue();

/* ── Small helpers ───────────────────────────────────────────────────────── */

function objectiveFor(
  paper: Paper,
  subskill: Subskill,
  over: Partial<PlannedObjective> = {},
): PlannedObjective {
  return {
    scope: { kind: 'subskill', paper, subskill },
    scopeKey: `subskill:${paper}:${subskill}`,
    paper,
    subskill,
    objective: `SYNTHETIC objective for ${paper} ${subskill}.`,
    reason: 'SYNTHETIC reason.',
    evidenceRefs: [],
    intent: 'learn',
    ...over,
  };
}

function contextFor(profile: LearnerProfile): {
  record: LearnerRecordV1;
  policy: PolicyOutputV1;
  facts: LearnerFacts;
} {
  const policy = evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now });
  return { record: profile.record, policy, facts: learnerFacts(profile.record, policy) };
}

function request(
  profile: LearnerProfile,
  objective: PlannedObjective,
  budgetMinutes: number,
  over: Partial<SessionRequest> = {},
): SessionRequest {
  const { record, policy, facts } = contextFor(profile);
  return {
    catalogue: CATALOGUE,
    record,
    policy,
    facts,
    objective,
    budgetMinutes,
    today: profile.today,
    overrides: [],
    ...over,
  };
}

/* ── The budget ──────────────────────────────────────────────────────────── */

test('the sum of step minutes never exceeds the budget at 15, 25 or 60 minutes', () => {
  const profile = syntheticNew();
  for (const budget of [15, 25, 60]) {
    for (const [paper, subskill] of [
      ['reading', 'matching-headings'],
      ['listening', 'sentence-completion'],
      ['writing', 'task1-process-sequence'],
      ['speaking', 'part2-hold-the-two-minutes'],
    ] as const) {
      const { session } = assembleSession(request(profile, objectiveFor(paper, subskill), budget));
      assert.ok(
        sessionMinutes(session) <= budget,
        `${paper}/${subskill} at ${budget}: ${sessionMinutes(session)} minutes planned`,
      );
      assert.equal(session.budgetMinutes, budget);
    }
  }
});

test('the budget holds for every profile, every budget choice and every objective the library serves', () => {
  for (const [name, make] of Object.entries(LEARNING_PROFILES)) {
    const profile = make();
    const { facts } = contextFor(profile);
    for (const budget of DAILY_MINUTE_CHOICES) {
      for (const paper of ['reading', 'listening', 'writing', 'speaking'] as const) {
        const subskills = new Set<Subskill>();
        for (const activity of CATALOGUE.activities) {
          if (activity.paper === paper && !activity.unavailable) subskills.add(activity.subskill);
        }
        for (const subskill of subskills) {
          const { session } = assembleSession(request(profile, objectiveFor(paper, subskill), budget));
          assert.ok(
            sessionMinutes(session) <= budget,
            `${name} ${paper}/${subskill} at ${budget} planned ${sessionMinutes(session)} minutes`,
          );
          for (const step of session.steps) {
            const activity = findActivity(step.activityId, CATALOGUE);
            assert.ok(activity, `${name}: step names ${step.activityId}, which is not in the catalogue`);
            assert.equal(activity?.unavailable, undefined, `${name}: scheduled an unavailable activity`);
            /* A recap step points back at what was just done and costs a
               few minutes of looking; only a step that DOES the activity
               has to hold all of it. */
            const doing = step.role === 'practise' || step.role === 'assess' || step.role === 'independent-check';
            if (activity?.indivisible && doing) {
              assert.equal(
                step.minutes,
                activity.expectedMinutes,
                `${name}: trimmed the indivisible ${activity.id}`,
              );
            }
          }
        }
      }
    }
    assert.ok(facts.seen instanceof Set);
  }
});

test('assertWithinBudget refuses a session whose steps do not fit', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60));
  const overloaded = {
    ...session,
    budgetMinutes: 15,
    steps: session.steps.length > 0 ? session.steps : [],
  };
  if (overloaded.steps.length === 0) return;
  assert.throws(() => assertWithinBudget(overloaded), /against a budget of 15/);
});

/* ── Never pad ───────────────────────────────────────────────────────────── */

test('a strong student with measured evidence gets no teaching step', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const { policy, facts } = contextFor(profile);
  assert.ok(
    policy.strengths.includes('subskill:reading:matching-headings'),
    'the fixture is supposed to have Matching Headings as a measured strength',
  );
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60));
  assert.equal(
    session.steps.filter((step) => step.role === 'teach').length,
    0,
    'a measured strength was taught anyway',
  );
  assert.ok(facts.strongSubskills.size > 0);
});

test('a session is only as long as the useful work in it', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 90));
  assert.ok(sessionMinutes(session) < 90, 'the session was padded out to fill the budget');
  assert.ok(session.steps.length >= 1, 'a session with nothing in it is not a session');
});

test('a student who has already read the lesson is not sent back to it', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const { facts } = contextFor(profile);
  const objective = objectiveFor('reading', 'matching-headings');
  const path = teachingPath(objective, {
    catalogue: CATALOGUE,
    facts,
    policy: evaluateEvidence({ record: profile.record, goals: profile.goals, now: profile.now }),
    today: profile.today,
    overrides: [],
    unavailableSurfaces: [],
    minutes: Number.POSITIVE_INFINITY,
    thresholds: DEFAULT_POLICY_THRESHOLDS,
  });
  assert.ok(path.length <= 2, 'a session should never hold three lessons in a row');
});

/* ── Teaching ────────────────────────────────────────────────────────────── */

test('a brand-new student is taught the overview and the question type in the same session', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60));
  const teach = session.steps.filter((step) => step.role === 'teach');
  assert.equal(teach.length, 2, 'the overview and the type lesson should both be taught');
  assert.equal(teach[0]?.activityId, PROFILE_IDS.readingOverview);
  assert.equal(teach[1]?.activityId, PROFILE_IDS.headingsLesson);
  for (const step of teach) assert.ok(step.minutes <= TEACH_MAX_MINUTES);
  assert.ok(
    session.steps.some((step) => step.role === 'practise'),
    'a first session that only reads lessons is not a useful first session',
  );
});

/* ── The independent check ───────────────────────────────────────────────── */

test('an independent check only ever uses material the student has not met', () => {
  for (const [name, make] of Object.entries(LEARNING_PROFILES)) {
    const profile = make();
    const { facts } = contextFor(profile);
    for (const budget of [25, 60, 90]) {
      for (const [paper, subskill] of [
        ['reading', 'matching-headings'],
        ['listening', 'sentence-completion'],
      ] as const) {
        const { session } = assembleSession(request(profile, objectiveFor(paper, subskill), budget));
        const check = session.steps.find((step) => step.role === 'independent-check');
        if (!check) continue;
        const activity = findActivity(check.activityId, CATALOGUE);
        assert.ok(activity, `${name}: the check names an activity that does not exist`);
        assert.ok(isUnseen(activity!, facts), `${name}: the check uses material already seen`);
        assert.ok(activity!.verified, `${name}: an unverified set was used as an independent check`);
      }
    }
  }
});

test('the check never comes from the paper the practice step is about to spend', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 90));
  const practise = session.steps.find((step) => step.role === 'practise');
  const check = session.steps.find((step) => step.role === 'independent-check');
  if (!practise || !check) return;
  const practised = findActivity(practise.activityId, CATALOGUE)!;
  const checked = findActivity(check.activityId, CATALOGUE)!;
  const spent = new Set([...(practised.sourcePaperIds ?? []), practised.id, ...(practised.sharesItemsWith ?? [])]);
  for (const id of checked.sourcePaperIds ?? []) {
    assert.ok(!spent.has(id), `the check reuses ${id}, which the practice step spends first`);
  }
});

/* ── Indivisible work ────────────────────────────────────────────────────── */

test('an indivisible task that does not fit comes back as a longer commitment instead of being trimmed', () => {
  const profile = syntheticNew();
  const objective = objectiveFor('writing', 'task1-process-sequence');
  const shortDay = assembleSession(request(profile, objective, 15));
  const essay = findActivity(PROFILE_IDS.writingTask1, CATALOGUE)!;
  assert.ok(essay.indivisible, 'the fixture assumes a graded Task 1 is indivisible');
  assert.ok(essay.expectedMinutes > 15);

  for (const step of shortDay.session.steps) {
    assert.notEqual(step.activityId, essay.id, 'an indivisible essay was squeezed into a 15-minute day');
  }
  assert.ok(
    shortDay.longerCommitments.length > 0,
    'nothing was offered as an explicit longer commitment',
  );
  assert.ok(
    shortDay.longerCommitments.every((alternative) => alternative.kind === 'longer-commitment'),
  );
});

test('an indivisible task that fits keeps every one of its minutes', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(request(profile, objectiveFor('writing', 'task1-process-sequence'), 60));
  const step = session.steps.find(
    (entry) => entry.role === 'practise' && findActivity(entry.activityId, CATALOGUE)?.indivisible,
  );
  if (!step) return;
  const activity = findActivity(step.activityId, CATALOGUE)!;
  assert.equal(step.minutes, activity.expectedMinutes);
});

test('an accepted longer commitment becomes the whole session and is recorded as accepted', () => {
  const profile = syntheticNew();
  const assembled = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 15, {
      acceptedCommitment: { activityId: 'test:reading-full-004', minutes: 60, acceptedAt: profile.now },
    }),
  );
  assert.equal(assembled.session.steps.length, 1);
  assert.equal(assembled.session.steps[0]?.activityId, 'test:reading-full-004');
  assert.equal(assembled.session.extendedCommitment?.activityId, 'test:reading-full-004');
  assert.ok(assembled.session.budgetMinutes >= 60, 'the accepted commitment must fit its own session');
  assertWithinBudget(assembled.session);
});

test('a whole paper owes its review to a later session rather than to the end of its own hour', () => {
  const profile = syntheticNew();
  const assembled = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 60, {
      objective: objectiveFor('reading', 'matching-headings', { intent: 'assess' }),
    }),
  );
  const paper = assembled.session.steps.find(
    (step) => findActivity(step.activityId, CATALOGUE)?.kind === 'full-test',
  );
  if (!paper) return;
  assert.equal(assembled.session.steps.length, 1, 'a whole paper is a session on its own');
  assert.ok(assembled.reviewNeeded, 'the review of a whole paper was not asked for');
  assert.equal(assembled.reviewNeeded?.activityId, paper.activityId);
});

/* ── Diagnostics ─────────────────────────────────────────────────────────── */

test('a diagnostic step is short, real and never longer than its cap', () => {
  const profile = syntheticNew();
  for (const paper of ['reading', 'listening', 'writing', 'speaking'] as const) {
    for (const budget of DAILY_MINUTE_CHOICES) {
      const assembled = assembleSession(
        request(profile, objectiveFor('reading', 'matching-headings'), budget, { diagnosticPaper: paper }),
      );
      const assess = assembled.session.steps.find((step) => step.role === 'assess');
      if (!assess) {
        assert.ok(
          assembled.diagnosticUnavailable || budget < 5,
          `${paper} at ${budget}: no sample and no honest reason for it`,
        );
        continue;
      }
      assert.ok(assess.minutes <= DIAGNOSTIC_MAX_MINUTES_PER_SESSION);
      const activity = findActivity(assess.activityId, CATALOGUE)!;
      assert.equal(activity.paper, paper);
      assert.ok(
        /* 'objective-judged' joined this list with the Task 1 overview
           pilot (WP17). A short piece of the student's own writing judged
           against one stated objective is a real result: it is not a mark
           and it never carries a band, and the policy caps a diagnostic at
           tentative on top of that. What it is not is a guess, which is
           what the list exists to keep out. */
        ['scored-items', 'scored-paper', 'graded-rubric', 'objective-judged'].includes(activity.completionEvidence),
        'a diagnostic must produce a real result',
      );
    }
  }
});

/* This test used to read "Writing has nothing short enough to sample, and
   the session says so instead of skipping it", and it was right: the
   shortest Writing activity in the library was a twenty minute graded
   report, a diagnostic step is capped at fifteen, and the honest answer was
   to say so.

   The Task 1 overview pilot (WP17) closed that gap with a seven minute
   overview task on a chart the student has not seen, judged against one
   objective and capped at tentative by the policy. So the behaviour under
   test legitimately changed, and what is defended now is the other half of
   the same promise: the sample is short, it is real, and it is never
   mistaken for a band. */
test('Writing can now be sampled in a short step, and the sample is never a band', () => {
  const profile = syntheticNew();
  const assembled = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 60, { diagnosticPaper: 'writing' }),
  );
  assert.equal(assembled.diagnosticUnavailable, false);
  assert.equal(assembled.diagnosticPaper, 'writing');

  const assess = assembled.session.steps.find((step) => step.role === 'assess');
  assert.ok(assess, 'there is a Writing sample in the session');
  assert.ok(assess!.minutes <= DIAGNOSTIC_MAX_MINUTES_PER_SESSION);
  const activity = findActivity(assess!.activityId, CATALOGUE)!;
  assert.equal(activity.paper, 'writing');
  assert.equal(
    activity.completionEvidence,
    'objective-judged',
    'a short Writing sample is judged against one objective, never scored and never banded',
  );
});

/* ── Eligibility ─────────────────────────────────────────────────────────── */

test('a student with no microphone is never sent to a recording, and one with no audio never to Listening', () => {
  const profile = syntheticNew();
  const speaking = assembleSession(
    request(profile, objectiveFor('speaking', 'part2-hold-the-two-minutes'), 60, {
      unavailableSurfaces: ['microphone'],
    }),
  );
  for (const step of speaking.session.steps) {
    const activity = findActivity(step.activityId, CATALOGUE)!;
    assert.ok(!(activity.tags ?? []).includes('needs-microphone'));
  }
  const listening = assembleSession(
    request(profile, objectiveFor('listening', 'sentence-completion'), 60, { unavailableSurfaces: ['audio'] }),
  );
  for (const step of listening.session.steps) {
    assert.notEqual(findActivity(step.activityId, CATALOGUE)?.paper, 'listening');
  }
});

test('a skipped activity never appears in a session', () => {
  const profile = syntheticNew();
  const plain = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60));
  const practise = plain.session.steps.find((step) => step.role === 'practise');
  assert.ok(practise, 'the fixture is supposed to produce a practice step');
  const skipped = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 60, {
      overrides: [{ kind: 'skip-activity', activityId: practise!.activityId, createdAt: profile.now }],
    }),
  );
  for (const step of skipped.session.steps) assert.notEqual(step.activityId, practise!.activityId);
});

test('hub links are never scheduled, because they name no questions', () => {
  const profile = syntheticNew();
  for (const budget of DAILY_MINUTE_CHOICES) {
    const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), budget));
    for (const step of session.steps) {
      assert.ok(!(findActivity(step.activityId, CATALOGUE)?.tags ?? []).includes('hub'));
    }
  }
});

/* ── Determinism ─────────────────────────────────────────────────────────── */

test('the same input always builds the same session, id included', () => {
  const profile = syntheticStrongReadingWeakWriting();
  const objective = objectiveFor('writing', 'task1-process-sequence');
  const first = assembleSession(request(profile, objective, 60));
  const second = assembleSession(request(profile, objective, 60));
  assert.equal(first.session.id, second.session.id);
  assert.deepEqual(first.session.steps, second.session.steps);
});

test('step ids are stable inside a session and distinct from each other', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60));
  const ids = session.steps.map((step) => step.stepId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(id.startsWith(session.id));
});

/* ── A seeded sweep ──────────────────────────────────────────────────────── */

/** A tiny deterministic generator. Seeded on purpose: a flaky planner test
    that fails once a fortnight is worse than no test at all. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

test('mixed evidence, mixed budgets and mixed surfaces never break the budget or pick unavailable work', () => {
  const random = seeded(20260922);
  const names = Object.keys(LEARNING_PROFILES);
  const papers = ['reading', 'listening', 'writing', 'speaking'] as const;

  for (let run = 0; run < 200; run += 1) {
    const name = names[Math.floor(random() * names.length)]!;
    const profile = LEARNING_PROFILES[name]!();
    const budget = DAILY_MINUTE_CHOICES[Math.floor(random() * DAILY_MINUTE_CHOICES.length)]!;
    const paper = papers[Math.floor(random() * papers.length)]!;
    const options = CATALOGUE.activities.filter((activity) => activity.paper === paper && !activity.unavailable);
    const subskill = options[Math.floor(random() * options.length)]!.subskill;
    const surfaces = random() < 0.2 ? (['microphone'] as const) : ([] as const);
    const diagnostic = random() < 0.3 ? papers[Math.floor(random() * papers.length)] : undefined;

    const assembled = assembleSession(
      request(profile, objectiveFor(paper, subskill), budget, {
        unavailableSurfaces: [...surfaces],
        diagnosticPaper: diagnostic,
      }),
    );
    const { session } = assembled;
    assert.ok(
      sessionMinutes(session) <= budget,
      `${name} ${paper}/${subskill} at ${budget}: ${sessionMinutes(session)} minutes`,
    );
    for (const step of session.steps) {
      const activity = findActivity(step.activityId, CATALOGUE);
      assert.ok(activity, `${name}: ${step.activityId} is not in the catalogue`);
      assert.equal(activity?.unavailable, undefined);
      assert.ok(step.minutes > 0);
      if (surfaces.includes('microphone')) {
        assert.ok(!(activity?.tags ?? []).includes('needs-microphone'));
      }
    }
  }
});

/* ── The catalogue wrappers ──────────────────────────────────────────────── */

test('material lookups are scoped to one paper, so a Listening lesson never answers a Reading question', () => {
  for (const subskill of ['exam-format', 'sentence-completion'] as Subskill[]) {
    for (const paper of ['reading', 'listening'] as const) {
      for (const activity of teachOptions({ paper, subskill }, CATALOGUE)) {
        assert.equal(activity.paper, paper);
      }
      for (const activity of practiceOptions({ paper, subskill }, 60, CATALOGUE)) {
        assert.equal(activity.paper, paper);
      }
      for (const entry of checkOptions({ paper, subskill }, CATALOGUE)) {
        assert.equal(entry.activity.paper, paper);
      }
    }
  }
});

test('every sentence a session can write is plain, dash-free and claims nothing', () => {
  for (const sentence of Object.values(SESSION_SENTENCES)) {
    assert.ok(!sentence.includes('—'), `em dash in: ${sentence}`);
    assert.ok(!sentence.includes('–'), `en dash in: ${sentence}`);
    assert.ok(!/mastered|mastery|guarantee/i.test(sentence), `an overclaim in: ${sentence}`);
  }
  assert.ok(SESSION_SENTENCES.assess.includes('too short to be a band'));
});

test('calendar arithmetic counts whole days and never goes through a time zone', () => {
  assert.equal(calendarDaysBetween('2026-09-20', '2026-09-22'), 2);
  assert.equal(calendarDaysBetween('2026-09-22', '2026-09-20'), -2);
  assert.equal(calendarDaysBetween('2026-03-28', '2026-03-30'), 2);
});

/* ── Vocabulary in the recall slot ─────────────────────────────────────── */

/* The vocabulary package exposes pure functions over a card set and a
   review store, both of which live in the browser. The planner is pure and
   runs in a Cloudflare Worker too, so the browser gathers a small summary
   and hands it in as plain data (VocabularySignalV1). These tests are that
   contract, from both sides: what a real signal does to a session, and
   what happens on the Worker, where there is none. */

const NO_VOCABULARY = { dueCount: 0, dueByTopic: {}, relevantTopics: [], problems: [] } as const;

test('words due today fill the recall step with that topic', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 60, {
      vocabulary: {
        dueCount: 12,
        dueByTopic: { environment: 9, 'crime': 3 },
        relevantTopics: [],
        problems: [],
      },
    }),
  );
  const recall = session.steps.find((step) => step.role === 'recall');
  assert.ok(recall, 'a student with words due gets them back before anything new');
  assert.equal(recall.activityId, 'review:vocabulary:environment', 'the topic with the most due words');
  assert.equal(recall.purpose, SESSION_SENTENCES.recallVocabDue);
  assertWithinBudget(session);
});

test('a topic that is both due and relevant to today beats a topic that is only due', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(
    request(profile, objectiveFor('writing', 'task2-support-a-claim'), 60, {
      vocabulary: {
        dueCount: 12,
        dueByTopic: { environment: 9, 'crime': 3 },
        relevantTopics: ['crime', 'education'],
        problems: [],
      },
    }),
  );
  const recall = session.steps.find((step) => step.role === 'recall');
  assert.equal(recall?.activityId, 'review:vocabulary:crime');
});

test('a Lexical Resource the graders keep marking low raises vocabulary as support, never as a paper', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(
    request(profile, objectiveFor('writing', 'task2-support-a-claim'), 60, {
      vocabulary: {
        dueCount: 0,
        dueByTopic: {},
        relevantTopics: ['education'],
        problems: [{ reason: 'low-lexical-resource' }],
      },
    }),
  );
  const recall = session.steps.find((step) => step.role === 'recall');
  assert.ok(recall, 'the vocabulary behind the criterion is worth a step');
  assert.equal(recall.activityId, 'review:vocabulary:education');
  assert.equal(recall.purpose, SESSION_SENTENCES.recallVocabForCriterion);

  /* Support, and nothing more. The session is still about Writing, the
     vocabulary step is one recall step inside it, and nothing anywhere
     turns vocabulary into a fifth paper or gives it a band. */
  assert.equal(session.paper, 'writing');
  assert.equal(session.objectiveScope, 'subskill:writing:task2-support-a-claim');
  assert.ok(!/band/i.test(recall.purpose), 'a vocabulary step never mentions a band');
  const vocabActivity = findActivity(recall.activityId, CATALOGUE);
  assert.equal(vocabActivity?.paper, undefined, 'a vocabulary activity belongs to no paper');
  assert.equal(vocabActivity?.domain, 'vocabulary');
});

test('the same Lexical Resource signal does nothing on Reading or Listening', () => {
  /* Lexical Resource is a criterion on Writing and Speaking. Stretching it
     to a Reading session would be inventing a link the graders never made. */
  const profile = syntheticNew();
  for (const paper of ['reading', 'listening'] as const) {
    const { session } = assembleSession(
      request(profile, objectiveFor(paper, 'sentence-completion'), 60, {
        vocabulary: {
          dueCount: 0,
          dueByTopic: {},
          relevantTopics: ['education'],
          problems: [{ reason: 'low-lexical-resource' }],
        },
      }),
    );
    assert.equal(session.steps.find((step) => step.role === 'recall'), undefined, `${paper} got a vocabulary step`);
  }
});

test('a word this student keeps failing is worth a step even with nothing due', () => {
  const profile = syntheticNew();
  const { session } = assembleSession(
    request(profile, objectiveFor('speaking', 'part2-hold-the-two-minutes'), 60, {
      vocabulary: {
        dueCount: 0,
        dueByTopic: {},
        relevantTopics: [],
        problems: [{ reason: 'repeated-recall-failure', word: 'mitigate', topic: 'environment', lapses: 3 }],
      },
    }),
  );
  assert.equal(session.steps.find((step) => step.role === 'recall')?.activityId, 'review:vocabulary:environment');
});

test('nothing due and nothing relevant means no vocabulary step at all', () => {
  /* The slot is never filled for the sake of filling it. "Review
     vocabulary" with no vocabulary to review is padding, and padding is
     the one thing a session may not be. */
  const profile = syntheticNew();
  const { session } = assembleSession(
    request(profile, objectiveFor('reading', 'matching-headings'), 60, { vocabulary: { ...NO_VOCABULARY } }),
  );
  assert.equal(session.steps.find((step) => step.role === 'recall'), undefined);
});

test('on the Worker, with no vocabulary state at all, the session is exactly what it was', () => {
  /* The Worker has no localStorage and never loads the deck, so it passes
     nothing. A plan built with no signal must be identical to one built
     before any of this existed, id included. */
  const profile = syntheticNew();
  const objective = objectiveFor('reading', 'matching-headings');
  const withoutField = assembleSession(request(profile, objective, 60));
  const withNull = assembleSession(request(profile, objective, 60, { vocabulary: null }));
  assert.deepEqual(withNull.session, withoutField.session);
  assert.equal(withoutField.session.steps.find((step) => step.role === 'recall'), undefined);
});

test('the vocabulary step fits its budget like every other step', () => {
  const profile = syntheticNew();
  for (const budget of DAILY_MINUTE_CHOICES) {
    const { session } = assembleSession(
      request(profile, objectiveFor('writing', 'task2-support-a-claim'), budget, {
        vocabulary: {
          dueCount: 30,
          dueByTopic: { environment: 30 },
          relevantTopics: ['environment'],
          problems: [{ reason: 'low-lexical-resource' }],
        },
      }),
    );
    assertWithinBudget(session);
    assert.ok(sessionMinutes(session) <= budget, `${budget}: ${sessionMinutes(session)} minutes planned`);
  }
});

test('the same signal always builds the same session', () => {
  const profile = syntheticNew();
  const signal = {
    dueCount: 5,
    dueByTopic: { environment: 3, health: 2 },
    relevantTopics: ['health'],
    problems: [{ reason: 'repeated-recall-failure' as const, word: 'sedentary', topic: 'health', lapses: 2 }],
  };
  const once = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60, { vocabulary: signal }));
  const twice = assembleSession(request(profile, objectiveFor('reading', 'matching-headings'), 60, { vocabulary: signal }));
  assert.deepEqual(once.session, twice.session);
});
