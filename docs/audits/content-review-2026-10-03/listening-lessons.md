# Listening lessons review, 3 October 2026

Reviewer: Listening lessons. Scope: the Listening overview, the four Part lessons, the six
question-type lessons (English and Russian), the Listening strategy cards
(`src/data/listening-strategies.ts` and their Russian in `dict/ru/parts/strategies.ts`), the lesson
cards (`src/data/listening.ts`), the seven focused Listening exercise files and their Russian.

The 15 September audit (`docs/lesson-audits/listening-2026-09-15.md`) was read first and nothing it
decided has been undone.

## What was checked and found right

- Format facts: four parts, 10 questions each, 40 in total, one mark each, about 30 minutes of
  recording, heard once only, 10 minutes transfer time on paper and a 2-minute check on computer.
  Part 1 a conversation in an everyday social context, Part 2 a monologue in an everyday social
  context, Part 3 up to four people in an educational or training context, Part 4 a monologue on an
  academic subject. All agree with ielts.org.
- The band table (39-40 = 9.0 down to 23-25 = 6.0) matches the table the site's own scorer uses
  (`LISTENING_BAND_TABLE` in `src/lib/tests/schema.ts`), with the "approximate" caveat in place.
- Word limits: a number counts as one word, a hyphenated word counts as one word, contractions are
  not tested, over the limit is wrong. Stated the same way in Part 1, Form, Sentence and Short-answer
  lessons and on the strategy cards.
- Every worked example and every "marked wrong / marked right" row in the three completion lessons
  was re-read against its own recording line and word limit (packed lunch, short health form, old
  boathouse, 12 purpose-built tanks, north-facing entrance, hand-signed certificate and the rest).
  All keys are right and within their limits.
- Choose TWO scoring (one mark per letter), order of answers, distractors and corrections, map and
  direction language: consistent across the overview, the Part lessons, the type lessons and the
  strategy cards.
- All 28 focused Listening exercises: every test id, part, group, question list and type is real,
  and every printed attribution ("Test N, Part N, Questions X to Y") matches the questions it opens
  (checked by script, all 28 pass).
- All eleven Russian lesson bodies pass `node tools/lesson-ru.mjs check`; every Listening strategy
  sentence and every Listening card line has its Russian (checked by script).

## Fixes made (commit a4f7898)

1. **Overview, spelling note** (`listening.html` and Russian). Two official facts were missing:
   British and American spellings are both accepted, and answers may be written in capital or small
   letters. Added one sentence. (British Council: both spellings accepted; the site's scorer already
   accepts both, `SPELLING_PAIRS` in `schema.ts`.)
2. **Overview, last paragraph** (English and Russian). It said the practice questions come "from an
   official IELTS Listening test". They come from full practice tests shared by a publisher
   (PracticePTEOnline), and each question-type lesson uses two different tests. Now: "taken from full
   IELTS Listening practice tests".
3. **Part 1, spelling box** (English and Russian). It said "Unlike Reading, a misspelled answer in
   Listening is marked wrong". Spelling is marked wrong in Reading too. Now "As in Reading". (The
   September audit fixed the same sentence in the overview but this copy was missed.)
4. **Matching lesson, Key Rules** (English and Russian). It said each letter is normally used once,
   while the Matching strategy card said letters can be reused unless the instructions say otherwise.
   Both were half right: the site's own Matching papers include box tasks ("Choose FIVE answers from
   the box, A-G", letters used once) and short-list tasks ("A, B or C" for six items, letters
   repeat). The lesson now says: once when the box has more statements than questions; letters
   repeat when the list is shorter than the questions or the instructions allow it.
5. **Matching strategy card** (English and Russian). Same reconciliation: "Check the instructions
   and count the options. With a short list (for example A, B or C for six items) letters are used
   more than once; with a box of more options than questions, each letter is normally used once."
   The trap line now reads "deciding whether a letter can be reused without checking the instructions
   and the number of options" instead of implying reuse is the default.
6. **Form, Note, Table and Flow-chart lesson** (English and Russian). It said "Forms and notes dominate
   Part 1; tables and flow-charts appear more in Parts 3 and 4", which contradicted the Part 4 lesson
   (note completion is the most common Part 4 type) and the Part 1 lesson (tables are common there).
   Now: "Forms, notes and tables are common in Part 1, and notes are the usual format in Part 4.
   Tables and flow-charts can turn up in any part."
7. **Short-answer worked example** (English and Russian). The recording says "On Saturdays", the
   question asked "Where do the walkers meet on Saturday mornings?", adding a detail the recording
   never gives. The question now says "on Saturdays?".
8. **Strategy card label**. "Sentence, Note & Short-answer Completion" is not an exam name. Now
   "Sentence & Note Completion, Short-answer Questions" (the official names; labels stay English).
9. **Two circular strategy sentences** (English and Russian). "The items to match usually come up in
   the order they appear in the recording" and "Items to sort come up in the order they are
   discussed" said nothing. Both now say the items come up in the same order as the numbered
   questions.
10. **Three comma splices on the strategy cards** (Multiple Answer twice, Categorisation once) made
    into colons. Russian unchanged, only its key followed the English.
11. **Multiple Choice lesson card eyebrow** (`listening.ts`). It said "Most common in Part 3"; the
    lesson says Parts 2 and 3. Now uses the existing "Most common in Parts 2 & 3" line, which already
    has its Russian.
12. **Russian overview**: "в компьютерной версии, 2-минутную проверку" (a comma left where a dash
    had been removed, ungrammatical) is now "в компьютерной версии используйте 2-минутную проверку".
13. **Russian Part 3**: "в учебном или образовательном контексте" said the same thing twice; the
    English is "educational or training context". Now "в контексте учёбы или профессиональной
    подготовки".
14. **Russian Multiple Choice**: "основы вопросов" (a word-for-word rendering of "question stems",
    not natural Russian) is now "сами вопросы".

Russian hashes refreshed for `listening`, `listening-part1`, `listening-matching`,
`listening-form-completion`, `listening-short-answer`; `lesson-ru check --all` reports 76 checked,
0 problems. No em or en dashes added (checked by script on the diff).

The changed text was confirmed in the running site (dev server on port 4521): the overview, Part 1,
Matching, Form completion and Short-answer pages show the new English, and the overview in Russian
shows the new Russian sentences.

## Left for Alex

1. **Short-answer "Write only the missing information" rows.** The lesson marks "on Saturday"
   (for "On which day does the market open?") and "20 per cent cheaper" (for "How much cheaper is the
   annual ticket?") as wrong. Both are within the word limit and grammatical, and Cambridge answer
   keys often print optional words in brackets, e.g. "(on) Saturday", so a real examiner may well
   accept them. As a habit ("do not repeat the question") the advice is good; as a statement that
   they are marked wrong it is probably too strong. Suggest relabelling these two rows as "risky" or
   choosing examples where the repeated word breaks the word limit. Not changed, because it is a
   teaching choice made in an earlier pass.
2. **Placement claims** ("most often in Part 2 and 3" and so on) are still unverifiable: IELTS
   publishes no frequency data. They are written as tendencies, so they stay.
3. The Sentence Completion and Short-answer lesson cards say "Any part" while their lessons say
   "most often in Part 4" and "most often in Part 1". Not wrong, but not matching. Changing them
   needs new Russian lines in `src/lib/i18n/dict/ru/course-data.ts` (not mine).

## Seen but outside my files

1. **HIGH: focused Listening exercises that cannot be answered.** `src/lib/tests/focused-views.ts`
   (around line 237) and `src/lib/tests/focused-source-support.ts` (lines 11 to 13) only pass the
   publisher's question sheet through for diagrams (the picture) and for menus (`<dl>` legends).
   Imported completion and some matching groups have no question text of their own (each question is
   just "Question 1"), so the focused page shows "Complete the table below" followed by five empty
   boxes labelled "Question 1 ... Question 5", with no table, notes or form. Confirmed in the running
   site at `/trainers/focused/listening-sentence-completion-guided`. Affected exercises:
   - `listening-sentence-completion-guided`, `-guided-2`, `-check-a` (table, summary, form missing)
   - `listening-table-completion-guided`, `-guided-2`, `-check-a`, `-check-b` (table or chart missing)
   - `listening-matching-features-check-a` (Test 19 Q11-16: the box is shown but the flow chart is not)
   - `listening-matching-features-guided-2` (Test 2 Q17-20: "Label the map below" with letters A-I but
     no map and no feature names). This group is also mis-typed as `matching-features` in
     `src/data/tests/listening-full-002.ts` line 200; it is a map labelling task.
   Suggested fix: when a group's questions carry only the "Question N" placeholder, pass the group's
   own section of `questionHtml` (rows and figure) as `legendHtml`, as is already done for diagram
   images. The other 19 Listening focused exercises render usable questions.
2. `src/components/learning/FocusedExercise.tsx` line 659: "Up to {n} words." prints "Up to 1 words."
   for a one-word limit.
3. `src/data/listening-practice.ts` spends two of the papers reserved for independent checks:
   the Map labelling lesson practice uses Test 8, Part 2, Q15-17 (line 1412), which is exactly
   `listening-diagram-labelling-check-a`; the Short-answer lesson practice uses Test 8, Part 1, Q7-10
   (line 1746), which is exactly `listening-sentence-completion-check-b`. A student who did the lesson
   practice is later told the check is "a recording you have not heard".
4. `src/data/listening-practice.ts`, Form completion practice, Test 7 unit: line 1547
   "Singer (price includes _____ in the garden" (bracket never closed), line 1565 "June: _____ £"
   (pound sign after the gap), and around line 1500 "(...) and _____" prompts that do not say what is
   being asked. Probably flattening of the original table.
5. `src/lib/i18n/dict/ru/course-data.ts` line 158 and `src/data/listening.ts` line 50: the Part 3
   eyebrow starts with a small letter ("up to four speakers · Multiple choice") while the others are
   capitalised. The English key and its Russian must change together, so it was left.
6. `src/lib/i18n/dict/ru/course-data.ts` line 152: the Part 1 card in Russian says "произношение по
   буквам" (pronunciation by letters) for "spellings"; should be "написание по буквам".
7. `src/lib/i18n/dict/ru/course-data.ts` line 110: `Matching: 'Сопоставление'` translates the
   Matching lesson title on the Russian Listening overview, while every other question-type title
   stays English as the translation brief requires. If that key is used elsewhere as an ordinary
   word, the lesson card needs its own untranslated title.
8. `src/data/mistake-reasons.ts` line 450: the matching mistake reason "assuming an option could only
   be used once when the instructions did not say that" implies reuse is the default, which is no
   longer what the lesson and the card teach. Suggest "assuming each option could only be used once
   without checking the instructions and the number of options" (its Russian is in
   `dict/ru/learning-focus-listening.ts` line 179, which I can update once the English changes).
9. `src/pages/lessons/listening/[part].astro` line 48: "The recording and questions below come from a
   real IELTS Listening test." The six question-type lessons combine two different tests.

## Test results

- `npm test`: 2481 tests, 2481 pass, 0 fail.
- `npx astro check`: 0 errors, 0 warnings (27 hints, none in the changed files).
- `node tools/lesson-ru.mjs check --all`: 76 checked, 0 problems.
