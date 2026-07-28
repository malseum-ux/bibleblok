import { useState } from 'react'

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--bg)',
  color: 'var(--text-heading)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function DawnForm({ dawn, onSave, lang }) {
  const [form, setForm] = useState({
    date: dawn?.date || new Date().toISOString().slice(0, 10),
    seriesName: dawn?.seriesName || '',
    passage: dawn?.passage || '',
    emphasis: dawn?.emphasis || '',
  })

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '날짜' : 'Date'}</label>
        <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '강해명 / 시리즈명' : 'Series Name'}</label>
        <input type="text" style={inputStyle} placeholder={lang === 'ko' ? '예: 창세기 강해 (없으면 빈칸)' : 'e.g. Genesis Series (optional)'} value={form.seriesName} onChange={e => set('seriesName', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '본문' : 'Passage'}</label>
        <input type="text" style={inputStyle} placeholder="예: 창세기 1:1-5" value={form.passage} onChange={e => set('passage', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '강조 주제' : 'Emphasis'}</label>
        <input type="text" style={inputStyle} placeholder={lang === 'ko' ? '강조하고 싶은 주제 (선택)' : 'Theme to emphasize (optional)'} value={form.emphasis} onChange={e => set('emphasis', e.target.value)} />
      </div>
      <button
        onClick={() => onSave(form)}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '9px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-end',
        }}
      >
        {lang === 'ko' ? '저장' : 'Save'}
      </button>
    </div>
  )
}
