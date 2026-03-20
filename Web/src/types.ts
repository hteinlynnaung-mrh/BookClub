export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Session = {
  id: string
  creator_id: string
  book_title: string
  book_author: string
  chapter_count: number
  book_pdf_url?: string | null
  created_at: string
  updated_at: string
}

export type SessionMember = {
  session_id: string
  user_id: string
  joined_at: string
  last_progress_chapter: number | null
}

export type ProgressUpdate = {
  id: string
  session_id: string
  user_id: string
  chapter: number
  note: string | null
  created_at: string
}

export type Comment = {
  id: string
  session_id: string
  user_id: string
  body: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

export type CommentReaction = {
  id: string
  comment_id: string
  session_id: string
  user_id: string
  emoji: string
  created_at: string
}

