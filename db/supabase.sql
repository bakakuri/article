-- ══════════════════════════════════════════════════════════════
-- LinguaFlow · supabase.sql
-- ──────────────────────────────────────────────────────────────
-- გაუშვი Supabase SQL Editor-ში:
-- Project → SQL Editor → New query → paste → Run
-- ══════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────
-- 1. PROFILES TABLE
--    auth.users-ის გაფართოება — ყოველ მომხმარებელს ერთი row
-- ────────────────────────────────────────────────────────────
create table public.profiles (
  id                 uuid references auth.users on delete cascade primary key,
  username           text not null,
  selected_language  text    not null default 'de',
  current_level      text    not null default 'A1',
  total_xp           integer not null default 0,
  streak             integer not null default 0,
  last_activity_date date,
  created_at         timestamptz not null default now()
);

-- ROW LEVEL SECURITY
alter table public.profiles enable row level security;

create policy "მომხმარებელი კითხულობს საკუთარ პროფილს"
  on public.profiles
  for select
  using ( auth.uid() = id );

create policy "მომხმარებელი განაახლებს საკუთარ პროფილს"
  on public.profiles
  for update
  using ( auth.uid() = id );

create policy "მომხმარებელი ქმნის საკუთარ პროფილს"
  on public.profiles
  for insert
  with check ( auth.uid() = id );


-- ────────────────────────────────────────────────────────────
-- 2. AUTO-CREATE PROFILE ON SIGNUP
--    რეგისტრაციის დროს ავტომატურად იქმნება profile row
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

-- trigger: fires after every new user in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 3. OPTIONAL — VERIFY SETUP
--    გაუშვი ამ query-ების შემდეგ მოწმობისთვის
-- ────────────────────────────────────────────────────────────
-- select * from public.profiles limit 10;
-- select * from auth.users limit 10;


-- ────────────────────────────────────────────────────────────
-- 4. OPTIONAL — RESET (თუ გადასაკეთებელია)
-- ────────────────────────────────────────────────────────────
-- drop trigger if exists on_auth_user_created on auth.users;
-- drop function if exists public.handle_new_user();
-- drop table if exists public.profiles;
