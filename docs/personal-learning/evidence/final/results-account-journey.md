# Personal learning build: real sign-in journey, account isolation

**Correction to the three paragraphs the shared test harness auto-generates below (final_helpers.py's
reset_results(), which this script reuses and cannot edit): they describe the OTHER browser
suite in this folder (f01-f19, run against a frozen snapshot on port 4340 with no accounts
backend at all). They do not apply to this file.** This script (`tests/browser/
f20_account_journey.py`) is a different, self-contained run: it starts its own dev server
(`npx astro dev --port 4352`) and its own free local accounts stand-in
(`node tools/mr-ez-dev-server.mjs` on port 8799), points the dev server at that stand-in, and
drives a REAL sign-in/sign-out/sign-in journey through the actual UI with real (synthetic,
throwaway) accounts. It is not a rerun of anything, hot reload is irrelevant since nothing in
`src/` changed while it ran, and accounts ARE configured (against the free local stand-in, never
a real Supabase project). See the two paragraphs below this one for what this run actually is.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs`, in-memory, this machine only), site under test at http://localhost:4352/ielts-website, stand-in REST surface at http://127.0.0.1:8799. It is NOT a real Supabase project, and nothing below is claimed as proof against one. Every student, email and piece of work is SYNTHETIC.

**Headline finding, found while writing this script, before any PASS/FAIL row below:** the "Work saved on this device" claim offer (`src/components/learning/AnonymousWorkClaim.tsx`) is mounted ONLY inside `AccountMenu.tsx`, which `Nav.astro` renders ONLY on a route where `isAppRoute()` (`src/lib/platform-nav.ts`) is false. Every page in this build (`find src/pages -type f`, checked exhaustively) is either an app route - /dashboard, /start, /learn, /lessons, /trainers, /tests, /speaking, /writing, /account, /review, /report, /reset-password, all served by `WorkspaceHeader.astro` / `WorkspaceMenu.tsx`, which has NO claim UI - or a `bare` fullscreen page (the test player, the mock exam), which renders neither nav. **There is no page left that renders Nav.astro.** The claim offer is therefore unreachable from anywhere in the live product. This is recorded as its own row below, with reproduction, and the rest of this journey is adapted around it rather than silently worked around: sign-in below goes through the real, only reachable surface (WorkspaceMenu's avatar button), and where the original brief's steps depend on claiming, that is called out by name instead of faked.

## Step 1: signed-out work on a fresh device

A fresh browser context, empty storage. Mark a lesson studied, sit a short reading drill, save a plan with a target band through the intake.

| Check | Result | Observed |
|---|---|---|
| Signed out: a lesson can be marked studied | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/headings |

_screenshot **account-01-signed-out-lesson-studied.png**: url=`http://localhost:4352/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| Signed out: a short reading drill can be sat and submitted | PASS | 9 answer control(s) filled, submitted=True, landed on http://localhost:4352/ielts-website/trainers/reading/reading-full-006-drill-p2 |

_screenshot **account-02-signed-out-drill-submitted.png**: url=`http://localhost:4352/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Signed out: the plan can be saved with a target band through the intake | PASS | Save my plan clicked = True, landed on http://localhost:4352/ielts-website/dashboard |

_screenshot **account-03-signed-out-plan-saved.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_

**localStorage after step 1 (signed out), owner = "anon:3d109a76-b047-49d6-bedf-411a1769bfd9":** ['ielts.device.v1', 'ielts.learning.legacy.adopted.v1', 'ielts.learning.legacy.v1', 'ielts.learning.plan.v1::anon:3d109a76-b047-49d6-bedf-411a1769bfd9', 'ielts.learning.record.v1::anon:3d109a76-b047-49d6-bedf-411a1769bfd9', 'ielts.progress.v1::anon:3d109a76-b047-49d6-bedf-411a1769bfd9', 'ielts.studyplan.v1::anon:3d109a76-b047-49d6-bedf-411a1769bfd9']
| The work just done is stored under this device's own anonymous owner | PASS | owner_namespace() = "anon:3d109a76-b047-49d6-bedf-411a1769bfd9" |

**Anonymous record before any sign-in (events count, plan target):** events=4, plan target band=None

**Step 1:** no console errors, no failed/4xx/5xx requests.

## Step 2: sign in as fake student A

Signing in through WorkspaceMenu (the real, only reachable sign-in surface on every page this journey visits - see the headline finding above). First sign-in for a fresh email ("Sign up", which doubles as sign-in on the stand-in).

| Check | Result | Observed |
|---|---|---|
| After signing in as A, the workspace menu shows Sign out, not Sign in | PASS | {"shows_sign_in": false, "shows_sign_out": true, "identity": "synthetic-student-a-f20@example.test"} |

_screenshot **account-04-a-signed-in-workspace-menu.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| The "Work saved on this device" offer is shown after signing in as A on /dashboard | FAIL | DEFECT, not a test bug: this control does not exist anywhere on this route. text search for "Work saved on this device" on http://localhost:4352/ielts-website/dashboard found 0 match(es). See the headline finding above for why: AnonymousWorkClaim is mounted only in AccountMenu.tsx, which no page in this build renders. |

**Student A's real user id, captured straight off the /auth/v1/signup response = "1302a741-ec3a-4374-817b-9863a9f4b6b0"** (not guessed from a localStorage owner key - owner_namespace() prefers an anon: key whenever one exists, which would be wrong here since the device's anonymous record is still present).
| Consequence of the missing claim UI: A's Today does NOT show the signed-out work (a fresh intake is offered instead of the lesson/drill/plan just done) | PASS | .today-active=0, .today-intake=1 - the signed-out work was never claimed, so it stays under the anonymous device owner and A's account starts genuinely empty |

_screenshot **account-05-a-today-shows-nothing-from-before-sign-in-desktop.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_

_screenshot **account-05-a-today-shows-nothing-from-before-sign-in-phone.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="None"_
| The signed-out work is not deleted - it is still sitting on the device, unreachable, under the anonymous owner | PASS | the device's anonymous-owner record still holds 4 event(s), the same count as right after step 1; the localStorage keys noted after step 1 were not removed by signing in as A (the current owner just moved to a new, empty u:<A id> key alongside them). |

**What the stand-in holds under student A's id, right after sign-in (before A does any work while actually signed in):**

```json
{
  "user_state": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "progress": {
        "version": 1,
        "lessons": {},
        "tests": {},
        "writing": {},
        "speaking": [],
        "activity": {}
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-22T18:05:55.946Z",
        "targetBand": "7.0",
        "startDate": "2026-09-22",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-22T18:05:55.946Z",
        "updatedAt": "2026-09-22T18:05:55.946Z",
        "goals": {
          "overallTarget": {
            "band": 7,
            "status": "provisional"
          },
          "perPaperMinimums": {},
          "examDate": null,
          "route": "academic",
          "selfReported": []
        },
        "constraints": {
          "regularDailyMinutes": 60,
          "regularDailyMinutesStatus": "provisional",
          "studyDays": "daily",
          "explanationLocale": "en",
          "tzOffsetMinutes": 0
        },
        "activeSession": {
          "id": "sess:0ea963a41b03db5c86cc797b5249c5a0",
          "date": "2026-09-22",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.",
          "evidenceRefs": [
            {
              "kind": "goal",
              "ref": "paper:reading",
              "e
```

## Step 3: real work done while signed in as A, then sign out

This is the work this run actually tests isolation against, since the earlier signed-out work was never claimed (see above). Mark a lesson while signed in, confirm it reaches the stand-in under A's id, sign out, expect Today and history empty.

| Check | Result | Observed |
|---|---|---|
| A can do real, signed-in work (a lesson marked studied) | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/tfng |

_screenshot **account-06-a-signed-in-lesson-studied.png**: url=`http://localhost:4352/ielts-website/lessons/reading/tfng`, landmark heading="True / False / Not Given"_

_screenshot **account-07-a-report-with-signed-in-work.png**: url=`http://localhost:4352/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **account-08-a-account-with-signed-in-work.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_

**What the stand-in holds under student A's id, after A's real signed-in work:**

```json
{
  "user_state": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "progress": {
        "version": 1,
        "lessons": {
          "reading-tfng": {
            "completedAt": "2026-09-22T18:06:07.271Z"
          }
        },
        "tests": {},
        "writing": {},
        "speaking": [],
        "activity": {
          "2026-09-22": {
            "minutes": 12,
            "lessons": 1,
            "attempts": 0
          }
        }
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-22T18:05:55.946Z",
        "targetBand": "7.0",
        "startDate": "2026-09-22",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-22T18:05:55.946Z",
        "updatedAt": "2026-09-22T18:05:55.946Z",
        "goals": {
          "overallTarget": {
            "band": 7,
            "status": "provisional"
          },
          "perPaperMinimums": {},
          "examDate": null,
          "route": "academic",
          "selfReported": []
        },
        "constraints": {
          "regularDailyMinutes": 60,
          "regularDailyMinutesStatus": "provisional",
          "studyDays": "daily",
          "explanationLocale": "en",
          "tzOffsetMinutes": 0
        },
        "activeSession": {
          "id": "sess:0ea963a41b03db5c86cc797b5249c5a0",
          "date": "2026-09-22",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.",
          "evidenceRefs": [
            {
              "kind": "goal",
              "ref": "paper:reading",
              "evidence": "You need at least band 7 in Reading."
            }
          ],
          "steps": [
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersion": 1,
              "minutes": 10,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending",
              "blockId": "b3-63e75b6f"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:3:practise",
              "role": "practise",
              "activityId": "focus:reading-sentence-completion-guided",
              "contentVersion": 1,
              "minutes": 11,
              "purpose": "Work through real questions with help available when you get stuck.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:4:independent-check",
              "role": "independent-check",
              "activityId": "focus:reading-sentence-completion-check-a",
              "contentVersion": 1,
              "minutes": 9,
              "purpose": "Answer a short set you have not seen, with no help, so the result means something.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b0
```
| The lesson marked while signed in reached the stand-in under A's own id | PASS | 1 learning_events row(s) uploaded for A: [{"user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0", "event_id": "ev:163d50287af43dc4fa5e08a61cc408f3", "event": {"id": "ev:163d50287af43dc4fa5e08a61cc408f3", "activityId": "lesson:reading-tfng", "contentVersion": 0, "at": "2026-09-22T18:06:07.273Z", "localDate": "2026-09-22", "subskill": "exam-format", "mode": "practice", "completion": "completed", "assistance": "none", "seenBefore": false, "outcome": {"kind": "studied", "estimatedMinutes": 12}, "provenance": "recorded"}, "occurred_at": "2026-09-22T18:06:07.273Z", "activity_id": "lesson:reading-tfng", "paper": null, "mode": "practice", "created_at": "2026-09-22T18:06:09.105Z"}] |
| After sign-out, the workspace menu shows Sign in, not Sign out | PASS | {"shows_sign_in": true, "shows_sign_out": false, "identity": null} |

_screenshot **account-09-signed-out-after-a.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_
| Signed out again, Today shows THIS DEVICE's own anonymous session from step 1 (not empty, and not A's signed-in account - the device's own history is expected to survive a sign-out) | PASS | .today-active=1, .today-intake=0, objective="Fill a gap with the exact words from the passage, inside the word limit." |

_screenshot **account-10-signed-out-today-shows-device-anon-session.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| Signed out again, the history table shows nothing from A's signed-in account (A's lesson never appears here; this table reads full test attempts, and the device's own step-1 drill/attempt count is a separate, pre-existing fact about this device, not something A's sign-out could add to it) | PASS | 0 row(s) in the Reading score-history table |

_screenshot **account-11-signed-out-account-shows-device-history-only.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_

## Step 4: sign in as fake student B (a different email)

Expect no trace of A anywhere: not the orphaned signed-out work (nobody's, not even A's, since it was never claimed), not A's real signed-in lesson.

| Check | Result | Observed |
|---|---|---|
| B is offered nothing either (no claim UI exists on this route, for anyone) | PASS | claim marker present = False |

_screenshot **account-12-b-signed-in-no-offer.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_
| B's Today is an empty intake, not A's session | PASS | .today-intake=1, .today-active=0 |

_screenshot **account-13-b-today-empty-intake.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| B's history is empty | PASS | 0 row(s) in the Reading score-history table |

_screenshot **account-14-b-account-empty.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_

**Student B's real user id, captured straight off the /auth/v1/signup response = "bcd708f6-cbfc-4c5e-9b3f-55ac1f11df0a"**

**What the stand-in holds under student B's id, right after B signs in:**

```json
{
  "user_state": [
    {
      "user_id": "bcd708f6-cbfc-4c5e-9b3f-55ac1f11df0a",
      "progress": {
        "version": 1,
        "lessons": {},
        "tests": {},
        "writing": {},
        "speaking": [],
        "activity": {}
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-22T18:06:44.297Z",
        "targetBand": "7.0",
        "startDate": "2026-09-22",
        "dailyMinutes": 25,
        "studyDays": "daily",
        "doneKeys": [],
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "bcd708f6-cbfc-4c5e-9b3f-55ac1f11df0a",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-22T18:06:40.067Z",
        "updatedAt": "2026-09-22T18:06:40.067Z",
        "goals": {
          "overallTarget": null,
          "perPaperMinimums": {},
          "examDate": null,
          "route": "academic",
          "selfReported": []
        },
        "constraints": {
          "regularDailyMinutes": 60,
          "regularDailyMinutesStatus": "provisional",
          "studyDays": "daily",
          "explanationLocale": "en",
          "tzOffsetMinutes": 0
        },
        "activeSession": {
          "id": "sess:0ea963a41b03db5c86cc797b5249c5a0",
          "date": "2026-09-22",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.",
          "evidenceRefs": [
            {
              "kind": "no-evidence",
              "ref": "paper:reading",
              "evidence": "Nothing independent recorded for this yet."
            }
          ],
          "steps": [
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersion": 1,
              "minutes": 10,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending",
              "blockId": "b3-63e75b6f"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:3:practise",
              "role": "practise",
              "activityId": "focus:reading-sentence-completion-guided",
              "contentVersion": 1,
              "minutes": 11,
              "purpose": "Work through real questions with help available when you get stuck.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:4:independent-check",
              "role": "independent-check",
              "activityId": "focus:reading-sentence-completion-check-a",
              "contentVersion": 1,
              "minutes": 9,
              "purpose": "Answer a short set you have not seen, with no help, so the result means something.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:5:assess",
              "role": "assess",
              "activityId": "check:practice-listening-map-labelling",
              "contentVersion": 1,
              "minutes": 4,
              "purpose": "A short sample to find out where you are. It is too short to
```
| Nothing of A's is present anywhere in B's store rows | PASS | B's own learning_events = []; searched B's full store JSON for the exact marker "activityId": "lesson:reading-tfng" (A's real recorded event - not loose substrings like 'tfng' or '7.0', both of which coincidentally also appear in the site's own generic default plan content offered to every new student) |
| B's own plan, if the site auto-created one, is the site's generic default (defaulted: true, 25 minutes/day) - not a copy of A's real chosen plan (60 minutes/day, an actual intake) | PASS | B's user_state.study_plan = {"done": [], "testDate": "", "createdAt": "2026-09-22T18:06:44.297Z", "targetBand": "7.0", "startDate": "2026-09-22", "dailyMinutes": 25, "studyDays": "daily", "doneKeys": [], "defaulted": true} |
| Re-reading A's row (by A's id) after B signed in shows it unchanged | PASS | compared A's learning_events rows before and after B's sign-in |

## Step 5: sign out, sign in as A again

A REAL sign-in this time (email + password against the stand-in's /token endpoint, not the /signup shortcut). Expect A's real signed-in work restored, nothing of B's.

| Check | Result | Observed |
|---|---|---|
| The workspace menu shows A signed in again | PASS | {"shows_sign_in": false, "shows_sign_out": true, "identity": "synthetic-student-a-f20@example.test"} |
| A's Today after re-sign-in matches A's own state from step 2 (still no confirmed goal, since it was never claimed) rather than B's | PASS | .today-active=0, .today-intake=1 - this is expected given the claim UI is unreachable (see headline finding), not a new defect |

_screenshot **account-15-a-restored-today-desktop.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_

_screenshot **account-15-a-restored-today-phone.png**: url=`http://localhost:4352/ielts-website/dashboard`, landmark heading="None"_

**What the stand-in holds under student A's id at the end of the run:**

```json
{
  "user_state": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "progress": {
        "version": 1,
        "lessons": {
          "reading-tfng": {
            "completedAt": "2026-09-22T18:06:07.271Z"
          }
        },
        "tests": {},
        "writing": {},
        "speaking": [],
        "activity": {
          "2026-09-22": {
            "minutes": 12,
            "lessons": 1,
            "attempts": 0
          }
        }
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-22T18:07:04.101Z",
        "targetBand": "7.0",
        "startDate": "2026-09-22",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "1302a741-ec3a-4374-817b-9863a9f4b6b0",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-22T18:07:04.101Z",
        "updatedAt": "2026-09-22T18:07:04.101Z",
        "goals": {
          "overallTarget": {
            "band": 7,
            "status": "provisional"
          },
          "perPaperMinimums": {},
          "examDate": null,
          "route": "academic",
          "selfReported": []
        },
        "constraints": {
          "regularDailyMinutes": 60,
          "regularDailyMinutesStatus": "provisional",
          "studyDays": "daily",
          "explanationLocale": "en",
          "tzOffsetMinutes": 0
        },
        "activeSession": {
          "id": "sess:0ea963a41b03db5c86cc797b5249c5a0",
          "date": "2026-09-22",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.",
          "evidenceRefs": [
            {
              "kind": "goal",
              "ref": "paper:reading",
              "evidence": "You need at least band 7 in Reading."
            }
          ],
          "steps": [
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersion": 1,
              "minutes": 10,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending",
              "blockId": "b3-63e75b6f"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:3:practise",
              "role": "practise",
              "activityId": "focus:reading-sentence-completion-guided",
              "contentVersion": 1,
              "minutes": 11,
              "purpose": "Work through real questions with help available when you get stuck.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b03db5c86cc797b5249c5a0:4:independent-check",
              "role": "independent-check",
              "activityId": "focus:reading-sentence-completion-check-a",
              "contentVersion": 1,
              "minutes": 9,
              "purpose": "Answer a short set you have not seen, with no help, so the result means something.",
              "state": "pending"
            },
            {
              "stepId": "sess:0ea963a41b0
```
| A's restored learning_events are the same rows as before B ever signed in | PASS | 1 event row(s) for A at the end |

**Steps 2-5 failed/4xx/5xx requests:** FAILED http://localhost:4352/src/data/focused/speaking-part3-abstract-opinion.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-multiple-choice.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/speaking-part2-tense-range.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/speaking-part3-complex-sentences.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-categorisation.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-multiple-answer.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-diagram-labelling.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-matching-features.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-sentence-completion.ts (net::ERR_ABORTED); FAILED http://localhost:4352/src/data/focused/listening-table-completion.ts (net::ERR_ABORTED)

## Step 6 (optional, adapted): a second device's signed-out work is left alone

The brief's original step 6 ("decline the claim offer as B") cannot be run: there is no reachable claim UI to decline (see the headline finding). What CAN still be shown: a second device does its own signed-out work, a different student (B) signs in on that device, and B's account gains nothing from it while the device's own copy of the work is left completely alone.

| Check | Result | Observed |
|---|---|---|
| Step 6: a second device can do its own signed-out work | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/ynng |

_screenshot **account-16-device2-signed-out-lesson.png**: url=`http://localhost:4352/ielts-website/lessons/reading/ynng`, landmark heading="Yes / No / Not Given"_

**Device 2's anonymous record, right after the signed-out lesson, before B signs in:** [{"id": "ev:3cc252b57e4cd407700a22def009c54c", "activityId": "lesson:reading-ynng", "paper": null, "completion": "completed"}, {"id": "legacy:lesson:reading-ynng", "activityId": "lesson:reading-ynng", "paper": "reading", "completion": "completed"}]
| Step 6: B is (still, consistently) offered nothing on this device either | PASS | claim marker present = False |

_screenshot **account-17-device2-b-signed-in-no-offer.png**: url=`http://localhost:4352/ielts-website/lessons/reading/ynng`, landmark heading="Yes / No / Not Given"_
| Step 6: B's history on this device is empty (nothing was pulled in) | PASS | 0 row(s) in the Reading score-history table |

**What the stand-in holds under B's id after visiting device 2:**

```json
{
  "user_state": [
    {
      "user_id": "bcd708f6-cbfc-4c5e-9b3f-55ac1f11df0a",
      "progress": {
        "version": 1,
        "lessons": {},
        "tests": {},
        "writing": {},
        "speaking": [],
        "activity": {}
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-22T18:06:44.297Z",
        "targetBand": "7.0",
        "startDate": "2026-09-22",
        "dailyMinutes": 25,
        "studyDays": "daily",
        "doneKeys": [],
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "bcd708f6-cbfc-4c5e-9b3f-55ac1f11df0a",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-22T18:07:30.686Z",
        "updatedAt": "2026-09-22T18:07:30.686Z",
        "goals": {
          "overallTarget": null,
          "perPaperMinimums": {},
          "examDate": null,
          "route": "academic",
          "selfReported": []
        },
        "constraints": {
          "regularDailyMinutes": 60,
          "regularDailyMinutesStatus": "provisional",
          "studyDays": "daily",
          "explanationLocale": "en",
          "tzOffsetMinutes": 0
        },
        "activeSession": {
          "id": "sess:0ea963a41b03db5c86cc797b5249c5a0",
          "date": "2026-09-22",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "Nothing has been recorded yet, so this starts with how the paper works rather than with a level nobody has measured.",
          "evidenceRefs": [
            {
              "kind": "no-evidence",
              "ref": "paper:reading",
              "evidence": "Nothing independent recorded for this yet."
      
```
| Nothing was uploaded under B from device 2's signed-out lesson | PASS | B's own learning_events = []; searched B's full store JSON for the exact marker "activityId": "lesson:reading-ynng" |

**Device 2's anonymous record after B signs out again:** [{"id": "ev:3cc252b57e4cd407700a22def009c54c", "activityId": "lesson:reading-ynng", "paper": null, "completion": "completed"}, {"id": "legacy:lesson:reading-ynng", "activityId": "lesson:reading-ynng", "paper": "reading", "completion": "completed"}]
| Device 2's signed-out work is still there and carries nothing foreign after B signed in and out on it | PASS | 2 event(s) before B signed in, 2 after B signed out (0 of them about anything other than the ynng lesson); see the two event dumps just above for the exact contents |

_screenshot **account-18-device2-work-still-present-after-signout.png**: url=`http://localhost:4352/ielts-website/account`, landmark heading="Account & progress"_

**Step 6 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8799/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8799) and the site at http://localhost:4352/ielts-website, both started for this run and stopped afterwards. Nothing here is evidence against a real Supabase project.
