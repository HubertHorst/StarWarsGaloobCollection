import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { getDb } from '@/lib/db'
import { validateImageFile, safeParseJson } from '@/lib/validate'

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const itemId = formData.get('itemId') as string | null

    if (!file || !itemId) {
      return NextResponse.json({ error: 'Missing file or itemId' }, { status: 400 })
    }

    const validationError = validateImageFile(file)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `galoob-collection/${itemId}`, resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res!))
      ).end(buffer)
    })

    const publicUrl = result.secure_url

    const { rows } = await db.execute({ sql: 'SELECT user_photos FROM items WHERE id = ?', args: [itemId] })
    if (!rows[0]) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const existing: string[] = safeParseJson(rows[0].user_photos) ?? []
    if (existing.length >= 50) {
      return NextResponse.json({ error: 'Maximal 50 Fotos pro Artikel' }, { status: 400 })
    }

    await db.execute({
      sql: 'UPDATE items SET user_photos = ? WHERE id = ?',
      args: [JSON.stringify([...existing, publicUrl]), itemId],
    })

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('upload-photo error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
