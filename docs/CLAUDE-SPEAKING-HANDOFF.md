# Claude coding handoff: GPT-Live-1 speaking trainer

Alex explicitly wants Claude to do the coding using his Claude Max subscription. Codex supplies this brief. Implement the local integration, not merely a plan. Preserve all unrelated uncommitted changes, especially the homepage journey, capsule navigation, lessons and tests. Do not follow the old homepage Claude design brief for this task.

## Outcome

Connect the existing live IELTS speaking experience to OpenAI GPT-Live-1, the API release announced September 10, 2026. Keep the examiner's IELTS Parts 1, 2 and 3, preparation time, transcript, session controls and existing post-session grading/history. Do not silently replace GPT-Live-1 with gpt-realtime or Gemini and claim success. Keep the old provider available for rollback if practical.

## Establish the real API contract first

Read current official documentation, following the API links in https://openai.com/index/introducing-gpt-live-1-in-the-api/ . The release describes GPT-Live-1 as a full-duplex voice layer with a separate backend reasoning model. Do not assume it shares Gemini or Realtime event schemas, or invent endpoints. Verify browser WebRTC, server session creation, backend delegation, transcripts, authentication, supported voices, teardown and model access requirements against official sources. Record the exact sources and access date. If access is gated or documentation insufficient, complete only grounded components and report the exact blocker.

## Inspect existing implementation

Read AGENTS.md, workers/live-examiner/README.md, workers/grade-speaking/README.md, src/components/LiveExaminer.tsx, src/components/SpeakingTester.tsx, src/lib/speaking/live/, associated routes, configuration and existing tests before editing. The live voice examiner is currently Gemini-backed; recorded speaking grading is separate. Change the live conversation layer, preserve independent grading unless a necessary adapter is justified. Reuse existing IELTS prompts and teaching content.

## Engineering requirements

- Server-only permanent OpenAI key. Never expose it in PUBLIC variables, browser bundles, logs or committed files. Use documented short-lived browser authorization or server-mediated setup.
- Validate origin, inputs and session configuration server-side. Preserve existing abuse controls; do not create an unrestricted paid token endpoint.
- Configurable provider and backend model, sensible documented defaults, no unexpected paid fallback. Explain separately any backend-model cost.
- Keep examiner mode distinct from coaching: do not teach answers during a mock exam. Preserve timing and assessment boundaries. Estimates must not be presented as official IELTS scores.
- Handle denied microphone, connection failure, missing configuration/access, interruptions, retries, stop and unmount. Release microphone tracks, connections and timers. Prevent duplicate sessions and unbounded reconnect loops.
- Display accurate provider/privacy wording. Never claim live grading when a mock or local stub is used.
- Preserve warm white, ink and coral design. No homepage edits or broad redesign.

## Verification and limits

Run focused automated tests with mocked provider events, including setup, transcript/turn mapping, disconnect, cleanup and error paths. Run existing relevant tests, Astro check and build when available. Use the project's verify skill and actual local UI where tools permit. Do not fabricate screenshots or substitute fixture pages for the integrated app. If a tool cannot run, report it accurately.

Do not deploy, push, commit, rotate secrets, install software, enable extra usage, perform billable OpenAI requests or make a real voice call. Do not read credential values into output. You may document required variable names and check only whether a key is configured. Alex will approve paid testing and deployment separately after reviewing the implementation.

## Deliverable

Write docs/CLAUDE-SPEAKING-RESULT.md with changed files, architecture, official API evidence, commands and actual results, precise limitations, required setup and a short review checklist. Distinguish implemented, mock-tested and live-tested. Include a local preview URL only if verified running. Do not call the integration working end-to-end without a real authorized voice test. Finish all locally possible coding and checks before returning.
