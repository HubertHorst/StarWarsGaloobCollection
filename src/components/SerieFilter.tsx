'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

interface Props {
  series: string[]
  selected?: string
}

export default function SerieFilter({ series, selected }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (series.length === 0) return null

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('serie', value)
    } else {
      params.delete('serie')
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      <select
        value={selected ?? ''}
        onChange={(e) => handleChange(e.target.value)}
        className="appearance-none bg-zinc-800/80 border border-white/10 rounded-lg pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all cursor-pointer"
      >
        <option value="">Alle Serien</option>
        {series.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
