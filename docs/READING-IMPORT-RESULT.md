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

## Corrections to the publisher key

Reviewed on 2026-09-14. An examiner read every flagged question against its own passage and
adjudicated it. The publisher's key is still the default and `tools/validate_reading.py` still
re-reads the source pages to prove we match it. The only sanctioned way to disagree with the
source is the pair of tables at the top of `tools/import_reading.py`:

- `ANSWER_OVERRIDES`, keyed by (local test number, question id), holding the corrected answer
  and the reason for it.
- `GROUP_OVERRIDES`, keyed by (local test number, group title), for corrections to a whole
  question group: its option list, its stated word limit, and its instruction wording.

Both the importer and the validator read these tables through `override_answer()` and
`apply_overrides()`, so a re-import keeps every fix and validation still passes. The validator
also fails if a recorded correction stops matching any question or group, which stops a stale
entry from quietly protecting nothing. Local test numbers below are what students see; the
source page each came from is in the table further up.

### Typos in the published key

| Test | Q | Published key | Corrected to | Why |
| ---: | ---: | --- | --- | --- |
| 9 | 36 | `Entences` | `Sentences` | The passage word is "sentences". The key lost its first letter. |
| 10 | 6 | `Treu` | `True` | Not one of the three permitted True/False/Not Given answers. |
| 15 | 37 | `fingerprint-ing/new-found` | `New-found`, `Fingerprinting` | The hyphen is a line-break artefact. The scorer reads "fingerprint-ing" as two words, so nobody typing "fingerprinting" could score. The passage reads "the new-found method of dactyloscopy (later known as fingerprinting)", so both wordings are accepted. |

### The key's spelling or word form differs from the passage

Each of these groups tells the student to copy a word from the passage, then keys an answer the
passage does not contain. In every case the passage's own form is now the headline answer and the
publisher's form stays accepted, so nobody who trusted the printed key is penalised.

| Test | Q | Published key | Corrected to | Why |
| ---: | ---: | --- | --- | --- |
| 9 | 12 | `Standardized` | `Standardised`, `Standardized` | The passage spells it "standardised". |
| 19 | 30 | `Organized` | `Organised`, `Organized` | The passage reads "organising sport for children". |
| 4 | 4 | `Journal` | `Journals`, `Journal` | The passage reads "The sisters' journals reveal their preference". |
| 7 | 3 | `Hair` | `Hairs`, `Hair` | The passage reads "some hairs covering their bodies". Both forms fit the gap. |
| 10 | 22 | `Reinserted` | `Reinsertion`, `Reinserted` | The gap reads "before the (22) ...... into the patient" and needs a noun. The passage supplies "reinsertion of the genetically altered cells back into the patient". The published form does not fit the gap grammatically. |
| 10 | 37 | `Changeable` | `Changeable`, `Changing` | The gap follows "intelligence is" and needs an adjective. The passage only offers the phrase "intelligence can change", so no single passage word fits, and both forms a student could reasonably produce are accepted. |
| 10 | 40 | `(learning) style` | `Style`, `Learning style` | The instruction says ONE WORD ONLY, so the attainable answer is "style". The two-word form stays accepted but is no longer the headline answer, because it breaks the group's own word limit. |

### The passage contradicts or fails to support the published key

| Test | Q | Published key | Corrected to | Why |
| ---: | ---: | --- | --- | --- |
| 10 | 5 | Not Given | False | Statement: "The US Department of Energy has developed a smart card for its employees." The passage says the Department of Defense has provided smart cards and "the Department of Energy is planning to do the same". A department still planning to act has not yet acted, so the claim is contradicted rather than merely unmentioned. |
| 16 | 29 | Not Given | False | Statement: practitioners "tend to avoid combining the two schools of practice". The passage says "The two practices, however, were not incompatible, a degree of overlap occurring between the two", and then gives an example of one patient's work serving both purposes at once. |
| 11 | 6 | True | Not Given | Statement: "The leaves of the baobab tree can be used to make a medicinal sauce." The passage lists the two uses in separate sentences, "can be used as a medicine" and, two sentences later, "can also be used as a sauce for food". It never says the sauce itself is medicinal, so the combined claim is unsupported, not confirmed. |
| 12 | 20 | C | D | Question: "the possibility of students not being able to sleep well". Paragraph D is the one that mentions sleep ("eye strain, headaches, and difficulty sleeping"). Paragraph C covers over-reliance, distraction and unsuitable content, and never mentions sleep. The published key repeated C from the previous question. |

### Corrections to whole question groups

| Test | Group | Correction | Why |
| ---: | --- | --- | --- |
| 9 | Questions 14-19 | Options A-H to A-I | The instruction says nine paragraphs, A-I, and the passage has nine, but the option list stopped at H. |
| 9 | Questions 27-33 | Options A-I to A-J, instruction "seven paragraphs, A-G" to "ten paragraphs, A-J" | The passage runs A to J and the key itself uses G and I, so the printed instruction was wrong as well as the option list. |
| 9 | Questions 23-26 | Word limit ONE WORD ONLY to NO MORE THAN TWO WORDS | The only answer the passage supports for question 24 is "charging stations". The passage phrase is "charging stations for electric vehicles", and "stations" alone drops the meaning the gap needs, so the stated limit was raised rather than the answer cut down. The other three answers in the group are single words and are unaffected. |
| 10 | Questions 14-18 | Options A-D to A-E | The instruction says five sections, A-E, and the passage has five. |
| 11 | Questions 14-18 | Options A-D to A-E | The instruction says five paragraphs, A-E, and the passage has five. |
| 11 | Questions 27-32 | Options A-I to A-J | The instruction says ten paragraphs, A-J, and the passage has ten. |
| 11 | Questions 33-35 | Options A-J to A-K | The word list printed with the summary runs A to K, where K is "temperature". |
| 12 | Questions 14-20 | Options A-F to A-G | The instruction says seven paragraphs, A-G, and the passage has seven. |
| 18 | Questions 28-33 | Options A-D to A-C | The task matches three people, A to C, but the list offered a fourth letter that answers no question. |

### Systematic scan across all 20 tests

Every reading test was scanned for the same five classes of defect. Counts are of questions or
groups actually changed; everything else was checked and left as the publisher wrote it.

| Class | Found | Where |
| --- | ---: | --- |
| (a) Answers with a typo, or a word form the passage does not contain | 7 | Tests 4 q4, 7 q3, 9 q36, 10 q6, 10 q22, 10 q37, 15 q37 |
| (b) Answer spelled the American way where the passage is British | 2 | Tests 9 q12, 19 q30 |
| (c) Completion answers longer than the group's own word limit | 2 | Test 9 q24 (limit raised to two words), test 10 q40 (one-word answer promoted) |
| (d) Option lists that do not match the range the instruction states | 9 | Tests 9, 10, 11, 12 and 18, listed in the table above |
| (e) Empty or missing answers | 0 | None found. Every one of the 800 questions has a usable answer. |

Three further things the scan surfaced and deliberately left alone: some groups typed as
sentence completion actually take a letter from a printed list rather than a word from the
passage, one paragraph-matching group in test 11 repeats a letter without the usual "you may use
any letter more than once" note, and the test 18 group above matches people rather than
paragraphs. None of these stops a student answering correctly, and all three are faithful to the
publisher's page.

### A hazard the review found in the importer

`tools/import_reading.py` only ever parsed what the publisher's page contains, so it emitted
questions with no `explanation` or `evidence`. Those review notes were written by hand
afterwards, which meant a re-import would have silently wiped every one of them.
`carry_over_teaching_notes()` now reads the existing file before overwriting it and copies the
notes back onto the matching question ids, so re-running the importer keeps the teaching work.

### Verification

- `python tools/validate_reading.py` passes: "Validated 20 imported Reading tests, 800
  source-keyed questions, passages, layouts, and local assets. 14 answer(s) and 9 question
  group(s) carry a recorded correction to the publisher's key." No offline mode was needed: the
  importer reads the cached source snapshots in `.tmp/reading-source/` and only reaches the
  network for a page or image it does not already have.
- `npm test` passes, 128 tests. `tests/reading-answer-key.test.ts` is new and guards this work:
  it scores every corrected answer through the real scorer, checks the superseded answer no
  longer scores, checks all 20 tests still score 40/40 on their own key and 0/40 on a blank
  paper, and checks every option list covers the letters its instruction promises.
- `npx tsc --noEmit -p tsconfig.json` is clean.
- Checked in the running app on the dev server, not only in the data. Eighteen browser runs typed
  each corrected answer into the real test player and submitted: every corrected answer scored,
  and every superseded answer did not. Eight more runs confirmed the corrected dropdowns now
  offer the full letter range. No deployment performed.
