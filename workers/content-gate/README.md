# Content gate: the trial's locked door

1 October 2026 update: lesson explanations and selected worked examples are now published directly by the site without an account. See `docs/paid-access/PUBLIC-LESSONS.md`. This service continues protecting practice questions, test papers, recordings and private model packs. Its legacy authenticated lesson endpoint is retained for compatibility; it no longer controls public reading access.

Alex decided on 23 September 2026 that the trial must protect the content itself,
not only the screen. This Worker is how. **Not deployed.** Deploying it, creating the
private bucket and uploading to it are externally visible steps that need Alex's
approval, together with the trial build of the site.

## What it does

In a trial build (`PUBLIC_ACCESS_MODE=trial`) the public site carries no lesson body,
no practice paper, no lesson practice quiz and no answer notes. The pages are shells.
They ask this Worker for their content with the signed-in student's token, and the
Worker asks the database one question before it answers: may this student open this
item right now (`trial_can_open` in `supabase/migrations/2026-09-23-trial.sql`)?

| Route | Content | Who may have it |
|---|---|---|
| `GET /lesson/<key>?locale=en\|ru` | a lesson body | the trial's own lesson, while the trial runs |
| `GET /practice/<set id>` | a lesson's practice quiz | with its lesson |
| `GET /test/<id>` | a practice paper or drill, whole | the section's trial test while the trial runs; a test the student began, at any time |
| `GET /explanations/<locale>/<id>` | translated answer notes | with the paper (or, for a quiz, its lesson) |
| `GET /prompt/<prompt id>` | a Writing question | the trial's essay question, with its Writing test |
| `GET /model/<prompt id>` | a Band 8 model with its question | the trial's one example, with its Task 2 lesson |
| `GET /pack/<name>` | one module's paid material (`packs/<name>.json`) | a running paid grant only |
| `GET /audio/<file>?exp=&sig=` | a listening recording, byte ranges supported | anyone holding a link the gate signed, until it expires |
| `GET /data/tests/<id>.json`, `GET /data/lesson-blocks/<key>.json` | Mr EZ's data | the Mr EZ Worker only, with `CONTENT_SERVICE_KEY` |

**Paid access** (`supabase/migrations/2026-09-30-paid-access.sql`,
`docs/paid-access/CONTRACT.md`): while an account holds a running paid grant,
`trial_can_open` opens every lesson, test, practice set, Writing question, model answer
and pack, whatever the trial includes. A grant exists only once the payments Worker
(`workers/payments`) has recorded a confirmed payment. When it ends, or is refunded,
the trial's own rules apply again (an ended trial stays ended), and packs are refused.
A pack that has not been built yet is 404.

Who is asking comes only from the verified sign-in; the request names only what it
wants. An unreachable database is a refusal (503), never an open door. Every reply is
`Cache-Control: private, no-store`.

## The private store

`node --import ./tests/ts-extension-loader.mjs tools/build-gated-content.mjs` writes
every item into `gated-content/` (git-ignored, never inside `dist/`). In production
that folder is uploaded to a private R2 bucket, `ielts-gated-content`, bound as
`CONTENT` (see `wrangler.jsonc`). Proposed upload, for Alex to approve: create the
bucket in the Cloudflare dashboard (private, no public access), then upload the folder
with `npx wrangler r2 object put` per key, or with rclone, using `gated-content/manifest.json`
as the list. Nothing here has been run.

## Proof

- `tests/trial-content.test.ts`: the real handler against the real migration.
- `tools/trial-content-audit.mjs dist`: after a trial build, searches every public
  file for phrases from every paper and every lesson body. Latest result: no public
  file leaks a paper, an answer or a lesson; six share a single line (a cue-card
  question, a strategy tip, a useful phrase); one named exception (the word-of-the-day
  sampler, `tools/trial-content-allowed.json`, pending Alex's decision).
- `tests/browser/t01_trial_journey.py`: page sources carry no lesson or paper text,
  the allowed student sees the lesson through the gate, locked items never reach the
  browser, the old public data files are gone.

## Recordings

An `<audio>` element cannot send a sign-in, so the gate signs links. Whenever it hands
a student a paper or a lesson quiz they may open, it rewrites every recording that
content names (`/audio/listening/<file>`) to `<AUDIO_BASE_URL>/audio/<file>?exp=&sig=`,
an HMAC of the file and the expiry under `AUDIO_SIGNING_KEY` (a secret nobody else
holds). The audio route checks the signature and the expiry (two hours,
`AUDIO_LINK_MINUTES`) and serves the file from `audio/listening/<file>` in the bucket,
with byte ranges so a student can skip. Without `AUDIO_SIGNING_KEY` nothing is signed
and nothing is served. The recordings are uploaded from `public/audio/listening/`
(listed under `audio` in `gated-content/manifest.json`); a trial build of the site does
not publish them.

## The rest of the material

Everything else the trial does not include (model answers, questions, cue cards, band
guides, the writing and speaking coaches, focused exercises, and their Russian) is kept
out of a trial build's browser by stand-ins (`src/lib/trial/light/`), a trimmed learning
index and trimmed dictionaries; see "The rest of the material" in
`docs/TRIAL-IMPLEMENTATION.md`. The gate serves only the two Writing pieces the trial
shows (its essay question and its lesson example).
