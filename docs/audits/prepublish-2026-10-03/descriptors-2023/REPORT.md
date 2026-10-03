# Current official band descriptors (3 October 2026)

Alex decided the site should use the current official descriptors and supplied the two ielts.org PDFs
(Writing "Updated May 2023", and Speaking). Builder commits `bcc4e2a` and `9f3a576`, merged here.

## What changed
- `workers/grade-essay/src/index.ts`: the four Writing scales quoted line by line from the PDF, separately
  for Task 1 and Task 2; features printed in bold tagged "[limits the rating]"; guidance lines rewritten so
  every phrase they quote exists in the new text. Models, temperatures, examiner samples, the Gemini fallback
  and the result format are unchanged.
- `workers/grade-speaking/src/index.ts`: it held a shortened copy of the older descriptors; all four scales
  replaced with the PDF text and its notes, guidance rewritten to match.
- `src/data/band-guides.ts` and its Russian: 54 explanations rewritten, one added (memorised phrases).
- Lessons `writing-task2-method`, `writing-discussion`, `writing-twopart` (English and Russian).
- New `tests/descriptor-quotes.test.ts`: every phrase quoted in the band guides and in both graders'
  guidance must exist in the new descriptor text (it fails on the old guides). `tests/grade-essay-worker.test.ts`
  pins the 2023 wording.

## What changed for students (short)
- Writing: band 7 needs "a clear and developed position"; band 6 conclusions may be "unclear, unjustified or
  repetitive"; some features now cap a criterion (for example missing paragraphs cap Coherence and Cohesion at
  5, almost only simple sentences cap Grammar at 4); paragraphing is described from band 3 to 7; Task 1 band 7
  needs "a clear overview", band 6 only "a relevant overview is attempted".
- Speaking: "produce long turns"; band 7 allows searching for words if coherence holds; pronunciation now
  describes rhythm, stress-timing and connected speech; band 9 "Accent has no effect on intelligibility".

## Proof
`npm test` 2620 of 2620, `npx astro check` 0 errors, `lesson-ru check --all` clean.

## Before students see it
A small paid check run of both graders (Alex approved), then redeploying both Workers (Alex approved),
regenerating the paid content packs and restarting the local stand-in.

## Deployed (3 October 2026, Alex approved)
- Essay grader `ielts-grade-essay`, version 46483d01-3d1d-4ce9-8f6c-dac9d467f61a (previous b9433298-3b62-4972-94d4-900d0af2d14a,
  20 September). Live check: one Band 8 model essay graded 9/9/9/9 in 44 seconds, comments in the new wording.
- Speaking grader `ielts-grade-speaking`, with the Fluency tune (`grader-check/SPEAKING-TUNE.md`), version
  29ab47ec-ac11-4a05-9aa0-d5da54b3ed46 (previous 47ed34cd-e44a-403a-8e0d-6498332da08e). Live check: a 25-second
  clip graded end to end in 32 seconds (the clip was paired with an unrelated question, so the bands are a
  plumbing check only).
- Both still run with ACCESS_MODE "open": no sign-in, allowance or usage records, exactly as before.
- Rollback: `npx wrangler rollback <previous version id>` in the Worker's folder.
- Paid spend today: check run $2.95, speaking tune $0.52, two live checks about $0.20.
