# Final journey run: f20 to f23, and Codex's own reproductions

**Date:** 24 September 2026, run between 00:21 and 01:11 local time.

**Code under test:** commit `c693b43` ("Codex inspection R2F-01 and R2F-02: one recording at a time on the spoken task, and a late evaluation never overwrites a newer draft"). The branch had one spec-only commit on top when the run started (`05c206f`, one docs file), and a second docs-only commit (`4a964e1`, the inspection 7 record) landed while the run was going. Neither touches `src/`, `tools/`, `workers/`, `tests/browser/` or the site config, so every script below ran against the code of `c693b43`. No source file, test script or config was edited for this run, and the working tree held no uncommitted source changes.

**Everything here is synthetic.** Every account, email, password, student, essay, answer and recording was invented by the scripts and is labelled SYNTHETIC. The accounts backend is the free local stand-in (`node tools/mr-ez-dev-server.mjs`), in memory, on this machine only. It is **not a real Supabase project**, and nothing below is claimed as proof about one. No paid AI was called, no real voice session was opened, no grader was reached (grading and examiner requests in f23 were caught inside the browser and answered with SYNTHETIC replies), and nothing was deployed, committed or pushed.

## How it was run

Each journey got its own freshly started stand-in and its own freshly started dev server, stopped as soon as that script finished. A short warm-up (a throwaway browser that opens the pages the script uses, signs nobody in and writes nothing) ran before each script so the dev server's first-visit preparation could not reload a page mid-check.

| Script | Stand-in port | Site port | Site settings |
|---|---|---|---|
| f20 | 8823 | 4376 | `astro.config.f22.mjs` (the real config plus its own cache, not watching docs/ and tests/); accounts and Mr EZ pointed at the stand-in |
| f21 | 8825 | 4378 | `astro.config.f21.mjs`, as its header says; accounts and Mr EZ pointed at the stand-in |
| f22 | 8827 | 4380 | `astro.config.f22.mjs`, as its header says; plus the examiner address pointed at a stand-in path that answers "not found" |
| f23, sections 1 to 6 | 8829 | 4382 | the f23 scratch config (a copy of the one in the session scratchpad); graders pointed at intercepted stand-in paths |
| f23, sections 7 to 9 | 8829 (same stand-in, as the f23 header describes) | 4382, started again | the same, plus the examiner address pointed at an intercepted stand-in path |
| Codex browser reproductions | 8801 | 4354 and 4347 | the ports hardcoded in Codex's scripts, checked free first; a fresh stand-in and site for every script and every retry |

Results files use the suffix `-fNN-final` and screenshots the prefix `final-fNN-`, so no earlier evidence file was overwritten except the part-finished `results-f20-final.md` and `final-f20-*.png` from the stopped earlier attempt, which this run replaced as intended.

## Totals

| Script | PASS | FAIL | Results file |
|---|---|---|---|
| f20 account journey | 33 | 0 | `results-f20-final.md` |
| f21 direct entry | 22 | 0 | `results-f21-final.md` |
| f22 unfinished test (23 steps) | 218 | 0 | `results-f22-final.md` |
| f23 delayed grade (9 sections) | 90 | 0 | `results-f23-final.md` |
| **All four** | **363** | **0** | |

## f20: the real sign-in journey

| Script | What it checks | PASS | FAIL | Results file | FAIL rows |
|---|---|---|---|---|---|
| `tests/browser/f20_account_journey.py` | Signing in, out and in again as two students on one device (and a second device) never moves one student's work to the other, and the "work saved on this device" offer can be accepted or declined. | 33 | 0 | `results-f20-final.md`, 24 screenshots `final-f20-*` | none |

| Step | PASS | FAIL |
|---|---|---|
| 1. Signed-out work on a fresh device | 4 | 0 |
| 2. Sign in as student A | 8 | 0 |
| 3. Work while signed in as A, then sign out | 5 | 0 |
| 4. Sign in as student B | 6 | 0 |
| 5. Sign out, sign in as A again | 3 | 0 |
| 6. A second device's work offered to B, and declined | 7 | 0 |

The first line of `results-f20-final.md` says "FROZEN PRODUCTION SNAPSHOT". That sentence comes from the shared results helper every script reuses; the file's own note two paragraphs down states the truth (a dev server against the local stand-in).

## f21: opening an exam page directly

| Script | What it checks | PASS | FAIL | Results file | FAIL rows |
|---|---|---|---|---|---|
| `tests/browser/f21_direct_entry_owner.py` | A signed-in student who opens a drill by its own address, or refreshes in the middle, has the work recorded under their own account and never under the device's anonymous record. | 22 | 0 | `results-f21-final.md`, 7 screenshots `final-f21-*` | none |

| Section | PASS | FAIL |
|---|---|---|
| 1. Signed-in student opens a drill by its own address | 9 | 0 |
| 2. Refresh in the middle of an unfinished drill | 5 | 0 |
| 3. The same direct entry, signed out | 4 | 0 |
| 4. The avatar menu | 4 | 0 |

## f22: an unfinished test belongs to the student who started it

| Script | What it checks | PASS | FAIL | Results file | FAIL rows |
|---|---|---|---|---|---|
| `tests/browser/f22_unfinished_test_owner.py` | Unfinished drills, mock exams, reviews, tutor replies, lesson checks and spoken takes stay with the student who started them through every sign-out, sign-in, second tab and late reply. | 218 | 0 | `results-f22-final.md`, 97 screenshots `final-f22-*` | none |

| Step | PASS | FAIL | Step | PASS | FAIL |
|---|---|---|---|---|---|
| 1 | 6 | 0 | 13 | 15 | 0 |
| 2 | 2 | 0 | 14 | 9 | 0 |
| 3 | 5 | 0 | 15 | 14 | 0 |
| 4 | 4 | 0 | 16 | 10 | 0 |
| 5 | 5 | 0 | 17 | 12 | 0 |
| 6 | 10 | 0 | 18 | 8 | 0 |
| 7 | 8 | 0 | 19 | 7 | 0 |
| 8 | 7 | 0 | 20 | 9 | 0 |
| 9 | 5 | 0 | 21 | 18 | 0 |
| 10 | 5 | 0 | 22 | 22 | 0 |
| 11 | 13 | 0 | 23 (R2F-01 and R2F-02) | 11 | 0 |
| 12 | 13 | 0 | | | |

All 23 steps ran, including step 11's examiner checks (the examiner address was set, so none were reported as not run).

## f23: a grade that comes back after the account changed

| Script | What it checks | PASS | FAIL | Results file | FAIL rows |
|---|---|---|---|---|---|
| `tests/browser/f23_delayed_grade_owner.py` | An essay, a spoken answer or a live examiner start that is still on its way when the account changes is kept for (and shown only to) the student it was started for, and never opens a voice session behind a stopped screen. | 90 | 0 | `results-f23-final.md` (sections 7 to 9 appended to the same file), 38 screenshots `final-f23-*` | none |

| Section | PASS | FAIL |
|---|---|---|
| 1. Writing grade arrives after A out, B in | 10 | 0 |
| 2. Speaking grade arrives after C out, D in | 8 | 0 |
| 3. The essay editor belongs to its writer (R2B-01) | 13 | 0 |
| 4. A switch inside the 600 ms autosave wait (R2B-01) | 6 | 0 |
| 5. A late grade leaves a later revision alone (R2C-01) | 10 | 0 |
| 6. A speaking attempt stops when its student leaves (R2C-04) | 9 | 0 |
| 7. The examiner's start asks after every wait (R2D-01) | 14 | 0 |
| 8. The connection setup asks before the paid request (R2D-01) | 11 | 0 |
| 9. A voice session that succeeds late (R2E-01) | 9 | 0 |

## Background noise in the results files (not failures)

Each results file lists failed or refused network requests per step. All of them are expected: the sign-out request cancelled by the page moving on (f20: 3, f21: 1, f22: 28, f23: 20), listening audio and test data files cancelled when a page was left mid-load, the 404s from the deliberately empty examiner address in f22, and one 503 in f23 section 7, which is the SYNTHETIC failure the script itself returns for the intercepted examiner address.

## Codex's reproductions

These scripts were written by Codex to DEMONSTRATE defects. A pass here means the defect no longer shows. Three scripts save their output into the main project's `.tmp` folder, outside this worktree, so they were run from copies in the session scratchpad that differ from the originals in that one line only (the output folder); ports and every step are unchanged. The other four ran exactly as committed. Each crash was retried once (the browser ones on a fresh stand-in and server), with the same result.

| Script | Defect it demonstrated | What it printed now | Verdict |
|---|---|---|---|
| `claude-review-2026-09-22/account-repro.mjs` | Signing in as student B uploaded student A's essay and target band from shared browser storage under B's id. Originally printed `uploadedEssay: "SYNTHETIC private essay belonging to student A"`, `uploadedGoal: "8.0"`. | `{"uploadedTo":"SYNTHETIC-B"}`, with no essay and no goal in the upload. | No longer reproduces |
| `claude-review-2026-09-22/writing-repro.mjs` | A successful tutor evaluation relabelled the answer it had just judged as "assisted", so an unaided answer stopped counting as independent. | Stops before its check with `Error: Written task undefined has no task in its view, so nothing can be scoped.` The evidence builder now refuses a written task with no Task 1 or Task 2 in it (the fix for the Task 2 finding), and this script's hand-built view has none. Same on the retry. | No longer reproduces. The script itself can no longer run, so the verdict rests on the browser: the first half of `independent-browser.py` below judged a SYNTHETIC successful evaluation on the real form and the saved answer kept `assistance: "none"` with `met: true`; the component now records the help that existed before submission. |
| `claude-review-2026-09-22/task2-browser.py` | A Task 2 exercise saved its answer as Task 1 evidence. Its last check asserts `task == 'task1'` (the defect). | The saved event for prompt `pte-wt-106-task2` has `taskScope: {"kind": "writing-task", "task": "task2"}`, so the script's own assertion fails with `AssertionError`. Same on the retry. | No longer reproduces |
| `claude-review-2026-09-22/report-overflow.py` | The Russian progress report was 417 px wide on a 390 px phone, with "МАЛО ДАННЫХ" badges spilling out of their cards. | `{"width": 390, "documentWidth": 390, "elements": []}`. A read-only companion check on the same seed and page confirmed it was the populated Russian report (language ru, heading "Ваш прогресс на одной странице.", 298 elements in the main area, 4 "МАЛО ДАННЫХ" badges), not an empty page. | No longer reproduces |
| `claude-review-2026-09-23/independent-browser.py` | Student A's unfinished drill answer ("i" for q14), kept under the one device-wide slot `ielts.testsession.v1`, was shown to student B and submitted as B's. Originally printed `AsUnfinishedSession: {... "answers": {"q14": "i"}}` and `BsRestoredAnswer: "i"`. | First half (the Writing re-check): A's saved answer has `assistance: "none"`, `met: true`, `task: "task2"`. Second half: A answered the drill (6 answer controls found) but the old device-wide slot now holds nothing, `AsUnfinishedSession: null`, and the script stops at its own precondition with `TypeError: 'NoneType' object is not subscriptable` (line 53, `assert original['answers']`). Same on the retry. | No longer reproduces: the ownerless slot the defect depended on is empty, because the sitting is now kept under the student's own key. The full adapted journey, f22 steps 1 to 4, passed above: B sees none of A's answers, B's submission and B's rows at the stand-in hold only B's, and A resumes with "i" still there. |
| `claude-review-2026-09-23/signout-race.mjs` | Signing out while a sign-in was still loading let the stale sign-in put student A back as the owner, so A's private essay was visible after sign-out. Originally printed `afterCancelledSigninFinishes: {"kind": "user", "userId": "SYNTHETIC-A"}` and the essay text. | `immediatelyAfterSignout` and `afterCancelledSigninFinishes` are both `{"kind": "anonymous"}` with the same device id; the essay line is absent (nothing visible). | No longer reproduces |
| `claude-review-2026-09-23/direct-exam-owner.py` | A signed-in student who opened a drill by its own address had the attempt written to the device's anonymous record. Originally the record key was `ielts.learning.record.v1::anon:<device>`. | The signed-in student's session and a single record `ielts.learning.record.v1::u:<that student's id>` holding the drill answer "i"; no anonymous record at all. | No longer reproduces |

**Codex verdicts: 7 of 7 no longer reproduce, 0 still reproduce.** Two of the seven (`writing-repro.mjs`, and the drill half of `independent-browser.py`) can no longer run to the end on the fixed code; for those the verdict rests on the evidence named in the table, not on the script finishing.

## Files

This run wrote only into `docs/personal-learning/evidence/final/`: `results-f20-final.md` (replacing the stopped attempt's), `results-f21-final.md`, `results-f22-final.md`, `results-f23-final.md`, this file, and the screenshots `final-f20-*` (24, replacing the stopped attempt's), `final-f21-*` (7), `final-f22-*` (97) and `final-f23-*` (38). None of them was a committed file. Logs, the helper scripts and the Codex script copies with their outputs are in the session scratchpad folder `final-journeys`. Every server started for this run was stopped by its process id, and every port listed above was confirmed free afterwards.
