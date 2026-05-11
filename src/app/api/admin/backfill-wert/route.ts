import { NextResponse } from 'next/server'
import { getDbReady } from '@/lib/db'
import { SERIES_DEFAULT_WERT } from '@/lib/seriesDefaultWert'

export async function POST() {
  try {
    const db = await getDbReady()

    // Fetch all items that have no wert but have a serie
    const { rows } = await db.execute(
      `SELECT id, name, serie FROM items WHERE (wert IS NULL OR wert = '') AND serie IS NOT NULL AND serie != ''`
    )

    if (rows.length === 0) {
      return NextResponse.json({ updated: 0, message: 'Alle Artikel haben bereits einen Wert.' })
    }

    let updated = 0
    const skipped: string[] = []

    for (const row of rows) {
      const serie = row.serie as string
      const defaultWert = SERIES_DEFAULT_WERT[serie]

      if (!defaultWert) {
        skipped.push(`${row.name} (${serie})`)
        continue
      }

      await db.execute({
        sql: `UPDATE items SET wert = ? WHERE id = ?`,
        args: [defaultWert, row.id as string],
      })
      updated++
    }

    return NextResponse.json({
      updated,
      skipped: skipped.length,
      skippedItems: skipped,
      message: `${updated} Artikel aktualisiert, ${skipped.length} übersprungen (keine Serie oder unbekannte Serie).`,
    })
  } catch (err) {
    console.error('Backfill error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
