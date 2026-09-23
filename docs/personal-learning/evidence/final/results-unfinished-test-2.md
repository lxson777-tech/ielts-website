# Personal learning build: final verification evidence

Run against the FROZEN PRODUCTION SNAPSHOT at http://127.0.0.1:4366/ielts-website on 2026-09-23.

**This is a RERUN** (results-unfinished-test-2.md, screenshots prefixed "unfinished2-") after a fix round on top of the run recorded in results.md. results.md is left untouched.

Nothing on that server can hot reload, so no result below can be explained away as a dev-server artifact.

Every scenario opens its own fresh browser context with empty localStorage and seeds its own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form (`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is the honest returning-student path; the new owner-namespaced stores are seeded directly only where a scenario is specifically about them. **Nothing here is a real student.**

AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every AI-dependent surface is expected to show its honest deterministic fallback. A simulated reply presented as a live one would be recorded as a defect.

**Correcting the boilerplate above, which belongs to the f01-f17 suite and is written by `final_helpers.reset_results()` (another builder's file, not edited here).** Two of its sentences are wrong for THIS run and are superseded by this note: this is NOT the frozen production snapshot (it is a dev server started for this run at http://127.0.0.1:4366/ielts-website), and it is NOT a rerun on top of `results.md`. Supabase IS configured here, pointed at the free local stand-in, which is the whole point of the scenario. No AI is called at any step.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs` at http://127.0.0.1:8813, in memory, this machine only), site under test at http://127.0.0.1:4366/ielts-website, stand-in REST surface at http://127.0.0.1:8813. It is NOT a real Supabase project and nothing below is claimed as proof about one. Every student, email and answer is SYNTHETIC.

It re-runs the journey of finding 1 in `docs/audits/claude-personal-learning-review-2026-09-23.md` (original reproduction: `docs/audits/claude-review-2026-09-23/independent-browser.py`) against the fixed code, and adds A's resume and the mounted-player owner change. Steps 6 to 9 are the second Codex round: R2-01 (an old unowned sitting and a history stamp naming A) and R2-03 (the unfinished mock exam, per student, resumable by its own student only).

## Step 1 - Student A starts the drill and walks away

A signs up, opens `reading-full-006-drill-p2` from the real Reading hub link, answers question 14 and leaves without submitting.

| Check | Result | Observed |
|---|---|---|
| Student A is signed in with a real account id | PASS | A = 8e0d970a-e212-4781-b9a3-cda6e2c31a4c |
| The drill opens from its real hub link | PASS | clicked a[href="/ielts-website/trainers/reading/reading-full-006-drill-p2"] |
| The drill is on screen with its answer controls | PASS | 6 select(s) |

**A's saved sitting:** {"ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145212175, "endsAt": 1790146412175, "answers": {"q14": "i"}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"}}
| A's chosen answer for q14 was saved | PASS | saved answer = "i", control on screen showed "i" |
| A's unfinished sitting is saved under A's own key, not the old device-wide one | PASS | keys = ['ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c'] |
| The sitting carries the owner it was started under | PASS | owner = u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c, answer q14 = "i" |

_screenshot **unfinished2-01-a-answers-q14.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 2 - B signs up on the same browser and opens the same drill

The exact path the review reproduced the defect on: A signs out, B signs up, B enters the drill from the same hub link.

| Check | Result | Observed |
|---|---|---|
| Student B is a different account | PASS | B = 261f33c9-d0c5-48e0-bed8-62303034487e |
| B sees NO answer selected (A's answer is not restored) | PASS | B's first select reads "" (A had chosen "i") |

_screenshot **unfinished2-02-b-sees-a-blank-drill.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 3 - B submits the drill

B submits without answering anything, so ANY non-empty first answer in B's record or in the rows the account received could only have come from A.

| Check | Result | Observed |
|---|---|---|

**B's learner record, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| B's learner record contains none of A's answers | PASS | 65 item(s) recorded, 0 of them non-blank: [] |
| Nothing anywhere in B's whole browser record carries A's answer | PASS | searched B's whole record for '"firstAnswer":"i"': not present |

_screenshot **unfinished2-03-b-submitted.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**The rows the stand-in holds for B, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| The stand-in's rows for B contain only B's own (blank) answers, nothing of A's | PASS | 65 item(s) in B's rows, 0 non-blank: [] |
| Nothing in everything the stand-in holds for B carries A's answer | PASS | searched every row the stand-in holds for B for '"firstAnswer":"i"': not present |
| A's own account received nothing from B's submission either | PASS | 6 event(s) on A so far |

## Step 4 - A signs back in and resumes the sitting

Nothing was deleted: A's answers are still under A's own key, and the drill restores them.

| Check | Result | Observed |
|---|---|---|
| A is signed back in, same account id | PASS | back as 8e0d970a-e212-4781-b9a3-cda6e2c31a4c |

**Every sitting on the device now:** {"ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145212175, "endsAt": 1790146412175, "answers": {"q14": "i"}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"}}
| A's unfinished sitting survived B's entire visit | PASS | {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145212175, "endsAt": 1790146412175, "answers": {"q14": "i"}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"} |
| A's own answer is restored when A resumes | PASS | A resumed to "i" (A had chosen "i") |
| A resumed straight into the running paper, not the instructions gate | PASS | 1 timer(s) on screen |

_screenshot **unfinished2-04-a-resumes-own-answer.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Steps 1 to 4 failed/4xx/5xx requests:** FAILED http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED); FAILED http://127.0.0.1:8813/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED); FAILED http://127.0.0.1:8813/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED)

## Step 5 - A is mid-drill and signs out in a SECOND TAB

The case the review asked for explicitly: the player is already on screen when the account changes. It must stop and must not submit.

| Check | Result | Observed |
|---|---|---|
| The mounted player stopped and says the sitting belongs to the signed-out account | PASS | looked for "You signed out during this test" on the open drill; found 1 |
| The stopped player offers a way to start fresh under the account using the browser now | PASS | "Start this test fresh" buttons: 1 |
| No Submit control is reachable on the stopped player | PASS | Submit buttons on screen: 0 |

_screenshot **unfinished2-05-player-stopped-after-signout.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="You signed out during this test"_

**Every sitting on the device after the sign-out:** {"ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145212175, "endsAt": 1790146412175, "answers": {"q14": "i"}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"}}
| A's answers stayed under A's own key and were not copied to the signed-out device owner | PASS | keys = ['ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c'] |
| The stopped sitting was never submitted for anybody | PASS | 0 submitted drill event(s) on A's rows |

**Step 5 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8813/auth/v1/logout?scope=global (net::ERR_ABORTED)

## Step 6 - An old unowned sitting B left, on a device whose history stamp names A (Codex R2-01)

A fresh browser that already holds, before any page script runs, what an older build would have left: B's unfinished sitting of the same drill under the OLD device-wide key (`ielts.testsession.v1`, answers {"q14": "iv", "q15": "vii"}, no owner written inside it), and the device's history stamp (`ielts.learning.legacy.v1`) naming A. The stamp records whose HISTORY this device migrated; it says nothing about who started the sitting. A signs in and opens the drill, and must get none of it.

| Check | Result | Observed |
|---|---|---|
| B's old sitting is on the device under the old device-wide key before A signs in | PASS | ielts.testsession.v1 = {"version":1,"testId":"reading-full-006-drill-p2","startedAt":1790145304707,"endsAt":1790146504707,"answers":{"q14":"iv","q15":"vii"}} |
| The device's history stamp names A | PASS | ielts.learning.legacy.v1 = {"version":1,"ownerKey":"u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c","at":"2026-09-01T09:00:00.000Z"} |
| A is signed in on this browser | PASS | signed in as 8e0d970a-e212-4781-b9a3-cda6e2c31a4c |
| A's drill opens on its instructions, not inside B's running sitting | PASS | 0 running timer(s) on screen before A pressed Start test |
| A sees NO answer selected for q14 (B's "iv" is not restored) | PASS | A's first select reads "" |
| A's own sitting of the drill holds none of B's answers, so A cannot submit them | PASS | A's sitting = {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145333494, "endsAt": 1790146533494, "answers": {}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"} |
| B's old sitting was parked with this device's ANONYMOUS owner, byte for byte | PASS | ielts.testsession.v1::anon:b1ed41db-3d33-4594-9a77-b8506c56996d = {"version":1,"testId":"reading-full-006-drill-p2","startedAt":1790145304707,"endsAt":1790146504707,"answers":{"q14":"iv","q15":"vii"}} |
| The old device-wide key still holds exactly what it held (nothing deleted or changed) | PASS | compared byte for byte with the seeded value |
| The parking note names only the anonymous owner, never A | PASS | ielts.unowned.adopted.v1 = {"version":1,"adopted":{"anon:b1ed41db-3d33-4594-9a77-b8506c56996d":["ielts.testsession.v1"]}} |

**Every sitting on the device now:** {"ielts.testsession.v1::anon:b1ed41db-3d33-4594-9a77-b8506c56996d": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145304707, "endsAt": 1790146504707, "answers": {"q14": "iv", "q15": "vii"}}, "ielts.testsession.v1": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145304707, "endsAt": 1790146504707, "answers": {"q14": "iv", "q15": "vii"}}, "ielts.testsession.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790145333494, "endsAt": 1790146533494, "answers": {}, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c"}}

_screenshot **unfinished2-06-a-signed-in-sees-none-of-b.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Signed out, the device's own student finds the old sitting where it was left (q14 = "iv"), which also shows the blank above was not a rendering accident | PASS | the signed-out drill reads "iv" |

_screenshot **unfinished2-07-signed-out-device-keeps-old-sitting.png**: url=`http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Step 6 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8813/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4366/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED)

## Step 7 - A starts a mock exam, hands in Listening, and signs out in another tab (Codex R2-03)

The mock used to live only in the screen's memory: a sign-out, a refresh or a stray navigation lost the finished papers and the essays, and the stopped screen offered only a fresh mock. It is now written down under the student sitting it.

| Check | Result | Observed |
|---|---|---|
| A is signed in on a fresh browser | PASS | signed in as 8e0d970a-e212-4781-b9a3-cda6e2c31a4c |
| A's start screen offers no unfinished mock (A has none on this browser yet) | PASS | "You have an unfinished mock exam" on screen: 0 |
| The mock starts on Listening and is written down under A's own key, stamped with A | PASS | ielts.mock.active.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c = {"version": 1, "owner": "u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c", "mockId": "mock-2026-09-23-1", "startedAt": "2026-09-23T06:36:08.497Z", "stage": "listening", "listeningTestId": "listening-full-004", "readingTestId": "reading-full-004", "task1PromptId": "pte-wt-104-task1", "task2PromptId": "pte-wt-112-task2", "listening": null, "reading": null, "essay1": "", "essay2": "", "writingEndsAt": null, "speakingBand": null, "speakingCriteria": null, "speakingSkipped": false, "savedAt": 1790145368686} |
| A hands in Listening and the mock moves on to the beat before Reading | PASS | submitted = True, transition screen shown = True |
| A's written-down mock now has Listening done | PASS | stage = transition-reading, listening = {"raw": 0, "total": 40, "band": 0, "bandLabel": "below 2.5", "secondsUsed": 3} |

_screenshot **unfinished2-08-a-listening-done.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="Reading starts in 58 seconds"_
| A's open mock stops and says A signed out | PASS | "You signed out during this mock exam": 1 |
| The stopped screen says the sitting is kept for its student and picks up when they sign back in | PASS | found 1 |

_screenshot **unfinished2-09-a-mock-stopped-after-signout.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| A's written-down mock is still there after the sign-out, Listening still done | PASS | ielts.mock.active.v1::u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c = {"version":1,"owner":"u:8e0d970a-e212-4781-b9a3-cda6e2c31a4c","mockId":"mock-2026-09-23-1","startedAt":"2026-09-23T06:36:08.497Z","stage":"transition-reading","listeningTestId":"listening-full-004","readingTestId":"reading-full-004","task1PromptId":"pte-wt-104-task1","task2PromptId":"pte-wt-112-task2","listening":{"raw":0,"total":40,"band":0,"bandLabel":"below 2.5","secondsUsed":3},"reading":null,"essay1":"","essay2":"","writingEndsAt":null,"speakingBand":null,"speakingCriteria":null,"speakingSkipped":false,"savedAt":1790145375918} |

## Step 8 - B signs in on the same browser and starts a fresh mock

B must see nothing of A's sitting, get a mock of their own from the start, and A's written-down sitting must not change at all.

| Check | Result | Observed |
|---|---|---|
| B is signed in | PASS | signed in as 261f33c9-d0c5-48e0-bed8-62303034487e |
| A's still-open tab now says the mock belongs to another student, and shows none of it | PASS | "belongs to another student": 1, transition screen: 0 |
| B's start screen offers NO unfinished mock (A's is not B's to continue) | PASS | "You have an unfinished mock exam" on screen: 0 |

_screenshot **unfinished2-10-b-start-screen-no-offer.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| B's fresh mock starts at Listening with nothing done, under B's own key | PASS | ielts.mock.active.v1::u:261f33c9-d0c5-48e0-bed8-62303034487e = {"version": 1, "owner": "u:261f33c9-d0c5-48e0-bed8-62303034487e", "mockId": "mock-2026-09-23-1", "startedAt": "2026-09-23T06:36:54.841Z", "stage": "listening", "listeningTestId": "listening-full-001", "readingTestId": "reading-full-001", "task1PromptId": "pte-wt-123-task1", "task2PromptId": "pte-wt-108-task2", "listening": null, "reading": null, "essay1": "", "essay2": "", "writingEndsAt": null, "speakingBand": null, "speakingCriteria": null, "speakingSkipped": false, "savedAt": 1790145415004} |
| B's fresh mock is a different sitting from A's | PASS | B started 2026-09-23T06:36:54.841Z, A started 2026-09-23T06:36:08.497Z |
| B's Listening paper is B's own, with no answers carried over | PASS | B's sitting = {"version": 1, "testId": "listening-full-001", "startedAt": 1790145414879, "endsAt": 1790147814879, "answers": {}, "owner": "u:261f33c9-d0c5-48e0-bed8-62303034487e"} |
| A's written-down mock was not touched by B's fresh one | PASS | compared byte for byte with A's copy right after A signed out |

_screenshot **unfinished2-11-b-fresh-mock-listening.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="None"_

**Step 8 (B's tab) failed/4xx/5xx requests:** FAILED http://127.0.0.1:8813/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4366/ielts-website/audio/listening/test-001.mp3 (net::ERR_ABORTED)

## Step 9 - A signs back in and carries on with Listening still done

Two ways back: the tab A left open, which should simply carry on, and a newly opened mock page, which should offer A's own sitting back.

| Check | Result | Observed |
|---|---|---|
| A is signed back in | PASS | signed in as 8e0d970a-e212-4781-b9a3-cda6e2c31a4c |
| A's still-open tab carries straight on from where it stopped (the beat before Reading) | PASS | transition screen: 1, stopped screen: 0 |

_screenshot **unfinished2-12-a-back-in-the-open-tab.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="Reading starts in 56 seconds"_
| A newly opened mock page offers A's OWN unfinished mock back | PASS | "You have an unfinished mock exam" on screen: 1 |
| The offer says Listening is already finished and where the sitting picks up | PASS | "Finished so far: Listening": 1, "It picks up at Reading": 1 |

_screenshot **unfinished2-13-a-offered-own-mock-back.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| A carries on in the SAME sitting with Listening still done | PASS | stage = transition-reading, listening = {"raw": 0, "total": 40, "band": 0, "bandLabel": "below 2.5", "secondsUsed": 3}, mockId = mock-2026-09-23-1, startedAt = 2026-09-23T06:36:08.497Z |

_screenshot **unfinished2-14-a-resumed-own-mock.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="Reading starts in 58 seconds"_

## Step 10 - A reload during Writing keeps the draft and the Writing deadline

A carries on through Reading into Writing, types a draft, and reloads the page. The Writing hour is stored as the moment it runs out, so picking the sitting up again must neither restart the clock nor lose the draft.

| Check | Result | Observed |
|---|---|---|
| Writing is running and its deadline, the finished papers and A's draft are written down | PASS | stage = writing, writingEndsAt = 1790149056921, essay1 = "SYNTHETIC Task 1 draft by student A, typed during the mock." |
| After the reload the start screen offers the sitting back, with the Writing time that is left | PASS | offer: 1, "left on the Writing clock": 1 |

_screenshot **unfinished2-15-a-reload-offer-with-writing-time.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="A full IELTS sitting, back to back"_
| A's draft is back exactly as typed | PASS | textarea reads "SYNTHETIC Task 1 draft by student A, typed during the mock." |
| The stored Writing deadline was not restarted or moved | PASS | before the reload 1790149056921, after 1790149056921 |
| The clock on screen counts down to that same deadline, not a fresh 60:00 | PASS | clock shows "⏱ 59:48" (3588 s), the stored deadline leaves 3587 s |

_screenshot **unfinished2-16-a-writing-resumed-same-deadline.png**: url=`http://127.0.0.1:4366/ielts-website/tests/mock`, landmark heading="None"_

**Steps 7, 9 and 10 (A's tabs) failed/4xx/5xx requests:** FAILED http://127.0.0.1:4366/ielts-website/audio/listening/test-004.mp3 (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8813) and the site at http://127.0.0.1:4366/ielts-website. Nothing here is evidence about a real Supabase project.
