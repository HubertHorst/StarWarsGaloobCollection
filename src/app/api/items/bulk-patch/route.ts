import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getDb, logChange } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { ids, fields } = await req.json() as { ids: string[]; fields: Record<string, string | number | null> }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }

    const allowed = new Set(['zustand', 'wert', 'kaufpreis', 'serie', 'lieferung_ausstehend'])
    const validFields = Object.entries(fields).filter(([k]) => allowed.has(k))
    if (validFields.length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

    const db = getDb()
    const setClauses = validFields.map(([k]) => `${k} = ?`).join(', ')
    const fieldValues = validFields.map(([, v]) => v)

    await Promise.all(
      ids.map((id) =>
        db.execute({
          sql: `UPDATE items SET ${setClauses} WHERE id = ?`,
          args: [...fieldValues, id],
        })
      )
    )

    revalidatePath('/')
    const fieldNames = validFields.map(([k]) => k)
    const placeholders = ids.map(() => '?').join(',')
    const { rows: itemRows } = await db.execute({ sql: `SELECT id, name FROM items WHERE id IN (${placeholders})`, args: ids })
    const nameMap = Object.fromEntries(itemRows.map((r) => [r.id as string, r.name as string]))
    await Promise.all(ids.map((id) => logChange(id, nameMap[id] ?? id, 'bulk_update', fieldNames)))
    return NextResponse.json({ ok: true, updated: ids.length })
  } catch (err) {
    console.error('bulk-patch error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
