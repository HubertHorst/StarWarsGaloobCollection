'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square } from 'lucide-react'
import { Item } from '@/types/item'
import ItemListItem from '@/components/ItemListItem'
import BulkActionBar from '@/components/BulkActionBar'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'
import { compareNames } from '@/lib/sortItems'
import {
  ColWidths,
  DEFAULT_COL_WIDTHS,
  COL_WIDTHS_LS_KEY,
  COL_MIN_WIDTH,
} from '@/lib/itemListColumns'

interface Props {
  items: Item[]
  isLoggedIn?: boolean
}

type SortField = 'name' | 'zustand' | 'serie' | 'jahr' | 'set_nummer' | 'kaufpreis' | 'wert' | 'lieferung_ausstehend' | 'in_sammlung'
type SortDir = 'asc' | 'desc'

function parseValue(v: string | null): number {
  if (!v) return -1
  return parseFloat(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0
}

export default function ItemListView({ items, isLoggedIn = false }: Props) {
  const [filters, setFilters] = useState({ name: '', zustand: '', serie: '', jahr: '', set_nummer: '', wert: '', lieferung: '', sammlung: '' })
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'name', dir: 'asc' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Column widths (px) — persisted + draggable
  const [widths, setWidths] = useState<ColWidths>(DEFAULT_COL_WIDTHS)
  const widthsRestoredRef = useRef(false)

  const series = useMemo(() => [...new Set(items.map((i) => i.serie).filter(Boolean) as string[])].sort(), [items])

  // ── Persist / restore filter + sort + widths state ───────────────────────
  useEffect(() => {
    try {
      const f = sessionStorage.getItem('list-filters')
      if (f) setFilters(JSON.parse(f))
      const s = sessionStorage.getItem('list-sort')
      if (s) setSort(JSON.parse(s))
      const w = localStorage.getItem(COL_WIDTHS_LS_KEY)
      if (w) setWidths({ ...DEFAULT_COL_WIDTHS, ...JSON.parse(w) })
    } catch { /* ignore */ }
    widthsRestoredRef.current = true
  }, [])

  useEffect(() => {
    if (!widthsRestoredRef.current) return
    try { localStorage.setItem(COL_WIDTHS_LS_KEY, JSON.stringify(widths)) } catch {}
  }, [widths])

  function startResize(e: React.MouseEvent, key: keyof ColWidths) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = widths[key]
    function move(ev: MouseEvent) {
      const next = Math.max(COL_MIN_WIDTH, startW + (ev.clientX - startX))
      setWidths((w) => ({ ...w, [key]: next }))
    }
    function up() {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  // Style helper — every column is explicit-width and non-shrinking, so
  // header/filter/row cells line up exactly. Name uses the same model and
  // wraps to multiple lines when content exceeds the chosen width.
  function colStyle(key: keyof ColWidths): React.CSSProperties {
    const w = widths[key]
    return { width: w, minWidth: w, flexShrink: 0 }
  }

  function ResizeHandle({ colKey }: { colKey: keyof ColWidths }) {
    return (
      <span
        onMouseDown={(e) => startResize(e, colKey)}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-yellow-500/40 z-10"
      />
    )
  }

  useEffect(() => {
    sessionStorage.setItem('list-filters', JSON.stringify(filters))
  }, [filters])

  useEffect(() => {
    sessionStorage.setItem('list-sort', JSON.stringify(sort))
  }, [sort])

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false
        if (filters.zustand && (item.zustand ?? '').toLowerCase() !== filters.zustand.toLowerCase()) return false
        if (filters.serie) {
          if (filters.serie === '__none__') {
            if (item.serie) return false
          } else if (item.serie !== filters.serie) {
            return false
          }
        }
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
          case 'name':      return dir * compareNames(a.name, b.name)
          case 'zustand':   return dir * (a.zustand ?? '').localeCompare(b.zustand ?? '')
          case 'serie': {
            const s = (a.serie ?? '').localeCompare(b.serie ?? '')
            return s !== 0 ? dir * s : compareNames(a.name, b.name)
          }
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

  // Write filtered order so ItemNavigation uses it for prev/next in detail view
  useEffect(() => {
    sessionStorage.setItem('grid-filtered-ids', JSON.stringify(filtered.map((i) => i.id)))
  }, [filtered])

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
    <div className="bg-zinc-900 rounded-xl border border-white/5 overflow-x-auto">

      {/*
          Columns mirror ItemListItem: gap-3, same widths, same breakpoints
          w-5  checkbox
          w-10 thumbnail
          flex-1 name + serie (subtitle)
          auto zustand   (sm+)
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
        <div className="hidden sm:flex items-center gap-3 px-4 pt-2 pb-1 select-none">
          <div className="flex items-center justify-center" style={colStyle('checkbox')}>
            <button onClick={toggleSelectAll} className="text-zinc-500 hover:text-indigo-400 transition-colors">
              {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
          <div style={colStyle('thumb')} />
          <div className="relative" style={colStyle('name')}>
            <button className={`w-full ${headerBtn}`} onClick={() => toggleSort('name')}>
              Name <SortIcon field="name" />
            </button>
            <ResizeHandle colKey="name" />
          </div>
          <div className="relative" style={colStyle('serie')}>
            <button className={`w-full ${headerBtn}`} onClick={() => toggleSort('serie')}>
              Serie <SortIcon field="serie" />
            </button>
            <ResizeHandle colKey="serie" />
          </div>
          <div className="relative" style={colStyle('zustand')}>
            <button className={`w-full ${headerBtn}`} onClick={() => toggleSort('zustand')}>
              Zustand <SortIcon field="zustand" />
            </button>
            <ResizeHandle colKey="zustand" />
          </div>
          <div className="relative" style={colStyle('jahr')}>
            <button className={`w-full text-right justify-end ${headerBtn}`} onClick={() => toggleSort('jahr')}>
              Jahr <SortIcon field="jahr" />
            </button>
            <ResizeHandle colKey="jahr" />
          </div>
          <div className="relative" style={colStyle('setnr')}>
            <button className={`w-full text-right justify-end ${headerBtn}`} onClick={() => toggleSort('set_nummer')}>
              Set-Nr <SortIcon field="set_nummer" />
            </button>
            <ResizeHandle colKey="setnr" />
          </div>
          <div className="relative" style={colStyle('lief')}>
            <button className={`w-full justify-center ${headerBtn}`} onClick={() => toggleSort('lieferung_ausstehend')}>
              Lief.<SortIcon field="lieferung_ausstehend" />
            </button>
            <ResizeHandle colKey="lief" />
          </div>
          <div className="relative" style={colStyle('sammlung')}>
            <button className={`w-full justify-center ${headerBtn}`} onClick={() => toggleSort('in_sammlung')}>
              <SortIcon field="in_sammlung" />
            </button>
            <ResizeHandle colKey="sammlung" />
          </div>
          <div style={colStyle('actions')} />
          <div className="relative" style={colStyle('kauf')}>
            <button className={`w-full text-right justify-end ${headerBtn}`} onClick={() => toggleSort('kaufpreis')}>
              Kauf <SortIcon field="kaufpreis" />
            </button>
            <ResizeHandle colKey="kauf" />
          </div>
          <div className="relative" style={colStyle('wert')}>
            <button className={`w-full text-right justify-end ${headerBtn}`} onClick={() => toggleSort('wert')}>
              Wert <SortIcon field="wert" />
            </button>
          </div>
        </div>

        {/* Filter input row */}
        <div className="hidden sm:flex items-center gap-3 px-4 pb-2">
          <div style={colStyle('checkbox')} />
          <div style={colStyle('thumb')} />
          <input
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name suchen…"
            style={colStyle('name')}
            className={`${filterInput}`}
          />
          <select
            value={filters.serie}
            onChange={(e) => setFilters((f) => ({ ...f, serie: e.target.value }))}
            style={colStyle('serie')}
            className={`${filterSelect}`}
          >
            <option value="">Alle Serien</option>
            <option value="__none__">— Ohne Serie</option>
            {series.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filters.zustand}
            onChange={(e) => setFilters((f) => ({ ...f, zustand: e.target.value }))}
            style={colStyle('zustand')}
            className={`${filterSelect}`}
          >
            <option value="">Alle</option>
            {CONDITION_PRESETS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            value={filters.jahr}
            onChange={(e) => setFilters((f) => ({ ...f, jahr: e.target.value }))}
            placeholder="Jahr…"
            style={colStyle('jahr')}
            className={`${filterInput}`}
          />
          <input
            value={filters.set_nummer}
            onChange={(e) => setFilters((f) => ({ ...f, set_nummer: e.target.value }))}
            placeholder="Set-Nr…"
            style={colStyle('setnr')}
            className={`${filterInput}`}
          />
          <select
            value={filters.lieferung}
            onChange={(e) => setFilters((f) => ({ ...f, lieferung: e.target.value }))}
            title="Lieferstatus filtern"
            style={colStyle('lief')}
            className={`${filterSelect}`}
          >
            <option value="">Alle</option>
            <option value="1">🚚</option>
            <option value="0">✓</option>
          </select>
          <select
            value={filters.sammlung}
            onChange={(e) => setFilters((f) => ({ ...f, sammlung: e.target.value }))}
            title="Sammelstatus filtern"
            style={colStyle('sammlung')}
            className={`${filterSelect}`}
          >
            <option value="">Alle</option>
            <option value="1">✅</option>
            <option value="0">❌</option>
          </select>
          <div style={colStyle('actions')} />
          <div style={colStyle('kauf')} />
          <input
            value={filters.wert}
            onChange={(e) => setFilters((f) => ({ ...f, wert: e.target.value }))}
            placeholder="Wert…"
            style={colStyle('wert')}
            className={`${filterInput}`}
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
            widths={widths}
            isLoggedIn={isLoggedIn}
          />
        ))
      )}

      {/* Total footer — only for logged-in users */}
      {isLoggedIn && (itemsWithWert > 0 || itemsWithKaufpreis > 0) && (
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

    {isLoggedIn && <BulkActionBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} items={items} />}
    </>
  )
}
