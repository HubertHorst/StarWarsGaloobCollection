'use client'

import { useState, useCallback, useRef } from 'react'
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

/** Convert HEIC/HEIF to JPEG using heic2any (browser-only) */
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

/** Extract the first frame of an MP4/MOV as a JPEG */
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
        (blob) => {
          resolve(blob
            ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
            : file
          )
        },
        'image/jpeg',
        0.85
      )
    }

    video.onseeked = capture
    video.onloadeddata = () => { video.currentTime = 0.5 }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
  })
}

/** Normalise any file to a JPEG-compatible image File */
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
        body: JSON.stringify({ name, serie, set_nummer, jahr, zustand, cover_url: coverUrl, user_photos: coverUrl ? [coverUrl] : null }),
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
      await Promise.all(queued.slice(i, i + BATCH_SIZE).map(processItem))
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
          Bis zu 100 Fotos auf einmal hochladen. HEIC und MP4 (Live Photos) werden automatisch konvertiert.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
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
                {running
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Verarbeite {pending} Dateien…</>
                  : <><Upload className="w-4 h-4" /> Import starten ({pending} Dateien)</>
                }
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
                  {/* Always a JPEG at this point — plain img tag, no Next.js Image restrictions */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />

                  {/* Status overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                    item.status === 'done' ? 'bg-black/20' :
                    item.status === 'error' ? 'bg-red-900/40' :
                    item.status === 'queued' ? 'bg-black/0' : 'bg-black/60'
                  }`}>
                    {item.status === 'done' && <CheckCircle2 className="w-8 h-8 text-green-400 drop-shadow-lg" />}
                    {item.status === 'error' && <XCircle className="w-8 h-8 text-red-400 drop-shadow-lg" />}
                    {['uploading', 'identifying', 'saving'].includes(item.status) && (
                      <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                    )}
                  </div>
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
