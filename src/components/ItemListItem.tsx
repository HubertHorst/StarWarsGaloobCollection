'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Item } from '@/types/item'
import { Euro, Pencil, Check, X, Loader2, Square, CheckSquare, Truck } from 'lucide-react'
import RefreshFromImageButton from '@/components/RefreshFromImageButton'
import CoverZoom from '@/components/CoverZoom'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'
import { SERIES_PRESETS } from '@/lib/seriesPresets'

type EditingField = 'name' | 'zustand' | 'serie' | 'wert' | 'kaufpreis' | null

interface Props {
  item: Item
  selected?: boolean
  onToggle?: () => void
}

export default function ItemListItem({ item, selected, onToggle }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditingField>(null)
  const [fieldValues, setFieldValues] = useState({
    name: item.name,
    zustand: item.zustand ?? '',
    serie: item.serie ?? '',
    wert: item.wert ?? '',
    kaufpreis: item.kaufpreis ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) {
      setFieldValues({
        name: item.name,
        zustand: item.zustand ?? '',
        serie: item.serie ?? '',
        wert: item.wert ?? '',
        kaufpreis: item.kaufpreis ?? '',
      })
    }
  }, [item.name, item.zustand, item.serie, item.wert, item.kaufpreis, editing])

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const coverUrl = item.cover_url ?? null

  function startEdit(field: EditingField, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(field)
  }

  function cancel(e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    setFieldValues({
      name: item.name,
      zustand: item.zustand ?? '',
      serie: item.serie ?? '',
      wert: item.wert ?? '',
      kaufpreis: item.kaufpreis ?? '',
    })
    setEditing(null)
  }

  async function save(field: EditingField, e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    if (!field) return

    const val = fieldValues[field].trim()
    const original = field === 'name' ? item.name
      : field === 'zustand' ? (item.zustand ?? '')
      : field === 'serie' ? (item.serie ?? '')
      : field === 'wert' ? (item.wert ?? '')
      : (item.kaufpreis ?? '')

    if (val === original) {
      setEditing(null)
      return
    }

    setSaving(true)
    const body: Record<string, string | null> = { [field]: val || null }
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent, field: EditingField) {
    e.stopPropagation()
    if (e.key === 'Enter') save(field)
    if (e.key === 'Escape') cancel()
  }

  function handleRowClick() {
    if (editing) return
    sessionStorage.setItem('library-scroll', String(window.scrollY))
    router.push(`/items/${item.id}`)
  }

  async function toggleLieferung(e: React.MouseEvent) {
    e.stopPropagation()
    const newVal = item.lieferung_ausstehend === 1 ? 0 : 1
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lieferung_ausstehend: newVal }),
    })
    router.refresh()
  }

  const saveBtns = (
    <>
      <button onClick={(e) => save(editing, e)} disabled={saving} className="flex-shrink-0 text-indigo-400 hover:text-indigo-300">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={cancel} disabled={saving} className="flex-shrink-0 text-zinc-500 hover:text-zinc-300">
        <X className="w-3 h-3" />
      </button>
    </>
  )

  return (
    <div
      onClick={handleRowClick}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-zinc-800/70 transition-colors border border-transparent hover:border-white/5 cursor-pointer"
    >
      {/* Col 1 – Checkbox (w-5) */}
      <div className="w-5 flex-shrink-0 flex items-center justify-center">
        {onToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle() }}
            className="text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            {selected ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Col 2 – Thumbnail (w-10) */}
      <div className="relative w-10 aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/10">
        {coverUrl ? (
          <CoverZoom
            src={coverUrl}
            alt={item.name}
            sizes="40px"
            images={[coverUrl, ...(item.user_photos ?? []).filter((u) => u !== coverUrl)]}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-xs">?</div>
        )}
      </div>

      {/* Col 3 – Name (flex-1) */}
      <div className="flex-1 min-w-0">
        {editing === 'name' ? (
          <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={fieldValues.name}
              onChange={(e) => setFieldValues((v) => ({ ...v, name: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(e, 'name')}
              disabled={saving}
              className="flex-1 min-w-0 bg-zinc-800 text-white rounded px-1.5 py-0.5 text-sm font-medium outline-none ring-2 ring-indigo-500"
            />
            {saveBtns}
          </span>
        ) : (
          <span className="flex items-center gap-1 min-w-0">
            <p className="text-sm font-medium text-white truncate group-hover:text-yellow-300 transition-colors">
              {item.name}
            </p>
            <button
              onClick={(e) => startEdit('name', e)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
            </button>
          </span>
        )}
      </div>

      {/* Col 4 – Zustand (sm+) */}
      <div className="hidden sm:block flex-shrink-0">
        {editing === 'zustand' ? (
          <span className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={fieldValues.zustand}
              onChange={(e) => setFieldValues((v) => ({ ...v, zustand: e.target.value }))}
              className="w-full bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none ring-2 ring-indigo-500 cursor-pointer"
            >
              <option value="">— wählen —</option>
              {CONDITION_PRESETS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={fieldValues.zustand}
                onChange={(e) => setFieldValues((v) => ({ ...v, zustand: e.target.value }))}
                onKeyDown={(e) => handleKeyDown(e, 'zustand')}
                disabled={saving}
                placeholder="Eigene Eingabe…"
                className="flex-1 min-w-0 bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none ring-1 ring-zinc-600"
              />
              {saveBtns}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span className="text-xs text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5 uppercase tracking-wide">
              {item.zustand ?? '—'}
            </span>
            <button
              onClick={(e) => startEdit('zustand', e)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
            </button>
          </span>
        )}
      </div>

      {/* Col 5 – Serie (w-28, sm+) */}
      <div className="hidden sm:block w-28 flex-shrink-0">
        {editing === 'serie' ? (
          <span className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <select
              value={fieldValues.serie}
              onChange={(e) => setFieldValues((v) => ({ ...v, serie: e.target.value }))}
              className="w-full bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-xs outline-none ring-2 ring-yellow-500 cursor-pointer"
            >
              <option value="">— wählen —</option>
              {SERIES_PRESETS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="flex items-center gap-1">
              <button onClick={(e) => save('serie', e)} disabled={saving} className="p-0.5 rounded bg-yellow-600 hover:bg-yellow-500 text-white">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button onClick={cancel} disabled={saving} className="p-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 justify-end group/serie">
            <span className="text-xs text-zinc-500 truncate">{item.serie ?? '—'}</span>
            <button onClick={(e) => startEdit('serie', e)} className="flex-shrink-0 opacity-0 group-hover/serie:opacity-100 transition-opacity">
              <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
            </button>
          </span>
        )}
      </div>

      {/* Col 6 – Jahr (w-12, sm+) */}
      <div className="hidden sm:block w-12 flex-shrink-0 text-xs text-zinc-500 text-right">
        {item.jahr ?? ''}
      </div>

      {/* Col 7 – Set Nr (w-16, md+) */}
      <div className="hidden md:block w-16 flex-shrink-0 text-xs text-zinc-500 text-right truncate">
        {item.set_nummer ?? ''}
      </div>

      {/* Col 8 – Lieferung (w-10, sm+) */}
      <div className="hidden sm:flex w-10 flex-shrink-0 items-center justify-center">
        <button
          onClick={toggleLieferung}
          title={item.lieferung_ausstehend === 1 ? 'Lieferung ausstehend' : 'Lieferung erhalten'}
          className={`p-1 rounded-md transition-colors ${
            item.lieferung_ausstehend === 1
              ? 'text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
              : 'text-zinc-700 hover:text-zinc-500 opacity-0 group-hover:opacity-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Col 9 – Refresh button (w-8, sm+) */}
      <div className="hidden sm:flex w-8 flex-shrink-0 items-center">
        <RefreshFromImageButton itemId={item.id} compact />
      </div>

      {/* Col 10 – Kaufpreis (w-20, lg+) */}
      <div className="hidden lg:flex w-20 flex-shrink-0 items-center justify-end">
        {editing === 'kaufpreis' ? (
          <span className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            <Euro className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              value={fieldValues.kaufpreis}
              onChange={(e) => setFieldValues((v) => ({ ...v, kaufpreis: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(e, 'kaufpreis')}
              disabled={saving}
              placeholder="0,00"
              className="flex-1 min-w-0 bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs outline-none ring-2 ring-indigo-500"
            />
            {saveBtns}
          </span>
        ) : (
          <span className="flex items-center gap-1 justify-end w-full">
            {item.kaufpreis ? (
              <>
                <Euro className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-500 text-xs">{item.kaufpreis}</span>
              </>
            ) : (
              <span className="text-zinc-700 italic text-xs">—</span>
            )}
            <button
              onClick={(e) => startEdit('kaufpreis', e)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
            </button>
          </span>
        )}
      </div>

      {/* Col 11 – Wert (w-20, lg+) */}
      <div className="hidden lg:flex w-20 flex-shrink-0 items-center justify-end">
        {editing === 'wert' ? (
          <span className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
            <Euro className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              value={fieldValues.wert}
              onChange={(e) => setFieldValues((v) => ({ ...v, wert: e.target.value }))}
              onKeyDown={(e) => handleKeyDown(e, 'wert')}
              disabled={saving}
              placeholder="0,00"
              className="flex-1 min-w-0 bg-zinc-800 text-zinc-300 rounded px-1 py-0.5 text-xs outline-none ring-2 ring-indigo-500"
            />
            {saveBtns}
          </span>
        ) : (
          <span className="flex items-center gap-1 justify-end w-full">
            {item.wert ? (
              <>
                <Euro className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-400 text-xs">{item.wert}</span>
              </>
            ) : (
              <span className="text-zinc-700 italic text-xs">—</span>
            )}
            <button
              onClick={(e) => startEdit('wert', e)}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
            >
              <Pencil className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
            </button>
          </span>
        )}
      </div>
    </div>
  )
}
