# Workflow: Generate Writing Plans

## Objective
Give every Writing Trainer prompt (`src/data/writing-prompts-imported.ts`) its own specific
coaching plan (key points, a paragraph-by-paragraph checklist, topic vocabulary, pitfalls,
timing), shown as the "This question" tab in `WritingCoachPanel.tsx`, instead of only the
generic per-type structure guide in `src/data/writing-structures.ts`.

## When to Run
- After importing new prompts with `tools/import_writing.py` (they have no plan until this runs).
- If a prompt's wording or image changes and its existing plan no longer matches.
- If you want to regenerate one or more plans with an improved system prompt.

## Prerequisites
`requests` is already in `requirements.txt`. You need an OpenAI API key: either
`OPENAI_API_KEY` in this project's `.env`, or (fallback) the key already set in the main
checkout at `C:\Users\Alex\Desktop\IELTS website\workers\grade-essay\.dev.vars`.

## Run
```
python tools/generate_writing_plans.py                                   # every prompt (all ~60)
python tools/generate_writing_plans.py --ids pte-wt-132-task1 pte-wt-132-task2
python tools/generate_writing_plans.py --limit 10                        # first 10 with no plan yet
```
Run from the project root. `--ids` regenerates exactly the prompts you name (existing plans for
other prompts are untouched). `--limit N` fills in the next N prompts that don't have a plan
yet, in prompt-pool order. With neither flag, every prompt is (re)generated.

## What It Does
1. Parses `src/data/writing-prompts-imported.ts` structurally (no hand-copying) to get each
   prompt's id, task, variant, title, minimum word count, question text and, for Task 1, the
   local chart/diagram image path(s).
2. For each targeted prompt, calls the OpenAI Responses API (model `gpt-5.6-sol`, reasoning
   effort `medium`, strict JSON schema output) with a system prompt telling it to act as an
   experienced IELTS teacher and produce a plan specific to that one question, never generic
   advice. Task 1 prompts send the chart image too, so the plan reflects what's actually drawn.
3. Strips any em or en dash from the model's output and merges the result into a local cache
   (`.tmp/writing-plans-cache.json`) keyed by prompt id, so a partial run never loses plans
   generated in an earlier run.
4. Rewrites `src/data/writing-plans.ts` in full from that cache, in the prompt pool's order.
5. Prints input/output token counts and an estimated cost per prompt (input $4 / output $20
   per million tokens), plus a run total.

## Cost
Roughly 1 to 5 cents per prompt (a Task 1 with an image costs a little more than a Task 2). A
full run of the ~60 prompts is on the order of $1 to $3. Alex should approve a full run before
you kick it off; a 3-prompt sample is cheap enough to run without asking first.

## Review Step
This is model output shown directly to students: after a run, open a couple of the regenerated
plans in `src/data/writing-plans.ts` and read them against the prompt they're for. Check that
key points/features actually match the topic (and, for Task 1, the image), the suggested
position makes sense, and nothing generic slipped through. For Task 1 plans, also check
`overviewHints`: they must be questions or instructions that make the student look at the chart,
never a finished sentence and never the answer (no named value, direction, category or ranking).
Also check the "Overview" paragraph's `starter`, which must be a bare neutral stem such as
"Overall, it is clear that" with nothing chart-specific after it, and its `goal`/`tips`, which
must guide the student to work the pattern out rather than state it. Run `npx astro check`
and `npm run build` before shipping, and look at the "This question" tab in a dev server for at
least one regenerated prompt (`npm run dev`, then `/trainers/writing`) to confirm the "Build your
overview" box shows hints, not a sentence.

## Gotchas
- The parser in `parse_prompts()` depends on the exact template `tools/import_writing.py`
  writes. If that template changes, update the parser to match rather than hand-editing
  `writing-prompts-imported.ts`.
- `position` is only meaningful for Task 2; the model is told to return an empty string for
  Task 1, and the renderer omits that field entirely rather than writing an empty string into
  `writing-plans.ts`. `overviewHints` applies only to Task 1; the model is told to return an
  empty array for Task 2, and the renderer likewise omits an empty array.
- The model must never turn `overviewHints` into a giveaway. If a regenerated plan's hints name
  a specific figure, direction or category, or closely paraphrase the old overview sentence,
  rewrite them by hand or re-run with a clearer instruction rather than shipping them as is.
- Never commit or paste the OpenAI key anywhere; `resolve_api_key()` already redacts it from
  error output.
