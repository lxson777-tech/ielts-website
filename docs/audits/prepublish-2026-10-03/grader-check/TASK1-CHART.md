# Task 1 chart check: does the essay grader use the chart? (3 October 2026)

A small paid check, approved by Alex the same day (about 50 to 70 cents, hard
cap 1 US dollar). It runs the REAL essay Worker (`workers/grade-essay/src/index.ts`
at commit 61eaf0a, which attaches Task 1 charts) locally in Node through
`tools/grader-calibration.mjs`, with the live settings from
`workers/grade-essay/wrangler.jsonc` (`gpt-5.6-sol`, reasoning `medium`,
`GRADING_SAMPLES` 3, median of three), against the real OpenAI API. Nothing
was deployed, wrangler was not used, and the key never left the run.

**Spent: $0.8739 of the $1 cap, 16 model calls** (14 in the first round,
2 in the clean before-and-after added below).

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

**On the shop chart alone the check could not show** a gap between "with
chart" and "text only", because the model already knew that chart. The clean
before-and-after below (E2, F2, police budget) does show it: with the chart
the wrong figures are caught and named with their true values; without it
they are called accurate and the report gets full marks.

## Clean before-and-after on a less familiar chart (E2, F2)

Run the same day at the orchestrator's request, inside the same $1 cap, one
sample each (`GRADING_SAMPLES` 1, everything else live).

**Choosing the chart.** All 30 charts on the Worker's list (wt-103 to wt-132)
come from the same imported set, and all appear to reproduce published
Cambridge IELTS questions, so no truly unknown chart was available. The
police budget question (`pte-wt-114-task1`, `wt-114-task1.png`, a table of
income sources plus two pie charts of spending) was the best fit: a recent
question with decimal figures (175.5m, 91.2m) that are hard to recall, and a
model answer (`src/data/models-real/batch-08.ts`) that is not famous.

**What was altered.** That answer links its figures by arithmetic (the table
totals, "around four-fifths of the rise", pie shares adding to 100), so a
single changed figure could be caught without the chart. The three pie
shares were changed together so that every sum and every derived statement
still holds:

| Sentence fragment | Chart | Altered to |
|---|---|---|
| "salaries fell from **75** per cent" (2017) | 75 | **73** |
| "to **69** per cent" (2018) | 69 | **67** |
| "buildings and transport held steady at **17** per cent" | 17 | **19** |

The pies still add to 100 (73 + 8 + 19, 67 + 14 + 19), salaries still lose
"exactly the six points" technology gains, and "roughly nine million pounds
less went on staff" still works out (222.4m to 213.5m). The overview and
everything else are word for word, and the length is unchanged: 186 words
counted the IELTS way (172 by the site's counter, not underlength).

| Item | Image sent | TR | CC | LR | GRA | Overall |
|---|---|---|---|---|---|---|
| E2 altered, with chart | 1 | **6** | 9 | 9 | 9 | **8** |
| F2 altered, text only | 0 | **9** | 9 | 9 | 9 | **9** |

The model's private evidence for Task Achievement, verbatim:

- **E2 (with chart):** "All table figures are accurately reported, including
  ВЈ304.7 million, ВЈ318.6 million, ВЈ175.5 million and ВЈ177.8 million. However,
  "salaries fell from 73 per cent of the budget to 67 per cent" conflicts with
  the charts, which show 75 per cent and 69 per cent. Likewise, "buildings and
  transport held steady at 19 per cent" should be 17 per cent in both years."
  Student-facing comment: "four of the six spending percentages are
  inaccurate, so the content does not have the level of accuracy required for
  Band 7." (It counts the 19 twice, once for each year.)
- **F2 (text only):** "Key figures are accurately selected, including totals
  of 304.7 and 318.6 million pounds, the 11.1 million rise in local taxes, and
  all three spending percentages." Student-facing comment: "You fully and
  appropriately satisfy the task ... supported by accurate comparisons and
  figures." It also singled out "held steady at 19 per cent" as reporting the
  unchanged category "precisely".

**This is the difference the fix makes.** With the chart, the grader caught
every wrong figure, gave the true value for each, confirmed the correct table
figures, and lowered Task Achievement from 9 to 6 for it. Without the chart,
the same grader on the same text called the wrong figures accurate and gave
full marks.

Cost: E2 $0.0495 (8,814 input tokens, image included), F2 $0.0426. **Running total
for the whole check: $0.8739 of the $1 cap, 16 calls.**

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
`task1-chart-evidence.mjs` runs E and F at one sample with evidence capture;
`task1-chart-e2f2.mjs` does the same for E2 and F2 (`--dry` shows the texts
and word counts without spending).

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
| E2 police, chart | 1 | 8,814 | 2,652 | $0.0495 |
| F2 police, text | 1 | 8,179 | 2,190 | $0.0426 |
| **Total** | **16** | | | **$0.8739** |

Priced at $2 per million input and $12 per million output tokens
(`gpt-5.6-sol`, as in `workers/grade-essay/README.md`). The image adds about
660 input tokens, roughly $0.0013 a call, so about $0.004 a grade at three
samples.
