# When the account changes on an open page: whose grade, and whose essay

Run on 2026-09-23 against a DEV server at http://localhost:4384/ielts-website, with the free local
accounts stand-in (`node tools/mr-ez-dev-server.mjs`) at http://127.0.0.1:8831. Both were started for
this run and stopped afterwards. This is NOT the frozen production snapshot the `results.md`
suite uses, and it is NOT a real Supabase project: nothing below is evidence about one.

It is the browser half of four fixes. Sections 1 and 2: finding R2-02 of the second Codex
inspection, a grade that came back after the owner changed was written under whoever was signed in
by then. Sections 3 and 4: finding R2B-01 of the second fresh Codex inspection, the essay editor
itself was nobody's, so a student who took over the page could submit the previous student's text,
and a switch inside the 600 ms draft autosave saved it under the newcomer. Section 5: finding R2C-01
of the third Codex inspection, a late grade deleted the draft its student had revised since
submitting. Section 6: finding R2C-04 of the same inspection, a speaking attempt went on after the
page changed hands, so a second student could answer the first student's remaining questions. The
deterministic half of all of them is `tests/delayed-grade-owner.test.ts`.

**What this run does not cover, and where it is covered instead.** The standalone live examiner
(`/speaking/examiner`, and the live drills) now ends its voice session the moment the page changes
hands (R2C-04), but it cannot be started here: it needs a paid voice session, and the stand-in has
none. Its suspension is proven only by `tests/delayed-grade-owner.test.ts`, section 7: the same
attempt object the speaking trainer uses (asked before every stage, suspended at the switch, its
clocks cleared, nothing graded) and a source scan of how the examiner uses it (the voice session
closed, the recorder stopped and emptied, the microphone released, every clock cleared, and the mock
exam's own embedded path left as it was).

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
| Student A signed up on the local stand-in | PASS | user id 4fe9ec33-ea23-4112-9d45-df5e6b56847c |
| A's grading request went out and is being held (nothing reached any grader) | PASS | held=1, request body carries A's essay: True |

_screenshot **delayed3-01-essay-grading-held-for-a.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| B is signed in on the same page, never reloaded, while A's essay is still being graded | PASS | user id 47a7aea7-3dc4-4a27-96e8-b4965190ad6c, menu identity 'synthetic-student-b-f23-134739@example.test', request still held: True, same page as the submission (no reload): True |

_screenshot **delayed3-02-essay-b-signed-in-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The page B is using says the attempt went elsewhere, and shows none of A's result or essay | PASS | notice shown: True; synthetic report text on screen: False; A's essay still in the text box: False; same page: True |

_screenshot **delayed3-03-essay-grade-arrived-b-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| A's essay and its grade are kept in A's own history on this device | PASS | A's writing rows for the prompt: 1, band [7]; A's record: ['write:pte-wt-132-task2'] |
| Nothing of A's essay is under B, or under anybody but A, on this device | PASS | B's writing rows for the prompt: 0; B's record: []; keys carrying A's essay: ['ielts.progress.v1::u:4fe9ec33-ea23-4112-9d45-df5e6b56847c'] |
| B's account on the stand-in received nothing of A's | PASS | B's user_state carries A's essay: False; B's events: [] |
| A signs back in and finds the essay in their own writing history | PASS | signed in as 4fe9ec33-ea23-4112-9d45-df5e6b56847c; history lists the prompt: True |

_screenshot **delayed3-04-essay-a-back-finds-it.png**: url=`http://localhost:4384/ielts-website/trainers/writing`, landmark heading="None"_
| It reached A's own account on the stand-in once A was signed in again | PASS | A's user_state carries the essay: True; A's events: ['write:pte-wt-132-task2'] |
| B's account still holds nothing of A's after A's sync | PASS | B's user_state carries A's essay: False |

**Writing failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 2. Speaking: C's recorded answer is graded after C signed out and D signed in

The speaking trainer (the recorded checker, which is what /trainers/speaking shows when the live examiner is not configured) opens a Part 2 cue card by its exact link. C records a few seconds through the browser's FAKE microphone (a test tone, no real voice). The grading request is held; C signs out and D signs up on the same page; then it is answered.

| Check | Result | Observed |
|---|---|---|

Before this section a signed-out warm-up recording went through the same page and its grading request was answered with a synthetic failure, so nothing was graded or recorded. It exists because the dev server prepares the MP3 encoder on first use and reloads the page when it has, which on the first run of this script landed in the middle of the account switch.
| Student C signed up on the local stand-in | PASS | user id 88c16e81-bb27-4f8d-ad48-23cead7cb8cd |
| C's recorded answer went out for grading and is being held (nothing reached any grader) | PASS | held=1 |

_screenshot **delayed3-05-speaking-grading-held-for-c.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| D is signed in on the same page, never reloaded, while C's answer is still being graded | PASS | user id d6cb796c-34d8-410e-8837-e0c89d980efb, request still held: True, same page (no reload): True |
| The page D is using says the attempt went elsewhere, and shows none of C's result | PASS | notice shown: True; synthetic report text on screen: False; same page: True |

_screenshot **delayed3-06-speaking-grade-arrived-d-sees-notice.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=2&card=p2-journey`, landmark heading="None"_
| C's speaking grade is kept in C's own history on this device | PASS | C's speaking rows: 1, band [6]; C's record: ['speak:p2-journey'] |
| Nothing of C's answer is under D on this device | PASS | D's speaking rows: 0; D's record: [] |
| D's account on the stand-in received nothing of C's | PASS | D's events: []; D's user_state carries C's cue card: False |
| C signs back in and the grade reaches C's own account on the stand-in | PASS | signed in as 88c16e81-bb27-4f8d-ad48-23cead7cb8cd; C's events: ['speak:p2-journey']; C's user_state carries the cue card: True |

_screenshot **delayed3-07-speaking-c-back-account.png**: url=`http://localhost:4384/ielts-website/account`, landmark heading="Account & progress"_

**Speaking failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 3. The essay editor belongs to the student who started it (Codex R2B-01)

Student E opens a Task 2 essay in the first tab and types. From a SECOND tab of the same browser, E signs out and student F signs up. The first tab is never reloaded by the script. F must get an empty editor and must not be able to send E's text; E's text must stay in E's own draft; E, signing back in, must find it and be able to submit it.

| Check | Result | Observed |
|---|---|---|
| Student E signed up on the local stand-in | PASS | user id 95d8459a-1b4e-44b3-be90-3740fbeb2694 |
| E's essay is on screen and kept as E's own draft | PASS | ielts.writing.draft.v1::u:95d8459a-1b4e-44b3-be90-3740fbeb2694::pte-wt-132-task2 carries E's essay: True |

_screenshot **delayed3-08-editor-e-typing.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs out in the second tab: the first tab's editor empties itself and says the account changed | PASS | E's essay still in the text box: False; note shown: True; same page (no reload): True |
| F signs up in the second tab: the first tab's editor is F's now, empty, with the note, never reloaded | PASS | user id 13a001eb-f335-47da-b2e6-7f69af128a49; text box empty: True; note shown: True; E's essay anywhere on the page: False; same page: True |
| F cannot submit E's text: the text box is empty and 'Check my essay' is disabled | PASS | text box empty: True; button disabled: True |

_screenshot **delayed3-09-editor-f-empty-after-switch.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request left either tab after the switch, even with the button pressed by force | PASS | grading requests seen: 0 |
| F opening the same task in the second tab also gets an empty editor | PASS | text box empty: True |
| E's essay is still in E's own draft, and in no other key on this device | PASS | keys carrying E's essay: ['ielts.writing.draft.v1::u:95d8459a-1b4e-44b3-be90-3740fbeb2694::pte-wt-132-task2'] |
| F types an essay of their own in the first tab, and it is kept as F's own draft | PASS | ielts.writing.draft.v1::u:13a001eb-f335-47da-b2e6-7f69af128a49::pte-wt-132-task2 carries F's essay: True, E's: False |
| E signs back in (second tab): the first tab's editor shows E's own draft again, never reloaded | PASS | signed in as 95d8459a-1b4e-44b3-be90-3740fbeb2694; E's essay in the text box: True; F's: False; same page: True |
| F's essay stays in F's own draft, untouched by E's return | PASS | keys carrying F's essay: ['ielts.writing.draft.v1::u:13a001eb-f335-47da-b2e6-7f69af128a49::pte-wt-132-task2'] |

_screenshot **delayed3-10-editor-e-back-finds-draft.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E submits the restored essay: the request carries E's text and nothing of F's (held, reaches no grader) | PASS | held: True; carries E's essay: True; carries F's: False |
| E's report shows (synthetic reply) and the attempt is kept in E's history only; E's draft is cleared | PASS | report on screen: True; E's rows: 1; F's rows: 0; E's draft still there: False |

_screenshot **delayed3-11-editor-e-report.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_

## 4. A switch inside the 600 ms autosave wait (Codex R2B-01)

E types in the first tab and, within the 600 ms the autosave waits for typing to pause, signs out from the second tab (its account menu already open, so the click is immediate). The page itself records when the last keystroke landed and when the editor was handed over, so the timing below is measured, not assumed. Before the fix, the autosave fired after the switch and saved E's latest text under whoever had just taken over.

| Check | Result | Observed |
|---|---|---|
| The switch landed inside the 600 ms autosave wait (measured in the page) | PASS | last keystroke to hand-over: 61 ms, on attempt 1 |
| E's latest text, typed just before the switch, is saved under E | PASS | ielts.writing.draft.v1::u:95d8459a-1b4e-44b3-be90-3740fbeb2694::pte-wt-132-task2 carries the latest text: True |
| Nothing of it is saved under the signed-out device owner or anybody else, even after the wait ran out | PASS | keys carrying E's text: ['ielts.writing.draft.v1::u:95d8459a-1b4e-44b3-be90-3740fbeb2694::pte-wt-132-task2']; draft keys for this task: ['ielts.writing.draft.v1::u:13a001eb-f335-47da-b2e6-7f69af128a49::pte-wt-132-task2', 'ielts.writing.draft.v1::u:95d8459a-1b4e-44b3-be90-3740fbeb2694::pte-wt-132-task2'] |
| The first tab's editor emptied at the switch and says the account changed | PASS | E's text still in the text box: False; note shown: True |

_screenshot **delayed3-12-debounce-switched-mid-wait.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| E signs back in and the first tab's editor shows the latest text E typed before the switch | PASS | latest text in the text box: True |

_screenshot **delayed3-13-debounce-e-back-latest-text.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| No grading request went out during either switch | PASS | grading requests seen in the first tab: 1 (the one E sent in section 3) |

**Editor, first tab:** no console errors, no failed/4xx/5xx requests.

**Editor, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 5. A late grade leaves a later revision alone (Codex R2C-01)

Student G submits an essay; the grading request is held. G signs out and back in from the avatar menu of the SAME page, gets the submitted essay back in the editor, and revises it; the revision autosaves. Only then is the held request answered. Before the fix, that older grade deleted G's draft, so a reload lost the revision.

| Check | Result | Observed |
|---|---|---|
| Student G signed up on the local stand-in | PASS | user id ec517987-7d56-455e-8c0d-dc3860d1b814 |
| G's grading request went out and is being held (nothing reached any grader) | PASS | held=1; request carries G's essay: True |

_screenshot **delayed3-14-revision-g-grading-held.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G signs out and back in on the same page: the submitted essay is back in G's editor, grade still held | PASS | signed in as ec517987-7d56-455e-8c0d-dc3860d1b814; essay in the text box: True; request still held: True; same page (no reload): True |
| G revises the essay and the revision autosaves as G's draft | PASS | ielts.writing.draft.v1::u:ec517987-7d56-455e-8c0d-dc3860d1b814::pte-wt-132-task2 carries the revision: True |

_screenshot **delayed3-15-revision-g-revised-while-grading.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| The earlier grade arrives: it is kept in G's history (the original essay), and not painted over the editor | PASS | G's writing rows: 1; row is the original essay: True; G's record: ['write:pte-wt-132-task2']; report text on screen: False; same page: True |
| G's draft still holds the revision after the earlier grade was kept (before the fix it was deleted here) | PASS | ielts.writing.draft.v1::u:ec517987-7d56-455e-8c0d-dc3860d1b814::pte-wt-132-task2 carries the revision: True; revision in the text box: True |

_screenshot **delayed3-16-revision-grade-arrived-revision-kept.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| After a reload the editor opens G's revision | PASS | revision in the text box: True; the page really was reloaded: True |
| G's writing history on the page lists the graded attempt | PASS | history lists the prompt: True |

_screenshot **delayed3-17-revision-after-reload.png**: url=`http://localhost:4384/ielts-website/trainers/writing?task=pte-wt-132-task2`, landmark heading="None"_
| G's account on the stand-in received the original essay's grade, and never the unsubmitted revision | PASS | G's events: ['write:pte-wt-132-task2']; user_state carries the essay: True, the revision: False |
| Exactly one grading request left the page | PASS | grading requests seen: 1 |

**Revision failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

## 6. A speaking attempt stops the moment its student leaves (Codex R2C-04)

Student H opens a Part 1 topic on the speaking trainer (the recorded checker) by its exact link, answers question 1 through the browser's FAKE microphone (a test tone, no real voice), and is recording question 2 when H signs out and student I signs up in a SECOND tab of the same browser. Before the fix the first tab carried on: I could answer the remaining questions, and the whole recording was then graded as H's.

| Check | Result | Observed |
|---|---|---|
| Student H signed up on the local stand-in | PASS | user id f75c248c-b860-43dc-ba8b-2d693fbb9848 |
| H answered question 1 and is recording question 2 through the fake microphone | PASS | question 2 on screen: True; recorders started: 2, recording now: 1; live microphone tracks: 1 |

_screenshot **delayed3-18-speaking-h-recording-question-2.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| H signs out in the second tab: the first tab's recording stops and its microphone is released at once | PASS | recording now: 0; live microphone tracks: 0; recorder told to stop 40 ms after the sign-out click (the other tab hears of it through the browser's shared storage); same page (no reload): True |
| The first tab is back at its menu with the one-line notice, and nothing of the attempt is left on it | PASS | notice shown: True; question 2 still on screen: False; answer buttons left: 0 |

_screenshot **delayed3-19-speaking-stopped-at-switch.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| I signs up in the second tab: the first tab shows I no attempt and no way to answer H's remaining questions | PASS | user id 27cc0697-4976-4d07-ab5f-3c0ce70cf701; question 2 or 3 on screen: False; recording now: 0; live microphone tracks: 0; same page: True |

_screenshot **delayed3-20-speaking-i-sees-no-attempt.png**: url=`http://localhost:4384/ielts-website/trainers/speaking?part=1&topic=p1-work`, landmark heading="None"_
| No grading request left either tab (nothing was graded or paid for) | PASS | grading requests seen: 0 |
| Nothing from the attempt was recorded for H, or for I, on this device | PASS | H's speaking rows: 0; I's: 0; H's record: []; I's record: [] |
| Nothing from the attempt reached H's or I's account on the stand-in | PASS | H's events: []; I's events: [] |
| H signs back in (second tab): the stopped attempt does not come back to life, and nothing records | PASS | signed in as f75c248c-b860-43dc-ba8b-2d693fbb9848; question 2 on screen: False; recording now: 0; grading requests: 0; same page (no reload): True |

**Speaking switch, first tab:** no console errors, no failed/4xx/5xx requests.

**Speaking switch, second tab failed/4xx/5xx requests:** FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED); FAILED http://127.0.0.1:8831/auth/v1/logout?scope=global (net::ERR_ABORTED)

**Totals:** 56 PASS, 0 FAIL.

## How this run was made, and the two runs before it

The dev server used the f23 config (its own Vite dependency cache, and no watching of `docs/`,
`tests/`, `.codex/` and `graphify-out/`) with five more files left unwatched: `src/lib/tests/mock.ts`,
`src/lib/test-session.ts`, `src/components/MockExam.tsx`, `src/components/TestPlayer.tsx` and
`src/lib/i18n/dict/ru/tests-player.ts`. Another builder was editing exactly those files in the same
checkout during the run, and none of them is part of what this script proves.

This file is from the third attempt. The first two stopped at the very last step of section 6,
after every row above it had passed: the script tried to sign H back in from the second tab while
student I was still signed in there, so the sign-in form never opened (a mistake in the script,
fixed by signing I out first). In the first attempt an edit to `TestPlayer.tsx` by the other
builder also reloaded the dev server's pages near the end, which is why those files are no longer
watched. The last row of section 6 now also checks that the first tab was never reloaded.

Run with `PYTHONIOENCODING=utf-8 python tests/browser/f23_delayed_grade_owner.py` (its defaults
are this run's ports, results file and screenshot prefix).
