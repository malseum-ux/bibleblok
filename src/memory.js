// 학습 메모리 — 저장 폴더의 settings.json 에 보관한다 (플러터 앱과 같은 곳)
// 예전에는 이 브라우저(localStorage)에만 있었고, 폴더를 처음 연결할 때 db.js 가 settings.json 으로 옮긴다.
import { getMemoryList, addMemoryEntry, deleteMemoryEntry, getAllMemoryLists } from './db'

const makeKey = (tab, stepKey) => `${tab}_${stepKey}`

export function getMemories(tab, stepKey) {
  return getMemoryList(makeKey(tab, stepKey))
}

export function addMemory(tab, stepKey, text) {
  return addMemoryEntry(makeKey(tab, stepKey), text)
}

export function deleteMemory(tab, stepKey, index) {
  return deleteMemoryEntry(makeKey(tab, stepKey), index)
}

export function buildMemoryPrompt(tab, stepKey) {
  const list = getMemories(tab, stepKey)
  if (list.length === 0) return ''
  const lines = list.map(m => `- ${m.text}`).join('\n')
  return `[작성자 학습 메모리 — 아래 내용을 항상 반영하세요]\n${lines}`
}

// [{ tab, stepKey, list }]
export function getAllMemories() {
  return getAllMemoryLists().map(({ key, list }) => {
    const i = key.indexOf('_')
    return { tab: key.slice(0, i), stepKey: key.slice(i + 1), list }
  })
}
