# Personal learning build: final verification evidence

Run against the FROZEN PRODUCTION SNAPSHOT at http://127.0.0.1:4386/ielts-website on 2026-09-23.

**This is a RERUN** (results-unfinished-test-8.md, screenshots prefixed "unfinished8-") after a fix round on top of the run recorded in results.md. results.md is left untouched.

Nothing on that server can hot reload, so no result below can be explained away as a dev-server artifact.

Every scenario opens its own fresh browser context with empty localStorage and seeds its own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form (`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is the honest returning-student path; the new owner-namespaced stores are seeded directly only where a scenario is specifically about them. **Nothing here is a real student.**

AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every AI-dependent surface is expected to show its honest deterministic fallback. A simulated reply presented as a live one would be recorded as a defect.

**Correcting the boilerplate above, which belongs to the f01-f17 suite and is written by `final_helpers.reset_results()` (another builder's file, not edited here).** Two of its sentences are wrong for THIS run and are superseded by this note: this is NOT the frozen production snapshot (it is a dev server started for this run at http://127.0.0.1:4386/ielts-website), and it is NOT a rerun on top of `results.md`. Supabase IS configured here, pointed at the free local stand-in, which is the whole point of the scenario. No AI is called at any step.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs` at http://127.0.0.1:8833, in memory, this machine only), site under test at http://127.0.0.1:4386/ielts-website, stand-in REST surface at http://127.0.0.1:8833. It is NOT a real Supabase project and nothing below is claimed as proof about one. Every student, email and answer is SYNTHETIC.

It re-runs the journey of finding 1 in `docs/audits/claude-personal-learning-review-2026-09-23.md` (original reproduction: `docs/audits/claude-review-2026-09-23/independent-browser.py`) against the fixed code, and adds A's resume and the mounted-player owner change. Steps 6 to 10 are the second Codex round: R2-01 (an old unowned sitting and a history stamp naming A) and R2-03 (the unfinished mock exam, per student, resumable by its own student only). Steps 11 and 12 are the third: R2B-02 (an account change during Speaking is a suspension back to the Speaking brief, not a cancellation to the results) and R2B-03 (a mock's papers are kept inside their own sitting, apart from standalone papers). Steps 13 and 14 are the fourth: R2C-02 (a mock left open in one tab never overwrites or removes a fresh one started in another, and stops) and R2C-03 (the open page's clock follows the saved deadline across a sign-out, with no time given back). Steps 15 and 16 are the fifth: R2D-02 (a paper left open in one tab never writes over, clears, or hands in over a newer paper started in another, and stops) and R2D-03 (a mock finished in another tab stops the tab still showing it, and is recorded once). Steps 17 and 18 are the sixth: R2E-02 (a handed-in paper's review leaves the screen when the account changes, and Mr EZ is never asked about it with anybody else's token) and R2E-03 (the same mock paper handed in from two tabs keeps the first result and is recorded once). Step 19 is the seventh round, the follow-up to R2E-02 for every other tutor request: a panel message held on its way while the account changes is answered to nobody, and the panel is the new student's. Step 20 is the eighth, for the lesson surfaces that record what the tutor sends back: a written answer held on its way to be evaluated while the account changes is kept in its own student's record and draft, shown to nobody, and the task is handed to the new student empty.

## Step 1 - Student A starts the drill and walks away

A signs up, opens `reading-full-006-drill-p2` from the real Reading hub link, answers question 14 and leaves without submitting.

| Check | Result | Observed |
|---|---|---|
| Student A is signed in with a real account id | PASS | A = 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| The drill opens from its real hub link | PASS | clicked a[href="/ielts-website/trainers/reading/reading-full-006-drill-p2"] |
| The drill is on screen with its answer controls | PASS | 6 select(s) |

**A's saved sitting:** {"ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010": {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-513c1a55-dba5-4357-ab60-bbbe9a243e5f", "startedAt": 1790172852250, "endsAt": 1790174052250, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"}}
| A's chosen answer for q14 was saved | PASS | saved answer = "i", control on screen showed "i" |
| A's unfinished sitting is saved under A's own key, not the old device-wide one | PASS | keys = ['ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010'] |
| The sitting carries the owner it was started under | PASS | owner = u:7acbbbc1-3d58-42ea-a885-55950a0bf010, answer q14 = "i" |

_screenshot **unfinished8-01-a-answers-q14.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 2 - B signs up on the same browser and opens the same drill

The exact path the review reproduced the defect on: A signs out, B signs up, B enters the drill from the same hub link.

| Check | Result | Observed |
|---|---|---|
| Student B is a different account | PASS | B = f833bb47-1d78-4840-8d6d-be33baf33dbf |
| B sees NO answer selected (A's answer is not restored) | PASS | B's first select reads "" (A had chosen "i") |

_screenshot **unfinished8-02-b-sees-a-blank-drill.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 3 - B submits the drill

B submits without answering anything, so ANY non-empty first answer in B's record or in the rows the account received could only have come from A.

| Check | Result | Observed |
|---|---|---|

**B's learner record, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| B's learner record contains none of A's answers | PASS | 13 item(s) recorded, 0 of them non-blank: [] |
| Nothing anywhere in B's whole browser record carries A's answer | PASS | searched B's whole record for '"firstAnswer":"i"': not present |

_screenshot **unfinished8-03-b-submitted.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**The rows the stand-in holds for B, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| The stand-in's rows for B contain only B's own (blank) answers, nothing of A's | PASS | 13 item(s) in B's rows, 0 non-blank: [] |
| Nothing in everything the stand-in holds for B carries A's answer | PASS | searched every row the stand-in holds for B for '"firstAnswer":"i"': not present |
| A's own account received nothing from B's submission either | PASS | 0 event(s) on A so far |

## Step 4 - A signs back in and resumes the sitting

Nothing was deleted: A's answers are still under A's own key, and the drill restores them.

| Check | Result | Observed |
|---|---|---|
| A is signed back in, same account id | PASS | back as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |

**Every sitting on the device now:** {"ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010": {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-513c1a55-dba5-4357-ab60-bbbe9a243e5f", "startedAt": 1790172852250, "endsAt": 1790174052250, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"}}
| A's unfinished sitting survived B's entire visit | PASS | {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-513c1a55-dba5-4357-ab60-bbbe9a243e5f", "startedAt": 1790172852250, "endsAt": 1790174052250, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"} |
| A's own answer is restored when A resumes | PASS | A resumed to "i" (A had chosen "i") |
| A resumed straight into the running paper, not the instructions gate | PASS | 1 timer(s) on screen |

_screenshot **unfinished8-04-a-resumes-own-answer.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Steps 1 to 4 failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED); FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 5 - A is mid-drill and signs out in a SECOND TAB

The case the review asked for explicitly: the player is already on screen when the account changes. It must stop and must not submit.

| Check | Result | Observed |
|---|---|---|
| The mounted player stopped and says the sitting belongs to the signed-out account | PASS | looked for "You signed out during this test" on the open drill; found 1 |
| The stopped player offers a way to start fresh under the account using the browser now | PASS | "Start this test fresh" buttons: 1 |
| No Submit control is reachable on the stopped player | PASS | Submit buttons on screen: 0 |

_screenshot **unfinished8-05-player-stopped-after-signout.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="You signed out during this test"_

**Every sitting on the device after the sign-out:** {"ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010": {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-513c1a55-dba5-4357-ab60-bbbe9a243e5f", "startedAt": 1790172852250, "endsAt": 1790174052250, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"}}
| A's answers stayed under A's own key and were not copied to the signed-out device owner | PASS | keys = ['ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010'] |
| The stopped sitting was never submitted for anybody | PASS | 0 submitted drill event(s) on A's rows |

**Step 5 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 6 - An old unowned sitting B left, on a device whose history stamp names A (Codex R2-01)

A fresh browser that already holds, before any page script runs, what an older build would have left: B's unfinished sitting of the same drill under the OLD device-wide key (`ielts.testsession.v1`, answers {"q14": "iv", "q15": "vii"}, no owner written inside it), and the device's history stamp (`ielts.learning.legacy.v1`) naming A. The stamp records whose HISTORY this device migrated; it says nothing about who started the sitting. A signs in and opens the drill, and must get none of it.

| Check | Result | Observed |
|---|---|---|
| B's old sitting is on the device under the old device-wide key before A signs in | PASS | ielts.testsession.v1 = {"version":1,"testId":"reading-full-006-drill-p2","startedAt":1790172919846,"endsAt":1790174119846,"answers":{"q14":"iv","q15":"vii"}} |
| The device's history stamp names A | PASS | ielts.learning.legacy.v1 = {"version":1,"ownerKey":"u:7acbbbc1-3d58-42ea-a885-55950a0bf010","at":"2026-09-01T09:00:00.000Z"} |
| A is signed in on this browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A's drill opens on its instructions, not inside B's running sitting | PASS | 0 running timer(s) on screen before A pressed Start test |
| A sees NO answer selected for q14 (B's "iv" is not restored) | PASS | A's first select reads "" |
| A's own sitting of the drill holds none of B's answers, so A cannot submit them | PASS | A's sitting = {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-e8603886-08a6-4056-aa95-e0edbabefca2", "startedAt": 1790172939261, "endsAt": 1790174139261, "answers": {}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"} |
| B's old sitting was parked with this device's ANONYMOUS owner, byte for byte | PASS | ielts.testsession.v1::anon:315eba63-218f-43bf-bbfa-d5d39a134d06 = {"version":1,"testId":"reading-full-006-drill-p2","startedAt":1790172919846,"endsAt":1790174119846,"answers":{"q14":"iv","q15":"vii"}} |
| The old device-wide key still holds exactly what it held (nothing deleted or changed) | PASS | compared byte for byte with the seeded value |
| The parking note names only the anonymous owner, never A | PASS | ielts.unowned.adopted.v1 = {"version":1,"adopted":{"anon:315eba63-218f-43bf-bbfa-d5d39a134d06":["ielts.testsession.v1"]}} |

**Every sitting on the device now:** {"ielts.testsession.v1": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790172919846, "endsAt": 1790174119846, "answers": {"q14": "iv", "q15": "vii"}}, "ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010": {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-e8603886-08a6-4056-aa95-e0edbabefca2", "startedAt": 1790172939261, "endsAt": 1790174139261, "answers": {}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"}, "ielts.testsession.v1::anon:315eba63-218f-43bf-bbfa-d5d39a134d06": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790172919846, "endsAt": 1790174119846, "answers": {"q14": "iv", "q15": "vii"}}}

_screenshot **unfinished8-06-a-signed-in-sees-none-of-b.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Signed out, the device's own student finds the old sitting where it was left (q14 = "iv"), which also shows the blank above was not a rendering accident | PASS | the signed-out drill reads "iv" |

_screenshot **unfinished8-07-signed-out-device-keeps-old-sitting.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Step 6 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 7 - A starts a mock exam, hands in Listening, and signs out in another tab (Codex R2-03)

The mock used to live only in the screen's memory: a sign-out, a refresh or a stray navigation lost the finished papers and the essays, and the stopped screen offered only a fresh mock. It is now written down under the student sitting it.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A's start screen offers no unfinished mock (A has none on this browser yet) | PASS | "You have an unfinished mock exam" on screen: 0 |
| The mock starts on Listening and is written down under A's own key, stamped with A | PASS | ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 = {"version": 1, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010", "sittingId": "sitting-86f1f45b-186c-4fb4-9255-25e9f920034d", "mockId": "mock-2026-09-23-1", "startedAt": "2026-09-23T14:16:08.213Z", "stage": "listening", "listeningTestId": "listening-full-001", "readingTestId": "reading-full-001", "task1PromptId": "pte-wt-126-task1", "task2PromptId": "pte-wt-121-task2", "listening": null, "reading": null, "essay1": "", "essay2": "", "writingEndsAt": null, "speakingBand": null, "speakingCriteria": null, "speakingSkipped": false, "legSittings": {"listening-full-001": {"testId": "listening-full-001", "startedAt": 1790172968226, "endsAt": 1790175368226, "answers": {}, "result": null}}, "savedAt": 1790172968259} |
| A hands in Listening and the mock moves on to the beat before Reading | PASS | submitted = True, transition screen shown = True |
| A's written-down mock now has Listening done | PASS | stage = transition-reading, listening = {"raw": 0, "total": 40, "band": 0, "bandLabel": "below 2.5", "secondsUsed": 3} |

_screenshot **unfinished8-08-a-listening-done.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Reading starts in 59 seconds"_
| A's open mock stops and says A signed out | PASS | "You signed out during this mock exam": 1 |
| The stopped screen says the sitting is kept for its student and picks up when they sign back in | PASS | found 1 |

_screenshot **unfinished8-09-a-mock-stopped-after-signout.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| A's written-down mock is still there after the sign-out, Listening still done | PASS | ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 = {"version":1,"owner":"u:7acbbbc1-3d58-42ea-a885-55950a0bf010","sittingId":"sitting-86f1f45b-186c-4fb4-9255-25e9f920034d","mockId":"mock-2026-09-23-1","startedAt":"2026-09-23T14:16:08.213Z","stage":"transition-reading","listeningTestId":"listening-full-001","readingTestId":"reading-full-001","task1PromptId":"pte-wt-126-task1","task2PromptId":"pte-wt-121-task2","listening":{"raw":0,"total":40,"band":0,"bandLabel":"below 2.5","secondsUsed":3},"reading":null,"essay1":"","essay2":"","writingEndsAt":null,"speakingBand":null,"speakingCriteria":null,"speakingSkipped":false,"legSittings":{"listening-full-001":{"testId":"listening-full-001","startedAt":1790172968226,"endsAt":1790175368226,"answers":{},"result":{"raw":0,"total":40,"band":0,"bandLabel":"below 2.5","secondsUsed":3}}},"savedAt":1790172975146} |

## Step 8 - B signs in on the same browser and starts a fresh mock

B must see nothing of A's sitting, get a mock of their own from the start, and A's written-down sitting must not change at all.

| Check | Result | Observed |
|---|---|---|
| B is signed in | PASS | signed in as f833bb47-1d78-4840-8d6d-be33baf33dbf |
| A's still-open tab now says the mock belongs to another student, and shows none of it | PASS | "belongs to another student": 1, transition screen: 0 |
| B's start screen offers NO unfinished mock (A's is not B's to continue) | PASS | "You have an unfinished mock exam" on screen: 0 |

_screenshot **unfinished8-10-b-start-screen-no-offer.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| B's fresh mock starts at Listening with nothing done, under B's own key | PASS | ielts.mock.active.v1::u:f833bb47-1d78-4840-8d6d-be33baf33dbf = {"version": 1, "owner": "u:f833bb47-1d78-4840-8d6d-be33baf33dbf", "sittingId": "sitting-5ff8c3a8-5a42-493e-9229-7287cdf26a4e", "mockId": "mock-2026-09-23-1", "startedAt": "2026-09-23T14:16:39.997Z", "stage": "listening", "listeningTestId": "listening-full-001", "readingTestId": "reading-full-001", "task1PromptId": "pte-wt-107-task1", "task2PromptId": "pte-wt-121-task2", "listening": null, "reading": null, "essay1": "", "essay2": "", "writingEndsAt": null, "speakingBand": null, "speakingCriteria": null, "speakingSkipped": false, "legSittings": {"listening-full-001": {"testId": "listening-full-001", "startedAt": 1790173000017, "endsAt": 1790175400017, "answers": {}, "result": null}}, "savedAt": 1790173000082} |
| B's fresh mock is a different sitting from A's | PASS | B started 2026-09-23T14:16:39.997Z, A started 2026-09-23T14:16:08.213Z |
| B's Listening paper is B's own, with no answers carried over, kept inside B's own mock sitting (not in the standalone slot) | PASS | B's Listening paper = {"testId": "listening-full-001", "startedAt": 1790173000017, "endsAt": 1790175400017, "answers": {}, "result": null}, B's standalone slot = null |
| A's written-down mock was not touched by B's fresh one | PASS | compared byte for byte with A's copy right after A signed out |

_screenshot **unfinished8-11-b-fresh-mock-listening.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_

**Step 8 (B's tab) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-001.mp3 (net::ERR_ABORTED)

## Step 9 - A signs back in and carries on with Listening still done

Two ways back: the tab A left open, which should simply carry on, and a newly opened mock page, which should offer A's own sitting back.

| Check | Result | Observed |
|---|---|---|
| A is signed back in | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A's still-open tab carries straight on from where it stopped (the beat before Reading) | PASS | transition screen: 1, stopped screen: 0 |

_screenshot **unfinished8-12-a-back-in-the-open-tab.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Reading starts in 56 seconds"_
| A newly opened mock page offers A's OWN unfinished mock back | PASS | "You have an unfinished mock exam" on screen: 1 |
| The offer says Listening is already finished and where the sitting picks up | PASS | "Finished so far: Listening": 1, "It picks up at Reading": 1 |

_screenshot **unfinished8-13-a-offered-own-mock-back.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| A carries on in the SAME sitting with Listening still done | PASS | stage = transition-reading, listening = {"raw": 0, "total": 40, "band": 0, "bandLabel": "below 2.5", "secondsUsed": 3}, mockId = mock-2026-09-23-1, startedAt = 2026-09-23T14:16:08.213Z, sittingId = sitting-86f1f45b-186c-4fb4-9255-25e9f920034d |

_screenshot **unfinished8-14-a-resumed-own-mock.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Reading starts in 59 seconds"_

## Step 10 - A reload during Writing keeps the draft and the Writing deadline

A carries on through Reading into Writing, types a draft, and reloads the page. The Writing hour is stored as the moment it runs out, so picking the sitting up again must neither restart the clock nor lose the draft.

| Check | Result | Observed |
|---|---|---|
| Writing is running and its deadline, the finished papers and A's draft are written down | PASS | stage = writing, writingEndsAt = 1790176634692, essay1 = "SYNTHETIC Task 1 draft by student A, typed during the mock." |
| After the reload the start screen offers the sitting back, with the Writing time that is left | PASS | offer: 1, "left on the Writing clock": 1 |

_screenshot **unfinished8-15-a-reload-offer-with-writing-time.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| A's draft is back exactly as typed | PASS | textarea reads "SYNTHETIC Task 1 draft by student A, typed during the mock." |
| The stored Writing deadline was not restarted or moved | PASS | before the reload 1790176634692, after 1790176634692 |
| The clock on screen counts down to that same deadline, not a fresh 60:00 | PASS | clock shows "⏱ 59:49" (3589 s), the stored deadline leaves 3588 s |

_screenshot **unfinished8-16-a-writing-resumed-same-deadline.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_

## Step 11 - A signs out on the Speaking brief, and again with the examiner open, and is back on the brief each time, never at the results (Codex R2B-02)

An account change used to take the examiner off screen in a way it reported as the student cancelling Speaking: the mock skipped Speaking, went to its results, and when A was back it recorded itself without Speaking and forgot the sitting. The examiner here is opened against an address on the stand-in with nothing behind it, so no interview, microphone or paid session is ever started; it stops on its own error screen, which is enough to be taken off screen.

| Check | Result | Observed |
|---|---|---|
| A finishes Writing and is on the Speaking brief, written down as such | PASS | on the brief = True, stage = speaking-brief |

_screenshot **unfinished8-17-a-speaking-brief.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Speaking"_
| Signed out on the brief, A's open mock stops, and does not go to the results | PASS | stopped screen: 1, results: False |
| A's sitting is still written down at the Speaking brief, and no mock was recorded | PASS | stage = speaking-brief, speakingSkipped = False, A's mock history = [] |
| A signs back in and the open tab is on the Speaking brief again, not the results | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010, on the brief = True, results = False |

_screenshot **unfinished8-18-a-back-on-the-brief.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Speaking"_
| A opens the examiner; with nothing behind its address it stops on its own error screen before any microphone or session is asked for, and the sitting is written down as in the interview | PASS | examiner error screen = True, stage = speaking |

_screenshot **unfinished8-19-a-examiner-open-no-service.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| Signed out with the examiner open, A's tab stops; it neither skips Speaking nor goes to the results | PASS | stopped screen: 1, results: False |
| A's sitting is still written down in the interview: not cleared, Speaking not skipped, no mock recorded | PASS | stage = speaking, speakingSkipped = False, A's mock history = [] |

_screenshot **unfinished8-20-a-stopped-with-examiner-open.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| A signs back in: the open tab is on the Speaking brief, saying the interview was interrupted, and not on the results | PASS | on the brief = True, interrupted note = 1, results = False |
| Still nothing recorded for A's mock, and A's sitting is still there | PASS | A's mock history = [] |

_screenshot **unfinished8-21-a-back-on-brief-after-examiner.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Speaking"_
| After a reload A is offered the sitting back, picking up at Speaking | PASS | offer: 1, "It picks up at Speaking": 1 |
| Continue lands on the Speaking brief with the interrupted note, never back inside an interview | PASS | on the brief = True, interrupted note = 1 |

_screenshot **unfinished8-22-a-reload-resumes-at-speaking-brief.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="Speaking"_
| A's own Back on the examiner still goes to the results, with Speaking skipped | PASS | results = True, "you skipped Speaking": 2 |
| The mock is recorded once, for A, with Speaking marked skipped, and is no longer offered as unfinished | PASS | A's mock history = [{"id": "mock-2026-09-23-1", "at": "2026-09-23T14:16:08.213Z", "listeningTestId": "listening-full-001", "listeningBand": 0, "listeningRaw": 0, "listeningTotal": 40, "readingTestId": "reading-full-001", "readingBand": 0, "readingRaw": 0, "readingTotal": 40, "essays": [{"promptId": "pte-wt-126-task1", "task": "task1", "text": "SYNTHETIC Task 1 draft by student A, typed during the mock.", "wordCount": 10}, {"promptId": "pte-wt-121-task2", "task": "task2", "text": "", "wordCount": 0}], "speakingSkipped": true, "secondsUsed": 76, "sittingId": "sitting-86f1f45b-186c-4fb4-9255-25e9f920034d"}], written-down sitting = None |

_screenshot **unfinished8-23-a-deliberate-back-skips-speaking.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="You've finished the sitting"_

**Step 11 (second tab) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Steps 7, 9, 10 and 11 (A's tabs) console errors:** Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found); Failed to load resource: the server responded with a status of 404 (Not Found)

**Steps 7, 9, 10 and 11 (A's tabs) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-001.mp3 (net::ERR_ABORTED); 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/; 404 http://127.0.0.1:8833/no-examiner-here/

## Step 12 - A's mock paper survives a standalone drill opened part way through, and a fresh mock on the same paper starts empty (Codex R2B-03)

A mock's Listening and Reading papers used to share the ONE slot a paper opened on its own uses, found by paper id alone: a drill opened mid-mock overwrote the mock's answers and clock, and a new mock on a paper that happened to be in the slot picked up the older sitting. They are now kept inside the mock sitting itself, under its own identity.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A's answers on the mock's Listening paper are kept inside the mock sitting, with the paper's deadline | PASS | sittingId = sitting-8837e4da-3662-488d-9c7f-9f1b1fb5b1f8, listening-full-002 = {"answers": {"q1": "synthetic library", "q2": "synthetic tuesday"}, "endsAt": 1790175526906, "result": null, "startedAt": 1790173126906, "testId": "listening-full-002"} |
| Nothing of the mock's paper is in the standalone slot | PASS | standalone slot = null |

_screenshot **unfinished8-24-a-mock-listening-answered.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| A's standalone Reading drill uses the standalone slot, with A's answer in it | PASS | standalone slot = {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-9d34aafd-3998-45a5-985e-19cdd94c04a8", "startedAt": 1790173133739, "endsAt": 1790174333739, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"} |
| The drill did not touch the mock's Listening paper: same answers, same deadline, byte for byte | PASS | listening-full-002 now = {"answers": {"q1": "synthetic library", "q2": "synthetic tuesday"}, "endsAt": 1790175526906, "result": null, "startedAt": 1790173126906, "testId": "listening-full-002"} |

_screenshot **unfinished8-25-a-standalone-drill-mid-mock.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Back on the mock page, A is offered the same sitting, picking up at Listening | PASS | offer: 1, "It picks up at Listening": 1 |
| A resumes the mock's Listening paper with both answers still in their gaps | PASS | gaps read ["synthetic library", "synthetic tuesday"], typed ["synthetic library", "synthetic tuesday"] |
| The Listening clock counts down to the same deadline it had before the drill | PASS | clock shows "⏱ 39:46" (2386 s), the stored deadline leaves 2385 s |

_screenshot **unfinished8-26-a-mock-listening-resumed.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| The fresh mock is a NEW sitting on the same Listening paper | PASS | sittingId sitting-8837e4da-3662-488d-9c7f-9f1b1fb5b1f8 -> sitting-5d84e809-3d09-4cf5-8ac3-e4897b4f2922, Listening paper = listening-full-002 |
| Its Listening paper starts empty, on screen and in storage | PASS | gaps read ["", ""], stored paper = {"testId": "listening-full-002", "startedAt": 1790173143478, "endsAt": 1790175543478, "answers": {}, "result": null} |
| Its Listening clock is its own: a later deadline than the older sitting's | PASS | older deadline 1790175526906, fresh deadline 1790175543478 |
| Nothing of the older sitting's answers is anywhere in the fresh sitting | PASS | searched the whole written-down fresh sitting for the two older answers |
| A's standalone drill is still in the standalone slot, untouched by either mock | PASS | standalone slot = {"version": 1, "testId": "reading-full-006-drill-p2", "sittingId": "sitting-9d34aafd-3998-45a5-985e-19cdd94c04a8", "startedAt": 1790173133739, "endsAt": 1790174333739, "answers": {"q14": "i"}, "owner": "u:7acbbbc1-3d58-42ea-a885-55950a0bf010"} |

_screenshot **unfinished8-27-a-fresh-mock-empty-listening.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_

**Step 12 failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-002.mp3 (net::ERR_ABORTED)

## Step 13 - A mock left open in one tab stops when A starts a fresh one in another, and never overwrites or removes it (Codex R2C-02)

The papers' own writes already had to name their sitting; the mock screen's own saves and its tidy-up did not. A keystroke in an older mock (M1) left open in one tab replaced a fresh mock (M2) the same student had started in another, papers and all, and finishing M1 deleted M2. Now only starting a mock may replace a sitting; every other save and the tidy-up must name the stored sitting itself, and a replaced tab stops for good.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| Tab 1: A's mock M1 is in Writing, with A's draft written down | PASS | stage = writing, sittingId = sitting-f28e1b0b-cb90-4007-8614-9635d63a07d9, essay1 = "SYNTHETIC Task 1 draft in the OLDER mock, typed in the first tab." |

_screenshot **unfinished8-28-m1-in-writing.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| Tab 2's start screen offers M1 back and says that starting a new mock replaces it | PASS | offer: 1, "replaces this unfinished one": 1 |
| Tab 2: M2 is a NEW sitting, with its own Listening answers kept inside it | PASS | M1 sitting-f28e1b0b-cb90-4007-8614-9635d63a07d9 -> M2 sitting-887bfbbb-09cc-40e7-a11e-c8dcbcb78642, M2 Listening answers = {"q1": "synthetic harbour", "q2": "synthetic friday"} |

_screenshot **unfinished8-29-m2-started-in-second-tab.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| Tab 1 stops on its own calm screen, told by the other tab's write: the new sentence, no essay boxes, no Finish Writing | PASS | sentence: 1, textareas: 0, Finish Writing: 0 |

_screenshot **unfinished8-30-m1-stopped-replaced-by-m2.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A newer mock exam was started in another tab, so this one is no longer being saved."_
| Nothing tab 1 does writes: the record is still M2, byte for byte, its Listening answers intact | PASS | ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte with M2 as tab 2 left it |
| No mock was recorded for A from the stopped M1 | PASS | A's mock history = [] |
| Tab 2 carries on untouched: M2's paper is on screen with its answers, and it is not stopped | PASS | timers: 1, stopped sentence: 0 |

**Step 13 (tab 1) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-002.mp3 (net::ERR_ABORTED)

**The two variants below stand in for a tab that MISSED the other tab's storage event.** The newer sitting is written from the page itself, which raises no storage event in that page. The record is otherwise exactly what a fresh mock would write.
| Tab 2 takes M2 on into Writing (the setting for the next check) | PASS | stage = writing, sittingId = sitting-887bfbbb-09cc-40e7-a11e-c8dcbcb78642 |
| With the event missed, tab 2 was still open before typing; the first keystroke's save is refused, the replacement is found from that refusal, and the stopped screen shows | PASS | stopped sentence before typing: 0, after: 1 |
| The keystroke wrote nothing: the newer record is there byte for byte, its paper and answer intact | PASS | ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte with the newer sitting written before the keystroke |

_screenshot **unfinished8-31-m2-stopped-on-refused-save.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A newer mock exam was started in another tab, so this one is no longer being saved."_

**Step 13 (tab 2) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-003.mp3 (net::ERR_ABORTED)
| A third tab picks up the stored sitting and saves normally into it, on to the Speaking brief | PASS | stage = speaking-brief, sittingId = SYNTHETIC-newer-sitting-missed-event |
| Finishing the replaced sitting (Skip speaking, straight to the results) stops on the stopped screen instead of the results | PASS | stopped sentence: 1, results: False |
| Finishing it removed nothing: the newer record is still there byte for byte | PASS | ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte with the newer sitting written before the finish |
| And recorded nothing: A's mock history is still empty | PASS | A's mock history = [] |

_screenshot **unfinished8-32-finish-of-replaced-sitting-refused.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="A newer mock exam was started in another tab, so this one is no longer being saved."_

**Step 13 (tab 3) console errors:** Failed to load resource: the server responded with a status of 404 (Not Found)

**Step 13 (tab 3) failed/4xx/5xx requests:** 404 http://127.0.0.1:8833/no-examiner-here/

## Step 14 - The open page's clock follows the saved deadline across a sign-out, and a paper that ran out while A was away is handed in at once (Codex R2C-03)

The player used to freeze a count-down while A was away and carry on from the frozen number when A was back on the same open page: ten minutes away cost nothing there, while a reload of the same sitting found it expired. Every reading now comes from the saved deadline. To keep the run short the saved deadline is moved close and the page reloaded, so the page holds that short deadline BEFORE the sign-out; from there it is never reloaded.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| The drill runs with a saved deadline about 150 seconds ahead, and the open page shows it | PASS | clock shows 149 s, the saved deadline leaves 148 s |
| A signs out in the second tab and the open drill stops | PASS | "You signed out during this test": 1 |
| Back on the same open page, the clock shows what the deadline leaves, not the number frozen at the sign-out | PASS | at the sign-out the clock read 149 s; back after about 25 s away it reads "⏱ 01:44" (104 s); the saved deadline leaves 104 s |

_screenshot **unfinished8-33-back-before-deadline-clock-from-deadline.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| A is away past the deadline; the stopped paper was not handed in for anybody meanwhile | PASS | stopped = True, drill events in A's record = 0, in the signed-out device's = 0, A's sitting still saved = True |
| Back on the open page, the paper is handed in at once, as an expired sitting is on a fresh load: the score is showing and the clock reads 00:00 | PASS | score showing = True, clock "⏱ 00:00" |
| No time was given back: the time used is the whole paper, and A's answers (both, including the one given after the first reload) were handed in | PASS | secondsUsed = 1200 (paper 1200 s), saved answers {"q14": "i", "q15": "ii"}, handed in {"q14": "i", "q15": "ii"} |
| The finished sitting is no longer saved as unfinished | PASS | A's standalone slot = null |

_screenshot **unfinished8-34-back-after-deadline-handed-in.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| When time runs out on the open page, the paper is handed in WITH the answer given after the page opened (the timer used to hand in the answers of the moment it started) | PASS | score showing = True, answer given after the reload {"q14": "i"}, handed in ["i"], completion = completed |

_screenshot **unfinished8-35-plain-time-up-keeps-late-answer.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Step 14:** no console errors, no failed/4xx/5xx requests.

## Step 15 - Two different papers in two tabs: the older one stops, never writes over the newer one, and hands in nothing (Codex R2D-02)

The one standalone slot per student used to check only WHOSE sitting a save or a clear was for, never WHICH: a keystroke in paper P, left open in one tab, wrote P's answers over paper Q started in another, handing P in cleared Q, and P's result was recorded before that clear. Every sitting now has its own identity; ordinary saves and the hand-in must name the stored sitting itself, a replaced tab stops for good, and a hand-in is checked BEFORE anything is recorded.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| Tab 1: A answers question 14 of paper P, saved in the slot with P's own sitting id | PASS | testId = reading-full-006-drill-p2, sittingId = sitting-0d3c928e-a028-43f6-bc73-c58399f79d3f, answers = {"q14": "i"} |

_screenshot **unfinished8-36-p-answered-in-tab-1.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Tab 2: A starts paper Q and answers it; the slot holds Q now, a different sitting, with Q's answer | PASS | answered with a select; slot testId = reading-full-007-drill-p1, sittingId sitting-0d3c928e-a028-43f6-bc73-c58399f79d3f -> sitting-4872dce4-add5-437b-ba27-9c50261dd656, answers = {"q7": "True"} |

_screenshot **unfinished8-37-q-started-in-tab-2.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-007-drill-p1`, landmark heading="None"_
| Tab 1 stops on the calm stopped screen, told by tab 2's write: the new sentence, no answer controls, no Submit | PASS | sentence: 1, answer controls: 0, Submit: 0 |

_screenshot **unfinished8-38-p-stopped-in-tab-1.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="A newer test was started in another tab, so this one is no longer being saved."_
| Typing again in tab 1 writes nothing: the slot is still Q, byte for byte, with Q's answer | PASS | ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte with the slot as tab 2 left it |
| Tab 1 handed nothing in: no submitted attempt of P in A's learner record since this step began | PASS | handed-in events of P since 2026-09-23T14:23:11.572Z: 0; P's unfinished rows (written by tab 2's page load, the existing rule for a paper left behind): 1 |
| Reloading tab 2 resumes Q as before: the same sitting, its answers, the paper running and not stopped | PASS | timers: 1, sittingId = sitting-4872dce4-add5-437b-ba27-9c50261dd656, answers = {"q7": "True"}, same deadline: True |

_screenshot **unfinished8-39-q-resumed-after-reload.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-007-drill-p1`, landmark heading="None"_

**Step 15 (tab 1) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED)

**The next two checks stand in for a tab that MISSED the other tab's storage event.** The newer sitting is written from the page itself, which raises no storage event in that page; the value is exactly what "Start test" in another tab writes.
| With the event missed, tab 2 was still running; its next answer's save is refused, the replacement is found from that refusal, and the stopped screen shows | PASS | answered with a select; stopped sentence before: 0, after: 1 |
| That answer wrote nothing: the newer sitting is there byte for byte | PASS | ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte with the newer sitting written before the answer |

_screenshot **unfinished8-40-q-stopped-on-refused-save.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-007-drill-p1`, landmark heading="A newer test was started in another tab, so this one is no longer being saved."_

**Step 15 (tab 2):** no console errors, no failed/4xx/5xx requests.
| A third tab on paper P picks up the stored (newer) sitting of P and runs it | PASS | timers: 1, sittingId = SYNTHETIC-sitting-1790173402180 |
| Its Submit is refused before anything is recorded: the stopped screen, not the score | PASS | stopped sentence: 1, score showing: False |
| Nothing was recorded for P and nothing was cleared: the slot is the newer sitting, byte for byte | PASS | handed-in events of P since the step began: 0; ielts.testsession.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 compared byte for byte |

_screenshot **unfinished8-41-submit-refused-when-replaced.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="A newer test was started in another tab, so this one is no longer being saved."_

**Step 15 (tab 3):** no console errors, no failed/4xx/5xx requests.
| The same sitting open in two tabs: one hands it in, and the other stops with the sentence for a sitting handed in elsewhere, with no Submit left to press | PASS | shared sitting SYNTHETIC-sitting-1790173406055; both running: True; tab 5 score showing: True; tab 4 sentence: 1, Submit: 0 |
| Q was handed in once, and the slot is empty | PASS | handed-in events of Q since the step began: 1; slot = null |

_screenshot **unfinished8-42-same-sitting-handed-in-elsewhere.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-007-drill-p1`, landmark heading="This test was submitted or closed in another tab, so this one is no longer being saved."_

**Step 15 (tab 4):** no console errors, no failed/4xx/5xx requests.

## Step 16 - A mock finished in another tab stops the tab still showing it, and is recorded once (Codex R2D-03)

A mock whose record DISAPPEARED used to be treated as nothing to worry about: two tabs on the same sitting, one finished it (recording it and clearing the record), and the other went on unsaved and recorded the same mock again at its own results. Now a record that is gone after a tab saw it stops that tab for good with its own sentence, the results step records only after it finalised that very sitting, and the history takes one record per sitting.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| Tab 1: A's mock is in Writing, with A's draft written down | PASS | stage = writing, sittingId = sitting-e6081e5c-d405-47bb-84b2-50e9a9119418 |

_screenshot **unfinished8-43-mock-in-writing-tab-1.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| Tab 2 picks up the same sitting, in Writing, and tab 1 carries on (a write of the same sitting stops nothing) | PASS | sittingId = sitting-e6081e5c-d405-47bb-84b2-50e9a9119418; tab 1 stopped sentences: 0, 0 |
| Tab 2 finishes it: the results are showing, the in-progress record is gone, and A's mock history holds it once, with its sitting id | PASS | results: True, record present: False, history 0 -> 1 rows, rows of sitting sitting-e6081e5c-d405-47bb-84b2-50e9a9119418: 1 |

_screenshot **unfinished8-44-mock-finished-in-tab-2.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="You've finished the sitting"_
| Tab 1 stops on its stopped screen with the sentence for a sitting finished elsewhere (not the replaced one): no essay boxes, no Finish Writing | PASS | gone sentence: 1, replaced sentence: 0, textareas: 0 |

_screenshot **unfinished8-45-mock-tab-1-stopped-finished-elsewhere.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="This mock exam was finished or closed in another tab, so this one is no longer being saved."_
| Nothing tab 1 does writes or records: no in-progress record comes back, the mock history holds the sitting once, and the learning history holds its mock event once | PASS | record present: False, history rows of this sitting: 1, 'test:mock' events of this sitting (at 2026-09-23T14:23:59.594Z): 1 |

**Step 16 (tab 1) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-004.mp3 (net::ERR_ABORTED)

**Step 16 (tab 2) console errors:** Failed to load resource: the server responded with a status of 404 (Not Found)

**Step 16 (tab 2) failed/4xx/5xx requests:** 404 http://127.0.0.1:8833/no-examiner-here/

**The next two checks stand in for a tab that MISSED the other tab's storage event.** The record is removed from the page itself, which raises no storage event in that page; that removal is exactly what another tab finishing the same sitting does.
| With the event missed, tab 3 was still in Writing; its next keystroke's save is refused, the loss is found from that refusal, and the stopped screen shows the finished-elsewhere sentence | PASS | stopped sentence before typing: 0, after: 1 |
| The keystroke wrote nothing back: no in-progress record | PASS | record present: False |

_screenshot **unfinished8-46-mock-stopped-on-refused-save.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="This mock exam was finished or closed in another tab, so this one is no longer being saved."_

**Step 16 (tab 3) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-005.mp3 (net::ERR_ABORTED)
| Finishing a sitting whose record is gone (Skip speaking, straight to the results) stops on the stopped screen instead of the results | PASS | stopped sentence: 1, results: False |
| And it recorded nothing: no mock history row and no learning event for that sitting | PASS | sitting sitting-365eb40e-458c-45e7-a9ac-d966d2a47046: history rows 0, 'test:mock' events 0 |

_screenshot **unfinished8-47-finish-of-gone-sitting-refused.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="This mock exam was finished or closed in another tab, so this one is no longer being saved."_

**Step 16 (tab 4) console errors:** Failed to load resource: the server responded with a status of 404 (Not Found)

**Step 16 (tab 4) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-006.mp3 (net::ERR_ABORTED); 404 http://127.0.0.1:8833/no-examiner-here/

## Step 17 - A handed-in paper's review leaves the screen when the account changes, and Mr EZ is never asked about it as anybody else (Codex R2E-02)

The test player's owner listener used to leave a SUBMITTED paper alone. A handed a drill in and left its review open; A signed out and B signed in in another tab; the first tab still showed A's answers and score to B, and "Why was my answer wrong?" sent A's answer to Mr EZ with B's token. Now the review belongs to the student who sat the paper: an account change takes the answers, the score and every tutor control off the screen, and every review request to Mr EZ carries that student and is refused, sending nothing, when anybody else would be sending it. The tutor here is the stand-in: every reply it gives is labelled simulated, and no model is called.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| Tab 1: A hands the drill in and reads the review: the score came up, the answers are on screen, and "Why was my answer wrong?" is offered | PASS | score shown: True, review on screen: True, "Why was my answer wrong?" buttons: 9, A's answer to q14 = "i" |
| A's own press goes out once, with A's own token, and the reply on screen is labelled simulated | PASS | review requests from tab 1: 1 (item), sent with A's token: True, simulated badge: 1 |

_screenshot **unfinished8-48-a-review-with-a-simulated-reply.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| A signs out in a second tab: the first tab's review leaves the screen for the signed-out sentence, with no score, no answers and no Mr EZ | PASS | "You signed out, so this result is hidden": 1; left on screen: {"score": 0, "answers": 0, "tutor": 0} |

_screenshot **unfinished8-49-review-hidden-after-sign-out.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="You signed out, so this result is hidden"_
| B signs in there: the first tab says the test belongs to another student and still shows none of A's review | PASS | B = f833bb47-1d78-4840-8d6d-be33baf33dbf; "This test belongs to another student": 1; left on screen: {"score": 0, "answers": 0, "tutor": 0} |
| Nothing was sent to Mr EZ from the first tab after the switch | PASS | review requests from tab 1 before the switch: 1, now: 1 |

_screenshot **unfinished8-50-review-hidden-b-signed-in.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="This test belongs to another student"_
| B's own page for the same drill shows nothing of A: the instructions, no score, no answers, no Mr EZ reply | PASS | Start test: 1; left on screen: {"score": 0, "answers": 0, "tutor": 0} |

_screenshot **unfinished8-51-b-own-drill-page.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="Passage 2 Drill: Can the planet’s coral reefs be saved?"_
| In the same open tab, B's own review of the same drill with the same answer shows none of the reply A bought: every "Why was my answer wrong?" is a fresh button (the cache is per student) | PASS | B's answer to q14 = "i" (A's was "i"); buttons: 9 (A had 9); simulated replies on screen: 0 |
| B's own press on B's own review goes out once, with B's token | PASS | review requests since the switch: 1, B's session user = f833bb47-1d78-4840-8d6d-be33baf33dbf, sent with B's token: True |

_screenshot **unfinished8-52-b-own-review-own-reply.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Step 17 (tab 1):** no console errors, no failed/4xx/5xx requests.

**The next checks stand in for a tab that MISSED the other tab's sign-in.** The third tab is opened with a small script (installed by this test, before the site's own code) that stops it hearing anything from the other tabs: no storage event and no auth broadcast. So when the account changes in tab 2, this tab still believes A is signed in while the stored session is already B's, which is the window in which the old code sent A's answer with B's token.
| A is back (tab 2), and a third tab that hears nothing from the others hands the drill in as A and shows A's review with "Why was my answer wrong?" | PASS | A = 7acbbbc1-3d58-42ea-a885-55950a0bf010; score shown: True, review: True, buttons: 9 |
| B signs in in tab 2; the third tab was not told, so A's review is still on its screen (the window the finding describes), while the session this browser holds is B's | PASS | stored session user = f833bb47-1d78-4840-8d6d-be33baf33dbf (B = f833bb47-1d78-4840-8d6d-be33baf33dbf); left on the third tab's screen: {"score": 0, "answers": 18, "tutor": 10} |

_screenshot **unfinished8-53-deaf-tab-still-shows-a-review.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Its press on A's review sends NOTHING (zero requests to Mr EZ, so nobody's token carried A's answer): the session it would have used is B's, so the request is refused and the review leaves the screen | PASS | review requests from the third tab: before the press 0, after 0; "This test belongs to another student": 1; left on screen: {"score": 0, "answers": 0, "tutor": 0} |

_screenshot **unfinished8-54-deaf-tab-press-refused.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="This test belongs to another student"_

**Step 17 (tab 2) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Step 17 (tab 3):** no console errors, no failed/4xx/5xx requests.

## Step 18 - The same mock paper handed in from two tabs: the first hand-in is final, and the paper is recorded once (Codex R2E-03)

Two tabs that picked up the same mock sitting hold the same Listening paper, and the sitting reads as theirs in both. Handing the paper in used to overwrite whatever result it already had, so the second tab's hand-in replaced the first one's result and recorded the paper a second time, in the progress history and in the learner evidence. Now the first hand-in is final: a tab still holding the paper stops on the other tab's hand-in, and a hand-in that still arrives is refused and records nothing.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| Tab 1 starts a mock on its Listening paper; tab 2 (which hears nothing from the other tabs) and tab 3 pick up the same sitting and the same paper | PASS | Listening paper listening-full-007, sitting sitting-f52375d2-80ec-4c94-8daf-f08e5e54fc7b; tab 2 running: True, tab 3 running: True |

**Tab 2 stands in for a tab that MISSED the other tab's hand-in**, by the same small script as step 17 (no storage event reaches it). Tab 3 is an ordinary tab.
| Tab 1 answers differently from tab 2 and hands the paper in first: accepted, its score is showing, and the paper's result is kept inside the sitting | PASS | answers before the hand-in (tab 1's, the last written): {"q3": "synthetic library", "q4": "synthetic tuesday"}; score showing: True; result = {"band": 0, "bandLabel": "below 2.5", "raw": 0, "secondsUsed": 16, "total": 40} |

_screenshot **unfinished8-55-mock-paper-handed-in-tab-1.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="None"_
| Tab 3 stops on the stopped screen with the sentence for a paper handed in from another tab: no answer boxes, no Submit | PASS | sentence: 1, answer controls: 0, Submit: 0 |

_screenshot **unfinished8-56-mock-paper-tab-3-stopped.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="This paper was already handed in from another tab, so it was not handed in again here. The mock exam carries on from that tab."_
| Tab 2, never told, is still running with its own answers; its hand-in is refused and it stops with the same sentence, never reaching a score | PASS | running before its hand-in: True; sentence after: 1; score showing: False |

_screenshot **unfinished8-57-mock-paper-tab-2-refused.png**: url=`http://127.0.0.1:4386/ielts-website/tests/mock`, landmark heading="This paper was already handed in from another tab, so it was not handed in again here. The mock exam carries on from that tab."_
| The paper's result is still tab 1's, byte for byte, and the sitting is still written down | PASS | result now = {"band": 0, "bandLabel": "below 2.5", "raw": 0, "secondsUsed": 16, "total": 40}; sitting sitting-f52375d2-80ec-4c94-8daf-f08e5e54fc7b |
| The paper was recorded once: one attempt in A's progress history and one submission in A's learner evidence, carrying tab 1's answers and none of tab 2's | PASS | attempts of listening-full-007 since the step began: 1; submissions: 1; answers in the evidence: ["synthetic library", "synthetic tuesday"] |
| Nothing tab 2 did was written: the in-progress record holds no answer of tab 2's | PASS | searched ielts.mock.active.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010 for tab 2's two answers |

**Step 18 (tab 1) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-007.mp3 (net::ERR_ABORTED)

**Step 18 (tab 2) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-007.mp3 (net::ERR_ABORTED)

**Step 18 (tab 3) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4386/ielts-website/audio/listening/test-007.mp3 (net::ERR_ABORTED)

## Step 19 - A message sent to Mr EZ is answered to its own student or to nobody (follow-up to Codex R2E-02)

R2E-02 bound the two review requests to the student who sat the paper. Every other request to Mr EZ still went out with whatever token the browser held, and its reply went into whichever conversation was on the page when it came back; the panel also kept one conversation for the whole browser tab. Now every request is bound to the student on the page when it is made, and handed back only while that student is still the one on the page; the panel's conversation is kept per student and changes with the account. Here A's panel message is held on its way (routed to this test, which answers it), the account changes to B in a second tab, and only then is it released with a SYNTHETIC reply this test wrote, labelled simulated. No model is called, and the stand-in never sees either chat message.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A sends a message from the panel: it goes out once, with A's own token, and is held on its way with no reply yet; A's question is on screen and saved under A's own key | PASS | chat requests held: 1, sent with A's token: True, A's question on screen: True, conversation keys in the tab: ['ielts.mrez.conversation.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010'] |

_screenshot **unfinished8-55-a-message-held-on-its-way.png**: url=`http://127.0.0.1:4386/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| B signs in in a second tab: the first tab's panel is B's now, with none of A's question on it | PASS | B = f833bb47-1d78-4840-8d6d-be33baf33dbf; A's question in the panel: False; B's empty panel ("Where shall we start?"): 1 |

_screenshot **unfinished8-56-panel-is-b-before-release.png**: url=`http://127.0.0.1:4386/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| The late reply for A is not shown: it is nowhere on the first tab's page | PASS | reply in the panel: False; anywhere on the page: 0 |
| Nothing was sent again: one chat request in all, the held one | PASS | chat requests held: 1; chat requests the page made: 1 |
| B's saved conversation holds nothing of A: no question, no reply, and the late reply is not saved anywhere in the tab | PASS | B's key present: False, holds A's question: False; late reply saved anywhere: False; old unowned key present: False; keys: ['ielts.mrez.conversation.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010'] |

**What the tab keeps after the release:** A's own question stays under A's key only (`ielts.mrez.conversation.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010`: present), where A's next sign-in on this tab finds it; B's key has nothing of A's.

_screenshot **unfinished8-57-late-reply-dropped.png**: url=`http://127.0.0.1:4386/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_
| B's own message goes out with B's token, and its reply (synthetic, labelled simulated) lands in B's panel and B's saved conversation, with nothing of A's beside it | PASS | sent with B's token: True; reply in the panel: True; simulated badge: 1; saved under B: True; A's question beside it: False |

_screenshot **unfinished8-58-b-own-message-and-reply.png**: url=`http://127.0.0.1:4386/ielts-website/dashboard`, landmark heading="Good evening.
A little practice. A step closer."_

**Step 19 (tab 1):** no console errors, no failed/4xx/5xx requests.

**Step 19 (tab 2) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 20 - A written answer sent for evaluation is kept for its own student and shown to nobody else (the lesson surfaces, after R2E-02)

The follow-up to R2E-02 for the lesson surfaces that RECORD what the tutor sends back. The tutor client already dropped a reply that came back after the page changed hands, but the written focused task then recorded the student's answer, as not judged, into whichever student was on the page by then. Now the answer is bound at the press to the student who wrote it, kept in THAT student's own record and draft whatever happens next, and shown only while they are still the one on the page; when the page changes hands the task is handed over, empty, to the next student. Here A's evaluation request is held on its way (routed to this test, which answers it), the account changes to B in a second tab, and only then is it released with a SYNTHETIC judged reply this test wrote, labelled simulated. No model is called, and the stand-in never sees the evaluation request.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 7acbbbc1-3d58-42ea-a885-55950a0bf010 |
| A presses Check on the guided overview task: the evaluation goes out once, with A's own token and A's own words, and is held on its way with no reply yet | PASS | typed: True; evaluation requests held: 1; sent with A's token: True; carries A's words: True |

_screenshot **unfinished8-59-a-evaluation-held-on-its-way.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_
| B signs in in a second tab: the first tab's task is handed over to B, empty, with one calm line saying why | PASS | B = f833bb47-1d78-4840-8d6d-be33baf33dbf; answer box now holds: ""; A's words anywhere on the page: 0; the notice ("The account on this page changed. Any answer in progress was kept for the student who was writing it."): 1 |

_screenshot **unfinished8-60-task-handed-to-b-before-release.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_
| The late verdict for A is shown to nobody: neither the verdict nor A's words are anywhere on the first tab's page | PASS | verdict on the page: 0; A's words on the page: 0; answer box: "" |
| Nothing was sent again: one evaluation request in all, the held one | PASS | evaluation requests held: 1; evaluation requests the page made: 1 |

**A's learner record, this task's events:** [{"firstAnswer": "SYNTHETIC overview by student A: coal use fell steadily over the period, while renewable sources rose to overtake it.", "outcome": {"kind": "objective", "met": false, "subskill": "task1-overview", "byModel": false}}]
| A's answer is kept in A's own learner record, once, as an attempt nothing judged (the late verdict was dropped, so no verdict is claimed either way) | PASS | 1 event(s) for focus:writing-task1-overview-guided under u:7acbbbc1-3d58-42ea-a885-55950a0bf010; first answer matches A's words: True; outcome: [{"kind": "objective", "met": false, "subskill": "task1-overview", "byModel": false}] |
| A's answer is kept in A's own draft of the task too, where A's next visit finds it | PASS | attempts in A's draft: ["SYNTHETIC overview by student A: coal use fell steadily over the period, while renewable sources rose to overtake it."] |
| B's learner record and B's draft hold nothing of A's, and the late verdict is kept nowhere at all | PASS | events for this task under B: 0; B's draft: null; keys holding A's words: ['ielts.learning.record.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010', 'ielts.learning.written.v1::u:7acbbbc1-3d58-42ea-a885-55950a0bf010::writing-task1-overview-guided']; keys holding the late verdict: [] |

_screenshot **unfinished8-61-late-verdict-dropped.png**: url=`http://127.0.0.1:4386/ielts-website/trainers/focused/writing-task1-overview-guided`, landmark heading="Task 1 overview: guided practice"_
| Nothing the stand-in holds for B carries A's words or the late verdict | PASS | searched every row the stand-in holds for B: A's words not present; late verdict not present |

**Step 20 (tab 1):** no console errors, no failed/4xx/5xx requests.

**Step 20 (tab 2) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8833/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8833) and the site at http://127.0.0.1:4386/ielts-website. Nothing here is evidence about a real Supabase project.
