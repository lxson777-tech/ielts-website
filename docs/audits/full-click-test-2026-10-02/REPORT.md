# Full click test of the platform (2 October 2026)

Alex asked: "test the platform again, bug test everything clickable, make sure
everything works like it's supposed to."

Everything ran locally on Alex's review servers: the gated build (the website
plus the platform) on `localhost:4441` with its stand-in on 8841, and the open
build (the site as it is live today) on `localhost:4442`. Payments and AI
replies are **SIMULATED** (the real Workers run, the stand-in answers instead
of OpenAI, nothing is billed). Synthetic `@example.test` accounts only.
Nothing was pushed or deployed.

## What was tested

| Suite | What it does | Result |
|---|---|---|
| C1 every page (`scripts/c1_sweep.py`) | Opens **every page** of the build as a visitor, a free student and a paid student (679 each), and the open build as a visitor (754). Each page must load, start without an error, make no failed request that is not an expected refusal, show no broken-screen wording, and every link on it must point at a page that exists. | visitor 0 problems; free and paid: 3 bugs (fixed, below); open build 0 problems |
| C2 click everything (`scripts/c2_click.py`) | On one page of every design (46: Today, Course, Practice and every trainer, Tests and every kind of paper, mock, placement, vocabulary, essay checker, examiner, cue cards, model answers, lessons of every paper, account, plans, help, support, privacy, terms, sign-in/up/forgot, the website), every visible control is used in turn: links followed and their destination checked, buttons pressed, pop-ups opened and closed, drop-downs changed, answers chosen. Visitor, free and paid in English at 1440, paid in Russian on a 390 phone, and Alex's admin panel. | **2,810 controls** used. 3 bugs (fixed, below); the rest behaved as designed |
| C4 whole tasks (`scripts/c4_flows.py`) | As a paying student, start to finish: a full Reading test (the result reaches the account's history), a full Listening test (the recording loads), an essay to the checker, Mr EZ conversation, support message, vocabulary practice, mock exam, placement test, live examiner, recorded Speaking, study plan settings, progress report, edit details, change password, sign out and back in with it, forgot password. | 22 / 22 |
| w01 website | The sales website, English and Russian, desktop and phone, every call to action, the questionnaire's two-lesson result. | 155 / 155 |
| v1 signed-out HTML | No lesson text in what a visitor's browser receives. | 88 pages, 0 leak |
| v2 lessons | A free account opens every lesson in English and Russian; every lesson quiz works; worked examples; vocabulary lists. | 218 / 218 |
| v3 journeys | Visitor, free, paying (simulated purchase), complimentary (from /admin), returning, phone layouts. | 420 / 421, then 421 / 421 (below) |
| v4 page loading | Start-up and in-app navigation, both languages, desktop and phone, every kind of account, plain and under stress. | 0 errors in 1,648 visits |
| v5 server refusals | The server refuses paid material and paid AI to a free account. | 40 / 40 |
| `npm test`, `astro check`, both builds, leak audit | | 2,481 / 2,481; 0 errors; 677 and 675 pages; 0 leaks |

## Bugs found and fixed

1. **Focused Listening exercises played no recording** (28 exercises, paid
   students). The recording's signed link was given the site prefix twice
   (`/ielts-website/http://...`). Root cause fixed in `src/lib/url.ts`:
   `withBase` now leaves a complete address alone; `tests/with-base.test.ts`.
2. **The "Problem / Solution" Writing lesson asked the server for a worked
   example that does not exist** (a 404 on every visit). The question bank
   has no problem-solution task, so the lesson has never had an example on
   either site. The page now knows this at build time and asks for nothing.
   **Content gap for Alex:** that lesson has no Band 8 worked example until a
   problem-solution question and model answer are added.
3. **The live examiner showed the student a raw technical error** when the
   browser could not open the voice connection ("Failed to execute
   'setRemoteDescription'..."). It now says "Could not connect to the
   examiner just now. Check your internet connection and press Start again."
   (Russian too). Locally this always happens, because the stand-in cannot
   fake a real voice connection; the live interview itself needs a small real
   test.
4. **Russian on a 320 phone, signed out: the header's new "Войти" (Log in)
   button pushed every page 9 px sideways.** Under 400 px it is now the word
   alone.
5. **Russian on a 320 phone: the account page's category switch pushed the
   page 24 px sideways** ("Сохранённое и результаты" is long). The tab
   names now wrap inside their tabs.
6. **Model answers and Cue cards had no link left** after the account menu
   was shortened. They are now a quiet line under the trainers on Practice
   ("Study from examples: Model answers · Cue cards"); a free student gets
   the upgrade pop-up from them, as from the trainers.
7. **Study plan settings forgot a daily time that was picked but not yet
   confirmed**: it showed 60 minutes again, so pressing Save later quietly
   reset a chosen 25 or 15 to 60. The form now shows the time the plan really
   paces from, and still asks "Can you really give ... minutes?";
   `tests/intake.test.ts`.
8. **After the daily help limit, a lesson's help note said two things at
   once** ("Mr EZ could not be reached, so this is the lesson's own answer.
   That is all your questions for today."). It now reads "That is all your
   questions for today. Mr EZ will be back tomorrow. Here is the lesson's own
   answer." (Russian too).
9. **"Password changed." vanished after 2.5 seconds** together with its form,
   too quick to be sure the change worked. The Password row now keeps saying
   "Password changed." after the form closes.

## Looked at and found to be correct

- Paid help buttons, trainers, tests and banks open the upgrade pop-up for a
  free student and a visitor (237 and 83 times in the click runs), and it
  always closed again.
- Lesson help stops at the daily limit (60), and the lesson's own answer is
  still given.
- A timed paper asks "leave this page?" before letting the student go.
- "Mark as studied" brings the one-time "first lesson" pop-up a moment later.
- The word "undefined" on the Summary completion lesson is the lesson's own
  text ("the process is fluid and undefined").
- "Failed to fetch" lines when a visitor leaves the website for the plans page
  are the sign-in check being cancelled by the page change; nothing on screen.
- "View full-size screenshot" on the website opens the picture in a new tab.

## Not testable locally

- The live voice examiner past "Start" (needs a real voice session).
- Real AI wording for essays, Speaking and Mr EZ (the stand-in answers
  "SIMULATED").
- Real payments (no provider chosen yet).

## Final round (after every fix, on the final build)

Final build: `dist-trial-free8` (gated) and `dist-open-free6` (open), commits
`12b085b`, `7d14c89` and the password-row fix. Both review servers now serve it.

- `npm test` **2,481 / 2,481**, `astro check` 0 errors, 0 warnings; builds 677 and 675 pages; leak audit 0.
- v3 journeys **420 / 421**. The one miss was the suite's own out-of-date
  check of the admin "Ends" line (the renewed date has been on the "Access
  runs until" line since 1 October). Check updated; the admin section then
  passed **21 / 21**.
- v4 page loading: **0 errors in 1,648 visits** (2 languages x 2 screens x 4
  kinds of account x plain and stress).
- C4 whole tasks: **22 / 22** across the runs (vocabulary after a fix to the
  script; the account tasks 5 / 5 again on the final build, with the
  confirmation now staying on screen).

Folders: `c1-sweep-*` every page, `c2-click-*` every control (`c2-trial` is
the click script's own trial runs), `c4-flows*` whole tasks with screenshots,
`w01-website`, `v1-...` to `v5-...` the earlier suites rerun, `findings-raw.md`
the grouped output of `scripts/c3_report.py`.

## Release to the live site (2 October 2026)

Alex: "find the problem solution essay questions and write an essay according
to the lesson, and once you do that, put all fixes live."

- **Problem / Solution essays.** The bank had none, so the lesson had no
  worked example. Three real Task 2 questions from older PracticePTEOnline
  tests (same permission) were added, each with a Band 8 answer written to
  the lesson's method and a plan for the coach panel: test 87 (causes and
  solutions, now the lesson's example), test 38 (reasons and measures), test
  95 (causes and effects, the pattern that asks for no solutions).
- **What went live.** The whole branch, with the paid model OFF (as the live
  site has always run): the account rework, the fixes above, the essays. The
  paid model stays off until a payment company is chosen.
- **Held back from the live site.** The support form ("Report a problem" /
  "Ask a person") and the admin panel's support inbox and free-access tools
  save to database tables that production does not have yet
  (`supabase/migrations/2026-09-30-support.sql` and the paid-access
  migrations). They are switched off on the live build
  (`src/lib/support.ts`, `SUPPORT_ENABLED`); to turn the form on, apply the
  support migration to production and set the GitHub variable
  `PUBLIC_SUPPORT_ENABLED=1` (plus the deploy workflow passing it).
- **Checked before the push** (`scripts/c5_open_release.py`): the open build,
  signed in, against a database with only production's migrations: 33 pages
  and every call it makes are to tables and functions production has
  (learning progress, profiles, saved state, Mr EZ conversations, is_admin);
  **0 failures**. The admin panel's own calls are identical to the version
  already live. `npm test` 2,481 / 2,481, `astro check` 0 errors.
- **Pushed** `d0491ff..d18f83f` to `main`; the GitHub Pages deploy succeeded.
- **Checked on the live site** (`scripts/c6_live_check.py`, signed out, no
  account created): 19 key pages in English at 1440 and Russian at 390,
  **48 / 48**: every page loads without an error, the Problem / Solution
  lesson shows its Band 8 example, Practice links Model answers and Cue
  cards, signed out there is one Log in button and a log-in card on Account,
  no link to the support form, no sideways scroll. (A first run met one
  "503" for a script file seconds after publishing, while the host was still
  spreading the new files; it loaded on every later try.)
- **Not deployed**: the Workers (essay, speaking, live examiner, Mr EZ,
  content, payments, support). Their changes serve the paid model only; the
  live site sends them exactly what it sent before.
