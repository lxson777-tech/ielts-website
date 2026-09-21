# Guided course structure

The guided course uses eight teaching units, normally one per week. It starts with Speaking Overview and Part 1. Each new paper has its overview before techniques. Methods precede task-specific lessons; familiar topics precede abstract arguments.

1. Start speaking with confidence: overview, Part 1, vocabulary overview, family, education, work, leisure, people, places, childhood.
2. Listen for everyday information: overview, Part 1, completion questions, Part 2, maps, travel, transport, weather.
3. Read for meaning and detail: overview, paraphrase, short answers and completion questions, health, food, environment and books.
4. Build a clear Task 1 report: writing overview, method, linking words, charts, processes, housing, maps, sport, music and film.
5. Develop and support ideas: Speaking Part 2, Task 2 method, opinion essays, Reading multiple choice and true/false/yes/no questions, technology, social media, media, fashion and success.
6. Follow and compare arguments: Listening Parts 3 and 4, multiple choice and matching, discussion and advantages essays, society, crime, money, language, traditions and volunteering.
7. Handle complex questions: Reading matching types, remaining essay types, Speaking Part 3, government, AI, arts, science, animals, business and ageing vocabulary.
8. Exam conditions: full Reading and Listening tests, review, a complete mock, then two light study days.

## Source and preservation

`src/lib/course.ts` explicitly places each registry lesson in COURSE_UNITS. Titles, descriptions, duration estimates and URLs still come from their registries. All 71 part lessons and five existing overviews remain. No lesson bodies or questions are removed. Completion keys are unchanged. The course builder rejects missing or duplicate entries so adding content requires a deliberate placement.

The By section view filters the same teaching order by paper. Lesson pages also offer a labelled Next in course link; existing within-paper browsing remains available.

## Calendar

`src/lib/plan/schedule.ts` distributes the units over the chosen study dates. Daily and weekdays-only plans follow the same sequence. Each lesson uses its registry duration. Short deadlines keep all content and show the real longer sessions, with a visible warning in the calendar. A deadline leaving only one or two study days permits light review only; it cannot contain a full course.

Full tests and mocks only appear after teaching. Recap vocabulary only uses topics already introduced. Recaps do not create overdue completion requirements. The final two study days stay light. Existing saved start dates and progress are preserved, so returning students may see an unfinished overview as their next step without losing their completed lessons.

## Checks

Automated checks cover exact lesson coverage and order, overview prerequisites, progression from Speaking Part 1 to Part 3, method-before-task order, saved completion, honest durations, and daily/weekday plans across 6 to 90 days and 15 to 60 minute targets. Browser checks exercise week navigation, lesson completion and next-course navigation at desktop and phone widths.
