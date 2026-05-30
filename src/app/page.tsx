import { redirect } from 'next/navigation'

// หน้าหลัก redirect ไปที่หน้าสแกนทันที
export default function Home() {
  redirect('/scan')
}
