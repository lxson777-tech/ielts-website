# Reading tests and practice: content review, 3 October 2026

Scope: the 40 full Academic Reading tests (`src/data/tests/reading-full-001.ts` to `040.ts`), their
Russian answer notes (`src/data/tests/ru/reading-full-*.json`), and the Reading exercises on the lesson
pages (`src/data/reading-practice.ts` with `src/data/tests/ru/practice-reading-*.json`).

## How it was checked

1. **A new check script**, `tools/reading-key-lint.mjs` (run `node tools/reading-key-lint.mjs`), kept
   in the repo with its own test, `tests/reading-key-lint.test.ts`, so `npm test` now fails if any of
   these come back. It reads all 1,600 test questions and all 149 lesson questions and flags: missing,
   repeated or out-of-order question numbers; group titles and instructions that name the wrong
   questions; TRUE/FALSE keys on YES/NO questions and the other way round; multiple-choice keys that
   are not an option; matching keys outside the letters offered; letters reused when the instructions
   do not allow it; answers longer than the word limit; keys written with brackets or slashes;
   completion answers not in the passage; explanations (English or Russian) that state a different
   verdict from the key; evidence quotes the review screen's "show in passage" button cannot find;
   table grids that put each answer box beside the wrong words; lists glued onto question text;
   questions with nothing telling the student what they ask; Russian files whose ids do not match;
   a lesson exercise whose key disagrees with the test it was copied from; placeholders, broken HTML
   and leftover advert markup.
2. **Every question read against its passage.** The 40 tests were split between four read-only
   helpers (10 tests each, all 1,600 questions). Every problem they raised I re-checked myself against
   the passage before changing anything. I also compared every key with the publisher's own printed
   key (the cached source pages): our keys match the publisher except the 11 corrections already
   recorded in September, so every key change below is a correction of the publisher.
3. **Proof in the running site** (dev server on port 4560, stopped afterwards): Test 20 Q23-26 now
   offers the twelve words from the box; Test 40's table now shows numbered boxes 14-21 under the
   real table; Test 12 Q39 shows radio buttons A-D; a submitted paper with "heat" for Q3 and D for
   Q39 scored 2/40, so the new key and the new multiple-choice question both mark correctly.
4. `npm test`: 2,487 tests, all pass. `npx astro check`: 0 errors, 0 warnings.
   `node tools/explanations-ru.mjs check --all`: 92 files, 0 problems.

## Band score conversion

`readingBand()` in `src/lib/tests/schema.ts` uses: 39-40 = 9, 37-38 = 8.5, 35-36 = 8, 33-34 = 7.5,
30-32 = 7, 27-29 = 6.5, 23-26 = 6, 19-22 = 5.5, 15-18 = 5, 13-14 = 4.5, 10-12 = 4, 8-9 = 3.5,
6-7 = 3, 4-5 = 2.5. This is the published Academic Reading conversion (IELTS gives 15 = Band 5,
23 = 6, 30 = 7, 35 = 8 as its representative points, and all four match). No change needed.

## Fixes

### Questions nobody could answer, or that marked a right answer wrong

| Test, question | Was | Now | Why |
|---|---|---|---|
| 20, Q23-26 | Dropdown offered only "A" | Offers the 12 words in the box | Keys are words ("Heal itself"), so no choice could score |
| 22, Q28-31 | Dropdown offered only "A" | Offers the 14 words in the box | Same fault |
| 22, Q1 | Key "18 (years old)" | "18" or "eighteen" | Typing 18 scored nothing; the instruction is ONE WORD AND/OR A NUMBER |
| 10, Q11-13 | buses / ferries / trams fixed to one box each | Accepted in any order | A three-item list from one sentence; the order is not part of the answer |
| 27, Q21-23 | Letters A-H | A-J | The passage and the instruction have ten paragraphs, A-J |
| 12 Q39-40, 19 Q13, 39 Q40 | A text box with options A-D glued onto the question | Ordinary four-option multiple choice | The student had to type a letter and read the options inside the question |
| 3, 9 (twice), 15, 16, 21, 33, 36, 38, 40 | Table grids printed each box beside the NEXT question's words (Test 40 Q14 sat beside "Zhang Qian, To seek", which is Q15) | The real table stays above; the grid holds only the numbered boxes | The same rule the September import fix used for gapped text: the legend is the version that renders correctly |
| 20, Q27-31 | Answer lines for 27 and 31 missing from the order box | Added | Five questions, three lines |

### Keys changed (each re-read against the passage)

- **Test 10 Q24** "So far, gene therapy has only been used on adults": Not Given -> **False**. Passage:
  "two children treated for X-linked severe combined immunodeficiency (X-SCID) in a clinical trial in
  1999 had developed leukaemia". English and Russian notes rewritten (both wrongly said ages are
  never given).
- **Test 12 Q3** "absorbing and retaining solar ___" (ONE WORD): Surfaces -> **Heat**. Passage: "hard
  surfaces such as concrete and asphalt storing heat from the sun". "Solar surfaces" makes no sense.
- **Test 32 Q19** "1925 artworks ... were simpler than her previous ones": Not Given -> **False**.
  Passage: "in comparison with earlier artworks, they were compact and busy". The passage makes the
  comparison and "busy" contradicts "simpler". Notes and evidence rewritten.
- **Test 37 Q30** "the means by which howlers select the best available diet": E -> **C or E**.
  Paragraph C: "the monkeys keep their systems primed by sampling a variety of plants and then
  focusing on a small number of the most nutritious food items". The old explanation itself said the
  answer was in C. E (the publisher's key) stays accepted; the NB line was added because C is also Q28.

### Answers accepted, added or removed

- Over the word limit, no longer accepted (the shorter form in the same key still scores):
  Test 30 Q40 "germs or bacteria" (two alternatives, limit 2), Test 36 Q9 "pectoral and pelvic fins"
  and Q10 "slows down and stops" (limit 3), Test 37 Q10 "refraction in the rainbow" (limit 3),
  Test 38 Q29 "all of the siblings" (limit 3), Test 40 Q14 "the Persian wars" (limit 2).
- Test 37 Q26 no longer accepts the publisher's misprint "capture of shortage" ("capture or storage",
  the passage words, stays).
- Added because the passage gives them and they fit the gap: Test 9 Q25 "shift" ("the shift toward
  self-driving cars"), Q26 "municipalities"; Test 10 Q19 "body" ("somatic (body) cells");
  Test 32 Q26 "travel" ("her love of painting, printmaking and travel continued"; the gap is
  "still interested in ___ and art", so "painting" was redundant); Test 28 Q39 now shows "trap-lining"
  with the hyphen, as its explanation tells students to write it (both forms were already accepted).

### Explanations and Russian notes corrected (key unchanged)

- Test 3 Q29: quoted the fifth paragraph for a question about the fourth; now quotes "they fail to
  realise the complexity around deploying advanced machine learning systems in the real world".
- Test 6 Q6: said tin was rationed; the passage says canned foods were rationed to save tin.
- Test 10 Q31, Q38, Q39: said "Paragraph 8"; it is paragraph 7. Q38's evidence quoted a different
  paragraph and now quotes the "visual learners" sentence.
- Test 17 Q35 (key NO): the note argued like Not Given ("never claims"); it now cites "It is
  generally accepted that these two plants, native to the Americas, did not exist on other
  continents prior to European exploration".
- Test 18 Q1: the Russian said the date moved from 10,000 to 20,000 years; the passage says the
  conventional range is 10,000 to 20,000 and a paper pushed it back tenfold. English clarified too.
- Test 21 Q2: the "tempting option" sentence talked about light jazz under option C, but option C is
  about advertising; it now explains the real trap, option B.
- Test 37 Q37: claimed only howlers live at the cacao farm; the passage says spider monkeys forage
  there too. Both A and C stay accepted and the note now says why.
- Every changed English note has its Russian rewritten and its fingerprint refreshed.

### Instructions

- Wrong question numbers: Test 31 "boxes 7-8" -> 34-35; Test 34 "spaces numbered 6-14" -> 19-27;
  Test 35 "boxes 15-26" -> 15-21 and "(Questions 8-13)" -> 22-27; Test 38 "boxes 15-26" -> 15-18.
- Test 37: "eleven paragraphs A-I" -> nine; "researchers (listed A-D)" -> A-E (five are listed).
- "NB You may use any letter more than once." added to the 18 matching and classification groups
  whose key reuses a letter: Tests 11 (Q27-32), 17 (Q22-26, Q30-34), 18 (Q10-14, Q24-27, Q28-33),
  19 (Q7-12), 20 (Q34-39), 21 (Q3-7), 22 (Q15-19, Q32-36), 28 (Q15-20), 29 (Q17-21), 34 (Q34-40),
  35 (Q22-27), 36 (Q20-27), 37 (Q28-31, Q36-40). The helpers confirmed the reuse is genuine in
  Tests 11 and 36.
- Typos in rubrics: "pom the list", "Write10", "ONE WORDS", "THREE WORD S".

### Evidence the "show in passage" button could not find (now found)

Tests 1 Q23, 3 Q10, 5 Q25, 12 Q4, 17 Q36, 18 Q19, 20 Q8 (the quote began lower-case where the passage
has a capital, and the search is case-sensitive); Test 12 Q1 and Test 11 Q18 (not word for word);
Test 6 Q15 and Test 10 Q4 (cut off at a decimal point, "cover 0.", "its 4.").

### Text a student would notice

About 70 scanning errors in passages, questions and options, each fixed only where the right word
is certain, and mirrored into the lesson copies of the same passages: for example "numbers offish",
"II. naledi" (H. naledi), "200.0" and "476.0 years old" (200,000 and 476,000), "Al" for "AI"
throughout Test 3, "Fligh-fructose", "threat5", "robe-umpire", "Kakap6", "Fie also" (He), "novel
dues" (clues), "through the wafer" (water), "it is waned by heat" (warmed), "wheat best" (belt),
"pained large recognition" (gained), "winking out of their bonus" (working out of their homes),
"Imps helped" (Hops), "Indigenous Lees" (trees), "the pitch of the ash" (fish), "The paired ins"
(fins), "hos now died out" (has), "Andrea Haiper" (Halpern), "Lore Valley" (Loire), "fur reports"
(four). Also: glued lists removed from Test 5 Q36 and Test 20 Q26, empty advert placeholders left
from the scraped pages removed from 18 tests, and Test 37's summary "the storage of water" -> shortage.

### Lesson exercises

- The Test 16 table blanks asked "what word goes here?"; the answers are letters, so they ask which
  letter. Typo "hos" fixed. Their identity stamps in `PRACTICE_ITEM_IDENTITY` were updated to what the
  generator produces, and `src/data/generated/learning-index.json` was regenerated.
- Every lesson question copied from a test was checked against that test's key: none disagrees.

## Left for Alex (judgement calls, not changed)

1. **Test 10 Q40** accepts "learning style" under ONE WORD ONLY. Real IELTS marks that wrong, and the
   explanation says to write "style", but September's review kept it deliberately and a test pins it
   (`tests/reading-answer-key.test.ts`, `tools/import_reading.py` ANSWER_OVERRIDES). Recommend removing
   it; it is the one exception the new check is told to allow.
2. **Test 10 Q37** "intelligence is (37) ___" (ONE WORD from the passage) accepts "changeable" /
   "changing", neither of which is in the passage ("intelligence can change"). The question is
   unanswerable as printed; a reworded gap would fix it but changes publisher wording.
3. **Test 28 Q21-24**: endings D and E are printed with identical wording in the publisher's own page,
   so one ending is lost; Q23 and Q24 accept either letter. Same in Q28: headings ii and iii identical.
4. **Test 35 Q13-14**: option D reads "It's fading under the sun", the opposite of the passage ("reduces
   the amount of fading"), yet it is keyed. Likely meant "resists fading"; rewording is publisher text.
5. Arguable TRUE/FALSE/NOT GIVEN keys the helpers raised that I did not judge certain enough to change
   (publisher's key kept): Test 9 Q37-39 (Q39 "weapons" is never mentioned, only "tool use", and the
   note uses outside knowledge, I lean Not Given), Test 12 Q8 and Q35, Test 17 Q12, Test 15 Q10,
   Test 11 Q7, Test 16 Q32, Test 22 Q21, Test 21 Q33, Test 34 Q18, Test 38 Q39, Test 27 Q40, Test 5 Q13.
   Matching or choice items in the same position: Test 13 Q2/Q3 (possibly swapped) and Q7, Test 11 Q22,
   Test 28 Q4 and Q5, Test 31 Q4, Test 35 Q3, Test 37 Q3, Q4 and Q8, Test 39 Q17, Test 38 Q17.
6. Garbled sentences whose missing words cannot be recovered: Test 18 passage 3 ("growing by 6 percent
   of a product's price in 1947 to 5 percent today"), Test 31 ("Soon unlikely if a non-dominant male had
   been injured"), Test 34 F and Test 35 G (broken sentences), Test 38 passage 1 (paragraphs E and F
   nearly duplicate), Test 21 Q24 options ("It want animals to work").

## Seen but outside my files

1. **Twelve sentence-endings tasks typed as Sentence Completion** (Tests 2 Q31-34, 6 Q34-36,
   8 Q31-35, 13 Q1-5 and Q27-30, 16 Q11-13, 20 Q7-9, 21 Q38-40, 24 Q31-34, 28 Q21-24, 31 Q11-14,
   33 Q36-40, 35 Q1-4 and Q33-36, 39 Q36-39; plus "choose from the box" groups 7 Q33-37, 21 Q3-7,
   25 Q27-32, 26 Q31-36). Students type a letter into a text box; marking is correct. I did not
   retype them: `tests/focused-reading-types.test.ts` (lines 96 and 102), `tests/learning-catalog.test.ts`
   (line 468) and `tests/learning-index.test.ts` assert that no real paper has a sentence-endings group
   ("lead decision Q1": the authored set exists because of it). What is needed: set each group's
   `type` to `sentence-endings` (or `matching-features` for the box ones), add `options` (the letters),
   move each question's `before` text into `textHtml` (the select layout reads `textHtml`) and drop the
   endings glued onto the last question's `before`; then retire the authored set and those
   assertions, and re-run `npm run learning:index`.
2. **Lesson practice scoring** (`src/components/PracticeQuiz.tsx`): it has no "answer pool" idea, so
   in the summary set's Test 16 table, typing F in all three of blanks 5, 7 and 9 scores three times.
   The test player handles this with `answerPairId`; PracticeQuiz needs the same.
3. **Lesson practice intros** (`src/data/reading-practice.ts` intros, translated through the interface
   dictionary): the completion sets never state the word limit, and the Yes/No/Not Given intro says
   "not simple facts" over a factual first unit (Test 17 Lake Vostok, whose rubric is "claims of the
   author"). Changing the English needs the Russian dictionary entries changed with it.
4. `tools/import_reading.py` ANSWER_OVERRIDES should record this review's key changes in Tests 1-20
   (Test 10 Q24 and Q19, Test 12 Q3, Test 9 Q25-26, Test 10 Q11-13 pool) so a re-import keeps them;
   `tools/validate_reading.py` already disagrees with September's Test 21-40 corrections, which were
   never recorded there either.
5. `src/lib/tests/schema.ts` line ~372: the comment above `READING_BAND_TABLE` ends in a broken
   sentence ("Academic Reading curve. uses a more lenient table ..."). The table itself is right.
6. `src/data/generated/learning-index.json` was regenerated twice here; whoever merges several
   reviewers' work should run `npm run learning:index` once more after the merge.
