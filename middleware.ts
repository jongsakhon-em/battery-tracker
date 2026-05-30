import { NextResponse, type NextRequest } from 'next/server'

// Auth ตรวจสอบ client-side แทน (localStorage ทำงานกับ HTTP + IP ได้)
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
