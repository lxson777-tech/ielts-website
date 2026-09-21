/* Russian: Mr EZ's interface.
   Batch owner: the tutor agent. Nobody else edits this file.

   Covers: src/components/tutor/* chrome (panel, welcome, memory,
   "explain this result", the ask-why-wrong button) and the deterministic
   sentences produced in src/lib/tutor/insights.ts, recommend.ts and
   local.ts.

   Mr EZ's own generated speech is not a dictionary job: the Worker is told
   which language to answer in. Only the fixed wording around him lives here.

   See docs/I18N-GUIDE.md for the style rules and the glossary. */

export const strings: Record<string, string> = {};

export const plurals: Record<string, { one: string; few: string; many: string; other: string }> = {};
