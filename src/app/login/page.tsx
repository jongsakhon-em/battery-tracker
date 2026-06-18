'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (loading) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const email = `${username.trim().toLowerCase()}@bch.local`
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data.session) {
        setError('ไม่ได้รับ session กรุณาลองใหม่')
        setLoading(false)
        return
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(`Network error: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #141A22 0%, #0A0E14 70%)' }}
    >
      {/* Grid texture พื้นหลัง */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo + ชื่อระบบ */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #B45309)',
              boxShadow: '0 0 40px rgba(245,158,11,0.25)',
            }}
          >
            <BatteryIcon />
          </div>
          <h1
            className="text-4xl font-bold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow)', color: 'var(--text)' }}
          >
            Battery Tracker
          </h1>
          <p className="text-sm mt-2 tracking-wider" style={{ color: 'var(--text-muted)' }}>
            ระบบบันทึกการเปลี่ยนแบตเตอรี่
          </p>
        </div>

        {/* ใช้ div แทน form เพื่อป้องกัน HTML default submit บนมือถือ */}
        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="cesbch"
              className="w-full px-4 py-3 rounded-xl text-base input-field"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-base input-field"
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              className="text-sm text-center py-2 px-4 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-base tracking-widest uppercase transition-opacity"
            style={{
              background: 'var(--amber)',
              color: '#0A0E14',
              boxShadow: '0 0 24px rgba(245,158,11,0.3)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BatteryIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0A0E14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M7 12h6" />
    </svg>
  )
}
