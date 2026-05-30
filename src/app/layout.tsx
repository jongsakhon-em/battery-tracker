import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Battery Tracker',
  description: 'ระบบบันทึกการเปลี่ยนแบตเตอรี่อุปกรณ์การแพทย์',
}

// ป้องกันมือถือ zoom หน้าจออัตโนมัติ
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${barlowCondensed.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        {children}
      </body>
    </html>
  )
}
