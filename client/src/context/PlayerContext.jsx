import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { assetUrl } from '../api'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio())

  // 播放队列 + 索引
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)

  // 播放状态
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    const v = localStorage.getItem('player-volume')
    return v ? parseFloat(v) : 0.7
  })

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null

  // -------- 音频事件绑定 --------
  useEffect(() => {
    const audio = audioRef.current

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => playNext()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [queue, currentIndex]) // 重新绑定以确保 ended 事件拿到最新队列

  // 音量同步
  useEffect(() => {
    audioRef.current.volume = volume
  }, [volume])

  // 切歌时加载新 src
  useEffect(() => {
    if (currentSong?.file_url) {
      audioRef.current.src = assetUrl(currentSong.file_url)
      audioRef.current.play().catch(() => {})
    }
  }, [currentSong])

  // -------- 播放控制 --------

  /** 播放指定歌曲（带队列），如果不传 queue 则使用单曲队列 */
  const playSong = useCallback((song, songList = null) => {
    if (!song?.file_url) return

    if (songList && songList.length > 0) {
      setQueue(songList)
      const idx = songList.findIndex(s => s.id === song.id)
      setCurrentIndex(idx >= 0 ? idx : 0)
    } else {
      // 检查是否已在当前队列中
      const idx = queue.findIndex(s => s.id === song.id)
      if (idx >= 0) {
        setCurrentIndex(idx)
      } else {
        setQueue([song])
        setCurrentIndex(0)
      }
    }
  }, [queue])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio.src) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [])

  const playNext = useCallback(() => {
    if (queue.length === 0) return
    const next = (currentIndex + 1) % queue.length
    setCurrentIndex(next)
  }, [queue, currentIndex])

  const playPrev = useCallback(() => {
    if (queue.length === 0) return
    // 如果播放超过 3 秒，则重播当前歌曲
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      return
    }
    const prev = (currentIndex - 1 + queue.length) % queue.length
    setCurrentIndex(prev)
  }, [queue, currentIndex])

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((v) => {
    const vol = Math.max(0, Math.min(1, v))
    setVolumeState(vol)
    localStorage.setItem('player-volume', String(vol))
  }, [])

  return (
    <PlayerContext.Provider value={{
      currentSong,
      queue,
      currentIndex,
      isPlaying,
      currentTime,
      duration,
      volume,
      playSong,
      togglePlay,
      playNext,
      playPrev,
      seek,
      setVolume,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer 必须在 PlayerProvider 内使用')
  return ctx
}
