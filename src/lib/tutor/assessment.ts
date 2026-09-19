/* Turning "explain this result" into something the tutor can actually read.

   The browser sends a POINTER to an attempt (its kind and its ISO timestamp),
   never the result itself. This module looks that pointer up inside the
   student's own progress blob — the one the Worker fetched from Supabase
   against the verified user id — and flattens whatever it finds.

   That indirection is the ownership check. A client that makes up a band, or
   passes someone else's attempt, finds nothing: the lookup is scoped to one
   student's record by construction, so there is no "whose attempt is this"
   question left to get wrong.

   It also means explaining a result costs one cheap tutor turn and re-uses
   the grading that was already paid for. Nothing here re-submits an essay or
   an audio clip for marking. */

import type { ProgressV1 } from '../progress';
import { CRITERIA as WRITING_CRITERIA } from '../writing/schema';
import { questionTypeLabel } from '../tests/question-types';
import type { AssessmentSummary } from './prompt';
import type { TutorAttemptRef } from './schema';

const SPEAKING_CRITERION_LABEL: Record<string, string> = {
  fluencyCoherence: 'Fluency & Coherence',
  lexicalResource: 'Lexical Resource',
  grammaticalRange: 'Grammatical Range & Accuracy',
  pronunciation: 'Pronunciation',
};

const WRITING_CRITERION_LABEL: Record<string, string> = Object.fromEntries(
  WRITING_CRITERIA.map((c) => [c.key, c.label]),
);

/** Find the attempt a reference points at, inside this student's own record.
    Returns null when it does not exist — which the Worker reports as
    "not found", never as "not yours", because from the student's side those
    are the same thing and the difference leaks nothing useful. */
export function summariseAttempt(progress: ProgressV1, ref: TutorAttemptRef): AssessmentSummary | null {
  if (ref.kind === 'writing') return summariseWriting(progress, ref);
  if (ref.kind === 'speaking') return summariseSpeaking(progress, ref);
  return summariseTest(progress, ref);
}

function summariseWriting(progress: ProgressV1, ref: TutorAttemptRef): AssessmentSummary | null {
  for (const [promptId, attempts] of Object.entries(progress.writing ?? {})) {
    if (ref.promptId && promptId !== ref.promptId) continue;
    const attempt = attempts.find((a) => a.at === ref.at);
    if (!attempt) continue;

    const report = attempt.report;
    const criteria = Object.entries(attempt.criteria ?? {}).map(([key, band]) => ({
      label: WRITING_CRITERION_LABEL[key] ?? key,
      band,
      comment: report?.criteria?.[key as keyof typeof report.criteria]?.comment,
      nextBandGap: report?.criteria?.[key as keyof typeof report.criteria]?.nextBand?.gap,
    }));

    return {
      kind: 'writing',
      at: attempt.at,
      title: attempt.promptTitle ?? `${attempt.task === 'task1' ? 'Task 1' : 'Task 2'} essay`,
      overallBand: attempt.overallBand,
      criteria,
      strengths: report?.strengths,
      improvements: report?.improvements,
      moments: report?.moments?.slice(0, 3),
      live: attempt.live,
    };
  }
  return null;
}

function summariseSpeaking(progress: ProgressV1, ref: TutorAttemptRef): AssessmentSummary | null {
  const attempt = (progress.speaking ?? []).find((a) => a.at === ref.at);
  if (!attempt) return null;
  return {
    kind: 'speaking',
    at: attempt.at,
    title: `Speaking ${attempt.mode.replace('part', 'Part ')}: ${attempt.topic}`,
    overallBand: attempt.overallBand,
    criteria: Object.entries(attempt.criteria ?? {}).map(([key, band]) => ({
      label: SPEAKING_CRITERION_LABEL[key] ?? key,
      band,
    })),
    live: attempt.live,
  };
}

function summariseTest(progress: ProgressV1, ref: TutorAttemptRef): AssessmentSummary | null {
  for (const [testId, attempts] of Object.entries(progress.tests ?? {})) {
    if (ref.testId && testId !== ref.testId) continue;
    const attempt = attempts.find((a) => a.at === ref.at);
    if (!attempt) continue;
    return {
      kind: 'test',
      at: attempt.at,
      title: `${(attempt.skill ?? 'reading') === 'listening' ? 'Listening' : 'Reading'} ${
        attempt.kind === 'drill' ? 'drill' : 'test'
      } (${testId})`,
      overallBand: attempt.band,
      raw: attempt.raw,
      total: attempt.total,
      byType: Object.entries(attempt.byType ?? {}).map(([type, v]) => ({
        label: questionTypeLabel(type),
        correct: v.correct,
        total: v.total,
      })),
      live: true,
    };
  }
  return null;
}

/** Which activity best follows from a result. Deterministic, same reasoning
    as recommend.ts: the weakest thing in THIS result is the obvious next
    step, and it must resolve to a real catalogue id. */
export function activityForAssessment(a: AssessmentSummary): string {
  if (a.kind === 'test') {
    const worst = [...(a.byType ?? [])]
      .filter((t) => t.total >= 2)
      .sort((x, y) => x.correct / x.total - y.correct / y.total)[0];
    const skill = a.title.startsWith('Listening') ? 'listening' : 'reading';
    if (worst) {
      const type = Object.entries(TYPE_BY_LABEL).find(([, label]) => label === worst.label)?.[0];
      if (type) return `practise:${skill}:${type}`;
    }
    return `trainer:${skill}`;
  }
  return a.kind === 'writing' ? 'trainer:writing' : 'trainer:speaking';
}

/* Reverse of questionTypeLabel, so a summarised result can be mapped back to
   the drill filter that practises it. */
const TYPE_BY_LABEL: Record<string, string> = Object.fromEntries(
  [
    'paragraph-matching',
    'sentence-completion',
    'tfng',
    'yes-no-notgiven',
    'multiple-choice',
    'matching-headings',
    'matching-features',
    'sentence-endings',
    'categorisation',
    'multiple-answer',
    'diagram-labelling',
    'table-completion',
  ].map((t) => [t, questionTypeLabel(t)]),
);
