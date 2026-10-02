# Speaking lessons review, 3 October 2026

Reviewer: Speaking lessons. Scope: the four Speaking lesson pages in English and Russian
(`speaking`, `speaking-part1`, `speaking-part2`, `speaking-part3`), the Speaking coach panel guides
(`src/data/speaking-structure-guides.ts` and their Russian in `structures.ts`), the Speaking band
guides (`src/data/band-guides.ts` and their Russian), the 24-card Cue Card Bank
(`src/data/cue-cards.ts`), the trainer and live examiner question bank
(`src/data/speaking-prompts.ts`: 40 Part 1 topics, 43 cue cards, all vocabulary), `src/data/speaking.ts`
and the nine `src/data/focused/speaking-*.ts` practice tasks.

## What was checked and found right

- **Format facts** agree everywhere: 11 to 14 minutes, three parts in a fixed order; Part 1 4 to 5
  minutes on familiar topics; Part 2 one minute to prepare with pencil and paper, then 1 to 2 minutes
  alone, about 3 to 4 minutes in all; Part 3 4 to 5 minutes, a two-way discussion of abstract questions
  linked to the Part 2 topic. Face to face or by video call, recorded.
- **Marking**: the four criteria are named exactly as published, weighted equally, each given a whole
  band, the Speaking band is their average reported in whole and half bands. The worked example
  (7, 6, 7, 6 gives 6.5) is right. Accent is not penalised, intelligibility is. Opinions are not marked.
- **Asking the examiner**: Part 1 repeat only, Part 2 repeat the instructions only, Part 3 repeat and
  rephrase. The Part 1, Part 2 and Part 3 lessons agree, and so does the live examiner's own rule
  (`src/lib/speaking/live/instructions.ts`).
- **Memorised answers** are treated the same way in every place: penalised, prepare ideas and
  vocabulary, not scripts.
- **Cue cards**: all 24 Bank cards and all 43 trainer cards have the standard shape, a "Describe..."
  line, three "you should say" points and a final "and explain..." line (four prompts). Every Bank model
  answer is 200 to 240 words, every Part 3 answer 60 to 90 words, every rounding-off answer one or two
  sentences, which is what the Part 2 lesson teaches. No dashes anywhere.
- **Russian lessons**: all four pass `node tools/lesson-ru.mjs check`, and say the same as the English
  apart from the wording fixes listed below.

## Fixes (31)

### Lesson pages

1. **`speaking.html`, typo.** "so a remark can be re-marked if you appeal" is now "so it can be
   re-marked if you appeal".
2. **`speaking.html` and `ru/speaking.html`, broken link.** The contents bar links to "The Three Parts"
   (`#parts`) but nothing on the page had that anchor, so the link went nowhere. The Three Parts card
   now carries `id="parts"` in both languages.
3. **`speaking.html` and Russian, Part 2 rounding-off questions.** "the examiner asks one or two short
   questions" is now "may ask". The official wording is that the examiner *may* ask one or two, and the
   Part 2 lesson already tells students not to worry if they get one or none. Same fix in Russian
   ("может задать").
4. **`speaking.html` and Russian, a confusing and absolute claim.** "A hesitant answer full of perfect
   tenses scores lower than a flowing one with small slips" read as if it were about the grammar
   "perfect tenses" and stated a certainty no descriptor promises. Now: "A hesitant answer with flawless
   grammar can score lower than a flowing one with small slips." Russian updated to match.
5. **`speaking-part1.html` and Russian, a wrong pill.** "Nobody is '25% of your score'" (Russian: "Никто
   не равен...") did not make sense: it meant "no criterion", and arithmetically each criterion is a
   quarter before rounding. Now: "Think four whole-band scores averaged and then rounded, not percentages
   adding up to a total", which is the point the section makes.
6. **`speaking-part1.html` and Russian, the formula contradicted itself.** The strategy card said
   "Answer → Extend → (Optional detail)" while the same lesson teaches A.R.E. as Answer, Reason, Extend.
   Now "Answer → Reason → Extend" (Russian "Ответ → Причина → Развитие").
7. **`speaking-part1.html` and Russian, the hometown model answer.** Almaty was described as "surrounded
   by the Tian Shan mountains". The mountains are on one side only, and Almaty students will notice. Now
   "right at the foot of the Tian Shan mountains". The model is English in both files, and the matching
   allow-list entry in `tools/lesson-ru-english-allowed.json` (speaking-part1 only) was updated so the
   checker still passes.
8. **`speaking-part2.html` and Russian, "may ask" again.** The Basics card ("and then asks 1 or 2 short
   questions") and the Rounding Off section ("stops you and asks one or two") now both say "may", which
   agrees with the same section's "Don't worry if you only get one question, or none at all".
9. **`ru/speaking-part2.html`, timing mistranslated in three places.** "на 2 минуте" and "остановит вас
   на второй минуте" mean "during the second minute", which tells students they will be stopped
   somewhere between 1:00 and 2:00. The English says "at 2 minutes". Now "через 2 минуты" and "когда
   пройдут две минуты".
10. **`ru/speaking-part2.html`, pill added a meaning.** "A fluent minute and a half beats a padded two
    minutes" had become "...растянутые на две минуты с искусственными паузами" (with artificial pauses).
    Padding means filling with empty words, not pausing. Now "чем две минуты, растянутые пустыми словами".
11. **`ru/speaking-part3.html`.** "No one expects certainty" (about speculating on the future) was
    translated as "никто не ждёт от вас точности" (accuracy). Now "точного прогноза".
12. **`ru/speaking-part3.html`, ungrammatical Russian.** "Спросите любой из этих фраз:" is now
    "Подойдёт любая из этих фраз:".

### Speaking coach panel (shown during practice), English and Russian

13. **A.R.E. note.** "Answer every question in 2 to 4 sentences" contradicted the Part 1 lesson, which
    says 2 to 4 is a typical length, not a rule, and that a simple factual question can be answered in a
    line or two. Now "Most answers come out at 2 to 4 sentences: one direct answer, then a reason or
    example. Never just 'yes' or 'no'."
14. **PEEL, Explain stage.** "Work through each bullet point on the cue card in turn" contradicted the
    Part 2 lesson, which says the bullets are not a checklist and may be taken in any order. Now "Use the
    bullet points to build the talk, in any order, with specific details and examples."
15. **PEEL, Link stage.** "Round off your talk with a brief reflection" contradicted the lesson's "Link.
    Only If You Get There... You do not need a conclusion". Now "Only if you get there: round off with a
    brief reflection, then carry on with your backup idea."

### Speaking band guides ("How to reach the next band"), English and Russian

16. **Fluency 5 to 6, Do this.** "Extend every answer to at least 3 to 4 sentences, even for simple Part
    1 questions" contradicted the Part 1 lesson (2 to 4 is typical, a factual question can be shorter)
    and the Part 2 rounding-off advice (one or two sentences is right). Now "Extend your answers past the
    first sentence: in Part 1 that usually means 2 to 4 sentences, with a reason or example."
17. **Fluency 5 to 6, Stop this.** "Stop giving answers shorter than two sentences on any question" had
    the same problem. Now "Stop giving one-sentence answers to questions that invite a reason or an
    example."
18. **Lexical Resource 5 to 6.** "Build your answers to 4 to 6 sentences" applied to every part,
    including Part 1. Now "Build your Part 3 answers to 3 to 5 sentences...", which matches the Part 3
    coach guide (3 to 5 sentences) and the Part 3 lesson.
19. **Lexical Resource 6 to 7.** "Paraphrase the question fully in your opening sentence rather than
    repeating any of its wording" contradicted the Part 1 lesson, which teaches that the direct answer
    mirrors the question's grammar ("Do you enjoy cooking?" "Yes, I do."). Now "In Part 3, paraphrase the
    question's key words in your opening sentence...", the same move the Part 3 focused task teaches.
20. **Grammatical Range 6 to 7, wrong grammar label.** The explanation called "since I think it broadens
    the way you see the world" a "relative-style justification". It is a reason clause, not a relative
    clause. Now "adds a reason clause with 'since'". Russian now names it too ("придаточное причины").
21. **Pronunciation 4 to 5, the linking example was backwards.** It said: link "an apple", *not* "a...
    napple". But linking is exactly what makes "an apple" sound like "a-napple". Now: "so 'an apple' runs
    together as 'a-napple', not 'an... apple' with a pause". Russian updated to match.

### Cue Card Bank (`src/data/cue-cards.ts`)

22. **Teacher card, wrong grammar label.** "I probably wouldn't be taking this exam so calmly if it
    weren't for the habits he built" was called a mixed conditional. "If it weren't for... wouldn't be"
    is a second conditional (present condition, present result), the same way the Part 2 lesson labels
    "I wouldn't be where I am today without her encouragement". Note now: "a second conditional with 'if
    it weren't for', linking habits built in the past to the present".
23. **"Very happy" card, wrong grammar label.** "loudly enough that I woke up my parents" was called a
    "so...that result clause"; it is an "enough that" result clause. Label corrected.
24. **"Helped someone" card, model grammar.** "since none of us had a spare key" referred to two people.
    Now "neither of us".
25. **"Quiet place" card, model grammar.** "As far as how often I go, it's probably twice a month" is a
    broken form of "As far as... is concerned", which the Part 2 lesson teaches. Now "As for how often I
    go". Word count still inside 200 to 240.

### Trainer and live examiner bank (`src/data/speaking-prompts.ts`)

26. **cc-2026-23, Part 3 question 1.** "Why do you think some people are more willing to help others
    than others?" (others... than others). Now "Why do you think some people are more willing than others
    to help?" Question id unchanged.
27. **Vocabulary, cc-2026-05.** "state of the art sensors": before a noun it is hyphenated. Phrase and
    example now "state-of-the-art".
28. **Vocabulary, cc-2026-20.** "a beautifully well-directed film" (two adverbs doing one job). Now "a
    really well-directed film".
29. **Vocabulary, cc-2026-20.** "It is a critically acclaimed film this year" was unnatural. Now "It was
    one of this year's most critically acclaimed films."
30. **Vocabulary, cc-2026-33 (an older person you admire).** "wise beyond words" is not an English
    idiom (the real one, "wise beyond her years", is said of young people, so it does not fit this card
    either). Replaced with a real idiom that fits: "as sharp as a tack", "mentally quick and alert, often
    said of an older person", "At ninety, she is still as sharp as a tack."
31. **Vocabulary, cc-2026-43.** "She has a real keen eye" is now "a really keen eye".

## Left for Alex

1. **Which public band descriptors.** The band guides follow the descriptor wording frozen in
   `workers/grade-speaking/src/index.ts` (the grader's calibrated copy). As far as I know, the public
   Speaking descriptors were reissued in a revised wording in 2023, which words some bands differently
   (Fluency and Coherence especially). The meaning per band is close, so nothing in the guides is wrong
   for a student, but if you want the guides to quote the newest public text it is a separate decision,
   because the grader wording is calibrated and must not change on its own.
2. **"given that / seeing as" in Part 1.** The A.R.E. lesson tells students to replace "because" with
   "given that", "seeing as" or "since" as "a small swap that shows off grammatical range". Strictly this
   is vocabulary range, not grammar (it is the same sentence structure), and "given that" is a little
   formal for the conversational Part 1 the same lesson describes. It is a teaching choice, so I left it.
3. **Part 3 practice instruction.** "Read each question, think for 10 seconds, then answer." There is no
   thinking time in the real Part 3. Fine as a practice step, but you may want "on test day you answer
   straight away" added.
4. **Skipping a bullet in Part 2.** The lesson allows skipping a bullet that does not fit your subject;
   the coach panel's Avoid list warns against skipping the final "explain why" bullet. These do not
   really clash (the "explain why" bullet always fits), so both were kept.

## Seen but outside my files

1. **`src/data/focused/speaking-part2-plan-in-one-minute.ts`, checklist item 4 contradicts the Part 2
   lesson.** "Did you close with a short final thought, rather than simply stopping?" The lesson says
   "You do not need a conclusion. The examiner stops you at two minutes, so plan to still be talking".
   I own the English file, but its Russian lives in `src/lib/i18n/dict/ru/learning-objectives.ts`
   (line about 321) and `src/lib/learning/ru.ts`, which I do not own, and changing the English key
   alone would break the Russian. Suggested English: "Did you keep a backup idea ready, so you could
   carry on instead of stopping if your first idea ran out?" Suggested Russian: "Была ли у вас наготове
   запасная идея, чтобы продолжить, а не остановиться, если первая закончится?" The same file's
   objective, "covering every bullet point in a clear order", also leans against the lesson's "in any
   order"; "covering the whole card" would match.
2. **`src/data/focused/speaking-part1-extend-an-answer.ts`, minor naming.** Objective and header say
   "Answer, Reason, Example"; the lesson's A.R.E. is Answer, Reason, Extend (where Extend means a detail
   or example). Not wrong, low priority. Russian in the same two dictionary files.
3. **`src/data/focused/speaking-fluency-repair.ts`.** The filler example "that is a good question" is
   unnatural uncontracted; the lesson's list uses "That's a good question". Low priority, Russian in the
   same dictionaries.
4. **Broken in-page links in other lessons** (found with the same anchor check): `writing.html` links to
   `#essay-checker`, and `vocabulary.html` links to `#topics`, but neither page has an element with that
   id.
5. **`src/components/CueCardBank.tsx`** shows the Bank's family labels ("A person", "A place") and the
   upgrade notes in English to Russian-speaking students; only the tab names go through `t()`. Possibly
   deliberate, worth a decision.
6. **Live examiner** (`src/lib/speaking/live/instructions.ts`) always asks exactly one rounding-off
   question; the lessons say the examiner may ask one or two. Not a contradiction, just noting it.

## Checks run

- `node tools/lesson-ru.mjs check` passes for speaking, speaking-part1, speaking-part2 and
  speaking-part3, with the new hashes on line 1 of the three Russian files whose English changed.
- `npm test`: 2481 tests, 2481 pass, 0 fail.
- `npx astro check`: 0 errors, 0 warnings (27 hints, none in the files changed here).
- A script re-checked every Bank cue card after the edits: four prompts each, model answers 200 to 240
  words, Part 3 answers 60 to 90 words, no dashes.
