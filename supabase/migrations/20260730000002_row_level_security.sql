-- Row level security.
--
-- Two kinds of caller reach this database, and only one of them has an identity:
--
--   1. The owner, in the dashboard, holding a Supabase JWT. Everything they can
--      see is decided here, by these policies.
--   2. An anonymous visitor talking to a widget on a customer's website. They
--      have no account and never will, so their requests go through server
--      routes using the service role key, which bypasses RLS entirely. Those
--      routes do their own checks — bot id, Origin, plan quota — explicitly.
--
-- Enabling RLS without writing a policy denies everything to anon and
-- authenticated roles, which is the correct default for tables only the server
-- should touch.

alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.usage enable row level security;
alter table public.stripe_events enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Deliberately no insert policy: profiles are created by a trigger on signup.
-- Deliberately no delete policy: deleting the auth user cascades.

-- Note the absence of an update policy too. The plan column must only ever move
-- because Stripe said so, and a user who could update their own profile row
-- would simply set plan = 'business'. The webhook writes it via service role.

-- ---------------------------------------------------------------------------
-- bots
-- ---------------------------------------------------------------------------

create policy "Owners read their bots"
  on public.bots for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners create bots for themselves"
  on public.bots for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update their bots"
  on public.bots for update
  to authenticated
  using (owner_id = (select auth.uid()))
  -- Without this the owner could reassign a bot to somebody else's account.
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their bots"
  on public.bots for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

-- Ownership is one hop away, through the bot. The subquery is wrapped in an
-- `exists` so it can use the index on bots.owner_id.
create policy "Owners read documents of their bots"
  on public.documents for select
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = documents.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners add documents to their bots"
  on public.documents for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bots
      where bots.id = documents.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners update documents of their bots"
  on public.documents for update
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = documents.bot_id
        and bots.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.bots
      where bots.id = documents.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners delete documents of their bots"
  on public.documents for delete
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = documents.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- chunks
-- ---------------------------------------------------------------------------

-- Read-only for owners: chunks are written by the indexing routes under the
-- service role, never by the browser.
create policy "Owners read chunks of their bots"
  on public.chunks for select
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = chunks.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- conversations and messages
-- ---------------------------------------------------------------------------

create policy "Owners read conversations of their bots"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = conversations.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners read messages of their bots"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations
      join public.bots on bots.id = conversations.bot_id
      where conversations.id = messages.conversation_id
        and bots.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

-- Read and delete only. Leads are created by the chat route under the service
-- role; nothing legitimate lets a browser fabricate one.
create policy "Owners read leads of their bots"
  on public.leads for select
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = leads.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners delete leads of their bots"
  on public.leads for delete
  to authenticated
  using (
    exists (
      select 1 from public.bots
      where bots.id = leads.bot_id
        and bots.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- usage
-- ---------------------------------------------------------------------------

-- Readable so the dashboard can show "412 of 1000 answers used", but never
-- writable: the counter is the thing the plan limit is enforced against.
create policy "Owners read their own usage"
  on public.usage for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- stripe_events
-- ---------------------------------------------------------------------------

-- No policies at all. This table exists purely for webhook idempotency and is
-- only ever touched by the service role.
