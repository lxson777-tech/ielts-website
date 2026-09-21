/* Russian: page-level copy that belongs to no other batch.
   Batch owner: the pages agent. Nobody else edits this file.

   Covers: headings, intros and empty states written directly in the .astro
   files under src/pages (including the blog and styleguide shells), plus the
   marketing chrome in src/components/Nav.astro and src/components/Footer.astro.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
