import Dexie from 'dexie'

export const db = new Dexie('sermonblok')

db.version(1).stores({
  sermons: '++id, date, category, title, passage, emphasis, createdAt',
  sermonSteps: '++id, [sermonId+stepIndex], sermonId',
  worships: '++id, date, season, createdAt',
  worshipSteps: '++id, [worshipId+stepIndex], worshipId',
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
