'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square } from 'lucide-react'
import { Item } from '@/types/item'
import ItemListItem from '@/components/ItemListItem'
import BulkActionBar from '@/components/BulkActionBar'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'

interface Props {
  items: Item[]
}

type SortField = 'name' | 'zustand' | 'serie' | 'jahr' | 'set_nummer' | 'kaufpreis' | 'wert'
type SortDir = 'asc' | 'desc'

function parseValue(v: string | null): number {
  if (!v) return -1
  return parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

export default function ItemListView({ items }: Props) {
  const [filters, setFilters] = useState({ name: '', zustand: '', serie: '', jahr: '', set_nummer: '', wert: '' })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'name', dir: 'asc' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const series = useMemo(() => [...new Set(items.map((i) => i.serie).filter(Boolean) as string[])].sort(), [items])

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false
        if (filters.zustand && (item.zustand ?? '').toLowerCase() !== filters.zustand.toLowerCase()) return false
        if (filters.serie && item.serie !== filters.serie) return false
        if (filters.jahr) {
          const year = item.jahr ? String(item.jahr) : ''
          if (!year.startsWith(filters.jahr)) return false
        }
        if (filters.set_nummer && !(item.set_nummer ?? '').toLowerCase().includes(filters.set_nummer.toLowerCase())) return false
        if (filters.wert && !(item.wert ?? '').toLowerCase().includes(filters.wert.toLowerCase())) return false
        return true
      })
      .sort((a, b) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        switch (sort.field) {
          case 'name':      return dir * a.name.localeCompare(b.name)
          case 'zustand':   return dir * (a.zustand ?? '').localeCompare(b.zustand ?? '')
          case 'serie':     return dir * (a.serie ?? '').localeCompare(b.serie ?? '')
          case 'jahr':      return dir * ((a.jahr ?? 0) - (b.jahr ?? 0))
          case 'set_nummer':return dir * (a.set_nummer ?? '').localeCompare(b.set_nummer ?? '')
          case 'kaufpreis': return dir * (parseValue(a.kaufpreis) - parseValue(b.kaufpreis))
          case 'wert':      return dir * (parseValue(a.wert) - parseValue(b.wert))
          default:          return 0
        }
      })
  }, [items, filters, sort])

  function toggleSort(field: SortField) {
    setSort((s) => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.includes(i.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((i) => i.id === id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((i) => i.id)])])
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return <ChevronsUpDown className="w-3 h-3 text-zinc-700" />
    return sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-yellow-400" /> : <ChevronDown className="w-3 h-3 text-yellow-400" />
  }

  const totalWert = filtered.reduce((sum, i) => {
    if (!i.wert) return sum
    const n = parseFloat(i.wert.replace(',', '.').replace(/[^0-9.]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  const itemsWithWert = filtered.filter((i) => i.wert).length

  const headerBtn = 'flex items-center gap-0.5 hover:text-white transition-colors cursor-pointer select-none'
  const filterInput = 'bg-zinc-800/60 text-zinc-300 text-xs rounded px-1.5 py-1 outline-none ring-1 ring-white/5 focus:ring-yellow-500 placeholder-zinc-600'
  const filterSelect = filterInput + ' cursor-pointer'

  return (
    <>
    <div className="bg-zinc-900 rounded-xl border border-white/5 overflow-hidden">

      {/*
          Columns mirror ItemListItem: gap-3, same widths, same breakpoints
          w-5  checkbox
          w-10 thumbnail
          flex-1 name
          auto zustand   (sm+)
          w-28 serie     (sm+)
          w-12 jahr      (sm+)
          w-16 set_nummer (md+)
          w-10 lieferung  (sm+)
          w-8  refresh   (sm+)
          w-20 kaufpreis  (lg+)
          w-20 wert      (lg+)
      */}
      <div className="border-b border-white/5 text-xs text-zinc-500 font-medium">

        {/* Sort header row */}
        <div className="hidden sm:flex items-center gap-3 px-4 pt-2 pb-1">
          <div className="w-5 flex-shrink-0 flex items-center justify-center">
            <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-indigo-400 transition-colors">
              {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
          <div className="w-10 flex-shrink-0" />
          <button className={`flex-1 min-w-0 ${headerBtn}`} onClick={() => toggleSort('name')}>
            Name <SortIcon field="name" />
          </button>
          <button className={`flex-shrink-0 ${headerBtn}`} onClick={() => toggleSort('zustand')}>
            Zustand <SortIcon field="zustand" />
          </button>
          <button className={`w-28 flex-shrink-0 text-right justify-end ${headerBtn}`} onClick={() => toggleSort('serie')}>
            Serie <SortIcon field="serie" />
          </button>
          <button className={`w-12 flex-shrink-0 text-right justify-end ${headerBtn}`} onClick={() => toggleSort('jahr')}>
            Jahr <SortIcon field="jahr" />
          </button>
          <button className={`hidden md:flex w-16 flex-shrink-0 text-right justify-end ${headerBtn}`} onClick={() => toggleSort('set_nummer')}>
            Set-Nr <SortIcon field="set_nummer" />
          </button>
          <div className="w-10 flex-shrink-0 text-center">Lief.</div>
          <div className="w-8 flex-shrink-0" />
          <button className={`hidden lg:flex w-20 flex-shrink-0 text-right justify-end ${headerBtn}`} onClick={() => toggleSort('kaufpreis')}>
            Kauf <SortIcon field="kaufpreis" />
          </button>
          <button className={`hidden lg:flex w-20 flex-shrink-0 text-right justify-end ${headerBtn}`} onClick={() => toggleSort('wert')}>
            Wert <SortIcon field="wert" />
          </button>
        </div>

        {/* Filter input row */}
        <div className="hidden sm:flex items-center gap-3 px-4 pb-2">
          <div className="w-5 flex-shrink-0" />
          <div className="w-10 flex-shrink-0" />
          <input
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name suchen…"
            className={`flex-1 min-w-0 ${filterInput}`}
          />
          <select
            value={filters.zustand}
            onChange={(e) => setFilters((f) => ({ ...f, zustand: e.target.value }))}
            className={`w-auto flex-shrink-0 ${filterSelect}`}
          >
            <option value="">Alle</option>
            {CONDITION_PRESETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filters.serie}
            onChange={(e) => setFilters((f) => ({ ...f, serie: e.target.value }))}
            className={`w-28 flex-shrink-0 ${filterSelect}`}
          >
            <option value="">Alle</option>
            {series.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={filters.jahr}
            onChange={(e) => setFilters((f) => ({ ...f, jahr: e.target.value }))}
            placeholder="Jahr…"
            className={`w-12 flex-shrink-0 ${filterInput}`}
          />
          <input
            value={filters.set_nummer}
            onChange={(e) => setFilters((f) => ({ ...f, set_nummer: e.target.value }))}
            placeholder="Set-Nr…"
            className={`hidden md:block w-16 flex-shrink-0 ${filterInput}`}
          />
          <div className="w-10 flex-shrink-0" />
          <div className="w-8 flex-shrink-0" />
          <div className="hidden lg:block w-20 flex-shrink-0" />
          <input
            value={filters.wert}
            onChange={(e) => setFilters((f) => ({ ...f, wert: e.target.value }))}
            placeholder="Wert…"
            className={`hidden lg:block w-20 flex-shrink-0 ${filterInput}`}
          />
        </div>
      </div>

      {/* Item rows */}
      {filtered.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm py-12">Keine Artikel gefunden</p>
      ) : (
        filtered.map((item) => (
          <ItemListItem
            key={item.id}
            item={item}
            selected={selectedIds.includes(item.id)}
            onToggle={() => toggleSelect(item.id)}
          />
        ))
      )}

      {/* Total footer */}
      {itemsWithWert > 0 && (
        <div className="border-t border-white/10 px-4 py-3 flex items-center justify-between text-sm text-zinc-500">
          <span className="text-xs">{filtered.length} von {items.length} Artikeln</span>
          <span>
            {itemsWithWert} bewertet ·{' '}
            <span className="font-semibold text-white">
              {totalWert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </span>
          </span>
        </div>
      )}
    </div>

    <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} items={items} />
    </>
  )
}
