import { NextRequest, NextResponse } from 'next/server'
import { getDbReady } from '@/lib/db'
import { randomUUID } from 'crypto'

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

    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/add error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
