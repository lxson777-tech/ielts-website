# Claude: implement trial access behind the approved design

Owner split agreed by Alex, 2026-09-23: Codex owns visual design and UI; Claude owns platform coding, authentication, access controls, data and integration. This file is the handoff. It is not a claim of direct delivery to a Claude session or that work has started there.

## Start with the running design

Run the existing Astro dev server and open /ielts-website/trial-preview. Verified built preview (served by .codex/trial-preview-server.py): http://127.0.0.1:4343/ielts-website/trial-preview.

Source files to port selectively:
- src/components/TrialPreview.tsx
- src/styles/trial-preview.css
- src/pages/trial-preview.astro (development reference only, noindex; do not publish this mock as the real trial)

This preview uses in-memory example state and fixed sample replies. It makes no sign-up, AI, grading, payment or database calls. Its display state selector and simulation buttons are review tools and must not appear in the student product. The welcome skips authentication intentionally. Do not copy its counters or text labels as enforcement.

Preserve forest #193b36, warm cream #f7f3eb, orange #efa76b, Manrope headings, Inter body, generous spacing, restrained borders, responsive navigation and the bottom Mr EZ panel. Reuse the current platform shell and components instead of shipping a disconnected second dashboard. Keep real lesson/test interfaces intact and apply these access states around them.

## Approved offer

- Three-day trial, account required, no card.
- Limit all four sections; do not expose the whole lesson library.
- One test per section across the entire trial: Reading, Listening, Writing, Speaking, four total. The earlier suggestion of two is superseded.
- Five successfully answered Mr EZ messages PER SECTION across the entire trial, twenty total. No daily reset. Failed requests must not consume a message allowance.
- One selected introductory lesson and small exercise per skill is the proposed limited-content shape represented here. Final library IDs need selection and confirmation.
- Monthly price 10,000 KZT; three months 25,000 KZT total. Paid AI limits, payments, renewal and refunds are not settled.

## Current platform first

Do not merge or deploy the older marketing checkout as the learning platform. Inspect current branches and worktrees; coordinate with the existing personal-learning work. Read AGENTS.md, docs/CLAUDE-PERSONAL-LEARNING-BUILD.md and the newest independent audit. At this handoff the 2026-09-23 review records account ownership defects; verify their current status and do not build trial access on uncorrected cross-account behavior. Preserve other agents' work.

## Screen and state contract

1. Joining: public offer -> existing real authentication -> eligibility check -> explicit trial start/onboarding. Show three days, four tests and per-section tutor allowances before entering. Carry validated questionnaire choices as a suggested starting plan, never as assessed level. Make persistence transparent and account-scoped.
2. Dashboard: selected next lesson, four section tabs, server-authoritative time remaining, per-skill test and message counts. Distinguish available, in progress, used and unavailable. Do not show the fixed sample time from the preview.
3. Lessons: approved allowlisted intro lessons available during active trial. Locked rows retain title and a short reason with View plans. Direct links must obey the same access checks.
4. Tests: available -> starting/loading -> in progress/resumable -> submitted/evaluating -> result or failed/retry. Failed service requests cannot consume the only test. Show why entry is blocked. The preview simulates completion only; build the real full flow.
5. Tutor: explicit section context, five-message allowance per section, pending and successful reply, failed with Retry, exhausted, expired. Do not let students relabel a request to evade a section quota. Decide where general/dashboard chat belongs before enabling it. General chat is not approved as a fifth free bucket.
6. Expiry: new protected activities locked with a calm explanation and View plans. Keeping past results readable is a proposed policy, not yet confirmed by Alex. Never delete results on expiry.
7. Full access: display approved prices. No fake checkout or success. Show a truthful unavailable state until payment provider and commercial terms are approved.
8. Session and network: auth loading must not flash protected content. Include signed-out, expired session, offline, server failure and retry states. Explain failures in plain language without leaking internals.

## Technical responsibilities

- Server-owned trial start/end and entitlements per authenticated account; no resets on device changes, sign-out or repeated sign-up redirects. Specify repeat-trial eligibility.
- Access checks on protected data delivery and every paid AI endpoint. The current static deployment cannot protect already-public HTML/JSON merely with a client lock. Design an authenticated content-delivery boundary for restricted lesson bodies, test questions/answers and assets. Present necessary hosting changes before deploying.
- Atomic, idempotent quota reservation/settlement. Concurrent requests and tabs cannot overspend. Tie each reservation to account, section, request and activity. Retries reuse identity; failed/cancelled/abandoned behavior needs an explicit rule. Protect expiry during in-flight work.
- Gate writing, recorded speaking and live voice appropriately. Streaming replies and interrupted sessions need a deterministic charge/rollback rule. Do not refund successful completed replies just because the browser closed.
- Server-validated skill context for Mr EZ. Record minimal usage metadata; never use a UI-supplied section name as trusted authorization.
- Account isolation across trial counters, questionnaire plan, unfinished tests, notes and results. Reconcile current ownership fixes and migrations first.
- Preserve existing grading quality and paid usage protections. No new billable calibration or AI tests without explicit approval.

## Decisions to resolve before enabling the real offer

- Speaking-session maximum duration and whether the one speaking test includes all three parts; no arbitrary cost promise.
- Final introductory lesson IDs and allowed exercises per skill.
- Definition of starting/consuming a test; resume, abandonment, failed grading and expiry mid-test.
- General Mr EZ chat attribution and paid-plan allowances.
- Post-expiry access to saved results.
- Public support, actual recording retention/deletion practices, payment provider and purchase policies.

Do not invent these commercial or privacy policies. Build the settled pieces, list unresolved decisions precisely and keep affected entry points unavailable until resolved.

## Proof required

Use local test accounts/mocks first, clearly separate from real production verification. Test authenticated enrollment and returning sessions; 72-hour boundary from the authoritative timestamp; one test per skill; five successful tutor messages per skill; concurrent tabs; retries and service failure; refresh and resume; cross-account isolation and sign-out races; direct URL/API bypass attempts; keyboard, phone and reduced-motion behavior; questionnaire transfer. Test exhausted and expired independently. No production database writes, migrations, deployments, main pushes or paid AI calls without Alex's confirmation. Prepare exact commands and rollback first.

Return: changed files/branch, running preview URL, screenshots of key real states, test results, remaining decisions and any deviations from the design for Codex review. Do not report the integration complete from a build alone.
