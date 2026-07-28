import { LANGUAGES, BIBLE_VERSIONS, THEMES } from '../constants'

export default function SettingsPanel({ settings, onChange, onClose }) {
  const lang = settings.lang

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
        </div>
      </div>
    </>
  )
}
