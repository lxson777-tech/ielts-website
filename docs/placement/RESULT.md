# Placement test: what was built and what was proven

Built 24 September 2026 on branch `claude/student-placement-test-af18b3`. Nothing was pushed, deployed or
applied to the Supabase project, and no paid grader was called.

## What a student gets

A page at `/placement` that a signed-in student takes **once**, in one sitting of 40 minutes, so their
study plan starts from real evidence about all four papers instead of guessing.

| Part | What it is | Clock |
|---|---|---|
| Listening | One part of a real recording, 10 questions, three question types, plays once | 8 min |
| Reading | One real Academic passage, 13 questions, three question types | 14 min |
| Writing | One Task 1 chart report (150 words or more), marked by the existing essay grader | 13 min |
| Speaking | A short Part 1 interview with the existing live AI examiner | about 5 min |

- A four-step bar at the top shows where the student is. Each screen has one main button.
- A student can stop **between** parts and come back later on the same device. Once a part has started its
  clock keeps running (the same rule the rest of the site's tests follow, so no time is ever handed back).
- If the essay grader or the live examiner is not set up, is unreachable, or refuses (a daily limit, say),
  the student is told plainly, that part is shown as **"Not yet assessed"**, and the test carries on. The
  test is never blocked by a grader.
- At the end: for each paper a word (**Weak** below 65% right, **Developing** 65 to 79%, **Strong** 80% and
  above; for Writing and Speaking the grader's band against the student's own target band), the question
  types that came in below the pass line, and the first steps of the plan that was just rebuilt, with a
  Continue button to Today. The wording says plainly it is an estimate from one sitting, not a band score.
- A second visit to `/placement`, on any device, shows the results rather than the test.
- **Today** shows one calm card offering the test once the goal questions are answered, only while the
  account has not taken it. "Not now" hides it for a week and changes nothing else. Signed out, the card and
  the page ask the student to sign in instead. The study plan settings page has a quiet link too.
- Everything new is in English and Russian. Paper names, "Task 1", "Part 1" and question type names stay
  English inside the Russian, as the site's guide asks.

## How it plugs into the plan (no parallel store)

- Every part is recorded in the existing learner record as a **diagnostic** sample, all four sharing **one
  session id**, so the plan counts the sitting as one occasion. Each event carries the key `placement:v1`,
  which is how "has this account taken it" is answered from the account's own record, not from the browser.
- Diagnostic evidence is capped at "tentative" by the existing rules, which is right for one sitting.
- Any paper the test measured drops off the "still unknown" list automatically; a paper it could not measure
  stays on it, and the plan's existing short samples ask for it later (proven: after a sitting with the
  graders off, Today's plan contained a "First look · Writing" step and "Why this" said "Not yet assessed:
  Writing, Speaking").
- After the last part the plan is rebuilt from the new evidence **before** the results screen reads it.
- The existing Supabase sync uploads the events as it does any other (proven against the local stand-in:
  the rows arrived with mode "diagnostic"). No database change was needed.

## The material, and why it was chosen

All ids live in one file, `src/data/placement.ts`, with the reason for each.

| Part | Material | Why |
|---|---|---|
| Listening | Listening Test 27, Part 2 (`listening-full-027-drill-p2`) | Three question types (sentence completion, multiple choice, multiple answer); its recording is about 5 minutes, so the 8-minute clock leaves time to read and check (the Part 3 candidates with the same mix run 7 to 8 minutes of audio) |
| Reading | Academic Reading Test 10, Passage 2 (`reading-full-010-drill-p2`) | Three types (paragraph matching, sentence completion, True/False/Not Given), 13 questions, middle difficulty |
| Writing | Task 1 "Households in the US by annual income" bar chart (`pte-wt-118-task1`) | The most common Task 1 form, with three years to compare |
| Speaking | Part 1 topic "Friends" (`p1-2026-14`) | Everyday questions any level can answer at length |

None of the papers is among the ones held back for independent checks (Listening 008, 009, 019; Reading
003, 015, 028, 029, 034, 037), none is the trial's Test 1, no lesson check or exercise quotes them, and the
Writing prompt is not among the 18 check prompts. Everything built on this material, **including the whole
paper each part comes from**, is tagged `placement-only`, so the plan never uses it for teaching, practice,
independent checks, short samples or checkpoint papers. It stays in the library, like the check papers.

## Proof

**Deterministic tests** (`tests/placement.test.ts`, 23 tests, all pass): the reserved material is out of every
pool; the four events are diagnostic with one shared session id; the measured papers leave the unknown list
while a skipped one stays and is the next short sample; no estimate rises above tentative; the level words
and "below the pass line"; the resume state belongs to one student; a paper resumes with its answers and
deadline and is handed in only once; a second visit shows results; the Today card rules; and the
account-switch cases (student B sees nothing of A's sitting, a tab that missed the switch records nothing,
and A's essay grade that lands after the switch is kept for A only).

**Full suite:** 2,039 tests, **2,038 pass, 1 fails**. The one failure is the pre-existing "committed index is
exactly what the generator produces today": I checked it directly, the committed file is byte-identical to
what the generator produces, and the test only fails because this Windows checkout turns the file's line
endings into CRLF. It is not caused by this work. (One earlier full run also timed out a 10-second source
scan in `tests/tutor-request-owner.test.ts` while the machine was busy; it passes on its own and passed in
the final full run.)

**Type check:** `npx astro check`, 0 errors, 0 warnings. **Build:** `npm run build`, 663 pages, complete.

**Browser proof** (`tests/browser/p01_placement_journey.py`, **42 of 42 checks pass**; detail in
`docs/placement/evidence/results.md`). A synthetic student signed up against the free local accounts
stand-in, on a dev server bound to port 4513, with both graders deliberately switched off.

| Screenshot | Shows |
|---|---|
| `01-offer-card.png` | The offer card on Today for a signed-in student |
| `02-intro.png` | The introduction with the four parts |
| `03-listening-brief.png`, `03-phone-stepper.png` | The stepper and Listening brief, desktop and phone width (nothing scrolls sideways) |
| `04-listening-handed-in.png` | Listening answered and handed in, the score card (no band), recorded as diagnostic |
| `05-reading-under-way.png`, `06-reading-resumed.png` | Reading paused by a reload and resumed with its answers, clock carried on (13:59 before, 13:54 after) |
| `07-writing-grader-unconfigured.png` | Writing with no grader: the plain message, then on to Speaking |
| `08-speaking-examiner-unconfigured.png` | Speaking with no live examiner: the plain message, then the results |
| `09-results.png` | The results: two papers with level words and weak question types, two "Not yet assessed", the plan's next steps |
| `10-today-after.png` | Today after: card gone, a Writing first-look step added, "Not yet assessed: Writing, Speaking" |
| `11-second-visit.png` | A second visit shows the results, not the test |
| `12-results-russian.png` | The results in Russian |

## What could not be proven here, and what a live check would cost

The two paid paths were not run, as agreed: **the essay grader marking a real placement essay** and **the
live examiner running the Part 1 interview**. Their code paths reuse the existing, calibrated flows and are
covered by the deterministic tests with a hand-written (clearly labelled) grade, but a live check needs you:

- Writing: one essay through the `grade-essay` Worker (`gpt-5.6-sol`, three runs, median kept). Roughly the
  cost of one ordinary Writing trainer submission, a few US cents.
- Speaking: one 4 to 5 minute live voice session plus its grading (`gpt-5.6-sol` and `gpt-audio-1.5`).
  Roughly the cost of one Speaking trainer Part 1 drill, well under a US dollar, probably tens of cents.

On the live site, the Worker addresses only accept requests from the published site, so this check has to be
done on the deployed build, signed in, by sitting the test once.

## Decisions you should know about

1. **The Speaking topic is reserved too.** You named three items; I also held back the "Friends" Part 1
   topic, so a student's placement answers are a first look rather than a rehearsal. It costs one of 40 topics.
2. **Shorter clocks than the exam.** Reading gets 14 minutes (the exam allows about 20 a passage) and Task 1
   gets 13 (the exam says 20), to fit 40 minutes. Students are told this on screen. The Reading passage's own
   printed line "spend about 20 minutes" is exam material and was left as it is.
3. **An ungraded part records nothing.** When Writing or Speaking cannot be marked, nothing is written to the
   learner record (exactly what the Writing trainer and live examiner already do), so that paper stays
   "unknown" and the plan's short samples ask for it. Recording a "pending" placeholder would have wrongly
   marked the paper as looked at.
4. **Exam conditions inside the placement.** The Listening part plays once with no seek bar, the strategy
   hints are hidden, and the score card after each paper shows no band and no links away. These are small
   additions to the test player that apply only to a placement part.
5. **Waiting for the Writing grade.** After handing in the essay the student waits on that screen (usually
   about a minute) before Speaking, rather than grading in the background, so a closed tab can never lose it.
6. **Resuming is per device.** An interrupted sitting can be finished only on the device it started on;
   another device shows what was recorded as results. "Taken once" is still decided by the account's record.
7. **Changes to code owned by other sessions** were kept additive: one new optional input on the test player
   (a placement sitting), one on the live examiner (a placement topic), and an optional mode on
   `attempt-recording.ts`. The Mock Exam, test-session, store-owner, trial and Workers were not touched. One
   existing test (`tests/checkpoints-and-libraries.test.ts`) was changed on purpose: it expected every Reading
   paper to be a checkpoint candidate, and the placement paper now deliberately is not.

**Trial build:** when the trial branch merges, `/placement` must be declared locked there with the one
`trialGate` prop on its `BaseLayout` (in `src/pages/placement.astro`). Nothing else needs to change; if the
trial build's empty data stand-ins are in place, the page already says calmly that the test is not available.

**Also noticed, not changed:** on Today, the "Work saved on this device" card appeared for the brand-new
student right after sign-up, offering to add a target band set on the same visit. That is existing
behaviour outside this work.
