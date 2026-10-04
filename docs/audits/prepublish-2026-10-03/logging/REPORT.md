# Worker logs and the live examiner connection report (4 October 2026)

Alex asked for logs after a student reported a laggy live interview on 3 October (Cloudflare analytics:
ielts-live-examiner served 9 successful requests around 15:00 UTC, nothing failed, no logs were kept).

## What was built (builder commit `ca5445c`, merged in `63cc767`)
- Workers Logs on for all seven Workers (`"observability": { "enabled": true, "head_sampling_rate": 1 }`).
  Cloudflare keeps them 3 days (free plan) or 7 (paid); its per-request logs include headers with sign-in headers
  and keys redacted, and the connection address.
- One structured line per request (`src/lib/observability/request-log.ts`): worker, masked path, status, total ms,
  labels, and each outbound call (service, path, status, ms).
- Privacy fixes: grade-speaking no longer logs OpenAI error bodies (could quote the request); mr-ez and payments log
  only an error's class. `tests/worker-log-privacy.test.ts` fails if any Worker logs a body, essay, transcript,
  audio, prompt, answer, token, key, email, phone or name.
- Live examiner connection report (`src/lib/speaking/live/connection-report.ts`): round-trip time, jitter, packet
  loss, whether audio levels were seen, session length, reply waits over 3 seconds and the longest wait, phone or
  desktop, network type. No audio, no words. Sent once at the end to `POST /report` on the live-examiner Worker,
  which validates, caps and logs it. Goes live on the site side with the next site publish.
- Privacy notice paragraph on logs (English, Russian, Kazakh; Kazakh added to KAZAKH-REVIEW.md 228a to 228c).

## Safety check before redeploying (open mode)
live-examiner (running code from 16 September) and mr-ez (from 24 September): every trial, allowance and paid
database call runs only when ACCESS_MODE is "trial"; the new every-minute timer returns at once in open mode
(checked in code); request and response shapes the live site uses are unchanged; no new secrets or bindings.

## Deployed (Alex approved)
| Worker | Version | Note |
|---|---|---|
| ielts-grade-essay | f1097261-000a-46ca-b0f6-2fe5568d2f01 | config and logging only |
| ielts-grade-speaking | 44bb9910-5aa5-4578-880a-601bcf783231 | config and logging only |
| ielts-live-examiner | 9c298504-8e27-4fe4-ad89-5b674d41b657 | brings the running code from 16 September up to date; timer idle in open mode |
| ielts-mr-ez | 5a8e0485-6b74-46c3-a337-c040b0317460 | brings the running code from 24 September up to date |

Live check: a free 422 request to the essay grader produced one structured log line with no essay text.
`npm test` 2677 of 2677, `npx astro check` 0 errors.
