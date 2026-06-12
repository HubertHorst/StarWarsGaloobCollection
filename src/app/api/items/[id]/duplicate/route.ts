import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getDbReady } from '@/lib/db'
import { randomUUID } from 'crypto'

function safeParseJson<T>(val: unknown): T | null {
  if (!val) return null
  try { return JSON.parse(val as string) as T } catch { return null }
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return String(v)
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
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
        str(src.name) ?? '',
        str(src.serie),
        str(src.set_nummer),
        num(src.jahr),
        str(src.zustand),
        str(src.wert),
        str(src.kaufpreis),
        num(src.in_sammlung) ?? 1,
        num(src.lieferung_ausstehend) ?? 0,
        str(src.cover_url),
        str(src.user_photos),
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
