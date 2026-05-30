'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import type { Device, BatteryLog } from '@/lib/types'

export default function DevicePage() {
  const params  = useParams()
  const code    = decodeURIComponent(params.code as string)

  const [device,  setDevice]  = useState<Device | null>(null)
  const [logs,    setLogs]    = useState<BatteryLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: deviceData }, { data: logsData }] = await Promise.all([
        supabase.from('devices').select('*').eq('bch_code', code).single(),
        supabase.from('battery_logs').select('*').eq('bch_code', code).order('replaced_at', { ascending: false }),
      ])

      setDevice(deviceData)
      setLogs(logsData || [])
      setLoading(false)
    }
    load()
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  if (!device) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--text-muted)' }}>ไม่พบอุปกรณ์</p>
        <Link href="/scan" style={{ color: 'var(--amber)' }}>← กลับ</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <NavBar />

      <main className="max-w-lg mx-auto px-4 pt-6">

        {/* Back */}
        <Link
          href="/scan"
          className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          ← กลับ
        </Link>

        {/* ข้อมูลเครื่อง */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}
              >
                {device.bch_code}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{device.department}</p>
            </div>
            {device.risk_level && (
              <span
                className="text-xs px-2 py-1 rounded font-semibold tracking-wider uppercase"
                style={{
                  background: device.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                  color:      device.risk_level === 'High' ? 'var(--red)'            : 'var(--yellow)',
                }}
              >
                {device.risk_level} Risk
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="ชื่อเครื่อง" value={device.equipment_name} />
            <Field label="ยี่ห้อ"       value={device.brand} />
            <Field label="รุ่น"         value={device.model} />
            <Field label="Serial No."   value={device.serial_no} />
            <Field label="รอบเปลี่ยนแบต" value={`ทุก ${device.replace_interval_days} วัน`} />
            <Field
              label="วันติดตั้ง"
              value={device.install_date
                ? new Date(device.install_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                : null}
            />
          </div>
        </div>

        {/* Timeline ประวัติ */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            ประวัติการเปลี่ยนแบต
          </h2>
          <span
            className="text-xs px-2 py-1 rounded font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}
          >
            {logs.length} ครั้ง
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            ยังไม่มีประวัติการเปลี่ยนแบต
          </p>
        ) : (
          <div className="space-y-2 pb-4">
            {logs.map((log, i) => {
              const isFirst = i === 0
              const date    = new Date(log.replaced_at)
              return (
                <div
                  key={log.id}
                  className="flex gap-4 items-start rounded-xl p-4"
                  style={{
                    background: isFirst ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
                    border:     `1px solid ${isFirst ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                  }}
                >
                  {/* Dot */}
                  <div className="flex flex-col items-center pt-1 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ background: isFirst ? 'var(--amber)' : 'var(--border)' }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      {isFirst && (
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--amber)' }}>
                          ล่าสุด
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      {log.replaced_by_name && ` · ${log.replaced_by_name}`}
                    </p>
                    {log.note && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                        {log.note}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
