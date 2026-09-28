// 성경나침반(wordblok) 내설교 읽기 — 설교작성 사이드 목록에 보여 준다 (읽기 전용)
// 플러터 앱(bibleblok_app/lib/services/wordblok_sermons.dart)과 같은 규칙.
//
// 내설교 폴더: .scb 파일(SQLite)들. 표 Bible(id, book, chapter, verse, btext, date)
//   btext = '[제목]\n\n본문' (앞 [제목] 이 제목)
// 폴더 핸들은 저장 폴더와 같은 IndexedDB(bb-folders)에 다른 키로 보관한다. 읽기 권한만 쓴다.
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const IDB_NAME = 'bb-folders'
const IDB_STORE = 'handles'
const IDB_KEY = 'wordblok-sermon'

let handle = null   // 연결된 내설교 폴더
let stored = null   // 권한이 풀려 다시 허용을 기다리는 핸들
let SQL = null
const dbs = new Map() // 파일 경로 → 열린 DB

// 책 번호 → 약칭 (본문 표시용)
const BOOK_ABBR = [
  '', '창', '출', '레', '민', '신', '수', '삿', '룻', '삼상', '삼하', '왕상', '왕하', '대상', '대하', '스', '느', '에', '욥', '시', '잠',
  '전', '아', '사', '렘', '애', '겔', '단', '호', '욜', '암', '옵', '욘', '미', '나', '합', '습', '학', '슥', '말',
  '마', '막', '눅', '요', '행', '롬', '고전', '고후', '갈', '엡', '빌', '골', '살전', '살후', '딤전', '딤후', '딛', '몬', '히', '약',
  '벧전', '벧후', '요일', '요이', '요삼', '유', '계',
]

export function passageLabel(s) {
  return BOOK_ABBR[s.book] ? `${BOOK_ABBR[s.book]} ${s.chapter}:${s.verse}` : ''
}

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

export function wordblokFolderName() {
  return handle?.name ?? ''
}

/** 권한이 풀려 다시 허용을 기다리는 중인지 */
export function wordblokPermissionNeeded() {
  return !handle && !!stored
}

// 폴더 선택 — 폴더 이름 반환 (취소하면 예외)
export async function pickWordblokFolder() {
  const h = await window.showDirectoryPicker({ mode: 'read' })
  handle = h
  stored = null
  dbs.clear()
  await saveHandle(h)
  return h.name
}

// 새로고침 뒤 복원 — 권한이 살아 있으면 폴더 이름, 아니면 null
export async function restoreWordblokFolder() {
  if (handle) return handle.name
  const h = await loadHandle()
  if (!h) return null
  stored = h
  let perm = 'prompt'
  try { perm = await h.queryPermission({ mode: 'read' }) } catch { /* 다시 요청 */ }
  if (perm === 'granted') { handle = h; stored = null; return h.name }
  return null
}

// 권한 다시 요청 — 사용자 클릭 안에서 호출해야 한다
export async function requestWordblokPermission() {
  const h = stored || await loadHandle()
  if (!h) return null
  try {
    if (await h.requestPermission({ mode: 'read' }) === 'granted') {
      handle = h; stored = null; return h.name
    }
  } catch { /* 거절 */ }
  return null
}

/** 새로고침: 열어 둔 파일을 닫아 다시 읽게 한다 */
export function clearWordblokCache() {
  for (const db of dbs.values()) { try { db.close() } catch { /* 무시 */ } }
  dbs.clear()
}

async function listScb() {
  const out = []
  async function scan(dir, prefix) {
    for await (const entry of dir.values()) {
      if (entry.name.startsWith('.')) continue
      const path = prefix ? prefix + '/' + entry.name : entry.name
      if (entry.kind === 'directory') await scan(entry, path)
      else if (entry.name.toLowerCase().endsWith('.scb')) out.push({ path, entry })
    }
  }
  await scan(handle, '')
  return out.sort((a, b) => a.path.localeCompare(b.path, 'ko'))
}

async function openDb(path, entry) {
  if (dbs.has(path)) return dbs.get(path)
  if (!SQL) SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const buf = new Uint8Array(await (await entry.getFile()).arrayBuffer())
  const db = new SQL.Database(buf)
  dbs.set(path, db)
  return db
}

const TITLE_RE = /^\s*\[([^\]]+)\]/

/**
 * 파일별 설교 목록 (본문은 빼고 제목·날짜·구절만)
 * [{ file: '2000 양성득설교', path, items: [{ key, path, id, title, date, book, chapter, verse }] }]
 */
export async function loadWordblokSermons() {
  if (!handle) return []
  const groups = []
  for (const { path, entry } of await listScb()) {
    const file = path.split('/').pop().replace(/\.scb$/i, '')
    const items = []
    try {
      const db = await openDb(path, entry)
      const res = db.exec('SELECT id, book, chapter, verse, substr(btext, 1, 200), date FROM Bible ORDER BY date, id')
      for (const [id, book, chapter, verse, head, date] of res[0]?.values ?? []) {
        const m = TITLE_RE.exec(head ?? '')
        items.push({
          key: `${path}#${id}`, path, id,
          title: m ? m[1].trim() : file,
          date: date ?? '',
          book, chapter, verse,
        })
      }
    } catch (e) { console.warn('[bb] scb read failed', path, e) }
    if (items.length > 0) groups.push({ file, path, items })
  }
  return groups
}

/** 설교 한 편의 본문 (앞 [제목] 줄은 뺀다) */
export async function readWordblokSermon(path, id) {
  const db = dbs.get(path)
  if (!db) return ''
  const res = db.exec('SELECT btext FROM Bible WHERE id = ?', [id])
  const btext = String(res[0]?.values?.[0]?.[0] ?? '')
  return btext.replace(/^\s*\[[^\]]*\]\s*(\[[^\]]*\]\s*)?\n*/, '').trim()
}
