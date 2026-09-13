# Live examiner session broker

Session broker for the **live AI examiner** (`/speaking/examiner`, and the
Speaking Trainer's per-part drills): a real-time voice conversation with an
AI IELTS examiner.

## What it does now

- **Default provider: OpenAI GPT-Live-1**, over WebRTC. The browser records
  its own microphone, creates a local SDP offer, and posts `{ sdp, plan }`
  here. This Worker turns `plan` (only prompt-bank ids, never free-form
  prose) into the examiner's full script, attaches it as the session
  `instructions`, and calls OpenAI's session broker with the real API key.
  OpenAI answers with an SDP answer, which the browser uses to open its own
  WebRTC connection straight to OpenAI. Audio never passes through this
  Worker, only the handshake does. **Requires a signed-in student** (see
  "Who may create a session" below) — this is a paid, per-second-billed
  feature.
- **Rollback provider: Google Gemini Live**, over WebSocket. The browser
  talks to Gemini directly; this Worker only mints Google's short-lived
  "ephemeral tokens" so the browser never holds the real Gemini key. Kept
  working end-to-end so switching providers is a one-variable change, not a
  redeploy of new code. Unauthenticated, matching its lower stakes as a
  free-tier fallback.

Only one provider is active at a time, chosen by `LIVE_PROVIDER`.

## Why the key stays server-side

Whichever provider is active, the real API key never reaches the browser.
For OpenAI, the browser only ever gets back an SDP answer plus a session id,
never the key or a way to derive it. For Gemini, the browser gets a
single-use, time-limited token that only works for one Live API session.

## Who may create a session

`Origin` is a bar-raiser, not authentication — it's trivially forged by
anything that isn't a real browser. Because an OpenAI session is real money
(see Cost notes), creating, directing, or ending one additionally requires a
**signed-in student**: the browser sends `Authorization: Bearer <Supabase
access token>`, and this Worker verifies it server-side against
`GET {SUPABASE_URL}/auth/v1/user` (using the service role key) before doing
anything billable. A missing, expired, or invalid token gets a plain 401,
never a fallback to anonymous access. The Gemini rollback path is
unauthenticated, unchanged from before.

If the security configuration itself is missing (`SUPABASE_URL` or
`SUPABASE_SERVICE_ROLE_KEY` unset, alongside `OPENAI_API_KEY`), every
`openai`-provider request **fails closed** with a 503, it never silently
allows an unverified session through.

## Limits

Enforced server-side against a shared Supabase table
(`live_examiner_sessions`, see `supabase/schema.sql`), so they hold across
every Worker instance and region, not just Worker-local memory:

| Env var | Meaning | Default |
|---|---|---|
| `LIVE_MAX_CONCURRENT_PER_USER` | How many sessions one student can have "active" (no end report, started within the TTL window) at once. | `1` |
| `LIVE_MAX_PER_USER_PER_DAY` | How many sessions one student can start per UTC day. | `4` |
| `LIVE_MAX_SITE_PER_DAY` | How many sessions the whole site can start per UTC day. | `60` |
| `LIVE_SESSION_TTL_MIN` | How long a session with no `/end` call still counts as "active" for the concurrency check. | `20` |

A Supabase query failure during a limits check, or during the reservation
write below, returns a 503 (`temporarily unavailable`), the Worker never
falls open on a check it couldn't actually run.

**Reservation-then-create**: before ever calling OpenAI, the Worker inserts
a `created` row for the session, so it counts toward the limits above for
the whole window it could plausibly be running, not only once OpenAI
confirms it. If the OpenAI call then fails for any reason, that row is
immediately closed (`ended_at` set) so it stops counting. This narrows, but
does not eliminate, a race: two near-simultaneous requests from the same
student can both read "0 active" before either commits its reservation, and
both proceed. There is no distributed lock here, just the same table both
requests write to, which is enough to catch the far more common case (one
session actually running, a second attempt).

**What is still NOT limited**:

- **Session duration** is bounded only by the browser's own clock, capped in
  `LiveExaminer.tsx` at 18 minutes as a hard stop. This Worker has no way to
  force a running OpenAI session to end early.
- **Spend** is therefore bounded by the daily caps above multiplied by that
  duration cap, not by a dollar ceiling.
- **A lost browser tab or crashed device** leaves its session running from
  OpenAI's point of view until OpenAI's own session limits kick in, and
  leaves our accounting row "active" until either a later `/end` call (from
  a resumed session, if the app supports that) or the `LIVE_SESSION_TTL_MIN`
  window elapses, whichever comes first.

## `/direct` and the sideband (privileged stage directions)

Earlier, the browser's WebRTC data channel could send
`session.instructions.append` directly, meaning a modified client could, in
principle, inject its own director instructions mid-session (skip straight
to the closing line, replay a cue, etc). That capability is now removed:
`client.data_channel.allowed_client_events` is `session.input_audio.mute`,
`session.input_audio.unmute`, and `session.close` **only** — the browser can
mute itself and hang up, nothing else.

Instead, stage directions go through this Worker:

- `POST /direct` — body `{ sessionId, cue }`. Requires the same sign-in
  check as session creation. The Worker looks up the session's row by
  `provider_session_id`, confirms the caller owns it and it hasn't ended,
  and validates that `cue` is a legal transition from the session's last
  recorded stage (`nextStage` in `src/lib/speaking/live/cues.ts` — e.g. you
  cannot jump from `part1` straight to `wrapup`). Only if that passes does
  the Worker deliver the director event to the **running** session over a
  trusted server-to-server WebSocket (the "sideband"),
  `wss://api.openai.com/v1/live/sessions/{id}/attach`, opened with the real
  `OPENAI_API_KEY` — a connection the browser has no way to reach. Success:
  `{ ok: true, stage: <new stage> }`. A rejected or out-of-order cue gets a
  `409`; an unknown or foreign session gets `404`/`403`.
- `POST /end` — body `{ sessionId }`. Marks the session's row ended
  (`ended_at`, `stage: 'ended'`) after the same ownership check. This is
  purely our own bookkeeping close, not a call to OpenAI (nothing in the
  API needs telling once the browser closes its own peer connection via
  `session.close`).

## Local previews

`ALLOWED_ORIGINS` is production-only and should stay that way. A second var,
`LOCAL_ORIGINS`, lists origins that are honoured **only when this Worker
itself is being reached at `localhost`/`127.0.0.1`** — i.e. only under
`wrangler dev`. The check is on the Worker's own request URL, not on the
`Origin` header being claimed, so a deployed Worker (its `*.workers.dev` URL
or a custom domain) never honours `LOCAL_ORIGINS` no matter what `Origin` a
request claims; there is no way to spoof "localhost" against production.
Locally this covers both `4321` (the site's normal dev port) and `4322`
(where Astro falls back when `4321` is already taken).

## Request and response shapes

### `GET /`

Reports which provider is live, no key is used and no upstream call is
made.

```json
{ "provider": "openai", "model": "gpt-live-1", "backendModel": null, "requiresSignIn": true }
```

`backendModel` is `null` unless `OPENAI_BACKEND_MODEL` is set. `requiresSignIn`
is `true` for `openai`, `false` for `gemini`. When `LIVE_PROVIDER` is
`gemini`, `model` reports `LIVE_MODEL` instead.

### `POST /`, provider `openai`

Request: `Authorization: Bearer <Supabase access token>`, body

```json
{ "sdp": "v=0...<browser's WebRTC offer>", "plan": { "mode": "part1", "part1TopicIds": ["p1-work"] } }
```

Success, HTTP 201:

```json
{ "provider": "openai", "session": { "id": "..." }, "transport": { "type": "webrtc", "sdp": "v=0...<OpenAI's answer>" }, "model": "gpt-live-1" }
```

Errors: `401` not signed in, `400` for a missing/oversized/malformed `sdp`
or an invalid `plan` (same validation as the app itself uses, via
`resolvePlanRequest`), `429` for a concurrency/daily limit or an OpenAI-side
rate limit, `503` if the service isn't fully configured or Supabase is
unreachable, `502` if OpenAI is unreachable or rejects the key.

### `POST /direct`, provider `openai` only (404 for `gemini`)

Request: `Authorization: Bearer <token>`, body `{ "sessionId": "...", "cue": { ... } }`.
Success, HTTP 200: `{ "ok": true, "stage": "part2prep" }`. Errors: `400`
invalid cue/body, `401` not signed in, `403` not your session, `404` unknown
session, `409` not a legal transition right now / session already ended,
`502` the sideband delivery failed, `503` not configured / Supabase
unavailable.

### `POST /end`, provider `openai` only (404 for `gemini`)

Request: `Authorization: Bearer <token>`, body `{ "sessionId": "..." }`.
Success, HTTP 200: `{ "ok": true }`. Errors as `/direct` (`401`/`403`/`404`/`503`).

### `POST /`, provider `gemini`

Request body may be empty, no `Authorization` needed. Success, HTTP 200:

```json
{ "provider": "gemini", "token": "auth_tokens/...", "model": "gemini-3.1-flash-live-preview", "expireTime": "..." }
```

All routes also return `403` for a missing or disallowed `Origin` header,
and `405` for any method other than `GET`, `POST`, or `OPTIONS`.

## One-time setup (OpenAI, the default)

Requires an OpenAI project on a **paid tier** (Free tier has no GPT-Live-1
access) and the `live_examiner_sessions` table in Supabase (see
`supabase/schema.sql`, "Live examiner sessions table" section of
`supabase/README.md`).

```sh
cd workers/live-examiner
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

Point the site at the deployed Worker URL via `PUBLIC_LIVE_EXAMINER_URL`:
locally in `.env` (restart `npm run dev`), in production under the GitHub
repo's Settings, Secrets and variables, Actions, Variables, then re-run
deploy. Unset, `/speaking/examiner` shows a "not configured" notice and
keeps the start button disabled, nothing breaks.

Grading of the finished interview still goes through `workers/grade-speaking`
(`kind: "interview"`), unaffected by which live provider is active.

## Rollback to Gemini

If the OpenAI path misbehaves, switch back without touching code:

1. Make sure `GEMINI_API_KEY` is still set (`npx wrangler secret put GEMINI_API_KEY`
   if not, reusing the key from `workers/grade-speaking` or a fresh one from
   https://aistudio.google.com).
2. Set the `LIVE_PROVIDER` var to `gemini` in `wrangler.jsonc`.
3. `npx wrangler deploy`.

Switching it back to `openai` later needs no other change, both code paths
stay live at all times.

## Local dev

```sh
npx wrangler dev --port 8788   # .dev.vars (gitignored) holds the secret names
```

`.dev.vars` needs `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (and
`GEMINI_API_KEY` if you also want to exercise the rollback path locally).
`.env` already points `PUBLIC_LIVE_EXAMINER_URL` at `http://127.0.0.1:8788`.
Because `wrangler dev` serves the Worker from a loopback host, `LOCAL_ORIGINS`
applies automatically, no extra config needed to test from `localhost:4321`
or `:4322`.

## Config

| Var | Meaning |
|---|---|
| `LIVE_PROVIDER` | `openai` (default) or `gemini`. Anything else is treated as a misconfiguration. |
| `OPENAI_LIVE_MODEL` | GPT-Live-1 model id. Default `gpt-live-1`. |
| `OPENAI_LIVE_VOICE` | Voice for the examiner. Default `marin`. Other English voices: quartz, ripple, vesper, willow, stone, gleam, meridian, beacon, delta, cinder. |
| `OPENAI_BACKEND_MODEL` | Optional Responses-API model the examiner can delegate to. Empty string (default) means client-only delegation, no backend and no extra cost. |
| `LIVE_MODEL` | Gemini live model, used only when `LIVE_PROVIDER` is `gemini`. |
| `ALLOWED_ORIGINS` | Comma-separated **production** origins allowed to request a session. Always honoured. |
| `LOCAL_ORIGINS` | Comma-separated origins additionally allowed, but only when this Worker itself is served from `localhost`/`127.0.0.1` (`wrangler dev`). Ignored entirely on a deployed Worker. |
| `SUPABASE_URL` | Supabase project URL, used to verify signed-in students and store session bookkeeping rows. |
| `LIVE_MAX_CONCURRENT_PER_USER` | Max sessions one student can have active at once. Default `1`. |
| `LIVE_MAX_PER_USER_PER_DAY` | Max sessions one student can start per UTC day. Default `4`. |
| `LIVE_MAX_SITE_PER_DAY` | Max sessions the whole site can start per UTC day. Default `60`. |
| `LIVE_SESSION_TTL_MIN` | Minutes a session with no `/end` call still counts as active. Default `20`. |
| `OPENAI_API_KEY` | Secret. Required when `LIVE_PROVIDER` is `openai`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret. Required when `LIVE_PROVIDER` is `openai`; verifies students and reads/writes `live_examiner_sessions`, bypassing RLS. Never put this in the site. |
| `GEMINI_API_KEY` | Secret. Required when `LIVE_PROVIDER` is `gemini`. |

## Cost notes

- OpenAI voice is billed at $0.05/min, per second. Opening a WebRTC session
  bills 15 seconds up front, but that charge is **credited against** the
  session's own running time once it starts, it is not billed in addition
  to it. A 40-second session is billed 40 seconds total, not 55. The
  15-second charge only bites as a floor: opening and immediately closing a
  session still costs 15 seconds of voice time.
- Backend (Responses API) usage is billed separately, at that model's normal
  rate, and only happens at all when `OPENAI_BACKEND_MODEL` is set. By
  default there is no backend, so no extra cost.
- Gemini's free tier has its own daily quota, surfaced to the browser as a
  429 if it's exhausted.

## Privacy notes

- With the OpenAI provider active, the candidate's interview audio is sent
  to OpenAI for the duration of the session.
- With the Gemini provider active, the candidate's interview audio is sent
  to Google instead. Gemini's free tier may use session content for model
  improvement under its own terms.
- Either way, the separate grading Worker (`workers/grade-speaking`) still
  sends the finished recording to Google Gemini afterward to produce a band
  score, independent of which provider ran the live interview.

## Abuse-control notes

- `Origin` is checked on every route, but it's a bar-raiser, not
  authentication, it's trivially forged by anything that isn't a real
  browser. Real authentication for the `openai` provider is the Supabase
  token check described above under "Who may create a session".
- The OpenAI session config restricts what the untrusted browser data
  channel may send (`client.data_channel.allowed_client_events`) to muting,
  unmuting, and closing the session, nothing that could rewrite the
  examiner's script. Privileged stage directions travel over `/direct` and
  the server-side sideband instead (see above).
- The browser only ever sends prompt-bank ids (`plan.mode`,
  `plan.part1TopicIds`, `plan.cueCardId`), this Worker is the only place
  that turns those ids into the examiner's actual script, via the shared
  `resolvePlanRequest` / `buildInstruction` helpers in
  `src/lib/speaking/live/instructions.ts`. The browser can never inject
  free-form instructions into a live session.
- Creation, concurrency, and daily-volume limits are enforced server-side
  (see "Limits" above) and fail closed, not just Origin-gated as before.

## References

Verified 2026-09-13 against the official OpenAI docs and SDK source:

- https://developers.openai.com/api/docs/guides/live
- https://developers.openai.com/api/docs/guides/voice-webrtc?api=live
- https://developers.openai.com/api/docs/guides/live-conversations
- https://developers.openai.com/api/docs/guides/live-prompting
- https://developers.openai.com/api/docs/models/gpt-live-1

Gemini contract verified 2026-07-10: `POST /v1alpha/auth_tokens` with
`{ uses, expireTime, newSessionExpireTime }` and the `x-goog-api-key` header
returns `{ name: "auth_tokens/..." }`.
