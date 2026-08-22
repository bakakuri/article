-- ══════════════════════════════════════════════════════════════
-- LinguaFlow · supabase-update.sql
-- გაუშვი SQL Editor-ში (Project → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════


-- ─── 1. PROFILES-ს დაემატება ახალი სვეტები ───────────────────
alter table public.profiles
  add column if not exists is_admin  boolean  not null default false,
  add column if not exists avatar    text     not null default '👤',
  add column if not exists bio       text,
  add column if not exists xp_level  text     not null default 'A1';


-- ─── 2. WORDS TABLE ─────────────────────────────────────────
create table if not exists public.words (
  id          uuid        primary key default gen_random_uuid(),
  language    text        not null,
  word        text        not null,
  article     text,
  translation text        not null,
  level       text        not null default 'A1',
  created_at  timestamptz not null default now(),
  unique (language, word)
);

alter table public.words enable row level security;

-- ავთენტიფიცირებული მომხმარებლები კითხულობენ
create policy "authenticated users can read words"
  on public.words for select
  to authenticated
  using (true);

-- მხოლოდ ადმინი ცვლის/ამატებს/შლის
create policy "admins can insert words"
  on public.words for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "admins can update words"
  on public.words for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "admins can delete words"
  on public.words for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );


-- ─── 3. WORD PROGRESS TABLE (localStorage-ის ნაცვლად) ───────
create table if not exists public.word_progress (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users on delete cascade not null,
  word_id     uuid        references public.words on delete cascade not null,
  learned_at  timestamptz not null default now(),
  unique (user_id, word_id)
);

alter table public.word_progress enable row level security;

create policy "users manage own word progress"
  on public.word_progress for all
  using (auth.uid() = user_id);


-- ─── 4. პირველი ადმინის დაყენება ────────────────────────────
-- შეცვალე 'შენი_username' შენი სახელით
-- update public.profiles set is_admin = true where username = 'შენი_username';


-- ─── 5. VERIFY ───────────────────────────────────────────────
-- select * from public.profiles;
-- select * from public.words limit 5;
-- select count(*) from public.words;
