import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  userId: string | null
  ready: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) throw error
        setSession(data.session ?? null)
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setSession(null)
        setReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId: session?.user?.id ?? null,
      ready,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

