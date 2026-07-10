# Live examiner token Worker

Token service for the **live AI examiner** (`/speaking/examiner`): a full
mock IELTS Speaking test held as a real-time voice conversation with Gemini's
Live API (native audio — the examiner's voice is the model itself).

## Why this Worker exists

The browser talks to the Gemini Live API **directly** over WebSocket — lowest
latency, no audio proxying. The browser must never hold the real API key, so
this Worker mints Google **ephemeral tokens**: single-use, ~30-minute
credentials that only work with the Live API (`v1alpha`). One `POST` here =
one interview session.

Verified 2026-07-10: `POST /v1alpha/auth_tokens` with
`{ uses, expireTime, newSessionExpireTime }` + `x-goog-api-key` returns
`{ name: "auth_tokens/..." }`. No SDK required.

## One-time setup

1. Reuse the Gemini API key from `workers/grade-speaking` (same account/quota)
   or mint a separate one at https://aistudio.google.com.

2. Deploy:

   ```sh
   cd workers/live-examiner
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```

3. Point the site at it — set `PUBLIC_LIVE_EXAMINER_URL` to the printed
   Worker URL:
   - Locally: `.env`, restart `npm run dev`.
   - Production: GitHub repo → Settings → Secrets and variables → Actions →
     **Variables** → `PUBLIC_LIVE_EXAMINER_URL`, then re-run deploy.

   Unset, the `/speaking/examiner` page shows a "not configured" notice and
   keeps the start button disabled — nothing breaks.

Grading of the finished interview goes through `workers/grade-speaking`
(`kind: "interview"`), so that Worker must be **re-deployed** whenever it
changes and `PUBLIC_SPEAKING_GRADER_URL` must be set as well.

## Local dev

```sh
npx wrangler dev --port 8788   # .dev.vars (gitignored) holds GEMINI_API_KEY
```

`.env` already points `PUBLIC_LIVE_EXAMINER_URL` at `http://127.0.0.1:8788`.

## Config

- `LIVE_MODEL` (vars): `gemini-2.5-flash-native-audio-preview-12-2025`.
  Alternative: `gemini-3.1-flash-live-preview` — check free-tier quota first.
- `ALLOWED_ORIGINS` (vars): origins that may request tokens. Unlike the grade
  Workers, a missing/foreign `Origin` header is rejected outright (a token
  buys a whole live session, not one request).

## Notes & limits

- Free-tier Gemini may use session content for model improvement — student
  speech is sent to Google under those terms.
- Tokens are single-use (`uses: 1`) and expire 30 min after minting; the
  client has 2 min to actually open the session (`newSessionExpireTime`).
- Sessions use `contextWindowCompression` so a ~14-minute interview isn't
  killed by the default audio-session cap.
- Origin checks raise the bar but are not auth; anyone scripting a browser
  context against the deployed origin could still consume quota. Real
  per-student auth + rate limiting belongs with the paid tier.
