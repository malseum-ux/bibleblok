import { supabase } from './supabase'

// ── Helper ────────────────────────────────────────────────────────────────────

async function uid() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id
}

// ── Mappers (Supabase snake_case → 앱 camelCase) ──────────────────────────────

const mapSermon = r => ({
  id: r.id, date: r.date, category: r.category, title: r.title,
  passage: r.passage, emphasis: r.emphasis, draft: r.draft,
  folderId: r.folder_id, createdAt: r.created_at,
})

const mapWorship = r => ({
  id: r.id, date: r.date, season: r.season, title: r.title,
  passage: r.passage, draft: r.draft, folderId: r.folder_id, createdAt: r.created_at,
})

const mapDawn = r => ({
  id: r.id, date: r.date, category: r.category, title: r.title,
  passage: r.passage, season: r.season, emphasis: r.emphasis, draft: r.draft,
  folderId: r.folder_id, createdAt: r.created_at,
})

const mapCell = r => ({
  id: r.id, passage: r.passage, title: r.title, date: r.date,
  folderId: r.folder_id, createdAt: r.created_at,
})

const mapFolder = r => ({
  id: r.id, tab: r.tab, name: r.name, parentId: r.parent_id, createdAt: r.created_at,
})

const mapSermonStep = r => ({
  id: r.id, sermonId: r.sermon_id, stepIndex: r.step_index, content: r.content,
})

const mapWorshipStep = r => ({
  id: r.id, worshipId: r.worship_id, stepIndex: r.step_index, content: r.content,
})

const mapDawnStep = r => ({
  id: r.id, dawnId: r.dawn_id, stepIndex: r.step_index, content: r.content,
})

const mapCellStep = r => ({
  id: r.id, cellId: r.cell_id, stepIndex: r.step_index,
  content: r.content, finalContent: r.final_content,
})

const mapCustomStepItem = r => ({
  id: r.id, tab: r.tab, stepKey: r.step_key, label: r.label,
  text: r.text, order: r.order,
})

// ── Sermons ───────────────────────────────────────────────────────────────────

export async function createSermon(data) {
  const userId = await uid()
  const { data: row, error } = await supabase.from('sermons').insert({
    user_id: userId,
    date: data.date ?? null, category: data.category ?? null,
    title: data.title ?? null, passage: data.passage ?? null,
    emphasis: data.emphasis ?? null, draft: data.draft ?? null,
    folder_id: data.folderId ?? null, created_at: Date.now(),
  }).select().single()
  if (error) throw error
  return row.id
}

export async function getSermons() {
  const { data, error } = await supabase.from('sermons').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapSermon)
}

export async function updateSermon(id, data) {
  const u = {}
  if ('date' in data) u.date = data.date
  if ('category' in data) u.category = data.category
  if ('title' in data) u.title = data.title
  if ('passage' in data) u.passage = data.passage
  if ('emphasis' in data) u.emphasis = data.emphasis
  if ('draft' in data) u.draft = data.draft
  if ('folderId' in data) u.folder_id = data.folderId
  const { error } = await supabase.from('sermons').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteSermon(id) {
  const { error } = await supabase.from('sermons').delete().eq('id', id)
  if (error) throw error
}

// ── Sermon Steps ──────────────────────────────────────────────────────────────

export async function getSermonSteps(sermonId) {
  const { data, error } = await supabase.from('sermon_steps').select('*').eq('sermon_id', sermonId)
  if (error) throw error
  return data.map(mapSermonStep)
}

export async function saveSermonStep(sermonId, stepIndex, content) {
  const userId = await uid()
  const { error } = await supabase.from('sermon_steps').upsert(
    { user_id: userId, sermon_id: sermonId, step_index: stepIndex, content },
    { onConflict: 'sermon_id,step_index' }
  )
  if (error) throw error
}

// ── Worships ──────────────────────────────────────────────────────────────────

export async function createWorship(data) {
  const userId = await uid()
  const { data: row, error } = await supabase.from('worships').insert({
    user_id: userId,
    date: data.date ?? null, season: data.season ?? null,
    title: data.title ?? null, passage: data.passage ?? null,
    draft: data.draft ?? null, folder_id: data.folderId ?? null,
    created_at: Date.now(),
  }).select().single()
  if (error) throw error
  return row.id
}

export async function getWorships() {
  const { data, error } = await supabase.from('worships').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapWorship)
}

export async function updateWorship(id, data) {
  const u = {}
  if ('date' in data) u.date = data.date
  if ('season' in data) u.season = data.season
  if ('title' in data) u.title = data.title
  if ('passage' in data) u.passage = data.passage
  if ('draft' in data) u.draft = data.draft
  if ('folderId' in data) u.folder_id = data.folderId
  const { error } = await supabase.from('worships').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteWorship(id) {
  const { error } = await supabase.from('worships').delete().eq('id', id)
  if (error) throw error
}

// ── Worship Steps ─────────────────────────────────────────────────────────────

export async function getWorshipSteps(worshipId) {
  const { data, error } = await supabase.from('worship_steps').select('*').eq('worship_id', worshipId)
  if (error) throw error
  return data.map(mapWorshipStep)
}

export async function saveWorshipStep(worshipId, stepIndex, content) {
  const userId = await uid()
  const { error } = await supabase.from('worship_steps').upsert(
    { user_id: userId, worship_id: worshipId, step_index: stepIndex, content },
    { onConflict: 'worship_id,step_index' }
  )
  if (error) throw error
}

// ── Dawns ─────────────────────────────────────────────────────────────────────

export async function createDawn(data) {
  const userId = await uid()
  const { data: row, error } = await supabase.from('dawns').insert({
    user_id: userId,
    date: data.date ?? null, category: data.category ?? null,
    title: data.title ?? null, passage: data.passage ?? null,
    season: data.season ?? null, emphasis: data.emphasis ?? null,
    draft: data.draft ?? null, folder_id: data.folderId ?? null,
    created_at: Date.now(),
  }).select().single()
  if (error) throw error
  return row.id
}

export async function getDawns() {
  const { data, error } = await supabase.from('dawns').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapDawn)
}

export async function updateDawn(id, data) {
  const u = {}
  if ('date' in data) u.date = data.date
  if ('category' in data) u.category = data.category
  if ('title' in data) u.title = data.title
  if ('passage' in data) u.passage = data.passage
  if ('season' in data) u.season = data.season
  if ('emphasis' in data) u.emphasis = data.emphasis
  if ('draft' in data) u.draft = data.draft
  if ('folderId' in data) u.folder_id = data.folderId
  const { error } = await supabase.from('dawns').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteDawn(id) {
  const { error } = await supabase.from('dawns').delete().eq('id', id)
  if (error) throw error
}

// ── Dawn Steps ────────────────────────────────────────────────────────────────

export async function getDawnSteps(dawnId) {
  const { data, error } = await supabase.from('dawn_steps').select('*').eq('dawn_id', dawnId)
  if (error) throw error
  return data.map(mapDawnStep)
}

export async function saveDawnStep(dawnId, stepIndex, content) {
  const userId = await uid()
  const { error } = await supabase.from('dawn_steps').upsert(
    { user_id: userId, dawn_id: dawnId, step_index: stepIndex, content },
    { onConflict: 'dawn_id,step_index' }
  )
  if (error) throw error
}

// ── Cells ─────────────────────────────────────────────────────────────────────

export async function createCell(data) {
  const userId = await uid()
  const { data: row, error } = await supabase.from('cells').insert({
    user_id: userId,
    passage: data.passage ?? null, title: data.title ?? null,
    date: data.date ?? null, folder_id: data.folderId ?? null,
    created_at: Date.now(),
  }).select().single()
  if (error) throw error
  return row.id
}

export async function getCells() {
  const { data, error } = await supabase.from('cells').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data.map(mapCell)
}

export async function updateCell(id, data) {
  const u = {}
  if ('passage' in data) u.passage = data.passage
  if ('title' in data) u.title = data.title
  if ('date' in data) u.date = data.date
  if ('folderId' in data) u.folder_id = data.folderId
  const { error } = await supabase.from('cells').update(u).eq('id', id)
  if (error) throw error
}

export async function deleteCell(id) {
  const { error } = await supabase.from('cells').delete().eq('id', id)
  if (error) throw error
}

// ── Cell Steps ────────────────────────────────────────────────────────────────

export async function getCellSteps(cellId) {
  const { data, error } = await supabase.from('cell_steps').select('*').eq('cell_id', cellId)
  if (error) throw error
  return data.map(mapCellStep)
}

export async function saveCellStep(cellId, stepIndex, content, finalContent) {
  const userId = await uid()
  const { error } = await supabase.from('cell_steps').upsert(
    { user_id: userId, cell_id: cellId, step_index: stepIndex, content, final_content: finalContent ?? null },
    { onConflict: 'cell_id,step_index' }
  )
  if (error) throw error
}

// ── Folders ───────────────────────────────────────────────────────────────────

export async function getFolders(tab) {
  const { data, error } = await supabase.from('folders').select('*').eq('tab', tab).order('created_at', { ascending: true })
  if (error) throw error
  return data.map(mapFolder)
}

export async function createFolder(tab, name, parentId = null) {
  const userId = await uid()
  const { data: row, error } = await supabase.from('folders').insert({
    user_id: userId, tab, name, parent_id: parentId ?? null, created_at: Date.now(),
  }).select().single()
  if (error) throw error
  return row.id
}

export async function deleteFolder(id) {
  // 폴더 안의 항목들은 folder_id를 null로 초기화
  await Promise.all([
    supabase.from('sermons').update({ folder_id: null }).eq('folder_id', id),
    supabase.from('worships').update({ folder_id: null }).eq('folder_id', id),
    supabase.from('dawns').update({ folder_id: null }).eq('folder_id', id),
    supabase.from('cells').update({ folder_id: null }).eq('folder_id', id),
  ])
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}

export async function moveFolder(folderId, newParentId) {
  const { error } = await supabase.from('folders').update({ parent_id: newParentId ?? null }).eq('id', folderId)
  if (error) throw error
}

export async function renameFolder(folderId, name) {
  const { error } = await supabase.from('folders').update({ name }).eq('id', folderId)
  if (error) throw error
}

export async function moveItemToFolder(tab, itemId, folderId) {
  const table = tab === 'sermon' ? 'sermons' : tab === 'worship' ? 'worships' : tab === 'dawn' ? 'dawns' : 'cells'
  const { error } = await supabase.from(table).update({ folder_id: folderId ?? null }).eq('id', itemId)
  if (error) throw error
}

// ── Custom Step Items ─────────────────────────────────────────────────────────

export async function getCustomStepItems(tab, stepKey) {
  const { data, error } = await supabase.from('custom_step_items')
    .select('*').eq('tab', tab).eq('step_key', stepKey).order('order', { ascending: true })
  if (error) throw error
  return data.map(mapCustomStepItem)
}

export async function getAllCustomStepItemsForTab(tab) {
  const { data, error } = await supabase.from('custom_step_items').select('*').eq('tab', tab)
  if (error) throw error
  return data.map(mapCustomStepItem)
}

export async function addCustomStepItem(tab, stepKey, label) {
  const existing = await getCustomStepItems(tab, stepKey)
  const order = existing.length
  const userId = await uid()
  const { error } = await supabase.from('custom_step_items').insert({
    user_id: userId, tab, step_key: stepKey, label, text: `- ${label}`, order,
  })
  if (error) throw error
}

export async function deleteCustomStepItem(id) {
  const { error } = await supabase.from('custom_step_items').delete().eq('id', id)
  if (error) throw error
}

export async function setCustomStepItemOrders(orderedIds) {
  await Promise.all(orderedIds.map((id, idx) =>
    supabase.from('custom_step_items').update({ order: idx }).eq('id', id)
  ))
}

export async function reorderCustomStepItem(id, direction, tab, stepKey) {
  const items = await getCustomStepItems(tab, stepKey)
  const idx = items.findIndex(i => i.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= items.length) return
  const [a, b] = [items[idx], items[swapIdx]]
  await Promise.all([
    supabase.from('custom_step_items').update({ order: b.order }).eq('id', a.id),
    supabase.from('custom_step_items').update({ order: a.order }).eq('id', b.id),
  ])
}

// ── 강해 시리즈 컨텍스트 ──────────────────────────────────────────────────────

export async function getSeriesContext(type, seriesName, currentId) {
  if (!seriesName?.trim()) return ''
  const table = type === 'sermon' ? 'sermons' : 'dawns'
  const { data: items, error } = await supabase.from(table)
    .select('*').eq('category', seriesName).neq('id', currentId).order('created_at', { ascending: true })
  if (error || !items?.length) return ''

  const mapped = items.map(type === 'sermon' ? mapSermon : mapDawn)
  const coreStepIndex = type === 'sermon' ? 2 : 1
  const stepsTable = type === 'sermon' ? 'sermon_steps' : 'dawn_steps'
  const idCol = type === 'sermon' ? 'sermon_id' : 'dawn_id'

  const lines = [`[강해 시리즈: ${seriesName}] 이전에 다룬 본문들:`]
  for (const item of mapped) {
    const { data: steps } = await supabase.from(stepsTable).select('*')
      .eq(idCol, item.id).eq('step_index', coreStepIndex)
    const coreStep = steps?.[0]
    const summary = coreStep?.content
      ? coreStep.content.slice(0, 300).replace(/\n/g, ' ')
      : '(내용 미생성)'
    lines.push(`- ${item.date} | ${item.passage || '본문 미지정'} | ${summary}`)
  }
  return lines.join('\n')
}

// ── 백업 내보내기 / 불러오기 ──────────────────────────────────────────────────

export async function exportAllData() {
  const [s, ss, w, ws, d, ds, f, c, cs, csi] = await Promise.all([
    supabase.from('sermons').select('*'),
    supabase.from('sermon_steps').select('*'),
    supabase.from('worships').select('*'),
    supabase.from('worship_steps').select('*'),
    supabase.from('dawns').select('*'),
    supabase.from('dawn_steps').select('*'),
    supabase.from('folders').select('*'),
    supabase.from('cells').select('*'),
    supabase.from('cell_steps').select('*'),
    supabase.from('custom_step_items').select('*'),
  ])

  const keywords = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('defaultKeyword_')) keywords[key] = localStorage.getItem(key)
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      sermons: (s.data || []).map(mapSermon),
      sermonSteps: (ss.data || []).map(mapSermonStep),
      worships: (w.data || []).map(mapWorship),
      worshipSteps: (ws.data || []).map(mapWorshipStep),
      dawns: (d.data || []).map(mapDawn),
      dawnSteps: (ds.data || []).map(mapDawnStep),
      folders: (f.data || []).map(mapFolder),
      cells: (c.data || []).map(mapCell),
      cellSteps: (cs.data || []).map(mapCellStep),
      customStepItems: (csi.data || []).map(mapCustomStepItem),
      keywords,
    },
  }
}

export async function importAllData(json) {
  const { data } = json
  const userId = await uid()

  // 기존 데이터 전체 삭제
  await Promise.all([
    supabase.from('sermons').delete().eq('user_id', userId),
    supabase.from('worships').delete().eq('user_id', userId),
    supabase.from('dawns').delete().eq('user_id', userId),
    supabase.from('cells').delete().eq('user_id', userId),
    supabase.from('folders').delete().eq('user_id', userId),
    supabase.from('custom_step_items').delete().eq('user_id', userId),
  ])

  await _insertFromData(data, userId)

  if (data.keywords) {
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('defaultKeyword_')) toRemove.push(key)
    }
    toRemove.forEach(k => localStorage.removeItem(k))
    Object.entries(data.keywords).forEach(([k, v]) => localStorage.setItem(k, v))
  }
}

// ── 로컬 IndexedDB → Supabase 1회 이전 ───────────────────────────────────────

export async function migrateLocalToSupabase() {
  const Dexie = (await import('dexie')).default
  const localDb = new Dexie('bibleblok')
  localDb.version(7).stores({
    sermons: '++id, date, category, title, passage, emphasis, createdAt',
    sermonSteps: '++id, [sermonId+stepIndex], sermonId',
    worships: '++id, date, season, createdAt',
    worshipSteps: '++id, [worshipId+stepIndex], worshipId',
    dawns: '++id, date, createdAt',
    dawnSteps: '++id, [dawnId+stepIndex], dawnId',
    folders: '++id, tab, parentId',
    customStepItems: '++id, tab, stepKey',
    cells: '++id, passage, title, date, folderId, createdAt',
    cellSteps: '++id, [cellId+stepIndex], cellId',
  })

  const userId = await uid()
  const [
    localSermons, localSermonSteps,
    localWorships, localWorshipSteps,
    localDawns, localDawnSteps,
    localFolders, localCustomItems,
    localCells, localCellSteps,
  ] = await Promise.all([
    localDb.sermons.toArray(), localDb.sermonSteps.toArray(),
    localDb.worships.toArray(), localDb.worshipSteps.toArray(),
    localDb.dawns.toArray(), localDb.dawnSteps.toArray(),
    localDb.folders.toArray(), localDb.customStepItems.toArray(),
    localDb.cells.toArray(), localDb.cellSteps.toArray(),
  ])

  const total = localSermons.length + localWorships.length + localDawns.length + localCells.length
  if (total === 0) return { count: 0 }

  const folderIdMap = {}

  // 폴더 이전 (1차: 삽입)
  for (const f of localFolders) {
    const { data: row } = await supabase.from('folders').insert({
      user_id: userId, tab: f.tab, name: f.name,
      parent_id: null, created_at: f.createdAt || Date.now(),
    }).select().single()
    if (row) folderIdMap[f.id] = row.id
  }

  // 폴더 이전 (2차: 부모 관계 연결)
  for (const f of localFolders) {
    if (f.parentId && folderIdMap[f.parentId] && folderIdMap[f.id]) {
      await supabase.from('folders').update({ parent_id: folderIdMap[f.parentId] }).eq('id', folderIdMap[f.id])
    }
  }

  // 설교 이전
  const sermonIdMap = {}
  for (const s of localSermons) {
    const { data: row } = await supabase.from('sermons').insert({
      user_id: userId, date: s.date, category: s.category, title: s.title,
      passage: s.passage, emphasis: s.emphasis, draft: s.draft,
      folder_id: s.folderId ? (folderIdMap[s.folderId] || null) : null,
      created_at: s.createdAt || Date.now(),
    }).select().single()
    if (row) sermonIdMap[s.id] = row.id
  }
  for (const st of localSermonSteps) {
    const newId = sermonIdMap[st.sermonId]
    if (!newId) continue
    await supabase.from('sermon_steps').upsert(
      { user_id: userId, sermon_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'sermon_id,step_index' }
    )
  }

  // 예배 이전
  const worshipIdMap = {}
  for (const w of localWorships) {
    const { data: row } = await supabase.from('worships').insert({
      user_id: userId, date: w.date, season: w.season, title: w.title,
      passage: w.passage, draft: w.draft,
      folder_id: w.folderId ? (folderIdMap[w.folderId] || null) : null,
      created_at: w.createdAt || Date.now(),
    }).select().single()
    if (row) worshipIdMap[w.id] = row.id
  }
  for (const st of localWorshipSteps) {
    const newId = worshipIdMap[st.worshipId]
    if (!newId) continue
    await supabase.from('worship_steps').upsert(
      { user_id: userId, worship_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'worship_id,step_index' }
    )
  }

  // 새벽설교 이전
  const dawnIdMap = {}
  for (const d of localDawns) {
    const { data: row } = await supabase.from('dawns').insert({
      user_id: userId, date: d.date, category: d.category, title: d.title,
      passage: d.passage, season: d.season, emphasis: d.emphasis, draft: d.draft,
      folder_id: d.folderId ? (folderIdMap[d.folderId] || null) : null,
      created_at: d.createdAt || Date.now(),
    }).select().single()
    if (row) dawnIdMap[d.id] = row.id
  }
  for (const st of localDawnSteps) {
    const newId = dawnIdMap[st.dawnId]
    if (!newId) continue
    await supabase.from('dawn_steps').upsert(
      { user_id: userId, dawn_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'dawn_id,step_index' }
    )
  }

  // 교재 이전
  const cellIdMap = {}
  for (const c of localCells) {
    const { data: row } = await supabase.from('cells').insert({
      user_id: userId, passage: c.passage, title: c.title, date: c.date,
      folder_id: c.folderId ? (folderIdMap[c.folderId] || null) : null,
      created_at: c.createdAt || Date.now(),
    }).select().single()
    if (row) cellIdMap[c.id] = row.id
  }
  for (const st of localCellSteps) {
    const newId = cellIdMap[st.cellId]
    if (!newId) continue
    await supabase.from('cell_steps').upsert(
      { user_id: userId, cell_id: newId, step_index: st.stepIndex, content: st.content, final_content: st.finalContent ?? null },
      { onConflict: 'cell_id,step_index' }
    )
  }

  // 커스텀 항목 이전
  for (const item of localCustomItems) {
    await supabase.from('custom_step_items').insert({
      user_id: userId, tab: item.tab, step_key: item.stepKey,
      label: item.label, text: item.text, order: item.order ?? 0,
    })
  }

  return { count: total }
}

// ── 내부 헬퍼 (importAllData용 ID 재매핑) ─────────────────────────────────────

async function _insertFromData(data, userId) {
  const folderIdMap = {}

  for (const f of data.folders || []) {
    const { data: row } = await supabase.from('folders').insert({
      user_id: userId, tab: f.tab, name: f.name,
      parent_id: null, created_at: f.createdAt || Date.now(),
    }).select().single()
    if (row) folderIdMap[f.id] = row.id
  }
  for (const f of data.folders || []) {
    if (f.parentId && folderIdMap[f.parentId] && folderIdMap[f.id]) {
      await supabase.from('folders').update({ parent_id: folderIdMap[f.parentId] }).eq('id', folderIdMap[f.id])
    }
  }

  const sermonIdMap = {}
  for (const s of data.sermons || []) {
    const { data: row } = await supabase.from('sermons').insert({
      user_id: userId, date: s.date, category: s.category, title: s.title,
      passage: s.passage, emphasis: s.emphasis, draft: s.draft,
      folder_id: s.folderId ? (folderIdMap[s.folderId] || null) : null,
      created_at: s.createdAt || Date.now(),
    }).select().single()
    if (row) sermonIdMap[s.id] = row.id
  }
  for (const st of data.sermonSteps || []) {
    const newId = sermonIdMap[st.sermonId]
    if (!newId) continue
    await supabase.from('sermon_steps').upsert(
      { user_id: userId, sermon_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'sermon_id,step_index' }
    )
  }

  const worshipIdMap = {}
  for (const w of data.worships || []) {
    const { data: row } = await supabase.from('worships').insert({
      user_id: userId, date: w.date, season: w.season, title: w.title,
      passage: w.passage, draft: w.draft,
      folder_id: w.folderId ? (folderIdMap[w.folderId] || null) : null,
      created_at: w.createdAt || Date.now(),
    }).select().single()
    if (row) worshipIdMap[w.id] = row.id
  }
  for (const st of data.worshipSteps || []) {
    const newId = worshipIdMap[st.worshipId]
    if (!newId) continue
    await supabase.from('worship_steps').upsert(
      { user_id: userId, worship_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'worship_id,step_index' }
    )
  }

  const dawnIdMap = {}
  for (const d of data.dawns || []) {
    const { data: row } = await supabase.from('dawns').insert({
      user_id: userId, date: d.date, category: d.category, title: d.title,
      passage: d.passage, season: d.season, emphasis: d.emphasis, draft: d.draft,
      folder_id: d.folderId ? (folderIdMap[d.folderId] || null) : null,
      created_at: d.createdAt || Date.now(),
    }).select().single()
    if (row) dawnIdMap[d.id] = row.id
  }
  for (const st of data.dawnSteps || []) {
    const newId = dawnIdMap[st.dawnId]
    if (!newId) continue
    await supabase.from('dawn_steps').upsert(
      { user_id: userId, dawn_id: newId, step_index: st.stepIndex, content: st.content },
      { onConflict: 'dawn_id,step_index' }
    )
  }

  const cellIdMap = {}
  for (const c of data.cells || []) {
    const { data: row } = await supabase.from('cells').insert({
      user_id: userId, passage: c.passage, title: c.title, date: c.date,
      folder_id: c.folderId ? (folderIdMap[c.folderId] || null) : null,
      created_at: c.createdAt || Date.now(),
    }).select().single()
    if (row) cellIdMap[c.id] = row.id
  }
  for (const st of data.cellSteps || []) {
    const newId = cellIdMap[st.cellId]
    if (!newId) continue
    await supabase.from('cell_steps').upsert(
      { user_id: userId, cell_id: newId, step_index: st.stepIndex, content: st.content, final_content: st.finalContent ?? null },
      { onConflict: 'cell_id,step_index' }
    )
  }

  for (const item of data.customStepItems || []) {
    await supabase.from('custom_step_items').insert({
      user_id: userId, tab: item.tab, step_key: item.stepKey,
      label: item.label, text: item.text, order: item.order ?? 0,
    })
  }
}
