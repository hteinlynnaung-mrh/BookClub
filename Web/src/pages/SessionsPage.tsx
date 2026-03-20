import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthProvider'
import { Card, Button, Input, Label, Muted } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Session, SessionMember } from '../types'

export function SessionsPage() {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [memberships, setMemberships] = useState<SessionMember[]>([])

  const joinedSessionIds = useMemo(() => {
    const s = new Set<string>()
    for (const m of memberships) s.add(m.session_id)
    return s
  }, [memberships])

  const [bookTitle, setBookTitle] = useState('')
  const [bookAuthor, setBookAuthor] = useState('')
  const [chapterCount, setChapterCount] = useState('20')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  async function refresh() {
    setError(null)
    const [{ data: sessionsData, error: sErr }, { data: memData, error: mErr }] =
      await Promise.all([
        supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('session_members')
          .select('*')
          .eq('user_id', userId!)
          .order('joined_at', { ascending: false }),
      ])
    if (sErr) setError(sErr.message)
    if (mErr) setError(mErr.message)
    setSessions((sessionsData ?? []) as Session[])
    setMemberships((memData ?? []) as SessionMember[])
  }

  useEffect(() => {
    if (!userId) return
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const mySessions = useMemo(() => {
    const mine = sessions.filter((s) => joinedSessionIds.has(s.id))
    return mine
  }, [sessions, joinedSessionIds])

  const discoverSessions = useMemo(() => {
    return sessions
  }, [sessions])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xl font-semibold tracking-tight text-zinc-900">
              {t('sessions.title')}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {t('sessions.subtitle')}
            </div>
          </div>
          <Button variant="ghost" onClick={() => void refresh()} disabled={busy}>
            {t('sessions.refresh')}
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">{t('sessions.my_books')}</div>
            <Muted>{mySessions.length}</Muted>
          </div>
          {mySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              {t('sessions.no_books')}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {mySessions.map((s) => (
                <Link
                  key={s.id}
                  to={`/sessions/${s.id}`}
                  className="rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm"
                >
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.book_title}
                  </div>
                  <div className="text-xs text-zinc-500">{s.book_author}</div>
                  <div className="mt-2 text-xs text-zinc-500">
                    {t('sessions.chapters_count', { count: s.chapter_count })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">{t('sessions.discover')}</div>
            <Muted>{discoverSessions.length}</Muted>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {discoverSessions.map((s) => {
              const joined = joinedSessionIds.has(s.id)
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">
                        {s.book_title}
                      </div>
                      <div className="text-xs text-zinc-500">{s.book_author}</div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {t('sessions.chapters_count', { count: s.chapter_count })}
                      </div>
                    </div>
                    {joined ? (
                      <Link to={`/sessions/${s.id}`}>
                        <Button variant="ghost">{t('sessions.open')}</Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={async () => {
                          setBusy(true)
                          setError(null)
                          try {
                            const { error } = await supabase
                              .from('session_members')
                              .insert({ session_id: s.id, user_id: userId })
                            if (error) throw error
                            await refresh()
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : 'Join failed',
                            )
                          } finally {
                            setBusy(false)
                          }
                        }}
                        disabled={busy}
                      >
                        {t('sessions.join')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="h-fit p-4">
        <div className="text-sm font-semibold text-zinc-900">{t('sessions.create_title')}</div>
        <div className="mt-1 text-sm text-zinc-500">
          {t('sessions.create_subtitle')}
        </div>

        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>{t('sessions.book_title')}</Label>
            <Input
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder={t('sessions.title_placeholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('sessions.author')}</Label>
            <Input
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              placeholder={t('sessions.author_placeholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('sessions.chapter_count')}</Label>
            <Input
              value={chapterCount}
              onChange={(e) => setChapterCount(e.target.value)}
              inputMode="numeric"
              placeholder={t('sessions.chapter_placeholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('sessions.pdf_file')}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {pdfFile && (
                <Button 
                  variant="ghost" 
                  onClick={() => setPdfFile(null)}
                  className="h-9 px-2 text-zinc-500 hover:text-red-500"
                >
                  ✕
                </Button>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={
              busy ||
              !userId ||
              !bookTitle.trim() ||
              !bookAuthor.trim() ||
              !Number.isFinite(Number(chapterCount)) ||
              Number(chapterCount) <= 0
            }
            onClick={async () => {
              if (!userId) return
              setBusy(true)
              setError(null)
              try {
                let bookPdfUrl: string | null = null
                if (pdfFile) {
                  const fileExt = pdfFile.name.split('.').pop()
                  const fileName = `${userId}/${Math.random()}.${fileExt}`
                  const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('books')
                    .upload(fileName, pdfFile)
                  
                  if (uploadError) throw uploadError
                  
                  const { data: { publicUrl } } = supabase.storage
                    .from('books')
                    .getPublicUrl(uploadData.path)
                  
                  bookPdfUrl = publicUrl
                }

                const { data, error } = await supabase
                  .from('sessions')
                  .insert({
                    creator_id: userId,
                    book_title: bookTitle.trim(),
                    book_author: bookAuthor.trim(),
                    chapter_count: Number(chapterCount),
                    book_pdf_url: bookPdfUrl,
                  })
                  .select('*')
                  .single()
                if (error) throw error
                const created = data as Session
                const { error: jErr } = await supabase
                  .from('session_members')
                  .insert({ session_id: created.id, user_id: userId })
                if (jErr) throw jErr
                setBookTitle('')
                setBookAuthor('')
                setChapterCount('20')
                setPdfFile(null)
                await refresh()
              } catch (e) {
                console.error('Create session error:', e)
                setError(
                  e instanceof Error 
                    ? e.message 
                    : t('sessions.create_button') + ' failed'
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('sessions.create_button')}
          </Button>
        </div>
      </Card>
    </div>
  )
}

