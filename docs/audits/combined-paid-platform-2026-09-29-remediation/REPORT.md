# Remediation of the combined paid-platform audit

30 September 2026. Branch `claude/paid-platform-readiness-03c113` (local; a
pull request was opened and then closed at Alex's request, nothing merged, the
live site untouched). Answers
[the audit](../combined-paid-platform-2026-09-29/REPORT.md) finding by finding.
The full browser verification is in [VERIFICATION.md](VERIFICATION.md);
screenshots and logs are under `evidence/` (kept locally, not committed:
about 165 MB).

Everything below was proved locally with synthetic `@example.test` accounts.
**Every payment is SIMULATED** (a stand-in provider page; no money, no card, no
real provider) and **every AI reply and grade is SIMULATED**. Nothing was
deployed, no migration was applied to the real database, no secret changed.

## Alex's decisions used (29 September 2026)

- Operator: Alex as a sole trader. **Name and contact not supplied yet**: kept
  hidden, nothing invented.
- Payment provider: not chosen. Buying stays switched off unless a payments
  Worker is configured.
- Access: one month (10,000 KZT) or three months (25,000 KZT) that simply
  ends; no automatic renewal; no refunds after purchase (the free trial is the
  chance to try).
- Paid AI use: unlimited normal study with the existing fair daily limits.

## Findings

| # | Status | What changed for the student |
|---|---|---|
| F01 | **Partially fixed, blocked on a provider** | The whole purchase-to-access chain exists and works with the simulated provider (below). What is missing is a real payment company, plus the production steps. |
| F02 | Fixed | The Tests page's main buttons open the student's own included test, resume an unfinished one, show "used" with the results, or "ended" with the plans. A trial account is never sent to a locked paper. |
| F03 | Fixed | One description of the trial, used everywhere: Academic IELTS, three days, no card, one lesson and one test per section (full Reading, full Listening, one Writing Task 2 essay, Speaking Part 1 about five minutes), five Mr EZ messages per section. Locked trainers say "full access" before the click and offer the included lesson or test instead. "No account needed" and "free" only appear where true. |
| F04 | **Partially fixed, blocked on Alex's details** | "Ask a person" form (messages land in Alex's admin panel, with Reply by email and Mark as answered), reachable from Help, every footer, the sales page, locked and ended screens, Mr EZ and grader failures, and the plans page. New Privacy and Terms pages in English and Russian. Sign-up and profile explain why each detail is asked and who sees it; every required field kept. Missing: the operator's name and contact, and how long data is kept / how deletion works. |
| F05 | Fixed | Russian mode no longer shows English interface sentences or counts on Tests, Practice or the vocabulary overview ("40 вопросов", "120 тренировок", "Списки тем"), and a sweep fixed the same kind of leftover elsewhere. A new test reads the page templates and fails on unmarked English text, glued counts and untranslated headings, so these can no longer slip through. |
| F06 | Fixed | The sales page is fully Russian (questionnaire, the generated plan for all 72 answer combinations, offer, prices, demos, FAQ, footer) with an EN/RU switch in the approved design. The choice carries through the trial page, sign-up, profile and the workspace, and a student who chose Russian in the workspace sees the sales page in Russian. |
| F07 | Fixed | After a test or drill the score window takes keyboard focus, is announced as "Your Score", keeps Tab and Shift+Tab inside, closes with Escape into the review, and returns focus to the Score button, which reopens it the same way. The Writing answer box has a visible "Your answer" label. The unanswered-questions warning stays an inline alert. |
| F08 | Fixed | The trial's Today has a folded "Your suggested three days", built from the questionnaire answers by the sales page's own plan generator. Each day links only to what the trial includes, and it says a timed test is a separate, longer sitting. |
| F09 | Fixed | On desktop Mr EZ's button is a compact avatar (label on hover and keyboard focus) with a reserved margin: 0 overlaps in 857 measured scroll positions at 1440, 1280, 1152, 1024 and 800 wide (34 of 60 states overlapped before). Phone dock unchanged. |
| F10 | Fixed | Russian vocabulary cards fit a 390 and a 320 pixel phone with full titles and no sideways scroll. |
| F11 | Fixed | On the vocabulary overview the box is "Find a topic" and finds topics in either language (e.g. "экология" and "Ecology"); word search stays on word-list lessons; "No matches" only after something is typed. |
| F12 | Fixed | The placement offer on Today is a compact invitation with one sentence on how it relates to today's work and "Not now"; today's Start is the only filled button and sits in the first phone screen. Still paid-only and one sitting. |

### F01 in detail: what a (simulated) purchase now does

Proved in the browser at 1440x900 and 390x844, English and Russian
([journey C](evidence/journey-c-paying/)):

1. `/plans` shows the student's access (trial running, trial ended, full access
   until a date, or ended on a date), the two plans with Buy buttons, the
   purchase terms, Terms and Privacy links, and a SIMULATED banner.
2. Buy leads to the provider page ([simulated](evidence/journey-c-paying/en-1440-02-simulated-provider-page.png)); Pay returns to
   "You're in" with the access-until date and a receipt number
   ([screenshot](evidence/journey-c-paying/en-1440-03-return-paid.png)).
3. Today becomes the full product; locked lessons, the Writing checker with
   every question, cue cards, model answers, band guide, practice exercises,
   vocabulary review and the placement test all open
   (`en-1440-p01` to `p09`).
4. A second, fresh browser signs in and is paid too
   ([screenshot](evidence/journey-c-paying/en-1440-07-second-browser-today.png)): access belongs to the
   account, recorded by the server, never granted by the browser or the build.
5. Account shows "Your access", purchase history and a printable receipt
   ([account](evidence/journey-c-paying/en-1440-04-account-access.png), [receipt](evidence/journey-c-paying/en-1440-05-receipt.png)).
6. Buying again extends the end date; a failed or cancelled payment explains
   itself and charges nothing; a purchase abandoned mid-way shows on `/plans`
   with Check again; a refund (only possible from the provider's side) and the
   end of access lock paid material again, and the student keeps every result.
7. Trial accounts and signed-out visitors make **zero** requests for paid
   material in every combination, and the leak check finds no paid material
   in any public file.

**Still needed before real money:** Alex picks a payment company (Kaspi or a
card acquirer) and is approved; its adapter and secrets are added (the
payments Worker has one simulated adapter and a clear interface for a real
one); the two new database changes (`2026-09-30-paid-access.sql`,
`2026-09-30-support.sql`) are applied to production and the payments Worker
and content gate deployed, each only with Alex's yes; the operator's name and
details go on receipts.

## Found and fixed along the way

- Placement screens used the removed sign-in popup (site did not build);
  placement material would have been written into the trial's public pages;
  "Weak"/"Strong" clashed in Russian with the password hint.
- The drill band, test-instruction wording, Mr EZ sign-in return and two
  untranslated plan lines from an earlier branch that never shipped.
- Russian Submit button ran off a 320 pixel phone (now right edge 314 of 320,
  checked at 320, 360 and 390 in both languages).
- The sales page's plan buttons were always disabled even where buying works;
  they now lead to `/plans` there, and stay honestly unavailable elsewhere.
- The local stand-in served an old copy of the private content store, so on
  the review server every paid page said "could not be loaded"; it now
  rebuilds that store on every start.
- The plans page listed the purchase facts twice, and one version claimed AI
  feedback has daily limits, which is not true (only Mr EZ and the live
  examiner do); one accurate block remains.
- Generated files failed their checks in fresh Windows copies because of line
  endings; a `.gitattributes` rule keeps them stable.

## Tests and browser proof

| Check | Result |
|---|---|
| `npm test` (final) | 2,360 / 2,360 |
| `npx astro check` | 0 errors, 0 warnings |
| Builds | gated (trial) build 676 pages, open build 675 pages; open `/` still redirects to the dashboard |
| Leak check on the gated build | 0 files leak locked content |
| t01 trial journey | 89 / 89 |
| p01 placement journey | 42 / 42 |
| i01 goal questions | 66 / 66 |
| e01 trust and support | 91 / 91 |
| Visitor journey (EN/RU, 1440/390) | 139 / 139 |
| Trial student journey | 141 / 141 |
| Paying student journey | 113 / 114 (the miss is the check looking for an English word on the Russian report; the result is there) |
| Returning student journey | 43 / 43 |
| Keyboard score window | 56 / 56 (builder D's own run 140 / 140) |
| Paying student on the review server after the fixes | 17 / 17 |
| Builder suites | B 68/68, A3 70/70, C sales 44/44, D 140/140 + 44/44 + 32/32, A2 59/61 and C workspace 76/78 (misses are test scripts written before other builders' intentional changes; see VERIFICATION.md) |

New focused regression tests include trial test routing
(`tests/trial-test-routing.test.ts`), the score window's keyboard contract
(`tests/result-dialog-a11y.test.ts`), paid access in the database, payments
Worker and gates (`tests/paid-*.test.ts`), packs (`tests/paid-packs.test.ts`),
support requests (`tests/support-sql.test.ts`), the operator guard
(`tests/operator.test.ts`), vocabulary search, and the Russian template
coverage (`tests/i18n-templates.test.ts`).

## Still open

**Needs Alex:**
1. Operator name and contact, to publish in `src/lib/operator.ts` (they then
   appear in the footer, Privacy, Terms, the support page and receipts).
2. How long profiles, essays, results and payment records are kept, and how
   an account is deleted (Privacy says this is being decided; a paying account
   currently cannot be deleted, to keep payment records).
3. A payment company.
4. A lawyer's check that a no-refund rule is allowed for consumers in
   Kazakhstan.
5. Whether essay and speaking grading should have a daily cap for paying
   students (today they have none; "fair daily limits" applies to Mr EZ and
   the live examiner).

**Needs a real-service check, only with Alex's approval:** real payment
provider, the migrations on the production database, Worker deploys, real
emails, a small paid AI and live-voice check.

**Separate, pre-existing:** occasional React "hydration" console messages
(page redraws, no broken screen), seen before this work too; offered as a
separate task. The site map also lists a few no-index pages (`/plans`,
`/trial`, new access pages).

## Local review

Production builds served locally (not development servers), with the free
stand-ins:

- Visitor, trial and paying student (SIMULATED payments):
  `http://localhost:4441/ielts-website`, stand-in `8841`.
- Open site, today's live behaviour: `http://localhost:4442/ielts-website/dashboard`,
  stand-in `8842`.
