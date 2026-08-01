import { useState } from 'react'
import { LANGUAGES, BIBLE_VERSIONS, THEMES, SERMON_STEPS, WORSHIP_STEPS, DAWN_STEPS } from '../constants'

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
