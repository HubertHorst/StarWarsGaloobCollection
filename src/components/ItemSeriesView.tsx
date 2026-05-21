'use client'

import Link from 'next/link'
import { Package } from 'lucide-react'
import { Item } from '@/types/item'

interface Props {
  items: Item[]
}

interface SeriesGroup {
  serie: string | null
  items: Item[]
  covers: string[]
  total: number
  vorhanden: number
  ausstehend: number
  fehlend: number
}

function buildGroups(items: Item[]): SeriesGroup[] {
  const map = new Map<string, Item[]>()

  for (const item of items) {
    const key = item.serie ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }

  const sorted = [...map.entries()].sort(([a], [b]) => {
    if (a === '__none__') return 1
    if (b === '__none__') return -1
    return a.localeCompare(b)
  })

  return sorted.map(([key, groupItems]) => {
    const vorhanden  = groupItems.filter((i) => (i.in_sammlung ?? 1) === 1 && i.lieferung_ausstehend !== 1).length
    const ausstehend = groupItems.filter((i) => i.lieferung_ausstehend === 1).length
    const fehlend    = groupItems.filter((i) => (i.in_sammlung ?? 1) === 0 && i.lieferung_ausstehend !== 1).length
    const covers     = groupItems.map((i) => i.cover_url).filter((u): u is string => !!u).slice(0, 4)

    return {
      serie:      key === '__none__' ? null : key,
      items:      groupItems,
      covers,
      total:      groupItems.length,
      vorhanden,
      ausstehend,
      fehlend,
    }
  })
}

/** 2×2 photo mosaic */
function Mosaic({ covers, alt }: { covers: string[]; alt: string }) {
  if (covers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
        <Package className="w-10 h-10 text-zinc-700" />
      </div>
    )
  }
  if (covers.length === 1) {
    return <img src={covers[0]} alt={alt} className="w-full h-full object-cover" />
  }
  if (covers.length === 2) {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-px bg-zinc-950">
        <img src={covers[0]} alt="" className="w-full h-full object-cover" />
        <img src={covers[1]} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  if (covers.length === 3) {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-px bg-zinc-950">
        <img src={covers[0]} alt="" className="w-full h-full object-cover row-span-2" />
        <img src={covers[1]} alt="" className="w-full h-full object-cover" />
        <img src={covers[2]} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div className="w-full h-full grid grid-cols-2 gap-px bg-zinc-950">
      {covers.slice(0, 4).map((src, i) => (
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  )
}

export default function ItemSeriesView({ items }: Props) {
  const groups = buildGroups(items)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {groups.map((group) => {
        const key  = group.serie ?? '__none__'
        const href = group.serie
          ? `/?serie=${encodeURIComponent(group.serie)}`
          : '/?serie=__none__'

        // Ring color: red if any fehlend, yellow if all ausstehend, green otherwise
        const ringCls = group.fehlend > 0
          ? 'hover:ring-red-500/50'
          : group.ausstehend > 0
            ? 'hover:ring-yellow-500/50'
            : 'hover:ring-green-500/50'

        return (
          <Link
            key={key}
            href={href}
            className={`group flex flex-col bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 ring-2 ring-transparent ${ringCls}`}
          >
            {/* Photo mosaic */}
            <div className="aspect-square w-full overflow-hidden relative">
              <Mosaic covers={group.covers} alt={group.serie ?? 'Ohne Serie'} />
              {/* Item count badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
                {group.total}
              </div>
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className="text-sm font-bold text-white leading-tight line-clamp-2">
                {group.serie ?? <span className="text-zinc-500 italic">Ohne Serie</span>}
              </p>

              {/* Status pills */}
              <div className="flex flex-wrap gap-1 mt-auto">
                {group.vorhanden > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 ring-1 ring-green-500/20 font-medium">
                    {group.vorhanden} ✓
                  </span>
                )}
                {group.ausstehend > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20 font-medium">
                    {group.ausstehend} 🚚
                  </span>
                )}
                {group.fehlend > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20 font-medium">
                    {group.fehlend} fehlt
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
