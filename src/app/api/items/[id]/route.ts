import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getDb, logChange } from '@/lib/db'
import { Item } from '@/types/item'

const ALLOWED_FIELDS = new Set([
  'name', 'serie', 'set_nummer', 'jahr', 'zustand',
  'wert', 'kaufpreis', 'lieferung_ausstehend', 'cover_url', 'user_photos',
])

function safeParseJson<T>(val: unknown): T | null {
  if (!val) return null
  try { return JSON.parse(val as string) as T } catch { return null }
}

function parseItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb()
    const { id } = await params
    const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(parseItem(rows[0] as Record<string, unknown>))
  } catch (err) {
    console.error('GET /items/[id] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb()
    const { id } = await params
    const body = await req.json()

    const fields = Object.keys(body).filter((f) => ALLOWED_FIELDS.has(f))
    if (fields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const updateFields = [...fields]
    const updateValues: (string | number | null)[] = fields.map((f) => {
      const val = body[f]
      if (val === null || val === undefined) return null
      if (Array.isArray(val)) return JSON.stringify(val)
      if (typeof val === 'number') return val
      return String(val)
    })

    const setClauses = updateFields.map((f) => `${f} = ?`).join(', ')
    const args = [...updateValues, id]

    const result = await db.execute({ sql: `UPDATE items SET ${setClauses} WHERE id = ?`, args })
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: 'Item not found', id }, { status: 404 })
    }
    revalidatePath('/')
    const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
    const updated = parseItem(rows[0] as Record<string, unknown>)
    await logChange(id, updated.name, 'update', updateFields)
    return NextResponse.json(updated)
  } catch (err) {
    console.error('PATCH /items/[id] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb()
    const { id } = await params
    await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [id] })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /items/[id] error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
