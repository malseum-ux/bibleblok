import { useState, useEffect } from 'react'
import { SERMON_STEPS } from '../constants'
import { getSermonSteps } from '../db'
import { getChurchSeason, getSeasonColor } from './WorshipForm'

// 설교 계획 — 일반 달력(일~토 7칸). 주일 칸에 교회력 절기·설교·진행 상태, 켜면 평일 칸에 새벽설교
// 따로 저장하는 것은 없다: 이미 있는 설교의 날짜로 채운다 (플러터 screens/plan_view.dart 와 같은 화면)

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const plain = html => (html || '').replace(/<[^>]+>/g, '').trim()

// 달력에 보일 날짜들 — 그달 1일이 든 주의 일요일부터, 말일이 든 주의 토요일까지
function calendarDays(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const last = new Date(year, month + 1, 0)
  const end = new Date(year, month, last.getDate() + (6 - last.getDay()))
  const out = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d))
  return out
}

export default function PlanView({ lang, sermons, dawns, worships, onOpen, onCreate, isMobile = false }) {
  const ko = lang !== 'en'
  const now = new Date()
  const today = ymd(now)
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showDawn, setShowDawn] = useState(() => { try { return localStorage.getItem('bibleblok-plan-dawn') === '1' } catch { return false } })
  const [progress, setProgress] = useState({}) // 설교 id → 내용이 있는 연구 단계 수
  const [picked, setPicked] = useState(today) // 휴대폰 폭: 누른 날짜

  useEffect(() => { try { localStorage.setItem('bibleblok-plan-dawn', showDawn ? '1' : '0') } catch { /* 저장 실패는 무시 */ } }, [showDawn])

  const days = calendarDays(view.year, view.month)
  const from = ymd(days[0]), to = ymd(days[days.length - 1])

  // 보이는 날짜의 설교들 연구 단계 진행
  useEffect(() => {
    let alive = true
    const list = sermons.filter(s => s.date && s.date >= from && s.date <= to)
    Promise.all(list.map(async s => [s.id, (await getSermonSteps(s.id)).filter(x => plain(x.content)).length]))
      .then(pairs => { if (alive) setProgress(Object.fromEntries(pairs)) })
    return () => { alive = false }
  }, [sermons, from, to])

  const byDate = list => list.reduce((m, it) => { if (it.date) (m[it.date] ||= []).push(it); return m }, {})
  const sermonsByDate = byDate(sermons)
  const dawnsByDate = byDate(dawns)
  const worshipDates = new Set(worships.map(w => w.date).filter(Boolean))
  const total = SERMON_STEPS.length
  const move = n => setView(v => { const d = new Date(v.year, v.month + n, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const goToday = () => { setView({ year: now.getFullYear(), month: now.getMonth() }); setPicked(today) }

  const chip = { fontSize: 10, padding: '0 6px', borderRadius: 9, whiteSpace: 'nowrap', lineHeight: '16px' }
  const navBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 6, height: 28, padding: isMobile ? '0 8px' : '0 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }
  const addBtn = { alignSelf: 'flex-start', background: 'none', border: '1px dashed var(--border)', borderRadius: 5, padding: '1px 7px', fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }
  const dayNames = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const titleOf = it => it.title || it.passage || (ko ? '제목 없음' : 'Untitled')

  // 한 날짜의 내용 (큰 칸 안, 또는 휴대폰 아래 펼침)
  function DayContent({ date, isSunday, compact = false }) {
    const list = sermonsByDate[date] || []
    const dayDawns = showDawn ? (dawnsByDate[date] || []) : []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
        {list.map(s => {
          const done = progress[s.id] || 0
          return (
            <div key={s.id} onClick={e => { e.stopPropagation(); onOpen('sermon', s.id) }} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: compact ? 12 : 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleOf(s)}</div>
              {s.title && s.passage && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.passage}</div>}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                <span style={{ ...chip, background: done === total ? 'var(--accent)' : 'transparent', color: done === total ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}>{ko ? `연구 ${done}/${total}` : `${done}/${total}`}</span>
                {plain(s.draft) && <span style={{ ...chip, background: '#16a34a22', color: '#16a34a' }}>{ko ? '초안' : 'Draft'}</span>}
                {s.category && <span style={{ ...chip, background: 'var(--bg-sidebar)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s.category}</span>}
              </div>
            </div>
          )
        })}
        {isSunday && list.length === 0 && (
          <button onClick={e => { e.stopPropagation(); onCreate(date, 'sermon') }} style={addBtn}>{ko ? '+ 새 설교' : '+ Sermon'}</button>
        )}
        {worshipDates.has(date) && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ko ? '예배인도 있음' : 'Worship ready'}</span>}
        {dayDawns.map(d => (
          <div key={d.id} onClick={e => { e.stopPropagation(); onOpen('dawn', d.id) }} style={{ cursor: 'pointer', fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{ko ? '새벽 · ' : 'Dawn · '}</span>{titleOf(d)}
          </div>
        ))}
        {showDawn && !isSunday && dayDawns.length === 0 && (
          <button onClick={e => { e.stopPropagation(); onCreate(date, 'dawn') }} style={addBtn}>{ko ? '+ 새벽' : '+ Dawn'}</button>
        )}
      </div>
    )
  }

  const rows = days.length / 7
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 46, padding: '0 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={() => move(-1)} style={navBtn}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)', minWidth: isMobile ? 0 : 104, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {ko ? `${view.year}년 ${view.month + 1}월` : `${view.year}. ${view.month + 1}`}
        </span>
        <button onClick={() => move(1)} style={navBtn}>›</button>
        <button onClick={goToday} style={navBtn}>{ko ? '오늘' : 'Today'}</button>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showDawn} onChange={e => setShowDawn(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          {isMobile ? (ko ? '새벽' : 'Dawn') : (ko ? '새벽설교 함께 보기' : 'Dawn sermons')}
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {dayNames.map((n, i) => (
          <div key={n} style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600, color: i === 0 ? '#dc2626' : 'var(--text-muted)' }}>{n}</div>
        ))}
      </div>

      <div style={{
        flex: isMobile ? 'none' : 1, minHeight: 0, display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: isMobile ? `repeat(${rows}, 56px)` : `repeat(${rows}, minmax(0, 1fr))`,
      }}>
        {days.map(d => {
          const date = ymd(d)
          const inMonth = d.getMonth() === view.month
          const isSunday = d.getDay() === 0
          const isToday = date === today
          const season = isSunday ? getChurchSeason(date) : ''
          const color = isSunday ? getSeasonColor(season) : null
          const hasSermon = !!sermonsByDate[date]?.length
          const hasDawn = showDawn && !!dawnsByDate[date]?.length
          return (
            <div
              key={date}
              onClick={isMobile ? () => setPicked(date) : undefined}
              style={{
                borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                borderTop: color ? `3px solid ${color.hex}` : '3px solid transparent',
                padding: isMobile ? 4 : '4px 8px 6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3,
                background: isMobile && picked === date ? 'var(--accent-light)' : inMonth ? 'transparent' : 'var(--bg-sidebar)',
                opacity: inMonth ? 1 : 0.55, cursor: isMobile ? 'pointer' : 'default',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500, flexShrink: 0,
                  color: isToday ? '#fff' : isSunday ? '#dc2626' : 'var(--text)',
                  background: isToday ? 'var(--accent)' : 'transparent', borderRadius: 10, padding: isToday ? '0 6px' : 0,
                }}>{d.getDate()}</span>
                {!isMobile && season && <span style={{ fontSize: 10, color: color?.hex || 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{season}</span>}
              </div>
              {isMobile ? (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {hasSermon && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />}
                  {hasDawn && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />}
                  {worshipDates.has(date) && <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid var(--accent)' }} />}
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                  <DayContent date={date} isSunday={isSunday} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isMobile && (() => {
        const d = new Date(picked + 'T00:00:00')
        const isSunday = d.getDay() === 0
        const season = isSunday ? getChurchSeason(picked) : ''
        return (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)', marginBottom: 8 }}>
              {ko ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})` : picked}
              {season && <span style={{ fontWeight: 400, fontSize: 12, color: getSeasonColor(season)?.hex, marginLeft: 8 }}>{season}</span>}
            </div>
            <DayContent date={picked} isSunday={isSunday} />
          </div>
        )
      })()}
    </div>
  )
}
