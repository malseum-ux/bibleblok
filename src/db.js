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

// 강해 시리즈 컨텍스트 조회
// type: 'sermon' | 'dawn', stepIndex for core message: sermon=2, dawn=1
export async function getSeriesContext(type, seriesName, currentId) {
  if (!seriesName || !seriesName.trim()) return ''

  let items = []
  if (type === 'sermon') {
    const all = await db.sermons.toArray()
    items = all.filter(s => s.seriesName === seriesName && s.id !== currentId)
      .sort((a, b) => a.createdAt - b.createdAt)
  } else {
    const all = await db.dawns.toArray()
    items = all.filter(d => d.seriesName === seriesName && d.id !== currentId)
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
