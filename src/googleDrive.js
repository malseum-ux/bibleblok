const FILE_NAME = 'sermonblok_data.json'

async function findFile(token) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (res.status === 401) return 'AUTH_ERROR'
  if (!res.ok) return null
  const json = await res.json()
  return json.files?.[0]?.id ?? null
}

export async function driveSave(token, data) {
  try {
    const body = JSON.stringify(data)
    const existingId = await findFile(token)
    if (existingId === 'AUTH_ERROR') return 'AUTH_ERROR'

    if (existingId) {
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media&fields=modifiedTime`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body,
        }
      )
      if (!res.ok) return false
      const json = await res.json()
      // Google 서버가 기록한 실제 저장 시각을 반환 (로컬 시계와 차이 방지)
      return new Date(json.modifiedTime).getTime()
    } else {
      const metadata = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })
      const boundary = 'sermonblok_boundary'
      const multipart =
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n` +
        `--${boundary}--`
      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=modifiedTime',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipart,
        }
      )
      if (!res.ok) return false
      const json = await res.json()
      return new Date(json.modifiedTime).getTime()
    }
  } catch {
    return false
  }
}

export async function driveListRevisions(token) {
  try {
    const fileId = await findFile(token)
    if (fileId === 'AUTH_ERROR') return { error: 'AUTH_ERROR' }
    if (!fileId) return null

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/revisions?fields=revisions(id,modifiedTime,size)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) return { error: 'AUTH_ERROR' }
    if (!res.ok) return null
    const json = await res.json()
    return json.revisions || []
  } catch {
    return null
  }
}

export async function driveLoadRevision(token, revisionId) {
  try {
    const fileId = await findFile(token)
    if (fileId === 'AUTH_ERROR') return { error: 'AUTH_ERROR' }
    if (!fileId) return null

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/revisions/${revisionId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) return { error: 'AUTH_ERROR' }
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function driveLoad(token) {
  try {
    const fileId = await findFile(token)
    if (fileId === 'AUTH_ERROR') return { error: 'AUTH_ERROR' }
    if (!fileId) return null

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!metaRes.ok) return null
    const meta = await metaRes.json()
    const updatedAt = new Date(meta.modifiedTime).getTime()

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return { data, updatedAt }
  } catch {
    return null
  }
}
