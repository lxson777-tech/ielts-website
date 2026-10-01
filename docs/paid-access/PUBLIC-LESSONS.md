# Public lessons and account access

Alex confirmed this model on 1 October 2026. It supersedes earlier statements that lesson explanations are locked or expire with a trial. The approved price and AI limits in PROFITABLE-OFFER.md remain unchanged.

## Access rules

- Anyone can browse the lesson library and read explanations, strategies and worked examples without an account, in English or Russian. Reading does not start a trial or consume AI.
- Interactive practice and AI require an account with the appropriate trial, paid or complimentary access. Registration alone does not open the entire platform.
- The existing trial lasts 72 hours: one full Reading test, one full Listening test, one total Writing or recorded Speaking AI assessment, the existing introductory lesson quizzes and limited Mr EZ help. No live AI interview. Public lessons remain readable after expiry.
- Paid access stays at 12,990 KZT for 30 days without automatic renewal. It includes the full practice library and the previously agreed 12/6/2 AI allowances. The 90-day offer stays paused.
- Existing students retain the promise of complimentary practice through accounts. The complimentary grant and its AI allowance still need implementation before launch.

## Implementation

Lesson prose is rendered in the public page and Russian fragments are published for language switching. A build-time guard rejects interactive markup in those fragments, so future exercises must be placed in an account-gated component.

The library and lesson navigation no longer label explanations as locked. The sales page links directly to free lessons. English and Russian describe the distinction between free teaching and account-based practice.

Writing lessons publish one matching worked model where the existing bank has one. Only that model and its own chart are passed into the lesson; the full bank remains private. The trial assessment's model is never selected. There is currently no matching bank model for the problem-solution lesson; its existing explanation and examples remain public. Task 1 charts in selected worked examples are embedded into those examples because the remaining chart files stay private.

Lesson practice now shows an account/access explanation instead of an empty area. Loaded questions are tied to the requesting account and entitlement, removed on sign-out or access expiry, and retrieved through the existing content service. Existing introductory trial quizzes and server allowances are preserved. The optional anonymous vocabulary quiz is replaced by a practice invitation in the commercial build; paid vocabulary practice remains available from its existing page.

## Verification

Verified on 1 October 2026: all 2,401 automated tests passed; Astro reported zero errors and warnings; the commercial build succeeded; the protected-content audit found zero leaking files across 1,594 phrases from 70 papers and 479 supporting items. The final browser journey passed with no page errors, including real menu sign-out and paid expiry. The payments were simulated. Logs: public-lessons-tests-final.log, public-lessons-check-final.log, public-lessons-build.log, offer-leak-audit.log and public-lessons-browser-final.log. Screenshots are in public-lessons-proof/.

The reproducible browser journey is tools/public-lessons-browser-check.py. It uses only local accounts, simulated payments and the real local content service. It checks signed-out lessons and worked examples, Russian phone layout, rejected anonymous content requests, the trial sample, expired trial access, a simulated purchase, paid quiz access, sign-out and paid expiry.

The content audit still checks every public artifact for protected papers, answer keys, full model banks, private packs and test recordings. Public teaching prose and the one worked example are excluded only on their own lesson route. A separate test checks every English and Russian lesson fragment for embedded interactive content.

Preview: http://127.0.0.1:4479/ielts-website/learn

No deployment, production database changes, actual payments or paid model calls were made. Apply this with the complete commercial release candidate, after the remaining launch work and deployment approval described in PROFITABLE-OFFER.md.
