-- Questions the bot could not answer.
--
-- Derived from messages rather than stored in a table of its own. A separate
-- table would be a second copy of the same fact, free to drift from the
-- conversation it came from; this cannot disagree with itself.
--
-- Deliberately NOT security definer. Running as the caller means the existing
-- row level security policies on messages and conversations apply unchanged, so
-- one owner can never read another's unanswered questions — the isolation is
-- the policies already tested, not a second implementation of them.
create or replace function public.knowledge_gaps(
  p_bot_id uuid,
  p_limit integer default 100
)
returns table (
  question text,
  asked_at timestamptz,
  conversation_id uuid
)
language sql
stable
set search_path = public
as $$
  with ordered as (
    select
      m.role,
      m.content,
      m.was_answered,
      m.created_at,
      m.conversation_id,
      -- The question that produced this reply is simply the message before it.
      lag(m.content) over (partition by m.conversation_id order by m.created_at) as previous_content,
      lag(m.role) over (partition by m.conversation_id order by m.created_at) as previous_role
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where c.bot_id = p_bot_id
  )
  select
    ordered.previous_content as question,
    ordered.created_at as asked_at,
    ordered.conversation_id
  from ordered
  where ordered.role = 'assistant'
    and ordered.was_answered = false
    and ordered.previous_role = 'user'
    and ordered.previous_content is not null
  order by ordered.created_at desc
  limit greatest(1, p_limit);
$$;

comment on function public.knowledge_gaps is
  'Questions a bot failed to answer, newest first. Runs as the caller so RLS applies.';
