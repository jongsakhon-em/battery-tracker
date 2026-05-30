import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton — สร้างครั้งเดียว ใช้ซ้ำทั้ง app ป้องกัน multiple instance warning
let client: SupabaseClient | null = null

export function createClient() {
  if (!client) {
    client = _createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
