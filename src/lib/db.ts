import { createClient } from '@libsql/client'

let _client: ReturnType<typeof createClient> | null = null

export function getDb() {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return _client
}

export async function logChange(
  itemId: string,
  itemName: string,
  action: string,
  fields: string[]
) {
  try {
    const db = getDb()
    await db.execute({
      sql: `INSERT INTO changelog (item_id, item_name, action, fields) VALUES (?, ?, ?, ?)`,
      args: [itemId, itemName, action, JSON.stringify(fields)],
    })
  } catch { /* non-fatal */ }
}

export async function initDb() {
  const db = getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS changelog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT,
      item_name TEXT NOT NULL,
      action TEXT NOT NULL,
      fields TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      serie TEXT,
      set_nummer TEXT,
      jahr INTEGER,
      zustand TEXT,
      wert TEXT,
      kaufpreis TEXT,
      lieferung_ausstehend INTEGER DEFAULT 0,
      cover_url TEXT,
      user_photos TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
}
