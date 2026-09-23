# Three-day trial: implementation handoff

Built 23 September 2026 by Claude from `docs/CLAUDE-TRIAL-IMPLEMENTATION-HANDOFF.md`
(Codex's handoff, kept in the root checkout). For Codex's review and Alex's decisions.
Nothing here is deployed, pushed, applied to a real database, or connected to a paid
model. Every proof below is local, against synthetic accounts.

## Where it is

- Branch `claude/ielts-trial-implementation-9790a4`, worktree
  `.claude/worktrees/ielts-trial-implementation-9790a4`.
- Base: `7c5264a`, the newest commit on the current platform branch
  (`claude/todays-tab-ai-tutor-rework-8af4cd`, the personal-learning build with the
  ownership fixes). Not the older marketing checkout in the root folder, which was
  only read for Codex's design files.

## The switch

The live site does not change. Everything is behind one setting, off by default:

| Where | Setting | Values |
|---|---|---|
| Site build | `PUBLIC_ACCESS_MODE` | `trial` switches the trial on; anything else (or unset) is today's open site |
| Each Worker | `ACCESS_MODE` in `wrangler.jsonc` | now `"open"` in all four; `trial` switches that Worker's checks on |

Only the exact word `trial` turns it on, so a missing or mistyped setting can never
lock the live site. The open build was checked in a browser after all changes: normal
Today page, lessons and tests with no gate, `/trial` says there is nothing to start.

## What was built (settled requirements)

**Server-owned trial** (`supabase/migrations/2026-09-23-trial.sql`, a proposal, not applied)
- One trial per account, started only by the student pressing Start, 72 hours from the
  server's clock. Starting again (another device, a second sign-up link, a bookmark,
  after signing out) returns the same trial. The browser cannot write any trial row;
  every write goes through database functions, and the Workers' functions refuse a
  student's own login.
- One test per section, bound to one paper when the student presses Start (a database
  index makes a second live test in a section impossible, even from two tabs).
- Five successfully answered Mr EZ requests per section for the whole trial, no daily
  reset. Each request reserves one message before any money is spent, then is settled
  (answered) or released (failed). A retry re-uses the same request id, so it is counted
  once. A reservation abandoned for five minutes stops counting.

**Mr EZ Worker** (`workers/mr-ez/src/index.ts`, `src/lib/trial/gate.ts`)
- In trial mode the section is worked out from what the request is about (a trial
  lesson, the trial test, the student's own result), never from a label; anything
  outside the trial, and general chat with no section, is refused before any spend.
- Reserve, answer, then settle or release. A deterministic fallback (a model reply the
  Worker rejected) is not charged. A repeated request id after success gets the stored
  answer free, and never a fresh model call. If the trial database cannot be reached the
  Worker refuses (fails closed).

**Graders**
- Essay grader: in trial mode it needs the student's sign-in and their begun Writing
  test, takes a five-minute grading lease (two submissions cannot both be paid for),
  settles on a grade, and releases on failure so the essay can be submitted again.
- Speaking grader and live examiner: in trial mode they refuse before any spend while
  the Speaking test is switched off (see decisions).

**Site** (Codex's design, on the real platform shell)
- `/trial`: the offer (signed out), the existing sign-in, then an explicit
  "Before you begin" screen listing three days, four tests and the per-section Mr EZ
  allowance, then Start. The marketing questionnaire (`?journey=1&band&skill&focus&time`)
  survives the sign-in round trip and is stored as a clearly labelled suggestion, never
  a level.
- Today (`/dashboard`) in trial mode: time left by the server clock, the four section
  tabs (keyboard arrows work), the section's lesson, test and Mr EZ counts with
  available / in progress / used / not open / ended states, and every other lesson in
  the section listed and locked with View plans. Course and Lessons show the same
  library for all sections.
- Every protected page (lessons, trainers, drills, mock exam, model answers, cue cards,
  band guide, vocabulary review, speaking pages) stays covered until the server has
  answered for the signed-in student, then opens or shows a calm reason with the title
  kept. Signed out, session expired, no trial, offline, server failure (with Try again),
  locked, ended and Speaking-not-open each have their own wording (the browser run
  exercised a server failure; the offline wording is covered by code, not a real
  network cut). Direct links obey
  the same checks.
- Test player: the trial paper says "Starting uses your one Reading test"; Start begins
  it on the server before the timer; refresh resumes the same sitting; submitting marks
  it used; other papers and drills are locked. The Writing checker works the same way.
- Mr EZ panel: shows the section and "n of 5 messages left" before a question is asked,
  stops at five with a plain reason, locks when the trial ends, and keeps Try again for
  failures (which use nothing).
- `/plans`: the approved prices (10,000 KZT a month, 25,000 KZT for three months) with
  payment plainly not connected. No checkout, no fake success.
- Russian for every new sentence; paper names stay English inside Russian sentences.

## Proof

| What | Result |
|---|---|
| `npm test` (whole suite) | 1,874 of 1,874 pass (1,822 before, 52 new trial tests) |
| `tests/trial-sql.test.ts`: the migration itself, in PGlite with Supabase's roles and row security | 22 of 22 |
| `tests/trial-worker.test.ts`: the real Mr EZ handler against the real migration | 12 of 12 |
| `tests/trial-graders.test.ts`: the real essay, speaking and live-examiner handlers | 9 of 9 |
| `tests/trial-status.test.ts`: what the screens may say | 9 of 9 |
| `tests/browser/t01_trial_journey.py`: the real site in a real browser | 63 of 63 (`docs/trial/evidence/results-t01.md`) |
| `npx astro check` | 0 errors, 0 warnings, 19 hints (same hints as before) |
| `npm run build`, open and trial | 663 pages each |

The browser journey covers: signed-out offer; sign-up then explicit start; questionnaire
carried over; 72-hour display from the server clock; restarting never restarts; locked
lesson by direct link; the included lesson opens; five Mr EZ messages in Reading then
stop; a failed request (twice, including the site's own automatic retry) uses nothing
and its retry counts once; direct calls to the Worker for a lesson outside the trial,
for general chat and for a sixth message are refused; the browser cannot call the
Workers' database functions; other sections keep their own five; a test outside the
trial and a drill of the trial paper are locked; the trial Reading test begins on the
server, survives a refresh, is used on submit and cannot be reopened; two tabs starting
Listening together get one sitting; a failed essay grade keeps the Writing test and a
successful one uses it; Speaking pages say not open yet; plans page; a second device
sees the same trial and counts; sign-out covers the lesson again without restarting; a
second student on the same device inherits nothing; a server failure keeps content
covered with Try again; expiry from the stored start (dashboard, lesson, Mr EZ, a test
not begun); a Russian phone screen with no sideways scroll; reduced motion. Screenshots
`t01` to `t14` are in `docs/trial/evidence/`.

The ownership audit (`docs/audits/claude-personal-learning-review-2026-09-23.md`) was
rechecked on this base, because the trial must not sit on cross-account behaviour:
- Finding 2 (a cancelled sign-in restoring the previous owner): Codex's own
  `signout-race.mjs` prints anonymous both immediately after sign-out and after the
  cancelled sign-in finishes. Closed.
- Finding 3 (direct entry recorded as anonymous): Codex's own `direct-exam-owner.py`,
  rerun against this branch's build, shows the drill answer only under the signed-in
  account and no anonymous record. Closed.
- Finding 1 (another student's unfinished test): Codex's `independent-browser.py` stops
  early because it looks for the old shared storage key, which the fix removed. The
  owner-scoped tests (`test-session-owner`, `account-isolation`, `delayed-grade-owner`,
  94 of 94) and the other session's browser journeys f22 and f23 cover it. A third
  Codex inspection of that work was pending at the time of writing.

**Not proven** (and not claimed): the migration on a real Supabase project; real
two-device use on real accounts; live AI quality or cost under the trial; the Worker
running on Cloudflare. The local backend's tutor replies are labelled simulated and its
essay assessment says SIMULATED on every line.

## How to run it locally

```bash
MR_EZ_DEV_PORT=8795 MR_EZ_SITE_ORIGIN=http://localhost:4331 node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial
```

```bash
PUBLIC_ACCESS_MODE=trial PUBLIC_SUPABASE_URL=http://127.0.0.1:8795 PUBLIC_SUPABASE_ANON_KEY=local-anon-key PUBLIC_MR_EZ_URL=http://127.0.0.1:8795/tutor PUBLIC_GRADER_URL=http://127.0.0.1:8795/grade-essay npx astro dev --port 4331
```

Then open `http://localhost:4331/ielts-website/trial`. Sign-up on the local backend
needs no email. To see the ended state: `POST http://127.0.0.1:8795/__trial/rewind`
with `{"email": "...", "minutes": 4320}`. `GET /__trial/state` shows the trial tables.

## Decisions still needed (nothing below was invented)

1. **Speaking test**: maximum session length, and whether the one Speaking test covers
   all three parts. Until then the Speaking test is switched off
   (`TRIAL_OFFER.speaking.testEnabled = false` and the matching database row), both
   Speaking graders refuse in trial mode, and the join page says the Speaking test opens
   once its length is confirmed. The Speaking introduction lesson and Mr EZ's Speaking
   messages work.
2. **Which lessons and tests**: proposed, needs confirming. Lessons: Spotting
   Paraphrase (Reading), Part 1. Everyday Conversation (Listening), How to Answer Task 2
   (Writing), Speaking Part 1. Tests: Academic Reading Test 1, IELTS Listening Test 1, the Writing Checker (Task 1 or
   Task 2, the student's choice). The "small exercise" is each lesson's own quick check.
   Changing them is one entry in `src/lib/trial/offer.ts` plus the seed rows in the
   migration (a test fails if the two disagree).
3. **What uses a test** (built as a provisional rule, please confirm or change):
   pressing Start binds the section's test to that paper; Reading and Listening are used
   when submitted, Writing when graded; a failed grade keeps it; an abandoned test stays
   the student's (resumable, cannot be swapped for another paper); a test begun before
   the trial ends can still be finished and graded after it; nothing new starts after it.
4. **General Mr EZ chat**: refused in the trial (not a fifth bucket). On the trial's
   Today page a question is charged to the section tab the student chose. The welcome,
   weekly review, unit notes, plan proposals and focused-exercise marking are off during
   the trial. Paid-plan allowances are not set.
5. **Results after expiry**: nothing is deleted. Today the report and score history stay
   readable after the trial ends; confirm that is the policy.
6. **Repeat trials**: built as one trial per account. A person with a new email gets a
   new trial, and deleting an account and signing up again with the same email would
   too (the trial row is deleted with the account). Blocking that means keeping some
   record of past emails, which is a privacy decision.
7. **Protecting the content itself** (the biggest one before launch): the site is static
   on GitHub Pages, so every lesson, question, answer and transcript is in public HTML
   and JSON. The gate here only decides what the screen shows; a determined student can
   read the page source. Paid AI is protected for real (the Workers check the server).
   Closing the content needs a hosting change, for example a Cloudflare Worker that
   checks the sign-in and the trial before serving restricted lesson bodies and test
   data, with the pages becoming shells. Proposal only; nothing built or deployed.
8. **Existing students and full access**: switching the site to trial mode today would
   lock every current free student out of everything but the trial, including those
   with history. There is no "full access" state yet (no payment, no manual grant
   table), so nobody could have more than the trial. Both need deciding before the
   switch.
9. **Payments, renewals, refunds, support, recording retention**: not built. The plans
   page says payment is not connected.

## If Alex approves applying the database change

In the Supabase SQL editor: paste the whole of `supabase/migrations/2026-09-23-trial.sql`
and run it (idempotent, touches no existing table). Rollback: the commented `drop`
statements at the bottom of the same file, run by hand. Verify: the three tables exist
with row security on, and `select public.trial_status()` as a signed-in user returns
`{"state":"none",...}`. Applying the migration alone changes nothing for students;
only `ACCESS_MODE=trial` on the Workers and `PUBLIC_ACCESS_MODE=trial` on the site do.
The essay grader would also need `SUPABASE_URL` and the service role secret in trial
mode. Each of these is a separate, externally visible step for Alex to approve.

## Deviations from Codex's preview, for Codex to review

- The trial lives inside the existing workspace shell (capsule header, phone dock,
  footer) rather than the preview's own header and side menu, per "reuse the current
  platform shell". The side menu's four places map to Today, the lesson, the test row
  and View plans.
- The Mr EZ panel is the existing panel with a trial line (section and messages left)
  and a launcher subtitle, not the preview's sample-question panel.
- Real lesson and test titles replace the preview's illustrative copy. The library adds
  a "N more guided lessons" row and an expandable list of every locked title.
- Trial headings use Manrope as the preview does; the shell around them uses Bricolage
  (AGENTS.md). Codex should decide whether that mix stays.
- The join page uses the approved Mr EZ artwork already on this branch
  (`/mr-ez/approved-character.png`); the preview's `next-chapter` image is not on it.
- The preview's state selector, reset button, sample time and "Simulate completed test"
  are not carried over anywhere.

## Changed files

New: `supabase/migrations/2026-09-23-trial.sql`; `src/lib/trial/{offer,status,gate,client,react,mode,library}.ts`;
`src/components/trial/{TrialBlock,TrialGate,TrialHome,TrialJoin,TrialPlans}.tsx`,
`src/components/trial/useTrialTest.ts`; `src/styles/trial.css`; `src/pages/{trial,plans}.astro`;
`src/lib/i18n/dict/ru/trial.ts`; `tools/trial-db.mjs`;
`tests/{trial-sql,trial-worker,trial-graders,trial-status}.test.ts`;
`tests/browser/t01_trial_journey.py`; `docs/TRIAL-IMPLEMENTATION.md`; `docs/trial/evidence/*`.

Changed: `workers/{mr-ez,grade-essay,grade-speaking,live-examiner}/src/index.ts` and
their `wrangler.jsonc` (`ACCESS_MODE: "open"`); `src/lib/tutor/{schema,errors}.ts`;
`src/lib/writing/grader.ts`; `src/components/{TestPlayer,WritingTester}.tsx`;
`src/components/tutor/MrEzPanel.tsx`; `src/layouts/{BaseLayout,LessonLayout}.astro`;
`src/pages/{dashboard,start,learn,review}.astro` and the gated trainer, speaking, writing,
mock and band pages; `src/lib/platform-nav.ts`; `src/lib/i18n/dict/ru/index.ts`;
`tests/{i18n.test.ts,mr-ez-harness.ts}`; `tools/mr-ez-dev-server.mjs` (`--trial`);
`package.json` (dev dependency `@electric-sql/pglite`, local testing only);
`supabase/README.md`, `CLAUDE.md`, `AGENTS.md` (short pointers here).
