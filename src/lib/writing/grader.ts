/* The grader seam. `getGrader()` always returns the live AI examiner — there
   is no offline fallback. Every essay gets a real assessment from the model
   against the official IELTS criteria, or the request fails outright so the
   UI can show that plainly instead of rendering a fabricated band. */

import type { EssayAssessment, EssayGrader, EssayInput, GradeResult, MechanicsReport } from './schema';
import { overallBand } from './schema';
import { analyzeEssay } from './mechanics';
import { t } from '../i18n/translate';
import { getLocale } from '../i18n/locale';
import { gatedSignIn } from '../trial/content';

/** A grading failure the Worker named with a code: a trial refusal
    ('trial-test-used', 'trial-no-test', ...) or 'sign-in-required'. The
    message is the Worker's English; the screen shows its own words. */
export class GraderRefusal extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'GraderRefusal';
  }
}

/** Only in a trial build: the student's sign-in and the id their Writing
    test was begun under, which the essay Worker checks before it grades.
    Absent on the open site, which sends exactly what it always sent. */
export interface TrialGrading {
  token: string;
  sitting: string;
  /** The language of the band guide steps the grader sends back. */
  locale?: 'en' | 'ru';
}

/* Remote grader — POSTs to our Cloudflare Worker, which holds the API key and
   calls the actual model (Gemini Flash today; the site doesn't know or care). */
class RemoteGrader implements EssayGrader {
  readonly name = 'AI examiner';
  readonly live = true;

  constructor(
    private endpoint: string,
    private trial?: TrialGrading,
  ) {}

  async grade(input: EssayInput, mechanics: MechanicsReport): Promise<EssayAssessment> {
    /* A gated build's grader needs the sign-in for every essay: the trial's
       one test sends it with its sitting; any other essay (paid access)
       sends it alone, and the Worker checks the account's paid access. */
    const signIn = this.trial ? this.trial.token : await gatedSignIn();
    const resp = await fetch(this.endpoint, {
      method: 'POST',
      headers: signIn
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${signIn}` }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: {
          task: input.prompt.task,
          variant: input.prompt.variant,
          promptHtml: input.prompt.promptHtml,
          minWords: input.prompt.minWords,
        },
        essay: input.essay,
        mechanics,
        ...(this.trial
          ? { trialSitting: this.trial.sitting, locale: this.trial.locale ?? 'en' }
          : signIn
            ? { locale: getLocale() === 'ru' ? 'ru' : 'en' }
            : {}),
      }),
      // Three reasoning-model runs are taken and the median kept; allow three minutes.
      signal: AbortSignal.timeout(180000),
    });
    if (!resp.ok) {
      // Surface the Worker's message (e.g. daily-limit) if it sent one.
      let detail = '';
      let code = '';
      try {
        const body = (await resp.json()) as { error?: string; code?: string };
        detail = body.error ?? '';
        code = body.code ?? '';
      } catch {
        /* non-JSON error body */
      }
      if (code === 'sign-in-required' || code.startsWith('trial-')) throw new GraderRefusal(code, detail);
      throw new Error(detail || `Grader responded ${resp.status}`);
    }
    const a = (await resp.json()) as EssayAssessment;
    if (!a?.criteria?.taskResponse) throw new Error('Malformed assessment from grader');
    return a;
  }
}

const GRADER_URL: string | undefined = import.meta.env?.PUBLIC_GRADER_URL;

/** Whether an AI examiner is available on this build at all — checked by the
    UI so it can disable grading up front (Live Examiner's pattern) instead of
    letting the student write a full essay and only then discover it can't be
    marked. */
export function isGraderConfigured(): boolean {
  return !!GRADER_URL;
}

/** The single entry point the UI calls: run the free heuristic layer, hand its
    signals to the AI examiner, and assemble the full result. Any failure —
    missing config, network, quota, a malformed response — propagates so the
    caller can tell the student grading failed rather than showing a
    fabricated band. */
export async function gradeEssay(input: EssayInput, trial?: TrialGrading): Promise<GradeResult> {
  if (!GRADER_URL) throw new Error(t('The AI examiner is not configured for this site yet.'));
  const mechanics = analyzeEssay(input);
  const grader: EssayGrader = new RemoteGrader(GRADER_URL, trial);
  const assessment = await grader.grade(input, mechanics);
  return {
    ...assessment,
    mechanics,
    overallBand: overallBand(assessment.criteria),
    grader: { name: grader.name, live: grader.live },
  };
}
