# Pre-publishing check, 3 October 2026

Alex asked: "check everything and make sure that everything is ready for publishing, make sure that all
lessons are right, all parts of platform are working and no contradictions in our lessons", then "fix
anything you find right away". Everything below is on the branch `claude/paid-platform-readiness-03c113`,
local only. Nothing was pushed or deployed.

## How it was checked

Eight reviewers, each on its own copy, each owning a separate set of files: Reading lessons, Listening
lessons, Writing lessons, Speaking lessons, Vocabulary lessons, the 40 Reading papers with the lesson
exercises, the 30 Listening papers with the lesson exercises, and one comparing every exam fact across
the whole site and the course order. Five builders then fixed what the reviews found in shared code.
Every fix was merged here, the full automatic suite was run after each merge, and the site was rebuilt
and clicked through in a browser.

Detailed reports (one line per fix, with the reason):
- `docs/audits/content-review-2026-10-03/reading-lessons.md`, `listening-lessons.md`, `writing-lessons.md`,
  `speaking-lessons.md`, `vocabulary-lessons.md`, `reading-tests.md`, `listening-tests.md`, `cross-platform.md`
- `docs/audits/prepublish-2026-10-03/focused-fix/`, `practice-fix/`, `marker-fix/`, `retype-fix/`

## What was wrong, in plain terms

**Things students could not do at all (now fixed)**
- 13 short Listening exercises showed "Complete the table below" with no table, form, flow chart or map.
- Two Reading questions offered a dropdown containing only "A"; ten tables put each answer box next to
  the wrong question; four multiple-choice questions had become text boxes.
- 19 Reading tasks where you pick a letter asked students to type it into a box, with all the endings glued
  onto the last question, and sent wrong answers to the wrong lesson.
- Listening drills had an 8-minute clock but 8 recordings are longer than that, so the last questions
  could never be answered.
- 21 Listening question stems were missing ("choose THREE" with no question); one Reading stem too.

**Wrong answers marked right, or right answers marked wrong (now fixed)**
- 13 Listening and 4 Reading answer keys were wrong (each checked against the recording or passage).
- The answer checker did not accept "three" for "3", phone numbers with spaces, or many British and
  American spellings: 44 correct answers a student might type were being rejected.
- In lesson exercises, typing the same letter in three blanks of an "any order" group scored three times.
- "storey" was being marked right against "a short story".
- Listening Band 4.0 started at 11 correct instead of 10.
- About 125 Listening and a dozen Vocabulary answers that are equally right are now accepted.

**Lessons contradicting each other or the exam (now fixed)**
- Reading overview said matching answers come in passage order and every letter can be reused; the
  detailed lessons and the official rule say otherwise. Headings: the "each heading once" rule was missing.
- Listening Part 1 said spelling counts "unlike Reading" (it counts in both); the Matching lesson and its
  card disagreed about reusing letters; no lesson said British and American spellings are both accepted.
- Writing: two lessons said ideas are not marked; "state your position" was given for essay types that
  ask for none; a Band 6 claim about the overview that belongs to Band 7; the Task 2 list left out
  advantages and disadvantages essays.
- Speaking: three places said the examiner "asks" follow-up questions after Part 2 (official: "may ask");
  the coach panel and band guides gave answer lengths and Part 2 advice that the lessons contradict; a
  Part 2 checklist asked for a conclusion the lesson says you do not need; the live examiner and the
  mock exam gave different lengths for the test (now 11 to 14 minutes everywhere).
- Vocabulary: wrong meanings ("debt" in Russian said the opposite), wrong facts (dementia figure,
  emissions target), exercises with no word list or two right answers, about 60 Russian meanings corrected.
- Mr EZ was told every band comes from AI marking; Reading and Listening bands come from the answer key.

**Things that looked broken or confusing (now fixed)**
- When Mr EZ could not answer (for example, daily questions used up), the fallback quoted the button
  labels ("Asking Mr EZ...Show me an example") as the lesson's sentence, or quoted the lesson title back.
  It now quotes a real teaching sentence, and bare section titles no longer carry help buttons.
- Lesson exercise titles and instructions were English for Russian students; completion exercises never
  said their word limit.
- Practice notes said the questions come from "a real IELTS test"; they are full practice tests.
- A broken "Open Exam readiness" link on the tests page now opens the full mock exam.

## Proof

- Automatic checks: 2,605 of 2,605 pass (was 2,540 this morning; 65 new checks guard what was fixed),
  type check 0 errors, all 76 Russian lessons match their English, no paid material leaks into free pages.
- Browser, on the rebuilt site (paid build on 4441, live-style build on 4442): see "Final browser run" below.

## Final browser run

On the rebuilt site (paid build on 4441 with the local stand-in on 8841; live-style build on 4442 with
its stand-in on 8842). Logs and results in `final/`.

| Check | Result |
|---|---|
| Every page, paid student | 680 pages, nothing wrong |
| Every page, free student | 680 pages, nothing wrong |
| Every page, signed-out visitor | 680 pages, nothing wrong |
| Every page, live-style build | 755 pages, nothing wrong |
| Every button and link, paid (English desktop and Russian phone) | 808 and 741 controls |
| Every button and link, visitor | 491 controls |
| Whole tasks (buy, pay, receipt, password reset and others) | 22 of 22 |
| Account deletion, English and Russian | 17 of 17 |
| Student journeys | 421 of 421, 0 page errors |
| Sales website, both languages, desktop and phone | 151 of 151 |
| Page loading, every kind of student, both languages, both sizes | 0 errors in 1,648 visits |

The only page flag is the word "undefined" on the Summary Completion lesson, which is the lesson's own
text ("the process is fluid and undefined"). The click tests' remaining flags were checked one by one:
the Mr EZ "Too Many Requests" replies are the tests using up the daily question allowance on purpose
(the screen handles it, and that handling was the bug fixed today); the Speaking screenshot link opens in
a new tab, which the click test does not count; "Save changes" is greyed out after choosing custom days
with none ticked (it now says "Choose at least one day." next to it).

Two mistakes in my own process, corrected: three live-style review builds were made without the setting
that points them at the local stand-in, so they talked to the production database. Only signed-out visits
ran against them and the one sign-up attempt never reached the form, so no production account was
created; the build was redone correctly and those suites rerun. And the page-loading suite's own sign-up
did not tick the new consent box; fixed and rerun.

## Alex's decisions, same day

- Lesson minutes now cover the whole page (`durations/REPORT.md`).
- Reading Test 10 Q40 accepts only "style".
- The doubtful Listening items were settled from the recordings themselves (`audio-checks/REPORT.md`):
  4 keys and 6 printed details corrected.
- Band descriptors: Alex asked for the 2023 wording. Waiting for him to save the two official PDFs, since
  the official text is not copied off the web; then the band guides and the two graders are updated, a
  small paid check run is proposed before the graders are redeployed.

## Left for Alex (real choices, nothing here is broken)

1. **Band descriptor wording.** The Writing and Speaking band guides and the AI graders quote the older
   public descriptors; IELTS reworded them in 2023. Meanings are close and every fix today is true under
   both. Moving to the new wording changes the calibrated graders, so it is a separate decision.
2. **Lesson time labels** count only the teaching, not the practice questions on the same page (for
   example Yes / No / Not Given shows 12 minutes for about 4,000 words). Raising them would also stretch
   the study calendar.
3. **Reading Test 10 Q40** still accepts "learning style" under ONE WORD ONLY (kept deliberately in
   September). Real IELTS would mark it wrong; the reviewer recommends removing it.
4. **Questions that need someone to listen to the audio**: Test 18 Q23 (B or C), Test 2 Q1 "Bhatt", Test 3
   Q2 "Hillsdunne", and five more listed in `listening-tests.md`. About 25 arguable Reading keys are listed
   in `reading-tests.md`; the publisher's key was kept.
5. **Publisher misprints** that cannot be fixed without rewording their questions: Reading Test 10 Q37,
   Test 28 (two identical endings and headings), Test 35 Q13-14, a few garbled passage sentences.
6. **Small teaching choices**: three American-form vocabulary headwords (renaming resets a student's saved
   review of that word); "caps Lexical Resource at Band 6"; "given that / seeing as" in Speaking Part 1;
   four focused Reading checks whose source tasks are a slightly different type than their title.

## What still stands between this and publishing (unchanged from yesterday)

Seller details for the offer and footer, the payment company choice (and Kaspi), a native Kazakh speaker
reading `docs/legal/KAZAKH-REVIEW.md`, the lawyer's questions, applying the database changes to the live
database, and Alex's yes to push.
