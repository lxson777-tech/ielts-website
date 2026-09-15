# Reading import result

Imported on 2026-09-11 with publisher reuse permission confirmed by Alex.

The source catalogue was checked from the highest numbered reading page downward. Tests 314 and 315 do not exist at their expected URLs. The 20 highest available complete tests are therefore 319, 318, 317, 316, and 313 through 298.

| Local file | Source test | Source URL |
| --- | ---: | --- |
| reading-full-006.ts | 319 | https://practicepteonline.com/ielts-reading-test-319/ |
| reading-full-007.ts | 318 | https://practicepteonline.com/ielts-reading-test-318/ |
| reading-full-008.ts | 317 | https://practicepteonline.com/ielts-reading-test-317/ |
| reading-full-009.ts | 316 | https://practicepteonline.com/ielts-reading-test-316/ |
| reading-full-010.ts | 313 | https://practicepteonline.com/ielts-reading-test-313/ |
| reading-full-011.ts | 312 | https://practicepteonline.com/ielts-reading-test-312/ |
| reading-full-012.ts | 311 | https://practicepteonline.com/ielts-reading-test-311/ |
| reading-full-013.ts | 310 | https://practicepteonline.com/ielts-reading-test-310/ |
| reading-full-014.ts | 309 | https://practicepteonline.com/ielts-reading-test-309/ |
| reading-full-015.ts | 308 | https://practicepteonline.com/ielts-reading-test-308/ |
| reading-full-016.ts | 307 | https://practicepteonline.com/ielts-reading-test-307/ |
| reading-full-017.ts | 306 | https://practicepteonline.com/ielts-reading-test-306/ |
| reading-full-018.ts | 305 | https://practicepteonline.com/ielts-reading-test-305/ |
| reading-full-019.ts | 304 | https://practicepteonline.com/ielts-reading-test-304/ |
| reading-full-020.ts | 303 | https://practicepteonline.com/ielts-reading-test-303/ |
| reading-full-021.ts | 302 | https://practicepteonline.com/ielts-reading-test-302/ |
| reading-full-022.ts | 301 | https://practicepteonline.com/ielts-reading-test-301/ |
| reading-full-023.ts | 300 | https://practicepteonline.com/ielts-reading-test-300/ |
| reading-full-024.ts | 299 | https://practicepteonline.com/ielts-reading-test-299/ |
| reading-full-025.ts | 298 | https://practicepteonline.com/ielts-reading-test-298/ |

`python tools/import_reading.py` rebuilds the records and local image assets from cached source snapshots. `python tools/validate_reading.py` verifies all 800 source answer keys, sequential question numbers, passage structure, visible source task layouts, sanitised markup, and local asset references.

The source contains diagrams in Test 305 and table or flow chart layouts in several tests. Their original visible structure is preserved above the answer controls, while the answer controls remain part of the existing test player and scoring system.

Final verification: production build passed after answer normalization fixes. Runtime checks passed for submission, saved results, mobile layout, tables and localized diagrams. Independent scoring checks passed for all 20 tests (40/40 keyed, 0/40 blank), 787 accepted variants and duplicate unordered selections. Normalized passage text/title comparison found no duplicates against the five existing Reading tests. Local preview: http://localhost:4330/ielts-website/tests/reading-full-319 . No deployment performed.

## Second import (2026-09-14)

Same publisher reuse permission (confirmed 2026-09-11) covers this batch. `tools/import_reading.py`
now takes the source numbers and first output index on the command line
(`--numbers`, `--start`, `--target`), so a new batch no longer requires editing the script; run
with no arguments and it reproduces the original 20-test import unchanged (verified: reading-full-006.ts
through reading-full-025.ts came back byte-for-byte identical after every fix below).

The catalogue was checked downward from test 297 (298 and below are already imported).
All twenty of 297 down to 278 turned out to be complete, unique tests, so no numbers were skipped
in this range.

| Local file | Source test | Source URL |
| --- | ---: | --- |
| reading-full-026.ts | 297 | https://practicepteonline.com/ielts-reading-test-297/ |
| reading-full-027.ts | 296 | https://practicepteonline.com/ielts-reading-test-296/ |
| reading-full-028.ts | 295 | https://practicepteonline.com/ielts-reading-test-295/ |
| reading-full-029.ts | 294 | https://practicepteonline.com/ielts-reading-test-294/ |
| reading-full-030.ts | 293 | https://practicepteonline.com/ielts-reading-test-293/ |
| reading-full-031.ts | 292 | https://practicepteonline.com/ielts-reading-test-292/ |
| reading-full-032.ts | 291 | https://practicepteonline.com/ielts-reading-test-291/ |
| reading-full-033.ts | 290 | https://practicepteonline.com/ielts-reading-test-290/ |
| reading-full-034.ts | 289 | https://practicepteonline.com/ielts-reading-test-289/ |
| reading-full-035.ts | 288 | https://practicepteonline.com/ielts-reading-test-288/ |
| reading-full-036.ts | 287 | https://practicepteonline.com/ielts-reading-test-287/ |
| reading-full-037.ts | 286 | https://practicepteonline.com/ielts-reading-test-286/ |
| reading-full-038.ts | 285 | https://practicepteonline.com/ielts-reading-test-285/ |
| reading-full-039.ts | 284 | https://practicepteonline.com/ielts-reading-test-284/ |
| reading-full-040.ts | 283 | https://practicepteonline.com/ielts-reading-test-283/ |
| reading-full-041.ts | 282 | https://practicepteonline.com/ielts-reading-test-282/ |
| reading-full-042.ts | 281 | https://practicepteonline.com/ielts-reading-test-281/ |
| reading-full-043.ts | 280 | https://practicepteonline.com/ielts-reading-test-280/ |
| reading-full-044.ts | 279 | https://practicepteonline.com/ielts-reading-test-279/ |
| reading-full-045.ts | 278 | https://practicepteonline.com/ielts-reading-test-278/ |

Before each test was accepted, its passage titles and passage text (normalised: tags stripped,
lower-cased, punctuation collapsed) were compared against every existing reading-full-006.ts
through reading-full-025.ts test and every other test already written in this batch. None of the
twenty matched an existing passage, so nothing was skipped as a duplicate. `tools/validate_reading.py`
now repeats this same cross-test comparison as its last check, over whatever reading-full-NNN.ts
files exist (not a fixed count), so a future batch that does introduce a repeat will fail validation
rather than ship silently.

New source quirks found and fixed generally in `tools/import_reading.py` (not by hand-editing any
generated file):

| Quirk | Symptom | Fix |
| --- | --- | --- |
| Some pages render the `<title>` tag as "IELTS&nbsp;&nbsp;Reading Test N" (a doubled space) instead of a single space | The importer's "does this page exist" check reported real pages (e.g. test 250, 266-295) as missing | The title regex now tolerates any run of whitespace between words instead of assuming exactly one space |
| Source instructions phrase a two-answer question as "Which TWO features..." or "...choose TWO from below" rather than the fixed set of nouns the classifier recognised ("letters/answers/statements/facts") | Two-answer groups were misread as an ordinary multiple-choice or sentence-completion group, leaving the shared answer pool and choice list out and the per-question prompt blank | The classifier now recognises "choose/select/which TWO\|THREE ..." generally, excluding only the "NO MORE THAN TWO WORDS" word-limit phrasing it would otherwise wrongly catch |
| One source page numbers its last blank as "22 ………" with no period after the number, unlike "19.", "20.", "21." earlier in the same list | Question 22 lost its prompt text entirely; it silently merged into question 21's | The numbered-blank finder now also accepts a bare number directly followed by a run of blank-placeholder characters (dots/ellipsis/underscores), not only a number followed by a period or bracket |
| One page runs passage 3's bolded title straight on from passage 2's last question, with no blank separator line the title-finder relied on | The importer could only find 2 of the page's 3 passage titles and refused to import it | Added a fallback pass that also accepts a line that is *entirely* wrapped in `<strong>` as a title, used only when the normal rules (blank line before it, or ALL-CAPS) don't already find all three — so it can't mistake a bolded internal sub-heading inside one long passage (seen on another test, where an article has several bolded sub-headings of its own) for a passage title; that fallback is tried second and only substitutes if the first pass comes up short |

Verification: `npx tsc --noEmit` passed for the whole `src/` tree (the new files type-check even
though they aren't registered in `src/data/tests/index.ts` yet — left alone per instruction, so the
orchestrator can register them separately). `python tools/validate_reading.py` output:

```
Validated 40 imported Reading tests, 1600 source-keyed questions, passages, layouts, local assets, and cross-test duplicates.
```

Each of the 20 new files has exactly 40 questions and 3 passages (checked individually, not just
the 1600 total). Four new local images were pulled in for this batch (`test-282-1.png`,
`test-283-1.png`, `test-296-1.webp`, `test-296-3.webp`), about 0.1 MB total, bringing
`public/pics/reading/imported/` from 68 KB (3 files) to 172 KB (7 files).

Not done in this pass: registering reading-full-026.ts through reading-full-045.ts in
`src/data/tests/index.ts` (explicitly out of scope for this task), and no dev server or production
build was run against the site itself since the new tests aren't wired in yet to browse.
