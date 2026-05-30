'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import { useRequireAuth } from '@/lib/useRequireAuth'
import type { Device, BatteryLog } from '@/lib/types'

// สถานะของหน้า
type PageState = 'idle' | 'loading' | 'found' | 'not_found' | 'logging' | 'success'

export default function ScanPage() {
  useRequireAuth()
  const [bchCode, setBchCode]   = useState('')
  const [state, setState]       = useState<PageState>('idle')
  const [device, setDevice]     = useState<Device | null>(null)
  const [lastLog, setLastLog]   = useState<BatteryLog | null>(null)
  const [techName, setTechName] = useState('')
  const [note, setNote]         = useState('')

  // ค้นหาอุปกรณ์จาก BCH Code
  async function searchDevice() {
    const code = bchCode.trim().toUpperCase()
    if (!code) return

    setState('loading')
    const supabase = createClient()

    const { data: deviceData } = await supabase
      .from('devices')
      .select('*')
      .eq('bch_code', code)
      .single()

    if (!deviceData) {
      setState('not_found')
      return
    }

    // ดึง log การเปลี่ยนแบตล่าสุด
    const { data: logData } = await supabase
      .from('battery_logs')
      .select('*')
      .eq('bch_code', code)
      .order('replaced_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setDevice(deviceData)
    setLastLog(logData)
    setState('found')
  }

  // บันทึกการเปลี่ยนแบต
  async function handleLog() {
    if (!device) return
    setState('logging')

    const supabase = createClient()
    const { error } = await supabase.from('battery_logs').insert({
      bch_code:          device.bch_code,
      replaced_by_name:  techName || null,
      note:              note || null,
    })

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
      setState('found')
      return
    }

    setState('success')
  }

  // คืนค่าหน้าเริ่มต้น
  function reset() {
    setState('idle')
    setBchCode('')
    setDevice(null)
    setLastLog(null)
    setTechName('')
    setNote('')
  }

  // คำนวณจำนวนวันที่ผ่านมาตั้งแต่เปลี่ยนล่าสุด
  function getDaysInfo() {
    if (!lastLog) return null
    const days = Math.floor((Date.now() - new Date(lastLog.replaced_at).getTime()) / 86400000)
    const date = new Date(lastLog.replaced_at).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    return { days, date }
  }

  const daysInfo  = getDaysInfo()
  const isOverdue = device && daysInfo ? daysInfo.days > device.replace_interval_days : false

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <NavBar />

      <main className="max-w-lg mx-auto px-4 pt-6">

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            ค้นหาอุปกรณ์
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            กรอก BCH Code เพื่อค้นหาและบันทึก
          </p>
        </div>

        {/* Search box */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={bchCode}
            onChange={e => setBchCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && searchDevice()}
            placeholder="BCH_00312"
            className="flex-1 px-4 py-4 rounded-xl text-lg input-field"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
          />
          <button
            onClick={searchDevice}
            disabled={state === 'loading'}
            className="px-6 py-4 rounded-xl font-bold tracking-wider uppercase text-sm transition-opacity"
            style={{ background: 'var(--amber)', color: '#0A0E14', opacity: state === 'loading' ? 0.6 : 1 }}
          >
            {state === 'loading' ? '...' : 'ค้นหา'}
          </button>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-16">
            <div
              className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }}
            />
            <p className="text-sm tracking-wider" style={{ color: 'var(--text-muted)' }}>กำลังค้นหา...</p>
          </div>
        )}

        {/* ไม่พบ */}
        {state === 'not_found' && (
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--red)' }}>ไม่พบอุปกรณ์</p>
            <p className="text-sm mb-1" style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{bchCode}</p>
            <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
              ยังไม่มีในระบบ — กรุณาเพิ่มผ่านหน้า{' '}
              <Link href="/import" className="underline" style={{ color: 'var(--amber)' }}>นำเข้าข้อมูล</Link>
            </p>
          </div>
        )}

        {/* พบอุปกรณ์ */}
        {(state === 'found' || state === 'logging') && device && (
          <div className="space-y-4">

            {/* ข้อมูลเครื่อง */}
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}
                >
                  {device.bch_code}
                </span>
                {device.risk_level && (
                  <span
                    className="text-xs px-2 py-1 rounded font-semibold tracking-wider uppercase"
                    style={{
                      background: device.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                      color: device.risk_level === 'High' ? 'var(--red)' : 'var(--yellow)',
                    }}
                  >
                    {device.risk_level} Risk
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="ชื่อเครื่อง" value={device.equipment_name} />
                <InfoRow label="แผนก"        value={device.department} />
                <InfoRow label="ยี่ห้อ"       value={device.brand} />
                <InfoRow label="รุ่น"         value={device.model} />
                <InfoRow label="Serial No."   value={device.serial_no} mono />
              </div>
            </div>

            {/* สถานะแบต */}
            <div
              className="rounded-xl p-5"
              style={{
                background: 'var(--surface)',
                border: `1px solid ${
                  !lastLog      ? 'var(--border)'              :
                  isOverdue     ? 'rgba(239,68,68,0.4)'        :
                                  'rgba(16,185,129,0.35)'
                }`,
              }}
            >
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
                สถานะแบตเตอรี่
              </p>

              {lastLog && daysInfo ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>เปลี่ยนล่าสุด</p>
                    <p className="font-semibold">{daysInfo.date}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      โดย {lastLog.replaced_by_name || 'ไม่ระบุ'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold" style={{ color: isOverdue ? 'var(--red)' : 'var(--green)' }}>
                      {daysInfo.days}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>วันที่ผ่านมา</p>
                    <p className="text-xs mt-1" style={{ color: isOverdue ? 'var(--red)' : 'var(--green)' }}>
                      {isOverdue
                        ? `เกินกำหนด ${daysInfo.days - device.replace_interval_days} วัน`
                        : `เหลือ ${device.replace_interval_days - daysInfo.days} วัน`}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ยังไม่มีประวัติการเปลี่ยนแบต</p>
              )}
            </div>

            {/* ฟอร์มบันทึก */}
            <div
              className="rounded-xl p-5 space-y-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                บันทึกการเปลี่ยนแบตเตอรี่
              </p>
              <input
                type="text"
                value={techName}
                onChange={e => setTechName(e.target.value)}
                placeholder="ชื่อช่าง (ไม่บังคับ)"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="หมายเหตุ (ไม่บังคับ)"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
              <button
                onClick={handleLog}
                disabled={state === 'logging'}
                className="w-full py-4 rounded-xl font-bold text-base tracking-widest uppercase transition-opacity"
                style={{
                  background: 'var(--amber)',
                  color: '#0A0E14',
                  boxShadow: '0 0 20px rgba(245,158,11,0.2)',
                  opacity: state === 'logging' ? 0.6 : 1,
                }}
              >
                {state === 'logging' ? 'กำลังบันทึก...' : 'บันทึกเปลี่ยนแบตเตอรี่'}
              </button>
            </div>

            <Link
              href={`/device/${device.bch_code}`}
              className="block text-center text-sm py-2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ดูประวัติทั้งหมด →
            </Link>
          </div>
        )}

        {/* บันทึกสำเร็จ */}
        {state === 'success' && device && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid rgba(16,185,129,0.4)' }}
          >
            <div className="text-5xl mb-4" style={{ color: 'var(--green)' }}>✓</div>
            <p className="font-bold text-xl mb-1" style={{ color: 'var(--green)' }}>บันทึกสำเร็จ</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {device.bch_code} — {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <button
              onClick={reset}
              className="px-8 py-3 rounded-xl font-bold tracking-wider uppercase text-sm"
              style={{ background: 'var(--amber)', color: '#0A0E14' }}
            >
              ค้นหาเครื่องถัดไป
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

// แสดงข้อมูล label + value
function InfoRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p
        className="text-sm font-medium truncate"
        style={mono ? { fontFamily: 'var(--font-mono)' } : {}}
      >
        {value}
      </p>
    </div>
  )
}
