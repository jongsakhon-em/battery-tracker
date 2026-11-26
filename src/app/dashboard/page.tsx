'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { fetchAll } from '@/lib/fetchAll'
import type { BatteryLog, Device, DeviceWithStatus, Status } from '@/lib/types'

// config สี/ข้อความของแต่ละสถานะ
const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  overdue:  { label: 'เกินกำหนด',    color: 'var(--red)',     bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
  due_soon: { label: 'ใกล้ถึงกำหนด', color: 'var(--yellow)',  bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)'   },
  ok:       { label: 'ปกติ',         color: 'var(--green)',   bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  never:    { label: 'ยังไม่เปลี่ยน', color: 'var(--text-muted)', bg: 'rgba(107,126,153,0.12)', border: 'rgba(107,126,153,0.3)' },
}

const STATUS_ORDER: Status[] = ['overdue', 'due_soon', 'never', 'ok']

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// ISO → 'YYYY-MM' ตามวันในเวลาเครื่อง (ตรงกับวันที่ที่แสดงในแอป/Excel)
function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// log นี้อยู่ในช่วงที่เลือกไหม (year '' = ไม่กรอง · month '' = ทั้งปี)
function inPeriod(iso: string, year: string, month: string): boolean {
  if (!year) return true
  const key = monthKey(iso)
  return month ? key === `${year}-${month}` : key.startsWith(`${year}-`)
}

export default function DashboardPage() {
  useRequireAuth()
  const [devices, setDevices] = useState<DeviceWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<Status | 'all'>('all')
  const [search,  setSearch]  = useState('')
  const [exporting, setExporting] = useState(false)
  // ตัวกรองช่วงเวลาที่เปลี่ยนแบต: เครื่องที่ "เคยเปลี่ยน" ในปี/เดือนนั้น
  const [year,  setYear]  = useState('')   // '' = ทุกปี
  const [month, setMonth] = useState('')   // '' = ทั้งปี · '01'..'12'
  const [logMonths, setLogMonths] = useState<Map<string, Set<string>>>(new Map())  // bch_code → {'YYYY-MM'}

  useEffect(() => {
    async function load() {
      try {
      const supabase = createClient()

      // ดึงอุปกรณ์ทั้งหมด (แบ่งหน้าทีละ 1,000 — Supabase ตัดที่ 1,000 แถวต่อ request)
      const devicesData = await fetchAll<Device>((from, to) => supabase
        .from('devices')
        .select('*')
        .order('bch_code')
        .range(from, to))

      // ดึง log ทั้งหมด (แค่ bch_code + replaced_at) — order id เป็นตัวตัดสินเมื่อวันเท่ากัน ให้แบ่งหน้าได้คงที่
      const allLogs = await fetchAll<Pick<BatteryLog, 'bch_code' | 'replaced_at'>>((from, to) => supabase
        .from('battery_logs')
        .select('bch_code, replaced_at')
        .order('replaced_at', { ascending: false })
        .order('id')
        .range(from, to))

      // สร้าง map: bch_code → replaced_at ล่าสุด และ bch_code → เดือนที่เคยเปลี่ยน (loop แค่ครั้งเดียว)
      const latestMap = new Map<string, string>()
      const monthsMap = new Map<string, Set<string>>()
      for (const log of allLogs) {
        if (!latestMap.has(log.bch_code)) {
          latestMap.set(log.bch_code, log.replaced_at)
        }
        let set = monthsMap.get(log.bch_code)
        if (!set) { set = new Set(); monthsMap.set(log.bch_code, set) }
        set.add(monthKey(log.replaced_at))
      }
      setLogMonths(monthsMap)

      // คำนวณสถานะแต่ละเครื่องจาก map (ไม่มี network request เพิ่ม)
      const withStatus: DeviceWithStatus[] = devicesData.map((device) => {
        const last_replaced_at = latestMap.get(device.bch_code) ?? null

        let days_since: number | null = null
        let status: Status = 'never'

        if (last_replaced_at) {
          // มี log → คำนวณจาก log ล่าสุด
          days_since = Math.floor((Date.now() - new Date(last_replaced_at).getTime()) / 86400000)
          const remaining = device.replace_interval_days - days_since
          if (remaining <= 0)       status = 'overdue'
          else if (remaining <= 60) status = 'due_soon'
          else                      status = 'ok'
        } else if (device.install_date) {
          // ไม่มี log → คำนวณจาก install_date แต่ถ้าเกินกำหนดให้เป็น never แทน
          days_since = Math.floor((Date.now() - new Date(device.install_date).getTime()) / 86400000)
          const remaining = device.replace_interval_days - days_since
          if (remaining <= 0)       status = 'never'
          else if (remaining <= 60) status = 'due_soon'
          else                      status = 'ok'
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

  // Export Excel ตามรายการที่กรองอยู่ (ดึง log เต็มตอนกด เพื่อไม่ให้ dashboard โหลดหนัก)
  async function handleExport() {
    setExporting(true)
    try {
      const supabase = createClient()
      const logs = await fetchAll<Pick<BatteryLog, 'bch_code' | 'replaced_at' | 'replaced_by_name' | 'note'>>((from, to) => supabase
        .from('battery_logs')
        .select('bch_code, replaced_at, replaced_by_name, note')
        .order('bch_code')
        .order('replaced_at', { ascending: false })
        .order('id')
        .range(from, to))
      const labels = Object.fromEntries(
        STATUS_ORDER.map(s => [s, STATUS_CONFIG[s].label])
      ) as Record<Status, string>
      // คอลัมน์ "เปลี่ยนครั้งที่ N" + ชีตประวัติ: ถ้าเลือกช่วงเวลา ใส่เฉพาะ log ในช่วงนั้น
      const periodLogs = logs.filter(l => inPeriod(l.replaced_at, year, month))
      const { exportDashboardExcel } = await import('@/lib/exportExcel')
      await exportDashboardExcel(filtered, periodLogs, labels, periodTag)
    } catch (err) {
      console.error('Export error:', err)
      alert('Export ไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setExporting(false)
    }
  }

  // ปีที่มี log จริง (ใหม่ → เก่า) สำหรับ dropdown
  const years = Array.from(new Set(
    Array.from(logMonths.values()).flatMap(set => Array.from(set, k => k.slice(0, 4)))
  )).sort().reverse()
  const periodKey   = year ? (month ? `${year}-${month}` : year) : ''
  const periodTag   = periodKey  // ต่อท้ายชื่อไฟล์ export เช่น 2025-03
  const periodLabel = year ? (month ? `${MONTHS[Number(month) - 1]} ${year}` : `ปี ${year}`) : ''

  const q = search.trim().toLowerCase()
  const filtered = devices.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false
    if (year) {
      const set = logMonths.get(d.bch_code)
      if (!set) return false
      const hit = month ? set.has(`${year}-${month}`) : Array.from(set).some(k => k.startsWith(`${year}-`))
      if (!hit) return false
    }
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

            {/* ช่องค้นหา + ปุ่ม Export */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหารหัสเครื่อง หรือ แผนก..."
                className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm input-field"
              />
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="flex-shrink-0 px-4 py-3 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: 'var(--amber)', color: 'var(--bg)' }}
                title={`ส่งออก ${filtered.length} เครื่องที่แสดงอยู่`}
              >
                {exporting ? 'กำลังส่งออก...' : 'Export Excel'}
              </button>
            </div>

            {/* ตัวกรองช่วงเวลาที่เปลี่ยนแบต */}
            <div className="flex gap-2 mb-2">
              <select
                value={year}
                onChange={e => { setYear(e.target.value); if (!e.target.value) setMonth('') }}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm input-field"
              >
                <option value="">เปลี่ยนแบต: ทุกปี</option>
                {years.map(y => <option key={y} value={y}>ปี {y}</option>)}
              </select>
              <select
                value={month}
                onChange={e => setMonth(e.target.value)}
                disabled={!year}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm input-field disabled:opacity-40"
              >
                <option value="">ทุกเดือน</option>
                {MONTHS.map((m, i) => {
                  const v = String(i + 1).padStart(2, '0')
                  return <option key={v} value={v}>{m}</option>
                })}
              </select>
            </div>
            {year ? (
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                เปลี่ยนแบตใน {periodLabel}: <span className="font-bold" style={{ color: 'var(--amber)' }}>{filtered.length}</span> เครื่อง
                {(filter !== 'all' || q) && ' (รวมตัวกรองอื่นด้วย)'}
              </p>
            ) : <div className="mb-2" />}

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
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          อายุแบต <span className="font-bold" style={{ color: cfg.color }}>
                            {device.days_since ?? 0}
                          </span> วัน
                        </p>
                        {device.status === 'overdue' && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--red)' }}>
                            เกินกำหนดไปแล้ว {device.days_since! - device.replace_interval_days} วัน
                          </p>
                        )}
                        {device.status === 'due_soon' && (
                          <p className="text-[10px] mt-0.5" style={{ color: 'var(--amber)' }}>
                            อีก {device.replace_interval_days - device.days_since!} วัน จะครบกำหนด
                          </p>
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
