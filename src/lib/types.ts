// รูปแบบข้อมูลอุปกรณ์
export interface Device {
  id: string
  bch_code: string
  item_no: number | null
  department: string | null
  equipment_name: string
  brand: string | null
  model: string | null
  serial_no: string | null
  risk_level: string | null
  install_date: string | null
  warranty: string | null
  replace_interval_days: number
  notes: string | null
  created_at: string
}

// รูปแบบข้อมูล log การเปลี่ยนแบต
export interface BatteryLog {
  id: string
  bch_code: string
  replaced_at: string
  replaced_by_name: string | null
  note: string | null
  created_at: string
}
