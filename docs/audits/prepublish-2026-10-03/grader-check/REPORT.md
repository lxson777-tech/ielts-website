# Grader check after the move to the current official descriptors (3 October 2026)

Paid run approved by Alex. Real Worker code run locally against OpenAI with the live settings; nothing
deployed during the run. "Old" is the graders just before commit `bcc4e2a`. Runner: `tools/grader-calibration.mjs`
(offline test `tests/grader-calibration.test.ts`). Candidate scripts, results and spend log stay in the
git-ignored `.tmp/grader-check/` of the builder's worktree. Total cost $2.95 (69 calls, none failed).

## Writing: four official IELTS.org scripts (none is an embedded reference essay)

| Script | Examiner | New grader | Old grader |
|---|---|---|---|
| Task 1, response 1 | 6 | 6 (6/6/6/6) | 6 (6/6/6/6) |
| Task 1, response 2 | 4 | 4.5 (4/5/5/4) | 4.5 (4/5/4/4) |
| Task 2, response 1 | 5.5 | 5.5 (5/6/5/6) | 6 (5/7/5/7) |
| Task 2, response 2 | 7.5 | 6.5 (7/7/6/6); repeat 7 (7/7/6/7) | 7, and 7 on repeat |

New: 2 exact, 1 within half a band, 1 further (a Grammar coin flip: 6, 6, 7, 7, 7, 7 over six runs).
Old: 1 exact, 3 within half a band. Average gap 0.375 band for both. Verdict: at least as close; deploy.

## Speaking: the six embedded reference clips (scale check only, not accuracy on unseen speech)

| Clip | New grader | Old grader |
|---|---|---|
| Band 3.5 | 3.5 (3/3/3/4) | 3.5 (4/3/3/4) |
| Band 5 | 5.5 (5/5/5/6) | 6 (5/5/5/8) |
| Band 6 | 5.5 (5/5/5/6) | 5.5 (5/5/5/6) |
| Band 7 | 6.5 (7/6/6/7) | 6.5 (6/6/6/7) |
| Band 8 | 7.5 (7/7/7/8) | 7.5 (7/7/7/8) |
| Band 9 | 8 (7/8/8/9); repeat 7.5 (7/7/7/9) | 8.5 (8/8/8/9) |

Average gap 0.5 band for both. New risk: Fluency for the strongest speakers drops (band 9 clip Fluency 7 on both
runs, old 8), because the current band 8 wording says "only very occasional repetition or self-correction".
Held for Alex's choice before the speaking grader is redeployed.

## Limits and findings
- Only four official scripts in the PDF (the 15 September check used twelve).
- None of the four shows a rating-limiting feature, so the caps were not exercised.
- Strong vocabulary is still marked low (Vocabulary 6 on the 7.5 essay on every run, old and new).
- The essay grader never sees a Task 1 chart: the site sends the chart as an image inside the question and the
  grader strips it, so it cannot check a report's figures or overview against the data. Unchanged by this work.
