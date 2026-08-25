import { useState } from 'react'

export default function CellForm({ cell, onSave, lang }) {
  const [passage, setPassage] = useState(cell?.passage || '')
  const [title, setTitle] = useState(cell?.title || '')
  const [date, setDate] = useState(cell?.date || '')

  const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }
  const inputStyle = { width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }

  function handleSubmit(e) {
    e.preventDefault()
    if (!passage.trim()) return
    onSave({ passage: passage.trim(), title: title.trim() || null, date: date || null })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '성경 본문 (필수)' : 'Passage (required)'}</label>
        <input
          value={passage}
          onChange={e => setPassage(e.target.value)}
          placeholder="예: 요한복음 8:1-11"
          style={inputStyle}
          required
        />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '제목 (선택)' : 'Title (optional)'}</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="나눔 교재 제목"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '날짜 (선택)' : 'Date (optional)'}</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={inputStyle}
        />
      </div>
      <button
        type="submit"
        style={{ alignSelf: 'flex-start', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        {cell ? (lang === 'ko' ? '저장' : 'Save') : (lang === 'ko' ? '교재 만들기' : 'Create')}
      </button>
    </form>
  )
}
