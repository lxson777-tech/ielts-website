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
