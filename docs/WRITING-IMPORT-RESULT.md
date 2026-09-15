# Writing task import (PracticePTEOnline)

Alex confirmed permission from the publisher, [PracticePTEOnline](https://practicepteonline.com/), on
2026-09-11 to reuse their free materials on the IELTS Portal. This is the same permission that
covers the 20 listening tests imported by `tools/import_listening.py` (see
`docs/listening-sources.md`) -- it was given once, covering the site's free practice content in
general, not per page.

## What this import is

`tools/import_writing.py` pulls the Writing Task 1 and Task 2 prompts from
`https://practicepteonline.com/ielts-writing-test-N/` (N = 1 to 132; page 133 and above do not
exist) and writes them as `EssayPrompt` records to `src/data/writing-prompts-imported.ts`. The
default run imports the 30 highest-numbered tests, 132 down to 103 -- the newest material on the
site. `src/data/writing-prompts.ts` exports that pool as the whole prompt list (the 23 original in-house prompts were removed on 2026-09-14 at Alex's request, so the site now carries only real exam tasks), so
every part of the site that reads `WRITING_PROMPTS` (the Writing Trainer, score history, the
prompt counts on `/tests` and `/trainers`) picks the imported prompts up automatically.

Each source page has one Task 1 prompt (a chart, table, process diagram or map, occasionally more
than one image), one Task 2 essay prompt, and -- on most but not all pages -- a band 7.5 sample
answer. The importer extracts only the two task prompts. It never invents text: if a page's
structure doesn't match (no image, no Task 2 heading, etc.), that one task is skipped and reported,
never guessed at.

**Sample answers are out of scope for this import.** They exist on the source pages and could
power a "See a model answer" feature later, but building that (deciding how/when to show a band
7.5 answer without just handing students something to copy) is a separate piece of design work,
not a byproduct of an import script.

## Result of the default run (132 down to 103)

30 tests imported, 60 prompts total (30 Task 1, 30 Task 2). Nothing was skipped in this run.
Task 1 images: 31 files (one test, 126, has two separate before/after site plans), 1.55 MB total,
copied to `public/pics/writing/imported/` in their original format (PNG, JPG or WebP, whichever
the source used).

| Test | Task 1 (variant already in title) | Task 2 (variant) | Source URL |
|---|---|---|---|
| 132 | Library users at a university (chart and table) | Primary schools focus too much on formal learning (two-part) | [source](https://practicepteonline.com/ielts-writing-test-132/) |
| 131 | How one type of desert (process) | All university undergraduate courses should include a period (advantages-disadvantages) | [source](https://practicepteonline.com/ielts-writing-test-131/) |
| 130 | A college cafe before it was redesigned (map) | In the digital age, theatres and cinemas (discussion) | [source](https://practicepteonline.com/ielts-writing-test-130/) |
| 129 | Jobs in four sectors of the economy (chart) | The best way to provide enough homes (opinion) | [source](https://practicepteonline.com/ielts-writing-test-129/) |
| 128 | How fabric is manufactured from bamboo (process) | Many aspects of the way people dress today (opinion) | [source](https://practicepteonline.com/ielts-writing-test-128/) |
| 127 | A public library in a town called Little Chalfont (chart) | Some people have decided to reduce the number (opinion) | [source](https://practicepteonline.com/ielts-writing-test-127/) |
| 126 | The site of a farm in 1950 (map) | Primary and secondary schools close for two months (opinion) | [source](https://practicepteonline.com/ielts-writing-test-126/) |
| 125 | Changes in the total population of New York City (table) | Access to clean water is a basic human (opinion) | [source](https://practicepteonline.com/ielts-writing-test-125/) |
| 124 | The location and types of dance classes young people (chart) | Consumers can go to a supermarket and buy (opinion) | [source](https://practicepteonline.com/ielts-writing-test-124/) |
| 123 | How a biofuel called ethanol is produced (process) | It is important for everyone, including young people (opinion) | [source](https://practicepteonline.com/ielts-writing-test-123/) |
| 122 | A harbour in 2000 (map) | The working week should be shorter and workers (opinion) | [source](https://practicepteonline.com/ielts-writing-test-122/) |
| 121 | The numbers of participants for different activities at one (chart) | Competition at work, at school and in daily (discussion) | [source](https://practicepteonline.com/ielts-writing-test-121/) |
| 120 | The average monthly change in the prices of three (chart) | People are now living longer than ever before (advantages-disadvantages) | [source](https://practicepteonline.com/ielts-writing-test-120/) |
| 119 | The floor plan of a public library 20 years (map) | Around the world rural people are moving (opinion) | [source](https://practicepteonline.com/ielts-writing-test-119/) |
| 118 | Households in the US by their annual income (chart) | Some university students want to learn about other (discussion) | [source](https://practicepteonline.com/ielts-writing-test-118/) |
| 117 | Population in four Asian countries living in cities (chart) | The most important aim of science should be (opinion) | [source](https://practicepteonline.com/ielts-writing-test-117/) |
| 116 | Shops that closed and the number of new shops (chart) | A growing number of people with health problems (problem-solution) | [source](https://practicepteonline.com/ielts-writing-test-116/) |
| 115 | How families in one country spent their weekly income (chart) | Professionals, such as doctors and engineers, should be (discussion) | [source](https://practicepteonline.com/ielts-writing-test-115/) |
| 114 | The police budget for 2017 and 2018 in one (chart and table) | Some children spend hours every day (opinion) | [source](https://practicepteonline.com/ielts-writing-test-114/) |
| 113 | An industrial area in the town of Norbiton (map) | It is important for people to take risks (advantages-disadvantages) | [source](https://practicepteonline.com/ielts-writing-test-113/) |
| 112 | The process for recycling plastic bottles (process) | In the future all cars, buses and trucks (advantages-disadvantages) | [source](https://practicepteonline.com/ielts-writing-test-112/) |
| 111 | The site of an airport now (map) | Many manufactured food and drink products contain high (opinion) | [source](https://practicepteonline.com/ielts-writing-test-111/) |
| 110 | The manufacturing process for making sugar from sugar cane (process) | In their advertising business nowadays usually emphasise (opinion) | [source](https://practicepteonline.com/ielts-writing-test-110/) |
| 109 | The changes in ownership of electrical appliances and amount (chart) | In some countries more and more people (two-part) | [source](https://practicepteonline.com/ielts-writing-test-109/) |
| 108 | What Anthropology graduates from one university did after finishing (chart and table) | In some cultures, children are often told (advantages-disadvantages) | [source](https://practicepteonline.com/ielts-writing-test-108/) |
| 107 | How instant noodles are manufactured (process) | Advertising is extremely successful at persuading us (discussion) | [source](https://practicepteonline.com/ielts-writing-test-107/) |
| 106 | Tourists visiting a particular Caribbean island between 2010 (chart) | In the future nobody will buy printed newspapers (opinion) | [source](https://practicepteonline.com/ielts-writing-test-106/) |
| 105 | The results of a survey about people’s coffee (chart) | In some countries owning a home rather (opinion) | [source](https://practicepteonline.com/ielts-writing-test-105/) |
| 104 | A public park when it first opened in 1920 (map) | Many people choose to be self-employed, rather (opinion) | [source](https://practicepteonline.com/ielts-writing-test-104/) |
| 103 | How electricity is generated in a hydroelectric power station (process) | Music is a good way of bringing people (opinion) | [source](https://practicepteonline.com/ielts-writing-test-103/) |

## How titles and variants are decided

Titles are generated from the prompt text, not hand-written -- a short noun phrase is extracted
around the "shows / gives information about / compares" clause, trimmed to a handful of words, and
a trailing word like "in" or "and" is dropped rather than left dangling. They're serviceable, not
literary; a person skimming the prompt picker would still want to hand-edit a few for polish.

Task 1 variant is inferred from the prompt wording: `line-graph`, `bar-chart`, `pie-chart`,
`table`, `process`, `map`, `combination` (when two or more chart/table words appear together, e.g.
"chart and table"), else the generic fallback `chart`. Task 2 variant
follows the same priority order given in the spec: `opinion` ("agree or disagree"), `discussion`
("discuss both views"), `advantages-disadvantages`, `problem-solution` ("problems" / "solutions" /
"causes"), `two-part` (two separate question sentences), else `opinion`.


## Design notes

- `suggestedVocab` is `[]` for every imported prompt -- topic vocabulary is hand-curated for the
  former in-house prompts and wasn't part of this import. `WritingCoachPanel.tsx` now shows a calm
  "No topic vocabulary for this task yet." line instead of an empty grid when a prompt has none.
- Each imported prompt carries a `source: { name, url, permission }` field (added to the
  `EssayPrompt` type in `src/lib/writing/schema.ts`) recording exactly which page it came from.
- `src/data/writing-prompts-imported.ts` is generated -- re-run the script rather than hand-editing
  it. `src/data/writing-prompts.ts` now exports only the
  imported pool when building `WRITING_PROMPTS`, so nothing about how consumers read that export
  changed.

## General Training

General Training was removed from the whole site on 2026-09-14 at Alex's request: the letters that had been imported were dropped again, the importer's letters mode was deleted, and the site is Academic only.

## Importing more

```
python tools/import_writing.py            # default: 132 down to 103 (30 tests)
python tools/import_writing.py 102 73      # a specific range, e.g. the next 30
```

Run these in either order -- each mode caches its own results as JSON under `.tmp/writing-source/`
`src/data/writing-prompts-imported.ts` as the union of both caches every time, so one mode's run
never wipes out what the other already produced. On a totally fresh checkout, run the plain

Source pages are cached under `.tmp/writing-source/` (gitignored) so re-runs don't re-fetch. Delete
a cached page's `.html` file to force a re-fetch of just that one. Task 1 images land in
`public/pics/writing/imported/wt-<n>-task1[-2].<ext>`.
