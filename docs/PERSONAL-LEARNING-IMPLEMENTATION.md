# Personal learning build: implementation report

Handoff to Alex and to Codex's independent audit. Built 21 to 22 September 2026
from the brief in `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md` and the audit in
`docs/audits/personal-learning-plan-2026-09-21.md`. Written by the lead (Claude
Fable 5.1), who orchestrated the work; the code was written by Opus, Sonnet and
Haiku builders working from written briefs, each package checked and committed
by the lead.

Nothing in this build has been pushed, merged, deployed, applied to a production
database, or run against a paid AI model. Every "proven" below means proven on
this machine with deterministic tests, a simulated tutor, a local stand-in for
the database, and two full browser runs against a frozen production build.

## 1. Summary of behaviour delivered

**One plan, one next step.** A single planner (`src/lib/learning/planner.ts`)
decides each student's next session from one evidence policy
(`src/lib/learning/policy.ts`) over one learner record
(`src/lib/learning/evidence.ts`, `store.browser.ts`) and one catalogue
(`src/lib/learning/catalog.ts`). The three engines the audit found competing
(`courseStatus`, `getTodayPlan`, `recommendNext`) are now views of the same
`plan.activeSession`. Today, Course, the account menu, the account overview,
the progress report, the weekly review, the test debrief, explain-a-result,
unit notes, the tests hub and every lesson footer read that one session. The
audit's contradiction is a named regression test and passed in both browser
runs on all six surfaces before and after completing a step.

**Intake and the hour.** A short one-question-per-step intake collects the
overall target, optional per-paper minimums, exam date or an explicit "no date
yet", study days, daily time with 60 minutes preselected as the teacher's
recommendation and confirmed by the student ("Can you really give 60 minutes
most days?"), explanation language, and optionally a self-reported score with
its date and the paper that feels hardest (stored as self-reported, never as a
measurement). An existing student's own settings load and save untouched (25
stays 25; 60 appears only as advice). "Answer later" leaves a visibly
provisional plan and is remembered for four days.

**Honest evidence.** Every quick check, drill, paper, essay, recording and
vocabulary review writes an append-only event with the first answer, the help
used, retry links, the mode, and the real question behind each item, so the
same question met in a lesson, a drill or a paper counts as seen. A completion
click is "studied"; a correct answer after a hint is "assisted"; only unaided
work on unseen material is "independent". Old history migrates with
deterministic ids (idempotent, two devices produce one record) and is capped at
"limited" certainty because it has no per-question detail; the old stores are
never modified. Five certainty levels (unknown, self-reported, limited,
tentative, measured) with hard caps: a diagnostic sample never exceeds
tentative, a partial exercise never sets a band, an overall band exists only
when all four papers qualify, a blank or abandoned submission is excluded with
a named reason, a repeat of seen material raises nothing.

**The planner.** Named provisional weights; both the overall target and the
per-paper minimums (a paper that meets its own minimum has no gap even when it
is the lowest); unknown papers get one short "first look" sample per session
(at most five, at most 15 minutes, deferrable) instead of a test battery; a
substantive weakness counts even at limited certainty, so a returning student
with only old scores is sent to their evident weakness rather than to an
untested paper; an incumbent session is kept unless a challenger is clearly
better, and a session under way keeps its finished steps and can only shrink;
the budget is a hard assertion (no scheduled day can exceed its minutes, for
any deadline from 3 to 90 days); an indivisible full paper is its own session
or an explicit longer commitment with its review on a later day; a short
deadline states what will not fit; missed days give a bounded recovery with one
explained change and a true count; a passed exam date asks for a new date or
goal and can never read as finished; a plan with no date is visibly provisional
and never invents one. Replans happen only on new evidence, a settings change, a
student choice or a new day, never on a page refresh or a late AI reply.

**Teaching flows.** Every Reading question type present in the 40 real papers
(nine types) and every Listening type in the 30 real papers (seven types) has
guided practice built from real question groups and independent checks drawn
only from reserved papers the student has not seen. Guided practice asks a
student who gets one wrong how they chose (per-type reason lists), stores the
stated reason, words the diagnosis as tentative, shows the teacher explanation
and the passage or transcript evidence, and offers a correction attempt recorded
as assisted. Checks hide every help control and the tutor, and reveal
explanations only afterwards. Listening plays only the relevant window of the
real recording (streamed by range, never copied), with replay and seek in
practice recorded as assistance, and one play with no pause in checks. Writing
has focused written tasks for every criterion (Task 1 overview, key features,
comparison, data language, process sequence, map change; Task 2 position,
claim support, paragraph organisation, cohesion, conclusion, paraphrase, topic
vocabulary, complex sentences, structure range, collocation and recurring
pattern accuracy, sentence correction from the student's own quoted sentences),
each with one objective, transparent automatic checks, feedback that can never
be a band, a linked revision with before and after, and transfer checks on
reserved unseen prompts; the calibrated grader stays the authoritative measure.
Speaking has nine objectives across the three parts and four criteria, fully
usable without grading (record, listen back, self-check), with a hand-off from a
graded result that reads all four criteria and offers at most one objective;
pronunciation is only ever set from an audio-graded result and re-checked on a
new recording. Vocabulary loads all 36 topics (719 cards, verified from the
real lesson bodies), adds recall and use-in-a-sentence modes, counts a word as
known only after unaided recall on two separate days, and feeds due and
relevant words into the session's opening recall step.

**Mr EZ.** Three new tasks on the existing endpoint reuse its sign-in,
ownership, limits, idempotency and cost recording: lesson help (explain, hint,
example) grounded in the exact lesson block fetched server-side plus the
question, the student's answer and earlier hints, with the help level decided
in code and the answer never handed over before an attempt; practice evaluation
against one objective that cannot output a band (enforced by prompt and
validator); and next-step proposals validated against the shortlist, plan
revision, evidence version, prerequisites, budget and availability, with
disagreements recorded whether or not accepted. Help is refused server-side
during a timed paper, including a direct chat request for an answer, and the
panel explains why on the client. The Worker reads the synced plan and record
when the new tables exist and derives from the old store when they do not.
Everything Mr EZ says about a student carries one of the five certainty levels.

**Progress and control.** The single cross-paper trend line is gone; the
report shows four separate skill panels with certainty in words, freshness,
what improved from independent evidence only, what remains uncertain, what to
work on next (the shared session) and what changed in the plan (quoted), plus
how much evidence was not counted and why, self-reported scores with their
dates, "What your plan knows about you", and a teacher review summary in the
existing printable report, generated locally and sent nowhere. Estimated time
is labelled estimated. No percentage of the library is shown as readiness.

**Language.** Every new interface string and every sentence the planner writes
has Russian, chosen by the student's explanation language, with exam material,
question type names and criterion names kept English. About 1,300 new strings.

## 2. Requirement checklist

`docs/personal-learning/CHECKLIST.md` maps every requirement sentence group of
the brief (about 170 rows) to the files and tests that deliver it, with one of
five statuses: done, done untested, partial, not done, external. Its summary
block lists every row that is not "done" with the reason. The rows marked
external are those no local build can complete: real accounts on two devices,
the production database change, the paid AI check, the teacher's review of the
authored teaching content, and real students.

## 3. Branch, commit, preview, startup

- Branch: `claude/todays-tab-ai-tutor-rework-8af4cd`, worktree
  `.claude/worktrees/todays-tab-ai-tutor-rework-8af4cd`.
- Base: production `e2bf9e6` (the live site of 21 September, Russian and the
  Mr EZ guide features included). Not merged into `main`, not pushed.
- Final commit: the handoff commit that adds this document, the filled
  checklist and the browser evidence (named in the handoff message; `git log -1`
  on the branch shows it).
- Local preview (a frozen production build, so nothing hot-reloads):

```bash
npm install
npm run build
npx astro preview --port 4340 --host 127.0.0.1
```

  Then open `http://127.0.0.1:4340/ielts-website/dashboard` (add `?lang=ru`
  for Russian). The bare `/ielts-website/` with a trailing slash is a 404 on
  local servers; use `/dashboard`.
- Development server with hot reload: `npm run dev -- --port 4331`, then
  `http://127.0.0.1:4331/ielts-website/dashboard`.
- Free local stand-in for the database and the tutor (everything it returns is
  labelled simulated): `node tools/mr-ez-dev-server.mjs`.
- Tests: `npm test` (node:test). Type check: `npx astro check`.

## 4. Architecture and data changes

Binding design: `docs/personal-learning/ARCHITECTURE.md` (current state with
file references, contracts, migration, planner algorithm, catalogue coverage,
work packages, test plan, risks), amended by
`docs/personal-learning/LEAD-DECISIONS.md` (which wins where they differ) and
`docs/personal-learning/BUILDER-RULES.md` (the rules every builder worked
under).

New shared module `src/lib/learning/` (pure TypeScript, imported by both the
site and the Worker; browser code only in `*.browser.ts`, enforced by a test):

- `contracts/` catalogue, evidence, policy, plan, AI and sync types with named
  provisional constants.
- `evidence.ts`, `migrate.ts`: the learner record, deterministic migration.
- `policy.ts`: `evaluateEvidence`, the one evidence policy.
- `catalog.ts`, `index-format.ts`: 700-plus activities assembled from the six
  lesson registries plus a generated compact index
  (`src/data/generated/learning-index.json`, 189 KB, regenerated by
  `npm run learning:index`, with a byte-for-byte staleness test and a round-trip
  test proving the compact shape loses nothing).
- `planner.ts`, `session.ts`: `createInitialPlan`, `replan`, session assembly,
  proposal validation, `carryForwardSession`.
- `store.browser.ts`, `sync.browser.ts`, `index.ts`, `adapters.ts`: per-owner
  persistence, sync, the only place `replan` is called, and the three adapters.
- `lesson-blocks.ts`, `lesson-check.ts`, `checkpoints.ts`, `ai-prompt.ts`,
  `ru.ts`.

Migration and compatibility:

- `ielts.progress.v1` and `ielts.studyplan.v1` are read, never written by the
  migration, and never deleted. Existing history screens keep reading them. A
  derived `SavedPlan` is still written beside `PersonalPlanV1` for the nine
  legacy readers (lead decision D1); a test asserts the two never disagree.
- `SavedPlan.defaulted: true` is the only signal that a plan was fabricated:
  such a plan is asked again with 60 preselected. Any other saved plan is the
  student's own and is carried over confirmed and untouched. Note for testers:
  the old loader requires `targetBand` as a string (`"7.0"`); a numeric value
  is rejected by the old code as it always was.
- New localStorage keys, all namespaced by owner (user id or anonymous device):
  `ielts.learning.record.v1::…`, `ielts.learning.plan.v1::…`,
  `ielts.learning.check.v1`, `ielts.learning.focus.v1`,
  `ielts.learning.legacy.v1` (the migration stamp), plus the deferral and sync
  state keys named in `store.browser.ts` and `sync.browser.ts`.
- Nothing renamed or removed: every existing catalogue id (already stored in
  `mr_ez_recommendations`), progress key and storage key still resolves.
- Lesson bodies were not edited (the Russian checker depends on that); block
  ids are derived at build time from the existing section markup and match
  between English and Russian bodies (76 lessons, 433 blocks).
- Reserved material for independent checks (never offered as practice):
  Reading papers 003, 015, 028, 029, 034, 037; Listening papers 008, 009, 019;
  Task 1 prompts `pte-wt-117`, `pte-wt-112`, `pte-wt-126` and the Task 2 and
  cue-card reservations listed in `src/data/focused/*.ts`.
- One authored item, marked as such and never usable as a check: the Reading
  sentence-endings practice set (`src/data/focused/reading-sentence-endings.ts`),
  because no real paper contains that type. Everything else is real exam
  material with its attribution.

## 5. Synthetic learner profiles and walkthroughs

Profiles: `tests/fixtures/learning-profiles.ts` (every profile carries the
`SYNTHETIC-` prefix). Browser scripts: `tests/browser/f01_*.py` to
`f17_*.py` plus `run_final.py`, base URL from `IELTS_BASE_URL`, each asserting
the page it is on before naming a screenshot. Evidence:
`docs/personal-learning/evidence/final/results.md` (first run) and
`results-rerun.md` (after the fix round), with screenshots at 1440x900 and
390x844.

Reproducible seeds (write these into localStorage on the dashboard, then reload):

- Brand-new student: empty storage.
- The audit's Matching Headings student:
  `ielts.studyplan.v1` = `{"targetBand":"7.0","testDate":"2026-12-01","createdAt":"2026-09-01T09:00:00.000Z","done":[],"startDate":"2026-09-01","dailyMinutes":60,"defaulted":false}`
  and `ielts.progress.v1` with two full Reading attempts (`kind:"full"`,
  `skill:"reading"`, `raw:24,total:40,band:6.5`) each carrying
  `byType: {"matching-headings":{correct:1,total:8},"tfng":{correct:10,total:12},"sentence-completion":{correct:13,total:20}}`.
  Expected: Today reads "Reading, matching headings" with the Reading overview,
  the Matching Headings lesson, guided practice on real questions, an unseen
  check, one Listening first look and a recap, inside 60 minutes.
- Existing explicit 25 minutes: the same plan with `dailyMinutes:25`.
  Expected: 25 everywhere, 60 shown only as advice.
- Expired date: `testDate` in the past. Expected: "Your exam date has passed",
  never a completion message.

Walkthroughs: the two pilots are described step by step in the header comments
of `src/components/learning/FocusedExercise.tsx` and
`WritingFocusedTask.tsx`, and in the commit messages of `9589ac6` (Reading
Matching Headings) and `7f7bacb` (Writing Task 1 overview).

## 6. Test, build and browser results

- Deterministic: `npm test`, 1697 tests, 1697 pass, 0 fail (761 at the
  baseline, 29 new test files). `npx astro check`: 0 errors, 0 warnings.
  `npm run build`: 658 pages (538 at the baseline). The Worker bundles in a
  no-login dry run (945 KiB, 186 KiB gzip).
- Browser, first frozen-snapshot run (before the final fix round): 230 pass,
  21 fail, 121 screenshots, zero console errors, zero failed requests, 531
  routes crawled with no orphan.
- Browser, rerun after the fix round: 247 pass, 4 fail. The four: real
  two-account behaviour (external, no database on the snapshot); two small
  Russian leaks (the language name on plan settings, one milestone sentence)
  fixed after the snapshot; the report's paper headings, fixed in `29a0b1d`
  after the snapshot. All five audit findings pass in the rerun: contradictory
  direction, target-insensitive schedule, the 255-minute day, completion
  without understanding, expired plan reading as finished.
- Failures found and fixed along the way, recorded honestly in the commit
  history: a finished step vanished from Today instead of ticking (`904ac07`);
  returning students with old scores were sent to an unknown paper instead of
  their weakness (`904ac07`); the planner rewarded question types with less
  teaching material (`0bee488`); a lesson check quoting a reserved paper could
  burn it (`614d8be`); the index grew past its cap and was made compact rather
  than the cap raised (`0bee488`); the mock exam claimed an overall band it
  could not have (`636a238`); the Start button briefly turned orange against
  the approved design and was restored (`a0d5b87`); the retired course-order
  sentence survived inside Mr EZ's reasons (`6455956`).
- Where a test's expectation legitimately changed, the test was changed with
  the reason written beside it; no test was deleted to make the suite pass.

## 7. Separate statuses

| Area | Status |
|---|---|
| Deterministic behaviour (planner, policy, evidence, catalogue, adapters, migration, checkpoints) | Proven by 1692 tests and two browser runs on a frozen build. |
| Simulated AI (all Mr EZ paths with the local stand-in or mocked model) | Proven; every simulated reply is labelled simulated in the interface. |
| Live AI | Not run. A bounded check exists as a script that refuses to start without `--i-approve-spend` and the key name, expected cost about USD 0.0035 for twelve scenarios, guard USD 0.05 (`docs/personal-learning/LIVE-AI-CHECK.md`). |
| Real-account synchronisation, two devices | Proven against the local stand-in only (idempotent pushes, revision conflicts, owner isolation, offline queue). The three tables are a proposal, not applied. Never tested against a real project. |
| Student and teacher validation | Not started. Teaching content (reason lists, objectives, checklists, the authored sentence-endings set, all Russian written by builders) awaits Alex's review as the teacher: `docs/personal-learning/TEACHER-REVIEW-writing-speaking.md`, `TEACHER-REVIEW-mr-ez-teaching.md`, and the reason lists in `src/data/focused-exercises.ts`. |

## 8. Known limitations and proposed next actions

- Three of the nine Speaking objectives (Part 1 extend an answer, Part 2 plan
  in one minute, fluency repair) offer a retry on the same question but not yet
  a check on a different one; the other six do. Next action: add the reserved
  second questions as data.
- Two Speaking objectives named in the teacher review document
  (`part1-natural-tense-range`, `part2-narrative-structure`) are not authored.
- Mr EZ's two-level wording (measured, tentative) is kept for compatibility
  while the five-level certainty is exposed beside it; the Worker now uses the
  five levels when it reads the synced record. Once the tables are applied,
  `insights.ts` can drop the two-level form.
- The compact index has 30 percent headroom under its cap; the serialised
  catalogue is within 6 percent of its (raised) cap. Further content growth
  needs the same compaction discipline, not a bigger cap.
- Vocabulary un-saving and note deletion do not propagate between devices
  (union merge, no tombstones); safe, but a deleted note reappears elsewhere.
- History entries written before a language switch stay in the language they
  were written in, by design.
- Unit notes remain mounted but never name a next unit; their future is Alex's
  call now that units are no longer a student's route.
- The plural forms of a few Russian planner sentences with counts use one fixed
  form; exact declension needs a plural mechanism in the shared layer.
- Two browser scripts (`f06`, `s6`) needed `textContent` to read the collapsed
  scope list; the rerun scripts are corrected.

## 9. Proposed production steps, none taken

All of these are Alex's decisions. Nothing below has been done.

1. **Merge and publish the site.** Merge the branch into `main` after review;
   the push publishes to GitHub Pages automatically. Rollback: revert the merge
   commit. The site works fully without steps 2 and 3 (local plan and record,
   old sync unchanged), so this step can go first.
2. **Apply the learning tables.** `supabase/migrations/2026-09-21-learning.sql`
   (three tables with row level security, idempotent, commented rollback at the
   bottom). Apply through the Supabase SQL editor or CLI as described in
   `supabase/README.md`, "Personal learning tables (proposal, not applied)",
   which also gives the verification queries and the rollback. Until applied,
   sync degrades to this-device-only with an honest status. Recommended: apply
   to a non-production project first and run the two-device check described in
   `workers/mr-ez/README.md`.
3. **Redeploy the Mr EZ Worker.** `npx wrangler deploy` in `workers/mr-ez`
   (billable, externally visible). New non-secret settings with defaults:
   `TUTOR_MAX_HELP_PER_USER_PER_DAY` (60) beside the existing 40-turn
   conversation cap; the whole-site cap still covers everything. No new
   secrets. Rollback: redeploy the previous version. Cost expectation from the
   measured rates: a lesson help or evaluation turn costs about the same as a
   chat turn (about USD 0.0005), so a student who used the full new allowance
   every day would cost about USD 0.90 a month; realistic use is far lower.
4. **Run the bounded live AI check.** After step 3 or against a local
   `--live` run:
   `node --import ./tests/ts-extension-loader.mjs tools/mr-ez-learning-live-check.mjs --i-approve-spend`.
   Expected total about USD 0.0035, hard guard USD 0.05. Outputs land in
   `docs/personal-learning/evidence/live-ai/` in a shape that lines up with the
   teacher review document.
5. **Teacher review** of the reason lists, objectives, checklists and Russian
   wording named in section 7, then a small student pilot judged on independent
   performance on held-out material and teacher agreement with the next step,
   as the audit proposed.

## 10. Preview and audit handoff

A local preview of the final build is served by the lead and the link is given
in the handoff message. The branch is ready for Codex's independent audit
against the brief, this document and `docs/personal-learning/CHECKLIST.md`.
Alex confirms every externally visible action listed in section 9.

## 11. Codex's review of commit 8ca6014, and the fixes

Codex reviewed the handoff commit independently on 22 September 2026
(`docs/audits/claude-personal-learning-review-2026-09-22.md`, proof scripts and
logs beside it). Verdict: substantial progress, not ready for release. Five
findings, all confirmed by the lead with Codex's own scripts before any fix, all
fixed on this branch at the root cause:

| Finding | Root cause | Fix | Commit |
|---|---|---|---|
| 1 (P1) Signing in could upload another student's older essays and goal | The four older stores (progress, plan, vocabulary, notes) had device-wide keys, and the old sign-in sync merged and pushed them before any owner was set | One shared current-owner source (`src/lib/store-owner.ts`) that every older store resolves its key from; the owner is set first in `startSyncForUser`; old device-wide keys are copied once to the owner the device stamp names and never to a different signed-in user; late pulls are dropped and pushes are refused if the owner changed; work done signed out is offered once after sign-in with plain counts (`AnonymousWorkClaim.tsx`) and moved only on an explicit yes. `tests/account-isolation.test.ts` drives the real `startSyncForUser` and `stopSync` through the A, sign-out, B, A-again journey with delayed responses, pending pushes and claim accept and decline. Codex's `account-repro.mjs` now prints `{"uploadedTo":"SYNTHETIC-B"}` with no essay and no goal. | `0899045` |
| 2 (P1) A successful writing evaluation marked the answer it judged as assisted | The evaluation's help flag was applied before the answer was saved | `helpToRecord` and `helpAfterEvaluation`: an answer is recorded with the help it had when written; the evaluation raises the level only for what follows; the per-owner draft carries the help state across reloads; a source-order test fails if the old order returns. Codex's scenario on the real registry path now records assistance none, independent, and carries tutor-explained to the next answer only. | `040b86f` |
| 3 (P2) Task 2 focused exercises saved Task 1 scope | A literal `task: 'task1'` in the shared component | The task comes from the exercise registry through `WrittenTaskView.task`; `writtenEvidenceDraft` refuses a view without one; a required `piece` field gives honest wording (overview, paragraph, introduction, conclusion, sentence, answer) in English and Russian. | `040b86f` |
| 4 (P2) Three Speaking objectives lacked a check on a different question | Pilot-round data predated the check pattern | Each gains an independent check on a reserved unexposed prompt of the same part; a self-check tick is stored as the student's own claim and never as criterion evidence. All nine objectives now complete the loop. | `ec56ab1` |
| 5 (P2) The Russian progress report overflowed a phone | `white-space: nowrap` certainty badges in a two-column grid | The card header wraps, the grid is one column below 391px; measured worst case 132px badge against a 144px card. | `e921934` |

Also: the f15 browser check now allows the word "English" as a language name
on a Russian page, the narrow allowance Codex asked for (`0f13ecb`).

Gates after the fixes, on the complete tree: `npm test` 1727 tests, 1727 pass,
0 fail (1697 before the round); `npx astro check` 0 errors, 0 warnings;
`npm run build` 661 pages. The activity index was regenerated and is
unchanged.

Deliberate behaviour change for existing students, worth a look by Alex: a
browser used before this build has no owner written on its history, so the
first sign-in now asks whether that work is theirs instead of absorbing it.
Nothing is lost either way, and signing out shows it again.

CORRECTION (Codex review of 23 September, finding 1): the earlier version of
this paragraph claimed that a half-finished timed paper, though device-wide,
could not reach another account. That was wrong. Codex proved that a second
student on the same browser could open the first student's unfinished drill,
see their answers already selected, and submit them as their own evidence.
The half-finished paper (`ielts.testsession.v1`) and the mock exam state are
now owner-scoped and bound to the student who started them (commit
`0f7a7c0`); see section 12. The name on the printout and the homepage band pick stay
device-wide (neither is student work).

Browser evidence for the repaired journeys is recorded in
`docs/personal-learning/evidence/final/results-after-codex.md` (the full
scenario set plus Codex's own browser reproductions against the rebuilt
frozen snapshot) and `results-account-journey.md` (the sign-in journey clicked
against the local accounts stand-in). Real accounts, two devices and live AI
remain external, as in section 7.

### 11.1 Found by our own click-through, after Codex's review

Clicking the sign-in journey against the local accounts stand-in
(`tests/browser/f20_account_journey.py`) confirmed isolation on every step and
found one more defect of our own: the "Work saved on this device" offer was
mounted only on a navigation component no live page renders, so a student who
worked signed out was never asked whether to add that work to their account
(kept safely, never offered). Fixed in `e92d7cf`: the offer is a quiet card
above Today's session for a signed-in student with an unclaimed offer, driven
by the learner store's own owner, and a source-scan test fails if the offer
ever becomes unreachable from the dashboard again. Second click-through
(`results-account-journey-2.md`): 32 of 33 checks pass, every claim row
passes (offer with real counts, accept merges under the right student only,
a second student is never offered it, decline leaves it on the device).

The remaining check exposed a duplicated legacy drill event after claim,
sign-out and sign-in (never across accounts). Root cause: the only note that
old work had already been carried into the record lived inside the record,
which sign-out deliberately drops once the account holds it, so the next
sign-in carried the old stores across again. The note now lives on the device
per owner and moves with a claim. Third click-through
(`results-account-journey-3.md`): 33 of 33 checks pass, and a student ends
with exactly the rows they left. `tests/account-isolation.test.ts` now runs the
full journey against the stand-in started in-process.

Gates after the whole round: `npm test` 1737 pass, 0 fail; `npx astro check`
0 errors, 0 warnings; `npm run build` complete.

## 12. Codex's second review (23 September) and the fixes

Codex reviewed commit `48b1d17` again (`docs/audits/claude-personal-learning-review-2026-09-23.md`,
proof scripts and logs beside it), confirmed the five earlier fixes, and found
three remaining ownership paths, all P1. All three were confirmed by the lead
with Codex's own scripts before any fix and are fixed on this branch at the
root cause. The specification the fixes were inspected against is
`docs/personal-learning/CODEX-FIX-ROUND-2.md`.

| Finding | Root cause | Fix | Commit |
|---|---|---|---|
| 1 (P1) Another student's unfinished test could be submitted into the new account | The half-finished sitting (`ielts.testsession.v1`) and the mock history (`ielts.mock.v1`) were device-wide, and the player restored whatever was there for whoever was signed in | Both stores are owner-scoped through the same one-time adoption rule as the older stores (old keys copied, never modified or deleted, never to a different signed-in student). A sitting is bound in memory to the owner it started under; if the owner changes while the player or the mock is mounted, the timer freezes, nothing more is saved, submission refuses and a calm card offers a fresh start. Submission records only under the sitting's own owner while that owner is current. The mock history joins the explicit claim list. `tests/test-session-owner.test.ts` (13 tests); browser journey `f22` against the stand-in, 22 of 22 (`results-unfinished-test.md`). | `0f7a7c0`, `2eabb37` |
| 2 (P1) A cancelled sign-in could restore the signed-out student's owner | Only the caller checked the sign-in generation, after a helper had already moved the owner; a cancelled sign-in finished anyway | Each sign-in step holds the current generation and asks it before moving an owner, writing a store, sending a request or adding a subscription; a cancelled step leaves every store on the current owner; the learning sync layer is handed the same check. Codex's `signout-race.mjs` now prints the owner anonymous both immediately after sign-out and after the cancelled sign-in finishes, with no essay visible. Cancellation and A-to-B switch cases in `tests/account-isolation.test.ts`. | `2eabb37` |
| 3 (P1) Direct entry or refresh on a full-screen test page recorded signed-in work as anonymous | The owner defaulted to anonymous until a menu component mounted, and the bare test, drill and mock pages mount no menu | One app-wide account lifecycle (`src/lib/auth/lifecycle.ts`, started by `AccountLifecycle.astro` from the base layout on every route, outside every bare branch) answers the owner from the session the browser already holds on the first read, so no page or mount order can be too early; the two menus read it instead of owning it. Cold-initialisation test and a source-scan test that every page on the bare layout renders the lifecycle; browser journey `f21` against the stand-in, 22 of 22 (`results-direct-entry.md`): a drill entered by URL while signed in lands in the student's own record and reaches the stand-in under them alone, a mid-paper refresh keeps the sitting and its timer, signed-out use still records anonymously. | `2eabb37` |

Also in this round: the browser suite's dates come from the real clock rather
than a frozen 22 September (`a8abf89`, Codex's request); raw control bytes in
two source files written as escapes; the incorrect claim in section 11 that
unfinished tests could not reach another account replaced with the truth.

Gates after the round, on the committed tree `2eabb37`: `npm test` 1755 pass,
0 fail; `npx astro check` 0 errors, 0 warnings; `npm run build` 661 pages;
the activity index unchanged by regeneration.

Browser evidence for the whole suite after this round is in
`docs/personal-learning/evidence/final/results-round2.md` (frozen snapshot of
`2eabb37`, the three stand-in journeys, and Codex's own two browser
reproductions rerun against the fixed build). Real accounts on real devices,
production access policies and live AI remain external, as in section 7.

Independent inspection: at Alex's request the lead ran a fresh read-only
Codex inspection of this round itself (the claudex-loop contract: plan,
change manifest and diff against `48b1d17`, structured verdict, write-capable
integrations switched off for the run) on a clean copy of `2eabb37`; its
verdict and findings are recorded in section 13.

## 13. Fresh Codex inspection of the round-2 fixes

At Alex's request the lead ran Codex itself as the independent inspector of
this round, through the claudex-loop contract (read-only session, the plan
`docs/personal-learning/CODEX-FIX-ROUND-2.md`, the change manifest and diff
against `48b1d17`, a structured verdict; the write-capable integrations were
switched off for the run and the model was the CLI default, gpt-6-astra).

**Inspection 1, of `2eabb37`: REVISE, four findings, all accepted and fixed.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-1-of-2eabb37.json`.

| Finding | What was wrong | Fix | Commit |
|---|---|---|---|
| R2-01 (high) | An old unowned test sitting was adopted into whoever the history migration stamp named, not into the anonymous owner the spec requires; a test asserted the wrong rule | Unowned sittings and old mock history adopt into the anonymous device owner only; the stamp is not consulted; Codex's case (stamp names A, sitting started by B) is a named test and a browser step | `ba11669` |
| R2-02 (high) | A speaking grade returning after the owner changed was recorded under the current owner; the same pattern existed for essays and the standalone examiner | Every grading request is bound at start to the student who started it and its reply is saved under that student's own namespace, shown only while they are still on screen; a late grade is never written under the next student and never dropped | `1a194f8` |
| R2-03 (medium) | A stopped mock offered its own student no way back and kept its progress only in memory | The running mock is saved per student and resumable by that student; another student gets a separate fresh mock | `ba11669` |
| R2-04 (medium) | The initial owner was read from any Supabase token on the origin, which GitHub Pages shares across applications | Only this application's own project token names the owner; unconfigured accounts are anonymous | `1a194f8` |

Host follow-up: the explicit "work saved on this device" claim now also
carries an unfinished test and a paused mock into the account, re-stamped so
they can be resumed.

**Inspection 2, of `3fec8f4`: REVISE, three findings, all accepted and fixed.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-2-of-3fec8f4.json`.
Codex confirmed the delayed-grade paths were closed and found:

| Finding | What was wrong | Fix |
|---|---|---|
| R2B-01 (high) | The essay editor bound its owner only at submit, so an essay typed by A could be submitted by B after a switch, and the draft autosave could save A's text under B | The editing session and every draft write are bound to the owner who starts or restores the essay; an owner change preserves that owner's draft, cancels pending timers and replaces the editor with the new owner's state; a stale submission is refused |
| R2B-02 (medium) | An account change during the mock's speaking leg was handled as a deliberate cancellation, so the mock advanced to results and its own student could not resume | Suspension is distinguished from cancellation; the mock never advances on suspension and resumes at the speaking brief |
| R2B-03 (medium) | A mock's legs shared the single standalone session slot, so another paper started mid-mock wiped them and a new mock could restore an older sitting | Mock legs are persisted under the mock sitting's own identity, separately from standalone sessions; the player restores, saves, clears and reconciles by that identity |

The fixes for those three landed in `b10fc10` (essay editing session bound
to its owner in `src/components/writing-editor-owner.ts`; the examiner's
suspend-versus-abort split; mock legs kept inside the sitting's own record
under its `sittingId`). Gates at that commit: 1822 tests, type check clean,
661 pages, learning index unchanged, Codex's race script anonymous both
times, f22 83 of 83, f23 37 of 37. The frozen-suite rerun of that build
(`results-round3.md`, on disk) matched round 2 row for row: 296 pass and
the one by-design fail.

**Inspection 3, of `7c5264a`: REVISE, four findings, all accepted.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-3-of-7c5264a.json`.
Codex calls the round-2 fixes "substantially implemented" and names four
edge cases, one round past the skill's default budget at Alex's standing
instruction to run the loop with Codex directly:

| Finding | What was wrong | Fix |
|---|---|---|
| R2C-01 (medium) | The late grade's keep step cleared the submitter's draft unconditionally, so a revision A made after returning to the page, before the older grade arrived, was deleted by it | Draft deletion is tied to the submitted revision; a newer revision, including one still waiting on the debounce, is preserved |
| R2C-02 (medium) | The mock screen's own snapshot writes and its clear checked only the owner, so a second mock started in another tab could be replaced or deleted by the older tab | Creation is separated from updates; ordinary saves and clears must match both owner and sitting id; a mounted mock whose sitting was replaced stops and never writes again |
| R2C-03 (medium) | When the sitting's own student returned to a still-mounted paper after an account change, the timer resumed from the frozen count, granting the time away back | The saved deadline is the timer's only authority, including after an owner change and before a submission; an expired sitting is handled as on a fresh load |
| R2C-04 (high) | The speaking trainer bound its owner but kept recording and stepping through questions after the account changed, so the next student's answers could become the first student's evidence | The attempt is suspended the moment the owner changes: capture stopped, pending turns cancelled, an unfinished recording dropped and never graded; a grade already requested is still kept for the first student; the standalone live examiner ends its session the same way |

The fixes for those four landed in `b3a2689` (a late report spares a
revision through `clearSubmittedEssayDraft`; a speaking attempt bound to its
owner in `src/components/speaking-attempt-owner.ts`, used by the trainer and
the standalone examiner; only Start Mock Exam creates or replaces a sitting,
and a replaced tab stops; the player's clock reads the saved deadline through
`paperClockAt`). Gates at that commit: 1848 tests, type check clean, 661
pages, learning index unchanged, race script anonymous both times, f23 56 of
56 with a fake microphone, f22 107 of 107.

**A bug beyond the brief, found and fixed on the way, and present on the
published site.** When a paper ran out of time, the player handed it in with
the answers as they were when the timer started, usually none, so anything
the student typed after that was lost. The published main branch carries the
same timer (its time-up path calls the submit function captured when the
timer started). The fix is part of `b3a2689`; the browser run proves it (with
the old timer, a time-up recorded the paper as blank despite the student's
answer). Publishing this branch fixes it on the live site; that is Alex's
call, as everything published is.

Two same-student two-tab gaps the mock builder found (a standalone paper
opened in a second tab is overwritten by, and cleared from, the first tab; a
mock whose record was finished or claimed in another tab keeps running and
can be recorded twice) were not part of any finding. They are being closed
in a follow-up commit before the loop ends, so that the inspection does not
have to raise them.

**Inspection 4, of `1701b97`: REVISE, three findings, all accepted.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-4-of-1701b97.json`.
Two of the three are the two-tab gaps named just above, which were already
being closed when the inspection ran; Codex adds a requirement to each. The
third is new and rated high:

| Finding | What was wrong | Fix |
|---|---|---|
| R2D-01 (high) | In the mock, a microphone permission or a voice connection that resolved after the examiner had been taken off screen (an account change mid-start) was still installed and started, with a token fetched for the account now on the browser, so capture and a paid session could run behind the stopped screen | Every session start captures a generation and the owner binding; after every await a cancelled, unmounted or changed-owner session releases the stream it was handed, closes a late connection and starts nothing; the same guard runs before grading after an asynchronous shutdown; grades already requested are preserved |
| R2D-02 (medium) | The standalone slot's saves and clear checked only the owner, the standalone sitting had no identity, and the player recorded submission evidence before finishing the sitting, so a second paper in another tab could be overwritten and cleared by the first | Standalone sittings get their own identity; updates and completion require owner, paper and sitting identity to match; a stale player stops when its sitting is replaced or removed; completion is validated before any evidence is recorded |
| R2D-03 (medium) | A mock whose record was finished in another tab was not treated as replaced, the results step ignored a refused clear, and the history write appended unconditionally, so a mock could be recorded twice | The disappearance of a persisted sitting is terminal for the stale tab; results are recorded only after a successful, identity-checked finalisation; mock history writes are idempotent by sitting id |

The fixes for those three landed in `222feb6` (every examiner start numbered
and tied to its student, with a late microphone or connection released;
standalone sittings with their own identity and a stale tab that stops;
the mock recorded once per sitting, only after an identity-checked
finalisation). Gates at that commit: 1878 tests, type check clean, race
script anonymous both times, f22 131 of 131, f23 70 of 70 with a
before-versus-after run of the examiner race. One window the examiner
builder found inside the live-session setup (a paid session request that
could still go out a few seconds after a switch, then be closed at once) was
closed in `b7b083a`: the session-opening functions ask the examiner's own
"may I continue" check immediately before the request that creates the paid
session and before the Gemini socket (`src/lib/speaking/live/start-check.ts`),
letting go of what was built and sending nothing on a no. Gates at that
commit: 1892 tests, type check clean, 661 pages, index unchanged, race script
anonymous both times, f23 81 of 81 with section 8 failing three ways against
the pre-fix code.

**Inspection 5, of `c4a7793`: REVISE, three findings, all accepted.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-5-of-c4a7793.json`.

| Finding | What was wrong | Fix |
|---|---|---|
| R2E-01 (high) | Inside the voice-session setup the cancellation was checked too late once the session request had succeeded: the remote answer was applied first, playback started unconditionally, a pending connection could not be closed by the screen until startup resolved, failure paths did not end the session at the Worker, and the Gemini open callback could still send its setup | Pending setup is directly cancellable; the check runs before the remote answer and inside the callbacks; peers, sockets and playback are released at once; every created session is ended at the Worker on every failure path; successful delayed-connection cases are tested |
| R2E-02 (medium) | Once a paper was submitted, its review stayed on screen for whoever signed in next, with the review controls and "ask why this is wrong" still active | Owner checks apply to completed reviews; the previous student's answers, score and tutor controls leave the screen on an owner change; review requests and cached replies are bound to their owner |
| R2E-03 (medium) | Two tabs on the same mock paper could each hand it in, the second overwriting the first and recording a second attempt | Completion is terminal per leg; an already-completed leg is rejected; stale players stop; evidence is recorded only for the first accepted completion |

The fixes for those three landed in `fd9bdf8`, together with four holes of
the same class that the builders themselves reported and that were closed
before asking Codex again: every Mr EZ request is bound to its student and
the panel's conversation, previously one nameless copy per browser tab, is
stored per student; the in-lesson practice evaluation and lesson help record
only under the student who pressed; the focused Reading and Listening
exercise and the lesson quick check are sessions bound to their student that
hand over on a switch. Gates at that commit: 1958 tests, type check clean,
661 pages, index unchanged, race script anonymous both times, f23 90 of 90
(with a genuinely successful loopback voice connection torn down within 2.5
seconds of a switch), f22 185 of 185.

**The published main was merged in at `c5cf425`** (origin/main `9b775df`:
the new vocabulary practice with marked questions from example sentences,
two reading-practice content commits, and the study-screen polish). Four
conflicts were resolved so that both intentions survive (the vocabulary
store and screen, the dashboard card, the plan-settings page), and the
learning-index generator was taught main's per-question practice sources
(compact index format 3). Gates on the merged tree: 1968 tests, type check
clean, index regenerated and deterministic, race script anonymous both
times. Vocabulary practice now records recognition rather than recall; the
course catalogue's wording for that activity is corrected in a follow-up.

**The last screens of the same class landed in `34b7583`**, reported by the
builders rather than by an inspection: the inline lesson quiz, the
vocabulary round (on main's merged screen) and the spoken focused task are
bound to their student and hand over on a switch; the written task ignores
presses on a screen that was about to be handed over; the course catalogue's
two vocabulary activities now declare recognition, not recall, with
objectives that describe the merged practice, in English and Russian; and
the sign-in path no longer resets the owner to anonymous and back for a
student who is already the owner, so a signed-in page load announces no
false account change and a real change is announced exactly once. Gates at
that commit: 2004 tests, type check clean, 661 pages, index unchanged, race
script anonymous both times, f22 207 of 207 (the spoken task measured on a
fake microphone). Known and stated rather than fixed: five "mark as studied"
or intake buttons still write at the press through the shared store (no
other student's answers are involved; a tab that missed a switch would
record that mark under the student it thinks is there).

**Inspection 6, of `defa6f1`: REVISE, two findings, both accepted.**
Structured result: `docs/personal-learning/evidence/codex-inspections/inspection-6-of-defa6f1.json`.
(The diff for this round is taken from `c4a7793`, the commit Codex judged in
round 5, because the full diff had grown past Codex's input limit once the
merge of main was inside it; the spec records the exclusions.)

| Finding | What was wrong | Fix |
|---|---|---|
| R2F-01 (high) | On the spoken focused task, two presses of Start while the microphone permission was pending started two recorders, and a switch stopped only the last, leaving a microphone capturing behind the cleared screen; the recorder's timeout did not release the tracks | Startup is single-flight; each take is checked to be current after every wait and stale streams released; the previous take is cancelled before replacement; the timeout releases the tracks |
| R2F-02 (medium) | On the written focused task, a late evaluation's record step also reset the editable draft to the submitted text, overwriting a revision written after returning to the page | Appending the attempt is separated from updating the draft; a newer draft or a pending autosave is preserved |

**Inspection 7** (a fresh session, after those two fixes; by the stopping
rule agreed after round 5, the last unless it returns something rated high
or a leak between students) is recorded below once run.

