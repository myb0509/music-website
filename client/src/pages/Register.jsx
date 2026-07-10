import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)

    try {
      await register(form.username, form.email, form.password)
      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">🎸 注册</h1>
        <p className="auth-subtitle">创建你的音乐账号</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            用户名
            <input
              name="username"
              type="text"
              placeholder="请输入用户名"
              value={form.username}
              onChange={handleChange}
              required
              autoFocus
            />
          </label>

          <label className="auth-label">
            邮箱
            <input
              name="email"
              type="email"
              placeholder="请输入邮箱"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-label">
            密码
            <input
              name="password"
              type="password"
              placeholder="至少 6 位密码"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </label>

          <label className="auth-label">
            确认密码
            <input
              name="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? '注册中...' : '注 册'}
          </button>
        </form>

        <p className="auth-switch">
          已有账号？<Link to="/login">立即登录</Link>
        </p>
      </div>
    </div>
  )
}
