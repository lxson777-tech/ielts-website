# Free account, paid guidance: the access model and build plan

Alex's decision of 1 October 2026 (second brain:
`Decisions/2026-10-01 IELTS free account opens all lessons, practice and
guidance are paid.md`). It REPLACES the public-lessons model
(PUBLIC-LESSONS.md) and the free three-day trial. Price and allowances are
unchanged (PROFITABLE-OFFER.md, OFFER-REVIEW-2026-10-01.md).

## The student's path

1. The first link a student gets is the sales website (the gates), the gated
   build's front page.
2. The website says plainly: **every lesson is free with an account; practice,
   tests and personal guidance (Mr EZ, the study plan's practice) are paid**,
   12,990 KZT for 30 days, no automatic renewal, no refunds after purchase.
   Its calls to action are "Create a free account" (to `/sign-up`, carrying
   the questionnaire answers) and "Sign in". No trial anywhere.
3. Sign-up and the required profile, then the platform.
4. A free account reads every lesson. Whenever it reaches for something paid,
   an upgrade pop-up explains what paying adds and links to `/plans`.
5. Paying (or a complimentary grant from Alex) opens everything.

## Access tiers (server-owned; the browser only displays them)

| Tier | Who | Opens |
|---|---|---|
| `signed-out` | no account | the sales website, sign-up, sign-in, password reset, `/help`, `/support`, `/privacy`, `/terms`, `/plans` (read-only prices). Lesson pages show the title and an invitation to sign up, never the lesson. |
| `free` | any signed-in account with a completed profile and no running grant | **every lesson**: lesson bodies (English and Russian), worked examples inside lessons, each lesson's own short quiz, the vocabulary topic lists and word tables, the course map / lesson library, their own account, progress on lessons. |
| `paid` | a running paid grant | everything: timed tests, drills, trainers, focused exercises, mock exams (2 per 30 days, not using the interviews), the placement test (once per account, not using the interviews), essay and recorded Speaking assessments (12 / 6), live interviews (2), Mr EZ (with its existing daily limits) including the help buttons in lessons, the personal study plan's practice activities, vocabulary review practice, model-answer bank, cue-card bank, band guides. |
| `complimentary` | a grant given by Alex in /admin | exactly what `paid` opens, with the same allowances, 30 days at a time; Alex renews or stops it. |
| `paid-ended` | a grant that has run out | back to `free`: every lesson stays readable; saved results stay visible. |

Rules:
- What a tier opens is decided on the SERVER for anything that costs money
  or is paid material: the content gate (`workers/content-gate`), the
  database's open check (today `trial_can_open`; rename or wrap is fine), the
  AI Workers. A `lesson:*` item (body, worked example, lesson quiz) opens for
  any signed-in account with a profile; `test:*`, `practice:*` (except a
  lesson's own quiz), `pack:*`, `writing-prompt:*`, `writing-model:*` (bank)
  open only for `paid`/`complimentary`.
- AI Workers refuse a non-paid account BEFORE any provider call with code
  `paid-required` (HTTP 402), reason text in English and Russian. The
  existing allowance codes from Builder M stay as they are.
- The trial is retired: `trial_start` refuses in the gated build (code
  `trial-retired`); no screen offers it; `/trial` redirects to `/sign-up`
  (keeping `?journey=...` questionnaire answers). Trial tables and history
  stay (nothing deleted); existing trial rows no longer grant anything.
- Signed-out lesson pages publish no lesson body in their HTML (as the old
  trial build did): the leak audit must again check lesson bodies, worked
  examples and lesson quizzes, and allow them only through the door.
- The open build (`PUBLIC_ACCESS_MODE` unset: today's live site) is unchanged.

## Shared code (the contract; the orchestrator commits it first)

`src/lib/access/model.ts` (pure, shared by site and Workers):
- `type AccessTier = 'signed-out' | 'free' | 'paid' | 'complimentary' | 'paid-ended'`
- `type PaidFeature = 'test' | 'drill' | 'trainer' | 'focused' | 'mock' | 'placement' | 'essay' | 'speaking' | 'live' | 'tutor' | 'plan-practice' | 'vocab-review' | 'model-answers' | 'cue-cards' | 'band-guide'`
- `tierOf(status, nowMs): AccessTier` from the server's status reply.
- `canUse(tier, feature): boolean` and `isPaidTier(tier)`.
- `UPGRADE_REASON: Record<PaidFeature, string>`: the one sentence the pop-up
  leads with for each feature (English keys, Russian in the dictionary).
- `PAID_PITCH`: the short list of what paying adds, read from
  `src/lib/access/plans.ts` numbers (never re-typed).

`src/components/access/UpgradeDialog.tsx` + `src/lib/access/upgrade.ts`:
- `openUpgrade(feature: PaidFeature, opts?: { from?: string })`: a global,
  framework-independent call (an event on `window`) any island or Astro page
  script can make; one dialog instance mounted in `BaseLayout` (gated build
  only). Accessible: reuse `src/lib/a11y/modal-dialog.ts` (name, focus in,
  Tab contained, Escape closes, focus restored).
- Content: the feature's reason line; what paying adds (full practice
  library and timed tests with band estimates; 12 essay checks, 6 recorded
  Speaking checks, 2 live interviews, 2 mock exams and the placement test;
  Mr EZ guidance; the personal study plan); "12,990 KZT for 30 days. No
  automatic renewal."; primary "Get practice and guidance" to `/plans`
  (signed-out: to `/sign-up?next=/plans`); secondary "Keep reading lessons".
- Once-only nudge after the FIRST finished lesson (when the student marks a
  lesson studied, or completes its quiz), stored per account, never shown
  mid-lesson, never again after dismissal, never to paid/complimentary.

## Builders and file ownership

| Builder | Owns |
|---|---|
| **G** (gate and server) | `supabase/migrations/` (a new `2026-10-01-free-account.sql`: tier logic, trial retirement, complimentary grants as `access_grants` rows of kind `complimentary` with `granted_by`, 30 days, renew/stop functions guarded by `is_admin()`), `workers/**`, `tools/trial-db.mjs`, `tools/mr-ez-dev-server.mjs`, `tools/build-gated-content.mjs`, `tools/trial-content-audit.mjs`, `src/lib/trial/gate.ts`, `src/lib/access/model.ts` (beyond the contract), server tests; the admin panel's "Give free access / Renew / Stop" (`src/components/admin/**`). |
| **P** (platform) | everything under `src/components/` and `src/pages/` except the sales page and admin; `src/lib/trial/{status,offer,library,react,client}.ts`, `src/lib/access/upgrade.ts`, `src/components/access/UpgradeDialog.tsx`, `src/layouts/BaseLayout.astro` and `LessonLayout.astro`; lesson pages behind sign-in; every paid entry point opens the dialog; Mr EZ launcher and lesson help buttons; Today / Course / Tests / Practice / Vocabulary for free accounts; trial UI removed; `/trial` redirect; account and plans pages; Russian in `src/lib/i18n/dict/ru/p-free.ts`. |
| **W** (website and policies) | `src/marketing/**`, `src/components/home/**`, `src/layouts/StoryLayout.astro`, `src/scripts/question-journey.ts`, `src/lib/journey-plan.ts`, `/privacy`, `/terms`, `/help` copy, `src/components/support/TermsDocument.tsx`, `PurchaseTerms.tsx`; English and Russian; Russian in `src/lib/i18n/dict/ru/w-free.ts` where the dictionary is used. |

Hot spots resolved by the orchestrator at merge: `dict/ru/index.ts`,
`tests/i18n.test.ts` BATCH_FILES.

## Proof required

- `npm test`, `npx astro check`, open and gated builds, leak audit (lesson
  bodies protected again), and the journeys rewritten for the new model:
  visitor (website, both languages, CTA to sign-up), free student (sign-up,
  every lesson opens, quiz works, each paid entry point opens the pop-up,
  the first-lesson nudge once, no trial anywhere), paying student (SIMULATED
  purchase, everything opens, allowances, second device, expiry back to free
  with lessons still readable), complimentary student (Alex grants, student
  gets paid features, Alex stops), returning student; 1440x900, 390x844 and
  Russian at 320; keyboard on the dialog; zero hydration errors.
- t01 (trial journey) is retired with the trial: replace it with the free and
  paid journeys rather than deleting its history.

## Rules for every builder

Local only (no push, deploy, real services, real payments, paid AI);
synthetic `@example.test` accounts; never recursive deletes or mirror
commands; never touch `.git`; write only in your own worktree and scratch
folder; never stop processes you did not start (4441, 4442, 8841, 8842 are
Alex's review servers); never touch `C:\Users\Alex\.codex\worktrees\`; do not
change prices, allowances, refund terms or grading models; commit early.

## Free AI tries (10 October 2026)

Alex's decision of 10 October 2026: a free account can now TRY the AI a little
before buying. The rule above ("no AI of any kind") changes in one way only.

**What a free account gets, once, for the whole life of the account:**

| Try | How many | What counts |
|---|---|---|
| Mr EZ | 10 | each question to Mr EZ: his chat and the lesson help buttons |
| Essay check | 1 | one AI Writing check |
| Speaking check | 1 | one AI recorded Speaking check |

Never free: the live interview, mock exams, the placement test, and the
feedback on a live interview. Those stay paid. Mr EZ's other jobs (the
dashboard welcome, weekly review, unit notes, test debriefs, explaining one
wrong answer, judging a focused exercise, proposing the next step) are part of
practice and the personal plan and stay paid. The welcome in particular opens
by itself, so it must never spend a try the student did not ask for.

**Rules that keep it fair and safe:**

- It is lifetime, not monthly. Using a try never gives it back, except when
  the answer failed (a failed grade or a failed Mr EZ answer costs nothing),
  or when the answer was one already stored for the same question.
- Paid and complimentary accounts never use tries; they keep their own
  allowances (12 essays, 6 Speaking checks, 2 live interviews, Mr EZ's daily
  limits). Tries used before buying do not shrink the purchase, and the
  purchase does not use up a try.
- A paid account that ENDED is free again and has whatever tries it has left.
  Allowances it used while paid do not count against its tries.
- The one assessment the old three-day trial allowed counts as that kind's
  free try (the database recorded it with no grant). Simple and fair.
- Free essay and Speaking checks still count toward the 24-a-day safety
  limit every account has.
- Signed-out visitors get nothing.
- The open (live) site is untouched: this exists only in the commercial build
  (`ACCESS_MODE=trial`).

**Where it is enforced (the server decides, the browser only displays):**

- The database: `supabase/migrations/2026-10-10-free-taster.sql`. The limits
  live in one function, `taster_limit()`, and must equal `TASTER_LIMITS` in
  `src/lib/access/taster.ts` (a test checks it). `assessment_reserve` admits
  the one essay and the one Speaking check for an account with no running
  grant; `tutor_taster_reserve` and `tutor_taster_release` count the ten Mr EZ
  questions; `trial_status` carries `taster: {tutor, writing, speaking}`, each
  `{used, limit}`, for every signed-in account.
- The Workers: Mr EZ reserves a try before the model is called and gives it
  back on any failure; the essay and Speaking graders let the database decide.
  When a try is used up the answer is HTTP 402 with
  `{ error, code: 'taster-used', reason: 'taster-used', kind, used, limit }`,
  before any model call. The live examiner is unchanged (always paid).
- A database that cannot be asked still fails closed.

**Not applied to production.** The migration is a proposal, tested only
against the local in-memory database and the local stand-in. It needs Alex's
yes before anyone runs it on the real Supabase project, and it must be applied
BEFORE the Workers that use it are deployed (otherwise a free account's
question is refused as unavailable, which fails closed). Until then the live
site behaves exactly as before.
