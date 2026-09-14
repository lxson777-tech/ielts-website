/* The grader seam for Speaking. Mirrors src/lib/writing/grader.ts: there is no
   offline fallback — RemoteGrader POSTs to a Cloudflare Worker that holds the
   Gemini key and grades the actual audio, and any failure (unconfigured,
   unreachable, malformed response) propagates so the UI can say so plainly
   instead of quietly handing back a fabricated band. The UI checks
   isSpeakingGraderConfigured() up front (Live Examiner's pattern) so a
   student never spends several minutes recording only to discover afterwards
   that grading was never available. */

import type {
  AudioMechanicsReport,
  SpeakingAssessment,
  SpeakingAttempt,
  SpeakingCriterionKey,
  SpeakingCriterionScore,
  SpeakingGradeResult,
  SpeakingGrader,
} from './schema';
import { overallSpeakingBand } from './schema';
import { analyzeAudio } from './mechanics';
import { blobToBase64 } from './recorder';

/* Remote grader — POSTs to our Cloudflare Worker, which holds the API key and
   sends the actual audio to Gemini. Any failure throws, and gradeSpeaking()
   lets it propagate rather than falling back to anything fabricated. */
class RemoteSpeakingGrader implements SpeakingGrader {
  readonly name = 'AI examiner';
  readonly live = true;

  constructor(private endpoint: string) {}

  async grade(attempt: SpeakingAttempt, mechanics: AudioMechanicsReport): Promise<SpeakingAssessment> {
    const body =
      attempt.kind === 'part1'
        ? { kind: 'part1' as const, part1: { topic: attempt.topic, answers: attempt.answers }, mechanics: wireMechanics(mechanics) }
        : {
            kind: 'part2and3' as const,
            part2and3: { cueCard: attempt.cueCard, monologue: attempt.monologue, followUps: attempt.followUps },
            mechanics: wireMechanics(mechanics),
          };

    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Audio payloads + multi-part prompts take longer than a single essay.
      signal: AbortSignal.timeout(90000),
    });
    if (!resp.ok) {
      let detail = '';
      try {
        detail = ((await resp.json()) as { error?: string }).error ?? '';
      } catch {
        /* non-JSON error body */
      }
      throw new Error(detail || `Grader responded ${resp.status}`);
    }
    const a = (await resp.json()) as SpeakingAssessment;
    if (!a?.criteria?.fluencyCoherence) throw new Error('Malformed assessment from grader');
    return a;
  }
}

function wireMechanics(m: AudioMechanicsReport) {
  return {
    totalDurationMs: m.totalDurationMs,
    underLength: m.underLength,
    estSilenceRatio: m.estSilenceRatio,
  };
}

const SPEAKING_GRADER_URL: string | undefined = import.meta.env?.PUBLIC_SPEAKING_GRADER_URL;

/** Whether an AI examiner is available on this build at all — checked by the
    UI so it can disable the "Start" cards up front instead of taking the
    student through several minutes of recording only to fail at the end. */
export function isSpeakingGraderConfigured(): boolean {
  return !!SPEAKING_GRADER_URL;
}

/** Raw recorded clips (Blob) → base64 AnsweredClip, ready for the grader. */
export async function toAnsweredClip(question: string, seg: { blob: Blob; mimeType: string; durationMs: number }) {
  return {
    question,
    audioBase64: await blobToBase64(seg.blob),
    mimeType: seg.mimeType,
    durationMs: seg.durationMs,
  };
}

/** The single entry point the UI calls: analyze the acoustics of the longest
    clip (a representative sample for the silence/pacing heuristic — audio
    containers from separate MediaRecorder sessions can't be concatenated and
    decoded as one stream), overwrite its duration/underLength with the real
    total across every clip in the attempt, hand the attempt to the AI
    examiner, and assemble the full result. Any failure — missing config,
    network, quota, a malformed response — propagates so the caller can tell
    the student grading failed rather than showing a fabricated band. */
export async function gradeSpeaking(
  attempt: SpeakingAttempt,
  clips: { blob: Blob; durationMs: number }[],
  expectedMinMs: number,
): Promise<SpeakingGradeResult> {
  if (!SPEAKING_GRADER_URL) throw new Error('The AI examiner is not configured for this site yet.');
  const totalDurationMs = clips.reduce((a, c) => a + c.durationMs, 0);
  const primary = clips.reduce((a, b) => (b.durationMs > a.durationMs ? b : a));
  const mechanics = await analyzeAudio(primary.blob, expectedMinMs);
  mechanics.totalDurationMs = totalDurationMs;
  mechanics.underLength = totalDurationMs < expectedMinMs;

  const grader: SpeakingGrader = new RemoteSpeakingGrader(SPEAKING_GRADER_URL);
  const assessment = await grader.grade(attempt, mechanics);
  return {
    ...assessment,
    mechanics,
    overallBand: overallSpeakingBand(assessment.criteria as Record<SpeakingCriterionKey, SpeakingCriterionScore>),
    grader: { name: grader.name, live: grader.live },
  };
}
