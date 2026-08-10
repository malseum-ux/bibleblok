import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../supabase'

const ADMIN_EMAIL = 'malseum@gmail.com'
const TRIAL_DAYS = 30

export const UserEmailContext = createContext(null)
export const SessionContext = createContext(null)
export const GoogleTokenContext = createContext(null)
export function useUserEmail() { return useContext(UserEmailContext) }
export function useSession() { return useContext(SessionContext) }
export function useGoogleToken() { return useContext(GoogleTokenContext) }

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined)
  const [googleToken, setGoogleToken] = useState(null)
  const [access, setAccess] = useState(null)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function applyToken(token) {
      if (!token) return
      setGoogleToken(token)
      localStorage.setItem('gd_token', token)
      localStorage.setItem('gd_token_expiry', String(Date.now() + 55 * 60 * 1000))
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.provider_token) {
        applyToken(data.session.provider_token)
      } else {
        // 세션에 토큰 없으면 localStorage 캐시 사용
        const stored = localStorage.getItem('gd_token')
        const expiry = parseInt(localStorage.getItem('gd_token_expiry') || '0', 10)
        if (stored && Date.now() < expiry) setGoogleToken(stored)
      }
      if (data.session) checkAccess(data.session.user.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.provider_token) {
        applyToken(session.provider_token)
      }
      if (!session) {
        setGoogleToken(null)
        setAccess(null)
        localStorage.removeItem('gd_token')
        localStorage.removeItem('gd_token_expiry')
      } else {
        checkAccess(session.user.email)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkAccess(userEmail) {
    if (userEmail === ADMIN_EMAIL) {
      setAccess({ ok: true })
      return
    }
    const { data, error: dbError } = await supabase
      .from('allowed_users')
      .select('created_at')
      .eq('email', userEmail)
      .single()

    if (dbError || !data) {
      setAccess({ ok: false, reason: 'not_invited' })
      return
    }

    const expiresAt = new Date(data.created_at)
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS)
    if (new Date() > expiresAt) {
      setAccess({ ok: false, reason: 'expired' })
      return
    }
    setAccess({ ok: true })
  }

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
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        scopes: 'https://www.googleapis.com/auth/drive.appdata',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  if (session === undefined) return null

  if (session) {
    if (access === null) return null

    if (!access.ok) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}>
          <div style={{
            width: 340,
            padding: '40px 36px',
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 12 }}>
              {access.reason === 'expired' ? '트라이얼 기간이 만료되었습니다' : '접근 권한이 없습니다'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.8 }}>
              {access.reason === 'expired'
                ? '30일 트라이얼 기간이 지났습니다.\n관리자에게 문의해 주세요.'
                : '초대된 계정이 아닙니다.\n관리자에게 문의해 주세요.'}
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                padding: '9px 20px',
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      )
    }

    return (
      <SessionContext.Provider value={session}>
        <UserEmailContext.Provider value={session.user.email}>
          <GoogleTokenContext.Provider value={googleToken}>
            {children}
          </GoogleTokenContext.Provider>
        </UserEmailContext.Provider>
      </SessionContext.Provider>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 340,
        padding: '40px 36px',
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border)',
        borderRadius: 12,
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>
            말씀블록
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            로그인하여 여러 기기에서 사용하세요
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%',
            padding: '10px',
            background: 'var(--bg-sidebar)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            fontSize: 14,
            fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.7 : 1,
            marginBottom: 16,
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
          <div style={{
            padding: '16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.6,
          }}>
            <strong>{email}</strong><br />
            메일함에서 로그인 링크를 확인해 주세요.<br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>링크를 클릭하면 자동으로 로그인됩니다.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '1px solid var(--border)',
                  borderRadius: 7,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
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
