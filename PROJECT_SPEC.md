# Books & Friends — v1 Project Spec

## Summary
**Books & Friends** is a web + mobile app backed by **Supabase** where anyone can register and participate in **reading sessions** for a single book. A member can create a session by entering the **book title, author, and chapter count**. Other members can join the session, submit their **chapter-based progress** (shown as a progress bar), and participate in a **single flat discussion thread** for the session. Members can react to comments using **multiple emoji**.

This document specifies **v1**: no notifications, no search, and no special host permissions beyond being the session creator.

---

## Product surface
- **Web app**: responsive web UI.
- **Mobile app**: iOS + Android.
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage optional).

---

## Goals & constraints (v1)
- **Anyone can register** and participate.
- **Sessions are public-only in v1**.
- **No extra host permissions in v1** (beyond the ability to create a session and implicitly being its creator). Do not build join approvals, member removal, session admin controls, or special moderation tools in v1.
- **Progress is chapter-based** only (not pages/percent) and displayed as a **progress bar**.
- **Discussion is flat** (single thread; no replies, no nested structure).
- **Reactions support multiple emoji** per comment (members can add/remove their own reactions).
- **No notifications** in v1 (no email, push, or in-app).
- **No search** in v1 (basic listing only).
- **Each session has exactly one book**.

---

## Definitions
- **Member**: an authenticated user.
- **Session**: a group reading instance tied to one book.
- **Public session**: visible to any authenticated member (optionally to visitors if enabled later; v1 assumes authenticated access).
- **Participant**: a member who has joined a session.

---

## Core user stories (v1)
### Auth & profile
- As a visitor, I can register and sign in.
- As a member, I can set a display name and optional avatar.

### Sessions
- As a member, I can create a public session for a book by entering title, author, and chapter count.
- As a member, I can view a list of sessions I can access.
- As a member, I can open a session detail page.
- As a member, I can join a public session.

### Progress
- As a participant, I can submit my current chapter progress (e.g., chapter 7 of 20).
- As a participant, I can see my progress bar and others’ progress bars within the session.
- As a participant, I can view a simple progress feed (latest updates).

### Discussion & reactions
- As a participant, I can post a comment in the session’s flat discussion thread.
- As a participant, I can react to a comment using emoji (multiple possible emoji).
- As a participant, I can remove my reaction.

---

## Information architecture (screens)
### Shared (web & mobile)
- **Auth**
  - Sign up / sign in
- **Home / Sessions**
  - “My sessions” list (sessions I joined)
  - “Discover” list (public sessions; no search, no filters beyond basic sort)
  - “Create session” CTA
- **Create session**
  - Book: title, author
  - Chapters: total chapter count (integer)
- **Session detail**
  - Header: book title + author + chapter count + visibility badge
  - Tabs/sections:
    - Progress (member progress bars + latest progress updates)
    - Discussion (flat comment feed + composer)
- **Profile**
  - Display name, avatar

---

## Data model (Supabase Postgres)
### Tables
#### `profiles`
Represents public-facing user profile fields linked to Supabase Auth user id.
- `id` (uuid, PK, references auth.users.id)
- `display_name` (text, required)
- `avatar_url` (text, nullable)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

#### `sessions`
- `id` (uuid, PK)
- `creator_id` (uuid, references `profiles.id`, not null)
- `book_title` (text, not null)
- `book_author` (text, not null)
- `chapter_count` (int, not null, constraint: > 0)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)

#### `session_members`
Membership for access control and per-member state.
- `session_id` (uuid, references `sessions.id`, not null)
- `user_id` (uuid, references `profiles.id`, not null)
- `joined_at` (timestamptz, default now)
- `last_progress_chapter` (int, nullable, constraint: between 0 and `sessions.chapter_count`)
- **PK/unique**: `(session_id, user_id)`

#### `progress_updates`
Append-only progress history (enables “latest updates” feed).
- `id` (uuid, PK)
- `session_id` (uuid, references `sessions.id`, not null)
- `user_id` (uuid, references `profiles.id`, not null)
- `chapter` (int, not null, constraint: between 0 and `sessions.chapter_count`)
- `note` (text, nullable)
- `created_at` (timestamptz, default now)

#### `comments`
Flat session discussion thread.
- `id` (uuid, PK)
- `session_id` (uuid, references `sessions.id`, not null)
- `user_id` (uuid, references `profiles.id`, not null)
- `body` (text, not null, constraint: non-empty after trim)
- `created_at` (timestamptz, default now)
- `edited_at` (timestamptz, nullable)
- `deleted_at` (timestamptz, nullable) — soft delete in v1 (optional; can hard-delete if preferred)

#### `comment_reactions`
Emoji reactions. A member can react with multiple emoji; each emoji is a separate row.
- `id` (uuid, PK)
- `comment_id` (uuid, references `comments.id`, not null)
- `session_id` (uuid, references `sessions.id`, not null) — denormalized for RLS simplicity
- `user_id` (uuid, references `profiles.id`, not null)
- `emoji` (text, not null) — store the emoji character
- `created_at` (timestamptz, default now)
- **unique constraint**: `(comment_id, user_id, emoji)` to prevent duplicates

### Indices (recommended)
- `sessions (created_at desc)`
- `session_members (user_id, joined_at desc)`
- `progress_updates (session_id, created_at desc)`
- `comments (session_id, created_at asc)`
- `comment_reactions (comment_id)`

---

## Access control & RLS rules (high level)
All tables have RLS enabled.

### Helper concept
“Is participant” = row exists in `session_members` for `(session_id, auth.uid())`.

### `profiles`
- **select**: authenticated users can read `display_name` + `avatar_url` for any profile needed to render sessions they can access.
- **insert/update**: user can insert/update only their own row (`id = auth.uid()`).

### `sessions`
- **select**: any authenticated user can read (v1 is public-only).
- **insert**: authenticated users can create a session with `creator_id = auth.uid()`.
- **update/delete**: **disabled in v1** (no host permissions). If updates are required for product polish later, restrict to `creator_id = auth.uid()` in v2.

### `session_members`
- **select**: participants can read membership rows for their session (needed to render progress list).
- **insert (join)**:
  - public session: any authenticated user can insert `(session_id, auth.uid())`
- **delete (leave)**: allow user to delete their own membership row.

### `progress_updates`
- **select**: participants only.
- **insert**: participants only; `user_id = auth.uid()`.
- **update/delete**: not needed; treat as append-only for v1.

### `comments`
- **select**: participants only.
- **insert**: participants only; `user_id = auth.uid()`.
- **update/delete**: optional; if supported in UI, allow author-only. If not supported, disable updates/deletes and rely on soft-delete via Edge Function later.

### `comment_reactions`
- **select**: participants only.
- **insert/delete**: participants only; user can add/remove only their own reactions (`user_id = auth.uid()`).

---

## Next version (v2): private sessions
Add session privacy as a v2 enhancement:
- Sessions can be **public** or **private** (set by creator).
- Private sessions are only visible to participants.
- Joining private sessions requires an invite/link flow (token-based recommended).
- RLS changes:
  - `sessions.select`: public readable by authed users; private readable by participants.
  - `session_members.insert` for private sessions: gated by a validated invite token.

---

## Business rules & validations
- `chapter_count` must be \(> 0\).
- A member’s progress `chapter` must be between \(0\) and `chapter_count`.
- When a `progress_updates` row is inserted, also update `session_members.last_progress_chapter` for that member (done in client in v1, or via trigger later).
- Comment body must be non-empty after trimming.
- Reaction `emoji` should be a short string; reject long inputs (e.g., > 16 chars) to prevent abuse.

---

## Realtime behavior (Supabase Realtime)
Subscribe per session to:
- `comments` inserts (and updates if edit is supported)
- `comment_reactions` inserts/deletes
- `progress_updates` inserts

Clients should merge realtime updates into local state and support pagination for comments (e.g., initial load last N, then load older).

---

## UX notes (v1)
### Progress bars
- Each participant row shows:
  - avatar + display name
  - progress bar: `last_progress_chapter / chapter_count`
  - label like “7 / 20 chapters”

### Discussion
- Flat chronological feed.
- Each comment shows:
  - author, timestamp, body
  - reaction bar with emoji counts
  - tap/click emoji picker to add reaction (adds a row in `comment_reactions`)

---

## Out of scope for v1 (explicit)
- Private sessions
- Notifications (any type)
- Search
- Host/member permissions (kicking, approving, editing session)
- Multiple books per session
- Pages/percent progress
- Threaded replies
- DMs / friends graph
- Reporting/moderation UI

---

## Acceptance criteria checklist (v1)
- Members can create public sessions with a book and chapter count.
- Members can list public sessions and their joined sessions (no search).
- Joining works for public sessions (one-tap join).
- Participants can submit chapter progress and see progress bars update.
- Participants can post comments and see a flat thread.
- Participants can react with multiple emoji; counts update; user can remove their own reaction.

