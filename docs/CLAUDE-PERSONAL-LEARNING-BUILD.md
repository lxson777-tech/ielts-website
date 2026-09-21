# Claude build brief: personal AI-guided IELTS course

Approved by Alex on 21 September 2026. Build the complete scope below. Codex will independently audit the implementation afterward.

## 1. Your assignment

Turn the student learning platform into a coherent personal course assembled from our existing library. Every student should have a plan aimed at their target IELTS band by their exam date. AI recommends the next activity, and the student can change it.

The core learning cycle is:

**Find a gap -> teach -> practise -> give feedback -> check independently -> update the plan.**

This is a functional rework across the teaching platform, not a dashboard restyle or an extra chat panel. All phases below belong to the assignment. The first two teaching flows are an integration milestone, not the stopping point.

Alex recommends **one hour daily**. Make 60 minutes the prominent recommended choice for new plans. Ask the student to confirm availability. Keep shorter sessions as busy-day alternatives. Existing students' explicitly chosen settings must not be silently overwritten. The current settings already accept 60 minutes, so merely adding that option is not completion of this requirement.

## 2. Establish the correct starting point

Project: `C:\Users\Alex\Desktop\Projects\IELTS website`.

Read the applicable AGENTS.md, the relevant installed skills, and `docs/audits/personal-learning-plan-2026-09-21.md`. Inspect the current branch, local changes, worktrees and current production history before choosing the base. Do not assume the root checkout is current: it was on older `rebuild/astro` during the audit.

The audit examined `e2bf9e6` in `.claude/worktrees/mr-ez-ai-tutor-88d874` and observed the corresponding Russian interface publicly. That is a historical baseline, not an instruction to reset to it. Retain newer legitimate work. Coordinate with concurrent work and never revert another task's edits. Use a dedicated feature branch from the verified current platform version; keep unrelated homepage work intact.

The audited baseline had 76 course entries, 70 full Reading/Listening tests, Russian interface and teaching translations, approved Mr EZ artwork, weekly reviews, unit notes and wrong-answer explanations. It passed 761 tests. Recheck counts rather than treating them as permanent.

If this brief exists only in the root checkout, copy the brief and audit into your working checkout so the implementation and later review retain their context. Do not merge the older root branch just to obtain these documents.

## 3. Scope and boundaries

Include Today, personal Course, settings/intake, all lesson families, Reading/Listening/Writing/Speaking practice, full tests and mock exam, vocabulary, progress, tutor context, account synchronization, saved learning information and supporting learning libraries.

Preserve the existing library, real assessment content, answer keys, recordings, translations, student history, calibrated graders, sign-in boundaries and spending protections. Keep Academic IELTS as the current supported course. Do not claim General Training support without the corresponding curriculum.

Public marketing pages, pricing, payments, domain changes and a new teacher management application are outside scope. Preserve the current premium green/orange/cream visual identity and approved Mr EZ design. Use clear, calm layouts with one main action and secondary choices revealed when needed.

Russian remains available for interface and explanations. Passages, questions, answer options, answers, transcripts, model answers and useful English phrases remain English. Vocabulary words and example sentences remain English; meanings may be Russian. Language choice does not imply ability.

Build and verify locally without repeated permission requests for routine work. Production/main pushes, deployments, production data migrations, destructive actions and paid AI tests still require Alex's explicit confirmation under the project rules. Prepare their exact commands, changes, rollback and cost estimate before asking. Do not install optional skills without Alex choosing them.

## 4. Shared learning data

Inspect existing stores and reuse useful code. Introduce versioned structures and explicit migration rather than creating another isolated recommendation store.

### Activity catalogue

Every schedulable activity needs a stable ID, content version, paper/subskill, objective, prerequisites, expected duration, real route or task reference, completion evidence and supported explanation language. Map relevant lesson blocks, exercises, prompts, vocabulary work and checkpoints. Keep large passages/audio/transcripts separate from the small catalogue used by the planner and tutor Worker.

All existing lessons must remain discoverable. Being in the library must not automatically make an item mandatory for every student. Add small focused exercises where the existing library only offers a long essay or passage. Any generated teaching examples must be distinguishable from official or publisher assessment material and verified before serving as scored checks. Preserve source attribution and permissions.

### Learner evidence

Record stable attempt/event ID, student ownership, activity/content version, date, item or prompt identity, first answer, feedback or score, assistance used, retry-of relationship, practice/assessment mode and completion state. Preserve only the evidence necessary to teach and review; do not start retaining raw audio indefinitely.

Track visited/studied separately from independent demonstration. A completion click is studied. A correct answer after a hint is assisted success. Neither becomes mastery. Blank abandoned assessments, repeat submissions and seen questions must not inflate confidence or generate false learning patterns.

Use one evidence policy for planner, tutor and reports: recent results, independent occasions, unseen material, amount of evidence and assistance. Preserve uncertainty. Separate Writing Task 1/Task 2 and Speaking part/context where that affects interpretation. A partial exercise does not produce an authoritative overall IELTS band.

Historical completions migrate to studied. Historical scores keep their provenance. Where older records lack item-level information, retain them as limited evidence instead of fabricating detail. Preserve existing explicitly selected goals and review schedules.

### Synchronization

Make evidence, plan revisions, preferences, vocabulary review state and relevant saved learning information available across devices. Scope browser caches by user and handle sign-out/account switching safely. Anonymous work should merge only through an explicit, safe ownership flow.

Use idempotent writes and a clear conflict policy so retries cannot duplicate attempts and an old device cannot overwrite newer plans. Define server authority for confirmed plans and how a cached offline session reconciles. Expose pending synchronization or pending grading honestly. Test schema migrations on fixtures/local infrastructure before proposing any production operation.

## 5. One personal plan and next step

Replace the independent decisions currently made by courseStatus, getTodayPlan and recommendNext with a shared plan/session contract. Those functions may become adapters, but no screen may continue choosing a competing primary next action.

The plan should include goals, confirmed constraints, evidence version, plan revision, scheduled sessions, selected activity IDs, reasons/evidence references, alternatives, overrides and a concise change history.

Today, Course, Mr EZ welcome, weekly review and lesson endings must read the same current session. Explain-result actions can propose a later activity, but must reconcile it into the plan before calling it the next step. Revisit every Continue/Next action, including account menus and direct lesson entry.

Selection must consider:

- Overall target and minimum per paper, with actual gaps rather than identical target assumptions.
- Unknown skills that need assessment, relevant prerequisites and demonstrated strengths.
- Current weaknesses and their evidence quality, due review, and coverage across all four papers.
- Exam date, realistic available time and the student's chosen alternative.
- Whether a task is already seen, already active or recently attempted.

An important target change should affect selection when the evidence warrants it. Do not force different tasks merely to make a test pass if the same task remains sensible. Record the explanation.

Use a stable active session and a rolling near-term schedule, with longer-term milestones. Replan after meaningful completed evidence, goal/date/availability edits or a student override. Do not change an active task merely because the page refreshed or an AI response arrived late. Reject stale AI proposals against newer plan/evidence versions.

Stay within the selected daily budget. If an indivisible exam takes longer, offer it as an explicit longer commitment or schedule it elsewhere. A Reading test occupying an hour needs review in another allocated session. Do not pack all lessons into a short deadline. State what can reasonably fit and prioritize useful work without predicting a guaranteed score.

Missed days should cause a manageable recovery plan, not an ever-growing backlog. A past exam date triggers a clear date/goal follow-up, not a course-complete message. Changing the deadline requires the student's action. A no-date plan can exist as visibly provisional; do not invent a booked date.

## 6. Intake and Today

Collect target overall score, per-paper minimums if applicable, exam date, study days, daily time and explanation language. Offer 60 minutes as the tutor-recommended commitment. Let students provide a recent score and its date, marked self-reported. Keep intake short and useful.

Create a staged diagnostic route using suitable existing material. Give a useful first session, then collect evidence across the first sessions. Assess all four papers over time; short samples identify learning needs, not a dependable complete band. A student can defer a diagnostic and receive a provisional course that openly shows what is unknown.

Today shows one learning objective, the reason, estimated time, a short session sequence and one Start/Continue button. Mr EZ's explanation belongs to that session, not a competing card. Secondary actions: Why this, I have less time today, Choose another skill. A temporary short day does not change the student's regular one-hour preference.

Course displays the student's route, upcoming priorities and why adjustments happened. Keep Browse all lessons accessible. Do not present a fixed percentage of the entire library as exam readiness.

## 7. Teaching flows across the platform

### Lessons and tutor

Connect quick checks to the shared learner record. Provide stable question identities, capture first answers before revealing help, preserve retry relationships and record assistance. Fix any unsupported language such as claiming mastery from one perfect familiar quiz.

Give the tutor the exact relevant reviewed lesson block, current task, student answer and previous hints. A lesson title alone is insufficient. Explain, Hint and Example controls should operate at the relevant teaching point. End the lesson with the shared next activity. Allow the student to pause and resume without losing work.

### Reading and Listening

Select exact activities rather than sending every recommendation to a hub. Record item exposure across lessons, drills and full papers that reuse material. Use existing question explanations and passage/audio evidence. Distinguish an observed mistake from a conjectured cause; ask for the student's reasoning when needed.

For Listening, preserve practice replay controls and use the relevant recording segment. Teach a particular problem and then check it on fresh material. Support every existing question type in catalogue/evidence mapping; do not claim full coverage if types silently fall back to unrelated tasks.

### Writing

Turn criterion feedback into concrete focused tasks: overview writing, claim support, paragraph organization and sentence correction are examples. Implement linked correction/revision and a new prompt to check transfer. Preserve original essays and reports. Keep Task 1 and Task 2 evidence distinguishable.

Use the existing grader for its calibrated purpose. The tutor interprets feedback and teaches; it does not silently replace an assessment score. A paragraph exercise can have objective-specific feedback without pretending it is a full essay band.

### Speaking

Use feedback to choose a specific practice objective, offer a retry, then check on a different question. Preserve the selected teaching evidence required to explain the recommendation. Pronunciation feedback must use actual audio, not a text-only guess. Provide clear recording and grading failure recovery.

Keep teaching practice distinct from the live examiner's assessment behavior. Do not change calibrated grading models as part of this work without a separate reason and review.

### Vocabulary

Connect due recall, words relevant to current work and genuinely observed vocabulary problems to the plan. Include recall and use in a sentence, not only recognizing definitions. Preserve word-level review state and synchronize it. Verify that every relevant topic's words actually load into the review experience, including expanded topics.

### Tests and supporting libraries

Use independent tests as checkpoints. Reserve suitable unseen content, account for overlap with practice, and revise the plan afterward. No hints, examples or task-specific tutor assistance during assessment. Verify that boundary for direct chat requests as well as hidden buttons.

Link model answers, cue cards, band guidance, saved lessons and notes into the relevant activity. Explain what to notice or practise. Keep independent exploration available and record useful evidence from voluntary practice.

## 8. AI's responsibility and limits

The approved expansion gives AI a real teaching role: diagnose tentatively, explain differently, give contextual hints, evaluate focused practice against its objective and propose the next teaching move from eligible activities.

Keep factual counting and score provenance in trusted application logic. Validate AI output against a strict response shape, catalogue IDs, ownership, prerequisites, time constraints and current plan version. Resolve links from real IDs. Ground explanations in supplied content and evidence; do not let user answers become system instructions.

Reuse existing authentication, limits, request deduplication and cache protections. Cache by relevant content/evidence/plan version and language. No paid calls on every render, tick or passive navigation. Keep existing useful behavior when AI is unavailable: a real plan, lesson content and honest deterministic guidance. Never display a simulated response as live AI.

Build reviewable teacher-reference scenarios and record disagreements. Model self-evaluation alone is insufficient. Thresholds can start as explicit configurable provisional rules; do not present them as validated IELTS science. Do not invent evidence of effectiveness.

## 9. Progress and student control

Show separate current evidence and trends for Reading, Listening, Writing and Speaking. Clearly distinguish skill improvement, amount studied and exam readiness. Do not join unrelated paper scores into one misleading improvement line.

Explain what improved, what remains uncertain, what to work on next and what changed in the schedule. Use one consistent evidence policy throughout. Label estimated duration honestly; do not report a fixed lesson allowance as measured time spent.

Let the student inspect goals, preferences and what Mr EZ remembers. Keep memory management behavior coherent with the structured learner record. Do not require a new teacher dashboard: prepare local/exportable review evidence and identify when teacher input would be useful without inventing a support workflow that does not exist.

## 10. Implementation sequence

1. Establish the current baseline, reproduction scenarios and migration strategy. Define the shared activity/evidence/plan contracts.
2. Wire one shared next step through all existing surfaces. Implement one-hour recommendation, intake and honest budget/deadline behavior.
3. Implement the learner evidence store, staged diagnostics, prerequisite mapping, synchronization and personalized selection.
4. Complete Reading Matching Headings and Writing Task 1 overviews as end-to-end integration flows. Exercise teaching, attempts, corrections, unseen checks and replanning before expanding the pattern.
5. Extend the working pattern to the remaining Reading/Listening types, Writing objectives, Speaking, vocabulary, full tests and supporting libraries. Finish progress and weekly review integration.
6. Run the complete verification matrix, fix failures, document remaining externally dependent validation and prepare the audit handoff.

Maintain a requirement checklist as you work. Do not stop after stage 2 or the two pilot flows and describe the complete assignment as finished. Real-student learning validation can remain explicitly pending, but the complete software and testable review package should be prepared without waiting for it.

## 11. Required verification

Use the project's runtime verification skill and existing tooling. Run the current automated suite, appropriate new behavioral tests and a production build. Run the actual app in a browser. A passing build or screenshot alone is insufficient.

Use isolated synthetic records and label them. Add regression coverage for the audit's contradictory recommendation, target-insensitive schedule, short-deadline overload, unearned mastery and expired-plan completion findings.

Demonstrate:

1. New student: no invented current level or confirmed goal; short intake; useful provisional session; a path to assess all four papers.
2. Opposite profiles: strong Reading/weak Writing and weak Reading/strong Writing receive justified different priorities.
3. Overall target and per-paper minima: priorities respect both, including a lowest criterion that already meets its requirement.
4. One hour: recommended choice persists and a meaningful session fits. Explicitly selected existing preferences survive migration.
5. Busy day: a temporary 15/25-minute override is honored without overwriting the regular hour.
6. Seven-day deadline and missed days: useful achievable scope, no 255-minute packing, no infinite backlog, no false completion.
7. One current session: Today, Course, Mr EZ, lesson ending and all Continue actions agree before and after progress.
8. Real learning: completing a page does not claim mastery; first answers, hints and retries persist; fresh independent checks can change the plan.
9. Exposure: repeated papers or overlapping lesson/drill questions do not count as independent fresh evidence. Blank submissions do not become confident diagnostic findings.
10. Student override and direct entry: voluntary practice updates the same record and does not create contradictory plans.
11. Reliability: refresh/resume, offline recovery, failed grader, unavailable tutor, rate limits, duplicate requests and stale AI replies do not lose work or corrupt the plan.
12. Accounts: independent users cannot see or inherit one another's records. Two devices reconcile without duplicate attempts or stale-plan overwrites. Local simulations must be distinguished from real-account checks.
13. Assessment: tutor help remains blocked during timed exams, including direct requests; review help becomes available afterward.
14. Coverage: every lesson family and practice type has valid catalogue links and appropriate completion evidence; no orphaned routes or dropped library content.
15. Language and access: desktop and 390px phone, English and Russian, keyboard controls, readable focus states and reduced motion. English exam content stays unchanged.
16. Progress: distinct skill trends, uncertainty, evidence freshness and explained plan changes agree with the stored records.

Provide deterministic tests for scheduling/evidence logic and browser tests for actual flows. Use clearly labeled simulated AI for free integration tests. Prepare a bounded live AI test batch with expected cost and required access for Alex's approval. Do not claim live AI, production migration, multi-device cloud behavior or real student learning gains were verified if only fixtures were used.

## 12. Handoff to Alex and Codex

Create `docs/PERSONAL-LEARNING-IMPLEMENTATION.md` with:

- Summary of behavior delivered and a requirement-to-implementation checklist for this brief.
- Actual branch and commit, correct running localhost URL and startup steps.
- Architecture/data changes and migration compatibility, in enough detail for another engineer to review.
- Synthetic learner profiles and an exact reproducible walkthrough for each acceptance scenario.
- Test/build results and browser evidence, with failures and fixes recorded honestly.
- Separate status for deterministic behavior, simulated AI, live AI, real-account synchronization and student/teacher validation.
- Known limitations, incomplete requirements and proposed next actions. No hidden TODOs presented as completed features.
- Exact proposed production migrations/deployments, required configuration, rollback and any paid verification batch with a spend estimate. No secret values in the document.

Keep a working local preview available and send Alex the direct link. Provide the finished implementation for Codex's independent audit. Do not publish just because local checks pass; Alex confirms the final externally visible action.

The task is complete as a build handoff when the full approved software scope is implemented and demonstrated, and every remaining external approval or validation is explicitly identified. A teacher pilot or deployment must never be claimed complete without actually happening.
