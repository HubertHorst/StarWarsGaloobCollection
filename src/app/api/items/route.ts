import { NextRequest, NextResponse } from 'next/server'
import { getDbReady } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'
import { Item } from '@/types/item'
import { randomUUID } from 'crypto'

function parseItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDbReady()
    const serie = req.nextUrl.searchParams.get('serie')
    const search = req.nextUrl.searchParams.get('q')

    let sql = 'SELECT * FROM items'
    const args: string[] = []
    const conditions: string[] = []

    if (serie) { conditions.push('serie = ?'); args.push(serie) }
    if (search) { conditions.push('name LIKE ?'); args.push(`%${search}%`) }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY name'

    const { rows } = await db.execute({ sql, args })
    return NextResponse.json(rows.map((r) => parseItem(r as Record<string, unknown>)))
  } catch (err) {
    console.error('GET /items error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDbReady()
    const body = await req.json()

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const id = randomUUID()

    await db.execute({
      sql: `INSERT INTO items (id, name, serie, set_nummer, jahr, zustand, wert, kaufpreis, lieferung_ausstehend, cover_url, user_photos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        body.name.trim(),
        body.serie ?? null,
        body.set_nummer ?? null,
        body.jahr ?? null,
        body.zustand ?? null,
        body.wert ?? null,
        body.kaufpreis ?? null,
        body.lieferung_ausstehend ?? 0,
        body.cover_url ?? null,
        body.user_photos ? JSON.stringify(body.user_photos) : null,
      ],
    })

    const { rows } = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })
    return NextResponse.json(parseItem(rows[0] as Record<string, unknown>), { status: 201 })
  } catch (err) {
    console.error('POST /items error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
