# Three-day trial: implementation handoff

Built 23 September 2026 by Claude from `docs/CLAUDE-TRIAL-IMPLEMENTATION-HANDOFF.md`
(Codex's handoff, kept in the root checkout). For Codex's review and Alex's decisions.
Nothing here is deployed, pushed, applied to a real database, or connected to a paid
model. Every proof below is local, against synthetic accounts.

## Where it is

- Branch `claude/ielts-trial-implementation-9790a4`, worktree
  `.claude/worktrees/ielts-trial-implementation-9790a4`.
- Built on `7c5264a`, then merged with the current platform branch
  (`claude/todays-tab-ai-tutor-rework-8af4cd`) at `1701b97` and again at `dd03541`,
  which carry the fixes for Codex's third and fourth ownership inspections. The second
  merge had one conflict in `TestPlayer.tsx`, resolved by keeping the platform's
  "finish the sitting before recording anything" order and reporting the trial test
  after the result is recorded (the platform session confirmed that order). Then merged
  again at `c5cf425`, where the platform session had folded in the published `main`
  (`9b775df`, marked-question vocabulary practice) and resolved its conflicts; the only
  conflict here was two neighbouring style imports, both kept, and one sentence ("See my
  results") that the merged work already translates, whose Russian is now theirs.
  Then merged at `defa6f1` (three more screens bound to their student, and a sign-in
  that no longer announces a false account change), cleanly, and on 24 September with
  the published `main` (`fb65080`, the study platform as released), cleanly. Everything
  below was rerun after that merge. Not built on the older marketing checkout in the root folder,
  which was only read for Codex's design files.

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
- Speaking grader and live examiner: see "The Speaking test" below (Part 1, about five
  minutes, Alex's decision).

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
  locked, ended and Speaking-not-open (only if the Speaking test is switched off) each have their own wording (the browser run
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

## Alex's decisions (23 September 2026)

Recorded in the second brain (`Decisions/2026-09-23 IELTS trial content, test rule,
Speaking length and content protection`):

- **Trial content as proposed**: Spotting Paraphrase + Academic Reading Test 1;
  Part 1. Everyday Conversation + IELTS Listening Test 1; How to Answer Task 2 + one
  Writing Checker essay; Speaking Part 1 + the Speaking test. Each lesson's own quiz is
  the "small exercise".
- **What uses a test, as built**: pressing Start binds the section's test to that paper;
  it is used when submitted (Reading, Listening) or graded (Writing, Speaking); a failure
  on our side uses nothing; an abandoned test stays the student's; a test begun before
  the end can be finished after it; nothing new starts after the end.
- **Speaking test: Part 1 only, about five minutes.** Built end to end (below): the
  examiner screen, the live examiner and the speaking grader.
- **Protect the content itself, built locally first.** Built (below), not deployed.

Two safeguards Claude added and flags as adjustable, not decided by Alex: a trial
Speaking interview is hung up by the server after five minutes (a once-a-minute check,
so at most about six), and at most two interviews may start under the one Speaking test
(the first, and one retry after a dropped connection). Alex decided (23 September) that
an interview whose connection failed before the examiner began is given back: the
Worker's end route releases it when that call is what ended the session, the begin cue
never arrived, and it came within 90 seconds of opening (`TRIAL_UNUSED_SESSION_SECONDS`).
An interview the examiner began counts however it ends, and so does a quiet one reported
late, so a session cannot be held open as free voice time. A browser that never reports
the end (a closed tab) gives nothing back.

## The Speaking test (built)

- The screen (`LiveExaminer.tsx`, trial build, `/speaking/examiner` only): a trial
  student sees "Your trial Speaking test", Part 1 of the real test, about five minutes,
  and whether Start uses the one test. Start binds the test on the server first
  (`useTrialTest`, nothing used if that fails), then opens a Part 1 session carrying
  that sitting id (`trialSitting`, added beside the owner guards the platform session
  built, never around them). The questions conclude at 4.5 minutes and the interview is
  finished at five whatever happens. The grade goes to the speaking grader with the
  student's sign-in and the same sitting id. A voice session that fails to open, or a
  grade that fails, says "Nothing was used" / "Your test has not been used" and Start
  works again; a graded interview uses the test and the page then says so. The trial's
  refusals are worded in English and Russian. On the open site none of this runs: the
  session and grade requests are byte-for-byte what they were.
- The page gate opens `/speaking/examiner` to any student whose trial includes the
  test; the examiner itself says when it is used or ended, so the band report stays on
  screen after grading. The part-by-part Speaking trainer (`/trainers/speaking`) and the
  cue-card bank are not in the trial and are locked like other trainers.

- Live examiner, trial mode: opens a paid voice session only for the student's own begun
  Speaking test, only in Part 1, counts it (at most two), and gives the count back if the
  session never opens. The Gemini rollback has no sign-in, so it cannot be the trial.
- A cron trigger (every minute, in `workers/live-examiner/wrangler.jsonc`) runs
  `closeOverdueTrialSessions`: every session still open after five minutes is sent
  `session.close` over the server's own channel and marked ended. On the open site it
  does nothing. Whether OpenAI stops billing the moment that close arrives is not proven
  without a short paid check, which needs Alex's approval (cost: at most one five-minute
  session, about $0.25).
- Speaking grader, trial mode: grades only the live interview of the begun test, uses the
  test on a grade, keeps it on a failure.

## The locked door (built locally, not deployed)

In a trial build the public site no longer carries any lesson body (English or Russian),
lesson practice quiz, practice paper or drill, answer notes, or Mr EZ's data files. The
pages are shells; `workers/content-gate` hands each item to a signed-in student only
after the database says that student may open it now (`trial_can_open`). The content
lives in a private folder (`gated-content/`, written by `tools/build-gated-content.mjs`)
that stands in for a private storage bucket. The open site is unchanged. Details and the
upload proposal: `workers/content-gate/README.md`.

Measured with `tools/trial-content-audit.mjs`, which searches every public file of a
build for phrases from all 70 papers and all 139 lesson bodies (English and Russian):

| Trial build | Files leaking a paper, an answer or a lesson |
|---|---|
| Before the door | 344 |
| After | 0 (six files share a single line with a lesson; one named exception) |

The six single shared lines are a cue-card question that is also in the public question
list, a one-line strategy tip, and a useful-phrase line from the writing coach. The named
exception (`tools/trial-content-allowed.json`) is the 146-word word-of-the-day sampler,
shown site-wide; some of its example sentences also appear in vocabulary lessons. It is
kept public as a free taster until Alex decides.

**Not behind the door yet**: model answers, cue cards, band guides, writing and speaking
prompts, focused-exercise content and the writing coach's phrase bank still ship inside
the site's code (locked pages no longer show them, but a determined student could dig
them out of the code files). Listening recordings are public audio files. Closing those
needs the same pattern, and signed short-lived links for audio.

## Proof

| What | Result |
|---|---|
| `npm test` (whole suite, after the merge with the published `main` `fb65080`) | 2,080 of 2,080 pass (64 of them are the trial tests below) |
| `tests/trial-sql.test.ts`: the migration itself, in PGlite with Supabase's roles and row security | 22 of 22 |
| `tests/trial-worker.test.ts`: the real Mr EZ handler against the real migration | 12 of 12 |
| `tests/trial-graders.test.ts`: the real essay grader, speaking grader and live examiner | 13 of 13 |
| `tests/trial-content.test.ts`: the real content gate against the real migration | 8 of 8 |
| `tests/trial-status.test.ts`: what the screens may say | 9 of 9 |
| `tests/browser/t01_trial_journey.py`: the real site, door on, in a real browser | 82 of 82 after the merge with the published `main` (`docs/trial/evidence/results-t01.md`) |
| `tools/trial-content-audit.mjs` on the trial build | no leaks (see above) |
| `npx astro check` | 0 errors, 0 warnings, 20 hints (none from the trial) |
| `npm run build`, open and trial | 663 pages each |

The browser journey covers: signed-out offer; sign-up then explicit start; questionnaire
carried over; 72-hour display from the server clock; restarting never restarts; locked
lesson by direct link; the included lesson opens with its text fetched through the door
while the page source carries none of it; locked lessons and papers never reach the
browser; the old public data files are gone; five Mr EZ messages in Reading then stop; a
failed request (twice, including the site's own automatic retry) uses nothing and its
retry counts once; direct calls to the Worker for a lesson outside the trial, for
general chat and for a sixth message are refused; the browser cannot call the Workers'
database functions; other sections keep their own five; a test outside the trial and a
drill of the trial paper are locked; the trial Reading test begins on the server,
survives a refresh, is used on submit and cannot be reopened; two tabs starting
Listening together get one sitting; a failed essay grade keeps the Writing test and a
successful one uses it; the Speaking test: the trainer and cue cards locked, the
examiner page opens as Part 1, Start begins the test on the server, a voice session
that fails to open is given back, the session request carries the begun test and a Part
1 plan, a failed grade keeps the test, a retry is graded and uses it (two interviews
counted), the report says SIMULATED, and the page then says the test is used; plans page; a second device sees the same trial and counts;
sign-out covers the lesson again without restarting; a second student on the same
device inherits nothing; a server failure keeps content covered with Try again; expiry
from the stored start (dashboard, lesson, Mr EZ, a test not begun); a Russian phone
screen with no sideways scroll; reduced motion. Screenshots `t01` to `t18` are in
`docs/trial/evidence/`.

How the Speaking test runs locally with no voice call: the local backend runs the REAL
live examiner Worker and the REAL speaking grader (trial mode), with OpenAI's answers
replaced by a SIMULATED session and a SIMULATED assessment. A browser cannot connect to
a simulated session, so the journey installs `tests/browser/live_standin.js`, a WebRTC
peer inside the test page that plays OpenAI's side (session start, a short transcribed
Part 1 exchange, the closing line) while Chromium's fake microphone speaks. It is test
code only and never part of the site. Clicking Start by hand on the local site therefore
reaches the real checks and counts one of the two interviews, then stops at "could not start" (the test itself is not used).

Found and fixed while proving this: two trial status checks in flight at once could
answer out of order, and the older answer then replaced the newer one on screen (a used
test briefly shown as available). Every question to the server is now numbered when
sent, and a reply to an older question never replaces a newer answer
(`src/lib/trial/client.ts`).

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
  owner-scoped tests and the platform session's browser journeys f22 and f23 cover it.
  Codex's third and fourth inspections found further ownership details; their fixes (to
  `dd03541`) are merged here, and a fifth inspection is pending on the platform branch.

**Not proven** (and not claimed): the migration on a real Supabase project; real
two-device use on real accounts; live AI quality or cost under the trial; any Worker
running on Cloudflare; the private bucket. The local backend's tutor replies are
labelled simulated and its essay assessment says SIMULATED on every line.

## How to run it locally

```bash
MR_EZ_DEV_PORT=8795 MR_EZ_SITE_ORIGIN=http://localhost:4331 node --import ./tests/ts-extension-loader.mjs tools/mr-ez-dev-server.mjs --trial
```

```bash
PUBLIC_ACCESS_MODE=trial PUBLIC_SUPABASE_URL=http://127.0.0.1:8795 PUBLIC_SUPABASE_ANON_KEY=local-anon-key PUBLIC_MR_EZ_URL=http://127.0.0.1:8795/tutor PUBLIC_GRADER_URL=http://127.0.0.1:8795/grade-essay PUBLIC_CONTENT_URL=http://127.0.0.1:8795/content PUBLIC_LIVE_EXAMINER_URL=http://127.0.0.1:8795/live PUBLIC_SPEAKING_GRADER_URL=http://127.0.0.1:8795/grade-speaking npx astro dev --port 4331
```

Then open `http://localhost:4331/ielts-website/trial`. Sign-up on the local backend
needs no email. The backend builds `gated-content/` on first run. To see the ended
state: `POST http://127.0.0.1:8795/__trial/rewind` with `{"email": "...", "minutes":
4320}`. `GET /__trial/state` shows the trial tables. To check a trial build for leaks:
build with the same variables (`npx astro build`), then
`node --import ./tests/ts-extension-loader.mjs tools/trial-content-audit.mjs dist`.

## Decisions still needed (nothing below was invented)

1. **General Mr EZ chat**: decided by Alex (23 September): refused in the trial, as
   built. On the trial's Today page a question is charged to the section tab the student
   chose. The welcome, weekly review, unit notes, plan proposals and focused-exercise
   marking are off during the trial. Still open: paid-plan allowances.
2. **Results after expiry**: nothing is deleted. Today the report and score history stay
   readable after the trial ends; confirm that is the policy.
3. **Repeat trials**: built as one trial per account. A person with a new email gets a
   new trial, and deleting an account and signing up again with the same email would
   too (the trial row is deleted with the account). Blocking that means keeping some
   record of past emails, which is a privacy decision.
4. **The word-of-the-day sampler**: decided by Alex (23 September): stays public, the
   one named exception.
5. **The rest of the content**: decided by Alex (23 September): lock all of it,
   including the listening audio. Plan in progress (see "Not behind the door yet").
6. **Existing students and full access**: switching the site to trial mode today would
   lock every current free student out of everything but the trial, including those
   with history. There is no "full access" state yet (no payment, no manual grant
   table), so nobody could have more than the trial; when there is, it is checked in
   `trial_can_open`. Both need deciding before the switch.
7. **Payments, renewals, refunds, support, recording retention**: not built. The plans
   page says payment is not connected.

## If Alex approves going live (each step separately)

1. **Database**: in the Supabase SQL editor, paste the whole of
   `supabase/migrations/2026-09-23-trial.sql` and run it (idempotent, touches no existing
   table). Rollback: the commented `drop` statements at the bottom, run by hand. Verify:
   the three tables exist with row security on, and `select public.trial_status()` as a
   signed-in user returns `{"state":"none",...}`. On its own this changes nothing for
   students.
2. **Private bucket and gate**: create the private R2 bucket, upload `gated-content/`,
   deploy `workers/content-gate` with its two secrets (`SUPABASE_SERVICE_ROLE_KEY`,
   `CONTENT_SERVICE_KEY`). Rollback: delete the Worker; the bucket is private and serves
   nothing without it.
3. **Workers to trial mode**: set `ACCESS_MODE` to `trial` on mr-ez (plus
   `CONTENT_SERVICE_KEY`, and `SITE_DATA_URL` / `LESSON_BLOCKS_URL` pointed at the
   gate's `/data/...`), grade-essay and grade-speaking (plus `SUPABASE_URL` and the
   service role secret), and live-examiner (its cron trigger is already in its config).
   Rollback: set `ACCESS_MODE` back to `open` and redeploy.
4. **Site**: build with `PUBLIC_ACCESS_MODE=trial` and `PUBLIC_CONTENT_URL`, run the
   leak audit on `dist`, then publish. Rollback: republish the open build.

Nothing above has been run. Each step is externally visible and some are billable.

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
the locked door: `workers/content-gate/*`, `src/lib/trial/{content,tests-light}.ts`,
`src/components/trial/{GatedTestPlayer,GatedPracticeQuiz}.tsx`,
`tools/{build-gated-content.mjs,trial-content-audit.mjs,trial-content-allowed.json}`;
`tests/{trial-sql,trial-worker,trial-graders,trial-status,trial-content}.test.ts`;
`tests/browser/{t01_trial_journey.py,live_standin.js}`; `docs/TRIAL-IMPLEMENTATION.md`; `docs/trial/evidence/*`.

Changed: `workers/{mr-ez,grade-essay,grade-speaking,live-examiner}/src/index.ts` and
their `wrangler.jsonc` (`ACCESS_MODE: "open"`); `src/lib/tutor/{schema,errors}.ts`;
`src/lib/writing/grader.ts`; `src/components/{TestPlayer,WritingTester,LiveExaminer}.tsx`;
`src/lib/speaking/live/{link,openai-session,grade}.ts` (the sitting id, only when given);
`src/components/tutor/MrEzPanel.tsx`; `src/layouts/{BaseLayout,LessonLayout}.astro`;
`src/pages/{dashboard,start,learn,review}.astro` and the gated trainer, speaking, writing,
mock and band pages; `src/lib/platform-nav.ts`; `src/lib/i18n/dict/ru/index.ts`;
`tests/{i18n.test.ts,mr-ez-harness.ts}`; `tools/mr-ez-dev-server.mjs` (`--trial`);
`package.json` (dev dependency `@electric-sql/pglite`, local testing only);
`supabase/README.md`, `CLAUDE.md`, `AGENTS.md` (short pointers here).
