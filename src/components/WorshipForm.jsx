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

// 부활절 날짜 계산 (Anonymous Gregorian algorithm)
function getEaster(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function getChurchSeason(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const easter = getEaster(year)
  const easterMs = easter.getTime()
  const dateMs = date.getTime()
  const dayMs = 86400000

  const ashWed = new Date(easterMs - 46 * dayMs)
  const palmSunday = new Date(easterMs - 7 * dayMs)
  const pentecost = new Date(easterMs + 49 * dayMs)

  const christmas = new Date(year, 11, 25)
  const christmasDow = christmas.getDay()
  const daysToAdvent = christmasDow === 0 ? 28 : christmasDow + 21
  const advent = new Date(christmas.getTime() - daysToAdvent * dayMs)

  // 고정 날짜
  if (month === 12 && day === 25) return '성탄절'
  if (month === 12 && day === 24) return '성탄전야'
  if (month === 1 && day === 1) return '신년주일'
  if (month === 1 && day === 6) return '주현절'

  // 대림절 (성탄절 전 넷째 주일 ~ 성탄전야)
  if (dateMs >= advent.getTime() && (month < 12 || day < 24)) return '대림절'

  // 성탄절 기간 (성탄절 이튿날 ~ 주현절 전날)
  if ((month === 12 && day > 25) || (month === 1 && day <= 5)) return '성탄절'

  // 추수감사주일: 11월 셋째 주일
  if (month === 11) {
    const nov1 = new Date(year, 10, 1)
    const firstSunday = (7 - nov1.getDay()) % 7
    const thirdSundayDay = firstSunday + 14 + 1
    if (day >= thirdSundayDay && day < thirdSundayDay + 7 && date.getDay() === 0) return '추수감사주일'
  }

  // 종교개혁주일: 10월 31일에 가장 가까운 주일 (11월 초에 걸릴 수 있음)
  {
    const oct31 = new Date(year, 9, 31)
    const oct31dow = oct31.getDay()
    const reformSunday = oct31dow <= 3
      ? new Date(oct31.getTime() - oct31dow * dayMs)
      : new Date(oct31.getTime() + (7 - oct31dow) * dayMs)
    if (date.toDateString() === reformSunday.toDateString()) return '종교개혁주일'
  }

  // 성령강림주일 (오순절 당일) — 빨강
  if (date.toDateString() === pentecost.toDateString()) return '성령강림주일'

  // 주현절 기간: 1/7 ~ 재의 수요일 전날 (3월 초까지 포함)
  const jan7 = new Date(year, 0, 7)
  if (dateMs >= jan7.getTime() && dateMs < ashWed.getTime()) return '주현절'

  // 사순절: 재의 수요일 ~ 종려주일 전날
  if (dateMs >= ashWed.getTime() && dateMs < palmSunday.getTime()) return '사순절'

  // 성주간: 종려주일 ~ 부활절 전날
  if (dateMs >= palmSunday.getTime() && dateMs < easterMs) return '성주간'

  // 부활절: 부활절 ~ 오순절 전날
  if (dateMs >= easterMs && dateMs < pentecost.getTime()) return '부활절'

  // 오순절 이후: 삼위일체 주일 / 오순절 후 N번째 주일
  if (dateMs > pentecost.getTime()) {
    const dayOfWeek = date.getDay()
    const thisSunday = new Date(dateMs - dayOfWeek * dayMs)
    const weeksSincePentecost = Math.round((thisSunday.getTime() - pentecost.getTime()) / (7 * dayMs))
    if (weeksSincePentecost === 0) return '성령강림절'
    if (weeksSincePentecost === 1) return '삼위일체 주일'
    return `오순절 후 ${weeksSincePentecost}번째 주일`
  }

  return '일반 주일'
}

function getSeasonColor(season) {
  if (season?.startsWith('오순절 후')) return { label: '초록', hex: '#16A34A' }
  const map = {
    '대림절':       { label: '보라', hex: '#7C3AED' },
    '성탄절':       { label: '흰색', hex: '#D97706' },
    '성탄전야':     { label: '흰색', hex: '#D97706' },
    '신년주일':     { label: '흰색', hex: '#D97706' },
    '주현절':       { label: '초록', hex: '#16A34A' },
    '사순절':       { label: '보라', hex: '#7C3AED' },
    '성주간':       { label: '자주', hex: '#9F1239' },
    '부활절':       { label: '흰색', hex: '#D97706' },
    '성령강림주일': { label: '빨강', hex: '#DC2626' },
    '성령강림절':   { label: '초록', hex: '#16A34A' },
    '삼위일체 주일':{ label: '흰색', hex: '#D97706' },
    '추수감사주일': { label: '초록', hex: '#16A34A' },
    '종교개혁주일': { label: '빨강', hex: '#DC2626' },
    '일반 주일':    { label: '초록', hex: '#16A34A' },
  }
  return map[season] || null
}

// 성서정과 AI 조회
async function fetchLectionary(date, season, lang, bible) {
  const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || ''
  if (!API_KEY) throw new Error('API_KEY_MISSING')

  const year = new Date(date).getFullYear()
  const cycle = ['A', 'B', 'C'][(year - 2022) % 3] || 'A'

  const prompt = `개정 공동 성구집(RCL) ${cycle}년 주기를 기준으로, ${date} (${season || '일반 주일'})의 성서정과 본문을 알려주세요.
구약/시편/서신서/복음서 각 1개씩, 성경 장절 형식으로만 간결하게 답하세요. 설명 없이 본문 목록만 작성하세요.
예시 형식: 사 40:1-11 | 시 85:1-2, 8-13 | 막 1:1-8 | 빌 1:3-11
번역본: ${bible || '개역개정성경'}`

  const response = await fetch('/api/openrouter/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error('API error')
  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

export default function WorshipForm({ worship, onSave, lang }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState(() => {
    const date = worship?.date || today
    const season = worship?.season || getChurchSeason(date)
    return {
      date,
      season,
      lectionary: worship?.lectionary || '',
    }
  })
  const [loadingLectionary, setLoadingLectionary] = useState(false)
  const dateRef = { current: null }

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function handleDateChange(val) {
    const season = getChurchSeason(val)
    setForm(prev => ({ ...prev, date: val, season }))
  }

  async function autoFillLectionary() {
    setLoadingLectionary(true)
    try {
      const result = await fetchLectionary(form.date, form.season, lang, form.bible)
      set('lectionary', result)
    } catch {
      // API 키 없거나 오류 시 무시
    } finally {
      setLoadingLectionary(false)
    }
  }

  const seasonColor = getSeasonColor(form.season)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>{lang === 'ko' ? '날짜' : 'Date'}</label>
          <input
            type="date"
            style={inputStyle}
            value={form.date}
            onChange={e => handleDateChange(e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>{lang === 'ko' ? '교회력 절기' : 'Church Season'}</label>
          <div style={{
            ...inputStyle,
            background: 'var(--bg-sidebar)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'default',
          }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{form.season || (lang === 'ko' ? '날짜 선택 시 자동 입력' : 'Auto-filled')}</span>
            {seasonColor && (
              <span style={{ color: seasonColor.hex, fontSize: 13, fontWeight: 500 }}>
                ({seasonColor.label})
              </span>
            )}
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>{lang === 'ko' ? '성서정과 본문' : 'Lectionary'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            style={{ ...inputStyle, flex: 1 }}
            placeholder={lang === 'ko' ? '예: 사 40:1-11 | 시 85 | 막 1:1-8' : 'E.g. Isa 40:1-11 | Ps 85 | Mark 1:1-8'}
            value={form.lectionary}
            onChange={e => set('lectionary', e.target.value)}
          />
          <button
            onClick={autoFillLectionary}
            disabled={loadingLectionary}
            title={lang === 'ko' ? 'AI로 성서정과 조회' : 'Auto-fill lectionary'}
            style={{
              flexShrink: 0,
              background: loadingLectionary ? 'var(--border)' : 'var(--accent)',
              color: loadingLectionary ? 'var(--text-muted)' : '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '0 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: loadingLectionary ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loadingLectionary ? '조회 중...' : 'AI 조회'}
          </button>
        </div>
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
