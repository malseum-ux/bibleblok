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

export default function SermonForm({ sermon, onSave, lang }) {
  const [form, setForm] = useState({
    date: sermon?.date || new Date().toISOString().slice(0, 10),
    category: sermon?.category || '',
    title: sermon?.title || '',
    passage: sermon?.passage || '',
    emphasis: sermon?.emphasis || '',
  })

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>{lang === 'ko' ? '날짜' : 'Date'}</label>
          <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>{lang === 'ko' ? '구분' : 'Category'}</label>
          <input type="text" style={inputStyle} placeholder={lang === 'ko' ? '강해, 주제 등' : 'Expository, Topical...'} value={form.category} onChange={e => set('category', e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '주제' : 'Title'}</label>
        <input type="text" style={inputStyle} placeholder={lang === 'ko' ? '설교 제목' : 'Sermon title'} value={form.title} onChange={e => set('title', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '본문' : 'Passage'}</label>
        <input type="text" style={inputStyle} placeholder="예: 창세기 1:1-10" value={form.passage} onChange={e => set('passage', e.target.value)} />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '강조 주제' : 'Emphasis'}</label>
        <input type="text" style={inputStyle} placeholder={lang === 'ko' ? '설교자가 강조하고 싶은 주제 (선택)' : 'Theme to emphasize (optional)'} value={form.emphasis} onChange={e => set('emphasis', e.target.value)} />
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
