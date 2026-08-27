-- SermonBlok Supabase Schema
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.

-- Folders (다른 테이블이 참조하므로 먼저 생성)
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tab text not null,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table folders enable row level security;
create policy "folders_own" on folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sermons
create table if not exists sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text,
  category text,
  title text,
  passage text,
  emphasis text,
  draft text,
  folder_id uuid,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table sermons enable row level security;
create policy "sermons_own" on sermons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sermon Steps
create table if not exists sermon_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  sermon_id uuid references sermons(id) on delete cascade not null,
  step_index int not null,
  content text,
  unique(sermon_id, step_index)
);
alter table sermon_steps enable row level security;
create policy "sermon_steps_own" on sermon_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Worships
create table if not exists worships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text,
  season text,
  title text,
  passage text,
  draft text,
  folder_id uuid,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table worships enable row level security;
create policy "worships_own" on worships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Worship Steps
create table if not exists worship_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  worship_id uuid references worships(id) on delete cascade not null,
  step_index int not null,
  content text,
  unique(worship_id, step_index)
);
alter table worship_steps enable row level security;
create policy "worship_steps_own" on worship_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dawns
create table if not exists dawns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date text,
  category text,
  title text,
  passage text,
  season text,
  emphasis text,
  draft text,
  folder_id uuid,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table dawns enable row level security;
create policy "dawns_own" on dawns
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Dawn Steps
create table if not exists dawn_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dawn_id uuid references dawns(id) on delete cascade not null,
  step_index int not null,
  content text,
  unique(dawn_id, step_index)
);
alter table dawn_steps enable row level security;
create policy "dawn_steps_own" on dawn_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cells
create table if not exists cells (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  passage text,
  title text,
  date text,
  folder_id uuid,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table cells enable row level security;
create policy "cells_own" on cells
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cell Steps
create table if not exists cell_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  cell_id uuid references cells(id) on delete cascade not null,
  step_index int not null,
  content text,
  final_content text,
  unique(cell_id, step_index)
);
alter table cell_steps enable row level security;
create policy "cell_steps_own" on cell_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Custom Step Items
create table if not exists custom_step_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tab text not null,
  step_key text not null,
  label text,
  text text,
  "order" int default 0
);
alter table custom_step_items enable row level security;
create policy "custom_step_items_own" on custom_step_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
