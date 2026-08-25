const PREFIX = 'memory_'

function makeKey(tab, stepKey) {
  return `${PREFIX}${tab}_${stepKey}`
}

export function getMemories(tab, stepKey) {
  try {
    const raw = localStorage.getItem(makeKey(tab, stepKey))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addMemory(tab, stepKey, text) {
  if (!text?.trim()) return
  const list = getMemories(tab, stepKey)
  list.push({ text: text.trim(), date: new Date().toISOString().slice(0, 10) })
  localStorage.setItem(makeKey(tab, stepKey), JSON.stringify(list))
}

export function deleteMemory(tab, stepKey, index) {
  const list = getMemories(tab, stepKey)
  list.splice(index, 1)
  if (list.length === 0) localStorage.removeItem(makeKey(tab, stepKey))
  else localStorage.setItem(makeKey(tab, stepKey), JSON.stringify(list))
}

export function buildMemoryPrompt(tab, stepKey) {
  const list = getMemories(tab, stepKey)
  if (list.length === 0) return ''
  const lines = list.map(m => `- ${m.text}`).join('\n')
  return `[작성자 학습 메모리 — 아래 내용을 항상 반영하세요]\n${lines}`
}

export function getAllMemories() {
  const result = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    const rest = key.slice(PREFIX.length)
    const sepIdx = rest.indexOf('_')
    if (sepIdx === -1) continue
    const tab = rest.slice(0, sepIdx)
    const stepKey = rest.slice(sepIdx + 1)
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]')
      result.push({ tab, stepKey, list })
    } catch { /* skip */ }
  }
  return result
}
