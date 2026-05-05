-- Run in Supabase SQL Editor before or alongside the app deployment.
-- This avoids btree index failures when normalized_text is too long.

create extension if not exists pgcrypto;

alter table public.generated_analyses
  add column if not exists normalized_text_hash text;

update public.generated_analyses
set normalized_text_hash = encode(digest(normalized_text, 'sha256'), 'hex')
where normalized_text_hash is null;

alter table public.generated_analyses
  alter column normalized_text_hash set not null;

drop index if exists public.generated_analyses_normalized_text_idx;

create index if not exists generated_analyses_normalized_text_idx
  on public.generated_analyses (normalized_text_hash);

-- Rename the repository table while preserving all existing rows.

alter table if exists public.repository_entries
  rename to "MTL_CIKGU_LENS";

alter index if exists public.repository_entries_created_at_idx
  rename to mtl_cikgu_lens_created_at_idx;

create index if not exists mtl_cikgu_lens_created_at_idx
  on public."MTL_CIKGU_LENS" (created_at desc);
