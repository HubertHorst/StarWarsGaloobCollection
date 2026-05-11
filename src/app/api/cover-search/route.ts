import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json({ urls: [] })

  try {
    const searchUrl =
      `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&first=1&count=20&safeSearch=Off`

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
    })

    if (!res.ok) {
      console.error('Bing search failed:', res.status)
      return NextResponse.json({ urls: [] })
    }

    const body = await res.text()

    // Extract full-resolution image URLs from Bing's JSON blobs
    const allMatches = [
      ...body.matchAll(
        /murl&quot;:&quot;(https?:\/\/[^&"<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^&"<>]*)?)/gi,
      ),
    ]

    const urls = allMatches
      .map((m) => m[1])
      .filter((u) => !/\.wp\.com/i.test(u))   // skip WordPress CDN proxy
      .filter((u) => !/placeholder/i.test(u))  // skip obvious placeholders
      .slice(0, 12)

    return NextResponse.json({ urls })
  } catch (err) {
    console.error('cover-search error:', err)
    return NextResponse.json({ urls: [], error: String(err) })
  }
}
