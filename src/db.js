import Dexie from 'dexie'

export const db = new Dexie('sermonblok')

db.version(1).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
})

db.version(2).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
  dawns: '++id, date, createdAt',
  dawnSteps: '++id, [dawnId+stepIndex], dawnId',
})

db.version(3).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
  dawns: '++id, date, createdAt',
  dawnSteps: '++id, [dawnId+stepIndex], dawnId',
  folders: '++id, tab',
})

db.version(4).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
  dawns: '++id, date, createdAt',
  dawnSteps: '++id, [dawnId+stepIndex], dawnId',
  folders: '++id, tab, parentId',
}).upgrade(tx => {
  return tx.table('folders').toCollection().modify(folder => {
    if (folder.parentId === undefined) folder.parentId = null
  })
})

db.version(5).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
  dawns: '++id, date, createdAt',
  dawnSteps: '++id, [dawnId+stepIndex], dawnId',
  folders: '++id, tab, parentId',
  customStepItems: '++id, tab, stepKey',
})

// 심층질문(index 6) 삽입으로 인해 기존 적용(6)·예화(7)·찬송(8)을 7·8·9로 이동
db.version(6).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
  dawns: '++id, date, createdAt',
  dawnSteps: '++id, [dawnId+stepIndex], dawnId',
  folders: '++id, tab, parentId',
  customStepItems: '++id, tab, stepKey',
}).upgrade(async tx => {
  const steps = await tx.table('sermonSteps').toArray()
  for (const s of steps) {
    if (s.stepIndex >= 6) {
      await tx.table('sermonSteps').update(s.id, { stepIndex: s.stepIndex + 1 })
    }
  }
})

// Custom step items
export async function getCustomStepItems(tab, stepKey) {
  const all = await db.customStepItems
    .where('tab').equals(tab)
    .filter(i => i.stepKey === stepKey)
    .toArray()
  return all.sort((a, b) => a.order - b.order)
}

export async function getAllCustomStepItemsForTab(tab) {
  return db.customStepItems.where('tab').equals(tab).toArray()
}

export async function addCustomStepItem(tab, stepKey, label) {
  const existing = await getCustomStepItems(tab, stepKey)
  const order = existing.length
  return db.customStepItems.add({ tab, stepKey, label, text: `- ${label}`, order })
}

export async function deleteCustomStepItem(id) {
  return db.customStepItems.delete(id)
}

export async function setCustomStepItemOrders(orderedIds) {
  await Promise.all(orderedIds.map((id, idx) => db.customStepItems.update(id, { order: idx })))
}

export async function reorderCustomStepItem(id, direction, tab, stepKey) {
  const items = await getCustomStepItems(tab, stepKey)
  const idx = items.findIndex(i => i.id === id)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= items.length) return
  const [a, b] = [items[idx], items[swapIdx]]
  await db.customStepItems.update(a.id, { order: b.order })
  await db.customStepItems.update(b.id, { order: a.order })
}

// Sermons
export async function createSermon(data) {
  const id = await db.sermons.add({ ...data, createdAt: Date.now() })
  return id
}

export async function getSermons() {
  return db.sermons.orderBy('createdAt').reverse().toArray()
}

export async function updateSermon(id, data) {
  return db.sermons.update(id, data)
}

export async function deleteSermon(id) {
  await db.sermonSteps.where('sermonId').equals(id).delete()
  await db.sermons.delete(id)
}

// Sermon steps
export async function getSermonSteps(sermonId) {
  return db.sermonSteps.where('sermonId').equals(sermonId).toArray()
}

export async function saveSermonStep(sermonId, stepIndex, content) {
  const existing = await db.sermonSteps
    .where({ sermonId, stepIndex })
    .first()
  if (existing) {
    await db.sermonSteps.update(existing.id, { content })
  } else {
    await db.sermonSteps.add({ sermonId, stepIndex, content })
  }
}

// Worships
export async function createWorship(data) {
  const id = await db.worships.add({ ...data, createdAt: Date.now() })
  return id
}

export async function getWorships() {
  return db.worships.orderBy('createdAt').reverse().toArray()
}

export async function updateWorship(id, data) {
  return db.worships.update(id, data)
}

export async function deleteWorship(id) {
  await db.worshipSteps.where('worshipId').equals(id).delete()
  await db.worships.delete(id)
}

// Worship steps
export async function getWorshipSteps(worshipId) {
  return db.worshipSteps.where('worshipId').equals(worshipId).toArray()
}

export async function saveWorshipStep(worshipId, stepIndex, content) {
  const existing = await db.worshipSteps
    .where({ worshipId, stepIndex })
    .first()
  if (existing) {
    await db.worshipSteps.update(existing.id, { content })
  } else {
    await db.worshipSteps.add({ worshipId, stepIndex, content })
  }
}

// Dawns
export async function createDawn(data) {
  const id = await db.dawns.add({ ...data, createdAt: Date.now() })
  return id
}

export async function getDawns() {
  return db.dawns.orderBy('createdAt').reverse().toArray()
}

export async function updateDawn(id, data) {
  return db.dawns.update(id, data)
}

export async function deleteDawn(id) {
  await db.dawnSteps.where('dawnId').equals(id).delete()
  await db.dawns.delete(id)
}

// Dawn steps
export async function getDawnSteps(dawnId) {
  return db.dawnSteps.where('dawnId').equals(dawnId).toArray()
}

export async function saveDawnStep(dawnId, stepIndex, content) {
  const existing = await db.dawnSteps
    .where({ dawnId, stepIndex })
    .first()
  if (existing) {
    await db.dawnSteps.update(existing.id, { content })
  } else {
    await db.dawnSteps.add({ dawnId, stepIndex, content })
  }
}

// Folders
export async function getFolders(tab) {
  return db.folders.where('tab').equals(tab).toArray()
}

export async function createFolder(tab, name, parentId = null) {
  return db.folders.add({ tab, name, parentId: parentId ?? null, createdAt: Date.now() })
}

async function deleteFolderRecursive(id) {
  const children = await db.folders.where('parentId').equals(id).toArray()
  for (const child of children) {
    await deleteFolderRecursive(child.id)
  }
  const all = [
    ...(await db.sermons.toArray()),
    ...(await db.worships.toArray()),
    ...(await db.dawns.toArray()),
  ]
  for (const item of all.filter(i => i.folderId === id)) {
    const table = item.season !== undefined ? db.worships
      : item.passage !== undefined && item.category !== undefined ? db.sermons
      : db.dawns
    await table.update(item.id, { folderId: null })
  }
  await db.folders.delete(id)
}

export async function deleteFolder(id) {
  await deleteFolderRecursive(id)
}

export async function moveFolder(folderId, newParentId) {
  return db.folders.update(folderId, { parentId: newParentId ?? null })
}

export async function renameFolder(folderId, name) {
  return db.folders.update(folderId, { name })
}

export async function moveItemToFolder(tab, itemId, folderId) {
  if (tab === 'sermon') return db.sermons.update(itemId, { folderId })
  if (tab === 'worship') return db.worships.update(itemId, { folderId })
  return db.dawns.update(itemId, { folderId })
}

// 내보내기 / 불러오기
export async function exportAllData() {
  const [sermons, sermonSteps, worships, worshipSteps, dawns, dawnSteps, folders, customStepItems] =
    await Promise.all([
      db.sermons.toArray(),
      db.sermonSteps.toArray(),
      db.worships.toArray(),
      db.worshipSteps.toArray(),
      db.dawns.toArray(),
      db.dawnSteps.toArray(),
      db.folders.toArray(),
      db.customStepItems.toArray(),
    ])

  const keywords = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('defaultKeyword_')) keywords[key] = localStorage.getItem(key)
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { sermons, sermonSteps, worships, worshipSteps, dawns, dawnSteps, folders, customStepItems, keywords },
  }
}

export async function importAllData(json) {
  const { data } = json
  await db.transaction('rw',
    db.sermons, db.sermonSteps, db.worships, db.worshipSteps,
    db.dawns, db.dawnSteps, db.folders, db.customStepItems,
    async () => {
      await db.sermons.clear()
      await db.sermonSteps.clear()
      await db.worships.clear()
      await db.worshipSteps.clear()
      await db.dawns.clear()
      await db.dawnSteps.clear()
      await db.folders.clear()
      await db.customStepItems.clear()
      if (data.sermons?.length) await db.sermons.bulkPut(data.sermons)
      if (data.sermonSteps?.length) await db.sermonSteps.bulkPut(data.sermonSteps)
      if (data.worships?.length) await db.worships.bulkPut(data.worships)
      if (data.worshipSteps?.length) await db.worshipSteps.bulkPut(data.worshipSteps)
      if (data.dawns?.length) await db.dawns.bulkPut(data.dawns)
      if (data.dawnSteps?.length) await db.dawnSteps.bulkPut(data.dawnSteps)
      if (data.folders?.length) await db.folders.bulkPut(data.folders)
      if (data.customStepItems?.length) await db.customStepItems.bulkPut(data.customStepItems)
    }
  )

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

// 클라우드 데이터를 로컬과 병합 (createdAt 기준 — 로컬에 없는 항목만 추가)
export async function mergeFromCloud(json) {
  const { data } = json
  if (!data) return

  const [
    localSermons, localWorships, localDawns,
    localSermonSteps, localWorshipSteps, localDawnSteps,
    localFolders, localCustomStepItems,
  ] = await Promise.all([
    db.sermons.toArray(), db.worships.toArray(), db.dawns.toArray(),
    db.sermonSteps.toArray(), db.worshipSteps.toArray(), db.dawnSteps.toArray(),
    db.folders.toArray(), db.customStepItems.toArray(),
  ])

  const localSermonKeys = new Set(localSermons.map(s => s.createdAt))
  const localWorshipKeys = new Set(localWorships.map(s => s.createdAt))
  const localDawnKeys = new Set(localDawns.map(s => s.createdAt))

  // 설교
  const newSermons = (data.sermons || []).filter(s => !localSermonKeys.has(s.createdAt))
  for (const s of newSermons) {
    const oldId = s.id
    const { id, ...rest } = s
    const newId = await db.sermons.add(rest)
    const steps = (data.sermonSteps || []).filter(st => st.sermonId === oldId)
    for (const st of steps) {
      const { id: stId, ...stRest } = st
      await db.sermonSteps.add({ ...stRest, sermonId: newId })
    }
  }

  // 예배
  const newWorships = (data.worships || []).filter(s => !localWorshipKeys.has(s.createdAt))
  for (const s of newWorships) {
    const oldId = s.id
    const { id, ...rest } = s
    const newId = await db.worships.add(rest)
    const steps = (data.worshipSteps || []).filter(st => st.worshipId === oldId)
    for (const st of steps) {
      const { id: stId, ...stRest } = st
      await db.worshipSteps.add({ ...stRest, worshipId: newId })
    }
  }

  // 새벽
  const newDawns = (data.dawns || []).filter(s => !localDawnKeys.has(s.createdAt))
  for (const s of newDawns) {
    const oldId = s.id
    const { id, ...rest } = s
    const newId = await db.dawns.add(rest)
    const steps = (data.dawnSteps || []).filter(st => st.dawnId === oldId)
    for (const st of steps) {
      const { id: stId, ...stRest } = st
      await db.dawnSteps.add({ ...stRest, dawnId: newId })
    }
  }
}

// 강해 시리즈 컨텍스트 조회
// type: 'sermon' | 'dawn', stepIndex for core message: sermon=2, dawn=1
export async function getSeriesContext(type, seriesName, currentId) {
  if (!seriesName || !seriesName.trim()) return ''

  let items = []
  if (type === 'sermon') {
    const all = await db.sermons.toArray()
    items = all.filter(s => s.category === seriesName && s.id !== currentId)
      .sort((a, b) => a.createdAt - b.createdAt)
  } else {
    const all = await db.dawns.toArray()
    items = all.filter(d => d.category === seriesName && d.id !== currentId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  if (items.length === 0) return ''

  const coreStepIndex = type === 'sermon' ? 2 : 1
  const lines = [`[강해 시리즈: ${seriesName}] 이전에 다룬 본문들:`]

  for (const item of items) {
    const steps = type === 'sermon'
      ? await db.sermonSteps.where('sermonId').equals(item.id).toArray()
      : await db.dawnSteps.where('dawnId').equals(item.id).toArray()
    const coreStep = steps.find(s => s.stepIndex === coreStepIndex)
    const summary = coreStep?.content
      ? coreStep.content.slice(0, 300).replace(/\n/g, ' ')
      : '(내용 미생성)'
    lines.push(`- ${item.date} | ${item.passage || '본문 미지정'} | ${summary}`)
  }

  return lines.join('\n')
}
