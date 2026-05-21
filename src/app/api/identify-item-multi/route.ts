import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
const SUPPORTED_TYPES: SupportedMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function normalizeUrl(url: string) {
  return url.startsWith('//') ? `https:${url}` : url
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; contentType: SupportedMediaType } | null> {
  try {
    const res = await fetch(normalizeUrl(url))
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const rawType = res.headers.get('content-type') ?? 'image/jpeg'
    const contentType: SupportedMediaType = SUPPORTED_TYPES.includes(rawType as SupportedMediaType)
      ? (rawType as SupportedMediaType)
      : 'image/jpeg'
    return { base64: Buffer.from(buffer).toString('base64'), contentType }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json() as { urls: string[] }
    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    }

    // Fetch all images in parallel (max 10)
    const fetched = await Promise.all(urls.slice(0, 10).map(fetchImageAsBase64))
    const images = fetched.filter((x): x is { base64: string; contentType: SupportedMediaType } => x !== null)

    if (images.length === 0) {
      return NextResponse.json({ error: 'Could not fetch any image' }, { status: 502 })
    }

    const imageBlocks: Anthropic.ImageBlockParam[] = images.map((img) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.contentType, data: img.base64 },
    }))

    const photoCount = images.length
    const photoNote = photoCount > 1
      ? `You have ${photoCount} photos of the same item (front, back, sides, etc.). Analyze ALL of them — the back of the box typically has the most detail: set number near the barcode, copyright year, and the full product name.`
      : 'You have 1 photo of this item.'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `Look at these images and identify the Star Wars Galoob collectible item. ${photoNote}

Return ONLY a valid JSON object with these exact fields:
{
  "name": "exact item name as printed on the box",
  "serie": one of ["Action Fleet : Classic Vessel","Action Fleet : Alpha Series","Action Fleet : Transforming Playsets","Action Fleet : Sonderserie","Action Fleet : Battle Packs","Hasbro Saga Action Fleet 2002 : Vessel","Hasbro Saga Action Fleet 2002 : Battle Packs","Micro Machines : Playsets","Micro Machines : Transforming Action Sets","Micro Machines : Mini Figures","Micro Machines : Original 3 Pack Filme","Micro Machines : Original 3 Pack","Micro Machines : Mini Heads","Micro Machines : Gift Sets"] or null,
  "set_nummer": "set number if visible (e.g. '#7', '67076') or null",
  "jahr": year_as_integer_or_null,
  "zustand": one of ["Neu in Box","Box Neuwertig","Box mit Gebrauchspuren","Box Beschädigt"] or null
}

Use null for any field you cannot determine. Be precise with the name — copy it exactly as printed.`,
          },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ name: null, serie: null, set_nummer: null, jahr: null, zustand: null })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      name:       result.name       ?? null,
      serie:      result.serie      ?? null,
      set_nummer: result.set_nummer ?? null,
      jahr:       typeof result.jahr === 'number' ? result.jahr : null,
      zustand:    result.zustand    ?? null,
    })
  } catch (err) {
    console.error('identify-item-multi error:', err)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
}
