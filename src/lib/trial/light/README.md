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

`tools/trial-content-audit.mjs` checks the result: it searches every public file
of a trial build for sentences taken from each real module.
