import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pdrxuxrlwreqgiptzily.supabase.co'
const SUPABASE_KEY = 'sb_publishable__PtJQXkCwFJbmI8ZMpAReg_uOmuXX8J'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
