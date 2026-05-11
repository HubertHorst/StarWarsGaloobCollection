'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Item } from '@/types/item'
import ItemCard from '@/components/ItemCard'
import BulkActionBar from '@/components/BulkActionBar'
import { Loader2, Merge, CheckSquare, Square } from 'lucide-react'

interface Props {
  items: Item[]
  editMode?: boolean
}

interface PendingMerge { source: Item; target: Item }

function coverSrc(item: Item) {
  if (!item.cover_url) return null
  return item.cover_url
}

export default function ItemGridView({ items: initialItems, editMode = false }: Props) {
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [items, setItems] = useState<Item[]>(initialItems)
  useEffect(() => { setItems(initialItems) }, [initialItems])
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMerge | null>(null)
  const [merging, setMerging] = useState(false)

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function confirmMerge() {
    if (!pending) return
    setMerging(true)
    await fetch('/api/items/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: pending.source.id, targetId: pending.target.id }),
    })
    setMerging(false)
    setItems((prev) => prev.filter((i) => i.id !== pending.source.id))
    setSelectedIds((prev) => prev.filter((id) => id !== pending.source.id))
    setPending(null)
    router.refresh()
  }

  if (!editMode) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {initialItems.map((item) => <ItemCard key={item.id} item={item} />)}
      </div>
    )
  }

  const allSelected = items.length > 0 && items.every((i) => selectedIds.includes(i.id))

  return (
    <>
      {/* Select-all bar */}
      <div className="flex items-center gap-2 mb-2 text-sm text-zinc-400">
        <button
          onClick={() => allSelected
            ? setSelectedIds([])
            : setSelectedIds(items.map((i) => i.id))
          }
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {allSelected
            ? <CheckSquare className="w-4 h-4 text-indigo-400" />
            : <Square className="w-4 h-4" />}
          Alle auswählen
        </button>
        <span className="text-zinc-600">·</span>
        <span className="text-xs text-zinc-500">Artikel auf einen anderen ziehen zum Zusammenführen</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => {
          const cover = coverSrc(item)
          const isDragging = dragId === item.id
          const isOver = overId === item.id && dragId !== item.id
          const isSelected = selectedIds.includes(item.id)

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => { setDragId(item.id); e.dataTransfer.effectAllowed = 'move' }}
              onDragEnd={() => { setDragId(null); setOverId(null) }}
              onDragOver={(e) => { e.preventDefault(); if (item.id !== dragId) setOverId(item.id) }}
              onDragLeave={() => setOverId(null)}
              onDrop={(e) => {
                e.preventDefault()
                setOverId(null)
                const src = items.find((i) => i.id === dragId)
                if (!src || src.id === item.id) return
                setPending({ source: src, target: item })
                setDragId(null)
              }}
              className={[
                'relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 select-none',
                isDragging ? 'opacity-40 scale-95' : 'opacity-100',
                isOver ? 'ring-4 ring-yellow-500 scale-105 shadow-xl shadow-yellow-500/30'
                  : isSelected ? 'ring-2 ring-indigo-400' : 'ring-1 ring-white/10',
              ].join(' ')}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleSelect(item.id)}
                className={`absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center transition-all ${
                  isSelected ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-zinc-900/70 ring-1 ring-white/20'
                }`}
              >
                {isSelected && <CheckSquare className="w-3 h-3 text-white" />}
              </button>

              <div className="aspect-[3/4] bg-zinc-800 relative">
                {cover
                  ? <Image src={cover} alt={item.name} fill className="object-cover" sizes="200px" />
                  : <div className="flex items-center justify-center h-full text-zinc-600 text-2xl">?</div>}
              </div>

              {isOver && (
                <div className="absolute inset-0 bg-yellow-600/40 flex items-center justify-center">
                  <Merge className="w-8 h-8 text-white" />
                </div>
              )}

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <p className="text-white text-xs font-medium leading-tight line-clamp-2">{item.name}</p>
                {item.zustand && (
                  <p className="text-yellow-400 text-xs mt-0.5 uppercase tracking-wide truncate">{item.zustand}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} items={items} />

      {/* Merge confirmation dialog */}
      {pending && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Artikel zusammenführen?</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 text-center">
                {coverSrc(pending.source) && (
                  <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden mx-auto mb-2">
                    <Image src={coverSrc(pending.source)!} alt={pending.source.name} fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <p className="text-xs text-zinc-400 line-clamp-2">{pending.source.name}</p>
                <p className="text-xs text-red-400 mt-1">wird gelöscht</p>
              </div>
              <Merge className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div className="flex-1 text-center">
                {coverSrc(pending.target) && (
                  <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden mx-auto mb-2">
                    <Image src={coverSrc(pending.target)!} alt={pending.target.name} fill className="object-cover" sizes="64px" />
                  </div>
                )}
                <p className="text-xs text-zinc-400 line-clamp-2">{pending.target.name}</p>
                <p className="text-xs text-yellow-400 mt-1">erhält alle Bilder</p>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mb-5">
              Alle Fotos von <span className="text-white">{pending.source.name}</span> werden zu{' '}
              <span className="text-white">{pending.target.name}</span> verschoben. Der Originaleintrag wird danach gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPending(null)}
                disabled={merging}
                className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmMerge}
                disabled={merging}
                className="flex-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                Zusammenführen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
