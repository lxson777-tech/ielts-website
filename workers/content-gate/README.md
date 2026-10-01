# Content gate: the commercial build's locked door

**Free-account model (Alex, 1 October 2026, `docs/paid-access/FREE-ACCOUNT-MODEL.md`).**
Lessons are behind the door again: every lesson is free with an account, and a
signed-out page carries no lesson body, worked example or lesson quiz. Practice, tests,
packs and the model-answer bank are paid. The trial is retired. This replaces the
public-lessons model of the same morning (`docs/paid-access/PUBLIC-LESSONS.md`).

Alex decided on 23 September 2026 that the content itself must be protected, not only
the screen. This Worker is how. **Not deployed.** Deploying it, creating the private
bucket and uploading to it are externally visible steps that need Alex's approval,
together with the commercial build of the site.

## What it does

In the commercial build (`PUBLIC_ACCESS_MODE=trial`, the name stays) the public site
carries no lesson body, no practice paper, no lesson practice quiz and no answer notes.
The pages are shells. They ask this Worker for their content with the signed-in
student's token, and the Worker asks the database one question before it answers: may
this student open this item right now (`trial_can_open`, which since
`supabase/migrations/2026-10-01-free-account.sql` asks `access_can_open`)?

| Route | Content | Item | Who may have it |
|---|---|---|---|
| `GET /lesson/<key>?locale=en\|ru` | a lesson body | `lesson:<key>` | any signed-in account with a completed profile |
| `GET /practice/practice-<skill>-<slug>` | a lesson's own short quiz | `lesson:<skill>-<slug>` | as its lesson |
| `GET /explanations/<locale>/practice-<skill>-<slug>` | that quiz's translated notes | `lesson:<skill>-<slug>` | as its lesson |
| `GET /example/writing-<slug>` | a Writing lesson's one worked example, `{prompt, model}` | `lesson:writing-<slug>` | as its lesson |
| `GET /test/<id>` | a practice paper or drill, whole | `test:<id>` | paid or complimentary access |
| `GET /explanations/<locale>/<test id>` | a paper's translated answer notes | `test:<id>` | paid or complimentary access |
| `GET /prompt/<prompt id>` | a Writing question | `writing-prompt:<id>` | paid or complimentary access |
| `GET /model/<prompt id>` | a Band 8 model with its question (the bank) | `writing-model:<id>` | paid or complimentary access |
| `GET /pack/<name>` | one module's paid material (`packs/<name>.json`) | `pack:<name>` | paid or complimentary access |
| `GET /audio/<file>?exp=&sig=` | a listening recording, byte ranges supported | | anyone holding a link the gate signed, until it expires |
| `GET /data/tests/<id>.json`, `GET /data/lesson-blocks/<key>.json` | Mr EZ's data | | the Mr EZ Worker only, with `CONTENT_SERVICE_KEY` |

Refusals, each `{ error, code, reason }` (code and reason are the same word; the
English sentences have Russian in `src/lib/i18n/dict/ru/g-free.ts`):

| Status | Code | When |
|---|---|---|
| 401 | `sign-in-required` | no valid sign-in |
| 403 | `profile-required` | a lesson, before the student has completed the profile |
| 402 | `paid-required` | anything but a lesson, without paid or complimentary access |
| 403 | `not-included` | an item the database does not recognise |
| 404 | `not-found` | a malformed path, or an item not built into the store |
| 503 | `unavailable` | the database could not be asked (never an open door) |

**Paid and complimentary access** (`2026-09-30-paid-access.sql`,
`2026-10-01-free-account.sql`): a running grant of either kind opens every item. A paid
grant exists only once the payments Worker has recorded a confirmed payment; a
complimentary one only once Alex has given it in /admin. When either ends, or a payment
is refunded, the account is a free one again: every lesson stays open, the rest is
`paid-required`. A trial started before 1 October opens nothing more than a free
account.

Who is asking comes only from the verified sign-in; the request names only what it
wants. Every reply is `Cache-Control: private, no-store`.

## The private store

`node --import ./tests/ts-extension-loader.mjs tools/build-gated-content.mjs` writes
every item into `gated-content/` (git-ignored, never inside `dist/`), including
`examples/writing-<slug>.json` for each Writing lesson that has a worked example. In
production that folder is uploaded to a private R2 bucket, `ielts-gated-content`, bound
as `CONTENT` (see `wrangler.jsonc`). Proposed upload, for Alex to approve: create the
bucket in the Cloudflare dashboard (private, no public access), then upload the folder
with `npx wrangler r2 object put` per key, or with rclone, using
`gated-content/manifest.json` as the list. Nothing here has been run.

## Proof

- `tests/trial-content.test.ts`: the real handler against every real migration
  (signed out, free, no profile, old trial, paid, complimentary, recordings, Mr EZ's
  data, an unreachable database, the build step).
- `tests/free-account-sql.test.ts`: the database's own rules for every tier.
- `tools/trial-content-audit.mjs <commercial build>`: searches every public file for
  phrases from every paper, every lesson body (English and Russian), every lesson quiz
  and every model answer (worked examples included). Since the free-account model no
  public lesson prose is allowed: a signed-out lesson page must carry no lesson body.

## Recordings

An `<audio>` element cannot send a sign-in, so the gate signs links. Whenever it hands
a student a paper or a lesson quiz they may open, it rewrites every recording that
content names (`/audio/listening/<file>`) to `<AUDIO_BASE_URL>/audio/<file>?exp=&sig=`,
an HMAC of the file and the expiry under `AUDIO_SIGNING_KEY` (a secret nobody else
holds). The audio route checks the signature and the expiry (two hours,
`AUDIO_LINK_MINUTES`) and serves the file from `audio/listening/<file>` in the bucket,
with byte ranges so a student can skip. Without `AUDIO_SIGNING_KEY` nothing is signed
and nothing is served. The recordings are uploaded from `public/audio/listening/`
(listed under `audio` in `gated-content/manifest.json`); a commercial build of the site
does not publish them.

## The rest of the material

Everything else that is paid (model answers, questions, cue cards, band guides, the
writing and speaking coaches, focused exercises, and their Russian) is kept out of a
commercial build's browser by stand-ins (`src/lib/trial/light/`), a trimmed learning
index and trimmed dictionaries, and served here as packs to paid and complimentary
accounts; see "The rest of the material" in `docs/TRIAL-IMPLEMENTATION.md`.
