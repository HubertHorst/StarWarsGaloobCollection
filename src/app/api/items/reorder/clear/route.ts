/**
 * POST /api/items/reorder/clear
 *   Resets sort_order to NULL for every item, falling sorting back to
 *   the default rank.
 */
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST() {
  try {
    const db = getDb()
    await db.execute(`UPDATE items SET sort_order = NULL`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /items/reorder/clear error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
