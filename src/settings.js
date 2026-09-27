const KEY = 'bibleblok-settings'

const DEFAULTS = {
  theme: 'system',
  lang: 'ko',
}

// 성경 번역본 — 고르지 않고 언어에 따라 정해진다 (한국어 개역개정, 영어 ESV)
export function bibleFor(lang) {
  return lang === 'en' ? 'ESV' : '개역개정성경'
}

export function getSettings() {
  let stored = {}
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') } catch { /* 망가진 값은 기본값으로 */ }
  const { theme, lang } = { ...DEFAULTS, ...stored }
  return { theme, lang, bible: bibleFor(lang) }
}

export function saveSettings(patch) {
  const { theme, lang } = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify({ theme, lang }))
  return { theme, lang, bible: bibleFor(lang) }
}

export function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}
