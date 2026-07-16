/* End-of-interview grading. The live conversation and the band report are
   separate concerns: while the student talks to the examiner, a parallel
   MediaRecorder keeps the whole candidate side as one clip; when the test
   ends, that clip plus the interview transcript go to the same
   grade-speaking Worker the recorded checker uses (kind: "interview"),
   which grades on the official four criteria. There is no offline stub
   here — the live examiner only exists when the AI stack is configured. */

import type { AudioMechanicsReport, SpeakingAssessment, SpeakingGradeResult } from '../schema';
import { overallSpeakingBand } from '../schema';
import { analyzeAudio } from '../mechanics';
import { blobToBase64 } from '../recorder';
import type { TranscriptTurn } from './session';

const GRADER_URL: string | undefined = import.meta.env?.PUBLIC_SPEAKING_GRADER_URL;

/** A serious full test has ≥ ~5 minutes of candidate speech. */
export const FULL_TEST_EXPECTED_MIN_MS = 5 * 60_000;

export function gradingAvailable(): boolean {
  return !!GRADER_URL;
}

export interface InterviewGradeOptions {
  /** Minimum candidate-speech length a serious attempt of this session shape has. */
  expectedMinMs: number;
  /** One-line description of the session shape for the grading prompt, e.g.
      "a Part 2 practice drill (cue-card talk only)". Omit for the full test.
      Older Workers ignore this field, so it degrades cleanly. */
  scope?: string;
}

export async function gradeInterview(
  transcript: TranscriptTurn[],
  recording: { blob: Blob; mimeType: string; durationMs: number },
  opts: InterviewGradeOptions = { expectedMinMs: FULL_TEST_EXPECTED_MIN_MS },
): Promise<SpeakingGradeResult> {
  if (!GRADER_URL) throw new Error('The AI grader is not configured for this site.');

  const mechanics: AudioMechanicsReport = await analyzeAudio(recording.blob, opts.expectedMinMs);

  const resp = await fetch(GRADER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'interview',
      interview: {
        transcript: transcript.map((t) => ({ role: t.role, text: t.text.trim() })).filter((t) => t.text),
        scope: opts.scope,
        audio: {
          question: 'Live session — candidate microphone recording',
          audioBase64: await blobToBase64(recording.blob),
          mimeType: recording.mimeType,
          durationMs: recording.durationMs,
        },
      },
      mechanics: {
        totalDurationMs: mechanics.totalDurationMs,
        underLength: mechanics.underLength,
        estSilenceRatio: mechanics.estSilenceRatio,
      },
    }),
  });

  if (!resp.ok) {
    const err = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error ?? `Grader error (${resp.status})`);
  }

  const assessment = (await resp.json()) as SpeakingAssessment;
  return {
    overallBand: overallSpeakingBand(assessment.criteria),
    criteria: assessment.criteria,
    mechanics,
    moments: assessment.moments,
    strengths: assessment.strengths,
    improvements: assessment.improvements,
    grader: { name: 'AI examiner (live interview)', live: true },
  };
}
