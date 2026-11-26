// Export ข้อมูล dashboard เป็นไฟล์ Excel (.xlsx) — 2 ชีต
//   1. "สถานะ"            เครื่องละ 1 แถว (ตามที่กรองอยู่บนหน้าจอ)
//   2. "ประวัติการเปลี่ยน"   log การเปลี่ยนแบตของเครื่องในชีตแรก
//
// ไลบรารี xlsx โหลดแบบ dynamic import ตอนกดปุ่มเท่านั้น → ไม่ทำให้หน้า dashboard โหลดช้า
// วันที่เขียนเป็น "วันที่จริง" ของ Excel (sort/filter ได้) แสดงรูปแบบ 26 November 2026
// ⚠️ ถ้าเพิ่ม/สลับคอลัมน์ ต้องแก้ตัวอักษรคอลัมน์ใน applyDateFormat ด้วย

import type { BatteryLog, DeviceWithStatus, Status } from './types'

const DATE_FORMAT = 'd mmmm yyyy'

// แปลง ISO string → เลขวันที่ของ Excel (serial จำนวนเต็ม) ตามวันในเวลาเครื่อง
// คำนวณเองแทนการส่ง Date ให้ xlsx เพราะ xlsx 0.18 แปลงแล้วมีเศษวินาทีจาก timezone offset
function toExcelDate(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000)
}

// ตั้งรูปแบบวันที่ให้ทุก cell ที่เป็นตัวเลขในคอลัมน์ที่ระบุ (แถว 2 ลงไป)
function applyDateFormat(ws: Record<string, { t?: string; z?: string }>, cols: string[], rowCount: number) {
  for (const col of cols) {
    for (let r = 2; r <= rowCount + 1; r++) {
      const cell = ws[`${col}${r}`]
      if (cell && cell.t === 'n') cell.z = DATE_FORMAT
    }
  }
}

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function exportDashboardExcel(
  devices: DeviceWithStatus[],
  logs: Pick<BatteryLog, 'bch_code' | 'replaced_at' | 'replaced_by_name' | 'note'>[],
  statusLabel: Record<Status, string>,
) {
  const XLSX = await import('xlsx')

  // ---------- ชีต 1: สถานะ ----------
  const statusRows = devices.map(d => {
    const remaining = d.days_since === null ? null : d.replace_interval_days - d.days_since
    return {
      'BCH Code':            d.bch_code,
      'ชื่อเครื่อง':            d.equipment_name,
      'แผนก':               d.department ?? '',
      'ยี่ห้อ':               d.brand ?? '',
      'รุ่น':                 d.model ?? '',
      'Serial No.':          d.serial_no ?? '',
      'วันติดตั้ง':            toExcelDate(d.install_date),
      'เปลี่ยนแบตล่าสุด':      toExcelDate(d.last_replaced_at),
      'อายุแบต (วัน)':        d.days_since,
      'รอบเปลี่ยน (วัน)':      d.replace_interval_days,
      // บวก = เหลืออีกกี่วัน · ลบ = เกินกำหนดไปกี่วัน
      'เหลือ/เกินกำหนด (วัน)': remaining,
      'สถานะ':              statusLabel[d.status],
    }
  })

  // ---------- ชีต 2: ประวัติ (เฉพาะเครื่องในชีตแรก) ----------
  const deviceMap = new Map(devices.map(d => [d.bch_code, d]))
  const historyRows = logs
    .filter(l => deviceMap.has(l.bch_code))
    .map(l => {
      const d = deviceMap.get(l.bch_code)!
      return {
        'BCH Code':     l.bch_code,
        'ชื่อเครื่อง':     d.equipment_name,
        'แผนก':        d.department ?? '',
        'วันที่เปลี่ยน':   toExcelDate(l.replaced_at),
        'ผู้เปลี่ยน':      l.replaced_by_name ?? '',
        'หมายเหตุ':     l.note ?? '',
      }
    })

  const wb = XLSX.utils.book_new()
  const wsStatus  = XLSX.utils.json_to_sheet(statusRows)
  const wsHistory = XLSX.utils.json_to_sheet(historyRows, {
    header: ['BCH Code', 'ชื่อเครื่อง', 'แผนก', 'วันที่เปลี่ยน', 'ผู้เปลี่ยน', 'หมายเหตุ'],  // ให้มีหัวตารางแม้ไม่มี log
  })

  applyDateFormat(wsStatus,  ['G', 'H'], statusRows.length)   // วันติดตั้ง, เปลี่ยนแบตล่าสุด
  applyDateFormat(wsHistory, ['D'],      historyRows.length)  // วันที่เปลี่ยน

  wsStatus['!cols']  = [14, 28, 22, 14, 14, 16, 18, 18, 12, 14, 18, 14].map(wch => ({ wch }))
  wsHistory['!cols'] = [14, 28, 22, 18, 20, 30].map(wch => ({ wch }))

  XLSX.utils.book_append_sheet(wb, wsStatus,  'สถานะ')
  XLSX.utils.book_append_sheet(wb, wsHistory, 'ประวัติการเปลี่ยน')

  XLSX.writeFile(wb, `battery-status-${today()}.xlsx`)
}
