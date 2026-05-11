'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X, ScanSearch, Trash2 } from 'lucide-react'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'
import { SERIES_PRESETS } from '@/lib/seriesPresets'
import BulkRefreshReviewModal, { ProposedData } from '@/components/BulkRefreshReviewModal'
import { Item } from '@/types/item'

interface Props {
  selectedIds: string[]
  onClear: () => void
  items?: Item[]
}

interface ReviewState {
  item: Item
  proposed: ProposedData
  identified: string
  queueIndex: number
}

export default function BulkActionBar({ selectedIds, onClear, items = [] }: Props) {
  const router = useRouter()
  const [zustand, setZustand] = useState('')
  const [serie, setSerie] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState<{ done: number; total: number } | null>(null)
  const [review, setReview] = useState<ReviewState | null>(null)
  const [applying, setApplying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (selectedIds.length === 0) return null

  const busy = saving || refreshing || deleting

  async function bulkDelete() {
    setDeleting(true)
    await Promise.all(selectedIds.map((id) =>
      fetch(`/api/items/${id}`, { method: 'DELETE' })
    ))
    setDeleting(false)
    setConfirmDelete(false)
    onClear()
    const params = new URLSearchParams(window.location.search)
    params.delete('edit')
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  async function apply() {
    if (!zustand && !serie) return
    setSaving(true)
    const fields: Record<string, string | null> = {}
    if (zustand) fields.zustand = zustand
    if (serie) fields.serie = serie
    await fetch('/api/items/bulk-patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, fields }),
    })
    setSaving(false)
    onClear()
    const params = new URLSearchParams(window.location.search)
    params.delete('edit')
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  async function bulkRefresh() {
    setRefreshing(true)
    setRefreshProgress({ done: 0, total: selectedIds.length })
    await processNext(0)
  }

  async function processNext(index: number) {
    if (index >= selectedIds.length) {
      setRefreshing(false)
      setRefreshProgress(null)
      onClear()
      router.refresh()
      return
    }
    const id = selectedIds[index]
    const item = items.find((i) => i.id === id)
    setRefreshProgress({ done: index, total: selectedIds.length })

    try {
      const res = await fetch(`/api/items/${id}/refresh-image?preview=1`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.proposed) {
        await processNext(index + 1)
        return
      }
      setReview({
        item: item ?? ({ id, name: id } as Item),
        proposed: data.proposed,
        identified: data.identified,
        queueIndex: index,
      })
    } catch {
      await processNext(index + 1)
    }
  }

  async function handleConfirm() {
    if (!review) return
    setApplying(true)
    const { proposed, item, queueIndex } = review
    await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: proposed.name,
        serie: proposed.serie,
        set_nummer: proposed.set_nummer,
        jahr: proposed.jahr,
        zustand: proposed.zustand,
      }),
    })
    setApplying(false)
    setReview(null)
    await processNext(queueIndex + 1)
  }

  async function handleSkip() {
    if (!review) return
    const next = review.queueIndex + 1
    setReview(null)
    await processNext(next)
  }

  return (
    <>
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 border border-yellow-500/40 shadow-2xl shadow-yellow-500/20 rounded-2xl px-5 py-3">
      <span className="text-sm font-medium text-yellow-300 whitespace-nowrap">
        {selectedIds.length} {selectedIds.length === 1 ? 'Artikel' : 'Artikel'} ausgewählt
      </span>

      <div className="w-px h-5 bg-white/10" />

      {/* Serie dropdown */}
      <select
        value={serie}
        onChange={(e) => setSerie(e.target.value)}
        disabled={busy}
        className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-2 py-1.5 outline-none ring-1 ring-white/10 focus:ring-yellow-500 cursor-pointer disabled:opacity-40"
      >
        <option value="">— Serie wählen —</option>
        {SERIES_PRESETS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Zustand dropdown */}
      <select
        value={zustand}
        onChange={(e) => setZustand(e.target.value)}
        disabled={busy}
        className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-2 py-1.5 outline-none ring-1 ring-white/10 focus:ring-yellow-500 cursor-pointer disabled:opacity-40"
      >
        <option value="">— Zustand wählen —</option>
        {CONDITION_PRESETS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Apply */}
      <button
        onClick={apply}
        disabled={busy || (!zustand && !serie)}
        className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Anwenden
      </button>

      <div className="w-px h-5 bg-white/10" />

      {/* Bulk refresh from image */}
      <button
        onClick={bulkRefresh}
        disabled={busy}
        className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-zinc-300 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        {refreshing
          ? <><Loader2 className="w-4 h-4 animate-spin" />{refreshProgress?.done}/{refreshProgress?.total}</>
          : <><ScanSearch className="w-4 h-4" />Aus Bild neu laden</>}
      </button>

      <div className="w-px h-5 bg-white/10" />

      {/* Bulk delete */}
      <button
        onClick={() => setConfirmDelete(true)}
        disabled={busy}
        className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        <Trash2 className="w-4 h-4" />
        Löschen
      </button>

      {/* Clear selection */}
      <button onClick={onClear} disabled={busy} className="text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40">
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Delete confirmation dialog */}
    {confirmDelete && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h2 className="text-lg font-bold mb-2">Artikel löschen?</h2>
          <p className="text-zinc-400 text-sm mb-6">
            {selectedIds.length} {selectedIds.length === 1 ? 'Artikel wird' : 'Artikel werden'} unwiderruflich gelöscht.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={bulkDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Löschen
            </button>
          </div>
        </div>
      </div>
    )}

    {review && (
      <BulkRefreshReviewModal
        item={review.item}
        proposed={review.proposed}
        identified={review.identified}
        progress={{ done: review.queueIndex, total: selectedIds.length }}
        applying={applying}
        onConfirm={handleConfirm}
        onSkip={handleSkip}
      />
    )}
    </>
  )
}
