/* The grader seam. `getGrader()` always returns the live AI examiner — there
   is no offline fallback. Every essay gets a real assessment from the model
   against the official IELTS criteria, or the request fails outright so the
   UI can show that plainly instead of rendering a fabricated band. */

import type { EssayAssessment, EssayGrader, EssayInput, GradeResult, MechanicsReport } from './schema';
import { overallBand } from './schema';
import { analyzeEssay } from './mechanics';

/* Remote grader — POSTs to our Cloudflare Worker, which holds the API key and
   calls the actual model (Gemini Flash today; the site doesn't know or care). */
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

const GRADER_URL: string | undefined = import.meta.env?.PUBLIC_GRADER_URL;

/** The single entry point the UI calls: run the free heuristic layer, hand its
    signals to the AI examiner, and assemble the full result. Any failure —
    missing config, network, quota, a malformed response — propagates so the
    caller can tell the student grading failed rather than showing a
    fabricated band. */
export async function gradeEssay(input: EssayInput): Promise<GradeResult> {
  if (!GRADER_URL) throw new Error('The AI examiner is not configured for this site yet.');
  const mechanics = analyzeEssay(input);
  const grader: EssayGrader = new RemoteGrader(GRADER_URL);
  const assessment = await grader.grade(input, mechanics);
  return {
    ...assessment,
    mechanics,
    overallBand: overallBand(assessment.criteria),
    grader: { name: grader.name, live: grader.live },
  };
}
