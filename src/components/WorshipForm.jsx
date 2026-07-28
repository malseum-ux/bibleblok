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

  // 사순절: 부활절 46일 전 (재의 수요일) ~ 부활절 전날
  const ashWed = new Date(easterMs - 46 * dayMs)
  // 성주간: 부활절 7일 전 주일(종려주일) ~ 부활절 전날
  const palmSunday = new Date(easterMs - 7 * dayMs)
  // 부활절 기간: 부활절 ~ 오순절 (49일 후)
  const pentecost = new Date(easterMs + 49 * dayMs)
  // 대림절: 성탄절 전 4번째 주일 ~ 12/24
  const christmas = new Date(year, 11, 25)
  const adventStart = new Date(christmas.getTime() - (christmas.getDay() === 0 ? 28 : (christmas.getDay() + 28 - (christmas.getDay() % 7 || 7))) * dayMs)
  // 대림절 시작: 성탄절에서 가장 가까운 이전 일요일 기준 4주 전
  const christmasDow = christmas.getDay() // 0=일
  const daysToAdvent = christmasDow === 0 ? 28 : christmasDow + 21
  const advent = new Date(christmas.getTime() - daysToAdvent * dayMs)

  // 특별 날짜 체크
  if (month === 12 && day === 25) return '성탄절'
  if (month === 12 && day === 24) return '성탄전야'
  if (month === 1 && day === 1) return '신년주일'
  if (month === 1 && day === 6) return '주현절'

  // 추수감사주일: 11월 셋째 주일
  if (month === 11) {
    const nov1 = new Date(year, 10, 1)
    const firstSunday = (7 - nov1.getDay()) % 7
    const thirdSunday = firstSunday + 14 + 1
    if (day >= thirdSunday && day < thirdSunday + 7 && date.getDay() === 0) return '추수감사주일'
  }

  // 종교개혁주일: 10월 31일에 가장 가까운 주일
  if (month === 10) {
    const oct31 = new Date(year, 9, 31)
    const dow = oct31.getDay()
    const reformSunday = dow <= 3
      ? new Date(oct31.getTime() - dow * dayMs)
      : new Date(oct31.getTime() + (7 - dow) * dayMs)
    if (date.toDateString() === reformSunday.toDateString()) return '종교개혁주일'
  }

  if (dateMs >= advent.getTime() && (month < 12 || day < 25)) return '대림절'
  if ((month === 12 && day > 25) || (month === 1 && day < 6)) return '성탄절'
  if (month === 1 && day >= 7 && dateMs < ashWed.getTime()) return '주현절'
  if (month === 2 && dateMs < ashWed.getTime()) return '주현절'
  if (dateMs >= palmSunday.getTime() && dateMs < easterMs) return '성주간'
  if (dateMs >= ashWed.getTime() && dateMs < palmSunday.getTime()) return '사순절'
  if (dateMs >= easterMs && dateMs < pentecost.getTime()) return '부활절'
  if (dateMs >= pentecost.getTime()) return '성령강림절'
  return '일반 주일'
}

// 성서정과 Claude API 조회
async function fetchLectionary(date, season, lang, bible) {
  const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!API_KEY) throw new Error('API_KEY_MISSING')

  const year = new Date(date).getFullYear()
  // RCL 주기 계산: A=2022,2025,2028... B=2023,2026... C=2024,2027...
  const cycle = ['A', 'B', 'C'][(year - 2022) % 3] || 'A'

  const prompt = `개정 공동 성구집(RCL) ${cycle}년 주기를 기준으로, ${date} (${season || '일반 주일'})의 성서정과 본문을 알려주세요.
구약/시편/서신서/복음서 각 1개씩, 성경 장절 형식으로만 간결하게 답하세요. 설명 없이 본문 목록만 작성하세요.
예시 형식: 사 40:1-11 | 시 85:1-2, 8-13 | 막 1:1-8 | 빌 1:3-11
번역본: ${bible || '개역개정성경'}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error('API error')
  const data = await response.json()
  return data.content?.[0]?.text?.trim() || ''
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={labelStyle}>{lang === 'ko' ? '날짜' : 'Date'}</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="date"
            style={{ ...inputStyle, paddingRight: 36 }}
            value={form.date}
            onChange={e => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>{lang === 'ko' ? '교회력 절기' : 'Church Season'}</label>
        <input
          type="text"
          style={{ ...inputStyle, background: 'var(--bg-sidebar)', color: 'var(--accent)', fontWeight: 600 }}
          value={form.season}
          onChange={e => set('season', e.target.value)}
          placeholder={lang === 'ko' ? '날짜 선택 시 자동 입력' : 'Auto-filled from date'}
        />
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
