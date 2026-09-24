# Accounts & cross-device sync (Supabase)

Optional account layer. When it's **not** configured the site is exactly the
anonymous, localStorage-only version — signing in is a pure upgrade that syncs a
student's study plan + scores across devices (and, in phase 2, powers test-date
reminder emails).

Configured via two **public** client keys, gated exactly like the grader
Workers: unset ⇒ the account UI hides itself and nothing changes.

## One-time setup (~10 minutes)

1. **Create a free Supabase project** — https://supabase.com → New project.
   Pick a region close to your students (e.g. Frankfurt for KZ). Note the
   database password somewhere; you won't need it for this.

2. **Create the table** — Supabase dashboard → **SQL Editor** → paste the whole
   of [`schema.sql`](./schema.sql) → **Run**. This creates the `user_state`
   table and its Row-Level-Security policies (each user can only touch their own
   row). Safe to re-run.

3. **Turn on the sign-in methods** — Dashboard → **Authentication → Providers**:
   - **Email**: enable it and turn ON "Confirm email" / magic link. (Passwordless
     — Supabase sends the sign-in link.)
   - **Google** (optional but recommended): enable it and paste a Google OAuth
     client ID/secret (Google Cloud Console → Credentials). Skip for now if you
     just want email links.
   - **Authentication → URL Configuration**: add your site URLs to
     **Redirect URLs**: `http://localhost:4321/ielts-website/**` and
     `https://lxson777-tech.github.io/ielts-website/**`.

4. **Grab the keys** — Dashboard → **Project Settings → API**:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `PUBLIC_SUPABASE_ANON_KEY`
   (The anon key is *meant* to ship in the browser; RLS is what protects data.
   Do **not** use the `service_role` key here.)

5. **Point the site at it**
   - Locally: add both to `.env`, then restart `npm run dev`:
     ```
     PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
     PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
     ```
   - Production: GitHub repo → Settings → Secrets and variables → Actions →
     **Variables** → add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`,
     then re-run the deploy workflow. (`.github/workflows/deploy.yml` already
     passes them into the build.)

With the variables unset, the "Save progress" button never appears and the site
runs anonymously — nothing breaks.

## How sync works

- On sign-in the client **pulls** the cloud row, **union-merges** it with
  whatever is on the device (so anonymous progress made before signing in is
  migrated up, never lost), writes the merged result back locally, and
  **pushes** it. After that, local changes debounce a push (~1.5s).
- Data model is one JSONB row per user (`src/lib/auth/sync.ts` ↔ `user_state`),
  mirroring the `ielts.progress.v1` localStorage blob + the study plan. No
  per-field schema to keep in step with the frontend.
- Merge rules live in `src/lib/progress.ts` (`mergeProgress`) and
  `src/lib/study-plan.ts` (`mergeStudyPlans`): attempts dedupe on their ISO
  timestamp; the study plan is last-write-wins with completed steps unioned.

## Privacy

What is stored about a student:

- the sign-in email (in Supabase's `auth.users`);
- their own study plan, scores and study history (`user_state` and the
  tables below);
- once the student profile is applied (see "Student profiles" below), the
  details every student gives before using the course: first and last name,
  date of birth, phone, city, school, university or job, and how they found
  us;
- for a student under 18, the name and phone of a parent or guardian and
  the moment the "a parent agrees" box was ticked.

Some candidates are minors, which is why that last item exists. Nothing more
sensitive than this is collected (no ID numbers, no addresses, no payment
details). Keep it that way. Each student can read and change only their own
details; the owner sees everyone's through the admin panel.

## Live examiner sessions table

A second table, `live_examiner_sessions`, backs the paid GPT-Live-1 voice
examiner (`workers/live-examiner`). It is unrelated to the account-sync
`user_state` table above and uses a different access model:

- **One row per voice session** (`id`, `user_id`, `provider`, `mode`,
  `provider_session_id`, `stage`, `created_at`, `ended_at`, `last_cue_at`),
  written only by the live-examiner Worker, never by the browser.
- **No client policies.** Row-Level Security is turned on and nothing is
  granted, so the `anon` key shipped in the browser can neither read nor
  write it. Every read and write goes through the Worker using the
  **service role key**, which bypasses RLS by design.
- **What it's for**: verifying a signed-in student before creating a paid
  session, enforcing per-student and site-wide daily/concurrency limits
  across every Worker instance, and validating that a mid-session stage
  direction (Part 1 → Part 2, end test, ...) is a legal transition from the
  session's last recorded stage.

If your project was set up before this table existed, **re-run step 2**
(SQL Editor → paste the whole of `schema.sql` → Run) — it's additive and
idempotent, it won't touch `user_state` or its policies.

The service role key belongs **only** as a Worker secret, never in the site:

```sh
cd workers/live-examiner
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Find it at Dashboard → **Project Settings → API → `service_role` `secret`**.
Unlike the `anon` key, this key must never reach the browser or a public
repo, it has no RLS restriction at all.

## Mr EZ tutor tables

Four more tables back the personal AI tutor (`workers/mr-ez`):
`mr_ez_conversations`, `mr_ez_messages`, `mr_ez_turns` and
`mr_ez_recommendations`. They use a **mixed** access model, unlike the two
above:

- **Writes are Worker-only** (service role key). The browser must never be able
  to invent a tutor message, forge a usage row or fabricate a summary: all
  three would let a modified client put words in Mr EZ's mouth or dodge a
  spending limit.
- **Reads and deletes of a student's own conversation ARE granted** to the
  browser under Row-Level Security. That is what lets the panel restore a
  conversation with no paid round trip, and what makes "clear my history" an
  immediate delete rather than a request the student has to trust us to honour.
- **`mr_ez_turns` is the exception.** It is what the daily spending cap is
  counted from, so a student cannot delete or edit it, or they would reset
  their own limit. A **column-scoped grant** (`grant update (reply) ... to
  authenticated`) lets them blank the one column that carries conversation
  content, and nothing else. Postgres enforces the column list.

**Separation of memory, which the product depends on:** assessment records live
in `user_state.progress` and are not touched by any of this. Clearing a
conversation removes what Mr EZ was told and what he said, including the rolling
summary and the cached dashboard welcome. It does not remove a single band,
essay or test attempt, and the settings screen says so in those words.

If your project was set up before these tables existed, **re-run step 2**
(SQL Editor → paste the whole of `schema.sql` → Run). It is additive and
idempotent and will not touch `user_state`, `live_examiner_sessions` or their
policies.

The Mr EZ Worker needs the same service role key as the live examiner:

```sh
cd workers/mr-ez
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put OPENAI_API_KEY
```

## Admin access (owner only, applied to production on 2026-09-24)

Applied through the Supabase connector as migration `20260924082154`
(`admin_access_2026_09_24`) after Alex's approval, then re-checked on the
live project and over the public API while signed out (all refused).
The database's security advisor flags `is_admin` and `admin_list_users` as
signed-in-callable definer functions: that is intended, the check is inside.

`migrations/2026-09-24-admin.sql` adds the lock behind the `/admin` page.
The page itself is a static file anyone could open; the data is what is
protected:

- **`admins`**, one row per admin account (seeded with the site owner's
  account, looked up by email when the file runs). Row security on and no
  policy at all, and the browser roles' default table grants revoked, so no
  browser can read it or add itself to it.
- **`is_admin()`** answers "am I an admin?" for the caller only, from the
  user id proved by their own access token. The account menu and the page
  use it to decide what to show.
- **`admin_list_users()`** returns every account with a summary of its study
  (plan, counts, best bands, recent scored work, Mr EZ and live examiner
  usage). It refuses anyone not in `admins` with SQLSTATE 42501, and it is
  not callable at all by a signed-out visitor. Once the student profiles
  migration below is applied, it also returns each student's details at the
  end of the row: `first_name`, `last_name`, `date_of_birth`, `phone`,
  `city`, `occupation`, `source`, `parent_name`, `parent_phone`,
  `parent_consent_at` and `profile_updated_at` (all null for a student who
  has not filled the profile in). The panel at `/admin` reads them when they
  are present and shows "No details yet" when they are not.

Checked before it was applied, in a transaction that rolled itself back on
the live project: the owner got the full list; a student got "admin only"
and could not insert themselves into `admins`; a signed-out visitor got
"permission denied" for both functions.

To add another admin later, run once in the SQL editor:

```sql
insert into public.admins (user_id, note)
select id, 'why they are an admin' from auth.users where email = 'their@email';
```

## Student profiles (applied to production on 2026-09-24)

Applied through the Supabase connector as migration `20260924140010`
(`student_profiles_2026_09_24`) after Alex's approval, following a dry run
in a self-rolling-back transaction on the live project (own row only, the
under-18 rule, phone shape, future dates and a student's delete all behaved).
The section below is kept as written for the record.


**This has NOT been applied to the production project.** It is a reviewed
proposal in `migrations/2026-09-24-profiles.sql`. Nobody but Alex applies it,
and only after reading this section.

### What it adds

- **`student_profiles`**, one row per account with the details every student
  gives before using the course: `first_name`, `last_name`, `date_of_birth`,
  `phone`, `city`, `occupation` (school, university or job, free text) and
  `source` (how they found us: `friend`, `instagram`, `centre` or `other`),
  plus `parent_name`, `parent_phone` and `parent_consent_at` for a student
  under 18. The row is deleted with the account. Checks in the table keep
  names, city and occupation to a sensible length, phones to 7 to 15 digits
  with an optional leading plus, and the source to the four allowed values.
- **The under-18 rule is enforced by a trigger**
  (`guard_student_profile_write`), not only by the form, so a modified
  browser cannot skip it: the date of birth must be in the past and at least
  five years ago, and for anyone under 18 on the day of saving a parent's
  name, phone and agreement time are all required or the write is refused.
  A trigger is used because a table check cannot compare against today's
  date. The same trigger trims the text fields, and a second one keeps
  `updated_at` current on every edit.

### Who can see it

- **The student**: their own row only, under Row Level Security, from the
  user id proved by their own access token. They can read, add and change
  it; there is no delete policy.
- **The Worker** (Mr EZ, which greets students by first name) reads it with
  the service role key, like every other table it uses.
- **The owner**, through `admin_list_users()` (see "Admin access" above),
  which checks the caller is in `admins` before answering. Nobody else can
  see anyone else's row.

### The admin function changes shape

`admin_list_users()` gains eleven columns at the end. Postgres cannot change
a function's return type in place, so the migration **drops the function and
creates it again** with the new columns, then restores the same grants
(signed-in callers only, refused inside unless admin). Everything else about
it is unchanged. Between the drop and the create the admin panel would show
its "couldn't load" message; run the file as one piece in the SQL Editor and
that gap is a fraction of a second.

### How to apply it (when Alex is ready)

Supabase dashboard, SQL Editor, paste the whole of
`migrations/2026-09-24-profiles.sql`, Run. It depends on `schema.sql` (for
`touch_user_state_updated_at`) and on `migrations/2026-09-24-admin.sql` (for
`is_admin`), both already on the live project. The file is idempotent, safe
to run more than once.

## Personal learning tables (applied to production on 2026-09-24)
Applied through the Supabase connector as migration `20260924080358`
(`personal_learning_tables_2026_09_21`) after Alex's approval, and verified
with the queries below. The section is kept as written for the record.

`migrations/2026-09-21-learning.sql` adds three more tables for the personal
learning build: `learning_events`, `learning_plan` and `learning_companions`.

**This has NOT been applied to the production project.** It is a reviewed
proposal, written and tested against the local dev stand-in
(`tools/mr-ez-dev-server.mjs`, exercised by `tests/learning-sync-server.test.ts`),
never against a real Supabase project. Nobody but Alex applies it, and only
after reading this section.

### What it adds

- **`learning_events`**, one row per piece of evidence a student's work
  produces (a test attempt, a lesson check, an essay grade). Append only:
  there is a select policy and an insert policy, and deliberately no update
  or delete policy, so a stored event can never be edited or removed from the
  browser. The primary key is `(user_id, event_id)`, so resending the same
  batch (a retry after a dropped connection, two tabs syncing at once)
  inserts nothing new for a row the server already has.
- **`learning_plan`**, one row per student holding their current study plan.
  Reads and writes are scoped to the signed-in student exactly like every
  other table here, but writes also pass through a trigger that enforces the
  same rule the site's own contract states once
  (`src/lib/learning/contracts/sync.ts`, `PLAN_CONFLICT_RULE`): a confirmed
  plan beats an unconfirmed one, a higher revision wins next, and a later
  `updatedAt` breaks an exact tie. A write that does not outrank what is
  stored is silently kept as the stored row, and that row is what comes back
  to the caller, so a device that lost a conflict knows to rebuild from the
  reply rather than assuming its write took.
- **`learning_companions`**, one jsonb document per student per `kind`
  (vocabulary review progress, notes and saved lessons, interface
  preferences, and room for what Mr EZ remembers). Plain upsert, last write
  wins: the merging happens on the device before a push, so the server only
  ever needs to hold the latest merged copy.

None of this touches `user_state`, `live_examiner_sessions` or any `mr_ez_*`
table, and it does not migrate a single existing row. The current sync
(`src/lib/auth/sync.ts` and `user_state`) keeps working exactly as it does
today, side by side with the new tables.

### How to apply it (when Alex is ready)

Same method as `schema.sql`: **Supabase dashboard, SQL Editor, paste the
whole of `migrations/2026-09-21-learning.sql`, Run.** It depends on
`schema.sql` already being applied (it reuses the `touch_user_state_updated_at`
function defined there), which it already is on the live project. The file is
idempotent, safe to run more than once.

The CLI equivalent, for later once this project adopts `supabase db push` for
its migrations, is `supabase db push` with this file placed under the
standard `supabase/migrations/` naming Supabase's CLI expects. That is a
description of the option, not a command anyone has run here.

### How to verify it

After applying, in the SQL Editor:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('learning_events', 'learning_plan', 'learning_companions');
```

should list all three, and:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('learning_events', 'learning_plan', 'learning_companions');
```

should show `rowsecurity = true` for each. The real end to end proof is the
one this repo can already give without touching production: run
`tests/learning-sync-server.test.ts` (part of `npm test`), which serves the
same three tables from the local dev stand-in and proves the isolation, the
idempotent insert and the plan conflict rule against fixtures.

### How to roll it back

The bottom of `migrations/2026-09-21-learning.sql` has a commented rollback
section, the drop statements in the right order. They are comments on
purpose, not something this file or any script runs; the owner pastes them
into the SQL Editor by hand if this ever needs to come out. Rolling back
cannot affect `user_state` or any other existing table: nothing in this
migration alters them, so there is nothing for a rollback to undo there
either.
