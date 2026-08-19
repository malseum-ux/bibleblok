import { supabase } from './supabase.js'

const ADMIN_EMAIL = 'malseum@gmail.com'

export async function fetchUsage() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const email = session.user.email
  if (email === ADMIN_EMAIL) return { isAdmin: true }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data } = await supabase
    .from('allowed_users')
    .select('monthly_limit, is_free, usage_count, usage_month')
    .eq('email', email)
    .single()

  if (!data) return null
  const count = data.usage_month === currentMonth ? (data.usage_count || 0) : 0
  const limit = data.monthly_limit ?? 200
  return { isFree: !!data.is_free, count, limit, allowed: !!data.is_free || count < limit }
}

export async function checkUsage() {
  const usage = await fetchUsage()
  if (!usage) return
  if (usage.isAdmin || usage.isFree) return
  if (!usage.allowed) throw new Error('USAGE_LIMIT_EXCEEDED')
}

export async function incrementUsage() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  const email = session.user.email
  if (email === ADMIN_EMAIL) return

  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data } = await supabase
    .from('allowed_users')
    .select('usage_count, usage_month, is_free')
    .eq('email', email)
    .single()

  if (!data || data.is_free) return

  const count = data.usage_month === currentMonth ? (data.usage_count || 0) : 0
  await supabase.from('allowed_users').update({
    usage_count: count + 1,
    usage_month: currentMonth,
  }).eq('email', email)

  window.dispatchEvent(new Event('usageUpdated'))
}
