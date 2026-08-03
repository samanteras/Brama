-- Storage policies could not see the caller's bots.
--
-- The original policies asked `exists (select 1 from public.bots where ...)`.
-- That subquery runs inside a storage.objects policy and is itself subject to
-- row level security on public.bots, so the check depended on one set of
-- policies being evaluable from inside another. Uploads were refused with
-- "new row violates row-level security policy" even though the caller plainly
-- owned the bot.
--
-- The ownership question is answered by a security definer function instead.
-- It reads public.bots with the definer's rights, so the answer no longer
-- depends on nested policy evaluation, and it takes auth.uid() explicitly so
-- there is nothing ambiguous about whose ownership is being checked.

create or replace function public.owns_bot(p_bot_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bots
    where bots.id = p_bot_id
      and bots.owner_id = p_user_id
  );
$$;

comment on function public.owns_bot is
  'Whether a user owns a bot. Security definer so storage policies can ask without depending on RLS over bots.';

-- Safe to expose: it answers a yes/no question about a bot id the caller
-- already has, and reveals nothing about bots they do not own.
grant execute on function public.owns_bot(uuid, uuid) to authenticated;

drop policy if exists "Owners upload into their own bot folder" on storage.objects;
drop policy if exists "Owners read their own uploads" on storage.objects;
drop policy if exists "Owners delete their own uploads" on storage.objects;

/**
 * Objects are keyed `<bot_id>/<uuid>.<ext>`, so the first path segment is the
 * bot and ownership is derivable from the key alone.
 *
 * The cast is guarded: a path whose first segment is not a UUID would otherwise
 * raise instead of simply failing the check.
 */
create policy "Owners upload into their own bot folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.owns_bot(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "Owners read their own uploads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.owns_bot(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "Owners delete their own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.owns_bot(((storage.foldername(name))[1])::uuid, auth.uid())
  );
