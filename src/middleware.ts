import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth'

/**
 * Edge middleware that protects every write endpoint under /api/*.
 *
 *  - GET methods pass through (everyone can read the collection)
 *  - /api/auth/* is public so login/logout work
 *  - Anything else (POST, PATCH, PUT, DELETE on /api/*) requires a
 *    valid 'session' cookie issued by /api/auth/login
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  if (!pathname.startsWith('/api/')) return NextResponse.next()
  if (pathname.startsWith('/api/auth/')) return NextResponse.next()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return NextResponse.next()

  const token = req.cookies.get('session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }
  const ok = await verifySessionToken(token)
  if (!ok) {
    return NextResponse.json({ error: 'Sitzung abgelaufen' }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
