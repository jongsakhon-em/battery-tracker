'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // ใช้ window.location แทน router เพื่อให้ทำงานได้บนมือถือด้วย
    window.location.href = '/login'
  }

  const navItems = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: DashIcon },
    { href: '/scan',      label: 'ค้นหา',    icon: SearchIcon },
    { href: '/import',    label: 'นำเข้า',   icon: ImportIcon },
  ]

  return (
    <>
      {/* Desktop top bar */}
      <header
        className="hidden sm:flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber)' }}>
            <BatteryIcon />
          </div>
          <span className="font-bold tracking-widest text-lg uppercase" style={{ fontFamily: 'var(--font-barlow)' }}>
            Battery Tracker
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-2 rounded-lg text-sm font-semibold tracking-wider uppercase transition-colors"
                style={{
                  background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                  color: active ? 'var(--amber)' : 'var(--text-muted)',
                }}
              >
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="ml-4 px-4 py-2 rounded-lg text-sm font-semibold tracking-wider uppercase transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            ออกจากระบบ
          </button>
        </nav>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {navItems.map(item => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-1"
              style={{ color: active ? 'var(--amber)' : 'var(--text-muted)' }}
            >
              <Icon active={active} />
              <span className="text-[10px] font-semibold tracking-wider uppercase">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-4 py-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogoutIcon />
          <span className="text-[10px] font-semibold tracking-wider uppercase">ออก</span>
        </button>
      </nav>
    </>
  )
}

function BatteryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0E14" strokeWidth="2.5" strokeLinecap="round">
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M7 12h6" />
    </svg>
  )
}

function SearchIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--amber)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function DashIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--amber)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function ImportIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--amber)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
