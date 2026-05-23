/**
 * POST /api/items/reorder
 *   body: { order: string[] }   // item-ids in the desired display order
 *
 * Assigns sort_order = index * 10 to every id in the array. Items whose
 * id is NOT in the array keep their previous sort_order (so they stay
 * at the end, or wherever the user had moved them last). Multiplied by
 * 10 leaves room for future single-item inserts without renumbering.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const order = Array.isArray(body?.order) ? (body.order as unknown[]).filter((x): x is string => typeof x === 'string') : null
    if (!order || order.length === 0) {
      return NextResponse.json({ error: 'order array required' }, { status: 400 })
    }
    const db = getDb()
    // One statement per id — libsql supports batched execution
    const stmts = order.map((id, idx) => ({
      sql: `UPDATE items SET sort_order = ? WHERE id = ?`,
      args: [idx * 10, id] as (string | number)[],
    }))
    await db.batch(stmts, 'write')
    return NextResponse.json({ ok: true, count: order.length })
  } catch (err) {
    console.error('POST /items/reorder error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
