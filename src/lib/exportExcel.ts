// Export ข้อมูล dashboard เป็นไฟล์ Excel (.xlsx) — 2 ชีต
//   1. "สถานะ"            เครื่องละ 1 แถว (ตามที่กรองอยู่บนหน้าจอ)
//                         + วันที่เปลี่ยนแบตต่อทางขวา "เปลี่ยนครั้งที่ 1, 2, 3..." เรียงเก่า → ใหม่
//   2. "ประวัติการเปลี่ยน"   log ละ 1 แถว (มีผู้เปลี่ยน/หมายเหตุ) ของเครื่องในชีตแรก
//
// ไลบรารี xlsx โหลดแบบ dynamic import ตอนกดปุ่มเท่านั้น → ไม่ทำให้หน้า dashboard โหลดช้า
// วันที่เขียนเป็น "วันที่จริง" ของ Excel (sort/filter ได้) แสดงรูปแบบ 26 November 2026
// ⚠️ ถ้าเพิ่ม/สลับคอลัมน์ใน baseHeader ต้องแก้ index ใน dateCols ด้วย

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
  logs: Pick<BatteryLog, 'bch_code' | 'replaced_at' | 'replaced_by_name' | 'note'>[],  // ส่งเฉพาะ log ในช่วงที่เลือก
  statusLabel: Record<Status, string>,
  periodTag = '',  // เช่น '2025' หรือ '2025-03' → ต่อท้ายชื่อไฟล์
) {
  const XLSX = await import('xlsx')

  // วันที่เปลี่ยนแบตของแต่ละเครื่อง เรียงเก่า → ใหม่ (ครั้งล่าสุดอยู่ขวาสุด)
  const datesMap = new Map<string, string[]>()
  for (const l of logs) {
    const arr = datesMap.get(l.bch_code) ?? []
    arr.push(l.replaced_at)
    datesMap.set(l.bch_code, arr)
  }
  for (const arr of datesMap.values()) arr.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const maxTimes = Math.max(0, ...devices.map(d => datesMap.get(d.bch_code)?.length ?? 0))

  const baseHeader = ['BCH Code', 'ชื่อเครื่อง', 'แผนก', 'ยี่ห้อ', 'รุ่น', 'Serial No.', 'วันติดตั้ง',
    'เปลี่ยนแบตล่าสุด', 'อายุแบต (วัน)', 'รอบเปลี่ยน (วัน)', 'เหลือ/เกินกำหนด (วัน)', 'สถานะ']
  const timesHeader = Array.from({ length: maxTimes }, (_, i) => `เปลี่ยนครั้งที่ ${i + 1}`)

  const rows = devices.map(d => {
    const remaining = d.days_since === null ? null : d.replace_interval_days - d.days_since
    const row: Record<string, string | number | null> = {
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
    ;(datesMap.get(d.bch_code) ?? []).forEach((iso, i) => { row[timesHeader[i]] = toExcelDate(iso) })
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...baseHeader, ...timesHeader] })

  // คอลัมน์วันที่: วันติดตั้ง (G), เปลี่ยนแบตล่าสุด (H), เปลี่ยนครั้งที่ 1..N (M เป็นต้นไป)
  const dateCols = [6, 7, ...timesHeader.map((_, i) => baseHeader.length + i)].map(c => XLSX.utils.encode_col(c))
  applyDateFormat(ws, dateCols, rows.length)

  ws['!cols'] = [14, 28, 22, 14, 14, 16, 18, 18, 12, 14, 18, 14, ...timesHeader.map(() => 18)].map(wch => ({ wch }))

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
  const wsHistory = XLSX.utils.json_to_sheet(historyRows, {
    header: ['BCH Code', 'ชื่อเครื่อง', 'แผนก', 'วันที่เปลี่ยน', 'ผู้เปลี่ยน', 'หมายเหตุ'],  // ให้มีหัวตารางแม้ไม่มี log
  })
  applyDateFormat(wsHistory, ['D'], historyRows.length)  // วันที่เปลี่ยน
  wsHistory['!cols'] = [14, 28, 22, 18, 20, 30].map(wch => ({ wch }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'สถานะ')
  XLSX.utils.book_append_sheet(wb, wsHistory, 'ประวัติการเปลี่ยน')

  const name = periodTag ? `battery-status-${periodTag}_${today()}` : `battery-status-${today()}`
  XLSX.writeFile(wb, `${name}.xlsx`)
}
