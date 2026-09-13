# Reading import result

Imported on 2026-09-11 with publisher reuse permission confirmed by Alex.

The source catalogue was checked from the highest numbered reading page downward. Tests 314 and 315 do not exist at their expected URLs. The 20 highest available complete tests are therefore 319, 318, 317, 316, and 313 through 298.

On 2026-09-13 the five original AI-written Reading tests (reading-full-001.ts through 005.ts) were removed, since the 20 imported tests replace them as the full Reading catalogue. The imported tests were renumbered so students see "Academic Reading Test 1" through "Test 20" instead of the publisher's page numbers: reading-full-006.ts became reading-full-001.ts, and so on through reading-full-025.ts becoming reading-full-020.ts. The `source` field (name, URL, permission) on each test is untouched, so the publisher URL below is still the definitive record of provenance; the explicit local-to-source mapping also lives in one place in code, as the `LOCAL_TO_SOURCE` table in `tools/import_reading.py`.

| Local file | Local test | Source test | Source URL |
| --- | ---: | ---: | --- |
| reading-full-001.ts | 1 | 319 | https://practicepteonline.com/ielts-reading-test-319/ |
| reading-full-002.ts | 2 | 318 | https://practicepteonline.com/ielts-reading-test-318/ |
| reading-full-003.ts | 3 | 317 | https://practicepteonline.com/ielts-reading-test-317/ |
| reading-full-004.ts | 4 | 316 | https://practicepteonline.com/ielts-reading-test-316/ |
| reading-full-005.ts | 5 | 313 | https://practicepteonline.com/ielts-reading-test-313/ |
| reading-full-006.ts | 6 | 312 | https://practicepteonline.com/ielts-reading-test-312/ |
| reading-full-007.ts | 7 | 311 | https://practicepteonline.com/ielts-reading-test-311/ |
| reading-full-008.ts | 8 | 310 | https://practicepteonline.com/ielts-reading-test-310/ |
| reading-full-009.ts | 9 | 309 | https://practicepteonline.com/ielts-reading-test-309/ |
| reading-full-010.ts | 10 | 308 | https://practicepteonline.com/ielts-reading-test-308/ |
| reading-full-011.ts | 11 | 307 | https://practicepteonline.com/ielts-reading-test-307/ |
| reading-full-012.ts | 12 | 306 | https://practicepteonline.com/ielts-reading-test-306/ |
| reading-full-013.ts | 13 | 305 | https://practicepteonline.com/ielts-reading-test-305/ |
| reading-full-014.ts | 14 | 304 | https://practicepteonline.com/ielts-reading-test-304/ |
| reading-full-015.ts | 15 | 303 | https://practicepteonline.com/ielts-reading-test-303/ |
| reading-full-016.ts | 16 | 302 | https://practicepteonline.com/ielts-reading-test-302/ |
| reading-full-017.ts | 17 | 301 | https://practicepteonline.com/ielts-reading-test-301/ |
| reading-full-018.ts | 18 | 300 | https://practicepteonline.com/ielts-reading-test-300/ |
| reading-full-019.ts | 19 | 299 | https://practicepteonline.com/ielts-reading-test-299/ |
| reading-full-020.ts | 20 | 298 | https://practicepteonline.com/ielts-reading-test-298/ |

Local image assets under `public/pics/reading/imported/` keep their original `test-<source number>-<n>.<ext>` filenames (e.g. `test-305-1.webp`); only the test's own `id`/`title` fields were renumbered, not the asset names, so re-running the importer doesn't need any asset migration.

`python tools/import_reading.py` rebuilds the records and local image assets from cached source snapshots, reading the source→local mapping from `LOCAL_TO_SOURCE`. `python tools/validate_reading.py` verifies all 800 source answer keys, sequential question numbers, passage structure, visible source task layouts, sanitised markup, and local asset references. Re-run on 2026-09-13 after the renumbering and it still passes: "Validated 20 imported Reading tests, 800 source-keyed questions, passages, layouts, and local assets."

The source contains diagrams in Test 305 (source numbering; local reading-full-013.ts) and table or flow chart layouts in several tests. Their original visible structure is preserved above the answer controls, while the answer controls remain part of the existing test player and scoring system.

Final verification: production build passed after answer normalization fixes. Runtime checks passed for submission, saved results, mobile layout, tables and localized diagrams. Independent scoring checks passed for all 20 tests (40/40 keyed, 0/40 blank), 787 accepted variants and duplicate unordered selections. Normalized passage text/title comparison found no duplicates against the five original Reading tests before those were removed. Local preview: http://localhost:4330/ielts-website/tests/reading-full-319 (source numbering, predates the 2026-09-13 renumbering). No deployment performed.
