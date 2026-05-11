import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
])

/** Max proxied image size: 8 MB */
const MAX_BYTES = 8 * 1024 * 1024

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? ''

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'image/webp,image/avif,image/*,*/*;q=0.8',
        Referer: new URL(url).origin + '/',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!upstream.ok) {
      return new NextResponse(`Upstream ${upstream.status}`, { status: 502 })
    }

    const ct = upstream.headers.get('content-type')?.split(';')[0].trim() ?? ''
    if (!ALLOWED_CONTENT_TYPES.has(ct) && !ct.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 415 })
    }

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return new NextResponse('Image too large', { status: 413 })
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': ct || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (err) {
    console.error('proxy-image error:', err)
    return new NextResponse('Proxy error', { status: 502 })
  }
}
