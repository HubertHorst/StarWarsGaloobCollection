import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Two-step DuckDuckGo image search.
 * Step 1: fetch the HTML page to obtain the required `vqd` session token.
 * Step 2: call the i.js JSON endpoint with that token.
 *
 * IMPORTANT: both fetches must use cache: 'no-store'.
 * Next.js App Router caches fetch() responses by default; reusing a cached
 * vqd token for a second request causes DDG to return an error.
 */
async function searchDDG(q: string): Promise<string[]> {
  // ── Step 1: get vqd token ──────────────────────────────────────────────────
  const initRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
    {
      cache: 'no-store',
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
    },
  )
  if (!initRes.ok) throw new Error(`DDG init failed: ${initRes.status}`)

  const initBody = await initRes.text()

  const m = initBody.match(/vqd=['"]?([\d-]+)['"]?/)
  const vqd = m?.[1]
  if (!vqd) throw new Error('DDG vqd token not found in response')

  // ── Step 2: fetch image results ────────────────────────────────────────────
  const imgRes = await fetch(
    `https://duckduckgo.com/i.js` +
      `?q=${encodeURIComponent(q)}&p=1&s=0&u=bing&l=us-en&o=json&vqd=${encodeURIComponent(vqd)}`,
    {
      cache: 'no-store',
      headers: {
        'User-Agent': UA,
        Referer: 'https://duckduckgo.com/',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    },
  )
  if (!imgRes.ok) throw new Error(`DDG i.js failed: ${imgRes.status}`)

  const data = (await imgRes.json()) as { results?: Array<{ image?: string }> }
  return (data.results ?? [])
    .map((r) => r.image)
    .filter((u): u is string => !!u && u.startsWith('http'))
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json({ urls: [] })

  try {
    const urls = await searchDDG(q.trim())
    return NextResponse.json({ urls: urls.slice(0, 16) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cover-search error:', message)
    // Return the error so the modal can show it instead of silently showing nothing
    return NextResponse.json({ urls: [], error: message })
  }
}
