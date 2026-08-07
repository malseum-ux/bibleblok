import { useState, useRef, useEffect } from 'react'
import { LANGUAGES, BIBLE_VERSIONS, THEMES, SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { exportAllData, importAllData } from '../db'
import { supabase } from '../supabase'
import { useUserEmail } from './AuthGate'

const ADMIN_EMAIL = 'malseum@gmail.com'
const TRIAL_DAYS = 30

const ALL_STEPS = { sermon: SERMON_STEPS, worship: WORSHIP_STEPS, dawn: DAWN_STEPS }
const TAB_LABELS = { sermon: '설교작성', worship: '예배인도', dawn: '새벽설교' }

function getDefaultKeywords() {
  const result = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('defaultKeyword_')) continue
    const rest = key.slice('defaultKeyword_'.length)
    const sepIdx = rest.indexOf('_')
    if (sepIdx === -1) continue
    const tab = rest.slice(0, sepIdx)
    const stepKey = rest.slice(sepIdx + 1)
    const steps = ALL_STEPS[tab] || []
    const step = steps.find(s => s.key === stepKey)
    result.push({ key, tab, stepKey, stepLabel: step ? step.label.ko : stepKey, value: localStorage.getItem(key) })
  }
  return result
}

export default function SettingsPanel({ settings, onChange, onClose, rootHandle, onPickFolder }) {
  const lang = settings.lang
  const [defaultKeywords, setDefaultKeywords] = useState(getDefaultKeywords)
  const [importStatus, setImportStatus] = useState(null)
  const [exportStatus, setExportStatus] = useState(null)
  const fileInputRef = useRef(null)
  const userEmail = useUserEmail()
  const isAdmin = userEmail === ADMIN_EMAIL
  const [trialUsers, setTrialUsers] = useState([])
  const [newUserEmail, setNewUserEmail] = useState('')
  const [addStatus, setAddStatus] = useState(null)

  useEffect(() => {
    if (isAdmin) fetchTrialUsers()
  }, [isAdmin])

  async function fetchTrialUsers() {
    const { data } = await supabase
      .from('allowed_users')
      .select('*')
      .order('created_at', { ascending: false })
    setTrialUsers(data || [])
  }

  async function handleAddUser() {
    const trimmed = newUserEmail.trim().toLowerCase()
    if (!trimmed) return
    setAddStatus('loading')
    const { error } = await supabase.from('allowed_users').insert({ email: trimmed })
    if (error) {
      setAddStatus('error:' + (error.message || '추가 실패'))
    } else {
      await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } })
      setNewUserEmail('')
      setAddStatus('sent')
      fetchTrialUsers()
      setTimeout(() => setAddStatus(null), 3000)
    }
  }

  async function handleDeleteUser(id) {
    await supabase.from('allowed_users').delete().eq('id', id)
    fetchTrialUsers()
  }

  function getDaysLeft(createdAt) {
    const expiresAt = new Date(createdAt)
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS)
    return Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))
  }

  async function handleExport() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const fileName = `sermonblok-backup-${new Date().toISOString().slice(0, 10)}.json`

    if (rootHandle) {
      try {
        const fileHandle = await rootHandle.getFileHandle(fileName, { create: true })
        const writable = await fileHandle.createWritable()
        await writable.write(json)
        await writable.close()
        setExportStatus(`"${rootHandle.name}" 폴더에 저장됨`)
        setTimeout(() => setExportStatus(null), 3000)
        return
      } catch {
        // 폴더 저장 실패 시 다운로드로 fallback
      }
    }

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus('다운로드 폴더에 저장됨')
    setTimeout(() => setExportStatus(null), 3000)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('reading')
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json.version || !json.data) throw new Error('잘못된 파일 형식입니다.')
      await importAllData(json)
      setImportStatus('done')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setImportStatus('error:' + err.message)
    }
    e.target.value = ''
  }

  function set(key, value) {
    onChange({ ...settings, [key]: value })
  }

  const sectionStyle = {
    marginBottom: 28,
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--text-muted)',
    marginBottom: 10,
  }

  function OptionGroup({ items, value, onSelect, getCode, getLabel }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(item => {
          const code = getCode(item)
          const label = getLabel(item)
          const active = value === code
          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              style={{
                background: active ? 'var(--accent)' : 'var(--bg)',
                color: active ? '#fff' : 'var(--text)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 99,
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 260,
        height: '100%',
        background: 'var(--bg-sidebar)',
        borderLeft: '1px solid var(--border)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>
            {lang === 'ko' ? '설정' : 'Settings'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 18,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {isAdmin && (
            <div style={sectionStyle}>
              <div style={labelStyle}>사용자 관리</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddUser()}
                  placeholder="이메일 입력"
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: 12,
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    outline: 'none',
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={handleAddUser}
                  disabled={addStatus === 'loading'}
                  style={{
                    padding: '7px 12px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  추가
                </button>
              </div>
              {addStatus === 'sent' && (
                <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 6 }}>추가되었습니다. 초대 메일을 발송했습니다.</div>
              )}
              {addStatus?.startsWith('error:') && (
                <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 6 }}>{addStatus.slice(6)}</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {trialUsers.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>등록된 사용자가 없습니다.</div>
                )}
                {trialUsers.map(u => {
                  const daysLeft = getDaysLeft(u.created_at)
                  return (
                    <div key={u.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 10px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                        <div style={{ fontSize: 11, color: daysLeft <= 0 ? '#dc2626' : daysLeft <= 5 ? '#d97706' : 'var(--text-muted)', marginTop: 2 }}>
                          {daysLeft <= 0 ? '만료됨' : `${daysLeft}일 남음`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: 16,
                          lineHeight: 1,
                          padding: '0 2px',
                          flexShrink: 0,
                        }}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '데이터 백업' : 'Backup'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleExport}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {lang === 'ko' ? '내보내기 (백업 파일 저장)' : 'Export Backup'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                {lang === 'ko' ? '불러오기 (백업 파일 복원)' : 'Import Backup'}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              {exportStatus && (
                <div style={{ fontSize: 12, color: '#16a34a' }}>{exportStatus}</div>
              )}
              {importStatus === 'reading' && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>불러오는 중...</div>
              )}
              {importStatus === 'done' && (
                <div style={{ fontSize: 12, color: '#16a34a' }}>완료! 페이지를 새로고침합니다...</div>
              )}
              {importStatus?.startsWith('error:') && (
                <div style={{ fontSize: 12, color: '#dc2626' }}>{importStatus.slice(6)}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {rootHandle ? `로컬 폴더 설정됨 → "${rootHandle.name}"에 저장` : '로컬 폴더 미설정 → 다운로드 폴더에 저장'}
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '테마' : 'Theme'}</div>
            <OptionGroup
              items={THEMES}
              value={settings.theme}
              onSelect={v => set('theme', v)}
              getCode={t => t.code}
              getLabel={t => t.label[lang] || t.label.ko}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '언어' : 'Language'}</div>
            <OptionGroup
              items={LANGUAGES}
              value={settings.lang}
              onSelect={v => set('lang', v)}
              getCode={l => l.code}
              getLabel={l => l.label}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '성경 번역본' : 'Bible Version'}</div>
            <OptionGroup
              items={BIBLE_VERSIONS}
              value={settings.bible}
              onSelect={v => set('bible', v)}
              getCode={b => b.code}
              getLabel={b => b.label}
            />
          </div>
          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '로컬 폴더' : 'Local Folder'}</div>
            {rootHandle && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, wordBreak: 'break-all' }}>
                {rootHandle.name}
              </div>
            )}
            <button
              onClick={onPickFolder}
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {rootHandle ? (lang === 'ko' ? '폴더 변경' : 'Change Folder') : (lang === 'ko' ? '폴더 선택' : 'Select Folder')}
            </button>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '계정' : 'Account'}</div>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {lang === 'ko' ? '로그아웃' : 'Sign out'}
            </button>
          </div>

          {defaultKeywords.length > 0 && (
            <div style={sectionStyle}>
              <div style={labelStyle}>{lang === 'ko' ? '기억된 지시어' : 'Saved Keywords'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {defaultKeywords.map(item => (
                  <div key={item.key} style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '8px 12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {TAB_LABELS[item.tab] || item.tab} · {item.stepLabel}
                      </span>
                      <button
                        onClick={() => {
                          localStorage.removeItem(item.key)
                          setDefaultKeywords(getDefaultKeywords())
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontSize: 16,
                          lineHeight: 1,
                          padding: '0 2px',
                        }}
                      >×</button>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
