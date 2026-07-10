import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PlayerProvider } from './context/PlayerContext'
import PlayerBar from './components/PlayerBar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Upload from './pages/Upload'
import Playlists from './pages/Playlists'
import PlaylistDetail from './pages/PlaylistDetail'
import './App.css'

/** 未登录时把 /login 和 /register 以外的路径重定向到登录页 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-page"><p className="loading">加载中...</p></div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

/** 已登录时访问登录/注册页 → 重定向到首页 */
function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="auth-page"><p className="loading">加载中...</p></div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
            <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <PlayerBar />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
