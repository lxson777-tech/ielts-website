# Build reading practice exercises from the real tests

## Purpose

The practice exercise on each `/lessons/reading/<part>` page used to be
hand-written or generated, and Alex found the questions too easy. This
workflow regenerates `src/data/reading-practice.ts` from the site's own
imported IELTS reading tests (`src/data/tests/reading-full-*.ts`), so every
question, answer, explanation and evidence sentence shown in a lesson's
practice block is a real exam question, taken from a real passage, with a
source credit ("Academic Reading Test 7, Questions 14 to 19").

Run this again whenever the reading test bank changes (tests added, fixed,
or re-scraped) and the practice exercises should reflect that.

## Command

```
python tools/build_reading_practice.py
```

No API keys, no network access, no paid services. It only reads
`src/data/tests/reading-full-*.ts` and writes `src/data/reading-practice.ts`.

## What it does

1. Parses every reading test file (they are plain JSON embedded after
   `const test: PracticeTest = `).
2. Classifies each question group by which reading lesson slug it matches
   (`src/data/reading.ts` `READING_PARTS`), using the group's declared
   `type` plus its instruction wording. The imported test data mislabels a
   few groups (sentence-ending groups and real diagram-label groups are
   both tagged `sentence-completion`; a "complete the summary using a word
   list" group is tagged `matching-features`), so the script also looks at
   the instruction text rather than trusting the tag alone.
3. Picks two groups per lesson from two different tests, preferring tests
   001 to 020 (they carry real `explanation` and `evidence` text) and
   larger groups (more practice value). Falls back to later tests, with a
   generic explanation, only where no test 001-020 group of that type
   exists (this happens for `short-answer`: no test in 001-020 has one).
4. Converts each chosen group into the site's `PracticeQuestion` /
   `PracticeSet` shape, carrying the real passage text, the real answer,
   the real explanation, evidence and a source credit line.
5. Writes `src/data/reading-practice.ts`, keeping the `paraphrase` lesson's
   hand-written content untouched (see the note below).

## What to check after running it

- Re-run `npx astro check` and `npm run build` (the script only edits data,
  but the shape it produces must still satisfy `src/components/PracticeQuiz.tsx`'s
  types).
- Skim the printed table (lesson slug, source test type(s), which
  tests/questions were used, question count) for anything that picked an
  unexpectedly small group, or a source outside tests 001-020 where a
  better one should exist.
- Open a couple of `/lessons/reading/<part>` pages in the dev server and
  answer a question to confirm the real passage renders above the
  questions and the explanation/source line looks right.

## Known limitations

- **`paraphrase`** is a skill lesson, not an official IELTS reading
  question type (see the comment on it in `src/data/reading.ts`), so no
  imported test has a matching question group. The script leaves its
  practice exercise as hand-written content.
- **`diagram`**: the reading test bank has no group tagged
  `diagram-labelling` (only the listening tests do). Two groups tagged
  `sentence-completion` are real diagram/flow-chart-style label questions
  with a real scraped image, and are used instead; one of the two source
  images (Academic Reading Test 15, Questions 27 to 32) is a small
  contextual photo rather than a labelled schematic, since that is what
  the original test actually used.
- **`short-answer`**: no test in 001 to 020 has a short-answer group, so
  the script falls back to tests 021+ , which carry no `explanation` or
  `evidence` text in the source data. Those questions show a short generic
  explanation instead of a real one.
