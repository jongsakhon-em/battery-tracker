// ดึงข้อมูลจาก Supabase ให้ครบทุกแถว
// Supabase/PostgREST คืนได้สูงสุด 1,000 แถวต่อ request (ค่า max-rows)
// ถ้าไม่แบ่งหน้า ข้อมูลส่วนเกินจะหายเงียบๆ → ฟังก์ชันนี้ดึงทีละหน้าจนหมด
//
// วิธีใช้: ส่งฟังก์ชันที่สร้าง query พร้อม .range(from, to)
//   const rows = await fetchAll<Device>((from, to) =>
//     supabase.from('devices').select('*').order('bch_code').range(from, to))
//
// ⚠️ query ต้องมี .order() ที่ลำดับคงที่ (ไม่ซ้ำ) ไม่งั้นแถวอาจซ้ำ/หล่นระหว่างหน้า

const PAGE_SIZE = 1000

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAll<T>(buildQuery: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const all: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break  // หน้าสุดท้าย
  }
  return all
}
