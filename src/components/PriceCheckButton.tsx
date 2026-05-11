'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart } from 'lucide-react'

interface Props {
  name: string
  /** Cover/photo URL for reverse image search */
  imageUrl?: string | null
  /** Compact icon-only mode for list/grid */
  compact?: boolean
}

export default function PriceCheckButton({ name, imageUrl, compact }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const query = encodeURIComponent(`Star Wars Galoob ${name}`)

  const sites = [
    {
      label: 'eBay',
      url: `https://www.ebay.de/sch/i.html?_nkw=${query}`,
      color: 'text-yellow-400',
    },
    {
      label: 'eBay Verkäufe weltweit',
      url: `https://www.ebay.com/sch/i.html?_nkw=${query}&LH_Complete=1&LH_Sold=1`,
      color: 'text-orange-400',
    },
    {
      label: 'Vinted',
      url: `https://www.vinted.de/catalog?search_text=${query}`,
      color: 'text-teal-400',
    },
    ...(imageUrl ? [{
      label: 'Google Bildsuche',
      url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`,
      color: 'text-blue-400',
    }] : []),
  ]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (compact) {
    return (
      <div ref={ref} className="relative flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
          title="Online-Preise prüfen (eBay / Vinted)"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
        </button>

        {open && (
          <div
            className="absolute right-0 bottom-full mb-1 bg-zinc-800 border border-white/10 rounded-lg shadow-xl z-30 overflow-hidden min-w-max"
            onClick={(e) => e.stopPropagation()}
          >
            {sites.map((site) => (
              <a
                key={site.label}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-700 transition-colors ${site.color}`}
              >
                <ShoppingCart className="w-3 h-3" />
                {site.label}
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sites.map((site) => (
        <a
          key={site.label}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-sm px-3 py-2 rounded-lg transition-colors ${site.color}`}
        >
          <ShoppingCart className="w-4 h-4" />
          {site.label}
        </a>
      ))}
    </div>
  )
}
