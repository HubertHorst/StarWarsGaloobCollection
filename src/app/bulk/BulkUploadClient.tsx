'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Upload, CheckCircle2, XCircle, Loader2, AlertCircle, Layers } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'

type ItemStatus = 'queued' | 'uploading' | 'identifying' | 'saving' | 'done' | 'error'

interface BulkItem {
  id: string
  file: File
  preview: string
  status: ItemStatus
  name: string | null
  serie: string | null
  errorMsg: string | null
  itemId: string | null
}

const BATCH_SIZE = 5

function statusLabel(item: BulkItem): string {
  switch (item.status) {
    case 'queued': return 'Warte…'
    case 'uploading': return 'Hochladen…'
    case 'identifying': return 'Claude liest…'
    case 'saving': return 'Speichern…'
    case 'done': return 'Gespeichert'
    case 'error': return item.errorMsg ?? 'Fehler'
  }
}

function statusColor(status: ItemStatus): string {
  switch (status) {
    case 'done': return 'text-green-400'
    case 'error': return 'text-red-400'
    default: return 'text-zinc-400'
  }
}

export default function BulkUploadClient() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<BulkItem[]>([])
  const [running, setRunning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  function updateItem(id: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }

  function addFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    const newItems: BulkItem[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'queued',
      name: null,
      serie: null,
      errorMsg: null,
      itemId: null,
    }))
    setItems((prev) => [...prev, ...newItems])
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }

  function handleDrop(e: React.DragEvent) {
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
      const zustand = identifyData.zustand ?? null

      updateItem(item.id, { name, serie })

      updateItem(item.id, { status: 'saving' })
      const saveRes = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          serie,
          set_nummer,
          jahr,
          zustand,
          cover_url: coverUrl,
          user_photos: coverUrl ? [coverUrl] : null,
        }),
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

  async function runBulk() {
    const queued = items.filter((i) => i.status === 'queued' || i.status === 'error')
    if (queued.length === 0) return
    setRunning(true)

    for (let i = 0; i < queued.length; i += BATCH_SIZE) {
      const batch = queued.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(processItem))
    }

    setRunning(false)
  }

  const done = items.filter((i) => i.status === 'done').length
  const errors = items.filter((i) => i.status === 'error').length
  const pending = items.filter((i) => i.status === 'queued').length
  const total = items.length
  const progress = total > 0 ? Math.round((done + errors) / total * 100) : 0
  const allDone = total > 0 && done + errors === total && !running

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Bulk Import</h2>
        <p className="text-zinc-400 text-sm">
          Bis zu 100 Fotos auf einmal hochladen. Claude identifiziert jeden Artikel automatisch.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging ? 'border-yellow-500 bg-yellow-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileInput} onClick={(e) => e.stopPropagation()} className="hidden" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <Layers className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Fotos hierher ziehen oder klicken zum Auswählen</p>
            <p className="text-zinc-500 text-sm mt-1">Mehrere Dateien gleichzeitig auswählen — bis zu 100 Bilder</p>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <>
          {/* Progress bar + stats */}
          <div className="bg-zinc-900 rounded-xl p-4 space-y-3 border border-white/5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{done + errors} / {total} verarbeitet</span>
              <div className="flex gap-4 text-xs">
                <span className="text-green-400">{done} gespeichert</span>
                {errors > 0 && <span className="text-red-400">{errors} Fehler</span>}
                {pending > 0 && <span className="text-zinc-500">{pending} wartend</span>}
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
          <div className="flex gap-3">
            {!allDone && (
              <button
                onClick={runBulk}
                disabled={running || pending === 0}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Verarbeite {pending} Bilder…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Import starten ({pending} Bilder)</>
                )}
              </button>
            )}
            {allDone && (
              <Link
                href="/"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Fertig — Sammlung ansehen
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

          {/* Image grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {items.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 ring-1 ring-white/5">
                  <Image src={item.preview} alt="" fill className="object-cover" sizes="160px" />

                  {/* Status overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                    item.status === 'done' ? 'bg-black/20' :
                    item.status === 'error' ? 'bg-red-900/40' :
                    item.status === 'queued' ? 'bg-black/0' :
                    'bg-black/60'
                  }`}>
                    {item.status === 'done' && (
                      <CheckCircle2 className="w-8 h-8 text-green-400 drop-shadow-lg" />
                    )}
                    {item.status === 'error' && (
                      <XCircle className="w-8 h-8 text-red-400 drop-shadow-lg" />
                    )}
                    {['uploading', 'identifying', 'saving'].includes(item.status) && (
                      <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                    )}
                  </div>
                </div>

                {/* Name + status */}
                <div className="px-0.5">
                  <p className="text-white text-xs font-medium leading-tight truncate">
                    {item.name ?? item.file.name.replace(/\.[^.]+$/, '')}
                  </p>
                  {item.serie && (
                    <p className="text-zinc-500 text-xs truncate">{item.serie}</p>
                  )}
                  <p className={`text-xs mt-0.5 ${statusColor(item.status)}`}>
                    {item.status === 'done' && item.itemId ? (
                      <Link href={`/items/${item.itemId}`} className="hover:underline">
                        {statusLabel(item)}
                      </Link>
                    ) : item.status === 'error' ? (
                      <span className="flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {statusLabel(item)}
                      </span>
                    ) : (
                      statusLabel(item)
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
