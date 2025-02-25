import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY as string
console.log("supbase Url:",supabaseUrl)
console.log("supbase Key:",supabaseKey)
export const supabaseClient = createClient(supabaseUrl, supabaseKey)
export default supabaseClient