'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import type { Device, BatteryLog } from '@/lib/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DevicePage() {
  const params = useParams()
  const code   = decodeURIComponent(params.code as string)

  const [device,  setDevice]  = useState<Device | null>(null)
  const [logs,    setLogs]    = useState<BatteryLog[]>([])
  const [loading, setLoading] = useState(true)

  // device edit
  const [editingDevice, setEditingDevice] = useState(false)
  const [editForm,      setEditForm]      = useState<Partial<Device>>({})
  const [savingDevice,  setSavingDevice]  = useState(false)

  // log edit / delete
  const [editingLogId,    setEditingLogId]    = useState<string | null>(null)
  const [editLogForm,     setEditLogForm]     = useState({ replaced_at: '', replaced_by_name: '', note: '' })
  const [savingLog,       setSavingLog]       = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId,      setDeletingId]      = useState<string | null>(null)

  useEffect(() => { load() }, [code])

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

  function startEditDevice() {
    if (!device) return
    setEditForm({
      equipment_name:        device.equipment_name,
      department:            device.department,
      brand:                 device.brand,
      model:                 device.model,
      serial_no:             device.serial_no,
      risk_level:            device.risk_level,
      install_date:          device.install_date,
      warranty:              device.warranty,
      replace_interval_days: device.replace_interval_days,
      notes:                 device.notes,
    })
    setEditingDevice(true)
  }

  async function saveDevice() {
    setSavingDevice(true)
    const supabase = createClient()
    const { error } = await supabase.from('devices').update({
      equipment_name:        editForm.equipment_name,
      department:            editForm.department        || null,
      brand:                 editForm.brand             || null,
      model:                 editForm.model             || null,
      serial_no:             editForm.serial_no         || null,
      risk_level:            editForm.risk_level        || null,
      install_date:          editForm.install_date      || null,
      warranty:              editForm.warranty          || null,
      replace_interval_days: editForm.replace_interval_days || 365,
      notes:                 editForm.notes             || null,
    }).eq('bch_code', code)
    setSavingDevice(false)
    if (!error) { setEditingDevice(false); await load() }
    else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  function startEditLog(log: BatteryLog) {
    setEditingLogId(log.id)
    setEditLogForm({
      replaced_at:      toDatetimeLocal(log.replaced_at),
      replaced_by_name: log.replaced_by_name || '',
      note:             log.note             || '',
    })
  }

  async function saveLog() {
    if (!editingLogId) return
    setSavingLog(true)
    const supabase = createClient()
    const { error } = await supabase.from('battery_logs').update({
      replaced_at:      new Date(editLogForm.replaced_at).toISOString(),
      replaced_by_name: editLogForm.replaced_by_name || null,
      note:             editLogForm.note             || null,
    }).eq('id', editingLogId)
    setSavingLog(false)
    if (!error) { setEditingLogId(null); await load() }
    else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  async function deleteLog(id: string) {
    setDeletingId(id)
    const supabase = createClient()
    const { data, error } = await supabase.from('battery_logs').delete().eq('id', id).select()
    console.log('[delete]', { id, data, error })
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (!error) await load()
    else alert('เกิดข้อผิดพลาด: ' + error.message)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--amber)', borderTopColor: 'transparent' }} />
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

        <Link href="/scan" className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          ← กลับ
        </Link>

        {/* การ์ดข้อมูลเครื่อง */}
        <div className="rounded-xl p-5 mb-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>
                {device.bch_code}
              </p>
              {!editingDevice && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{device.department}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {device.risk_level && !editingDevice && (
                <span className="text-xs px-2 py-1 rounded font-semibold tracking-wider uppercase"
                  style={{
                    background: device.risk_level === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
                    color:      device.risk_level === 'High' ? 'var(--red)'            : 'var(--yellow)',
                  }}>
                  {device.risk_level} Risk
                </span>
              )}
              {!editingDevice ? (
                <button onClick={startEditDevice}
                  className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  ✏️ แก้ไข
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditingDevice(false)}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    ยกเลิก
                  </button>
                  <button onClick={saveDevice} disabled={savingDevice}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: 'var(--amber)', color: '#0A0E14', opacity: savingDevice ? 0.6 : 1 }}>
                    {savingDevice ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {editingDevice ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <EditField label="ชื่อเครื่อง *">
                <input value={editForm.equipment_name || ''}
                  onChange={e => setEditForm(f => ({ ...f, equipment_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" required />
              </EditField>
              <EditField label="แผนก">
                <input value={editForm.department || ''}
                  onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" />
              </EditField>
              <EditField label="ยี่ห้อ">
                <input value={editForm.brand || ''}
                  onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" />
              </EditField>
              <EditField label="รุ่น">
                <input value={editForm.model || ''}
                  onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" />
              </EditField>
              <EditField label="Serial No.">
                <input value={editForm.serial_no || ''}
                  onChange={e => setEditForm(f => ({ ...f, serial_no: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field"
                  style={{ fontFamily: 'var(--font-mono)' }} />
              </EditField>
              <EditField label="Risk Level">
                <select value={editForm.risk_level || ''}
                  onChange={e => setEditForm(f => ({ ...f, risk_level: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field">
                  <option value="">-- ไม่ระบุ --</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </EditField>
              <EditField label="วันติดตั้ง">
                <input type="date" value={editForm.install_date || ''}
                  onChange={e => setEditForm(f => ({ ...f, install_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" />
              </EditField>
              <EditField label="รอบเปลี่ยนแบต (วัน)">
                <input type="number" min="1" value={editForm.replace_interval_days || 365}
                  onChange={e => setEditForm(f => ({ ...f, replace_interval_days: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm input-field" />
              </EditField>
              <div className="col-span-2">
                <EditField label="หมายเหตุ">
                  <input value={editForm.notes || ''}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm input-field" />
                </EditField>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="ชื่อเครื่อง"   value={device.equipment_name} />
              <Field label="ยี่ห้อ"         value={device.brand} />
              <Field label="รุ่น"           value={device.model} />
              <Field label="Serial No."     value={device.serial_no} />
              <Field label="รอบเปลี่ยนแบต"  value={`ทุก ${device.replace_interval_days} วัน`} />
              <Field label="วันติดตั้ง"
                value={device.install_date
                  ? new Date(device.install_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
                  : null} />
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            ประวัติการเปลี่ยนแบต
          </h2>
          <span className="text-xs px-2 py-1 rounded font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--amber)' }}>
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
              const isFirst         = i === 0
              const isEditing       = editingLogId === log.id
              const isConfirmDelete = confirmDeleteId === log.id
              const date            = new Date(log.replaced_at)

              return (
                <div key={log.id} className="rounded-xl p-4"
                  style={{
                    background: isFirst ? 'rgba(245,158,11,0.06)' : 'var(--surface)',
                    border: `1px solid ${isFirst ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                  }}>

                  {isEditing ? (
                    <div className="space-y-3">
                      <EditField label="วันเวลาที่เปลี่ยน">
                        <input type="datetime-local"
                          value={editLogForm.replaced_at}
                          max={new Date().toISOString().slice(0, 16)}
                          onChange={e => setEditLogForm(f => ({ ...f, replaced_at: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg text-sm input-field" />
                      </EditField>
                      <EditField label="ชื่อช่าง">
                        <input value={editLogForm.replaced_by_name}
                          onChange={e => setEditLogForm(f => ({ ...f, replaced_by_name: e.target.value }))}
                          placeholder="ไม่บังคับ"
                          className="w-full px-3 py-2 rounded-lg text-sm input-field" />
                      </EditField>
                      <EditField label="หมายเหตุ">
                        <input value={editLogForm.note}
                          onChange={e => setEditLogForm(f => ({ ...f, note: e.target.value }))}
                          placeholder="ไม่บังคับ"
                          className="w-full px-3 py-2 rounded-lg text-sm input-field" />
                      </EditField>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setEditingLogId(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          ยกเลิก
                        </button>
                        <button onClick={saveLog} disabled={savingLog}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--amber)', color: '#0A0E14', opacity: savingLog ? 0.6 : 1 }}>
                          {savingLog ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                      </div>
                    </div>

                  ) : isConfirmDelete ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>
                        ลบรายการวันที่ {fmtDate(log.replaced_at)} ใช่ไหม?
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          ยกเลิก
                        </button>
                        <button onClick={() => deleteLog(log.id)} disabled={deletingId === log.id}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--red)', color: '#fff', opacity: deletingId === log.id ? 0.6 : 1 }}>
                          {deletingId === log.id ? 'กำลังลบ...' : 'ยืนยันลบ'}
                        </button>
                      </div>
                    </div>

                  ) : (
                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center pt-1 flex-shrink-0">
                        <div className="w-3 h-3 rounded-full"
                          style={{ background: isFirst ? 'var(--amber)' : 'var(--border)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">
                            {date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          {isFirst && (
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--amber)' }}>
                              ล่าสุด
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          {log.replaced_by_name && ` · ${log.replaced_by_name}`}
                        </p>
                        {log.note && (
                          <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{log.note}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditLog(log)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}
                          title="แก้ไข">
                          ✏️
                        </button>
                        <button onClick={() => setConfirmDeleteId(log.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}
                          title="ลบ">
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
