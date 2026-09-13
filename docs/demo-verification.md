# Local demo verification

Verified on 2026-09-12 against `http://127.0.0.1:4321/ielts-website` in a fresh headless Chromium context. No account, Supabase, AI grader, or other paid service was called.

## Automated preservation tests

Command:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/listening-*.test.ts
```

Result: 14 tests passed and 0 failed. The catalog contains 5 distinct reading tests and 20 distinct listening tests. Every listening test has four sections and questions 1 through 40 exactly once, for 800 questions total. The tests also confirmed unchanged answer keys, scoring boundaries, harmless answer formatting, unordered answer groups, the intentionally unscored source question, local recordings and images, attribution, and source links.

## Running browser checks

- Desktop shell: the header rendered at 76px high and the study rail at 216px wide.
- Rail: all seven links appeared, Dashboard, My course, Lessons, Trainers, Mock tests, AI speaking, and Account.
- Deployment base: My workspace resolved to `/ielts-website/dashboard`.
- Library: browser data contained 20 unique listening test links and 5 unique reading test links.
- Lesson route: Listening Overview rendered with both the shared header and study rail.
- Full test route: IELTS Listening Test 12 opened without the website header or rail, preserving the focused full screen player.
- Test 12 audio: the local MP3 loaded with browser readiness state 4, native controls enabled, muted during QA, and a duration of 1713.976 seconds.
- Test 12 paper: the first section showed 11 answer blank markers, 10 numbered question navigation buttons, and four section navigation buttons covering 10 questions each.
- Saving: entering an answer and submitting created a real `listening-full-012` attempt in isolated browser local storage.
- Mobile at 390 by 844: the study rail was hidden, the menu opened, `aria-expanded` became true, Escape closed it, and keyboard focus returned to the menu button.
- Mobile player: the timer header and listening audio player were visible after starting Test 12.
- Browser console: no errors were recorded.

## Evidence files

Screenshots and machine readable results are in `.tmp/ez-platform-qa/`:

- `desktop-dashboard-shell.png`
- `desktop-tests-library.png`
- `desktop-listening-012-player.png`
- `mobile-listening-012-player.png`
- `runtime-results.json`

## Vertical homepage v2

The final homepage was checked again after a clean server restart and the successful 125 page final build. The separate type check reported zero errors and zero warnings.

- Ordinary mouse wheel input moved the page through scroll positions 800, 1600, 2400, and 3200. PageDown then advanced it to 4040.
- All four skill checkpoints were present and the finish was reachable.
- Selecting target band 7.5 updated the finish and persisted after a reload.
- All four coach tip disclosures were present, and opening one correctly changed `aria-expanded` and revealed its answer.
- Desktop and 390px mobile layouts had no horizontal overflow.
- Mobile PageDown input advanced naturally through 738, 1476, 2214, 2952, and 3690.
- The moving student did not overlap any checkpoint card on desktop.
- Reduced motion was detected, retained natural scrolling, and used the quiet sticky student treatment.
- The student asset is a 1024 by 1536 RGBA PNG with a transparent background.
- The final clean browser run recorded zero console errors.

Updated evidence is in `.tmp/ez-platform-qa/`: `home-v2-desktop-hero.png`, `home-v2-desktop-finish.png`, `home-v2-mobile-hero.png`, `home-v2-mobile-finish.png`, `home-v2-reduced-motion.png`, and `home-v2-runtime-results.json`.
