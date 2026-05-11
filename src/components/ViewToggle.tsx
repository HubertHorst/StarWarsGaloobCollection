'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List } from 'lucide-react'

export default function ViewToggle({ current }: { current: 'grid' | 'list' }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setView(view: 'grid' | 'list') {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'grid') params.delete('view')
    else params.set('view', 'list')
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1">
      <button
        onClick={() => setView('grid')}
        className={`p-1.5 rounded-md transition-colors ${
          current === 'grid' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-white'
        }`}
        title="Rasteransicht"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView('list')}
        className={`p-1.5 rounded-md transition-colors ${
          current === 'list' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-white'
        }`}
        title="Listenansicht"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  )
}
