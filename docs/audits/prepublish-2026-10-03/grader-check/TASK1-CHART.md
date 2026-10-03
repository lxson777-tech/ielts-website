# Task 1 chart check: does the essay grader use the chart? (3 October 2026)

A small paid check, approved by Alex the same day (about 50 to 70 cents, hard
cap 1 US dollar). It runs the REAL essay Worker (`workers/grade-essay/src/index.ts`
at commit 61eaf0a, which attaches Task 1 charts) locally in Node through
`tools/grader-calibration.mjs`, with the live settings from
`workers/grade-essay/wrangler.jsonc` (`gpt-5.6-sol`, reasoning `medium`,
`GRADING_SAMPLES` 3, median of three), against the real OpenAI API. Nothing
was deployed, wrangler was not used, and the key never left the run.

**Spent: $0.7818 of the $1 cap, 14 model calls.**

## The answer and the chart

- Question: `pte-wt-116-task1`, "The graph below shows the number of shops
  that closed and the number of new shops that opened in one country between
  2011 and 2018."
- Chart: `public/pics/writing/imported/wt-116-task1.png`, a two-line graph
  with clear values, on the Worker's chart list (`task1-charts.ts`, SHA-256
  `4f8547e4...`).
- Answer: the site's Band 8 model answer for that question
  (`src/data/models-real/batch-07.ts`). Every figure in it matches the chart.

## What was altered

Three figures changed so they contradict the chart, chosen so the text stays
internally consistent (a reader without the chart has nothing to catch):

| Sentence fragment | Chart | Altered to |
|---|---|---|
| "They then plummeted to **3,900** in 2012" (openings) | 3,900 | **2,900** |
| "peaking at **7,200** in 2013" (closures) | 7,200 | **8,200** |
| "while **4,000** new shops opened" (2015) | 4,000 | **5,000** |

For the main altered copy (B, D) the overview paragraph ("Overall, openings
declined substantially ... Closures outnumbered openings in most years.") was
also removed. Everything else is word for word.

"Text only" means the same new Worker with the `<img>` left out of the
question. The Worker strips tags before the model reads the question, so the
model sees exactly the words the live grader sent before this fix, and no
image is attached (the old grader behaviour, run on the new code).

A free dry run (budget 0, every call refused before sending) confirmed the
wiring first: one image on each of the three samples for the chart items, none
for the text-only items. The paid usage agrees: every chart call carried 8,852
input tokens and the same text without the chart 8,188, about 660 tokens for
the image.

## Results (median of three, as live)

TR is Task Achievement; CC, LR, GRA the other three criteria.

| Item | Image sent | Runs (overall) | TR | CC | LR | GRA | Overall |
|---|---|---|---|---|---|---|---|
| A original, with chart | 1, 1, 1 | 9, 9, 9 | **9** | 9 | 9 | 9 | **9** |
| B altered, with chart | 1, 1, 1 | 7.5, 7.5, 7.5 | **5** | 8 | 8 | 9 | **7.5** |
| C original, text only | 0, 0, 0 | 9, 9, 8.5 | **8** | 9 | 9 | 9 | **9** |
| D altered, text only | 0, 0, 0 | 7.5, 7.5, 8 | **5** | 8 | 8 | 9 | **7.5** |

Key Task Achievement comments (what the student would read):

- **A:** "Key features are skilfully selected, clearly highlighted and
  illustrated with accurate comparisons and figures."
- **B:** "the report is underlength, lacks a clear overview and contains
  multiple inaccurate figures."
- **C:** "The clear overview and well chosen comparisons are strong, but the
  omitted 2013 opening figure and some overly precise estimates constitute
  occasional lapses."
- **D:** "the underlength response lacks a clear overview, and inaccurate
  figures mean the key features are not adequately and reliably covered."

### Why B and D landed in the same place

Two things other than the chart pushed both altered copies to TR 5:

1. **Missing overview.** The Task 1 descriptors put "no clear overview" at
   Band 5, so both versions apply it, with or without the chart.
2. **Length.** The site's word counter (`src/lib/writing/mechanics.ts`,
   `words()`, letters and apostrophes only) does not count numbers. Removing
   the overview left 153 words by an ordinary count but **128** by the site's,
   so the Worker was told the report was UNDER the 150 minimum. The original
   is 183 words ordinarily and 158 on the site's count.

So B against D cannot show the chart's effect; the overview and length rules
decide both.

### Isolating the figures (one extra sample each)

To remove both confounds, the same three wrong figures were put into the
FULL answer (overview kept, 158 by the site's count, not underlength), graded
once with the chart (E) and once text only (F). This also captured the
model's private `evidence` and `moments`, which the Worker uses for grading
discipline and never returns to the site.

| Item | Image sent | TR | Evidence, verbatim |
|---|---|---|---|
| E figures only, with chart | 1 | **6** | "three figures contradict the graph: openings were about 4,000, not "2,900 in 2012"; closures peaked at about 7,200, not "8,200 in 2013"; and openings were about 4,000, not "5,000" in 2015." |
| F figures only, text only | 0 | **6** | "several figures are inaccurate: openings were about 4,000 rather than "2,900 in 2012," closures were about 7,100 rather than "8,200 in 2013," and openings in 2015 were about 4,000 rather than "5,000."" |

With the chart, the grader named all three altered figures and the correct
chart values exactly, and confirmed the untouched ones ("8,500 openings in
2011", "the final gap of about 2,200") as accurate. The figure errors alone
cost three bands of Task Achievement (9 to 6).

**But the text-only grader found the same three errors.** No image was sent
(confirmed by the image count and the token count), yet it gave near-correct
values, and one slightly wrong one (7,100 where the chart shows 7,200). The
likeliest reason: this is a widely published Cambridge IELTS chart, and the
model remembers it from its training data. For this question the model did
not need the image to check figures.

## Verdict

**The grader does use the chart, and it is safe to deploy.** The chart
reaches every sample at high detail, the examiner reads it accurately
(exact values, the right series, the right years, accurate figures confirmed
as well as wrong ones flagged), the original answer is not marked down for
it (9 with the chart, 9 without), and wrong figures cost Task Achievement in
the descriptors' own terms.

**What this check could not show** is a gap between "with chart" and "text
only", because the model already knew this chart. For a well-known Cambridge
chart the old grader could sometimes check figures from memory; for any chart
the model has not memorised (the site's own and less common questions, and
any future question) it could not, and that is where the fix matters. A clean
before-and-after needs a little-known chart: the same pair (E and F) on one
would cost about $0.11 at one sample each, or about $0.65 at the live three.

## Found on the way (not changed here)

The site's word counter does not count numbers (`8,500`, `2011`, `300`). In
the real test a number counts as a word, and Task 1 reports are full of them:
this Band 8 model answer is 183 words but the site counts 158. A student who
writes a 160-word report with 20 figures would be told it is under length, and
the grader would cut Task Achievement for it. Worth fixing before charging for
Writing feedback.

## How to reproduce

Inputs and scripts are under `.tmp/grader-check/` (not committed):
`build-task1-chart-items.mjs` builds A to D from the model answer;
`task1-chart-evidence.mjs` runs E and F at one sample with evidence capture.

```
node --import ./tests/ts-extension-loader.mjs tools/grader-calibration.mjs --paper essay \
  --input .tmp/grader-check/task1-chart-items.json --out .tmp/grader-check/task1-chart-results.json \
  --ledger .tmp/grader-check/task1-chart-ledger.json --budget 1
node --import ./tests/ts-extension-loader.mjs .tmp/grader-check/task1-chart-evidence.mjs
```

### Cost per call (from the ledger)

| Item | Calls | Input tokens each | Output tokens | Cost |
|---|---|---|---|---|
| A original, chart | 3 | 8,852 | 2,370 to 2,973 | $0.1510 |
| B altered, chart | 3 | 8,812 | 2,759 to 3,376 | $0.1666 |
| C original, text | 3 | 8,188 | 3,018 to 3,497 | $0.1651 |
| D altered, text | 3 | 8,148 | 3,301 to 4,320 | $0.1907 |
| E figures only, chart | 1 | 8,852 | 2,793 | $0.0512 |
| F figures only, text | 1 | 8,188 | 3,403 | $0.0572 |
| **Total** | **14** | | | **$0.7818** |

Priced at $2 per million input and $12 per million output tokens
(`gpt-5.6-sol`, as in `workers/grade-essay/README.md`). The image adds about
660 input tokens, roughly $0.0013 a call, so about $0.004 a grade at three
samples.
