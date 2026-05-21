/**
 * Normalize item names within series to consistent "#N – Subtitle" format.
 *
 * Battle Packs:            "Battle Packs #N – Subtitle"
 * Original 3 Pack:         "Original 3 Pack #N – Vehicles"
 * Original 3 Pack Filme:   "3 Pack Filme #N – Film/Vehicles"
 *
 * Run: npx tsx scripts/fix-series-names.ts [--dry-run]
 */

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf-8')
    for (const line of raw.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch { /* ignore */ }
}
loadEnv()

const DRY_RUN = process.argv.includes('--dry-run')

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

interface Item { id: string; name: string; serie: string | null; set_nummer: string | null }
type Result =
  | { action: 'ok' }                          // already correct, no change
  | { action: 'rename'; newName: string }     // needs update
  | { action: 'skip'; reason: string }        // can't auto-fix

// ── Roman numeral → Arabic ────────────────────────────────────────────────────
function romanToInt(s: string): number | null {
  const vals: Record<string, number> = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 }
  const u = s.toUpperCase()
  if (!/^[IVXLCDM]+$/.test(u)) return null
  let r = 0
  for (let i = 0; i < u.length; i++) {
    const c = vals[u[i]], n = vals[u[i+1]]
    if (n && c < n) r -= c; else r += c
  }
  return r > 0 ? r : null
}

// Strip leading "Roman-numeral + separator" patterns:
//   "XI – "   (space + em-dash)
//   "XIII - " (space + hyphen)
//   "IV–"     (em-dash directly, no space)
// IMPORTANT: does NOT match "X-Wing" because that uses a regular hyphen without a space,
// and "X" alone followed by "-[letter]" is never a Roman numeral separator.
const STRIP_ROMAN = /^[IVXLCDM]+(–\s*|\s+[–\-]\s*)/

// ── Battle Packs ──────────────────────────────────────────────────────────────
function fixBattlePacks(item: Item): Result {
  const name = item.name.trim()

  // Already correct: "Battle Packs #N – subtitle"
  if (/^Battle Packs #\d+ – .+$/.test(name)) return { action: 'ok' }

  // Extract number from name first (set_nummer often holds catalog numbers ≥1000)
  const numMatch = name.match(/(?:Battle Packs\s*)?#(\d+)/)
  let num: number | null = numMatch ? parseInt(numMatch[1]) : null

  // Fallback: set_nummer only if it's a plausible small set number (<50)
  if (num === null && item.set_nummer) {
    const sn = parseInt(item.set_nummer.replace('#', ''))
    if (!isNaN(sn) && sn < 50) num = sn
  }

  if (num === null) return { action: 'skip', reason: 'no number found' }

  // Build clean subtitle: remove all "Battle Packs #N" prefix variants
  const subtitle = name
    .replace(/^Battle Packs\s*#\d+\s*[–\-]?\s*/i, '')  // "Battle Packs #N – " / "- " / " "
    .replace(/^#\d+\s*[–\-]?\s*/, '')                   // bare "#N"
    .trim()

  if (!subtitle) return { action: 'skip', reason: 'empty subtitle' }

  return { action: 'rename', newName: `Battle Packs #${num} – ${subtitle}` }
}

// ── Micro Machines Original 3 Pack ───────────────────────────────────────────
function fixOriginal3Pack(item: Item): Result {
  const name = item.name.trim()

  if (/^Original 3 Pack #\d+ – .+$/.test(name)) return { action: 'ok' }

  // Leading arabic digit takes priority
  let num: number | null = null
  const leadingDigit = name.match(/^(\d+)\s/)
  if (leadingDigit) {
    num = parseInt(leadingDigit[1])
  } else if (item.set_nummer) {
    const asInt = parseInt(item.set_nummer)
    num = !isNaN(asInt) ? asInt : romanToInt(item.set_nummer)
  }

  if (num === null) return { action: 'skip', reason: 'no number found' }

  const subtitle = name
    .replace(/^\d+\s*/, '')                                      // leading "N "
    .replace(/^Star Wars\s+/i, '')                               // "Star Wars "
    .replace(/^(Micro Machines\s+)?Set\s+[IVXLCDM]+\s*[–\-]\s*/i, '') // "Set XIV – "
    .replace(/^(Micro Machines\s+)?Set\s+\d+\s*[–\-]\s*/i, '')  // "Set 14 – "
    .replace(STRIP_ROMAN, '')                                    // "XIV – " (space before dash)
    .trim()

  if (!subtitle) return { action: 'skip', reason: 'empty subtitle' }

  return { action: 'rename', newName: `Original 3 Pack #${num} – ${subtitle}` }
}

// ── Micro Machines Original 3 Pack Filme ──────────────────────────────────────
function fixOriginal3PackFilme(item: Item): Result {
  const name = item.name.trim()

  if (/^3 Pack Filme #\d+ – .+$/.test(name)) return { action: 'ok' }

  // "Star Wars N ..." → number from N
  let num: number | null = null
  const swNum = name.match(/^Star Wars\s+(\d+)\b/i)
  if (swNum) {
    num = parseInt(swNum[1])
  } else if (item.set_nummer) {
    const asInt = parseInt(item.set_nummer)
    if (!isNaN(asInt) && asInt < 50) num = asInt
    else num = romanToInt(item.set_nummer)
  }

  if (num === null) return { action: 'skip', reason: 'no number found' }

  const subtitle = name
    .replace(/^Star Wars\s+\d+\s*/i, '')     // "Star Wars N "
    .replace(/^Star Wars\s+/i, '')           // bare "Star Wars "
    .replace(STRIP_ROMAN, '')                // "XI – " (space required before dash)
    .replace(/^[–\-]\s*/, '')               // leading dash/em-dash
    .trim()

  if (!subtitle) return { action: 'skip', reason: 'empty subtitle' }

  return { action: 'rename', newName: `3 Pack Filme #${num} – ${subtitle}` }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { rows } = await db.execute({
    sql: `SELECT id, name, serie, set_nummer FROM items
          WHERE serie IN (
            'Action Fleet : Battle Packs',
            'Micro Machines : Original 3 Pack',
            'Micro Machines : Original 3 Pack Filme'
          )
          ORDER BY serie,
            CASE WHEN INSTR(name,'#')>0
              THEN CAST(TRIM(SUBSTR(name,INSTR(name,'#')+1)) AS INTEGER)
              ELSE 9999
            END, name`,
    args: [],
  })

  const items = rows as unknown as Item[]
  console.log(`\nFound ${items.length} items in target series.\n`)

  type Change = { id: string; oldName: string; newName: string }
  type Skip   = { name: string; serie: string }

  const changes: Change[] = []
  const skipped: Skip[]   = []
  const results = new Map<string, Result>()

  for (const item of items) {
    let result: Result = { action: 'ok' }
    if (item.serie === 'Action Fleet : Battle Packs')
      result = fixBattlePacks(item)
    else if (item.serie === 'Micro Machines : Original 3 Pack')
      result = fixOriginal3Pack(item)
    else if (item.serie === 'Micro Machines : Original 3 Pack Filme')
      result = fixOriginal3PackFilme(item)

    results.set(item.id, result)
    if (result.action === 'rename') changes.push({ id: item.id, oldName: item.name, newName: result.newName })
    if (result.action === 'skip')   skipped.push({ name: item.name, serie: item.serie ?? '' })
  }

  // Print grouped view
  let lastSerie = ''
  for (const item of items) {
    if (item.serie !== lastSerie) {
      console.log(`\n[${item.serie}]`)
      lastSerie = item.serie ?? ''
    }
    const r = results.get(item.id)!
    if (r.action === 'ok')     console.log(`  ✓  "${item.name}"`)
    if (r.action === 'rename') console.log(`  →  "${item.name}"\n     → "${r.newName}"`)
    if (r.action === 'skip')   console.log(`  ⚠  "${item.name}"  ← no number, manual fix needed`)
  }

  console.log('\n──────── Summary ────────')
  console.log(`  ${changes.length} to rename, ${skipped.length} need manual fix`)

  if (DRY_RUN || changes.length === 0) {
    if (changes.length === 0) console.log('\n✅  Nothing to change.\n')
    else console.log('\n[DRY RUN] No changes written. Remove --dry-run to apply.\n')
    return
  }

  console.log('\nApplying...')
  for (const c of changes) {
    await db.execute({ sql: 'UPDATE items SET name = ? WHERE id = ?', args: [c.newName, c.id] })
    console.log(`  ✓  "${c.oldName}"\n     → "${c.newName}"`)
  }
  console.log(`\n✅  ${changes.length} item(s) updated.\n`)
  if (skipped.length) {
    console.log('⚠  Items needing manual fix:')
    for (const s of skipped) console.log(`    [${s.serie}] "${s.name}"`)
  }
}

main().catch((err) => { console.error('❌', err); process.exit(1) })
