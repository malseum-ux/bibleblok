import { useState, useEffect, useRef } from 'react'
import { SERMON_STEPS } from '../constants'
import { getSermonSteps } from '../db'
import { getChurchSeason, getSeasonColor } from './WorshipForm'

// 연간 설교 계획 — 한 해의 주일을 줄지어 보여 주고, 그날의 설교·진행 상태·교회력 절기를 표시한다
// 따로 저장하는 것은 없다: 이미 있는 설교의 날짜로 채운다 (플러터 screens/plan_view.dart 와 같은 화면)

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// 그해의 모든 주일
function sundaysOf(year) {
  const d = new Date(year, 0, 1)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  const out = []
  while (d.getFullYear() === year) { out.push(new Date(d)); d.setDate(d.getDate() + 7) }
  return out
}

export default function PlanView({ lang, sermons, dawns, worships, onOpen, onCreate }) {
  const ko = lang !== 'en'
  const today = ymd(new Date())
  const [year, setYear] = useState(new Date().getFullYear())
  const [showDawn, setShowDawn] = useState(() => { try { return localStorage.getItem('bibleblok-plan-dawn') === '1' } catch { return false } })
  const [progress, setProgress] = useState({}) // 설교 id → 내용이 있는 연구 단계 수
  const currentRef = useRef(null)

  useEffect(() => { try { localStorage.setItem('bibleblok-plan-dawn', showDawn ? '1' : '0') } catch { /* 저장 실패는 무시 */ } }, [showDawn])

  // 그해 설교들의 연구 단계 진행
  useEffect(() => {
    let alive = true
    const list = sermons.filter(s => s.date?.startsWith(String(year)))
    Promise.all(list.map(async s => [s.id, (await getSermonSteps(s.id)).filter(x => (x.content || '').replace(/<[^>]+>/g, '').trim()).length]))
      .then(pairs => { if (alive) setProgress(Object.fromEntries(pairs)) })
    return () => { alive = false }
  }, [sermons, year])

  // 올해를 열면 이번 주로 스크롤
  useEffect(() => { currentRef.current?.scrollIntoView({ block: 'center' }) }, [year])

  const sundays = sundaysOf(year)
  const byDate = (list) => list.reduce((m, it) => { if (it.date) (m[it.date] ||= []).push(it); return m }, {})
  const sermonsByDate = byDate(sermons)
  const worshipDates = new Set(worships.map(w => w.date).filter(Boolean))
  const dawnsByDate = byDate(dawns)
  const total = SERMON_STEPS.length

  const chip = { fontSize: 11, padding: '1px 7px', borderRadius: 10, whiteSpace: 'nowrap' }
  const navBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--text-muted)' }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 46, padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => setYear(y => y - 1)} style={navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)', minWidth: 64, textAlign: 'center' }}>{ko ? `${year}년` : year}</span>
        <button onClick={() => setYear(y => y + 1)} style={navBtn}>›</button>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showDawn} onChange={e => setShowDawn(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          {ko ? '새벽설교 함께 보기' : 'Show dawn sermons'}
        </label>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 24px' }}>
        {sundays.map(sun => {
          const date = ymd(sun)
          const weekEnd = new Date(sun); weekEnd.setDate(weekEnd.getDate() + 6)
          const isCurrent = today >= date && today <= ymd(weekEnd)
          const season = getChurchSeason(date)
          const color = getSeasonColor(season)
          const list = sermonsByDate[date] || []
          const weekDawns = showDawn
            ? Array.from({ length: 7 }, (_, i) => { const d = new Date(sun); d.setDate(d.getDate() + i); return dawnsByDate[ymd(d)] || [] }).flat()
            : []
          return (
            <div
              key={date}
              ref={isCurrent && year === new Date().getFullYear() ? currentRef : null}
              style={{
                display: 'flex', gap: 14, padding: '10px 12px', borderBottom: '1px solid var(--border)',
                background: isCurrent ? 'var(--accent-light)' : 'transparent', borderRadius: isCurrent ? 8 : 0,
              }}
            >
              <div style={{ width: 92, flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)' }}>{sun.getMonth() + 1}/{sun.getDate()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  {color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.hex, flexShrink: 0 }} />}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{season}</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map(s => {
                  const done = progress[s.id] || 0
                  const hasDraft = !!(s.draft || '').replace(/<[^>]+>/g, '').trim()
                  return (
                    <div key={s.id} onClick={() => onOpen('sermon', s.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.title || s.passage || (ko ? '제목 없음' : 'Untitled')}</span>
                      {s.title && s.passage && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.passage}</span>}
                      {s.category && <span style={{ ...chip, background: 'var(--bg-sidebar)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.category}</span>}
                      <span style={{ ...chip, background: done === total ? 'var(--accent)' : 'transparent', color: done === total ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}>
                        {ko ? `연구 ${done}/${total}` : `Research ${done}/${total}`}
                      </span>
                      {hasDraft && <span style={{ ...chip, background: '#16a34a22', color: '#16a34a' }}>{ko ? '초안' : 'Draft'}</span>}
                    </div>
                  )
                })}
                {list.length === 0 && (
                  <button onClick={() => onCreate(date)} style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {ko ? '+ 새 설교' : '+ New sermon'}
                  </button>
                )}
                {worshipDates.has(date) && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ko ? '예배인도 있음' : 'Worship guide ready'}</span>
                )}
                {weekDawns.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {weekDawns.map(d => (
                      <span key={d.id} onClick={() => onOpen('dawn', d.id)} style={{ ...chip, cursor: 'pointer', background: 'var(--bg-sidebar)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                        {ko ? '새벽' : 'Dawn'} {d.date.slice(5).replace('-', '/')} · {d.title || d.passage || (ko ? '제목 없음' : 'Untitled')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
