# Direct entry to an exam page: who the work belongs to

Run on 2026-09-23 against a DEV server at http://localhost:4356/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8803. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the fix round for finding 3 of the 23 September 2026 review
(`docs/audits/claude-personal-learning-review-2026-09-23.md`), grown out of that review's own
reproduction, `claude-review-2026-09-23/direct-exam-owner.py`, into a full journey: a signed-in
student opening a drill by its own address, a refresh in the middle of an unfinished one, and
the same journey signed out.

Every student, email, password and answer here is SYNTHETIC, invented for this run. No real
account, no real key, no paid model call, no deployment.

**This run is against the FREE LOCAL STAND-IN** (`node tools/mr-ez-dev-server.mjs`, in memory, this machine only), site under test at http://localhost:4356/ielts-website, stand-in REST surface at http://127.0.0.1:8803. It is NOT a real Supabase project, and nothing below is claimed as proof against one. Every student, email and answer is SYNTHETIC.

It exercises finding 3 of the 23 September 2026 review: entering a full-screen exam page directly, by its own address, rather than through the app's own links.

The stand-in was already holding 2 row(s) when this run started (it keeps its store in memory for as long as it is up). Those rows are ignored by id below, so every count here is about THIS run.

## 1. A signed-in student opens a drill by its own address

Sign up on the dashboard, then a plain hard navigation straight to the drill, the way a saved link or a pasted link arrives. No app navigation in between.

| Check | Result | Observed |
|---|---|---|
| Student C has a real account on the stand-in | PASS | user id from the stand-in's own sign-up response: f4fa6566-0bd4-4292-8e99-55f691b3df00 |
| The browser is still holding student C's session on the drill page | PASS | session in storage: [{"key": "sb-127-auth-token", "user": "f4fa6566-0bd4-4292-8e99-55f691b3df00"}] |
| The data owner on this page is student C, not this device's anonymous owner | PASS | record keys present before the drill was sat: ielts.learning.record.v1::u:f4fa6566-0bd4-4292-8e99-55f691b3df00 |

_screenshot **direct-01-drill-entered-directly-signed-in.png**: url=`http://localhost:4356/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="Passage 2 Drill: Can the planet’s coral reefs be saved?"_
| A question was answered on the drill | PASS | 1 input(s) filled |
| The drill was submitted | PASS | the submit button reports the paper is in |

_screenshot **direct-02-drill-submitted-signed-in.png**: url=`http://localhost:4356/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| The attempt is in student C's own record | PASS | C's record key: ielts.learning.record.v1::u:f4fa6566-0bd4-4292-8e99-55f691b3df00; events: [{"activity": "drill:reading-full-006-drill-p2", "answer": "i"}, {"activity": "drill:reading-full-006-drill-p2", "answer": "i"}, {"activity": "drill:reading-full-006-drill-p2", "answer": "i"}] |
| The attempt is NOT in this device's shared anonymous record (the defect finding 3 reproduced) | PASS | anonymous record key: none on this device; events: [] |
| The attempt reached the stand-in under student C | PASS | 1 row(s) for this drill under C, out of 1 row(s) for C in total: ["drill:reading-full-006-drill-p2"] |
| Nothing about this drill reached the stand-in under anybody else | PASS | 0 row(s) in the stand-in belong to other ids: [] |

## 2. A refresh in the middle of an unfinished drill

The same student, a second drill, one answer given, then a real page load of the same address. The sitting and its timer have to belong to the same student afterwards.

| Check | Result | Observed |
|---|---|---|
| An answer was given in the second drill, and the clock is running | PASS | answer="A", timer reads "⏱ 19:57" |

_screenshot **direct-03-mid-drill-before-refresh.png**: url=`http://localhost:4356/ielts-website/trainers/reading/reading-full-006-drill-p3`, landmark heading="None"_

_screenshot **direct-04-mid-drill-after-refresh.png**: url=`http://localhost:4356/ielts-website/trainers/reading/reading-full-006-drill-p3`, landmark heading="None"_
| After the refresh the page still belongs to student C | PASS | session: [{"key": "sb-127-auth-token", "user": "f4fa6566-0bd4-4292-8e99-55f691b3df00"}]; record keys: ielts.learning.record.v1::u:f4fa6566-0bd4-4292-8e99-55f691b3df00 |
| The answer given before the refresh is still there | PASS | before="A", after="A" |
| The timer carried on rather than starting again | PASS | before the refresh "⏱ 19:57" (1197s left), after it "⏱ 19:49" (1189s left) |
| The unfinished sitting is stored on this device | PASS | session keys: ["ielts.testsession.v1::u:f4fa6566-0bd4-4292-8e99-55f691b3df00"] |

**Signed in, direct entry and refresh failed/4xx/5xx requests:** FAILED http://localhost:4356/src/lib/learning/lesson-blocks.ts (net::ERR_ABORTED); FAILED http://localhost:4356/src/lib/learning/contracts/policy.ts (net::ERR_ABORTED); FAILED http://localhost:4356/src/data/focused-exercises.ts (net::ERR_ABORTED); FAILED http://localhost:4356/src/lib/learning/contracts/ai.ts (net::ERR_ABORTED); FAILED http://localhost:4356/src/lib/learning/ru.ts (net::ERR_ABORTED)

## 3. The same direct entry, signed out

A fresh browser with no account at all. Working signed out is a supported way to use this site, and it must still be recorded, under this device and under no account.

| Check | Result | Observed |
|---|---|---|
| The signed-out drill was answered and submitted | PASS | 1 input(s) filled, submitted=True |

_screenshot **direct-05-drill-submitted-signed-out.png**: url=`http://localhost:4356/ielts-website/trainers/reading/reading-full-006-drill-p2`, landmark heading="None"_
| Signed-out work is recorded under this device's own anonymous owner | PASS | anonymous record key: ielts.learning.record.v1::anon:6457f8b5-5967-4c39-971d-05572de6a109; events: [{"activity": "drill:reading-full-006-drill-p2", "answer": "i"}, {"activity": "trainer:reading", "answer": null}] |
| Signed-out work was not filed under any account | PASS | account-owned record keys on this device: []; sessions in storage: [] |
| The signed-out attempt did not reach the account store | PASS | 1 row(s) in the stand-in in total; ids present: ["f4fa6566-0bd4-4292-8e99-55f691b3df00"] |

**Signed out, direct entry:** no console errors, no failed/4xx/5xx requests.

## 4. The avatar menu after the refactor

The workspace menu and the older account menu no longer start and stop the cloud sync themselves; they read the app-wide lifecycle. This is the check that they still show the right thing and that signing out still hands the browser back to this device's anonymous owner.

| Check | Result | Observed |
|---|---|---|
| Signed out, the menu offers Sign in | PASS | {"shows_sign_in": true, "shows_sign_out": false, "identity": null} |
| Signed in through the menu, it names the student and offers Sign out | PASS | {"shows_sign_in": false, "shows_sign_out": true, "identity": "synthetic-student-c-f21@example.test"}; user id from the stand-in: f4fa6566-0bd4-4292-8e99-55f691b3df00 |
| Signing in through the menu moves this browser onto that student | PASS | record keys: ielts.learning.record.v1::u:f4fa6566-0bd4-4292-8e99-55f691b3df00 |

_screenshot **direct-06-menu-signed-in.png**: url=`http://localhost:4356/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_
| Signing out through the menu offers Sign in again and clears the session | PASS | {"shows_sign_in": true, "shows_sign_out": false, "identity": null}; sessions in storage: [] |

_screenshot **direct-07-menu-signed-out.png**: url=`http://localhost:4356/ielts-website/dashboard`, landmark heading="Good morning.
A little practice. A step closer."_

**The avatar menu failed/4xx/5xx requests:** FAILED http://127.0.0.1:8803/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Run complete.** Every check above ran against the local stand-in (http://127.0.0.1:8803) and the site at http://localhost:4356/ielts-website, both started for this run and stopped afterwards. Nothing here is evidence about a real Supabase project, and no paid model call was made.
