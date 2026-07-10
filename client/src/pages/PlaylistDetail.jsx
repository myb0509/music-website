import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { api } from '../api'

export default function PlaylistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer()

  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  // 编辑状态
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // 添加歌曲对话框
  const [showAddSong, setShowAddSong] = useState(false)
  const [allSongs, setAllSongs] = useState([])
  const [addingId, setAddingId] = useState(null)

  function fetchPlaylist() {
    api('/api/playlists/' + id)
      .then(res => res.json())
      .then(data => {
        setPlaylist(data)
        setSongs(data.songs || [])
        setLoading(false)
        // 关闭编辑状态
        setEditing(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchPlaylist()
  }, [id])

  // 从歌单移除歌曲
  async function removeSong(songId) {
    if (!window.confirm('确定从歌单中移除这首歌？')) return

    await api('/api/playlists/' + id + '/songs/' + songId, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })

    fetchPlaylist()
  }

  // 开始编辑
  function startEdit() {
    setEditName(playlist.name)
    setEditDesc(playlist.description || '')
    setEditing(true)
  }

  // 保存编辑
  async function handleSaveEdit() {
    setSaving(true)
    await api('/api/playlists/' + id, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() }),
    })
    setSaving(false)
    fetchPlaylist()
  }

  // 打开添加歌曲对话框
  async function openAddSong() {
    setShowAddSong(true)
    const res = await api('/api/songs')
    const data = await res.json()
    // 过滤已在歌单中的歌曲
    const existingIds = new Set(songs.map(s => s.id))
    setAllSongs(data.filter(s => !existingIds.has(s.id)))
  }

  // 添加歌曲到歌单
  async function addToPlaylist(songId) {
    setAddingId(songId)
    await api('/api/playlists/' + id + '/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ song_id: songId }),
    })
    setAddingId(null)
    fetchPlaylist()
    // 从待选列表中移除
    setAllSongs(prev => prev.filter(s => s.id !== songId))
  }

  // 删除整个歌单
  async function deletePlaylist() {
    if (!window.confirm('确定要删除整个歌单？此操作不可恢复！')) return
    await api('/api/playlists/' + id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    })
    navigate('/playlists')
  }

  if (loading) {
    return (
      <div className="app">
        <main className="main"><p className="loading">加载中...</p></main>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="app">
        <main className="main"><p className="empty">歌单不存在</p></main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 音乐网站</h1>

        <nav className="nav-bar">
          <div className="user-area">
            <Link to="/" className="btn-link">🏠 首页</Link>
            <Link to="/playlists" className="btn-link">📋 歌单</Link>
            <Link to="/upload" className="btn-link">📤 上传</Link>
            <span className="user-greeting">👤 {user?.username}</span>
          </div>
        </nav>
      </header>

      <main className="main">
        {/* 歌单信息头 */}
        <section className="playlist-hero">
          <div className="playlist-hero-cover">
            {playlist.cover_url ? (
              <img src={playlist.cover_url} alt={playlist.name} />
            ) : (
              <span className="playlist-hero-icon">🎶</span>
            )}
          </div>

          {editing ? (
            <div className="playlist-edit-form">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="playlist-input"
                placeholder="歌单名称"
              />
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="playlist-input"
                placeholder="描述"
              />
              <div className="edit-actions">
                <button onClick={handleSaveEdit} disabled={saving} className="btn-primary btn-small">
                  {saving ? '保存中...' : '💾 保存'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-link btn-small">取消</button>
              </div>
            </div>
          ) : (
            <div className="playlist-hero-info">
              <h2>{playlist.name}</h2>
              {playlist.description && <p className="playlist-desc">{playlist.description}</p>}
              <p className="playlist-meta">
                {songs.length} 首歌曲 · 创建于 {playlist.created_at?.slice(0, 10)}
              </p>
              <div className="hero-actions">
                <button onClick={startEdit} className="btn-link btn-small">✏️ 编辑</button>
                <button onClick={openAddSong} className="btn-primary btn-small">＋ 添加歌曲</button>
                <button onClick={deletePlaylist} className="btn-danger btn-small">🗑 删除歌单</button>
              </div>
            </div>
          )}
        </section>

        {/* 添加歌曲对话框 */}
        {showAddSong && (
          <section className="section">
            <div className="section-header">
              <h3>➕ 添加歌曲到歌单</h3>
              <button onClick={() => setShowAddSong(false)} className="btn-logout">关闭</button>
            </div>
            {allSongs.length > 0 ? (
              <ul className="song-list">
                {allSongs.map(s => (
                  <li key={s.id} className="song-item">
                    <div className="song-info">
                      <span className="song-title">{s.title}</span>
                      <span className="song-artist">— {s.artist}</span>
                    </div>
                    <button
                      onClick={() => addToPlaylist(s.id)}
                      disabled={addingId === s.id}
                      className="btn-primary btn-xs"
                    >
                      {addingId === s.id ? '...' : '＋'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">所有歌曲已在此歌单中</p>
            )}
          </section>
        )}

        {/* 歌曲列表 */}
        <section className="section">
          <h2>🎵 歌曲列表 ({songs.length})</h2>
          {songs.length > 0 ? (
            <ul className="song-list">
              {songs.map((song, index) => {
                const isCurrent = currentSong?.id === song.id
                return (
                <li
                  key={song.id}
                  className={'song-item song-clickable' + (isCurrent ? ' song-active' : '')}
                  onClick={() => {
                    if (isCurrent) {
                      togglePlay()
                    } else {
                      playSong(song, songs)
                    }
                  }}
                >
                  <span className="song-index">
                    {isCurrent ? (isPlaying ? '🔊' : '⏸') : index + 1}
                  </span>
                  <div className="song-info">
                    <span className="song-title">{song.title}</span>
                    <span className="song-artist">— {song.artist}</span>
                    {song.album && <span className="song-album">· {song.album}</span>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSong(song.id) }}
                    className="btn-remove"
                    title="移除"
                  >
                    ✕
                  </button>
                </li>
                )
              })}
            </ul>
          ) : (
            <p className="empty">歌单还是空的，添加一些歌曲吧！</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Powered by React + Express + SQLite</p>
      </footer>
    </div>
  )
}
