# Project Specification: Books & Friends (Web)

This document outlines the core architecture and Supabase setup for the **Books & Friends** web application.

## Overview
**Books & Friends** is a collaborative reading platform where users can join reading sessions, track progress, and discuss books.

## Supabase Schema

### Profiles
Managed via the `profiles` table, linked to Supabase `auth.users`.
- **id**: `uuid` (Primary Key, references `auth.users`)
- **display_name**: `text` (Derived from email at signup)
- **avatar_url**: `text`
- **created_at / updated_at**: `timestamptz`

#### Trigger: `handle_new_user`
Automatically creates a profile row when a new user signs up.

### Sessions
Public reading sessions.
- **id**: `uuid` (Primary Key, default `gen_random_uuid()`)
- **creator_id**: `uuid` (References `profiles.id`)
- **book_title / book_author**: `text`
- **chapter_count**: `int` (Must be > 0)
- **created_at / updated_at**: `timestamptz`

### Session Members
Links users to sessions.
- **session_id / user_id**: `uuid` (Composite Primary Key)
- **joined_at**: `timestamptz`
- **last_progress_chapter**: `int`

### Progress Updates
Tracks individual chapter completions.
- **id**: `uuid` (Primary Key)
- **session_id / user_id**: `uuid`
- **chapter**: `int`
- **note**: `text` (Optional)
- **created_at**: `timestamptz`

### Comments
Discussion within a session.
- **id**: `uuid` (Primary Key)
- **session_id / user_id**: `uuid`
- **body**: `text`
- **created_at / edited_at / deleted_at**: `timestamptz`

### Reactions
Emoji reactions to comments.
- **id**: `uuid` (Primary Key)
- **comment_id / user_id / session_id**: `uuid`
- **emoji**: `text`
- **created_at**: `timestamptz`

## Row Level Security (RLS)
RLS is enabled for all tables. Generally:
- **Profiles**: Authenticated users can read all, insert/update own.
- **Sessions**: Authenticated users can read all, insert own.
- **Session Members**: Users can read participants of sessions they are in; join/leave own.
- **Progress Updates / Comments / Reactions**: Only session participants can read and insert.

## Development Setup
Refer to [README.md](file:///Users/hteinlynnaung/Downloads/BookClub/books-friends-web/README.md) for environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and local setup instructions.
