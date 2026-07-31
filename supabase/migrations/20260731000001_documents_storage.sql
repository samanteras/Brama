-- Storage for uploaded source files.
--
-- Originals are kept so a document can be re-indexed without asking the
-- customer to upload it again — after a failed run, or if chunking improves.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  -- Private. Files are read server-side with the service role; nothing about a
  -- customer's price list should be fetchable by URL.
  false,
  -- 20 MB. Guards the parser against a file large enough to exhaust memory
  -- before the page-count limit ever gets a chance to reject it.
  20971520,
  array['application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects are keyed by `<bot_id>/<document_id>`, so ownership is derivable from
-- the path. These policies let an owner upload and remove their own files
-- directly from the browser without the service role.

create policy "Owners upload into their own bot folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.bots
      where bots.id::text = (storage.foldername(name))[1]
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners read their own uploads"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.bots
      where bots.id::text = (storage.foldername(name))[1]
        and bots.owner_id = (select auth.uid())
    )
  );

create policy "Owners delete their own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.bots
      where bots.id::text = (storage.foldername(name))[1]
        and bots.owner_id = (select auth.uid())
    )
  );
