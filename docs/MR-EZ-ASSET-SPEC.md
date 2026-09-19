# Mr EZ: character asset specification

For Codex, who owns Mr EZ's design and final artwork. This document does not
propose a look. It states what the running product needs back, so that whatever
is designed drops in without any code change beyond one file.

What is in the repo right now is a **neutral placeholder**: a rounded capsule
with two dots and a mouth, drawn inline in
`src/components/tutor/MrEzAvatar.tsx`. It exists so the tutor could be built and
tested, and it is meant to be thrown away. It is not a design suggestion and
nothing depends on its shape.

Mr EZ is a **creature or mascot, not a realistic human**. His shape, colours and
details are open.

---

## How the artwork gets installed

One edit, in `src/lib/tutor/avatar.ts`:

```ts
export const hasArtwork = true;   // currently false

export const MR_EZ_ART: Record<TutorMood, string> = {
  idle:        '/mr-ez/idle.svg',
  thinking:    '/mr-ez/thinking.svg',
  explaining:  '/mr-ez/explaining.svg',
  encouraging: '/mr-ez/encouraging.svg',
  celebrating: '/mr-ez/celebrating.svg',
  unavailable: '/mr-ez/unavailable.svg',
};
```

Files go in `public/mr-ez/`. Nothing else changes: the same component renders
them at the same sizes in the same places, with the same animation rules. If a
file is missing or fails to load at runtime the component falls back to the
placeholder rather than leaving a blank square, so a partial set is safe to
commit while the rest is still being drawn.

---

## Required files

Six states. Each one is a separate prepared file; **nothing is generated per
interaction** and no image is ever produced at runtime.

| State | File | When the product shows it |
|---|---|---|
| Idle | `idle.*` | Resting. Nothing happening, nothing being waited for. The default. |
| Thinking | `thinking.*` | A request is genuinely in flight, between sending and the reply arriving. Typically 1 to 4 seconds. |
| Explaining | `explaining.*` | The reply that just arrived was an explanation. The most common answer state. |
| Encouraging | `encouraging.*` | The reply was reassurance or a nudge forward. The dashboard welcome usually lands here. |
| Celebrating | `celebrating.*` | The reply is about something the student actually achieved, backed by a result on record. Rare, and it must feel earned. |
| Unavailable | `unavailable.*` | The tutor cannot be reached, is not configured, or the student's daily limit is spent. Should read as "asleep" or "away", not "broken" or "sad". |

These map one-to-one onto `TutorMood` in `src/lib/tutor/schema.ts`. Every state
is tied to a real interface event, never to sentiment guessed from the text:
`idle`, `thinking` and `unavailable` are owned by the interface, and
`explaining`, `encouraging` and `celebrating` come back from the server with the
reply so the face always matches what was actually said.

---

## Format

**SVG strongly preferred.** He is rendered from 26px to 88px in the same
session, so a vector stays crisp everywhere and keeps the download small.

- Square viewBox, `0 0 64 64` or `0 0 128 128`.
- Transparent background. No baked-in circle, card or drop shadow: the page
  supplies the surface behind him, and it differs by placement.
- No embedded raster images, no external font references, no `<script>`.
- Flat fills and strokes. Gradients are fine; filters and blend modes are best
  avoided (they cost more to paint at 26px than they give back).
- Ship each state as its own file rather than one sprite with ids, so a single
  state can be redrawn without touching the others.

**If PNG is unavoidable**, supply 1x/2x/3x at the displayed sizes below, with a
real alpha channel (no white matte), and say so, because the code path is the
same but the fallback quality is not.

---

## Sizes and where he appears

He is always rendered **square** and clipped to a circle by the page
(`border-radius: 50%` on the avatar). Keep him comfortably inside the circle:
anything in the outer ~8% of the canvas may be cut off.

| Placement | Displayed size | Notes |
|---|---|---|
| Dashboard welcome card | **54 px** | The largest and most-seen instance. Top of `/dashboard`. |
| Panel header | **38 px** | Beside his name, at the top of the conversation drawer. |
| Launcher button | **30 px** | Fixed bottom-right, next to "Ask Mr EZ". On screen on every workspace page. |
| Explain-a-result card | **34 px** | Beside "Ask Mr EZ to explain this result". |
| Each tutor message | **26 px** | The smallest, and it repeats down the conversation. |
| Memory settings | **40 px** | On `/plan-settings`. |

**26px is the size that actually constrains the design.** At that size a face
needs roughly two large eye shapes and one clear mouth to read at all. Fine
line work, small props, text and thin outlines disappear. It is worth checking
every state at 26px before calling it finished.

An optional larger hero version (256px+, same character) would be welcome for a
future empty state or onboarding screen, but nothing currently needs one.

---

## Animation constraints

Movement is **CSS on the prepared file**, not frame-by-frame animation and not
a new image per interaction. Keep that possible:

- Draw each state as a single static pose. The code adds the motion.
- Current motion: idle breathes (a 1.5px vertical drift over 4.5s), thinking
  bobs (2.5px over 1.1s), celebrating pops once on arrival (scale 0.82 → 1.08 →
  1.00 over 620ms). All defined in `src/styles/mr-ez.css`.
- If a part of him should move independently (an antenna, an ear, a tail), give
  that element a stable `id` or `class` in the SVG and list it in the handoff.
  The code can then animate that node alone.
- **Every animation must be able to switch off.** `prefers-reduced-motion:
  reduce` currently disables all of it, and the states still change; only the
  movement stops. Do not rely on motion to distinguish two states.
- No SMIL (`<animate>`), no CSS animation embedded inside the SVG file. It
  cannot be turned off by the page's reduced-motion rule, which makes it an
  accessibility problem rather than a polish detail.

---

## Palette

He sits inside the approved capsule workspace (`DESIGN.md`,
`docs/CAPSULE-REDESIGN.md`) and should look like he belongs there:

| Token | Value | Used for |
|---|---|---|
| Ink | `#263c35` | Forest green, the workspace's text and dark surfaces |
| Surface | `#fffefa` | Warm off-white page surface |
| Surface alt | `#f5f5f0` | The canvas behind cards |
| Border | `#dddfd6` | Hairlines |
| Brand | `#b94b36` | Terracotta, used sparingly as the single accent |
| Soft green | `#e0ebbc` | The "next step" call to action |

The workspace is calm, warm and restrained. One accent colour, generous space,
nothing loud. A character that fights that would be the wrong character, however
good in isolation.

Mr EZ must also read clearly against **both** `#fffefa` (the card and panel
surface) and `#f5f5f0` (the page canvas). He is never placed on a dark
background today.

---

## Content rules

- Not a realistic human, and not a recognisable person.
- No IELTS, British Council, IDP or Cambridge marks, colours or visual
  references. The platform is independent and must not imply endorsement.
- No academic dress, no mortarboard, no owl-with-glasses. The product's whole
  position is that IELTS is approachable.
- Readable as friendly by teenagers and by adults. Some candidates are minors.
- No text inside the artwork: it is never translated and never scales.

---

## What to hand back

1. The six SVG files, named as in the table above.
2. A note of any element ids intended for independent animation.
3. One larger reference render of the idle pose, for the design record.
4. Anything about the character that a future contributor would need in order
   to draw a seventh state consistently.

Open questions that are Codex's to answer, not ours: what he is, his colour
palette within the workspace tokens, whether he has limbs, and whether the
antenna in the placeholder survives (nothing depends on it).
