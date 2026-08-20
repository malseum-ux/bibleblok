import { randomStr, sha256B64 } from './pkce'

const CLIENT_ID = import.meta.env.VITE_ONEDRIVE_CLIENT_ID || ''
const REDIRECT_URI = window.location.origin
const FILE_NAME = 'sermonblok_data.json'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH = 'https://graph.microsoft.com/v1.0'

export function onedriveConfigured() {
  return !!CLIENT_ID
}

export async function onedriveLoginUrl() {
  const verifier = randomStr(64)
  const challenge = await sha256B64(verifier)
  sessionStorage.setItem('onedrive_verifier', verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'Files.ReadWrite.AppFolder offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'onedrive',
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

export async function onedriveExchangeCode(code) {
  const verifier = sessionStorage.getItem('onedrive_verifier')
  sessionStorage.removeItem('onedrive_verifier')
  try {
    const res = await fetch(TOKEN_URL, {
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

async function refreshToken(tokens) {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
        client_id: CLIENT_ID,
        scope: 'Files.ReadWrite.AppFolder offline_access',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { access: data.access_token, refresh: data.refresh_token || tokens.refresh }
  } catch {
    return null
  }
}

export async function onedriveSave(tokens, data) {
  try {
    const body = JSON.stringify(data)
    const upload = (token) => fetch(
      `${GRAPH}/me/drive/special/approot:/${FILE_NAME}:/content`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
      }
    )
    let res = await upload(tokens.access)
    if (res.status === 401 && tokens.refresh) {
      const newTokens = await refreshToken(tokens)
      if (!newTokens) return false
      localStorage.setItem('onedrive_tokens', JSON.stringify(newTokens))
      res = await upload(newTokens.access)
    }
    return res.ok
  } catch {
    return false
  }
}

export async function onedriveLoad(tokens) {
  try {
    const download = (token) => fetch(
      `${GRAPH}/me/drive/special/approot:/${FILE_NAME}:/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    let res = await download(tokens.access)
    if (res.status === 401 && tokens.refresh) {
      const newTokens = await refreshToken(tokens)
      if (!newTokens) return null
      localStorage.setItem('onedrive_tokens', JSON.stringify(newTokens))
      res = await download(newTokens.access)
    }
    if (res.status === 404) return null
    if (!res.ok) return null
    const text = await res.text()
    return { data: JSON.parse(text), updatedAt: Date.now() }
  } catch {
    return null
  }
}
