# When the account changes on an open page: whose grade, and whose essay

Run on 2026-09-24 against a DEV server at http://127.0.0.1:4472/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8811. Both were started for
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
that creates the paid voice session without asking again. Section 9: finding R2E-01 of the Codex
inspection of c4a7793, the check inside the setup came too late once that request had SUCCEEDED
(the answer was applied and the examiner's audio started before anything asked again, and the wait
for the session to start could not be reached by the screen), driven with a connection that really
comes up against a loopback peer in the same page. The deterministic half of sections 1 to 7 is
`tests/delayed-grade-owner.test.ts`; of sections 8 and 9, `tests/live-start-cancel.test.ts`.

**Two starts of the dev server.** Sections 1 to 6 drive the recorded speaking trainer on
`/trainers/speaking`, which the site shows only while no live examiner address is configured.
Sections 7, 8 and 9 need one, so they ran against a second start of the same dev server with
`PUBLIC_LIVE_EXAMINER_URL` pointed at a path on the stand-in that the stand-in does not serve, and was
appended below.

**What this run does not cover, and where it is covered instead.** No live interview runs here: the
examiner needs a paid voice session, and the stand-in has none. Sections 7 and 8 start the examiner
as far as it can go without one (its settings and every voice session request are intercepted in the
browser and answered by the run itself) and race the account change against the microphone request,
the connection setup and the voice session request. Section 9 goes one step further without any
service: the voice session request is answered by the run with a real answer made by a second peer
connection inside the page, so the page's connection comes up and the examiner's (test tone) audio
plays, and the account change comes while the session is still starting. No session ever starts: the
loopback peer never says so. What happens once a voice session is up (the suspension mid-interview, the
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
| Student A signed up on the local stand-in | PASS | user id b8a015b6-c2c8-4840-b0e6-b57526dd44a0 |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **login-f23-01-essay-grading-held-for-a.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id bfa8eae0-ef6d-473a-b999-c84edca24abc, menu identity 'synthetic-student-b-f23-183816@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **login-f23-02-essay-b-signed-in-while-grading.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **login-f23-03-essay-grade-arrived-b-sees-notice.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:b8a015b6-c2c8-4840-b0e6-b57526dd44a0'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as b8a015b6-c2c8-4840-b0e6-b57526dd44a0; history lists the prompt: True |

_screenshot **login-f23-04-essay-a-back-finds-it.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing`, landmark heading="Writing Trainer"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 268ac43c-1f73-4ee4-8a68-6638ddecd08d |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **login-f23-05-speaking-grading-held-for-c.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="Speaking Trainer"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id 62bb2d37-0ef8-4fe7-8bef-d3cf26e2a6b5, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **login-f23-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="Speaking Trainer"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 268ac43c-1f73-4ee4-8a68-6638ddecd08d; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **login-f23-07-speaking-c-back-account.png**: url=`http://127.0.0.1:4472/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

## 3. The essay editor belongs to the student who started it (Codex R2B-01)

Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same browser, E signs out and student F signs up. The first tab is never reloaded by the script. F must get an empty editor and must not be able to send E's text; E's text must stay in E's own draft; E, signing back in, must find it and be able to submit it.

| Check | Result | Observed |
|---|---|---|
| Student E signed up on the local stand-in | PASS | user id 05f5a772-d788-4480-a452-4afab64e3147 |
| E's essay is on screen and kept as E's own draft | PASS | ielts.writing.draft.v1::u:05f5a772-d788-4480-a452-4afab64e3147::pte-wt-132-task2 carries E's essay: True |

_screenshot **login-f23-08-editor-e-typing.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| E signs out in the second tab: the first tab's editor empties itself and says the account changed | PASS | E's essay still in the text box: False; note shown: True; same page (no reload): True |
| F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded | PASS | user id 35b0d897-12bd-4202-bd22-c114c80eae0f; text box empty: True; note shown: True; E's essay anywhere on the page: False; same page: True |
| F cannot submit E's text: the text box is empty and 'Check my essay' is disabled | PASS | text box empty: True; button disabled: True |

_screenshot **login-f23-09-editor-f-empty-after-switch.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| No grading request left either tab after the switch, even with the button pressed by force | PASS | grading requests seen: 0 |
| F opening the same task in the second tab also gets an empty editor | PASS | text box empty: True |
| E's essay is still in E's own draft, and in no other key on this device | PASS | keys carrying E's essay: ['ielts.writing.draft.v1::u:05f5a772-d788-4480-a452-4afab64e3147::pte-wt-132-task2'] |
| F types an essay of their own in the first tab, and it is kept as F's own draft | PASS | ielts.writing.draft.v1::u:35b0d897-12bd-4202-bd22-c114c80eae0f::pte-wt-132-task2 carries F's essay: True, E's: False |
| E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded | PASS | signed in as 05f5a772-d788-4480-a452-4afab64e3147; E's essay in the text box: True; F's: False; same page: True |
| F's essay stays in F's own draft, untouched by E's return | PASS | keys carrying F's essay: ['ielts.writing.draft.v1::u:35b0d897-12bd-4202-bd22-c114c80eae0f::pte-wt-132-task2'] |

_screenshot **login-f23-10-editor-e-back-finds-draft.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader) | PASS | held: True; carries E's essay: True; carries F's: False |
| E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared | PASS | report on screen: True; E's rows: 1; F's rows: 0; E's draft still there: False |

_screenshot **login-f23-11-editor-e-report.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_

## 4. A switch inside the 600 ms autosave wait (Codex R2B-01)

E types in the first tab and, within the 600 ms the autosave waits for typing to pause, signs out from the second tab (its account menu already open, so the click is immediate). The page itself records when the last keystroke landed and when the editor was handed over, so the timing below is measured, not assumed. Before the fix, the autosave fired after the switch and saved E's latest text under whoever had just taken over.

| Check | Result | Observed |
|---|---|---|
| The switch landed inside the 600 ms autosave wait (measured in the page) | PASS | last keystroke to hand-over: 45 ms, on attempt 1 |
| E's latest text, typed just before the switch, is saved under E | PASS | ielts.writing.draft.v1::u:05f5a772-d788-4480-a452-4afab64e3147::pte-wt-132-task2 carries the latest text: True |
| Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out | PASS | keys carrying E's text: ['ielts.writing.draft.v1::u:05f5a772-d788-4480-a452-4afab64e3147::pte-wt-132-task2']; draft keys for this task: ['ielts.writing.draft.v1::u:05f5a772-d788-4480-a452-4afab64e3147::pte-wt-132-task2', 'ielts.writing.draft.v1::u:35b0d897-12bd-4202-bd22-c114c80eae0f::pte-wt-132-task2'] |
| The first tab's editor emptied at the switch and says the account changed | PASS | E's text still in the text box: False; note shown: True |

_screenshot **login-f23-12-debounce-switched-mid-wait.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| E signs back in and the first tab's editor shows the latest text E typed before the switch | PASS | latest text in the text box: True |

_screenshot **login-f23-13-debounce-e-back-latest-text.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| No grading request went out during either switch | PASS | grading requests seen in the first tab: 1 (the one E sent in section 3) |

**Editor, first tab:** no console errors, no failed/4xx/5xx requests.

**Editor, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

## 5. A late grade leaves a later revision alone (Codex R2C-01)

Student G submits an essay; the grading request is held. G signs out and back in from the avatar menu of the SAME page, gets the submitted essay back in the editor, and revises it; the revision autosaves. Only then is the held request answered. Before the fix, that older grade deleted G's draft, so a reload lost the revision.

| Check | Result | Observed |
|---|---|---|
| Student G signed up on the local stand-in | PASS | user id fcb62942-41f4-4137-9444-164327ceec57 |
| G's grading request went out and is being held (nothing reached any grader) | PASS | held=1; request carries G's essay: True |

_screenshot **login-f23-14-revision-g-grading-held.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| G signs out and back in on the same page: the submitted essay is back in G's editor, grade still held | PASS | signed in as fcb62942-41f4-4137-9444-164327ceec57; essay in the text box: True; request still held: True; same page (no reload): True |
| G revises the essay and the revision autosaves as G's draft | PASS | ielts.writing.draft.v1::u:fcb62942-41f4-4137-9444-164327ceec57::pte-wt-132-task2 carries the revision: True |

_screenshot **login-f23-15-revision-g-revised-while-grading.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| The earlier grade arrives: it is kept in G's history (the original essay), and not painted over the editor | PASS | G's writing rows: 1; row is the original essay: True; G's record: ['write:pte-wt-132-task2']; report text on screen: False; same page: True |
| G's draft still holds the revision after the earlier grade was kept (before the fix it was deleted here) | PASS | ielts.writing.draft.v1::u:fcb62942-41f4-4137-9444-164327ceec57::pte-wt-132-task2 carries the revision: True; revision in the text box: True |

_screenshot **login-f23-16-revision-grade-arrived-revision-kept.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| After a reload the editor opens G's revision | PASS | revision in the text box: True; the page really was reloaded: True |
| G's writing history on the page lists the graded attempt | PASS | history lists the prompt: True |

_screenshot **login-f23-17-revision-after-reload.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="Writing Trainer"_
| G's account on the stand-in received the original essay's grade, and never the unsubmitted revision | PASS | G's events: ['write:pte-wt-132-task2']; user_state carries the essay: True, the revision: False |
| Exactly one grading request left the page | PASS | grading requests seen: 1 |

**Revision failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

## 6. A speaking attempt stops the moment its student leaves (Codex R2C-04)

Student H opens a Part 1 topic on the speaking trainer (the recorded checker) by its exact link, answers question 1 through the browser's FAKE microphone (a test tone, no real voice), and is recording question 2 when H signs out and student I signs up in a SECOND tab of the same browser. Before the fix the first tab carried on: I could answer the remaining questions, and the whole recording was then graded as H's.

| Check | Result | Observed |
|---|---|---|
| Student H signed up on the local stand-in | PASS | user id a23e0610-d97f-4111-af2a-139ed6b6edcf |
| H answered question 1 and is recording question 2 through the fake microphone | PASS | question 2 on screen: True; recorders started: 2, recording now: 1; live microphone tracks: 1 |

_screenshot **login-f23-18-speaking-h-recording-question-2.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="Speaking Trainer"_
| H signs out in the second tab: the first tab's recording stops and its microphone is released at once | PASS | recording now: 0; live microphone tracks: 0; recorder told to stop 27 ms after the sign-out click (the other tab hears of it through the browser's shared storage); same page (no reload): True |
| The first tab is back at its menu with the one-line notice, and nothing of the attempt is left on it | PASS | notice shown: True; question 2 still on screen: False; answer buttons left: 0 |

_screenshot **login-f23-19-speaking-stopped-at-switch.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="Speaking Trainer"_
| I signs up in the second tab: the first tab shows I no attempt and no way to answer H's remaining questions | PASS | user id 92da31c7-5e98-4305-a057-bc709948d561; question 2 or 3 on screen: False; recording now: 0; live microphone tracks: 0; same page: True |

_screenshot **login-f23-20-speaking-i-sees-no-attempt.png**: url=`http://127.0.0.1:4472/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="Speaking Trainer"_
| No grading request left either tab (nothing was graded or paid for) | PASS | grading requests seen: 0 |
| Nothing from the attempt was recorded for H, or for I, on this device | PASS | H's speaking rows: 0; I's: 0; H's record: []; I's record: [] |
| Nothing from the attempt reached H's or I's account on the stand-in | PASS | H's events: []; I's events: [] |
| H signs back in (second tab): the stopped attempt does not come back to life, and nothing records | PASS | signed in as a23e0610-d97f-4111-af2a-139ed6b6edcf; question 2 on screen: False; recording now: 0; grading requests: 0; same page (no reload): True |

**Speaking switch, first tab:** no console errors, no failed/4xx/5xx requests.

**Speaking switch, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

**Totals:** 56 PASS, 0 FAIL.

**A second run of this script, appended:** sections 7, 8, 9, against a fresh start of the dev server at http://127.0.0.1:4472/ielts-website with the live examiner address set to the intercepted path.

## 7. The live examiner's start asks after every wait (Codex R2D-01)

Starting the examiner waits for its settings, for the microphone permission, for a sign-in token and for the voice connection. Before the fix the mock exam's embedded examiner asked nothing after those waits: if the account changed while the permission was still being asked for, the mock took the examiner off screen, and when the permission came back the examiner still kept the microphone, started recording, fetched a token and opened a paid voice session behind the stopped screen. Student J's SYNTHETIC mock sitting is put on its Speaking brief (written straight into J's own store; driving three whole papers first proves nothing more here), the examiner is started against an INTERCEPTED address with no voice service behind it, and the account is changed from a second tab at the two waits that matter: (a) the microphone request held unanswered while J signs out and student K signs up, then answered, with any voice session request that follows HELD so it would stay visible (before the fix that request carried K's token); (b) the voice session request held, then refused with a SYNTHETIC failure after J signs out. (c) repeats (a) on the standalone examiner page with students L and M.

| Check | Result | Observed |
|---|---|---|
| Student J signed up on the local stand-in | PASS | user id 88b1502d-599e-44b3-8937-22f939624f2a |
| J's sitting is on the Speaking brief and Start is enabled (the settings answered by the intercept) | PASS | Start enabled: True; settings requests answered: 1 |
| (a) J presses Start: the examiner asks for the microphone, and the page's request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connecting screen: True |

_screenshot **login-f23-21-examiner-mock-microphone-pending.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="None"_
| (a) J signs out in the second tab: the mock stops and takes the examiner off screen while the microphone request is still unanswered | PASS | stopped screen: True; examiner still on screen: False; microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page (no reload): True |

_screenshot **login-f23-22-examiner-mock-stopped-microphone-pending.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (a) Student K signs up in the second tab while J's microphone request is still unanswered | PASS | user id 0e0fe87f-7132-4e08-8e4d-a04458afb099; held microphone requests: 1 |
| (a) The microphone answers after the switch: the stream it hands back is stopped at once | PASS | held requests answered now: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (a) Nothing follows the late microphone: no recording, no voice session requested (with K's token or anybody's), nothing opened | PASS | recorders started: 0; voice session requests: 0 (whose token: none); peer connections: 0; sockets: 0; same page: True |

_screenshot **login-f23-23-examiner-mock-after-late-microphone.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_
| (a) J signs back in: the first tab is back on the Speaking brief with the interview marked interrupted (the mock's own suspension, unchanged), and nothing is recording | PASS | signed in as 88b1502d-599e-44b3-8937-22f939624f2a; brief shown: True; interrupted note: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **login-f23-24-examiner-mock-back-on-brief.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="Speaking"_
| (b) J starts again: the microphone is granted, the recording starts, and the voice session request is held in the browser | PASS | Start enabled: True; request held: True; voice session requests: 1; microphone requests 2, held 0; tracks handed back 2, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0 |

_screenshot **login-f23-25-examiner-mock-session-request-held.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="None"_
| (b) J signs out in the second tab while the request is held: the mock stops, the recording stops and the microphone is released at once | PASS | stopped screen: True; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |
| (b) The held request is then refused with a SYNTHETIC failure: nothing more starts (no second request, no socket, the peer connection closed, no new recording, no new microphone request) | PASS | refused: 1; voice session requests in all: 1; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **login-f23-26-examiner-mock-after-refused-request.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_

**Examiner (mock), first tab console errors:** Failed to load resource: the server responded with a status of 503 (Service Unavailable)

**Examiner (mock), first tab failed/4xx/5xx requests:** 503 http://127.0.0.1:8811/SYNTHETIC-intercepted-live-examiner/

**Examiner (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED); FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) Student L opens the standalone examiner, signed in; Start is enabled (the settings answered by the intercept) | PASS | user id 367145bf-f176-4338-95f5-68fcddb2da35; Start enabled: True; settings requests answered: 1 |
| (c) L presses Start: the microphone request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (c) L signs out and student M signs up in the second tab, then the microphone answers: the stream is stopped at once, nothing records, no voice session is requested, and the page says the session was closed | PASS | held requests answered after the switch: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; voice session requests: 0; notice shown: True; same page: True |

_screenshot **login-f23-27-examiner-standalone-after-late-microphone.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_

**Examiner (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Examiner (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in this section was answered inside the browser by the run itself: settings with SYNTHETIC values, and every voice session request refused with a SYNTHETIC 503 (at once, or after being held). The 503 lines in the diagnostics above are those refusals. No voice service, model or token service was reached.

## 8. The connection setup asks before the paid request (Codex R2D-01, the last window)

After section 7's fix one window was left inside the connection setup: once the sign-in token has been read, the connection prepares itself for up to ten seconds and then sends the request that creates the paid voice session, and nothing asked again in between (on the Gemini rollback, the same window lies between the ephemeral token request and the voice socket). The setup now asks the examiner's own check right before that request and that socket. A wrapper installed before the page loads HOLDS the connection's offer while it is being prepared, so the account changes inside exactly that window: (a) student N in the mock's examiner, (b) student P on the standalone examiner page, both on the paid path; (c) student R on the standalone page with the Gemini rollback, where the run holds the ephemeral token request instead and answers it with a SYNTHETIC value after the switch. Every voice session request is intercepted in the browser (held, then refused with a SYNTHETIC failure if one ever came), and the wrapper refuses every socket to another host, so nothing in this section can reach a real service even if the fix failed.

| Check | Result | Observed |
|---|---|---|
| Student N signed up on the local stand-in | PASS | user id d4714446-4c51-4150-b099-f02ddfdd549b |
| (a) N presses Start in the mock: the microphone is granted, the recording starts, the sign-in token is read, and the connection's offer is held while it is prepared (no voice session request yet) | PASS | Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |

_screenshot **login-f23-28-link-mock-offer-held.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="None"_
| (a) N signs out in the second tab while the offer is still held: the mock stops, the recording stops and the microphone is released | PASS | stopped screen: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0; same page: True |
| (a) Student O signs up in the second tab while N's offer is still held | PASS | user id 08521a18-336e-4691-b2cf-2cd181410757; held offers: 1 |
| (a) The offer is let go after the switch: the setup asks before its request, so NO voice session request is sent (with N's token or anybody's), the peer connection is closed, and no socket, recording or microphone request follows | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; same page: True |

_screenshot **login-f23-29-link-mock-after-offer-let-go.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_

**Connection setup (mock), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (b) Student P presses Start on the standalone examiner: recording, the token read, and the connection's offer held (no voice session request yet) | PASS | user id 0c476bce-69ee-49d4-a7ce-66cf10681de8; Start enabled: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; voice session requests: 0 |
| (b) P signs out and student Q signs up in the second tab while the offer is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id d6e2dcba-0958-41ab-8433-485b8abe155c; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 1; sockets refused by the run's wrapper 0; same page: True |
| (b) The offer is let go after the switch: NO voice session request is sent, the peer connection is closed, no socket opens, nothing records, and the notice stays | PASS | offers let go now: 1; voice session requests: 0 (whose token: none sent); microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 1, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **login-f23-30-link-standalone-after-offer-let-go.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) Student R presses Start on the Gemini rollback: recording, and the request for an ephemeral voice token held in the browser (no socket yet) | PASS | user id b1701816-6742-446a-abde-36e2343cf994; Start enabled: True; token request held: True; microphone requests 1, held 0; tracks handed back 1, still live 1; recorders started 1, still recording 1; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0 |

_screenshot **login-f23-31-link-gemini-token-request-held.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_
| (c) R signs out and student S signs up in the second tab while the token request is held: the page stops the session and says so, the recording stops and the microphone is released | PASS | user id 5cdad155-9216-42c6-9d06-8e806dfd0e49; notice shown: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; same page: True |
| (c) The token request is then answered with a SYNTHETIC value: the setup asks before its socket, so NO voice socket is even attempted (the wrapper, which would refuse it, saw none), nothing records, and the notice stays | PASS | answered: 1; token requests in all: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 1, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connection offers prepared 0, held 0; sockets refused by the run's wrapper 0; notice shown: True; same page: True |

_screenshot **login-f23-32-link-gemini-after-token.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_

**Connection setup (Gemini rollback), first tab:** no console errors, no failed/4xx/5xx requests.

**Connection setup (Gemini rollback), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in section 8 was answered inside the browser by the run itself: settings with SYNTHETIC values, every paid voice session request held and then refused with a SYNTHETIC 503 (0 came in this section), and the Gemini token request answered with a SYNTHETIC value that is no token. The wrapper refuses every socket to another host (0 attempted in (c)), so no voice service, model or token service could be reached.

## 9. A voice session that SUCCEEDS late, then the page changes hands (Codex R2E-01)

Sections 7 and 8 only ever refused the voice session request. Finding R2E-01 is about a request that SUCCEEDS: before the fix the answer was applied before anything asked again, so the examiner's audio started, and while the session then started (up to twenty seconds) the screen could not reach the connection at all; a timeout or an error there also left the session open at the Worker. Here the request succeeds against no real service: the run answers it with a REAL answer made inside the page by a second, loopback peer connection that takes the page's own offer from the intercepted request and sends a test tone, so the page's connection comes up in the same tab and the examiner's audio genuinely plays. The loopback never says the session started, so the page waits in exactly the window the finding names. A wrapper installed before the page loads counts the answers the page applies, the audio it plays (and can hold the playback's own start), the audio contexts it makes, and every call to the Worker's end-session address (intercepted in the browser). (a) the standalone page with the successful answer HELD while student T signs out and U signs up in a second tab, then released; (b) the standalone page with the answer applied and the audio playing when V signs out (then W signs up); (c) the mock's examiner in the same state as (b) when X signs out (then Y signs up), so the mock takes the examiner off screen.

| Check | Result | Observed |
|---|---|---|
| (a) Student T presses Start on the standalone examiner: recording, the token read, the voice session request held in the browser; the run makes a REAL answer to the page's own offer with the loopback peer in the same page (not yet handed back) | PASS | user id 24d2dd8d-0978-44ed-b3d4-f94f9c7742f9; Start enabled: True; request held: True; real answer made: True; page's peer connections 1, still open 1 (connection state connecting); answers applied by the page 0; page's data channel connecting; loopback peer connecting; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0 |

_screenshot **login-f23-33-loopback-standalone-answer-held.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_
| (a) T signs out in the second tab while the successful answer is still held: the page's connection is closed AT ONCE (not when the request answers), the recording stops, the microphone is released and the page says the session was closed | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 0; page's data channel closed; loopback peer connecting; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; requests still held: 1; notice shown: True; same page: True |
| (a) Student U signs up in the second tab, and the held request then SUCCEEDS with the real answer: the answer is never applied, no audio element is made or played, no track is live, nothing reopens, and the session the request created is ended at the Worker, once | PASS | user id add1c44c-d5e4-494f-a207-ca7d8ca36202; answered now: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 0; page's data channel closed; loopback peer disconnected; audio elements 0, playing 0, starts held 0; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-184229-T'] (0.0 s after the answer; the sign-out was 6.7 s before the answer); notice shown: True; same page: True |

_screenshot **login-f23-34-loopback-standalone-after-late-answer.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_

**Loopback (standalone, answer held), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (standalone, answer held), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (b) V presses Start on the standalone examiner page; the voice session request SUCCEEDS with the loopback's real answer: the page applies it, the examiner's (test tone) audio starts playing while its own start is held, and the session start is still waiting (the loopback never says the session started), with no session ended yet | PASS | user id 3d7f44de-dd20-4980-a5a7-83b20c101c78; Start enabled: True; request held: True; real answer made: True (contains a DTLS fingerprint); page's peer connections 1, still open 1 (connection state connected); answers applied by the page 1; page's data channel open; loopback peer connected; audio elements 1, playing 1, starts held 1; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0; sessions ended so far: []; connecting screen: True |

_screenshot **login-f23-35-loopback-standalone-audio-playing.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_
| (b) V signs out in the second tab 1.6 s after the answer (inside the old 20 s session start): within 2.5 s the page's connection is closed, the examiner audio has stopped, no track is live, the recording has stopped, the page says the session was closed, and the session is ended at the Worker, once | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer connected; audio elements 1, playing 0, starts held 1; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-184229-V'] (0.0 s after the sign-out); notice shown: True; same page: True |

_screenshot **login-f23-36-loopback-standalone-after-switch.png**: url=`http://127.0.0.1:4472/ielts-website/speaking/examiner`, landmark heading="None"_
| (b) Student W signs up in the second tab, and the playback's own start, held until now, is let go: what it makes afterwards is released as well (no audio context left running, nothing playing), nothing reopens, and the session is still ended exactly once | PASS | user id 60bee4d6-6b0b-42c4-a990-cad82f7e735c; held starts let go: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer disconnected; audio elements 1, playing 0, starts held 0; audio contexts 2, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-184229-V']; same page: True |

**Loopback (the standalone examiner page), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (the standalone examiner page), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)
| (c) X presses Start on the mock's examiner; the voice session request SUCCEEDS with the loopback's real answer: the page applies it, the examiner's (test tone) audio starts playing while its own start is held, and the session start is still waiting (the loopback never says the session started), with no session ended yet | PASS | user id e0acc0eb-dfca-4b56-bf8c-603997a71a6f; Start enabled: True; request held: True; real answer made: True (contains a DTLS fingerprint); page's peer connections 1, still open 1 (connection state connected); answers applied by the page 1; page's data channel open; loopback peer connected; audio elements 1, playing 1, starts held 1; audio contexts 1, still running 1; examiner (received) tracks still live 1; microphone tracks 1, still live 1; recorders still recording 1; sockets to other hosts 0; sessions ended so far: []; connecting screen: True |

_screenshot **login-f23-37-loopback-mock-audio-playing.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="None"_
| (c) X signs out in the second tab 1.6 s after the answer (inside the old 20 s session start): within 2.5 s the page's connection is closed, the examiner audio has stopped, no track is live, the recording has stopped, the mock stops, and the session is ended at the Worker, once | PASS | page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer connected; audio elements 1, playing 0, starts held 1; audio contexts 1, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-184229-X'] (0.0 s after the sign-out); stopped screen: True; same page: True |

_screenshot **login-f23-38-loopback-mock-after-switch.png**: url=`http://127.0.0.1:4472/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (c) Student Y signs up in the second tab, and the playback's own start, held until now, is let go: what it makes afterwards is released as well (no audio context left running, nothing playing), nothing reopens, and the session is still ended exactly once | PASS | user id 5883f28b-dd00-4fbf-82e3-ae938d1a4a48; held starts let go: 1; page's peer connections 1, still open 0 (connection state closed); answers applied by the page 1; page's data channel closed; loopback peer disconnected; audio elements 1, playing 0, starts held 0; audio contexts 2, still running 0; examiner (received) tracks still live 0; microphone tracks 1, still live 0; recorders still recording 0; sockets to other hosts 0; sessions ended at the Worker: ['SYNTHETIC-f23-session-184229-X']; same page: True |

**Loopback (the mock's examiner), first tab:** no console errors, no failed/4xx/5xx requests.

**Loopback (the mock's examiner), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8811/auth/v1/logout?scope=local (net::ERR_ABORTED)

Every request to the examiner address in section 9 was answered inside the browser by the run itself: settings with SYNTHETIC values, each voice session request with a SYNTHETIC session id and a real answer made by a loopback peer connection inside the same page (so the page's connection came up in the same tab, with a test tone as the examiner's voice), and every call to the end-session address counted and answered with a SYNTHETIC reply. No voice service, model or token service was reached, and no session ever started: the loopback never says so.

**Totals:** 90 PASS, 0 FAIL.
