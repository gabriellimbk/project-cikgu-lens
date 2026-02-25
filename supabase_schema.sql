-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.generated_analyses (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  normalized_text text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_analyses_normalized_text_idx
  on public.generated_analyses (normalized_text);

create index if not exists generated_analyses_created_at_idx
  on public.generated_analyses (created_at desc);

create table if not exists public.repository_entries (
  id text primary key,
  text text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists repository_entries_created_at_idx
  on public.repository_entries (created_at desc);
