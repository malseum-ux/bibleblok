export const config = {
  runtime: 'edge',
}

// 로그인 확인용 — 브라우저 앱(src/supabase.js)과 같은 공개 주소·공개 키
const SUPABASE_URL = 'https://pdrxuxrlwreqgiptzily.supabase.co'
const SUPABASE_KEY = 'sb_publishable__PtJQXkCwFJbmI8ZMpAReg_uOmuXX8J'
const MAX_TOKENS = 8000

// 요청에 담긴 로그인 표를 Supabase 에 물어 확인 — 로그인한 사람(익명 제외)만 통과
async function isSignedIn(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return false
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: SUPABASE_KEY } })
  if (!res.ok) return false
  const user = await res.json()
  return !!user?.id && !user.is_anonymous
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  if (!(await isSignedIn(req))) {
    return new Response(JSON.stringify({ error: { message: '로그인이 필요합니다.' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'API key not configured on server' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    // 모델·생각 모드·길이는 서버에서 고정 — 요청에서는 대화 내용과 스트리밍 여부만 받는다
    const payload = {
      model: 'deepseek-flash',
      thinking: { type: 'disabled' },
      messages: Array.isArray(body?.messages) ? body.messages : [],
      stream: !!body?.stream,
      max_tokens: Math.min(Number(body?.max_tokens) || 2000, MAX_TOKENS),
    }
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
      let error
      try { error = JSON.parse(text) } catch { error = { error: { message: text || `HTTP ${response.status}` } } }
      return new Response(JSON.stringify(error), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { message: err.message || 'Server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
