import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function searchDDG(q: string): Promise<{ urls: string[]; debug: Record<string, unknown> }> {
  const debug: Record<string, unknown> = {}

  // ── Step 1: get vqd token ──────────────────────────────────────────────────
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`
  const initRes = await fetch(initUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  debug.initStatus = initRes.status
  debug.initUrl = initUrl

  if (!initRes.ok) {
    debug.error = `DDG init HTTP ${initRes.status}`
    return { urls: [], debug }
  }

  const initBody = await initRes.text()
  debug.initBodyLen = initBody.length

  // Try several vqd patterns — DDG occasionally changes the format
  const vqdPatterns = [
    /vqd=['"]?([\d-]+)['"]?/,            // digits+hyphens (original)
    /"vqd"\s*:\s*"([^"]+)"/,             // JSON key
    /vqd=([a-zA-Z0-9_%-]+)/,             // alphanumeric / percent-encoded
    /[&?]vqd=([^&"'<>\s]+)/,             // query-string style
    /vqd\\?["']?\s*[:=]\s*\\?["']?([^\\&"'<>\s,;]+)/, // escaped variants
  ]
  let vqd: string | undefined
  for (const p of vqdPatterns) {
    const m = initBody.match(p)
    if (m?.[1]) { vqd = m[1]; debug.vqdPattern = p.toString(); break }
  }

  // Debug: find where "vqd" appears in the body
  const vqdIdx = initBody.indexOf('vqd')
  debug.vqd = vqd ?? null
  debug.vqdIdx = vqdIdx
  debug.vqdContext = vqdIdx >= 0 ? initBody.substring(Math.max(0, vqdIdx - 10), vqdIdx + 60) : 'NOT FOUND'
  debug.bodyStart = initBody.substring(0, 200)

  if (!vqd) {
    debug.error = 'vqd token not found'
    return { urls: [], debug }
  }

  // ── Step 2: fetch image results ────────────────────────────────────────────
  const imgUrl =
    `https://duckduckgo.com/i.js` +
    `?q=${encodeURIComponent(q)}&p=1&s=0&u=bing&l=us-en&o=json&vqd=${vqd}`

  const imgRes = await fetch(imgUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': UA,
      Referer: 'https://duckduckgo.com/',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  debug.imgStatus = imgRes.status
  debug.imgUrl = imgUrl

  if (!imgRes.ok) {
    debug.error = `DDG i.js HTTP ${imgRes.status}`
    return { urls: [], debug }
  }

  const text = await imgRes.text()
  debug.imgBodyLen = text.length
  debug.imgBodySnippet = text.substring(0, 200)

  let data: { results?: Array<{ image?: string }> }
  try {
    data = JSON.parse(text)
  } catch (e) {
    debug.error = `JSON parse failed: ${e}`
    return { urls: [], debug }
  }

  debug.resultCount = data.results?.length ?? 0

  const urls = (data.results ?? [])
    .map((r) => r.image)
    .filter((u): u is string => !!u && u.startsWith('http'))

  return { urls, debug }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const isDebug = req.nextUrl.searchParams.get('debug') === '1'

  if (!q.trim()) return NextResponse.json({ urls: [] })

  try {
    const { urls, debug } = await searchDDG(q.trim())
    if (isDebug) return NextResponse.json({ urls: urls.slice(0, 16), debug })
    return NextResponse.json({ urls: urls.slice(0, 16) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cover-search error:', message)
    if (isDebug) return NextResponse.json({ urls: [], error: message })
    return NextResponse.json({ urls: [], error: message })
  }
}
