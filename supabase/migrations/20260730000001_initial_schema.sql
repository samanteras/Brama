-- Brama: initial schema.
--
-- Multi-tenant by owner. Every table below hangs off `profiles`, either
-- directly or through `bots`, which is what makes the row level security
-- policies in the next migration expressible as a single ownership question.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- One row per authenticated user, created automatically by a trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Mirrors PlanId in lib/plans.ts, which stays the source of truth for what a
  -- plan *allows*. This constraint only guarantees the column holds a plan that
  -- exists, so a bad write fails at the database rather than silently granting
  -- unknown limits.
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),

  stripe_customer_id text unique,
  stripe_subscription_id text unique,

  -- End of the paid period. Used to decide when a subscription lapses back to
  -- free without waiting for a webhook that may never arrive.
  current_period_end timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Account-level state: which plan, and the Stripe identifiers behind it.';

-- ---------------------------------------------------------------------------
-- bots
-- ---------------------------------------------------------------------------

create table public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 60),

  -- Shown as the first message in the widget.
  greeting text not null default '',

  -- The only visual customization offered. Anything more would be theming,
  -- which is explicitly out of scope.
  accent_color text not null default '#1f2937'
    check (accent_color ~ '^#[0-9a-fA-F]{6}$'),

  -- Hostnames the widget may run on. Empty means unrestricted: restricting
  -- domains is a paid feature, and a new bot that answers nowhere would be a
  -- broken first experience. See lib/security/origin.ts.
  allowed_domains text[] not null default '{}',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bots_owner_id_idx on public.bots (owner_id);

-- ---------------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,

  filename text not null,
  source_type text not null check (source_type in ('pdf', 'text', 'markdown', 'paste')),

  -- SHA-256 of the normalized text. The unique constraint below is what stops a
  -- customer uploading the same price list twice and having the bot cite every
  -- fact from it two different ways.
  content_hash text not null,

  -- Chunks only become visible to the bot at 'ready', so a half-indexed
  -- document can never be answered from. See match_chunks().
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),

  -- Machine-readable reason, matching ParseFailureCode in lib/ingest/parse.ts.
  -- The wording lives with the rest of the copy.
  error_code text,

  page_count integer,

  -- Drives an honest progress bar during indexing, and lets an interrupted
  -- upload resume from the last completed batch.
  total_chunks integer not null default 0 check (total_chunks >= 0),
  indexed_chunks integer not null default 0 check (indexed_chunks >= 0),

  -- Path in Supabase Storage, kept so a document can be re-indexed without
  -- asking the customer to upload it again.
  storage_path text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint documents_unique_content_per_bot unique (bot_id, content_hash)
);

create index documents_bot_id_idx on public.documents (bot_id);

-- ---------------------------------------------------------------------------
-- chunks
-- ---------------------------------------------------------------------------

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,

  -- Denormalized from documents. The single deliberate denormalization in this
  -- schema: without it every vector search would need a join before the ANN
  -- filter can be applied.
  bot_id uuid not null references public.bots (id) on delete cascade,

  chunk_index integer not null check (chunk_index >= 0),
  content text not null,

  -- Nullable so a chunk row can exist before its embedding returns. Searches
  -- skip rows without one.
  embedding vector (1536),

  token_count integer not null default 0,

  created_at timestamptz not null default now(),

  -- Makes an indexing batch idempotent: retrying a batch overwrites its own
  -- rows instead of duplicating them.
  constraint chunks_unique_position_per_document unique (document_id, chunk_index)
);

create index chunks_bot_id_idx on public.chunks (bot_id);

-- HNSW with cosine distance, matching the operator used in match_chunks().
-- At our data sizes the planner may well prefer a sequential scan; the index is
-- here so the query shape is right from day one rather than retrofitted.
create index chunks_embedding_idx on public.chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- conversations and messages
-- ---------------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,

  -- 'dashboard' is the owner testing their own bot; 'widget' is a real visitor.
  -- Kept apart so the owner's own testing does not pollute the lead list.
  source text not null check (source in ('widget', 'dashboard')),

  -- Anonymous, client-generated. Visitors have no account and never will.
  visitor_id text,

  created_at timestamptz not null default now()
);

create index conversations_bot_id_idx on public.conversations (bot_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,

  role text not null check (role in ('user', 'assistant')),
  content text not null,

  -- Which chunks the answer was grounded in, for citation and debugging.
  cited_chunk_ids uuid[] not null default '{}',

  -- Null for user messages. False marks an assistant turn that could not answer
  -- from the knowledge base — the knowledge gaps page is a query over this
  -- column rather than a separate table, so the two can never disagree.
  was_answered boolean,

  created_at timestamptz not null default now(),

  constraint messages_answered_only_for_assistant
    check (role = 'assistant' or was_answered is null)
);

create index messages_conversation_id_idx on public.messages (conversation_id);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,

  name text,
  phone text,
  email text,

  -- What the visitor actually wanted: budget, scope, the question that stalled
  -- them. This is the difference between a row in a table and a lead a manager
  -- can act on without reading the transcript.
  context jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  -- A lead with no way to reach the person is not a lead.
  constraint leads_require_a_contact check (phone is not null or email is not null)
);

create index leads_bot_id_created_at_idx on public.leads (bot_id, created_at desc);

-- ---------------------------------------------------------------------------
-- usage
-- ---------------------------------------------------------------------------

-- Monthly answer counter, per account rather than per bot, because the plan
-- limit is an account limit.
create table public.usage (
  owner_id uuid not null references public.profiles (id) on delete cascade,

  -- Calendar month as 'YYYY-MM'.
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),

  messages_used integer not null default 0 check (messages_used >= 0),

  primary key (owner_id, period)
);

-- ---------------------------------------------------------------------------
-- stripe_events
-- ---------------------------------------------------------------------------

-- Webhook deliveries already handled. Stripe retries and can deliver the same
-- event more than once; without this a repeat delivery could apply an upgrade
-- twice.
create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bots_touch_updated_at
  before update on public.bots
  for each row execute function public.touch_updated_at();

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();
