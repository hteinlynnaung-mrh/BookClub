import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Button, Card, Container, Input, Label, Muted } from '../components/ui'
import { useAuth } from '../auth/AuthProvider'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

export function AuthPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { ready, userId } = useAuth()

  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const title = useMemo(
    () => (mode === 'sign_in' ? t('auth.welcome_back') : t('auth.create_account')),
    [mode, t],
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    if (userId) nav('/', { replace: true })
  }, [ready, userId, nav])

  return (
    <div className="min-h-dvh bg-gradient-to-b from-zinc-50 to-white">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <Container>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center py-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
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
            <div className="text-2xl font-semibold tracking-tight text-zinc-900">
              {title}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {t('auth.subtitle')}
            </div>
          </div>

          <Card className="p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth.email')}</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder={t('auth.email_placeholder')}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('auth.password')}</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  autoComplete={
                    mode === 'sign_in' ? 'current-password' : 'new-password'
                  }
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <Button
                className="w-full"
                disabled={!email || password.length < 6 || busy}
                onClick={async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    if (mode === 'sign_in') {
                      const { error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                      })
                      if (error) throw error
                    } else {
                      const { error } = await supabase.auth.signUp({
                        email,
                        password,
                      })
                      if (error) throw error
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : t('common.error'))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {mode === 'sign_in' ? t('auth.sign_in') : t('auth.sign_up')}
              </Button>

              <div className="text-center">
                <button
                  className="text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
                  onClick={() =>
                    setMode((m) => (m === 'sign_in' ? 'sign_up' : 'sign_in'))
                  }
                >
                  {mode === 'sign_in'
                    ? t('auth.need_account')
                    : t('auth.have_account')}
                </button>
              </div>

              <Muted>
                {t('auth.password_hint')}
              </Muted>
            </div>
          </Card>
        </div>
      </Container>
    </div>
  )
}

