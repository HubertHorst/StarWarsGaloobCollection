import { NextRequest, NextResponse } from 'next/server'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/**
 * Two-step DuckDuckGo image search:
 * 1. Fetch the HTML page to get the required `vqd` session token
 * 2. Use the token to call the i.js JSON endpoint
 *
 * Returns the full-resolution `image` URL for each result (from eBay,
 * Etsy, dallasvintagetoys, figurerealm, etc.)
 */
async function searchDDG(q: string): Promise<string[]> {
  // Step 1 – obtain vqd token
  const initRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
    { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } },
  )
  const initBody = await initRes.text()
  const vqd =
    initBody.match(/vqd=['"]([^'"]+)['"]/)?.[1] ??
    initBody.match(/vqd=([0-9-]+)/)?.[1]

  if (!vqd) {
    console.warn('DDG: no vqd token found')
    return []
  }

  // Step 2 – fetch image results JSON
  const imgUrl =
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}` +
    `&p=1&s=0&u=bing&l=us-en&o=json&vqd=${encodeURIComponent(vqd)}`

  const imgRes = await fetch(imgUrl, {
    headers: {
      'User-Agent': UA,
      Referer: 'https://duckduckgo.com/',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!imgRes.ok) {
    console.warn('DDG i.js failed:', imgRes.status)
    return []
  }

  const data = await imgRes.json() as { results?: Array<{ image?: string }> }
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
    console.error('cover-search error:', err)
    return NextResponse.json({ urls: [], error: String(err) })
  }
}
