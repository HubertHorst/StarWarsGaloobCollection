import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({ error: 'Ungültige Zugangsdaten' }, { status: 401 })
  }

  const token = await createSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}
