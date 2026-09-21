# Requirement checklist

Every requirement sentence group in `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md`
sections 1 and 3 to 12, with the work package that delivers it. Work packages
are defined in `docs/personal-learning/ARCHITECTURE.md` section 7.

Status values: `todo`, `doing`, `done`, `blocked`, `n/a (reason)`.
Every row starts at `todo`. A row moves to `done` only when its acceptance
test passes and the behaviour has been exercised at runtime, not when the code
compiles.

---

## 1. The assignment

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R1.1-personal-course | 1 | Every student has a plan aimed at their target band by their exam date, assembled from the existing library. | WP5, WP6 | todo |
| R1.2-learning-cycle | 1 | The cycle find a gap, teach, practise, give feedback, check independently, update the plan is implemented end to end. | WP16, WP17 | todo |
| R1.3-ai-recommends-student-chooses | 1 | AI recommends the next activity and the student can change it. | WP5, WP8, WP15 | todo |
| R1.4-functional-not-restyle | 1 | This is a functional rework across the teaching platform, not a dashboard restyle or an extra chat panel. | all | todo |
| R1.5-sixty-minutes-prominent | 1 | 60 minutes is the prominent recommended choice for new plans, availability is confirmed by the student, and shorter sessions remain busy-day alternatives. | WP10 | todo |
| R1.6-existing-settings-preserved | 1 | An existing student's explicitly chosen settings are never silently overwritten; adding 60 to a list is not completion. | WP2, WP10 | todo |

## 3. Scope and boundaries

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R3.1-scope-surfaces | 3 | Today, Course, settings and intake, all lesson families, Reading, Listening, Writing and Speaking practice, full tests and mock, vocabulary, progress, tutor context, account sync, saved learning information and supporting libraries are all in scope. | WP8 to WP23 | todo |
| R3.2-preserve-library | 3 | The existing library, real assessment content, answer keys, recordings, translations and student history are preserved. | WP2, WP4 | todo |
| R3.3-preserve-graders | 3 | The calibrated graders, sign-in boundaries and spending protections are preserved; grading models are not changed. | WP12, WP15 | todo |
| R3.4-academic-only | 3 | Academic IELTS stays the supported course; no General Training claim without the curriculum. | WP4, WP10 | todo |
| R3.5-out-of-scope | 3 | Marketing pages, pricing, payments, domain changes and a teacher management app stay out of scope. | all | todo |
| R3.6-visual-identity | 3 | The green, orange and cream identity and the approved Mr EZ design are preserved; layouts stay calm with one main action and secondary choices revealed when needed. | WP8, WP9, WP10 | todo |
| R3.7-russian-interface | 3 | Russian remains available for interface and explanations. | WP24 | todo |
| R3.8-english-exam-material | 3 | Passages, questions, options, answers, transcripts, model answers and useful English phrases stay English; vocabulary words and examples stay English while meanings may be Russian. | WP24 | todo |
| R3.9-language-not-ability | 3 | Language choice never implies ability level. | WP3, WP5 | todo |
| R3.10-local-verification | 3 | Build and verify locally; production pushes, deployments, production migrations, destructive actions and paid AI tests are surfaced with exact commands, changes, rollback and cost before asking. | WP13, WP25 | todo |

## 4. Shared learning data

### Catalogue

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R4.1-versioned-not-isolated | 4 | Versioned structures with explicit migration, reusing existing code, not another isolated recommendation store. | WP1, WP2 | todo |
| R4.2-catalogue-fields | 4 | Every schedulable activity has a stable id, content version, paper and subskill, objective, prerequisites, expected duration, a real route or task reference, completion evidence and supported explanation language. | WP1, WP4 | todo |
| R4.3-catalogue-stays-small | 4 | Large passages, audio and transcripts stay out of the catalogue the planner and the Worker import. | WP1, WP4 | todo |
| R4.4-all-lessons-discoverable | 4 | All 76 existing lessons remain discoverable, and being in the library does not make an item mandatory. | WP4, WP8 | todo |
| R4.5-focused-exercises-authored | 4 | Small focused exercises are added where the library only offers a long essay or passage. | WP16, WP17, WP18, WP20 | todo |
| R4.6-authored-content-marked | 4 | Any generated teaching example is distinguishable from official or publisher material, verified before serving as a scored check, and keeps its source attribution. | WP16, WP17 | todo |

### Learner evidence

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R4.7-evidence-fields | 4 | Each event records a stable id, ownership, activity and content version, date, item or prompt identity, first answer, feedback or score, assistance used, retry-of relationship, practice or assessment mode and completion state. | WP2, WP11, WP12 | todo |
| R4.8-evidence-first-answer | 4 | The first answer is captured before any help is revealed. | WP11, WP12 | todo |
| R4.9-no-raw-audio | 4 | Only the evidence needed to teach and review is kept; raw audio is not retained indefinitely. | WP2, WP12 | todo |
| R4.10-studied-vs-demonstrated | 4 | Visited and studied are tracked separately from independent demonstration; a completion click is studied and a correct answer after a hint is assisted success. Neither becomes mastery. | WP2, WP3, WP11 | todo |
| R4.11-no-inflated-confidence | 4 | Blank abandoned assessments, repeat submissions and already-seen questions never inflate confidence or generate false learning patterns. | WP3 | todo |
| R4.12-one-evidence-policy | 4 | One evidence policy serves planner, tutor and reports, weighing recent results, independent occasions, unseen material, amount of evidence and assistance. | WP3, WP9, WP23 | todo |
| R4.13-preserve-uncertainty | 4 | Uncertainty is preserved rather than collapsed into a number. | WP3, WP9 | todo |
| R4.14-separate-task-and-part | 4 | Writing Task 1 and Task 2 and Speaking parts are separated where that changes interpretation. | WP3 | todo |
| R4.15-partial-is-not-a-band | 4 | A partial exercise never produces an authoritative overall IELTS band. | WP3, WP15 | todo |
| R4.16-legacy-completions-studied | 4 | Historical completions migrate to studied. | WP2 | todo |
| R4.17-legacy-scores-provenance | 4 | Historical scores keep their provenance, and records without item-level detail stay limited evidence rather than being fabricated. | WP2, WP3 | todo |
| R4.18-preserve-selected-goals | 4 | Existing explicitly selected goals and review schedules survive migration. | WP2 | todo |

### Synchronisation

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R4.19-sync-everything | 4 | Evidence, plan revisions, preferences, vocabulary review state and saved learning information are available across devices. | WP13, WP14, WP21 | todo |
| R4.20-cache-scoped-by-user | 4 | Browser caches are scoped by user and sign-out and account switching are handled safely. | WP6 | todo |
| R4.21-explicit-ownership-claim | 4 | Anonymous work merges into an account only through an explicit, safe ownership flow. | WP6, WP14 | todo |
| R4.22-idempotent-writes | 4 | Writes are idempotent so retries cannot duplicate attempts. | WP14 | todo |
| R4.23-no-stale-overwrite | 4 | A clear conflict policy stops an old device overwriting a newer plan. | WP14 | todo |
| R4.24-server-authority | 4 | Server authority for confirmed plans is defined, and a cached offline session reconciles against it. | WP14 | todo |
| R4.25-pending-shown-honestly | 4 | Pending synchronisation and pending grading are exposed honestly and distinguished from each other. | WP12, WP14 | todo |
| R4.26-migration-tested-locally | 4 | Schema migrations are tested on fixtures and local infrastructure before any production operation is proposed. | WP13, WP25 | todo |

## 5. One personal plan and next step

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R5.1-one-engine | 5 | courseStatus, getTodayPlan and recommendNext become adapters over a shared plan and session contract. | WP7 | todo |
| R5.2-no-competing-action | 5 | No screen keeps a competing primary next action. | WP8, WP9 | todo |
| R5.3-plan-contents | 5 | The plan holds goals, confirmed constraints, evidence version, plan revision, scheduled sessions, selected activity ids, reasons and evidence references, alternatives, overrides and a concise change history. | WP5, WP6 | todo |
| R5.4-surfaces-share-session | 5 | Today, Course, Mr EZ welcome, weekly review and lesson endings read the same current session. | WP8, WP9 | todo |
| R5.5-explain-reconciles | 5 | Explain-result actions reconcile any later activity into the plan before calling it the next step. | WP9 | todo |
| R5.6-every-continue-revisited | 5 | Every Continue and Next action is revisited, including account menus and direct lesson entry. | WP8, WP9 | todo |
| R5.7-both-targets | 5 | Selection uses the overall target and the per-paper minimum with actual gaps, not identical target assumptions. | WP3, WP5 | todo |
| R5.8-unknowns-and-prerequisites | 5 | Selection considers unknown skills needing assessment, relevant prerequisites and demonstrated strengths. | WP5 | todo |
| R5.9-evidence-quality-and-coverage | 5 | Selection considers current weaknesses with their evidence quality, due review, and coverage across all four papers. | WP5 | todo |
| R5.10-date-time-and-choice | 5 | Selection considers the exam date, realistic available time and the student's chosen alternative. | WP5 | todo |
| R5.11-seen-active-recent | 5 | Selection considers whether a task is already seen, already active or recently attempted. | WP5 | todo |
| R5.12-target-change-matters | 5 | An important target change affects selection when the evidence warrants it, without forcing a different task merely to make a test pass, and the explanation is recorded. | WP5 | todo |
| R5.13-stable-session | 5 | A stable active session, a rolling near-term schedule and longer-term milestones. | WP5, WP6 | todo |
| R5.14-replan-triggers | 5 | Replanning happens only on meaningful completed evidence, goal, date or availability edits, a student override, or a new day. | WP5 | todo |
| R5.15-no-replan-on-refresh | 5 | An active task does not change because a page refreshed or an AI response arrived late. | WP5, WP6 | todo |
| R5.16-reject-stale-proposals | 5 | AI proposals are rejected against newer plan and evidence versions. | WP15 | todo |
| R5.17-budget-is-hard | 5 | The selected daily budget is a hard constraint. | WP5 | todo |
| R5.18-indivisible-commitment | 5 | An indivisible exam is offered as an explicit longer commitment or scheduled elsewhere, and its review goes in another session. | WP5 | todo |
| R5.19-short-deadline-honest | 5 | A short deadline does not pack all lessons in; the plan states what can reasonably fit and prioritises useful work without predicting a score. | WP5, WP10 | todo |
| R5.20-recovery-not-backlog | 5 | Missed days produce a manageable recovery plan, not an ever-growing backlog. | WP5 | todo |
| R5.21-expired-date-follow-up | 5 | A past exam date triggers a clear date or goal follow-up, never a course-complete message, and changing the deadline requires the student's action. | WP5, WP8 | todo |
| R5.22-no-invented-date | 5 | A plan with no date exists as visibly provisional and no date is invented. | WP5, WP10 | todo |

## 6. Intake and Today

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R6.1-intake-fields | 6 | Intake collects target overall score, per-paper minimums, exam date, study days, daily time and explanation language, and stays short. | WP10 | todo |
| R6.2-sixty-offered | 6 | 60 minutes is offered as the tutor-recommended commitment. | WP10 | todo |
| R6.3-self-reported-score | 6 | A recent score and its date can be given and are marked self-reported. | WP2, WP10 | todo |
| R6.4-staged-diagnostic | 6 | A staged diagnostic route built from suitable existing material gives a useful first session and collects evidence across the first sessions. | WP5 | todo |
| R6.5-assess-all-four | 6 | All four papers are assessed over time, and short samples identify learning needs rather than a dependable band. | WP5, WP3 | todo |
| R6.6-defer-diagnostic | 6 | A student can defer a diagnostic and receive a provisional course that openly shows what is unknown. | WP5, WP8 | todo |
| R6.7-today-one-objective | 6 | Today shows one learning objective, the reason, the estimated time, a short session sequence and one Start or Continue button. | WP8 | todo |
| R6.8-mr-ez-explains-the-session | 6 | Mr EZ's explanation belongs to that session rather than competing with it. | WP9 | todo |
| R6.9-secondary-actions | 6 | Why this, I have less time today and Choose another skill are the secondary actions. | WP8 | todo |
| R6.10-short-day-is-temporary | 6 | A temporary short day does not change the regular daily preference. | WP5, WP8 | todo |
| R6.11-course-shows-route | 6 | Course shows the student's route, upcoming priorities and why adjustments happened, and keeps Browse all lessons accessible. | WP8 | todo |
| R6.12-no-library-percent-as-readiness | 6 | A fixed percentage of the whole library is never presented as exam readiness. | WP8, WP9 | todo |

## 7. Teaching flows

### Lessons and tutor

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.1-quick-checks-recorded | 7 | Lesson quick checks feed the shared learner record with stable question identities. | WP11 | todo |
| R7.2-first-answer-before-help | 7 | First answers are captured before help is revealed, retry relationships are preserved and assistance is recorded. | WP11 | todo |
| R7.3-no-unsupported-mastery | 7 | Unsupported language such as claiming mastery from one perfect familiar quiz is removed. | WP3, WP9 | todo |
| R7.4-tutor-gets-the-block | 7 | The tutor receives the exact reviewed lesson block, the current task, the student's answer and the hint history; a lesson title alone is insufficient. | WP15 | todo |
| R7.5-explain-hint-example | 7 | Explain, Hint and Show an example operate at the relevant teaching point. | WP15, WP16 | todo |
| R7.6-lesson-ends-with-shared-next | 7 | The lesson ends with the shared next activity. | WP8 | todo |
| R7.7-pause-and-resume | 7 | A student can pause and resume without losing work. | WP6, WP11 | todo |

### Reading and Listening

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.8-exact-activity-not-hub | 7 | An exact suitable activity is selected rather than sending every recommendation to a hub. | WP4, WP5 | todo |
| R7.9-item-exposure | 7 | Item exposure is recorded across lessons, drills and full papers that reuse the same material. | WP11, WP12 | todo |
| R7.10-use-existing-explanations | 7 | Existing question explanations and passage or audio evidence are used. | WP15, WP16 | todo |
| R7.11-observed-vs-conjectured | 7 | An observed mistake is distinguished from a conjectured cause, and the student's reasoning is asked for when needed. | WP15 | todo |
| R7.12-listening-replay-and-segment | 7 | Listening practice keeps its replay controls and teaches from the relevant recording segment. | WP19 | todo |
| R7.13-teach-then-fresh-check | 7 | A particular problem is taught and then checked on fresh material. | WP16, WP18 | todo |
| R7.14-every-question-type | 7 | Every existing question type is supported in catalogue and evidence mapping, with no silent fallback to unrelated tasks and no false coverage claim. | WP4, WP18 | todo |

### Writing

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.15-criterion-to-task | 7 | Criterion feedback becomes concrete focused tasks such as overview writing, claim support, paragraph organisation and sentence correction. | WP17, WP20 | todo |
| R7.16-linked-revision | 7 | Linked correction and revision are implemented, followed by a new prompt to check transfer. | WP17 | todo |
| R7.17-preserve-originals | 7 | Original essays and reports are preserved, and Task 1 and Task 2 evidence stays distinguishable. | WP2, WP12 | todo |
| R7.18-grader-keeps-its-job | 7 | The existing grader is used for its calibrated purpose and the tutor interprets rather than silently replacing an assessment score. | WP15, WP17 | todo |
| R7.19-objective-feedback-not-a-band | 7 | A paragraph exercise gets objective-specific feedback without pretending to be a full essay band. | WP15, WP17 | todo |

### Speaking

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.20-speaking-objective-loop | 7 | Speaking feedback chooses a specific practice objective, offers a retry, then checks on a different question. | WP20 | todo |
| R7.21-preserve-teaching-evidence | 7 | The selected teaching evidence needed to explain the recommendation is preserved. | WP12, WP20 | todo |
| R7.22-pronunciation-from-audio | 7 | Pronunciation feedback uses actual audio, never a text-only guess. | WP12, WP20 | todo |
| R7.23-recording-failure-recovery | 7 | Clear recording and grading failure recovery is provided. | WP12 | todo |
| R7.24-practice-vs-examiner | 7 | Teaching practice stays distinct from the live examiner's assessment behaviour, and calibrated grading models are unchanged. | WP20, WP22 | todo |

### Vocabulary

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.25-vocab-into-the-plan | 7 | Due recall, words relevant to current work and genuinely observed vocabulary problems connect to the plan. | WP21 | todo |
| R7.26-recall-and-use | 7 | Review includes recall and use in a sentence, not only recognising definitions. | WP21 | todo |
| R7.27-vocab-state-synced | 7 | Word-level review state is preserved and synchronised. | WP14, WP21 | todo |
| R7.28-all-topics-load | 7 | Every relevant topic's words actually load into the review experience, including the expanded topics. | WP21 | todo |

### Tests and supporting libraries

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R7.29-tests-as-checkpoints | 7 | Independent tests are used as checkpoints, with suitable unseen content reserved and overlap with practice accounted for. | WP22 | todo |
| R7.30-revise-after-a-test | 7 | The plan is revised after a checkpoint. | WP5, WP22 | todo |
| R7.31-no-help-during-assessment | 7 | No hints, examples or task-specific tutor assistance during assessment, verified for direct chat requests and hidden buttons. | WP15, WP22 | todo |
| R7.32-libraries-linked | 7 | Model answers, cue cards, band guidance, saved lessons and notes link into the relevant activity and explain what to notice or practise. | WP22 | todo |
| R7.33-voluntary-practice-counts | 7 | Independent exploration stays available and useful evidence from voluntary practice is recorded. | WP12, WP22 | todo |

## 8. AI responsibility and limits

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R8.1-ai-teaching-role | 8 | AI diagnoses tentatively, explains differently, gives contextual hints, evaluates focused practice against its objective and proposes the next teaching move from eligible activities. | WP15 | todo |
| R8.2-code-counts-facts | 8 | Factual counting and score provenance stay in trusted application logic. | WP3, WP15 | todo |
| R8.3-strict-validation | 8 | AI output is validated against a strict response shape, catalogue ids, ownership, prerequisites, time constraints and the current plan version, and links resolve from real ids. | WP15 | todo |
| R8.4-grounded-not-instructed | 8 | Explanations are grounded in supplied content and evidence, and user answers never become system instructions. | WP15 | todo |
| R8.5-reuse-protections | 8 | Existing authentication, limits, request deduplication and cache protections are reused. | WP15 | todo |
| R8.6-cache-by-version | 8 | Replies are cached by content, evidence and plan version and by language, and there are no paid calls on render, tick or passive navigation. | WP15 | todo |
| R8.7-useful-without-ai | 8 | With AI unavailable the student still gets a real plan, lesson content and honest deterministic guidance. | WP5, WP15 | todo |
| R8.8-never-simulated-as-live | 8 | A simulated response is never displayed as live AI. | WP15, WP25 | todo |
| R8.9-teacher-reference-cases | 8 | Reviewable teacher-reference scenarios are built and disagreements are recorded; model self-evaluation alone is insufficient. | WP15, WP25 | todo |
| R8.10-thresholds-provisional | 8 | Thresholds are explicit, configurable and described as provisional, never as validated IELTS science, and no evidence of effectiveness is invented. | WP3 | todo |

## 9. Progress and student control

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R9.1-separate-skill-trends | 9 | Separate current evidence and trends are shown for Reading, Listening, Writing and Speaking. | WP23 | todo |
| R9.2-no-joined-trajectory | 9 | Unrelated paper scores are never joined into one misleading improvement line. | WP23 | todo |
| R9.3-distinguish-three-things | 9 | Skill improvement, amount studied and exam readiness are clearly distinguished. | WP23 | todo |
| R9.4-explain-the-change | 9 | The report explains what improved, what remains uncertain, what to work on next and what changed in the schedule, using one consistent evidence policy. | WP23 | todo |
| R9.5-honest-duration | 9 | Estimated duration is labelled honestly and a fixed lesson allowance is never reported as measured time spent. | WP23 | todo |
| R9.6-student-can-inspect | 9 | The student can inspect goals, preferences and what Mr EZ remembers, coherently with the structured learner record. | WP9, WP10 | todo |
| R9.7-exportable-review-evidence | 9 | Local or exportable review evidence is prepared and the moments where teacher input would help are identified, without inventing a support workflow or a teacher dashboard. | WP23, WP25 | todo |

## 10. Implementation sequence

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R10.1-stage1-contracts | 10 | Baseline, reproduction scenarios, migration strategy and the shared activity, evidence and plan contracts. | WP1 to WP4 | todo |
| R10.2-stage2-one-next-step | 10 | One shared next step wired through all existing surfaces, with the one-hour recommendation, intake and honest budget and deadline behaviour. | WP5 to WP10 | todo |
| R10.3-stage3-evidence | 10 | The learner evidence store, staged diagnostics, prerequisite mapping, synchronisation and personalised selection. | WP11 to WP14 | todo |
| R10.4-stage4-pilots | 10 | Reading Matching Headings and Writing Task 1 overviews completed as end-to-end integration flows. | WP16, WP17 | todo |
| R10.5-stage5-extend | 10 | The pattern extends to the remaining question types, Writing objectives, Speaking, vocabulary, full tests and supporting libraries, and progress and weekly review are finished. | WP18 to WP23 | todo |
| R10.6-stage6-verify | 10 | The complete verification matrix is run, failures are fixed, remaining externally dependent validation is documented and the audit handoff is prepared. | WP25 | todo |
| R10.7-do-not-stop-early | 10 | The requirement checklist is maintained, and the work is not described as finished after stage 2 or the two pilots. | WP25 | todo |

## 11. Required verification

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R11.1-full-suite-and-build | 11 | The existing automated suite, new behavioural tests and a production build all run. | WP25 | todo |
| R11.2-real-browser | 11 | The app is driven in a real browser; a passing build or a screenshot alone is insufficient. | WP25 | todo |
| R11.3-labelled-synthetic | 11 | Isolated synthetic records are used and labelled. | WP25 | todo |
| R11.4-regression-contradiction | 11 | Regression coverage for the audit's contradictory recommendation finding. | WP7, WP25 | todo |
| R11.5-regression-target-insensitive | 11 | Regression coverage for the target-insensitive schedule finding. | WP5, WP25 | todo |
| R11.6-regression-overload | 11 | Regression coverage for the short-deadline 255-minute overload finding. | WP5, WP25 | todo |
| R11.7-regression-unearned-mastery | 11 | Regression coverage for the unearned mastery finding. | WP3, WP25 | todo |
| R11.8-regression-expired-complete | 11 | Regression coverage for the expired-plan completion finding. | WP5, WP25 | todo |
| R11.9-demo-new-student | 11.1 | A new student sees no invented level or confirmed goal, a short intake, a useful provisional session and a path to assess all four papers. | WP25 | todo |
| R11.10-demo-opposite-profiles | 11.2 | Strong Reading with weak Writing and the reverse receive justified different priorities. | WP25 | todo |
| R11.11-demo-targets-and-minima | 11.3 | Priorities respect the overall target and per-paper minima, including a lowest criterion that already meets its requirement. | WP25 | todo |
| R11.12-demo-one-hour | 11.4 | The 60-minute choice persists, a meaningful session fits it, and explicitly selected existing preferences survive migration. | WP25 | todo |
| R11.13-demo-busy-day | 11.5 | A temporary 15 or 25-minute override is honoured without overwriting the regular hour. | WP25 | todo |
| R11.14-demo-deadline-and-missed | 11.6 | A seven-day deadline with missed days gives useful achievable scope, no 255-minute packing, no infinite backlog and no false completion. | WP25 | todo |
| R11.15-demo-one-session | 11.7 | Today, Course, Mr EZ, the lesson ending and every Continue agree before and after progress. | WP25 | todo |
| R11.16-demo-real-learning | 11.8 | Completing a page does not claim mastery; first answers, hints and retries persist; fresh independent checks change the plan. | WP25 | todo |
| R11.17-demo-exposure | 11.9 | Repeated papers and overlapping lesson or drill questions are not fresh independent evidence, and blank submissions do not become confident findings. | WP25 | todo |
| R11.18-demo-override | 11.10 | A student override and direct entry update the same record and create no contradictory plan. | WP25 | todo |
| R11.19-demo-reliability | 11.11 | Refresh, resume, offline recovery, a failed grader, an unavailable tutor, rate limits, duplicate requests and stale AI replies lose no work and corrupt no plan. | WP25 | todo |
| R11.20-demo-accounts | 11.12 | Independent users cannot see or inherit each other's records; two devices reconcile without duplicates or stale overwrites; local simulations are distinguished from real-account checks. | WP25 | todo |
| R11.21-demo-assessment-boundary | 11.13 | Tutor help stays blocked during timed exams including direct requests, and review help becomes available afterwards. | WP25 | todo |
| R11.22-demo-coverage | 11.14 | Every lesson family and practice type has valid catalogue links and appropriate completion evidence, with no orphaned routes or dropped content. | WP25 | todo |
| R11.23-demo-language-and-access | 11.15 | Desktop and 390 px phone, English and Russian, keyboard controls, readable focus states and reduced motion all work, and English exam content is unchanged. | WP25 | todo |
| R11.24-demo-progress | 11.16 | Distinct skill trends, uncertainty, evidence freshness and explained plan changes agree with the stored records. | WP25 | todo |
| R11.25-deterministic-and-browser | 11 | Deterministic tests cover scheduling and evidence logic; browser tests cover the actual flows. | WP25 | todo |
| R11.26-labelled-simulated-ai | 11 | Clearly labelled simulated AI is used for free integration tests. | WP25 | todo |
| R11.27-bounded-live-batch | 11 | A bounded live AI test batch with an expected cost and the required access is prepared for Alex's approval. | WP25 | todo |
| R11.28-no-unverified-claims | 11 | Live AI, production migration, multi-device cloud behaviour and real student learning gains are not claimed as verified when only fixtures were used. | WP25 | todo |

## 12. Handoff

| Id | Brief | Requirement | WP | Status |
|---|---|---|---|---|
| R12.1-implementation-doc | 12 | `docs/PERSONAL-LEARNING-IMPLEMENTATION.md` exists with a behaviour summary and a requirement-to-implementation checklist. | WP25 | todo |
| R12.2-branch-and-url | 12 | The actual branch and commit, the correct running localhost URL and the startup steps are recorded. | WP25 | todo |
| R12.3-architecture-and-migration | 12 | Architecture and data changes and migration compatibility are described in enough detail for another engineer to review. | WP25 | todo |
| R12.4-profiles-and-walkthroughs | 12 | Synthetic learner profiles and an exact reproducible walkthrough for each acceptance scenario are provided. | WP25 | todo |
| R12.5-honest-results | 12 | Test and build results and browser evidence are recorded, with failures and fixes stated honestly. | WP25 | todo |
| R12.6-separate-statuses | 12 | Deterministic behaviour, simulated AI, live AI, real-account synchronisation and student or teacher validation each carry their own status. | WP25 | todo |
| R12.7-known-limitations | 12 | Known limitations, incomplete requirements and proposed next actions are listed, with no hidden TODOs presented as completed features. | WP25 | todo |
| R12.8-production-plan | 12 | Exact proposed production migrations and deployments, required configuration, rollback and any paid verification batch with a spend estimate are prepared, with no secret values. | WP13, WP25 | todo |
| R12.9-preview-and-audit | 12 | A working local preview is available with the direct link sent to Alex, the implementation is provided for Codex's independent audit, and nothing is published until Alex confirms. | WP25 | todo |

---

## Open items carried from the architecture document

These are not requirements; they are decisions the lead must make before the
packages that depend on them can finish. See `ARCHITECTURE.md` section 11.

| Id | Question | Blocks |
|---|---|---|
| Q1 | `sentence-endings` has zero questions in any paper. Author exercises, or mark it taught-but-not-assessed? | WP4, WP18, R7.14 |
| Q2 | What does a student see when `repeatedDifficultyLimit` is reached and there is no teacher surface? | WP5, R9.7 |
| Q3 | One shared daily AI allowance across ten task types, or per-task caps? | WP15, R8.5 |
| Q4 | Confirm 5 diagnostic sessions at 15 minutes, or set a different figure. | WP5, R6.4 |
| Q5 | All 60 model answers are band 8. Author lower bands for teaching contrast? | WP17, R4.5 |
| Q6 | Confirm that not retaining audio means a pronunciation objective can only be re-checked on a new recording. | WP20, R7.22 |
