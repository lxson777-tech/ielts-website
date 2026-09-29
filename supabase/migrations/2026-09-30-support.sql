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
--   - Students (signed in) and visitors (signed out) can only ADD a request,
--     and only through support_request_create(). They can never read,
--     change or delete one, not even their own. Row security is on with no
--     policy at all, and every table privilege is revoked from the browser
--     roles, so a direct REST call to the table is refused.
--   - A signed-in student's request carries their account (auth.uid(), never
--     a value the browser names), so the answer goes to the account email.
--   - A signed-out visitor must give an email address, or nobody could answer.
--   - Only an admin (public.is_admin(), 2026-09-24-admin.sql) can read them,
--     through support_admin_list(), and mark one answered, through
--     support_admin_mark().
--   - Gentle limits against a flood: five requests per account per day,
--     three per email address per day for visitors, and thirty from
--     visitors in all per hour.
--
-- Idempotent: safe to run more than once. Depends on 2026-09-24-admin.sql
-- (is_admin). Touches no existing table. Rollback at the bottom.

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
  constraint support_requests_topic check (topic in ('problem', 'question', 'account', 'other')),
  constraint support_requests_message_len check (length(btrim(message)) between 10 and 2000),
  constraint support_requests_email_shape check (
    contact_email is null
    or (length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  ),
  constraint support_requests_reachable check (user_id is not null or contact_email is not null),
  constraint support_requests_context_shape check (context is null or context ~ '^[a-z][a-z0-9-]{0,39}$'),
  constraint support_requests_page_len check (page is null or length(page) <= 200),
  constraint support_requests_locale check (locale in ('en', 'ru'))
);

create index if not exists support_requests_created on public.support_requests (created_at desc);
create index if not exists support_requests_user_created on public.support_requests (user_id, created_at desc);
create index if not exists support_requests_email_created on public.support_requests (contact_email, created_at desc);

alter table public.support_requests enable row level security;
revoke all on table public.support_requests from public, anon, authenticated;

-- Send a request. Callable signed in or signed out. Returns
-- {id, createdAt}. Refusals are raised with a stable message the site maps
-- to a sentence: support-email-required, support-email-invalid,
-- support-topic, support-message-length, support-rate-limited, support-busy.
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
  v_email   text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_message text := btrim(coalesce(p_message, ''));
  v_context text := nullif(btrim(coalesce(p_context, '')), '');
  v_page    text := nullif(btrim(coalesce(p_page, '')), '');
  v_locale  text := case when p_locale in ('en', 'ru') then p_locale else 'en' end;
  v_count   integer;
  v_row     public.support_requests;
begin
  if v_user is null and v_email is null then
    raise exception 'support-email-required' using errcode = 'P0001';
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

  if v_user is not null then
    select count(*) into v_count from public.support_requests
      where user_id = v_user and created_at > now() - interval '1 day';
    if v_count >= 5 then
      raise exception 'support-rate-limited' using errcode = 'P0001';
    end if;
  else
    select count(*) into v_count from public.support_requests
      where user_id is null and contact_email = v_email and created_at > now() - interval '1 day';
    if v_count >= 3 then
      raise exception 'support-rate-limited' using errcode = 'P0001';
    end if;
    select count(*) into v_count from public.support_requests
      where user_id is null and created_at > now() - interval '1 hour';
    if v_count >= 30 then
      raise exception 'support-busy' using errcode = 'P0001';
    end if;
  end if;

  insert into public.support_requests (user_id, contact_email, topic, message, context, page, locale)
  values (v_user, v_email, p_topic, v_message, v_context, v_page, v_locale)
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'createdAt', v_row.created_at);
end;
$$;

revoke execute on function public.support_request_create(text, text, text, text, text, text) from public;
grant execute on function public.support_request_create(text, text, text, text, text, text) to anon, authenticated;

-- Every request, newest first, for the admin panel. Refuses (42501) unless
-- the caller is an admin. The account email comes from auth.users here, so
-- the browser never supplies it.
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
-- drop function if exists public.support_request_create(text, text, text, text, text, text);
-- drop table if exists public.support_requests;
