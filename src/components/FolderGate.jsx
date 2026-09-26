import { useState, useEffect } from 'react'
import { folderSupported, restoreFolder, hasStoredFolder, requestPermission, pickFolder } from '../folderFs'
import { loadAll } from '../db'
import { getSettings } from '../settings'

// 저장 폴더 연결 화면 — 처음 실행, 새로고침 뒤 권한 복원, 지원하지 않는 브라우저 안내
// (플러터 앱 screens/folder_gate.dart 와 같은 문구·같은 버튼. 카드 모양은 AuthGate 와 같다)
export default function FolderGate({ children }) {
  const lang = getSettings().lang
  const ko = lang !== 'en'
  const appName = ko ? '성경과설교' : 'Bible & Sermon'
  // checking | needFolder | needPermission | unsupported | ready
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)

  async function open() {
    try {
      await loadAll()
      setError(null)
      setStatus('ready')
    } catch (e) {
      setError((ko ? '폴더를 읽지 못했습니다: ' : 'Could not read the folder: ') + e.message)
      setStatus('needFolder')
    }
  }

  useEffect(() => {
    (async () => {
      if (!folderSupported) { setStatus('unsupported'); return }
      if (await restoreFolder()) { await open(); return }
      setStatus(await hasStoredFolder() ? 'needPermission' : 'needFolder')
    })()
  }, []) // eslint-disable-line

  async function handlePick() {
    try {
      await pickFolder()
      await open()
    } catch (e) {
      if (e?.name === 'AbortError') return // 선택 창을 닫은 경우
      if (e?.message === 'unsupported') setStatus('unsupported')
      else setError(e.message)
    }
  }

  async function handlePermission() {
    if (await requestPermission()) await open()
    else setError(ko ? '권한이 허용되지 않았습니다.' : 'Access was not allowed.')
  }

  if (status === 'checking') return null
  if (status === 'ready') return children

  const message = status === 'needPermission'
    ? (ko ? '이전에 연결한 저장 폴더를 다시 열려면\n접근 권한을 허용해 주세요.' : 'Allow access to reopen\nyour data folder.')
    : status === 'unsupported'
    ? (ko ? '이 브라우저는 폴더 저장을 지원하지 않습니다.\nChrome 또는 Edge 에서 열어 주세요.' : 'This browser does not support folder storage.\nPlease use Chrome or Edge.')
    : (ko ? '설교와 자료를 저장할 폴더를 선택해 주세요.\niCloud Drive·Google Drive·Dropbox 폴더를 고르면\n여러 기기에서 함께 쓸 수 있습니다.'
      : 'Choose a folder to store your work.\nPick an iCloud Drive, Google Drive or Dropbox folder\nto use it on all your devices.')

  const accentBtn = {
    width: '100%', padding: '11px 0', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  }
  const outlineBtn = {
    width: '100%', padding: '9px 0', background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, cursor: 'pointer', marginTop: 8,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 340, padding: '40px 36px', background: 'var(--bg-sidebar)', border: '1px solid var(--border)', borderRadius: 12 }}>
        <img src="/icon-192.png" alt={appName} width={56} height={56} style={{ display: 'block', marginBottom: 14, borderRadius: 12 }} />
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>{appName}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-line', marginBottom: 24 }}>{message}</div>
        {status === 'needPermission' && (
          <>
            <button onClick={handlePermission} style={accentBtn}>{ko ? '폴더 권한 허용' : 'Allow Access'}</button>
            <button onClick={handlePick} style={outlineBtn}>{ko ? '다른 폴더 선택' : 'Choose Another Folder'}</button>
          </>
        )}
        {status === 'needFolder' && (
          <button onClick={handlePick} style={accentBtn}>{ko ? '저장 폴더 선택' : 'Choose Folder'}</button>
        )}
        {error && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{error}</div>}
      </div>
    </div>
  )
}
