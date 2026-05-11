import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import cloudinary from '@/lib/cloudinary'
import { getDbReady, logChange } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { imageUrl } = await req.json()
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }

    // Fetch the image on our server (avoids CORS / auth issues with Bing URLs)
    let imgRes: Response
    try {
      imgRes = await fetch(imageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (e) {
      return NextResponse.json(
        { error: `Bild konnte nicht geladen werden: ${e}` },
        { status: 502 },
      )
    }
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Bild-Download fehlgeschlagen (${imgRes.status})` },
        { status: 502 },
      )
    }

    const buffer = Buffer.from(await imgRes.arrayBuffer())

    // Upload to Cloudinary
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'galoob-collection/covers', resource_type: 'image' },
          (err, res) => (err ? reject(err) : resolve(res!)),
        )
        .end(buffer)
    })

    // Persist to DB
    const db = await getDbReady()
    await db.execute({
      sql: 'UPDATE items SET cover_url = ? WHERE id = ?',
      args: [result.secure_url, id],
    })
    revalidatePath('/')

    // Changelog
    const { rows } = await db.execute({
      sql: 'SELECT name FROM items WHERE id = ?',
      args: [id],
    })
    const name = rows[0] ? String((rows[0] as Record<string, unknown>).name) : id
    await logChange(id, name, 'update', ['cover_url'])

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error('apply-cover error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
