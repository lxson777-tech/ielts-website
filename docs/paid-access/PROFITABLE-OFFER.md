# Approved paid offer and local verification

Update on 1 October 2026: PUBLIC-LESSONS.md supersedes lesson restrictions below. Lesson explanations and worked examples are public without an account; practice and AI still require the appropriate account access. The price and assessment allowances are unchanged.

Alex approved the revised pricing recommendation on 30 September 2026. This supersedes the price and unlimited assessment sections of CONTRACT.md. It is prepared locally in the managed profitable-paid-offer worktree, based on fe4ebdb. Nothing here has been deployed or applied to a real database.

## The offer

12,990 KZT buys 30 days, without automatic renewal. Each purchase includes 12 essay assessments, 6 recorded Speaking assessments of up to 5 minutes each, and 2 live interviews with feedback of up to 15 minutes each. Lessons, vocabulary and ordinary Reading and Listening practice remain unrestricted. Mr EZ retains 40 chat requests and 60 contextual-help requests daily. Its existing shared site ceiling must be reviewed against the paying population before launch.

The 90-day plan is disabled for new orders. Historical orders keep their recorded amount; the legacy plan definition remains available for receipts. Another purchase queues a new period after the existing one and does not immediately refill this period's allowance. Unused assessments do not carry over.

The 72-hour trial includes selected lessons, one Reading test, one Listening test and ONE AI assessment in total: Writing or recorded Speaking. No real live interview is included. Trial Speaking uses a public sample topic with four recorded answers. Existing students' complimentary practice remains a separate promise; no complimentary grants or restrictions have been applied here.

## What changed

- Added a database migration, 2026-09-30-profitable-offer.sql, after the existing trial and paid-access migrations. It updates future pricing and adds an account-owned assessment ledger.
- Every commercial assessment reserves its allowance before the provider is called. The database locks the account during the decision, so concurrent requests cannot claim the last free assessment twice or overspend a paid allowance.
- Successful and pending reservations count. Explicit failed requests restore the assessment. Abandoned reservations remain counted for support reconciliation instead of silently reopening billable work. A separate 24-request rolling-day safeguard counts failed attempts too.
- Live feedback needs the provider session identifier of a successful live reservation belonging to the same student. One feedback request per session; a known failed grade can be retried. Feedback can finish within 24 hours of starting the interview even if access expires. Refunds invalidate that eligibility.
- Recorded-audio duration is calculated from actual MP3 frames or validated PCM WAV headers. Client-reported duration is not trusted. At most eight clips are accepted per assessment. The browser also limits the ordinary recorded task lengths.
- Commercial live sessions use the existing minute scheduler, with closing beginning at minute 14, plus a 15-minute browser stop. The paid-account exemption was removed. Gemini live fallback is refused in commercial mode because it does not implement these controls.
- Essay and recorded Speaking provider calls write usage metadata and HTTP outcomes, including retries and failures, to assessment_provider_usage. Essays, audio and provider response text are not stored there. Missing usage is unknown cost, not zero. Live session billing must still be reconciled against provider invoices.
- Pricing, terms, the English and Russian marketing copy, the trial descriptions and remaining-assessment counts were updated. The paid Speaking trainer now uses recorded assessment; the separate live examiner is still available through its own link.

## Evidence

The complete suite passed 2,399 tests before the final wording and audio-validation refinements. The affected tests were rerun after those refinements. Open and gated production builds succeed. Astro reports no type errors. The gated-content audit reports zero files leaking locked content across 1,890 inspected phrases.

tools/offer-browser-check.py drives the built preview with synthetic local accounts. It opens checkout at 12,990 KZT, presses the clearly labelled simulated Pay button, checks 12/6/2 remaining, checks English and Russian phone layouts, records four answers through Chromium's synthetic microphone, encodes the audio with the real browser encoder, submits through the real Speaking Worker with simulated model replies, checks that the shared trial allowance is consumed and opens Writing to verify it is blocked. These checks do not prove the quality of a real model's feedback or a real payment integration. Screenshots are under offer-proof/.

The Page launch plan and its repository copy use the same approved offer and updated financial assumptions. The knowledge graph was rebuilt with AST extraction, without paid semantic extraction.

## Review locally

The running built preview is http://127.0.0.1:4479/ielts-website/plans. Its payment and AI services on port 8879 are simulated. No card is requested and no real money moves. The scripts tools/offer-preview.ps1 and tools/offer-browser-check.py reproduce this setup and browser check. The backend must be started with --trial and MR_EZ_SITE_ORIGIN=http://127.0.0.1:4479. Never add --live to this verification.

## Before a paid launch

1. Confirm the real merchant integration, operator information, hosting, student-data location, receipt and refund requirements from the launch plan.
2. Define and implement the existing-student complimentary grant, including its AI allowance, without silently reducing existing access.
3. Review and apply the migration and compatible Worker/site settings together after Alex approves deployment. The existing GitHub Pages workflow does not enable the commercial access configuration. Do not enable a payment link on the open-mode build.
4. Verify the provider-side voice close, minute scheduler, failed-closure alerts and emergency stop on the real service. Cron delays or provider failures can exceed the nominal duration; this local test is not proof of a hard billing ceiling.
5. Run an approved, small real-service calibration and reconcile token/audio invoices, retries and support time. Preserve the calibrated models and grading rubrics. Validate abuse protection for repeated free-account creation.
6. Produce the prerecorded live-examiner demonstration before advertising that preview. No new recording was fabricated or generated here.
7. Reconcile the measured economics before releasing more advertising money. The planning model leaves about 2,500 KZT before fixed overhead and tax only if AI/delivery is 4,500, payment fees 390, support 700, recovery provision 400, allocated trials 1,500 and full acquisition 3,000 per first buyer. It is not guaranteed profit.
