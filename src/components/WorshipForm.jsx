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

const CHURCH_SEASONS = [
  '대림절', '성탄절', '주현절', '사순절', '성주간', '부활절', '성령강림절', '일반 주일',
  '추수감사주일', '종교개혁주일', '맥추감사절', '신년주일', '성탄전야',
]

export default function WorshipForm({ worship, onSave, lang }) {
  const [form, setForm] = useState({
    date: worship?.date || new Date().toISOString().slice(0, 10),
    season: worship?.season || '',
    lectionary: worship?.lectionary || '',
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
        <label style={labelStyle}>{lang === 'ko' ? '교회력 절기' : 'Church Season'}</label>
        <select
          style={inputStyle}
          value={form.season}
          onChange={e => set('season', e.target.value)}
        >
          <option value="">{lang === 'ko' ? '절기 선택' : 'Select season'}</option>
          {CHURCH_SEASONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '성서정과 본문' : 'Lectionary'}</label>
        <input
          type="text"
          style={inputStyle}
          placeholder={lang === 'ko' ? '예: 사 40:1-11, 시 85, 막 1:1-8' : 'E.g. Isa 40:1-11, Ps 85, Mark 1:1-8'}
          value={form.lectionary}
          onChange={e => set('lectionary', e.target.value)}
        />
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
