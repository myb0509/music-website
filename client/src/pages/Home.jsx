import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { api } from '../api'
import { Link } from 'react-router-dom'

export default function Home() {
  const { user, logout } = useAuth()
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer()
  const token = localStorage.getItem('token')
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  // 「添加到歌单」弹窗
  const [addSongId, setAddSongId] = useState(null)
  const [playlists, setPlaylists] = useState([])
  const [addingTo, setAddingTo] = useState(null)
  const [addMsg, setAddMsg] = useState(null)

  // 编辑状态
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [saving, setSaving] = useState(false)

  function fetchSongs() {
    api('/api/songs')
      .then(res => res.json())
      .then(data => {
        setSongs(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('获取歌曲失败:', err)
        setLoading(false)
      })
  }

  useEffect(() => { fetchSongs() }, [])

  function startEdit(song) {
    setEditingId(song.id)
    setEditTitle(song.title)
    setEditArtist(song.artist === '未知艺术家' ? '' : song.artist)
    setEditAlbum(song.album || '')
  }

  async function saveEdit(songId) {
    setSaving(true)
    try {
      const res = await api('/api/songs/' + songId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ title: editTitle.trim(), artist: editArtist.trim() || '未知艺术家', album: editAlbum.trim() }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchSongs()
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  // 打开「添加到歌单」
  async function openAddToPlaylist(songId) {
    setAddSongId(songId)
    setAddMsg(null)
    const res = await api('/api/playlists')
    setPlaylists(await res.json())
  }

  // 执行添加到歌单
  async function addToPlaylist(playlistId, playlistName) {
    setAddingTo(playlistId)
    setAddMsg(null)
    try {
      const res = await api('/api/playlists/' + playlistId + '/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ song_id: addSongId }),
      })
      const data = await res.json()
      if (res.ok) {
        setAddMsg({ type: 'success', text: `✅ 已添加到「${playlistName}」` })
      } else {
        setAddMsg({ type: 'error', text: data.error })
      }
    } catch {
      setAddMsg({ type: 'error', text: '操作失败' })
    } finally {
      setAddingTo(null)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 音乐网站</h1>
        <p className="subtitle">全栈 React + Express + SQLite</p>

        <nav className="nav-bar">
          {user ? (
            <div className="user-area">
              <Link to="/playlists" className="btn-link">📋 歌单</Link>
              <Link to="/upload" className="btn-link">📤 上传</Link>
              <span className="user-greeting">👤 {user.username}</span>
              <button onClick={logout} className="btn-logout">退出</button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn-link">登录</Link>
              <Link to="/register" className="btn-link btn-primary">注册</Link>
            </div>
          )}
        </nav>
      </header>

      <main className="main">
        <section className="section">
          <h2>🎵 歌曲列表</h2>
          {loading ? (
            <p className="loading">加载中...</p>
          ) : songs.length > 0 ? (
            <ul className="song-list">
              {songs.map((song, idx) => {
                const isCurrent = currentSong?.id === song.id
                const isEditing = editingId === song.id

                if (isEditing) {
                  return (
                    <li key={song.id} className="song-item song-editing">
                      <span className="song-index">✏️</span>
                      <div className="edit-inline">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="edit-input" placeholder="标题" autoFocus onClick={e => e.stopPropagation()} />
                        <input value={editArtist} onChange={e => setEditArtist(e.target.value)} className="edit-input" placeholder="艺术家" onClick={e => e.stopPropagation()} />
                        <input value={editAlbum} onChange={e => setEditAlbum(e.target.value)} className="edit-input" placeholder="专辑" onClick={e => e.stopPropagation()} />
                      </div>
                      <div className="edit-actions">
                        <button onClick={() => saveEdit(song.id)} disabled={saving} className="btn-primary btn-xs">{saving ? '...' : '💾'}</button>
                        <button onClick={() => setEditingId(null)} className="btn-link btn-xs">✕</button>
                      </div>
                    </li>
                  )
                }

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
                    {isCurrent ? (isPlaying ? '🔊' : '⏸') : idx + 1}
                  </span>
                  <div className="song-info">
                    <span className="song-title">{song.title}</span>
                    <span className="song-artist">— {song.artist}</span>
                    {song.album && <span className="song-album">· {song.album}</span>}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(song) }}
                    className="btn-edit"
                    title="编辑"
                  >✏️</button>
                  <button
                    onClick={e => { e.stopPropagation(); openAddToPlaylist(song.id) }}
                    className="btn-add-playlist"
                    title="添加到歌单"
                  >＋</button>
                </li>
                )
              })}
            </ul>
          ) : (
            <p className="empty">暂无歌曲，快去上传吧！</p>
          )}
        </section>

        {/* 添加到歌单弹窗 */}
        {addSongId && (
          <div className="modal-overlay" onClick={() => setAddSongId(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <h3>添加到歌单</h3>
              {addMsg && (
                <div className={'upload-msg ' + (addMsg.type === 'success' ? 'msg-success' : 'msg-error')}>
                  {addMsg.text}
                </div>
              )}
              {playlists.length > 0 ? (
                <ul className="playlist-select">
                  {playlists.map(pl => (
                    <li key={pl.id} className="playlist-select-item">
                      <span>
                        <span className="playlist-select-name">{pl.name}</span>
                        <span className="playlist-select-count">({pl.song_count} 首)</span>
                      </span>
                      <button
                        onClick={() => addToPlaylist(pl.id, pl.name)}
                        disabled={addingTo === pl.id}
                        className="btn-primary btn-xs"
                      >
                        {addingTo === pl.id ? '...' : '＋'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty">
                  还没有歌单，
                  <Link to="/playlists" onClick={() => setAddSongId(null)}>去创建</Link>
                </p>
              )}
              <button onClick={() => setAddSongId(null)} className="btn-logout modal-close">关闭</button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Powered by React + Express + SQLite</p>
      </footer>
    </div>
  )
}
