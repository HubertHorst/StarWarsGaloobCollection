'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, Layers, Merge, Trash2 } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'
import { DEFAULT_CONDITION } from '@/lib/conditionPresets'
import { Item } from '@/types/item'

type ItemStatus = 'queued' | 'uploading' | 'identifying' | 'saving' | 'done' | 'error' | 'review' | 'discarded'

interface BulkItem {
  id: string
  file: File
  preview: string
  status: ItemStatus
  name: string | null
  serie: string | null
  coverUrl: string | null
  errorMsg: string | null
  itemId: string | null
  pendingPayload?: Record<string, unknown>
  duplicateItems?: Item[]
}

interface PendingMerge {
  sourceLocalId: string
  sourceName: string
  sourcePreview: string
  targetLocalId: string
  targetName: string
  targetPreview: string
  sourceItemId: string
  targetItemId: string
}

const BATCH_SIZE = 5

function statusLabel(item: BulkItem): string {
  switch (item.status) {
    case 'queued': return 'Warte…'
    case 'uploading': return 'Hochladen…'
    case 'identifying': return 'Claude liest…'
    case 'saving': return 'Speichern…'
    case 'done':      return 'Gespeichert'
    case 'review':    return 'Bereits vorhanden – Bestätigung nötig'
    case 'discarded': return 'Upload verworfen'
    case 'error':     return item.errorMsg ?? 'Fehler'
  }
}

function statusColor(status: ItemStatus): string {
  switch (status) {
    case 'done':      return 'text-green-400'
    case 'review':    return 'text-amber-400'
    case 'discarded': return 'text-zinc-600'
    case 'error':     return 'text-red-400'
    default:          return 'text-zinc-400'
  }
}

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  )
}

function isVideo(file: File): boolean {
  return (
    file.type.startsWith('video/') ||
    file.name.toLowerCase().endsWith('.mp4') ||
    file.name.toLowerCase().endsWith('.mov')
  )
}

function isAccepted(file: File): boolean {
  return file.type.startsWith('image/') || isHeic(file) || isVideo(file)
}

async function convertHeic(file: File): Promise<File> {
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    const blob = Array.isArray(result) ? result[0] : result
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

async function extractVideoFrame(file: File): Promise<File> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.src = url
    video.muted = true
    video.playsInline = true
    const capture = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => resolve(blob
          ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
          : file),
        'image/jpeg', 0.85
      )
    }
    video.onseeked = capture
    video.onloadeddata = () => { video.currentTime = 0.5 }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
  })
}

async function toImageFile(file: File): Promise<File> {
  if (isHeic(file)) return convertHeic(file)
  if (isVideo(file)) return extractVideoFrame(file)
  return file
}

export default function BulkUploadClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<BulkItem[]>([])
  const [running, setRunning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [converting, setConverting] = useState(false)

  // merge state
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingMerge | null>(null)
  const [merging, setMerging] = useState(false)

  function updateItem(id: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  async function addFiles(files: File[]) {
    const accepted = files.filter(isAccepted)
    if (accepted.length === 0) return
    setConverting(true)
    const newItems = await Promise.all(
      accepted.map(async (file) => {
        const imageFile = await toImageFile(file)
        return {
          id: crypto.randomUUID(),
          file: imageFile,
          preview: URL.createObjectURL(imageFile),
          status: 'queued' as ItemStatus,
          name: null,
          serie: null,
          coverUrl: null,
          errorMsg: null,
          itemId: null,
        }
      })
    )
    setConverting(false)
    setItems((prev) => [...prev, ...newItems])
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  const processItem = useCallback(async (item: BulkItem) => {
    try {
      updateItem(item.id, { status: 'uploading' })
      const compressed = await compressImage(item.file)

      const coverFd = new FormData()
      coverFd.append('file', compressed)
      const identifyFd = new FormData()
      identifyFd.append('image', compressed)

      updateItem(item.id, { status: 'identifying' })
      const [coverRes, identifyRes] = await Promise.all([
        fetch('/api/upload-cover', { method: 'POST', body: coverFd }),
        fetch('/api/identify-item', { method: 'POST', body: identifyFd }),
      ])

      const coverUrl = coverRes.ok ? (await coverRes.json()).url : null
      const identifyData = identifyRes.ok ? await identifyRes.json() : {}

      const name = identifyData.name ?? item.file.name.replace(/\.[^.]+$/, '')
      const serie = identifyData.serie ?? null
      const set_nummer = identifyData.set_nummer ?? null
      const jahr = identifyData.jahr ?? null
      const zustand = identifyData.zustand ?? DEFAULT_CONDITION

      updateItem(item.id, { name, serie, coverUrl })

      // Check for name duplicates before saving
      const payload: Record<string, unknown> = {
        name, serie, set_nummer, jahr, zustand,
        cover_url: coverUrl, user_photos: coverUrl ? [coverUrl] : null,
      }
      try {
        const dupeRes = await fetch(`/api/items?q=${encodeURIComponent(name)}`)
        const all: Item[] = dupeRes.ok ? await dupeRes.json() : []
        const dupeItems = all.filter((i) => i.name.toLowerCase() === name.toLowerCase())
        if (dupeItems.length > 0) {
          updateItem(item.id, { status: 'review', pendingPayload: payload, duplicateItems: dupeItems })
          return  // wait for user decision
        }
      } catch { /* ignore, proceed with save */ }

      updateItem(item.id, { status: 'saving' })

      const saveRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!saveRes.ok) throw new Error('Speichern fehlgeschlagen')
      const saved = await saveRes.json()
      updateItem(item.id, { status: 'done', itemId: saved.id })
    } catch (err) {
      updateItem(item.id, {
        status: 'error',
        errorMsg: err instanceof Error ? err.message : 'Unbekannter Fehler',
      })
    }
  }, [])

  async function handleReviewMerge(itemId: string, target: Item) {
    const bulkItem = items.find((i) => i.id === itemId)
    if (!bulkItem) return
    const existingPhotos = Array.isArray(target.user_photos) ? target.user_photos : []
    const newPhotos = bulkItem.coverUrl ? [...existingPhotos, bulkItem.coverUrl] : existingPhotos
    await fetch(`/api/items/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_photos: newPhotos }),
    })
    updateItem(itemId, { status: 'discarded' })
  }

  async function handleReviewNew(itemId: string) {
    const bulkItem = items.find((i) => i.id === itemId)
    if (!bulkItem?.pendingPayload) return
    updateItem(itemId, { status: 'saving' })
    try {
      const saveRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkItem.pendingPayload),
      })
      if (!saveRes.ok) throw new Error('Speichern fehlgeschlagen')
      const saved = await saveRes.json()
      updateItem(itemId, { status: 'done', itemId: saved.id })
    } catch (err) {
      updateItem(itemId, { status: 'error', errorMsg: err instanceof Error ? err.message : 'Unbekannter Fehler' })
    }
  }

  function handleReviewDiscard(itemId: string) {
    updateItem(itemId, { status: 'discarded' })
  }

  async function runBulk() {
    const queued = items.filter((i) => i.status === 'queued' || i.status === 'error')
    if (queued.length === 0) return
    setRunning(true)
    for (let i = 0; i < queued.length; i += BATCH_SIZE) {
      await Promise.all(queued.slice(i, i + BATCH_SIZE).map(processItem))
    }
    setRunning(false)
  }

  async function confirmMerge() {
    if (!pending) return
    setMerging(true)
    await fetch('/api/items/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: pending.sourceItemId, targetId: pending.targetItemId }),
    })
    setMerging(false)
    setItems((prev) => prev.filter((i) => i.id !== pending.sourceLocalId))
    setPending(null)
  }

  const done         = items.filter((i) => i.status === 'done').length
  const errors       = items.filter((i) => i.status === 'error').length
  const reviews      = items.filter((i) => i.status === 'review').length
  const discarded    = items.filter((i) => i.status === 'discarded').length
  const pending_count = items.filter((i) => i.status === 'queued').length
  const total        = items.length
  const processed    = done + errors + reviews + discarded
  const progress     = total > 0 ? Math.round(processed / total * 100) : 0
  const allDone      = total > 0 && processed === total && !running
  const hasDone      = done > 0
  const reviewItem   = !running ? items.find((i) => i.status === 'review') ?? null : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Bulk Import</h2>
        <p className="text-zinc-400 text-sm">
          Bis zu 100 Fotos auf einmal hochladen. HEIC und MP4 (Live Photos) werden automatisch konvertiert.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDropZone}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isDragging ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,video/mp4,video/quicktime,.mp4,.mov"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          {converting ? (
            <>
              <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
              <p className="text-zinc-400 text-sm">HEIC/MP4 wird konvertiert…</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Layers className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Fotos hierher ziehen oder klicken zum Auswählen</p>
                <p className="text-zinc-500 text-sm mt-1">JPG · PNG · HEIC · MP4 (Live Photos) — bis zu 100 Dateien</p>
              </div>
            </>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <>
          {/* Progress bar + stats */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-3 border border-white/5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{processed} / {total} verarbeitet</span>
              <div className="flex gap-4 text-xs">
                <span className="text-green-400">{done} gespeichert</span>
                {reviews > 0 && <span className="text-amber-400">{reviews} Duplikat{reviews !== 1 ? 'e' : ''}</span>}
                {discarded > 0 && <span className="text-zinc-500">{discarded} verworfen</span>}
                {errors > 0 && <span className="text-red-400">{errors} Fehler</span>}
                {pending_count > 0 && <span className="text-zinc-500">{pending_count} wartend</span>}
              </div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {!allDone && (
              <button
                onClick={runBulk}
                disabled={running || pending_count === 0}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                {running
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verarbeite {pending_count} Dateien…</>
                  : <><Upload className="w-4 h-4" /> Import starten ({pending_count} Dateien)</>
                }
              </button>
            )}
            {allDone && (
              <Link
                href="/"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sammlung ansehen
              </Link>
            )}
            <button
              onClick={() => { setItems([]); setRunning(false) }}
              disabled={running}
              className="text-sm text-zinc-500 hover:text-white disabled:opacity-40 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Alle löschen
            </button>
          </div>

          {/* Merge hint — shown as soon as at least 2 done items exist */}
          {done >= 2 && (
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Merge className="w-3.5 h-3.5 text-yellow-500" />
              Duplikate? Artikel auf einen anderen ziehen zum Zusammenführen.
            </p>
          )}

          {/* Image grid — done items are draggable for merging */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {items.map((item) => {
              const isDraggingThis = dragId === item.id
              const isOver = overId === item.id && dragId !== item.id
              const canMerge = item.status === 'done' && item.itemId !== null

              return (
                <div
                  key={item.id}
                  draggable={canMerge}
                  onDragStart={(e) => {
                    if (!canMerge) return
                    setDragId(item.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => { setDragId(null); setOverId(null) }}
                  onDragOver={(e) => {
                    if (!canMerge || item.id === dragId) return
                    e.preventDefault()
                    setOverId(item.id)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    setOverId(null)
                    const src = items.find((i) => i.id === dragId)
                    if (!src || src.id === item.id || !src.itemId || !item.itemId) return
                    setPending({
                      sourceLocalId: src.id,
                      sourceName: src.name ?? src.file.name,
                      sourcePreview: src.preview,
                      targetLocalId: item.id,
                      targetName: item.name ?? item.file.name,
                      targetPreview: item.preview,
                      sourceItemId: src.itemId,
                      targetItemId: item.itemId,
                    })
                    setDragId(null)
                  }}
                  className={[
                    'space-y-1.5',
                    canMerge ? 'cursor-grab active:cursor-grabbing' : '',
                    isDraggingThis ? 'opacity-40 scale-95' : '',
                  ].join(' ')}
                >
                  <div className={[
                    'relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 transition-all duration-150',
                    isOver ? 'ring-4 ring-yellow-500 scale-105 shadow-xl shadow-yellow-500/30' : 'ring-1 ring-white/5',
                  ].join(' ')}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />

                    {/* Status overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                      item.status === 'done'       ? 'bg-black/0' :
                      item.status === 'review'     ? 'bg-amber-900/50' :
                      item.status === 'discarded'  ? 'bg-black/60' :
                      item.status === 'error'      ? 'bg-red-900/40' :
                      item.status === 'queued'     ? 'bg-black/0' : 'bg-black/60'
                    }`}>
                      {item.status === 'done' && !isOver && (
                        <CheckCircle2 className="w-6 h-6 text-green-400 drop-shadow-lg opacity-70" />
                      )}
                      {item.status === 'review' && (
                        <AlertCircle className="w-8 h-8 text-amber-400 drop-shadow-lg" />
                      )}
                      {item.status === 'discarded' && (
                        <Trash2 className="w-8 h-8 text-zinc-500 drop-shadow-lg" />
                      )}
                      {item.status === 'error' && <XCircle className="w-8 h-8 text-red-400 drop-shadow-lg" />}
                      {['uploading', 'identifying', 'saving'].includes(item.status) && (
                        <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                      )}
                    </div>

                    {/* Merge drop target overlay */}
                    {isOver && (
                      <div className="absolute inset-0 bg-yellow-600/40 flex items-center justify-center">
                        <Merge className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>

                  <div className="px-0.5">
                    <p className="text-white text-xs font-medium leading-tight truncate">
                      {item.name ?? item.file.name.replace(/\.[^.]+$/, '')}
                    </p>
                    {item.serie && <p className="text-zinc-500 text-xs truncate">{item.serie}</p>}
                    <p className={`text-xs mt-0.5 ${statusColor(item.status)}`}>
                      {item.status === 'done' && item.itemId ? (
                        <Link href={`/items/${item.itemId}`} className="hover:underline">{statusLabel(item)}</Link>
                      ) : item.status === 'error' ? (
                        <span className="flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />{statusLabel(item)}
                        </span>
                      ) : statusLabel(item)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show collection link at bottom once items are done */}
          {hasDone && !allDone && (
            <p className="text-xs text-zinc-600 text-center">
              Bereits gespeicherte Artikel können jetzt zusammengeführt werden.
            </p>
          )}
        </>
      )}

      {/* Duplicate review dialog */}
      {reviewItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <h2 className="text-lg font-bold">Artikel bereits vorhanden</h2>
            </div>

            {/* New photo */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-amber-500/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reviewItem.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">{reviewItem.name ?? reviewItem.file.name}</p>
                {reviewItem.serie && <p className="text-xs text-zinc-500">{reviewItem.serie}</p>}
                <p className="text-xs text-amber-400">Neues Foto</p>
              </div>
            </div>

            <p className="text-zinc-400 text-sm">
              Dieser Artikel ist bereits in der Sammlung. Foto dem bestehenden Eintrag hinzufügen oder als neuen Artikel anlegen?
            </p>

            {/* Existing items to merge into */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Vorhandene Einträge</p>
              {reviewItem.duplicateItems?.map((existing) => (
                <button
                  key={existing.id}
                  onClick={() => handleReviewMerge(reviewItem.id, existing)}
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl p-3 transition-colors text-left"
                >
                  {existing.cover_url && (
                    <div className="relative w-10 aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={existing.cover_url} alt={existing.name} className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{existing.name}</p>
                    {existing.serie && <p className="text-xs text-zinc-500 truncate">{existing.serie}</p>}
                    <p className="text-xs text-yellow-400">Fotos hinzufügen →</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleReviewNew(reviewItem.id)}
                className="flex-1 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors"
              >
                Als neuen Artikel anlegen
              </button>
              <button
                onClick={() => handleReviewDiscard(reviewItem.id)}
                title="Upload verwerfen"
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge confirmation dialog */}
      {pending && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Artikel zusammenführen?</h2>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 text-center">
                <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden mx-auto mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pending.sourcePreview} alt={pending.sourceName} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{pending.sourceName}</p>
                <p className="text-xs text-red-400 mt-1">wird gelöscht</p>
              </div>
              <Merge className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div className="flex-1 text-center">
                <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden mx-auto mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pending.targetPreview} alt={pending.targetName} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{pending.targetName}</p>
                <p className="text-xs text-yellow-400 mt-1">erhält alle Bilder</p>
              </div>
            </div>
            <p className="text-zinc-500 text-xs mb-5">
              Alle Fotos von <span className="text-white">{pending.sourceName}</span> werden zu{' '}
              <span className="text-white">{pending.targetName}</span> verschoben. Der Originaleintrag wird danach gelöscht.
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
    </div>
  )
}
