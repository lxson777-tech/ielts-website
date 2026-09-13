# Student character art v4

The character reference was created with the built-in image generation tool.

Design reference: `public/pics/home/student-design-v4.png`

Production pose atlas: `public/pics/home/student-poses-v5.png`

Production walking atlas: `public/pics/home/student-walk-v5.png`

The homepage displays the generated student artwork itself. Static actions use one transparent PNG per pose under `public/pics/home/student-*-v5.png`, so neighboring atlas cells cannot bleed into a pose. Walking keeps the generated head, torso, arms, and backpack intact and uses raster trouser and shoe cutouts from the same approved art as connected leg chains. CSS drives the continuous gait from real road distance through `--walk-phase`; it does not swap full walking pictures. The atlases were generated with the built-in image generation tool, then their painted checkerboard backgrounds were removed locally with user approval to create real PNG transparency.

## Generation prompt

Create a production character design reference sheet for IELTS is EZ, a premium playful adult education website. Brand colours warm ivory, ink charcoal, restrained coral red. NEW consistent young adult female university student, age about 22, natural adult proportions about five heads tall, warm medium skin, expressive small dark eyes, neat dark brown hair in a low ponytail with soft side fringe, coral overshirt over ivory T-shirt, charcoal relaxed trousers, ivory sneakers. Cleaner and more sophisticated than a childish mascot, welcoming confident expression. Style: polished editorial animation concept art, clean vector-like silhouettes, subtle two-tone shading, anatomically connected hands/arms, no heavy black outlines, no photorealism, no glossy clay/plastic, no giant head. One coherent reference sheet on plain ivory background, 3 columns by 2 rows, six separate generously spaced full body poses of EXACTLY THE SAME student and outfit: top left relaxed standing three-quarter facing right; top middle walking facing right with a backpack; top right taking out and opening a real book with both hands; bottom left wearing over-ear headphones one hand gently touching an ear cup; bottom middle sitting naturally on a simple chair at a small side-view desk and writing in an open notebook with connected hand holding pen; bottom right speaking with a calm small open-palm gesture, mouth slightly open, both arms visibly connected at shoulder/elbow and well away from face. Entire figure and all props visible in every cell, feet or chair feet aligned to each cell baseline. No scene backgrounds, no captions, no letters, no labels, no watermarks. Prioritize excellent coherent anatomy, expressive sophisticated character design, and clearly distinct readable actions suitable to adapt into an articulated website animation.
