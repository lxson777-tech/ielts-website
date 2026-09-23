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
