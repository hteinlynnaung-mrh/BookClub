import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, Card, Input, Label, Muted, Textarea } from '../components/ui'
import { supabase } from '../lib/supabase'
import { formatRelativeTime } from '../lib/utils'
import type {
  Comment,
  CommentReaction,
  Session,
  SessionMember,
} from '../types'

type MemberRow = SessionMember & {
  profiles: { display_name: string; avatar_url: string | null } | null
}

type CommentRow = Comment & {
  profiles: { display_name: string; avatar_url: string | null } | null
}

const QUICK_EMOJI = ['👍', '❤️', '😂', '🎉', '🤔', '🔥', '👏', '😮']

export function SessionPage() {
  const { t } = useTranslation()
  const { sessionId } = useParams()
  const nav = useNavigate()
  const { userId } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [session, setSession] = useState<Session | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])

  const [comments, setComments] = useState<CommentRow[]>([])
  const [reactions, setReactions] = useState<CommentReaction[]>([])

  const [progressChapter, setProgressChapter] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [commentBody, setCommentBody] = useState('')

  const joined = useMemo(() => {
    return members.some((m) => m.user_id === userId)
  }, [members, userId])

  const commentEndRef = useRef<HTMLDivElement | null>(null)

  const reactionsByComment = useMemo(() => {
    const map = new Map<string, Map<string, { count: number; mine: boolean }>>()
    for (const r of reactions) {
      if (!map.has(r.comment_id)) map.set(r.comment_id, new Map())
      const emo = map.get(r.comment_id)!
      const existing = emo.get(r.emoji) ?? { count: 0, mine: false }
      emo.set(r.emoji, {
        count: existing.count + 1,
        mine: existing.mine || r.user_id === userId,
      })
    }
    return map
  }, [reactions, userId])

  async function refreshAll() {
    if (!sessionId) return
    setError(null)
    setLoading(true)

    try {
      const [
        { data: sData, error: sErr },
        { data: mData, error: mErr },
        { data: cData, error: cErr },
        { data: rData, error: rErr },
      ] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', sessionId).single(),
        supabase
          .from('session_members')
          .select(
            'session_id,user_id,joined_at,last_progress_chapter,profiles(display_name,avatar_url)',
          )
          .eq('session_id', sessionId)
          .order('joined_at', { ascending: true }),
        supabase
          .from('comments')
          .select('*,profiles(display_name,avatar_url)')
          .eq('session_id', sessionId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(200),
        supabase.from('comment_reactions').select('*').eq('session_id', sessionId),
      ])

      if (sErr) throw sErr
      if (mErr) throw mErr
      if (cErr) throw cErr
      if (rErr) throw rErr

      setSession((sData ?? null) as Session | null)
      setMembers(((mData ?? []) as unknown[]) as MemberRow[])
      setComments(((cData ?? []) as unknown[]) as CommentRow[])
      setReactions((rData ?? []) as CommentReaction[])
    } catch (e: unknown) {
      console.error('Refresh error:', e)
      setError(e instanceof Error ? e.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `session_id=eq.${sessionId}` },
        () => {
          void refreshAll()
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          void refreshAll()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_members', filter: `session_id=eq.${sessionId}` },
        () => {
          void refreshAll()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (!sessionId) return null

  if (loading && !session) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-zinc-200" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← {t('session_detail.back')}
          </Link>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {session?.book_title ?? t('session_detail.book')}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {session?.book_author ?? ''}{' '}
            {session ? `• ${t('sessions.chapters_count', { count: session.chapter_count })}` : null}
          </div>
          {session?.book_pdf_url && (
            <div className="mt-3">
              <a 
                href={session.book_pdf_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('session_detail.view_pdf')}
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session?.creator_id === userId && (
            <Button
              variant="ghost"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(t('session_detail.delete_confirm'))) return
                setBusy(true)
                setError(null)
                try {
                  const { error, count } = await supabase
                    .from('sessions')
                    .delete({ count: 'exact' })
                    .eq('id', sessionId)
                  
                  if (error) throw error
                  if (count === 0) {
                    throw new Error('Deletion failed.')
                  }
                  
                  nav('/', { replace: true })
                } catch (e: unknown) {
                  console.error('Delete error:', e)
                  setError(e instanceof Error ? e.message : 'Delete failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t('session_detail.delete_title')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => void refreshAll()} disabled={busy}>
            {t('sessions.refresh')}
          </Button>
          {!joined ? (
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError(null)
                try {
                  const { error } = await supabase
                    .from('session_members')
                    .insert({ session_id: sessionId, user_id: userId })
                  if (error) throw error
                  await refreshAll()
                } catch (e: unknown) {
                  console.error('Join error:', e)
                  setError(e instanceof Error ? e.message : 'Join failed')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {t('sessions.join')}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">{t('session_detail.discussion')}</div>
              <Muted>{comments.length}</Muted>
            </div>

            {!joined ? (
              <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                {t('session_detail.join_to_comment')}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder={t('session_detail.share_placeholder')}
                  />
                  <div className="flex justify-end">
                    <Button
                      disabled={busy || !commentBody.trim()}
                      onClick={async () => {
                        setBusy(true)
                        setError(null)
                        try {
                          const { error } = await supabase.from('comments').insert({
                            session_id: sessionId,
                            user_id: userId,
                            body: commentBody.trim(),
                          })
                          if (error) throw error
                          setCommentBody('')
                          await refreshAll()
                          commentEndRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'end',
                          })
                        } catch (e: unknown) {
                          console.error('Comment error:', e)
                          setError(e instanceof Error ? e.message : 'Comment failed')
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      {t('session_detail.post_button')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {comments.map((c) => {
                    const emo = reactionsByComment.get(c.id) ?? new Map<string, { count: number; mine: boolean }>()
                    const entries = Array.from(emo.entries()).sort(
                      (a, b) => b[1].count - a[1].count,
                    )
                    const author = c.profiles?.display_name ?? t('session_detail.member_suffix')
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                              {c.profiles?.avatar_url ? (
                                <img
                                  src={c.profiles.avatar_url}
                                  alt={author}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-400">
                                  {author[0].toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-zinc-900">
                                  {author}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatRelativeTime(c.created_at)}
                                </div>
                              </div>
                              <div className="mt-1 text-sm text-zinc-900">
                                {c.body}
                              </div>
                              <div className="mt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                                {c.user_id === userId ? t('session_detail.you') : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1">
                            {entries.slice(0, 6).map(([emoji, meta]) => (
                              <button
                                key={emoji}
                                className={[
                                  'rounded-lg border px-2 py-1 text-xs transition',
                                  meta.mine
                                    ? 'border-zinc-900 bg-zinc-900 text-white'
                                    : 'border-zinc-200 bg-white hover:border-zinc-300',
                                ].join(' ')}
                                onClick={async () => {
                                  setBusy(true)
                                  setError(null)
                                  try {
                                    if (meta.mine) {
                                      const { error } = await supabase
                                        .from('comment_reactions')
                                        .delete()
                                        .eq('comment_id', c.id)
                                        .eq('user_id', userId)
                                        .eq('emoji', emoji)
                                      if (error) throw error
                                    } else {
                                      const { error } = await supabase
                                        .from('comment_reactions')
                                        .insert({
                                          comment_id: c.id,
                                          session_id: sessionId,
                                          user_id: userId,
                                          emoji,
                                        })
                                      if (error) throw error
                                    }
                                    await refreshAll()
                                  } catch (e: any) {
                                    console.error('Reaction error:', e)
                                    setError(e.message || 'Reaction failed')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                                title={meta.mine ? t('session_detail.remove_reaction') : t('session_detail.react')}
                              >
                                {emoji} {meta.count}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          {QUICK_EMOJI.map((emoji) => {
                            const meta = emo.get(emoji) ?? { count: 0, mine: false }
                            return (
                              <button
                                key={emoji}
                                className={[
                                  'rounded-lg border px-2 py-1 text-xs transition',
                                  meta.mine
                                    ? 'border-zinc-900 bg-zinc-900 text-white'
                                    : 'border-zinc-200 bg-white hover:border-zinc-300',
                                ].join(' ')}
                                onClick={async () => {
                                  setBusy(true)
                                  setError(null)
                                  try {
                                    if (meta.mine) {
                                      const { error } = await supabase
                                        .from('comment_reactions')
                                        .delete()
                                        .eq('comment_id', c.id)
                                        .eq('user_id', userId)
                                        .eq('emoji', emoji)
                                      if (error) throw error
                                    } else {
                                      const { error } = await supabase
                                        .from('comment_reactions')
                                        .insert({
                                          comment_id: c.id,
                                          session_id: sessionId,
                                          user_id: userId,
                                          emoji,
                                        })
                                      if (error) throw error
                                    }
                                    await refreshAll()
                                  } catch (e: any) {
                                    console.error('Reaction error:', e)
                                    setError(e.message || 'Reaction failed')
                                  } finally {
                                    setBusy(false)
                                  }
                                }}
                              >
                                {emoji}
                                {meta.count ? ` ${meta.count}` : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={commentEndRef} />
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">{t('session_detail.progress')}</div>
              <Muted>{t('session_detail.members_count', { count: members.length })}</Muted>
            </div>

            <div className="mt-4 space-y-3">
              {members.map((m) => {
                const total = session?.chapter_count ?? 1
                const val = Math.max(0, Math.min(total, m.last_progress_chapter ?? 0))
                const pct = Math.round((val / total) * 100)
                const name = m.profiles?.display_name ?? t('session_detail.member_suffix')
                return (
                  <div key={m.user_id} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
                          {m.profiles?.avatar_url ? (
                            <img
                              src={m.profiles.avatar_url}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-400">
                              {name[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-900">
                            {name}
                            {m.user_id === userId ? (
                              <span className="ml-2 text-xs font-medium text-zinc-500">
                                {t('session_detail.you_suffix')}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {val} / {total} {t('sessions.chapters_count', { count: total }).split(' ').pop()} • {pct}%
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-medium text-zinc-400">
                        {formatRelativeTime(m.joined_at)}
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-zinc-100">
                      <div
                         className="h-2 rounded-full bg-zinc-900"
                         style={{ width: `${pct}%` }}
                       />
                    </div>
                  </div>
                )
              })}
            </div>

            {!joined ? (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                {t('session_detail.join_to_progress')}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('session_detail.chapter_label')}</Label>
                    <Input
                      value={progressChapter}
                      onChange={(e) => setProgressChapter(e.target.value)}
                      inputMode="numeric"
                      placeholder={`0 – ${session?.chapter_count ?? ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('session_detail.note_label')}</Label>
                    <Input
                      value={progressNote}
                      onChange={(e) => setProgressNote(e.target.value)}
                      placeholder={t('session_detail.note_placeholder')}
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={
                    busy ||
                    !session ||
                    !Number.isFinite(Number(progressChapter)) ||
                    Number(progressChapter) < 0 ||
                    Number(progressChapter) > session.chapter_count
                  }
                  onClick={async () => {
                    if (!session) return
                    const chapter = Number(progressChapter)
                    setBusy(true)
                    setError(null)
                    try {
                      const { error: pErr } = await supabase
                        .from('progress_updates')
                        .insert({
                          session_id: sessionId,
                          user_id: userId,
                          chapter,
                          note: progressNote.trim() ? progressNote.trim() : null,
                        })
                      if (pErr) throw pErr
                      const { error: mErr } = await supabase
                        .from('session_members')
                        .update({ last_progress_chapter: chapter })
                        .eq('session_id', sessionId)
                        .eq('user_id', userId)
                      if (mErr) throw mErr
                      setProgressChapter('')
                      setProgressNote('')
                      await refreshAll()
                    } catch (e: unknown) {
                      console.error('Progress update error:', e)
                      setError(e instanceof Error ? e.message : 'Progress update failed')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  {t('session_detail.update_progress')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
