// 저장 폴더 — 브라우저 File System Access API (Chrome·Edge 만 지원)
// 플러터 앱(bibleblok_app/web/index.html)의 bb* 함수와 같은 동작이다.
// 폴더 핸들은 IndexedDB 에 보관해서, 새로고침 뒤에도 같은 폴더를 다시 연결한다.
// 경로는 항상 저장 폴더 기준 상대 경로, 구분자는 '/'.

let handle = null   // 연결된 저장 폴더
let stored = null   // 권한이 풀려 다시 허용을 기다리는 핸들

const IDB_NAME = 'bb-folders'
const IDB_STORE = 'handles'
const IDB_KEY = 'data'

export const folderSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE)
    req.onsuccess = e => res(e.target.result)
    req.onerror = e => rej(e.target.error)
  })
}

async function saveHandle(h) {
  try {
    const db = await openIDB()
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(h, IDB_KEY)
    await new Promise(r => { tx.oncomplete = r; tx.onerror = r })
    db.close()
  } catch (e) { console.warn('[bb] IDB save failed', e) }
}

async function loadHandle() {
  try {
    const db = await openIDB()
    const tx = db.transaction(IDB_STORE, 'readonly')
    const result = await new Promise((res, rej) => {
      const r = tx.objectStore(IDB_STORE).get(IDB_KEY)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    db.close()
    return result ?? null
  } catch { return null }
}

export function folderName() {
  return handle?.name ?? ''
}

// 폴더 선택 — 항상 새로 고른다. 폴더 이름 반환 (취소하면 예외)
export async function pickFolder() {
  if (!folderSupported) throw new Error('unsupported')
  const h = await window.showDirectoryPicker({ mode: 'readwrite' })
  handle = h
  stored = null
  await saveHandle(h)
  return h.name
}

// 새로고침 뒤 복원 — 권한이 살아 있으면 폴더 이름, 아니면 null
export async function restoreFolder() {
  if (handle) return handle.name
  const h = await loadHandle()
  if (!h) return null
  stored = h
  let perm = 'prompt'
  try { perm = await h.queryPermission({ mode: 'readwrite' }) } catch { /* 권한 확인 실패 = 다시 요청 */ }
  if (perm === 'granted') { handle = h; stored = null; return h.name }
  return null
}

export async function hasStoredFolder() {
  if (handle || stored) return true
  const h = await loadHandle()
  if (h) stored = h
  return !!h
}

// 권한 다시 요청 — 사용자 클릭 안에서 호출해야 한다
export async function requestPermission() {
  const h = stored || await loadHandle()
  if (!h) return null
  try {
    if (await h.requestPermission({ mode: 'readwrite' }) === 'granted') {
      handle = h; stored = null; return h.name
    }
  } catch { /* 거절 */ }
  return null
}

function parts(path) { return path.split('/').filter(s => s.length > 0) }

async function dirOf(ps, create) {
  let dir = handle
  for (const p of ps) dir = await dir.getDirectoryHandle(p, { create: !!create })
  return dir
}

// 하위 폴더까지 전체 목록 — { dirs, files } (숨김 항목 제외)
export async function listTree() {
  const dirs = [], files = []
  if (!handle) return { dirs, files }
  async function scan(dir, prefix) {
    for await (const entry of dir.values()) {
      if (entry.name.startsWith('.')) continue
      const path = prefix ? prefix + '/' + entry.name : entry.name
      if (entry.kind === 'directory') { dirs.push(path); await scan(entry, path) }
      else files.push(path)
    }
  }
  await scan(handle, '')
  return { dirs, files }
}

export async function readText(path) {
  if (!handle) return null
  try {
    const ps = parts(path)
    const dir = await dirOf(ps.slice(0, -1), false)
    const fh = await dir.getFileHandle(ps[ps.length - 1])
    return await (await fh.getFile()).text()
  } catch { return null }
}

// 파일 쓰기 (없으면 만들고, 중간 폴더도 만든다)
export async function writeText(path, text) {
  if (!handle) return false
  try {
    const ps = parts(path)
    const dir = await dirOf(ps.slice(0, -1), true)
    const fh = await dir.getFileHandle(ps[ps.length - 1], { create: true })
    const w = await fh.createWritable()
    await w.write(text)
    await w.close()
    return true
  } catch (e) { console.error('[bb] write error', path, e); return false }
}

export async function mkdir(path) {
  if (!handle) return false
  try { await dirOf(parts(path), true); return true }
  catch (e) { console.error('[bb] mkdir error', path, e); return false }
}

// 파일 또는 폴더 삭제 (폴더는 안의 내용까지)
export async function remove(path) {
  if (!handle) return false
  try {
    const ps = parts(path)
    const dir = await dirOf(ps.slice(0, -1), false)
    await dir.removeEntry(ps[ps.length - 1], { recursive: true })
    return true
  } catch (e) { console.error('[bb] delete error', path, e); return false }
}
