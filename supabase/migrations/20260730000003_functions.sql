-- Database functions.

-- ---------------------------------------------------------------------------
-- Profile creation on signup
-- ---------------------------------------------------------------------------

-- Creates the profile row for a new auth user. Doing this in the database
-- rather than in application code means an account can never exist without a
-- profile, no matter which signup path created it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Message quota
-- ---------------------------------------------------------------------------

-- Consumes one answer from the account's monthly allowance, atomically.
--
-- The widget is concurrent by nature: several visitors can be mid-question at
-- the same moment. A read-then-compare-then-write in application code would let
-- requests interleave between the read and the write and slip past the limit,
-- which on the free plan is a direct loss.
--
-- The `where` clause on the conflict path is what makes this safe: Postgres
-- takes a row lock for the upsert, so concurrent callers serialize on it, and a
-- caller who finds the row already at the limit updates no row at all.
create or replace function public.consume_message_quota(
  p_owner_id uuid,
  p_period text,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  -- A zero or negative allowance has to be rejected before the insert, because
  -- the conflict `where` clause only guards the update path — a first-ever
  -- request in a period would otherwise insert a row with 1 and exceed it.
  if p_limit <= 0 then
    select coalesce(u.messages_used, 0) into v_used
    from public.usage u
    where u.owner_id = p_owner_id and u.period = p_period;

    return query select false, coalesce(v_used, 0);
    return;
  end if;

  insert into public.usage (owner_id, period, messages_used)
  values (p_owner_id, p_period, 1)
  on conflict (owner_id, period) do update
    set messages_used = public.usage.messages_used + 1
    where public.usage.messages_used < p_limit
  returning public.usage.messages_used into v_used;

  if v_used is null then
    -- The conflict path matched no row, meaning the allowance is spent. Report
    -- the current count without touching it.
    select u.messages_used into v_used
    from public.usage u
    where u.owner_id = p_owner_id and u.period = p_period;

    return query select false, coalesce(v_used, 0);
    return;
  end if;

  return query select true, v_used;
end;
$$;

-- Returns a consumed answer to the allowance.
--
-- Called when the model call fails after the quota was taken. Charging a
-- customer's allowance for an answer they never received is the kind of small
-- unfairness that erodes trust in a metered product.
create or replace function public.refund_message_quota(
  p_owner_id uuid,
  p_period text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.usage
  set messages_used = greatest(0, messages_used - 1)
  where owner_id = p_owner_id and period = p_period;
$$;

-- ---------------------------------------------------------------------------
-- Vector search
-- ---------------------------------------------------------------------------

-- Finds the chunks closest to a query embedding, for one bot.
--
-- Only documents in 'ready' are searched. That is what guarantees a
-- half-indexed upload is never answered from: rows exist as soon as a batch
-- writes them, but stay invisible until the whole document finishes.
create or replace function public.match_chunks(
  p_bot_id uuid,
  p_embedding vector (1536),
  p_match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.document_id,
    c.content,
    -- Cosine distance, expressed as similarity so callers can threshold on a
    -- number that grows with relevance.
    1 - (c.embedding <=> p_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.bot_id = p_bot_id
    and d.status = 'ready'
    and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit greatest(1, p_match_count);
$$;

-- These are called only from server routes holding the service role key. The
-- anon and authenticated roles get no execute rights, so a browser cannot spend
-- somebody's quota or search another tenant's chunks by calling them directly.
revoke execute on function public.consume_message_quota(uuid, text, integer) from anon, authenticated;
revoke execute on function public.refund_message_quota(uuid, text) from anon, authenticated;
revoke execute on function public.match_chunks(uuid, vector, integer) from anon, authenticated;
