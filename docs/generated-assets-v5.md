# Generated homepage assets, version 5

Created with the built-in image generator. Final use and transparency checks are recorded below.

## AI Coach
Final asset: `public/pics/home/coach-hero-v1.png`

Status: retained as a generated source but no longer displayed. The user rejected the generic robot visual. The current hero presents an original layered Speaking example and Coach feedback instead. See `docs/homepage-design-v6.md`.

```text
Create a premium AI Coach hero illustration for IELTS is EZ, an adult education website with warm white, charcoal ink and coral-orange brand colours. One original friendly intelligent abstract robotic tutor, a small refined floating sculptural bust with smooth ivory ceramic outer shell, dark charcoal glass face with two subtle warm amber eye lights, a tasteful coral-orange collar accent, soft brushed-metal details. Sophisticated modern design, calm approachable intelligence, not a toy, not a child's cartoon, not a human teacher, not a girl, not a generic purple neon robot. Three-quarter view facing slightly left toward headline. Around it are just three small elegant floating translucent rectangular analysis tiles at different depths: a tiny handwritten-line motif, a clean sound waveform, and three precise check marks. No words or letter-like text. Clear hierarchy: face is main focus, generous negative space. Soft studio lighting, subtle realistic reflections, warm restrained palette, superb rendering. Genuinely transparent alpha background outside the tutor and the three small floating tiles, no large circle, no halo, no sphere frame, no background gradient, no ground, no watermarks. All elements fully contained with generous margins. This will be animated gently in CSS in a website hero; produce polished actual raster art ready to display.
```

## Student pose sheet
Source reference: `public/pics/home/student-design-v4.png`

```text
Edit this exact character reference sheet into a production transparent sprite atlas. Preserve the beautiful ACTUAL illustrated girl, her face, low ponytail, coral shirt, charcoal trousers, shoes, detailed illustration style and all six actions. Do not simplify her into an icon or crude vector drawing. Keep all six illustrations: relaxed standing, walking, holding and reading open book, wearing headphones, sitting at desk writing, calm open-palm speaking. Remove the ivory background completely, including its texture and floor shadows, and give the image genuinely transparent alpha everywhere outside the characters and props, NOT a checkerboard pattern painted into the image. Arrange the six poses in a precise equal 3-column by 2-row grid, reading order exactly the same as the reference. No grid lines. Each cell has identical dimensions and generous transparent margins. Centre each complete figure horizontally in its cell and place the ground/shoe baseline at 94 percent of that cell height. Equal standing body size for every standing pose; seated scene naturally shorter but the chair and shoes share the same ground baseline. Keep entire desk and chair within the middle bottom cell. Nothing touches or crosses cell boundaries, no crop of hair/limbs/props. No new text, labels, logos, border or background. The actual original art quality must be retained.
```

## Walking sheet

```text
Using this exact illustrated female student as identity and style reference, create a high-quality walking-animation sprite atlas, genuinely transparent alpha background. Same face, dark low ponytail, coral open shirt, cream T-shirt, charcoal wide-leg trousers, white sneakers, small dark backpack. Preserve the sophisticated detailed editorial illustration quality; do not redraw as flat geometric icon. Six successive frames of ONE walking-in-place cycle facing right, in a perfectly even 3-column by 2-row grid, read left-to-right then next row. Frame1 left foot forward contact, frame2 weight moves to left foot/right foot lifts, frame3 right foot passes left, frame4 right foot forward contact, frame5 weight moves to right foot/left foot lifts, frame6 left foot passes right. All six full-body figures have identical scale, face and clothes, horizontal centre and ground baseline at 94 percent of each identical cell's height. Natural connected anatomy and subtle opposite arm swing. All complete figures and feet fit comfortably within cell margins; no cropping or overlaps. Clean genuinely transparent background, no opaque white/ivory panels, no painted checkerboard, no captions, no grid lines, no shadows outside figure. The sheet will be shown one cell at a time as a walking cycle, so registration and consistent proportions are essential.
```

## Transparency correction attempt

```text
Remove the background from this image. The gray and white checkerboard is currently painted into the pixels and MUST be removed. Return a real transparent PNG cutout with an actual alpha channel. Preserve every illustrated person, their detailed face and hair, all clothing, books, headphones, chair and desk exactly as shown, in exactly the same positions, sizes and 3-by-2 grid. Do not redraw or simplify the characters. Only remove the entire checkered background outside their silhouettes, including checkerboard inside gaps between limbs and chair/desk legs. No white background, no black background, no fake transparency pattern. True background removal only.
```

Both student correction attempts returned RGB with a painted checkerboard. The user then explicitly approved local background removal. Local image processing produced genuine RGBA pose and walking sheets, preserving the generated artwork. Individual pose crops avoid neighbouring atlas cells bleeding into the displayed pose. Coach has genuine RGBA transparency directly from the built-in generator.

Final student sheets: `public/pics/home/student-poses-v5.png` and `public/pics/home/student-walk-v5.png`. Source generation originals remain in the Codex generated-images folder. Background cleanup uses `.tmp/remove_checkerboard.py`, with final visual checks against contrasting backgrounds and inside the running website.

Displayed pose files in `public/pics/home/`: `student-idle-v5.png`, `student-read-v5.png`, `student-listen-v5.png`, `student-write-v5.png`, `student-speak-v5.png`, and six walking frames named `student-walk-1-v5.png` through `student-walk-6-v5.png`. These are crops of the generated artwork, not SVG redraws. The single traveller retains its shared road contact point when its pose changes.

Later walking revision: the user rejected cycling the whole walking frames because the source sheet had too few distinct poses. Those frames are retained as source material. The runtime walking figure now uses articulated cutouts from the artwork, driven by distance along the road. The approved study poses remain complete generated images.
