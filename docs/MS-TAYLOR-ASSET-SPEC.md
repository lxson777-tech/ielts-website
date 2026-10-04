# Ms. Taylor, the live examiner: artwork brief

For Codex, who makes the artwork (Alex, 4 October 2026). Mr EZ's approved art is the style reference:
`public/mr-ez/approved-character.png`. The code contract is `src/lib/speaking/live/examiner-art.ts`.

## Who she is

Ms. Taylor is the IELTS examiner in the live mock Speaking test. An international woman in her thirties,
calm and professional, the way a real British Council or IDP examiner looks on a video call: neat, friendly
but neutral. She is NOT the tutor: Mr EZ is the warm coach. She never grins, frowns, rolls her eyes or reacts
to how good an answer is. Her default face is attentive and neutral, with a slight polite softness.

- Smart casual: a plain blouse or knit top with a simple blazer or cardigan, in the site palette (forest ink
  `#263c35`, warm neutrals, at most a small touch of apricot or the speaking violet `#7453aa`). No logos, no text,
  no lettering anywhere in the image.
- Hair, features and skin tone: an ordinary international examiner; avoid stereotypes and avoid anything that
  reads as a celebrity or a real person.
- Props: a simple notepad or folder and a pen on the desk in front of her. A plain desk edge at the bottom.
  No background scenery: the background must be transparent (the card behind her is drawn by the site).

## Style

The same hand-drawn look as Mr EZ: confident dark ink outline, flat warm fills with soft shading, the same
proportions and level of detail, so the two clearly belong to one product. Calm and premium, not cartoonish,
not anime, not a mascot, not a pill or blob shape (a competitor uses one), not photographic.

## Frames

Head and shoulders plus the desk edge, centred, the same framing and the same size in every frame.
Square canvas, 768 x 768 px, transparent background. Deliver as PNG (the site converts to WebP).

| File | What it shows | Notes |
|---|---|---|
| `listen` | Neutral, eyes open, mouth closed, looking at the student (the viewer) | The base frame. |
| `blink` | Identical to `listen`, eyes closed | Must align pixel for pixel with `listen`. |
| `speak1` | Identical to `listen`, mouth slightly open | Pixel-aligned. |
| `speak2` | Identical, mouth open | Pixel-aligned. |
| `speak3` | Identical, mouth more open, as on a vowel | Pixel-aligned. |
| `glance` | Eyes lowered to her notes, otherwise as `listen` | The short pause before she replies. |
| `write` | Looking down, writing on the notepad | Part 2 preparation minute. |
| `lean` | Leaning very slightly forward, attentive, hands folded | Part 3 discussion. |
| `greet` | A small polite nod, mouth closed, looking at the viewer | Joining the call. |
| `close` | The folder closed in front of her, a single nod | End of the test. |

`listen`, `blink`, `speak1`, `speak2` and `speak3` must differ ONLY in the eyes or the mouth: the site swaps
them many times a second while she talks, so any shift in the head, hair or shoulders shows as a jump.

## Checks before the art is used

- Same person, same clothes, same framing in all ten frames.
- The five aligned frames differ only in eyes or mouth (checked by an automatic pixel difference).
- Neutral expression in every frame; nothing that reads as approval or disapproval.
- No text, no logos, transparent background, 768 x 768.
- Small files after conversion (target under 60 KB each as WebP).
