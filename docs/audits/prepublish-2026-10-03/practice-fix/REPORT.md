# Lesson practice exercises: scoring, Russian titles, word limits (3 October 2026)

Commits `edff9bb` and `cd12c4b` (builder), merged into the platform branch.

## 1. Answer pools score once
- The rule lives in `src/lib/practice-scoring.ts`, the same rule the full test player applies through
  `answerPairId` (a test checks the two agree). `PracticeQuiz.tsx` uses it for marks, score and the
  learner record.
- One pooled group exists across both practice files: the Test 16 table in the Reading summary set,
  four pools (blanks 1 and 3; 2 and 4; 5, 7 and 9; 6, 8 and 10), each marked `pool` from the paper.
- F, F, F in blanks 5, 7 and 9 now scores 1; F, G, J in any order scores 3. A missed blank in a pool
  shows a letter not yet used and says the repeated letter already earned its mark.

## 2. Titles and instructions in Russian
- `set.title`, `set.intro` and `unit.intro` go through `t()`. New batch
  `src/lib/i18n/dict/ru/practice-sets.ts` (50 titles and intros plus one new line), registered in
  `dict/ru/index.ts` and `tests/i18n.test.ts`. IELTS terms and the paper's word-limit wording stay English.

## 3. Word limits stated
- Reading: 8 unit intros (sentence completion Tests 24 and 34; summary Test 16 table and Test 2 notes;
  short answer Tests 29 and 35; diagram Tests 15 and 13), worded as each paper states its rule.
- Listening: 11 unit intros (Test 1 Parts 1 to 4, diagram labelling, form completion x2, sentence
  completion x2, short answer x2).
- Yes / No / Not Given set intro reworded so it fits a factual first unit.

## Proof
- `npm test` 2574 of 2574 (new `tests/practice-quiz.test.ts`, 10 tests); `npx astro check` 0 errors;
  `lesson-ru check --all` clean.
- Browser check on a dev server, English and Russian, 18 of 18; screenshots in `shots/`.

## Notes
- `tools/build_reading_practice.py` and `build_listening_practice.py` are behind the hand-edited data
  (2 and 3 October key fixes were made in the data files). Re-running them would undo those fixes; if they
  come back into use they must copy `answerPairId` into `pool` and write the word-limit intro.
