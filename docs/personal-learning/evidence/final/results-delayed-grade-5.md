# When the account changes on an open page: whose grade, and whose essay

Run on 2026-09-23 against a DEV server at http://localhost:4384/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8831. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of six fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. Section 5: finding R2C-01
of the third Codex inspection, a late grade deleted the draft its student had revised since
submitting. Section 6: finding R2C-04 of the same inspection, a speaking attempt went on after the
page changed hands, so a second student could answer the first student's remaining questions.
Section 7: finding R2D-01 of the Codex inspection of 1701b97, the live examiner's START asked
nothing after its waits, so an account change while the microphone permission was up left the
microphone, a recording and a paid voice session running behind the mock's stopped screen.
Section 8: the last window of that start, inside the connection setup, where the connection
prepared itself for up to ten seconds after the sign-in token was read and then sent the request
that creates the paid voice session without asking again. The deterministic half of sections 1 to
7 is `tests/delayed-grade-owner.test.ts`; of section 8, `tests/live-start-cancel.test.ts`.

**Two starts of the dev server.** Sections 1 to 6 drive the recorded speaking trainer on
`/trainers/speaking`, which the site shows only while no live examiner address is configured.
Sections 7 and 8 need one, so they ran against a second start of the same dev server with
`PUBLIC_LIVE_EXAMINER_URL` pointed at a path on the stand-in that the stand-in does not serve, and was
appended below.

**What this run does not cover, and where it is covered instead.** No live interview runs here: the
examiner needs a paid voice session, and the stand-in has none. Sections 7 and 8 start the examiner
as far as it can go without one (its settings and every voice session request are intercepted in the
browser and answered by the run itself) and race the account change against the microphone request,
the connection setup and the voice session request. What happens once a voice session is up (the suspension mid-interview, the
grading guard after the session is shut down, a grade already requested being kept for its student)
is proven only by `tests/delayed-grade-owner.test.ts`, sections 7 and 8: the same attempt and start
guard the examiner uses, driven with promises resolved by hand, and a source scan of how the examiner
uses them.

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
| Student A signed up on the local stand-in | PASS | user id 7cf3624c-f592-4961-b68b-9eece67853e0 |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **delayed5-01-essay-grading-held-for-a.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id b035fb86-0004-4cff-bf15-bae9e3cd0872, menu identity 'synthetic-student-b-f23-162254@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **delayed5-02-essay-b-signed-in-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **delayed5-03-essay-grade-arrived-b-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:7cf3624c-f592-4961-b68b-9eece67853e0'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as 7cf3624c-f592-4961-b68b-9eece67853e0; history lists the prompt: True |

_screenshot **delayed5-04-essay-a-back-finds-it.png**: url=`http://localhost:4384/ielts-website/trainers/writing`, landmark heading="None"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 4e6fae80-3e79-4268-902a-0b7d5b14b58e |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **delayed5-05-speaking-grading-held-for-c.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id 2155f933-4536-4982-a98b-eee48e911ed2, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **delayed5-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 4e6fae80-3e79-4268-902a-0b7d5b14b58e; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **delayed5-07-speaking-c-back-account.png**: url=`http://localhost:4384/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 3. The essay editor belongs to the student who started it (Codex R2B-01)

Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same browser, E signs out and student F signs up. The first tab is never reloaded by the script. F must get an empty editor and must not be able to send E's text; E's text must stay in E's own draft; E, signing back in, must find it and be able to submit it.

| Check | Result | Observed |
|---|---|---|
| Student E signed up on the local stand-in | PASS | user id f95a83b0-9048-4cd0-aa15-8cd3f897c355 |
| E's essay is on screen and kept as E's own draft | PASS | ielts.writing.draft.v1::u:f95a83b0-9048-4cd0-aa15-8cd3f897c355::pte-wt-132-task2 carries E's essay: True |

_screenshot **delayed5-08-editor-e-typing.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs out in the second tab: the first tab's editor empties itself and says the account changed | PASS | E's essay still in the text box: False; note shown: True; same page (no reload): True |
| F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded | PASS | user id 1bace158-b923-46c9-a426-47aaa16684e8; text box empty: True; note shown: True; E's essay anywhere on the page: False; same page: True |
| F cannot submit E's text: the text box is empty and 'Check my essay' is disabled | PASS | text box empty: True; button disabled: True |

_screenshot **delayed5-09-editor-f-empty-after-switch.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request left either tab after the switch, even with the button pressed by force | PASS | grading requests seen: 0 |
| F opening the same task in the second tab also gets an empty editor | PASS | text box empty: True |
| E's essay is still in E's own draft, and in no other key on this device | PASS | keys carrying E's essay: ['ielts.writing.draft.v1::u:f95a83b0-9048-4cd0-aa15-8cd3f897c355::pte-wt-132-task2'] |
| F types an essay of their own in the first tab, and it is kept as F's own draft | PASS | ielts.writing.draft.v1::u:1bace158-b923-46c9-a426-47aaa16684e8::pte-wt-132-task2 carries F's essay: True, E's: False |
| E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded | PASS | signed in as f95a83b0-9048-4cd0-aa15-8cd3f897c355; E's essay in the text box: True; F's: False; same page: True |
| F's essay stays in F's own draft, untouched by E's return | PASS | keys carrying F's essay: ['ielts.writing.draft.v1::u:1bace158-b923-46c9-a426-47aaa16684e8::pte-wt-132-task2'] |

_screenshot **delayed5-10-editor-e-back-finds-draft.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader) | PASS | held: True; carries E's essay: True; carries F's: False |
| E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared | PASS | report on screen: True; E's rows: 1; F's rows: 0; E's draft still there: False |

_screenshot **delayed5-11-editor-e-report.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_

## 4. A switch inside the 600 ms autosave wait (Codex R2B-01)

E types in the first tab and, within the 600 ms the autosave waits for typing to pause, signs out from the second tab (its account menu already open, so the click is immediate). The page itself records when the last keystroke landed and when the editor was handed over, so the timing below is measured, not assumed. Before the fix, the autosave fired after the switch and saved E's latest text under whoever had just taken over.

| Check | Result | Observed |
|---|---|---|
| The switch landed inside the 600 ms autosave wait (measured in the page) | PASS | last keystroke to hand-over: 40 ms, on attempt 1 |
| E's latest text, typed just before the switch, is saved under E | PASS | ielts.writing.draft.v1::u:f95a83b0-9048-4cd0-aa15-8cd3f897c355::pte-wt-132-task2 carries the latest text: True |
| Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out | PASS | keys carrying E's text: ['ielts.writing.draft.v1::u:f95a83b0-9048-4cd0-aa15-8cd3f897c355::pte-wt-132-task2']; draft keys for this task: ['ielts.writing.draft.v1::u:1bace158-b923-46c9-a426-47aaa16684e8::pte-wt-132-task2', 'ielts.writing.draft.v1::u:f95a83b0-9048-4cd0-aa15-8cd3f897c355::pte-wt-132-task2'] |
| The first tab's editor emptied at the switch and says the account changed | PASS | E's text still in the text box: False; note shown: True |

_screenshot **delayed5-12-debounce-switched-mid-wait.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs back in and the first tab's editor shows the latest text E typed before the switch | PASS | latest text in the text box: True |

_screenshot **delayed5-13-debounce-e-back-latest-text.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request went out during either switch | PASS | grading requests seen in the first tab: 1 (the one E sent in section 3) |

**Editor, first tab:** no console errors, no failed/4xx/5xx requests.

**Editor, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 5. A late grade leaves a later revision alone (Codex R2C-01)

Student G submits an essay; the grading request is held. G signs out and back in from the avatar menu of the SAME page, gets the submitted essay back in the editor, and revises it; the revision autosaves. Only then is the held request answered. Before the fix, that older grade deleted G's draft, so a reload lost the revision.

| Check | Result | Observed |
|---|---|---|
| Student G signed up on the local stand-in | PASS | user id 3ec2d504-fd62-4478-b951-5720a237ec21 |
| G's grading request went out and is being held (nothing reached any grader) | PASS | held=1; request carries G's essay: True |

_screenshot **delayed5-14-revision-g-grading-held.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G signs out and back in on the same page: the submitted essay is back in G's editor, grade still held | PASS | signed in as 3ec2d504-fd62-4478-b951-5720a237ec21; essay in the text box: True; request still held: True; same page (no reload): True |
| G revises the essay and the revision autosaves as G's draft | PASS | ielts.writing.draft.v1::u:3ec2d504-fd62-4478-b951-5720a237ec21::pte-wt-132-task2 carries the revision: True |

_screenshot **delayed5-15-revision-g-revised-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The earlier grade arrives: it is kept in G's history (the original essay), and not painted over the editor | PASS | G's writing rows: 1; row is the original essay: True; G's record: ['write:pte-wt-132-task2']; report text on screen: False; same page: True |
| G's draft still holds the revision after the earlier grade was kept (before the fix it was deleted here) | PASS | ielts.writing.draft.v1::u:3ec2d504-fd62-4478-b951-5720a237ec21::pte-wt-132-task2 carries the revision: True; revision in the text box: True |

_screenshot **delayed5-16-revision-grade-arrived-revision-kept.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| After a reload the editor opens G's revision | PASS | revision in the text box: True; the page really was reloaded: True |
| G's writing history on the page lists the graded attempt | PASS | history lists the prompt: True |

_screenshot **delayed5-17-revision-after-reload.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G's account on the stand-in received the original essay's grade, and never the unsubmitted revision | PASS | G's events: ['write:pte-wt-132-task2']; user_state carries the essay: True, the revision: False |
| Exactly one grading request left the page | PASS | grading requests seen: 1 |

**Revision failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 6. A speaking attempt stops the moment its student leaves (Codex R2C-04)

Student H opens a Part 1 topic on the speaking trainer (the recorded checker) by its exact link, answers question 1 through the browser's FAKE microphone (a test tone, no real voice), and is recording question 2 when H signs out and student I signs up in a SECOND tab of the same browser. Before the fix the first tab carried on: I could answer the remaining questions, and the whole recording was then graded as H's.

| Check | Result | Observed |
|---|---|---|
| Student H signed up on the local stand-in | PASS | user id e82a011f-7e3e-45fe-ace7-0d488034d832 |
| H answered question 1 and is recording question 2 through the fake microphone | PASS | question 2 on screen: True; recorders started: 2, recording now: 1; live microphone tracks: 1 |

_screenshot **delayed5-18-speaking-h-recording-question-2.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| H signs out in the second tab: the first tab's recording stops and its microphone is released at once | PASS | recording now: 0; live microphone tracks: 0; recorder told to stop 54 ms after the sign-out click (the other tab hears of it through the browser's shared storage); same page (no reload): True |
| The first tab is back at its menu with the one-line notice, and nothing of the attempt is left on it | PASS | notice shown: True; question 2 still on screen: False; answer buttons left: 0 |

_screenshot **delayed5-19-speaking-stopped-at-switch.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| I signs up in the second tab: the first tab shows I no attempt and no way to answer H's remaining questions | PASS | user id 6cc28442-3236-4172-b3b1-0f43372c4174; question 2 or 3 on screen: False; recording now: 0; live microphone tracks: 0; same page: True |

_screenshot **delayed5-20-speaking-i-sees-no-attempt.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| No grading request left either tab (nothing was graded or paid for) | PASS | grading requests seen: 0 |
| Nothing from the attempt was recorded for H, or for I, on this device | PASS | H's speaking rows: 0; I's: 0; H's record: []; I's record: [] |
| Nothing from the attempt reached H's or I's account on the stand-in | PASS | H's events: []; I's events: [] |
| H signs back in (second tab): the stopped attempt does not come back to life, and nothing records | PASS | signed in as e82a011f-7e3e-45fe-ace7-0d488034d832; question 2 on screen: False; recording now: 0; grading requests: 0; same page (no reload): True |

**Speaking switch, first tab:** no console errors, no failed/4xx/5xx requests.

**Speaking switch, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Totals:** 56 PASS, 0 FAIL.

**A second run of this script, appended:** sections 7, 8, against a fresh start of the dev server at http://localhost:4384/ielts-website with the live examiner address set to the intercepted path.

## 7. The live examiner's start asks after every wait (Codex R2D-01)

Starting the examiner waits for its settings, for the microphone permission, for a sign-in token and for the voice connection. Before the fix the mock exam's embedded examiner asked nothing after those waits: if the account changed while the permission was still being asked for, the mock took the examiner off screen, and when the permission came back the examiner still kept the microphone, started recording, fetched a token and opened a paid voice session behind the stopped screen. Student J's SYNTHETIC mock sitting is put on its Speaking brief (written straight into J's own store; driving three whole papers first proves nothing more here), the examiner is started against an INTERCEPTED address with no voice service behind it, and the account is changed from a second tab at the two waits that matter: (a) the microphone request held unanswered while J signs out and student K signs up, then answered, with any voice session request that follows HELD so it would stay visible (before the fix that request carried K's token); (b) the voice session request held, then refused with a SYNTHETIC failure after J signs out. (c) repeats (a) on the standalone examiner page with students L and M.

| Check | Result | Observed |
|---|---|---|
| Student J signed up on the local stand-in | PASS | user id 899ada16-9c23-4984-82d4-d0843194babd |
| J's sitting is on the Speaking brief and Start is enabled (the settings answered by the intercept) | PASS | Start enabled: True; settings requests answered: 1 |
| (a) J presses Start: the examiner asks for the microphone, and the page's request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connecting screen: True |

_screenshot **delayed5-21-examiner-mock-microphone-pending.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="None"_
| (a) J signs out in the second tab: the mock stops and takes the examiner off screen while the microphone request is still unanswered | PASS | stopped screen: True; examiner still on screen: False; microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page (no reload): True |

_screenshot **delayed5-22-examiner-mock-stopped-microphone-pending.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (a) Student K signs up in the second tab while J's microphone request is still unanswered | PASS | user id edd3a65c-83c2-46a3-a9d8-eae5652851d4; held microphone requests: 1 |
| (a) The microphone answers after the switch: the stream it hands back is stopped at once | PASS | held requests answered now: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (a) Nothing follows the late microphone: no recording, no voice session requested (with K's token or anybody's), nothing opened | PASS | recorders started: 0; voice session requests: 0 (whose token: none); peer connections: 0; sockets: 0; same page: True |

_screenshot **delayed5-23-examiner-mock-after-late-microphone.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_
| (a) J signs back in: the first tab is back on the Speaking brief with the interview marked interrupted (the mock's own suspension, unchanged), and nothing is recording | PASS | signed in as 899ada16-9c23-4984-82d4-d0843194babd; brief shown: True; interrupted note: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **delayed5-24-examiner-mock-back-on-brief.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="Speaking"_
| (b) J starts again: the microphone is granted, the recording starts, and the voice session request is held in the browser | PASS | Start enabled: True; request held: True; voice session requests: 1; microphone requests 2, held 0; tracks handed back 2, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0 |

_screenshot **delayed5-25-examiner-mock-session-request-held.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="None"_
| (b) J signs out in the second tab while the request is held: the mock stops, the recording stops and the microphone is released at once | PASS | stopped screen: True; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; same page: True |
| (b) The held request is then refused with a SYNTHETIC failure: nothing more starts (no second request, no socket, the peer connection closed, no new recording, no new microphone request) | PASS | refused: 1; voice session requests in all: 1; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **delayed5-26-examiner-mock-after-refused-request.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_

**Examiner (mock), first tab console errors:** Failed to load resource: the server responded with a status of 503 (Service Unavailable)

**Examiner (mock), first tab failed/4xx/5xx requests:** 503 http://127.0.0.1:8831/SYNTHETIC-intercepted-live-examiner/

**Examiner (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)
| (c) Student L opens the standalone examiner, signed in; Start is enabled (the settings answered by the intercept) | PASS | user id d2049bed-6841-4d54-9024-15a3f728787f; Start enabled: True; settings requests answered: 1 |
| (c) L presses Start: the microphone request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (c) L signs out and student M signs up in the second tab, then the microphone answers: the stream is stopped at once, nothing records, no voice session is requested, and the page says the session was closed | PASS | held requests answered after the switch: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; voice session requests: 0; notice shown: True; same page: True |

_screenshot **delayed5-27-examiner-standalone-after-late-microphone.png**: url=`http://localhost:4384/ielts-website/speaking/examiner`, landmark heading="None"_

**Examiner (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Examiner (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

Every request to the examiner address in this section was answered inside the browser by the run itself: settings with SYNTHETIC values, and every voice session request refused with a SYNTHETIC 503 (at once, or after being held). The 503 lines in the diagnostics above are those refusals. No voice service, model or token service was reached.

## 8. The connection setup asks before the paid request (Codex R2D-01, the last window)

After section 7's fix one window was left inside the connection setup: once the sign-in token has been read, the connection prepares itself for up to ten seconds and then sends the request that creates the paid voice session, and nothing asked again in between (on the Gemini rollback, the same window lies between the ephemeral token request and the voice socket). The setup now asks the examiner's own check right before that request and that socket. A wrapper installed before the page loads HOLDS the connection's offer while it is being prepared, so the account changes inside exactly that window: (a) student N in the mock's examiner, (b) student P on the standalone examiner page, both on the paid path; (c) student R on the standalone page with the Gemini rollback, where the run holds the ephemeral token request instead and answers it with a SYNTHETIC value after the switch. Every voice session request is intercepted in the browser (held, then refused with a SYNTHETIC failure if one ever came), and the wrapper refuses every socket to another host, so nothing in this section can reach a real service even if the fix failed.

| Check | Result | Observed |
|---|---|---|
| Student N signed up on the local stand-in | PASS | user id aba1c260-0524-40e3-bd65-8cec178367be |
| (a) N presses Start in the mock: the microphone is granted, the recording starts, the sign-in token is read, and the connection's offer is held while it is prepared (no voice session request yet) | PASS | Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |

_screenshot **delayed5-28-link-mock-offer-held.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="None"_
| (a) N signs out in the second tab while the offer is still held: the mock stops, the recording stops and the microphone is released | PASS | stopped screen: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0; same page: True |
| (a) Student O signs up in the second tab while N's offer is still held | PASS | user id 38cc3d40-caf7-4cde-9393-ea01aa455b87; held offers: 1 |
| (a) The offer is let go after the switch: the setup asks before its request, so NO voice session request is sent (with N's token or anybody's), the peer connection is closed, and no socket, recording or microphone request follows | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; same page: True |

_screenshot **delayed5-29-link-mock-after-offer-let-go.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_

**Connection setup (mock), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)
| (b) Student P presses Start on the standalone examiner: recording, the token read, and the connection's offer held (no voice session request yet) | PASS | user id 18b699ae-7d81-46fc-861d-442a0110723c; Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |
| (b) P signs out and student Q signs up in the second tab while the offer is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id b882fc62-c118-4d93-84de-8d0b1f04cba6; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; same page: True |
| (b) The offer is let go after the switch: NO voice session request is sent, the peer connection is closed, no socket opens, nothing records, and the notice stays | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **delayed5-30-link-standalone-after-offer-let-go.png**: url=`http://localhost:4384/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)
| (c) Student R presses Start on the Gemini rollback: recording, and the request for an ephemeral voice token held in the browser (no socket yet) | PASS | user id bdb74bc2-0008-40d1-af96-a8d08d9dacc3; Start enabled: True; token request held: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0 |

_screenshot **delayed5-31-link-gemini-token-request-held.png**: url=`http://localhost:4384/ielts-website/speaking/examiner`, landmark heading="None"_
| (c) R signs out and student S signs up in the second tab while the token request is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id e036171d-477a-4dae-93b0-cdda8fe338b4; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; same page: True |
| (c) The token request is then answered with a SYNTHETIC value: the setup asks before its socket, so NO voice socket is even attempted (the wrapper, which would refuse it, saw none), nothing records, and the notice stays | PASS | answered: 1; token requests in all: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **delayed5-32-link-gemini-after-token.png**: url=`http://localhost:4384/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (Gemini rollback), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (Gemini rollback), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

Every request to the examiner address in section 8 was answered inside the browser by the run itself: settings with SYNTHETIC values, every paid voice session request held and then refused with a SYNTHETIC 503 (0 came in this section), and the Gemini token request answered with a SYNTHETIC value that is no token. The wrapper refuses every socket to another host (0 attempted in (c)), so no voice service, model or token service could be reached.

**Totals:** 81 PASS, 0 FAIL.

**Section 8 was also run once against the tree BEFORE the fix** (the same script, the same servers, on
the committed code at dd03541, before the setup took the check), to show that it catches what the fix
removes. There it gave 8 PASS and 3 FAIL, and the three failures were exactly the leak: in (a) and in
(b) the voice session request WAS sent once the held offer was let go after the switch (1 request
each, carrying the token that had been read before the switch, which the stand-in no longer accepted
because its student had signed out), and the peer connection stayed open; in (c) the page tried to
open the Gemini voice socket after the switch (1 attempt, refused by the run's wrapper, so nothing
left this machine). Those requests were intercepted and refused with a SYNTHETIC 503 inside the
browser. That control run's results and screenshots were kept outside the project (in the builder's
scratch folder), so this file holds only the run of the fixed code.
