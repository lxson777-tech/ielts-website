# Hydration errors: cause, fix and proof

30 September 2026. Follows failure 3 in [VERIFICATION.md](VERIFICATION.md). Branch `claude/hydration-fix`, based on `claude/paid-platform-readiness-03c113`. Local only: nothing was pushed or deployed.

## What was wrong, in plain words

Every interactive part of a page (the menu, the Mr EZ panel, the trial block, a practice test) is built twice. First on the build machine, which knows nothing about the visitor: no student, English, nothing saved. Then in the browser, where React "takes over" the ready-made page. For the takeover to work, the browser's very first draw of each part must be identical to what the build machine drew. If it is not, React throws that part of the page away and redraws it, logs "Hydration failed because the server rendered HTML didn't match the client" (shown as "Minified React error #418" on the live site), and the student can see a flicker.

Four things were breaking that rule. Two were a matter of timing, which is why the errors were intermittent; two happened every single time.

| # | Cause | Where | How often |
|---|---|---|---|
| 1 | The shared "who is signed in and what trial or access do they have" store was read on the first draw. The first part of the page to wake up starts that check. Any part that woke up after the answer arrived drew "signed out" or the student's trial over a page built as "checking". | Every trial and paid screen and the Mr EZ panel (about 15 parts), so nearly every page | Intermittent, a race |
| 2 | A link that names an item (`?task=`, `?card=`, `?paper=`) was read on the first draw, over a page built with the default item. | Model answers, cue card bank, band guide | Every time such a link was opened |
| 3 | A practice test that had been started was reopened on the first draw, over a page built as the instructions screen. | Practice tests and trainers | Every time a student came back mid-test |
| 4 | One sentence was translated with the "what language is the browser in right now" translator instead of the one that starts in English like the built page. | Mr EZ panel notice, only on a build where Mr EZ is not configured | Intermittent in Russian, a race with the dictionary loading |

## The fix

One rule, now written down in `src/lib/hydration.ts`: nothing is read from the browser during the first draw. It is applied straight after.

1. `src/lib/trial/react.ts`: the trial hook now draws the as-built "checking" state while React takes over, and the real state on the draw straight after. One change covers every screen that uses it. A part of the page opened later by a click still gets the real state at once.
2. `ModelAnswers.tsx`, `CueCardBank.tsx`, `BandLadder.tsx`: the linked item is applied after the first draw and before the screen paints, so the student does not see the default item flash first.
3. `TestPlayer.tsx`: the first draw never looks for a saved sitting. Straight after, if one is waiting, the test is reopened with it exactly as before (answers kept, clock carrying on from the saved deadline).
4. `src/lib/tutor/client.ts`: the two components that show the notice pass in their own translator.

A new automated test (`tests/hydration.test.ts`) pins cause 1: it fails on the old code and passes on the new.

A read-only code audit of every interactive part, and of every use of the plain translator, found no other place where the first draw depends on the browser. Two places read the language during their first draw without it reaching the screen (`FocusedExercise.tsx`, `WritingFocusedTask.tsx`); they were left alone.

## How it was found

The original probe caught 5 errors in 60 visits by luck. To stop relying on luck, the probe ([evidence/hydration-fix/probe_hydration_wide.py](evidence/hydration-fix/probe_hydration_wide.py)) got a stress mode that delays each part of the page by a random amount before React takes it over. That makes "the answer arrived first" happen on almost every visit, so a race shows up reliably. A development build then names the part and shows the two texts side by side.

## Proof

All on local servers, Chromium, synthetic `@example.test` accounts, simulated payments. "Plain" is an ordinary visit; "stress" is the race-forcing mode above. Each sweep visits 43 pages (including the three linked-item pages) plus "start a practice test, then reload".

### Before (old code)

| Run | Result |
|---|---|
| Trial site, development build, stress, English (all three states) and part of Russian | 55 visits with an error before the run was stopped ([log](evidence/hydration-fix/before/dev-trial-stress-old-code.log)) |
| Open site, development build, linked items and reload mid-test, no stress | 8 of 8 ([results](evidence/hydration-fix/before/dev-open-linked-items-and-resume-old-code.json)) |
| Open site, production build, before fix 4, plain | 35 of 176, all Russian ([results](evidence/hydration-fix/before/production-open-build-before-ru-fix-plain.json)) |
| Open site, production build, before fix 4, stress | 72 of 176, all Russian ([results](evidence/hydration-fix/before/production-open-build-before-ru-fix-stress.json)) |

### After (final code, production builds)

| Site | Screen | Mode | Languages and states | Visits | Errors |
|---|---|---|---|---|---|
| Trial build with simulated payments | Desktop 1440x900 | Plain | EN and RU; signed out, trial, paid | 264 | 0 |
| Trial build with simulated payments | Desktop 1440x900 | Stress | EN and RU; signed out, trial, paid | 264 | 0 |
| Trial build with simulated payments | Phone 390x844 | Plain | EN and RU; signed out, trial, paid | 264 | 0 |
| Trial build with simulated payments | Phone 390x844 | Stress | EN and RU; signed out, trial, paid | 264 | 0 |
| Open build | Desktop and phone | Plain | EN and RU; signed out | 176 | 0 |
| Open build | Desktop and phone | Stress | EN and RU; signed out | 176 | 0 |
| **Total** | | | | **1,408** | **0** |

Results: [evidence/hydration-fix/final/](evidence/hydration-fix/final/). In every record all parts of the page had been taken over before the page was judged, and the stress mode delayed between 1 and 11 parts per page. The 16 simulated purchases made by the sweeps all show as paid on the local backend, so the "paid" rows really were paid accounts.

### The features still work

[hydration_func_check.py](evidence/hydration-fix/hydration_func_check.py), 11 of 11:

- A model-answers link opens on the linked task and shows its note; without a link the first task shows ([screenshot](evidence/hydration-fix/models-deeplink.png)).
- A cue-card link opens that card; without a link the grid shows ([screenshot](evidence/hydration-fix/cue-card-deeplink.png)).
- A band-guide link opens Speaking, Lexical Resource, band 7 ([screenshot](evidence/hydration-fix/bands-deeplink.png)).
- A practice test started, answered and reloaded comes back running, with the answer kept and the clock at 59:49 rather than back at 60:00 ([screenshot](evidence/hydration-fix/test-resumed.png)).

### Standing checks

| Check | Result |
|---|---|
| `npm test` | 2,362 of 2,362 pass (the earlier 2,360 plus 2 new) ([log](evidence/hydration-fix/final/npm-test.log)) |
| `npx astro check` | 0 errors, 0 warnings ([log](evidence/hydration-fix/final/astro-check.log)) |
| Open build | Succeeds ([log tail](evidence/hydration-fix/final/build-open-tail.log)) |
| Trial build (`PUBLIC_ACCESS_MODE=trial`) | Succeeds ([log tail](evidence/hydration-fix/final/build-trial-tail.log)) |
| Leak audit on the trial build | 0 files leak locked content ([log](evidence/hydration-fix/final/leak-audit.log)) |

### Nothing else moved

The trial hook sits under every trial and paid screen, so the two existing journeys that exercise them were run again on the fixed code, against fresh production builds.

| Journey | Before the fix (VERIFICATION.md) | After the fix |
|---|---|---|
| t01, the three-day trial, on a trial build without payments | 89 of 89 | 89 of 89 ([log](evidence/hydration-fix/final/regression-t01-trial-journey.log)) |
| Journey C, the paying student, on a trial build with simulated payments | 113 of 114 | 113 of 114 ([log](evidence/hydration-fix/final/regression-journey-c-paying.log)) |

The one Journey C check that does not pass is the same one as before and is the check, not the site: it looks for the English word "Reading" on the Russian report (see VERIFICATION.md, Journey C).

## Notes for whoever runs this again

- One `npm test` run during this work showed a single failure that was this worktree folder, not the code: `src/data/generated/learning-index.json` had been checked out with Windows line endings and the test compares exact bytes. `npm run learning:index` rewrote it; the content is identical to the committed file.
- A second run showed one test timing out at 10 seconds while two local backends and a build were running on the same machine. It takes 0.2 seconds on its own. The recorded run above was made with nothing else heavy running.
- The scripts copied from `evidence/scripts/` write into whichever folder their `EVROOT`, `ROOT` and `EVIDENCE` lines name. Point them at your own scratch folder before running.

## Limits

Local servers only, Chromium only, no real phone and no Safari. The stress mode makes a race far more likely, it cannot prove one is impossible. Pages that need stored history the probe accounts do not have (for example a report with weeks of results) were covered by the code audit, not by a browser visit with that history.
