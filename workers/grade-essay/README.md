# Essay grader Worker

Cloudflare Worker that grades IELTS essays with **Gemini Flash (free tier)**.
The static site never sees the API key — it POSTs the essay here, and this
Worker calls Gemini and returns the assessment JSON.

## One-time setup (~5 minutes)

1. **Get a free Gemini API key** — https://aistudio.google.com → "Get API key".
   No credit card. Free tier: ~1,500 requests/day on Flash models.

2. **Deploy the Worker** (needs a free Cloudflare account):

   ```sh
   cd workers/grade-essay
   npx wrangler login                      # opens browser, authorizes Cloudflare
   npx wrangler secret put GEMINI_API_KEY  # paste the key from step 1
   npx wrangler deploy
   ```

   `deploy` prints the Worker URL, e.g.
   `https://ielts-grade-essay.<your-subdomain>.workers.dev`

3. **Point the site at it** — set `PUBLIC_GRADER_URL` to that URL:
   - Locally: add `PUBLIC_GRADER_URL=https://...workers.dev` to `.env`, restart `npm run dev`.
   - Production: GitHub repo → Settings → Secrets and variables → Actions →
     **Variables** → `PUBLIC_GRADER_URL` = the Worker URL, then re-run the deploy
     workflow. (The workflow already passes it into the build.)

   With the variable unset, the site quietly falls back to the offline sample
   grader — nothing breaks.

## Config

- `GEMINI_MODEL` (wrangler.jsonc vars): `gemini-2.5-flash` by default.
- `ALLOWED_ORIGINS` (vars): comma-separated origins allowed by CORS. Add your
  custom domain here if the site moves.

## Notes & limits

- Free-tier Gemini may use submitted content for model improvement — student
  essays are sent to Google under those terms.
- The Worker rejects essays over 20k chars or under ~20 words, and surfaces
  Gemini's 429 as "daily free grading limit reached".
- CORS restricts *browsers* to the allowed origins, but anyone with the URL
  can curl it directly. Acceptable for a free-tier study tool; if abuse ever
  shows up, add Cloudflare rate limiting or Turnstile in front.
