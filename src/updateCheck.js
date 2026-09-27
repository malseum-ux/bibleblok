// 업데이트 확인 (웹) — 배포된 페이지의 앱 파일 이름을 지금 열린 페이지와 비교한다
// 빌드할 때마다 앱 파일 이름(index-XXXX.js)이 바뀌므로, 다르면 새 버전이 올라온 것이다.
// (플러터 앱은 Supabase app_releases 표의 버전과 비교한다 — lib/services/update_check.dart)

/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0'

function appScript(doc) {
  const srcs = [...doc.querySelectorAll('script[type="module"][src]')].map(s => s.getAttribute('src'))
  return srcs.find(src => /\/assets\/index-[^/]+\.js$/.test(src)) || null
}

// 지금 열린 페이지의 빌드 표시 (개발 중이면 'dev')
export function currentBuild() {
  const src = appScript(document)
  return src ? src.match(/index-([^/.]+)\.js$/)[1].slice(0, 8) : 'dev'
}

// { hasUpdate } — 새 버전이 올라왔으면 true. 확인하지 못하면 예외
export async function checkWebUpdate() {
  const current = appScript(document)
  if (!current) return { hasUpdate: false } // 개발 중
  const res = await fetch(`/?_=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const latest = appScript(new DOMParser().parseFromString(await res.text(), 'text/html'))
  return { hasUpdate: !!latest && latest !== current }
}
