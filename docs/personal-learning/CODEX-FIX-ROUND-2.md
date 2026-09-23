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

## Inspection round 4 (fresh Codex session, read-only, 23 September)

Inspected: commit `1701b97` against this specification, diff from `48b1d17`,
same settings as the earlier rounds, 265 seconds. Structured result:
`docs/personal-learning/evidence/codex-inspections/inspection-4-of-1701b97.json`.

Verdict: REVISE. Three findings, all accepted by the host. Two of them are
the same-student two-tab gaps the previous section named, which were already
being closed when the inspection ran; Codex adds a requirement to each.

- **R2D-01 (high) accepted.** In the mock embed the examiner's startup
  continuations are not guarded against the component having been taken off
  screen: a microphone permission or a connection that resolves after the
  unmount is installed and started anyway, and a token is fetched for the
  account now on the browser, which can leave microphone capture and a paid
  session running behind the stopped screen. Cancelling the session binding
  only hides the eventual grade. Fix: both embedded and standalone startup
  capture a session generation and the owner binding; after every await a
  cancelled, unmounted or changed-owner session releases a newly returned
  stream, closes a late connection and starts nothing; the same guard runs
  before grading after an asynchronous shutdown; grades already requested
  before the suspension are preserved.
- **R2D-02 (medium) accepted.** The standalone two-tab gap: saves and the
  clear of the standalone slot check only the owner, the standalone sitting
  carries no identity, and the player records submission evidence before it
  finishes the sitting. Fix: standalone sittings get their own identity;
  updates and completion require owner, paper and sitting identity to match;
  a stale player stops when its sitting is replaced or removed; completion is
  validated before any evidence is recorded.
- **R2D-03 (medium) accepted.** The missing-record gap: a sitting whose
  record is gone is not treated as replaced, the results step ignores a
  refused clear, and the mock history write appends unconditionally, so two
  tabs resuming the same mock can record it twice. Fix: the disappearance of
  a persisted sitting is terminal for the stale tab; results are recorded
  only after a successful, identity-checked finalisation; mock history writes
  are idempotent by sitting id.

A fifth fresh inspection follows the fixes.

## Fixes after inspection round 4 (for inspection round 5)

Base for the round-5 inspection diff is still `48b1d17`. All three fixes are
in `222feb6`, each with deterministic tests and a browser journey against the
local stand-in (no grader, model or voice service called):

- **R2D-01** (`src/components/LiveExaminer.tsx`,
  `src/components/speaking-attempt-owner.ts` additions): every session start,
  embedded or standalone, is numbered (`sessionGenerations`) and tied to the
  student who pressed Start (`guardSessionStart`). The start waits on four
  things, the examiner's settings, the microphone permission, the sign-in
  token and the voice connection, and after each one checks that it is still
  the screen's latest start, the screen is still mounted and the same student
  is on the page. If any check fails the start lets go: a microphone that
  arrives late has its tracks stopped (`stopStream`), a connection that comes
  up late is closed (`closeConnection`), and no recording, token fetch or
  connection follows; a failure arriving after the screen let go is ignored.
  Every teardown (unmount, account switch, the student's own Back, a newer
  start) makes a waiting start stale, and the connection's own messages and
  later waits are checked too, so a let-go session cannot end, time or add
  audio to a newer one. Before grading, the session is checked once more
  after its shutdown: a switch or unmount during shutdown means no paid
  grading call (a deliberate change: such an interview used to be graded and
  kept), while a grade already requested is still kept for its student. The
  mock's onSuspend and onAbort reporting is unchanged and still pinned.
  Fourteen new cases and a source scan in `tests/delayed-grade-owner.test.ts`
  (removing the checks fails nine; keeping only the start number fails four;
  keeping only the student check fails one; not releasing what arrives late
  fails six); `f23` section 7 in the browser with a fake microphone and the
  voice-session request intercepted: the microphone request held while J
  signs out and K signs up, the session request held then refused with a
  synthetic failure, and the standalone page the same way, counting the
  page's tracks, recorders, connections and sockets each time, 70 of 70
  overall (`results-delayed-grade-4.md`). A comparison run against the
  pre-fix examiner, recorded in that file outside its totals, showed the
  late microphone staying live and recording and a session request going out
  carrying K's token; with the fix all of those are zero.
- **R2D-02** (`src/lib/test-session.ts`, `TestPlayer.tsx`): every standalone
  sitting gets its own identity when it starts (`sittingId`; a sitting saved
  by an earlier build is named by its paper and start moment,
  `sittingRefOf`). Only Start test, or a retake starting, may replace the
  stored sitting; every other save and the clear after handing in must match
  the same student, paper and sitting or write nothing (`saveAnswers` and
  `clearSession` take the sitting; `clearSession` reports whether it removed
  anything). A mounted paper stops for good when its sitting is replaced or
  removed, noticing through the storage event (`isTestSessionStorageKey`) or
  its own refused save (`standaloneSittingStatus`, `sittingLossFrom`); the
  stop screen shows the paper's title, one sentence for the replaced case and
  one for the submitted-or-closed case, and a Back link. Handing in first
  finishes and clears this exact sitting (`PaperSittingStore.finish`,
  returning a `PaperFinish`) and records the attempt in the progress history
  and the learning evidence only after that succeeded; a stale tab records
  nothing anywhere. The same paper open twice still shares its sitting while
  both tabs are live, but once one tab hands it in the other stops instead
  of recording it a second time. A sitting the browser never managed to save
  (full or blocked storage) is recorded without the clear-first step, since
  there is nothing to clear and no other tab can hold it; that is the one
  deliberate departure from Codex's wording. Opening any other paper's page
  still marks the stored paper abandoned in the learning history as before.
- **R2D-03** (`src/lib/tests/mock.ts`, `MockExam.tsx`, `TestPlayer.tsx`): a
  tab that had seen its sitting saved and finds the record gone (finished, or
  claimed into an account, in another tab) stops with its own sentence and
  never writes again (`mockSittingStatus`); the replaced case keeps its
  sentence. The results step clears this exact sitting first and records the
  mock only after that succeeded. The mock history takes one record per
  sitting: `MockAttempt` carries the `sittingId`, a second record of the same
  sitting is refused without duplicating or replacing the first, older rows
  without an id are left untouched, and the mock's learning event is written
  only when the history write succeeded. A mock paper that finds its sitting
  lost tells the mock screen through `onSittingLost`, which stops the whole
  sitting. A sitting that was never saved never counts as lost. Not covered,
  and stated: two tabs on the same mock sitting and the same paper can each
  hand that paper in (the mock itself is still recorded once). Sixteen new
  cases in `tests/test-session-owner.test.ts` (each fix was removed in turn
  to confirm the cases catch it); `f22` steps 15 and 16 in the browser, 131
  of 131 overall (`results-unfinished-test-5.md`). Three new sentences, each
  with Russian.

One window the R2D-01 builder found in files it did not own is being closed
in a follow-up commit before the fifth inspection: inside the live-session
setup (src/lib/speaking/live/), the connection is prepared for up to ten
seconds and then the request that creates the paid voice session is sent,
with no check for an account change in between; a switch in that window
still lets the request out, and the session is then closed the moment it
comes up. The follow-up adds a may-I-continue check right before that
request and before the Gemini socket.

Proof commands are unchanged. Gates at `222feb6`: `npm test` 1878 of 1878,
`npx astro check` 0 errors and 0 warnings, Codex's `signout-race.mjs`
printing anonymous both times; the build is rerun at the final commit.

The window inside the live-session setup named above is closed in `b7b083a`
(`src/lib/speaking/live/start-check.ts`, new; `openai-session.ts`,
`session.ts`, `link.ts`; `LiveExaminer.tsx` only passes its existing check
through). The functions that open a voice session take an optional
`mayContinue` and ask it at the points where a session could be created: on
the paid path before anything is made and again immediately before the
request that creates the paid session (after the connection has prepared
itself, up to ten seconds); on the Gemini rollback before the ephemeral key
is requested and again immediately before the voice socket opens. A no lets
go of whatever was built, sends nothing, and rejects with
`LiveStartCancelled`, which the examiner treats as a start it had already let
go: nothing starts, nothing is shown, the microphone is released. A function
was chosen over an abort signal because the examiner's check re-compares the
signed-in student every time it is asked, so a switch that reached no
listener is still caught. One case is stated rather than hidden: a switch
while the paid request is already out means the session exists when the
answer comes back; the examiner then closes it at once, before any audio
flows, and tells the Worker it ended, so the session's minimum charge is
spent but nothing is recorded and nothing is heard. Fourteen new cases in
`tests/live-start-cancel.test.ts` (each with a ten-second limit so a
regression fails by name instead of hanging the runner; removing the check
before the paid request fails six, before the Gemini socket four, the
examiner not passing its check one); `f23` section 8 in the browser, holding
the connection preparation after the token was read, switching the account
from a second tab and letting go: the mock, the standalone page and the
Gemini path each send no paid request and open no voice connection, 81 of 81
overall (`results-delayed-grade-5.md`); against the pre-fix code the same
three cases fail, with the request going out after the switch. The browser
helper refuses any voice connection to another host, so a failed fix could
not have reached a real service.

Gates at `b7b083a`: `npm test` 1892 of 1892, `npx astro check` 0 errors and
0 warnings, `npm run build` 661 pages, the learning index byte-identical,
Codex's `signout-race.mjs` printing anonymous both times.

## Inspection round 5 (fresh Codex session, read-only, 23 September)

Inspected: commit `c4a7793` against this specification, diff from `48b1d17`,
same settings as the earlier rounds, 437 seconds. Structured result:
`docs/personal-learning/evidence/codex-inspections/inspection-5-of-c4a7793.json`.

Verdict: REVISE. Three findings, all accepted by the host. One is the
same-paper two-tab case the previous section named as not covered.

- **R2E-01 (high) accepted.** The cancellation inside the voice-session
  setup is checked too late once the session request has succeeded: the
  remote answer is applied before the check, the track callback starts
  playback unconditionally, the component cannot close a pending connection
  because its handle is assigned only after startup resolves (a switch during
  that wait leaves the connection alive until startup completes or its
  twenty-second timeout expires), the timeout and error cleanup do not end
  the session at the Worker, and on the Gemini path a cancellation after the
  socket is constructed cannot stop the later open callback from sending the
  setup, whose wait has no timeout. The browser fixture returned synthetic
  failures rather than exercising a successful delayed connection. Fix:
  pending setup is directly cancellable while the owner checks stay;
  cancellation is checked before the remote answer is applied and inside the
  socket and track callbacks; pending peers, sockets and playback are
  released immediately on cancellation; every created paid session is ended
  at the Worker on every failure path; successful delayed-answer and
  delayed-handshake cases are added, including cancellation while playback
  initialisation is pending.
- **R2E-02 (medium) accepted.** The player's owner-change listener returns
  at once once the paper is submitted, so a completed review stays on
  screen for whoever signs in next, its review controls stay active, and
  "ask why this is wrong" could send the previous student's answer under the
  next student's token. Fix: owner checks apply to completed reviews as well
  as unfinished sittings; the previous owner's answers, score and tutor
  controls leave the screen when ownership changes; review requests and
  cached replies are bound to their owner.
- **R2E-03 (medium) accepted.** Finishing a mock leg does not reject a leg
  that already has a result, so two tabs on the same mock's paper can each
  hand it in: the second overwrites the first leg result and records another
  attempt and submission, and the stale player is not stopped because the
  loss check reads only the parent sitting. Fix: completion is terminal per
  leg, an already-completed leg is rejected with an explicit outcome, stale
  players stop or reconcile, and paper evidence is recorded only for the
  first accepted completion.

A sixth fresh inspection follows the fixes.

## Fixes after inspection round 5 (for inspection round 6)

Base for the round-6 inspection diff is still `48b1d17`. The three findings
and four holes of the same class reported by the builders themselves are all
in `fd9bdf8`, each with deterministic tests and a browser journey against the
local stand-in (no grader, model or voice service called):

- **R2E-01** (`src/lib/speaking/live/start-check.ts`, `openai-session.ts`,
  `link.ts`, `session.ts`; `LiveExaminer.tsx`; `speaking-attempt-owner.ts`
  additions): every start now carries a cancel handle (`startHandle`,
  `watchStart`) that the screen pulls the moment the start number moves on
  (unmount, account switch, the student's own Back, a newer start). A pull
  releases everything on the spot wherever the setup is waiting: it closes
  the peer connection and its data channel or the Gemini socket, stops the
  examiner's audio and the microphone level meter (and again once a
  still-running audio start finishes), ends at the Worker a paid session
  that already exists, and rejects the pending start at once instead of
  after twenty seconds. The owner check (`mayContinue`) stays and every step
  asks both. Nothing starts after a let-go: the check runs immediately
  before the remote answer is applied and inside every callback that could
  start something (a late track is stopped rather than played, a late
  "session started" message is refused, the Gemini open callback sends no
  setup, message callbacks do nothing). Every failure after a paid session
  exists ends it at the Worker, at most once per session: a let-go, the
  twenty-second timeout, a service error, the connection closing. A let-go
  while the session request is still out does not abort the request (that
  could leave a session whose id nobody knows); the session is ended the
  moment the request answers. The Gemini setup wait times out after twenty
  seconds and closes the socket. Nineteen new cases in
  `tests/live-start-cancel.test.ts` (each with a ten-second limit; each of
  seventeen removals of a part of the fix, tried in a scratch copy, fails at
  least one case by name, and all nineteen fail against the pre-fix code);
  `f23` section 9 in the browser answers the intercepted session request
  with a real answer from a second peer connection inside the same page,
  so the page's connection genuinely reaches connected with a data channel
  open and audio playing, then switches the account: with the answer held
  and released late, on the standalone page mid-playback, and inside the
  mock, in every case the connection is closed within 2.5 seconds, nothing
  plays, no track is live and the session is ended at the Worker exactly
  once, 90 of 90 overall (`results-delayed-grade-6.md`); the pre-fix code,
  served by a second dev server, fails all six verdict rows. Nothing new to
  translate; the Gemini timeout reuses the paid path's existing English
  message, which was already untranslated on both paths and is shown as is.
- **R2E-02** (`TestPlayer.tsx`, `MockExam.tsx`,
  `src/components/tutor/AskWhyWrong.tsx`, `TestDebrief.tsx`,
  `src/lib/tutor/client.ts`, `src/lib/tutor/review-owner.ts` new): a handed-in
  paper's review belongs to the student who sat it. When the account changes,
  in this tab or another, the answers, the score, the per-question review and
  every Mr EZ control leave the screen together and the owner-changed stopped
  screen takes their place (the paper's title, one sentence for the
  signed-out case and one for the other-account case, Back or Start fresh);
  the review returns only if that same student is using the browser again.
  Both review requests to Mr EZ ("why was my answer wrong", "go through my
  mistakes") carry the student who sat the paper and are checked three
  times: before any token is fetched (refused if that student is no longer
  current), after the token is read (refused if the session belongs to
  anyone else, which closes the window where another tab's sign-in has
  replaced the stored token before this tab was told), and before the one
  automatic retry; a refusal sends nothing and takes the review off the
  screen. The tutor's cached answers, previously keyed by paper, question and
  answer only, now include the student. The mock's results screen, which
  already hid itself on an account change, now says where the results are
  kept once the sitting is recorded. A retake's review goes through the same
  code. Cases 6 to 9 in `tests/test-session-owner.test.ts`; `f22` step 17 in
  the browser (A's own question goes out once with A's token; after the
  switch the first tab holds nothing of A and sends zero tutor requests; B's
  own review of the same drill with the same answer shows none of A's reply;
  a tab that missed the other tabs' news still sends zero requests and then
  drops the review).
- **R2E-03** (`src/lib/tests/mock.ts`, `src/lib/test-session.ts`,
  `TestPlayer.tsx`): a mock paper's first hand-in is final. Finishing a leg
  that already holds a result is refused with a new explicit outcome
  ("handed-in"), writes nothing, and the first result stays byte for byte. A
  paper counts as lost when the paper itself has already been handed in, even
  while the mock sitting is still this student's, and the player also listens
  for the mock's saved sitting changing in another tab, so a second tab stops
  as soon as the first hands in, on its next keystroke that fails to save, or
  at once if it opens a paper already handed in. The player records a paper
  only for the first accepted hand-in. A paper opened on its own still reads
  as gone when handed in elsewhere. Cases 1 to 5 in
  `tests/test-session-owner.test.ts` (each fix removed in turn fails at least
  one named case; three existing cases updated to the new shapes); `f22` step
  18 in the browser (three tabs on the same Listening paper: tab 1 accepted,
  tab 3 stopped with the new sentence, the tab that missed the news refused,
  the result tab 1's, one progress attempt and one learning submission
  carrying only tab 1's answers), 151 of 151 overall
  (`results-unfinished-test-6.md`). Seven new sentences, each with Russian.

Two holes of the same class, reported by the builders themselves rather than
by the inspection, are closed in the same commit so that the next inspection
does not have to raise them:

- **Every Mr EZ request is bound to its student** (`src/lib/tutor/client.ts`,
  `src/lib/tutor/review-owner.ts` generalised, `src/lib/tutor/conversation.ts`,
  `MrEzPanel.tsx`, `ExplainResult.tsx`, `AskWhyWrong.tsx`, `TestDebrief.tsx`).
  The binding lives in the tutor client, so every caller gets it with no
  change of its own (the panel, the welcome, the weekly review, the unit note,
  the explanation, "propose next", lesson help and practice evaluation; the
  two review components still name their own student). A request is refused
  before sending if the stored session belongs to anyone other than the
  student it was made for, including a signed-out page with somebody's
  session sitting in storage; the automatic retry checks again; a reply or a
  failure returning after a switch (or a switch away and back) is dropped
  with a quiet "owner changed" error that is never shown. The panel's
  conversation, which was kept per browser tab with nobody's name on it (so
  the next student saw the previous one's whole conversation, and a reload
  served it back), is now stored under each student's own key, switches with
  the account, is restored from the account only for its own student, and the
  old nameless copy is no longer read and is removed when Mr EZ's memory is
  cleared. Eleven cases in `tests/tutor-request-owner.test.ts` (switching the
  binding off fails eight; the old nameless store fails three); four
  assertions in `tests/test-session-owner.test.ts` section 17 that described
  the replaced code were updated, one of them from "goes with any session's
  token" to a refusal, since that was the hole. `f22` step 19 in the browser:
  A's panel message held, B signs in in a second tab, the message released
  with a reply labelled simulated: A's reply never appears, one chat request
  in all, B's saved conversation holds nothing of A, B's own message goes out
  with B's token; against the old code five of six checks fail (A's question
  and the late reply were shown to B and saved under the nameless key). 158
  of 158 overall (`results-unfinished-test-7.md`). No new strings.
- **In-lesson practice evaluation and lesson help are bound to their
  student** (`src/components/learning/WritingFocusedTask.tsx`,
  `lesson-help.ts`, `LessonHelpControls.tsx`, `lesson-block-help.ts`;
  `recordEventFor` added to `src/lib/learning/store.browser.ts`). When a
  student presses Check on the written focused task, the answer is tied to
  them before anything is sent; whatever comes back is written into their
  own record whoever is on the page by then, and shown only if they stayed
  on the page the whole time. If the account changes mid-request the task is
  handed over at once (the incoming student sees their own draft or an
  empty one with one calm line), the late verdict is shown to nobody, and
  the outgoing student's answer is kept in their own record as an attempt
  nothing judged (the existing "not judged" shape, never a miss) and in
  their own draft; nothing is written under the new student. The same
  hand-over happens on a switch with nothing in flight, including typing
  still waiting on the autosave; a press on a screen that missed the switch
  sends nothing and hands over. Lesson help is tied to the student at each
  press, shown and passed to the host screen only while they stayed; on a
  switch the help buttons clear the previous student's replies and never
  pass them on as hints already given; help that lands after the switch in
  the written task is kept in the outgoing student's own draft as help
  received (erring on the safe side: their next answer counts as helped even
  though they never saw the hint). Eleven cases in
  `tests/lesson-evidence-owner.test.ts` (five deliberate breakages each fail
  named cases); `f22` step 20 in the browser (the evaluation request held, B
  signs in in a second tab, the request released with a synthetic reply: A's
  record holds the answer, B's holds nothing, nothing of A on B's screen),
  167 of 167 overall (`results-unfinished-test-8.md`). One new sentence with
  Russian.
- **The focused Reading and Listening exercise and the lesson quick check
  belong to their student** (`src/components/learning/exercise-owner.ts` new,
  `FocusedExercise.tsx`, `src/components/PracticeQuiz.tsx`; `recordEventsFor`
  and `recordSubmissionFor` added to `src/lib/learning/store.browser.ts`; a
  stored-session check added to `src/lib/store-owner.ts`). Each screen is
  tied to the student on the page when it opens or is restored and never
  looks the owner up again. On an account change the outgoing student's
  answers stay in their own saved progress together with the help each had
  (a hint arriving late for them goes there too and is shown to nobody), the
  screen shows the incoming student's own progress or an empty exercise with
  one calm line, and the recording player starts fresh (an independent check
  plays once, and that once belonged to the previous student). Check, "how
  did you choose it" and the second go are each claimed at the press: if the
  student has gone, nothing is recorded and the screen hands over; otherwise
  everything is written under that student through the owner-named writers.
  A tab that missed the switch also reads the account session this browser
  has stored at the press: if it names a different student, nothing is
  recorded and the answers leave the screen until the tab catches up (the
  local version of the check the tutor client makes on its token). A tab
  that missed a plain sign-out still records under the previous student,
  into their own record, so browsers that keep the login only in memory are
  not blocked. Sixteen cases in `tests/exercise-owner.test.ts`; `f22` step 21
  in the browser (A answers part of each, B signs in from a second tab, A's
  tabs show the calm line and nothing of A, B's visits show nothing of A, A
  returns to their answers, a check from a tab that missed the switch records
  nothing), 185 of 185 overall (`results-unfinished-test-9.md`). One new
  sentence with Russian. Known and stated: a hint on a not-yet-answered item
  is forgotten on reload or switch (pre-existing); a student who answers
  signed out and signs in mid-exercise sees the answers leave the screen and
  stay with the device's signed-out owner, as the essay editor does, and the
  claim offer does not carry in-progress exercise copies.

Gates at `fd9bdf8`: `npm test` 1958 of 1958, `npx astro check` 0 errors and 0
warnings, `npm run build` 661 pages, the learning index byte-identical,
Codex's `signout-race.mjs` printing anonymous both times.

## After round 5: the merge of the published main, and the last screens (for inspection round 6)

Base for the round-6 inspection diff is still `48b1d17`. Two things happened
after `fd9bdf8` that the inspector will see in the diff.

**The published main is merged in at `c5cf425`** (origin/main `9b775df`:
the new vocabulary practice with marked questions from example sentences,
two reading-practice content commits, and a study-screen polish). Four
conflicts were resolved so that both intentions survive: `src/lib/vocab-review.ts`
(main's word-loading fix inside our `buildCardSet`, main's removed helpers
gone, our `rate()` return and owner-scoped saving kept), `src/components/VocabReview.tsx`
(main's component as the base with our evidence recording, activity ids and
continue bar added), `src/components/LearningDashboard.tsx` (our card with
main's wording) and `src/pages/plan-settings.astro` (our Intake settings
screen with main's wrapper class and heading level). The learning-index
generator was taught main's per-question practice sources (a source may
name one question or a range, units are read run by run, three more loud
checks) and the compact index format went from 2 to 3 so a unit that is not
one unbroken run lists its question numbers; the question-identity table in
`reading-practice.ts` was refreshed from the generator. The vocabulary
practice itself, its wording, styles and tests are main's, not this round's;
what this round adds to it is ownership (below) and a truthful catalogue
entry: both vocabulary activities now declare recognition (`recognise-meaning`
direct, `topic-breadth` direct, `recall-from-meaning` borrowed until a real
recall activity exists), their objectives describe picking the missing word
in an example sentence, with Russian, and two new cases in
`tests/learning-catalog.test.ts` pin that and that the planner never proposes
a vocabulary subskill as a goal (`docs/personal-learning/ARCHITECTURE.md`
section 6.5 corrected).

**The last screens of the same class** (`34b7583`), reported by the builders
rather than by the inspection:

- **The inline lesson quiz** (`src/scripts/lesson-quiz.ts`): bound to the
  student on the page when it is set up; on a switch, A's answers are saved
  into A's own unfinished copy (only if they differ from what is kept), the
  answers, marking and score leave the screen with the calm line, and the
  quiz brings back the incoming student's own copy; a check for a student
  who has left is refused and records nothing; a check from a tab that
  missed the switch keeps A's answers for A, clears and disables the quiz;
  recording is always under the student who pressed. No lesson body carries
  an inline quiz today, so the browser step writes the scraper's quiz markup
  into a real lesson page before its script runs.
- **The vocabulary round** (`src/components/vocab-round-owner.ts` new,
  `VocabReview.tsx`, `rateFor` in `vocab-review.ts`,
  `recordVocabularyReviewFor` in the learning store): a round belongs to the
  student on the page when it starts; every answer is checked at the click
  and written under that student in both the review schedule and the
  learning record; on a switch the incoming student gets a fresh round from
  their own schedule with the calm line; a click from a tab that missed the
  switch writes nothing and takes the round off the screen. Main's wording
  and marking are unchanged.
- **The spoken focused task** (`src/components/learning/spoken-task-owner.ts`
  new, `SpokenFocusedTask.tsx`): start, stop, "Done for now" and the
  microphone setting are checked at the press; on a switch a recording in
  progress is stopped and dropped and the microphone released; a permission
  or a finished recording arriving after the switch is dropped; nothing from
  it is recorded for anybody; "Done for now" saves at the press under that
  student.
- **The written task's race** (`WritingFocusedTask.tsx`): anything pressed
  on the screen as it looked just before a hand-over (a keystroke, Check, a
  help button) is ignored, so the outgoing student's words can no longer be
  saved or sent under the incoming one.

Twenty-four cases in `tests/last-screens-owner.test.ts` (six against the
real quiz script; removing each fix fails named cases); `f22` step 22 in
the browser, 207 of 207 overall (`results-unfinished-test-10.md`), with the
spoken task measured on the fake microphone (recorder stopped and
microphone released at the switch).

**Known and stated, not fixed in this round.** Five places save a "studied"
mark or the intake scores through the shared store at the press
(`BandLadder`, `CueCardBank`, `ModelAnswers`, `SavedItems`, `Intake`, and
the lesson layout's "Mark this lesson as studied"): none carries another
student's answers, but a tab that missed a switch would record that mark
under the student it thinks is there. The written task still loses the last
half-second of typing if the page is closed mid-word (pre-existing). The
vocabulary calm line uses the existing hint style and sits close to the
progress bar. A hint on a not-yet-answered focused-exercise item is
forgotten on reload or switch (pre-existing).

**The sign-in path no longer announces a false change** (`src/lib/auth/sync.ts`,
`store-owner.ts`). A sign-in used to begin by resetting the owner to
anonymous and announce each step, so on a signed-in page load every screen
of this kind heard two "account changes" and could show its calm line for no
reason; a switch from A to B was heard twice. Now a sign-in for the student
who is already the owner (a page load, or the account answering twice for
one student) restarts and cancels exactly as before but never touches the
owner or the learner record and announces nothing; a real change (anonymous
to a student, A to B, a sign-out) is announced exactly once, at the end,
once every store has moved. Every sign-in generation check and cancellation
rule is unchanged (`tests/account-isolation.test.ts`, seven new cases; the
old code fails five of them, and Codex's race script still prints anonymous
twice). Two tidy-ups with it: the spoken task has its own true sentence
(the recording was stopped and not kept) with Russian, and the written
task's Check and its two revise buttons make the stored-session check the
focused exercise makes. Stated: a repeated sign-in for the same student
still fetches and uploads the account data a second time; a screen hidden
by a stale-tab refusal stays hidden until reload if the other tab signs back
in as the same student before this tab hears anything; the lifecycle reports
a sign-in as finished after the first, cancelled one on a signed-in page
load, which the claim offer waits for.

Gates at `34b7583`: `npm test` 2004 of 2004, `npx astro check` 0 errors and 0
warnings, `npm run build` 661 pages, the learning index byte-identical,
Codex's `signout-race.mjs` printing anonymous both times.
