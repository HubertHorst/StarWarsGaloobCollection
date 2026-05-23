import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

function getSecret() {
  const base = process.env.ADMIN_PASSWORD ?? 'fallback'
  return new TextEncoder().encode(
    (base + '::galoob-collection-session-key').slice(0, Math.max(32, base.length + 35))
  )
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ isLoggedIn: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

/** Server-side: read session from cookies */
export async function getIsLoggedIn(): Promise<boolean> {
  try {
    const store = await cookies()
    const token = store.get('session')?.value
    if (!token) return false
    return verifySessionToken(token)
  } catch {
    return false
  }
}
