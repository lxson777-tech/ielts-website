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
