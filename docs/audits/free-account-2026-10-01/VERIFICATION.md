# Free-account model: final verification (1 October 2026)

Independent verifier. No product code was changed. Everything ran locally on
Alex's review servers, with synthetic `@example.test` accounts only.

- Code: worktree `musing-mcclintock-862665`, branch `claude/paid-platform-readiness-03c113`, HEAD `a43db5d` (checked).
- Gated build (the sales website plus the platform): `http://localhost:4441/ielts-website`, backed by the local stand-in on 8841.
  **Payments are SIMULATED** (the stand-in's `/__pay` page, no money moves).
  **AI replies are SIMULATED** (the real Workers run, the stand-in answers instead of OpenAI; nothing is billed).
- Open build (today's live site configuration): `http://localhost:4442/ielts-website`, stand-in 8842.
- The review builds were confirmed to be HEAD: I rebuilt both from HEAD and compared every file. The only differences are the service addresses baked in at build time (`1-checks/review-build-vs-head-build.txt`).
- All four review servers (4441, 4442, 8841, 8842) were still running at the end. I started no servers of my own.
- Evidence lives in `verification/`. Every script I wrote is in `verification/scripts/`.

## Bottom line

The model works as written for all four kinds of student, in both languages, on desktop and phone.
Nothing paid leaks to a visitor or to a free account, and the server itself refuses paid material and paid AI to a free account.
There is no trial anywhere for a student to find.
The open build behaves as before.

I found five things worth Alex's attention, none of them a leak of paid material (details at the end):

1. A free student who types the address of the Reading or Listening practice bank (`/trainers/reading`, `/trainers/listening`) gets the bank's catalogue of titles instead of the calm locked page. Every drill inside is still locked. **Product bug, minor.**
2. Russian at 320 wide: the Tests page scrolls 27 px sideways, and pressing the pop-up's sign-up button there raises a browser error (5 times out of 5). The sideways scroll is old (the open build has it too). **Product bug, minor, phone layout.**
3. The "you finished your first lesson" pop-up is remembered per device, not per account. The same student on a second device sees it once more. The code says so on purpose. **Product question.**
4. In /admin, after "Renew", the student's Access block still shows the old end date. The confirmation message and the student's own pages show the new date correctly. **Product bug, cosmetic (admin only).**
5. Signed out, Today shows only the "Create a free account" invitation, not lesson titles (the Course and Lessons library pages do show every title). The written model does not ask for titles on Today, but the brief did. **Product question.**

## 1. Tests, type check, builds, leak audit

| Check | Result | Evidence |
|---|---|---|
| `npm test` | **2475 / 2475 pass**, 0 fail (68 s) | `1-checks/npm-test-tail.log` |
| `npx astro check` | **0 errors, 0 warnings**, 27 hints, 617 files | `1-checks/astro-check-tail.log` |
| Open build | builds, **675 pages** | `1-checks/build-open-tail.log` |
| Gated build | builds, **677 pages** | `1-checks/build-gated-tail.log` |
| Gated leak audit (lesson bodies included) | 2584 phrases (70 papers, **152 lesson bodies, 954 phrases**, 18 lesson quizzes, 479 supporting items): **0 files leak**, 8 share one short line, 1 named exception (the word-of-the-day sampler, Alex's decision of 24 Sept) | `1-checks/leak-audit-gated.log` |
| Same audit on the review server's own build | identical: 0 leak | `1-checks/leak-audit-review4441.log` |
| "trial" in the built gated HTML (679 pages) | **0 links to /trial**, 0 trial wording in attributes; the only text is on /privacy ("The trial is no longer offered, so no new trial records are made"), which is intended | `1-checks/trial-grep-gated.json` |

## 2a. Visitor on the sales website

Builder W's suite `tests/browser/w01_free_account_website.py`, run unchanged against 4441.

| Run | Result | Evidence |
|---|---|---|
| Run 1 | stopped after 8 passes: my console could not print the ₸ sign (Windows code page). **Test-script artefact**, kept as `run1-encoding-crash.log` | `a-visitor-w01/run1-encoding-crash.log` |
| Run 2 (UTF-8 output) | **155 / 155 PASS** | `a-visitor-w01/results.md`, `run2.log`, 30 screenshots |

Covered: English 1440 and 390, Russian 1440, 390 and 320; whole page scrolled with no sideways scroll and the gates opening; free and paid columns and every FAQ answer read correctly in both languages (12,990 KZT, 30 days, no renewal, no refunds, 12 essays, 6 Speaking, 2 live, 2 mocks, placement once); no "trial" anywhere; no link to /trial or a lesson; every call to action lands on sign-up, sign-in or /plans (the paid card's "Get practice and guidance" goes to /plans, the rest to sign-up or sign-in); the questionnaire answers survive sign-up and the profile and arrive on Today; /terms, /privacy, /help in both languages.

## 2b. Signed out on the platform

| Check | Result | Evidence |
|---|---|---|
| Raw HTML of every lesson page as a visitor receives it (no JavaScript) | **76 / 76 lesson pages carry no lesson text** (910 English and Russian phrases taken straight from the lesson sources), all marked as gated; 12 other addresses are redirects | `b-signed-out-html/results.json` |
| Positive control: same check on the open build | 76 / 76 pages DO contain their text, so the check can see a leak | `b-signed-out-html/control-open-build/results.json` |
| Browser, 4 configurations (en 1440, en 390, ru 390, ru 320) | **76 / 80 PASS** | `v3-journeys/results-run1-all-sections-raw.md`, `v3-journeys/shots/b-*` |

What passed in the browser, per configuration: five lessons (Reading, Writing, Vocabulary, Listening, Speaking) show only the title and the sign-up invitation with no sideways scroll; the invitation's sign-up returns to the lesson; Course and the Lessons library list the lesson titles; a Tests start button opens the pop-up, which states the price and whose main button leads to sign-up and then /plans (pressed: lands on sign-up); a direct link to a paid page shows the calm locked page; `/trial?journey=...` goes to sign-up keeping the questionnaire answers.

The 4 failures are one finding, "Today shows no lesson titles to a visitor" (finding 5). The ru 320 run also raised the browser error of finding 2.

## 2c. Free student

| Suite | Result | Evidence |
|---|---|---|
| Every lesson, English and Russian (one free account per language) | **218 / 218 PASS** (run 2) | `c-free-lessons/results.md`, `run2.log` |
| Run 1 of the same | 169 / 214; all 45 failures were my script's own matchers, kept as `results-run1-raw.*` (see below) | `c-free-lessons/results-run1-raw.md` |
| Free journeys: en 1440, en 390, ru 390, ru 320, ru 1440 | **232 / 236 PASS** (run 2) | `v3-journeys-run2-free/results.md`, `run.log`, 74 screenshots |
| Run 1 of the same, inside the all-sections run | 225 / 236; extra failures were my script's matchers | `v3-journeys/results-run1-all-sections-raw.md` |

What was proved:

- **Every lesson opens, in English and in Russian.** All 76 lesson pages: the body arrives through the door; in Russian the page marks the body as Russian and it is substantially Cyrillic (vocabulary lessons keep their English word lists, which is expected). Builder P had not proved Russian bodies; they do render.
- **Every lesson quiz works**: all 18 (Reading and Listening) load, accept an answer and show a score, in English; the 12 Reading quizzes also in Russian.
- **Worked examples**: the 9 Writing lessons that have one on the open build show it (task and Band 8 answer); "problem and solution" has none on either build (no model answer of that type exists).
- **Vocabulary**: all 12 topic lists open with their words (the same 12 as the open build); "Practise these words" opens the pop-up.
- Sign-up leads to the required profile; Today uses the questionnaire answers (Writing first).
- **Every paid entry point opens the pop-up**, with the right reason and without leaving the page: Today's practice-and-guidance card, the Mr EZ launcher (the panel stays closed), lesson help buttons, the in-quiz hint, the lesson's "check your writing" link, all 4 Tests start buttons, and **47 / 47 paid links** found automatically on Tests, Practice, Course, Lessons library, Today, Study plan settings, the Progress report, the drill banks and two lessons (papers, mock, placement, trainers, focused exercises, Writing checker, live examiner, recorded Speaking); plus the account menu's band guide, model answers and cue cards.
- **Direct links show the calm locked page** and its button opens the pop-up: 13 / 15 (trainers for Writing and Speaking, mock, placement, model answers, cue cards, band guide, Writing checker, live examiner, recorded Speaking, two papers, a focused exercise). The 2 misses are finding 1.
- **Pop-up keyboard**: focus moves in, Tab and Shift+Tab stay inside, Escape closes, focus returns to the button that opened it (2 / 2 full keyboard contracts, from a lesson help button pressed with Enter and from a Tests start button).
- **First-lesson nudge**: appears after the first finished lesson; not after the second or third; not after a reload; never opened by itself during the 152 lesson visits of the sweep. On a second device it appears once more (finding 3).
- /plans and /account say "Free account" (and in Russian, "Бесплатный аккаунт"); no trial wording on any page visited. Russian "пробный тест / пробный экзамен" (the normal words for a practice test and a mock exam) appears in 8 places and is not trial wording; listed in `v3-journeys-run2-free/results.json` (`russianProbnyUses`).
- Phones: no sideways scroll on 12 pages at en 390, ru 390 and ru 1440, and on 11 of 12 at ru 320 (Tests is the exception, finding 2); the pop-up fits the screen and its main button can be reached.

## 2d. Paying student (SIMULATED purchase)

**40 / 40 PASS** (`v3-journeys/results-run1-all-sections-raw.md`, section d-paid; screenshots `v3-journeys/shots/d-paid-*`).

/plans offers 12,990; "Buy one month" leads to the SIMULATED provider page; "Pay (SIMULATED)"; the return page says "You're in."; /plans says "Practice and guidance until 31 October 2026"; /account shows Writing 12 of 12, Recorded Speaking 6 of 6, Live interviews 2 of 2, Full mock exams 2 of 2. All 15 paid pages open with no lock and no pop-up (trainers, banks, mock, placement, model answers, cue cards, band guide, Writing checker, live examiner, recorded Speaking, two papers, a focused exercise). A Tests start button goes straight to a paper; a Reading paper was started and submitted and its result appears in the score history. Mr EZ opens its panel; a lesson help button answers (SIMULATED AI) with no pop-up; vocabulary practice opens; paid links navigate. A second, fresh browser signed in to the same account is paid too. After `/__pay/expire`: /plans says "Practice and guidance ended on 1 October 2026", paid pages lock again, lessons stay readable, the saved test result and the purchase history remain.

## 2e. Complimentary student (through the real /admin buttons)

**18 / 19 PASS** in the all-sections run (`v3-journeys/results-run1-all-sections-raw.md`, section e; screenshots `v3-journeys/shots/e-complimentary-*`). A trial run before it gave the same picture.

`admin@example.test` signs in and reaches /admin; the student shows as "Free account"; "Give free access (30 days)" answers "Free access given until 31 Oct 2026."; the student's /plans says "Free access from your teacher until 31 October 2026"; mock, Writing checker, Writing trainer and cue cards open; allowances are the paid ones (12 / 6 / 2 / 2). "Renew (another 30 days)" answers "Renewed: another 30 days, from 31 Oct 2026 until 30 Nov 2026.", a second grant exists in the database, and the student's /plans moves to 30 November. "Stop free access" asks for confirmation, then the student's paid pages lock again, lessons stay readable, and /plans says the access ended. A normal student sees "This page isn't available" at /admin, and calling the admin function directly with their own sign-in is refused; they still have no paid access afterwards.

The 1 failure: the admin's Access block keeps showing the first end date after Renew (finding 4).

## 2f. Returning student

**6 / 6 PASS**. The lesson invitation's "Sign in" link returns to that lesson; after signing in the student lands back on the lesson with its text open. The forgot-password screen opens from sign-in in English and Russian and confirms "check your email" (the stand-in sends no mail).

## 3. The open build (4442): unchanged for today's students

**56 / 56 PASS**, English and Russian. `/` redirects to the dashboard. On Today, two lessons, Tests, Practice, Course, Library, Vocabulary, the Writing trainer, the mock page and model answers: lesson text is open without an account, there is no pop-up, no locked page, no "free account", no price and no "Practice and guidance" prompt, and no trial prompt. A Tests start button opens a paper directly. Finishing a lesson shows no nudge. The Writing trainer opens.

One note, not a regression: the open build's /terms page (which `main` does not have; it came with the earlier trust work on this branch) now describes the free-account offer under its "Buying practice and guidance is not open yet" banner, including "Every lesson is free with an account", although the open site needs no account. Its /plans page shows ₸12,990 with "Payment not connected yet", as before.

## 4. Page errors and hydration

| Run | Visits | Uncaught page errors or hydration messages |
|---|---|---|
| Adapted R06 (`scripts/v4_hydration.py`): en and ru, 1440 and 390, signed-out, free, paid (SIMULATED), complimentary; plain and "stress" (islands start in random order); fresh visit and refresh of 25 pages, clicks through the site's own navigation, back and forward, Today into a lesson | **1640** | **0** |
| Lesson sweep (152 lesson visits plus quizzes and examples) | about 400 | **0** |
| Journeys (all sections) | several hundred | **1**: "Transition was aborted because of invalid state", Russian at 320, signed out, after pressing the pop-up's sign-up button (finding 2) |

## 5. Server refusals (the server decides, not the browser)

**40 / 40 PASS** in the final run (`v5-server-refusals/results.md`). Earlier runs: 38 / 40 because my test requests for Speaking and the live examiner were malformed and were rejected before the access check (kept as `results-run1-raw.json`); fixed in my script.

| Who | Lessons (body en and ru, quiz, worked example) | Papers, Writing questions, model answers, cue-card, band-guide and focused packs | AI |
|---|---|---|---|
| Signed out | 401 sign-in-required | 401 | essay grader 401 |
| Free | **200** | **402 paid-required** (7 / 7) | essay, recorded Speaking, live examiner, Mr EZ: **402 paid-required** (4 / 4); the retired trial cannot be started |
| Paid (SIMULATED) | 200 | 200 | essay graded (SIMULATED) |

## Script artefacts I fixed in my own copies (raw results kept)

- Lesson sweep run 1: my rule "Russian means more Cyrillic than Latin" failed the 34 vocabulary lessons, whose Russian versions rightly keep their English word lists; my quiz scorer lost track of the quiz form once it was checked (4 Listening quizzes); I expected 30+ vocabulary topics and 8 worked examples without first looking at the open build (it has 12 topics, and 9 examples because "problem and solution" has none). Run 2 compares against the open build.
- Journeys run 1: the same Russian rule on one vocabulary lesson (3 checks); my paid-link finder counted the page's own "Skip to content" link (2 checks); a wrong selector for the account menu (fixed before the full run).
- Website suite run 1: console encoding (see 2a).

## Failures and suspected bugs

### 1. Direct link to the Reading or Listening practice bank shows the catalogue, not the locked page
- **Classification:** product bug, minor (no paid material exposed: titles and question counts only; every drill page is locked).
- **Reproduce:** sign up a new free account on http://localhost:4441/ielts-website; type `/ielts-website/trainers/reading` (or `/trainers/listening`) into the address bar.
- **Observed:** "Reading Trainer, Practise one passage at a time..." with the searchable bank of 120 passage drills (titles, question counts, timings). Opening any drill from it shows "Part of practice and guidance" (locked).
- **Expected:** the calm locked page with its "See what practice and guidance adds" button, as on every other paid page. `src/lib/access/paid-routes.ts` lists both addresses as paid, and links to them elsewhere on the site do open the pop-up; only the direct visit differs.
- Evidence: `v3-journeys-run2-free/results.md` ("direct link /trainers/reading"), `repro/free-trainers-reading.png`, `repro/free-trainers-listening.png`, `repro/free-drill-page.png` (script `scripts/probe_drill.py`).

### 2. Russian at 320 wide: Tests page scrolls sideways; the pop-up's sign-up button raises a browser error
- **Classification:** product bug, minor, phone layout. The sideways scroll is old: the open build (today's site) has the same 27 px. The error is new with the pop-up.
- **Reproduce (scroll):** Russian, window 320 wide, open `/tests` (signed out or free). The page is 347 px wide; the widest parts are the Reading group of the papers catalogue (`.test-catalog-group`), the bottom tab bar and the Mr EZ button. English at 320 and Russian at 390 are fine.
- **Reproduce (error):** same page, signed out, press a Tests start button, then the pop-up's main button. The browser reports an uncaught "Transition was aborted because of invalid state" as sign-up opens. 5 times out of 5 in Russian at 320; 0 of 5 in English at 320, Russian at 390 and English at 1440. Sign-up still opens normally, so the student sees nothing wrong. In the 320 screenshot the pop-up also sits flush against the left edge, because the page underneath is wider than the screen.
- Evidence: `repro/probe-320.json`, `repro/tests-ru-320-*.png`, `v3-journeys-run2-free/shots/c-free-ru-320-dialog.png`.

### 3. The first-lesson nudge is remembered per device, not per account
- **Classification:** product question (the code does this on purpose: `src/lib/access/nudge.ts` says "remembered under the account's own key on this device").
- **Reproduce:** free account, finish a lesson, dismiss the nudge; open a new browser, sign in to the same account, finish another lesson.
- **Observed:** the nudge appears once more on the new device. **Expected per the model text ("stored per account"):** never again for that account. Alex to decide whether once per device is acceptable.

### 4. /admin: after "Renew", the Access block still shows the old end date
- **Classification:** product bug, cosmetic, admin only.
- **Reproduce:** in /admin as `admin@example.test`, open a student, "Give free access (30 days)", then "Renew (another 30 days)".
- **Observed:** the message says "Renewed: another 30 days, from 31 Oct 2026 until 30 Nov 2026.", the database has the second grant and the student's /plans says "until 30 November 2026", but the Access block's "Ends" still reads "31 Oct 2026". **Expected:** the panel shows that access now runs until 30 Nov (or shows the queued period).

### 5. Signed out, Today shows only the invitation, no lesson titles
- **Classification:** product question (the written model lists what a visitor may open and says nothing about Today; the brief expected titles there).
- **Observed:** Today: "Free with an account, Your IELTS course, Create a free account to open this...", no titles. Course lists all 76 lessons and the Lessons library lists them by skill, each opening to the invitation.

### Simulated-service limitations (not bugs)
- Payments, expiry and the provider page are the stand-in's SIMULATED versions; a real payment provider was not exercised.
- AI answers (essay grade, lesson help, Mr EZ) are SIMULATED; only the access decisions in front of them are real.
- Forgot-password sends no email locally; only the screen and its confirmation were checked.
