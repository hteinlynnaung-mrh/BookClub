-- Books & Friends (v1) seed data
--
-- Assumptions:
-- - `supabase/schema_v1.sql` has already been run.
-- - The following Auth users already exist:
--   - mina@example.com
--   - jules@example.com
--   - ari@example.com
--
-- Usage: run in Supabase SQL Editor.

do $$
declare
  mina_id uuid;
  jules_id uuid;
  ari_id uuid;
  s1 uuid;
  s2 uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
begin
  select id into mina_id from auth.users where email = 'mina@example.com';
  select id into jules_id from auth.users where email = 'jules@example.com';
  select id into ari_id from auth.users where email = 'ari@example.com';

  if mina_id is null or jules_id is null or ari_id is null then
    raise exception 'Seed users missing. Ensure mina/jules/ari exist in Auth users.';
  end if;

  -- Ensure profiles exist (trigger should have created them, but seed is resilient)
  insert into public.profiles (id, display_name)
  values
    (mina_id, 'Mina'),
    (jules_id, 'Jules'),
    (ari_id, 'Ari')
  on conflict (id) do nothing;

  -- Update display names (requested)
  update public.profiles
  set display_name = case id
    when mina_id then 'Mina'
    when jules_id then 'Jules'
    when ari_id then 'Ari'
    else display_name
  end,
  updated_at = now()
  where id in (mina_id, jules_id, ari_id);

  -- Create sessions (public-only v1)
  insert into public.sessions (creator_id, book_title, book_author, chapter_count)
  values
    (mina_id, 'Atomic Habits', 'James Clear', 20),
    (jules_id, 'The Alchemist', 'Paulo Coelho', 10)
  returning id into s1; -- first row id into s1 (see note below)

  -- Postgres "returning into" captures only the last row in multi-row inserts.
  -- So fetch the two most recent sessions by these creators instead.
  select id into s1
  from public.sessions
  where creator_id = mina_id and book_title = 'Atomic Habits'
  order by created_at desc
  limit 1;

  select id into s2
  from public.sessions
  where creator_id = jules_id and book_title = 'The Alchemist'
  order by created_at desc
  limit 1;

  -- Memberships (everyone joins both sessions)
  insert into public.session_members (session_id, user_id, last_progress_chapter)
  values
    (s1, mina_id, 6),
    (s1, jules_id, 4),
    (s1, ari_id, 2),
    (s2, mina_id, 3),
    (s2, jules_id, 5),
    (s2, ari_id, 1)
  on conflict (session_id, user_id) do update
  set last_progress_chapter = excluded.last_progress_chapter;

  -- Progress update history
  insert into public.progress_updates (session_id, user_id, chapter, note, created_at)
  values
    (s1, mina_id, 2, 'Starting strong.', now() - interval '3 days'),
    (s1, mina_id, 6, 'Loved the part about identity.', now() - interval '1 day'),
    (s1, jules_id, 4, 'Clear and practical.', now() - interval '18 hours'),
    (s1, ari_id, 2, 'Taking notes.', now() - interval '12 hours'),
    (s2, jules_id, 2, 'Beautiful opening.', now() - interval '2 days'),
    (s2, jules_id, 5, 'The omens idea is fun.', now() - interval '10 hours'),
    (s2, mina_id, 3, null, now() - interval '8 hours'),
    (s2, ari_id, 1, 'Just joined!', now() - interval '6 hours');

  -- Comments (flat thread)
  insert into public.comments (session_id, user_id, body, created_at)
  values
    (s1, mina_id, 'Welcome! Let’s read a little each day and share one takeaway.', now() - interval '2 days'),
    (s1, jules_id, 'I’m in. Chapter 2 already changed how I think about habits.', now() - interval '1 day 20 hours'),
    (s1, ari_id, 'Same. The tiny improvements concept is motivating.', now() - interval '1 day 10 hours')
  returning id into c1;

  -- Capture the comment ids for reactions
  select id into c1
  from public.comments
  where session_id = s1 and user_id = mina_id
  order by created_at asc
  limit 1;

  select id into c2
  from public.comments
  where session_id = s1 and user_id = jules_id
  order by created_at asc
  limit 1;

  select id into c3
  from public.comments
  where session_id = s1 and user_id = ari_id
  order by created_at asc
  limit 1;

  -- Reactions (multiple emoji)
  insert into public.comment_reactions (comment_id, session_id, user_id, emoji, created_at)
  values
    (c1, s1, jules_id, '👍', now() - interval '1 day 18 hours'),
    (c1, s1, ari_id, '🎉', now() - interval '1 day 18 hours'),
    (c2, s1, mina_id, '❤️', now() - interval '1 day 16 hours'),
    (c2, s1, ari_id, '🤔', now() - interval '1 day 15 hours'),
    (c3, s1, mina_id, '👏', now() - interval '1 day 9 hours'),
    (c3, s1, jules_id, '🔥', now() - interval '1 day 8 hours')
  on conflict (comment_id, user_id, emoji) do nothing;

end $$;

