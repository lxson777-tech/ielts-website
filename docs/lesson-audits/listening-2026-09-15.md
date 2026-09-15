# Listening lesson accuracy audit

Date: 2026-09-15
Worktree: C:\Users\Alex\Desktop\ielts-deploy (branch deploy/platform-2026-09-15)
Scope: src/content/lesson-bodies/listening*.html (the overview plus the 10 lessons in LISTENING_PARTS)
Patch script: audit-listening/patch_listening.py (25 exact-match replacements, each required to match exactly once)

## Official sources used

| Source | What it settled |
|---|---|
| ielts.org, IELTS Academic: Listening test format | 4 parts, 10 questions per part, 40 questions, ~30 minutes, recordings heard once only, accents, Part 1 to 4 content, 1 mark per correct answer, the six question-type names |
| ielts.org, IELTS General Training: Listening test format | Listening is identical for Academic and General Training; answers come in order |
| ielts.org, Academic test format in detail | Official definition of each of the six question types |
| ielts.org, IELTS scoring in detail | 40 questions, 1 mark each; Band 5 ~16, Band 6 ~23, Band 7 ~30, Band 8 ~35; "the precise number of marks needed... will vary slightly from test version to test version" |
| IDP ielts.com.au, Listening question types | Multiple choice can be a question with three options OR a sentence stem with three endings; labelling answers "can usually" be selected from a list, so not always; hyphenated words count as single words; contractions are never tested; over the word limit is marked incorrect |
| British Council / IDP, IELTS on computer, Listening | No transfer time on computer; 2 minutes to check answers at the end |

British Council takeielts.britishcouncil.org repeatedly timed out or reset during this audit. Every fact below was confirmed on ielts.org or IDP instead, so nothing rests on an unreachable source.

## Summary table

| Lesson | Claims checked | Wrong | Edits made | Left unverified |
|---|---|---|---|---|
| listening.html (overview) | 14 | 2 | 3 | 0 |
| listening-part1.html | 13 | 3 | 5 | 0 |
| listening-part2.html | 12 | 1 | 2 | 1 |
| listening-part3.html | 11 | 2 | 2 | 1 |
| listening-part4.html | 11 | 1 | 1 | 1 |
| listening-multiple-choice.html | 13 | 3 | 4 | 1 |
| listening-matching.html | 12 | 1 | 2 | 1 |
| listening-map-labelling.html | 12 | 3 | 3 | 0 |
| listening-form-completion.html | 12 | 0 (1 gap) | 1 | 1 |
| listening-sentence-completion.html | 11 | 0 (1 gap) | 1 | 1 |
| listening-short-answer.html | 12 | 0 (1 gap) | 1 | 1 |
| Total | 133 | 16 | 25 | 9 |

The single most serious error was in the Multiple Choice lesson: it told students that a "choose TWO letters" question scores nothing if only one letter is right. It scores one mark.

---

## listening.html (overview)

Correct and left alone: approximately 30 minutes; 10 minutes transfer time on paper and a 2-minute check on computer; 40 questions across 4 parts, 1 mark each; recording played once only; difficulty rises from Part 1 to Part 4; no negative marking; the band conversion rows (39-40 = 9.0 down to 23-25 = 6.0, which match the official thresholds of about 16 for Band 5, 23 for Band 6, 30 for Band 7, 35 for Band 8); the strategy advice about preview time, following questions in order, and listening for corrections.

Wrong or incomplete, now fixed:

1. The band table was presented as exact, with no caveat. IELTS states the thresholds vary by test version. Added under the table: "Approximate. IELTS states that the exact number of marks needed for each band varies slightly from one test version to another."
2. A duplicate bullet repeated the bullet above it and crowded out two facts students need.
   - Before: "One test: four recorded parts, 40 questions"
   - After: one bullet on accents (British, Australian, New Zealand and North American) and one stating that the same Listening test is taken by Academic and General Training candidates.
   - The questions bullet also gained "10 questions in each part".
3. The spelling note told students to check spelling "during the transfer time", which only exists on the paper test.
   - Before: "Unlike Reading, a misspelled answer in Listening is marked wrong. Double-check your spelling during the transfer time."
   - After: "A misspelled answer in Listening is marked wrong. Double-check your spelling before you finish: on the paper test use the 10 minutes of transfer time, on the computer-delivered test use the 2-minute check at the end."

---

## listening-part1.html

Correct and left alone: answers are mostly names, numbers, addresses, dates and times; names spelled out letter by letter; the -teen versus -ty trap; corrections carry the answer; answers come in sequence; the transfer-time note-box was already accurate. The Sports Centre Registration transcript is clearly labelled a simulation, so it is not presented as real test material and needed no substitution.

Wrong, now fixed:

1. Part 1's official context.
   - Before: "Conversation between two people in an everyday, transactional situation"
   - After: "Conversation between two speakers in an everyday social context, usually transactional"
2. The word-limit bullet quoted the rubric in lower case and omitted the two rules students most often get wrong.
   - Before: Word limits: "no more than two words and/or a number" is enforced strictly
   - After: Word limits: an instruction such as "NO MORE THAN TWO WORDS AND/OR A NUMBER" is enforced strictly. A number counts as one word, and a hyphenated word such as "check-in" counts as one word
3. A date-format claim that is not safe.
   - Before: Dates can be written several ways: "the fifth of March" gives 5th March or 5/3, both acceptable.
   - After: Dates can be written with figures and words: "the fifth of March" can be written 5 March or 5th March. Avoid all-figure forms such as 5/3, because day-first and month-first conventions differ.
   No official source says an all-numeral date is accepted, and the day-first versus month-first ambiguity makes it a real risk.
4. The practice rubric was written in mixed case, unlike the real exam.
   - Before: Complete the Registration Form (NO MORE than three words and/or a number)
   - After: Complete the Registration Form (NO MORE THAN THREE WORDS AND/OR A NUMBER)
5. The answer key repeated the unsafe all-numeral date.
   - Before: 14th March 1992 (or 14/3/1992)
   - After: 14 March 1992 (or 14th March 1992)

---

## listening-part2.html

Correct and left alone: the examples (guide, radio presenter, induction talk); the typical question types for Part 2; studying the map before the recording starts; answers given relative to landmarks; the location-language list, all nine phrases of which are standard IELTS map vocabulary; the strategy list; the Community Centre Tour simulation.

Wrong or incomplete, now fixed:

1. Part 2's official description.
   - Before: "One speaker in a non-academic, social context"
   - After: "One main speaker, a monologue in an everyday social context"
2. Two accuracy hedges added to the map card: the speaker "usually" rather than "almost always" moves in one direction, and a new bullet stating that labelling answers are usually a letter chosen from a printed list but are sometimes words taken from the recording within a word limit. IDP's wording is "You can usually select your answers from a list", so "always a letter" would be an overstatement.

Left unverified: the claim that map labelling, multiple choice and matching are the most common types in Part 2. IELTS publishes no frequency data. It is written as a tendency, not a rule, so it stands.

---

## listening-part3.html

Correct and left alone: the educational and training context; the examples; the distractor analysis; the strategy list; the multiple-choice exercise and its explanations, which are internally consistent with the simulated transcript.

Wrong, now fixed:

1. Speaker count phrasing.
   - Before: "Conversation between 2-4 speakers in an educational or training setting"
   - After: "Conversation between up to four people in an educational or training context"
   ielts.org describes Part 3 as "a conversation between two main speakers". "Up to four people" is the standard formulation covering both, whereas "2-4" read as if four-speaker Part 3s were routine.
2. An internal contradiction. The lesson's opening line said the most common types here are multiple choice, matching and form, note, table or flow-chart completion, but the card below listed multiple choice, matching, sentence completion.
   - Before: "Typical question types: multiple choice, matching, sentence completion"
   - After: "Typical question types: multiple choice, matching, sentence completion and note or table completion"

Left unverified: which types are most common in Part 3.

---

## listening-part4.html

Correct and left alone: one speaker on an academic subject; the example topics; note, summary and sentence completion as the typical types; predicting word class from the gap; the completed sentence must be grammatical; answers follow the order of the recording; gaps take concrete content words; the signpost-language strategy; the transfer-time parenthetical; the Urban Beekeeping simulation and its answer key, which matches its own transcript.

Wrong, now fixed:

1. Outdated terminology plus an absolute claim.
   - Before: "Dense academic language, fast pace, and no pause in the middle, unlike other sections"
   - After: "Dense academic language, fast pace, and usually no pause in the middle, unlike Parts 1 to 3"
   IELTS renamed Sections to Parts, and this was the only remaining use of the old term in the IELTS sense across all eleven lesson bodies. "Usually" was added because the absence of a mid-part pause is the normal pattern in published tests rather than a published rule.

Left unverified: that Part 4 never contains a pause. Hedged rather than removed.
---

## listening-multiple-choice.html

Correct and left alone: the official name; the rubrics "Choose the correct letter, A, B or C" and "Choose TWO letters, A-E"; the answer is a letter, never a word; the letters may be written in any order; the recording usually mentions every option; options are deliberately close in length and grammar; the whole approach list; the three trap pills; the Staff Induction transcript, labelled a simulation.

Wrong, now fixed:

1. The most serious error in the whole set. The lesson told students a half-right "choose TWO" answer scores zero. IELTS awards one mark per correct answer, and a "choose TWO" task occupies two of the 40 question numbers, so one correct letter is worth one mark.
   - Before: For a "choose TWO" question, both letters must be correct. You get no mark for one out of two
   - After: A "choose TWO" task fills two of the 40 question numbers and carries two marks, one for each correct letter, so one right letter still earns one mark
2. The note-box further down contradicted that same bullet. It is now consistent.
   - Before: "These are marked as two separate points of information hidden inside one question."
   - After: "These take up two of the 40 question numbers and are marked as two separate points, one mark for each correct letter."
3. An over-generalised ordering claim.
   - Before: "Answers come in the order you hear them, exactly as in every other listening question type"
   - After: "The questions come in the order you hear them: question 2 is answered after question 1, never before"
   The "exactly as in every other question type" clause clashed with this site's own Matching and Map Labelling lessons, which correctly note that the order on the page is not the order of the lettered options. The replacement states the part that is true of every type.
4. Added the missing half of the official definition: multiple choice can be a question with three options, or the first half of a sentence with three possible endings. The lesson described only the first.

Left unverified: "Appears most often in Parts 2 and 3, occasionally in Part 4." No published frequency data exists.

---

## listening-matching.html

Correct and left alone: the official name; the rubric example; the task description; more statements than questions; a letter is normally used once unless the instructions say otherwise; answers follow the order the items are mentioned in the recording, not the order of the box; box wording is a paraphrase; the approach list; all three trap pills; the Evening Classes transcript, labelled a simulation.

Wrong, now fixed:

1. An absolute claim used as a self-check rule.
   - Before: "At the end, at least one statement in the box should be left over. If you have used every single one, go back and check the two answers you are least sure of."
   - After: "At the end, at least one statement in the box is usually left over. Check the instruction line first, though, because some tasks use every option and some allow a letter to be used more than once."
   As written, a student sitting a matching task that uses every option, or that allows reuse (which the lesson itself acknowledges two bullets earlier), would have gone back and changed correct answers.
2. Terminology: "In the pause before this section" became "before this part".

Left unverified: "Appears most often in Parts 2 and 3."

---

## listening-map-labelling.html

Correct and left alone: the task covers plans, maps and diagrams; the rubric example for the lettered variant; find the compass or the "you are here" point first; answers follow the order you hear them rather than the order of the letters; the whole approach list; all three trap pills; the honest note-box explaining that this lesson has no printed image and describes the layout in words instead; the Riverside Park Tour transcript, labelled a simulation, whose compass directions are internally consistent.

Wrong, now fixed:

1. The answer format was stated as letters only. The official IDP wording is that you can usually select answers from a list, which means some labelling tasks require words from the recording within a word limit. A student drilled only on letters would be caught out.
   - Before: "Answer format: a single letter for each question"
   - After: "Answer format: usually a single letter chosen from a list printed on the question paper, but sometimes a word or words taken from the recording within a word limit. The instruction line tells you which"
   - The rubric bullet and the task description were updated to match, and "a set of pictures" was added to the list of visuals, since it is in the official definition.
2. Placement overstated.
   - Before: "Appears most often in Part 2, and very occasionally in Part 4 for a diagram"
   - After: "Appears most often in Part 2. A diagram of an object or process can also turn up in Parts 3 and 4"
3. Two absolutes softened: the speaker "usually" moves in one continuous direction rather than "almost never backtracking"; and "Some letters on the map are never used" became "When you choose from a lettered list there are usually more letters than questions, so some are never used", since the old wording made no sense for the word-answer variant.

---

## listening-form-completion.html

Correct and left alone, and this was already the most accurate lesson of the eleven: the four formats are one official type; the rubric; answers are the exact words or numbers heard; forms and notes dominate Part 1 while tables and flow-charts appear more in Parts 3 and 4; over the word limit is marked wrong; spelling must be correct; numbers, dates and codes copied exactly; answers follow the order of the form top to bottom; the approach list; the trap pills; the spelling note-box; the Broadband Installation transcript, labelled a simulation.

Gap filled. Nothing here was wrong, but one official rule was missing. Added: a number counts as one word, a hyphenated word such as check-in counts as one word, and contracted forms are never tested. This is the most common source of wasted marks in completion tasks and was stated nowhere in the lesson.

Left unverified: that forms and notes dominate Part 1 and that tables and flow-charts appear more in Parts 3 and 4.

---

## listening-sentence-completion.html

Correct and left alone: the official name; the rubric; the task description; the completed sentence must be grammatical; words come directly from the recording; answers follow the order of the sentences; spelling and word limit both marked strictly; the approach list; all three trap pills; the grammar note-box; the Sleep and Memory transcript, labelled a simulation.

Gap filled. Added: a number counts as one word and a hyphenated word counts as one word, so well-known fits a one-word limit.

Left unverified: "Appears most often in Part 4, and sometimes in Part 3."

---

## listening-short-answer.html

Correct and left alone, and this lesson already had the word-limit mechanics right: the official name; the rubric; a hyphenated word counts as one word, with self-guided as the example; figures are accepted for numbers; use words from the recording; answers follow the order of the questions; the approach list; the trap pills; the short-answers-stay-short note-box; the Local History Museum transcript, labelled a simulation, whose facts match the note-box example (the audio tour is in four languages).

Gap filled: the figures bullet now also states that a number counts as one word against the limit, which is the rule students actually need when the limit reads "TWO WORDS AND/OR A NUMBER".

Left unverified: "Appears most often in Part 1, and sometimes in Part 3."

---

## Checked and found clean across all eleven files

- No "Section" terminology in the IELTS sense remains. The single instance, in the Part 4 lesson, is fixed. The only surviving uses are the CSS class "section", the anchor id "sections" and the nav aria-label "Lesson sections", which refer to page sections rather than IELTS Parts.
- No General Training references. Nothing implied a separate GT Listening test, and the overview now states positively that both take the same test.
- No invented material presented as real. Every transcript in all eleven lessons is explicitly labelled "Simulation". None claims to quote a real exam, so no substitution from src/data/tests/listening-full-0NN.ts was required.
- No em or en dashes were introduced. The patch script asserts this; the files were clean before the edits and are clean after.
- Each lesson's answer key is internally consistent with its own transcript.

## Out of scope, worth flagging to Alex

These are real inaccuracies that sit outside the files this task was allowed to touch.

1. src/data/lessons.ts line 90 describes the Listening paper as "Section-by-section strategies for the listening paper." Section is the retired IELTS term; it should read Part-by-part. This is the last remaining use of the old term on the Listening side of the site.
2. src/data/listening.ts line 50 gives Part 3 the eyebrow "2-4 speakers", the same phrasing corrected inside the Part 3 lesson body. Suggest "Up to four speakers".
3. src/data/listening.ts line 91 gives Form, Note, Table and Flow-chart Completion the eyebrow "Most common in Parts 1 and 4", while the lesson body says Parts 1, 3 and 4. A minor inconsistency rather than a factual error.
4. The six question-type lessons each end with a transcript but no questions on the page. The questions presumably come from the interactive practice data that another agent is replacing. Worth confirming, once that work lands, that every one of these six lessons actually gets its drill.

## Verification

- npx astro check: 0 errors, 0 warnings, 13 hints across 242 files. The hints are pre-existing and all sit in src/pages/trainers/, unrelated to these files.
- npm run build: 514 pages built, Complete, in 22.86s.
- Fixes confirmed in the built output, not only in the source. dist/lessons/listening.html, dist/lessons/listening/part3.html, dist/lessons/listening/part4.html, dist/lessons/listening/multiple-choice.html and dist/lessons/listening/map-labelling.html all contain the corrected text.
- git add was run on the eleven changed files. Not committed, not pushed, not deployed.
