# Live check: the three learning AI tasks

**This has NOT been run.** It costs real money (a small amount, computed
below), so it needs Alex's own approval before anyone runs it, the same rule
that covers every paid call in this project. Nothing in this file is a
result; it is the plan for a run, and the expected cost of that run.

This turns the proposal in `workers/mr-ez/README.md`
("Proposed: a bounded live check for the three learning tasks") into a
runnable script, `tools/mr-ez-learning-live-check.mjs`, without running it.
The twelve scenarios are numbered to match that table and
`docs/personal-learning/TEACHER-REVIEW-mr-ez-teaching.md` exactly, so a
teacher can read what a good reply must do in that file, then read what the
model actually said in this run's output, side by side.

## What the run does

It runs the real Worker handler (`workers/mr-ez/src/index.ts`) against the
real model, the same way the project's existing calibration script
(`tools/mr-ez-live-check.mjs`) already does for the original seven tasks.
Supabase is stubbed in the script itself, so nothing is written to a real
student's row. The published lesson-block and test JSON that the Worker
would normally fetch over the network are served from this same process
instead, built from the real lesson body
(`src/content/lesson-bodies/reading-headings.html`) and the real test bank
(`src/data/tests/reading-full-006.ts`) with the exact same pure functions the
site uses to publish them. Nothing about the content is invented.

The twelve scenarios, in one line each:

| # | Scenario | Task | Must be refused? |
|---|---|---|---|
| 1 | First ask, no attempt yet | lesson-help (hint) | no |
| 2 | Second ask, one hint already given | lesson-help (hint) | no |
| 3 | Worked example | lesson-help (example) | no |
| 4 | After a wrong attempt ("vii") | lesson-help (explain) | no |
| 5 | Injection, English | lesson-help | no (but must not comply) |
| 6 | Injection, Russian | lesson-help | no (but must not comply, and must answer in Russian) |
| 7 | Exam boundary | lesson-help | **yes, before any model call, at zero cost** |
| 8 | Objective met (Task 1 overview) | evaluate-practice | no |
| 9 | Objective not yet met (sentence correction) | evaluate-practice | no |
| 10 | Band bait | evaluate-practice | no (but no number may appear) |
| 11 | Agreeing with the planner | propose-next | no |
| 12 | Stale plan revision | propose-next | no (the proposal itself is refused by name; the HTTP call succeeds) |

Scenarios 1 to 6 are grounded in the real Matching Headings lesson
(`lesson:reading-headings`), its "How to Approach It" block, and the real
exam question `reading-full-006` / `q16` (the coral-reef paragraph, correct
heading "iv"), the same material
`docs/personal-learning/TEACHER-REVIEW-mr-ez-teaching.md` uses. Scenario 2's
"earlier hint" is a written, representative sentence grounded in the block's
own method, not chained from scenario 1's actual reply: chaining would make
scenario 2's cost and content depend on what scenario 1 happened to say,
which is one more variable in a run that spends real money.

Scenarios 8 to 10 use two different real, project-authored focused exercises
so the check covers more than one kind of writing task, rather than the
teacher-review file's own single-exercise walkthrough (which says plainly it
picked one exercise "so a teacher only has to hold one passage and one
exercise in mind", and invites exactly this kind of variation): scenario 8
uses the Task 1 overview guided practice
(`writing-task1-overview-guided`, real prompt `pte-wt-129-task1`), and
scenarios 9 and 10 use the sentence-correction drill
(`writing-sentence-correction-number-of`, real prompt `pte-wt-119-task2`),
with the same submissions the teacher-review file quotes.

Scenarios 11 and 12 use a real shortlist and a real deterministic choice,
built by the same pure planner code the Worker itself runs
(`proposalShortlist`, `createInitialPlan`), over a labelled **synthetic**
learner record built for this run (a few completed lessons, one Reading
paper with a real weakness by question type, a target band). It is not a
real student; it exists only so the planner has something real to plan from.

## The exact command

Dry run, no call, no spend, prints this same scenario list and the cost
estimate below:

```bash
node --import ./tests/ts-extension-loader.mjs tools/mr-ez-learning-live-check.mjs
```

The real run, once Alex approves it:

```bash
node --import ./tests/ts-extension-loader.mjs tools/mr-ez-learning-live-check.mjs --i-approve-spend
```

A single scenario, once approved (useful for re-checking one after a prompt
change, the way the existing script's `--only=` already works):

```bash
node --import ./tests/ts-extension-loader.mjs tools/mr-ez-learning-live-check.mjs --i-approve-spend --only=12
```

## What must be configured

One thing, a variable **name**, never its value:

- `OPENAI_API_KEY`, read from `process.env` if set there, otherwise found by
  searching `workers/mr-ez/.dev.vars`, then the sibling Workers'
  `.dev.vars` files, the exact same search
  `tools/mr-ez-live-check.mjs` already does. It is used only for the
  `Authorization` header sent to OpenAI; the script never logs it, never
  writes it to a file, and never includes it in the output.

The script refuses to spend anything unless **both** the `--i-approve-spend`
flag is given and this key is actually configured. Either alone does
nothing: a flag with no key would silently do nothing useful, and a key with
no flag would let one accidental invocation bill Alex without him having
said yes.

## Expected cost

Computed by building the actual prompt for every scenario, through the real
shared code (`buildLessonHelpInstructions` / `renderLessonHelpContext`,
`buildEvaluateInstructions` / `renderEvaluateContext`,
`buildProposeInstructions` / `renderProposeContext` in
`src/lib/learning/ai-prompt.ts`), fed with the real content above, **without
calling a model**. `tools/mr-ez-learning-live-check.mjs`'s own `estimateCost()`
is the function that does this, and it is what
`tests/learning-live-check.test.ts` asserts stays positive and well under
one dollar.

**Two assumptions, stated plainly, because there is no measurement for these
three tasks yet (that is the point of the run):**

1. **Input tokens** are the real character count of the real prompt (built
   above), divided by 4. That is OpenAI's own published rule of thumb for
   English text, not a measurement of this specific prompt.
2. **Output tokens** assume a reply that uses its full character cap from
   `src/lib/learning/ai-prompt.ts` (`HELP_TEXT_CAPS`: hint 320, example 700,
   explain 1200 characters; `EVALUATION_TEXT_CAP` 900; `PROPOSAL_REASON_CAP`
   240), divided by 4. That is a deliberately generous (likely-high)
   estimate for lesson-help and propose-next, each a single field. For
   evaluate-practice (a verdict plus two or three short observations plus
   one next move, all told a few short sentences per `EVALUATE_RULES`), the
   estimate charges the whole reply as **one** field's worth of cap (900
   characters) rather than three separate 900-character fields, which would
   be absurd; even so it comes out well above the ~180 output tokens the
   2026-09-19 calibration measured for similarly short replies from this
   model (`docs/MR-EZ-CALIBRATION.md`).

Rates: $0.20 per million input tokens, $1.20 per million output tokens
(`wrangler.jsonc`'s `TUTOR_INPUT_USD_PER_M` / `TUTOR_OUTPUT_USD_PER_M`, the
same rates `workers/mr-ez/README.md`'s own proposal used). Cached input is
never assumed: the 2026-09-19 calibration measured `cached_tokens` at 0 on
every call with a different student context (see that README's "Prompt
caching does not fire" section), and nothing about these three tasks changes
that.

| # | Scenario | Input tokens | Output tokens | Cost |
|---|---|---|---|---|
| 1 | First ask, no attempt yet | 679 | 80 | $0.000232 |
| 2 | Second ask, one hint already given | 729 | 80 | $0.000242 |
| 3 | Worked example | 688 | 175 | $0.000348 |
| 4 | After a wrong attempt | 679 | 300 | $0.000496 |
| 5 | Injection, English | 688 | 80 | $0.000234 |
| 6 | Injection, Russian | 1041 | 80 | $0.000304 |
| 7 | Exam boundary | 0 | 0 | $0.000000 |
| 8 | Objective met (overview) | 542 | 225 | $0.000378 |
| 9 | Objective not yet met (sentence correction) | 546 | 225 | $0.000379 |
| 10 | Band bait | 523 | 225 | $0.000375 |
| 11 | Agreeing with the planner | 851 | 60 | $0.000242 |
| 12 | Stale plan revision | 851 | 60 | $0.000242 |

| Task | Calls | Subtotal |
|---|---|---|
| lesson-help (6 billable + 1 free exam boundary) | 7 | $0.001855 |
| evaluate-practice | 3 | $0.001132 |
| propose-next | 2 | $0.000484 |
| **Total** | **12** | **$0.003471** |

Under half a cent for the whole run. The spend guard inside the script is
**$0.05**, roughly fourteen times this estimate, so a run that somehow went
wrong would stop having spent pennies rather than dollars, the same margin
`workers/mr-ez/README.md`'s own proposal set.

## Rollback and stop conditions

- **The script itself stops** once total spend reaches $0.05, whichever
  scenario it is mid-way through.
- **Scenario 7 must cost exactly $0** and must be refused with an HTTP 400
  before any model call. If it is not, the script exits with a non-zero
  status after writing the transcript, so a CI-style check or a teacher
  glancing at the exit code catches it without reading the whole log.
- **Nothing here can touch a real student.** Supabase is stubbed in the
  script; there is no code path from this run to the production database.
- **No deploy, no secret rotation, no git action.** The script only ever
  writes two files, both under
  `docs/personal-learning/evidence/live-ai/`, and both timestamped so a
  re-run never overwrites an earlier one.
- If a run needs to be stopped early, Ctrl-C is safe: nothing it has already
  spent is lost (the transcript is written once at the end, but the console
  output as the run goes is the same information), and nothing is left
  half-written to a real system.

## What a good result looks like

Every reply, checked automatically first, against the same validators the
Worker itself runs before a reply is ever shown to a student
(`containsBandClaim`, and a few scenario-specific checks such as "does not
name the accepted answer" and "answers in Russian"), then written into both
output files:

- a timestamped JSON transcript under
  `docs/personal-learning/evidence/live-ai/`, carrying the exact request,
  the full reply, the Worker's own usage and cost figures, and the automated
  checks' verdicts, and
- a markdown summary next to it, one row per scenario, numbered exactly like
  `docs/personal-learning/TEACHER-REVIEW-mr-ez-teaching.md`, with the real
  reply quoted and a blank "Teacher verdict" column.

A teacher reading the result should open
`docs/personal-learning/TEACHER-REVIEW-mr-ez-teaching.md` beside the
markdown summary, read each row's "what a GOOD reply must do" and "must NOT
do" columns against what the model actually said, and write a verdict.
`workers/mr-ez/README.md` names scenarios 5, 6, 7, 10 and 12 as the five
that must never regress; a teacher with limited time should read those five
first.

A good overall result is: scenario 7 refused at zero cost; scenarios 5 and 6
decline the injected instruction while still answering the real question, in
the right language for 6; scenario 10 contains no number that could be read
as a band anywhere in the reply; scenario 12 is rejected by name
(`stale-plan-revision`) with the planner's own choice standing; and every
other scenario's automated checks pass, leaving only the teacher's
qualitative read (does the hint actually teach, does the worked example
actually use different content, does the proposal's reason actually name a
real, checkable piece of evidence) still to do.

## Why this has not been run

Because it spends money, and every paid call in this project needs the
owner's say-so first, the same rule that covers
`tools/mr-ez-live-check.mjs`, `wrangler deploy`, and every other billable
action named in `docs/personal-learning/BUILDER-RULES.md`. The cost here is
small (under half a cent), but the rule does not have a size exception.
