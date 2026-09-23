# Content gate: the trial's locked door

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
| `GET /data/tests/<id>.json`, `GET /data/lesson-blocks/<key>.json` | Mr EZ's data | the Mr EZ Worker only, with `CONTENT_SERVICE_KEY` |

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

## Not covered yet

Supporting libraries still ship inside the site's code: model answers, cue cards,
band guides, writing and speaking prompts, focused-exercise content, the writing
coach's phrase bank. Listening recordings are public audio files. Locking those needs
the same pattern (content through the gate) and, for audio, short-lived signed links.
