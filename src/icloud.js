const CONTAINER_ID = import.meta.env.VITE_ICLOUD_CONTAINER_ID || ''
const API_TOKEN = import.meta.env.VITE_ICLOUD_API_TOKEN || ''
const RECORD_TYPE = 'SermonBlokSync'
const RECORD_NAME = 'sermonblok_main'

let ck = null

export function icloudConfigured() {
  return !!(CONTAINER_ID && API_TOKEN)
}

async function getCloudKit() {
  if (ck) return ck
  if (!icloudConfigured()) return null
  if (!window.CloudKit) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.apple-cloudkit.com/ck/2/cloudkit.js'
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
  }
  ck = window.CloudKit.configure({
    containers: [{
      containerIdentifier: CONTAINER_ID,
      apiTokenAuth: {
        apiToken: API_TOKEN,
        persist: true,
      },
      environment: 'production',
    }],
  })
  return ck
}

export async function icloudSetupAuth(onSignIn, onSignOut) {
  const cloudKit = await getCloudKit()
  if (!cloudKit) return false
  const container = cloudKit.getDefaultContainer()
  await container.setUpAuth()
  container.whenUserSignedIn().then(() => onSignIn?.())
  container.whenUserSignedOut().then(() => onSignOut?.())
  const identity = await container.fetchCurrentUserIdentity().catch(() => null)
  return !!identity
}

export async function icloudSignIn() {
  const cloudKit = await getCloudKit()
  if (!cloudKit) return false
  const container = cloudKit.getDefaultContainer()
  try {
    await container.whenUserSignedIn()
    return true
  } catch {
    return false
  }
}

export async function icloudSignOut() {
  const cloudKit = await getCloudKit()
  if (!cloudKit) return
  const container = cloudKit.getDefaultContainer()
  await container.signOut().catch(() => {})
}

export async function icloudSave(data) {
  try {
    const cloudKit = await getCloudKit()
    if (!cloudKit) return false
    const db = cloudKit.getDefaultContainer().privateCloudDatabase
    const value = JSON.stringify(data)

    const fetchResp = await db.fetchRecords({ recordName: RECORD_NAME }).catch(() => null)
    const existing = fetchResp?.records?.[0]

    if (existing && !existing.isError) {
      existing.fields = { data: { value } }
      const saveResp = await db.saveRecords(existing)
      return !saveResp.hasErrors
    } else {
      const saveResp = await db.saveRecords({
        recordName: RECORD_NAME,
        recordType: RECORD_TYPE,
        fields: { data: { value } },
      })
      return !saveResp.hasErrors
    }
  } catch {
    return false
  }
}

export async function icloudLoad() {
  try {
    const cloudKit = await getCloudKit()
    if (!cloudKit) return null
    const db = cloudKit.getDefaultContainer().privateCloudDatabase
    const resp = await db.fetchRecords({ recordName: RECORD_NAME })
    const record = resp?.records?.[0]
    if (!record || record.isError) return null
    const raw = record.fields?.data?.value
    if (!raw) return null
    return { data: JSON.parse(raw), updatedAt: Date.now() }
  } catch {
    return null
  }
}
