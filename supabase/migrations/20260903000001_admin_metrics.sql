-- Aggregate read-only metrics for the operator admin panel.
--
-- These reach across every tenant, so they are locked to the service role the
-- same way the quota and retrieval functions are: execute is revoked from anon
-- and authenticated, and the admin route calls them with the service role key
-- (which bypasses RLS anyway). A browser cannot call them directly.

-- Single-row snapshot of the whole system, as JSON so the caller reads one
-- object instead of threading many out-params.
create or replace function public.admin_overview()
returns json
language sql
stable
set search_path = public
as $$
  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'new_users_30d', (select count(*) from public.profiles
                      where created_at >= now() - interval '30 days'),
    'total_bots', (select count(*) from public.bots),
    -- "Active" = has at least one indexed document, i.e. a bot that can actually
    -- answer. A bot created but never fed is not counted.
    'active_bots', (select count(distinct bot_id) from public.documents
                    where status = 'ready'),
    'messages_total', (select count(*) from public.messages),
    'messages_this_month', (select count(*) from public.messages
                            where created_at >= date_trunc('month', now())),
    'leads_total', (select count(*) from public.leads),
    'leads_this_month', (select count(*) from public.leads
                         where created_at >= date_trunc('month', now())),
    'plan_free', (select count(*) from public.profiles where plan = 'free'),
    'plan_pro', (select count(*) from public.profiles where plan = 'pro'),
    'plan_business', (select count(*) from public.profiles where plan = 'business')
  );
$$;

-- Sign-ups per day for the last p_days, zero-filled so the chart has a
-- continuous axis even on days with no new users.
create or replace function public.admin_signups_daily(p_days integer default 30)
returns table (day date, count bigint)
language sql
stable
set search_path = public
as $$
  select d::date as day, count(p.id) as count
  from generate_series(
    current_date - (greatest(1, p_days) - 1) * interval '1 day',
    current_date,
    interval '1 day'
  ) as d
  left join public.profiles p
    on p.created_at >= d and p.created_at < d + interval '1 day'
  group by d
  order by d;
$$;

-- Messages per day for the last p_days, zero-filled the same way.
create or replace function public.admin_messages_daily(p_days integer default 30)
returns table (day date, count bigint)
language sql
stable
set search_path = public
as $$
  select d::date as day, count(m.id) as count
  from generate_series(
    current_date - (greatest(1, p_days) - 1) * interval '1 day',
    current_date,
    interval '1 day'
  ) as d
  left join public.messages m
    on m.created_at >= d and m.created_at < d + interval '1 day'
  group by d
  order by d;
$$;

revoke execute on function public.admin_overview() from anon, authenticated;
revoke execute on function public.admin_signups_daily(integer) from anon, authenticated;
revoke execute on function public.admin_messages_daily(integer) from anon, authenticated;
