# Trial stand-ins (browser bundle only)

A trial build (`PUBLIC_ACCESS_MODE=trial`) must not ship the paid study material
to the browser (Alex, 23 and 24 September 2026: lock the content itself, not only
the screen). The `trialBrowserContent()` plugin in `astro.config.mjs` points each
import of a module listed in `TRIAL_SWAPS` at the file of the same purpose here,
**for the browser bundle only**: the server build of every page still reads the
real data, and a trial student receives what the trial includes from the content
gate (`workers/content-gate`).

Each stand-in exports the same names with the same shapes as the real module,
with the content taken out. Type-only imports from the real module are fine
(they are erased before bundling). Anything else here must not import the real
module, or the swap would pull it straight back in.

## Paid accounts (docs/paid-access/CONTRACT.md)

A paid account is entitled to all of it. `tools/build-gated-content.mjs` writes
each real module's data as a pack (`gated-content/packs/<module>.json`), the gate
hands a pack to a running paid grant only (`GET /pack/<name>`), and
`src/lib/trial/packs.ts` gives it to the stand-in's `fill...` function. A fill
puts the data **inside the objects the stand-in already exported** (arrays spliced,
records and entries updated where they stand, see `./fill.ts`), so every module
that imported the stand-in sees the real material, and the stand-in's lookups
(`getModelAnswers`, `guideFor`, `findFocusedExercise`, ...) answer by the real
module's rules. A malformed pack is refused whole. `tests/paid-packs.test.ts`
fills every stand-in from its real pack and compares it with the real module.

Nothing is ever filled for a signed-out, trial or ended account: the loader does
not even ask. A page that needs the material mounts its tool only after the fill
(`src/components/trial/PaidContent.tsx`).

`tools/trial-content-audit.mjs` checks the result: it searches every public file
of a trial build for sentences taken from each real module, and fails if a pack,
the private store or an inline Task 1 chart ever reaches the build.
