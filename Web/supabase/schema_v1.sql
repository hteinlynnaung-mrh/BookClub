-- Books & Friends (v1) schema for Supabase Postgres
-- Public sessions only. Enable RLS and simple policies.

-- Required extensions (usually already present on Supabase)
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'New member'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create policy "profiles: read all (authed)"
on public.profiles for select
to authenticated
using (true);

create policy "profiles: insert self"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles: update self"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Sessions (public-only v1)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  book_title text not null,
  book_author text not null,
  chapter_count int not null check (chapter_count > 0),
  book_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Storage bucket for books
insert into storage.buckets (id, name, public) 
values ('books', 'books', true)
on conflict (id) do nothing;

create policy "books: read all" on storage.objects
for select to authenticated using (bucket_id = 'books');

create policy "books: upload" on storage.objects
for insert to authenticated with check (bucket_id = 'books');

alter table public.sessions enable row level security;

create policy "sessions: read all (authed)"
on public.sessions for select
to authenticated
using (true);

create policy "sessions: create (authed)"
on public.sessions for insert
to authenticated
with check (creator_id = auth.uid());

-- No update/delete policy in v1 (intentionally)

-- Session members
create table if not exists public.session_members (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_progress_chapter int check (last_progress_chapter >= 0),
  primary key (session_id, user_id)
);

alter table public.session_members enable row level security;

create policy "session_members: read session participants"
on public.session_members for select
to authenticated
using (
  exists (
    select 1 from public.session_members sm
    where sm.session_id = session_members.session_id
      and sm.user_id = auth.uid()
  )
);

create policy "session_members: join (self)"
on public.session_members for insert
to authenticated
with check (user_id = auth.uid());

create policy "session_members: leave (self)"
on public.session_members for delete
to authenticated
using (user_id = auth.uid());

create policy "session_members: update own progress pointer"
on public.session_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Progress updates
create table if not exists public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter int not null check (chapter >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists progress_updates_session_created_at_idx
  on public.progress_updates(session_id, created_at desc);

alter table public.progress_updates enable row level security;

create policy "progress_updates: read participants"
on public.progress_updates for select
to authenticated
using (
  exists (
    select 1 from public.session_members sm
    where sm.session_id = progress_updates.session_id
      and sm.user_id = auth.uid()
  )
);

create policy "progress_updates: insert self as participant"
on public.progress_updates for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.session_members sm
    where sm.session_id = progress_updates.session_id
      and sm.user_id = auth.uid()
  )
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists comments_session_created_at_idx
  on public.comments(session_id, created_at asc);

alter table public.comments enable row level security;

create policy "comments: read participants"
on public.comments for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1 from public.session_members sm
    where sm.session_id = comments.session_id
      and sm.user_id = auth.uid()
  )
);

create policy "comments: insert self as participant"
on public.comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.session_members sm
    where sm.session_id = comments.session_id
      and sm.user_id = auth.uid()
  )
);

-- Reactions
create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, emoji)
);

create index if not exists comment_reactions_comment_idx
  on public.comment_reactions(comment_id);

alter table public.comment_reactions enable row level security;

create policy "comment_reactions: read participants"
on public.comment_reactions for select
to authenticated
using (
  exists (
    select 1 from public.session_members sm
    where sm.session_id = comment_reactions.session_id
      and sm.user_id = auth.uid()
  )
);

create policy "comment_reactions: insert self as participant"
on public.comment_reactions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.session_members sm
    where sm.session_id = comment_reactions.session_id
      and sm.user_id = auth.uid()
  )
);

create policy "comment_reactions: delete self"
on public.comment_reactions for delete
to authenticated
using (user_id = auth.uid());

