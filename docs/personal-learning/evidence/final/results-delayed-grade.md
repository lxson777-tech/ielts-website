# A grade that arrives after the account changed: whose it is

Run on 2026-09-23 against a DEV server at http://localhost:4368/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8815. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of the fix for finding R2-02 of the second Codex inspection: a grade that
came back after the owner changed was written under whoever was signed in by then. The
deterministic half is `tests/delayed-grade-owner.test.ts`.

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
| Student A signed up on the local stand-in | PASS | user id f883bc36-7993-4da3-8312-2475fe0f4b3e |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **delayed-01-essay-grading-held-for-a.png**: url=`http://localhost:4368/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id 929aa86e-bcc4-4603-9eeb-96c4d7633db0, menu identity 'synthetic-student-b-f23-112303@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **delayed-02-essay-b-signed-in-while-grading.png**: url=`http://localhost:4368/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **delayed-03-essay-grade-arrived-b-sees-notice.png**: url=`http://localhost:4368/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:f883bc36-7993-4da3-8312-2475fe0f4b3e'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as f883bc36-7993-4da3-8312-2475fe0f4b3e; history lists the prompt: True |

_screenshot **delayed-04-essay-a-back-finds-it.png**: url=`http://localhost:4368/ielts-website/trainers/writing`, landmark heading="None"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8815/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8815/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 4a6e3ea5-8bb7-47eb-a9b6-f05dba153fb5 |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **delayed-05-speaking-grading-held-for-c.png**: url=`http://localhost:4368/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id 83dfde7c-8049-458b-9aa5-391cfab4aff1, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **delayed-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://localhost:4368/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 4a6e3ea5-8bb7-47eb-a9b6-f05dba153fb5; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **delayed-07-speaking-c-back-account.png**: url=`http://localhost:4368/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8815/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8815/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Totals:** 18 PASS, 0 FAIL.

**About the aborted sign-out requests above.** Each sign-out's `/auth/v1/logout` call to the stand-in is
reported as aborted by the browser. The same line appears in the earlier direct-entry, account-journey and
unfinished-test runs against the same stand-in, and every sign-out in this run did take effect (the
avatar menu showed the next student signed in, and nothing of the previous student was written under
them). It is not something this change touched.

**How this run was served.** The dev server used its own dependency cache and did not watch `docs/`,
`tests/` or `.codex/` (a config kept outside the project, in the session scratchpad). On the first attempt
it did watch them, and evidence files written mid-run by this script and by another builder working in
the same checkout each reloaded the page, which abandoned the held grading request. The "same page (no
reload)" checks above exist so that can never pass silently.
