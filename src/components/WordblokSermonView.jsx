// 성경나침반 내설교 한 편 보기·수정 — 설교문 초안 칸과 같은 모양
// 수정: 워드블록 편집과 같이 구절 입력 + 본문, [저장][취소]. 저장하면 원래 .scb 에 바로 저장된다.
// 플러터 앱(bibleblok_app/lib/screens/wordblok_sermon_view.dart)과 같은 구성
import { useEffect, useState } from 'react'
import { passageLabel, readWordblokSermon, saveWordblokSermon } from '../wordblokSermons'

export default function WordblokSermonView({ item, file, lang = 'ko', fontSize = 14, onSaved }) {
  const [text, setText] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editRef, setEditRef] = useState('')
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    readWordblokSermon(item.path, item.id)
      .then(t => { if (alive) setText(t) })
      .catch(() => { if (alive) setText('') })
    return () => { alive = false }
  }, [item.path, item.id])

  function openEdit() {
    setEditRef(passageLabel(item))
    setEditText(text ?? '')
    setEditing(true)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const ref = await saveWordblokSermon(item.path, item.id, editRef.trim(), editText)
      setText(editText.trim())
      setEditing(false)
      onSaved?.({ ...item, ...ref })
    } catch (err) {
      alert((lang === 'ko' ? '저장하지 못했습니다: ' : 'Save failed: ') + (err?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  const meta = [item.date, passageLabel(item), file].filter(Boolean).join(' · ')
  const btn = (primary) => ({
    fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer',
    background: primary ? 'var(--accent)' : 'transparent', color: primary ? '#fff' : 'var(--text-muted)',
    border: primary ? 'none' : '1px solid var(--border)',
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{
        height: 46, padding: '0 20px', borderBottom: '1px solid var(--border)',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ flexShrink: 0 }}>{lang === 'ko' ? '설교문 초안' : 'Sermon Draft'}</span>
        <span style={{ flex: 1, fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.8 }}>
          {lang === 'ko' ? '· 성경나침반 내설교' : '· WordBlok sermon'}
        </span>
        {!editing && text !== null && (
          <button onClick={openEdit} style={{ ...btn(false), textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
            {lang === 'ko' ? '수정' : 'Edit'}
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 48px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>{item.title}</div>
        {meta && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{meta}</div>}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={editRef}
                onChange={e => setEditRef(e.target.value)}
                placeholder={lang === 'ko' ? '예) 요 3:16' : 'e.g. John 3:16'}
                style={{ flex: 1, fontSize: 14, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lang === 'ko' ? '맵핑' : 'Passage'}</span>
            </div>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={20}
              style={{ fontSize, lineHeight: 1.8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...btn(true), opacity: saving ? 0.5 : 1 }}>
                {saving ? (lang === 'ko' ? '저장 중...' : 'Saving...') : (lang === 'ko' ? '저장' : 'Save')}
              </button>
              <button onClick={() => setEditing(false)} style={btn(false)}>{lang === 'ko' ? '취소' : 'Cancel'}</button>
            </div>
          </div>
        ) : text === null ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lang === 'ko' ? '불러오는 중...' : 'Loading...'}</div>
        ) : (
          <div style={{ fontSize, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
            {text || (lang === 'ko' ? '내용이 없습니다' : 'No content')}
          </div>
        )}
      </div>
    </div>
  )
}
