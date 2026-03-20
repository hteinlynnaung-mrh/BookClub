import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { SessionsPage } from './pages/SessionsPage'
import { SessionPage } from './pages/SessionPage'
import { ProfilePage } from './pages/ProfilePage'

function Protected({ children }: { children: React.ReactNode }) {
  const { ready, userId } = useAuth()
  if (!ready) return null
  if (!userId) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route index element={<SessionsPage />} />
        <Route path="sessions/:sessionId" element={<SessionPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
