import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pdrxuxrlwreqgiptzily.supabase.co'
const SUPABASE_KEY = 'sb_publishable__PtJQXkCwFJbmI8ZMpAReg_uOmuXX8J'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// AI 서버(/api/generate)에 보낼 머리말 — 로그인 표를 함께 보내야 서버가 받아 준다
export async function aiHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'content-type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// 로그아웃 — 로그인 연장(토큰 갱신)이 실패한 상태면 supabase.auth.signOut() 이 이 기기의 로그인 정보를 지우지 못한다.
// 그럴 때도 이 기기에서는 확실히 로그아웃되도록 저장된 로그인 정보를 직접 지우고 새로 연다.
export async function signOut() {
  let error = null
  try { ({ error } = await supabase.auth.signOut()) } catch (e) { error = e }
  const { data } = await supabase.auth.getSession().catch(() => ({ data: {} }))
  if (!error && !data?.session) return
  try {
    Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token')).forEach(k => localStorage.removeItem(k))
  } catch { /* 저장소 접근 실패 */ }
  window.location.reload()
}
