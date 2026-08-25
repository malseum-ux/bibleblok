import { useState, useRef, useEffect } from 'react'
import { LANGUAGES, BIBLE_VERSIONS, THEMES, SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'
import { exportAllData, importAllData, db } from '../db'
import { supabase } from '../supabase'
import { driveListRevisions } from '../googleDrive'
import { dropboxLoginUrl, dropboxConfigured } from '../dropbox'
import { onedriveLoginUrl, onedriveConfigured } from '../onedrive'
import { icloudSignIn, icloudSignOut, icloudConfigured } from '../icloud'

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

export default function SettingsPanel({ settings, onChange, onClose, rootHandle, onPickFolder, driveToken, driveSyncing, driveLastSync, driveAuthError, onManualDriveLoad, onDriveRestoreRevision, dropboxTokens, onedriveTokens, icloudReady, onDropboxDisconnect, onOnedriveDisconnect, onIcloudDisconnect }) {
  const lang = settings.lang
  const [defaultKeywords, setDefaultKeywords] = useState(getDefaultKeywords)
  const [importStatus, setImportStatus] = useState(null)
  const [exportStatus, setExportStatus] = useState(null)
  const [driveLoadStatus, setDriveLoadStatus] = useState(null)
  const [revisions, setRevisions] = useState(null)
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [restoreStatus, setRestoreStatus] = useState(null)
  const [dbCounts, setDbCounts] = useState(null)
  const fileInputRef = useRef(null)

  async function handleExport() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const fileName = `bibleblok-backup-${new Date().toISOString().slice(0, 10)}.json`

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
            <div style={labelStyle}>{lang === 'ko' ? '클라우드 동기화' : 'Cloud Sync'}</div>
            {driveSyncing && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginBottom: 8 }}>
                동기화 중...{driveLastSync ? ` (마지막: ${new Date(driveLastSync).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})` : ''}
              </div>
            )}
            {driveAuthError && (
              <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, lineHeight: 1.6 }}>
                Google Drive 연결이 만료되었습니다. 아래 재연결 버튼을 눌러 주세요.
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              {!driveToken && (
                <div style={{
                  fontSize: 11,
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: 6,
                  padding: '8px 10px',
                  marginBottom: 8,
                  lineHeight: 1.6,
                  color: '#92400e',
                }}>
                  Google Drive 연동이 필요합니다.<br />
                  아래 버튼으로 Google 계정에 연결하세요.
                  <button
                    onClick={() => supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: window.location.origin,
                        scopes: 'https://www.googleapis.com/auth/drive.appdata',
                        queryParams: { access_type: 'offline', prompt: 'consent' },
                      },
                    })}
                    style={{
                      display: 'block',
                      marginTop: 6,
                      padding: '5px 12px',
                      background: '#534AB7',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 5,
                      fontSize: 11,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Google Drive 연동하기
                  </button>
                </div>
              )}
              <button
                onClick={async () => {
                  const [s, d, w, ss, ds] = await Promise.all([
                    db.sermons.count(), db.dawns.count(), db.worships.count(),
                    db.sermonSteps.count(), db.dawnSteps.count(),
                  ])
                  setDbCounts({ sermons: s, dawns: d, worships: w, steps: ss + ds })
                }}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--accent)', cursor: 'pointer',
                  marginBottom: 6, textDecoration: 'underline',
                }}
              >
                로컬 DB 확인
              </button>
              {dbCounts && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                  DB: 설교 {dbCounts.sermons}개 / 새벽 {dbCounts.dawns}개 / 단계내용 {dbCounts.steps}개
                </div>
              )}
              <button
                onClick={async () => {
                  setDriveLoadStatus('loading')
                  const result = await onManualDriveLoad?.()
                  setDriveLoadStatus(result)
                }}
                disabled={driveLoadStatus === 'loading' || !onManualDriveLoad || !driveToken}
                style={{
                  background: driveToken ? 'var(--bg)' : 'var(--border)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '7px 12px',
                  fontSize: 12,
                  cursor: driveLoadStatus === 'loading' || !driveToken ? 'not-allowed' : 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  opacity: driveLoadStatus === 'loading' || !driveToken ? 0.5 : 1,
                }}
              >
                {driveLoadStatus === 'loading' ? 'Drive 확인 중...' : 'Drive에서 지금 불러오기'}
              </button>
              {driveLoadStatus && driveLoadStatus !== 'loading' && (
                <div style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: 1.6,
                  background: driveLoadStatus.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${driveLoadStatus.success ? '#bbf7d0' : '#fecaca'}`,
                  color: driveLoadStatus.success ? '#16a34a' : '#dc2626',
                }}>
                  {driveLoadStatus.success && `불러오기 완료! 설교 ${driveLoadStatus.counts.sermons}개, 새벽설교 ${driveLoadStatus.counts.dawns}개, 단계내용 ${driveLoadStatus.counts.steps}개`}
                  {driveLoadStatus.error === 'NO_TOKEN' && 'Google 토큰이 없습니다. 위 버튼으로 연동해 주세요.'}
                  {driveLoadStatus.error === 'AUTH_ERROR' && 'Google 토큰이 만료되었습니다. 재연동이 필요합니다.'}
                  {driveLoadStatus.error === 'NO_FILE' && 'Drive에 저장된 파일이 없습니다. 맥에서 먼저 저장해 주세요.'}
                  {driveLoadStatus.error === 'EMPTY_FILE' && 'Drive 파일이 비어 있습니다. 맥 앱에서 데이터가 있는지 확인 후 저장해 주세요.'}
                  {driveLoadStatus.error === 'IMPORT_FAILED' && `가져오기 실패: ${driveLoadStatus.message}`}
                </div>
              )}
            </div>

            {driveToken && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={async () => {
                    setRevisionsLoading(true)
                    setRevisions(null)
                    setRestoreStatus(null)
                    const list = await driveListRevisions(driveToken)
                    setRevisions(list)
                    setRevisionsLoading(false)
                  }}
                  disabled={revisionsLoading}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: 11, color: 'var(--accent)', cursor: revisionsLoading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline', opacity: revisionsLoading ? 0.6 : 1,
                  }}
                >
                  {revisionsLoading ? '버전 이력 불러오는 중...' : '버전 이력 보기'}
                </button>
                {revisions === null && !revisionsLoading ? null : revisions?.error ? (
                  <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>
                    이력을 불러올 수 없습니다.
                  </div>
                ) : revisions?.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    저장된 버전이 없습니다.
                  </div>
                ) : revisions && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {restoreStatus && (
                      <div style={{
                        padding: '6px 10px', borderRadius: 6, fontSize: 11,
                        background: restoreStatus.success ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${restoreStatus.success ? '#bbf7d0' : '#fecaca'}`,
                        color: restoreStatus.success ? '#16a34a' : '#dc2626',
                        marginBottom: 4,
                      }}>
                        {restoreStatus.success && '복구 완료! 데이터가 해당 버전으로 교체되었습니다.'}
                        {restoreStatus.error === 'LOAD_FAILED' && '버전 데이터를 불러오지 못했습니다.'}
                        {restoreStatus.error === 'AUTH_ERROR' && '토큰이 만료되었습니다. 재연동 후 시도해 주세요.'}
                        {restoreStatus.error === 'IMPORT_FAILED' && `가져오기 실패: ${restoreStatus.message}`}
                      </div>
                    )}
                    {[...revisions].reverse().map((rev, i) => {
                      const dt = new Date(rev.modifiedTime)
                      const label = dt.toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })
                      const kb = rev.size ? `${Math.round(rev.size / 1024)}KB` : ''
                      return (
                        <div key={rev.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '5px 8px',
                          background: i === 0 ? 'var(--bg)' : 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          gap: 8,
                        }}>
                          <div style={{ fontSize: 11, color: 'var(--text)' }}>
                            {label}
                            {i === 0 && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>최신</span>}
                            {kb && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>{kb}</span>}
                          </div>
                          <button
                            onClick={async () => {
                              setRestoreStatus(null)
                              const result = await onDriveRestoreRevision?.(rev.id)
                              setRestoreStatus(result)
                            }}
                            style={{
                              padding: '3px 10px',
                              background: i === 0 ? 'var(--accent)' : 'var(--bg)',
                              color: i === 0 ? '#fff' : 'var(--text)',
                              border: '1px solid var(--border)',
                              borderRadius: 5,
                              fontSize: 11,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {i === 0 ? '최신으로 불러오기' : '이 버전으로 복구'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                {
                  id: 'google',
                  label: 'Google Drive',
                  connected: !!driveToken && !driveAuthError,
                  configured: true,
                  connectLabel: driveAuthError ? '재연결' : '연동',
                  onConnect: () => supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin,
                      scopes: 'https://www.googleapis.com/auth/drive.appdata',
                      queryParams: { access_type: 'offline', prompt: 'consent' },
                    },
                  }),
                  onDisconnect: null,
                  note: (!!driveToken && !driveAuthError) ? null : driveAuthError ? '재연결 필요' : 'Google 로그인 시 자동 연동',
                },
                {
                  id: 'dropbox',
                  label: 'Dropbox',
                  connected: !!dropboxTokens,
                  configured: dropboxConfigured(),
                  onConnect: async () => { window.location.href = await dropboxLoginUrl() },
                  onDisconnect: onDropboxDisconnect,
                  note: dropboxConfigured() ? null : '앱 등록 필요',
                },
                {
                  id: 'onedrive',
                  label: 'OneDrive',
                  connected: !!onedriveTokens,
                  configured: onedriveConfigured(),
                  onConnect: async () => { window.location.href = await onedriveLoginUrl() },
                  onDisconnect: onOnedriveDisconnect,
                  note: onedriveConfigured() ? null : '앱 등록 필요',
                },
                {
                  id: 'icloud',
                  label: 'iCloud',
                  connected: icloudReady,
                  configured: icloudConfigured(),
                  onConnect: () => icloudSignIn(),
                  onDisconnect: async () => { await icloudSignOut(); onIcloudDisconnect?.() },
                  note: icloudConfigured() ? null : 'Apple Developer 설정 필요',
                },
              ].map(({ id, label, connected, configured, onConnect, onDisconnect, note, connectLabel }) => (
                <div key={id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  border: `1px solid ${connected ? '#534AB7' : 'var(--border)'}`,
                  borderRadius: 6,
                  background: connected ? '#534AB722' : 'var(--bg)',
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: connected ? '#534AB7' : 'var(--text)' }}>
                      {label}
                    </span>
                    {note && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{note}</div>
                    )}
                  </div>
                  {connected ? (
                    onDisconnect && (
                      <button
                        onClick={onDisconnect}
                        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        해제
                      </button>
                    )
                  ) : (
                    configured && onConnect && (
                      <button
                        onClick={onConnect}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: 4, padding: '3px 8px', fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {connectLabel || '연동'}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
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
