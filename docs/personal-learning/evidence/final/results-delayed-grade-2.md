# When the account changes on an open page: whose grade, and whose essay

Run on 2026-09-23 against a DEV server at http://localhost:4372/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8819. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of two fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. The deterministic half of
both is `tests/delayed-grade-owner.test.ts`.

**No grader and no model was called.** The essay and speaking grader addresses point at paths the
local stand-in does not serve, and this script intercepts those requests in the browser, holds
them, and answers them with a reply whose every text field reads "SYNTHETIC intercepted reply from f23: no model was called.". The
browser's own client still labels a grade from its remote grader "AI examiner"; in this run that
label sits on a synthetic reply, for synthetic students, on a local stand-in.

Every student, email, password, essay and band here is SYNTHETIC, invented for this run.

## 1. Writing: A's essay is graded after A signed out and B signed in on the same page

A submits an essay on the writing trainer. The grading request is held in the browser. A signs out and B signs up from the avatar menu of the SAME page, while the grading progress is still on screen. Then the held request is answered with a synthetic reply.

| Check | Result | Observed |
|---|---|---|
| Student A signed up on the local stand-in | PASS | user id b4dcdd55-334a-41f8-931b-3ec72bfc58dc |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **delayed2-01-essay-grading-held-for-a.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id 155352bf-9666-4b20-ad6d-7a4255748497, menu identity 'synthetic-student-b-f23-124022@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **delayed2-02-essay-b-signed-in-while-grading.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **delayed2-03-essay-grade-arrived-b-sees-notice.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:b4dcdd55-334a-41f8-931b-3ec72bfc58dc'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as b4dcdd55-334a-41f8-931b-3ec72bfc58dc; history lists the prompt: True |

_screenshot **delayed2-04-essay-a-back-finds-it.png**: url=`http://localhost:4372/ielts-website/trainers/writing`, landmark heading="None"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 35699d88-e29c-4bf3-869d-d3215752b2a4 |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **delayed2-05-speaking-grading-held-for-c.png**: url=`http://localhost:4372/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id 365dedfc-3317-4310-903b-b58833b91865, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **delayed2-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://localhost:4372/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 35699d88-e29c-4bf3-869d-d3215752b2a4; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **delayed2-07-speaking-c-back-account.png**: url=`http://localhost:4372/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 3. The essay editor belongs to the student who started it (Codex R2B-01)

Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same browser, E signs out and student F signs up. The first tab is never reloaded by the script. F must get an empty editor and must not be able to send E's text; E's text must stay in E's own draft; E, signing back in, must find it and be able to submit it.

| Check | Result | Observed |
|---|---|---|
| Student E signed up on the local stand-in | PASS | user id f6e9a7a7-8763-4df8-beb4-be35c9094172 |
| E's essay is on screen and kept as E's own draft | PASS | ielts.writing.draft.v1::u:f6e9a7a7-8763-4df8-beb4-be35c9094172::pte-wt-132-task2 carries E's essay: True |

_screenshot **delayed2-08-editor-e-typing.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs out in the second tab: the first tab's editor empties itself and says the account changed | PASS | E's essay still in the text box: False; note shown: True; same page (no reload): True |
| F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded | PASS | user id 1d2e69b4-0277-418e-b673-e38d12e4675d; text box empty: True; note shown: True; E's essay anywhere on the page: False; same page: True |
| F cannot submit E's text: the text box is empty and 'Check my essay' is disabled | PASS | text box empty: True; button disabled: True |

_screenshot **delayed2-09-editor-f-empty-after-switch.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request left either tab after the switch, even with the button pressed by force | PASS | grading requests seen: 0 |
| F opening the same task in the second tab also gets an empty editor | PASS | text box empty: True |
| E's essay is still in E's own draft, and in no other key on this device | PASS | keys carrying E's essay: ['ielts.writing.draft.v1::u:f6e9a7a7-8763-4df8-beb4-be35c9094172::pte-wt-132-task2'] |
| F types an essay of their own in the first tab, and it is kept as F's own draft | PASS | ielts.writing.draft.v1::u:1d2e69b4-0277-418e-b673-e38d12e4675d::pte-wt-132-task2 carries F's essay: True, E's: False |
| E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded | PASS | signed in as f6e9a7a7-8763-4df8-beb4-be35c9094172; E's essay in the text box: True; F's: False; same page: True |
| F's essay stays in F's own draft, untouched by E's return | PASS | keys carrying F's essay: ['ielts.writing.draft.v1::u:1d2e69b4-0277-418e-b673-e38d12e4675d::pte-wt-132-task2'] |

_screenshot **delayed2-10-editor-e-back-finds-draft.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader) | PASS | held: True; carries E's essay: True; carries F's: False |
| E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared | PASS | report on screen: True; E's rows: 1; F's rows: 0; E's draft still there: False |

_screenshot **delayed2-11-editor-e-report.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_

## 4. A switch inside the 600 ms autosave wait (Codex R2B-01)

E types in the first tab and, within the 600 ms the autosave waits for typing to pause, signs out from the second tab (its account menu already open, so the click is immediate). The page itself records when the last keystroke landed and when the editor was handed over, so the timing below is measured, not assumed. Before the fix, the autosave fired after the switch and saved E's latest text under whoever had just taken over.

| Check | Result | Observed |
|---|---|---|
| The switch landed inside the 600 ms autosave wait (measured in the page) | PASS | last keystroke to hand-over: 41 ms, on attempt 2 |
| E's latest text, typed just before the switch, is saved under E | PASS | ielts.writing.draft.v1::u:f6e9a7a7-8763-4df8-beb4-be35c9094172::pte-wt-132-task2 carries the latest text: True |
| Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out | PASS | keys carrying E's text: ['ielts.writing.draft.v1::u:f6e9a7a7-8763-4df8-beb4-be35c9094172::pte-wt-132-task2']; draft keys for this task: ['ielts.writing.draft.v1::u:1d2e69b4-0277-418e-b673-e38d12e4675d::pte-wt-132-task2', 'ielts.writing.draft.v1::u:f6e9a7a7-8763-4df8-beb4-be35c9094172::pte-wt-132-task2'] |
| The first tab's editor emptied at the switch and says the account changed | PASS | E's text still in the text box: False; note shown: True |

_screenshot **delayed2-12-debounce-switched-mid-wait.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs back in and the first tab's editor shows the latest text E typed before the switch | PASS | latest text in the text box: True |

_screenshot **delayed2-13-debounce-e-back-latest-text.png**: url=`http://localhost:4372/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request went out during either switch | PASS | grading requests seen in the first tab: 1 (the one E sent in section 3) |

**Editor, first tab:** no console errors, no failed/4xx/5xx requests.

**Editor, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8819/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Totals:** 37 PASS, 0 FAIL.
