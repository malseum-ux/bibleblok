// 성경나침반 내설교 한 편 보기 (읽기 전용) — 설교문 초안 칸과 같은 모양
// 플러터 앱(bibleblok_app/lib/screens/wordblok_sermon_view.dart)과 같은 구성
import { useEffect, useState } from 'react'
import { passageLabel, readWordblokSermon } from '../wordblokSermons'

export default function WordblokSermonView({ item, file, lang = 'ko', fontSize = 14 }) {
  const [text, setText] = useState(null)

  useEffect(() => {
    let alive = true
    readWordblokSermon(item.path, item.id)
      .then(t => { if (alive) setText(t) })
      .catch(() => { if (alive) setText('') })
    return () => { alive = false }
  }, [item.path, item.id])

  const meta = [item.date, passageLabel(item), file].filter(Boolean).join(' · ')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      <div style={{
        height: 46, padding: '0 20px', borderBottom: '1px solid var(--border)',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ flexShrink: 0 }}>{lang === 'ko' ? '설교문 초안' : 'Sermon Draft'}</span>
        <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, opacity: 0.8 }}>
          {lang === 'ko' ? '· 성경나침반 내설교 (읽기 전용)' : '· WordBlok sermon (read only)'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 48px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 6 }}>{item.title}</div>
        {meta && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{meta}</div>}
        {text === null ? (
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
