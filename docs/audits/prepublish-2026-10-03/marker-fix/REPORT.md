# Typed-answer marking fix (3 October 2026)

Builder commits `4c53ee7`, `8e3380e`, `07fa745`, `2a126db`, merged into the platform branch. Lesson practice
was then pointed at the same normaliser by the orchestrator (`src/lib/practice-scoring.ts`).

## What changed
- The marker (`normalizeAnswer` / `answerMatches` in `src/lib/tests/schema.ts`) accepts what an IELTS examiner
  accepts and nothing more: number words and digits (zero to a hundred; "a"/"an" alone never 1); phone numbers
  and codes of seven or more digits with or without spaces or hyphens ("5-12" stays a range); am/pm times in any
  common form; many more British and American spellings (about 120 -ise/-ize stems, organiser, fertiliser,
  co-operate, co-ordinator, enrolment, jewellery and others). Misspellings, wrong plurals and different numbers
  are still wrong.
- Four pairs removed because the American form is a different word: cheque/check, draught/draft, kerb/curb,
  storey/story ("storey" had been marked right against "a short story").
- Every caller now uses the same comparison: full tests, drills, pools, multi-select, focused exercises
  (`focused-exercise.ts`) and lesson practice.
- Word-limit warning (`src/lib/tests/word-limit.ts`, used by TestPlayer): a hyphenated word is one word; under
  "AND/OR A NUMBER" a number does not count against the words. False warnings on correct keys: 25 before, 3 now
  (all three are publisher keys already over their own limit: Listening Test 29 Q15 twice, Reading Test 10 Q40).
- Listening Band 4.0 now starts at 10 correct (was 11), matching the published table. The rest of the
  Listening table and the whole Academic Reading table already matched. Writing and Speaking untouched.
- Every key correction is recorded in `tools/import_listening.py` (165 entries, was 2) and
  `tools/import_reading.py` (67, was 14; plus 8 option-list overrides), so a re-import keeps them.

## Proof
- `tests/answer-marker.test.ts` (19), `tests/word-limit.test.ts` (7), `tests/answer-overrides.test.ts`.
- `tools/marker-key-check.mjs`: all 70 papers score full marks on their key and 0 blank; of 215 forms a student
  might type, 44 were wrongly rejected before and are accepted now, 0 still rejected.
- `tools/check_answer_overrides.py --source-cache .tmp`: rebuilt 1,200 Listening and 1,600 Reading keys from the
  cached publisher pages, 0 unrecorded differences.
- Running site, Listening Test 7: "48 North Avenue" shows no warning and is marked right; "four" against "4" right.

## Left
- Three Reading groups converted to multiple choice (Test 12 Q39-40, Test 19 Q13, Test 39 Q40): the override
  tables cannot record a change of type, so a re-import would bring the old layout back.
- The Listening importer gives "ONE NUMBER" groups no word limit (Test 10 Q11-12), though the data has one.
