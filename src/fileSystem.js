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

const SEP = '___'

async function getOrCreateSubDir(parent, name) {
  return parent.getDirectoryHandle(sanitize(name), { create: true })
}

function buildFileName(tab, item) {
  const date = (item.date || '').replace(/-/g, '').slice(2)
  const name = tab === 'worship'
    ? '예배인도'
    : sanitize(item.title || item.passage || '제목없음')
  return `${date}_${name}${SEP}${item.id}.txt`
}

function formatContent(tab, item, steps) {
  const lines = []
  if (item.date)    lines.push(`날짜: ${item.date}`)
  if (item.title)   lines.push(`제목: ${item.title}`)
  if (item.passage) lines.push(`본문: ${item.passage}`)
  if (item.season)  lines.push(`절기: ${item.season}`)
  if (item.category) lines.push(`구분: ${item.category}`)
  lines.push('')

  const stepEntries = Object.entries(steps).sort((a, b) => Number(a[0]) - Number(b[0]))
  for (const [, content] of stepEntries) {
    if (content) {
      lines.push(content)
      lines.push('')
    }
  }
  return lines.join('\n')
}

export async function saveItemToDirectory(root, tab, item, steps) {
  try {
    const ok = await verifyPermission(root)
    if (!ok) return
    const tabDir  = await getOrCreateSubDir(root, TAB_DIRS[tab])
    const fileName = buildFileName(tab, item)
    const fh      = await tabDir.getFileHandle(fileName, { create: true })
    const writer  = await fh.createWritable()
    await writer.write(formatContent(tab, item, steps))
    await writer.close()
  } catch {}
}

export async function deleteItemFromDirectory(root, tab, itemId) {
  try {
    const tabDir = await root.getDirectoryHandle(TAB_DIRS[tab])
    for await (const [name, entry] of tabDir.entries()) {
      if (entry.kind === 'file' && name.includes(`${SEP}${itemId}.txt`)) {
        await tabDir.removeEntry(name)
        break
      }
    }
  } catch {}
}

export async function listTabFiles(root, tab) {
  try {
    const ok = await verifyPermission(root)
    if (!ok) return []
    const tabDir = await root.getDirectoryHandle(TAB_DIRS[tab])
    const files  = []
    for await (const [name, entry] of tabDir.entries()) {
      if (entry.kind === 'file' && name.endsWith('.txt')) {
        files.push({ name, handle: entry })
      }
    }
    return files.sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return []
  }
}

export async function readFileContent(handle) {
  try {
    const file = await handle.getFile()
    return await file.text()
  } catch {
    return null
  }
}
