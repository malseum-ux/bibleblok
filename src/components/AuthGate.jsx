import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { getSettings } from '../settings'

export default function AuthGate({ children }) {
  // 화면에 보이는 앱 이름 — 저장된 언어 설정을 따른다
  const appName = getSettings().lang === 'en' ? 'Bible & Sermon' : '성경과설교'
  const [session, setSession] = useState(undefined)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setLoading(false)
    if (error) { setError(error.message) } else { setSent(true) }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  if (session === undefined) return null

  if (session) return children

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 340, padding: '40px 36px', background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <div style={{ marginBottom: 28 }}>
          <img src="/icon-192.png" alt={appName} width={56} height={56} style={{ display: 'block', marginBottom: 14, borderRadius: 12 }} />
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>{appName}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>로그인하여 여러 기기에서 사용하세요</div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%', padding: '10px',
            background: 'var(--bg-sidebar)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 7,
            fontSize: 14, fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.7 : 1, marginBottom: 16,
          }}
        >
          {googleLoading ? '연결 중...' : 'Google로 로그인'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {sent ? (
          <div style={{ padding: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
            <strong>{email}</strong><br />
            메일함에서 로그인 링크를 확인해 주세요.<br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>링크를 클릭하면 자동으로 로그인됩니다.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소" required
                style={{
                  width: '100%', padding: '10px 12px', fontSize: 14,
                  border: '1px solid var(--border)', borderRadius: 7,
                  background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</div>}
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '10px',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 7,
                fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '전송 중...' : '이메일 로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
