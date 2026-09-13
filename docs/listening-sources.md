# Listening practice sources

The 20 full listening tests come from [PracticePTEOnline](https://practicepteonline.com/), one numbered source page per test. Alex confirmed permission from the publisher on 2026-09-11 to reuse these free materials on the IELTS Portal.

Tests 1 to 5 and 7 to 14, plus 16 to 20, use the numbered URL pattern `https://practicepteonline.com/ielts-listening-test-N/`. Two older pages use different canonical addresses:

- [IELTS Listening Test 6](https://practicepteonline.com/ielts-listening-6/). The apparent `/ielts-listening-test-6/` address redirects to unrelated Test 60.
- [IELTS Listening Test 15](https://practicepteonline.com/listening-15/). The apparent `/ielts-listening-test-15/` address redirects to Test 151, which duplicates the earlier Test 5 material.

The importer is `tools/import_listening.py`. It keeps source HTML in `.tmp/listening-source` for review, downloads each complete MP3, copies original map and diagram images locally, and generates 40 sequential question records per test. The question paper keeps the published instructions, word limits, tables, notes, options, flow charts, and diagrams. Answer entry forms, answer panels, scripts, buttons, and advertising markup are removed.

Unordered two and three answer groups share an `answerPairId`, so the learner can enter the accepted answers in any order without earning duplicate marks. Test 16 is a documented source exception: questions 11 to 14 each request two choices under one question number, and its answer key sits in a visible paragraph after the Show Answers control instead of the usual hidden answer panel. Those four questions use per-question unordered multi-select scoring and still count as questions 11 to 14, one mark each. Question 14 choice E contains the publisher's wording “available for from midday”; it is retained exactly rather than silently edited.

Test 11 has one publisher omission. Its Part 2 question paper contains questions 11, 12 and 13, then jumps directly to the Questions 15-20 heading. Question 14 appears only in the answer key, so its wording and options cannot be recovered from the authorized source. The site keeps number 14 visible to preserve the original 1-40 sequence, labels it unavailable, and excludes it from scoring. Test 11 therefore has 40 numbered slots and 39 scored questions.

Per-part audio timing and transcripts come from local speech-to-text (faster-whisper base.en), not the publisher. `tools/apply_listening_transcripts.py <transcript_dir>` reads each `test-NNN.json` transcript (segments plus detected part-start times) and stamps `startSeconds`, `endSeconds`, and a paragraphed, timestamped `transcriptHtml` onto each part's stimulus in `listening-full-NNN.ts`. It never touches question or answer data, and is safe to re-run. Since it is machine transcribed, it can misspell names, mishear numbers, or render a spoken range like "5 to 12" instead of the answer key's "5-12"; the transcript is shown to students as a study aid only, marked as automatic and possibly imperfect, with the answer key remaining authoritative.
