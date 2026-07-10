import { usePlayer } from '../context/PlayerContext'

function fmt(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m + ':' + String(s).padStart(2, '0')
}

export default function PlayerBar() {
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlay, playPrev, playNext, seek, setVolume,
  } = usePlayer()

  if (!currentSong) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="player-bar">
      {/* 进度条（顶部细条可拖拽） */}
      <div className="player-progress-track">
        <div className="player-progress-fill" style={{ width: progress + '%' }} />
        <input
          type="range"
          className="player-progress-input"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={e => seek(parseFloat(e.target.value))}
        />
      </div>

      <div className="player-bar-inner">
        {/* 左侧：歌曲信息 */}
        <div className="player-info">
          <div className="player-cover-sm">🎵</div>
          <div className="player-text">
            <p className="player-title">{currentSong.title}</p>
            <p className="player-artist">{currentSong.artist}</p>
          </div>
        </div>

        {/* 中间：播放控制 */}
        <div className="player-controls">
          <button onClick={playPrev} className="player-btn" title="上一首">
            ⏮
          </button>
          <button onClick={togglePlay} className="player-btn player-btn-main" title={isPlaying ? '暂停' : '播放'}>
            {isPlaying ? '⏸' : '▶️'}
          </button>
          <button onClick={playNext} className="player-btn" title="下一首">
            ⏭
          </button>
        </div>

        {/* 右侧：时间 + 音量 */}
        <div className="player-right">
          <span className="player-time">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
          <div className="player-volume">
            <span className="volume-icon">🔊</span>
            <input
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.02"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
