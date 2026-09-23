# Personal learning build: final verification evidence

Run against the FROZEN PRODUCTION SNAPSHOT at http://127.0.0.1:4358/ielts-website on 2026-09-23.

**This is a RERUN** (results-unfinished-test.md, screenshots prefixed "unfinished-") after a fix round on top of the run recorded in results.md. results.md is left untouched.

Nothing on that server can hot reload, so no result below can be explained away as a dev-server artifact.

Every scenario opens its own fresh browser context with empty localStorage and seeds its own clearly labelled SYNTHETIC data. Seeds are written in OLD-store form (`ielts.progress.v1` / `ielts.studyplan.v1`) so the site's own migration runs, which is the honest returning-student path; the new owner-namespaced stores are seeded directly only where a scenario is specifically about them. **Nothing here is a real student.**

AI is NOT configured on this snapshot (no Supabase, no Mr EZ Worker, no grader), so every AI-dependent surface is expected to show its honest deterministic fallback. A simulated reply presented as a live one would be recorded as a defect.

**Correcting the boilerplate above, which belongs to the f01-f17 suite and is written by `final_helpers.reset_results()` (another builder's file, not edited here).** Two of its sentences are wrong for THIS run and are superseded by this note: this is NOT the frozen production snapshot (it is a dev server started for this run on port 4358), and it is NOT a rerun on top of `results.md`. Supabase IS configured here, pointed at the free local stand-in, which is the whole point of the scenario. No AI is called at any step.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs` on port 8805, in memory, this machine only), site under test at http://127.0.0.1:4358/ielts-website, stand-in REST surface at http://127.0.0.1:8805. It is NOT a real Supabase project and nothing below is claimed as proof about one. Every student, email and answer is SYNTHETIC.

It re-runs the journey of finding 1 in `docs/audits/claude-personal-learning-review-2026-09-23.md` (original reproduction: `docs/audits/claude-review-2026-09-23/independent-browser.py`) against the fixed code, and adds A's resume and the mounted-player owner change.

## Step 1 - Student A starts the drill and walks away

A signs up, opens `reading-full-006-drill-p2` from the real Reading hub link, answers question 14 and leaves without submitting.

| Check | Result | Observed |
|---|---|---|
| Student A is signed in with a real account id | PASS | A = 80f9d14c-27fe-4e5f-9cb7-767aa44b64ed |
| The drill opens from its real hub link | PASS | clicked a[href="/ielts-website/trainers/reading/reading-full-006-drill-p2"] |
| The drill is on screen with its answer controls | PASS | 6 select(s) |

**A's saved sitting:** {"ielts.testsession.v1::u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790139958206, "endsAt": 1790141158206, "answers": {"q14": "i"}, "owner": "u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed"}}
| A's chosen answer for q14 was saved | PASS | saved answer = "i", control on screen showed "i" |
| A's unfinished sitting is saved under A's own key, not the old device-wide one | PASS | keys = ['ielts.testsession.v1::u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed'] |
| The sitting carries the owner it was started under | PASS | owner = u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed, answer q14 = "i" |

_screenshot **unfinished-01-a-answers-q14.png**: url=`http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 2 - B signs up on the same browser and opens the same drill

The exact path the review reproduced the defect on: A signs out, B signs up, B enters the drill from the same hub link.

| Check | Result | Observed |
|---|---|---|
| Student B is a different account | PASS | B = 676ba327-17f1-4c76-b245-f47201312614 |
| B sees NO answer selected (A's answer is not restored) | PASS | B's first select reads "" (A had chosen "i") |

_screenshot **unfinished-02-b-sees-a-blank-drill.png**: url=`http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

## Step 3 - B submits the drill

B submits without answering anything, so ANY non-empty first answer in B's record or in the rows the account received could only have come from A.

| Check | Result | Observed |
|---|---|---|

**B's learner record, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| B's learner record contains none of A's answers | PASS | 13 item(s) recorded, 0 of them non-blank: [] |
| Nothing anywhere in B's whole browser record carries A's answer | PASS | searched B's whole record for '"firstAnswer":"i"': not present |

_screenshot **unfinished-03-b-submitted.png**: url=`http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**The rows the stand-in holds for B, every first answer:** [{"itemId": "reading-full-006-drill-p2:q14", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q15", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q16", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q17", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q18", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q19", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q20", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q21", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q22", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q23", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q24", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q25", "firstAnswer": ""}, {"itemId": "reading-full-006-drill-p2:q26", "firstAnswer": ""}]
| The stand-in's rows for B contain only B's own (blank) answers, nothing of A's | PASS | 13 item(s) in B's rows, 0 non-blank: [] |
| Nothing in everything the stand-in holds for B carries A's answer | PASS | searched every row the stand-in holds for B for '"firstAnswer":"i"': not present |
| A's own account received nothing from B's submission either | PASS | 0 event(s) on A so far |

## Step 4 - A signs back in and resumes the sitting

Nothing was deleted: A's answers are still under A's own key, and the drill restores them.

| Check | Result | Observed |
|---|---|---|
| A is signed back in, same account id | PASS | back as 80f9d14c-27fe-4e5f-9cb7-767aa44b64ed |

**Every sitting on the device now:** {"ielts.testsession.v1::u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790139958206, "endsAt": 1790141158206, "answers": {"q14": "i"}, "owner": "u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed"}}
| A's unfinished sitting survived B's entire visit | PASS | {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790139958206, "endsAt": 1790141158206, "answers": {"q14": "i"}, "owner": "u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed"} |
| A's own answer is restored when A resumes | PASS | A resumed to "i" (A had chosen "i") |
| A resumed straight into the running paper, not the instructions gate | PASS | 1 timer(s) on screen |

_screenshot **unfinished-04-a-resumes-own-answer.png**: url=`http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_

**Steps 1 to 4 failed/4xx/5xx requests:** FAILED http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2 (net::ERR_ABORTED); FAILED http://127.0.0.1:8805/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/components/learning/ScopeNote.tsx (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/data/tests/listening-full-022.ts (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/data/tests/listening-full-018.ts (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/components/learning/AnonymousWorkClaim.tsx (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/components/tutor/NextStepProposal.tsx (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/data/generated/learning-index.json?import (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/lib/tests/question-types.ts (net::ERR_ABORTED); FAILED http://127.0.0.1:4358/src/components/learning/today/intakeDeferral.ts (net::ERR_ABORTED)

## Step 5 - A is mid-drill and signs out in a SECOND TAB

The case the review asked for explicitly: the player is already on screen when the account changes. It must stop and must not submit.

| Check | Result | Observed |
|---|---|---|
| The mounted player stopped and says the sitting belongs to the signed-out account | PASS | looked for "You signed out during this test" on the open drill; found 1 |
| The stopped player offers a way to start fresh under the account using the browser now | PASS | "Start this test fresh" buttons: 1 |
| No Submit control is reachable on the stopped player | PASS | Submit buttons on screen: 0 |

_screenshot **unfinished-05-player-stopped-after-signout.png**: url=`http://127.0.0.1:4358/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="You signed out during this test"_

**Every sitting on the device after the sign-out:** {"ielts.testsession.v1::u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed": {"version": 1, "testId": "reading-full-006-drill-p2", "startedAt": 1790139958206, "endsAt": 1790141158206, "answers": {"q14": "i"}, "owner": "u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed"}}
| A's answers stayed under A's own key and were not copied to the signed-out device owner | PASS | keys = ['ielts.testsession.v1::u:80f9d14c-27fe-4e5f-9cb7-767aa44b64ed'] |
| The stopped sitting was never submitted for anybody | PASS | 0 submitted drill event(s) on A's rows |

**Step 5 failed/4xx/5xx requests:** FAILED http://127.0.0.1:8805/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8805) and the site at http://127.0.0.1:4358/ielts-website. Nothing here is evidence about a real Supabase project.
