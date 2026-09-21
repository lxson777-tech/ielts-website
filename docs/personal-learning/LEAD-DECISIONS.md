# Lead decisions (21 September 2026)

This file is section 12 of `ARCHITECTURE.md`. It settles that document's
section 10 (disagreements) and section 11 (open questions) so that builders are
not blocked. Where this file and the architecture differ, this file wins.

Items marked "for Alex" are provisional defaults. They are listed again in the
handoff document for him to confirm or change. None of them blocks the build.

## D1 accepted

The plan adapter writes a derived `SavedPlan` beside `PersonalPlanV1` until the
last reader is retired. The derived copy is never a source of truth, and the
agreement test is mandatory.

## D2 accepted, with one change: lesson body files are NOT edited

The Russian lesson bodies are guarded by a checker that compares their
structure with the English source and marks a Russian lesson out of date when
the English one changes. Adding anchor ids by hand to 76 English bodies would
invalidate or desynchronise the translations.

Instead, block identity is DERIVED. One pure function in `src/lib/learning/`
segments a lesson body HTML string into blocks deterministically (by its
existing section markup) and gives each block a stable id made from its
position plus a content hash of the ENGLISH block. The lesson layout uses that
same function at build time to stamp `id` attributes on the rendered sections,
and the lesson-block endpoint uses it to serve the block text. English and
Russian bodies of one lesson therefore share block ids with no content file
changed. A test asserts that every lesson segments into at least one block and
that the English and Russian bodies of the same lesson produce the same number
of blocks.

## Q1 sentence-endings

Keep the lesson. Author a small focused practice set in WP18, marked
`source: 'authored'` and `verified: false`. Unverified authored material may be
used for guided practice only, never for an independent check and never as
assessment evidence. Until a teacher verifies it, the catalogue reports the
independent check for this type as unavailable and says so plainly. WP4 must
first confirm from the data whether any paper really contains this type.
For Alex: verify the authored set, or supply real items.

## Q2 repeated difficulty with no teacher surface

At `repeatedDifficultyLimit` the scope is flagged `needs-teacher-input`. The
planner stops offering further variations of the failing drill, moves to a
prerequisite or a different teaching approach if one exists, otherwise to the
next priority, and records a plan change in plain words. The student sees an
honest note: this has not improved after several tries, here is what we will do
instead, and the exportable review summary on the progress page lists it for a
teacher. No support workflow is invented.

## Q3 AI allowance

Keep the existing enforcement mechanism (rows in `mr_ez_turns`, checked before
any billable call). Make the per-student daily cap configurable per task
family: conversation stays at 40, contextual lesson help and focused-practice
evaluation share a separate default of 60, plan proposals ride on the welcome
cache and count as conversation. The whole-site daily cap keeps covering
everything. All values are Worker environment settings with the current numbers
as defaults. For Alex: confirm the numbers after the cost estimate in the
handoff.

## Q4 diagnostic depth

Confirmed as provisional named constants: at most 5 diagnostic steps, at most
15 minutes each, one per session, inside the first sessions, each deferrable.
Five rather than four so that Writing Task 1 and Task 2 are sampled separately.
The diagnostic also asks the student which paper feels hardest (self-reported,
never measured); that answer orders the diagnostic steps and gives that paper a
small starting priority until real evidence confirms or corrects it.

## Q5 model answers are all band 8

Do not author lower-band model answers in this build. Alex decided on
14 September 2026 that the site carries only real material, and invented weak
models would need teacher review. Pilot B teaches from the band 8 overview, the
task's own "Build your overview" guiding questions, and the student's own
attempt. For Alex: proposed next action.

## Q6 pronunciation

Confirmed. Audio is not retained, so a pronunciation objective is re-checked on
a new recording only.

## Teaching principle to preserve (Alex, 19 September 2026)

Trainers guide the student to the answer, they do not give it. Hints and AI
help lead toward the answer. A full model solution is offered only after the
student's own attempt.
