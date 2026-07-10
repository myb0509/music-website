import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Link } from 'react-router-dom'

export default function Playlists() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  // 创建歌单
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  function fetchPlaylists() {
    setLoading(true)
    api('/api/playlists')
      .then(res => res.json())
      .then(data => {
        setPlaylists(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlaylists()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')

    try {
      const res = await api('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }

      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      fetchPlaylists()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`确定要删除歌单「${name}」吗？`)) return

    try {
      await fetch('/api/playlists/' + id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      })
      fetchPlaylists()
    } catch {
      alert('删除失败')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 音乐网站</h1>
        <p className="subtitle">歌单广场</p>

        <nav className="nav-bar">
          <div className="user-area">
            <Link to="/" className="btn-link">🏠 首页</Link>
            <Link to="/upload" className="btn-link">📤 上传</Link>
            <span className="user-greeting">👤 {user?.username}</span>
          </div>
        </nav>
      </header>

      <main className="main">
        <section className="section">
          <div className="section-header">
            <h2>📋 全部歌单 ({playlists.length})</h2>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-create">
              {showCreate ? '取消' : '＋ 新建歌单'}
            </button>
          </div>

          {/* 创建歌单表单 */}
          {showCreate && (
            <form onSubmit={handleCreate} className="playlist-form">
              {error && <div className="auth-error">{error}</div>}
              <input
                type="text"
                placeholder="歌单名称"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                required
                autoFocus
                className="playlist-input"
              />
              <input
                type="text"
                placeholder="描述（可选）"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="playlist-input"
              />
              <button type="submit" disabled={creating} className="btn-primary btn-small">
                {creating ? '创建中...' : '创建'}
              </button>
            </form>
          )}

          {loading ? (
            <p className="loading">加载中...</p>
          ) : playlists.length > 0 ? (
            <div className="playlist-grid">
              {playlists.map(pl => (
                <div key={pl.id} className="playlist-card">
                  <Link to={'/playlist/' + pl.id} className="playlist-cover-link">
                    <div className="playlist-cover">
                      {pl.cover_url ? (
                        <img src={pl.cover_url} alt={pl.name} />
                      ) : (
                        <span className="playlist-icon">🎶</span>
                      )}
                    </div>
                  </Link>
                  <div className="playlist-info">
                    <Link to={'/playlist/' + pl.id} className="playlist-name">{pl.name}</Link>
                    {pl.description && <p className="playlist-desc">{pl.description}</p>}
                    <p className="playlist-meta">
                      {pl.song_count ?? 0} 首歌曲 · {pl.created_at?.slice(0, 10)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(pl.id, pl.name)}
                    className="btn-delete-sm"
                    title="删除歌单"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">还没有歌单，创建第一个吧！</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Powered by React + Express + SQLite</p>
      </footer>
    </div>
  )
}
