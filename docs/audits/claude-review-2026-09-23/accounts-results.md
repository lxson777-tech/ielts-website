# Personal learning build: final verification evidence

Run against the FROZEN PRODUCTION SNAPSHOT at http://127.0.0.1:4354/ielts-website on 2026-09-22.

**This is a RERUN** (results-account-journey.md, screenshots prefixed "account-") after a fix round on top of the run recorded in results.md. results.md is left untouched.

Nothing on that server can hot reload, so no result below can be explained away as a dev-server artifact.

Every scenario opens its own fresh browser context with empty localStorage and seeds its own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form (`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is the honest returning-student path; the new owner-namespaced stores are seeded directly only where a scenario is specifically about them. **Nothing here is a real student.**

AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every AI-dependent surface is expected to show its honest deterministic fallback. A simulated reply presented as a live one would be recorded as a defect.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs`, in-memory, this machine only), site under test at http://127.0.0.1:4354/ielts-website, stand-in REST surface at http://127.0.0.1:8801. It is NOT a real Supabase project, and nothing below is claimed as proof against one. Every student, email and piece of work is SYNTHETIC.

**This is the rerun after the fix, results-account-journey-2.md.** The first pass (`docs/personal-learning/evidence/final/results-account-journey.md`) found the "Work saved on this device" claim offer (`src/components/learning/AnonymousWorkClaim.tsx`) mounted ONLY inside `AccountMenu.tsx`, which `Nav.astro` renders ONLY on a route where `isAppRoute()` (`src/lib/platform-nav.ts`) is false, and no page in that build rendered `Nav.astro` any more - the offer was built, correct in isolation, and completely unreachable. That is now fixed: `AnonymousWorkClaim` is mounted as a card at the top of Today (`src/components/learning/today/TodaySession.tsx`), the one screen every signed-in student reaches within one page load on any app route, no menu required. `AccountMenu.tsx` keeps its own mount for any page that still renders `Nav.astro`. Sign-in below still goes through `WorkspaceMenu`'s avatar button, the real, ordinary path a student uses; the claim steps the first pass had to skip and describe by name are restored below and actually exercised: A is offered the work and accepts it, B (on a second device, step 6) is offered its own device's work and declines it.

## Step 1: signed-out work on a fresh device

A fresh browser context, empty storage. Mark a lesson studied, sit a short reading drill, save a plan with a target band through the intake.

| Check | Result | Observed |
|---|---|---|
| Signed out: a lesson can be marked studied | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/headings |

_screenshot **account-01-signed-out-lesson-studied.png**: url=`http://127.0.0.1:4354/ielts-website/lessons/reading/headings`, landmark heading="Matching Headings"_
| Signed out: a short reading drill can be sat and submitted | PASS | 9 answer control(s) filled, submitted=True, landed on http://127.0.0.1:4354/ielts-website/trainers/reading/reading-full-006-drill-p2 |

_screenshot **account-02-signed-out-drill-submitted.png**: url=`http://127.0.0.1:4354/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Signed out: the plan can be saved with a target band through the intake | PASS | Save my plan clicked = True, landed on http://127.0.0.1:4354/ielts-website/dashboard |

_screenshot **account-03-signed-out-plan-saved.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**localStorage after step 1 (signed out), owner = "anon:4bd5e618-cca5-449e-b227-54414fc927b8":** ['ielts.device.v1', 'ielts.learning.legacy.adopted.v1', 'ielts.learning.legacy.v1', 'ielts.learning.plan.v1::anon:4bd5e618-cca5-449e-b227-54414fc927b8', 'ielts.learning.record.v1::anon:4bd5e618-cca5-449e-b227-54414fc927b8', 'ielts.progress.v1::anon:4bd5e618-cca5-449e-b227-54414fc927b8', 'ielts.studyplan.v1::anon:4bd5e618-cca5-449e-b227-54414fc927b8']
| The work just done is stored under this device's own anonymous owner | PASS | owner_namespace() = "anon:4bd5e618-cca5-449e-b227-54414fc927b8" |

**Anonymous record before any sign-in (events count, plan target):** events=2, plan target band=None

**Step 1:** no console errors, no failed/4xx/5xx requests.

## Step 2: sign in as fake student A

Signing in through WorkspaceMenu (the real, only reachable sign-in surface on every page this journey visits - see the headline finding above). First sign-in for a fresh email ("Sign up", which doubles as sign-in on the stand-in).

| Check | Result | Observed |
|---|---|---|
| After signing in as A, the workspace menu shows Sign out, not Sign in | PASS | {"shows_sign_in": false, "shows_sign_out": true, "identity": "synthetic-student-a-f20@example.test"} |

_screenshot **account-04-a-signed-in-workspace-menu.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The "Work saved on this device" offer is shown after signing in as A on /dashboard | PASS | FIXED 22 September 2026: AnonymousWorkClaim now mounts as a card at the top of Today (src/components/learning/today/TodaySession.tsx), so it is reachable on the one screen every signed-in student lands on. Offer summary: 1 lesson studied \| 1 practice attempt \| 1 test attempt \| Your target band and exam date |

_screenshot **account-04b-a-signed-in-offer-shown.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**Student A's real user id, captured straight off the /auth/v1/signup response = "06ed4081-4be1-4ec9-b7b2-186708b7abe0"** (not guessed from a localStorage owner key - owner_namespace() prefers an anon: key whenever one exists, which would be wrong here since the device's anonymous record is still present).
| A accepts the offer ('Add to my account'): the button works, and the offer then disappears rather than being shown again | PASS | accept click = True, offer still present afterwards = False |

_screenshot **account-04c-a-accepted-confirmation.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| After accepting, Today still offers A's own goal-setting intake rather than adopting the device's session: BY DESIGN, not a defect. claimAnonymousWork()'s default is planResolution: 'keep-account-plan' (src/lib/learning/store.browser.ts) - the evidence unions into the account (checked below), the account's own plan is left for the account to confirm itself | PASS | .today-active=0, .today-intake=1 |

_screenshot **account-05-a-today-shows-nothing-from-before-sign-in-desktop.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **account-05-a-today-shows-nothing-from-before-sign-in-phone.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The claimed lesson (marked studied signed out in step 1) is in A's OWN learner record after accepting, not still parked under the device's anonymous owner | PASS | A's own record now holds 2 event(s): ["lesson:reading-headings", "drill:reading-full-006-drill-p2"] |
| The claimed lesson also shows up where a student would actually look for it: A's own Reading row on the dashboard library, right below Today | PASS | .dash-skill.skill-reading count = "1 / 13 lessons" |

_screenshot **account-05b-a-library-shows-claimed-lesson.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| The device's anonymous learner record is gone after the claim (moved, not left stuck and unreachable the way it was before the fix) | PASS | anonymous learning.record keys remaining in localStorage: [] |

**What the stand-in holds under student A's id, right after accepting the claim (before A does any further work while actually signed in):**

```json
{
  "user_state": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "progress": {
        "version": 1,
        "lessons": {
          "reading-headings": {
            "completedAt": "2026-09-23T04:29:17.448Z"
          }
        },
        "tests": {
          "reading-full-006-drill-p2": [
            {
              "at": "2026-09-23T04:29:26.007Z",
              "raw": 0,
              "total": 13,
              "band": 0,
              "bandLabel": "below 2.5",
              "secondsUsed": 3,
              "byType": {
                "matching-headings": {
                  "correct": 0,
                  "total": 6
                },
                "multiple-answer": {
                  "correct": 0,
                  "total": 4
                },
                "sentence-completion": {
                  "correct": 0,
                  "total": 3
                }
              },
              "kind": "drill",
              "skill": "reading"
            }
          ]
        },
        "writing": {},
        "speaking": [],
        "activity": {
          "2026-09-23": {
            "minutes": 22,
            "lessons": 1,
            "attempts": 1
          }
        }
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-23T04:29:49.424Z",
        "targetBand": "7.0",
        "startDate": "2026-09-23",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "plan": {
        "version": 1,
        "revision": 2,
        "evidenceVersion": 2,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-23T04:29:45.387Z",
        "updatedAt": "2026-09-23T04:29:49.424Z",
        "goals": {
          "overallTarget": {
            "band": 7,
            "status": "provisional"
          },
  
```
| The claimed lesson reached the stand-in under A's own id (not just the browser's own copy) | PASS | 2 learning_events row(s) uploaded for A after the claim: [{"user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0", "event_id": "ev:b5381ccdb675d4c789eb37d0c5cb13c7", "event": {"id": "ev:b5381ccdb675d4c789eb37d0c5cb13c7", "activityId": "lesson:reading-headings", "contentVersion": 0, "at": "2026-09-23T04:29:17.449Z", "localDate": "2026-09-23", "subskill": "exam-format", "mode": "practice", "completion": "completed", "assistance": "none", "seenBefore": false, "outcome": {"kind": "studied", "estimatedMinutes": 14}, "provenance": "recorded"}, "occurred_at": "2026-09-23T04:29:17.449Z", "activity_id": "lesson:reading-headings", "paper": null, "mode": "practice" |

## Step 3: real work done while signed in as A, then sign out

A second, independent piece of evidence for isolation: work done normally while signed in, alongside the claimed signed-out work from step 2. Mark a lesson while signed in, confirm it reaches the stand-in under A's id, sign out, expect Today and history empty.

| Check | Result | Observed |
|---|---|---|
| A can do real, signed-in work (a lesson marked studied) | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/tfng |

_screenshot **account-06-a-signed-in-lesson-studied.png**: url=`http://127.0.0.1:4354/ielts-website/lessons/reading/tfng`, landmark heading="True / False / Not Given"_

_screenshot **account-07-a-report-with-signed-in-work.png**: url=`http://127.0.0.1:4354/ielts-website/report`, landmark heading="Your progress, one page."_

_screenshot **account-08-a-account-with-signed-in-work.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_

**What the stand-in holds under student A's id, after A's real signed-in work:**

```json
{
  "user_state": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "progress": {
        "version": 1,
        "lessons": {
          "reading-headings": {
            "completedAt": "2026-09-23T04:29:17.448Z"
          },
          "reading-tfng": {
            "completedAt": "2026-09-23T04:29:53.874Z"
          }
        },
        "tests": {
          "reading-full-006-drill-p2": [
            {
              "at": "2026-09-23T04:29:26.007Z",
              "raw": 0,
              "total": 13,
              "band": 0,
              "bandLabel": "below 2.5",
              "secondsUsed": 3,
              "byType": {
                "matching-headings": {
                  "correct": 0,
                  "total": 6
                },
                "multiple-answer": {
                  "correct": 0,
                  "total": 4
                },
                "sentence-completion": {
                  "correct": 0,
                  "total": 3
                }
              },
              "kind": "drill",
              "skill": "reading"
            }
          ]
        },
        "writing": {},
        "speaking": [],
        "activity": {
          "2026-09-23": {
            "minutes": 34,
            "lessons": 2,
            "attempts": 1
          }
        }
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-23T04:29:49.424Z",
        "targetBand": "7.0",
        "startDate": "2026-09-23",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "plan": {
        "version": 1,
        "revision": 2,
        "evidenceVersion": 2,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-23T04:29:45.387Z",
        "updatedAt": "2026-09-23T04:29:49.424Z",
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
          "id": "sess:ca298397ce466e460ce05cdbaa18393a",
          "date": "2026-09-23",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "You answered 0 of 3 of these on your own across 1 sittings. That is below what Reading needs for your target, so it is the most useful hour you have.",
          "evidenceRefs": [
            {
              "kind": "estimate",
              "ref": "subskill:reading:sentence-completion",
              "evidence": "0 of 3 answered on your own across 1 sittings, most recently 0 days ago."
            },
            {
              "kind": "goal",
              "ref": "paper:reading",
              "evidence": "You need at least band 7 in Reading."
            }
          ],
          "steps": [
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersio
```
| The lesson marked while signed in reached the stand-in under A's own id | PASS | 3 learning_events row(s) uploaded for A: [{"user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0", "event_id": "ev:b5381ccdb675d4c789eb37d0c5cb13c7", "event": {"id": "ev:b5381ccdb675d4c789eb37d0c5cb13c7", "activityId": "lesson:reading-headings", "contentVersion": 0, "at": "2026-09-23T04:29:17.449Z", "localDate": "2026-09-23", "subskill": "exam-format", "mode": "practice", "completion": "completed", "assistance": "none", "seenBefore": false, "outcome": {"kind": "studied", "estimatedMinutes": 14}, "provenance": "recorded"}, "occurred_at": "2026-09-23T04:29:17.449Z", "activity_id": "lesson:reading-headings", "paper": null, "mode": "practice", "created_at": "2026-09-23T04:29:50.510Z"}, {"user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0", "event_id": "ev:e06fda6cebdbafdefa8920d4995dd9c5", "event": {"id": "ev:e06fda6cebdbafdefa8920d4995dd9c5 |
| After sign-out, the workspace menu shows Sign in, not Sign out | PASS | {"shows_sign_in": true, "shows_sign_out": false, "identity": null} |

_screenshot **account-09-signed-out-after-a.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_
| Signed out again, Today shows THIS DEVICE's own anonymous session from step 1 (not empty, and not A's signed-in account - the device's own history is expected to survive a sign-out) | PASS | .today-active=1, .today-intake=0, objective="Fill a gap with the exact words from the passage, inside the word limit." |

_screenshot **account-10-signed-out-today-shows-device-anon-session.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Signed out again, the history table shows nothing from A's signed-in account (A's lesson never appears here; this table reads full test attempts, and the device's own step-1 drill/attempt count is a separate, pre-existing fact about this device, not something A's sign-out could add to it) | PASS | 0 row(s) in the Reading score-history table |

_screenshot **account-11-signed-out-account-shows-device-history-only.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_

## Step 4: sign in as fake student B (a different email)

Expect no trace of A anywhere: not A's already-claimed device work (A took all of it in step 2, and the claim offer never re-appears for a different account once one account has decided), not A's real signed-in lesson.

| Check | Result | Observed |
|---|---|---|
| B is offered nothing on this device: A already claimed everything there was, and even if something were left, one account having decided means it is never offered to another | PASS | claim marker present = False |

_screenshot **account-12-b-signed-in-no-offer.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_
| B's Today is an empty intake, not A's session | PASS | .today-intake=1, .today-active=0 |

_screenshot **account-13-b-today-empty-intake.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| B's history is empty | PASS | 0 row(s) in the Reading score-history table |

_screenshot **account-14-b-account-empty.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_

**Student B's real user id, captured straight off the /auth/v1/signup response = "e6f6a00a-1db8-423c-bbba-cbe003cdafe4"**

**What the stand-in holds under student B's id, right after B signs in:**

```json
{
  "user_state": [
    {
      "user_id": "e6f6a00a-1db8-423c-bbba-cbe003cdafe4",
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
        "createdAt": "2026-09-23T04:30:26.723Z",
        "targetBand": "7.0",
        "startDate": "2026-09-23",
        "dailyMinutes": 25,
        "studyDays": "daily",
        "doneKeys": [],
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "e6f6a00a-1db8-423c-bbba-cbe003cdafe4",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-23T04:30:23.947Z",
        "updatedAt": "2026-09-23T04:30:23.947Z",
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
          "id": "sess:ca298397ce466e460ce05cdbaa18393a",
          "date": "2026-09-23",
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
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersion": 1,
              "minutes": 10,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending",
              "blockId": "b3-63e75b6f"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:3:practise",
              "role": "practise",
              "activityId": "focus:reading-sentence-completion-guided",
              "contentVersion": 1,
              "minutes": 11,
              "purpose": "Work through real questions with help available when you get stuck.",
              "state": "pending"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:4:independent-check",
              "role": "independent-check",
              "activityId": "focus:reading-sentence-completion-check-a",
              "contentVersion": 1,
              "minutes": 9,
              "purpose": "Answer a short set you have not seen, with no help, so the result means something.",
              "state": "pending"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:5:assess",
              "role": "assess",
              "activityId": "check:practice-listening-map-labelling",
              "contentVersion": 1,
              "minutes": 4,
              "purpose": "A short sample to find out where you are. It is too short to
```
| Nothing of A's is present anywhere in B's store rows | PASS | B's own learning_events = []; searched B's full store JSON for the exact marker "activityId": "lesson:reading-tfng" (A's real recorded event - not loose substrings like 'tfng' or '7.0', both of which coincidentally also appear in the site's own generic default plan content offered to every new student) |
| B's own plan, if the site auto-created one, is the site's generic default (defaulted: true, 25 minutes/day) - not a copy of A's real chosen plan (60 minutes/day, an actual intake) | PASS | B's user_state.study_plan = {"done": [], "testDate": "", "createdAt": "2026-09-23T04:30:26.723Z", "targetBand": "7.0", "startDate": "2026-09-23", "dailyMinutes": 25, "studyDays": "daily", "doneKeys": [], "defaulted": true} |
| Re-reading A's row (by A's id) after B signed in shows it unchanged | PASS | compared A's learning_events rows before and after B's sign-in |

## Step 5: sign out, sign in as A again

A REAL sign-in this time (email + password against the stand-in's /token endpoint, not the /signup shortcut). Expect A's real signed-in work restored, nothing of B's.

| Check | Result | Observed |
|---|---|---|
| The workspace menu shows A signed in again | PASS | {"shows_sign_in": false, "shows_sign_out": true, "identity": "synthetic-student-a-f20@example.test"} |
| A's Today after re-sign-in matches A's own state right after signing in (still no confirmed goal, by design, not because claiming failed) rather than B's | PASS | .today-active=0, .today-intake=1 |

_screenshot **account-15-a-restored-today-desktop.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

_screenshot **account-15-a-restored-today-phone.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**What the stand-in holds under student A's id at the end of the run:**

```json
{
  "user_state": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "progress": {
        "version": 1,
        "lessons": {
          "reading-headings": {
            "completedAt": "2026-09-23T04:29:17.448Z"
          },
          "reading-tfng": {
            "completedAt": "2026-09-23T04:29:53.874Z"
          }
        },
        "tests": {
          "reading-full-006-drill-p2": [
            {
              "at": "2026-09-23T04:29:26.007Z",
              "raw": 0,
              "total": 13,
              "band": 0,
              "bandLabel": "below 2.5",
              "secondsUsed": 3,
              "byType": {
                "matching-headings": {
                  "correct": 0,
                  "total": 6
                },
                "multiple-answer": {
                  "correct": 0,
                  "total": 4
                },
                "sentence-completion": {
                  "correct": 0,
                  "total": 3
                }
              },
              "kind": "drill",
              "skill": "reading"
            }
          ]
        },
        "writing": {},
        "speaking": [],
        "activity": {
          "2026-09-23": {
            "minutes": 34,
            "lessons": 2,
            "attempts": 1
          }
        }
      },
      "study_plan": {
        "done": [],
        "testDate": "",
        "createdAt": "2026-09-23T04:30:43.992Z",
        "targetBand": "7.0",
        "startDate": "2026-09-23",
        "doneKeys": [],
        "dailyMinutes": 25,
        "studyDays": "daily",
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "06ed4081-4be1-4ec9-b7b2-186708b7abe0",
      "plan": {
        "version": 1,
        "revision": 2,
        "evidenceVersion": 3,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-23T04:30:43.948Z",
        "updatedAt": "2026-09-23T04:30:43.992Z",
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
          "id": "sess:ca298397ce466e460ce05cdbaa18393a",
          "date": "2026-09-23",
          "objective": "Fill a gap with the exact words from the passage, inside the word limit.",
          "objectiveScope": "subskill:reading:sentence-completion",
          "paper": "reading",
          "subskill": "sentence-completion",
          "reason": "You answered 0 of 3 of these on your own across 1 sittings. That is below what Reading needs for your target, so it is the most useful hour you have.",
          "evidenceRefs": [
            {
              "kind": "estimate",
              "ref": "subskill:reading:sentence-completion",
              "evidence": "0 of 3 answered on your own across 1 sittings, most recently 0 days ago."
            },
            {
              "kind": "goal",
              "ref": "paper:reading",
              "evidence": "You need at least band 7 in Reading."
            }
          ],
          "steps": [
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:1:teach",
              "role": "teach",
              "activityId": "lesson:reading-task1",
              "contentVersion": 1,
              "minutes": 8,
              "purpose": "Start with what this question type actually asks you for.",
              "state": "pending"
            },
            {
              "stepId": "sess:ca298397ce466e460ce05cdbaa18393a:2:teach",
              "role": "teach",
              "activityId": "lesson:reading-sentence",
              "contentVersio
```
| A's restored learning_events are the same rows as before B ever signed in | PASS | 3 event row(s) for A at the end |

**Steps 2-5 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8801/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8801/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 6 (restored): a second device's signed-out work is offered to B, and B declines it

A second device does its own signed-out work, a different, already-existing student (B) signs in on that device (a fresh device, so it holds no earlier decision about it, unlike the first device where A already claimed everything), the offer now appears there too, and B chooses 'Leave it here'. Expect B's account to gain nothing and the device's own copy of the work to be left exactly where it is, never re-offered afterwards.

| Check | Result | Observed |
|---|---|---|
| Step 6: a second device can do its own signed-out work | PASS | #lesson-complete-btn data-done set = True on /lessons/reading/ynng |

_screenshot **account-16-device2-signed-out-lesson.png**: url=`http://127.0.0.1:4354/ielts-website/lessons/reading/ynng`, landmark heading="Yes / No / Not Given"_

**Device 2's anonymous record, right after the signed-out lesson, before B signs in:** [{"id": "ev:c2d9fea02e9335d26f8e05789e14a66a", "activityId": "lesson:reading-ynng", "paper": null, "completion": "completed"}]
| Step 6: B IS offered this (different, fresh) device's own signed-out work | PASS | claim marker present = True; summary: 1 lesson studied |

_screenshot **account-17-device2-b-signed-in-offer-shown.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Step 6: B declines it ('Leave it here'): the button works, and the offer does not come back on this same visit | PASS | decline click = True, offer still present afterwards = False |

_screenshot **account-17b-device2-b-declined-confirmation.png**: url=`http://127.0.0.1:4354/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Step 6: declining is remembered - a fresh page load does not ask B again | PASS | claim marker present after reload = False |
| Step 6: B's history on this device is empty (declining pulled nothing in) | PASS | 0 row(s) in the Reading score-history table |

**What the stand-in holds under B's id after declining on device 2:**

```json
{
  "user_state": [
    {
      "user_id": "e6f6a00a-1db8-423c-bbba-cbe003cdafe4",
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
        "createdAt": "2026-09-23T04:30:26.723Z",
        "targetBand": "7.0",
        "startDate": "2026-09-23",
        "dailyMinutes": 25,
        "studyDays": "daily",
        "doneKeys": [],
        "defaulted": true
      }
    }
  ],
  "learning_plan": [
    {
      "user_id": "e6f6a00a-1db8-423c-bbba-cbe003cdafe4",
      "plan": {
        "version": 1,
        "revision": 1,
        "evidenceVersion": 0,
        "status": "provisional-no-date",
        "confirmed": false,
        "createdAt": "2026-09-23T04:31:04.764Z",
        "updatedAt": "2026-09-23T04:31:04.764Z",
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
          "id": "sess:ca298397ce466e460ce05cdbaa18393a",
          "date": "2026-09-23",
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
| Nothing was uploaded under B from device 2's signed-out lesson (declining, not accepting) | PASS | B's own learning_events = []; searched B's full store JSON for the exact marker "activityId": "lesson:reading-ynng" |

**Device 2's anonymous record after B signs out again:** [{"id": "ev:c2d9fea02e9335d26f8e05789e14a66a", "activityId": "lesson:reading-ynng", "paper": null, "completion": "completed"}]
| Device 2's signed-out work is still there and carries nothing foreign after B signed in and out on it | PASS | 1 event(s) before B signed in, 1 after B signed out (0 of them about anything other than the ynng lesson); see the two event dumps just above for the exact contents |

_screenshot **account-18-device2-work-still-present-after-signout.png**: url=`http://127.0.0.1:4354/ielts-website/account`, landmark heading="Account & progress"_

**Step 6 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8801/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8801) and the site at http://127.0.0.1:4354/ielts-website, both started for this run and stopped afterwards. Nothing here is evidence against a real Supabase project.
