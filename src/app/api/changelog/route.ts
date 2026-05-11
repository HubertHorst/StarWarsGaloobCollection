import { NextResponse } from 'next/server'
import { getDbReady } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDbReady()
    const { rows } = await db.execute(
      `SELECT id, item_id, item_name, action, fields, created_at
       FROM changelog ORDER BY id DESC LIMIT 30`
    )
    return NextResponse.json(rows)
  } catch (err) {
    console.error('changelog error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
