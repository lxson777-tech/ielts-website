# Writing and Speaking lesson accuracy audit

Worktree: C:\Users\Alex\Desktop\ielts-deploy (branch deploy/platform-2026-09-15).
Date: 2026-09-15. 15 lesson bodies plus 2 data files checked; 17 files changed, none committed.

## Sources used for the facts

- IELTS.org, Academic Writing test format (60 minutes; Task 1 about 20 minutes and 150 words
  minimum; Task 2 about 40 minutes and 250 words minimum; Task 2 "contributes twice as much as
  Task 1"; four criteria named Task achievement/response, Coherence and cohesion, Lexical
  resource, Grammatical range and accuracy; penalties for off-topic content, for notes or
  bullet points instead of connected text, and for copied or memorised material).
- IELTS.org, Academic Speaking test format (11 to 14 minutes; Part 1 4 to 5 minutes on familiar
  topics; Part 2 task card, one minute preparation, 2 minutes speaking, then one or two
  follow-up questions, 3 to 4 minutes in total; Part 3 4 to 5 minutes of more general and
  abstract discussion; four criteria, certified examiners, test recorded).
- The official public band descriptors as quoted verbatim in this repo:
  workers/grade-essay/src/index.ts (Task Achievement Academic, Task Response, Coherence and
  Cohesion, Lexical Resource, Grammatical Range and Accuracy) and
  workers/grade-speaking/src/index.ts (Fluency and Coherence, Lexical Resource, Grammatical
  Range and Accuracy, Pronunciation).
- The chart, diagram and map images themselves (public/pics/writing/*.png), read directly to
  check each model report against the picture beside it.

## Summary table

| Lesson | Claims checked | Wrong | Reworded from rule to advice | Left unverified |
|---|---|---|---|---|
| writing.html | 14 | 3 | 1 | 1 |
| writing-method.html | 16 | 2 | 4 | 0 |
| writing-task2-method.html | 15 | 1 | 4 | 1 |
| writing-charts.html | 30 | 8 | 2 | 2 |
| writing-process.html | 12 | 2 | 0 | 0 |
| writing-maps.html | 11 | 2 | 1 | 0 |
| writing-opinion.html | 12 | 3 | 2 | 1 |
| writing-discussion.html | 10 | 2 | 0 | 0 |
| writing-advantages.html | 10 | 0 | 1 | 1 |
| writing-problem.html | 12 | 0 | 2 | 1 |
| writing-twopart.html | 10 | 1 | 0 | 3 |
| speaking.html | 13 | 1 | 0 | 1 |
| speaking-part1.html | 18 | 4 | 2 | 2 |
| speaking-part2.html | 15 | 3 | 1 | 1 |
| speaking-part3.html | 10 | 1 | 0 | 1 |
| writing-structures.ts | 3 | 1 | 2 | 0 |
| speaking-structure-guides.ts | 1 | 1 | 0 | 0 |

"Wrong" means a claim that contradicts the official format, the official descriptors, or the
picture printed next to it. No General Training or letter-writing content was found anywhere
in scope.

---

## writing.html (Writing Overview)

Correct and left alone: 60 minutes total, 20/40 minute split, 150/250 word minimums, Task 2
worth double, no choice of question, four criteria weighted equally at 25% each, whole band per
criterion, overall band = (Task 1 + Task 2 x 2) / 3 rounded to the nearest half band, memorised
answers penalised, Task 2 first is allowed, no specialist knowledge needed.

Fixed:

1. Penalty wording was softer than the official rule, and the off-topic penalty was missing.
   - Before: "Notes and bullet points are not assessed. Answers must be fully written out"
   - After: "Answers must be written as one connected piece of text. Notes and bullet points
     are penalised", plus a new bullet: "An answer that does not relate to the topic is
     penalised, however good the English is"
2. "No conclusion" stated as a rule for Task 1. There is no such official rule; what is
   official is that Task 1 asks you to summarise the visual, not to give a view.
   - Before: "Facts only. No opinion, no conclusion."
   - After: "Facts only: the task asks you to summarise what the visual shows, not what you
     think of it."
3. Arithmetic error in the note box. A Band 7 essay with a Band 6 report gives
   (6 + 14) / 3 = 6.67, which rounds to 6.5, not "6.5-7".
   - Before: "a Band 7 essay with a Band 6 report already averages 6.5-7"
   - After: "your essay moves your Writing band twice as far as your report does"
4. Clarity (not an error): the criteria table's "Task Achievement / Task Response" now labels
   which name belongs to which task.

Unverified: the claim that the test is "often taken on a different day from the written
papers". True in practice at most centres but not a published rule, so left as written.

## writing-method.html (How to Answer Task 1)

Correct and left alone: report not essay, 20 minutes, 150 words minimum, worth a third of the
Writing marks, select key features rather than list every number, tense guidance, criterion
names.

Fixed:

1. "No numbers" in the overview was given as a rule, and the Band 5 cap was asserted flatly.
   - Before: "Give the 2-3 key features ... No numbers. Without a clear overview your Task
     Achievement is capped around Band 5."
   - After: "... Figures are better saved for the detail paragraphs. Task Achievement asks for
     a clear overview from Band 6 upwards, and the Band 5 descriptor is written for a report
     that recounts detail with no clear overview."
2. "No explanation of causes, no conclusion" as facts.
   - Before: "No opinion, no explanation of causes, no conclusion: only what the data shows"
   - After: "No personal opinion, and no guessing at why the figures moved: report only what
     the visual shows"
3. The criteria table mentioned a letter format, which does not exist in Academic, and this
   site is Academic only.
   - Before: "right format (report, not letter or essay)"
   - After: "right format (a report, not an essay)"
4. The "Golden rules" box listed teaching conventions as prohibitions.
   - Before: "... Never write a conclusion. Never spend more than 20 minutes."
   - After: "... A separate conclusion is not required, and simply repeating the overview at
     the end earns nothing extra. Try not to spend more than 20 minutes ..."
5. "Under 150 words = automatic Task Achievement penalty" softened to "Under 150 words is
   penalised under Task Achievement".
6. Added one line saying the four-paragraph shape is a teaching structure, not an official
   requirement: the criteria ask for logical paragraphing and an overview, not a paragraph
   count.

## writing-task2-method.html (How to Answer Task 2)

Correct and left alone: 40 minutes, 250 word minimum, worth twice Task 1, marked on English not
ideas, criterion names and what each covers, the 40-minute plan.

Fixed:

1. Wrong as an absolute: a discussion prompt that does not ask for your opinion does not
   require a personal position.
   - Before: "A clear, consistent position is compulsory in every essay type, even the ones
     that ask you to discuss both sides"
   - After: "Wherever the question asks for your opinion, a clear and consistent position is
     required: Task Response asks for a clear position throughout from Band 7 up. If a question
     only asks you to discuss both views, you do not have to take a side, but the essay still
     needs one clear line running through it"
2. Memorised-answer penalty now grounded in the descriptor (a wholly memorised response scores
   zero) instead of "Examiners are trained to spot them, and it is heavily penalised".
3. "No new ideas or examples" in the conclusion reworded as advice ("Better to keep new ideas
   and examples out").
4. "Under 250 words = automatic Task Response penalty" softened the same way as Task 1.
5. Added the same note that the four-paragraph skeleton is a teaching structure, not a rule.

Unverified: "Roughly 270-320 words is the sweet spot". A teaching heuristic, consistent with
the minimum, left as written because it is already framed as a target rather than a rule.

## writing-charts.html (Charts, Graphs and Tables)

This lesson had the most problems: model reports labelled "Band 8+" that did not match the
images beside them, plus three sentence fragments inside those samples (the Band 8 Grammatical
Range and Accuracy descriptor requires "the majority of sentences are error-free", so fragments
contradict the band claimed).

Line graph (image checked: agriculture 46% to 8%, manufacturing 26% to 18%, services 30% to
about 62%; services crosses agriculture around 1991 at about 35%; agriculture falls below
manufacturing around 2007 at just over 20%; services is above manufacturing for the whole
period):

1. Overview claimed services overtook both other sectors. It never overtook manufacturing,
   because it started above it.
   - Before: "which overtook both of the other sectors during the period"
   - After: "which overtook agriculture during the period"
2. The crossover description was wrong and internally inconsistent (manufacturing was said to
   be at "roughly a third" in 1990 after starting at 25%).
   - Before: "It overtook manufacturing at around 1990, when both stood at roughly a third of
     the workforce, and went on to overtake agriculture too by the mid-2000s"
   - After: "Already slightly ahead of manufacturing at the start, it overtook agriculture at
     around 1991, when both stood at roughly 35% of the workforce"
3. End figure for services did not match the graph.
   - Before: "expanding consistently from 30% in 1980 to 74% by 2020 ... almost three times the
     combined share of the other two sectors"
   - After: "expanding consistently from 30% in 1980 to around 62% by 2020 ... well over twice
     the combined share of the other two sectors"
4. Agriculture's fall was called "A drop of well over half" (a sentence fragment, and an
   understatement of a fall from 46% to 8%), and manufacturing's decline was said to be
   concentrated in the final decade, which the graph does not show.
   - After: "a drop of well over three quarters ... The two declining lines crossed at around
     2007, at just over 20%, after which manufacturing became the larger employer of the two."
5. Both copies of the line graph's alt text said services overtook manufacturing around 1990.
   Corrected to services overtaking agriculture around 1991, and agriculture falling below
   manufacturing around 2007.

Bar chart (image checked: Norway 81/95, South Korea 76/94, Brazil 34/70, India 36/74, Nigeria
18/61; every figure in the model is correct):

6. The model inferred wealth from a chart that shows only internet access.
   - Before: "the two wealthiest countries"
   - After: "the two leading countries"

Pie charts (image checked: every figure in the model is correct, including "rising eightfold"
and "less than a third of its 2000 level"):

7. Sentence fragment removed: "generating 55% of the country's electricity. More than the other
   four sources combined." is now one sentence joined with a comma.

Table (Finland 12/14/15, Japan 10/9/11, USA 8/7/6, Brazil 3/4/6):

8. Brazil was described twice as dipping and recovering. It rises at every reading.
   - Before (overview): "Japan and Brazil both experienced a dip followed by a recovery"
   - After: "Japan dipped before recovering and Brazil rose steadily throughout"
   - Before (body): "Brazil ... doubled its figure from 3 to 6 over the two decades despite a
     small dip to 4 in 2010"
   - After: "Brazil ... climbed steadily from 3 to 4 and then to 6, doubling its figure over
     the two decades"
9. Sentence fragment removed: "... having dipped to 7 in the intervening decade. The only
   steady downward trend among the four countries." now joined with a comma.

Common mistakes list:

10. "No overview. An instant Task Achievement ceiling of Band 5" reworded to point at the Band
    5 descriptor rather than assert a hard ceiling.
11. "Writing a conclusion or giving an opinion" replaced with "Giving an opinion, or explaining
    causes the data does not show", since a conclusion is a style choice and the opinion is the
    actual task issue.

Unverified: the claim that combination questions are "a common mixed question", and the "report
the extremes, not the middle" advice for tables. Both are reasonable teaching guidance and
neither contradicts anything official, so both were left.

## writing-process.html (Process Diagrams)

Diagram checked (process-example-glass-recycling.png): 7 boxes, Collection, Transport to plant,
Washing, Sorting by colour, Crushing, Melting, Moulding into new bottles, then "cycle repeats".
The model's "seven stages" is correct.

Fixed:

1. The model invented an eighth stage that is not on the diagram.
   - Before: "ending with the sale of products made from reclaimed glass"
   - After: "ending with molten glass being moulded into new bottles, which then re-enter the
     process"
2. The model invented detail the diagram does not carry ("high-pressure water", and three named
   glass colours), in a lesson that elsewhere tells students not to invent stages.
   - Before: "washed in high-pressure water in order to remove any impurities, before being
     sorted by colour into clear, green and brown glass"
   - After: "washed in order to remove any impurities, before being sorted by colour"
3. The model checklist now also credits the overview for saying the process is cyclical, which
   it does.

Correct and left alone: present simple, passive for man-made and active for natural processes,
overview counts the stages and names start and end, every stage must be mentioned (Band 4
descriptor: "does not cover all key features").

## writing-maps.html (Maps and Plans)

Maps checked (maps-example-riverside.png): warehouses on the northern bank replaced by a park
and marina; fish market on the southern bank replaced by restaurants; the stone bridge is gone
and a ring road crosses at the same point; farmland is largely built over but strips remain on
the eastern edge.

Fixed:

1. "Almost all of its agricultural land has been developed" overstated it; farmland survives on
   the eastern edge. Changed to "Most of its agricultural land has been built on".
2. "the old stone bridge was widened to carry the new ring road" is not what the maps show: the
   stone bridge is gone. Changed to "the old stone bridge has given way to a wider crossing
   carrying the new ring road".
3. "examiners reward spotting them" (about unchanged features) replaced with the reason it
   helps: it shows you compared both maps rather than describing one.

Correct and left alone: the location, addition, removal, replacement and expansion language,
the past simple plus present perfect tense guidance, and the four kinds of change.

## writing-opinion.html (Opinion Essays)

Fixed:

1. "The most common Task 2 type" is not published by IELTS. Changed to "One of the most common
   Task 2 types".
2. Wrong as written: Task Response does grade how ideas are developed and supported.
   - Before: "Ideas are not graded. clarity of argument is."
   - After: "Whether your opinion is right is not graded, but how clearly you develop and
     support it is."
   (This also fixed a mis-cased <Strong> tag that made the sentence render with a lowercase
   letter after a full stop.)
3. Sentence fragment in the model body paragraph, which is presented as strong writing:
   - Before: "... speak to relatives abroad every week. Conversations that a generation ago
     would have been reduced to one expensive phone call a year."
   - After: "... speak to relatives abroad every week, conversations that a generation ago
     would have been reduced to one expensive phone call a year."
4. "One well-defended side scores higher than a wobbly balance" reworded to "is far easier to
   keep consistent than", since the descriptors promise no such thing.
5. "No new ideas" in the conclusion reworded as advice.

Correct and left alone: "To what extent do you agree or disagree?" and "Do you agree or
disagree?" both require your own position; a partial position is acceptable; the position
language table.

Unverified: "a partial position needs more skill to keep consistent". Teaching judgement, left.

## writing-discussion.html (Discussion Essays)

Fixed:

1. Missing question variant. The lesson only described "Discuss both views and give your own
   opinion" and did not mention prompts that stop at "Discuss both these views." Added: in that
   case only the first two jobs are set, and the essay should not be built around a personal
   verdict.
2. Band claim did not match the descriptors. "Presents a clear position throughout the
   response" is the Band 7 line, so an unclear position keeps you below 7 rather than capping
   at 6.
   - Before: "an unclear position caps Task Response at Band 6"
   - After: "an unclear position keeps Task Response below Band 7, which asks for a clear
     position throughout the response"

Correct and left alone: both views must be covered, your own opinion must be explicit, the
voice-signalling language, the optional fifth paragraph.

## writing-advantages.html (Advantages and Disadvantages)

No factual errors found. The two forms are correctly distinguished ("What are the advantages
and disadvantages?" needs no verdict; "Do the advantages outweigh the disadvantages?" does),
and the lesson already flags the five-paragraph variant as a teacher preference rather than a
rule.

Fixed:

1. "the single most common error on this essay type" softened to "a common and costly error"
   (frequency is not published).
2. Mis-cased <Em> opening tag corrected to <em>.

Unverified: the model introduction and conclusion carry no band label, so there is no band
claim to check.

## writing-problem.html (Problem and Solution)

No factual errors found. The four patterns (cause + solution, problem + solution, cause +
effect, solution-only) and the warning not to add solutions to a cause + effect question are
accurate.

Reworded from assertion to accurate consequence:

1. "a solution to an unmentioned problem earns nothing" to "reads as unconnected".
2. "which caps Task Response regardless of how well the paragraph is written" to "so the
   material counts as irrelevant however well it is written, and it eats the space the real
   questions needed" (the Band 5 descriptor's "there may be irrelevant detail" is the actual
   mechanism).

Unverified: whether London and Singapore congestion charging "directly reduces the number of
vehicles" is accurate in detail. It is an essay example, not a claim about the exam, and IELTS
does not fact-check candidates' examples, so it was left.

## writing-twopart.html (Two-Part Questions)

Fixed:

1. "Every question carries equal weight" is not stated anywhere official. Reworded to "Treat
   every question as equally important: all of them must be answered fully, because Task
   Response asks you to address all parts of the task."

Correct and left alone: the type is really "direct question" essays, the number of questions
varies, an opinion requirement can be smuggled into one of the questions.

Unverified and left as written because each is already hedged: "one question, rare", "two
questions, the standard, most common form", "three questions, occasional". IELTS publishes no
frequency data for question forms.

## speaking.html (Speaking Overview)

Correct and left alone: 11 to 14 minutes, three parts always in the same order, Part 1 4 to 5
minutes, Part 2 3 to 4 minutes, Part 3 4 to 5 minutes, one test for every candidate, recorded,
no right answers, four criteria weighted equally at 25%, criterion names exactly as published,
accent not penalised, memorised speeches penalised, never taken with a computer.

Fixed:

1. Part 2 was described as ending with the talk. Officially the examiner then asks one or two
   questions on the same topic.
   - Before: "1 minute to prepare, then speak for up to 2 minutes alone."
   - After: "1 minute to prepare, then speak for 1 to 2 minutes alone, after which the examiner
     asks one or two short questions on the same topic." Also "cue card" changed to "task card"
     in this line, which is the official term (the lessons keep "cue card" elsewhere).
2. "a live interview with a real examiner" changed to "a certified examiner", matching the
   official description.

Unverified: "recorded, so a remark can be re-marked if you appeal". The recording is official
and the re-mark mechanism (Enquiry on Results) is described plausibly, so it was left.

## speaking-part1.html

Fixed:

1. "This is an informal test" is wrong: IELTS Speaking is a formal assessment, and only the
   register of Part 1 answers is relaxed. Heading changed to "Part 1 is conversational" and a
   clarifying sentence added.
2. "Accent does NOT affect your score. Clarity does" is too absolute. The Band 8 Pronunciation
   descriptor reads "L1 accent has minimal effect on intelligibility", so accent matters only
   through intelligibility.
   - After: "You are not marked down for having an accent. What counts is how easily you are
     understood", and the criteria card now reads "Having an accent is fine. Intelligibility is
     what is marked."
3. "Part 3: 4-5 min / discussion / world issues" narrowed the official description. Changed to
   "two-way discussion / abstract questions linked to your Part 2 topic".
4. The at-a-glance line for Part 2 did not mention the follow-up questions. Added.
5. "topics repeat every year" softened to "the same familiar topics come up again and again"
   (topic pools are not published).
6. "Around 12 questions across 3 topics" hedged to "Usually around 12 questions across 3 topic
   areas".
7. Mis-cased <Strong> tag corrected.

Correct and left alone: 4 to 5 minutes, questions about you and your life, the score is given
for the whole test and not part by part, four criteria at 25% each, you may ask for a question
to be repeated, you may self-correct, you may invent details, do not memorise answers. The
A.R.E. structure and the "2-4 sentences" target are teaching advice and are framed as such.

Unverified: "you will typically get 4 questions on each of 3 topics", and the band labels on
the weak/strong answer pairs (Band 4-5 and Band 7+). The samples are consistent with those
bands in vocabulary range and extension, so no mismatch was flagged.

## speaking-part2.html

Fixed:

1. "You must speak for at least 1 minute: stopping early is penalised" is not an official
   penalty. Reworded to: "You are expected to keep going for the full 1 to 2 minutes: stopping
   after a few seconds leaves the examiner very little to assess and pulls Fluency and
   Coherence down."
2. Wrong grammar label on a model answer: "we'd never have found" is a third conditional, not a
   past perfect. "I'd return" relabelled as "would for a hypothetical future".
3. Wrong grammar label on a second model answer: "I wouldn't be where I am today" is a second
   conditional, not a present perfect. The list is now headed "Tenses and forms used".

Correct and left alone: the Long Turn name, the task card with bullet points, one minute of
preparation with pencil and paper, 1 to 2 minutes of speaking, one or two follow-up questions,
about 3 to 4 minutes in total, the examiner stops you, cover all the bullet points, invention
is allowed, the same four criteria across all parts. The PEEL timings add up to 105 to 130
seconds, which fits the two-minute turn.

Unverified: "Making notes during prep time is strongly recommended" and "Do NOT ask the
examiner questions during your talk". Both are sound advice and neither contradicts anything
official.

## speaking-part3.html

Fixed:

1. "This is the most intellectually demanding part of the test" asserted as fact. Changed to
   "This is usually the most demanding part of the test, and the questions are deliberately
   more general and abstract than in Part 1", which matches the official wording.

Correct and left alone: 4 to 5 minutes, abstract questions linked to the Part 2 topic, a
genuine two-way discussion, no right or wrong answers, the five question shapes, the OREO
framework (clearly presented as a formula, not a rule), and the model answers. The one labelled
"Strong (Band 7+)" does show the range, flexibility and concession the Band 7 descriptors
describe.

Unverified: the South Korea gaming-addiction example inside a model answer. It is an
essay-style example, not a claim about the exam.

## src/data/writing-structures.ts

This file mirrors the lesson text into the Writing Checker's coaching panel, so the same claims
had to be corrected in both places.

1. Task 1 skeleton overview: "No numbers. Without this, Task Achievement is capped around Band
   5." changed to "saving the figures for the detail paragraphs. Task Achievement asks for a
   clear overview from Band 6 upwards."
2. "No overview. An instant Task Achievement ceiling of Band 5" reworded as in the lesson.
3. "Writing a conclusion or giving an opinion" replaced with "Giving an opinion, or explaining
   causes the data does not show".

## src/data/speaking-structure-guides.ts

1. "Under a minute costs marks" changed to "Stopping well short leaves the examiner little to
   assess and pulls Fluency and Coherence down", matching the Part 2 lesson fix.

---

## Verification

- npx astro check: 0 errors (13 hints, all pre-existing and in reading/trainer pages).
- npm run build: completes, 514 pages built.
- Rendered output spot-checked in dist/ for the line-graph model, the table model, the process
  model, the discussion variant note and the Part 1 accent wording. All three removed sentence
  fragments are absent from the built pages.
- No em or en dashes exist in any of the 15 lesson bodies; none were introduced into the two
  data files.
- All 17 changed files staged with git add. Nothing committed, pushed or deployed.

## Nothing changed, but worth knowing

- The lessons still teach a fixed four-paragraph shape for both Writing tasks. That is good
  teaching, and it is now labelled as teaching rather than as an exam rule, but a student aiming
  at Band 8 will eventually need permission to vary it.
- The Task 1 model reports are strong on data language, but each one describes an image that
  exists only on this site. If those images are ever regenerated or restyled, the models need
  re-checking against them: that mismatch is exactly how the errors found here arose.
