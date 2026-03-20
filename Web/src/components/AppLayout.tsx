import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, Container } from './ui'
import { supabase } from '../lib/supabase'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppLayout() {
  const { t } = useTranslation()
  const { userId, signOut } = useAuth()
  const nav = useNavigate()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single()
      
      setAvatarUrl(data?.avatar_url ?? null)
    }

    void loadProfile()

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setAvatarUrl(payload.new.avatar_url ?? null)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/70 backdrop-blur">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="group flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-white shadow-sm transition-transform group-hover:scale-105">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M8 7h6" />
                  <path d="M8 11h8" />
                </svg>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-zinc-900">
                  Htein’s Library
                </div>
                <div className="text-xs text-zinc-500">Read together</div>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link to="/profile" className="flex items-center gap-2 group">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 transition group-hover:border-zinc-300">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-400 uppercase">
                      User
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 hidden sm:inline">{t('common.profile')}</span>
              </Link>
              <Button
                variant="ghost"
                className="text-zinc-500 hover:text-red-600"
                onClick={async () => {
                  await signOut()
                  nav('/login')
                }}
              >
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <main className="py-6">
        <Container>
          <Outlet />
        </Container>
      </main>
    </div>
  )
}

