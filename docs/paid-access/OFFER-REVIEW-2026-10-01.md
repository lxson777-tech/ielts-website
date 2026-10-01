# Review of the approved paid offer and public lessons (1 October 2026)

Independent read-only review of Codex's implementation (commit `c00d1bc`,
merged into `claude/paid-platform-readiness-03c113` at `4e95d83`) of Alex's
decisions in PROFITABLE-OFFER.md and PUBLIC-LESSONS.md. Results reproduced
first: 2,401 / 2,401 tests, astro check 0 errors, open and gated builds,
content-leak audit 0. No P0 found: no way to obtain paid material, buy below
the approved price, or touch allowance records directly. P1-1 to P1-4 were
also confirmed in the code by the orchestrator.

## New decision (Alex, 1 October 2026)

The placement test and full mock exams do NOT use the 2 live interviews of a
30-day purchase. The placement test stays once per account. Full mock exams
get their own allowance: **2 per 30-day purchase**, so repeated mock exams
cannot become unlimited free live interviews. Both must be enforced on the
server (never on the browser's word that a session is "placement" or "mock").

## P1: wrong behaviour or wrong promise

1. **Re-applying the payment setup file restores the old prices.**
   `supabase/migrations/2026-09-30-paid-access.sql` (~625-629) still upserts
   month-1 at 10,000 and month-3 at 25,000 enabled, and says it is safe to
   re-run; `2026-09-30-profitable-offer.sql:3-4` only updates once.
   `tests/paid-sql.test.ts` (~93-100) lost the price check; the re-run test
   (~103-112) does not look at prices. Fix both rows (12,990; month-3
   disabled), keep the newer file idempotent too, restore the test.
2. **Out of essays looks like an outage.** `workers/grade-essay` refuses with
   `assessment-unavailable` (~1001) but `src/lib/writing/grader.ts:85` only
   treats `sign-in-required` and `trial-*` as refusals, so `WritingTester`
   says "could not reach the grading service, try again in a minute".
   Placement and mock exam essays share the path. Same check for the
   recorded Speaking grader and the live examiner clients.
3. **A trial assessment begun before the 72 hours end but sent after is
   refused.** `profitable-offer.sql` (~63-65) requires an active trial at
   submit time; the trial's own rule (`trial_test_lease`, "works after the
   trial ended") let a begun test finish. Honour a test begun in time.
4. **A live interview is used the moment the session opens and never given
   back.** `workers/live-examiner/src/index.ts:658` settles at session
   creation; the old "dropped before the examiner began, within 90 seconds"
   give-back in `handleEnd` (~739-795) only covers the old trial test; the
   failure branch at ~651 leaves the reservation counted. Give a paid `live`
   use back under the same rule, server-side only.
5. **A grading request that dies halfway uses the assessment for good**
   (phone sleeps, tab closes, Worker stopped). Only the Worker settles or
   releases. Release reservations older than about 15 minutes that have no
   successful provider row in `assessment_provider_usage`; add an
   admin-only function (guarded by `is_admin()`) to give one back; correct
   "kept for support reconciliation" and the trial screen that says "Your
   result is saved" when none exists (`TrialBlock.tsx` ~86-90).
6. **Placement and mock exam silently use live interviews** (and essays):
   `PlacementSpeaking.tsx:108`, `MockExam.tsx:1030`. Implement the decision
   above, server-enforced. Placement essays: decide in code comments whether
   they come from the 12 (keep counting them, but tell the student before
   starting). Mock exam essays count against the 12 unless that makes a mock
   impossible; say so on screen.
7. **Trial wording still contradicts the decisions:** `src/lib/trial/gate.ts:60`
   ("New lessons ... are locked"), `src/pages/trainers/index.astro:91` ("one
   lesson and one test in each section"), `src/pages/trial.astro:9` (search
   description). Lessons are public; the trial is one Reading test, one
   Listening test and ONE AI assessment (Writing OR recorded Speaking).

## P2

1. `profitable-offer.sql` has no commented rollback.
2. It locks the student's row in `auth.users` (~35), which Supabase may not
   allow the function owner; the payment functions use
   `pg_advisory_xact_lock('access:'||uid)`. Use the same advisory lock.
   The race test runs on one PGlite connection and proves nothing about
   concurrency: say so in the test, do not overclaim.
3. Trial-only accounts can no longer be deleted (`profitable-offer.sql:10`,
   no delete rule on the usage reference). Trial data elsewhere cascades.
4. A failed request gives the assessment back even when the provider already
   charged; up to 24 a day per (free) account. Failures also count toward the
   24-a-day cap, so a provider outage can lock students out for a day. Make
   the cap count only failures attributable to the student, or document it.
5. `metering.ts` (11-16) waits for the database with no timeout before every
   AI call (`serviceRpc` at `gate.ts:82`). Add a short timeout that fails
   closed with a plain message.
6. `AssessmentBalance.tsx:13` shows "Remaining 1/1" with no trial or an
   ended trial; paid counts do not refresh after a graded essay.
7. Trial home after the shared assessment: `status.ts:221` marks both
   Writing and Speaking used; `TrialHome.tsx:452` still says "Each section has
   its own allowance".
8. `tools/trial-content-audit.mjs:231` takes only the first chart on a page,
   so a public example chart could hide a private one. Run once without the
   lesson exclusion and record any overlap.
9. The OPEN build (the live site) changed: its live mock interview now stops
   at 15 minutes instead of 18 (`LiveExaminer.tsx:169`); lesson help buttons
   gone for signed-out students and part-of-lesson links no longer scroll
   (`lesson-block-help.ts:132`); a new examiner card on `/trainers/speaking`
   and a new `/speaking/recorded` page. Restore today's open-site behaviour
   where it differs; new commercial behaviour only in the gated build.
10. The refund FAQ (`sales-copy.ts:451`) no longer plainly says no refunds
    after purchase. Say it, in both languages.
11. `access_order_paid` ignores a disabled plan (`paid-access.sql:474`):
    refuse confirming an order for a disabled plan.
12. Refusal messages in `assessment.ts` (31-37) are English only: Russian.

## Ownership for the fix

| Builder | Owns |
|---|---|
| M (money, server) | supabase/migrations/*.sql, workers/**, src/lib/access/metering.ts, src/lib/access/assessment.ts (server parts), src/lib/trial/gate.ts (server parts), tools/trial-db.mjs, tools/mr-ez-dev-server.mjs, tools/trial-content-audit.mjs, tests for those. P1-1, 3, 4, 5 (server), 6 (server), P2-1, 2, 3, 4, 5, 8, 11 |
| S (student-facing) | src/components/**, src/pages/**, src/lib/writing/grader.ts, src/lib/speaking/**, src/lib/trial/{status,offer,library}.ts, src/marketing/**, src/lib/i18n/**, src/lib/access/assessment.ts (messages only), tests for those. P1-2, 5 (screens), 6 (screens), 7, P2-6, 7, 9, 10, 12 |

The orchestrator resolves the two one-line hot spots (`dict/ru/index.ts`,
`tests/i18n.test.ts` BATCH_FILES) at merge.
