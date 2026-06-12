import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getDbReady } from '@/lib/db'
import { randomUUID } from 'crypto'

function safeParseJson<T>(val: unknown): T | null {
  if (!val) return null
  try { return JSON.parse(val as string) as T } catch { return null }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDbReady()
    const { id } = await params

    const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const src = rows[0] as Record<string, unknown>
    const newId = randomUUID()

    await db.execute({
      sql: `INSERT INTO items
              (id, name, serie, set_nummer, jahr, zustand, wert, kaufpreis,
               in_sammlung, lieferung_ausstehend, cover_url, user_photos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
        src.name as string,
        src.serie ?? null,
        src.set_nummer ?? null,
        src.jahr ?? null,
        src.zustand ?? null,
        src.wert ?? null,
        src.kaufpreis ?? null,
        src.in_sammlung ?? 1,
        src.lieferung_ausstehend ?? 0,
        src.cover_url ?? null,
        src.user_photos ?? null,
      ],
    })

    revalidatePath('/')
    const { rows: newRows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [newId] })
    const newItem = { ...newRows[0], user_photos: safeParseJson((newRows[0] as Record<string, unknown>).user_photos) }
    return NextResponse.json(newItem, { status: 201 })
  } catch (err) {
    console.error('POST /items/[id]/duplicate error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
