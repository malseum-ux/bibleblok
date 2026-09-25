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
