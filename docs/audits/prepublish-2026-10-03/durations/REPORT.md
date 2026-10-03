# Honest lesson minutes (3 October 2026)

Alex decided the minutes on each lesson must cover the whole page, not only the teaching text.

## The rule (tools/estimate-lesson-minutes.mjs; tests/lesson-minutes.test.ts fails if a label drifts)
- Teaching text: every English word of the lesson at 130 words a minute.
- Exercises inside the lesson (Vocabulary gap-fills): 1 minute per item.
- Reading practice: 1.5 minutes per question including its share of the passage; warm-up sentences 1 minute.
- Listening practice: the recordings played once plus half a minute per question.
- Writing: the worked Band 8 example under the lesson, at 130 words a minute.
- Speaking practice answered out loud: half a minute per Part 1 question, 3 minutes per Part 2 cue card,
  1 minute per Part 3 question.
- Vocabulary quick check: half a minute.
Rounded to the nearest 5 minutes, never below 10. Refresh with the script's `--write`, then `npm run learning:index`.

## What changed
All lessons together: 1,117 to 1,290 minutes (about 15% more). Reading and Listening question-type lessons
rise most (for example True / False / Not Given 12 to 35, Listening Sentence Completion 10 to 30); Speaking
Part 1 rises to 45; Writing lessons fall to 10 because their pages hold teaching and one example only (the
essay is written in the separate checker). Full table in the builder's commit `9e571f6` message trail and the
screenshot `05`.

## Plan impact
- Today and the week ahead: every planner rule still holds; the 12-minute teaching-step cap still applies, so
  Today can show 12 minutes for a lesson labelled 20 or 45 (a long lesson is spread over several days, the
  planner's existing rule).
- Full calendar, 30 days: at 25 minutes a day, 26 teaching days and last teaching day 26 (unchanged); at 60
  minutes a day, 23 teaching days and last teaching day 26 (unchanged), days over the chosen time 2 to 6,
  longest day 83 to 100 minutes. Long days keep every lesson and show the real time.

## Evidence
Screenshots 01 to 07 in this folder (lesson headers, course route, all 76 lessons, Today, Russian header).
`npm test` 2613 of 2613, `npx astro check` 0 errors.
