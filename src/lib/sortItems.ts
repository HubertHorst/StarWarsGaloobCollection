import { Item } from '@/types/item'

/**
 * Extract the number after '#' in a name, e.g. "Battle Packs #12" → 12.
 * Also handles plain leading numbers like "12 – Cantina" → 12.
 */
function leadingNumber(name: string): number | null {
  // "#N" anywhere in the name (Battle Packs, Alpha Series, etc.)
  const hash = name.match(/#\s*(\d+)/)
  if (hash) return parseInt(hash[1], 10)
  // Plain leading number "N –" or "N –" at the start
  const plain = name.match(/^(\d+)\s*[–\-]/)
  if (plain) return parseInt(plain[1], 10)
  return null
}

/**
 * Natural name comparator: items with a leading/hash number sort
 * numerically (1, 2, 3 … 10, 11); everything else sorts locale-aware.
 */
export function compareNames(a: string, b: string): number {
  const nA = leadingNumber(a)
  const nB = leadingNumber(b)
  if (nA !== null && nB !== null) return nA - nB
  // One has a number, one doesn't → numbered item comes first
  if (nA !== null) return -1
  if (nB !== null) return 1
  return a.localeCompare(b, 'de')
}

/**
 * Sort items: primary by serie (locale), secondary by name (natural).
 * Replaces the plain SQL `ORDER BY serie, name` sort.
 */
export function sortItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const s = (a.serie ?? '').localeCompare(b.serie ?? '', 'de')
    if (s !== 0) return s
    return compareNames(a.name, b.name)
  })
}
