import { useState, useRef } from 'react'
import { LANGUAGES, BIBLE_VERSIONS_KO, BIBLE_VERSIONS_EN, THEMES, SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS, CELL_STEPS } from '../constants'
import { exportAllData, importAllData, getAllKeywords, removeKeyword } from '../db'
import { getAllMemories, deleteMemory } from '../memory'
import { signOut } from '../supabase'
import { folderName, pickFolder } from '../folderFs'
import { fetchCloudBackup } from '../cloudImport'

const ALL_STEPS = { sermon: SERMON_STEPS, worship: WORSHIP_STEPS, dawn: DAWN_STEPS, cell: CELL_STEPS }
const TAB_LABELS = {
  ko: { sermon: '설교작성', worship: '예배인도', dawn: '새벽설교', cell: '교재작성' },
  en: { sermon: 'Sermon', worship: 'Worship', dawn: 'Dawn Prayer', cell: 'Cell Material' },
}

// 기억된 지시어 — 저장 폴더의 settings.json 에 있다
function getDefaultKeywords() {
  return getAllKeywords().map(({ key, tab, stepKey, value }) => {
    const step = (ALL_STEPS[tab] || []).find(s => s.key === stepKey)
    return { key, tab, stepKey, stepLabel: step ? step.label.ko : stepKey, value }
  })
}

export default function SettingsPanel({ settings, onChange, onClose, onDataChanged }) {
  const lang = settings.lang
  const [defaultKeywords, setDefaultKeywords] = useState(getDefaultKeywords)
  const [memories, setMemories] = useState(getAllMemories)
  const [importStatus, setImportStatus] = useState(null)
  const [exportStatus, setExportStatus] = useState(null)
  const [webStatus, setWebStatus] = useState(null) // reading | done:n | error:메시지
  const fileInputRef = useRef(null)

  async function handleExport() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)
    const fileName = lang === 'en' ? `Bible-and-Sermon-backup-${date}.json` : `성경과설교-백업-${date}.json`
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
    setExportStatus(lang === 'en' ? 'Saved to Downloads' : '다운로드 폴더에 저장됨')
    setTimeout(() => setExportStatus(null), 3000)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus('reading')
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (!json.version || !json.data) throw new Error('잘못된 파일 형식입니다.')
      const added = await importAllData(json)
      setImportStatus('done:' + added)
      setDefaultKeywords(getDefaultKeywords())
      await onDataChanged?.()
    } catch (err) {
      setImportStatus('error:' + err.message)
    }
    e.target.value = ''
  }

  // 예전 웹(Supabase)에 있는 이 계정의 데이터를 저장 폴더로 옮긴다 — 이미 있는 항목은 건너뛴다
  async function handleWebImport() {
    const ok = confirm(lang === 'ko'
      ? '웹 바이블블록에 저장된 이 계정의 설교·예배·새벽·교재를 저장 폴더로 가져올까요?\n\n'
        + '· 이미 가져온 항목은 다시 만들지 않습니다.\n'
        + '· 웹의 원본은 지우지 않습니다.\n'
        + '· 웹 브라우저에만 있던 기억된 지시어·학습 메모리는 옮겨지지 않습니다.'
      : "Import this account's data from the web app into your data folder?\n\nExisting items are skipped and the web originals are kept.")
    if (!ok) return
    setWebStatus('reading')
    try {
      const added = await importAllData(await fetchCloudBackup())
      setWebStatus('done:' + added)
      await onDataChanged?.()
    } catch (err) {
      setWebStatus('error:' + err.message)
    }
  }

  // 다른 저장 폴더로 바꾸면 처음부터 다시 읽는다
  async function handleChangeFolder() {
    try {
      await pickFolder()
      window.location.reload()
    } catch (err) {
      if (err?.name !== 'AbortError') alert(err.message)
    }
  }

  function set(key, value) {
    if (key === 'lang') {
      const defaultBible = value === 'en' ? 'ESV' : '개역개정성경'
      onChange({ ...settings, lang: value, bible: defaultBible })
    } else {
      onChange({ ...settings, [key]: value })
    }
  }

  const sectionStyle = { marginBottom: 28 }
  const labelStyle = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10,
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
                borderRadius: 6, padding: '8px 12px',
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', textAlign: 'left',
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 99 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, width: 260, height: '100%',
        background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)',
        zIndex: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>
            {lang === 'ko' ? '설정' : 'Settings'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>
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
                  background: 'var(--bg)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                {lang === 'ko' ? '내보내기 (백업 파일 저장)' : 'Export Backup'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'var(--bg)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                {lang === 'ko' ? '불러오기 (백업 파일 추가)' : 'Import Backup'}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
              {exportStatus && <div style={{ fontSize: 12, color: '#16a34a' }}>{exportStatus}</div>}
              {importStatus === 'reading' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>불러오는 중...</div>}
              {importStatus?.startsWith('done:') && <div style={{ fontSize: 12, color: '#16a34a' }}>{lang === 'ko' ? `완료! ${importStatus.slice(5)}개 항목을 더했습니다.` : `Done! Added ${importStatus.slice(5)} items.`}</div>}
              <button
                onClick={handleWebImport}
                disabled={webStatus === 'reading'}
                style={{
                  background: 'var(--bg)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '8px 12px', fontSize: 13, cursor: webStatus === 'reading' ? 'default' : 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                {lang === 'ko' ? '웹 바이블블록에서 가져오기' : 'Import from Web App'}
              </button>
              {webStatus === 'reading' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'ko' ? '가져오는 중...' : 'Importing...'}</div>}
              {webStatus?.startsWith('done:') && <div style={{ fontSize: 12, color: '#16a34a' }}>{lang === 'ko' ? `완료! ${webStatus.slice(5)}개 항목을 가져왔습니다.` : `Done! Imported ${webStatus.slice(5)} items.`}</div>}
              {webStatus?.startsWith('error:') && <div style={{ fontSize: 12, color: '#dc2626' }}>{webStatus.slice(6)}</div>}
              {importStatus?.startsWith('error:') && <div style={{ fontSize: 12, color: '#dc2626' }}>{importStatus.slice(6)}</div>}
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '테마' : 'Theme'}</div>
            <OptionGroup
              items={THEMES} value={settings.theme} onSelect={v => set('theme', v)}
              getCode={t => t.code} getLabel={t => t.label[lang] || t.label.ko}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '언어' : 'Language'}</div>
            <OptionGroup
              items={LANGUAGES} value={settings.lang} onSelect={v => set('lang', v)}
              getCode={l => l.code} getLabel={l => l.label}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '성경 번역본' : 'Bible Version'}</div>
            <OptionGroup
              items={lang === 'en' ? BIBLE_VERSIONS_EN : BIBLE_VERSIONS_KO}
              value={settings.bible} onSelect={v => set('bible', v)}
              getCode={b => b.code} getLabel={b => b.label}
            />
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '저장 폴더' : 'Data Folder'}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{folderName()}</div>
            <button
              onClick={handleChangeFolder}
              style={{
                background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                textAlign: 'left', width: '100%',
              }}
            >
              {lang === 'ko' ? '다른 폴더로 변경' : 'Change Folder'}
            </button>
          </div>

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '계정' : 'Account'}</div>
            <button
              onClick={() => { onClose(); signOut() }}
              style={{
                background: 'var(--bg)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                textAlign: 'left', width: '100%',
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
                  <div key={item.key} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {TAB_LABELS[lang]?.[item.tab] || item.tab} · {item.stepLabel}
                      </span>
                      <button
                        onClick={() => { removeKeyword(item.key); setDefaultKeywords(getDefaultKeywords()) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                      >×</button>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={sectionStyle}>
            <div style={labelStyle}>{lang === 'ko' ? '학습된 메모리' : 'Learned Memory'}</div>
            {memories.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {lang === 'en'
                  ? <>No memories saved yet.<br />Type a keyword and add "remember this" to accumulate.</>
                  : <>아직 저장된 메모리가 없습니다.<br />키워드 입력창에 내용을 입력하고 "기억해줘"를 붙이면 자동으로 쌓입니다.</>}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {memories.map(({ tab, stepKey, list }) => {
                  const steps = ALL_STEPS[tab] || []
                  const step = steps.find(s => s.key === stepKey)
                  const stepLabel = step ? (step.label?.ko || step.label) : stepKey
                  return list.map((m, idx) => (
                    <div key={`${tab}_${stepKey}_${idx}`} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {TAB_LABELS[lang]?.[tab] || tab} · {stepLabel} · {m.date}
                        </span>
                        <button
                          onClick={() => { deleteMemory(tab, stepKey, idx); setMemories(getAllMemories()) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                        >×</button>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>{m.text}</span>
                    </div>
                  ))
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
