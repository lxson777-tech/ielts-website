-- One student's own work, for the owner's admin panel (5 October 2026).
--
-- NOT applied to production yet. Nobody but the project owner applies it,
-- and only after saying yes to it.
--
-- What it is for: Alex opens a student on /admin and wants to go into a test
-- they took and see every question, the answer the student gave and the
-- correct one, and to read the essays they wrote. Both are already stored for
-- the student's own account (the per-question answers in learning_events,
-- the essays in user_state.progress.writing); until now nothing let the owner
-- read them. This adds one function that does, for one student at a time.
--
-- The lock is the same as the other admin functions
-- (2026-09-24-admin.sql): it runs as the database owner (security definer),
-- so it can read past the students' own-row rules, and its FIRST step is to
-- refuse (SQLSTATE 42501, insufficient privilege) anyone who is not in
-- public.admins, judged by public.is_admin() from the caller's own verified
-- token. A browser cannot name itself an admin.
--
-- What it returns, and nothing else, as one JSON object:
--   tests     the student's scored Reading and Listening papers (full tests,
--             drills, mock exam papers and retakes) from learning_events,
--             newest first, at most 200, each with its whole stored event
--             (the per-question answers are in event.items). Events moved
--             over from the old progress store have no items; the panel says
--             so rather than inventing answers.
--   writing   the student's essays from user_state.progress.writing, newest
--             first, at most 100: prompt id, date, task, essay text, bands
--             and the saved feedback, exactly as stored.
--   speaking  the student's speaking scores from user_state.progress.speaking,
--             newest first, at most 100. No recording or transcript is kept
--             anywhere, so none is returned.
-- It reads public.learning_events and public.user_state only, and only the
-- rows of p_user. It writes nothing. admin_list_users is left exactly as it is.
--
-- Depends on: schema.sql (user_state), 2026-09-21-learning.sql
-- (learning_events) and 2026-09-24-admin.sql (is_admin). All three are on
-- production already.
--
-- Idempotent: safe to run more than once (create or replace, then the same
-- revoke and grant).

create or replace function public.admin_student_work(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tests    jsonb;
  v_writing  jsonb;
  v_speaking jsonb;
  v_progress jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_user is null then
    return jsonb_build_object('tests', '[]'::jsonb, 'writing', '[]'::jsonb, 'speaking', '[]'::jsonb);
  end if;

  -- Scored Reading and Listening papers. The mock exam's own summary row
  -- (activity 'test:mock', no paper) is left out: each of its papers is
  -- recorded separately and appears here on its own.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'event_id', e.event_id,
               'occurred_at', e.occurred_at,
               'activity_id', e.activity_id,
               'paper', e.paper,
               'mode', e.mode,
               'event', e.event
             )
             order by e.occurred_at desc, e.event_id
           ),
           '[]'::jsonb
         )
    into v_tests
    from (
      select le.event_id, le.occurred_at, le.activity_id, le.paper, le.mode, le.event
        from public.learning_events le
       where le.user_id = p_user
         and le.paper in ('reading', 'listening')
         and (le.activity_id like 'test:%' or le.activity_id like 'drill:%')
         and le.event -> 'outcome' ->> 'kind' = 'scored'
       order by le.occurred_at desc, le.event_id
       limit 200
    ) e;

  select case when jsonb_typeof(s.progress) = 'object' then s.progress else '{}'::jsonb end
    into v_progress
    from public.user_state s
   where s.user_id = p_user;
  v_progress := coalesce(v_progress, '{}'::jsonb);

  select coalesce(
           jsonb_agg(w.att || jsonb_build_object('promptId', w.prompt_id) order by w.att ->> 'at' desc nulls last),
           '[]'::jsonb
         )
    into v_writing
    from (
      select p.key as prompt_id, a.value as att
        from jsonb_each(case when jsonb_typeof(v_progress -> 'writing') = 'object' then v_progress -> 'writing' else '{}'::jsonb end) p
       cross join lateral jsonb_array_elements(case when jsonb_typeof(p.value) = 'array' then p.value else '[]'::jsonb end) a
       where jsonb_typeof(a.value) = 'object'
       order by a.value ->> 'at' desc nulls last
       limit 100
    ) w;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'at', sp.att -> 'at',
               'mode', sp.att -> 'mode',
               'topic', sp.att -> 'topic',
               'overallBand', sp.att -> 'overallBand',
               'criteria', sp.att -> 'criteria'
             )
             order by sp.att ->> 'at' desc nulls last
           ),
           '[]'::jsonb
         )
    into v_speaking
    from (
      select a.value as att
        from jsonb_array_elements(case when jsonb_typeof(v_progress -> 'speaking') = 'array' then v_progress -> 'speaking' else '[]'::jsonb end) a
       where jsonb_typeof(a.value) = 'object'
       order by a.value ->> 'at' desc nulls last
       limit 100
    ) sp;

  return jsonb_build_object('tests', v_tests, 'writing', v_writing, 'speaking', v_speaking);
end;
$$;

revoke execute on function public.admin_student_work(uuid) from public, anon;
grant execute on function public.admin_student_work(uuid) to authenticated;

-- Rollback (NOT executed; run by hand only if this function must go):
-- drop function if exists public.admin_student_work(uuid);
