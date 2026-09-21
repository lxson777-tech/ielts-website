# Personal IELTS learning: audit and improvement plan

Date: 21 September 2026. Status: approved by Alex for implementation by Claude, not yet implemented in this task. The build instructions are in `docs/CLAUDE-PERSONAL-LEARNING-BUILD.md`. Codex will independently audit the result afterward.

Alex's confirmed direction: each student studies toward a target IELTS band by an exam date. AI recommends the next activity; students can choose something else. The existing lesson library remains the teaching foundation.

Alex's additional teaching requirement: recommend one hour of study per day. The current settings already support 60 minutes, but default to 25. The rework should present 60 minutes prominently as the recommended commitment, then ask the student to confirm their available time. Fifteen- or 25-minute sessions remain optional busy-day alternatives, not the main advertised preparation routine. Do not promise a band increase from any time commitment alone.

## Conclusion

The platform already has valuable teaching material and useful AI features, but it does not yet operate as one personal course. Its tutor recommendation, calendar and course order make separate decisions. The solution is one shared personal plan, supported by evidence of what the student can actually do.

AI should help diagnose mistakes, explain the material, select an appropriate teaching approach and propose the next learning activity. Reliable application rules should protect prerequisite order, available time, real content links, assessment boundaries and the student's choices. More AI text on existing pages would not solve the problem.

## What was audited

The root checkout is the older `rebuild/astro` version. I traced the deployed generation through `111e145`, then audited the newer `e2bf9e6` source in `.claude/worktrees/mr-ez-ai-tutor-88d874`, which matches the Russian-language platform observed publicly during this audit. This includes weekly reviews, unit notes and wrong-answer explanations. Those features are credited below, not proposed as if absent.

Browser checks covered 22 routes: Today, Course, plan settings, library, practice hub and four skill trainers, tests, mock exam, vocabulary, progress report, band guidance, model answers, cue cards, account, and a representative lesson for each of the five library categories. All returned 200 with no uncaught page errors or horizontal overflow at the tested desktop width. The seeded Today screen also fitted a 390px phone viewport. English was explicitly exercised for the conflicting-recommendation scenario; the route survey exercised the Russian interface.

The current source exposes 76 course entries and 70 full Reading/Listening tests. All 761 existing automated tests passed. A lesson completion was exercised without an assessment. Browser scenarios used invented student records in isolated local storage, never real student accounts. The public dashboard was inspected signed out.

Limitations: this is a learning-product and personalization audit, not a line-by-line review of all lesson prose and thousands of questions. No paid AI conversations, grading or voice sessions were run. Signed-in cloud synchronization and live AI teaching quality were inspected through source and existing tests, not revalidated with a real student account. No Lighthouse measurements are claimed. An initial older local checkout failed because a font dependency was absent; the successful route checks used the newer checkout with its dependencies available.

## Findings and recommended changes

| Area | What happens now | What should change | Priority |
|---|---|---|---|
| Today | Mr EZ, the scheduled activity and the course card can point at different work. | One session selected from the personal plan. Mr EZ explains that same session. Every Continue action agrees. | First |
| First visit | The system creates a provisional Band 7, eight-week, 25-minute plan. It asks for a goal separately and has no integrated diagnostic journey. | Brief intake followed by a staged starting assessment. Distinguish confirmed goals, self-reported scores and measured results. | First |
| Goal and deadline | Overall and per-paper targets exist, but changing them does not change the calendar's activity selection. | Use the gap to each target, available time and deadline to choose priorities. Keep unknown skill levels visibly unknown. | First |
| Course | Eight fixed units, with every lesson assigned in the same sequence. New vocabulary topics expand the required course for everyone. | Preserve this as the curriculum library. Build each student's route from relevant lessons, prerequisite links and practice. Strong students can demonstrate skills and skip redundant teaching. | First |
| Scheduling | Missed work rolls forward. Tight dates squeeze the full syllabus into available days. | Budget sessions realistically. Reprioritize essential work, offer shorter alternatives and show what no longer fits. Keep a longer exam sitting as an explicit separate commitment. | First |
| Lessons | Reading and clicking complete advances the course. Lesson quick checks do not feed the shared progress model. The lesson footer follows fixed course order. | Separate visited, studied and demonstrated. Record first answers, help used, retries and later independent checks. End with the next activity in this student's plan. | First |
| In-lesson tutor | General chat knows the lesson reference/title, but does not receive the whole current teaching block and learner attempt as a structured lesson interaction. | Give it the exact reviewed lesson excerpt, current question, student answer and hint history. Offer Explain, Give a hint and Show an example at the relevant point. | Next |
| Reading practice | Rich question-type lessons and passage drills exist. Weakness rules can send students to the relevant type. | Select an exact suitable drill, track whether questions were already seen, distinguish incorrect reasoning from timing, and follow with an unseen check. | First pilot |
| Listening practice | Part drills, recordings, replay, transcripts and strategy support already exist. | Target the specific listening problem, such as missing a correction or confusing a direction. Use the appropriate audio segment for teaching, then a fresh segment for checking. | Next |
| Writing | Prompt-specific support, AI criteria feedback, history and result explanations exist. A recurring low criterion usually sends the student back to the general writing trainer. | Turn feedback into a short task: repair an overview, support a claim, organize a paragraph or correct a sentence pattern. Link the revision to the original, then test transfer in a fresh prompt. | First pilot |
| Speaking | Part practice, live examiner, grading and result explanation exist. Saved history retains scores but not the full teaching evidence from the session. | Preserve selected evidence and a teaching objective. Practise one skill, retry, then use a new question. Keep pronunciation conclusions tied to actual audio. | Next |
| Full tests and mock exam | Timed assessment and review already work as distinct surfaces. | Reserve unseen papers for checkpoints, schedule them when they answer a learning question, and use the results to revise the next week. Preserve the existing boundary against hints during exams. | Next |
| Vocabulary | Topic learning and spaced flashcards exist in a separate store. Calendar vocabulary follows taught topic order. | Prioritize words the student missed, needs for current work or is due to recall. Include sentence use as well as recognition. Feed outcomes into the same learner record. | Next |
| Progress and weekly review | Scores, best/latest results, completion, streaks and a tutor summary exist. Different screens use different evidence windows. Report charts join scores from different papers into one trajectory. | Show separate skill trends, recent independent evidence, remaining gaps and why the plan changed. Keep activity and demonstrated ability distinct. | First foundations, then UI |
| Supporting libraries | Model answers, cue cards, band guidance, saved lessons and notes are available as places to browse. | Open the precise relevant example from a task, with the feature to notice or practise. Keep browsing available as a secondary choice. | Next |
| Account and memory | Progress and study-plan data sync. Vocabulary and notes are separate browser stores in the inspected sync path. Conversation memory is not a structured learner model. | Sync the learning record, review queue and preferences safely across devices. Give students visible control over remembered information and plan overrides. | First foundations |
| Language | Russian explanations and interface, English exam material, and a visible language switch are already present. | Preserve this split in adaptive lessons and tutor responses. Language preference must not become an assumed ability level. | Throughout |

## Reproduced examples

1. **Contradictory direction.** With a confirmed Band 7 goal and two Reading attempts containing 2/16 correct Matching Headings answers, Mr EZ selected Matching Headings. Today selected Speaking Overview and Part 1 Interview. Course selected Speaking Overview.
2. **Target does not personalize the schedule.** With other settings unchanged, Band 6.5 with a Writing minimum of 5.5 and Band 9 with a Writing minimum of 9 produced identical schedules.
3. **The budget is not a constraint.** A seven-day plan with 15 minutes daily generated a calendar day containing 255 minutes. Its first Today list contained 28 minutes. The weekly UI warns about workload, but does not resolve the mismatch.
4. **Completion is not understanding.** Clicking the Speaking Overview completion button created a completed lesson record without demonstrating the skill.
5. **Deadline is confused with completion.** An expired plan returned `finished: true` while still returning unfinished introductory lessons. The component uses this state for a plan-complete heading.

These are product behavior findings, not live AI hallucinations. They occur in the ordinary planning logic before an AI response is needed.

## The intended student experience

### 1. Establish a real starting point

Collect target overall band, required minimum per paper, exam date, study days, realistic daily time and explanation language. Confirm Academic IELTS as the initial supported route rather than implying General Training coverage. Allow a recent score with its date, clearly marked self-reported until supported by evidence.

Give useful work immediately, then assess across the first few sessions. A short Reading/Listening sample and brief Writing/Speaking activities can identify teaching needs; they must not be represented as a reliable full IELTS band. Request fuller independent samples when they are needed. A student may defer diagnostics, with a visibly provisional plan.

### 2. Show one personal session

Today should answer four questions: what am I working on, why this, how long will it take, and what happens after?

Example, using hypothetical evidence: "You confused the main idea with a supporting example in two Reading practices. Today we will work on headings. About one hour."

Session: recall the method, study the relevant lesson block, answer guided questions, then answer a short fresh set without hints. One main Start button. Secondary choices: I have less time, Choose another skill, or Why this activity? Accepting an alternative updates the same plan and records the choice.

A possible 60-minute session is 5 minutes of recall, 10 minutes of targeted teaching, 25 minutes of practice, 15 minutes of feedback and an independent check, and 5 minutes of recap. This is a planning example, not a fixed format: a full Reading test needs its own hour and a separately scheduled review. The planner should vary the balance by task and learner need, and must not fill the hour by adding unnecessary lessons.

The daily session should stay stable while the student is working. Reconsider the next session after meaningful evidence, a changed goal or an explicit student choice, not on every page load.

### 3. Teach, practise and verify

Use existing teacher-authored lesson content as the source. AI changes explanation depth, examples and feedback in response to the student's answer. It should diagnose tentatively, ask a useful question and help the student attempt a correction before supplying a complete solution.

An assisted correct answer means successful guided practice. It does not mean independent mastery. Check the skill again on unseen material, and check retention later. The exact number of questions and thresholds should be calibrated with teacher review, not asserted as scientifically validated constants.

This direction is consistent with the [IES practice guide on organizing instruction and study](https://ies.ed.gov/ncee/wwc/PracticeGuide/1), which supports retrieval practice and spacing. That evidence supports the design principles, not any specific IELTS score-gain promise.

### 4. Make progress change the course

After an activity, explain what was demonstrated and what remains uncertain. A strong independent result can reduce unnecessary instruction. Continued difficulty should change the teaching approach or revisit a prerequisite. Repeated difficulty should trigger teacher review, not endless variations of the same drill.

At the weekly review, show concrete changes: "Reading headings are improving, so one practice slot moves to Task 1 overviews." Keep all four papers represented, while allocating more effort to the gaps that matter for the student's goal.

IELTS reports four paper scores and an overall average. The platform should plan around both the overall goal and required individual minimums, not optimize only the weakest percentage. See [official IELTS scoring guidance](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail).

## What must exist behind the experience

**A structured activity catalogue.** Give each teachable block a stable identifier, skill and subskill, objective, prerequisites, estimated duration, supported task types, explanation language, relevant practice and completion evidence. The present registries already provide a useful starting point. Add small reviewed missing exercises where full essays or full passages are too large for focused teaching.

**One learner record.** Record activity and content version, question/prompt identity, first answer, correctness or rubric feedback, assistance used, retry relationship, date and meaningful study duration. Derive current ability, uncertainty and review needs from this history. Preserve historical scores and completion during migration; an old completion becomes studied, not automatically mastered.

**One plan service.** Maintain plan version, goals, constraints, selected activities, reasons, alternatives and changes. Today, Course, tutor welcome, weekly review and lesson endings read the same selected session. A browser can keep a cached copy, but confirmed student state must reconcile across devices without one stale page overwriting a newer plan.

**Constrained AI decisions.** The existing September 19 decision intentionally lets code count facts and AI word them. Keep that factual boundary. The proposed expansion is to let AI diagnose a misconception and propose teaching moves or choose among eligible catalogue activities. Validate those proposals against the actual catalogue, prerequisites, time budget and evidence. AI must not write scores into existence or invent destinations. This expands its teaching role without giving it unchecked control.

**A single evidence policy.** Use recency, independent sittings, unseen items and assistance level consistently. Do not count repeating a memorized paper as a fresh independent measure. Do not treat a low relative Writing criterion as a serious gap when it already meets the student's required standard. Do not turn Vocabulary into a fifth IELTS paper.

**Content-grounded explanations.** Supply only the relevant reviewed content and student evidence to a tutoring turn. The newer wrong-answer content endpoint is a useful pattern to extend to lessons. Keep full source material outside the small planner catalogue.

**Reliable fallback and measured cost.** Cache explanations by plan/evidence version and request AI at meaningful learning moments. Track tutor, grading and audio costs separately. During outages, keep the selected plan, lesson content and deterministic feedback usable, and make pending grading clear. Pilot costs should be measured before setting a price or promising usage allowances.

## Delivery sequence and proof required

| Stage | Deliverable | Proof before moving on |
|---|---|---|
| 1. One coherent next step | Shared session object across Today, Course, lesson ending and tutor; one hour recommended daily; clear provisional goals; honest deadline and workload states. | The same student sees the same activity everywhere. The 60-minute choice is prominent and persists. Missing days do not create an impossible queue. An expired date is not described as course completion. |
| 2. Personal foundations | Structured learner record, intake, staged assessment, content objectives/prerequisites and plan versions. | Two students with different evidence get appropriately different plans. Target/date/time changes affect priorities. Historical progress survives. Device and account isolation checks pass. |
| 3. Complete teaching pilot | One Reading question type and one Writing problem, end to end: lesson, attempt, feedback, correction, unseen check and replanning. | Real students can complete both flows; teacher review confirms feedback and next steps; assisted answers never count as independent evidence. |
| 4. Extend across the platform | Listening, Speaking, vocabulary, exact practice selection, checkpoint tests and meaningful progress reporting. | Each paper has a complete learning cycle. Vocabulary reviews and voluntary extra practice update the plan. Full exams remain free of teaching assistance. |
| 5. Calibrate and release gradually | Teacher reference cases, monitoring, small student pilot, comparison with the current fixed course. | No contradictory recommendations, valid links, sensible workload, reliable stored evidence and acceptable measured spend. Expand only after learning-quality review. |

Avoid beginning with a wholesale visual redesign or generating a complete new course for every student. The highest-value first product is the shared plan plus two complete teaching flows. This also creates a reusable example of the company's AI-system approach: a model guided by real business data and verifiable actions.

## Acceptance scenarios

- Brand-new learner: no invented starting band, useful first session, clear assessment path.
- Strong Reading and weak Writing: different workload from a learner with the reverse profile.
- High overall goal with a lower permitted per-paper minimum: prioritize actual requirements rather than forcing identical scores in every paper.
- Fifteen minutes today: a suitable short task, or a clearly explained longer commitment that the student chooses.
- One hour recommended: the student can choose and retain 60 minutes; the session uses it meaningfully, while a shorter day is a temporary override rather than silently changing the whole plan.
- Exam in seven days: realistic priorities and honest scope, not the full library squeezed into a week.
- Several missed days: recoverable schedule with explained changes, not accumulating guilt.
- Hints used: guided success, followed by an independent check.
- Repeated identical questions: practice recorded, but no inflated confidence.
- Student chooses another skill: the plan respects that choice and uses the resulting evidence.
- Tutor or grader unavailable: no fabricated feedback or lost work.
- Phone, Russian explanations and another device: consistent plan and progress; exam content remains English.
- Course pages all visited: readiness still depends on performance, not checkmarks.

Judge the pilot mainly on independent performance on held-out material and teacher agreement about the next activity. Track time to first useful session, continuation, overrides, response delay, cost and failures as supporting measures. More chat messages and completed pages are not evidence of better learning.

## Decisions still open for implementation

Teacher review capacity, how much diagnostic work to ask for in the first sessions, what evidence should permit skipping a lesson, and paid AI allowances need concrete choices during the pilot. The audit proceeds on an Academic IELTS scope because that is what the current library supports. No deployment or billable testing is included in this plan.

Optional tooling: the standing skill scout found [llm-evaluation by wshobson](https://skills.sh/wshobson/agents/llm-evaluation) useful for teacher reference cases and regression evaluation. It was not installed. No vetted adaptive-learning skill was found that replaces the project-specific learning design above.

## Evidence map for engineering

Paths below are relative to the audited `e2bf9e6` checkout, not the older root source.

- Conflicting choices: `src/components/LearningDashboard.tsx`, `src/components/plan/PlanToday.tsx`, `src/lib/tutor/recommend.ts`, `src/lib/course.ts`.
- Fixed allocation, budget and expiry behavior: `src/lib/plan/schedule.ts`.
- Goals already supported: `src/lib/study-plan.ts`.
- Different evidence policies: `src/lib/tutor/insights.ts`, `src/lib/level.ts`, `src/components/ProgressReport.tsx`.
- Completion and local quick checks: `src/layouts/LessonLayout.astro`, `src/components/PracticeQuiz.tsx`, `src/scripts/lesson-quiz.ts`.
- Saved assessment evidence: `src/lib/progress.ts`, `src/components/WritingTester.tsx`, `src/components/SpeakingTester.tsx`, `src/components/LiveExaminer.tsx`.
- Existing new tutor surfaces: `src/components/tutor/{UnitNote,WeeklyReview,TestDebrief,AskWhyWrong}.tsx`.
- Tutor context and boundaries: `src/lib/tutor/{catalog,prompt,schema,test-items}.ts`, `workers/mr-ez/src/index.ts`.
- Review and synchronization: `src/lib/vocab-review.ts`, `src/lib/auth/sync.ts`.

Runtime evidence is retained with this report in `personal-learning-evidence-2026-09-21/`. The images use an explicitly synthetic student profile.
