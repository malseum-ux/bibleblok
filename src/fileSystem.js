// 로컬 폴더 저장 (File System Access API — Chrome/Edge 데스크톱 전용)

const FS_DB_NAME = 'sermonblok-fs-db'
const FS_DB_VER  = 1
const FS_STORE   = 'handles'
const FS_KEY     = 'rootDir'

export function isFileSystemSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

function openFsDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, FS_DB_VER)
    req.onupgradeneeded = () => req.result.createObjectStore(FS_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function saveRootHandle(handle) {
  const db = await openFsDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_STORE, 'readwrite')
    tx.objectStore(FS_STORE).put(handle, FS_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function loadRootHandle() {
  try {
    const db = await openFsDb()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(FS_STORE, 'readonly')
      const req = tx.objectStore(FS_STORE).get(FS_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror   = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function clearRootHandle() {
  try {
    const db = await openFsDb()
    await new Promise(resolve => {
      const tx = db.transaction(FS_STORE, 'readwrite')
      tx.objectStore(FS_STORE).delete(FS_KEY)
      tx.oncomplete = () => resolve()
    })
  } catch {}
}

export async function pickRootDirectory() {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    await saveRootHandle(handle)
    return handle
  } catch {
    return null
  }
}

export async function verifyPermission(handle) {
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return true
    const req = await handle.requestPermission({ mode: 'readwrite' })
    return req === 'granted'
  } catch {
    return false
  }
}

function sanitize(name) {
  return (name || '').replace(/[/\\:*?"<>|]/g, '_').trim() || 'untitled'
}

const TAB_DIRS = {
  sermon:  '설교작성',
  worship: '예배인도',
  dawn:    '새벽설교',
}

async function getOrCreateSubDir(parent, name) {
  return parent.getDirectoryHandle(sanitize(name), { create: true })
}

export function buildFileBaseName(tab, item) {
  const date = (item.date || '').replace(/-/g, '').slice(2)
  const name = tab === 'worship'
    ? '예배인도'
    : sanitize(item.title || item.passage || '제목없음')
  return `${date}_${name}`
}

function buildFileName(tab, item) {
  return `${buildFileBaseName(tab, item)}.json`
}

function buildSblFileName(tab, item) {
  return `${buildFileBaseName(tab, item)}.sbl`
}

export function buildJsonContent(tab, item, steps) {
  return JSON.stringify({
    version: 1,
    tab,
    savedAt: new Date().toISOString(),
    item: {
      date: item.date || null,
      title: item.title || null,
      passage: item.passage || null,
      season: item.season || null,
      category: item.category || null,
      emphasis: item.emphasis || null,
      draft: item.draft || null,
    },
    steps,
  }, null, 2)
}

export function parseJsonFile(text) {
  try {
    const data = JSON.parse(text)
    if (data.version !== 1 || !data.item) return null
    return { tab: data.tab, item: data.item, steps: data.steps || {} }
  } catch {
    return null
  }
}

export function parseSblMeta(text) {
  const lines = text.split('\n')
  const meta = {}
  for (const line of lines.slice(0, 10)) {
    if (line.startsWith('날짜: ')) meta.date = line.slice(4).trim()
    else if (line.startsWith('제목: ')) meta.title = line.slice(4).trim()
    else if (line.startsWith('본문: ')) meta.passage = line.slice(4).trim()
    else if (line.startsWith('절기: ')) meta.season = line.slice(4).trim()
    else if (line.startsWith('구분: ')) meta.category = line.slice(4).trim()
  }
  return meta
}

export async function saveItemToDirectory(root, tab, item, steps) {
  try {
    const ok = await verifyPermission(root)
    if (!ok) return
    const tabDir  = await getOrCreateSubDir(root, TAB_DIRS[tab])
    const fileName = buildFileName(tab, item)
    const fh      = await tabDir.getFileHandle(fileName, { create: true })
    const writer  = await fh.createWritable()
    await writer.write(buildJsonContent(tab, item, steps))
    await writer.close()
  } catch {}
}

export async function deleteItemFromDirectory(root, tab, item) {
  try {
    const tabDir = await root.getDirectoryHandle(TAB_DIRS[tab])
    try { await tabDir.removeEntry(buildFileName(tab, item)) } catch {}
    try { await tabDir.removeEntry(buildSblFileName(tab, item)) } catch {}
  } catch {}
}

export async function listTabFiles(root, tab) {
  try {
    const ok = await verifyPermission(root)
    if (!ok) return []
    const tabDir = await root.getDirectoryHandle(TAB_DIRS[tab])
    const files  = []
    for await (const [name, entry] of tabDir.entries()) {
      if (entry.kind === 'file' && (name.endsWith('.json') || name.endsWith('.sbl'))) {
        files.push({ name, handle: entry, type: name.endsWith('.json') ? 'json' : 'sbl' })
      }
    }
    return files.sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return []
  }
}

export async function deleteFileFromDir(root, tab, fileName) {
  try {
    const tabDir = await root.getDirectoryHandle(TAB_DIRS[tab])
    await tabDir.removeEntry(fileName)
  } catch {}
}

export async function readFileContent(handle) {
  try {
    const file = await handle.getFile()
    return await file.text()
  } catch {
    return null
  }
}
