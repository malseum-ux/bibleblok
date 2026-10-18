import { useState, useEffect } from 'react'
import { SERMON_STEPS } from '../constants'
import { getSermonSteps } from '../db'
import { getChurchSeason, getSeasonColor } from './WorshipForm'

// 설교 계획 — 일반 달력(일~토 7칸). 주일 칸에 교회력 절기·주일설교 본문·연구/초안·예배인도·교재작성, 평일 칸에 새벽설교
// 날짜 칸을 누르면 그날 설교로(없으면 새로): 주일은 주일설교, 평일은 새벽설교
// 따로 저장하는 것은 없다: 이미 있는 설교의 날짜로 채운다 (플러터 screens/plan_view.dart 와 같은 화면)

const pad = n => String(n).padStart(2, '0')
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const plain = html => (html || '').replace(/<[^>]+>/g, '').trim()

// 항목마다 다른 색
export const PLAN_COLORS = { sermon: '#534AB7', progress: '#16A34A', worship: '#D97706', dawn: '#2563EB', cell: '#0D9488' }

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

export default function PlanView({ lang, sermons, dawns, worships, cells = [], onOpen, onCreate, isMobile = false }) {
  const ko = lang !== 'en'
  const now = new Date()
  const today = ymd(now)
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [progress, setProgress] = useState({}) // 설교 id → 내용이 있는 연구 단계 수
  const [picked, setPicked] = useState(today) // 휴대폰 폭: 누른 날짜

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
  const cellDates = new Set(cells.map(c => c.date).filter(Boolean))
  const total = SERMON_STEPS.length
  const move = n => setView(v => { const d = new Date(v.year, v.month + n, 1); return { year: d.getFullYear(), month: d.getMonth() } })
  const goToday = () => { setView({ year: now.getFullYear(), month: now.getMonth() }); setPicked(today) }

  const navBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 6, height: 28, padding: isMobile ? '0 8px' : '0 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }
  const dayNames = ko ? ['일', '월', '화', '수', '목', '금', '토'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const textOf = it => it.passage || it.title || (ko ? '본문 없음' : 'No passage')
  const line = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  // 날짜를 누르면: 주일은 주일설교, 평일은 새벽설교 — 있으면 열고 없으면 새로
  function go(date, isSunday) {
    const kind = isSunday ? 'sermon' : 'dawn'
    const found = (isSunday ? sermonsByDate : dawnsByDate)[date]?.[0]
    if (found) onOpen(kind, found.id)
    else onCreate(date, kind)
  }

  // 한 날짜의 내용 (큰 칸 안, 또는 휴대폰 아래 펼침)
  function DayContent({ date, isSunday, compact = false }) {
    const list = sermonsByDate[date] || []
    const dayDawns = dawnsByDate[date] || []
    const open = (kind, id) => e => { e.stopPropagation(); onOpen(kind, id) }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 0 }}>
        {list.map(s => {
          const done = progress[s.id] || 0
          return (
            <div key={s.id} onClick={open('sermon', s.id)} style={{ cursor: 'pointer' }}>
              <div style={{ ...line, fontSize: compact ? 15 : 14, fontWeight: 600, color: PLAN_COLORS.sermon }}>{textOf(s)}</div>
              <div style={{ ...line, fontSize: 11, color: PLAN_COLORS.progress }}>
                {ko ? `연구 ${done}/${total}` : `Research ${done}/${total}`}{plain(s.draft) ? (ko ? ' · 초안' : ' · Draft') : ''}
              </div>
            </div>
          )
        })}
        {isSunday && worshipDates.has(date) && <div style={{ fontSize: 11, color: PLAN_COLORS.worship }}>{ko ? '예배인도 O' : 'Worship O'}</div>}
        {isSunday && cellDates.has(date) && <div style={{ fontSize: 11, color: PLAN_COLORS.cell }}>{ko ? '교재작성 O' : 'Cell O'}</div>}
        {dayDawns.map(d => (
          <div key={d.id} onClick={open('dawn', d.id)} style={{ ...line, cursor: 'pointer', fontSize: compact ? 14 : 12, color: PLAN_COLORS.dawn }}>
            {ko ? '새벽 · ' : 'Dawn · '}{textOf(d)}
          </div>
        ))}
      </div>
    )
  }

  const dot = (color, filled = true) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: filled ? color : 'transparent', border: `1px solid ${color}`, boxSizing: 'border-box' }} />

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
          return (
            <div
              key={date}
              onClick={() => isMobile ? setPicked(date) : go(date, isSunday)}
              title={isMobile ? undefined : (isSunday ? (ko ? '눌러서 주일설교로' : 'Open sermon') : (ko ? '눌러서 새벽설교로' : 'Open dawn sermon'))}
              style={{
                borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                borderTop: color ? `3px solid ${color.hex}` : '3px solid transparent',
                padding: isMobile ? 4 : '4px 8px 6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3,
                background: isMobile && picked === date ? 'var(--accent-light)' : inMonth ? 'transparent' : 'var(--bg-sidebar)',
                opacity: inMonth ? 1 : 0.55, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 700 : 500, flexShrink: 0,
                  color: isToday ? '#fff' : isSunday ? '#dc2626' : 'var(--text)',
                  background: isToday ? 'var(--accent)' : 'transparent', borderRadius: 10, padding: isToday ? '0 6px' : 0,
                }}>{d.getDate()}</span>
                {!isMobile && season && <span style={{ ...line, fontSize: 10, color: color?.hex || 'var(--text-muted)' }}>{season}</span>}
              </div>
              {isMobile ? (
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {!!sermonsByDate[date]?.length && dot(PLAN_COLORS.sermon)}
                  {!!dawnsByDate[date]?.length && dot(PLAN_COLORS.dawn)}
                  {isSunday && worshipDates.has(date) && dot(PLAN_COLORS.worship)}
                  {isSunday && cellDates.has(date) && dot(PLAN_COLORS.cell)}
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
          <div onClick={() => go(picked, isSunday)} style={{ flex: 1, overflow: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border)', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-heading)', marginBottom: 8 }}>
              {ko ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})` : picked}
              {season && <span style={{ fontWeight: 400, fontSize: 12, color: getSeasonColor(season)?.hex, marginLeft: 8 }}>{season}</span>}
            </div>
            <DayContent date={picked} isSunday={isSunday} compact />
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
              {isSunday ? (ko ? '눌러서 주일설교로' : 'Tap to open sermon') : (ko ? '눌러서 새벽설교로' : 'Tap to open dawn sermon')}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
