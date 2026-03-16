-- ─────────────────────────────────────────────────────────────────
-- DocIntel — Supabase SQL Schema
-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New Query → paste & Run
-- ─────────────────────────────────────────────────────────────────

-- Documents table: stores uploaded document text + metadata
create table if not exists documents (
  id          text primary key,
  filename    text not null,
  text        text not null,
  mime_type   text,
  created_at  timestamptz default now()
);

-- Analyses table: stores completed AI analysis results
create table if not exists analyses (
  id          text primary key references documents(id) on delete cascade,
  filename    text not null,
  created_at  timestamptz default now(),
  tone        text,
  summary     jsonb,
  entities    jsonb,
  risk_flags  jsonb
);

-- Index for fast lookup by creation time (for recent uploads list)
create index if not exists documents_created_at_idx on documents(created_at desc);
create index if not exists analyses_created_at_idx  on analyses(created_at desc);

-- Enable Row Level Security (RLS) — open policy for now, lock down per user later
alter table documents enable row level security;
alter table analyses  enable row level security;

-- Allow all operations via anon key (adjust later when adding auth)
create policy "Allow all for anon" on documents for all using (true) with check (true);
create policy "Allow all for anon" on analyses  for all using (true) with check (true);
