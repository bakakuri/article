-- ══════════════════════════════════════════════════════════════
-- LinguaFlow · supabase-words-columns.sql
-- სიტყვების ცხრილს ახალი სვეტები
-- ══════════════════════════════════════════════════════════════

-- ─── 1. words ცხრილს ახალი სვეტები ──────────────────────────
alter table public.words
  add column if not exists phonetic         text,          -- /haʊs/
  add column if not exists example_foreign  text,          -- Das Haus ist groß.
  add column if not exists example_georgian text,          -- სახლი დიდია.
  add column if not exists category         text,          -- noun / verb / adj
  add column if not exists note             text;          -- დამატებითი შენიშვნა

-- ─── 2. word_progress ცხრილს status სვეტი ───────────────────
alter table public.word_progress
  add column if not exists status      text default 'easy',  -- hard | medium | easy
  add column if not exists reviewed_at timestamptz default now();

-- ─── 3. ვერიფიკაცია ──────────────────────────────────────────
-- select column_name from information_schema.columns
-- where table_name = 'words' order by ordinal_position;
