import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Dropbox/OneDrive OAuth 콜백을 Supabase보다 먼저 가로채서 sessionStorage에 저장
;(function interceptOAuth() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (code && (state === 'dropbox' || state === 'onedrive')) {
    sessionStorage.setItem('oauth_pending_code', code)
    sessionStorage.setItem('oauth_pending_state', state)
    window.history.replaceState({}, '', window.location.pathname)
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
