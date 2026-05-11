import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Bing Images async endpoint — returns a server-rendered HTML fragment
 * (no JavaScript required, no session token needed).
 * The full-resolution URLs are embedded as murl&quot;:&quot;...
 */
async function searchBingAsync(
  q: string,
): Promise<{ urls: string[]; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {}

  const url =
    `https://www.bing.com/images/async` +
    `?q=${encodeURIComponent(q)}&first=1&count=35&adlt=off&qft=`
  debug.url = url

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.bing.com/',
    },
  })

  debug.status = res.status
  if (!res.ok) {
    debug.error = `Bing HTTP ${res.status}`
    return { urls: [], debug }
  }

  const body = await res.text()
  debug.bodyLen = body.length

  const hits = [
    ...body.matchAll(
      /murl&quot;:&quot;(https?:\/\/[^&"<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^&"<>]*)?)/gi,
    ),
  ]

  debug.rawHits = hits.length

  const urls = hits
    .map((m) => m[1])
    .filter((u) => !/\.wp\.com/i.test(u))
    .filter((u) => !/placeholder/i.test(u))

  debug.resultCount = urls.length
  if (urls.length === 0) debug.bodySnippet = body.substring(0, 300)

  return { urls, debug }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const isDebug = req.nextUrl.searchParams.get('debug') === '1'

  if (!q.trim()) return NextResponse.json({ urls: [] })

  try {
    const { urls, debug } = await searchBingAsync(q.trim())
    const result = { urls: urls.slice(0, 16) }
    if (isDebug) return NextResponse.json({ ...result, debug })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cover-search error:', message)
    return NextResponse.json({ urls: [], error: message })
  }
}
