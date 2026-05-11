'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentId: string
  /** Server-computed fallbacks used until sessionStorage is read */
  fallbackPrev: string | null
  fallbackNext: string | null
}

export default function ItemNavigation({ currentId, fallbackPrev, fallbackNext }: Props) {
  const [prev, setPrev] = useState<string | null>(fallbackPrev)
  const [next, setNext] = useState<string | null>(fallbackNext)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('grid-filtered-ids')
      if (!raw) return
      const ids: string[] = JSON.parse(raw)
      const idx = ids.indexOf(currentId)
      if (idx === -1) return          // item not in filtered list → keep server fallback
      setPrev(idx > 0 ? ids[idx - 1] : null)
      setNext(idx < ids.length - 1 ? ids[idx + 1] : null)
    } catch { /* ignore */ }
  }, [currentId])

  const btnBase = 'p-1.5 rounded-lg transition-colors'
  const btnActive = `${btnBase} text-zinc-400 hover:text-white hover:bg-zinc-800`
  const btnDisabled = `${btnBase} text-zinc-700 pointer-events-none`

  return (
    <div className="flex items-center gap-1 ml-2">
      {prev
        ? <Link href={`/items/${prev}`} className={btnActive} title="Vorheriger Artikel"><ChevronLeft className="w-5 h-5" /></Link>
        : <span className={btnDisabled}><ChevronLeft className="w-5 h-5" /></span>
      }
      {next
        ? <Link href={`/items/${next}`} className={btnActive} title="Nächster Artikel"><ChevronRight className="w-5 h-5" /></Link>
        : <span className={btnDisabled}><ChevronRight className="w-5 h-5" /></span>
      }
    </div>
  )
}
