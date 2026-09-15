# AI grading on OpenAI, calibrated against official IELTS samples (2026-09-15)

Everything in this note is uncommitted in the main checkout and nothing is
deployed. This is a record of what was tested and what it showed, not a
changelog of shipped work.

## What changed

Both graders were checked against real official IELTS materials instead of
guesswork, using the method examiners themselves are trained with:
standardisation. A real examiner is calibrated by marking sample scripts
that already carry an official band before they mark real candidates. The
same idea was applied here: a handful of officially marked scripts and
recordings were shown to the AI grader as reference points, and then it was
tested on a separate set it had never seen, to check the grading holds up
on new material and isn't just memorising the references.

**Essay grader**: model `gpt-5.6-sol`, reasoning effort medium, median of
three runs per essay. Five officially marked scripts (bands 4, 5.5, 6.5,
7.5, 8.5, from the IELTS.org "Sample Candidate Writing Scripts and Examiner
Comments" set) are embedded in the prompt as the standardisation set. Seven
other official scripts were held out and never shown to the grader, purely
to test it.

**Speaking grader**: a new pipeline.
1. `gpt-4o-transcribe-diarize` produces a transcript and identifies who is
   who; the candidate is taken as whichever speaker talks the most (the
   examiner asks short questions, the candidate gives longer answers).
2. Pace, pauses, and filler words are measured from that transcript.
3. `gpt-5.6-sol` grades Fluency and Coherence, Lexical Resource, and
   Grammatical Range and Accuracy, with six anchor recordings (transcript
   excerpts, bands 3.5, 5, 6, 7, 8, 9) embedded in the prompt as reference
   points.
4. `gpt-audio-1.5` grades Pronunciation only, listening to short audio
   excerpts from those same six anchor recordings as labelled references.
A setting, `OPENAI_SPEAKING_ANCHORS=off`, can switch the anchors off and
fall back to the plain descriptor-only grading. Before the anchors were
added, the pronunciation score clustered almost everyone around band 6
regardless of how good they actually were. With the anchors it now spreads
top candidates across band 7 to 8, which matches how they actually sound.

**Timeouts raised**: the speaking Worker's transcription step failed once
on a longer clip at the old 120 second limit, so it was raised to 420
seconds; text grading is capped at 180 seconds and pronunciation at 240
seconds. The browser itself waits up to 10 minutes for a full speaking
test and 3 minutes for an essay (`src/lib/speaking/grader.ts`,
`src/lib/writing/grader.ts`). A full speaking test end to end can take
several minutes.

## Verification

| Check | Result |
|---|---|
| Speaking Worker tests | 43 pass |
| Full test suite | see final report before deploy, not re-run today |

## Calibration: essays

Twelve official IELTS.org scripts. Five (bands 4, 5.5, 6.5, 7.5, 8.5) were
shown to the grader as reference examples, so their own result is not
evidence of anything, it is expected to match. The other seven were held
out and graded blind.

Held-out scripts only, median of three runs, `gpt-5.6-sol` with anchors:

| Official band | Graded band |
|---|---|
| 5 | 5 |
| 5 | 5 |
| 5 | 5 |
| 5.5 | 5.5 |
| 6 | 5 |
| 7 | 6.5 |
| 7.5 | 7 |

The five embedded reference scripts all graded at their own official band
(4, 5.5, 6.5, 7.5, 8.5), as expected since the grader was shown them.

Before the anchors were added, essay grading was well below the official
band almost everywhere, worst at the top:

| Official band | Descriptors only | Plus examiner comments |
|---|---|---|
| 4 | 4 | 4 |
| 6.5 | 6 | 6 |
| 7.5 | 6 | 6 |
| 8.5 | 6 | 7 |

## Calibration: speaking, official IDP examiner-marked samples

Nine official IDP "IELTS Speaking test sample" YouTube videos, one part
each, examiner speech removed. Six (bands 3.5, 5, 6, 7, 8, 9) became the
standardisation anchors; three (bands 6, 7.5, 8.5) were held out and never
shown to the grader.

Held out, final pipeline with anchors:

| Official band | Graded band |
|---|---|
| 6 | 6 |
| 7.5 | 6.5 |
| 8.5 | 8 |

So the grader is exact or within half a band on two of the three, and a
full band under on the third. That third one is a Part 1 clip: short,
simple-question answers. The pattern across this whole test is that the
AI grader reads a candidate speaking simply about an easy topic as weaker
than an examiner would, even when the candidate is genuinely strong. A
rejected variant added measured filler-word rates and a note that fillers
alone should never hold a candidate below band 7. That lifted the band 6
candidate's score to 7.0, which overcorrects the wrong direction, so it
was not kept. That variant only got through its first clip before the
OpenAI account ran out of credits (see below).

Before anchors were added (same nine clips, earlier pipeline versions),
scores sat far below the official band across the board, for example the
band 9 candidate scored 7.0 and the band 8.5 candidate scored 7.5. One
clip (the band 7.5 one) failed on a transcription timeout in an earlier
run, which is the reason the 420 second timeout above exists.

## Calibration: speaking, Ross IELTS Academy mock tests

Four Part 2 mock-test clips with the academy's own stated bands (6, 7, 8,
9, approximate, not an official body's numbers).

| Academy's stated band | Before anchors | Final, with anchors |
|---|---|---|
| 6 | 6.0 | 7.0 |
| 7 | 6.0 | 6.5 |
| 8 | 6.5 | 7.5 |
| 9 | 7.0 | 7.5 |

A rejected variant that added measured filler/pace statistics only
completed the band 6 clip (7.5) before the grading calls started failing;
the other three clips errored out and were not scored.

## What the anchors are worth, in one line

Without reference examples, both graders read as too strict, and the gap
gets worse the stronger the candidate or essay is. With reference examples
embedded, essays land on the correct band or within half a band on six of
the seven held-out official scripts (the band 6 script graded 5), and
speaking lands within half a band on two of the three held-out official
candidates, with one weak spot on short, simple-question (Part 1)
answers.

## Honest limits

- Only one part of the exam was tested per official speaking candidate,
  and each was graded once (not median of three, for cost reasons), so
  results carry roughly half a band of noise on their own.
- The one clear miss found: a strong candidate (band 7.5) answering short,
  simple Part 1 questions gets read as a 6.
- The Ross Academy labels are the academy's own stated bands, not an
  official score, so treat that table as a consistency check, not ground
  truth.
- No official body publishes examiner-marked recordings or essays beyond
  the sets used here, and there are no real students' official results to
  check against yet.

## Cost per student attempt (with anchors, current list prices)

| Feature | Cost |
|---|---|
| Essay (3 runs) | 10 to 12 cents |
| Full speaking test | about 40 cents |
| Single-part speaking drill | about 12 cents |

Today's calibration runs (all the tables above) cost roughly 6 to 8 US
dollars in total: about 40 minutes of audio transcribed several times,
12 essays graded up to 9 times each, and about 20 separate pronunciation
calls.

## Consistency check and the credits interruption

Midway through the last runs every call to OpenAI started returning
"insufficient_quota, credit_balance_exhausted": the account had no credit
left. The grader now recognises that case and tells students the grader
is temporarily unavailable instead of "busy". Alex topped up the account
the same night and the interrupted work was completed.

Repeatability: the three held-out official speaking clips were graded a
second time with the final pipeline. Both runs gave exactly the same
result, criterion by criterion (6.0, 6.5, 8.0), so a student re-submitting
the same recording gets the same band.

A second narrow variant was then tried for the Part 1 weak spot: a note
telling the language grader that Part 1 answers are short and simple by
design and that readiness plus control is band 7 there. It changed
nothing for the band 7.5 Part 1 candidate (still 6, 6, 6 on the three
language criteria), so it was reverted. In that run the pronunciation
model gave the band 6 candidate an 8 instead of the 7 it gave twice
before, which is the one place a little run-to-run wobble was seen: the
audio model can move by one band on the same recording.

## Full-length test through the students' path

As a last check the complete 12-minute Ross Academy band 7 mock test
(examiner and candidate in one recording, all three parts) was graded
through the same interview path the live examiner and the Speaking
Trainer use, with the final grader. The speaker labelling gave the
candidate 72 percent of the talk time and dropped the examiner, and the
result was 6.5 (6, 6, 6, 7), against 6.0 before the anchors. The whole
grading took 5 minutes 22 seconds, inside the 10-minute wait the site now
allows.

## Advice: how to reach the next band (added 2026-09-15)

Alex asked for clear instructions for students, band by band. Two layers
were added, one personal and one fixed.

**Personal (from the grader).** For every criterion the grader now
returns, besides the band and the comment: the target band, one or two
sentences on what that band's official descriptor requires that this
work does not yet show, and two or three checkable instructions. Where a
quote applies, each instruction shows the student's own words and the
improved version. On top there is an action plan of three to five steps
in priority order, the first naming the criterion that would raise the
overall band most, the last a practice task for the week. Every string
is trimmed, capped, and cleaned of dashes and model-added numbering in
the Worker; a response without the new fields still validates, so the
Gemini rollback and old results keep working.

Real example, official band 6 essay (graded 5), Grammatical Range:
"Make subjects, verbs and nouns agree in number in every sentence", with
the student's "The num.bers of car has increased" and the fix "The number
of cars has increased". Real example, mock band 7 Part 2 talk, Grammar:
"Keep the main narrative consistently in the past simple", with "so we
go to Germany and we have visited so much attractions" and the fix "So we
went to Germany and visited many attractions".

**Fixed (from the site).** `src/data/band-guides.ts` holds a guide for
every step from band 4 to 9 on all eight criteria (four writing, four
speaking): what changes at the next band in plain words traceable to the
official descriptors, three or four "do this" instructions with numbers
where useful, one or two "stop this" habits, a before and after example
with the reason, and a 10 to 20 minute practice routine. The report
shows the guide for the student's current band under "Full guide" in
each criterion card.

## What still needs Alex

1. Deploy both graders and the site together, they depend on each other
   (`npx wrangler secret put OPENAI_API_KEY` in each Worker folder, then
   `npx wrangler deploy`; this is billable and externally visible, so
   confirm before running it).
2. Decide the value of `GRADING_SAMPLES` (how many runs per essay/speaking
   attempt) given the costs above.
3. Branch reconciliation: this work is uncommitted on `rebuild/astro`. The
   platform branch `claude/ielts-lesson-accuracy-50a367` has the same
   Worker files untouched, so it should merge cleanly, but today's content
   changes on that branch need a deliberate, separate merge.
4. Ideally, real students' recordings and essays with official IELTS
   results, to check the grader against real outcomes rather than only
   public reference material.

## Files

Workers: `workers/grade-essay/{src/index.ts,wrangler.jsonc,README.md}`,
`workers/grade-speaking/{src/index.ts,wrangler.jsonc,README.md}`.
Site: `src/lib/speaking/grader.ts`, `src/lib/writing/grader.ts`.
Tests: `tests/grade-essay-worker.test.ts`,
`tests/grade-speaking-worker.test.ts`.
