# Follow-up review of Claude's personal learning build

Reviewed 23 September 2026, commit `48b1d17ee7d7d1675d56049b71947bcc79db928e`, on `claude/todays-tab-ai-tutor-rework-8af4cd`. Compared with the previous reviewed commit `8ca6014` and the five findings in `claude-personal-learning-review-2026-09-22.md`.

Verdict: the original Writing defects are fixed, the missing Speaking check activities are added, and the mobile layout has been repaired. The original completed-essay upload reproduction no longer leaks the essay or goal. However, account isolation is still incomplete in three independently reproduced paths below. Do not release yet.

Source references below are relative to `.claude/worktrees/todays-tab-ai-tutor-rework-8af4cd`. Product code was not edited during the review. All identities, answers and model replies used in the additional checks were synthetic. No real accounts, paid model calls, production writes or deployments were used.

## Remaining findings

### 1. P1: another student's unfinished test can be submitted into the new account

Locations: `src/lib/test-session.ts:7`, its `read`/`write` functions, and `src/components/TestPlayer.tsx:260`, `:486` and the subsequent learner-evidence recording.

The unfinished test is still stored under the device-wide `ielts.testsession.v1` key. It has no owner. The player restores its answers regardless of who is now signed in, but submission saves the result and answer evidence under the current owner. The new isolation for completed history does not protect this path.

Reproduced with the real browser interface against the free local account stand-in:

1. Create synthetic student A and enter `reading-full-006-drill-p2` through its real Reading hub link.
2. Start the drill and choose `i` for question `q14`. Leave it unfinished.
3. Return to Today, sign out, then create synthetic student B.
4. Enter the same drill from its real hub link. A's `i` answer is already selected.
5. Submit without changing that answer, then return to Today.
6. Inspect the local backend: B's `learning_events` contains A's answer as `firstAnswer: "i"`; B's `user_state` contains the attempt. B's personal plan uses this attempt to choose work.

This contradicts the handoff's claim that unfinished shared tests cannot reach another account. They can, through ordinary submission. The demonstrated case is a drill; the shared player/session implementation also serves full papers.

Fix: make active tests and mock-exam state owner-specific, bind an in-memory sitting to its starting owner, and prevent a changed owner from submitting the previous owner's work. Preserve A's unfinished work for A. Handle old unowned sessions conservatively rather than assigning them to the next account automatically.

Acceptance: A starts and answers a drill or paper, signs out, B opens the same activity and sees none of A's work; B's submissions and backend evidence contain only B's answers. A can resume their own sitting. Cover owner changes in another tab and while the player is mounted, not only fresh page loads.

Evidence: `claude-review-2026-09-23/independent-browser.py`, `unfinished-test-proof.json`, `b-resumes-a-test.png`.

### 2. P1: a pending sign-in can restore the signed-out student's data owner

Location: `src/lib/auth/sync.ts:159` to `163` (`setLearningOwnerNow`), called at `:213`.

The helper sets the owner, awaits the learning-module import, and then sets that owner again without checking whether the sign-in is still current. The caller checks its generation only after the helper returns. A sign-out during that await correctly resets the owner to anonymous, but the stale helper subsequently sets it back to A. Returning early in the caller does not undo that stale mutation.

Executed the real exported lifecycle functions with an in-memory browser store and no backend:

```text
pending = startSyncForUser(A)
stopSync()
await pending
```

Immediately after sign-out the owner is anonymous. When the cancelled sign-in finishes, the owner is A again, and `getProgress()` returns A's synthetic private essay. This is an executed ordering reproduction, not a claim that the issue occurs on every normal sign-out.

Fix: validate the active sign-in generation before any owner-setting operation after an await, including helper and learning-sync startup continuations. Cancellation must prevent stale state mutations, not only stale network writes. Do not let a cancelled sign-in restore either owner or subscriptions.

Acceptance: delay the initial learning-module load, sign out while it is pending, release it, and assert both old and new stores stay anonymous with no A data visible. Also switch A to B during startup and assert all late A continuations leave B intact. Existing tests that delay only the remote pull do not cover this earlier boundary.

Evidence: `claude-review-2026-09-23/signout-race.mjs` and `signout-race.json`.

### 3. P1: direct entry or refresh on an exam page records signed-in work as anonymous

Locations: `src/layouts/BaseLayout.astro:167` onward (bare layout omits both account components); `src/pages/tests/[id].astro` and `src/pages/trainers/reading/[id].astro` use that layout; account initialization lives in `src/components/WorkspaceMenu.tsx:38` to `45` and `AccountMenu.tsx`.

The shared storage owner defaults to anonymous. Signed-in initialization is attached to navigation components that do not mount on the full-screen player. A hard load or refresh of that page therefore has a valid account session but no corresponding data owner initialization. A page reached through client-side navigation can inherit the owner, which is why ordinary hub navigation alone misses this defect.

Reproduced in a fresh browser context: sign up C through the dashboard, navigate directly to the drill, answer a question and submit. The browser still contains C's authenticated session, but the attempt is written to `ielts.learning.record.v1::anon:<device-id>` instead of C's record. The proof captures both identities without storing any token value. This misattributes signed-in work as shared anonymous work, disrupts progress sync and can make it eligible for the wrong person's later claim.

Fix: establish the authenticated owner through an app-wide lifecycle that runs on every learning route, including full-screen tests and mock exams. Resolve ownership before loading drafts or writing evidence. An owner derived from a previously visited menu is insufficient. Ensure refresh retains the right student's timed sitting without resetting its timer.

Acceptance: sign in, open a paper/drill in a new tab, refresh mid-test, submit and verify that the authenticated account's record and backend receive it once. No anonymous record or claim offer should contain that signed-in attempt. Include signed-out use as a separate valid case.

Evidence: `claude-review-2026-09-23/direct-exam-owner.py` and `direct-exam-owner.json`.

## Status of the earlier findings

| Earlier finding | Follow-up result |
|---|---|
| Completed essays and target uploaded on another account's sign-in | Original proof now uploads neither the essay nor the target. Completed-history and explicit-claim journey passes, but overall account isolation remains blocked by the three paths above. |
| Feedback marks the original Writing answer assisted | Fixed. Intercepted a successful evaluation on the actual browser form. Its saved first answer has `assistance: none`, `seenBefore: false`, `met: true`. The successful reply is a labelled synthetic fixture, not a live model evaluation. Source and regression tests also separate feedback carried into subsequent attempts. |
| Task 2 saved as Task 1 | Fixed. The same browser submission saves `taskScope.task: task2`, and the form uses paragraph wording. |
| Three Speaking objectives missing fresh checks | Different-prompt check activities are registered for all three. The additions and coverage tests no longer leave those three without a check. Self-check claims remain distinct from examiner-graded evidence. This does not establish live speech-grading quality. |
| Russian phone report overflow | Responsive header/grid fix is present; the follow-up browser width checks cover both languages, populated/empty states, and narrow screens. |

## Verification

- Independently reran `npm test`: 1,737 passed, zero failed.
- Independently rebuilt: 661 pages, successful.
- Independently ran Astro check: zero errors, zero warnings, 19 hints.
- Reran the real account/claim browser journey against the free local stand-in: 33 PASS assertions, zero FAIL assertions. Its log includes an aborted logout request on the final navigation; all saved-state assertions pass. These scenarios do not exercise the remaining three paths identified above.
- Reran all 19 scenarios of the frozen-build browser suite: 295 PASS assertions and two FAIL assertions. One FAIL explicitly marks real account/two-device verification as unperformed. The other is a date-dependent test-fixture assertion: the browser correctly aged 23 September to 18 September, but the helper's fixed 22 September reference expected 17 September. Neither is a newly observed product failure. All Writing evidence and report-width assertions passed, including English/Russian, populated/empty reports at 320px, 390px and 1440px. I also inspected the Russian phone screenshot.
- Added independent browser reproductions for a successful Writing evaluation, cross-account unfinished-test submission and direct-entry exam ownership, plus the executable sign-out timing reproduction.

Live Supabase behavior, production access policies, real two-device reconciliation and live AI quality remain unverified. The local stand-in proves what the real browser code sent and displayed in these scenarios; it does not prove production backend behavior.

## Instructions for Claude

Fix all three ownership paths together on the existing branch. Add integration tests for the exact journeys above, including cold initialization, direct entry, refresh and owner changes with unfinished work. Retain the working Writing, Speaking, claim and mobile fixes. Update the implementation handoff to remove the incorrect statement that shared unfinished tests cannot enter another account.

Return the new commit, regression results and browser evidence for the ownership journeys. Do not deploy, change production data or run paid AI tests as part of this fix pass without Alex's approval.

Also repair the browser suite's fixed-date helper so it remains meaningful after 22 September, rather than loosening the missed-day assertion. Logs and the independent reproduction scripts are preserved in `claude-review-2026-09-23/`. The account and successful-evaluation checks used the explicitly simulated local backend on port 8801 with the site on 4354. The frozen production build was tested on 4348. A synthetic successful evaluation was intercepted in the browser to exercise the response path; it provides no evidence about real model quality.
