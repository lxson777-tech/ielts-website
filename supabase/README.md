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

The only personal data stored is the sign-in email (in Supabase's `auth.users`)
and the student's own study plan/scores. No sensitive data. Keep it that way —
some candidates are minors.

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
