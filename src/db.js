// 저장소 — 사용자가 고른 저장 폴더에 파일로 저장한다 (플러터 앱 services/store.dart 와 같은 구조·같은 파일 형식)
//
// 저장 폴더 구조
//   설교작성/ 예배인도/ 새벽설교/ 교재작성/   ← 탭별 폴더
//     <사이드바 폴더>/<하위 폴더>/날짜 제목.json   ← 사이드바 폴더 = 실제 폴더
//   settings.json                              ← 기억된 지시어·학습 메모리·사용자 지시항목
//
// 화면 코드가 쓰는 함수 이름(getSermons, saveSermonStep ...)은 예전 Supabase 시절과 같다.
// 폴더 id 는 '탭:경로' (예: 'sermon:로마서/1장') — 플러터 백업 형식과 같다.
import * as fs from './folderFs'
import { SERMON_STEPS, DAWN_STEPS } from './constants'

const TABS = ['sermon', 'worship', 'dawn', 'cell']
const TAB_DIRS = { sermon: '설교작성', worship: '예배인도', dawn: '새벽설교', cell: '교재작성' }
const SETTINGS_FILE = 'settings.json'
const FIELDS = ['date', 'category', 'title', 'passage', 'emphasis', 'season', 'lectionary', 'draft']

const items = { sermon: [], worship: [], dawn: [], cell: [] }     // 파일 한 개 = 항목 한 개
const folders = { sermon: [], worship: [], dawn: [], cell: [] }   // 탭 폴더 기준 상대 경로
const settings = { defaultKeywords: {}, memories: {}, customStepItems: [] }

// ── 경로 도우미 ──────────────────────────────────────────────────────────────

const join = (a, b) => (!a ? b : !b ? a : `${a}/${b}`)
const parentOf = p => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')
const baseName = p => (p.includes('/') ? p.slice(p.lastIndexOf('/') + 1) : p)
const cleanName = name => name.replace(/[\\/:*?"<>|]/g, ' ').trim()
const nonEmpty = v => (v == null || String(v).trim() === '' ? null : v)
const uuid = () => crypto.randomUUID()

const folderId = (tab, path) => (path ? `${tab}:${path}` : null)
function folderPath(id) {
  if (!id) return { tab: null, path: '' }
  const i = id.indexOf(':')
  return { tab: id.slice(0, i), path: id.slice(i + 1) }
}

// 파일 쓰기는 한 줄로 세워 차례대로 — 같은 파일을 동시에 쓰다 이름이 엉키지 않도록
let queue = Promise.resolve()
function serial(fn) {
  const run = queue.then(fn)
  queue = run.catch(() => {})
  return run
}

// ── 항목 파일 형식 (플러터 models/item.dart 와 같다) ─────────────────────────

function toJson(it) {
  const j = {
    app: 'bibleblok', version: 1, tab: it.tab, id: it.id, createdAt: it.createdAt,
    date: it.date ?? null, category: it.category ?? null, title: it.title ?? null, passage: it.passage ?? null,
    emphasis: it.emphasis ?? null, season: it.season ?? null, lectionary: it.lectionary ?? null, draft: it.draft ?? null,
    steps: it.steps,
  }
  if (Object.keys(it.finalSteps).length) j.finalSteps = it.finalSteps
  return j
}

function fromJson(j, folder, fileName) {
  const s = k => (typeof j[k] === 'string' ? j[k] : null)
  const intMap = raw => {
    const out = {}
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) if (/^\d+$/.test(k) && typeof v === 'string') out[k] = v
    }
    return out
  }
  const it = {
    id: s('id') ?? fileName, tab: s('tab') ?? 'sermon', createdAt: typeof j.createdAt === 'number' ? j.createdAt : 0,
    steps: intMap(j.steps), finalSteps: intMap(j.finalSteps), folder, fileName,
  }
  for (const f of FIELDS) it[f] = s(f)
  return it
}

// 저장 파일 이름 — "날짜 제목.json"
function preferredFileName(it) {
  const name = it.tab === 'worship' ? '예배인도' : (nonEmpty(it.title) ?? nonEmpty(it.passage) ?? '제목 없음')
  const base = [nonEmpty(it.date), name].filter(Boolean).join(' ')
  let safe = base.replace(/[\\/:*?"<>|\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
  if (safe.startsWith('.')) safe = safe.slice(1)
  if (safe.length > 80) safe = safe.slice(0, 80).trim()
  if (!safe) safe = it.id
  return `${safe}.json`
}

// 화면이 쓰는 모양
function toApp(it) {
  const o = { id: it.id, folderId: folderId(it.tab, it.folder), createdAt: it.createdAt }
  for (const f of FIELDS) o[f] = it[f]
  return o
}

const find = (tab, id) => items[tab].find(i => i.id === id)
const dirOf = it => join(TAB_DIRS[it.tab], it.folder)

// 같은 폴더에 같은 이름이 있으면 " (2)" 를 붙인다
function uniqueName(it) {
  const want = preferredFileName(it)
  const taken = new Set(items[it.tab].filter(o => o.id !== it.id && o.folder === it.folder).map(o => o.fileName))
  if (!taken.has(want)) return want
  const base = want.slice(0, -5)
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n}).json`
    if (!taken.has(candidate)) return candidate
  }
}

async function write(it) {
  const name = uniqueName(it)
  const path = join(dirOf(it), name)
  const ok = await fs.writeText(path, JSON.stringify(toJson(it), null, 2))
  if (!ok) throw new Error(`파일을 저장하지 못했습니다: ${path}`)
  const old = it.fileName
  it.fileName = name
  if (old && old !== name) await fs.remove(join(dirOf(it), old))
}

const sortItems = tab => items[tab].sort((a, b) => b.createdAt - a.createdAt)

// ── 불러오기 ──────────────────────────────────────────────────────────────────

export async function loadAll() {
  const tree = await fs.listTree()
  for (const t of TABS) {
    const prefix = TAB_DIRS[t]
    folders[t] = tree.dirs.filter(d => d.startsWith(prefix + '/')).map(d => d.slice(prefix.length + 1)).sort()
    const list = []
    for (const f of tree.files) {
      if (!f.startsWith(prefix + '/') || !f.toLowerCase().endsWith('.json')) continue
      const text = await fs.readText(f)
      if (text == null) continue
      try {
        const j = JSON.parse(text)
        if (!j || j.app !== 'bibleblok') continue
        const rel = f.slice(prefix.length + 1)
        list.push(fromJson(j, parentOf(rel), baseName(rel)))
      } catch { /* 형식이 맞지 않는 파일은 건너뛴다 */ }
    }
    items[t] = list
    sortItems(t)
  }
  await loadSettings()
}

async function loadSettings() {
  settings.defaultKeywords = {}
  settings.memories = {}
  settings.customStepItems = []
  const text = await fs.readText(SETTINGS_FILE)
  if (text != null) {
    try {
      const j = JSON.parse(text)
      for (const [k, v] of Object.entries(j.defaultKeywords || {})) settings.defaultKeywords[k] = String(v)
      for (const [k, v] of Object.entries(j.memories || {})) {
        settings.memories[k] = (v || []).map(m => ({ text: String(m.text), date: String(m.date) }))
      }
      for (const c of j.customStepItems || []) {
        settings.customStepItems.push({ id: c.id, tab: c.tab, stepKey: c.stepKey, label: c.label ?? '', text: c.text ?? '', order: c.order ?? 0 })
      }
    } catch { /* 망가진 설정 파일은 빈 설정으로 */ }
  }
  await migrateBrowserSettings()
}

// 예전 웹이 이 브라우저에만 저장해 둔 기억된 지시어·학습 메모리를 settings.json 으로 한 번 옮긴다
async function migrateBrowserSettings() {
  const keys = []
  let changed = false
  try {
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
  } catch { return }
  const moved = []
  for (const key of keys) {
    if (key?.startsWith('defaultKeyword_')) {
      const k = key.slice('defaultKeyword_'.length)
      if (!(k in settings.defaultKeywords)) { settings.defaultKeywords[k] = localStorage.getItem(key) || ''; changed = true }
      moved.push(key)
    } else if (key?.startsWith('memory_')) {
      const k = key.slice('memory_'.length)
      let list = []
      try { list = JSON.parse(localStorage.getItem(key) || '[]') } catch { /* 건너뜀 */ }
      const cur = settings.memories[k] || []
      for (const m of list) {
        if (!cur.some(c => c.text === m.text && c.date === m.date)) { cur.push({ text: String(m.text), date: String(m.date) }); changed = true }
      }
      if (cur.length) settings.memories[k] = cur
      moved.push(key)
    }
  }
  if (!moved.length) return
  if (changed && !(await writeSettings())) return
  moved.forEach(k => localStorage.removeItem(k))
}

function writeSettings() {
  const j = {
    app: 'bibleblok', version: 1,
    defaultKeywords: settings.defaultKeywords,
    memories: settings.memories,
    customStepItems: settings.customStepItems,
  }
  return fs.writeText(SETTINGS_FILE, JSON.stringify(j, null, 2))
}

const saveSettings = () => serial(writeSettings)

// ── 항목 (탭별 이름은 예전과 같게) ────────────────────────────────────────────

function createItem(tab, data) {
  return serial(async () => {
    const it = { id: uuid(), tab, createdAt: Date.now(), steps: {}, finalSteps: {}, folder: folderPath(data.folderId).path, fileName: null }
    for (const f of FIELDS) it[f] = data[f] ?? null
    await write(it)
    items[tab].unshift(it)
    return it.id
  })
}

function updateItem(tab, id, data) {
  return serial(async () => {
    const it = find(tab, id)
    if (!it) throw new Error('항목을 찾을 수 없습니다')
    for (const f of FIELDS) if (f in data) it[f] = data[f] ?? null
    if ('folderId' in data) {
      const next = folderPath(data.folderId).path
      if (next !== it.folder) { await relocateItem(it, next); return }
    }
    await write(it)
  })
}

function deleteItem(tab, id) {
  return serial(async () => {
    const it = find(tab, id)
    if (!it) return
    if (it.fileName) await fs.remove(join(dirOf(it), it.fileName))
    items[tab] = items[tab].filter(i => i.id !== id)
  })
}

const listItems = async tab => items[tab].map(toApp)

function getSteps(tab, id, idKey) {
  const it = find(tab, id)
  if (!it) return []
  return Object.entries(it.steps).map(([k, content]) => ({
    [idKey]: id, stepIndex: Number(k), content,
    ...(tab === 'cell' ? { finalContent: it.finalSteps[k] ?? null } : {}),
  }))
}

function saveStep(tab, id, stepIndex, content, finalContent) {
  return serial(async () => {
    const it = find(tab, id)
    if (!it) throw new Error('항목을 찾을 수 없습니다')
    it.steps[stepIndex] = content ?? ''
    if (tab === 'cell') {
      if (finalContent) it.finalSteps[stepIndex] = finalContent
      else delete it.finalSteps[stepIndex]
    }
    await write(it)
  })
}

export const createSermon = data => createItem('sermon', data)
export const getSermons = () => listItems('sermon')
export const updateSermon = (id, data) => updateItem('sermon', id, data)
export const deleteSermon = id => deleteItem('sermon', id)
export const getSermonSteps = async id => getSteps('sermon', id, 'sermonId')
export const saveSermonStep = (id, i, content) => saveStep('sermon', id, i, content)

export const createWorship = data => createItem('worship', data)
export const getWorships = () => listItems('worship')
export const updateWorship = (id, data) => updateItem('worship', id, data)
export const deleteWorship = id => deleteItem('worship', id)
export const getWorshipSteps = async id => getSteps('worship', id, 'worshipId')
export const saveWorshipStep = (id, i, content) => saveStep('worship', id, i, content)

export const createDawn = data => createItem('dawn', data)
export const getDawns = () => listItems('dawn')
export const updateDawn = (id, data) => updateItem('dawn', id, data)
export const deleteDawn = id => deleteItem('dawn', id)
export const getDawnSteps = async id => getSteps('dawn', id, 'dawnId')
export const saveDawnStep = (id, i, content) => saveStep('dawn', id, i, content)

export const createCell = data => createItem('cell', data)
export const getCells = () => listItems('cell')
export const updateCell = (id, data) => updateItem('cell', id, data)
export const deleteCell = id => deleteItem('cell', id)
export const getCellSteps = async id => getSteps('cell', id, 'cellId')
export const saveCellStep = (id, i, content, finalContent) => saveStep('cell', id, i, content, finalContent)

// ── 폴더 ──────────────────────────────────────────────────────────────────────

// 항목을 다른 폴더로 — 새 위치에 쓰고 옛 파일을 지운다
async function relocateItem(it, folder) {
  if (it.folder === folder) return
  const oldPath = it.fileName ? join(dirOf(it), it.fileName) : null
  it.folder = folder
  it.fileName = null
  await write(it)
  if (oldPath) await fs.remove(oldPath)
}

export async function getFolders(tab) {
  return folders[tab].map(p => ({
    id: folderId(tab, p), tab, name: baseName(p), parentId: folderId(tab, parentOf(p)), createdAt: 0,
  }))
}

export function createFolder(tab, name, parentId = null) {
  return serial(async () => {
    const clean = cleanName(name)
    if (!clean) return null
    const path = join(folderPath(parentId).path, clean)
    if (!folders[tab].includes(path)) {
      if (!(await fs.mkdir(join(TAB_DIRS[tab], path)))) throw new Error('폴더를 만들지 못했습니다')
      folders[tab].push(path)
      folders[tab].sort()
    }
    return folderId(tab, path)
  })
}

// 폴더를 통째로 옮긴다 — 새 위치에 폴더·파일을 다시 쓰고 옛 폴더를 지운다
// (브라우저 저장 방식에는 폴더 이동 기능이 없어서 플러터 앱과 같은 방법을 쓴다)
async function relocateFolder(tab, from, to) {
  if (from === to) return
  if (folders[tab].includes(to)) throw new Error('같은 이름의 폴더가 이미 있습니다')
  const prefix = TAB_DIRS[tab]
  const affected = folders[tab].filter(f => f === from || f.startsWith(from + '/'))
  for (const f of affected) await fs.mkdir(join(prefix, to + f.slice(from.length)))
  for (const it of items[tab].filter(i => i.folder === from || i.folder.startsWith(from + '/'))) {
    it.folder = to + it.folder.slice(from.length)
    it.fileName = null
    await write(it)
  }
  await fs.remove(join(prefix, from))
  folders[tab] = [...folders[tab].filter(f => !affected.includes(f)), ...affected.map(f => to + f.slice(from.length))].sort()
}

// 폴더 삭제 — 바로 아래 하위 폴더와 파일은 루트로 옮긴 뒤 지운다
export function deleteFolder(id) {
  return serial(async () => {
    const { tab, path } = folderPath(id)
    for (const child of folders[tab].filter(f => parentOf(f) === path)) await relocateFolder(tab, child, baseName(child))
    for (const it of items[tab].filter(i => i.folder === path)) await relocateItem(it, '')
    if (!(await fs.remove(join(TAB_DIRS[tab], path)))) throw new Error('폴더를 지우지 못했습니다')
    folders[tab] = folders[tab].filter(f => f !== path && !f.startsWith(path + '/'))
  })
}

export function moveFolder(id, newParentId) {
  return serial(async () => {
    const { tab, path } = folderPath(id)
    const parent = folderPath(newParentId).path
    if (parent === path || parent.startsWith(path + '/') || parentOf(path) === parent) return
    await relocateFolder(tab, path, join(parent, baseName(path)))
  })
}

export function renameFolder(id, name) {
  return serial(async () => {
    const { tab, path } = folderPath(id)
    const clean = cleanName(name)
    if (!clean || clean === baseName(path)) return
    await relocateFolder(tab, path, join(parentOf(path), clean))
  })
}

export function moveItemToFolder(tab, itemId, folderIdValue) {
  return serial(async () => {
    const it = find(tab, itemId)
    if (it) await relocateItem(it, folderPath(folderIdValue).path)
  })
}

// ── 사용자 지시항목 ───────────────────────────────────────────────────────────

const byOrder = (a, b) => a.order - b.order

export async function getCustomStepItems(tab, stepKey) {
  return settings.customStepItems.filter(c => c.tab === tab && c.stepKey === stepKey).sort(byOrder).map(c => ({ ...c }))
}

export async function getAllCustomStepItemsForTab(tab) {
  return settings.customStepItems.filter(c => c.tab === tab).sort(byOrder).map(c => ({ ...c }))
}

export async function addCustomStepItem(tab, stepKey, label) {
  const existing = await getCustomStepItems(tab, stepKey)
  settings.customStepItems.push({
    id: uuid(), tab, stepKey, label, text: `- ${label}`,
    order: existing.length ? existing[existing.length - 1].order + 1 : 0,
  })
  await saveSettings()
}

export async function deleteCustomStepItem(id) {
  settings.customStepItems = settings.customStepItems.filter(c => c.id !== id)
  await saveSettings()
}

export async function setCustomStepItemOrders(orderedIds) {
  orderedIds.forEach((id, idx) => {
    const c = settings.customStepItems.find(x => x.id === id)
    if (c) c.order = idx
  })
  await saveSettings()
}

export async function reorderCustomStepItem(id, direction, tab, stepKey) {
  const list = await getCustomStepItems(tab, stepKey)
  const idx = list.findIndex(i => i.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return
  const a = settings.customStepItems.find(c => c.id === list[idx].id)
  const b = settings.customStepItems.find(c => c.id === list[swapIdx].id)
  ;[a.order, b.order] = [b.order, a.order]
  await saveSettings()
}

// ── 기억된 지시어 ─────────────────────────────────────────────────────────────

export function getKeyword(tab, stepKey) {
  return settings.defaultKeywords[`${tab}_${stepKey}`] || ''
}

export function setKeyword(tab, stepKey, value) {
  const key = `${tab}_${stepKey}`
  if (value?.trim()) settings.defaultKeywords[key] = value.trim()
  else delete settings.defaultKeywords[key]
  return saveSettings()
}

// [{ key: 'tab_stepKey', tab, stepKey, value }]
export function getAllKeywords() {
  return Object.entries(settings.defaultKeywords).map(([key, value]) => {
    const i = key.indexOf('_')
    return { key, tab: key.slice(0, i), stepKey: key.slice(i + 1), value }
  })
}

export function removeKeyword(key) {
  delete settings.defaultKeywords[key]
  return saveSettings()
}

// ── 학습 메모리 (memory.js 가 쓴다) ────────────────────────────────────────────

export function getMemoryList(key) {
  return (settings.memories[key] || []).map(m => ({ ...m }))
}

export function addMemoryEntry(key, text) {
  if (!text?.trim()) return Promise.resolve()
  ;(settings.memories[key] ||= []).push({ text: text.trim(), date: new Date().toISOString().slice(0, 10) })
  return saveSettings()
}

export function deleteMemoryEntry(key, index) {
  const list = settings.memories[key]
  if (!list || index >= list.length) return Promise.resolve()
  list.splice(index, 1)
  if (!list.length) delete settings.memories[key]
  return saveSettings()
}

export function getAllMemoryLists() {
  return Object.entries(settings.memories).map(([key, list]) => ({ key, list: list.map(m => ({ ...m })) }))
}

// ── 단계 내용 검색 ────────────────────────────────────────────────────────────

// 단계 내용에 검색어가 들어 있는 설교/새벽설교 id 목록 (대소문자 구분 없음)
export async function searchStepOwnerIds(type, query) {
  const q = query?.trim().toLowerCase()
  if (!q) return new Set()
  return new Set(items[type].filter(it => Object.values(it.steps).some(c => c?.toLowerCase().includes(q))).map(it => it.id))
}

// ── 강해 시리즈 맥락 ──────────────────────────────────────────────────────────

// 같은 "구분"(시리즈명)의 다른 설교들을 만든 순서대로 요약 — 본문 메시지(새벽은 핵심 메시지) 앞 300자
export async function getSeriesContext(type, seriesName, currentId) {
  if (!seriesName?.trim()) return ''
  const list = items[type].filter(i => i.category === seriesName && i.id !== currentId).sort((a, b) => a.createdAt - b.createdAt)
  if (!list.length) return ''
  // 단계 순서가 바뀌어도 어긋나지 않도록 번호 대신 단계 이름으로 찾는다
  const coreKey = type === 'sermon' ? 'message' : 'core_message'
  const coreIndex = (type === 'sermon' ? SERMON_STEPS : DAWN_STEPS).find(s => s.key === coreKey).index
  const lines = [`[강해 시리즈: ${seriesName}] 이전에 다룬 본문들:`]
  for (const it of list) {
    const content = it.steps[coreIndex]
    const summary = content ? content.slice(0, 300).replace(/\n/g, ' ') : '(내용 미생성)'
    lines.push(`- ${it.date} | ${it.passage || '본문 미지정'} | ${summary}`)
  }
  return lines.join('\n')
}

// ── 백업 (version 2 — 플러터 앱과 같은 형식) ───────────────────────────────────

const TAB_KEYS = {
  sermon: ['sermons', 'sermonSteps', 'sermonId'],
  worship: ['worships', 'worshipSteps', 'worshipId'],
  dawn: ['dawns', 'dawnSteps', 'dawnId'],
  cell: ['cells', 'cellSteps', 'cellId'],
}

export async function exportAllData() {
  const data = {}
  const folderList = []
  for (const t of TABS) {
    for (const f of folders[t]) {
      folderList.push({ id: `${t}:${f}`, tab: t, name: baseName(f), parentId: parentOf(f) ? `${t}:${parentOf(f)}` : null, createdAt: 0 })
    }
    const [listKey, stepsKey, idKey] = TAB_KEYS[t]
    data[listKey] = items[t].map(i => ({
      id: i.id, date: i.date, category: i.category, title: i.title, passage: i.passage,
      emphasis: i.emphasis, season: i.season, lectionary: i.lectionary, draft: i.draft,
      folderId: i.folder ? `${t}:${i.folder}` : null, createdAt: i.createdAt,
    }))
    data[stepsKey] = items[t].flatMap(i => Object.entries(i.steps).map(([k, content]) => ({
      [idKey]: i.id, stepIndex: Number(k), content, ...(t === 'cell' ? { finalContent: i.finalSteps[k] ?? null } : {}),
    })))
  }
  data.folders = folderList
  data.customStepItems = settings.customStepItems.map(c => ({ ...c }))
  data.keywords = Object.fromEntries(Object.entries(settings.defaultKeywords).map(([k, v]) => [`defaultKeyword_${k}`, v]))
  return { version: 2, exportedAt: new Date().toISOString(), data }
}

// 백업 불러오기 — 기존 파일은 그대로 두고, 없는 것만 더한다. 더한 항목 수 반환
export function importAllData(json) {
  return serial(async () => {
    const data = json?.data
    if (json?.version == null || !data || typeof data !== 'object') throw new Error('잘못된 파일 형식입니다.')

    // 폴더 id → 경로
    const rawFolders = data.folders || []
    const byId = Object.fromEntries(rawFolders.map(f => [String(f.id), f]))
    const pathOf = (id, guard = 0) => {
      const f = byId[id]
      if (!f || guard > 50) return ''
      const parent = f.parentId == null ? '' : pathOf(String(f.parentId), guard + 1)
      return join(parent, cleanName(String(f.name)))
    }

    for (const f of rawFolders) {
      const tab = String(f.tab)
      if (!TABS.includes(tab)) continue
      const path = pathOf(String(f.id))
      if (!path || folders[tab].includes(path)) continue
      await fs.mkdir(join(TAB_DIRS[tab], path))
      folders[tab].push(path)
    }

    let added = 0
    for (const t of TABS) {
      const [listKey, stepsKey, idKey] = TAB_KEYS[t]
      const stepRows = data[stepsKey] || []
      for (const r of data[listKey] || []) {
        const id = String(r.id)
        if (find(t, id)) continue
        const s = k => (typeof r[k] === 'string' ? r[k] : null)
        const it = {
          id, tab: t, createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
          steps: {}, finalSteps: {}, folder: r.folderId == null ? '' : pathOf(String(r.folderId)), fileName: null,
        }
        for (const f of FIELDS) it[f] = s(f)
        for (const st of stepRows.filter(st => String(st[idKey]) === id)) {
          if (typeof st.stepIndex !== 'number') continue
          if (typeof st.content === 'string') it.steps[st.stepIndex] = st.content
          if (typeof st.finalContent === 'string' && st.finalContent) it.finalSteps[st.stepIndex] = st.finalContent
        }
        await write(it)
        items[t].push(it)
        added++
      }
      sortItems(t)
      folders[t].sort()
    }

    const existingIds = new Set(settings.customStepItems.map(c => c.id))
    for (const c of data.customStepItems || []) {
      if (!existingIds.has(c.id)) settings.customStepItems.push({ id: c.id, tab: c.tab, stepKey: c.stepKey, label: c.label ?? '', text: c.text ?? '', order: c.order ?? 0 })
    }
    for (const [k, v] of Object.entries(data.keywords || {})) {
      settings.defaultKeywords[k.startsWith('defaultKeyword_') ? k.slice('defaultKeyword_'.length) : k] = String(v)
    }
    await writeSettings()
    return added
  })
}
