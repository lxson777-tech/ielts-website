/* Russian: the titles and descriptions held in the course and lesson
   registries, as opposed to the components that render them.
   Batch owner: the course-data agent. Nobody else edits this file.

   Covers: COURSE_UNITS names and blurbs in src/lib/course.ts, and the lesson
   titles, blurbs and eyebrows in src/data/lessons.ts, reading.ts, listening.ts,
   writing.ts, speaking.ts and vocabulary.ts, marked where they are written with
   nt() and translated where they are rendered.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
