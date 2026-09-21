# Personal learning platform: binding architecture

Author: architect pass, 21 September 2026. Base commit `e2bf9e6`, branch
`claude/todays-tab-ai-tutor-rework-8af4cd`.

Source of scope: `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md`.
Source of findings: `docs/audits/personal-learning-plan-2026-09-21.md`.

This document is the implementation contract. Engineers working in parallel
must follow it. Where it disagrees with the audit's counts, the code was
re-measured and this document wins; every count below was produced by running
the real modules, not by reading them.

Companion documents:

- `docs/personal-learning/CHECKLIST.md`, every requirement, its id, its work
  package, its status.
- `src/lib/learning/contracts/*.ts`, the compiling TypeScript contracts.

---

## 0. The one-paragraph summary

Today three separate engines answer "what next" and can name three different
activities on the same screen. This build replaces them with one shared
module, `src/lib/learning/`, that both the site and the Mr EZ Worker import:
a small activity catalogue, an append-only learner record, one evidence
policy, and one plan that owns a single current session. `courseStatus`,
`getTodayPlan` and `recommendNext` survive as thin adapters over that
session. AI gains a real teaching role (contextual help, judging focused
practice, proposing a next move) inside hard validation: code still counts
facts, resolves every link from real ids, and rejects anything stale.

---

## 1. Current state, with line references

### 1.1 Every store that exists

#### localStorage

| Key | Defined at | Shape | Synced today |
|---|---|---|---|
| `ielts.progress.v1` | `src/lib/progress.ts:7` | `ProgressV1` (`:141`): `{version, lessons: Record<slug,{completedAt}>, tests: Record<testId, TestAttempt[]>, writing: Record<promptId, WritingAttempt[]>, speaking: SpeakingAttempt[], activity?: Record<YYYY-MM-DD, {minutes,lessons,attempts}>}` | yes |
| `ielts.studyplan.v1` | `src/lib/study-plan.ts:9` | `SavedPlan` (`:11`): `{targetBand, testDate, createdAt, done:number[], doneKeys?:string[], startDate?, dailyMinutes?, studyDays?, defaulted?, skillTargets?}` | yes |
| `ielts.vocab.v1` | `src/lib/vocab-review.ts:414` | `VocabStoreV1` (`:53`): `{version:1, settings:{newPerDay}, cards: Record<word, {ease,interval,due,reps,lapses,introducedDate,lastReviewed?}>}` | **no** |
| `ielts.notes.v1` | `src/lib/notes.ts:26` | bookmarks by `(kind,id)` plus one free-text note per lesson slug | **no** |
| `ielts.locale.v1` | `src/lib/i18n/locale.ts:28` | `'en' \| 'ru'` | **no** |
| `ielts.report.name.v1` | `src/components/ProgressReport.tsx:31` | cosmetic name on the printout | no |
| `ielts.course.view` | `src/components/CourseGate.tsx:31` | `'order' \| 'sections'` | no |
| `ielts.ez.targetBand` | `src/lib/study-plan.ts:113` | the homepage hero's band pick, read by `createDefaultPlan` | no |
| test session | `src/lib/test-session.ts` | an in-progress timed paper, for "Resume your test" (`src/pages/tests/index.astro:326-333`) | no |

None of these keys is namespaced by user id. Signing out leaves them in
place (`src/lib/auth/sync.ts:96` `stopSync` "Local data is left untouched"),
so signing in as a second student on the same browser merges the first
student's work into the second account. This is finding **R7.4-account-
isolation** in the checklist.

#### Supabase (`supabase/schema.sql`)

| Table | Columns that matter | Who writes |
|---|---|---|
| `user_state` | `user_id` pk, `progress` jsonb, `study_plan` jsonb, `updated_at` | the browser, under RLS |
| `live_examiner_sessions` | session accounting | the live-examiner Worker (service role) |
| `mr_ez_conversations` | `summary`, `summarised_turns` | Worker writes, student reads and deletes |
| `mr_ez_messages` | `role`, `content` | Worker writes, student reads and deletes |
| `mr_ez_turns` | token counts, `cost_usd`, `idempotency_key` unique per user, `reply` jsonb | Worker writes; student may update the `reply` column only |
| `mr_ez_recommendations` | `user_id` pk, `fingerprint`, `reply` jsonb | Worker writes, student reads and deletes |
| `mr_ez_notes` | pk `(user_id, kind, note_key)`, `fingerprint`, `reply` | Worker writes, student reads and deletes |

`mr_ez_recommendations.reply` and `mr_ez_notes.reply` already contain
catalogue activity ids inside a `TutorRecommendation`. **That is why
catalogue ids may be added to but never renamed.**

### 1.2 The three competing next-step engines

| Engine | Defined | Decides by | Read by |
|---|---|---|---|
| `courseStatus` | `src/lib/course.ts:186`, `next` at `:189` | first lesson in a fixed 8-unit order that `progress.lessons` does not contain | `src/components/LearningDashboard.tsx:139`, `src/components/Course.tsx:124`, `src/components/AccountMenu.tsx:40`, `src/components/AccountOverview.tsx:39`, and `src/lib/tutor/recommend.ts:84` |
| `getTodayPlan` | `src/lib/plan/schedule.ts:384` | a calendar built by spreading the same 8 units over the available dates (`buildSchedule` `:226`), plus a rolled-forward backlog (`:392-398`) | `src/components/plan/PlanToday.tsx:60` |
| `recommendNext` | `src/lib/tutor/recommend.ts:125` | seven ordered evidence rules; the only engine that looks at results | `src/lib/tutor/local.ts:30` (browser) and `workers/mr-ez/src/index.ts:1145` |

A fourth answer exists and is different again: `src/layouts/LessonLayout.astro:50`
computes the lesson footer's "Next in course" as the **positional** successor
`courseLessons[courseIndex + 1]`, not the next incomplete one. A student who
skipped ahead is sent somewhere none of the other three would send them.

All three run simultaneously on `/dashboard`: `MrEzWelcome`
(`LearningDashboard.tsx:154`), `PlanToday` (`:157`) and the "Your course"
card (`:162-178`). The comment at `LearningDashboard.tsx:136-138` claims a
single source of truth, but it only guarantees parity with `Course.tsx`, not
with the other two. This is the audit's reproduced finding 1.

Two more facts that matter for the rework:

- `createDefaultPlan()` (`src/lib/plan/schedule.ts:107`) fabricates Band 7.0,
  no exam date, **25 minutes**, every day, and marks it `defaulted: true`
  (`src/lib/study-plan.ts:49`). `loadOrCreateStudyPlan()` (`:128`) persists it
  on first read, so every student has a plan from their first page view.
- `defaulted` is the ONLY signal distinguishing a fabricated plan from a
  confirmed one. It is set to `true` only in `createDefaultPlan`, and cleared
  only where the student actually saves settings: `MrEzWelcome.tsx:222`
  (`defaulted: false`) and the `Course.tsx` settings strip. `resolvePlanParams`
  (`schedule.ts:78`) then fills `dailyMinutes ?? 25` and
  `examDate = startDate + 8 weeks` when there is no date. **Migration reads
  `defaulted` and nothing else** (see section 4).

### 1.3 The three competing evidence policies

| Policy | Where | Rule |
|---|---|---|
| Tutor insights | `src/lib/tutor/insights.ts:35-44` | MEASURED needs 8 questions across 2 sittings; weak under 65%; strong at 80%; tentative from 4 questions; criterion patterns need 2 graded pieces in a window of 4 |
| Level estimate | `src/lib/level.ts:50-64` | recency-weighted mean over the last 6 attempts, decay 0.65 per position, drills weighted 0.6, stub grades excluded, floor band 2.5, confidence from coverage |
| Progress report | `src/components/ProgressReport.tsx:203-209` | raw lifetime `correct/total` per type for weakest and strongest, best band per paper, and `:196-201` joins Reading, Listening, Writing and Speaking attempts into **one** chronological trend line |

The tutor's stamping is the piece worth keeping. `Observation`
(`insights.ts:129`) carries its own evidence sentence, its template and its
confidence, and `readObservations` deliberately refuses to call three types
"the weakest" (`:436-470`). The new policy generalises exactly that.

### 1.4 How sync works today

`src/lib/auth/sync.ts`:

- `startSyncForUser` (`:64`) pulls the row (`:26`), union-merges with local
  (`mergeProgress` `src/lib/progress.ts:383`, `mergeStudyPlans`
  `src/lib/study-plan.ts:190`), writes the merge to localStorage, pushes.
- Local writes subscribe through `onProgressChange` / `onStudyPlanChange` and
  debounce a push by 1500 ms (`:55-60`).
- `mergeProgress` dedupes attempts on their ISO `at` string and keeps the
  earliest lesson completion. Activity counts take the **max** per day rather
  than the sum, to avoid double counting a stale cloud copy (`:424-436`).
- `mergeStudyPlans` is **last-write-wins on `createdAt`** (`:201`). An old tab
  whose plan has a later `createdAt` overwrites a newer plan. This is the
  concurrency hole the plan revision closes.
- `stopSync` (`:96`) unsubscribes and leaves local data in place.

### 1.5 How the tutor Worker builds context

`workers/mr-ez/src/index.ts`, in order inside `runTurn` (`:1005`):

1. idempotency replay from `mr_ez_turns` inside a 10-minute window (`:1008`);
2. `loadStudentState` reads `user_state` **filtered by the verified user id**
   (`:344-355`) so no caller can name whose data to load;
3. `readInsights(progress, plan, lessonCount, now)` (`:1032`);
4. welcome cache lookup against `insightsFingerprint(insights, locale)`
   (`:1038-1049`), and the note cache for weekly/unit (`:1119`);
5. limits, counted against `mr_ez_turns` so they hold across instances
   (`:1125`, `checkLimits` `:581`);
6. for a review task, the questions are fetched from the site's own published
   JSON, never from the request (`fetchSiteTest` `:478`, backed by
   `src/pages/data/tests/[id].json.ts` and validated by `isSiteTest`
   `src/lib/tutor/test-items.ts:190`);
7. `recommendNext` chooses the activity in code (`:1145`);
8. the model writes prose into a strict JSON schema
   (`TUTOR_OUTPUT_SCHEMA` `src/lib/tutor/prompt.ts:158`);
9. an id the model names is resolved against the catalogue and dropped if it
   does not exist (`resolveRecommendation` `:888`);
10. usage is written to `mr_ez_turns`, the welcome to
    `mr_ez_recommendations`, notes to `mr_ez_notes`.

Three patterns here are reused verbatim by this build and must not be
reinvented: **the published-JSON content endpoint**, **the fingerprint
cache**, and **the idempotency key generated once per user action**
(`src/lib/tutor/client.ts:137-141`).

### 1.6 How i18n works, and how to add a string

- `t(text, vars?, ctx?, locale?)` at `src/lib/i18n/translate.ts:67`. The
  English literal **is** the key; `ctx` joins with `\x04` (`:24`, `:29`).
  Placeholders are filled after lookup (`:35-40`) so Russian may reorder them.
- `nt(text)` at `:81` returns its argument unchanged. It marks a literal that
  lives in a data registry and is rendered elsewhere. The coverage extractor
  treats it exactly like `t()` (`tests/i18n.test.ts:385-392`).
- `tn(n, {one, other}, vars?)` at `:139`, keyed by the English `other` form,
  with `Intl.PluralRules` so Russian gets four forms (`:102-127`).
- `.astro` markup uses `data-i18n` and `data-i18n-attr` (`src/lib/i18n/dom.ts`).
- React uses `useT()` (`src/lib/i18n/react.ts:79`).
- Russian lives in ten batch files under `src/lib/i18n/dict/ru/`, merged by
  `ru/index.ts:23-34`, loaded as a dynamic import chunk
  (`src/lib/i18n/dict/index.ts:44-46`) so English students download none of it.
- Big coaching texts are separate "parts" (`dict/parts.ts:41-45`).
- **The tutor layer keeps its Russian outside that dictionary**, in
  `src/lib/tutor/ru.ts`, because the Worker cannot read a lazy browser chunk.
  Anything in `src/lib/learning/` that writes a sentence the Worker also
  writes must put its Russian there.

**To add a new interface string:** wrap the English at the call site with
`t`/`nt`/`tn` (or `data-i18n`), add the Russian to the batch file whose header
comment owns that source file, keep every `{placeholder}`, use no dashes, and
run `npm test`. The coverage test that fails on an untranslated literal is
`tests/i18n.test.ts:480` ("every wrapped English string has a Russian
translation"); the tutor's own is `tests/mr-ez-i18n.test.ts:444`.

### 1.7 How tests are written and run

- Command: `package.json:11`,
  `node --import ./tests/ts-extension-loader.mjs --test tests/*.test.ts`.
- 30 test files today, `node:test` plus `node:assert/strict`.
- Source imports carry an explicit `.ts` extension
  (`tests/plan-schedule.test.ts:1`); the loader exists for the extensionless
  imports **inside** those sources (`tests/ts-extension-loader.mjs:33-36`).
- **There is no DOM and no localStorage shim anywhere in `tests/`.** Every
  engine takes `progress`, `plan` and `now` as explicit parameters, and every
  storage-reading module returns a safe default under `typeof window ===
  'undefined'`. New learning code must keep that property: **pure core, browser
  file separate**, or it cannot be tested at all.
- Fixtures are hand-written object factories at the top of the file
  (`makePlan`, `emptyProgress` in `tests/plan-schedule.test.ts:19-33`).
- Worker tests use the fake-backend harness `tests/mr-ez-harness.ts`.
- One load-bearing caveat: **`src/lib/vocab-review.ts` uses
  `import.meta.glob`** (`:197-204`), which does not exist under plain Node. In
  tests `CARD_SET.length` is 146 across 14 topics; in the real Astro build it
  is **719 words across 36 topics**. Any test that asserts a vocabulary count
  must assert the Node number and say so.

---

## 2. The contracts

The compiling TypeScript is in `src/lib/learning/contracts/`. It type-checks
clean under the project's strict settings with `verbatimModuleSyntax` and
`isolatedModules`. The excerpts below are the load-bearing parts; read the
files for the full doc comments.

### 2.1 Module layout

```
src/lib/learning/
  contracts/            types, unions and named constants ONLY, no logic
    catalog.ts  evidence.ts  policy.ts  plan.ts  ai.ts  sync.ts  index.ts
  catalog.ts            assembles LearningCatalogueV1 from registries + index
  evidence.ts           pure functions over LearnerRecordV1
  migrate.ts            ProgressV1 -> LearnerRecordV1, deterministic
  policy.ts             the one evidence policy
  planner.ts            pure replan(): inputs in, PersonalPlanV1 out
  session.ts            session assembly for a budget
  adapters.ts           courseStatus / getTodayPlan / recommendNext shims
  store.browser.ts      localStorage, namespaced by user
  sync.browser.ts       push/pull, debounce, conflict handling
  index.ts              public entry (re-exports the pure surface only)
```

Hard rule, enforced by a test: nothing under `src/lib/learning/` except the
two `*.browser.ts` files may reference `window`, `document`, `localStorage`
or `fetch`, and nothing at all may import `src/data/tests`,
`src/lib/tests/drills.ts` or `src/lib/plan/schedule.ts`. Those three pull in
**3.70 MiB** of passages and transcripts.

### 2.2 Catalogue (`contracts/catalog.ts`)

```ts
export interface CatalogueActivity {
  id: string;                 // 'lesson:reading-headings', 'practise:reading:matching-headings', ...
  contentVersion: number;
  kind: ActivityKind;         // lesson | lesson-check | focused-exercise | drill | full-test
                              // | graded-task | vocab-review | reference | planning
  domain: LearningDomain;     // Paper | 'vocabulary' | 'exam-skills'
  paper?: Paper;
  subskill: Subskill;
  criterion?: WritingCriterion | SpeakingCriterion;
  objective: string;
  prerequisites: readonly string[];
  expectedMinutes: number;
  indivisible: boolean;
  target: ActivityTarget;     // {kind:'route', href} | {kind:'task', taskId, indexRef}
  completionEvidence: CompletionEvidenceKind;
  explanationLocales: readonly Locale[];
  provenance: ContentProvenance;   // imported-paper | publisher | teacher-authored | project-authored
  sharesItemsWith?: readonly string[];
  tags?: readonly string[];
}
```

The catalogue is assembled at import time from the six lesson registries
(29.5 KiB total, free for the Worker) plus **one generated index**:

```ts
export interface GeneratedIndexV1 {
  version: 1;
  indexVersion: string;          // hash of the generator's inputs
  generatedAt: string;
  tests: readonly TestIndexEntry[];            // id, skill, byType, questionIds, minutes
  drills: readonly DrillIndexEntry[];          // id, sourceTestId, part, byType, questionIds
  lessonChecks: readonly LessonCheckIndexEntry[];
  focusedExercises: readonly FocusedExerciseIndexEntry[];
  writingPrompts: readonly WritingPromptIndexEntry[];
  speakingPrompts: readonly SpeakingPromptIndexEntry[];
  vocabTopics: readonly VocabTopicIndexEntry[];
}
```

Written by `tools/generate-learning-index.mjs` into
`src/data/generated/learning-index.json` (`LEARNING_INDEX_SOURCE`), committed,
capped at 256 KiB (`LEARNING_INDEX_MAX_BYTES`), and republished at
`/data/learning-index.json` by a new Astro endpoint so the Worker can fetch it
if it ever outgrows bundling. A test regenerates it and fails when the
committed copy differs, exactly the way `tests/explanations-ru.test.ts`
already guards translation staleness.

**Lesson-check item identity.** `PracticeQuestion`
(`src/data/reading-practice.ts:17`) has no `id`. Identity today is positional:
`practiceKey(unitIndex, questionIndex)` at
`src/lib/i18n/test-explanations.ts:68` produces `u0-q3`. The index therefore
stores that key **plus a short content hash** (`LessonCheckItem.itemVersion`),
so a reordered or rewritten question is detectable rather than silently
inheriting the previous question's evidence. Do not renumber the data; do not
invent a parallel id scheme.

### 2.3 Evidence (`contracts/evidence.ts`)

```ts
export interface EvidenceEvent {
  id: string;                    // deterministic, content-derived
  activityId: string;
  contentVersion: number;
  at: string;                    // ISO
  localDate: string;             // YYYY-MM-DD in the student's zone
  paper?: Paper;
  subskill: Subskill;
  mode: EvidenceMode;            // lesson-check | practice | diagnostic | assessment | review
  completion: CompletionState;   // completed | partial | abandoned | blank | expired
  assistance: AssistanceLevel;   // none | hint | worked-example | answer-shown | tutor-explained
  seenBefore: boolean;
  outcome: EvidenceOutcome;      // Scored | Graded | ObjectiveJudgement | Studied | Recall
  items?: readonly ItemOutcome[];   // firstAnswer, correct, assistance, seenBefore, seconds?
  retryOf?: string;
  supersedes?: string;
  provenance: EvidenceProvenance;   // recorded | legacy | self-reported | simulated
  sessionId?: string;
  locale?: Locale;
  pendingGrading?: boolean;
}

export interface LearnerRecordV1 {
  version: 1;
  evidenceVersion: number;          // bumped on every append
  events: readonly EvidenceEvent[];
  exposure: readonly ExposureEntry[];
  selfReported: readonly SelfReportedScore[];
  migration: MigrationStamp | null;
}
```

Three distinct things, never conflated: `StudiedResult` (a completion click),
an item whose `assistance !== 'none'` (assisted success), and an item with
`assistance === 'none' && !seenBefore` on a first answer (independent
demonstration). Only the third can move an ability estimate on its own.

No raw audio is retained. Speaking evidence keeps the grader's criteria and,
where the grader produced one, a transcript excerpt.

### 2.4 Policy (`contracts/policy.ts`)

```ts
export type Certainty = 'unknown' | 'self-reported' | 'limited' | 'tentative' | 'measured';

export interface AbilityEstimate {
  scope: PolicyScope;      // paper | writing-task | speaking-part | criterion | subskill | vocabulary
  scopeKey: PolicyScopeKey;
  certainty: Certainty;
  band: number | null;
  range: readonly [low: number, high: number] | null;
  percent: number | null;
  evidence: EvidenceCount; // independentOccasions, assistedOccasions, independentItems,
                           // daysSinceLatest, ignored[{reason,count}]
  trend: number | null;
  needsAssessment: boolean;
}
```

`DEFAULT_POLICY_THRESHOLDS` keeps today's tutor numbers where they were
already right (8 items, 2 occasions, 65%, 80%, 4 tentative, 2 graded, window
of 4) and states the rest for the first time: `freshnessDays: 21`,
`staleDays: 120`, `drillWeight: 0.6` (from `level.ts:59`), `assistedWeight:
0.25`, `reviewSpacingDays: [3, 7, 16, 35]`, `repeatedDifficultyLimit: 3`.
Every one is provisional and configurable, and nothing in the interface may
present them as validated IELTS science.

Three caps are absolute: `LEGACY_MAX_CERTAINTY = 'limited'`,
`SELF_REPORTED_MAX_CERTAINTY = 'self-reported'`, and
`PARTIAL_EXERCISE_CAN_SET_BAND = false`.

`PolicyOutputV1.overall` is null unless all four papers carry at least
tentative evidence from a complete paper or a full graded task. On today's
`/report` page an overall figure is implied from whatever exists; that stops.

### 2.5 Plan and session (`contracts/plan.ts`)

```ts
export interface PersonalPlanV1 {
  version: 1;
  revision: number;                 // optimistic concurrency
  evidenceVersion: number;
  status: PlanStatus;               // on-track | provisional-no-date | recovering
                                    // | date-passed | exam-imminent | goal-met
  confirmed: boolean;               // successor to SavedPlan.defaulted, inverted
  createdAt: string; updatedAt: string;
  goals: PlanGoals;                 // every field carries 'confirmed' | 'provisional'
  constraints: PlanConstraints;     // regularDailyMinutes, studyDays, explanationLocale, tz
  activeSession: PlanSession;       // THE one current session
  schedule: readonly ScheduledDay[];          // rolling 7 days
  milestones: readonly Milestone[];
  alternatives: readonly PlanAlternative[];
  overrides: readonly PlanOverride[];
  history: readonly PlanChange[];   // capped at 40
  diagnosticsOutstanding: readonly Paper[];
}

export interface PlanSession {
  id: string; date: string;
  objective: string; objectiveScope: PolicyScopeKey;
  paper?: Paper; subskill: Subskill;
  reason: string;
  evidenceRefs: readonly SessionEvidenceRef[];
  steps: readonly SessionStep[];    // role: recall|teach|practise|feedback
                                    //       |independent-check|recap|assess|review
  budgetMinutes: number;
  extendedCommitment?: { activityId: string; minutes: number; acceptedAt: string };
  state: 'active' | 'completed' | 'abandoned' | 'superseded';
  chosenByStudent?: boolean;
}
```

Named constants that are requirements, not suggestions:
`RECOMMENDED_DAILY_MINUTES = 60`, `DAILY_MINUTE_CHOICES = [15,25,40,60,90]`,
`SCHEDULE_HORIZON_DAYS = 7`, `BUDGET_OVERRUN_ALLOWANCE = 0`,
`RECOVERY_TRIGGER_MISSED_DAYS = 2`, `RECOVERY_MAX_BUDGET_MULTIPLE = 1.5`,
`DIAGNOSTIC_MAX_SESSIONS = 5`, `DIAGNOSTIC_MAX_MINUTES_PER_SESSION = 15`,
`SHORT_DEADLINE_DAYS = 10`.

`PlanStatus` has no "complete" value that a passed date can reach. A date in
the past produces `date-passed`, which asks for a new date or a new goal.
`goal-met` is about the goal and requires measured evidence; it never means
"you opened every page".

### 2.6 AI (`contracts/ai.ts`)

Three new tasks on the existing Worker endpoint, sharing its auth, caps,
idempotency and accounting: `lesson-help` (`explain` | `hint` | `example`),
`evaluate-practice`, `propose-next`.

```ts
export interface LearningAiVersions {
  planRevision: number;
  evidenceVersion: number;
  indexVersion: string;
}
```

Every request carries them; every reply is rejected when they no longer
match. `ProposalRejectionCode` enumerates every refusal, and
`ProposalDisagreement` records the model choosing something other than the
deterministic choice **whether or not it was accepted**. That record is the
teacher-reference material the brief asks for; model self-evaluation alone is
not evidence.

`HELP_BLOCKED_MODES = ['assessment']` is checked server-side. A hidden button
is not a boundary: a direct chat message during a timed paper is refused by
the same check.

### 2.7 Sync (`contracts/sync.ts`)

Evidence pushes are a union by id and return
`{accepted, duplicates, rejected}`; a duplicate is not an error. Plan pushes
carry `expectedRevision` and come back `accepted`, `conflict` (with the
server's plan attached) or `rejected`. The conflict rule is stated once, as a
constant, so every caller and every test agrees:

```ts
export const PLAN_CONFLICT_RULE = 'confirmed > revision > updatedAt, history merged';
```

Browser caches are namespaced: `ielts.learning.record.v1::u:<userId>` (or
`::anon:<deviceId>`). Anonymous work reaches an account only through an
`OwnershipClaim` the student accepts, which states what would be claimed.

`SyncStatus` separates `pendingEvents`, `planPending` and `pendingGrading`,
because "your sync is behind" and "your essay is still being marked" are
different sentences and the student is owed the right one.

---

## 3. What stays untouched

- `ielts.progress.v1` keeps its shape, keeps being written by the existing
  recorders, and keeps syncing through `user_state.progress`. Writing history,
  speaking history, score history and the `/account` screens continue to read
  it. The learner record is written **in addition**, never instead.
- `SavedPlan` keeps being written for as long as any screen still reads it.
  The plan adapter writes both until work package 12 retires the last reader.
- `mr_ez_*` tables, the tutor's seven existing tasks, and the calibrated
  graders (`gpt-5.6-sol` for grading, `gpt-5.6-luna` for the tutor) are not
  touched. Do not change a grading model as part of this work.
- `COURSE_UNITS` (`src/lib/course.ts:87`) stays exactly as it is. It becomes
  the curriculum **library and teaching order**, not the mandatory route. The
  builder's refusal to publish an unplaced lesson (`:140`) stays, and so does
  the test pinning 76 lessons (`tests/plan-schedule.test.ts:219`).

---

## 4. Migration

### 4.1 Deterministic ids

Every migrated event id is derived from its input, so running the migration
twice produces the same rows and re-running after a rules change adds only
what is new:

| Legacy row | Event id | Outcome | Mode | Certainty ceiling |
|---|---|---|---|---|
| `progress.lessons[slug]` | `legacy:lesson:<slug>` | `StudiedResult` with `estimatedMinutes` from the registry | `practice` | studied only, never mastery |
| `progress.tests[testId][n]` where `kind !== 'drill'` | `legacy:test:<testId>:<at>` | `ScoredResult` `{raw, total, bandEstimate: band, bySubskill: byType ?? {}}` | `assessment` | `limited` |
| the same with `kind === 'drill'` | `legacy:drill:<testId>:<at>` | `ScoredResult` with **no** `bandEstimate` | `practice` | `limited` |
| `progress.writing[promptId][n]` | `legacy:writing:<promptId>:<at>` | `GradedResult` with `legacyRef` back to the store | `practice` | `limited`; `live: false` is never counted at all |
| `progress.speaking[n]` | `legacy:speaking:<at>` | `GradedResult`, `subskill` from `mode` (part1/2/3) | `practice` | as above |
| `progress.activity[date]` | not migrated | stays the source of the streak | | |

Rules that follow from the data and must be implemented exactly:

- `items` is **absent** on every legacy event. `TestAttempt` carries
  `byType` tallies only (`src/components/TestPlayer.tsx:378-396`); there is no
  per-question record anywhere in the current store. Do not fabricate one.
- `seenBefore` is `false` on every legacy event and the exposure log is seeded
  from them, so a repeat of an already-sat paper after migration is correctly
  marked seen.
- `assistance` is `'none'` and `provenance` is `'legacy'`, which caps the
  certainty at `limited` regardless of volume.
- `attempt.skill ?? 'reading'` (the existing convention at
  `src/lib/progress.ts:344`) and the renamed-lesson map
  (`RENAMED_LESSON_KEYS` `:18`) are applied before ids are computed, so a
  student who completed "Categorisation" before the 2026-09 rename keeps their
  record under the new key.

### 4.2 Plan migration, and the one-hour requirement

The only signal separating a fabricated plan from a confirmed one is
`SavedPlan.defaulted` (`src/lib/study-plan.ts:49`). Migration reads it and
nothing else:

| Legacy | New |
|---|---|
| `defaulted === true` | `confirmed: false`; every goal field `provisional`; `regularDailyMinutes` **not** carried over; intake offers 60 minutes as the recommended choice |
| `defaulted` falsy (or absent) | `confirmed: true`; `overallTarget`, `examDate`, `perPaperMinimums` all `confirmed`; **`regularDailyMinutes = plan.dailyMinutes ?? 25`, carried over exactly, with `regularDailyMinutesStatus: 'confirmed'`** |

A plan saved before the `defaulted` field existed has it absent, which is
falsy, so it is treated as confirmed. That is the right way round: an old
student's settings are preserved, and the cost of the ambiguity is that they
are not re-asked. `startDate` maps to `createdAt`; `skillTargets` maps to
`perPaperMinimums` after `sanitiseSkillTargets` (`src/lib/study-plan.ts:79`);
`doneKeys` maps to `StudiedResult` events for the five exam-readiness extras;
the legacy `done: number[]` is dropped, as its own comment already says it
should be (`:15-21`).

This is requirement **R1.3-sixty-minutes** and acceptance scenario 4. Merely
adding 60 to a select list is not completion: the intake must present it as
the recommended choice for a new plan, and a migrated confirmed plan must come
out the other side with its own number intact.

### 4.3 Running it

Migration runs once per owner namespace, in `store.browser.ts`, on first read
of the learner record, and again whenever `MIGRATION_VERSION` increases. It is
pure apart from the read and the write: `migrateProgress(progress, plan,
registryMinutes)` takes plain objects and returns a `LearnerRecordV1`, so it
is unit-testable with no DOM.

---

## 5. The planner

`replan(input): { plan: PersonalPlanV1; changes: PlanChange[] }` is a pure
function. No storage, no clock of its own, no network.

### 5.1 Inputs

```
catalogue      LearningCatalogueV1
record         LearnerRecordV1
policy         PolicyOutputV1          (already computed from record + goals)
previous       PersonalPlanV1 | null
trigger        ReplanTrigger
now            Date
today          string (local date key, from constraints.tzOffsetMinutes)
```

### 5.2 When it runs, and when it must not

Exactly four triggers: `new-evidence` (an event whose outcome changes an
estimate's certainty, percent or due-review set), `settings-changed`,
`student-override`, `new-day`. Plus `initial`.

It must **not** run on a page render, a route change, a focus event, a sync
pull that brought nothing new, or an AI reply. `PlanToday` and friends read
`plan.activeSession` and render it. This is the stability requirement and the
reason the session has an id at all.

### 5.3 Eligibility filter

An activity is a candidate only if all hold:

1. `contentVersion` matches the catalogue (a regenerated activity is a new
   thing);
2. prerequisites satisfied, where "satisfied" means either the prerequisite
   activity has a `completed` event, **or** its subskill has a `measured`
   estimate at or above the strong threshold (this is how a strong student
   skips redundant teaching);
3. not blocked by a `skip-activity` override;
4. `expectedMinutes <= remaining budget`, unless `indivisible`, in which case
   it becomes a longer-commitment alternative instead;
5. required surface available (no `needs-microphone` when the student said
   microphone is unavailable);
6. not attempted within the last `reviewSpacingDays[0]` days unless it is due
   review or the student chose it;
7. for an `independent-check` step, the material must be **unseen**: no
   exposure entry for its items or its source paper.

### 5.4 Scoring candidate objectives

The planner scores **objectives** (a scope plus a subskill), then builds a
session for the winner. Score is a sum of named, testable terms:

```
score(objective) =
    W_GAP        * gapPressure(scope)
  + W_UNKNOWN    * unknownPressure(scope)
  + W_DUE        * dueReviewPressure(scope)
  + W_COVERAGE   * coveragePressure(paper)
  + W_DEADLINE   * deadlinePressure(scope)
  - W_RECENT     * recencyPenalty(scope)
  - W_STRENGTH   * demonstratedStrength(scope)
  - W_PREREQ     * unmetPrerequisiteDepth(scope)
```

- `gapPressure` uses BOTH targets. For a paper: `max(0, requiredBand -
  estimate)` where `requiredBand` is the per-paper minimum when set, otherwise
  the overall target. Plus a separate term for the overall average shortfall,
  spread across papers by how much each could move. A paper whose minimum is
  already met scores **zero** gap pressure even when it is the lowest paper
  (`GapAssessment.meetsRequirement`). This is the audit's finding 2 and
  acceptance scenario 3.
- `unknownPressure` is high when `certainty === 'unknown'` and the paper is
  in `diagnosticsOutstanding`, and decays to zero once a diagnostic has run.
- `dueReviewPressure` comes from `policy.dueReview`, scaled by how overdue.
- `coveragePressure` rises for any of the four papers untouched for longer
  than `freshnessDays`, so no paper silently disappears from the plan.
- `deadlinePressure` rises as the exam approaches and, inside
  `SHORT_DEADLINE_DAYS`, flips sign for objectives that need long teaching
  chains: with seven days left, "learn three new question types" scores below
  "consolidate the two you nearly have and practise timing".
- `recencyPenalty` prevents grinding the same drill day after day, and hard
  stops at `repeatedDifficultyLimit` consecutive unimproved attempts, which
  flags the scope for teacher review instead of offering a fourth variation.
- `demonstratedStrength` subtracts for a `measured` estimate at or above
  `strongPercent`, which is how a strong Reading student stops being taught
  Reading.

Weights live beside the thresholds, named and configurable. An objective the
student picked through an override is scored normally but wins ties, and the
choice is recorded in `history` with `trigger: 'student-override'`.

**Stability rule.** The previous active session is re-scored with a bonus of
`W_INCUMBENT`. It is replaced only when a challenger beats it by more than
`REPLAN_MARGIN`. This is the brief's "do not force different tasks merely to
make a test pass if the same task remains sensible".

### 5.5 Session assembly

Given the winning objective and a budget:

```
assemble(objective, budget):
  steps = []
  remaining = budget

  # 1. Recall, only when something is due and it fits.
  if due review exists for a related scope and remaining >= 5:
      add step(role='recall', shortest due activity)

  # 2. Teach, only when teaching is actually needed.
  if estimate.certainty in {unknown, limited} OR the teaching activity is unstudied:
      add step(role='teach', lesson or lesson block for the subskill)
  # A strong student with a measured estimate gets NO teach step. Never pad.

  # 3. Practise: the largest eligible practice activity that still fits.
  add step(role='practise', best fitting drill / focused exercise / graded task)

  # 4. Feedback is part of the practice step's own screen, not a separate
  #    activity, and costs minutes on that step, not a new one.

  # 5. Independent check on UNSEEN material, when the budget allows AND the
  #    objective is about demonstrating rather than learning.
  if remaining >= shortest unseen check and step 3 was not itself unseen:
      add step(role='independent-check', unseen items)

  # 6. Recap, only if >= 5 minutes remain.
  if remaining >= 5: add step(role='recap', ...)

  assert sum(step.minutes) <= budget      # BUDGET_OVERRUN_ALLOWANCE = 0
```

Worked shapes, as targets rather than templates:

| Budget | Typical shape |
|---|---|
| 15 min | practise (10) + feedback in place + recap (5). No teach step unless the objective is brand new, in which case teach (8) + one worked item (7) and the check moves to tomorrow. |
| 25 min | teach (10) + practise (12) + recap (3), or practise (12) + independent check (10) + recap (3) when teaching is already done. |
| 60 min | recall (5) + teach (10) + practise (25) + feedback and independent check (15) + recap (5). |

An `indivisible` activity is never trimmed. A full Reading paper is 60
minutes on its own; its review is a **separate session on a later day**, added
to `schedule` with `kind: 'assessment'` followed by a review day. Offering it
inside a 15-minute budget is done as a `PlanAlternative` of kind
`longer-commitment`, which the student accepts explicitly and which writes an
`accepted-longer-commitment` override.

### 5.6 Staged diagnostics

A brand-new student gets a **useful first session**, not a test battery. Over
at most `DIAGNOSTIC_MAX_SESSIONS` sessions, at most
`DIAGNOSTIC_MAX_MINUTES_PER_SESSION` each, the planner inserts one
`role='assess'` step per session, cycling the four papers by unknown-pressure
order: a short Reading drill, a short Listening drill, one Task 1 focused
piece, one Speaking Part 1 answer. Each writes `mode: 'diagnostic'` evidence,
which the policy caps at `tentative` no matter how well it goes: a short
sample identifies a learning need and is never a band.

A student may defer. `deferred-diagnostic` is an override, the paper stays in
`diagnosticsOutstanding`, and every surface that would show an estimate for
it shows `unknown` instead.

### 5.7 Recovery, deadlines, expiry

- **Missed days.** After `RECOVERY_TRIGGER_MISSED_DAYS`, status becomes
  `recovering`. The planner does **not** roll a backlog forward (today's
  `getTodayPlan` does, at `src/lib/plan/schedule.ts:392-398`). It rebuilds the
  week from current evidence, caps the next session at
  `RECOVERY_MAX_BUDGET_MULTIPLE` of a normal day, drops or defers the
  milestones that no longer fit, and writes one `PlanChange` naming what was
  dropped. The student sees what changed, not a growing queue.
- **Short deadline.** Inside `SHORT_DEADLINE_DAYS` the planner stops
  introducing new teaching chains, prioritises objectives that can move within
  the days available, and states plainly what will not be covered. It does not
  promise a band. The audit's 255-minute day becomes impossible because the
  budget assertion in `assemble` is a hard constraint.
- **Expired date.** `status = 'date-passed'`. The active session becomes a
  `planning` activity: set a new date or a new goal. There is no code path in
  which a passed date produces a completion message.
- **No date.** `status = 'provisional-no-date'`. The plan runs, paces itself
  from the regular commitment, and says everywhere that pacing is provisional.
  It never invents a date. Today `resolvePlanParams`
  (`src/lib/plan/schedule.ts:80`) invents `startDate + 8 weeks`; that stops.

### 5.8 What it writes to history

One `PlanChange` per replan that actually changed something, with a plain
sentence the weekly review can quote verbatim, plus machine-readable detail.
A replan that changes nothing writes nothing.

---

## 6. Catalogue coverage

Counts below were measured by running the modules. "Missing" means an
exercise that must be authored for the teach-and-check loop to work at this
grain; anything authored here is marked
`provenance: 'project-authored'` and must be visually distinguishable from
official material wherever it is shown.

### 6.1 Lessons (76 total, 1,108 authored minutes)

| Family | Count | Registry | Route | Completion evidence today |
|---|---|---|---|---|
| Overviews | 5 | `src/data/lessons.ts:96` | `/lessons/<slug>` | self-marked |
| Reading parts | 12 | `src/data/reading.ts:29` | `/lessons/reading/<slug>` | self-marked, plus an unrecorded `PracticeQuiz` |
| Listening parts | 10 | `src/data/listening.ts:26` | `/lessons/listening/<slug>` | self-marked, plus an unrecorded `PracticeQuiz` |
| Writing parts | 10 | `src/data/writing.ts:24` | `/lessons/writing/<slug>` | self-marked |
| Speaking parts | 3 | `src/data/speaking.ts:15` | `/lessons/speaking/<slug>` | self-marked |
| Vocabulary topics | 36 | `src/data/vocabulary.ts:24` | `/lessons/vocabulary/<slug>` | self-marked |

All 76 enter the catalogue as `kind: 'lesson'`, `completionEvidence:
'self-marked'`, and every one of them stays discoverable at `/learn` and in
`COURSE_UNITS`. Being in the library does not put it on anyone's plan.

**Missing and must be authored:** Writing, Speaking and Vocabulary lesson
pages have no quick check at all (`PracticeQuiz` is mounted only on
`/lessons/reading/[part].astro:47` and `/lessons/listening/[part].astro:47`).
Each Writing and Speaking lesson needs one three-item check so a "studied"
click is not the only evidence a lesson can produce.

### 6.2 Reading and Listening question types

Measured across all 70 papers: 2,800 questions in 616 groups.

| Type | Questions | Reading (files) | Listening (files) | Reading lesson | Listening lesson |
|---|---|---|---|---|---|
| `sentence-completion` | 1060 | 431 (38) | 629 (30) | `/lessons/reading/sentence` | `/lessons/listening/sentence-completion` |
| `multiple-choice` | 352 | 160 (30) | 192 (28) | `/lessons/reading/mc` | `/lessons/listening/multiple-choice` |
| `matching-features` | 286 | 210 (28) | 76 (12) | `/lessons/reading/matching-features` | `/lessons/listening/matching` |
| `tfng` | 262 | 262 (33) | 0 | `/lessons/reading/tfng` | none (no data either) |
| `table-completion` | 234 | 67 (10) | 167 (17) | `/lessons/reading/summary-completion` (borrowed) | `/lessons/listening/form-completion` (borrowed) |
| `paragraph-matching` | 172 | 172 (23) | 0 | `/lessons/reading/matching-information` | none (no data either) |
| `yes-no-notgiven` | 146 | 146 (25) | 0 | `/lessons/reading/ynng` | none (no data either) |
| `multiple-answer` | 111 | 44 (13) | 67 (15) | `/lessons/reading/mc` (borrowed) | `/lessons/listening/multiple-choice` (borrowed) |
| `matching-headings` | 79 | 79 (13) | 0 | `/lessons/reading/headings` | none (no data either) |
| `categorisation` | 75 | 29 (5) | 46 (9) | `/lessons/reading/matching-features` (borrowed) | `/lessons/listening/matching` (borrowed) |
| `diagram-labelling` | 23 | 0 | 23 (7) | `/lessons/reading/diagram` | `/lessons/listening/map-labelling` (borrowed) |
| **`sentence-endings`** | **0** | 0 | 0 | `/lessons/reading/matching-sentence-endings` | none |

Three findings the catalogue must encode honestly:

1. **`sentence-endings` is a phantom type.** It is in the union
   (`src/lib/tests/schema.ts:17`), it has a label, a strategy, a lesson and a
   tutor catalogue entry, and **zero questions in any paper**. A
   "practise your weak type" link for it dead-ends. The catalogue marks its
   drill activity as unavailable, and the focused exercises for it must be
   authored before it can be scheduled as a check.
2. **`practisePath` never returns undefined**
   (`src/lib/tests/question-types.ts:47-49`), unlike `lessonPath`. It will
   happily produce `/trainers/listening?type=tfng`, a filter that matches
   nothing. The catalogue must be built from the generated index's real
   `byType` counts, not from `practisePath`, and a test must assert that every
   `practise:` activity resolves to at least one real drill.
3. **Five borrowed lesson mappings** (`multiple-answer`,
   `categorisation`, `table-completion` on both skills, `diagram-labelling` on
   listening) send a student to a lesson about a neighbouring type. The
   catalogue keeps the link but records `sharesItemsWith` and a lower teaching
   fit, so the planner prefers a focused exercise once one exists.

Drills: **240** (120 reading from 40 papers x 3 parts, 120 listening from 30
papers x 4 parts), `src/lib/tests/drills.ts:108-120`, id shape
`<sourceTestId>-drill-p<n>`, reading 20 minutes, listening 8 minutes. Every
drill shares its questions with its source paper, so `sharesItemsWith` and
exposure are mandatory here.

Lesson checks: `PracticeQuiz` sets on the 12 reading and 10 listening part
pages, ids `practice-reading-<slug>` / `practice-listening-<slug>`.

**Missing and must be authored:** one focused exercise per question type per
skill, three to eight minutes, unseen items, for the `independent-check` step.
That is 10 reading plus 7 listening (the types that actually occur) plus
`sentence-endings` for reading, so **18 focused exercise sets**.

### 6.3 Writing

Prompts: 60 (30 Task 1, 30 Task 2), `src/data/writing-prompts-imported.ts`.
Task 1 variants: chart 12, process 7, map 7, combination 3, table 1. Task 2:
opinion 11, two-part 8, advantages-disadvantages 6, discussion 5.
Criteria: `taskResponse` (labelled Task Achievement for Task 1),
`coherenceCohesion`, `lexicalResource`, `grammaticalRange`
(`src/lib/writing/schema.ts:52-70`).

Objectives map from criteria to practisable units (the `WritingSubskill`
union in `contracts/catalog.ts`). The full graded task stays
`kind: 'graded-task'`, `completionEvidence: 'graded-rubric'`, routed to
`/trainers/writing` and `/writing/checker`; the calibrated grader keeps its
job and the tutor never re-scores it.

**Missing and must be authored:** every Writing focused exercise. There is no
short-form Writing practice anywhere in the library today: the smallest unit
is a full essay. The pilot authors `task1-overview` (see 6.7), and the
remaining Task 1 and Task 2 objectives follow the same pattern.

Two data facts to design around: `EssayPrompt.imageUrl` is unset on all 60
prompts, and `suggestedVocab` is `[]` on all 60. A Task 1 focused exercise
therefore cannot rely on the prompt object carrying its chart.

### 6.4 Speaking

40 Part 1 topics with 126 questions, 43 cue cards with 129 Part 3 follow-ups
(`src/data/speaking-prompts.ts:51`, `:741`). Criteria:
`fluencyCoherence`, `lexicalResource`, `grammaticalRange`, `pronunciation`
(`src/lib/speaking/schema.ts:10-27`).

Pronunciation evidence must come from audio. The existing pipeline already
does this: `gpt-audio-1.5` judges pronunciation from the recording itself, and
the other three criteria come from the diarized transcript. A focused
Speaking exercise may target the transcript-based criteria in text, but a
pronunciation objective must route to a real recording. No text-only guess.

Note for anyone writing docs: there are **two different types both called
`CueCard`**, `src/lib/speaking/schema.ts:57` (43 cards, trainer input) and
`src/data/cue-cards.ts:36` (24 cards, the browse bank with band-7 models and
upgrades). They are not interchangeable.

**Missing and must be authored:** focused exercises for
`part2-plan-in-one-minute`, `part1-extend-an-answer` and `fluency-repair`, all
of which can reuse existing prompts with a narrower instruction.

### 6.5 Vocabulary

36 topics, 719 words in the real build (146 across 14 topics under plain
Node, because `import.meta.glob` is unavailable there). Store
`ielts.vocab.v1`, SM-2 style scheduling at `src/lib/vocab-review.ts:484`,
summary at `:572`. **There is no per-word evidence today**: `VocabCardState`
holds only `ease, interval, due, reps, lapses, introducedDate, lastReviewed`,
and the only derived signal is `getStrugglingCards()` (`:596`, `lapses >= 2`).

The new record adds a `RecallResult` event per review pass with per-word
outcomes and a `direction` of `recognise`, `recall` or `use`, which is what
makes "include recall and use in a sentence, not only recognising
definitions" implementable and what feeds observed vocabulary problems back
into the plan. Vocabulary never becomes a fifth paper: its scope is
`{kind:'vocabulary'}` and it never carries a band.

**Missing and must be authored:** the "use in a sentence" mode. Recognition
and recall exist; use does not.

### 6.6 Tests, mock and supporting libraries

| Thing | Count | Route | Evidence |
|---|---|---|---|
| Full papers | 70 (40 reading, 30 listening) | `/tests/[id]` | `scored-paper` |
| Mock exam | 1 builder | `/tests/mock` | `scored-paper`, all four |
| Model answers | 60, one per prompt, all band 8 | `/writing/models` | `none` (reference) |
| Cue cards (browse) | 24 across 8 families | `/speaking/cue-cards` | `none` |
| Band guidance | 20 writing steps + 20 speaking steps | `/learn/bands` | `none` |
| Saved lessons and notes | `ielts.notes.v1` | `/account#saved` | `none` |

Reference activities carry `completionEvidence: 'none'` and may appear only
as a step inside a session (opened at the exact relevant place, with the
feature to notice named), never as a session's own objective.

Checkpoint policy: the planner reserves papers with no exposure entry for
`independent-check` and `assessment` use. With 70 papers and 240 drills there
is ample unseen material, but the reservation must be explicit, because a
drill sat earlier marks its source paper as seen.

### 6.7 The two pilot flows

**Pilot A, Reading Matching Headings.** 79 questions across 13 papers, lesson
`/lessons/reading/headings`, lesson check `practice-reading-headings`, drills
filtered by type. The full loop: recall the method, teach the block that
distinguishes a main idea from a supporting example, practise the existing
drill with hints available, feedback through the wrong-answer endpoint, then
an **unseen** focused set with no help, then replan. New content needed: one
`matching-headings` focused exercise set of six items drawn from papers the
student has not met.

**Pilot B, Writing Task 1 overviews.** Objective `task1-overview`, rolling up
to `taskResponse`/Task Achievement. The loop: teach what an overview must
state, show two contrasting examples from the model answers, write one
overview for a chart prompt (about 60 words, not a full report), have it
judged against that one objective by `evaluate-practice`, revise it with the
revision linked to the original, then write an overview for a **different**
prompt to test transfer. New content needed: the focused exercise set plus a
rubric per prompt form.

---

## 7. Work packages

25 packages. Each is sized for one agent in one run (roughly up to 1500
changed lines). "Owns" means that package is the only one allowed to modify
those files; anything else is a dependency.

Model tier: **opus** for core logic and anything that decides what is true
about a student, **sonnet** for screens and wiring, **haiku** for mechanical
passes.

### Stage 1: foundations (brief section 10.1)

**WP1. Contracts and the generated index.** opus.
Owns: `src/lib/learning/contracts/*` (already written, extend only),
`tools/generate-learning-index.mjs`, `src/data/generated/learning-index.json`,
`src/pages/data/learning-index.json.ts`, `tests/learning-index.test.ts`.
Depends on: nothing.
Acceptance: the generator reproduces the committed index byte for byte; the
index is under 256 KiB; a test asserts no file under `src/lib/learning/`
imports `src/data/tests`, `src/lib/tests/drills.ts`,
`src/lib/plan/schedule.ts`, `window`, `document`, `localStorage` or `fetch`
outside `*.browser.ts`.

**WP2. Learner record and migration.** opus.
Owns: `src/lib/learning/evidence.ts`, `migrate.ts`,
`tests/learning-evidence.test.ts`, `tests/learning-migration.test.ts`.
Depends on: WP1.
Acceptance: migrating the same `ProgressV1` twice produces identical ids and
no duplicates; legacy events carry no `items`; a `live: false` writing attempt
produces no ability evidence; every renamed lesson key maps forward.

**WP3. The evidence policy.** opus.
Owns: `src/lib/learning/policy.ts`, `tests/learning-policy.test.ts`.
Depends on: WP1, WP2.
Acceptance: the five certainty levels are reachable and distinguishable;
`overall` is null unless all four papers qualify; a blank submission, an
abandoned paper and a repeat of seen material are each ignored with a named
reason; Writing Task 1 and Task 2 produce separate estimates; a paper meeting
its own minimum reports `meetsRequirement: true` even when it is the lowest.

**WP4. Catalogue assembly.** opus.
Owns: `src/lib/learning/catalog.ts`, `tests/learning-catalog.test.ts`.
Depends on: WP1.
Acceptance: all 76 lessons present; every existing tutor id from
`src/lib/tutor/catalog.ts` still resolves; every `route` target is a real
route (extend the existing route assertion); every `practise:` activity
resolves to at least one real drill, so `sentence-endings` is marked
unavailable rather than linked.

### Stage 2: one shared next step (brief section 10.2)

**WP5. Planner core.** opus.
Owns: `src/lib/learning/planner.ts`, `session.ts`,
`tests/learning-planner.test.ts`, `tests/learning-session.test.ts`.
Depends on: WP3, WP4.
Acceptance: budget never exceeded for 15, 25 and 60 minutes; an indivisible
paper is offered as a longer commitment, never trimmed; two opposite profiles
get different objectives; changing the target changes the objective; the
incumbent session survives a no-op replan; missed days produce a bounded
recovery; a passed date produces `date-passed`.

**WP6. Plan store, browser layer, per-user namespacing.** opus.
Owns: `src/lib/learning/store.browser.ts`, `index.ts`,
`tests/learning-store.test.ts`.
Depends on: WP5.
Acceptance: caches are namespaced by owner; sign-out and account switch never
expose the previous student's record; an anonymous record is claimed only
through `OwnershipClaim`.

**WP7. Adapters.** opus.
Owns: `src/lib/learning/adapters.ts`, changes to `src/lib/course.ts`
(`courseStatus` only), `src/lib/plan/schedule.ts` (`getTodayPlan` only),
`src/lib/tutor/recommend.ts` (`recommendNext` only),
`tests/learning-adapters.test.ts`.
Depends on: WP5, WP6.
Acceptance: all three functions return views of the same `activeSession`;
`tests/plan-schedule.test.ts` and `tests/tutor-insights.test.ts` still pass or
are updated with a recorded reason; no caller sees a different activity.

**WP8. Today, Course and the lesson ending.** sonnet.
Owns: `src/components/plan/PlanToday.tsx`, `src/components/plan/WeekView.tsx`,
`src/components/Course.tsx`, `src/components/LearningDashboard.tsx`,
`src/layouts/LessonLayout.astro`.
Depends on: WP7.
Acceptance: `LessonLayout.astro:50`'s positional "Next in course" is replaced
by the shared session; the dashboard's "Your course" card no longer computes
its own next; Today shows one objective, the reason, the estimate, the step
sequence and one Start button, with Why this, I have less time today and
Choose another skill as secondary.

**WP9. Account, report and tutor surfaces.** sonnet.
Owns: `src/components/AccountMenu.tsx`, `src/components/AccountOverview.tsx`,
`src/components/ProgressReport.tsx`, `src/components/tutor/MrEzWelcome.tsx`,
`src/components/tutor/WeeklyReview.tsx`,
`src/components/tutor/ExplainResult.tsx`,
`src/components/tutor/TestDebrief.tsx`.
Depends on: WP7.
Acceptance: every Continue in the survey list reads the shared session;
"explain this result" reconciles its proposal into the plan before calling it
the next step; the report's single cross-paper trend line is replaced by four
separate skill trends with certainty shown.

**WP10. Intake, the sixty-minute recommendation, honest budget and deadline.**
sonnet.
Owns: `src/pages/plan-settings.astro`, the intake component (new,
`src/components/plan/Intake.tsx`), `src/lib/plan/summary.ts`.
Depends on: WP6.
Acceptance: a new student is asked target, per-paper minimums, exam date,
study days, daily time with 60 prominent, explanation language, and an
optional self-reported score with its date; a migrated confirmed plan's
`dailyMinutes` is untouched; a temporary 15-minute day does not change the
regular preference.

### Stage 3: evidence everywhere (brief section 10.3)

**WP11. Lesson quick checks feed the record.** opus.
Owns: `src/components/PracticeQuiz.tsx`, `src/scripts/lesson-quiz.ts`,
`src/data/reading-practice.ts` and `src/data/listening-practice.ts` (id
stamping only), `tests/lesson-check-evidence.test.ts`.
Depends on: WP2, WP4.
Acceptance: first answers are captured before any reveal; retries carry
`retryOf`; assistance is recorded; a perfect score on an already-seen set does
not raise certainty; `initReadingQuiz` (which records nothing today) writes
evidence.

**WP12. Test, drill and grader recorders.** sonnet.
Owns: `src/components/TestPlayer.tsx` (recording paths only),
`src/components/WritingTester.tsx`, `src/components/SpeakingTester.tsx`,
`src/components/LiveExaminer.tsx` (recording paths only).
Depends on: WP2.
Acceptance: every attempt writes both the existing `ProgressV1` row and an
evidence event with per-item detail where it exists; exposure is recorded for
every question seen; a blank or abandoned paper is recorded as such.

**WP13. Supabase migration file and the local stand-in.** sonnet.
Owns: `supabase/migrations/2026-09-21-learning.sql` (new file, **not
applied**), `supabase/README.md`, `tools/mr-ez-dev-server.mjs`.
Depends on: WP2, WP6.
Acceptance: the SQL creates `learning_events`, `learning_plan` and
`learning_companions` with RLS scoped to `auth.uid()`, Worker-only writes
where the tutor tables already are, and a unique index on
`(user_id, event_id)`; the dev server serves the new tables so the whole flow
can be exercised locally for free; nothing is applied to production.

**WP14. Sync layer.** opus.
Owns: `src/lib/learning/sync.browser.ts`, `src/lib/auth/sync.ts` (extend, do
not replace), `tests/learning-sync.test.ts`.
Depends on: WP13.
Acceptance: pushing the same batch twice yields duplicates, not new rows; a
device with an older revision is rejected and rebuilds; a confirmed server
plan beats an unconfirmed local one; vocabulary, notes and preferences sync;
`SyncStatus` distinguishes pending sync from pending grading.

### Stage 4: the two pilots (brief section 10.4)

**WP15. Worker: the three learning AI tasks.** opus.
Owns: `workers/mr-ez/src/index.ts` (additions only),
`src/lib/learning/ai-prompt.ts`, `src/pages/data/lesson-blocks/[slug].json.ts`
(new, the lesson-block content endpoint), `tests/learning-ai.test.ts`,
`workers/mr-ez/README.md`.
Depends on: WP4, WP5.
Acceptance: lesson help is grounded in the fetched block, the current
question, the student's answer and previous hints; help is refused during a
timed assessment including via direct chat; a proposal naming an id outside
the shortlist is dropped and recorded as a disagreement; stale versions are
rejected; no paid call happens on render.

**WP16. Pilot A: Reading Matching Headings end to end.** opus.
Owns: `src/data/focused/reading-matching-headings.ts` (new),
`src/components/learning/FocusedExercise.tsx` (new),
`tests/pilot-matching-headings.test.ts`.
Depends on: WP11, WP15.
Acceptance: the full cycle runs on fixtures, an assisted correct answer never
counts as independent, and the unseen check changes the plan.

**WP17. Pilot B: Writing Task 1 overviews end to end.** opus.
Owns: `src/data/focused/writing-task1-overview.ts` (new),
`src/components/learning/WritingFocusedTask.tsx` (new),
`tests/pilot-task1-overview.test.ts`.
Depends on: WP15, WP16 (for the shared component shape).
Acceptance: the revision is linked to the original, the objective judgement is
never presented as a band, and a fresh prompt tests transfer.

### Stage 5: extension (brief section 10.5)

**WP18. Remaining Reading and Listening types.** sonnet.
Owns: `src/data/focused/reading-*.ts`, `src/data/focused/listening-*.ts`.
Depends on: WP16. Parallel with WP19 to WP22.

**WP19. Listening specifics.** sonnet.
Owns: the segment and replay paths in `PracticeQuiz.tsx` and `TestPlayer.tsx`
already owned by WP11 and WP12, so this package runs **after** both, plus
`src/data/listening-practice.ts`.
Depends on: WP11, WP12, WP18.

**WP20. Writing objectives and Speaking objectives.** sonnet.
Owns: `src/data/focused/writing-*.ts`, `src/data/focused/speaking-*.ts`.
Depends on: WP17. Parallel with WP18.

**WP21. Vocabulary integration.** sonnet.
Owns: `src/lib/vocab-review.ts` (evidence hooks and the new "use in a
sentence" mode), `src/components/VocabReview.tsx`.
Depends on: WP2, WP14. Parallel with WP18 and WP20.

**WP22. Checkpoints, assessment boundary, supporting libraries.** sonnet.
Owns: `src/components/MockExam.tsx`, `src/pages/tests/index.astro`,
`src/components/ModelAnswers.tsx`, `src/components/CueCardBank.tsx`,
`src/components/BandLadder.tsx`, `src/components/SavedItems.tsx`.
Depends on: WP5, WP15.
Acceptance: unseen papers are reserved; the tutor is blocked during timed
papers including direct chat; reference material opens at the exact place with
the feature to notice named.

**WP23. Progress and weekly review.** sonnet.
Owns: `src/components/ProgressReport.tsx` (second pass),
`src/components/tutor/WeeklyReview.tsx` (second pass),
`src/components/CurrentLevel.tsx`, `src/lib/level.ts` (retire in favour of the
policy).
Depends on: WP3, WP9.

### Stage 6: finish (brief section 10.6)

**WP24. Russian for every new string.** haiku.
Owns: `src/lib/i18n/dict/ru/*.ts`, `src/lib/tutor/ru.ts`.
Depends on: WP8 to WP23. Mechanical, but must run last.

**WP25. Verification matrix and handoff.** opus.
Owns: `docs/PERSONAL-LEARNING-IMPLEMENTATION.md`,
`tests/learning-scenarios.test.ts`, the browser verification scripts.
Depends on: everything.

### Parallel groups

```
A (start together):  WP1
B (after WP1):       WP2 | WP4                  two agents, no shared files
C (after B):         WP3 | WP11                 WP11 also needs WP4
D (after WP3+WP4):   WP5
E (after WP5):       WP6 -> WP7
F (after WP7):       WP8 | WP9 | WP10           three agents, disjoint files
G (after WP2):       WP12 | WP13                parallel with F
H (after WP13):      WP14
I (after WP5+WP4):   WP15                       parallel with F and G
J (after WP15):      WP16 -> WP17
K (after WP16/17):   WP18 | WP20 | WP21 | WP22  four agents
L (after WP11+12+18):WP19
M (after WP3+WP9):   WP23
N (last):            WP24 -> WP25
```

The only file-ownership hazards are `TestPlayer.tsx` (WP12, then WP19),
`PracticeQuiz.tsx` (WP11, then WP19), `ProgressReport.tsx` (WP9, then WP23)
and `WeeklyReview.tsx` (WP9, then WP23). In each case the second package must
wait; they are never run in the same group.

---

## 8. Test plan

Deterministic tests run under `node:test` with the existing loader, no DOM.
Browser checks use the project's `/verify` skill against the dev server.

### 8.1 Labelled synthetic profiles (fixtures)

All live in `tests/fixtures/learners.ts`, every one named with a `SYNTHETIC-`
prefix so nothing can be mistaken for a real student.

| Profile | Shape |
|---|---|
| `SYNTHETIC-new` | no events, no plan, no goal |
| `SYNTHETIC-strong-reading-weak-writing` | Reading 7.5 measured over 3 papers; Writing 5.5 over 2 live graded essays; target 7.0 overall, Writing minimum 6.5 |
| `SYNTHETIC-weak-reading-strong-writing` | the mirror image |
| `SYNTHETIC-lowest-but-met` | target 6.5 overall, Writing minimum 5.5, Writing measured 5.5, everything else 7.0 |
| `SYNTHETIC-legacy` | a `ProgressV1` blob only: 20 lessons, 3 test attempts with `byType`, 2 writing attempts, `defaulted: false`, `dailyMinutes: 40` |
| `SYNTHETIC-legacy-defaulted` | the same but `defaulted: true` and no `dailyMinutes` |
| `SYNTHETIC-seven-day` | exam in 7 days, 15 minutes a day, nothing measured |
| `SYNTHETIC-missed-week` | a running plan with 7 consecutive missed study days |
| `SYNTHETIC-expired` | exam date 10 days in the past, half the course unfinished |
| `SYNTHETIC-hinted` | Matching Headings correct every time, always after a hint |
| `SYNTHETIC-repeat` | the same paper sat three times, improving each time |
| `SYNTHETIC-blank` | two submitted papers with every answer blank |
| `SYNTHETIC-two-device` | two records diverging from a common ancestor |

### 8.2 The brief's 16 scenarios

| # | Scenario | Deterministic test | Browser check |
|---|---|---|---|
| 1 | New student | `learning-scenarios: new student gets no invented level, a useful first session and a route to all four papers` (`SYNTHETIC-new`) | `/dashboard` signed out and signed in |
| 2 | Opposite profiles | `planner: opposite profiles get different objectives` | side-by-side seeded runs |
| 3 | Overall vs per-paper minima | `policy: a met minimum is not a gap` + `planner: priorities respect both` (`SYNTHETIC-lowest-but-met`) | `/plan-settings` then `/dashboard` |
| 4 | One hour | `migration: a confirmed plan keeps its dailyMinutes` + `session: a 60-minute session is meaningful` | intake flow |
| 5 | Busy day | `planner: a less-time-today override does not change regularDailyMinutes` | "I have less time today" |
| 6 | Seven days and missed days | `planner: seven-day scope is achievable and never exceeds the budget`, `planner: recovery is bounded`, `planner: an expired date is not completion` | `/dashboard` seeded |
| 7 | One session everywhere | `adapters: courseStatus, getTodayPlan and recommendNext agree before and after evidence` | walk Today, Course, Mr EZ, a lesson ending, the account menu |
| 8 | Real learning | `evidence: a completion click is studied, not measured`, `policy: an assisted correct answer is not independent`, `planner: an unseen check changes the plan` | pilot A end to end |
| 9 | Exposure | `policy: a repeat of seen material is ignored with a named reason`, `policy: a blank submission is ignored` (`SYNTHETIC-repeat`, `SYNTHETIC-blank`) | sit the same drill twice |
| 10 | Override and direct entry | `planner: voluntary practice updates the record and creates no second plan` | enter a lesson directly from `/learn` |
| 11 | Reliability | `sync: duplicate push is idempotent`, `ai: a stale proposal is rejected`, `store: a refresh does not replan` | kill the dev Worker mid-session |
| 12 | Accounts | `store: caches are namespaced by owner`, `sync: an older revision cannot overwrite` (`SYNTHETIC-two-device`) | two accounts in one browser against `tools/mr-ez-dev-server.mjs`, clearly labelled a local simulation |
| 13 | Assessment boundary | `ai: help is refused during assessment, including a direct chat message` | start a timed paper and ask Mr EZ |
| 14 | Coverage | `catalog: every lesson family has a catalogue entry and valid evidence`, `catalog: every practise activity resolves to a real drill` | `/learn` and `/start` |
| 15 | Language and access | extend `tests/i18n.test.ts` and `tests/mr-ez-i18n.test.ts` | desktop and 390 px, EN and RU, keyboard, focus, reduced motion |
| 16 | Progress | `policy: four separate skill trends with certainty`, `report: no cross-paper trend line` | `/report` |

### 8.3 The audit's five reproduced findings

Each becomes a named regression test that fails on today's code:

1. `regression: Today, Course and Mr EZ name the same activity` (finding 1).
2. `regression: changing the target changes the schedule` (finding 2), built
   by running the planner with band 6.5 / Writing 5.5 and band 9 / Writing 9
   and asserting the objectives differ.
3. `regression: no scheduled day exceeds its budget` (finding 3), asserting
   the 255-minute day is impossible for every budget in
   `DAILY_MINUTE_CHOICES`.
4. `regression: a completion click never produces a measured estimate`
   (finding 4).
5. `regression: an expired plan reports date-passed, never complete`
   (finding 5).

### 8.4 AI testing

Free integration tests use `tools/mr-ez-dev-server.mjs` in simulated mode;
every reply it produces is flagged `live: false` and the interface labels it.
**A simulated reply is never presented as evidence the live integration
works.** A bounded live batch is prepared as a list of exact commands with a
spend estimate, for Alex to approve; at roughly $0.0005 a message, the sixteen
scenarios plus the two pilots is well under a dollar, and the exact figure
goes in the handoff document.

---

## 9. Risks

1. **localStorage size.** `ProgressV1` already stores up to 60 full essay
   reports at 5 to 10 KB each (`src/lib/progress.ts:275`). The learner record
   adds per-item detail: a 40-question paper is roughly 4 KB of items. At
   `LOCAL_EVENT_SOFT_CAP = 4000` events the local copy could approach 2 MB
   against a roughly 5 MB budget. Mitigation: the cap summarises the oldest
   events into per-subskill tallies locally while the server keeps everything,
   and every write is already wrapped in try/catch.
2. **Worker bundle.** `src/data/tests` is 3.70 MiB and
   `src/lib/tests/drills.ts` imports all 70 papers eagerly. The catalogue must
   never reach it. The generated index (under 256 KiB) plus the six registries
   (29.5 KiB) is the whole budget, and the no-import test in WP1 is what keeps
   it that way.
3. **Migration edge cases.** A plan with no `defaulted` field is treated as
   confirmed, which preserves settings but cannot re-ask. Attempts sharing an
   identical `at` timestamp across devices already collapse in
   `mergeProgress`; deterministic ids inherit that collapse, which is correct
   but means two genuinely separate attempts in the same millisecond become
   one. Accepted.
4. **Two devices.** Evidence commutes; the plan does not. The conflict rule is
   stated as a constant and tested, but a student editing settings on two
   devices at once will see one edit lose. The interface must say so rather
   than silently reconciling.
5. **`sentence-endings` and the borrowed lesson mappings** mean a student can
   be told to practise a type with no material. The catalogue marks it
   unavailable, which is honest but removes a link that exists today. Flagged
   for Alex in the open questions.
6. **Vocabulary counts differ between Node and the build** (146/14 against
   719/36). A test asserting the wrong one will pass locally and mislead.
   Every vocabulary assertion must state which number it is asserting.
7. **Cost.** Three new AI tasks on top of seven. The per-student daily cap
   (`TUTOR_MAX_TURNS_PER_USER_PER_DAY`, default 40) is now shared across ten
   task types, and contextual lesson help is the one students will use most.
   The cap may need to become per-task; that is a product decision, not an
   engineering one.
8. **Scope.** This is 25 packages. Stopping after the two pilots and calling
   it done is the failure mode the brief names explicitly.

---

## 10. Disagreements

Two, both small, neither blocking.

**D1. `PersonalPlanV1` cannot be the only plan store during the build.**
The lead's contract has one plan. Nine components read `SavedPlan` today, and
rewiring all of them in one package would exceed the size limit. The plan
adapter therefore **writes both** `PersonalPlanV1` and a derived `SavedPlan`
until WP23 retires the last reader. The derived copy is written, never read as
a source of truth, and a test asserts the two never disagree on target band,
exam date or daily minutes. This is a build-order concession, not a second
engine.

**D2. Session steps cannot be pure activity ids for a lesson.**
The contract has a session step naming an `activityId`. A "teach" step for a
lesson needs to open at a specific block, not at the top of a 1,200-line
lesson page, or the 10-minute teach budget is fiction. `ActivityTarget` for a
lesson therefore carries an optional `hash`, and the lesson bodies need stable
anchor ids. That is a small content change across
`src/content/lesson-bodies/`, and it is a prerequisite for WP15's lesson-block
endpoint. It is folded into WP15 rather than raised as a separate package.

---

## 11. Open questions for the lead

These could not be settled from the code.

1. **`sentence-endings`.** No paper contains one, yet the site teaches it and
   the tutor can recommend practising it. Author focused exercises for it, or
   mark it taught-but-not-assessed and remove the practise link?
2. **Teacher review capacity.** `repeatedDifficultyLimit` is meant to stop the
   plan offering a fourth variation of a failing drill and hand over to a
   teacher. There is no teacher surface and the brief says not to invent one.
   What should the student see at that point?
3. **Per-task AI allowance.** Contextual lesson help will dominate usage. Keep
   one shared daily cap, or split it (for example 40 chat turns and 60 help
   requests)? This changes `mr_ez_turns` counting.
4. **Diagnostic depth.** The brief leaves "how much diagnostic work to ask for
   in the first sessions" open. The contract sets 5 sessions at 15 minutes.
   Confirm, or set a different figure.
5. **Model answers are all band 8.** `ModelBand` allows 6, 7 and 8.5 and the
   data has none of them. Pilot B's teaching would be stronger with a band 6
   overview beside the band 8 one. Author them, or teach from the band 8 only?
6. **Speaking pronunciation evidence.** Audio is not retained. A pronunciation
   objective therefore cannot be re-checked against the original recording,
   only against a new one. Confirm that is acceptable.
