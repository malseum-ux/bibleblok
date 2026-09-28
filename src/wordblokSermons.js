// 성경나침반(wordblok) 내설교 읽기·수정 — 설교작성 사이드 목록에 보여 주고, 고치면 원래 .scb 에 저장한다
// 플러터 앱(bibleblok_app/lib/services/wordblok_sermons.dart)과 같은 규칙.
//
// 내설교 폴더: .scb 파일(SQLite)들. 표 Bible(id, book, chapter, verse, btext, date)
//   btext = '[제목]\n\n본문' (앞 [제목] 이 제목)
// 폴더 핸들은 저장 폴더와 같은 IndexedDB(bb-folders)에 다른 키로 보관한다.
// 목록은 읽기 권한으로 읽고, 저장할 때 쓰기 권한을 묻는다 (저장 버튼 클릭 안에서).
import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const IDB_NAME = 'bb-folders'
const IDB_STORE = 'handles'
const IDB_KEY = 'wordblok-sermon'

let handle = null   // 연결된 내설교 폴더
let stored = null   // 권한이 풀려 다시 허용을 기다리는 핸들
let SQL = null
const dbs = new Map() // 파일 경로 → 열린 DB
const files = new Map() // 파일 경로 → 파일 핸들 (저장용)

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
  const h = await window.showDirectoryPicker({ mode: 'readwrite' })
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
  files.clear()
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
  files.set(path, entry)
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

// ── 수정 저장 ────────────────────────────────────────────────────

// 구절 글자 → 책·장·절 ('요 3:16', '요한복음 3장 16절')
const BOOK_NAMES = {
  창세기: 1, 출애굽기: 2, 레위기: 3, 민수기: 4, 신명기: 5, 여호수아: 6, 사사기: 7, 룻기: 8, 사무엘상: 9, 사무엘하: 10,
  열왕기상: 11, 열왕기하: 12, 역대상: 13, 역대하: 14, 에스라: 15, 느헤미야: 16, 에스더: 17, 욥기: 18, 시편: 19, 잠언: 20,
  전도서: 21, 아가: 22, 이사야: 23, 예레미야: 24, 예레미야애가: 25, 에스겔: 26, 다니엘: 27, 호세아: 28, 요엘: 29, 아모스: 30,
  오바댜: 31, 요나: 32, 미가: 33, 나훔: 34, 하박국: 35, 스바냐: 36, 학개: 37, 스가랴: 38, 말라기: 39,
  마태복음: 40, 마가복음: 41, 누가복음: 42, 요한복음: 43, 사도행전: 44, 로마서: 45, 고린도전서: 46, 고린도후서: 47,
  갈라디아서: 48, 에베소서: 49, 빌립보서: 50, 골로새서: 51, 데살로니가전서: 52, 데살로니가후서: 53, 디모데전서: 54, 디모데후서: 55,
  디도서: 56, 빌레몬서: 57, 히브리서: 58, 야고보서: 59, 베드로전서: 60, 베드로후서: 61, 요한일서: 62, 요한이서: 63, 요한삼서: 64,
  유다서: 65, 요한계시록: 66, 계시록: 66, 마태: 40, 마가: 41, 누가: 42, 요한: 43,
}
BOOK_ABBR.forEach((a, i) => { if (a) BOOK_NAMES[a] = i })
const NAME_RE = new RegExp(
  `^\\s*(${Object.keys(BOOK_NAMES).sort((a, b) => b.length - a.length).join('|')})\\s*(\\d{1,3})(?:\\s*[장:]\\s*(\\d{1,3}))?`,
)

export function parsePassage(text) {
  const m = NAME_RE.exec(text ?? '')
  if (!m) return null
  return { book: BOOK_NAMES[m[1]], chapter: parseInt(m[2]), verse: m[3] ? parseInt(m[3]) : 1 }
}

/**
 * 설교 한 편을 고쳐 원래 .scb 에 저장한다 (앞 [제목] 줄은 그대로 두고 본문만 바꾼다).
 * refText 를 못 알아보면 구절은 그대로. 저장 버튼 클릭 안에서 불러야 쓰기 권한 창이 뜬다.
 * 반환: 바뀐 { book, chapter, verse }
 */
export async function saveWordblokSermon(path, id, refText, text) {
  const db = dbs.get(path)
  const fh = files.get(path)
  if (!db || !fh || !handle) throw new Error('설교 파일이 열려 있지 않습니다')
  if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('쓰기 권한이 없습니다')
  const res = db.exec('SELECT book, chapter, verse, btext FROM Bible WHERE id = ?', [id])
  const [book0, chapter0, verse0, btext0] = res[0]?.values?.[0] ?? []
  const header = /^\s*\[[^\]]*\]\s*(\[[^\]]*\]\s*)?\n*/.exec(String(btext0 ?? ''))?.[0] ?? ''
  const ref = parsePassage(refText) ?? { book: book0, chapter: chapter0, verse: verse0 }
  db.run('UPDATE Bible SET book = ?, chapter = ?, verse = ?, btext = ? WHERE id = ?',
    [ref.book, ref.chapter, ref.verse, header + text, id])
  const w = await fh.createWritable()
  await w.write(db.export())
  await w.close()
  return ref
}

// ── 설교작성 화면(StepView)으로 열 때 ─────────────────────────────────

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** .scb 글 → 초안 HTML (줄 하나 = 문단 하나, 설교문 초안과 같은 문단 모양) */
export function textToDraftHtml(text) {
  return (text ?? '').split('\n').filter(l => l.trim()).map(l => `<p>${esc(l)}</p>`).join('')
}

/** 초안 HTML → .scb 글 (문단은 줄바꿈, 서식은 버림) */
export function draftHtmlToText(html) {
  if (!(html ?? '').trimStart().startsWith('<')) return (html ?? '').trim()
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 쓰기 권한 미리 받기 — 설교를 누른 클릭 안에서 불러야 권한 창이 뜬다 (초안은 나중에 저절로 저장되므로) */
export async function requestWordblokWrite() {
  if (!handle) return false
  try { return await handle.requestPermission({ mode: 'readwrite' }) === 'granted' } catch { return false }
}
