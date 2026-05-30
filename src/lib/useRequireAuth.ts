import { useEffect } from 'react'
import { createClient } from './supabase'

// เช็คว่า login อยู่ไหม — ถ้าไม่ได้ login ให้ไปหน้า login
export function useRequireAuth() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login'
      }
    })
  }, [])
}
