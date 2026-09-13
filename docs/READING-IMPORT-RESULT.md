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
