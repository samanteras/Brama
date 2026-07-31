-- Rate limiting for the public widget endpoint.
--
-- The bot id sits in plain sight on the customer's website and cannot be a
-- secret, so anyone can point requests at us. Domain checking stops the widget
-- running elsewhere and the plan quota caps the month, but neither prevents a
-- burst that empties a customer's entire monthly allowance in a minute. This is
-- the layer that does.
--
-- Fixed window rather than a sliding one: a sliding window needs per-request
-- history, and the extra precision buys nothing here. The worst case is a
-- caller getting up to twice the limit across a window boundary, which is
-- irrelevant against a cap measured in tens per minute.

create table public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  hits integer not null default 0
);

alter table public.rate_limits enable row level security;
-- No policies: only the service role touches this.

comment on table public.rate_limits is 'Fixed-window counters for the public chat endpoint.';

/**
 * Records a hit and reports whether it is within the limit.
 *
 * Atomic for the same reason the message quota is: concurrent visitors would
 * otherwise interleave between reading and writing the counter, which is
 * precisely the burst this is meant to catch.
 */
create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (allowed boolean, hits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
  v_expired boolean;
begin
  insert into public.rate_limits (key, window_started_at, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set
      -- Expired window: start counting again from this request.
      hits = case
        when public.rate_limits.window_started_at
             < now() - make_interval(secs => p_window_seconds)
        then 1
        else public.rate_limits.hits + 1
      end,
      window_started_at = case
        when public.rate_limits.window_started_at
             < now() - make_interval(secs => p_window_seconds)
        then now()
        else public.rate_limits.window_started_at
      end
  returning public.rate_limits.hits into v_hits;

  return query select v_hits <= p_max, v_hits;
end;
$$;

/**
 * Drops counters whose window closed long ago.
 *
 * Nothing calls this automatically yet. Rows are tiny and one per IP per bot,
 * so growth is slow; wiring up a schedule before there is any traffic would be
 * solving a problem that does not exist.
 */
create or replace function public.prune_rate_limits(p_older_than_seconds integer default 3600)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limits
  where window_started_at < now() - make_interval(secs => p_older_than_seconds);

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
revoke execute on function public.prune_rate_limits(integer) from anon, authenticated;
