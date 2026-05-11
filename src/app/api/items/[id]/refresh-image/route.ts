import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import Anthropic from '@anthropic-ai/sdk'
import { getDbReady, logChange } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'

const anthropic = new Anthropic()

function normalizeUrl(url: string) {
  return url.startsWith('//') ? `https:${url}` : url
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const preview = new URL(req.url).searchParams.get('preview') === '1'
  try {
    const { id } = await params
    const db = await getDbReady()

    // load item
    const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const row = rows[0] as Record<string, unknown>
    const userPhotos: string[] = safeParseJson(row.user_photos) ?? []

    // pick best image: prefer user photos, fall back to cloudinary cover
    const cover = row.cover_url as string | null
    const imageUrl =
      userPhotos[0] ??
      (cover && cover.includes('cloudinary') ? cover : null)

    if (!imageUrl) {
      return NextResponse.json({ error: 'Kein eigenes Foto vorhanden für die Identifikation' }, { status: 422 })
    }

    // fetch image
    let imgRes: Response
    try {
      imgRes = await fetch(normalizeUrl(imageUrl))
    } catch (e) {
      return NextResponse.json({ error: `Foto konnte nicht geladen werden: ${e}` }, { status: 502 })
    }
    if (!imgRes.ok) return NextResponse.json({ error: `Foto-Download fehlgeschlagen (${imgRes.status})` }, { status: 502 })

    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const rawType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const contentType = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(rawType)
      ? rawType
      : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

    // identify with Claude
    let identified: { name: string | null; serie: string | null; set_nummer: string | null; jahr: number | null; zustand: string | null }
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: contentType, data: base64 } },
            { type: 'text', text: 'Look at this image and identify the Star Wars Galoob collectible item. Return JSON with these exact fields: { "name": "item name", "serie": one of ["Action Fleet : Classic Vessel","Action Fleet : Alpha Series","Action Fleet : Transforming Playsets","Action Fleet : Sonderserie","Action Fleet : Battle Packs","Hasbro Saga Action Fleet 2002 : Vessel","Hasbro Saga Action Fleet 2002 : Battle Packs","Micro Machines : Playsets","Micro Machines : Transforming Action Sets","Micro Machines : Mini Figures","Micro Machines : Original 3 Pack Filme","Micro Machines : Original 3 Pack","Micro Machines : Mini Heads","Micro Machines : Gift Sets"] or null, "set_nummer": "set number if visible or null", "jahr": year_as_number_or_null, "zustand": "Neu in Box|Box Neuwertig|Box mit Gebrauchspuren|Box Beschädigt" }. If you cannot identify the item, return { "name": null, "serie": null, "set_nummer": null, "jahr": null, "zustand": null }.' },
          ],
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      identified = jsonMatch ? JSON.parse(jsonMatch[0]) : { name: null, serie: null, set_nummer: null, jahr: null, zustand: null }
    } catch (e) {
      return NextResponse.json({ error: `Claude-Identifikation fehlgeschlagen: ${e}` }, { status: 502 })
    }

    if (!identified.name) {
      return NextResponse.json({ error: 'Artikel konnte auf dem Foto nicht erkannt werden' }, { status: 422 })
    }

    const proposed = {
      name: identified.name,
      serie: identified.serie ?? null,
      set_nummer: identified.set_nummer ?? null,
      jahr: identified.jahr ?? null,
      zustand: identified.zustand ?? null,
    }

    if (preview) {
      return NextResponse.json({ identified: identified.name, proposed })
    }

    const fields: string[] = ['name']
    const args: (string | number | null)[] = [identified.name]
    if (identified.serie) { fields.push('serie'); args.push(identified.serie) }
    if (identified.set_nummer) { fields.push('set_nummer'); args.push(identified.set_nummer) }
    if (identified.jahr) { fields.push('jahr'); args.push(identified.jahr) }
    if (identified.zustand) { fields.push('zustand'); args.push(identified.zustand) }
    args.push(id)

    await db.execute({ sql: `UPDATE items SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`, args })
    revalidatePath('/')
    await logChange(id, identified.name, 'refresh_image', fields)
    return NextResponse.json({ identified: identified.name, proposed })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('refresh-image error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
