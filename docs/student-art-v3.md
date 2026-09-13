# Student art v3

The homepage journey uses `public/pics/home/student-actions.png` as a four-pose sprite sheet. The poses are, in order, writing, reading, listening, and speaking. The source image is 1536 by 1024 pixels, with four equal 384 pixel columns. The sheet is referenced by the homepage through the `/ielts-website/pics/home/student-actions.png` base path.

The asset was visually inspected during the AI journey QA pass. It contains one full-body student in each pose and is suitable for the four checkpoint moments. CSS must display one 384 by 1024 frame at a time and account for the source image's light background so no rectangular white block appears against the homepage cream surface. Keep this note with the asset if the sheet is regenerated.
