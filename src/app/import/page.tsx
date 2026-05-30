'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import NavBar from '@/components/NavBar'
import { useRequireAuth } from '@/lib/useRequireAuth'

type Tab = 'manual' | 'csv'

// ค่าเริ่มต้นของฟอร์ม
const EMPTY_FORM = {
  bch_code:             '',
  equipment_name:       '',
  department:           '',
  brand:                '',
  model:                '',
  serial_no:            '',
  risk_level:           '',
  install_date:         '',
  warranty:             '',
  replace_interval_days: '365',
  notes:                '',
}

export default function ImportPage() {
  useRequireAuth()
  const [tab, setTab] = useState<Tab>('manual')

  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <NavBar />

      <main className="max-w-lg mx-auto px-4 pt-6">

        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}
          >
            เพิ่มข้อมูล
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            เพิ่มอุปกรณ์ใหม่เข้าระบบ
          </p>
        </div>

        {/* Tab selector */}
        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'var(--surface)' }}
        >
          {([['manual', 'เพิ่มด้วยมือ'], ['csv', 'Import CSV']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all"
              style={{
                background: tab === t ? 'var(--amber)' : 'transparent',
                color:      tab === t ? '#0A0E14'      : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'manual' ? <ManualForm /> : <CsvImport />}

      </main>
    </div>
  )
}

/* ============================================================
   ฟอร์มเพิ่มอุปกรณ์ด้วยมือ
   ============================================================ */
function ManualForm() {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<'success' | 'duplicate' | 'error' | null>(null)

  function handleChange(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    setResult(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bch_code || !form.equipment_name) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('devices').insert({
      bch_code:             form.bch_code.trim().toUpperCase(),
      equipment_name:       form.equipment_name.trim(),
      department:           form.department.trim()  || null,
      brand:                form.brand.trim()       || null,
      model:                form.model.trim()       || null,
      serial_no:            form.serial_no.trim()   || null,
      risk_level:           form.risk_level         || null,
      install_date:         form.install_date       || null,
      warranty:             form.warranty.trim()    || null,
      replace_interval_days: parseInt(form.replace_interval_days) || 365,
      notes:                form.notes.trim()       || null,
    })

    setLoading(false)

    if (!error) {
      setResult('success')
      setForm(EMPTY_FORM)
    } else if (error.code === '23505') {
      // duplicate key — BCH Code ซ้ำ
      setResult('duplicate')
    } else {
      setResult('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* BCH Code + Equipment Name (บังคับ) */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--amber)' }}>
          ข้อมูลบังคับ
        </p>
        <FormField label="BCH Code *" required>
          <input
            type="text"
            value={form.bch_code}
            onChange={e => handleChange('bch_code', e.target.value.toUpperCase())}
            placeholder="BCH_00312"
            required
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
          />
        </FormField>
        <FormField label="ชื่อเครื่อง *">
          <input
            type="text"
            value={form.equipment_name}
            onChange={e => handleChange('equipment_name', e.target.value)}
            placeholder="MONITORS, PHYSIOLOGIC"
            required
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
          />
        </FormField>
      </div>

      {/* ข้อมูลทั่วไป */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
          ข้อมูลทั่วไป
        </p>
        <FormField label="แผนก">
          <input
            type="text"
            value={form.department}
            onChange={e => handleChange('department', e.target.value)}
            placeholder="OPERATING ROOM"
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="ยี่ห้อ">
            <input
              type="text"
              value={form.brand}
              onChange={e => handleChange('brand', e.target.value)}
              placeholder="PHILIPS"
              className="w-full px-4 py-3 rounded-lg text-sm input-field"
            />
          </FormField>
          <FormField label="รุ่น">
            <input
              type="text"
              value={form.model}
              onChange={e => handleChange('model', e.target.value)}
              placeholder="MP40"
              className="w-full px-4 py-3 rounded-lg text-sm input-field"
            />
          </FormField>
        </div>
        <FormField label="Serial No.">
          <input
            type="text"
            value={form.serial_no}
            onChange={e => handleChange('serial_no', e.target.value)}
            placeholder="DE44006905"
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </FormField>
      </div>

      {/* รายละเอียดเพิ่มเติม */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
          รายละเอียดเพิ่มเติม
        </p>
        <FormField label="Risk Level">
          <select
            value={form.risk_level}
            onChange={e => handleChange('risk_level', e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
          >
            <option value="">-- ไม่ระบุ --</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="วันติดตั้ง">
            <input
              type="date"
              value={form.install_date}
              onChange={e => handleChange('install_date', e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm input-field"
            />
          </FormField>
          <FormField label="รอบเปลี่ยนแบต (วัน)">
            <input
              type="number"
              value={form.replace_interval_days}
              onChange={e => handleChange('replace_interval_days', e.target.value)}
              min="1"
              className="w-full px-4 py-3 rounded-lg text-sm input-field"
            />
          </FormField>
        </div>
        <FormField label="หมายเหตุ">
          <input
            type="text"
            value={form.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="หมายเหตุ (ไม่บังคับ)"
            className="w-full px-4 py-3 rounded-lg text-sm input-field"
          />
        </FormField>
      </div>

      {/* ผลลัพธ์ */}
      {result === 'success' && (
        <p className="text-sm text-center py-3 rounded-xl font-semibold"
          style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)' }}>
          เพิ่มอุปกรณ์สำเร็จ ✓
        </p>
      )}
      {result === 'duplicate' && (
        <p className="text-sm text-center py-3 rounded-xl font-semibold"
          style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
          BCH Code นี้มีอยู่ในระบบแล้ว
        </p>
      )}
      {result === 'error' && (
        <p className="text-sm text-center py-3 rounded-xl font-semibold"
          style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
          เกิดข้อผิดพลาด กรุณาลองใหม่
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-base tracking-widest uppercase transition-opacity"
        style={{
          background: 'var(--amber)',
          color: '#0A0E14',
          boxShadow: '0 0 20px rgba(245,158,11,0.2)',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'กำลังบันทึก...' : 'เพิ่มอุปกรณ์'}
      </button>
    </form>
  )
}

/* ============================================================
   Import จาก CSV
   ============================================================ */
function CsvImport() {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [preview,  setPreview]  = useState<Record<string, string>[]>([])
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)

    const Papa = await import('papaparse')
    Papa.default.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => setPreview(res.data.slice(0, 5)),
    })
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)

    const Papa = await import('papaparse')
    Papa.default.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const supabase = createClient()
        let success = 0
        const errors: string[] = []

        for (const row of res.data) {
          if (!row.bch_code || !row.equipment_name) {
            errors.push(`ข้ามแถว: ไม่มี bch_code หรือ equipment_name`)
            continue
          }
          const { error } = await supabase.from('devices').upsert({
            bch_code:             row.bch_code.trim().toUpperCase(),
            item_no:              row.item_no ? parseInt(row.item_no) : null,
            department:           row.department?.trim()  || null,
            equipment_name:       row.equipment_name.trim(),
            brand:                row.brand?.trim()       || null,
            model:                row.model?.trim()       || null,
            serial_no:            row.serial_no?.trim()   || null,
            risk_level:           row.risk_level?.trim()  || null,
            install_date:         row.install_date        || null,
            warranty:             row.warranty?.trim()    || null,
            replace_interval_days: row.replace_interval_days ? parseInt(row.replace_interval_days) : 365,
          }, { onConflict: 'bch_code' })

          if (error) errors.push(`${row.bch_code}: ${error.message}`)
          else success++
        }

        setResult({ success, failed: errors.length, errors })
        setLoading(false)
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Template format */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
          รูปแบบไฟล์ CSV
        </p>
        <code
          className="text-xs block overflow-x-auto whitespace-nowrap"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}
        >
          item_no,bch_code,department,equipment_name,brand,model,serial_no,risk_level,install_date,replace_interval_days
        </code>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          install_date รูปแบบ YYYY-MM-DD · ถ้า bch_code ซ้ำ ระบบจะอัปเดตข้อมูล
        </p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="rounded-xl p-8 text-center cursor-pointer transition-colors"
        style={{ background: 'var(--surface)', border: '2px dashed var(--border)' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--amber)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        <p className="text-3xl mb-2" style={{ color: 'var(--text-muted)' }}>📂</p>
        <p className="font-semibold text-sm">{fileName || 'คลิกเพื่อเลือกไฟล์ CSV'}</p>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div
          className="rounded-xl p-4 overflow-x-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>
            Preview (5 แถวแรก)
          </p>
          <table className="w-full text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left pb-2 pr-3">BCH Code</th>
                <th className="text-left pb-2 pr-3">ชื่อเครื่อง</th>
                <th className="text-left pb-2">แผนก</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--amber)' }}>{row.bch_code}</td>
                  <td className="py-1.5 pr-3 max-w-[140px] truncate">{row.equipment_name}</td>
                  <td className="py-1.5" style={{ color: 'var(--text-muted)' }}>{row.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview.length > 0 && !result && (
        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-base tracking-widest uppercase transition-opacity"
          style={{ background: 'var(--amber)', color: '#0A0E14', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'กำลัง Import...' : 'เริ่ม Import'}
        </button>
      )}

      {result && (
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${result.failed === 0 ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
          }}
        >
          <p className="font-bold mb-3">ผลการ Import</p>
          <div className="flex gap-6 mb-2">
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{result.success}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>สำเร็จ</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--red)' }}>{result.failed}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ล้มเหลว</p>
            </div>
          </div>
          {result.errors.slice(0, 5).map((err, i) => (
            <p key={i} className="text-xs" style={{ color: 'var(--red)' }}>{err}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Helper component
   ============================================================ */
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
