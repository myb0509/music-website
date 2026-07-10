import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🎵 登录</h1>
        <p className="auth-subtitle">欢迎回到音乐世界</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            用户名 / 邮箱
            <input
              name="username"
              type="text"
              placeholder="请输入用户名或邮箱"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </label>

          <label className="auth-label">
            密码
            <input
              name="password"
              type="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '登录中...' : '登 录'}
          </button>
        </form>

        <p className="auth-switch">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  )
}
