# Final regression after R01 to R06

30 September 2026, run by the final regression verifier. Branch `claude/paid-platform-readiness-03c113`, HEAD `fe4ebdb` (checked with `git log -1` before and after; unchanged). No product code was changed.

**Every payment in this report is SIMULATED** (the local stand-in's provider page, no money, no card). **Every voice exchange is SIMULATED** (an in-page stand-in plays the examiner; OpenAI is never reached). **Every AI grade and tutor reply is SIMULATED** (fixed, labelled assessments). All accounts are synthetic `@example.test` accounts in local stand-in memory. Nothing was pushed, merged, deployed or sent to a real service; browsers could reach only `localhost` and `127.0.0.1`.

## Verdict

Everything passes. One unexpected failure appeared once and could not be reproduced (the Speaking voice connection in the first t01 run, see failure 1). One failure was my own script's mistake and is fixed (failure 2). No product bug was found in this regression. No uncaught page error was recorded in any suite, including 896 hydration-matrix visits.

## Setup

| Server | Build | Stand-in | Used by |
|---|---|---|---|
| 4491 | open production build, graders and live examiner **unset**, `PUBLIC_SUPPORT_URL` set | 8491 (open) | p01, i01, e01 (open half), cross-checks, open-build checks |
| 4492 | trial production build **without** `PUBLIC_PAYMENTS_URL`, every other service set, `PUBLIC_SUPPORT_URL` set | 8492 (`--trial`) | t01, e01 (trial half), no-payments checks |
| 4493 | trial production build **with SIMULATED payments** (`PUBLIC_PAYMENTS_URL`, `PUBLIC_PAYMENTS_SIMULATED=1`) | 8493 (`--trial`) | paid lifecycle, cross-checks trial pages |
| 4441 / 4442 | Alex's review servers (gated with SIMULATED payments / open), used read-only with synthetic accounts | 8841 / 8842 | R02-R04 check, R06 matrix |

All builds were made with `astro build --outDir` into the scratch folder and served with `astro preview`. My stand-ins read a private content copy built into the scratch folder (`MR_EZ_GATED_DIR`), so the repository's `gated-content/` that Alex's 8841 serves was never rebuilt. My six servers were stopped at the end after matching their recorded PID and command line. 4441, 4442, 8841 and 8842 were never touched and still answered 200 at the end.

Journey scripts were run as **copies** in the scratch folder, repointed to write into `evidence/regression/` (see [patch_scripts.py](evidence/regression/scripts/patch_scripts.py)). No tracked file was overwritten, so nothing needed restoring; `git diff` is empty and `git status` has no new entry outside this folder. A shared [sitecustomize.py](evidence/regression/scripts/sitecustomize.py) blocked non-local network and wrote every uncaught page error to each suite's `page-errors.jsonl`; a [positive control](evidence/regression/logs/page-error-logger-control.jsonl) proved it records a thrown error.

## 1. Unit tests, type check, builds, content scan

| Check | Result | Evidence |
|---|---|---|
| `npm test` | **2,397 / 2,397 PASS**, 0 fail | [log](evidence/regression/logs/npm-test.log) |
| `npx astro check` | 583 files, **0 errors, 0 warnings**, 26 hints | [log](evidence/regression/logs/astro-check.log) |
| Open build | PASS, 675 pages | [log](evidence/regression/logs/build-open.log) |
| Trial build without payments | PASS, 676 pages | [log](evidence/regression/logs/build-trial-nopay.log) |
| Trial build with SIMULATED payments | PASS, 676 pages | [log](evidence/regression/logs/build-trial-pay.log) |
| `trial-content-audit.mjs`, no-payments build | **0 files leak locked content** (1,890 phrases, 70 papers, 139 lessons, 479 pieces); 8 single-line overlaps and the word-sampler exception, same as the re-audit | [log](evidence/regression/logs/leak-nopay.log) |
| `trial-content-audit.mjs`, payments build | **0 files leak locked content**, same notes | [log](evidence/regression/logs/leak-pay.log) |
| Open build `index.html` redirects to `/ielts-website/dashboard` | PASS (file content, and in the browser in all four language/size combinations below) | [index.html](evidence/regression/logs/open-build-index.html.txt) |

## 2. The four existing journeys, intended configurations

| Suite | Configuration | Result | Page errors | Evidence |
|---|---|---|---|---|
| t01 trial journey | trial build without payments (its `/plans` check expects disabled buying) | first run **66 PASS / 2 FAIL, then stopped** (failure 1); rerun alone **89 / 89**; rerun under parallel load **89 / 89** | 0 | [first run](evidence/regression/t01/console.log), [rerun](evidence/regression/t01-rerun/results-t01.md), [load rerun](evidence/regression/t01-load/results-t01.md) |
| p01 placement | open build, graders and live examiner unconfigured | **42 / 42** | 0 | [results](evidence/regression/p01/results.md) |
| i01 goal questions | open build | **66 / 66** | 0 | [results](evidence/regression/i01/results.md) |
| e01 trust and support | open and trial stand-ins, `PUBLIC_SUPPORT_URL` = each stand-in's `/support` | **107 / 107** | 0 | [results](evidence/regression/e01/results.md) |

## 3. Paid lifecycle (gated build, SIMULATED payments)

| Suite | Result | Evidence |
|---|---|---|
| Lifecycle (adapted `journey_c_paying.py`) | **114 / 114** | [results](evidence/regression/lifecycle/results.md) |
| Same, repeated under parallel load | **114 / 114** | [results](evidence/regression/lifecycle-load/results.md) |
| Buying unavailable without `PUBLIC_PAYMENTS_URL`, plus open-build checks | first run **61 / 64** (failure 2, my script); corrected rerun **64 / 64** | [first run](evidence/regression/supplement/results.md), [rerun](evidence/regression/supplement-rerun/results.md) |

What the lifecycle covered, all with SIMULATED payment: signed-out visitor made zero `/content/pack/` requests on seven locked pages; each trial account made zero pack requests on six locked pages before buying; Buy one month, `/__pay` page labelled SIMULATED, Pay, `/plans/return` "You're in", server order paid at 10,000 KZT with exactly one grant, access date on the page matches the server, reload creates no second grant; previously locked lesson, Writing checker (Task 1 and Task 2), cue cards, Band 8 models, band guide, focused exercise, vocabulary review and placement all open; account "Your access" and receipt (number, amount, SIMULATED); three months extends from the first grant's end by 90 days; a **second fresh browser** signs in and is paid; Fail and Cancel (cancelled on the server); interrupted purchase shows the pending order with Check again and changes no grant; refund (`POST /__pay/refund`) locks the lesson again and the content door answers 403; expiry (`POST /__pay/expire`) locks paid material while the Reading result stays on the report. Full sequences ran in EN 1440 and RU 390; the purchase, paid pages and account ran in all four combinations.

The no-payments checks (EN/RU, 1440/390): signed out and signed in, `/plans` says "Payment not connected yet" / "Оплата пока не подключена", both plan buttons are disabled, no enabled Buy or Pay, no SIMULATED banner, no order created on the server, zero pack requests. Open build: `/` redirects to `/dashboard`, and `/dashboard`, `/tests`, `/trainers`, `/lessons/reading/tfng` show no trial or payment prompt, in all four combinations.

Note on the saved pack-request lists: `results.json` lists up to 20 pack requests under "trial-before-buying". That listener stays attached to the same browser after the purchase, so the list later fills with the paid phase's requests. The zero-request checks were taken before buying and passed with an empty list (see the check details). Not a leak.

## 4. Support delivery (inside e01, 107 / 107)

| Requirement | Result |
|---|---|
| Signed-out request (EN/RU, 1440/390) stored with the visitor's email and no account, sent through the support Worker (`8491/support/request`), never straight to the database | PASS, 4 of 4 combinations |
| Signed-in request stored with the account | PASS, 4 of 4 |
| Both kinds reach `/admin` (admin made with `POST /__support/admin`): newest first, "Show all" lists 13 of 13 stored, mark as answered stored | PASS |
| A student at `/admin` is refused; the admin function called directly is refused (403) | PASS |
| Flood: 40 requests with 40 different emails from one played sender, 3 accepted, then `429 source-hour` | PASS |
| After the flood, the flooding sender sees their own reason (EN and RU), and a **different visitor** (`X-Standin-Source`) still sends | PASS |
| Direct anonymous database calls to `support_request_create` and `support_request_visitor` refused (403, 42501), nothing stored | PASS |

## 5. Keyboard: score dialog

| Suite | Result | Evidence |
|---|---|---|
| Cross-checks, all steps (keyboard, Writing label, vocabulary search, leftovers, phone Today, Russian overflow, tutor launcher) | **219 / 219** | [results](evidence/regression/cross-checks/results.md), [measurements](evidence/regression/cross-checks/measurements.json) |
| Keyboard step alone, repeated under parallel load | **56 / 56** | [results](evidence/regression/cross-load/results.md) |

The keyboard step is 7 checks for each of 8 runs: a Reading drill and a full Reading test, EN and RU, 1440 x 900 and 390 x 844. Each run: Start and Submit reached by Tab only, the dialog opens with focus inside and is named by its heading, 20 Tab and 20 Shift+Tab stay inside, Escape closes into review with focus on Score, Score reopens it with focus inside, Review Answers closes it with focus on Score.

## 6. Remediation scripts against the review servers

| Script | Result | Evidence |
|---|---|---|
| `r02_r03_r04_check.py` (R02 privacy 38, R03 "free" 15, R04 320px Writing overview 63, purchase 1, page errors 1) | **118 / 118**, no uncaught page errors | [results](evidence/r02-r03-r04/results.md), [console](evidence/regression/logs/r02r04-console.log) |
| `r06_hydration_navigation.py`, `R06_NAME=r06-final`, full default matrix (EN/RU x 1440/390 x signed-out/trial/paid x plain/stress = 24 runs) | **896 visits, 0 with an uncaught page error or hydration message**; 24 / 24 runs clean | [results](evidence/r06-final/results.md), [console](evidence/regression/logs/r06-console.log) |

Both were run from their tracked location, as their authors intended, and wrote into this folder's `evidence/` (the R02-R04 evidence was replaced by this run).

## Failures

### Failure 1. t01, first run only: the SIMULATED Speaking interview stayed on "Connecting"

- **What happened:** after the "session opened but never connected" step, t01 pressed Start again for the interview with a forced grader failure. The page stayed on "Connecting you to Ms. Taylor…" for more than 30 seconds, so "the interview runs as Part 1" failed ([screenshot](evidence/regression/t01/t16-speaking-interview.png)). The server later recorded one session for the sitting, but no Back button appeared within 150 seconds, so "a grade that fails on our side keeps the test" failed and the script stopped at `Locator.click` on Back. The remaining checks of that run did not execute. [Raw log](evidence/regression/t01/console.log).
- **Conditions:** four other browser suites were running at the same time (lifecycle, cross-checks, R02-R04, then R06).
- **Reproduction attempts:** t01 alone: 89 / 89. t01 again alongside the lifecycle and keyboard suites: 89 / 89, with browser console captured ([console](evidence/regression/t01-load/browser-console.jsonl)). Not reproduced in two attempts. The only product change on this path since the re-audit is the R03 one-line "free" label condition in `LiveExaminer.tsx`, which does not touch connecting.
- **To reproduce:** start a trial build without payments against a `--trial` stand-in, run `t01_trial_journey.py` while other Playwright suites load the machine, and watch for step t16.
- **Classification: simulated-service limitation, not reproduced.** The connection that stalled is the in-page WebRTC stand-in for OpenAI's voice service (`live_standin.js`), not a real service. I cannot fully rule out a product timing problem under heavy load, and the real voice service was not tested at all, which remains on Alex's real-service checklist.
- **Side effect cleared:** the stopped run left my own stand-in (8492) with its test-only forced grader failure switched on. I reset it (`POST /__force {"fail": null}`) before the reruns.

### Failure 2. My supplement script read Russian pages too early (3 checks)

- **What happened:** "open site shows no trial/payment prompt" failed for RU 1440 `/trainers` and `/lessons/reading/tfng`, and RU 390 `/trainers`, each with an empty page text. A probe ([script](evidence/regression/scripts/probe_open_ru.py)) showed that a Russian visit navigates a second time while the saved language is applied; my script read the page during that second navigation. Once finished, every page had full Russian text and no prompt.
- **Fix, in my copy only:** wait for the page language, the finished load and the hydrated page before reading. Rerun: 64 / 64. The raw 61 / 64 result is kept in [supplement/results.md](evidence/regression/supplement/results.md).
- **Classification: test-script artefact.**
- **Evidence note:** while writing the rerun launcher I first made a mistake that sent the rerun's console text into `supplement/console.log`, replacing the first run's console text. The first run's `results.json` and `results.md` (61 / 64) are unaffected. The rerun's results are in `supplement-rerun/`.

## Adjustments made to copied scripts (not product code)

- All copies: output folders repointed to `evidence/regression/`; t01's private-content path pointed at my scratch copy.
- `journey_c_paying.py`: the Russian report row is matched as `Reading|Чтение` (the re-audit's known English-only matcher). With this, the Russian expiry check passed first time.
- `cross_checks.py`: base URLs and output name taken from the environment instead of Alex's review ports.
- `t01_trial_journey.py`: output folder name from the environment for the reruns, and a diagnostic screenshot if the Back button never appears (it never fired in the reruns).
- The adapted scripts are kept in [evidence/regression/scripts](evidence/regression/scripts).

## Not covered here

Real payment provider, real Supabase, real email replies to support, real AI grading and real voice sessions. All of these are still on Alex's real-service checklist in the re-audit report.
