# Speaking grader calibration (2026-09-14)

Alex reported the AI speaking grader was too strict. This note records what
was found, what changed, and what the before-and-after runs showed.

## What was wrong

The grader's rubric was a paraphrase of the official public IELTS Speaking
band descriptors, in places harsher than the original (its band 5 Lexical
Resource read like the official band 4). On top of that, a "calibration"
block told the model to award the lower band whenever in doubt, to treat
band 8 as rare, to assume automated graders over-score and push down, and
to apply a home-made 6/7 gate. None of that is part of the official method,
and together it biased every result toward 6. A second, separate problem:
the grader treated the machine-made transcript as the truth, so speech
recognition mistakes ("Coco change" for a name, "lamping" for "lambing")
and natural spoken phrasing were counted as the candidate's grammar errors.

## What changed (workers/grade-speaking/src/index.ts)

- The four scales are now the official public descriptors verbatim
  (Cambridge English copy of the IELTS.org public version, bands 9 to 0).
- The award method is the official one: the band whose cumulative
  descriptors the whole performance matches; a band is never lowered for a
  weakness its own descriptor allows (band 7 permits hesitation,
  self-correction, some inappropriate choices and some persistent mistakes).
- The transcript is declared machine-generated: judge vocabulary and
  grammar from the audio, never cite an error you cannot hear, and count
  only clear errors; accent itself is never penalised.
- Kept: evidence-before-band structured output (confirmed running: the
  model writes 200 to 900 characters of observations per criterion),
  temperature 0 with a thinking budget, median of three runs, and the
  no-fabrication rule for silent audio.
- Model: `gemini-3.6-flash` instead of `gemini-2.5-flash` (see below).

## The comparison

No official body publishes scored recordings of real candidates, so the
samples are four full mock tests from Ross IELTS Academy on YouTube,
recorded under exam conditions with a stated overall band per video
(6, 7, 8 and 9). Treat the stated bands as approximate targets, not
official marks. The scratchpad harness cut each test's Part 2 long turn
(about two minutes of candidate-only speech) and sent it, with a
caption-based transcript, to two local copies of the Worker: the old
rubric and the new one, same model, same clips, one at a time.

Part 2 clips, gemini-3.6-flash:

| Stated band | Old rubric | New rubric |
|---|---|---|
| 6 | 7.0 | 6.5 |
| 7 | 6.0 | 7.0 |
| 8 | 7.0 | 7.0 |
| 9 | not run (daily quota exhausted) | not run (daily quota exhausted) |

Full 12-minute tests (examiner and candidate voices mixed, low bit rate,
heuristic speaker split), gemini-2.5-flash: old rubric gave 6.0, 6.0, 6.5,
6.5 for the stated 6, 7, 8, 9; the new rubric gave 6.0, 6.0, 6.0, 6.5, and
7.0 for the band 9 test once the transcript rule was added. Those full-test
numbers are dominated by the harness noise (the examiner's speech was being
attributed to the candidate) and are recorded only for completeness.

Reading: the old rubric was inconsistent as well as harsh (it placed the
band 6 speaker above the band 7 speaker). The new rubric orders the three
graded speakers correctly and lands within half a band of the stated level
for two of them and one band under for the third. A remaining gap at the
top (8 graded as 7) may be the academy's optimism, the two-minute sample,
or a real ceiling in the model; it needs official samples or a human
examiner's second opinion to settle.

## Quota finding

Google's free tier now allows 20 generate requests per model per day. Each
grading uses three (median of three), so the site can grade about six
speaking tests a day, and the essay grader on the same key and model shares
that budget. This is why the calibration could not be completed on the
band 9 clip today, and it will hit real students. Options: enable
pay-as-you-go billing on the Gemini project, or set `GRADING_SAMPLES` to 1.

## Not done

- The grader is not deployed; production still runs the old rubric and
  model until `npx wrangler deploy` in `workers/grade-speaking`.
- No official-band recordings were available to test against.
- The essay grader (`workers/grade-essay`) still runs the strict-style
  calibration block from July and the retiring model; it was outside this
  task and deserves the same review.

Later on 2026-09-14 grading moved to the OpenAI API with a transcript-plus-audio pipeline; see `docs/GRADING-OPENAI-RESULT.md` for the final design and calibration.
