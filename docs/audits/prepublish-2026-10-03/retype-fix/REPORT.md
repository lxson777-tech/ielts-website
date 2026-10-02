# Retyped question groups and restored stems (3 October 2026)

What students saw before: 19 Reading groups where students pick a letter were typed as Sentence
Completion. Students typed a letter into a text box, the endings were printed with the beginnings,
the last question had every ending glued on, and wrong answers went to the Sentence Completion lesson.

Changed:
- Matching Sentence Endings (15 groups, now sentence-endings): Tests 2 Q31-34, 6 Q34-36, 8 Q31-35,
  13 Q1-5 and Q27-30, 16 Q11-13, 20 Q7-9, 21 Q38-40, 24 Q31-34, 28 Q21-24, 31 Q11-14, 33 Q36-40,
  35 Q1-4 and Q33-36, 39 Q36-39. Beginning beside a letter dropdown, endings list above.
  Test 2 Q34 lost a stray "70"; Test 13 Q2 "should he" now "should be".
- Choose from a box (4 groups, now matching-features): Tests 7 Q33-37, 21 Q3-7, 25 Q27-32, 26 Q31-36.
- Ids and keys unchanged.
- Stems: Listening 7 Q16-18 and 10 Q5-7 already present (fee6a19). Reading 15 Q39-40 and Q25-26:
  the cached publisher page prints no question, so the site shows "Which TWO of the following
  statements are true, according to the passage?" (English, like all question-paper wording).
- Focused practice: authored set retired; exercise reading-sentence-endings-authored (id kept) now
  uses Test 33 Passage 3 Q36-40.
- Routing: sentence-endings mistakes go to the Matching Sentence Endings lesson.

Proof: npm test 2577/2577 pass; astro check 0 errors; learning index regenerated; content-leak
audit on a gated build 0 leaking files; dev server 4596 screenshots 01-09, no console errors.

Left as found: Test 28 duplicate endings D/E (either accepted); no focused check for sentence
endings yet (Tests 21 Q38-40, 39 Q36-39 free for one); box summaries route to Matching Features.
