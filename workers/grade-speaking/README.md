# Speaking grader Worker

Cloudflare Worker that grades IELTS Speaking attempts with **Gemini Flash
(free tier)**. Unlike the essay grader, this Worker receives the actual
recorded audio (base64, inline) — not a transcript — so Gemini can judge
Pronunciation directly from what it hears, alongside Fluency & Coherence,
Lexical Resource, and Grammatical Range & Accuracy.

## One-time setup (~5 minutes)

1. **Gemini API key** — reuse the same key as `workers/grade-essay` (same
   Google AI Studio account, same free tier), or get a separate one at
   https://aistudio.google.com → "Get API key" if you'd rather keep the two
   features' quotas independent. Either way, Cloudflare secrets are stored
   per-Worker, so you set it here regardless.

2. **Deploy the Worker** (needs a free Cloudflare account):

   ```sh
   cd workers/grade-speaking
   npx wrangler login                      # opens browser, authorizes Cloudflare
   npx wrangler secret put GEMINI_API_KEY  # paste the key from step 1
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
   grader — nothing breaks, but only Fluency & Coherence gets even an
   approximate score (from recording length/pacing alone); Vocabulary,
   Grammar and Pronunciation genuinely need a model listening to the audio.

## Local dev

`.dev.vars` (gitignored) holds `GEMINI_API_KEY` for `wrangler dev`, same as
`workers/grade-essay/.dev.vars`.

## Config

- `GEMINI_MODEL` (wrangler.jsonc vars): `gemini-2.5-flash` by default.
- `ALLOWED_ORIGINS` (vars): comma-separated origins allowed by CORS.
- `GRADING_SAMPLES` (vars): independent grading runs whose median becomes
  the result (default 3, parallel — no extra latency, 3× token usage).

## Grading calibration

Precision measures (added 2026-07-10): full 1-9 descriptor scales; an
anti-leniency calibration block (grade language not ideas, 6/7 boundary
anchors, "award the lower" on doubt); evidence-before-band structured
output (`propertyOrdering` forces observations to be written before the
band); temperature 0 with a real thinking budget; and median-of-N
ensemble grading. Verified: silent audio scores band 1 everywhere with
no fabricated quotes.

## Notes & limits

- Free-tier Gemini may use submitted content for model improvement — student
  recordings are sent to Google under those terms.
- Confirmed (2026-07-07 manual spike): Gemini accepts `audio/webm` inline
  audio even though it's not on the officially documented MIME list
  (`wav/mp3/aiff/aac/ogg/flac`) — Chrome/Firefox's default `MediaRecorder`
  output works as-is, no client-side transcoding needed.
- The Worker rejects requests whose combined base64 audio exceeds ~15MB
  (Gemini's inline-request limit is ~20MB) and surfaces Gemini's 429 as
  "daily free grading limit reached".
- CORS restricts *browsers* to the allowed origins, but anyone with the URL
  can curl it directly — acceptable for a free-tier study tool.
