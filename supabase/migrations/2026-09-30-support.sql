-- Support requests: "Report a problem / ask a person" (2026-09-30).
--
-- LOCAL ONLY. NOT applied to production, and not to be applied without
-- Alex's explicit yes. Proven in PGlite by tests/support-sql.test.ts
-- (through tools/stand-in/support.mjs); the local stand-in serves it too.
--
-- Why it exists: the audit (F04) found no way for a student to reach a
-- person. Alex has not published a contact yet, so the route to a person is
-- a form whose messages he reads in his own /admin page and answers by email.
--
-- Access model:
--   - A SIGNED-IN student adds a request through support_request_create().
--     It carries their account (auth.uid(), never a value the browser
--     names), so the answer goes to the account email. Five a day per account.
--   - A SIGNED-OUT visitor cannot call the database at all. Their request
--     goes to the support Worker (workers/support), which is the only holder
--     of the service role key and the only caller of
--     support_request_visitor(). The Worker works out where the request came
--     from (the network address Cloudflare saw, as a keyed hash, never the
--     address itself) and whether a bot check was passed, and this file
--     applies the limits. A visitor must give an email address, or nobody
--     could answer.
--   - Nobody but an admin can read a request, not even their own: row
--     security is on with no policy at all, and every table privilege is
--     revoked from the browser roles, so a direct REST call is refused.
--   - Only an admin (public.is_admin(), 2026-09-24-admin.sql) can read them,
--     through support_admin_list(), and mark one answered, through
--     support_admin_mark(). Neither returns the source hash.
--
-- Re-audit finding R01 (30 September 2026): the first draft let anonymous
-- callers reach support_request_create() directly and limited visitors by
-- the email they typed and then by one shared allowance of thirty an hour.
-- Thirty requests with made-up addresses used it up and shut every other
-- signed-out visitor out. The limits below replace that. See
-- support_limits() for the numbers and support_request_visitor() for the
-- order they are applied in.
--
-- Idempotent: safe to run more than once. Depends on 2026-09-24-admin.sql
-- (is_admin). Touches no existing table. Rollback at the bottom.

-- ── The limits, in one place ───────────────────────────────────────────────
-- Every number the functions below use. Change them here and nowhere else.
--
--   accountPerDay     5  A signed-in student. Unchanged from the first draft.
--   sourcePerHour     3  One signed-out sender (one IPv4 address, or one
--   sourcePerDay      6  IPv6 /64 network, as the Worker hashes it). A real
--                        person writes once, perhaps again to add a detail;
--                        a shared connection (a family, a small office) still
--                        gets six a day. This is the limit that stops one
--                        sender: whatever emails they invent, they get three
--                        an hour and no more.
--   emailPerDay       3  One reply address, whoever sends. Kept as a second
--                        check, so a sender who does change address cannot
--                        bury one person's inbox entry.
--   visitorsPerHour 300  The circuit breaker: accepted signed-out requests in
--                        the last hour, from everyone together. It is checked
--                        LAST, counts only requests that were stored, and
--                        applies only to requests that did not pass the bot
--                        check. At three an hour per sender, tripping it
--                        takes a hundred different network addresses inside
--                        one hour, not thirty requests from one machine, and
--                        it still caps what can land in Alex's inbox at 300
--                        an hour. A request that passed the bot check is
--                        never stopped by it, so a real person keeps a route.
--   sourceKeepHours  24  How long a stored request keeps its source hash: as
--                        long as the daily limit needs it and no longer.
--                        After that the hash is erased and the request stays.
create or replace function public.support_limits()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'accountPerDay', 5,
    'sourcePerHour', 3,
    'sourcePerDay', 6,
    'emailPerDay', 3,
    'visitorsPerHour', 300,
    'sourceKeepHours', 24
  )
$$;

revoke execute on function public.support_limits() from public, anon, authenticated;
grant execute on function public.support_limits() to service_role;

create table if not exists public.support_requests (
  id            uuid primary key default gen_random_uuid(),
  -- The signed-in student, or null for a visitor. Deleting the account
  -- deletes their requests with it.
  user_id       uuid references auth.users (id) on delete cascade,
  -- Where to answer a visitor. Null for a signed-in student (their account
  -- email is used), unless they gave one.
  contact_email text,
  topic         text not null,
  message       text not null,
  -- Where the student came from, set by the link they followed: a short
  -- keyword (mr-ez, grader, trial-ended, locked, plans, help, footer, ...)
  -- and the page they were on. Both only help Alex understand the message.
  context       text,
  page          text,
  locale        text not null default 'en',
  created_at    timestamptz not null default now(),
  answered_at   timestamptz,
  -- Signed-out requests only: a keyed hash (HMAC-SHA-256, made by the
  -- support Worker with a secret only it holds) of the network address the
  -- request came from. Used for the per-sender limits and nothing else.
  -- Never the address itself, never shown to anyone, and erased once the
  -- request is older than sourceKeepHours.
  source_hash   text,
  constraint support_requests_topic check (topic in ('problem', 'question', 'account', 'other')),
  constraint support_requests_message_len check (length(btrim(message)) between 10 and 2000),
  constraint support_requests_email_shape check (
    contact_email is null
    or (length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  constraint support_requests_reachable check (user_id is not null or contact_email is not null),
  constraint support_requests_context_shape check (context is null or context ~ '^[a-z][a-z0-9-]{0,39}$'),
  constraint support_requests_page_len check (page is null or length(page) <= 200),
  constraint support_requests_locale check (locale in ('en', 'ru')),
  constraint support_requests_source_shape check (source_hash is null or source_hash ~ '^[0-9a-f]{64}$'),
  -- A source belongs to a signed-out request only.
  constraint support_requests_source_visitor check (source_hash is null or user_id is null)
);

create index if not exists support_requests_created on public.support_requests (created_at desc);
create index if not exists support_requests_user_created on public.support_requests (user_id, created_at desc);
create index if not exists support_requests_email_created on public.support_requests (contact_email, created_at desc);
-- The per-sender limit queries, and the cleanup. Only rows that still carry a hash.
create index if not exists support_requests_source_created on public.support_requests (source_hash, created_at desc)
  where source_hash is not null;

alter table public.support_requests enable row level security;
revoke all on table public.support_requests from public, anon, authenticated;

-- Send a request, SIGNED IN. Returns {id, createdAt}. Refusals are raised
-- with a stable message the site maps to a sentence: support-sign-in-required,
-- support-email-invalid, support-topic, support-message-length,
-- support-rate-limited.
--
-- Anonymous callers cannot execute this at all (see the revoke below), and
-- the check on auth.uid() refuses them again if a grant ever drifts.
create or replace function public.support_request_create(
  p_topic   text,
  p_message text,
  p_email   text default null,
  p_context text default null,
  p_page    text default null,
  p_locale  text default 'en'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user    uuid := auth.uid();
  v_limits  jsonb := public.support_limits();
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_context text := nullif(btrim(coalesce(p_context, '')), '');
  v_page    text := nullif(btrim(coalesce(p_page, '')), '');
  v_locale  text := case when p_locale in ('en', 'ru') then p_locale else 'en' end;
  v_count   integer;
  v_row     public.support_requests;
begin
  if v_user is null then
    raise exception 'support-sign-in-required' using errcode = '42501';
  end if;
  if v_email is not null
     and (length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'support-email-invalid' using errcode = 'P0001';
  end if;
  if p_topic is null or p_topic not in ('problem', 'question', 'account', 'other') then
    raise exception 'support-topic' using errcode = 'P0001';
  end if;
  if length(v_message) < 10 or length(v_message) > 2000 then
    raise exception 'support-message-length' using errcode = 'P0001';
  end if;
  -- Context and page only help; a malformed one is dropped, never refused.
  if v_context is not null and v_context !~ '^[a-z][a-z0-9-]{0,39}$' then
    v_context := null;
  end if;
  if v_page is not null then
    v_page := left(v_page, 200);
  end if;

  select count(*) into v_count from public.support_requests
    where user_id = v_user and created_at > now() - interval '1 day';
  if v_count >= (v_limits->>'accountPerDay')::int then
    raise exception 'support-rate-limited' using errcode = 'P0001';
  end if;

  insert into public.support_requests (user_id, contact_email, topic, message, context, page, locale)
  values (v_user, v_email, p_topic, v_message, v_context, v_page, v_locale)
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'createdAt', v_row.created_at);
end;
$$;

revoke execute on function public.support_request_create(text, text, text, text, text, text) from public, anon;
grant execute on function public.support_request_create(text, text, text, text, text, text) to authenticated;

-- Erases the source hash from every request older than sourceKeepHours.
-- The request itself stays. Runs at the start of every visitor request, and
-- once an hour from the support Worker's schedule, so a hash does not
-- outlive its purpose even when nobody is writing. Returns {ok, cleared}.
create or replace function public.support_source_cleanup()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_keep    integer := (public.support_limits()->>'sourceKeepHours')::int;
  v_cleared integer;
begin
  update public.support_requests
     set source_hash = null
   where source_hash is not null
     and created_at < now() - make_interval(hours => v_keep);
  get diagnostics v_cleared = row_count;
  return jsonb_build_object('ok', true, 'cleared', v_cleared);
end;
$$;

revoke execute on function public.support_source_cleanup() from public, anon, authenticated;
grant execute on function public.support_source_cleanup() to service_role;

-- Send a request, SIGNED OUT. Service role only: the support Worker calls
-- it, the browser never can. `p_source_hash` is the Worker's keyed hash of
-- the sender's network address; `p_challenged` is true only when the Worker
-- itself verified a bot check for this request.
--
-- Answers {ok: true, id, createdAt} or {ok: false, reason}. A refusal stores
-- nothing, so it uses up nobody's allowance. The checks run in this order:
--   1. the request is well formed        bad-source, email-required,
--                                        email-invalid, topic, message-length
--   2. this sender, last hour            source-hour
--   3. this sender, last day             source-day
--   4. this reply address, last day      email-day
--   5. everyone together, last hour,     busy
--      only when not challenged
-- The sender's own limits come first on purpose: a flood from one sender is
-- stopped at step 2 and never reaches the shared count in step 5.
create or replace function public.support_request_visitor(
  p_source_hash text,
  p_email       text,
  p_topic       text,
  p_message     text,
  p_context     text default null,
  p_page        text default null,
  p_locale      text default 'en',
  p_challenged  boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_limits  jsonb := public.support_limits();
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_context text := nullif(btrim(coalesce(p_context, '')), '');
  v_page    text := nullif(btrim(coalesce(p_page, '')), '');
  v_locale  text := case when p_locale in ('en', 'ru') then p_locale else 'en' end;
  v_count   integer;
  v_row     public.support_requests;
begin
  if p_source_hash is null or p_source_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad-source');
  end if;
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'email-required');
  end if;
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('ok', false, 'reason', 'email-invalid');
  end if;
  if p_topic is null or p_topic not in ('problem', 'question', 'account', 'other') then
    return jsonb_build_object('ok', false, 'reason', 'topic');
  end if;
  if length(v_message) < 10 or length(v_message) > 2000 then
    return jsonb_build_object('ok', false, 'reason', 'message-length');
  end if;
  if v_context is not null and v_context !~ '^[a-z][a-z0-9-]{0,39}$' then
    v_context := null;
  end if;
  if v_page is not null then
    v_page := left(v_page, 200);
  end if;

  -- Hashes past their purpose go first, so the counts below never see them.
  perform public.support_source_cleanup();

  -- One sender's requests are counted one at a time, so two sent at the
  -- same moment cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('support-source:' || p_source_hash));

  select count(*) into v_count from public.support_requests
    where source_hash = p_source_hash and created_at > now() - interval '1 hour';
  if v_count >= (v_limits->>'sourcePerHour')::int then
    return jsonb_build_object('ok', false, 'reason', 'source-hour');
  end if;

  select count(*) into v_count from public.support_requests
    where source_hash = p_source_hash and created_at > now() - interval '1 day';
  if v_count >= (v_limits->>'sourcePerDay')::int then
    return jsonb_build_object('ok', false, 'reason', 'source-day');
  end if;

  select count(*) into v_count from public.support_requests
    where user_id is null and contact_email = v_email and created_at > now() - interval '1 day';
  if v_count >= (v_limits->>'emailPerDay')::int then
    return jsonb_build_object('ok', false, 'reason', 'email-day');
  end if;

  if not coalesce(p_challenged, false) then
    select count(*) into v_count from public.support_requests
      where user_id is null and created_at > now() - interval '1 hour';
    if v_count >= (v_limits->>'visitorsPerHour')::int then
      return jsonb_build_object('ok', false, 'reason', 'busy');
    end if;
  end if;

  insert into public.support_requests (user_id, contact_email, topic, message, context, page, locale, source_hash)
  values (null, v_email, p_topic, v_message, v_context, v_page, v_locale, p_source_hash)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'createdAt', v_row.created_at);
end;
$$;

revoke execute on function public.support_request_visitor(text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.support_request_visitor(text, text, text, text, text, text, text, boolean) to service_role;

-- Every request, newest first, for the admin panel. Refuses (42501) unless
-- the caller is an admin. The account email comes from auth.users here, so
-- the browser never supplies it. The source hash is not returned.
create or replace function public.support_admin_list(p_limit integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select r.id, r.created_at, r.topic, r.message, r.context, r.page, r.locale, r.answered_at,
             r.user_id, u.email::text as account_email, r.contact_email
      from public.support_requests r
      left join auth.users u on u.id = r.user_id
      order by r.created_at desc
      limit greatest(1, least(coalesce(p_limit, 200), 500))
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke execute on function public.support_admin_list(integer) from public, anon;
grant execute on function public.support_admin_list(integer) to authenticated;

-- Mark one request answered (or not, to undo). Admin only. Returns
-- {id, answeredAt}. The first answered time is kept if marked twice.
create or replace function public.support_admin_mark(p_id uuid, p_answered boolean default true)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_answered timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  update public.support_requests
     set answered_at = case when p_answered then coalesce(answered_at, now()) else null end
   where id = p_id
  returning answered_at into v_answered;
  if not found then
    raise exception 'support-not-found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('id', p_id, 'answeredAt', v_answered);
end;
$$;

revoke execute on function public.support_admin_mark(uuid, boolean) from public, anon;
grant execute on function public.support_admin_mark(uuid, boolean) to authenticated;

-- ── Rollback (run by hand, only if this migration must be undone) ───────
-- Removes every stored support request.
--
-- drop function if exists public.support_admin_mark(uuid, boolean);
-- drop function if exists public.support_admin_list(integer);
-- drop function if exists public.support_request_visitor(text, text, text, text, text, text, text, boolean);
-- drop function if exists public.support_source_cleanup();
-- drop function if exists public.support_request_create(text, text, text, text, text, text);
-- drop table if exists public.support_requests;
-- drop function if exists public.support_limits();
