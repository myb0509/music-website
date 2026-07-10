import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { api, API_BASE } from '../api'
import { Link } from 'react-router-dom'

export default function Upload() {
  const { user } = useAuth()
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer()
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text }
  const [mySongs, setMySongs] = useState([])
  const [loadingSongs, setLoadingSongs] = useState(true)

  // 编辑状态
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [saving, setSaving] = useState(false)

  // 自定义元数据覆盖
  const [customTitle, setCustomTitle] = useState('')
  const [customArtist, setCustomArtist] = useState('')
  const [customAlbum, setCustomAlbum] = useState('')

  // 加载我已上传的歌曲
  function fetchMySongs() {
    const token = localStorage.getItem('token')
    api('/api/my-songs', { headers: { Authorization: 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => {
        setMySongs(data)
        setLoadingSongs(false)
      })
      .catch(() => setLoadingSongs(false))
  }

  useEffect(() => {
    fetchMySongs()
  }, [])

  // 开始编辑
  function startEdit(song) {
    setEditingId(song.id)
    setEditTitle(song.title)
    setEditArtist(song.artist === '未知艺术家' ? '' : song.artist)
    setEditAlbum(song.album || '')
  }

  // 取消编辑
  function cancelEdit() {
    setEditingId(null)
  }

  // 保存编辑
  async function saveEdit(songId) {
    setSaving(true)
    const token = localStorage.getItem('token')
    try {
      const res = await api('/api/songs/' + songId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          artist: editArtist.trim() || '未知艺术家',
          album: editAlbum.trim(),
        }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchMySongs()
      }
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (f) {
      setFile(f)
      // 用文件名预填标题
      const name = f.name.replace(/\.[^.]+$/, '')
      if (!customTitle) setCustomTitle(name)
    }
  }

  function handleUpload() {
    if (!file) {
      setMessage({ type: 'error', text: '请先选择音频文件' })
      return
    }

    setUploading(true)
    setProgress(0)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)
    if (customTitle) formData.append('title', customTitle)
    if (customArtist) formData.append('artist', customArtist)
    if (customAlbum) formData.append('album', customAlbum)

    const token = localStorage.getItem('token')

    // 用 XMLHttpRequest 才能监听上传进度
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      setUploading(false)
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText)
        setMessage({ type: 'success', text: `✅ "${data.song.title}" 上传成功！` })
        // 重置表单
        setFile(null)
        setCustomTitle('')
        setCustomArtist('')
        setCustomAlbum('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        // 刷新列表
        fetchMySongs()
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          setMessage({ type: 'error', text: '❌ ' + (err.error || '上传失败') })
        } catch {
          setMessage({ type: 'error', text: '❌ 上传失败，请重试' })
        }
      }
    })

    xhr.addEventListener('error', () => {
      setUploading(false)
      setMessage({ type: 'error', text: '❌ 网络错误，上传失败' })
    })

    xhr.open('POST', API_BASE + '/api/upload')
    xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    xhr.send(formData)
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 音乐网站</h1>
        <p className="subtitle">上传你的音乐</p>

        <nav className="nav-bar">
          <div className="user-area">
            <Link to="/" className="btn-link">🏠 首页</Link>
            <span className="user-greeting">👤 {user?.username}</span>
          </div>
        </nav>
      </header>

      <main className="main">
        {/* 上传区域 */}
        <section className="section">
          <h2>📤 上传音乐</h2>
          <div className="upload-card">
            <div className="upload-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="upload-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="upload-label">
                {file ? (
                  <span className="file-chosen">📁 {file.name} <small>({formatSize(file.size)})</small></span>
                ) : (
                  <span className="file-placeholder">
                    <span className="upload-icon">🎶</span>
                    <span>点击选择音频文件</span>
                    <small>支持 MP3 / WAV / FLAC / AAC / OGG，最大 30MB</small>
                  </span>
                )}
              </label>
            </div>

            {/* 自定义元数据（可选） */}
            <div className="upload-meta">
              <label>
                <span>标题</span>
                <input
                  type="text"
                  placeholder="自动从文件提取，也可手动修改"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                />
              </label>
              <label>
                <span>艺术家</span>
                <input
                  type="text"
                  placeholder="自动从文件提取"
                  value={customArtist}
                  onChange={e => setCustomArtist(e.target.value)}
                />
              </label>
              <label>
                <span>专辑</span>
                <input
                  type="text"
                  placeholder="自动从文件提取"
                  value={customAlbum}
                  onChange={e => setCustomAlbum(e.target.value)}
                />
              </label>
            </div>

            {/* 进度条 */}
            {uploading && (
              <div className="progress-bar-wrap">
                <div className="progress-bar" style={{ width: progress + '%' }}>
                  <span className="progress-text">{progress}%</span>
                </div>
              </div>
            )}

            {/* 消息 */}
            {message && (
              <div className={'upload-msg ' + (message.type === 'success' ? 'msg-success' : 'msg-error')}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="upload-btn"
            >
              {uploading ? '上传中...' : '🚀 开始上传'}
            </button>
          </div>
        </section>

        {/* 已上传列表 */}
        <section className="section">
          <h2>📋 我上传的歌曲 ({mySongs.length})</h2>
          {loadingSongs ? (
            <p className="loading">加载中...</p>
          ) : mySongs.length > 0 ? (
            <ul className="song-list">
              {mySongs.map((song, idx) => {
                const isCurrent = currentSong?.id === song.id
                const isEditing = editingId === song.id

                if (isEditing) {
                  return (
                    <li key={song.id} className="song-item song-editing">
                      <span className="song-index">✏️</span>
                      <div className="edit-inline">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="edit-input"
                          placeholder="歌曲标题"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <input
                          value={editArtist}
                          onChange={e => setEditArtist(e.target.value)}
                          className="edit-input"
                          placeholder="艺术家"
                          onClick={e => e.stopPropagation()}
                        />
                        <input
                          value={editAlbum}
                          onChange={e => setEditAlbum(e.target.value)}
                          className="edit-input"
                          placeholder="专辑"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="edit-actions">
                        <button onClick={saveEdit} disabled={saving} className="btn-primary btn-xs">
                          {saving ? '...' : '💾'}
                        </button>
                        <button onClick={cancelEdit} className="btn-link btn-xs">✕</button>
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
                      playSong(song, mySongs)
                    }
                  }}
                >
                  <span className="song-index">
                    {isCurrent ? (isPlaying ? '🔊' : '⏸') : '🎵'}
                  </span>
                  <div className="song-info">
                    <span className="song-title">{song.title}</span>
                    <span className="song-artist">— {song.artist}</span>
                    {song.album && <span className="song-album">· {song.album}</span>}
                  </div>
                  <span className="song-meta">
                    {formatDuration(song.duration)} · {formatSize(song.file_size)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); startEdit(song) }}
                    className="btn-edit"
                    title="编辑"
                  >
                    ✏️
                  </button>
                </li>
                )
              })}
            </ul>
          ) : (
            <p className="empty">还没有上传歌曲，选一首试试吧！</p>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>Powered by React + Express + SQLite</p>
      </footer>
    </div>
  )
}
