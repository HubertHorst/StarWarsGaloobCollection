'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Layers } from 'lucide-react'

type View = 'grid' | 'list' | 'series'

export default function ViewToggle({ current }: { current: View }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setView(view: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'series') params.delete('view')   // series is the default — no param needed
    else params.set('view', view)
    router.push(`/?${params.toString()}`)
  }

  const btn = (view: View, title: string, icon: React.ReactNode) => (
    <button
      onClick={() => setView(view)}
      className={`p-1.5 rounded-md transition-colors ${
        current === view ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-white'
      }`}
      title={title}
    >
      {icon}
    </button>
  )

  return (
    <div className="flex items-center bg-zinc-800 rounded-lg p-1 gap-1">
      {btn('grid',   'Rasteransicht',  <LayoutGrid className="w-4 h-4" />)}
      {btn('list',   'Listenansicht',  <List       className="w-4 h-4" />)}
      {btn('series', 'Serienansicht',  <Layers     className="w-4 h-4" />)}
    </div>
  )
}
