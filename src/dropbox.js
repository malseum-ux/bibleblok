import { randomStr, sha256B64 } from './pkce'

const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID || ''
const REDIRECT_URI = window.location.origin
const FILE_PATH = '/sermonblok_data.json'

export function dropboxConfigured() {
  return !!CLIENT_ID
}

export async function dropboxLoginUrl() {
  const verifier = randomStr(64)
  const challenge = await sha256B64(verifier)
  sessionStorage.setItem('dropbox_verifier', verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
    state: 'dropbox',
  })
  return `https://www.dropbox.com/oauth2/authorize?${params}`
}

export async function dropboxExchangeCode(code) {
  const verifier = sessionStorage.getItem('dropbox_verifier')
  sessionStorage.removeItem('dropbox_verifier')
  try {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier || '',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { access: data.access_token, refresh: data.refresh_token }
  } catch {
    return null
  }
}

async function refreshToken(refresh) {
  try {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh,
        client_id: CLIENT_ID,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token
  } catch {
    return null
  }
}

function updateAccessToken(tokens, newAccess) {
  const updated = { ...tokens, access: newAccess }
  localStorage.setItem('dropbox_tokens', JSON.stringify(updated))
  return updated
}

export async function dropboxSave(tokens, data) {
  try {
    const body = JSON.stringify(data)
    const upload = (token) => fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH, mode: 'overwrite', autorename: false }),
      },
      body,
    })
    let res = await upload(tokens.access)
    if (res.status === 401 && tokens.refresh) {
      const newAccess = await refreshToken(tokens.refresh)
      if (!newAccess) return false
      updateAccessToken(tokens, newAccess)
      res = await upload(newAccess)
    }
    return res.ok
  } catch {
    return false
  }
}

export async function dropboxLoad(tokens) {
  try {
    const download = (token) => fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: FILE_PATH }),
      },
    })
    let res = await download(tokens.access)
    if (res.status === 401 && tokens.refresh) {
      const newAccess = await refreshToken(tokens.refresh)
      if (!newAccess) return null
      updateAccessToken(tokens, newAccess)
      res = await download(newAccess)
    }
    if (res.status === 409) return null
    if (!res.ok) return null
    const apiResult = res.headers.get('Dropbox-API-Result')
    const meta = apiResult ? JSON.parse(apiResult) : {}
    const updatedAt = meta.server_modified ? new Date(meta.server_modified).getTime() : Date.now()
    const text = await res.text()
    return { data: JSON.parse(text), updatedAt }
  } catch {
    return null
  }
}
