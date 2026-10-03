# Speaking grader tune after the descriptor move (3 October 2026)

Paid run approved by Alex (about 50 cents, hard cap 1 dollar). Real Worker code run locally against OpenAI with
the live settings from `workers/grade-speaking/wrangler.jsonc`; nothing deployed, wrangler not used. Runner:
`tools/grader-calibration.mjs --paper speaking-anchors`. Results and the spend log stay in the git-ignored
`.tmp/grader-check/` of the builder's worktree (`speaking-tuned-top.json`, `speaking-tuned-low.json`,
`tune-ledger.json`).

## The problem

On the current descriptors the grader gave the official band 9 clip Fluency and Coherence 7 (old grader 8),
reading the band 8 and 9 wording "only very occasional repetition or self-correction" as "almost flawless".

## The change

Two sentences added at the end of the examiner standardisation guidance (`anchorsTextBlock` in
`workers/grade-speaking/src/index.ts`, after the six sample transcripts, so they only appear when the reference
samples are present):

> At bands 8 and 9 for Fluency and Coherence, judge "only very occasional repetition or self-correction" against
> the band 8 and band 9 samples above, not against flawless speech: those officially marked candidates still
> repeat a word or restart a phrase mid-sentence now and then. A candidate whose repetition and self-correction
> are no more frequent than in those samples meets that wording, and the other band 8 and 9 features (what the
> hesitation is for, how coherent and extended the topic development is) decide between them.

The one quoted phrase is in both the band 8 and band 9 descriptors. `tests/descriptor-quotes.test.ts` now also
checks the quotes in this guidance. Descriptors, models, temperatures, anchors and the output shape are unchanged.

## Results (one grading per clip; criteria are Fluency / Vocabulary / Grammar / Pronunciation)

| Clip | Official | Before tune (REPORT.md) | After tune |
|---|---|---|---|
| Band 9 | 9 | 8 (7/8/8/9); repeat 7.5 (7/7/7/9) | 9 (9/9/9/9) |
| Band 8 | 8 | 7.5 (7/7/7/8) | 7.5 (7/7/7/8) |
| Band 7 | 7 | 6.5 (7/6/6/7) | 6.5 (7/6/6/7) |
| Band 5 | 5 | 5.5 (5/5/5/6) | 5.5 (5/5/5/6) |
| Band 3.5 | 3.5 | 3.5 (3/3/3/4) | 3.5 (3/3/3/4) |

Every clip is within half a band of its official band. The band 9 Fluency is back to 9 (target was at least 8).
The band 8, band 7, band 5 and band 3.5 clips scored exactly as before, criterion for criterion, so the low end
did not move up.

## Cost

15 calls, none failed, total $0.52 (ledger): about $0.008 transcription, $0.065 pronunciation and $0.03 text
grading per clip.

## Limits

- One run per clip. Before the tune the band 9 clip scored 8 and 7.5 on two runs; one 9 after the tune is a good
  sign, not a measured average.
- The band 9 clip also lifted Vocabulary and Grammar from 8 to 9, which the new sentences do not address
  directly. It is the correct band for that candidate, but it suggests the model read the new wording as a
  general "compare with the top samples" nudge for that clip.
- These six clips are the grader's own reference samples, so this checks the scale, not accuracy on unseen
  speech. The band 8 clip's Fluency stays 7. The band 6 clip was not re-run (not in the plan).

## Verdict

Top end restored, low end not inflated, tests and type check pass. Ready to deploy when Alex says so.
