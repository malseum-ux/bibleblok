const KEY = 'bibleblok-settings'

const DEFAULTS = {
  theme: 'system',
  lang: 'ko',
  fontSize: 15,
  speechRate: 300,       // 설교 속도 — 1분에 읽는 글자 수 (느림 250 · 보통 300 · 빠름 350)
  showSermonTime: true,  // 우측 초안창에 예상 설교 시간 보이기
}

export const SPEECH_RATES = [250, 300, 350]
const cleanRate = n => (SPEECH_RATES.includes(Number(n)) ? Number(n) : DEFAULTS.speechRate)

// 글꼴 크기 범위 — 설정 화면과 화면 위 A-·A+ 버튼이 같은 값을 바꾼다
export const FONT_MIN = 11
export const FONT_MAX = 24
const clampFont = n => Math.min(FONT_MAX, Math.max(FONT_MIN, Number(n) || DEFAULTS.fontSize))

// 성경 번역본 — 고르지 않고 언어에 따라 정해진다 (한국어 개역개정, 영어 ESV)
export function bibleFor(lang) {
  return lang === 'en' ? 'ESV' : '개역개정성경'
}

export function getSettings() {
  let stored = {}
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* 망가진 값은 기본값으로 */ }
  const { theme, lang, fontSize, speechRate, showSermonTime } = { ...DEFAULTS, ...stored }
  return { theme, lang, fontSize: clampFont(fontSize), speechRate: cleanRate(speechRate), showSermonTime: showSermonTime !== false, bible: bibleFor(lang) }
}

export function saveSettings(patch) {
  const { theme, lang, fontSize, speechRate, showSermonTime } = { ...getSettings(), ...patch }
  const saved = { theme, lang, fontSize: clampFont(fontSize), speechRate: cleanRate(speechRate), showSermonTime: showSermonTime !== false }
  localStorage.setItem(KEY, JSON.stringify(saved))
  return { ...saved, bible: bibleFor(lang) }
}

// 예상 설교 시간 — 공백을 뺀 글자 수 ÷ 1분에 읽는 글자 수 (반올림, 최소 1분)
export function sermonMinutes(chars, rate) {
  return chars > 0 ? Math.max(1, Math.round(chars / rate)) : 0
}

export function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
