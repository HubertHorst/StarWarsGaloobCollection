import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'

export async function POST(req: NextRequest) {
  try {
    const { sourceId, targetId } = await req.json()
    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 })
    }

    const db = getDb()
    const { rows } = await db.execute({
      sql: 'SELECT * FROM items WHERE id IN (?, ?)',
      args: [sourceId, targetId],
    })
    if (rows.length < 2) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const source = rows.find((r) => r.id === sourceId) as Record<string, unknown>
    const target = rows.find((r) => r.id === targetId) as Record<string, unknown>

    const sourcePhotos: string[] = safeParseJson(source.user_photos) ?? []
    const targetPhotos: string[] = safeParseJson(target.user_photos) ?? []

    // add source cover if it's a cloudinary upload
    const sourceCover = source.cover_url as string | null
    if (sourceCover && sourceCover.includes('cloudinary') && !targetPhotos.includes(sourceCover) && !sourcePhotos.includes(sourceCover)) {
      sourcePhotos.unshift(sourceCover)
    }

    const mergedPhotos = [...targetPhotos, ...sourcePhotos.filter((p) => !targetPhotos.includes(p))]

    await db.execute({
      sql: 'UPDATE items SET user_photos = ? WHERE id = ?',
      args: [JSON.stringify(mergedPhotos), targetId],
    })
    await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [sourceId] })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/items/merge error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
