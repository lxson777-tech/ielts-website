# Build listening practice exercises from the real tests

## Purpose

The practice exercise on each `/lessons/listening/<part>` page (the four
Part pages and the six question-type pages) used to be hand-written and
fictional, and Alex found the questions too easy. This workflow regenerates
`src/data/listening-practice.ts` from the site's own imported IELTS
listening tests (`src/data/tests/listening-full-0XX.ts`), so every question,
answer, explanation and audio clip shown in a lesson's practice block is
taken from a real test, with a source credit ("Listening Test 12, Part 3,
Questions 21 to 25") and, where the test has one, a collapsible transcript.

Run this again whenever the listening test bank changes (tests added, fixed
or re-scraped) and the practice exercises should reflect that.

## Command

```
python tools/build_listening_practice.py
```

No API keys, no network access, no paid services. It only reads
`src/data/tests/listening-full-0XX.ts` and writes
`src/data/listening-practice.ts`.

## What it does

1. Parses every listening test file, tests 001 to 020 only (they carry
   transcripts and per-part timestamps; 021 to 030 are audio + answer key
   only, see `MEMORY.md` "Practice test content status").
2. For each of the four Part lessons (`part1`..`part4`), picks the
   best-quality full test in that range (least mojibake, a transcript on
   every part) and takes one whole part of that number from it: every
   group, in order, with that part's audio clip and transcript.
3. For each of the six question-type lessons (multiple-choice, matching,
   map-labelling, form-completion, sentence-completion, short-answer),
   collects every group across all 20 tests whose underlying schema type
   matches (see "Type mapping" below), scores them for extraction quality,
   and keeps the best two groups from two different tests.
4. For every group used, pulls the real, human-readable option text /
   matching legend / fill-in-the-blank context straight out of the part's
   `stimulus.questionHtml` rather than trusting the structured
   `group.questions[].options` / `.textHtml` fields, which for imported
   listening tests only ever hold bare letters ("A"/"B"/"C") or a generic
   "Question N" placeholder with the blanked word simply missing (see the
   docstrings on `extract_mc_options()`, `extract_legend()` and
   `extract_blank_context()` in the script for exactly why and how).
5. Keeps the real answers, explanations, and any diagram/plan/map image the
   group uses (`public/pics/listening/imported/`).
6. Writes `src/data/listening-practice.ts` in the existing `PracticeSet`
   shape, plus a `segments` array (one per source group) recording that
   group's audio clip, attribution and transcript — see the
   `ListeningPracticeSegment` type at the top of the generated file, added
   via TypeScript module augmentation rather than editing
   `reading-practice.ts` directly (kept untouched so it can be edited
   concurrently for the Reading lessons).

## Type mapping

| Lesson slug | Real schema `QuestionType`(s) |
|---|---|
| `multiple-choice` | `multiple-choice` |
| `matching` | `matching-features`, `categorisation`, `sentence-endings` |
| `map-labelling` | `diagram-labelling` |
| `form-completion` | `table-completion` |
| `sentence-completion` | `sentence-completion`, excluding groups whose instruction reads "Answer the questions..." |
| `short-answer` | `sentence-completion` groups whose instruction reads "Answer the questions..." (the imported data does not tag these as a separate type) |

## What to check after running it

- Re-run `npx astro check`, the test suite
  (`node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/*.test.ts`)
  and `npm run build` — the script only edits data, but the shape it
  produces must still satisfy `src/components/PracticeQuiz.tsx`'s types.
- Skim the printed table (lesson slug, source test, part, question range,
  count) for anything that picked an unexpectedly small group.
- Open a Part page and a question-type page in the dev server, confirm the
  audio player appears and seeks to the right clip, answer a question, and
  once a set is finished, open its "Transcript" to confirm it matches the
  clip.

## Known limitations

- **Diagram-labelling groups often have no surrounding text at all** in the
  scraped HTML (the labels only exist printed on the referenced image), so
  `map-labelling` questions frequently fall back to a plain
  "Label point (N) on the diagram above." prompt rather than a descriptive
  sentence. This is expected, not a bug — the picture carries the real
  content there.
- **A handful of source questions carry small pre-existing scrape
  artifacts** in the test files themselves (a stray mojibake character, or
  two adjacent labels glued together with no space, e.g. one matching group
  in Listening Test 4 has the option text "plants Painting Styles"). The
  script fixes the mojibake character on the fly (replaces it with a plain
  apostrophe) but does not attempt to repair glued text, since that would
  mean guessing at the original wording. Re-run scoring already prefers
  cleaner groups when an equally good alternative exists; where it doesn't,
  the artifact is left as-is rather than inventing a fix.
- Restricting to tests 001-020 means the four Part lessons and all six
  question-type lessons currently draw from a smaller pool than the full
  30-test bank. If tests 021-030 are ever re-scraped with transcripts, widen
  `TEST_NUMS` in the script to include them.
