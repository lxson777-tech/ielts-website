# Claude coding result: GPT-Live-1 speaking examiner

Brief: `docs/CLAUDE-SPEAKING-HANDOFF.md`. Round 1 built the integration on 2026-09-13; round 2 (same day) fixed the five findings from Codex's review. Everything lives uncommitted in the main checkout on top of the unrelated redesign work, which was not touched. Nothing was committed, pushed, deployed, installed, or billed by Claude. No real voice call was made by Claude (see "Real-session evidence" for the one drill Alex ran).

## Status at a glance

| Piece | State |
|---|---|
| Worker creates GPT-Live-1 WebRTC sessions; Gemini kept as rollback | Implemented, mock-tested (31 unit tests) |
| Signed-in students only; server-side token check; per-student and site-wide limits in Supabase | Implemented, mock-tested; needs the new table and one Worker secret before it can run |
| Stage directions validated server-side and injected through OpenAI's sideband; browser cannot append instructions | Implemented, mock-tested; sideband itself not exercised against OpenAI |
| Browser transport and session logic (chronological transcript, close, errors) | Implemented, mock-tested (unit tests + mocked in-app run) |
| Examiner component on either provider, with sign-in gate | Implemented, mock-tested in the real app (dev server + Playwright) |
| Grading and history | Unchanged, exercised in the mocked run |
| Real GPT-Live-1 voice session | One real drill was run by Alex with the round-1 code (session created and graded). The round-2 code has not been run against OpenAI. |

## Round 2: the five findings and what changed

1. **Transcript ordering.** `appendDelta` in `src/lib/speaking/live/openai-session.ts` grouped by "last turn of the same role", so candidate, examiner, candidate within 1.5 s collapsed into two turns out of order. Now a fragment joins only the last turn overall, and only when that turn has the same role and the gap is within `turnGapMs`; anything else starts a new turn. Order is always chronological, including interruptions. The test that accepted the old behaviour was replaced by four ordering tests.
2. **Paid session access.** The Worker required only a browser Origin. Now `POST /` for the OpenAI provider requires `Authorization: Bearer <Supabase access token>`, verified server-side against Supabase Auth. Limits are enforced in a new `live_examiner_sessions` table (service-role access only, no client policies), so they hold across Worker instances: 1 concurrent session per student, 4 per student per UTC day, 60 site-wide per day, a 20 minute activity window for sessions that never report an end. A reservation row is written before the OpenAI call and closed if that call fails. Missing `OPENAI_API_KEY`, `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` fails closed with 503. Origin, CORS and the browser are never treated as authentication.
3. **Examiner instruction integrity.** Round 1 let the browser send `session.instructions.append`; the round-1 report wrongly said the browser could not supply instructions (it could not supply the startup script, but it could append to it). Now the OpenAI session is created with `client.data_channel.allowed_client_events` limited to `session.input_audio.mute`, `session.input_audio.unmute`, `session.close`, so OpenAI rejects appends from the browser. Stage directions are typed cues (`begin`, `part2_intro`, `part2_talk`, `part2_end`, `conclude`, `delegation`) that the browser POSTs to `/direct`; the Worker checks ownership, checks the transition against the session's stored stage, and only then opens OpenAI's sideband WebSocket (`/v1/live/sessions/{id}/attach`, project key) to inject the canonical text. A modified client can still choose *when* to send an allowed cue, and can mute or close its own session, but cannot inject arbitrary text or skip stages. Limitation: the Gemini rollback path still sends `[DIRECTOR]` notes from the browser, because Gemini's ephemeral token gives the browser full control of that session; nothing server-side can change that.
4. **Local configuration.** `ALLOWED_ORIGINS` is now production only. `LOCAL_ORIGINS` (ports 4321 and 4322 on localhost and 127.0.0.1) is honoured only when the Worker itself is served from a loopback host, which is exactly `wrangler dev`. A deployed Worker never accepts a local Origin.
5. **Billing wording.** Voice is $0.05 per minute, billed per second. Creating a WebRTC session bills 15 seconds up front, and that amount is credited against the session's running duration; it is not an extra 15 seconds. Corrected here and in the Worker README and code comments.

## Changed files

New:
- `src/lib/speaking/live/instructions.ts` (round 1): examiner script builder plus `resolvePlanRequest`; shared by site and Worker.
- `src/lib/speaking/live/cues.ts` (round 2): typed stage directions, the stage machine (`nextStage`), canonical texts, and the OpenAI event shape; shared by site and Worker.
- `src/lib/speaking/live/openai-session.ts`: `OpenAiLiveSession` (protocol logic over an injectable transport) and `connectWebRtc`.
- `src/lib/speaking/live/link.ts`: `fetchLiveConfig`, `openExaminerLink`, `liveEndpoint`; one interface for both providers.
- `tests/live-instructions.test.ts`, `tests/live-cues.test.ts`, `tests/live-openai-session.test.ts`, `tests/live-worker.test.ts`.
- `docs/CLAUDE-SPEAKING-RESULT.md` (this file).

Modified:
- `src/components/LiveExaminer.tsx`: drives the link; provider config; sign-in gate when the Worker reports `requiresSignIn`; typed cues instead of free text; graceful close before grading; provider and privacy wording. Layout, timing, Parts 1 to 3, prep minute, recorder, grading, history and `?preview` are unchanged.
- `src/lib/auth/session.ts`: added `getAccessToken()` only.
- `src/lib/speaking/live/script.ts`, `audio.ts`, `session.ts`: as in round 1 (prompt text moved out; WebRTC audio helpers; optional turn timestamps).
- `workers/live-examiner/src/index.ts`, `wrangler.jsonc`, `README.md`: session broker with auth, limits, `/direct`, `/end`, sideband, origin rules.
- `supabase/schema.sql`, `supabase/README.md`: the `live_examiner_sessions` table (idempotent section appended).

## Architecture

```
browser (LiveExaminer.tsx)                          Worker (workers/live-examiner)
  GET  /                                        ->  { provider, model, backendModel, requiresSignIn }
  POST /  { sdp, plan }  + Bearer <Supabase JWT> ->  verify token (Supabase Auth, server-side)
                                                    check limits in live_examiner_sessions (service role)
                                                    reserve a row, build the examiner script from validated ids
                                                    POST https://api.openai.com/v1/live/sessions (project key)
                                                    data channel restricted to mute/unmute/close
                                                <-  { session:{id}, transport:{type:'webrtc', sdp} }
  audio both ways on WebRTC media tracks (never through the Worker)
  POST /direct { sessionId, cue } + Bearer      ->  owner check, stage check, sideband append, stage update
  transcripts: session.input_transcript.delta / session.output_transcript.delta (chronological turns)
  end: session.close -> session.closed (5 s cap) -> close peer -> POST /end -> stop mic
grading: unchanged (recording + transcript -> workers/grade-speaking, Gemini)
```

Delegation stays in `client` mode with no backend (voice cost only). A `session.delegation.created` event is forwarded as a `delegation` cue, and the Worker answers it through the sideband with a fixed "continue from the script" note. `OPENAI_BACKEND_MODEL` remains available and off.

## Official API evidence (accessed 2026-09-13)

Read as raw Markdown (append `.md` to each page) and cross-checked against the official `openai` npm package 7.15.0 type definitions:

- https://developers.openai.com/api/docs/guides/live
- https://developers.openai.com/api/docs/guides/voice-webrtc?api=live (`POST /v1/live/sessions` with `{ session, transport }`, 201, "do not send session.start", data channel `oai-events`, initialization charge credited against duration)
- https://developers.openai.com/api/docs/guides/live-conversations (voices, `instructions` limit, transcript deltas, append events with `delegation_id`, greet-first guidance, `session.close` / `session.closed`, error and moderation events)
- https://developers.openai.com/api/docs/guides/voice-server-controls?api=live (sideband: `wss://api.openai.com/v1/live/sessions/{session_id}/attach` with the project key; commands follow the same validation as the primary connection; acknowledgements carry `client_event_id`)
- https://developers.openai.com/api/docs/guides/live-delegation (client vs Responses delegation, `session.delegation.created`)
- https://developers.openai.com/api/docs/guides/live-prompting (policy-label template)
- https://developers.openai.com/api/docs/models/gpt-live-1 (model id, $0.05 per minute billed per second, Free tier unsupported)
- https://developers.openai.com/api/docs/guides/voice-latency-cost?api=live (WebRTC initialization charge: 15 s billed at creation and credited once the session runs)
- SDK types: `MediaSessionConfig.client.data_channel.allowed_client_events` ("Client event types that the frontend data channel may send").

The announcement page returned HTTP 403 to automated fetches; the developer docs above were used instead.

## Commands run and actual results (round 2, main checkout)

```
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/live-*.test.ts tests/listening-*.test.ts
```
Result: 111 tests, 111 pass, 0 fail (97 live-examiner tests, 14 pre-existing listening tests).

```
npx astro check
```
Result: 0 errors, 0 warnings, 7 pre-existing hints (173 files).

```
npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom --skipLibCheck --noUncheckedIndexedAccess workers/live-examiner/src/index.ts
```
Result: no errors.

```
npm run build
```
Result: succeeded, 125 pages.

Mocked in-app run (dev server + Python Playwright, `e2e_live_mock_v2.py` in the session scratchpad; fake `RTCPeerConnection` and data channel, broker and grader intercepted, Supabase session seeded offline, synthetic microphone): 34 of 34 assertions passed. Covered: signed-in Part 1 drill (session created with the bearer token and a plan of ids only; `begin` cue posted to `/direct` only after `session.started`; the data channel carried only mute/unmute/close, never an instruction or thinking append; delegation forwarded as a cue with nothing on the channel; End test early produced a `conclude` cue; `session.close` then `session.closed`; `/end` posted afterwards; peer closed; mic released; grading and report; candidate/examiner/candidate rendered as three lines in order; attempt saved to `ielts.progress.v1`), signed-out gate (sign-in prompt and button, cards disabled, no broker call), limit reached (exact 429 text shown, peer torn down, mic released, cards re-enabled), and a rejected `begin` direction (409 is non-fatal; interview continues). Console: one browser log line for the mocked 429 and one expected warning for the 409; no errors otherwise. Screenshots in the scratchpad: `live_mock2_interview.png`, `live_mock2_grading.png`, `live_mock2_report.png`, `live_mock2_signed_out.png`, `live_mock2_direct_rejected.png`.

Round-1 mocked run (before the hardening): 26 of 26 assertions, after fixing a peer-connection leak on unexpected disconnect.

## Real-session evidence

At about 18:38 on 2026-09-13 Alex ran one Part 1 drill from localhost against the round-1 Worker running under `wrangler dev` with his own OpenAI key: the local Worker log shows `POST / 201 Created`, and three minutes later the local grading Worker returned `200` after about 20 s. So the round-1 create call, the WebRTC answer, the interview, and grading all worked once for real. Voice quality, turn-taking and the closing line were not reported back. The round-2 code (sign-in, limits, sideband directions) has not been run against OpenAI.

## Precise limitations

- Not live-tested in its final form. The sideband path (`/direct`) is the least proven part: unit tests stub it, and no real cue has been injected through OpenAI's attach endpoint yet.
- Product decision baked in: the GPT-Live examiner now requires an account. Signed-out students see a sign-in prompt. If that is not wanted, the alternative is a different identity source, not an Origin check.
- Limits are best effort at the margin: two simultaneous creates can both pass the check before either reservation row lands. The reservation narrows the window; it does not close it.
- Session duration is not capped server-side. The browser's own clock ends a full test at 18 minutes at the latest and a drill at 8. A closed tab leaves the OpenAI session running until OpenAI ends it; our accounting stops counting it after 20 minutes. Spending is bounded by the daily caps times that duration.
- The Gemini rollback path is unchanged: no sign-in, browser-sent directions, free-tier quota.
- Each cue costs a fresh sideband connection (roughly half a second). Acceptable for stage boundaries; not a per-utterance channel.
- Examiner audio plays through a hidden audio element; iOS Safari autoplay behaviour is untested.
- `session.input_audio.mute` is still allowed from the browser (needed for the prep minute); it cannot change the examiner's behaviour.

## Required setup (Alex decides; each step is billable or externally visible)

1. Supabase: re-run `supabase/schema.sql` in the SQL editor (idempotent) to create `live_examiner_sessions`.
2. Worker secrets from `workers/live-examiner`: `npx wrangler secret put OPENAI_API_KEY` and `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (Project Settings, API, `service_role`; never in the site). `SUPABASE_URL` is already in `wrangler.jsonc`.
3. Local dev: `workers/live-examiner/.dev.vars` needs `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`; run `wrangler dev --port 8788` and point `PUBLIC_LIVE_EXAMINER_URL` at it.
4. `npx wrangler deploy` from `workers/live-examiner`, then rebuild and redeploy the site.
5. Rollback: set `LIVE_PROVIDER` to `gemini` and redeploy; `GEMINI_API_KEY` stays.
6. First paid test of the round-2 code: sign in, run one Part 1 drill with headphones, watch the Worker log for `/direct` 200s.

## Review checklist

- [ ] `workers/live-examiner/src/index.ts`: token verification, limits, reservation, `allowed_client_events`, `/direct` transition check, sideband, origin rule, no secret in any message.
- [ ] `src/lib/speaking/live/cues.ts`: the stage machine matches the exam flow.
- [ ] `src/lib/speaking/live/openai-session.ts`: chronological transcript; no appends from the browser.
- [ ] `LiveExaminer.tsx` diff: cue wiring, sign-in gate, wording.
- [ ] Decide: sign-in required for the live examiner (yes/no), and the four limit numbers in `wrangler.jsonc`.
- [ ] Run the Supabase SQL, set the two secrets, deploy, and run one drill.
