# Homepage v10 verification

Verified locally on 2026-09-13 at `http://127.0.0.1:4322/ielts-website` with isolated Chromium and the production build.

## Current experience

The hero headline is “IELTS feels EZ when you know the structure.” A layered stack introduces Reading, Listening, Writing, and Speaking with one pain-solving promise and two short teaching benefits for each skill. The first card begins moving after about one second, followed by roughly three seconds of reading time between transitions. During the 900 millisecond transition, the whole opaque front card moves sideways and scales down, passes behind only after it is spatially separated, and returns as the next card rises. There is no text mask, fade, clipped face, or three-dimensional plane intersection. All four cards stay in the deck through every transition, including Speaking back to Reading. Visitors may choose a card with the indicators. Autoplay continues through hover and keyboard focus, and pauses only when the stack is offscreen or the document is hidden. Reduced motion keeps one card static while retaining manual selection.

The prominent “Choose your target band” control offers 6.5, 7, 7.5, and 8. One ink selection pill slides between the four options, an announced confirmation names the choice, and the value persists locally as a target. “Start your journey” links to Reading. Reading, Listening, Writing, Speaking, and the target destination form one continuous road. Scrolling is native, with no camera control or scroll hijacking. Each road stop is an optional keyboard-accessible shortcut to its section.

The four skill sections keep the alternating desktop layout, large skill headings, three concise teaching points, and matching read, listen, write, and speak poses. Tablet and mobile use a single readable side. The final destination shows the selected target and a positive next-step message.

At the target, the student uses a one-time happy arrival pose and restrained celebration accents. A full-width ink section follows with “Start your IELTS journey today,” a concise platform benefit, and one “Build my study plan” link to `/start`.

## Walking system

One generated raster student follows the painted SVG road. The visible foot anchor uses the component's `(80, 250)` coordinate and the road position is measured through the SVG's real screen transformation.

Walking is driven by distance travelled along the road. A two-bone leg solver places one foot through a planted stance and the other through a lifted swing, with the second leg half a cycle behind. The character does not swap walk pictures, and the gait does not advance while the page is stationary.

## Final checks

- Reading, Listening, Writing, Speaking, and target arrival settled to `read`, `listen`, `write`, `speak`, and `celebrate` respectively.
- Eight road samples produced eight distinct articulated gait phases with alternating feet.
- Gait values remained unchanged for 500 milliseconds after scrolling stopped.
- Target band 7.5 persisted after reload and appeared at the destination.
- Reduced motion used a static Writing pose.
- The final browser run reported zero console errors.
- `npx astro check` and `npm run build` completed successfully.
- A fresh post-build smoke test passed for the hero, anonymous IDP training trust line, and final target at port 4322.
- Autoplay began after about one second and advanced while the pointer or keyboard focus remained on the stack. Moving the stack offscreen paused it.
- Dense 70 millisecond samples confirmed intact opaque card faces, a continuous depth handoff, and no text merge or reset jump.
- Speaking-to-Reading wrapping used the same path, and all four cards remained present.
- The moving card stayed inside the 390 pixel mobile viewport throughout the sampled transition.
- Manual skill indicators, the animated band selection, reduced-motion manual selection, happy target arrival, and the final `/start` CTA passed with zero console errors.

Current dense deck proof is stored in `.tmp/smooth-deck-proof/`, including desktop Reading-to-Listening, Speaking-to-Reading wrap, and mobile Reading-to-Listening sequences. Walking proof remains in `.tmp/final-ik-runtime/`, including `integrated-walk-sequence.png`, and the isolated eight-phase rig proof is `.tmp/gait-contact-sheet-ik-v3.png`.

Decorative arrows were removed from homepage action links while their labels and destinations remain unchanged.

## Completion audit

The final whole-homepage audit on 2026-09-13 exercised the live local page at 1440 by 900 and 390 by 844, plus a reduced-motion mobile context.

- The exact hero promise, four-card deck, automatic advance during hover, manual Speaking selection, and absence of a pause control were confirmed.
- Bands 6.5, 7.0, 7.5, and 8.0 each persisted after reload and updated the journey target.
- Reading, Listening, Writing, Speaking, and Target settled to the correct character states on desktop and mobile.
- The largest measured foot-to-road difference was 0.02 pixels across all ten desktop and mobile stops.
- Mobile document width equalled the 390 pixel viewport width.
- Reduced motion stopped autoplay and walking while preserving keyboard selection of Writing and its static pose.
- Every homepage destination returned HTTP 200, and the browser reported no console or page errors.
- The Reading destination is a practice trainer, so its visible label now accurately says “Explore Reading practice.”

Audit screenshots and machine-readable results are in `.tmp/final-home-audit/`.

