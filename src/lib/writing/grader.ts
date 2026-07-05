/* The grader seam. `getGrader()` returns whichever implementation is wired
   in; today that's StubGrader, which fabricates a plausible assessment from
   the heuristic report so the entire Writing flow is clickable end-to-end
   with no API key. Swapping in a real provider is a one-file change: add an
   implementation of EssayGrader and return it from getGrader(). */

import type {
  CriterionKey,
  CriterionScore,
  EssayAssessment,
  EssayGrader,
  EssayInput,
  GradeResult,
  MechanicsReport,
} from './schema';
import { overallBand, toBand } from './schema';
import { analyzeEssay } from './mechanics';

/* Sample grader — NOT a real assessment. It grounds a believable band in the
   heuristic signals (length, diversity, cohesion, spelling) so the report
   renders sensibly and reacts to the essay, while making clear via `live:
   false` that no model has judged Task Response yet. */
class StubGrader implements EssayGrader {
  readonly name = 'Sample grader (offline)';
  readonly live = false;

  async grade(input: EssayInput, m: MechanicsReport): Promise<EssayAssessment> {
    const criteria = {
      taskResponse: this.taskResponse(m),
      coherenceCohesion: this.coherence(m),
      lexicalResource: this.lexical(m),
      grammaticalRange: this.grammar(m),
    } satisfies Record<CriterionKey, CriterionScore>;

    return {
      criteria,
      corrections: m.spellingFlags.slice(0, 5).map((f) => ({
        original: f.word,
        fix: f.suggestion ?? '',
        reason: 'Spelling',
      })),
      strengths: this.strengths(m),
      improvements: this.improvements(input, m),
    };
  }

  private taskResponse(m: MechanicsReport): CriterionScore {
    let band = 6.5;
    if (m.underLength) band -= 1;
    if (m.offTopicRisk) band -= 1;
    const note = m.underLength
      ? 'Under length, which limits how fully the task can be addressed.'
      : m.offTopicRisk
        ? 'Ideas may drift from the exact question — keep every paragraph tied to the prompt.'
        : 'Addresses the task; a real examiner will judge how fully each part is developed.';
    return { band: toBand(Math.round(band)), comment: `[sample] ${note}` };
  }

  private coherence(m: MechanicsReport): CriterionScore {
    let band = 6.5;
    if (m.linkingDevices.length === 0 && m.sentenceCount > 3) band -= 1;
    else if (m.connectiveDensity > 0.8) band -= 0.5;
    else if (m.linkingDevices.length >= 3) band += 0.5;
    const note =
      m.linkingDevices.length === 0
        ? 'Few cohesive devices — paragraphs need clearer signposting.'
        : m.connectiveDensity > 0.8
          ? 'Linking words are overused in places; vary how ideas connect.'
          : 'Reasonable paragraphing and use of cohesive devices.';
    return { band: toBand(Math.round(band)), comment: `[sample] ${note}` };
  }

  private lexical(m: MechanicsReport): CriterionScore {
    let band = 6;
    if (m.lexicalDiversity >= 0.55) band += 1;
    else if (m.lexicalDiversity >= 0.45) band += 0.5;
    if (m.overusedWords.length >= 2) band -= 0.5;
    const note = m.overusedWords.length
      ? `Repetition of words like "${m.overusedWords[0]!.word}" holds the range back.`
      : 'A workable range of vocabulary with some flexibility.';
    return { band: toBand(Math.round(band)), comment: `[sample] ${note}` };
  }

  private grammar(m: MechanicsReport): CriterionScore {
    let band = 6.5;
    if (m.spellingFlags.length >= 3) band -= 0.5;
    if (m.sentenceLengthSpread < 3 && m.sentenceCount >= 4) band -= 0.5;
    const note =
      m.spellingFlags.length >= 3
        ? 'Several spelling slips; proofread for accuracy.'
        : m.sentenceLengthSpread < 3
          ? 'Sentence structures are uniform — show a wider range of forms.'
          : 'A mix of simple and complex sentences with generally good control.';
    return { band: toBand(Math.round(band)), comment: `[sample] ${note}` };
  }

  private strengths(m: MechanicsReport): string[] {
    const s: string[] = [];
    if (!m.underLength) s.push('Meets the length requirement');
    if (m.lexicalDiversity >= 0.5) s.push('Varied vocabulary');
    if (m.linkingDevices.length >= 3) s.push('Uses a range of cohesive devices');
    if (m.sentenceLengthSpread >= 3) s.push('Good sentence-length variety');
    return s.length ? s : ['Essay submitted for review'];
  }

  private improvements(input: EssayInput, m: MechanicsReport): string[] {
    const s: string[] = [];
    if (m.underLength) s.push(`Write at least ${input.prompt.minWords} words`);
    if (m.offTopicRisk) s.push('Tie each paragraph back to the exact question');
    if (m.overusedWords.length) s.push(`Reduce repetition of "${m.overusedWords[0]!.word}"`);
    if (m.linkingDevices.length === 0) s.push('Add cohesive devices between ideas');
    if (m.spellingFlags.length) s.push('Proofread for spelling');
    return s.length ? s : ['Develop each idea with a specific example'];
  }
}

/* Remote grader — POSTs to our Cloudflare Worker, which holds the API key and
   calls the actual model (Gemini Flash today; the site doesn't know or care).
   Any failure throws, and gradeEssay() falls back to the stub. */
class RemoteGrader implements EssayGrader {
  readonly name = 'AI examiner';
  readonly live = true;

  constructor(private endpoint: string) {}

  async grade(input: EssayInput, mechanics: MechanicsReport): Promise<EssayAssessment> {
    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: {
          task: input.prompt.task,
          variant: input.prompt.variant,
          promptHtml: input.prompt.promptHtml,
          minWords: input.prompt.minWords,
        },
        essay: input.essay,
        mechanics,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      // Surface the Worker's message (e.g. daily-limit) if it sent one.
      let detail = '';
      try {
        detail = ((await resp.json()) as { error?: string }).error ?? '';
      } catch {
        /* non-JSON error body */
      }
      throw new Error(detail || `Grader responded ${resp.status}`);
    }
    const a = (await resp.json()) as EssayAssessment;
    if (!a?.criteria?.taskResponse) throw new Error('Malformed assessment from grader');
    return a;
  }
}

const stub = new StubGrader();

const GRADER_URL: string | undefined = import.meta.env?.PUBLIC_GRADER_URL;

/** Returns the active grader: the AI examiner when PUBLIC_GRADER_URL is set
    at build time, otherwise the offline stub. */
export function getGrader(): EssayGrader {
  return GRADER_URL ? new RemoteGrader(GRADER_URL) : stub;
}

/** The single entry point the UI calls: run the free heuristic layer, hand its
    signals to the active grader, and assemble the full result. If the live
    grader fails (offline, quota, upstream error), fall back to the stub so
    the student always gets a report — the result's `grader` field says which
    one actually ran. */
export async function gradeEssay(input: EssayInput): Promise<GradeResult> {
  const mechanics = analyzeEssay(input);
  let grader = getGrader();
  let assessment: EssayAssessment;
  try {
    assessment = await grader.grade(input, mechanics);
  } catch {
    if (grader === stub) throw new Error('Grading failed');
    grader = stub;
    assessment = await stub.grade(input, mechanics);
  }
  return {
    ...assessment,
    mechanics,
    overallBand: overallBand(assessment.criteria),
    grader: { name: grader.name, live: grader.live },
  };
}
