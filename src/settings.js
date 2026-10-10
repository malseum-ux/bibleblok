const KEY = 'bibleblok-settings'

const DEFAULTS = {
  theme: 'system',
  lang: 'ko',
  fontSize: 15,
}

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
  const { theme, lang, fontSize } = { ...DEFAULTS, ...stored }
  return { theme, lang, fontSize: clampFont(fontSize), bible: bibleFor(lang) }
}

export function saveSettings(patch) {
  const { theme, lang, fontSize } = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify({ theme, lang, fontSize: clampFont(fontSize) }))
  return { theme, lang, fontSize: clampFont(fontSize), bible: bibleFor(lang) }
}

export function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
