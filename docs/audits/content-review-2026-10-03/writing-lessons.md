# Writing lessons review (3 October 2026)

Scope: the eleven Writing lessons in English and Russian, the Writing coach
guides (`src/data/writing-structures.ts`), the Writing band guides, the
Writing focused tasks (`src/data/focused/writing-*.ts`) and their Russian.
The 63 model answers were reviewed yesterday
(`docs/audits/writing-models-review-2026-10-02/REPORT.md`) and were not
touched; its four lesson clarifications were kept and checked for agreement
everywhere else.

Checked against: the IELTS Academic Writing format page on ielts.org (60
minutes, Task 1 at least 150 words in about 20 minutes, Task 2 at least 250
words in about 40, Task 2 counts twice as much, no maximum, penalties for
being short, off topic, or written as notes) and the public Writing band
descriptors (May 2023 version, ielts.org; "Any copied rubric must be
discounted").

## What was already right

Every lesson already states the timings, the minimum lengths, the double
weight of Task 2, the four criteria under their official names, and which of
Task Achievement and Task Response belongs to which task. The overview, the
two method lessons and the eight type lessons agree on the paragraph plans,
where the overview goes, that Task 1 needs no conclusion, which essay types
need an opinion, and the tense rules (including yesterday's four
clarifications). The Russian says the same as the English apart from the
items below. No placeholders, broken links or empty sections.

## Fixes (23)

### Lessons (English and Russian, hashes refreshed, `lesson-ru check --all` passes)

1. **Writing overview, missing exam facts.** The lesson never said there is no
   maximum length, or that words copied from the question do not count. Added
   one bullet: "There is no maximum, but words copied straight from the
   question are not counted, so they do not help you reach the minimum."
   (ielts.org format page; descriptors: "Any copied rubric must be discounted".)
2. **Writing overview and How to Answer Task 2: "marked on your English, not
   your ideas".** This contradicted the same lessons' own description of Task
   Response (developed ideas) and the Opinion lesson ("how clearly you develop
   and support it is" graded). Now: "marked on your English and on how well you
   develop your ideas, not on whether they are clever or correct."
3. **How to Answer Task 1, overview band claim.** "Task Achievement asks for a
   clear overview from Band 6 upwards" is wrong in both the current and the
   older descriptors: a *clear* overview is the Band 7 line, Band 6 needs a
   relevant overview. Now says exactly that, and describes Band 5 in the
   descriptor's terms (focuses on details without the bigger picture).
4. **How to Answer Task 2, introduction.** Sentence 2 said "state your
   position" for every essay, but neutral advantages/disadvantages,
   problem/solution and "Discuss both these views" questions ask for no
   opinion, and their lessons tell students to preview instead. Added: "Where
   the question asks for no opinion, say what the essay will cover instead."
5. **How to Answer Task 2, grammar row.** "used correctly more often than not"
   undersold the target. Now "with frequent error-free sentences, which is what
   the Band 7 descriptor asks for".
6. **How to Answer Task 2, "The four-paragraph skeleton never changes".** The
   Discussion lesson (optional Body 3), the Advantages lesson (optional fifth
   paragraph) and the Two-Part lesson (five paragraphs for three questions)
   all allow a fifth paragraph. Now "stays the same (a few question types may
   add one more paragraph, and their lessons say when)".
7. **Charts lesson, tense row.** The static column only said "No dates →
   present simple", though one-date bars and pies are often dated in the past.
   Added "one past date → past simple", matching the method lesson.
8. **Maps lesson, step 1.** "Past → past, past → present decides your tenses
   (past simple + present perfect)" ran two cases together and left out the
   planned-future maps that the same lesson (and yesterday's clarification 3)
   covers. Now lists all three cases with their tenses.
9. **Problem and Solution lesson.** "If the question never says solution,
   solve, measure or address, don't propose any" would wrongly forbid
   solutions for "How can this be tackled?" or "What can be done?". The list
   now includes "tackle" and "What can be done?".
10. **Russian, band numbers.** "начиная с балла 7" (Task 2 method) and "ниже
    балла 7" (Discussion) now say "Band 7", as the translation brief requires.
11. **Russian, Charts lesson.** "никогда не даёте оценку" (never give an
    evaluation) now "никогда не высказываете своё мнение", matching "never give
    an opinion". Task 2 method's Russian "никогда не копируйте её" (it pointed
    at "structure") now says "the question's wording", as the English does.

### Coach guides (`src/data/writing-structures.ts`, Russian in `parts/structures.ts`)

12. Task 1 overview row: the same Band 6 / Band 7 overview error as fix 3, fixed
    the same way.
13. Process notes: two typos, "How many stages are there?." and "Where does it
    start and end?.", now ordinary questions.
14. Maps note: "Past → past, or past → present decides your tenses" now gives
    the three cases and tenses, as in fix 8.

### Band guides (Writing entries only, with Russian)

15. Task Response 5→6 practice told students to write a three-sentence
    conclusion with a "closing thought". The lessons say 1 to 2 sentences and
    no new idea. Now "1 or 2 sentences: a brief summary and your position
    restated in fresh words, with no new idea".
16. Task Response 6→7: "addressing ALL parts of the task in full" overstated
    Band 7 (fully is Band 9). Now "all the main parts of the task properly
    addressed", in line with both descriptor versions.
17. Task Response 6→7: "Repeat your position explicitly in each body
    paragraph" contradicted the Discussion lesson (each body paragraph gives one
    view fairly) and neutral essays (no position). Now "Link each body paragraph
    back to your position where the question asks for one".
18. Task 1 notes added at 5→6 and 6→7. A Task 1 student at band 5 or 6 was
    shown only Task 2 advice (position, conclusions). The overview, which is
    what actually separates Task 1 bands 5, 6 and 7, now has a note at each step.
19. Grammar 4→5, 5→6 and 7→8 explanations named the wrong errors: "many problem
    happen" is a plural error, not subject-verb agreement; "many child not go"
    is missing plurals and a missing auxiliary; the 7→8 sentence has four
    errors (a missing "the"), not three. Explanations corrected.

### Focused Writing tasks ("What to notice" is shown right under a Band 8 paragraph)

20. Five tasks described a paragraph that is not the one shown. Structure range
    quoted "Although alternative medicine is unregulated...", "a claim which few
    studies support" and "more research needs to be conducted": none of these
    are in either model. Support a claim said the paragraph "closes with" an
    example signalled by "for example": neither model does. Topic vocabulary
    named "automation, artificial intelligence, data privacy": neither model
    uses them, and the check paragraph is about newspapers. Avoid repetition
    named "rose, then climbed, then grew" and "a large number of": not in either
    model. Complex sentences talked about "the two original sentences", which a
    Band 8 body paragraph does not have. Each task now has its own notices,
    quoting only words that are in its own paragraph (checked by a script: every
    quoted phrase is found in the paragraph shown).
21. Select key features: the check is a chart, but the notice said "the table
    row by row". The check now has a notice about its own chart.
22. Task 1 overview, process check: the notice said the model overview "carries
    no figures at all", but it says "nine-stage", which the method lesson
    allows. The notice now says that, and the instruction tells the student
    that giving the number of stages is fine, written as a word (the automatic
    "no figures" check counts digits, so "6 stages" would have failed a
    student for following the lesson).
23. Sentence correction ("the number of"): the explanation said "Two slips"
    and then corrected three. Now "Three agreement slips". The topic
    vocabulary check said "on the same subject" when it is on a different one.

Russian for every new or changed sentence is in
`src/lib/i18n/dict/ru/learning-writing-focus.ts`. While checking, two shown
sentences turned out to have had no Russian at all (the cohesion notice, whose
English never matched its dictionary key, and the do/make correction note);
both now have it.

Also: the comments in `src/data/model-answers.ts` said 60 models and "3 bands
for most prompts"; there are 63, all Band 8. Comments only.

## Left for Alex

- **Which version of the band descriptors the site quotes.** The AI grader
  (`workers/grade-essay`) and the band guides follow the older public
  descriptors ("presents a clear position throughout", "rare minor errors
  occur only as slips"). IELTS replaced them in May 2023 ("A clear and
  developed position is presented", "Minor errors ... are extremely rare").
  The meaning is close and nothing a student is told is wrong because of it,
  and I made every fix above true under both versions. Moving the grader to
  the 2023 wording would change a calibrated grader, so it is your call.
- **Rounding of the Writing band.** The overview says "(Task 1 + Task 2 × 2)
  ÷ 3, rounded to the nearest half band". IELTS publishes the double weight
  but not the exact rounding rule for Writing. Left as written (the 15 Sept
  audit kept it too).

## Seen but outside my files

- `src/data/writing-prompts-imported.ts`, prompt `pte-wt-112-task2`
  (line 674): "Give reasons for your and answer" should be "Give reasons for
  your answer". Publisher typo, same kind as the three fixed yesterday.
- `src/lib/i18n/dict/ru/learning-objectives.ts`: these keys are now unused
  because their English changed (fix 20, 23). They do no harm but can be
  deleted: the two old structure-range notices ("It opens with one structure
  (a subordinate clause: ..." and "A passive appears where the doer genuinely
  does not matter ("more research needs to be conducted")..."), the old
  support-a-claim third notice ("It closes with a specific example..."), the
  old topic-vocabulary first notice ("It names the specific technology at
  issue (automation, ...") and its check instruction ("... on the same
  subject ..."), the two old avoid-repetition notices ("When two figures move
  the same way..." and "Quantity phrases vary too..."), and the three old
  complex-sentences notices ("It joins the two ideas with one subordinate
  clause...", "The subordinating word it chooses...", "Nothing from either
  original sentence is lost..."). Line 262 also holds a cohesion notice whose
  key ends "(firstly, moreover)." while the English shown has no such ending;
  its working Russian is now in learning-writing-focus.ts.
- `src/data/generated/learning-index.json` was regenerated (`npm run
  learning:index`) because lesson block hashes changed. Other reviewers'
  lesson edits will change it too: after merging, run `npm run learning:index`
  once more rather than resolving the JSON by hand.
- `src/components/learning/written-focused-task.ts` line 182: the "no
  figures" check treats any digit as a figure, so "a 7-stage process" fails a
  process overview that the lesson allows. Fix 22 works around it in the
  instruction; the check itself could allow a digit followed by "stage".

## Proof

- `npm test`: 2,481 tests, all pass (after regenerating the learning index).
- `npx astro check`: 0 errors, 0 warnings.
- Dev server on port 4530: every changed English lesson page and every
  changed Russian lesson body was fetched and contains the new wording.
- `node tools/lesson-ru.mjs check --all`: 76 checked, 0 with problems.
- A script compared every quoted phrase in every Writing focused task's
  notices with the model paragraph shown beside it, and confirmed every shown
  sentence has Russian.
