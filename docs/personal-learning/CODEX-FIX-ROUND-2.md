# Fix round 2: the three ownership paths from Codex's review of 23 September

This is the specification the fixes are inspected against. It restates the
acceptance criteria from `docs/audits/claude-personal-learning-review-2026-09-23.md`
and names the proof. Base commit for the diff under inspection: `48b1d17`
(the commit Codex reviewed). Everything after it on this branch is the work
of this round, plus the review artifacts themselves and two small hygiene
commits (raw control bytes written as escapes in `src/lib/tutor/schema.ts`;
the browser suite's frozen date replaced by the real clock).

## Finding 1: another student's unfinished test could be submitted into the new account

Requirement. The active test session and the mock exam state are owned by
the student who started them, the same way every other store is. A sitting
in memory is bound to its starting owner and cannot be submitted under a
different owner (sign-out or a switch in another tab while the player is
mounted). A's unfinished work stays A's and is resumable by A. An old
unowned session goes to the anonymous device owner and is never assigned to
a signed-in account automatically.

Acceptance. A starts and answers a drill or paper, signs out; B opens the
same activity and sees none of A's work; B's submissions and the backend
rows for B contain only B's answers. A signs back in and resumes their own
sitting. Owner changes in another tab and while the player is mounted are
covered, not only fresh page loads.

Proof. `tests/test-session-owner.test.ts` (deterministic), the browser
script `tests/browser/f22_unfinished_test_owner.py` against the local
stand-in (`docs/personal-learning/evidence/final/results-unfinished-test.md`),
and Codex's own `docs/audits/claude-review-2026-09-23/independent-browser.py`
rerun against the fixed build.

## Finding 2: a pending sign-in could restore the signed-out student's owner

Requirement. Every continuation after an await in the sign-in path checks
the current sign-in generation before mutating the owner, any store, or any
subscription. A cancelled sign-in leaves both the old and the new stores at
the current owner (anonymous after a sign-out, B after a switch to B).
Cancellation prevents stale state mutations, not only stale network writes.

Acceptance. Delay the initial learning-module load, sign out while it is
pending, release it: both old and new stores stay anonymous with no A data
visible. Switch A to B during startup: every late A continuation leaves B
intact. Codex's `signout-race.mjs` prints the owner anonymous both
immediately after sign-out and after the cancelled sign-in finishes, with no
essay visible.

Proof. `tests/account-isolation.test.ts` (the cancellation cases) and the
rerun of `docs/audits/claude-review-2026-09-23/signout-race.mjs`.

## Finding 3: direct entry or refresh on an exam page recorded signed-in work as anonymous

Requirement. The authenticated owner is established by one app-wide
lifecycle that runs on every learning route, including the full-screen test,
drill and mock exam pages that mount no navigation component. Ownership is
resolved before drafts are loaded, before a sitting is restored and before
any evidence is written. A refresh mid-test keeps the same student's sitting
and its timer. Signed-out use remains valid and records under the anonymous
device owner.

Acceptance. Sign in, open a paper or drill in a new tab by URL, refresh
mid-test, submit: the authenticated account's record and the backend receive
it once; no anonymous record or claim offer contains that signed-in attempt.

Proof. `tests/account-isolation.test.ts` (cold initialisation with a valid
session and no menu mounted), a source-scan test that every page on the bare
layout renders the lifecycle, the browser script
`tests/browser/f21_direct_entry_owner.py` against the local stand-in
(`docs/personal-learning/evidence/final/results-direct-entry.md`), and
Codex's own `direct-exam-owner.py` rerun against the fixed build.

## Proof commands (run by the host, not by the inspector)

```
npm test
npx astro check
npm run build
node --import ./tests/ts-extension-loader.mjs docs/audits/claude-review-2026-09-23/signout-race.mjs
```

The browser scripts need the local stand-in (`node tools/mr-ez-dev-server.mjs`)
and a dev server pointed at it; the recipe is in `tests/browser/README.md`.

## Boundaries the inspector should hold the change to

- No real Supabase project, no deployment, no paid model call, nothing
  pushed or merged.
- No student data deleted: old device-wide keys are adopted, never removed.
- The Writing, Speaking, claim and mobile fixes from the first round must
  remain intact.
- Exam material stays English; every new interface string has Russian.

## Inspection round 1 (fresh Codex session, read-only, 23 September)

Inspected: commit `2eabb37` against this specification, diff from `48b1d17`,
write-capable integrations switched off, model the CLI default (gpt-6-astra,
medium effort), 149 seconds, about 1.1 million input tokens of which 0.97
million cached, 3,000 output tokens. Structured result:
`docs/personal-learning/evidence/codex-inspections/inspection-1-of-2eabb37.json`.

Verdict: REVISE. Four findings, all accepted by the host. Dispositions:

- **R2-01 (high) accepted.** A pre-existing unowned test session was adopted
  into whoever the history migration stamp named, which is a different
  question from who started the test; the spec required the anonymous device
  owner. The builder's own test asserted the wrong rule. Fix: unowned sessions
  and mock state adopt into the anonymous owner only; the case "stamp names A,
  session started by B" is covered.
- **R2-02 (high) accepted, and generalised.** A speaking grade returning after
  the owner changed was recorded under the current owner. The same pattern
  exists for the essay grader and the standalone examiner, so every delayed
  grade is now bound to its starting owner and a cancellation generation, and
  a late grade is kept for the student who earned it rather than written under
  the next one or dropped.
- **R2-03 (medium) accepted.** The stopped mock offered no way back for its
  own student and kept its progress only in memory. Fix: the active mock is
  persisted per owner and resumable only by that owner; B's fresh mock is
  separate.
- **R2-04 (medium) accepted.** The initial owner was read from any Supabase
  token on the origin; GitHub Pages shares one origin across applications.
  Fix: only this application's project token is honoured, and unconfigured
  accounts are anonymous.

A second, fresh inspection follows the fixes, as the skill's inspection budget
allows (two rounds).

## Fixes after inspection round 1 (for inspection round 2)

Base for the round-2 inspection diff is still `48b1d17`. The fixes for the
four findings, each with deterministic tests and a browser journey against
the local stand-in:

- **R2-01** (`ba11669`): an unfinished test or old mock history left by an
  earlier build is adopted once into the anonymous device owner and never
  into a signed-in account; the history migration stamp is not consulted
  (`src/lib/test-session.ts`, `src/lib/tests/mock.ts`, key
  `ielts.unowned.adopted.v1`). The test that asserted the forbidden rule was
  replaced; Codex's case (stamp names A, sitting started by B, A receives
  nothing) is a named test and a step of `f22`.
- **R2-02** (`1a194f8`): every grading request (essay, speaking trainer, live
  examiner alone or inside the mock) is bound at start to the student who
  started it (`bindToCurrentOwner`, `runOwnedGrade` in
  `src/lib/store-owner.ts`); the reply is saved under that student's own
  namespace whoever is signed in by then (`recordWritingGradedFor`,
  `recordSpeakingGradedFor`, `recordWritingAttemptFor`,
  `recordSpeakingAttemptFor`), shown and passed to completion only while that
  student is still on screen and the component still mounted, with a neutral
  notice otherwise. `tests/delayed-grade-owner.test.ts`; browser journey
  `f23` with intercepted synthetic grades, 18 of 18
  (`results-delayed-grade.md`).
- **R2-03** (`ba11669`): a running mock is saved per student (stage, chosen
  papers, prompts, finished papers, essays, the Writing deadline as a fixed
  moment) under `ielts.mock.active.v1`; refresh or navigation keeps it; the
  original student resumes it in the open tab or from a later page; another
  student gets a separate fresh mock and the saved copy is untouched.
  `tests/test-session-owner.test.ts`; `f22` 57 of 57
  (`results-unfinished-test-2.md`).
- **R2-04** (`1a194f8`): the initial owner is read only from this
  application's own session key `sb-<project ref>-auth-token`
  (`authProjectRef`, `configuredAuthSessionKey`; the ref derived from the
  configured URL by the same rule the client library uses and pinned by a
  test); foreign tokens are ignored; unconfigured accounts are anonymous and
  `wireAccount` clears any leftover user owner. Cases in
  `tests/account-isolation.test.ts`.

Follow-up chosen by the host after the round: the explicit "work saved on this
device" claim also carries an unfinished test sitting and a paused mock from
the anonymous owner into the account, re-stamped to the claiming account so
they can be resumed; the account's own sitting wins over the anonymous one.
Once the account holds the copy, the device's anonymous copy is removed, as
every other store already does on a claim (leaving it would let the next
student on the device resume it); the old device-wide key is never touched.

Proof commands for round 2 are unchanged. Additional browser scripts: `f22`
and `f23` need the stand-in (`IELTS_STANDIN_URL`) and a dev server started
with the dedicated `astro.config.f22.mjs` or `astro.config.f23.mjs` (their
headers say why: a second dev server against this checkout needs its own Vite
cache and must not watch the evidence folders).

## Inspection round 2 (fresh Codex session, read-only, 23 September)

Inspected: commit `3fec8f4` against this specification, diff from `48b1d17`,
same settings as round 1, 188 seconds. Structured result:
`docs/personal-learning/evidence/codex-inspections/inspection-2-of-3fec8f4.json`.

Verdict: REVISE. Codex confirms the delayed-grade paths are closed and finds
three remaining defects, all accepted by the host:

- **R2B-01 (high) accepted.** The essay editor binds its owner only at
  submit, so an essay typed by A could be submitted by B after a switch, and
  the draft autosave resolves the owner when its timer fires. Fix: the editing
  session and every draft write are bound to the owner who starts or restores
  the essay; an owner change preserves that owner's draft, cancels pending
  draft timers and replaces the editor with the new owner's state; submission
  of an essay whose editing owner is no longer current is refused.
- **R2B-02 (medium) accepted.** An account change during the mock's speaking
  leg unmounts the examiner, whose cleanup reports a deliberate cancellation,
  so the mock advances to results and clears its saved sitting; the original
  student cannot resume. Fix: suspension by an owner change is distinguished
  from a deliberate cancellation; the mock never advances on suspension and
  resumes at the speaking brief.
- **R2B-03 (medium) accepted.** A mock's legs share the single per-owner
  standalone session slot, so another paper started mid-mock overwrites the
  leg and a new mock can restore an older sitting because the player matches
  on paper id only. Fix: mock legs (answers, deadlines, sitting identity) are
  persisted under the mock sitting's own identity, separately from standalone
  sessions; the player restores, saves, clears and reconciles by that identity;
  a new mock creates fresh legs; resuming restores only that mock's legs.

The skill's default inspection budget is two rounds. At Alex's standing
instruction to run this loop with Codex directly, the host extends it by one:
a third fresh inspection follows these fixes.

## Fixes after inspection round 2 (for inspection round 3)

Base for the round-3 inspection diff is still `48b1d17`. All three fixes are
in `b10fc10`, each with deterministic tests and a browser journey against the
local stand-in (no grader and no model called):

- **R2B-01** (`src/components/writing-editor-owner.ts`, `WritingTester.tsx`):
  the essay on screen is an editing session bound to the owner on the page
  when the essay is started or restored, and never re-resolved. Every draft
  write carries that owner and lands under that owner's key however late the
  600 ms timer fires. An owner change (this tab's menu or another tab) writes
  the outgoing student's latest text to their own draft at once, cancels the
  pending timer, and hands the editor over to the incoming student's own
  draft of the same prompt, or nothing, with a one-line notice. A submission
  is accepted only from a session whose owner is still the one on the page;
  otherwise nothing is sent, graded or recorded (`claimSubmission`). A grade
  in flight when the page changes hands is still kept for the student who
  submitted it, and the screen lets go of it at once. Nine new cases in
  `tests/delayed-grade-owner.test.ts` (switch before submit, switch inside the
  debounce with the timer firing late, switch back, same-owner refresh,
  signed-out essay then sign-in, discard, late grade after a hand-over, source
  scan); `f23` sections 3 and 4, 37 of 37 (`results-delayed-grade-2.md`).
- **R2B-02** (`LiveExaminer.tsx`, `MockExam.tsx`, `src/lib/tests/mock.ts`):
  the examiner binds the student it opened for and, on an unmount before it
  reported anything, reports `onSuspend` when that student is no longer on the
  page and `onAbort` otherwise; nothing is reported twice. The mock treats a
  suspension (and any cancellation arriving while its own student is away,
  `speakingExitFor`) by going back to the speaking brief with nothing skipped
  and nothing recorded, and its saved sitting untouched; its own student
  resumes at the brief with a note that the interview was interrupted. A
  deliberate Back on the examiner's own error screen still skips Speaking and
  goes to results. Covered during the interview and during grading in
  `tests/test-session-owner.test.ts`; `f22` step 11 in the browser (the
  examiner is pointed at a stand-in path that answers not found, so it stops
  on its own error screen before any microphone or session; the grading-time
  case is deterministic only).
- **R2B-03** (`mock.ts`, `src/lib/test-session.ts`, `TestPlayer.tsx`,
  `MockExam.tsx`): each mock sitting has its own `sittingId`, and its
  Listening and Reading legs (answers, deadline, result) are kept in
  `legSittings` inside that sitting's record under `ielts.mock.active.v1`,
  never in the standalone slot. The player takes a `mockSitting` reference and
  restores, saves and finishes the leg through `mockLegSitting`, or through
  `standaloneSitting` when opened on its own; the two cannot overwrite or pick
  up each other. The record is written before the first player mounts, with a
  fresh identity and empty legs, so a new mock on the same paper and mock id
  starts empty; resuming restores only that sitting's legs; "is this leg
  done" reads the leg's own result rather than the history by paper id
  (`legFinishedSince` removed). Sittings saved before this get an id derived
  from their mock id and start time. The claim re-stamp carries the legs
  because they live in the same record (a test proves it). `f22` step 12, 83
  of 83 overall (`results-unfinished-test-3.md`).

Known consequences, stated rather than hidden: a mock leg abandoned by
starting a fresh mock is no longer written to the learning history as an
abandoned attempt (before, the next standalone page did that because the leg
sat in the shared slot); mocks paused by the earlier, never-deployed build
keep their Listening and Reading answers in the old shared slot and those are
not carried over. New interface strings: two on the essay editor and one on
the speaking brief, each with Russian.

Proof commands are unchanged. Gates at `b10fc10`: `npm test` 1822 of 1822,
`npx astro check` 0 errors and 0 warnings, `npm run build` 661 pages, the
learning index byte-identical, Codex's `signout-race.mjs` printing anonymous
both times.

## Inspection round 3 (fresh Codex session, read-only, 23 September)

Inspected: commit `7c5264a` against this specification, diff from `48b1d17`,
same settings as rounds 1 and 2, 170 seconds, about 1.2 million input tokens
of which 0.97 million cached. Structured result:
`docs/personal-learning/evidence/codex-inspections/inspection-3-of-7c5264a.json`.

Verdict: REVISE. Codex finds the round-2 fixes "substantially implemented"
and names four remaining edge cases, all accepted by the host:

- **R2C-01 (medium) accepted.** The late grade's keep step clears the
  submitter's draft of that prompt unconditionally. A submits, signs out and
  back in before the grade returns, revises the restored essay; when the
  older grade arrives it deletes the revision, and a reload loses it. Fix:
  draft deletion is tied to the submitted revision; a newer revision by a
  later editing session (including one still waiting on the debounce) is
  preserved.
- **R2C-02 (medium) accepted.** Leg writes check the sitting id, but the
  mock screen's own snapshot writes and its clear do not: a different sitting
  id is treated as an authorised replacement, and the clear checks only the
  owner. A with mock M1 open in Writing who starts M2 in another tab
  replaces M2 (legs included) by typing in M1, and finishing M1 can delete
  M2. Fix: explicit creation or replacement is separated from ordinary
  updates; ordinary saves and clears must match both owner and sitting id;
  a mounted mock whose stored sitting was replaced stops and never writes
  again.
- **R2C-03 (medium) accepted.** When the sitting's own student returns to a
  still-mounted paper after an owner change, the timer resumes from the
  frozen count instead of the saved deadline, so time away is granted back;
  a refresh of the same sitting finds it expired. Fix: the saved deadline is
  the timer's only authority, including after an owner change and before a
  submission is accepted; an expired sitting is handled as on a fresh load
  with no extra time.
- **R2C-04 (high) accepted.** The speaking trainer binds its owner but does
  not suspend the recording or the question sequence when the owner changes:
  B can keep answering on the still-mounted trainer and the combined
  recording becomes A's evidence. Fix: the attempt is suspended the moment
  the owner changes (capture stopped, pending turns cancelled, no later
  answer joins it); an unfinished recording is dropped and never graded; a
  grade already requested is still kept for A; the standalone live examiner
  ends its session the same way.

At Alex's standing instruction to run this loop with Codex directly until it
converges, a fourth fresh inspection follows these fixes.

## Fixes after inspection round 3 (for inspection round 4)

Base for the round-4 inspection diff is still `48b1d17`. All four fixes are
in `b3a2689`, each with deterministic tests and a browser journey against the
local stand-in (no grader and no model called):

- **R2C-01** (`src/components/writing-editor-owner.ts`, `WritingTester.tsx`):
  a late report removes its student's draft of the prompt only while the
  draft still holds exactly the text that was graded
  (`clearSubmittedEssayDraft`); any other text is a later revision and stays.
  The text itself is compared rather than a stored revision number, because
  the question is "does the history now hold what this draft holds", which
  the comparison answers with nothing new stored and nothing to migrate. A
  revision still waiting on the 600 ms autosave survives: the stored copy
  still equals the submission when the report lands, so it is removed, and
  the pending write then lands with the revision. The one other write on the
  student's behalf, putting a submitted essay back after a failed request,
  now happens only when the student has no draft of the prompt at all
  (`restoreEssayDraft`), so it cannot overwrite a revision either. Four new
  cases in `tests/delayed-grade-owner.test.ts`; `f23` section 5 in the
  browser (revise after returning, reload, history holds the original
  report).
- **R2C-04** (`src/components/speaking-attempt-owner.ts`, new;
  `SpeakingTester.tsx`; `LiveExaminer.tsx` standalone path only): a speaking
  attempt is bound to the owner on the page when it starts and is suspended
  for good the moment that owner is no longer on the page. It listens for
  owner changes and also asks before every question, every recording start,
  every accepted clip and the grading call, and its timers (answer clock,
  prep countdown, automatic advance) re-check the owner on every tick, so a
  change that sent no notification is caught at the next step. On
  suspension the microphone is released, the recorder stopped, timers and
  pending steps cancelled, unsent answers dropped, nothing graded (grading is
  paid) and nothing recorded (an unfinished attempt is no evidence and is
  the one piece of A's work that could carry B's voice); the trainer returns
  to its menu with one neutral line. Grading that had already begun before
  the switch goes on and is kept for the first student through
  `runOwnedGrade`, shown to nobody; a report on screen leaves it; a failed
  request can be retried only by the same student. The standalone live
  examiner (full test and drills) uses the same helper: at a switch it closes
  the voice session, stops and empties the recorder, releases the microphone,
  clears every clock, and grades and records nothing. The mock embed's
  examiner is untouched (a test pins its suspend path). Ten new cases and
  three source scans in `tests/delayed-grade-owner.test.ts`; `f23` section 6
  in the browser with a fake microphone (recorder told to stop about 40 ms
  after the sign-out in the other tab, microphone released, no grading
  request, nothing recorded for either student), 56 of 56 overall
  (`results-delayed-grade-3.md`). The standalone examiner cannot be started
  on the stand-in, so it is covered deterministically only, and the results
  file says so. One bug outside the finding was fixed on the way: an answer
  that ran out of time, rather than being stopped by hand, was labelled with
  the previous question and the same question was asked again.
- **R2C-02** (`src/lib/tests/mock.ts`, `MockExam.tsx`): a sitting is put
  in place of an older one only by Start Mock Exam (`beginActiveMock`; the
  developer shortcut goes through the same path). Every other save
  (`saveActiveMock`, now strict) and the clear (`clearActiveMock`, now taking
  the sitting reference and reporting whether it removed anything) must
  match both the student and the sitting id of the stored record, or write
  nothing. A tab whose sitting was replaced stops for good: it notices
  through the other tab's save (`isActiveMockStorageKey`, the storage event)
  or, failing that, when its own save or finish is refused
  (`mockSittingReplaced`); from then on it records nothing, clears nothing
  and no longer warns about leaving the page, on the existing stopped screen
  with one new sentence. An account change is not a replacement and keeps
  its own stopped screen. The explicit claim still carries the sitting id
  and the legs, and the account's later saves match it. Seven new cases and
  one updated case in `tests/test-session-owner.test.ts` (the two headline
  cases were confirmed by putting the old code back: M1's keystroke
  overwrote M2 and finishing M1 deleted it); `tests/account-isolation.test.ts`
  now creates its paused mock the one allowed way. `f22` step 13 in the
  browser, including simulated missed-notice cases.
- **R2C-03** (`src/lib/test-session.ts`, `TestPlayer.tsx`): the saved
  deadline is the clock's only source (`paperClockAt`; `secondsLeft` takes an
  optional moment). Every tick, the student's return to the still-open page
  and the hand-in all read the time from it, so time away or in a background
  tab is never handed back. A deadline that passed while the student was
  away hands the paper in at once with the saved answers and the full paper
  time recorded, the same path an expired sitting takes on a fresh load.
  Mock legs were already right here (the mock takes the paper off screen at
  an account change and restores it through the fresh-load path). Five new
  cases with a fake clock and a source check in
  `tests/test-session-owner.test.ts`; `f22` step 14 in the browser (ahead,
  past, and a plain time-up; with the old code the page showed 145 seconds
  where the deadline left 104, then sat at 00:14 without handing in). 107 of
  107 overall (`results-unfinished-test-4.md`).

A pre-existing bug was fixed in the same rewrite, and it matters beyond this
round: when a paper ran out of time, the player handed it in with the answers
as they were when the timer started, usually none, so anything typed after
that was lost. The timer now hands in this render's answers. The published
main branch carries the old timer; a note for Alex follows in the report.

Two same-student gaps the builder found are NOT fixed by these commits and
are named here so the inspector sees them: (1) a standalone paper opened in a
second tab replaces the first tab's sitting, and the first tab keeps writing
into, and on submit clears, the second's slot (the mock's must-match rule
would fix it); (2) a mock whose record disappears (finished, abandoned or
claimed in another tab) is not stopped and can be recorded twice from the
stale tab. Both were the case before this round.

Proof commands are unchanged. Gates at `b3a2689`: `npm test` 1848 of 1848,
`npx astro check` 0 errors and 0 warnings, `npm run build` 661 pages, the
learning index byte-identical, Codex's `signout-race.mjs` printing anonymous
both times.
