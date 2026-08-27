import { useState, useRef } from 'react'
import { LANGUAGES, BIBLE_VERSIONS_KO, BIBLE_VERSIONS_EN, THEMES, SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS, CELL_STEPS } from '../constants'
import { exportAllData, importAllData } from '../db'
import { getAllMemories, deleteMemory } from '../memory'
import { supabase } from '../supabase'

const ALL_STEPS = { sermon: SERMON_STEPS, worship: WORSHIP_STEPS, dawn: DAWN_STEPS, cell: CELL_STEPS }
const TAB_LABELS = {
  ko: { sermon: '설교작성', worship: '예배인도', dawn: '새벽설교', cell: '교재작성' },
  en: { sermon: 'Sermon', worship: 'Worship', dawn: 'Dawn Prayer', cell: 'Cell Material' },
}

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

export default function SettingsPanel({ settings, onChange, onClose, onImport }) {
  const lang = settings.lang
  const [defaultKeywords, setDefaultKeywords] = useState(getDefaultKeywords)
  const [memories, setMemories] = useState(getAllMemories)
  const [importStatus, setImportStatus] = useState(null)
  const [exportStatus, setExportStatus] = useState(null)
  const fileInputRef = useRef(null)

  async function handleExport() {
    const data = await exportAllData()
    const json = JSON.stringify(data, null, 2)
    const fileName = `sermonblok-backup-${new Date().toISOString().slice(0, 10)}.json`
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
      await importAllData(json)
      setImportStatus('done')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setImportStatus('error:' + err.message)
    }
    e.target.value = ''
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
                {lang === 'ko' ? '불러오기 (백업 파일 복원)' : 'Import Backup'}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
              {exportStatus && <div style={{ fontSize: 12, color: '#16a34a' }}>{exportStatus}</div>}
              {importStatus === 'reading' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>불러오는 중...</div>}
              {importStatus === 'done' && <div style={{ fontSize: 12, color: '#16a34a' }}>완료! 페이지를 새로고침합니다...</div>}
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
            <div style={labelStyle}>{lang === 'ko' ? '계정' : 'Account'}</div>
            <button
              onClick={() => supabase.auth.signOut()}
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
                        onClick={() => { localStorage.removeItem(item.key); setDefaultKeywords(getDefaultKeywords()) }}
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
