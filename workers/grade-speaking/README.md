# Speaking grader Worker

Cloudflare Worker that grades IELTS Speaking attempts with an audio-capable
AI model. The Worker receives the actual recorded audio (base64, inline),
not a transcript, so the model can judge Pronunciation directly from what it
hears, alongside Fluency & Coherence, Lexical Resource, and Grammatical
Range & Accuracy.

## Provider switch

Two providers, one Worker, chosen by the `GRADER_PROVIDER` var:

- **`openai`** (default): two internal pipelines of its own, chosen by
  `OPENAI_SPEAKING_MODE`, see "Hybrid pipeline" below.
- **`gemini`** (rollback): the original path, Gemini Flash with a native
  JSON response schema. Kept working end to end so setting `GRADER_PROVIDER`
  to `gemini` is a one-variable rollback if the OpenAI path misbehaves; no
  code change or redeploy of anything but the var is needed.

All paths use the same rubric (the official public IELTS Speaking band
descriptors and award method) and return the same response shape to the
site, so the switch is invisible to `src/lib/speaking/grader.ts` and
`src/lib/speaking/live/grade.ts`.

## Response shape

Every path (both providers, both OpenAI pipelines) returns:

```
{
  criteria: {
    fluencyCoherence | lexicalResource | grammaticalRange | pronunciation: {
      band: number,           // whole band 0-9
      comment: string,
      tip?: string,
      nextBand?: {
        target: number,       // min(9, band + 1); stays 9 once band is 9
        gap: string,          // what the target band's descriptor needs that this performance doesn't show yet
        actions: [
          { do: string, from: string, to: string }   // 1-4 items, ordered by impact
        ]
      }
    }
  },
  moments: [{ quote: string, note: string }],
  strengths: string[],
  improvements: string[],
  actionPlan: string[]        // 0-6 numbered, one-sentence, priority-ordered next steps
}
```

`nextBand` and `actionPlan` are the "how to reach the next band" fields added
2026-09-15: every prompt (Gemini, the `audio`-mode single call, the hybrid
pipeline's text-grading call, and the hybrid pipeline's pronunciation call)
is asked for `nextBand` per criterion, and the three full-assessment paths
(Gemini, `audio` mode, and the hybrid text-grading call) are also asked for
top-level `actionPlan`; the hybrid pipeline's pronunciation call grades one
criterion only, so it never produces `actionPlan` itself, the hybrid
assembly step takes `actionPlan` from the text-grading call instead.
`validateAssessment` treats both fields as optional on the way in: a
response that omits or malforms them (an older cached prompt, a Gemini
rollback, a model that skipped the field) still validates successfully,
`nextBand` is simply omitted from that criterion and `actionPlan` defaults
to `[]`, never a failure.

## Hybrid pipeline (openai provider, OPENAI_SPEAKING_MODE=hybrid, default)

Instead of one model listening to the whole recording and judging all four
criteria at once, each clip goes through three calls that each judge only
what that model is actually good at judging:

1. **Transcribe with speaker labels**, `OPENAI_TRANSCRIBE_MODEL` (default
   `gpt-4o-transcribe-diarize`) produces a diarized transcript for every
   clip: a list of segments, each tagged with a speaker label ("A", "B",
   ...) plus a start/end time in seconds. Setting `OPENAI_TRANSCRIBE_MODEL`
   to `whisper-1` instead falls back to the older path, a verbatim
   transcript with word-level timestamps and no speaker labels; the whole
   transcript is then graded as-is (the candidate-selection and
   speech-removal steps below don't apply).
2. **Pick the candidate and remove the examiner**, the segments are grouped
   by speaker; the candidate is the speaker with the greatest total
   speaking time (with only one speaker label, that speaker is the
   candidate). Every other speaker's segments, the examiner's questions and
   any cross-talk, are dropped, keeping only what the candidate actually
   said. The candidate's share of total speaking time is logged
   (percentage only, never the transcript itself) so a misattribution is
   visible in `wrangler tail`.
3. **Measure timing**, the candidate's own segment timestamps are reduced
   to a line of measured statistics per clip: total candidate speaking
   time, words per minute (over the candidate's speaking time only), "long
   pauses" (2s or more between two consecutive candidate segments with no
   examiner segment between them), filled pauses (um/uh/er), and the
   number of candidate turns. This is arithmetic, not a model call. (The
   `whisper-1` fallback keeps the previous word-timestamp statistics
   instead: words per minute, pauses of 0.7s or more, and filled pauses.)
4. **Grade the language**, the flagship text-reasoning model
   (`OPENAI_TEXT_MODEL`, default `gpt-5.6-sol`, effort
   `OPENAI_REASONING_EFFORT`) grades Fluency & Coherence, Lexical Resource
   and Grammatical Range from the candidate-only transcript plus the
   measured timing statistics for the whole session, one call.
5. **Grade the pronunciation**, the audio model (`OPENAI_AUDIO_MODEL`,
   default `gpt-audio-1.5`) listens to the actual clips (which may still
   contain the examiner's questions) and grades Pronunciation only for the
   candidate, one call.

Steps 4 and 5 also include six **examiner standardisation anchors** by
default, see the section below.

### Examiner standardisation anchors

Real IELTS examiners are periodically standardised against marked sample
performances before they sit an exam, so a "6" or a "7" means the same
thing across different examiners. The hybrid pipeline gives its two grading
calls the same kind of reference point instead of the rubric text alone:

- **Source**: `workers/grade-speaking/src/anchors.ts` (generated, not
  hand-written) holds six candidates, one per band (3.5, 5, 6, 7, 8, 9),
  taken from official IDP IELTS "IELTS Speaking test sample" videos. Each
  candidate is labelled with the band they actually received. The
  examiner's voice was removed from the audio by speaker labelling, keeping
  only the candidate's own speech: a roughly 170-word verbatim transcript
  excerpt (fillers, repetition and self-correction kept) plus about 25
  seconds of that candidate's audio (MP3, 16 kHz mono, 32 kbps, about 98 KB
  per clip; about 590 KB of audio across all six, the whole generated file
  under 1 MB).
- **Text-grading call** (step 4): the six transcript excerpts are appended
  to the instructions after the rubric, under an "EXAMINER STANDARDISATION"
  heading, each labelled `--- Official sample, examiner band N ---`, with
  guidance on how to use them (compare flow, range and control against the
  samples; do not default to band 6). A variant that also gave the model
  each anchor's measured pace and filler rate, with a note that fillers
  alone never withhold band 7, was tried on 2026-09-15 and rejected: it
  lifted the official band 6 candidates to 7 and 7.5. A second variant
  with only a note that Part 1 answers are short and simple by design was
  also tried and reverted: it did not move the band 7.5 Part 1 candidate
  off 6 on the language criteria.
- **Pronunciation call** (step 5): the six reference clips are sent as
  audio before the candidate's own clip(s), each preceded by a short label
  (`Reference recording: official sample candidate, examiner band N`), and
  the system prompt is told to award the band of the reference the
  candidate most resembles, adjusting by one band if clearly better or
  worse. Accent itself is still never penalised, only its effect on
  intelligibility.
- **Toggle**: `OPENAI_SPEAKING_ANCHORS` (vars), `on` (default) or `off`, so
  the effect on grading accuracy can be measured with and without the
  anchors. Only used by the `openai` provider's hybrid pipeline; the
  `audio` mode and the `gemini` rollback never see the anchors.
- **Cost**: the anchors only add to the pronunciation call, which now sends
  about 150 seconds of reference audio (six clips) alongside the
  candidate's own audio, roughly 5 cents extra per pronunciation call at
  current OpenAI audio-input pricing. See "Cost note" below for the
  pipeline's full per-run cost.

Why: speaker-labelled transcription means the language criteria (Fluency &
Coherence, Lexical Resource, Grammatical Range) are graded from the
candidate's own words only, never accidentally scoring the examiner's
question wording or vocabulary. A transcript plus measured timing also
gives those criteria a stronger judge than an audio model guessing at
wording from sound, and the timing statistics are measured rather than the
model's impression of pace. The audio model, in turn, is asked to do only
the one thing it is uniquely suited for, Pronunciation, instead of
splitting its attention across four criteria at once.

Transcription runs once per clip regardless of `GRADING_SAMPLES` (clips are
transcribed in parallel when there is more than one); a "sample" only
repeats the text-grading and pronunciation calls, which also run in
parallel with each other. If transcription fails, the whole grading run
fails, there is no partial hybrid grading.

Set `OPENAI_SPEAKING_MODE=audio` to go back to the original single-call
path (below) without touching `GRADER_PROVIDER`.

### Single-call path (OPENAI_SPEAKING_MODE=audio)

OpenAI's Chat Completions API with an audio model (`OPENAI_AUDIO_MODEL`,
default `gpt-audio-1.5`) grades all four criteria from the raw audio in one
call. Structured output is forced through a single strict function tool
(`submit_assessment`), since audio models do not support
`response_format: json_schema`. This was the only OpenAI path before the
hybrid pipeline and is kept as an option, for example to compare against
the hybrid pipeline or as a fallback if the hybrid pipeline's extra calls
ever become a problem.

## One-time setup (~5 minutes)

1. **OpenAI API key** (default provider), get one at
   https://platform.openai.com/api-keys. The account needs access to an
   audio-capable Chat Completions model, the Responses API, and Whisper
   transcription (the hybrid pipeline's three calls).

   Optionally, also set up a **Gemini API key** at
   https://aistudio.google.com so the rollback path works without a second
   deploy if it is ever needed. Reuse the same key as `workers/grade-essay`
   or get a separate one, either way Cloudflare secrets are stored
   per-Worker.

2. **Deploy the Worker** (needs a free Cloudflare account):

   ```sh
   cd workers/grade-speaking
   npx wrangler login                      # opens browser, authorizes Cloudflare
   npx wrangler secret put OPENAI_API_KEY  # paste the key from step 1
   npx wrangler secret put GEMINI_API_KEY  # optional, only needed for the rollback path
   npx wrangler deploy
   ```

   `deploy` prints the Worker URL, e.g.
   `https://ielts-grade-speaking.<your-subdomain>.workers.dev`

3. **Point the site at it** — set `PUBLIC_SPEAKING_GRADER_URL` to that URL:
   - Locally: add `PUBLIC_SPEAKING_GRADER_URL=https://...workers.dev` to `.env`, restart `npm run dev`.
   - Production: GitHub repo → Settings → Secrets and variables → Actions →
     **Variables** → `PUBLIC_SPEAKING_GRADER_URL` = the Worker URL, then re-run
     the deploy workflow.

   With the variable unset, the site quietly falls back to the offline sample
   grader, nothing breaks, but only Fluency & Coherence gets even an
   approximate score (from recording length/pacing alone); Vocabulary,
   Grammar and Pronunciation genuinely need a model listening to the audio.

## Audio format requirement

The browser now converts recordings before sending them, so this Worker only
ever receives `audio/mpeg` (MP3) or `audio/wav`. With `GRADER_PROVIDER` set
to `openai`, any other mimeType is rejected with a 400 ("Recording format
not supported by the grader; please update the site.") rather than being
guessed at, since OpenAI's `input_audio` (and, in the hybrid pipeline, the
transcription upload) only accepts `mp3` and `wav`. The `gemini` path has
no such restriction, it accepts whatever audio mimeType Gemini itself
supports.

## Local dev

`.dev.vars` (gitignored) holds `OPENAI_API_KEY` and `GEMINI_API_KEY` for
`wrangler dev`, same as `workers/grade-essay/.dev.vars`.

## Config

- `GRADER_PROVIDER` (vars): `openai` (default) or `gemini`.
- `OPENAI_SPEAKING_MODE` (vars): `hybrid` (default) or `audio`. See
  "Hybrid pipeline" above. Only used by the `openai` provider.
- `OPENAI_AUDIO_MODEL` (vars): `gpt-audio-1.5` by default; `gpt-audio-mini`
  is also valid for a cheaper, lower-quality option. Used by the `audio`
  mode's single call and by the hybrid pipeline's pronunciation call.
  Renamed from `OPENAI_MODEL`, which is still read as a fallback if only
  the old var is set (no redeploy-breaking edit required).
- `OPENAI_TEXT_MODEL` (vars): `gpt-5.6-sol` by default. The hybrid
  pipeline's flagship text-grading model. Unused in `audio` mode.
- `OPENAI_REASONING_EFFORT` (vars): `medium` by default. Reasoning effort
  for the hybrid pipeline's text-grading call.
- `OPENAI_TRANSCRIBE_MODEL` (vars): `gpt-4o-transcribe-diarize` by default.
  The hybrid pipeline's speaker-labelled transcription model. Set to
  `whisper-1` for the older word-timestamp transcription with no speaker
  labels (the whole transcript is graded as-is, no candidate/examiner
  split).
- `OPENAI_SPEAKING_ANCHORS` (vars): `on` (default) or `off`. Whether the
  hybrid pipeline's text-grading and pronunciation calls include the six
  examiner-standardisation anchors, see "Examiner standardisation anchors"
  above.
- `GEMINI_MODEL` (vars): `gemini-3.6-flash` since 2026-09-14 (was `gemini-2.5-flash`). Only used by the `gemini` path.
- `ALLOWED_ORIGINS` (vars): comma-separated origins allowed by CORS.
- `GRADING_SAMPLES` (vars): independent grading runs whose median becomes
  the result. Default is provider-dependent: 1 for `openai` (model calls
  are not free, see the cost note below), 3 for `gemini` (free tier, so
  variance-reduction costs nothing extra). Can be raised for `openai` up to
  3 for a steadier band at roughly three times the cost. For the hybrid
  pipeline, only the text-grading and pronunciation calls repeat per
  sample; each clip is transcribed once and reused.

## Cost note (openai provider)

**Hybrid pipeline (default).** For a full ten-minute recording, roughly:
diarized transcription (`gpt-4o-transcribe-diarize`) about 6 cents, the
same order of cost per minute as the old `whisper-1` path; text grading
(FC/LR/GRA) with the flagship model roughly 10 cents, about twice the
per-grading cost of the previous mid-tier text model, still a few cents in
absolute terms; pronunciation (audio model, Pronunciation only) 20 cents, plus roughly 5
cents more with `OPENAI_SPEAKING_ANCHORS` at its default of `on` (about 150
seconds of reference audio sent alongside the candidate's own clips, see
"Examiner standardisation anchors" above);
about 41 cents per grading run at the default `GRADING_SAMPLES` of 1 and
anchors on (36 cents with anchors off).
Raising `GRADING_SAMPLES` only repeats the text-grading and pronunciation
calls (transcription is reused), so it does not multiply the full 36 cents
by the sample count, only the roughly 30 cents of the two repeated calls.

**Single-call `audio` mode.** OpenAI's audio input pricing is about $32 per
million audio tokens (roughly 10 tokens per second of speech), plus a
smaller text-token cost for the rubric and transcript. A full ten-minute
recording graded once costs roughly 20 cents; with `GRADING_SAMPLES` at the
default of 1, that is the cost per grading run. Raising `GRADING_SAMPLES`
to 3 multiplies that cost by three for a steadier band.

## Resilience to rate limits

Each of the three hybrid-pipeline OpenAI calls (transcription, text-grading,
pronunciation), and the single-call `audio` mode, automatically retries on a
429 (rate limited) or a 5xx server error: up to 2 more attempts (3 total),
waiting 15s then 30s between attempts, or the `retry-after` header's value
(capped at 60s) when OpenAI sends one. Every failed attempt is logged
(`OpenAI <call> failed <status> <first 300 chars of the body>`, never the API
key) so a run of 429s is visible in `wrangler tail`. If all attempts are
exhausted, the outward behaviour is unchanged: the site still gets "The
grader is busy right now. Please try again in a minute." How many students
can grade at the same time in practice is set by the OpenAI account's own
rate limits, requests and tokens per minute, which scale up with the
account's usage tier; the retries buy a little headroom but don't remove
that ceiling.

A 429 is not always a rate limit, though: OpenAI also returns 429 when the
account has run out of credits (`insufficient_quota` /
`credit_balance_exhausted` in the error body). That one is never retried,
since waiting cannot refill a spent balance, and is surfaced as a 503 ("The
AI grader is temporarily unavailable. Please try again later.") instead of
the busy message, since it's an owner-side billing problem, not students
grading at the same time. Fix: top up the OpenAI account at
platform.openai.com's billing page.

## Grading calibration

2026-09-14 recalibration (Alex reported the grader was too strict): the four
scales are now the official public IELTS Speaking band descriptors verbatim
(Cambridge English copy of the IELTS.org public version), and the grading
method is the official examiner method: award the band whose cumulative
descriptors the whole performance matches, and never lower a band for a
weakness the descriptor itself allows (Band 7 permits hesitation,
self-correction, some inappropriate word choices and some persistent
mistakes). The earlier anti-leniency rules ("award the lower band on
doubt", "band 8 is rare", "assume automated graders over-score and push
down", a stricter home-made 6/7 gate) were removed because they are not
part of the official method and biased results downward. This rubric is
shared by both providers.

Kept from the 2026-07-10 precision work: evidence-before-band structured
output (the model must write observations before the band, enforced via
`propertyOrdering` on Gemini and field order plus the `evidence`-first
instruction on OpenAI), temperature 0, median-of-N ensemble grading, and the
no-fabrication rule (silent audio scores band 1 with no invented quotes).

## Notes & limits

- Privacy: candidate audio recordings are sent to whichever provider is
  active. With `GRADER_PROVIDER=openai`, that is OpenAI, under OpenAI's API
  data-use terms. With `GRADER_PROVIDER=gemini`, free-tier Gemini may use
  submitted content for model improvement, student recordings are sent to
  Google under those terms.
- The Worker rejects requests whose combined base64 audio exceeds ~15MB.
- CORS restricts *browsers* to the allowed origins, but anyone with the URL
  can curl it directly, acceptable for a free/low-cost study tool.
- `GRADER_PROVIDER` set to anything other than `openai` or `gemini` is a
  misconfiguration and the Worker returns 500.
- The selected provider's key must be set as a secret or the Worker fails
  closed with a 503 ("The speaking grader is not configured") rather than
  silently falling back to the other provider or calling an upstream with no
  key.

## Free-tier quota (gemini rollback path only)

This section applies only when `GRADER_PROVIDER` is rolled back to
`gemini`; the `openai` path is billed, not quota-limited (see the cost note
above). Google's free tier for the flash models is 20 generate requests per
model per project per day. With `GRADING_SAMPLES` at 3 (the `gemini`-path
default), that is about six speaking gradings a day for the whole site,
shared with nothing else on the same model, and the essay grader on the
same key and model competes for the same 20. Real students will see "Daily
free grading limit reached" quickly on this path. Fix: enable pay-as-you-go
billing on the Gemini project, or accept single-sample grading by setting
`GRADING_SAMPLES` to 1 (three times the daily capacity, noisier bands).
