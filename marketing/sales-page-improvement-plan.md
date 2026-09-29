# Sales page improvement plan

Updated 2026-09-23. Local preview only. Preserve the campus, opening gates, calm green/orange identity and scroll questionnaire. Feature explanations stay on this page. Entry remains concentrated in pricing and sign-in.

## Build now

- Consolidate speaking into the existing screenshot demo and remove the second large speaking section.
- Remove the repeated teaching-method section before pricing.
- Give the questionnaire a distinct three-day plan for the chosen skill, obstacle and daily time. Retain the daily time breakdown and a copyable plan. Do not describe the target band as an assessed current level.
- Show a clearly labelled illustrative Mr EZ conversation and next practice suggestion.
- Make phone skill navigation a compact tab grid with one full-width explanation; preserve the desktop accordion and keyboard controls.
- Show the agreed three-day no-card trial, with one test each for Reading, Listening, Writing and Speaking (four total). Prices remain 10,000 KZT for one month and 25,000 KZT for three months.
- Fix stale hero-button animation references and verify the actual running page, phone layout, questionnaire and tests.

## Product proof

Current writing before/feedback/after and Mr EZ conversation are labelled illustrative, not real student outcomes or live AI responses. Replace the writing example with an anonymised real report once an approved sample exists. No paid AI generation or student data publication is authorised by this plan. Testimonials can be added later when genuine and approved.

## Trial integration, separate platform change

The marketing checkout has no trial entitlement or billing implementation. Implement against the current platform branch, not this older marketing checkout, after reconciling Claude's account-ownership work.

1. Create a server-owned trial record once per authenticated account, with start and expiry timestamps. Three days, one test allowance per skill.
2. Define exactly which practice and mock-test routes consume an allowance, and whether standalone speaking exercises and the live examiner share it. Define abandoned, failed and retried test behavior before implementation.
3. Enforce expiry and limits at protected backend actions, not only by hiding buttons. Reserve and settle attempts atomically to prevent duplicate submissions and concurrent tabs consuming extra access. Failed service calls must not silently consume an allowance.
4. Add a sign-up entry that opens authentication directly and returns to onboarding. Pass only validated questionnaire choices with consent; never place private practice content in links. Clearly distinguish a suggested plan from saved account data.
5. Show remaining trial access and expiry in the platform. Test fresh accounts, repeat sign-in, expiry, duplicate requests, service failures and cross-account isolation.
6. Connect a chosen payment provider only after agreement on renewal, refunds, paid AI allowances and access expiry. Confirm production deployment separately.

## Decisions still needed

- Public support address.
- Mr EZ trial allowance and paid-plan AI allowances.
- Payment provider, renewal and refund terms.
- Definition of a counted test and abandoned attempt.
- Recording retention and deletion information, verified against the current platform before publishing a privacy explanation.

Do not remove preview notices or enable purchase buttons until the corresponding product behavior is real and verified.
