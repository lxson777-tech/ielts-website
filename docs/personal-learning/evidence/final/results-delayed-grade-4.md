# When the account changes on an open page: whose grade, and whose essay

Run on 2026-09-23 against a DEV server at http://localhost:4384/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8831. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of five fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. Section 5: finding R2C-01
of the third Codex inspection, a late grade deleted the draft its student had revised since
submitting. Section 6: finding R2C-04 of the same inspection, a speaking attempt went on after the
page changed hands, so a second student could answer the first student's remaining questions.
Section 7: finding R2D-01 of the Codex inspection of 1701b97, the live examiner's START asked
nothing after its waits, so an account change while the microphone permission was up left the
microphone, a recording and a paid voice session running behind the mock's stopped screen. The
deterministic half of all of them is `tests/delayed-grade-owner.test.ts`.

**Two starts of the dev server.** Sections 1 to 6 drive the recorded speaking trainer on
`/trainers/speaking`, which the site shows only while no live examiner address is configured.
Section 7 needs one, so it ran against a second start of the same dev server with
`PUBLIC_LIVE_EXAMINER_URL` pointed at a path on the stand-in that the stand-in does not serve, and was
appended below.

**What this run does not cover, and where it is covered instead.** No live interview runs here: the
examiner needs a paid voice session, and the stand-in has none. Section 7 starts the examiner as far
as it can go without one (its settings and every voice session request are intercepted in the browser
and answered by the run itself) and races the account change against the microphone request and the
voice session request. What happens once a voice session is up (the suspension mid-interview, the
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
| Student A signed up on the local stand-in | PASS | user id 3c4b1ca7-8f0a-4586-bfbf-08a2f756c99e |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **delayed4-01-essay-grading-held-for-a.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id bb95e943-50a9-446d-902f-465559f3c96a, menu identity 'synthetic-student-b-f23-144331@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **delayed4-02-essay-b-signed-in-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **delayed4-03-essay-grade-arrived-b-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:3c4b1ca7-8f0a-4586-bfbf-08a2f756c99e'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as 3c4b1ca7-8f0a-4586-bfbf-08a2f756c99e; history lists the prompt: True |

_screenshot **delayed4-04-essay-a-back-finds-it.png**: url=`http://localhost:4384/ielts-website/trainers/writing`, landmark heading="None"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 70234360-b604-4323-a22e-749081b37e85 |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **delayed4-05-speaking-grading-held-for-c.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id 7d1a5c35-9c55-4716-b2c1-292d3452c489, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **delayed4-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 70234360-b604-4323-a22e-749081b37e85; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **delayed4-07-speaking-c-back-account.png**: url=`http://localhost:4384/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 3. The essay editor belongs to the student who started it (Codex R2B-01)

Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same browser, E signs out and student F signs up. The first tab is never reloaded by the script. F must get an empty editor and must not be able to send E's text; E's text must stay in E's own draft; E, signing back in, must find it and be able to submit it.

| Check | Result | Observed |
|---|---|---|
| Student E signed up on the local stand-in | PASS | user id edf5f2f1-ee10-42dd-ae25-3bfebab2347c |
| E's essay is on screen and kept as E's own draft | PASS | ielts.writing.draft.v1::u:edf5f2f1-ee10-42dd-ae25-3bfebab2347c::pte-wt-132-task2 carries E's essay: True |

_screenshot **delayed4-08-editor-e-typing.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs out in the second tab: the first tab's editor empties itself and says the account changed | PASS | E's essay still in the text box: False; note shown: True; same page (no reload): True |
| F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded | PASS | user id 68bf53d0-3ea3-4798-bbb3-cc6cd690bfac; text box empty: True; note shown: True; E's essay anywhere on the page: False; same page: True |
| F cannot submit E's text: the text box is empty and 'Check my essay' is disabled | PASS | text box empty: True; button disabled: True |

_screenshot **delayed4-09-editor-f-empty-after-switch.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request left either tab after the switch, even with the button pressed by force | PASS | grading requests seen: 0 |
| F opening the same task in the second tab also gets an empty editor | PASS | text box empty: True |
| E's essay is still in E's own draft, and in no other key on this device | PASS | keys carrying E's essay: ['ielts.writing.draft.v1::u:edf5f2f1-ee10-42dd-ae25-3bfebab2347c::pte-wt-132-task2'] |
| F types an essay of their own in the first tab, and it is kept as F's own draft | PASS | ielts.writing.draft.v1::u:68bf53d0-3ea3-4798-bbb3-cc6cd690bfac::pte-wt-132-task2 carries F's essay: True, E's: False |
| E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded | PASS | signed in as edf5f2f1-ee10-42dd-ae25-3bfebab2347c; E's essay in the text box: True; F's: False; same page: True |
| F's essay stays in F's own draft, untouched by E's return | PASS | keys carrying F's essay: ['ielts.writing.draft.v1::u:68bf53d0-3ea3-4798-bbb3-cc6cd690bfac::pte-wt-132-task2'] |

_screenshot **delayed4-10-editor-e-back-finds-draft.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader) | PASS | held: True; carries E's essay: True; carries F's: False |
| E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared | PASS | report on screen: True; E's rows: 1; F's rows: 0; E's draft still there: False |

_screenshot **delayed4-11-editor-e-report.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_

## 4. A switch inside the 600 ms autosave wait (Codex R2B-01)

E types in the first tab and, within the 600 ms the autosave waits for typing to pause, signs out from the second tab (its account menu already open, so the click is immediate). The page itself records when the last keystroke landed and when the editor was handed over, so the timing below is measured, not assumed. Before the fix, the autosave fired after the switch and saved E's latest text under whoever had just taken over.

| Check | Result | Observed |
|---|---|---|
| The switch landed inside the 600 ms autosave wait (measured in the page) | PASS | last keystroke to hand-over: 59 ms, on attempt 1 |
| E's latest text, typed just before the switch, is saved under E | PASS | ielts.writing.draft.v1::u:edf5f2f1-ee10-42dd-ae25-3bfebab2347c::pte-wt-132-task2 carries the latest text: True |
| Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out | PASS | keys carrying E's text: ['ielts.writing.draft.v1::u:edf5f2f1-ee10-42dd-ae25-3bfebab2347c::pte-wt-132-task2']; draft keys for this task: ['ielts.writing.draft.v1::u:68bf53d0-3ea3-4798-bbb3-cc6cd690bfac::pte-wt-132-task2', 'ielts.writing.draft.v1::u:edf5f2f1-ee10-42dd-ae25-3bfebab2347c::pte-wt-132-task2'] |
| The first tab's editor emptied at the switch and says the account changed | PASS | E's text still in the text box: False; note shown: True |

_screenshot **delayed4-12-debounce-switched-mid-wait.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs back in and the first tab's editor shows the latest text E typed before the switch | PASS | latest text in the text box: True |

_screenshot **delayed4-13-debounce-e-back-latest-text.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request went out during either switch | PASS | grading requests seen in the first tab: 1 (the one E sent in section 3) |

**Editor, first tab:** no console errors, no failed/4xx/5xx requests.

**Editor, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 5. A late grade leaves a later revision alone (Codex R2C-01)

Student G submits an essay; the grading request is held. G signs out and back in from the avatar menu of the SAME page, gets the submitted essay back in the editor, and revises it; the revision autosaves. Only then is the held request answered. Before the fix, that older grade deleted G's draft, so a reload lost the revision.

| Check | Result | Observed |
|---|---|---|
| Student G signed up on the local stand-in | PASS | user id 82e6036c-8760-4152-9594-5db4ab270776 |
| G's grading request went out and is being held (nothing reached any grader) | PASS | held=1; request carries G's essay: True |

_screenshot **delayed4-14-revision-g-grading-held.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G signs out and back in on the same page: the submitted essay is back in G's editor, grade still held | PASS | signed in as 82e6036c-8760-4152-9594-5db4ab270776; essay in the text box: True; request still held: True; same page (no reload): True |
| G revises the essay and the revision autosaves as G's draft | PASS | ielts.writing.draft.v1::u:82e6036c-8760-4152-9594-5db4ab270776::pte-wt-132-task2 carries the revision: True |

_screenshot **delayed4-15-revision-g-revised-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The earlier grade arrives: it is kept in G's history (the original essay), and not painted over the editor | PASS | G's writing rows: 1; row is the original essay: True; G's record: ['write:pte-wt-132-task2']; report text on screen: False; same page: True |
| G's draft still holds the revision after the earlier grade was kept (before the fix it was deleted here) | PASS | ielts.writing.draft.v1::u:82e6036c-8760-4152-9594-5db4ab270776::pte-wt-132-task2 carries the revision: True; revision in the text box: True |

_screenshot **delayed4-16-revision-grade-arrived-revision-kept.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| After a reload the editor opens G's revision | PASS | revision in the text box: True; the page really was reloaded: True |
| G's writing history on the page lists the graded attempt | PASS | history lists the prompt: True |

_screenshot **delayed4-17-revision-after-reload.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G's account on the stand-in received the original essay's grade, and never the unsubmitted revision | PASS | G's events: ['write:pte-wt-132-task2']; user_state carries the essay: True, the revision: False |
| Exactly one grading request left the page | PASS | grading requests seen: 1 |

**Revision failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 6. A speaking attempt stops the moment its student leaves (Codex R2C-04)

Student H opens a Part 1 topic on the speaking trainer (the recorded checker) by its exact link, answers question 1 through the browser's FAKE microphone (a test tone, no real voice), and is recording question 2 when H signs out and student I signs up in a SECOND tab of the same browser. Before the fix the first tab carried on: I could answer the remaining questions, and the whole recording was then graded as H's.

| Check | Result | Observed |
|---|---|---|
| Student H signed up on the local stand-in | PASS | user id 14f3ca7b-1351-4a44-82f6-349d28d809cf |
| H answered question 1 and is recording question 2 through the fake microphone | PASS | question 2 on screen: True; recorders started: 2, recording now: 1; live microphone tracks: 1 |

_screenshot **delayed4-18-speaking-h-recording-question-2.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| H signs out in the second tab: the first tab's recording stops and its microphone is released at once | PASS | recording now: 0; live microphone tracks: 0; recorder told to stop 49 ms after the sign-out click (the other tab hears of it through the browser's shared storage); same page (no reload): True |
| The first tab is back at its menu with the one-line notice, and nothing of the attempt is left on it | PASS | notice shown: True; question 2 still on screen: False; answer buttons left: 0 |

_screenshot **delayed4-19-speaking-stopped-at-switch.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| I signs up in the second tab: the first tab shows I no attempt and no way to answer H's remaining questions | PASS | user id d12271d0-756f-486d-8086-1e8e3aec0db9; question 2 or 3 on screen: False; recording now: 0; live microphone tracks: 0; same page: True |

_screenshot **delayed4-20-speaking-i-sees-no-attempt.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| No grading request left either tab (nothing was graded or paid for) | PASS | grading requests seen: 0 |
| Nothing from the attempt was recorded for H, or for I, on this device | PASS | H's speaking rows: 0; I's: 0; H's record: []; I's record: [] |
| Nothing from the attempt reached H's or I's account on the stand-in | PASS | H's events: []; I's events: [] |
| H signs back in (second tab): the stopped attempt does not come back to life, and nothing records | PASS | signed in as 14f3ca7b-1351-4a44-82f6-349d28d809cf; question 2 on screen: False; recording now: 0; grading requests: 0; same page (no reload): True |

**Speaking switch, first tab:** no console errors, no failed/4xx/5xx requests.

**Speaking switch, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Totals:** 56 PASS, 0 FAIL.

**A second run of this script, appended:** sections 7, against a fresh start of the dev server at http://localhost:4384/ielts-website with the live examiner address set to the intercepted path.

## 7. The live examiner's start asks after every wait (Codex R2D-01)

Starting the examiner waits for its settings, for the microphone permission, for a sign-in token and for the voice connection. Before the fix the mock exam's embedded examiner asked nothing after those waits: if the account changed while the permission was still being asked for, the mock took the examiner off screen, and when the permission came back the examiner still kept the microphone, started recording, fetched a token and opened a paid voice session behind the stopped screen. Student J's SYNTHETIC mock sitting is put on its Speaking brief (written straight into J's own store; driving three whole papers first proves nothing more here), the examiner is started against an INTERCEPTED address with no voice service behind it, and the account is changed from a second tab at the two waits that matter: (a) the microphone request held unanswered while J signs out and student K signs up, then answered, with any voice session request that follows HELD so it would stay visible (before the fix that request carried K's token); (b) the voice session request held, then refused with a SYNTHETIC failure after J signs out. (c) repeats (a) on the standalone examiner page with students L and M.

| Check | Result | Observed |
|---|---|---|
| Student J signed up on the local stand-in | PASS | user id 2c2f7e89-4a19-42d4-be7f-1e894aa3ceb5 |
| J's sitting is on the Speaking brief and Start is enabled (the settings answered by the intercept) | PASS | Start enabled: True; settings requests answered: 1 |
| (a) J presses Start: the examiner asks for the microphone, and the page's request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; connecting screen: True |

_screenshot **delayed4-21-examiner-mock-microphone-pending.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="None"_
| (a) J signs out in the second tab: the mock stops and takes the examiner off screen while the microphone request is still unanswered | PASS | stopped screen: True; examiner still on screen: False; microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page (no reload): True |

_screenshot **delayed4-22-examiner-mock-stopped-microphone-pending.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_
| (a) Student K signs up in the second tab while J's microphone request is still unanswered | PASS | user id 22d7acff-ae85-419a-849a-8f79556cebac; held microphone requests: 1 |
| (a) The microphone answers after the switch: the stream it hands back is stopped at once | PASS | held requests answered now: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (a) Nothing follows the late microphone: no recording, no voice session requested (with K's token or anybody's), nothing opened | PASS | recorders started: 0; voice session requests: 0 (whose token: none); peer connections: 0; sockets: 0; same page: True |

_screenshot **delayed4-23-examiner-mock-after-late-microphone.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="This mock exam belongs to another student"_
| (a) J signs back in: the first tab is back on the Speaking brief with the interview marked interrupted (the mock's own suspension, unchanged), and nothing is recording | PASS | signed in as 2c2f7e89-4a19-42d4-be7f-1e894aa3ceb5; brief shown: True; interrupted note: True; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **delayed4-24-examiner-mock-back-on-brief.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="Speaking"_
| (b) J starts again: the microphone is granted, the recording starts, and the voice session request is held in the browser | PASS | Start enabled: True; request held: True; voice session requests: 1; microphone requests 2, held 0; tracks handed back 2, still live 1; recorders started 1, still recording 1; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0 |

_screenshot **delayed4-25-examiner-mock-session-request-held.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="None"_
| (b) J signs out in the second tab while the request is held: the mock stops, the recording stops and the microphone is released at once | PASS | stopped screen: True; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 1; sockets other than the dev server's own live-reload one 0; same page: True |
| (b) The held request is then refused with a SYNTHETIC failure: nothing more starts (no second request, no socket, the peer connection closed, no new recording, no new microphone request) | PASS | refused: 1; voice session requests in all: 1; microphone requests 2, held 0; tracks handed back 2, still live 0; recorders started 1, still recording 0; peer connections made 1, still open 0; sockets other than the dev server's own live-reload one 0; same page: True |

_screenshot **delayed4-26-examiner-mock-after-refused-request.png**: url=`http://localhost:4384/ielts-website/tests/mock`, landmark heading="You signed out during this mock exam"_

**Examiner (mock), first tab console errors:** Failed to load resource: the server responded with a status of 503 (Service Unavailable)

**Examiner (mock), first tab failed/4xx/5xx requests:** 503 http://127.0.0.1:8831/SYNTHETIC-intercepted-live-examiner/

**Examiner (mock), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)
| (c) Student L opens the standalone examiner, signed in; Start is enabled (the settings answered by the intercept) | PASS | user id f3651101-d9fa-496e-bc77-5210424a3f04; Start enabled: True; settings requests answered: 1 |
| (c) L presses Start: the microphone request is held unanswered | PASS | microphone requests 1, held 1; tracks handed back 0, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0 |
| (c) L signs out and student M signs up in the second tab, then the microphone answers: the stream is stopped at once, nothing records, no voice session is requested, and the page says the session was closed | PASS | held requests answered after the switch: 1; microphone requests 1, held 0; tracks handed back 1, still live 0; recorders started 0, still recording 0; peer connections made 0, still open 0; sockets other than the dev server's own live-reload one 0; voice session requests: 0; notice shown: True; same page: True |

_screenshot **delayed4-27-examiner-standalone-after-late-microphone.png**: url=`http://localhost:4384/ielts-website/speaking/examiner`, landmark heading="None"_

**Examiner (standalone), first tab:** no console errors, no failed/4xx/5xx requests.

**Examiner (standalone), second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

Every request to the examiner address in this section was answered inside the browser by the run itself: settings with SYNTHETIC values, and every voice session request refused with a SYNTHETIC 503 (at once, or after being held). The 503 lines in the diagnostics above are those refusals. No voice service, model or token service was reached.

### 7, control: the same checks against the examiner as it was before the fix

To show that the checks above would catch the leak, section 7 was also run once against the live
examiner exactly as it stood at commit c99c685 (before this fix). Only the mock exam's copy of the
examiner was swapped, by a dev-server setting kept outside the project that pointed the mock at a
temporary copy of the old file (placed beside the real one under another name for that run only, and
deleted afterwards); the standalone page kept the fixed examiner, and no existing project file was
changed for it. Same stand-in, same interception, same
fake microphone, same students' roles (J, then K signed in on the browser while J's microphone
request was unanswered). Its results were kept out of this file's rows and totals; what it measured
in race (a), after the microphone answered:

| Measured after the late microphone answered | Before the fix (control) | With the fix (rows above) |
|---|---|---|
| Microphone tracks still live | 1 | 0 |
| Recordings started, and still recording | 1, and 1 | 0, and 0 |
| Peer connections made, and still open | 1, and 1 | 0, and 0 |
| Voice session requests sent, and whose sign-in token they carried | 1, carrying **K's** token | 0 |

That is finding R2D-01 reproduced in a real browser: before the fix, a microphone permission
answered after the account changed kept the microphone live and recording behind the mock's stopped
screen and asked for a paid voice session in the name of the student who had just signed in. The
request was intercepted and refused by this run, so nothing reached a voice service. Races (b) and
(c) behaved the same in the control as with the fix: in (b) the mock's own unmount already stopped
the recording and the microphone, and the standalone page of (c) was already protected by R2C-04.

**Totals:** 70 PASS, 0 FAIL.
