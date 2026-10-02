# Reading lessons: pre-publishing content review

Date: 3 October 2026. Reviewer area: every Reading lesson (the overview `reading-task1` and the 12
reading-* lessons, English and Russian), the drill strategy cards (`src/data/reading-strategies.ts`
and their Russian), `src/data/reading.ts`, the focused Reading exercises (`src/data/focused/reading-*.ts`)
and their Russian (`src/lib/i18n/dict/ru/learning-focus-reading.ts`).

## How it was checked

- Every English lesson read in full, and every Russian lesson read against it.
- Exam facts checked against the official ielts.org Academic Reading format page (fetched today). The
  sentences that decided things: multiple choice, sentence completion, matching sentence endings and
  short-answer questions are in passage order; summary/note/table/flow-chart and diagram labels
  "may not come in the same order"; TFNG, YNNG, matching information, headings and features carry no
  order statement; "No heading may be used more than once"; "When it is possible to use any option
  more than once, the instructions will say: 'You may use any option more than once'"; word limits are
  printed with the task, "they're" is never tested, "check-in" counts as one word; 60 minutes,
  40 questions, 2,150 to 2,750 words.
- The site's own 40 real Reading papers (`src/data/tests/reading-full-*.ts`) surveyed with small
  read-only scripts: which passage each Yes / No / Not Given task sits on, whether letters repeat in
  matching tasks, the real rubric wording, and every focused exercise's paper, part, group, question
  ids and credit line.
- Worked examples re-solved by hand (TFNG Halden Bridge, YNNG student fee, the completion examples,
  the Galileo short answer, the Test 7 Question 38 multiple choice, whose key B matches the paper).
- The 15 September audit (`docs/lesson-audits/reading-2026-09-15.md`) was read first. Nothing it decided
  has been undone.

What was already right and left alone: 60 minutes with no extra transfer time; 40 questions, 1 mark
each; text length; the band table; the 20-minutes-per-passage advice; every word-counting rule; TRUE /
FALSE / NOT GIVEN against YES / NO / NOT GIVEN (definitions, rubrics, writing the right words); four
options in multiple choice; headings as small roman numerals; copy words exactly; British spelling in
examples; all answer-rule tables; all worked-example answers.

## Fixes (12)

1. **Overview table said matching answers usually run in order** (`reading-task1.html`, and RU).
   The "Every question type on one screen" table said "IELTS does not say, but usually in order in
   practice" for Matching Information and Matching Features. That is wrong in practice and contradicts
   both detailed lessons ("the answers do not follow the order of the passage", "Do not assume the
   answers run in passage order"). Now: "IELTS does not say, but in practice they are usually
   scattered, not in order". Headings, TFNG and YNNG rows unchanged.
2. **Overview pill said any matching task can reuse a letter** (`reading-task1.html`, and RU).
   "For matching tasks a letter may be used more than once, or not at all" covered Matching Headings
   too, where ielts.org says "No heading may be used more than once", and Matching Sentence Endings,
   whose lesson warns against reusing an ending. Now names Matching Information and Matching Features,
   and adds "In Matching Headings each heading can be used only once".
3. **Overview said Yes / No / Not Given "normally" sits on Passage 3** (`reading-task1.html`, and RU).
   In the site's own 40 papers, 18 of 30 YNNG tasks are on Passage 3 and 12 are on Passages 1 and 2
   (the focused YNNG practice itself uses Test 17, Passage 1). The YNNG lesson had already dropped the
   "usually Passage 3" claim in September. Now: "often Passage 3", and the task is set on that kind of
   text wherever it comes in the paper.
4. **Headings lesson missing the official "use each heading once" rule** (`reading-headings.html`,
   and RU). Added "Each heading can be used only once" and a trap pill for using the same heading on
   two paragraphs.
5. **Headings strategy card** (`reading-strategies.ts` + RU in `parts/strategies.ts`): the same new
   trap, so the drill screen agrees with the lesson.
6. **Sentence Endings worked example broke its own rule** (`reading-matching-sentence-endings.html`,
   and RU). It said "…refused to believe the mould had any medicinal value" "cannot follow
   grammatically" after "a mould … had…". It can ("had refused" is good English); it fails on
   meaning. In a lesson that teaches "eliminate on grammar first", that was misleading. Now the example
   shows both: an ending that cannot follow "had" at all ("…more effective than any earlier
   treatment"), and the "refused to believe" ending, which fits the grammar but fails on sense.
7. **YNNG lesson described TFNG as "things that are objectively so"** (`reading-ynng.html`, and RU).
   That invites real-world knowledge, which the TFNG lesson rules out. Now: "the information the
   passage gives, not anyone's opinion about it".
8. **Short-answer lesson hedged an official rule** (`reading-short-answer.html`, and RU). The
   strategy step said answers "almost always" follow passage order; ielts.org states "The answers come
   in the same order as the information in the text", and the same lesson's Key Rules already said so.
   "almost always" removed.
9. **TFNG strategy card stated order as a rule** (`reading-strategies.ts` + RU). "answers appear in
   order" contradicted the TFNG lesson ("IELTS does not publish this as a rule ... a guide only"). Now
   uses the lesson's own wording.
10. **YNNG strategy card, same problem** ("Answers come in the same order as the passage"). Now
    matches the YNNG lesson: usually in order, a guide for where to start, never proof of an answer.
11. **Matching Features strategy card dropped the condition** ("That's normal."). The lesson and
    ielts.org say reuse depends on the instructions. Now "That's normal, as long as the instructions
    allow it." (RU updated.)
12. **Diagram strategy card had a wrong official name** ("Diagram / Table Labelling"). The field is
    documented as "the official question type name, exactly as it appears on the real exam paper"; the
    official name is "Diagram Label Completion" (tables are the Summary card's job). Fixed, plus the
    matching comment in the Russian file.

Also changed, not counted as content fixes:
- `learning-focus-reading.ts`: the Russian for "Up to {n} words." was "Не более {n} слов.", which is
  wrong Russian when n is 1 ("не более 1 слов"), and two focused sets do have a one-word limit (Test 24
  Passage 2, Test 3 Passage 1). Now "Лимит слов: {n}.", correct for any number. The English has the
  same bug, see below.
- `src/data/focused/reading-sentence-endings.ts`: corrected a code comment that said no paper contains
  Matching Sentence Endings (see the first item below). No student-facing change.

Russian hashes refreshed for the five changed lessons; `node tools/lesson-ru.mjs check --all`:
76 checked, 0 with problems. No em or en dashes added.

## Left for Alex

- **Two "Sentence Completion" practice sets are really other task types.** In
  `src/data/focused/reading-sentence-completion.ts`, the guided set (Test 14, Passage 3, Q27-32) is a
  flow-chart ("Complete the flow-chart below"), and both independent checks (Test 29 Passage 2 Q22-26,
  Test 37 Passage 1 Q6-10) are Short-answer Questions ("Answer the questions below"). The same goes for
  `reading-table-completion.ts` check B (Test 15 Passage 1), which is sentence completion ("Complete the
  sentences below"). The site has no separate "short-answer" type in its data, so these get grouped
  under the nearest type. The skill is close enough that a student is not misled about the answer form,
  but the title says one thing and the paper says another. Choosing different source groups changes
  which papers are reserved for checks, so I left it as a decision.
- **Matching Sentence Endings has no real practice although 12 real tasks exist** (see below).
  Once the test data is fixed, the authored "Community Gardens" set could be joined or replaced by real
  material.

## Seen but outside my files

1. **Twelve real Matching Sentence Endings tasks are typed as Sentence Completion**
   (`src/data/tests/`): reading-full-002 p3 g2, 006 p3 g2, 008 p3 g2, 013 p1 g1 and p3 g1, 016 p2 g1,
   024 p3 g2, 028 p2 g2, 031 p1 g3, 033 p3 g3, 035 p3 g2, 039 p3 g2 (p = passage, g = question group,
   both counted from 1). Each says "Complete each sentence with the correct ending, A-x" and its answers
   are letters, but the group's `type` is `sentence-completion` and it carries no `options` list. So a
   student who gets these wrong is sent to the Sentence Completion lesson ("write words from the
   passage"), the strategy panel shows the wrong advice, and the generated index thinks the type is
   missing. Fix: type them `sentence-endings` and give each group its endings as options.
2. **Letters reused without the instruction that allows it.** The lessons follow ielts.org: reuse
   happens only when the instructions say "You may use any letter/option more than once". These real
   groups reuse a letter but their instructions do not say so: reading-full-011 p3 g1, 017 p2 g3, 018 p1
   g4, 018 p2 g3, 020 p3 g3, 022 p2 g1, 022 p3 g2, 028 p2 g1, 029 p2 g2, 034 p3 g2, 035 p2 g2, 036 p2 g2,
   037 p3 g3. The NB line was probably lost in import (most are "Classify the following..." tasks,
   which always reuse). Worth checking against the source papers and putting the NB line back.
3. **Answer keys over the word limit** (tests owner): reading-full-037 p1 Q10 accepts "refraction in
   the rainbow" (4 words) under "NO MORE THAN THREE WORDS"; reading-full-040 p2 Q14 accepts "the
   Persian wars" (3 words) under "NO MORE THAN TWO WORDS". The shorter forms in the same keys are
   fine; the over-limit alternatives should go, or the lessons' "4 words when the limit is 3 = wrong"
   is contradicted by the site's own marking.
4. **Lesson practice never states the word limit** (`src/data/reading-practice.ts`): the sentence,
   summary, short-answer and diagram sets say only "using words from the passage". The lessons tell
   students to read the limit every time; the real rubric's limit should be in each unit intro.
5. **Summary practice, table unit** (`reading-practice.ts`, Test 16 Q1-10): blanks 5, 7 and 9 each
   accept any of F, G or J (and 6, 8, 10 any of E, H or I), so the same letter typed in all three is
   marked right three times. The prompts also say "what word goes here?" when the answer is a letter.
6. **Typo in a practice question** (`reading-practice.ts` line 3461): "Which species of Bovinae hos
   now died out?" should be "has".
7. **YNNG practice intro** (`reading-practice.ts`): "These statements test the writer's own opinions
   and claims, not simple facts", but the first unit (Lake Vostok) is plainly factual statements
   ("Lake Vostok was detected by radar"). Either check the source rubric (it may be a TFNG set
   relabelled) or soften the intro.
8. **English "Up to {n} words."** (`src/components/learning/FocusedExercise.tsx` line 659) reads
   "Up to 1 words." on the two one-word-limit focused sets. Needs a singular form for n = 1.
9. **Reading group blurb leaves out YNNG** (`src/data/reading.ts` line 22, Russian in
   `src/lib/i18n/dict/ru/course-data.ts` line 109): "Pick a letter or decide True, False or Not Given."
   heads a group that also holds Yes / No / Not Given. Suggest "Pick a letter, or decide True / False /
   Not Given or Yes / No / Not Given." The key lives in a dictionary I do not own, so I left it.

## Generated file regenerated

`src/data/generated/learning-index.json` was rebuilt with `npm run learning:index`, because the
headings lesson's "How to Approach It" block changed (new trap pill), and the focused headings
exercises link to that block by a content id. Whoever merges several reviewers' work should run
`npm run learning:index` once more after the merge rather than hand-merge that file.

## Tests and proof

- `npm test`: 2481 tests, 2481 pass, 0 fail (the first run caught the stale learning index, fixed above).
- `npx astro check`: 0 errors, 0 warnings.
- `node tools/lesson-ru.mjs check --all`: 76 checked, 0 with problems.
- Dev server on port 4510: the five changed English lesson pages and the five Russian bodies
  (`/lesson-bodies/ru/<slug>.html`) all return 200 and contain the new wording. Server stopped afterwards.
