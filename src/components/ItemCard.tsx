'use client'

import Link from 'next/link'
import { Item } from '@/types/item'
import { Check, Truck } from 'lucide-react'
import CoverZoom from '@/components/CoverZoom'

interface Props {
  item: Item
  selected?: boolean
  onToggle?: () => void
}

export default function ItemCard({ item, selected, onToggle }: Props) {
  return (
    <div className="group relative block">
      {onToggle && (
        <button
          onClick={(e) => { e.preventDefault(); onToggle() }}
          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center transition-all ${
            selected
              ? 'bg-indigo-600 ring-2 ring-indigo-400'
              : 'bg-zinc-900/70 ring-1 ring-white/20 opacity-0 group-hover:opacity-100'
          }`}
        >
          {selected && <Check className="w-3 h-3 text-white" />}
        </button>
      )}
      <Link
        href={`/items/${item.id}`}
        className="block"
        onClick={() => sessionStorage.setItem('library-scroll', String(window.scrollY))}
      >
      <div className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 shadow-lg ring-1 transition-all duration-200 group-hover:shadow-yellow-500/20 group-hover:shadow-xl group-hover:-translate-y-1 ${
        selected ? 'ring-indigo-500/70' : 'ring-white/5 group-hover:ring-yellow-500/50'
      }`}>
        {item.cover_url ? (
          <CoverZoom
            src={item.cover_url}
            alt={item.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            images={[
              item.cover_url,
              ...(item.user_photos ?? []).filter((u) => u !== item.cover_url),
            ]}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Lieferung ausstehend badge */}
        {item.lieferung_ausstehend === 1 && (
          <div className="absolute top-2 right-2 z-10">
            <span className="flex items-center gap-1 text-xs bg-yellow-500 text-black font-semibold px-1.5 py-0.5 rounded-md">
              <Truck className="w-3 h-3" />
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3">
          {item.zustand && (
            <span className="inline-block mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 rounded-full px-2 py-0.5">
              {item.zustand}
            </span>
          )}
          <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{item.name}</p>
          {item.serie && (
            <p className="text-zinc-400 text-xs mt-0.5 truncate">{item.serie}</p>
          )}
        </div>
      </div>
      </Link>
    </div>
  )
}
