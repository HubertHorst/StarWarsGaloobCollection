'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import { Item } from '@/types/item'

interface Props {
  items: Item[]
}

interface SeriesGroup {
  serie: string | null
  items: Item[]
}

function buildGroups(items: Item[]): SeriesGroup[] {
  const map = new Map<string, Item[]>()

  for (const item of items) {
    const key = item.serie ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  // Sort: named series alphabetically, "Ohne Serie" last
  const groups: SeriesGroup[] = []
  const sorted = [...map.entries()].sort(([a], [b]) => {
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return a.localeCompare(b)
  })

  for (const [key, groupItems] of sorted) {
    groups.push({ serie: key === '__none__' ? null : key, items: groupItems })
  }

  return groups
}

/** Pick up to N cover URLs from the group for the mosaic */
function getCovers(items: Item[], max = 4): string[] {
  return items
    .map((i) => i.cover_url)
    .filter((u): u is string => !!u)
    .slice(0, max)
}

export default function ItemSeriesView({ items }: Props) {
  const groups = buildGroups(items)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const key = group.serie ?? '__none__'
        const isOpen = expanded.has(key)
        const covers = getCovers(group.items)
        const total = group.items.length
        const vorhanden = group.items.filter((i) => (i.in_sammlung ?? 1) === 1).length
        const ausstehend = group.items.filter((i) => i.lieferung_ausstehend === 1).length
        const fehlend = total - vorhanden - ausstehend

        return (
          <div key={key} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden">
            {/* ── Series tile header ── */}
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              {/* Photo mosaic */}
              <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-zinc-800 grid grid-cols-2 gap-px">
                {covers.length === 0 ? (
                  <div className="col-span-2 row-span-2 flex items-center justify-center">
                    <Package className="w-8 h-8 text-zinc-700" />
                  </div>
                ) : covers.length === 1 ? (
                  <div className="col-span-2 row-span-2 relative">
                    <img src={covers[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : covers.length === 2 ? (
                  <>
                    <div className="row-span-2 relative">
                      <img src={covers[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="row-span-2 relative">
                      <img src={covers[1]} alt="" className="w-full h-full object-cover" />
                    </div>
                  </>
                ) : covers.length === 3 ? (
                  <>
                    <div className="row-span-2 relative">
                      <img src={covers[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="relative">
                      <img src={covers[1]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="relative">
                      <img src={covers[2]} alt="" className="w-full h-full object-cover" />
                    </div>
                  </>
                ) : (
                  covers.slice(0, 4).map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>

              {/* Series info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">
                  {group.serie ?? <span className="text-zinc-500 italic">Ohne Serie</span>}
                </p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {total} {total === 1 ? 'Artikel' : 'Artikel'}
                </p>

                {/* Status pills */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {vorhanden > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 ring-1 ring-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {vorhanden} vorhanden
                    </span>
                  )}
                  {ausstehend > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      {ausstehend} bestellt
                    </span>
                  )}
                  {fehlend > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {fehlend} fehlt
                    </span>
                  )}
                </div>
              </div>

              {/* Expand icon */}
              <div className="flex-shrink-0 text-zinc-500">
                {isOpen
                  ? <ChevronUp className="w-5 h-5" />
                  : <ChevronDown className="w-5 h-5" />
                }
              </div>
            </button>

            {/* ── Expanded item grid ── */}
            {isOpen && (
              <div className="border-t border-white/5 px-4 pb-4 pt-3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {group.items.map((item) => (
                    <SeriesItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SeriesItemCard({ item }: { item: Item }) {
  const ring =
    item.lieferung_ausstehend === 1
      ? 'ring-2 ring-yellow-500/60'
      : (item.in_sammlung ?? 1) === 0
        ? 'ring-2 ring-red-500/60'
        : 'ring-1 ring-white/5'

  return (
    <Link href={`/items/${item.id}`} className="group flex flex-col gap-1">
      <div className={`relative aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg ${ring}`}>
        {item.cover_url ? (
          <img
            src={item.cover_url}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-5 h-5 text-zinc-700" />
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2 px-0.5">{item.name}</p>
    </Link>
  )
}
