'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import { useRequireAuth } from '@/lib/useRequireAuth'
import type { Device } from '@/lib/types'

// สถานะของแต่ละเครื่อง
type Status = 'overdue' | 'due_soon' | 'ok' | 'never'

interface DeviceWithStatus extends Device {
  last_replaced_at: string | null
  days_since:       number | null
  status:           Status
}

// config สี/ข้อความของแต่ละสถานะ
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  overdue:  { label: 'เกินกำหนด',    color: 'var(--red)',     bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  due_soon: { label: 'ใกล้ถึงกำหนด', color: 'var(--yellow)',  bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)'   },
  ok:       { label: 'ปกติ',         color: 'var(--green)',   bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  never:    { label: 'ยังไม่เปลี่ยน', color: 'var(--text-muted)', bg: 'rgba(107,126,153,0.12)', border: 'rgba(107,126,153,0.3)' },
}

const STATUS_ORDER: Status[] = ['overdue', 'due_soon', 'never', 'ok']

export default function DashboardPage() {
  useRequireAuth()
  const [devices, setDevices] = useState<DeviceWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Status | 'all'>('all')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    async function load() {
      try {
      const supabase = createClient()

      // ดึงอุปกรณ์ทั้งหมด
      const { data: devicesData, error: devErr } = await supabase
        .from('devices')
        .select('*')
        .order('bch_code')

      if (devErr || !devicesData) { return }

      // ดึง log ทั้งหมดในครั้งเดียว (แค่ bch_code + replaced_at)
      const { data: allLogs } = await supabase
        .from('battery_logs')
        .select('bch_code, replaced_at')
        .order('replaced_at', { ascending: false })

      // สร้าง map: bch_code → replaced_at ล่าสุด (loop แค่ครั้งเดียว)
      const latestMap = new Map<string, string>()
      for (const log of allLogs ?? []) {
        if (!latestMap.has(log.bch_code)) {
          latestMap.set(log.bch_code, log.replaced_at)
        }
      }

      // คำนวณสถานะแต่ละเครื่องจาก map (ไม่มี network request เพิ่ม)
      const withStatus: DeviceWithStatus[] = devicesData.map((device) => {
        const last_replaced_at = latestMap.get(device.bch_code) ?? null

        // ถ้ามี log ใช้วันเปลี่ยนล่าสุด ถ้าไม่มีใช้วันติดตั้งแทน
        const referenceDate = last_replaced_at ?? device.install_date ?? null

        let days_since: number | null = null
        let status: Status = 'never'

        if (referenceDate) {
          days_since = Math.floor((Date.now() - new Date(referenceDate).getTime()) / 86400000)
          const ratio = days_since / device.replace_interval_days
          if (ratio >= 1)         status = 'overdue'
          else if (ratio >= 0.85) status = 'due_soon'
          else                    status = 'ok'
        }

        return { ...device, last_replaced_at, days_since, status }
      })

      // เรียงตามลำดับ overdue → due_soon → never → ok
      withStatus.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
      setDevices(withStatus)
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        // หยุด spinner เสมอ ไม่ว่าจะ success หรือ error
        setLoading(false)
      }
    }

    load()
  }, [])

  // นับจำนวนแต่ละสถานะ
  const counts = {
    overdue:  devices.filter(d => d.status === 'overdue').length,
    due_soon: devices.filter(d => d.status === 'due_soon').length,
    ok:       devices.filter(d => d.status === 'ok').length,
    never:    devices.filter(d => d.status === 'never').length,
  }

  const q = search.trim().toLowerCase()
  const filtered = devices.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (!q) return true
    return d.bch_code.toLowerCase().includes(q) || (d.department ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 pt-6">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            แดชบอร์ด
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            สถานะแบตเตอรี่ทุกเครื่อง
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* Summary cards — กดเพื่อ filter */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {(STATUS_ORDER).map(s => {
                const cfg    = STATUS_CONFIG[s]
                const active = filter === s
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(active ? 'all' : s)}
                    className="rounded-xl p-3 text-center transition-all"
                    style={{
                      background: active ? cfg.bg      : 'var(--surface)',
                      border:     `1px solid ${active ? cfg.border : 'var(--border)'}`,
                    }}
                  >
                    <p className="text-2xl font-bold" style={{ color: cfg.color }}>
                      {counts[s]}
                    </p>
                    <p className="text-[9px] tracking-wider uppercase leading-tight mt-1" style={{ color: 'var(--text-muted)' }}>
                      {cfg.label}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* ช่องค้นหา */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหารหัสเครื่อง หรือ แผนก..."
              className="w-full px-4 py-3 rounded-xl text-sm input-field mb-4"
            />

            {/* รายการอุปกรณ์ */}
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                ไม่มีรายการ
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map(device => {
                  const cfg = STATUS_CONFIG[device.status]
                  return (
                    <Link
                      key={device.id}
                      href={`/device/${device.bch_code}`}
                      className="flex items-center gap-3 rounded-xl p-4 transition-colors"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      {/* Status dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: cfg.color }}
                      />

                      {/* ข้อมูล */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            className="font-bold text-sm"
                            style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}
                          >
                            {device.bch_code}
                          </span>
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {device.equipment_name}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {device.department}
                        </p>
                      </div>

                      {/* จำนวนวัน */}
                      <div className="text-right flex-shrink-0">
                        {device.days_since !== null ? (
                          <>
                            <p className="font-bold text-lg leading-none" style={{ color: cfg.color }}>
                              {device.days_since}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>วัน</p>
                          </>
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>—</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
