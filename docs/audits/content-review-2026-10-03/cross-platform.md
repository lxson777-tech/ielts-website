# Cross-platform consistency review, 3 October 2026

Reviewer: cross-platform consistency (one fact sheet for the whole site, and the course order).

Base: this worktree started on `main` (fddbae1). Before any work it was fast-forwarded (no merge commit, nothing of its own yet) to `claude/paid-platform-readiness-03c113` at d7951cc, so it already contains the legal work, the Kazakh dictionaries and the current help and sales copy. My commits sit directly on top of that branch tip, so merging them onto the platform branch is a plain fast-forward.

Official sources checked: ielts.org "IELTS scoring in detail" (band tables, rounding the overall band, Task 2 carrying more weight, the criterion names), plus the public test-format pages for timings.

## Summary

- 26 exam facts checked, across lesson bodies (English and Russian), data files, pages, components, the sales copy, Mr EZ's prompt and catalogue, the live examiner's script, the band tables and the Russian and Kazakh dictionaries.
- 1 real contradiction between lessons (spelling in Reading and Listening). It sits in a Listening lesson body, so it is reported, not fixed.
- 2 problems fixed in my area: a timer bug that cut off 8 Listening drills before their recording ended, and the Reading overview's time label.
- Course order: all 76 lessons are placed exactly once, every overview comes before its paper's techniques, and timed tests come only in unit 8. No lesson says "as you learned in..." about a lesson the student has not met yet.
- Internal links: the whole site was built and every internal link and anchor in all 676 built pages was checked. One broken anchor (not mine), nothing else.
- Tests: `npm test` 2544 of 2544 passing. `npx astro check` was not needed because no `.astro` file was touched. The build passes.

## Fixes

### 1. Listening drills: the clock ran out before the recording ended

- **Files:** `src/lib/tests/drills.ts` (new `listeningDrillMinutes`), `src/data/generated/learning-index.json` (regenerated with `npm run learning:index`; only the drill durations changed), `tests/learning-catalog.test.ts` (one pinned value), new `tests/listening-drill-clock.test.ts`.
- **What was wrong:** every single-part Listening drill had a flat 8-minute clock. The clock starts before the student presses Start recording, and the paper hands itself in at zero. 8 of the 120 parts have a recording longer than 8 minutes (Test 1 Part 1 runs 8.9 minutes; Tests 7 P3, 16 P1, 17 P2, 17 P3, 23 P3, 26 P3, 26 P4 run 8.1 to 8.8). On those parts the last questions could never be answered. Another 32 parts run 7 to 8 minutes, which left under a minute to start, listen and check.
- **What it is now:** the clock is the recording's own length plus one minute, rounded up, and never less than 8. 80 parts keep 8 minutes, 32 get 9 and 8 get 10. The drill's description ("in about N minutes") follows automatically.
- **Why this file:** my brief lets me fix a test timer that contradicts the real timing. The timer value lives in `drills.ts`, not in TestPlayer, so I am naming it here in case another reviewer is also editing that file.
- **Proof:** `tests/listening-drill-clock.test.ts` checks every drill has at least a minute beyond its recording, short parts keep 8, and the description states the real clock. I also opened `/trainers/listening/listening-full-001-drill-p1` on a local preview (port 4580): it said "10 questions in about 10 minutes" and "10 minutes". After Start, the clock read 09:57 and the drill covered 00:00 to 08:55 of the recording. Before the fix the clock would have hit zero 55 seconds before the recording ended.
- **For the orchestrator:** `learning-index.json` is generated. If other reviewers changed test data, run `npm run learning:index` once after merging everything rather than merging that file by hand.

### 2. Reading Overview time label: 8 minutes became 12

- **File:** `src/data/lessons.ts` (duration only; no slug or key changed).
- **What was wrong:** all five overviews used a flat 8 minutes. The Listening, Writing, Speaking and Vocabulary overviews have 450 to 650 words of teaching. The Reading Overview has about 1,400, because it also teaches the routine behind every question type, the one-screen table of all 11 types and the training order. Reading that in 8 minutes means about 175 words a minute, which is too fast for a B1 to B2 learner.
- **What it is now:** 12 minutes (about 115 words a minute). The plan's teaching cap of 12 minutes per step is unchanged, so nothing about how sessions are built moves.

## Fact sheet

"Agrees" means every place agrees with each other and with the official position.

| # | Fact (official position) | Where it appears | Verdict |
|---|---|---|---|
| 1 | Listening is about 30 minutes, plus 10 minutes transfer on paper, or a 2-minute check on computer | listening.html (EN, RU), listening-part1, listening-part4 (EN, RU), MockExam "about 30 minutes plus time at the end to check", transcripts ("10 minutes to transfer") | Agrees |
| 2 | Listening practice clock | Full tests 40 min (30 papers), Mr EZ catalogue 40, pages.ts "40 minutes" | Agrees with the paper-based total. Full recordings run 28.6 to 32.0 minutes, all inside 40 |
| 3 | Listening: 4 parts, 10 questions each, 40 total, 1 mark each | listening.html, Mr EZ catalogue, TestPlayer counts | Agrees |
| 4 | Recording heard once | listening.html, TestPlayer exam mode, MockExam, help, placement, focus drills | Agrees (drills allow replay, and say so) |
| 5 | Same Listening (and Speaking) for Academic and General Training | listening.html | Agrees (Speaking not stated; a gap, not a contradiction) |
| 6 | Reading is 60 minutes, 3 passages, 40 questions, no transfer time | reading-task1 (EN, RU), reading-task1.astro, pages.ts, MockExam, Mr EZ catalogue, 40 test files at 60 | Agrees |
| 7 | Reading pace of about 20 minutes a passage | reading-task1, placement (14 on purpose, explained to the student), Reading drills (20) | Agrees |
| 8 | Academic Reading band table (official points: 15=5, 23=6, 30=7, 35=8) | schema.ts READING_BAND_TABLE, reading-task1 table | Agrees with each other and with the official points |
| 9 | Listening band table (official points: 16=5, 23=6, 30=7, 35=8) | schema.ts LISTENING_BAND_TABLE, listening.html table | Agrees. Below band 5, IELTS does not publish values, so the schema's 11=4.0 is a representative choice |
| 10 | Overall band is the average of four, with .25 rounding up to the next half and .75 up to the next whole band | mock.ts, learning/policy.ts, level.ts (`Math.round(x*2)/2`), MockExam "rounded to the nearest half band" | Agrees (this works out the same as the official rule) |
| 11 | Writing is 60 minutes, 20 on Task 1 and 40 on Task 2 | writing.html (EN, RU), writing.astro tags, MockExam, WritingTester prompts (30 at 20, 33 at 40), placement (13, explained) | Agrees |
| 12 | Word minimums: 150 and 250; going under is penalised under Task Achievement or Task Response | writing.html, writing-method, writing-task2-method (EN, RU), prompts minWords, placement dict | Agrees |
| 13 | Task 2 carries more weight (taught as twice Task 1) | writing.html, writing-method, writing-task2-method (EN, RU), writing.astro "counts double" | Agrees |
| 14 | Writing criteria: Task Achievement (T1) or Task Response (T2), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy | writing schema, lessons, NextChapter.astro, Mr EZ language rules | Agrees (some places write "&" for "and"; cosmetic) |
| 15 | Speaking is 11 to 14 minutes: Part 1 is 4-5, Part 2 is 3-4, Part 3 is 4-5 | speaking.html, speaking-part1/2/3 (EN, RU), band-guides, live examiner script | Agrees. Minor: LiveExaminer says "about 12 minutes" and the mock says "about 14"; both are within 11-14 and the examiner's timers come to about 13.5 |
| 16 | Part 2: 1 minute to prepare, 1-2 minutes talk, stopped at 2, then 1-2 rounding-off questions | speaking-part2 (EN, RU), CueCardBank (60 s, 120 s), SpeakingTester (60 s, 120 s), LiveExaminer (60 s, 2 min), examiner script | Agrees |
| 17 | Examiner may repeat in Parts 1 and 2, and also rephrase in Part 3 | speaking-part1, part2, part3, live examiner instructions | Agrees |
| 18 | Speaking criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation; whole band each, average reported in half bands | speaking schema, speaking.html, speaking-part1, BandLadder, NextChapter | Agrees |
| 19 | A number counts as one word; a hyphenated word counts as one; contractions are not tested | reading-task1, reading-sentence, reading-short-answer, reading-diagram, reading-summary-completion, listening-part1, form-completion, sentence-completion, short-answer (EN, RU) | Agrees |
| 20 | Spelling counts in BOTH Listening and Reading | reading-task1, reading-short-answer, reading-sentence, reading-diagram, listening.html, listening-form-completion say it counts; **listening-part1 says "Unlike Reading"** | **Contradiction**, see Listening below |
| 21 | British and American spelling are both accepted; capitals or lower case are both accepted | schema.ts marker accepts both; no lesson tells the student | Gap: not stated anywhere a student reads |
| 22 | Answer order (Reading types vary; Listening follows the recording) | reading-task1 table, listening.html | Agrees |
| 23 | Results timing (paper about 13 days, computer 1-2 days) | Not stated anywhere | No claim to check |
| 24 | Practice bands are estimates, not official results | help.astro, sales FAQ and feedback lines (EN, RU, KK), TestPlayer, Mr EZ persona, WritingTester and SpeakingTester notes | Agrees. Minor wording issue in Mr EZ's prompt (see orchestrator below) |
| 25 | Which test this site covers: Academic | sales FAQ, IntakeTargetBand "currently covers Academic IELTS", reading-task1 "Academic Reading" table, placement | Agrees; nothing claims General Training support |
| 26 | Full test day is about 2 h 45 min including Speaking | MockExam "About 2 hours 45 minutes for the first three papers, plus 14 minutes for Speaking" | This describes the mock, not the exam: 40 + 60 + 60 minutes plus two 1-minute transitions is about 2 h 42, so it is accurate. Left as is |

## Course order and links

- **Placement:** `buildCourse()` refuses a missing or duplicate lesson, so every lesson is placed once. 76 lessons: 10, 10, 10, 9, 11, 12 and 14 across units 1 to 7, plus unit 8 with the five exam-readiness extras.
- **Overviews first:** Speaking (unit 1), Listening (unit 2), Reading (unit 3) and Writing (unit 4) each open with their overview. The Vocabulary overview is in unit 1, before any topic list. Methods come before task types (Task 1 method before charts, and Task 2 method before opinion, discussion, advantages, problem and two-part). Speaking goes Part 1, then Part 2 (unit 5), then Part 3 (unit 7). Timed tests come only in unit 8.
- **References to other lessons:** I checked each lesson body for every other lesson's title. Every mention of a lesson not met yet is a signpost or a list of types, never "as you learned". Examples: the Reading Overview's list of all types, Task 2 method's "each lesson below", and True/False/Not Given naming Yes/No/Not Given as "the separate task". The two "as in Part 1" style references (form completion, then Part 1) point backwards correctly.
- **Unit blurbs** match the lessons in each unit, in English and Russian.
- **"Next in course" links:** lesson pages no longer have a positional "Next in course" link. The next control follows today's session (`continueFor`). `docs/COURSE-STRUCTURE.md` still describes the old link (see orchestrator below).
- **Links:** built all 676 pages and resolved every internal `href`, `src` and `#anchor` against the output. All lesson-body links work, including the relative Writing links (`method`, `task2-method`, `../trainers/writing`), because the site uses `trailingSlash: 'never'` and file-format pages. Every Mr EZ catalogue and exam-readiness link exists. One broken anchor is listed below.

## Left for Alex

- **Lesson durations across the papers.** The labels on most part lessons count only the teaching, not the "Practice with real test questions" block that every lesson page includes. Rendered words compared with the minutes shown:
  - Reading lessons show 10 to 14 minutes but carry 2,200 to 4,000 words. For example, Yes / No / Not Given has 3,974 words in 12 minutes, and True / False / Not Given has 3,573 in 12.
  - Speaking Part 1 has 3,165 words in 20 minutes, and Part 2 has 3,282 in 25.
  - Listening completion lessons have about 1,200 words plus 8 to 20 questions in 10 to 11 minutes.

  If the label should cover the whole page, these want roughly 20 to 30 minutes. Each one sits in its paper's own data file (`src/data/reading.ts`, `speaking.ts` and `listening.ts`), which is outside my files. The plan already caps a teaching step at 12 minutes, so the change would mostly affect the labels and the calendar.

## Seen but outside my files

### Listening
- `src/content/lesson-bodies/listening-part1.html:44` and `ru/listening-part1.html:45`: "Unlike Reading, a misspelled answer in Listening is marked wrong" ("В отличие от Reading..."). This is wrong: spelling counts in Reading too, and `reading-task1.html:154` says "Spelling and grammar count: a misspelled answer is marked wrong". Suggested fix: "As in Reading, a misspelled answer in Listening is marked wrong" ("Как и в Reading, ..."), then refresh the hash.
- Gap: no Listening lesson tells students that British and American spellings are both accepted, or that capitals and lower case are both fine, although the marker accepts both (`src/lib/tests/schema.ts:189-227`). One line in `listening.html` "The Basics" would close it.

### Reading
- The same gap: `reading-task1.html` "The Basics" could add one line saying British or American spelling and either case are accepted.
- The durations under "Left for Alex" (`src/data/reading.ts`).

### Writing
- `src/content/lesson-bodies/writing.html:33`: the Task 2 list "an opinion, discussion, problem/solution or two-part question" leaves out advantages/disadvantages essays, which have their own lesson in the course. Suggested: "an opinion, discussion, advantages and disadvantages, problem/solution or two-part question", plus the Russian.

### Speaking
- `src/components/LiveExaminer.tsx:1524`: "Three parts, about 12 minutes". The mock says "about 14 minutes", the lessons say 11 to 14, and the examiner's own timers come to about 13.5. Suggest "11 to 14 minutes" in both places. The Russian keys are in `ru/shell.ts:89` and `ru/tests-player.ts:213`. A stale "~12 minutes" key also remains at `ru/trainers-writing-speaking.ts:215`.
- Durations: `src/data/speaking.ts` (see "Left for Alex").

### Vocabulary
- `src/data/vocabulary.ts:108` (places): "Every Speaking test opens with your hometown." That claims too much. Part 1 opens with familiar topics, often work or study, or where you live, and `speaking.html` says "Home, work, studies, hobbies". Suggested: "Speaking Part 1 often starts with where you live. The language to describe any place well."
- `src/data/vocabulary.ts:164` ("Around 1 in 10 Task 2 essays") and `:188` ("The fastest-growing essay theme of 2026"): statistics with no source on the site. Consider softening them to "A common Task 2 theme".

### Tests
- `src/pages/tests/index.astro:269`: "Open Exam readiness" links to `/start#exam-readiness`, but no element on `/start` has that id, so the link lands at the top of the course page. Either add `id="exam-readiness"` to unit 8 in `Course.tsx` or drop the anchor.

### Orchestrator (tutor, docs)
- `src/lib/tutor/prompt.ts:59` and `:93`: "Every band in the record is an estimate produced by this platform's AI marking". Reading and Listening bands come from the answer key and the band table, not from AI marking. Suggest "an estimate produced by this platform (AI marking for Writing and Speaking, the answer key and band table for Reading and Listening)". It is a calibrated prompt, so this is your call.
- `docs/COURSE-STRUCTURE.md:18` and the "Checks" paragraph still describe a "Next in course" link on lesson pages. Since WP8, the lesson's next control follows today's session. The doc needs one sentence updated.
- `src/data/generated/learning-index.json`: regenerate after merging all reviewers (`npm run learning:index`).

### Kazakh follow-ups
- None. My two fixes add no student-facing sentences (the drill description is an existing template and the minutes are numbers). The Kazakh dictionaries hold no exam facts to check.
