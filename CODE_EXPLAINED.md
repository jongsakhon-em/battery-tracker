# อธิบาย Code ระบบ Battery Tracker (ภาษาไทย)

---

## ส่วนที่ 1 — โครงสร้างโปรเจค

```
battery-tracker/
├── src/
│   ├── app/                    ← หน้าเว็บทั้งหมด
│   │   ├── layout.tsx          ← กรอบหลักของทุกหน้า
│   │   ├── globals.css         ← สีและ style ทั้งระบบ
│   │   ├── login/page.tsx      ← หน้า login
│   │   ├── scan/page.tsx       ← หน้าค้นหา + บันทึกแบต
│   │   ├── dashboard/page.tsx  ← หน้าสรุปสถานะ
│   │   ├── import/page.tsx     ← หน้าเพิ่มเครื่อง
│   │   └── device/[code]/page.tsx ← หน้าประวัติรายเครื่อง
│   ├── components/
│   │   └── NavBar.tsx          ← แถบเมนูด้านล่าง (มือถือ)
│   └── lib/
│       ├── supabase.ts         ← ตัวเชื่อมต่อ database
│       ├── types.ts            ← กำหนดรูปแบบข้อมูล
│       └── useRequireAuth.ts   ← เช็คว่า login อยู่ไหม
├── next.config.ts              ← ตั้งค่า Next.js
└── .env.local                  ← เก็บ URL และ Key ของ Supabase (ห้าม commit)
```

**กฎของ Next.js App Router:**
ถ้าสร้างโฟลเดอร์ชื่ออะไร แล้วใส่ `page.tsx` ข้างใน
จะกลายเป็น URL นั้นเลย เช่น `app/scan/page.tsx` → `เว็บ.com/scan`

---

## ส่วนที่ 2 — ไฟล์ `globals.css` (สีและ style พื้นฐาน)

```css
:root {
  --bg: #0A0E14;        /* สีพื้นหลังหลัก (ดำเข้ม) */
  --surface: #141A22;   /* สีพื้นหลังกล่อง (เทาเข้ม) */
  --surface2: #1C2430;  /* สีพื้นหลัง input */
  --border: #253041;    /* สีเส้นขอบ */
  --amber: #F59E0B;     /* สีหลักส้มเหลือง (ปุ่ม, highlight) */
  --text: #D4E0F0;      /* สีตัวหนังสือหลัก */
  --text-muted: #6B7E99;/* สีตัวหนังสือรอง (จางๆ) */
  --red: #EF4444;       /* สีแดง (เกินกำหนด, error) */
  --green: #10B981;     /* สีเขียว (ปกติ, สำเร็จ) */
}
```

**วิธีใช้สีใน code:**
แทนที่จะเขียนสีตรงๆ เช่น `color: #F59E0B`
เราใช้ชื่อตัวแปร เช่น `color: var(--amber)`
ข้อดี: ถ้าอยากเปลี่ยนสีทั้งระบบ แก้ที่เดียวที่ `:root` ได้เลย

```css
.input-field {
  background: var(--surface2);  /* พื้นหลัง input */
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 16px;  /* ป้องกัน iOS zoom อัตโนมัติตอนแตะ input */
}
```

---

## ส่วนที่ 3 — ไฟล์ `lib/supabase.ts` (ตัวเชื่อมต่อ Database)

```typescript
import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null  // เก็บ client ไว้ที่นี่

export function createClient() {
  if (!client) {  // ถ้ายังไม่มี → สร้างใหม่
    client = _createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,   // URL จาก .env.local
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Key จาก .env.local
    )
  }
  return client  // ถ้ามีแล้ว → ส่งคืนอันเดิม
}
```

**ทำไมต้องทำแบบนี้ (Singleton Pattern)?**
ถ้าสร้าง client ใหม่ทุกครั้งที่เรียกใช้ จะได้ warning ว่ามี client ซ้ำ
เลยเก็บ client ไว้ใน `let client` สร้างแค่ครั้งแรกครั้งเดียว
ครั้งต่อไปที่เรียก `createClient()` จะได้ตัวเดิมเสมอ

**วิธีใช้งาน:**
```typescript
const supabase = createClient()

// ดึงข้อมูล
const { data } = await supabase.from('devices').select('*')

// เพิ่มข้อมูล
const { error } = await supabase.from('battery_logs').insert({ ... })

// login
const { data } = await supabase.auth.signInWithPassword({ email, password })
```

---

## ส่วนที่ 4 — ไฟล์ `lib/types.ts` (รูปแบบข้อมูล)

```typescript
// กำหนดว่าข้อมูล "เครื่อง" มีอะไรบ้าง
export interface Device {
  id: string                    // ID อัตโนมัติจาก Supabase
  bch_code: string              // รหัสเครื่อง เช่น BCH_00001 (ห้ามซ้ำ)
  equipment_name: string        // ชื่อเครื่อง (บังคับ)
  department: string | null     // แผนก (ไม่บังคับ → null ได้)
  brand: string | null          // ยี่ห้อ
  model: string | null          // รุ่น
  serial_no: string | null      // serial number
  risk_level: string | null     // High / Medium / Low
  replace_interval_days: number // ต้องเปลี่ยนแบตทุกกี่วัน (default 365)
  created_at: string            // วันที่เพิ่มเข้าระบบ
}

// กำหนดว่าข้อมูล "การเปลี่ยนแบต" มีอะไรบ้าง
export interface BatteryLog {
  id: string
  bch_code: string              // อ้างอิงไปยังตาราง devices
  replaced_at: string           // วันเวลาที่เปลี่ยน
  replaced_by_name: string | null // ชื่อช่าง (ไม่บังคับ)
  note: string | null           // หมายเหตุ
  created_at: string
}
```

**`string | null` คืออะไร?**
แปลว่า field นี้เป็น string ก็ได้ หรือ null (ว่าง) ก็ได้
ใช้กับข้อมูลที่ไม่บังคับกรอก

---

## ส่วนที่ 5 — ไฟล์ `lib/useRequireAuth.ts` (ตรวจสอบ Login)

```typescript
import { useEffect } from 'react'
import { createClient } from './supabase'

export function useRequireAuth() {
  useEffect(() => {                        // ทำงานหลังหน้าโหลดเสร็จ
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {                      // ถ้าไม่มี session = ยังไม่ได้ login
        window.location.href = '/login'    // พาไปหน้า login
      }
    })
  }, [])  // [] = ทำแค่ครั้งเดียวตอนเปิดหน้า
}
```

**session คืออะไร?**
หลัง login สำเร็จ Supabase จะสร้าง session และเก็บไว้ใน localStorage ของ browser
Session = หลักฐานว่า login แล้ว (มีอายุประมาณ 1 ชั่วโมง แล้ว refresh อัตโนมัติ)

**วิธีใช้ใน page:**
```typescript
export default function ScanPage() {
  useRequireAuth()  // แค่บรรทัดนี้บรรทัดเดียว ก็จะ redirect ไป login ถ้ายังไม่ได้ login
  ...
}
```

---

## ส่วนที่ 6 — ไฟล์ `app/login/page.tsx` (หน้า Login)

```typescript
'use client'  // บอก Next.js ว่า component นี้ทำงานฝั่ง browser (ไม่ใช่ server)

export default function LoginPage() {
  // useState = เก็บค่าที่เปลี่ยนได้ในหน้า
  const [email,    setEmail]    = useState('')       // ค่าใน input email
  const [password, setPassword] = useState('')       // ค่าใน input password
  const [error,    setError]    = useState('')       // ข้อความ error (ถ้ามี)
  const [loading,  setLoading]  = useState(false)    // กำลัง login อยู่ไหม

  async function handleLogin() {
    if (loading) return           // ถ้ากด login ซ้ำระหว่างโหลด ให้หยุด
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    //     ↑ ผลลัพธ์                ↑ error ถ้ามี

    if (error) {
      setError(error.message)  // แสดง error เช่น "Invalid login credentials"
      setLoading(false)
      return
    }

    window.location.href = '/scan'  // login สำเร็จ → ไปหน้าค้นหา
  }

  return (
    <div> {/* ใช้ div ไม่ใช้ form เพื่อป้องกัน mobile browser refresh หน้าตอนกด submit */}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />

      {error && <p style={{ color: 'red' }}>{error}</p>}  {/* แสดง error ถ้ามี */}

      <button type="button" onClick={handleLogin}>  {/* type="button" ป้องกัน form submit */}
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </div>
  )
}
```

**`onChange={e => setEmail(e.target.value)}` คืออะไร?**
ทุกครั้งที่พิมพ์ใน input ตัว `e` คือ event
`e.target.value` คือข้อความที่พิมพ์อยู่ตอนนั้น
`setEmail(...)` คือเอาข้อความนั้นไปเก็บใน state

---

## ส่วนที่ 7 — ไฟล์ `app/scan/page.tsx` (หน้าหลัก)

### State ทั้งหมดของหน้า

```typescript
type PageState = 'idle' | 'loading' | 'found' | 'not_found' | 'logging' | 'success'
//               ว่าง     โหลดอยู่   เจอแล้ว   ไม่เจอ       กำลังบันทึก  บันทึกสำเร็จ

const [bchCode,    setBchCode]    = useState('')           // รหัสที่พิมพ์
const [state,      setState]      = useState('idle')       // สถานะหน้าตอนนี้
const [device,     setDevice]     = useState(null)         // ข้อมูลเครื่องที่เจอ
const [lastLog,    setLastLog]    = useState(null)         // log การเปลี่ยนล่าสุด
const [techName,   setTechName]   = useState('')           // ชื่อช่าง
const [note,       setNote]       = useState('')           // หมายเหตุ
const [replacedAt, setReplacedAt] = useState(เวลาตอนนี้)  // วันเวลาที่เปลี่ยน
```

### ฟังก์ชันค้นหา

```typescript
async function searchDevice() {
  let code = bchCode.trim().toUpperCase()  // เอา space ออก + ตัวพิมพ์ใหญ่ทั้งหมด

  // ถ้ากรอกแค่เลข เช่น "1" → เป็น "BCH_00001"
  if (/^\d+$/.test(code)) {
    code = 'BCH_' + code.padStart(5, '0')
  }

  setState('loading')
  const supabase = createClient()

  // Query ที่ 1: หาเครื่องจาก BCH Code
  const { data: deviceData } = await supabase
    .from('devices')   // จากตาราง devices
    .select('*')       // เอาทุก column
    .eq('bch_code', code)  // where bch_code = code
    .single()          // คาดว่าได้แค่ 1 แถว

  if (!deviceData) {
    setState('not_found')
    return
  }

  // Query ที่ 2: หา log การเปลี่ยนล่าสุด
  const { data: logData } = await supabase
    .from('battery_logs')
    .select('*')
    .eq('bch_code', code)
    .order('replaced_at', { ascending: false })  // เรียงจากใหม่ไปเก่า
    .limit(1)          // เอาแค่อันแรก (ล่าสุด)
    .maybeSingle()     // อาจไม่มีก็ได้ (null ถ้าไม่เคยเปลี่ยน)

  setDevice(deviceData)
  setLastLog(logData)
  setState('found')
}
```

### ฟังก์ชันบันทึก

```typescript
async function handleLog() {
  setState('logging')
  const supabase = createClient()

  const { error } = await supabase.from('battery_logs').insert({
    bch_code:         device.bch_code,
    replaced_by_name: techName || null,  // ถ้าไม่กรอก ให้เป็น null
    note:             note || null,
    replaced_at:      new Date(replacedAt).toISOString(),  // แปลงเป็น format ที่ DB เข้าใจ
  })

  if (error) {
    alert('เกิดข้อผิดพลาด')
    setState('found')
    return
  }

  setState('success')  // แสดงหน้าสำเร็จ
}
```

### คำนวณสถานะแบต

```typescript
function getDaysInfo() {
  if (!lastLog) return null

  // จำนวนวันที่ผ่านมา = (เวลาตอนนี้ - เวลาที่เปลี่ยนล่าสุด) หารด้วย millisecond ใน 1 วัน
  const days = Math.floor((Date.now() - new Date(lastLog.replaced_at).getTime()) / 86400000)

  return { days, date: ... }
}

const isOverdue = daysInfo.days > device.replace_interval_days
// ถ้าจำนวนวันที่ผ่านมา > รอบที่กำหนด = เกินกำหนด
```

---

## ส่วนที่ 8 — ไฟล์ `app/dashboard/page.tsx` (หน้าสรุป)

หน้านี้ต้องแสดงสถานะเครื่องทุกเครื่อง — ปัญหาคือถ้าดึงข้อมูล 1 query ต่อ 1 เครื่อง
ถ้ามี 1,000 เครื่อง = 1,000 queries → ช้ามาก

**วิธีแก้: ดึงแค่ 2 queries รวมทั้งหมด**

```typescript
// Query 1: ดึงเครื่องทุกเครื่อง
const { data: devices } = await supabase.from('devices').select('*')

// Query 2: ดึง log ทั้งหมด
const { data: logs } = await supabase.from('battery_logs').select('*')

// สร้าง Map: bch_code → log ล่าสุด (ทำใน JavaScript ไม่ต้อง query เพิ่ม)
const latestLogMap = new Map()
for (const log of logs) {
  const existing = latestLogMap.get(log.bch_code)
  // ถ้ายังไม่มี หรือ log นี้ใหม่กว่า → เก็บอันนี้
  if (!existing || new Date(log.replaced_at) > new Date(existing.replaced_at)) {
    latestLogMap.set(log.bch_code, log)
  }
}

// ตอนนี้หาข้อมูลแบตล่าสุดของเครื่องไหนก็ได้แค่
const log = latestLogMap.get('BCH_00001')
```

**Map คืออะไร?**
เหมือน dictionary หรือ object ใน PHP
`map.set(key, value)` = เก็บค่า
`map.get(key)` = ดึงค่า
เร็วกว่าการ loop หาทุกครั้ง

---

## ส่วนที่ 9 — ไฟล์ `app/import/page.tsx` (หน้าเพิ่มเครื่อง)

หน้านี้มี 2 โหมดสลับกันด้วย Tab:

```typescript
type Tab = 'manual' | 'csv'
const [tab, setTab] = useState<Tab>('manual')  // เริ่มที่ manual

// แสดง component ตาม tab ที่เลือก
{tab === 'manual' ? <ManualForm /> : <CsvImport />}
```

### ManualForm — เพิ่มทีละเครื่อง

```typescript
async function handleSubmit() {
  const { error } = await supabase.from('devices').insert({ ... })

  if (!error) {
    setResult('success')
  } else if (error.code === '23505') {  // error code ของ duplicate key
    setResult('duplicate')  // BCH Code ซ้ำ
  } else {
    setResult('error')
  }
}
```

### CsvImport — นำเข้าหลายเครื่องจาก CSV

```typescript
// ใช้ library papaparse อ่านไฟล์ CSV
Papa.parse(file, {
  header: true,       // บรรทัดแรกเป็น header (ชื่อ column)
  skipEmptyLines: true,
  complete: async (res) => {
    // res.data = array ของ object แต่ละแถว
    for (const row of res.data) {
      await supabase.from('devices').upsert(
        { bch_code: row.bch_code, ... },
        { onConflict: 'bch_code' }  // ถ้า BCH Code ซ้ำ → update แทน insert
      )
    }
  }
})
```

**upsert คืออะไร?**
= update + insert รวมกัน
ถ้าไม่มีข้อมูล → insert (เพิ่มใหม่)
ถ้ามีแล้ว (BCH Code ซ้ำ) → update (อัปเดตข้อมูล)

---

## ส่วนที่ 10 — ไฟล์ `components/NavBar.tsx` (แถบเมนู)

```typescript
export default function NavBar() {
  const pathname = usePathname()  // URL ตอนนี้ เช่น "/scan"

  return (
    <>
      {/* Desktop: แถบบน — hidden sm:flex = ซ่อนบนมือถือ แสดงบน sm ขึ้นไป */}
      <header className="hidden sm:flex ...">
        ...nav links...
      </header>

      {/* Mobile: แถบล่าง — sm:hidden = แสดงบนมือถือ ซ่อนบน sm ขึ้นไป */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 ...">
        {navItems.map(item => {
          const active = pathname === item.href  // ถ้า URL ตรงกับ link นี้ = active
          return (
            <Link href={item.href} style={{ color: active ? 'amber' : 'gray' }}>
              ...
            </Link>
          )
        })}
      </nav>
    </>
  )
}
```

**Logout:**
```typescript
async function handleLogout() {
  await supabase.auth.signOut()       // ลบ session ออก
  window.location.href = '/login'     // ไปหน้า login
}
```

---

## ส่วนที่ 11 — ไฟล์ `next.config.ts` (ตั้งค่า Next.js)

```typescript
const nextConfig = {
  allowedDevOrigins: ['192.168.1.7'],  // อนุญาตให้ IP มือถือในบ้านเข้า dev server ได้
  typescript: {
    ignoreBuildErrors: true,  // ข้าม TypeScript error ตอน build ขึ้น Vercel
  },
}
```

---

## ส่วนที่ 12 — `.env.local` (ค่า config ลับ)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

**ทำไมต้องขึ้นต้นด้วย `NEXT_PUBLIC_`?**
Next.js จะซ่อน env variable ทั้งหมดไว้ฝั่ง server
ถ้าอยากให้ browser (JavaScript ฝั่ง client) เข้าถึงได้ต้องขึ้นต้นด้วย `NEXT_PUBLIC_`

**ทำไมไม่ commit ไฟล์นี้?**
เพราะมี key ลับ — ถ้าใครเห็นก็เข้า database เราได้
ใส่ใน `.gitignore` แล้ว → git จะไม่เอาไป
บน Vercel ใส่ผ่าน Environment Variables แทน

---

## สรุปภาพรวม Flow ทั้งระบบ

```
Browser                          Supabase (Cloud)
   │                                    │
   │  1. เปิดเว็บ /scan                  │
   │──────────────────────────────────→ │  useRequireAuth เช็ค session
   │  ถ้าไม่มี session                   │
   │←── redirect /login ─────────────── │
   │                                    │
   │  2. กรอก email+password กด login   │
   │──────────────────────────────────→ │  auth.signInWithPassword()
   │←── session (เก็บใน localStorage) ──│
   │                                    │
   │  3. กรอก BCH Code กดค้นหา          │
   │──────────────────────────────────→ │  SELECT * FROM devices WHERE bch_code = ?
   │──────────────────────────────────→ │  SELECT * FROM battery_logs WHERE bch_code = ?
   │←── ข้อมูลเครื่อง + log ล่าสุด ────  │
   │                                    │
   │  4. กดบันทึกเปลี่ยนแบต             │
   │──────────────────────────────────→ │  INSERT INTO battery_logs (...)
   │←── success ──────────────────────  │
```
