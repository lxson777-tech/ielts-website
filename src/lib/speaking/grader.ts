/* The grader seam for Speaking. Mirrors src/lib/writing/grader.ts: StubGrader
   fabricates a plausible-but-honest offline result so the flow is clickable
   end-to-end with no API key; RemoteGrader POSTs to a Cloudflare Worker that
   holds the Gemini key and grades the actual audio. Swapping providers is a
   one-file change: implement SpeakingGrader and return it from getGrader(). */

import type {
  AudioMechanicsReport,
  SpeakingAssessment,
  SpeakingAttempt,
  SpeakingCriterionKey,
  SpeakingCriterionScore,
  SpeakingGradeResult,
  SpeakingGrader,
} from './schema';
import { overallSpeakingBand, toSpeakingBand } from './schema';
import { analyzeAudio } from './mechanics';
import { blobToBase64 } from './recorder';

/* Sample grader — NOT a real assessment. Fluency & Coherence is the one
   criterion with a genuine offline signal (pacing/silence from the acoustic
   heuristics); Lexical Resource, Grammar and Pronunciation cannot be judged
   without a model actually listening to the audio, so this never fabricates
   a verdict for them — it says so plainly via `live: false`. */
class StubSpeakingGrader implements SpeakingGrader {
  readonly name = 'Sample grader (offline)';
  readonly live = false;

  async grade(_attempt: SpeakingAttempt, m: AudioMechanicsReport): Promise<SpeakingAssessment> {
    const fluencyCoherence = this.fluencyFromAcoustics(m);
    const neutral = (label: string): SpeakingCriterionScore => ({
      band: 6,
      comment: `[sample] ${label} can't be judged offline — this needs a model listening to your recording. Connect the AI examiner for a real assessment.`,
    });

    return {
      criteria: {
        fluencyCoherence,
        lexicalResource: neutral('Vocabulary range'),
        grammaticalRange: neutral('Grammatical accuracy'),
        pronunciation: neutral('Pronunciation'),
      },
      moments: [],
      strengths: m.underLength ? [] : ['Spoke for the full suggested length'],
      improvements: m.underLength
        ? [`Aim for closer to ${Math.round(m.expectedMinMs / 1000)} seconds`]
        : ['Enable AI grading to get real feedback on vocabulary, grammar and pronunciation'],
    };
  }

  private fluencyFromAcoustics(m: AudioMechanicsReport): SpeakingCriterionScore {
    let band = 6.5;
    if (m.underLength) band -= 1;
    if (m.longestSilenceMs > 4000) band -= 1;
    else if (m.estSilenceRatio > 0.4) band -= 0.5;
    const note = m.underLength
      ? 'Response was shorter than the suggested length, which limits how much can be judged.'
      : m.longestSilenceMs > 4000
        ? 'A long pause was detected — real fluency means keeping ideas flowing even while thinking.'
        : 'Reasonable pacing based on timing alone — a real examiner also judges how ideas connect.';
    return { band: toSpeakingBand(Math.round(band)), comment: `[sample] ${note}` };
  }
}

/* Remote grader — POSTs to our Cloudflare Worker, which holds the API key and
   sends the actual audio to Gemini. Any failure throws and gradeSpeaking()
   falls back to the stub. */
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

const stub = new StubSpeakingGrader();

const SPEAKING_GRADER_URL: string | undefined = import.meta.env?.PUBLIC_SPEAKING_GRADER_URL;

/** Returns the active grader: the AI examiner when PUBLIC_SPEAKING_GRADER_URL
    is set at build time, otherwise the offline stub. */
export function getSpeakingGrader(): SpeakingGrader {
  return SPEAKING_GRADER_URL ? new RemoteSpeakingGrader(SPEAKING_GRADER_URL) : stub;
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
    total across every clip in the attempt, hand the attempt to the active
    grader, and assemble the full result. Falls back to the stub on any
    failure so the student always gets a report. */
export async function gradeSpeaking(
  attempt: SpeakingAttempt,
  clips: { blob: Blob; durationMs: number }[],
  expectedMinMs: number,
): Promise<SpeakingGradeResult> {
  const totalDurationMs = clips.reduce((a, c) => a + c.durationMs, 0);
  const primary = clips.reduce((a, b) => (b.durationMs > a.durationMs ? b : a));
  const mechanics = await analyzeAudio(primary.blob, expectedMinMs);
  mechanics.totalDurationMs = totalDurationMs;
  mechanics.underLength = totalDurationMs < expectedMinMs;

  let grader = getSpeakingGrader();
  let assessment: SpeakingAssessment;
  try {
    assessment = await grader.grade(attempt, mechanics);
  } catch {
    if (grader === stub) throw new Error('Grading failed');
    grader = stub;
    assessment = await stub.grade(attempt, mechanics);
  }
  return {
    ...assessment,
    mechanics,
    overallBand: overallSpeakingBand(assessment.criteria as Record<SpeakingCriterionKey, SpeakingCriterionScore>),
    grader: { name: grader.name, live: grader.live },
  };
}
