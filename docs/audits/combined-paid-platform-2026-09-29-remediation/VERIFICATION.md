# Verification of the audit remediation (F01 to F12)

30 September 2026. Branch `claude/paid-platform-readiness-03c113`, HEAD `bcbdd4f`, worktree `musing-mcclintock-862665`. The verifier changed no product code, made no commit, and used only synthetic `@example.test` accounts on local servers. **Every payment below is SIMULATED** (the local stand-in's pretend provider; no money moves and no real provider is involved). **Every Mr EZ reply and every essay or speaking grade is SIMULATED** (labelled as such on screen).

## Verdict in one paragraph

The remediation holds up. All four student journeys (visitor, trial student, paying student, returning student) work end to end in a real browser at desktop 1440x900 and phone 390x844, in English and Russian. The paying lifecycle works: buy, confirm, full access everywhere, receipt, extend, second device, failed, cancelled and interrupted purchases, refund and expiry, with results kept. The existing journeys and every builder suite pass, apart from failures that trace to test scripts written before other builders' intentional changes. `npm test`: **2,360 of 2,360 passed**. I found one real but small layout defect (the Russian Submit button is cut off on a 320px-wide phone), one environment problem that will mislead anyone reviewing on Alex's server 4441 as a paying student (details below), intermittent React "hydration" console errors, and a sales-page detail worth a decision (its two plan buttons never become active).

## Servers used

| Server | What it is | Used for |
|---|---|---|
| `localhost:4441` + stand-in `8841` | Alex's review site: trial build, dev server, SIMULATED payments | Journeys A, B, D (trial part), cross-cutting checks, hydration probe |
| `localhost:4442` + stand-in `8842` | Alex's open site, dev server | p01, i01, e01 (open half), Journey D, cross-cutting checks, builder D and C suites |
| `localhost:4491` + stand-in `8491` | Verifier's trial build **without** payments (production build served by `astro preview`), fresh gated content | t01, e01 (trial half), builder B, C, D trial parts |
| `localhost:4492` + stand-in `8492` | Verifier's trial build **with** SIMULATED payments (production build), fresh gated content | Journey C, builder A2 and A3 |

Why Journey C did not run on 4441: Alex's stand-in 8841 serves the worktree's `gated-content/` folder, which was built on 29 September at 19:08, before the paid "packs" existed (it has no `packs/` folder). A paying account there gets "not found" for every pack. Details in failure 1 below. The verifier built a fresh copy of the gated content into its scratch folder and pointed its own stand-ins at it. The verifier's four servers were stopped at the end (by process id, after checking their command lines); 4441, 4442, 8841 and 8842 were left running and answer normally.

## 1. Existing journeys (fresh runs)

Scripts were copied to the scratch folder and only their output folder (and, for t01, the fresh gated-content path) was changed, so no tracked evidence file in `docs/` was touched and nothing needed restoring.

| Journey | Servers | Result | Evidence |
|---|---|---|---|
| t01 trial journey | 4491 / 8491 (no payments) | **89 / 89 PASS** | [results](evidence/t01-trial-journey/results-t01.md), [log](evidence/logs/t01.log) |
| p01 placement journey | 4442 / 8842 | **42 / 42 PASS** | [results](evidence/p01-placement-journey/results.md), [log](evidence/logs/p01.log) |
| i01 goal questions | 4442 / 8842 | **66 / 66 PASS** | [results](evidence/i01-intake-journey/results.md), [log](evidence/logs/i01.log) |
| e01 trust and support | open 4442 / 8842, trial 4491 / 8491 | **91 / 91 PASS** | [screenshots](evidence/e01-trust-journey/), [log](evidence/logs/e01.log) |

## 2. Builder suites (copies pointed at the integrated servers)

| Builder | Script(s) | Servers | Result | Notes |
|---|---|---|---|---|
| B (trial honesty, F02/F03/F08) | `b_checks.py` | 4491 / 8491 | **68 / 68 PASS** | [results](evidence/builder-suites/b/b_results.json), [shots](evidence/builder-suites/b/shots/) |
| C (Russian, F05/F06) | `sales_check.py` | 4491 | **44 / 44 PASS** | [results](evidence/builder-suites/c/sales_results.json) |
| C | `workspace_check.py` | 4442 and 4491 | **76 / 78** | 2 FAIL: test expectation, see failure 5 |
| C | `overflow.py` (measurement) | 4442 | no overflow on `/lessons/writing` or `/lessons/vocabulary`, RU and EN, 390 | [log](evidence/logs/suite-c.log) |
| D (accessibility/layout, F07/F09-F12) | `f07_keyboard.py` | 4442 | **140 / 140 PASS** | [json](evidence/builder-suites/d/f07-keyboard.json) |
| D | `f10_overflow.py` (measurement) | 4442 | vocabulary overview 390 and 320, RU and EN: document width equals screen width, 0 clipped cards | [json](evidence/builder-suites/d/f10-overflow-after.json) |
| D | `f11_search.py` | 4442 | **44 / 44 PASS** | [json](evidence/builder-suites/d/f11-search.json) |
| D | `f12_today.py` | 4442 / 8842 | **32 / 32 PASS** | Its copy still imports the p01 helper from builder D's own worktree (helpers only; the site under test was 4442). |
| D | `f09_launcher.py`, `f09_label.py` (3/3), `f09_sweep.py` | 4442 and 4491 | launcher over content: **0 of 857** scroll frames; 0 intersections at 1440/1280/1152/1024/800 | [sweep](evidence/builder-suites/d/f09-sweep.json) |
| A2 (purchase UI, F01) | `a2_purchase_journey.py` | 4492 / 8492 | **59 / 61** | 2 FAIL: builder-state expectation, see failure 4. A first run against a build without payments switched on (verifier's own build mistake) is kept only as [log](evidence/logs/suite-a2-run1-wrongbuild.log) and not counted. |
| A3 (paid content, F01) | `proof.py` | 4492 / 8492 | **70 / 70 PASS** | Also 70/70 on the no-payments build. Pack requests: trial 0, signed-out 0, expired 0. [results](evidence/builder-suites/a3/proof-results.json) |
| E (trust, F04) | `e01_trust_journey.py` (E's scratch folder only had debug probes) | see above | **91 / 91 PASS** | same run as section 1 |

Also run: the content-leak audit (`tools/trial-content-audit.mjs`) on both verifier trial builds: **0 files leak locked content** in either ([no payments](evidence/logs/leak-dist-trial-nopay.log), [with payments](evidence/logs/leak-dist-trial-pay2.log)).

## 3. The four complete journeys (verifier's own scripts, fresh accounts)

Scripts: [evidence/scripts/](evidence/scripts/). Each journey was run twice. The first run exposed mistakes in the verifier's own expectations (listed under failure 6); those were corrected in the scripts only and the whole journey was run again. Both runs are kept (`*-run1` folders).

### a. Visitor (4441, trial site with SIMULATED payments)

Sales page (opens English for an English device, RU switch, EN switch back), questionnaire with generated three-day plan, pricing, FAQ, footer Privacy / Terms / Ask a person, the trial offer from the plan link, sign-up, profile with explanation, Before you begin, Start, Today. Language checked at every step.

| Combination | Final run | First run |
|---|---|---|
| EN 1440 | 35 / 35 PASS | 34 / 35 |
| RU 1440 | 34 / 34 PASS | 34 / 34 |
| EN 390 | 35 / 35 PASS | 34 / 35 |
| RU 390 | 34 / 34 PASS | 34 / 34 |
| Zero `/content/pack/` requests from visitors and new trial accounts | PASS (0 in all four) | PASS |
| **Total** | **139 / 139** | 137 / 139 |

Screenshots: [evidence/journey-a-visitor/](evidence/journey-a-visitor/), for example [RU phone sales page](evidence/journey-a-visitor/ru-390-01-sales-top.png), [plan](evidence/journey-a-visitor/en-390-02-questionnaire-plan.png), [profile explanation](evidence/journey-a-visitor/ru-390-09-profile.png), [Before you begin](evidence/journey-a-visitor/en-1440-10-before-you-begin.png). No uncaught page errors.

### b. Trial student (4441)

Today with "Your suggested three days" (all three links followed), Tests main buttons fresh (Reading, Listening, Writing, Speaking each to the included item), Practice labelled "full access" before any click, a locked lesson, Mr EZ allowance (5, then 4 after one SIMULATED reply), Reading test started, page refreshed (button becomes Resume, same single reservation), submitted (button becomes See my results, goes to Report), trial rewound 3 days (`POST /__trial/rewind`): Listening button goes to /plans, Today says ended, Ask a person reachable and its form opens, included lesson locked, /plans with prices and active Buy buttons. **Every branch in all four combinations.**

| Combination | Final run | First run |
|---|---|---|
| EN 1440 | 35 / 35 PASS | 35 / 35 |
| RU 1440 | 35 / 35 PASS | 34 / 35 |
| EN 390 | 35 / 35 PASS | 35 / 35 |
| RU 390 | 35 / 35 PASS | 34 / 35 |
| Zero pack requests from trial accounts | PASS (0 in all four) | PASS |
| **Total** | **141 / 141** | 139 / 141 |

Screenshots: [evidence/journey-b-trial/](evidence/journey-b-trial/), for example [routine](evidence/journey-b-trial/en-1440-02-today-routine-open.png), [Tests resume](evidence/journey-b-trial/ru-390-07-tests-resume.png), [ended Today](evidence/journey-b-trial/ru-390-11-today-ended.png), [RU ended lesson](evidence/journey-b-trial/ru-390-12b-lesson-after-trial-ended.png), [plans after the trial](evidence/journey-b-trial/en-1440-13-plans-ended.png).

### c. Paying student (4492, SIMULATED payments, fresh gated content)

Full flow in **EN 1440 and RU 390**: trial, locked pages visited first (0 pack requests), /plans, Buy one month, SIMULATED provider page, Pay, return page ("You're in", date from the server grant, safe to reload, exactly one grant), full Today, previously locked lesson, Writing checker with Task 1 and Task 2, 24 cue cards with model answer, Band 8 model answers, band guide, focused exercise answered and checked, vocabulary review, placement started, Account "Your access" with history, receipt (number, amount, SIMULATED), Buy three months (new grant starts exactly when the first ends, +90 days), a second separate browser signs in and is paid, Fail, Cancel, interrupted purchase (open the provider page, press Back: "unfinished purchase" with Check again, order pending on the server, no extra grant), a second student buys and is refunded (`POST /__pay/refund`: lesson locked on screen, content door answers 403, account says refunded), expiry (`POST /__pay/expire`: account "ended on" with "results kept", lesson locked with "Your full access has ended", the paid-only paper's result still on the Report). Lighter pass (buy, every paid page, account) in **RU 1440 and EN 390**.

| Combination | Final run | First run |
|---|---|---|
| EN 1440 (full) | 41 / 41 PASS | 39 / 41 |
| RU 390 (full) | 39 / 40 | 38 / 40 |
| RU 1440 (light) | 16 / 16 PASS | 16 / 16 |
| EN 390 (light) | 17 / 17 PASS | 17 / 17 |
| Signed-out phone visitor on 7 locked pages: zero pack requests | PASS | PASS |
| **Total** | **113 / 114** | 110 / 114 |

The one remaining FAIL is the verifier's check reading the English row name "Reading" on the Russian report, where the row is "Чтение"; the [screenshot](evidence/journey-c-paying/ru-390-14-report-after-expiry.png) shows 1 attempt kept. Test-script artefact.

Pack-request note: the trial phase of each account was checked at 0 requests before buying. The raw counters in `results.json` for "trial-before-buying" later show 20 because the same browser went on to buy and fetch packs; they are not trial requests.

Screenshots: [evidence/journey-c-paying/](evidence/journey-c-paying/), for example [provider page](evidence/journey-c-paying/en-1440-02-simulated-provider-page.png), [return page](evidence/journey-c-paying/en-1440-03-return-paid.png), [receipt](evidence/journey-c-paying/en-1440-05-receipt.png), [extended](evidence/journey-c-paying/en-1440-06-return-extended.png), [interrupted](evidence/journey-c-paying/ru-390-10-plans-interrupted.png), [refunded](evidence/journey-c-paying/en-1440-12-account-refunded.png), [expired account](evidence/journey-c-paying/en-1440-13-account-expired.png). A separate reproduction of expiry in the same and in a fresh browser: [repro-expire](evidence/repro-expire/) (its 3 "FAIL" rows are the same wording artefact; the text captured in each says "Your full access has ended").

### d. Returning student (4442, plus one trial-site pass on 4441)

Account made in an earlier, closed browser; signed out on a lesson, Mr EZ's Sign in link, sign-in keeps `next=/lessons/reading/paraphrase`, lands back on the lesson; Forgot password screen and its confirmation (local only, no email sent); a separate browser process signs in and Account shows the same name and email.

| Combination | Result |
|---|---|
| EN 1440 | 10 / 10 PASS |
| RU 1440 | 10 / 10 PASS |
| EN 390 | 10 / 10 PASS |
| RU 390 | 10 / 10 PASS |
| Trial site, EN 1440, sign in from the included lesson, back on it | 3 / 3 PASS |
| **Total** | **43 / 43** |

Screenshots: [evidence/journey-d-returning/](evidence/journey-d-returning/).

### Throughout (cross-cutting checks)

| Check | Where | Result |
|---|---|---|
| Keyboard-only result dialog after a drill and after a full Reading test: Start and Submit by Tab, dialog named and focused, 20 Tab + 20 Shift+Tab stay inside, Escape closes into review with focus on Score, Score reopens, Review Answers closes | 4442; EN 1440, RU 390, RU 1440, EN 390 | **56 / 56 PASS** ([dialog](evidence/cross-cutting/kbd-en-1440-drill-dialog.png), [after Escape](evidence/cross-cutting/kbd-en-1440-drill-after-escape.png)); builder D's own 140/140 agrees |
| Writing answer box has a visible label ("Your answer" / "Ваш ответ") that stays after typing | 4442; four combinations | **4 / 4 PASS** |
| Mr EZ desktop launcher intersects no button, link, field or tab, measured with getBoundingClientRect at every 250px of scroll | 8 pages each on the open and trial sites, at 1440, 1280, 1024 | **48 / 48 PASS**, 0 intersections; launcher present on all 48 |
| No document-wide sideways scroll, Russian, 390 wide | 37 pages on the open site and 37 on the trial site, signed in | **74 / 74 PASS** |
| Vocabulary overview at 320 wide | 4442, RU and EN | **2 / 2 PASS** (320 = 320) |
| Vocabulary overview search: topic search, no "No matches" before typing, "Ecology" / "экология" finds a topic, nonsense shows the message, clearing restores all topics | 4442; four combinations | **16 / 16 PASS** |
| Today first phone screen for a fresh signed-in student (open site): one filled primary action, today's Start above the dock, placement offer outlined | 4442; EN 390 and RU 390 | **8 / 8 PASS** in the corrected run ([EN](evidence/cross-cutting-rerun-today/today-first-screen-en-390-after-goal-questions.png), [RU](evidence/cross-cutting-rerun-today/today-first-screen-ru-390-after-goal-questions.png)); first run 5/8, see failure 6 |
| Leftovers | see section 4 | |

Cross-cutting totals: first run [212 / 216](evidence/cross-cutting/results.md) (1 real, 3 script artefacts), corrected Today rerun [8 / 8](evidence/cross-cutting-rerun-today/results.md). All measurements: [measurements.json](evidence/cross-cutting/measurements.json).

## 4. The two builder leftovers, measured

**(i) Russian test player header, "Отправить" (Submit).** Measured on `/tests/reading-full-001` after starting, open site:

| Width | RU button right edge | Document width | Verdict |
|---|---|---|---|
| 390 | 380 | 390 | fully visible, 10px spare ([header](evidence/cross-cutting/leftover-i-submit-header-ru-390.png)) |
| 375 | 365 | 375 | fully visible |
| 360 | 350 | 360 | fully visible |
| 320 | **350** | **350** | **cut off by 30px; the whole page scrolls sideways** ([screenshot](evidence/cross-cutting/leftover-i-submit-ru-320.png)) |

English at 320 fits (right edge 310). So at 390 the leftover does not reproduce; it appears only on the narrowest phones in Russian.

**(ii) Russian Writing overview width at 390.** `/lessons/writing`, `/lessons/writing-task1`, `/lessons/writing-task2`, RU and EN, scrolled to the bottom: document width **390 of 390** on every one, no element past the edge ([RU screenshot](evidence/cross-cutting/leftover-ii-lessons-writing-ru-390.png)). Builder C's `overflow.py` measured the same. The ~401px leftover does not reproduce on the integrated branch.

## 5. `npm test`

Run with all servers up: **2,360 tests, 2,360 passed, 0 failed** ([log](evidence/logs/npm-test.log)).

## Failures and suspected bugs

1. **Alex's review server 4441 cannot show paid content (environment, not code).** Reproduce: on 4441 start a trial, /plans, Buy one month, Pay (SIMULATED), go to Today. Observed: Today, Writing models, cue cards, band guide, focused exercise, vocabulary review, placement and the checker's full choice all show "This page could not be loaded just now" ([Today](evidence/journey-c-light-on-4441/en-1440-p01-today-full.png), [models](evidence/journey-c-light-on-4441/en-1440-p05-model-answers.png)); the previously locked lesson and the Account page do work. 9/17 in that [short pass](evidence/journey-c-light-on-4441/results.md). A direct request showed stand-in 8841 answers 404 `not-found` for a pack after a paid purchase, while the verifier's stand-in with freshly built content answers 200 for the same request. Cause: the stand-in builds `gated-content/` only when the folder is missing, and the worktree's copy predates the packs. Fix for the review: run `node --import ./tests/ts-extension-loader.mjs tools/build-gated-content.mjs` in the worktree and then restart 8841 (the verifier did neither, since both are outside its permission). Worth a small tooling change so the stand-in notices stale content. Good news in the failure: the screen fails calmly, with Try again, and does not unlock anything.

2. **Russian Submit button cut off on a 320px phone (product bug, minor).** Reproduce: open site, Russian, viewport 320x844, `/tests/reading-full-001`, Start test. Observed: "Отправить" runs to x=350, so it is partly off screen and the page scrolls sideways by 30px. Expected: the header fits or wraps. 390, 375 and 360 are fine. Found in `src/components/TestPlayer.tsx` header territory (not investigated further, no code changed).

3. **Intermittent React hydration errors in the console (suspected product issue, low impact).** A probe of 60 page visits ([probe results](evidence/logs/hydration-probe.json)) caught 5 "Minified React error #418" / "Hydration failed because the server rendered HTML didn't match the client": 4492 build `/dashboard` signed out (EN and RU), `/writing/models` signed out (RU), `/account` trial (RU); 4441 dev `/dashboard` signed out (RU). The journeys also logged them on `/tests` (4441), `/plans`, `/dashboard`, `/trial`, `/learn/bands` and `/account` (4492). React then redraws the part of the page, and no broken screen was seen in any check, but it can cause a flicker and it is new noise compared with the audit's "no uncaught page errors". Likely a component that renders differently on the server and in the browser (language, access state or time). Not investigated in code. **Fixed on 30 September 2026** (branch `claude/hydration-fix`): four causes found and fixed, 0 errors in 1,408 visits afterwards. See [HYDRATION-FIX.md](HYDRATION-FIX.md).

4. **A2's suite: 2 FAIL, expectation overtaken by the integration commit (test-script artefact).** `plans: terms and privacy linked, fixed-period fact stated` expects exactly one "Privacy" link on /plans, but builder E's footer (also on /plans) adds a second one; `plans: PurchaseTerms slot present` expects `[data-purchase-terms-slot]`, which commit `96836db` intentionally replaced with E's single purchase-terms block. The block, its Terms of use and Privacy links and "Nothing renews" are present, as the journey C screenshots show.

5. **C's `workspace_check.py`: 2 FAIL on the trial build (test expectation).** "vocabulary overview says Списки тем" fails on the trial site because the trial build locks the vocabulary overview for accounts without that access ("Начните бесплатный пробный период, чтобы открыть это"). The same two checks already failed in builder C's own recorded run. The open site passes.

6. **Verifier-script artefacts, corrected and rerun (not product problems).** Journey A first run: expected "Your Band 7 goal", the page says "Your Band 7.0 goal" (2). Journey B first run: in Russian the ended lesson says "Пробный период закончился", which the check did not recognise (2; [screenshot](evidence/journey-b-trial/ru-390-12b-lesson-after-trial-ended.png)). Journey C: the expired lock says "Your full access has ended", not "Available with full access" (2), and the report check looked for "Band" and for the English row name (3 in total over both runs). Cross-cutting Today: the lime Start button was wrongly excluded as "too light", and the goal-question helper only answers in English (3). All corrected; final runs above.

7. **Observation for a decision: the sales page plan buttons never become active.** On 4441, where buying works, "Choose one month" / "Choose three months" on the sales page are `disabled` in the page source and do nothing when clicked; the way on is the small "View plans" link in the line under them ([screenshot](evidence/journey-a-visitor/en-1440-04-after-pricing-click.png)). They are styled as outlined buttons, so a visitor may not realise they are inactive. Not a regression and not wrong (no one can buy before signing up), but when payments go live they should probably lead to /plans or sign-up.

## Limits

Local development and preview servers only, Chromium only (desktop and emulated phone), no physical phone, no Safari. SIMULATED payments prove the order, grant, replay, failure, refund and expiry rules, not any real provider. SIMULATED AI replies and grades say nothing about real AI quality. Forgot-password proves the screen, not email delivery. No production build was deployed and no real service was called.
