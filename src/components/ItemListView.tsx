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

type SortField = 'name' | 'zustand' | 'serie' | 'jahr' | 'set_nummer' | 'kaufpreis' | 'wert' | 'lieferung_ausstehend' | 'in_sammlung'
type SortDir = 'asc' | 'desc'

function parseValue(v: string | null): number {
  if (!v) return -1
  return parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

export default function ItemListView({ items }: Props) {
  const [filters, setFilters] = useState({ name: '', zustand: '', serie: '', jahr: '', set_nummer: '', wert: '', lieferung: '', sammlung: '' })
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
        if (filters.lieferung !== '') {
          if (String(item.lieferung_ausstehend ?? 0) !== filters.lieferung) return false
        }
        if (filters.sammlung !== '') {
          if (String(item.in_sammlung ?? 1) !== filters.sammlung) return false
        }
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
          case 'kaufpreis':           return dir * (parseValue(a.kaufpreis) - parseValue(b.kaufpreis))
          case 'wert':                return dir * (parseValue(a.wert) - parseValue(b.wert))
          case 'lieferung_ausstehend':return dir * ((a.lieferung_ausstehend ?? 0) - (b.lieferung_ausstehend ?? 0))
          case 'in_sammlung':         return dir * ((a.in_sammlung ?? 1) - (b.in_sammlung ?? 1))
          default:                    return 0
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

  const totalKaufpreis = filtered.reduce((sum, i) => {
    if (!i.kaufpreis) return sum
    const n = parseFloat(i.kaufpreis.replace(',', '.').replace(/[^0-9.]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)
  const itemsWithKaufpreis = filtered.filter((i) => i.kaufpreis).length

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
          w-8  sammlung  (sm+)
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
          <button className={`w-10 flex-shrink-0 justify-center ${headerBtn}`} onClick={() => toggleSort('lieferung_ausstehend')}>
            Lief.<SortIcon field="lieferung_ausstehend" />
          </button>
          <button className={`w-8 flex-shrink-0 justify-center ${headerBtn}`} onClick={() => toggleSort('in_sammlung')}>
            <SortIcon field="in_sammlung" />
          </button>
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
          <select
            value={filters.lieferung}
            onChange={(e) => setFilters((f) => ({ ...f, lieferung: e.target.value }))}
            title="Lieferstatus filtern"
            className={`w-10 flex-shrink-0 ${filterSelect}`}
          >
            <option value="">Alle</option>
            <option value="1">🚚</option>
            <option value="0">✓</option>
          </select>
          <select
            value={filters.sammlung}
            onChange={(e) => setFilters((f) => ({ ...f, sammlung: e.target.value }))}
            title="Sammelstatus filtern"
            className={`w-8 flex-shrink-0 ${filterSelect}`}
          >
            <option value="">Alle</option>
            <option value="1">✅</option>
            <option value="0">❌</option>
          </select>
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
      {(itemsWithWert > 0 || itemsWithKaufpreis > 0) && (
        <div className="border-t border-white/10 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-500">
          <span>{filtered.length} von {items.length} Artikeln</span>
          <span className="flex-1" />
          {itemsWithKaufpreis > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-600">Kaufpreis</span>
              <span className="text-zinc-400">
                {itemsWithKaufpreis} Einträge
              </span>
              <span className="text-white/20">·</span>
              <span className="font-semibold text-white">
                {totalKaufpreis.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </span>
          )}
          {itemsWithWert > 0 && itemsWithKaufpreis > 0 && (
            <span className="text-white/10">|</span>
          )}
          {itemsWithWert > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="text-zinc-600">Wert</span>
              <span className="text-zinc-400">
                {itemsWithWert} bewertet
              </span>
              <span className="text-white/20">·</span>
              <span className="font-semibold text-yellow-400">
                {totalWert.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </span>
          )}
        </div>
      )}
    </div>

    <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} items={items} />
    </>
  )
}
