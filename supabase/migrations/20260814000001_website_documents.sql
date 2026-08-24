-- Websites imported by crawling become documents like any other source.
-- Only the accepted-values list changes; shape and indexing are untouched.

alter table public.documents
  drop constraint documents_source_type_check;

alter table public.documents
  add constraint documents_source_type_check
  check (source_type in ('pdf', 'text', 'markdown', 'paste', 'website'));
