# Ms. Taylor on the live examiner: build report (4 October 2026)

The glossy ball with the spinning halos is gone. The live interview (`/speaking/examiner`, the live
drills on `/trainers/speaking`, the mock exam's Speaking leg and the placement's Part 1) now shows
Ms. Taylor in a quiet video-call card: her tile, the student's tile, the written status line and the
captions underneath. She is the drawn artwork (`public/ms-taylor/*.webp`, switched on with
`hasExaminerArtwork = true`), one frame at a time. The session itself (connection, events, timing,
grading calls, the connection report) is unchanged: this is presentation.

## What changed, file by file

| File | What |
|---|---|
| `src/lib/speaking/live/examiner-stage.ts` (new) | The state machine: which scene, which frame, at what rate. Pure; the clock and the random numbers come in from outside. |
| `src/components/speaking/ExaminerStage.tsx` (new) | The card. Stacks the ten frames, swaps or crossfades them, draws the line-portrait placeholder when the art is off or a frame fails to load, the student's tile with a quiet four-bar microphone level, the cue card handed across, the pencil line and the two-minute ring. Exposes `tick()` to the existing animation loop. |
| `src/styles/examiner-stage.css` (new) | The card's look, the desk carried across the tile, the phone focus layout, reduced motion, Mr EZ beside the band. |
| `src/components/LiveExaminer.tsx` | The orb, its halos, ripples and icons are removed; the connecting and interview screens are one stage (no remount between them); the animation loop feeds the stage (one loop at a time); the status line fix; the body flags; Mr EZ beside the band; more `?preview=` states. |
| `src/components/BandReport.tsx` | Optional `aside` beside the band (nothing changes for other callers). |
| `src/components/tutor/ExplainResult.tsx` | Optional `avatarSize` (default 34, as before). |
| `src/lib/speaking/live/examiner-art.ts` | `hasExaminerArtwork = true`. Frame names and paths untouched. |
| `src/lib/i18n/dict/ru/trainers-writing-speaking.ts` | Russian for the ten new strings (the live examiner's batch). Kazakh falls back to Russian. "Part 2" stays English. |
| `tests/examiner-stage.test.ts` (new) | 15 tests for the state machine. |

Not touched, as the coordinator asked: `src/pages/trainers/speaking.astro`, `src/components/GradingProgress.tsx`,
`src/lib/grading/progress.ts`, the session code (`openai-session.ts`, `link.ts`, `connection-report.ts`) and the
logging builder's page-hide listener in `LiveExaminer.tsx` (still there, still first).

## The state machine

Inputs: the test stage (`part1`, `part2prep`, `part2talk`, `part3`, `wrapup`), whether the call is still
connecting, whether the preparation minute is running, whether the closing line has been heard or the finish has
begun, whether a Part 2 drill is still asking its rounding-off question, and every animation frame her output
level, the student's mic level and the link's "examiner audio is playing" flag. It never sees words, captions or
bands: nothing can react to the quality of an answer (a test pins that).

| Scene | When | Frame |
|---|---|---|
| connecting | the call is being set up | `greet`, one polite nod |
| speaking | her audio is playing (any stage, including her closing line) | mouth from her smoothed level: below 0.06 `listen`, below 0.16 `speak1`, below 0.30 `speak2`, else `speak3`; an occasional `blink` when the mouth is closed |
| your turn | Part 1, and Part 2 before the minute, when she is quiet | `listen`, a `blink` every 4 to 6 s (random), breathing 1.5% |
| pause | the student spoke for at least 0.6 s, then 0.7 s of quiet, before she replies (ends after 3.5 s) | `listen` with one blink 120 ms in (see the glance decision) |
| prep | the Part 2 minute is running | `write`; the cue card has slid across from her side; a thin pencil line fills over the minute |
| talk | the Part 2 talk | `listen`, blinks, breathing; a quiet two-minute ring around the student's avatar |
| discussion | Part 3, she is quiet | `lean`, breathing |
| finishing | the test is being concluded, before the closing line | `listen`, blinks |
| closed | the closing line was said and she is quiet, or the finish has begun | `close`, one nod, then the existing grading screen |

Rate: at most 12 frame changes a second (measured in the browser: 47 changes in 10 s, shortest gap 84 ms).
Mouth and blink frames swap instantly (they are pixel-aligned); any other change crossfades in 240 ms, the new
frame fading in over the old so the transparent art never shows through itself.

Reduced motion (my choice, as the brief allowed): no breathing, no nod, no crossfades (instant swaps), no blinks,
and while she speaks the mouth holds a single `speak2`, no faster than four changes a second. Measured: frames seen
`listen` and `speak2` only; no breathing animation.

Accessibility: the portrait, bars, pencil line and ring are `aria-hidden`; the written status line carries the
meaning, with the same sentences as before plus the two fixes below.

## The glance decision

The drawn `glance` has heavy lids and the eyes turned down and to one side. In the card, and switched in and out
(`screens/judgement-glance-in-motion.gif`, `judgement-glance-1440.png` against `judgement-listen-1440.png`), it reads
as a sideways look at the student the moment they stop talking: a side-eye, a reaction to the answer, which is the
one thing she must never have. So the pause rests on `listen` with one blink instead. `glance` stays in the contract
and the frame set; if a redrawn frame looks plainly down at her notes, putting it back is one line
(`SCENE_FRAME.pause` in `examiner-stage.ts`).

## How she sits in the card

The art is square; the tile is wider (5:4 on a wide screen, 4:3 on a phone). Her desk is carried across the whole
tile by a CSS band measured from the art: its dark top edge starts at y 661 of 768 in every frame (13.93% from the
bottom), about 4.5 px thick, wood `#f3bc80`. So the desk reads as one long desk on both sizes, with no seam. During
Part 2 on a phone her tile becomes a speaker thumbnail (2:1, and 5:2 during the preparation minute) and she is shown
chest up, the desk below the crop. The nameplate ("Ms. Taylor · Examiner") sits bottom left, video-call style.

## Phone (390 x 844)

During the interview the page is a focus screen, from inside LiveExaminer only: it sets
`body[data-live-interview="true"]` and `body[data-speaking-session="active"]` while the call is connecting or running,
and removes both on every way out (the end, ending early, a failure, unmount, page hide; put back on page show if
the call is still on screen). Keyed on those: the page heading and intro and the cue-card bank link step aside, the
floating menu bar and the Mr EZ button are hidden, the top padding shrinks, and when the stage first appears the
page scrolls it to just below the header (it is lower down on the trainer page). Both buttons sit side by side and
wrap their own words (the Russian labels are long).

Measured with every state photographed, in English and Russian: the stage, caption and buttons fit one screen with
no horizontal scroll; the card ends at 604 px in Part 1/3, 722 to 791 px in the talk, 743 to 757 px in the
preparation minute (with a four-bullet cue card and the notes box). The menu bar, Mr EZ button and heading come back
on the grading and result screens. `body[data-speaking-session="active"] .ws-tabbar` is also in my CSS (under 768
px), identical to the recorded trainer's rule, so it works before that branch merges.

## The two bugs

1. **"Your turn: speak" beside "Finishing".** Two presentation flags were added (`closing`, set when the closing line
   is heard; `finishing`, set when the finish begins). Once either is set the status says "That is the end of the
   test." and the frame goes to `close`; while the test is being concluded but before the closing line, it says
   "Finishing the test…" instead of "Your turn". A Part 2 drill's rounding-off question is labelled
   "Part 2 · Rounding off" and keeps the normal turn-taking. Seen in the browser:
   `live-*-5-closing.png`, `live-*-6-closed.png`.
2. **Mr EZ's chat during a live interview.** Timed papers set `document.body.dataset.examRunning = 'true'` (TestPlayer,
   MockExam, WritingTester), which MrEzPanel reads. The live examiner now sets the same flag while connecting or
   running, standalone only (in the mock and the placement the page owns that flag for the whole sitting and must not
   have it cleared under it). Seen: during the interview the panel header says "Invigilating: no answers until the
   timer stops" (`live-drill-en-1440-2b-mrez-steps-back.png`); after it, the flag is gone and he is back.

## The result screen

Mr EZ sits beside the band, in the same card (under it on a phone), with his real avatar and moods. For a **drill**
the grade is a stored attempt, so it is the recorded trainer's own `ExplainResult` ("Ask Mr EZ to explain this
result", idle, thinking, then explaining), shown only to a signed-in student. Clicked through against the free
stand-in (a labelled simulated reply): `live-drill-*-8-result.png`, `live-drill-*-9-mr-ez-explains.png`.
Ms. Taylor gives no feedback.

**Open decision for Alex, the full test.** The full interview keeps no attempt row in the progress record Mr EZ reads
(`progress.speaking` holds Part 1/2/3 drills only), so "explain this result" would answer "not in your record". There
he appears with "Questions about this report? Ask Mr EZ, your tutor, from his button at the corner of the page."
(`live-full-*-8-result.png`). Making the full test explainable means recording the full interview as an attempt
(a data change touching the history table, Mr EZ's Worker and his weekly review) and redeploying Mr EZ's Worker:
not presentation, so not done here.

## Performance

The blurred spinning conic halos, the blurred glow, the ripples and the floating core are deleted (the grading
screen's equaliser stays, as it was). The ten frames are preloaded once when an interview starts connecting, and stay
in the page as stacked images. Frame changes come from the existing animation loop: the stage writes the frame, the
scene, the speaker outline and the bars straight to the page only when they change; React does not re-render for a
mouth movement. Only one loop runs at a time.

## Tests and checks

- `tests/examiner-stage.test.ts`: 15 tests (scenes per stage, closing and end, mouth bands, the 12-a-second limit,
  smoothing, blinks every 4 to 6 s, the pause and its single blink, a cough is not an answer, Part 2 and Part 3
  frames, connecting and close, reduced motion, nothing reads words or bands, the preview cycle).
- `npm test`: 2,692 tests, all pass (after the art merge and every change above).
- `npx astro check`: 0 errors, 0 warnings.
- Existing live-examiner browser tests: `tests/browser/f23_delayed_grade_owner.py` sections 7, 8 and 9 (the live
  examiner's start, a switch of account while it connects, a delayed connection), against a stand-in on 4603 and the
  site on 4604. Result: 34 PASS, 0 FAIL (`f23-live-examiner-results.md`; their screenshots are prefixed `mstaylor-`
  in `docs/personal-learning/evidence/final/`, which that script writes to).
- Impeccable's detector over the new files: no findings above advisory; the remaining advisories are the artwork's
  own colours (wall, desk) and two small radii (2 px pencil line, 3 px bars).

## Screenshots (`docs/audits/ms-taylor/screens/`)

- Design preview, every state, `preview-<state>-<en|ru>-<1440|390>.png`: connecting, part1-speaking,
  part1-your-turn, part1-pause, part2 (the minute, writing), talk, part3 (lean), finishing (close);
  `preview-part1-reduced-motion-en-1440.png`; numbers in `preview-results.json`.
- A whole simulated interview, `live-<drill|full>-<en|ru>-<1440|390>-<n>-<state>.png`: menu, connecting, she speaks,
  your turn, closing, closed, grading, result with Mr EZ, and (drills) Mr EZ's explanation; numbers in
  `live-results-<lang>-<width>.json`.
- Her mouth moving: `mouth/live-mouth.gif` (in a running session, from the page's own level meter) and
  `mouth/preview-mouth.gif`, with the frames as `mouth/live-NN.png` and `mouth/preview-NN.png`.
- The glance judgement: `judgement-glance-in-motion.gif`, `judgement-glance-*.png`, `judgement-listen-*.png`.

How they were made, nothing paid and nothing external: `scripts/preview_shots.py` drives `?preview=` on a dev server
with no backend at all; `scripts/live_shots.py` drives a dev server whose accounts and Mr EZ are the free local
stand-in (`tools/mr-ez-dev-server.mjs`, simulated replies), with `scripts/live_fixture.js` answering the live examiner
and the grader inside the page (a real WebRTC peer, a scripted Part 1, a voice-like tone, and an assessment whose every
comment says SIMULATED). Chromium's fake microphone beeps without a break, so in the live run the student is never
quiet and the pause is shown in the preview instead.

## Left for the real artwork, and other notes

- Done with the drawn frames: switched on, preloaded, cropped and desk-matched. If the art is redrawn, re-measure the
  desk (`--es-desk`, `--es-desk-fill`, `--es-desk-line` in `examiner-stage.css`) and reconsider `glance`.
- `lean` differs very little from `listen` in the drawing; Part 3 is still told apart by the label and the status.
- The placeholder line portrait stays as the fallback when a frame fails to load.
