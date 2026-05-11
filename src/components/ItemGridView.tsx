'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Item } from '@/types/item'
import ItemCard from '@/components/ItemCard'
import BulkActionBar from '@/components/BulkActionBar'
import { Loader2, Merge, CheckSquare, Square, ChevronUp, ChevronDown, X } from 'lucide-react'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'
import { SERIES_PRESETS } from '@/lib/seriesPresets'
import { compareNames } from '@/lib/sortItems'

interface Props {
  items: Item[]
  editMode?: boolean
}

interface PendingMerge { source: Item; target: Item }

type SortField = 'name' | 'serie' | 'jahr' | 'wert' | 'kaufpreis' | 'lieferung_ausstehend' | 'in_sammlung'
type SortDir = 'asc' | 'desc'

function parseValue(v: string | null): number {
  if (!v) return -1
  return parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

function coverSrc(item: Item) {
  return item.cover_url ?? null
}

function statusRing(item: Item): string {
  if (item.lieferung_ausstehend === 1) return 'ring-2 ring-yellow-500/70'
  if ((item.in_sammlung ?? 1) === 0)   return 'ring-2 ring-red-500/70'
  return                                       'ring-2 ring-green-500/50'
}

const SORT_LABELS: Record<SortField, string> = {
  name:                 'Name',
  serie:                'Serie',
  jahr:                 'Jahr',
  wert:                 'Wert',
  kaufpreis:            'Kaufpreis',
  lieferung_ausstehend: 'Lieferung',
  in_sammlung:          'Sammlung',
}

const sel = 'bg-zinc-800/70 text-zinc-300 text-xs rounded-lg px-2 py-1.5 outline-none ring-1 ring-white/10 focus:ring-yellow-500 cursor-pointer hover:bg-zinc-700/70 transition-colors'

export default function ItemGridView({ items: initialItems, editMode = false }: Props) {
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dragItems, setDragItems] = useState<Item[]>(initialItems)
  useEffect(() => { setDragItems(initialItems) }, [initialItems])
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMerge | null>(null)
  const [merging, setMerging] = useState(false)

  // ── Filter / sort state — persisted in sessionStorage ────────────────────
  const [filters, setFilters] = useState({
    name: '', serie: '', zustand: '', lieferung: '', sammlung: '',
  })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'name', dir: 'asc' })

  // Restore on mount
  useEffect(() => {
    try {
      const f = sessionStorage.getItem('grid-filters')
      if (f) setFilters(JSON.parse(f))
      const s = sessionStorage.getItem('grid-sort')
      if (s) setSort(JSON.parse(s))
    } catch { /* ignore */ }
  }, [])

  // Persist whenever state changes
  useEffect(() => {
    sessionStorage.setItem('grid-filters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    sessionStorage.setItem('grid-sort', JSON.stringify(sort))
  }, [sort])

  const hasFilters = filters.name || filters.serie || filters.zustand || filters.lieferung || filters.sammlung

  const filtered = useMemo(() => {
    return initialItems
      .filter((item) => {
        if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false
        if (filters.serie && item.serie !== filters.serie) return false
        if (filters.zustand && (item.zustand ?? '').toLowerCase() !== filters.zustand.toLowerCase()) return false
        if (filters.lieferung !== '' && String(item.lieferung_ausstehend ?? 0) !== filters.lieferung) return false
        if (filters.sammlung !== '' && String(item.in_sammlung ?? 1) !== filters.sammlung) return false
        return true
      })
      .sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        switch (sort.field) {
          case 'name':                 return dir * compareNames(a.name, b.name)
          case 'serie':                return dir * (a.serie ?? '').localeCompare(b.serie ?? '')
          case 'jahr':                 return dir * ((a.jahr ?? 0) - (b.jahr ?? 0))
          case 'wert':                 return dir * (parseValue(a.wert) - parseValue(b.wert))
          case 'kaufpreis':            return dir * (parseValue(a.kaufpreis) - parseValue(b.kaufpreis))
          case 'lieferung_ausstehend': return dir * ((a.lieferung_ausstehend ?? 0) - (b.lieferung_ausstehend ?? 0))
          case 'in_sammlung':          return dir * ((a.in_sammlung ?? 1) - (b.in_sammlung ?? 1))
          default:                     return 0
        }
      })
  }, [initialItems, filters, sort])

  // Persist filtered ID order so detail view can use it for prev/next
  useEffect(() => {
    sessionStorage.setItem('grid-filtered-ids', JSON.stringify(filtered.map((i) => i.id)))
  }, [filtered])

  function toggleDir() {
    setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))
  }

  function clearFilters() {
    setFilters({ name: '', serie: '', zustand: '', lieferung: '', sammlung: '' })
  }

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
    setDragItems((prev) => prev.filter((i) => i.id !== pending.source.id))
    setSelectedIds((prev) => prev.filter((id) => id !== pending.source.id))
    setPending(null)
    router.refresh()
  }

  // ── Filter / sort toolbar (shared by both modes) ───────────────────────────
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-zinc-900 rounded-xl border border-white/5 text-xs">
      {/* Name search */}
      <input
        value={filters.name}
        onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
        placeholder="Name suchen…"
        className="flex-1 min-w-36 bg-zinc-800/70 text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none ring-1 ring-white/10 focus:ring-yellow-500 placeholder-zinc-600 transition-colors text-xs"
      />

      {/* Serie */}
      <select value={filters.serie} onChange={(e) => setFilters((f) => ({ ...f, serie: e.target.value }))} className={sel}>
        <option value="">Alle Serien</option>
        {SERIES_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {/* Zustand */}
      <select value={filters.zustand} onChange={(e) => setFilters((f) => ({ ...f, zustand: e.target.value }))} className={sel}>
        <option value="">Alle Zustände</option>
        {CONDITION_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Lieferung */}
      <select value={filters.lieferung} onChange={(e) => setFilters((f) => ({ ...f, lieferung: e.target.value }))} title="Lieferstatus" className={sel}>
        <option value="">Alle Lieferungen</option>
        <option value="1">🚚 Ausstehend</option>
        <option value="0">✓ Erhalten</option>
      </select>

      {/* Sammlung */}
      <select value={filters.sammlung} onChange={(e) => setFilters((f) => ({ ...f, sammlung: e.target.value }))} title="Sammelstatus" className={sel}>
        <option value="">Alle Status</option>
        <option value="1">✅ Vorhanden</option>
        <option value="0">❌ Fehlt</option>
      </select>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5 bg-white/10 flex-shrink-0" />

      {/* Sort field */}
      <select value={sort.field} onChange={(e) => setSort((s) => ({ ...s, field: e.target.value as SortField }))} className={sel}>
        {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {/* Sort direction toggle */}
      <button
        onClick={toggleDir}
        title={sort.dir === 'asc' ? 'Aufsteigend' : 'Absteigend'}
        className="flex items-center gap-1 bg-zinc-800/70 hover:bg-zinc-700/70 text-zinc-300 rounded-lg px-2 py-1.5 ring-1 ring-white/10 transition-colors"
      >
        {sort.dir === 'asc'
          ? <ChevronUp className="w-3.5 h-3.5 text-yellow-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-yellow-400" />}
      </button>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          title="Filter zurücksetzen"
          className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors px-1.5 py-1.5 rounded-lg hover:bg-zinc-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Count */}
      <span className="ml-auto text-zinc-500 flex-shrink-0">
        {filtered.length !== initialItems.length
          ? <><span className="text-white">{filtered.length}</span> / {initialItems.length}</>
          : <>{initialItems.length} Artikel</>}
      </span>
    </div>
  )

  // ── Normal (non-edit) mode ─────────────────────────────────────────────────
  if (!editMode) {
    return (
      <>
        {toolbar}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-zinc-600 text-sm py-16">Keine Artikel gefunden</p>
        )}
      </>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id))

  return (
    <>
      {toolbar}

      {/* Select-all bar */}
      <div className="flex items-center gap-2 mb-2 text-sm text-zinc-400">
        <button
          onClick={() => allSelected
            ? setSelectedIds((prev) => prev.filter((id) => !filtered.some((i) => i.id === id)))
            : setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((i) => i.id)])])
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
        {filtered.map((item) => {
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
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverId(null) }}
              onDrop={(e) => {
                e.preventDefault()
                setOverId(null)
                const src = dragItems.find((i) => i.id === dragId)
                if (!src || src.id === item.id) return
                setPending({ source: src, target: item })
                setDragId(null)
              }}
              className={[
                'relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 select-none',
                isDragging ? 'opacity-40 scale-95' : 'opacity-100',
                isOver     ? 'ring-4 ring-yellow-500 scale-105 shadow-xl shadow-yellow-500/30'
                : isSelected ? 'ring-2 ring-indigo-400'
                : statusRing(item),
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
                {item.serie && (
                  <p className="text-yellow-400 text-xs mt-0.5 truncate">{item.serie}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-zinc-600 text-sm py-16">Keine Artikel gefunden</p>
      )}

      <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} items={dragItems} />

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
