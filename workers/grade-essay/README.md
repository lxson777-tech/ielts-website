# Essay grader Worker

Cloudflare Worker that grades IELTS essays against the official public IELTS
Writing Band Descriptors. The static site never sees any API key, it POSTs
the essay here, and this Worker calls the configured model and returns the
assessment JSON.

**Provider: OpenAI by default**, with Gemini kept working as a one-variable
rollback. See "Provider switch and rollback" below.

## One-time setup (~5 minutes)

1. **Get an OpenAI API key** from https://platform.openai.com (needs a
   funded account; see "Cost" below for what a grade costs).

2. **Deploy the Worker** (needs a free Cloudflare account):

   ```sh
   cd workers/grade-essay
   npx wrangler login                      # opens browser, authorizes Cloudflare
   npx wrangler secret put OPENAI_API_KEY  # paste the key from step 1
   npx wrangler deploy
   ```

   `deploy` prints the Worker URL, e.g.
   `https://ielts-grade-essay.<your-subdomain>.workers.dev`

3. **Point the site at it**, set `PUBLIC_GRADER_URL` to that URL:
   - Locally: add `PUBLIC_GRADER_URL=https://...workers.dev` to `.env`, restart `npm run dev`.
   - Production: GitHub repo, Settings, Secrets and variables, Actions,
     **Variables** tab, `PUBLIC_GRADER_URL` = the Worker URL, then re-run the deploy
     workflow. (The workflow already passes it into the build.)

   With the variable unset, essay grading fails outright with a clear error
   (there is no offline fallback for Writing).

## Config

- `GRADER_PROVIDER` (vars, default `openai`): `openai` or `gemini`. See
  "Provider switch and rollback" below.
- `OPENAI_MODEL` (vars, default `gpt-5.6-sol`) and `OPENAI_REASONING_EFFORT`
  (vars, default `medium`): the model and reasoning depth used for grading.
- `GEMINI_MODEL` (vars): only read when `GRADER_PROVIDER` is `gemini`.
- `ALLOWED_ORIGINS` (vars): comma-separated origins allowed by CORS. Add your
  custom domain here if the site moves.
- `GRADING_SAMPLES` (vars, default `3`): how many independent grading runs the
  Worker takes the **median** of. This cuts the ±1-band luck a single run
  carries at the consequential 7/8 boundary. **Trade-off:** it multiplies the
  model calls (and cost, on the OpenAI path) per grade by this number, set
  `"1"` to reduce cost if needed. Mirrors `workers/grade-speaking`.

## Provider switch and rollback

Both providers implement the exact same rubric and return the exact same
assessment shape, only the API call differs.

- **OpenAI (default):** calls the Responses API
  (`POST https://api.openai.com/v1/responses`) with a strict `json_schema`
  output format, so the model's reply is always well-formed. Needs the
  `OPENAI_API_KEY` secret.
- **Gemini (rollback):** the original implementation, calling Gemini's
  `generateContent` endpoint with a Gemini-flavoured structured-output
  schema. Needs the `GEMINI_API_KEY` secret. Untouched by this migration,
  it still runs the same rubric text as the OpenAI path.

To roll back, set the `GRADER_PROVIDER` var to `gemini` and make sure
`GEMINI_API_KEY` is set, then redeploy. No code change needed. If the
selected provider's key is missing, the Worker fails closed with a 503
("The essay grader is not configured") instead of guessing.

## Official-descriptor recalibration

The rubric now quotes the **official public IELTS Writing Band Descriptors**
verbatim, band by band, instead of a paraphrased summary. Alongside that, a
few home-made grading rules that were never part of the official descriptors
have been removed, because they were adding requirements examiners don't
apply and quietly pulling bands down:

- **"When between two bands, award the lower"**, this isn't in the official
  method. A band is now awarded whenever the essay fully satisfies that
  band's descriptors, not automatically rounded down.
- **"Band 8+ is rare"**, an assumption layered on top of the descriptors, not
  in them. Band 8 and 9 are now awarded whenever the essay's language
  actually matches those descriptors.
- **The over-scoring assumption**, the old prompt told the model "automated
  graders systematically over-score by 0.5-1 band" and asked it to correct
  for that bias pre-emptively. That's not calibration, it's a thumb on the
  scale, and it's gone.
- **The home-made 6/7 gate**, a bespoke list of extra conditions a response
  had to clear to reach band 7 on each criterion, on top of the official
  band 7 descriptor. The official descriptor is now the only bar.

What's unchanged: evidence-first grading (the model fills in concrete quoted
evidence per criterion before committing to a band), whole-number bands per
criterion, and the length/off-topic/memorised-response rules, which do come
from the official method.

## Response shape

Each grade returns an assessment with this shape (mirrors
`src/lib/writing/schema.ts` on the site, and the same `nextBand` /
`actionPlan` fields the speaking Worker returns):

- `criteria.<key>` for each of `taskResponse`, `coherenceCohesion`,
  `lexicalResource`, `grammaticalRange`:
  - `band`: whole number 0 to 9.
  - `comment`: 1 to 3 sentences justifying the band.
  - `tip` (optional): one sentence on the single most important thing to do
    to reach the next band.
  - `nextBand` (optional, omitted when the model's version was missing or
    malformed): how to reach the next band on this criterion.
    - `target`: integer 1 to 9, `min(9, band + 1)`.
    - `gap`: 1 to 2 sentences on what the target band's descriptor requires
      that this essay does not yet show.
    - `actions`: up to 4 items, each `{ do, from, to }`, an imperative
      instruction plus an optional before/after quote pulled verbatim from
      the essay (`from`/`to` are `""` when no single quote applies).
- `moments`: up to 8 short quotes from the essay with a one-line note each.
- `strengths` / `improvements`: up to 6 short bullet phrases each.
- `actionPlan`: up to 6 one-sentence, numbered, priority-ordered steps for
  the student, defaulting to `[]` when the model didn't send one.

`nextBand` and `actionPlan` are additive: a response that omits them (an
older cached result, or the Gemini rollback before it sends these fields)
still validates and is returned as-is, just without those fields, so the
new fields never turn a missing value into a failed grade.

## Cost (OpenAI path)

A single grading run is roughly 3,000 input tokens (rubric + essay) and
1,500 output tokens (the structured assessment). At `gpt-5.6-sol` pricing
of about $2 per million input tokens and $12 per million output tokens,
that's roughly **2 to 4 cents per run**. With `GRADING_SAMPLES` at its
default of 3, one student essay grade costs roughly **6 to 12 cents**.

## Privacy

Essay text is sent to OpenAI (or, on the rollback path, to Google) to be
graded. Review each provider's API data-use terms before relying on this
for essays containing anything sensitive.

## Notes & limits

- The Worker rejects essays over 20k characters or under ~20 words.
- OpenAI 401/403 responses are surfaced as "The OpenAI key was rejected";
  429 as "The grader is busy right now. Please try again in a minute."; any
  other non-2xx upstream response as a 502 with the first 300 characters of
  the provider's own error message.
- CORS restricts *browsers* to the allowed origins, but anyone with the URL
  can curl it directly. Acceptable for a study tool; if abuse ever shows up,
  add Cloudflare rate limiting or Turnstile in front.

2026-09-14: General Training letter grading was removed (the site is Academic only); Task 1 is always graded as a report.

2026-09-14: Moved from Gemini-only to OpenAI by default, with Gemini kept as
a rollback, and recalibrated the rubric to the official public band
descriptors (see above).

## Calibration against official examiner-marked scripts (2026-09-15)

Twelve Task 2 scripts published by IELTS.org with examiner bands (4 to 8.5)
were graded locally. With `gpt-5.6-terra` the grader was exact up to band
5.5 and then a full band under (an official 8.5 graded 6.0). With
`gpt-5.6-sol` plus the five official standardisation scripts now embedded in
the prompt, it matched the examiner exactly on nine of twelve and was half a
band under on two; the one remaining band-under case is a scanned script
whose transcription added errors. The five embedded scripts are also in the
calibration set; on the seven scripts the prompt has never seen, the results
were exact on four, half a band under on two, one band under on one.
