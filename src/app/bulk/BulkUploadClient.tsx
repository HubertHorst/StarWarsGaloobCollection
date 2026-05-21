'use client'

// BulkUploadClient — phase-based bulk upload flow
// Phases: drop → upload → recognizing → checking → resolve → saving → done

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Upload, CheckCircle2, XCircle, Loader2, AlertCircle,
  Layers, Merge, Trash2, SplitSquareVertical, ChevronRight,
} from 'lucide-react'
import { SERIES_PRESETS } from '@/lib/seriesPresets'
import { CONDITION_PRESETS, DEFAULT_CONDITION } from '@/lib/conditionPresets'
import { compressImage } from '@/lib/compressImage'
import { Item } from '@/types/item'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | 'drop'          // initial state — drop zone visible
  | 'upload'        // uploading photos to Cloudinary; drag-merge allowed
  | 'recognizing'   // Claude Vision batch identification
  | 'checking'      // automatic duplicate check against DB
  | 'resolve'       // user resolves duplicates one at a time
  | 'saving'        // saving to DB
  | 'done'          // finished

interface BulkPhoto {
  id: string
  uploadIndex: number        // original order for stable sort
  file: File
  preview: string            // blob URL
  coverUrl: string | null    // Cloudinary URL after upload
  status: 'queued' | 'uploading' | 'done' | 'error'
  errorMsg: string | null
}

interface BulkEntry {
  id: string
  photos: BulkPhoto[]
  coverPhotoIndex: number    // which photo to use as cover_url
  name: string
  serie: string
  set_nummer: string
  jahr: string               // string in form, parseInt on save
  zustand: string
  wert: string
  kaufpreis: string
  recognized: boolean
  // duplicate resolution
  dbDuplicates: Item[]
  resolution: 'pending' | 'save-new' | 'merge-into' | 'discard'
  mergeTarget: Item | null
  // after save
  savedItemId: string | null
}

// ---------------------------------------------------------------------------
// Helpers — file conversion
// ---------------------------------------------------------------------------

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
        (blob) =>
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
              : file
          ),
        'image/jpeg',
        0.85
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

// Pick the "worst" zustand from two entries (higher index = worse)
function mergeZustand(a: string, b: string): string {
  const order = [...CONDITION_PRESETS]
  const ai = order.indexOf(a as typeof CONDITION_PRESETS[number])
  const bi = order.indexOf(b as typeof CONDITION_PRESETS[number])
  if (ai === -1) return b
  if (bi === -1) return a
  return ai > bi ? a : b
}

// ---------------------------------------------------------------------------
// Phase step indicator
// ---------------------------------------------------------------------------

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'upload',      label: 'Hochladen' },
  { phase: 'recognizing', label: 'Erkennung' },
  { phase: 'checking',    label: 'Prüfen' },
  { phase: 'resolve',     label: 'Auflösen' },
  { phase: 'saving',      label: 'Speichern' },
]

function PhaseSteps({ current }: { current: Phase }) {
  const activeIndex = STEPS.findIndex((s) => s.phase === current)
  return (
    <div className="flex items-center gap-1 text-xs select-none">
      {STEPS.map((s, i) => {
        const isDone    = i < activeIndex
        const isActive  = i === activeIndex
        return (
          <div key={s.phase} className="flex items-center gap-1">
            <span
              className={[
                'flex items-center justify-center w-5 h-5 rounded-full font-semibold',
                isDone   ? 'bg-yellow-500 text-black'   :
                isActive ? 'bg-yellow-600/80 text-white ring-2 ring-yellow-400' :
                           'bg-zinc-800 text-zinc-500',
              ].join(' ')}
            >
              {isDone ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
            </span>
            <span className={isActive ? 'text-white font-medium' : isDone ? 'text-yellow-400' : 'text-zinc-500'}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-zinc-700" />}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BulkUploadClient() {
  const inputRef     = useRef<HTMLInputElement>(null)
  const uploadIdx    = useRef(0)

  const [phase,      setPhase]     = useState<Phase>('drop')
  const [entries,    setEntries]   = useState<BulkEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [converting, setConverting] = useState(false)
  const [isAddingFiles, setIsAddingFiles] = useState(false)

  // drag-to-merge state (during upload/recognizing phases)
  const [dragEntryId, setDragEntryId] = useState<string | null>(null)
  const [overEntryId, setOverEntryId] = useState<string | null>(null)

  // recognition / checking progress
  const [recogProgress, setRecogProgress] = useState({ done: 0, total: 0 })
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 })

  // save progress
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 })

  // ---------------------------------------------------------------------------
  // Entry helpers
  // ---------------------------------------------------------------------------

  function updateEntry(id: string, patch: Partial<BulkEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    )
  }

  function updatePhoto(entryId: string, photoId: string, patch: Partial<BulkPhoto>) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        return {
          ...e,
          photos: e.photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p)),
        }
      })
    )
  }

  // ---------------------------------------------------------------------------
  // File ingestion
  // ---------------------------------------------------------------------------

  async function addFiles(files: File[]) {
    const accepted = files.filter(isAccepted)
    if (accepted.length === 0) return

    // Guard against re-entry during upload
    setIsAddingFiles(true)
    setConverting(true)

    const newEntries = await Promise.all(
      accepted.map(async (file): Promise<BulkEntry> => {
        const imageFile = await toImageFile(file)
        const idx       = uploadIdx.current++
        const photo: BulkPhoto = {
          id:          crypto.randomUUID(),
          uploadIndex: idx,
          file:        imageFile,
          preview:     URL.createObjectURL(imageFile),
          coverUrl:    null,
          status:      'queued',
          errorMsg:    null,
        }
        return {
          id:              crypto.randomUUID(),
          photos:          [photo],
          coverPhotoIndex: 0,
          name:            file.name.replace(/\.[^.]+$/, ''),
          serie:           '',
          set_nummer:      '',
          jahr:            '',
          zustand:         DEFAULT_CONDITION,
          wert:            '',
          kaufpreis:       '',
          recognized:      false,
          dbDuplicates:    [],
          resolution:      'pending',
          mergeTarget:     null,
          savedItemId:     null,
        }
      })
    )

    setConverting(false)
    setIsAddingFiles(false)

    setEntries((prev) => {
      const combined = [...prev, ...newEntries]
      // stable sort by first photo uploadIndex
      combined.sort((a, b) => (a.photos[0]?.uploadIndex ?? 0) - (b.photos[0]?.uploadIndex ?? 0))
      return combined
    })

    // Kick off uploads immediately
    if (phase === 'drop' || phase === 'upload') {
      setPhase('upload')
      startUploads(newEntries)
    }
  }

  // ---------------------------------------------------------------------------
  // PHASE: upload
  // ---------------------------------------------------------------------------

  async function uploadPhoto(entryId: string, photo: BulkPhoto) {
    updatePhoto(entryId, photo.id, { status: 'uploading' })
    try {
      const compressed = await compressImage(photo.file)
      const fd = new FormData()
      fd.append('file', compressed)
      const res = await fetch('/api/upload-cover', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Upload fehlgeschlagen (${res.status})`)
      const { url } = await res.json()
      updatePhoto(entryId, photo.id, { status: 'done', coverUrl: url })
    } catch (err) {
      updatePhoto(entryId, photo.id, {
        status:   'error',
        errorMsg: err instanceof Error ? err.message : 'Fehler',
      })
    }
  }

  async function startUploads(newEntries: BulkEntry[]) {
    // Collect all (entryId, photo) pairs that need uploading
    const tasks: Array<() => Promise<void>> = newEntries.flatMap((e) =>
      e.photos.map((p) => () => uploadPhoto(e.id, p))
    )

    // Run 3 at a time using Set + Promise.race pattern
    const active = new Set<Promise<void>>()
    for (const task of tasks) {
      const p = task().then(() => { active.delete(p) })
      active.add(p)
      if (active.size >= 3) await Promise.race(active)
    }
    await Promise.all(active)
    // uploads done — UI shows "Erkennung starten" button
  }

  // ---------------------------------------------------------------------------
  // PHASE: recognizing
  // ---------------------------------------------------------------------------

  const runRecognition = useCallback(async (entriesList: BulkEntry[]) => {
    setPhase('recognizing')
    const total = entriesList.length
    setRecogProgress({ done: 0, total })

    async function recognizeEntry(entry: BulkEntry) {
      const urls = entry.photos.filter((p) => p.coverUrl).map((p) => p.coverUrl as string)
      if (urls.length === 0) {
        setRecogProgress((p) => ({ ...p, done: p.done + 1 }))
        return
      }
      try {
        const res = await fetch('/api/identify-item-multi', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ urls }),
        })
        if (res.ok) {
          const data = await res.json()
          setEntries((prev) =>
            prev.map((e) => {
              if (e.id !== entry.id) return e
              return {
                ...e,
                name:       data.name       ?? e.name,
                serie:      data.serie      ?? e.serie,
                set_nummer: data.set_nummer ?? e.set_nummer,
                jahr:       data.jahr != null ? String(data.jahr) : e.jahr,
                zustand:    data.zustand    ?? e.zustand,
                recognized: true,
              }
            })
          )
        }
      } catch { /* leave entry as-is */ }
      setRecogProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    // 3 concurrent
    const active = new Set<Promise<void>>()
    for (const entry of entriesList) {
      const p = recognizeEntry(entry).then(() => { active.delete(p) })
      active.add(p)
      if (active.size >= 3) await Promise.race(active)
    }
    await Promise.all(active)

    // auto-proceed to checking
    runChecking(entriesList)
  }, [])

  // ---------------------------------------------------------------------------
  // PHASE: checking
  // ---------------------------------------------------------------------------

  const runChecking = useCallback(async (entriesList: BulkEntry[]) => {
    setPhase('checking')
    const total = entriesList.length
    setCheckProgress({ done: 0, total })

    const results: Record<string, { dbDuplicates: Item[]; resolution: BulkEntry['resolution'] }> = {}

    await Promise.all(
      entriesList.map(async (entry) => {
        try {
          const res = await fetch(`/api/items?q=${encodeURIComponent(entry.name)}`)
          const all: Item[] = res.ok ? await res.json() : []
          const dupes = all.filter((i) => i.name.toLowerCase() === entry.name.toLowerCase())
          results[entry.id] = {
            dbDuplicates: dupes,
            resolution:   dupes.length > 0 ? 'pending' : 'save-new',
          }
        } catch {
          results[entry.id] = { dbDuplicates: [], resolution: 'save-new' }
        }
        setCheckProgress((p) => ({ ...p, done: p.done + 1 }))
      })
    )

    setEntries((prev) =>
      prev.map((e) =>
        results[e.id]
          ? { ...e, ...results[e.id] }
          : e
      )
    )

    const anyPending = Object.values(results).some((r) => r.resolution === 'pending')
    if (anyPending) {
      setPhase('resolve')
    } else {
      // use updated entries directly
      const updated = entriesList.map((e) =>
        results[e.id] ? { ...e, ...results[e.id] } : e
      )
      saveAll(updated)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // PHASE: saving
  // ---------------------------------------------------------------------------

  async function saveAll(entriesToSave?: BulkEntry[]) {
    setPhase('saving')

    // Read from state if not passed directly (called from resolve phase)
    let list: BulkEntry[]
    if (entriesToSave) {
      list = entriesToSave
    } else {
      // We need a snapshot — rely on the caller setting entries first
      list = [] // will be filled via setEntries callback below
      setEntries((prev) => {
        list = prev
        return prev
      })
      // Give React one tick to flush
      await new Promise((r) => setTimeout(r, 0))
    }

    const saveable = list.filter((e) => e.resolution !== 'discard')
    setSaveProgress({ done: 0, total: saveable.length })

    for (const entry of saveable) {
      try {
        if (entry.resolution === 'merge-into' && entry.mergeTarget) {
          // Add photos to existing item
          const existing   = Array.isArray(entry.mergeTarget.user_photos)
            ? entry.mergeTarget.user_photos
            : []
          const newUrls    = entry.photos.filter((p) => p.coverUrl).map((p) => p.coverUrl as string)
          const merged     = [...existing, ...newUrls]
          const patchRes   = await fetch(`/api/items/${entry.mergeTarget.id}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ user_photos: merged }),
          })
          if (!patchRes.ok) throw new Error('Merge fehlgeschlagen')
          updateEntry(entry.id, { savedItemId: entry.mergeTarget.id })
        } else if (entry.resolution === 'save-new') {
          const coverPhoto = entry.photos[entry.coverPhotoIndex] ?? entry.photos[0]
          const allUrls    = entry.photos.filter((p) => p.coverUrl).map((p) => p.coverUrl as string)
          const saveRes    = await fetch('/api/items', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              name:                 entry.name,
              serie:                entry.serie       || null,
              set_nummer:           entry.set_nummer  || null,
              jahr:                 entry.jahr        ? parseInt(entry.jahr, 10) : null,
              zustand:              entry.zustand      || null,
              wert:                 entry.wert         || null,
              kaufpreis:            entry.kaufpreis    || null,
              in_sammlung:          1,
              lieferung_ausstehend: 0,
              cover_url:            coverPhoto?.coverUrl ?? null,
              user_photos:          allUrls,
            }),
          })
          if (!saveRes.ok) throw new Error('Speichern fehlgeschlagen')
          const saved = await saveRes.json()
          updateEntry(entry.id, { savedItemId: saved.id })
        }
      } catch { /* entry stays without savedItemId */ }

      setSaveProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setPhase('done')
  }

  // ---------------------------------------------------------------------------
  // Drag-to-merge during upload / recognizing phases
  // ---------------------------------------------------------------------------

  function handleEntryDrop(targetId: string) {
    setOverEntryId(null)
    const srcId = dragEntryId
    setDragEntryId(null)
    if (!srcId || srcId === targetId) return

    setEntries((prev) => {
      const src = prev.find((e) => e.id === srcId)
      const tgt = prev.find((e) => e.id === targetId)
      if (!src || !tgt) return prev

      const merged: BulkEntry = {
        ...tgt,
        photos:          [...tgt.photos, ...src.photos],
        zustand:         mergeZustand(tgt.zustand, src.zustand),
        coverPhotoIndex: 0,
      }
      return prev
        .filter((e) => e.id !== srcId)
        .map((e) => (e.id === targetId ? merged : e))
    })
  }

  // Split a single photo out of an entry into its own new entry
  function splitPhoto(entryId: string, photoId: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === entryId)
      if (!entry || entry.photos.length <= 1) return prev

      const photo   = entry.photos.find((p) => p.id === photoId)
      if (!photo) return prev

      const newEntry: BulkEntry = {
        id:              crypto.randomUUID(),
        photos:          [photo],
        coverPhotoIndex: 0,
        name:            photo.file.name.replace(/\.[^.]+$/, ''),
        serie:           '',
        set_nummer:      '',
        jahr:            '',
        zustand:         DEFAULT_CONDITION,
        wert:            '',
        kaufpreis:       '',
        recognized:      false,
        dbDuplicates:    [],
        resolution:      'pending',
        mergeTarget:     null,
        savedItemId:     null,
      }

      const updatedEntry = {
        ...entry,
        photos:          entry.photos.filter((p) => p.id !== photoId),
        coverPhotoIndex: 0,
      }

      return prev
        .map((e) => (e.id === entryId ? updatedEntry : e))
        .concat([newEntry])
    })
  }

  // ---------------------------------------------------------------------------
  // RESOLVE phase — decision handlers
  // ---------------------------------------------------------------------------

  function resolveEntry(entryId: string, decision: 'save-new' | 'merge-into' | 'discard', target?: Item) {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === entryId
          ? { ...e, resolution: decision, mergeTarget: target ?? null }
          : e
      )
      // Check if any more pending
      const stillPending = updated.filter((e) => e.resolution === 'pending')
      if (stillPending.length === 0) {
        // Kick off save in next tick after state settles
        setTimeout(() => saveAll(), 0)
      }
      return updated
    })
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const allUploaded  = entries.length > 0 && entries.every((e) =>
    e.photos.every((p) => p.status === 'done' || p.status === 'error')
  )

  const pendingResolve = entries.find((e) => e.resolution === 'pending') ?? null

  // ---------------------------------------------------------------------------
  // Drop zone handlers (files, not cards)
  // ---------------------------------------------------------------------------

  function handleDropZone(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    // Only handle file drops on the drop zone
    if (e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-1">Bulk Import</h2>
        <p className="text-zinc-400 text-sm">
          Mehrere Fotos auf einmal hochladen. HEIC und MP4 (Live Photos) werden automatisch konvertiert.
        </p>
      </div>

      {/* Phase indicator */}
      {phase !== 'drop' && (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-3">
          <PhaseSteps current={phase} />
        </div>
      )}

      {/* Drop zone — always visible in drop/upload phases */}
      {(phase === 'drop' || phase === 'upload') && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDropZone}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            isDragging
              ? 'border-yellow-500 bg-yellow-500/10'
              : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.heic,.heif,video/mp4,video/quicktime,.mp4,.mov"
            multiple
            onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)) }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            {converting ? (
              <>
                <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                <p className="text-zinc-400 text-sm">Dateien werden konvertiert…</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Layers className="w-7 h-7 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {phase === 'upload' ? 'Weitere Fotos hinzufügen' : 'Fotos hierher ziehen oder klicken'}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    JPG · PNG · HEIC · MP4 (Live Photos)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload phase — entry cards */}
      {(phase === 'upload' || phase === 'recognizing') && entries.length > 0 && (
        <>
          {/* Merge hint */}
          {entries.length >= 2 && phase === 'upload' && (
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Merge className="w-3.5 h-3.5 text-yellow-500" />
              Karte auf eine andere ziehen zum Zusammenführen. Auf Thumbnail × klicken zum Trennen.
            </p>
          )}

          {/* Cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {entries.map((entry) => {
              const isDraggingThis = dragEntryId === entry.id
              const isOver         = overEntryId === entry.id && dragEntryId !== entry.id

              return (
                <div
                  key={entry.id}
                  draggable={!isAddingFiles}
                  onDragStart={(e) => {
                    // Don't initiate drag from inputs/selects
                    const el = e.target as HTMLElement
                    if (el.closest('input, select, textarea, button')) {
                      e.preventDefault()
                      return
                    }
                    setDragEntryId(entry.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => { setDragEntryId(null); setOverEntryId(null) }}
                  onDragOver={(e) => {
                    if (dragEntryId === entry.id) return
                    e.preventDefault()
                    setOverEntryId(entry.id)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverEntryId(null)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleEntryDrop(entry.id)
                  }}
                  className={[
                    'bg-zinc-900 border rounded-2xl overflow-hidden transition-all duration-150',
                    isDraggingThis ? 'opacity-40 scale-95'     : '',
                    isOver         ? 'ring-4 ring-yellow-500 scale-105 shadow-xl shadow-yellow-500/20' : 'border-white/5',
                  ].join(' ')}
                >
                  {/* Photo strip */}
                  <div
                    className="relative flex gap-1 p-1.5 bg-zinc-950 min-h-[80px] items-center"
                    draggable={false}
                  >
                    {entry.photos.map((photo, pi) => (
                      <div key={photo.id} className="relative flex-shrink-0 group">
                        {/* Cover selection */}
                        <button
                          type="button"
                          onClick={() => updateEntry(entry.id, { coverPhotoIndex: pi })}
                          className={[
                            'block w-14 h-[72px] rounded-lg overflow-hidden ring-2 transition-all',
                            pi === entry.coverPhotoIndex ? 'ring-yellow-500' : 'ring-transparent hover:ring-yellow-500/50',
                          ].join(' ')}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.preview} alt="" className="w-full h-full object-cover" />
                        </button>

                        {/* Upload status chip */}
                        <div className="absolute top-0.5 left-0.5">
                          {photo.status === 'uploading' && (
                            <Loader2 className="w-3 h-3 text-white animate-spin drop-shadow" />
                          )}
                          {photo.status === 'done' && (
                            <CheckCircle2 className="w-3 h-3 text-green-400 drop-shadow" />
                          )}
                          {photo.status === 'error' && (
                            <XCircle className="w-3 h-3 text-red-400 drop-shadow" />
                          )}
                        </div>

                        {/* Split button — only if entry has >1 photo */}
                        {entry.photos.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); splitPhoto(entry.id, photo.id) }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-zinc-700 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            title="Trennen"
                          >
                            <SplitSquareVertical className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Merge drop overlay */}
                    {isOver && (
                      <div className="absolute inset-0 bg-yellow-600/40 flex items-center justify-center rounded">
                        <Merge className="w-6 h-6 text-white" />
                      </div>
                    )}

                    {/* Recognized badge */}
                    {entry.recognized && (
                      <span className="absolute bottom-1 right-1 text-[10px] bg-yellow-600 text-black font-bold px-1 rounded">
                        erkannt
                      </span>
                    )}
                  </div>

                  {/* Editable fields */}
                  <div className="p-2 space-y-1.5" draggable={false}>
                    <input
                      type="text"
                      value={entry.name}
                      onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none placeholder:text-zinc-600"
                    />
                    <select
                      value={entry.serie}
                      onChange={(e) => updateEntry(entry.id, { serie: e.target.value })}
                      className="w-full bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none"
                    >
                      <option value="">— Serie —</option>
                      {SERIES_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={entry.set_nummer}
                        onChange={(e) => updateEntry(entry.id, { set_nummer: e.target.value })}
                        placeholder="Nr."
                        className="w-16 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none placeholder:text-zinc-600"
                      />
                      <input
                        type="text"
                        value={entry.jahr}
                        onChange={(e) => updateEntry(entry.id, { jahr: e.target.value })}
                        placeholder="Jahr"
                        className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none placeholder:text-zinc-600"
                      />
                    </div>
                    <select
                      value={entry.zustand}
                      onChange={(e) => updateEntry(entry.id, { zustand: e.target.value })}
                      className="w-full bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none"
                    >
                      {CONDITION_PRESETS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={entry.wert}
                        onChange={(e) => updateEntry(entry.id, { wert: e.target.value })}
                        placeholder="Wert €"
                        className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none placeholder:text-zinc-600"
                      />
                      <input
                        type="text"
                        value={entry.kaufpreis}
                        onChange={(e) => updateEntry(entry.id, { kaufpreis: e.target.value })}
                        placeholder="Kauf €"
                        className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 focus:border-yellow-500/50 outline-none placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Recognition / proceed buttons */}
          {phase === 'upload' && allUploaded && (
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => runRecognition([...entries])}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                <Layers className="w-4 h-4" />
                Bilder erkennen ({entries.length} Artikel)
              </button>
              <button
                onClick={() => runChecking([...entries])}
                className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Ohne Erkennung weiter
              </button>
              <button
                onClick={() => { setEntries([]); setPhase('drop') }}
                className="text-sm text-zinc-500 hover:text-white px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Alle löschen
              </button>
            </div>
          )}

          {phase === 'upload' && !allUploaded && entries.length > 0 && (
            <p className="text-sm text-zinc-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fotos werden hochgeladen…
            </p>
          )}

          {/* Recognition in progress */}
          {phase === 'recognizing' && (
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                  Claude erkennt Artikel…
                </span>
                <span className="text-zinc-400">{recogProgress.done} / {recogProgress.total}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                  style={{ width: recogProgress.total > 0 ? `${Math.round(recogProgress.done / recogProgress.total * 100)}%` : '0%' }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Checking progress */}
      {phase === 'checking' && (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
              Duplikate werden geprüft…
            </span>
            <span className="text-zinc-400">{checkProgress.done} / {checkProgress.total}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
              style={{ width: checkProgress.total > 0 ? `${Math.round(checkProgress.done / checkProgress.total * 100)}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Saving progress */}
      {phase === 'saving' && (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
              Artikel werden gespeichert…
            </span>
            <span className="text-zinc-400">{saveProgress.done} / {saveProgress.total}</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-300"
              style={{ width: saveProgress.total > 0 ? `${Math.round(saveProgress.done / saveProgress.total * 100)}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-yellow-400 mx-auto" />
          <div>
            <p className="text-white font-bold text-lg">Import abgeschlossen</p>
            <p className="text-zinc-400 text-sm mt-1">
              {entries.filter((e) => e.savedItemId && e.resolution === 'save-new').length} neu angelegt ·{' '}
              {entries.filter((e) => e.savedItemId && e.resolution === 'merge-into').length} zusammengeführt ·{' '}
              {entries.filter((e) => e.resolution === 'discard').length} verworfen
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Sammlung ansehen
            </Link>
            <button
              onClick={() => { setEntries([]); setPhase('drop') }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Weiterer Import
            </button>
          </div>
        </div>
      )}

      {/* RESOLVE PHASE DIALOG — one entry at a time */}
      {phase === 'resolve' && pendingResolve && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <h2 className="text-lg font-bold">Artikel bereits vorhanden</h2>
            </div>

            {/* New entry preview */}
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-[72px] rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 ring-2 ring-amber-500/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingResolve.photos[pendingResolve.coverPhotoIndex]?.preview ?? pendingResolve.photos[0]?.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-medium">{pendingResolve.name}</p>
                {pendingResolve.serie && <p className="text-zinc-500 text-sm">{pendingResolve.serie}</p>}
                <p className="text-xs text-amber-400 mt-0.5">
                  {pendingResolve.photos.length} Foto{pendingResolve.photos.length !== 1 ? 's' : ''} · neuer Upload
                </p>
              </div>
            </div>

            <p className="text-zinc-400 text-sm">
              Dieser Artikel ist bereits in der Sammlung. Fotos einem bestehenden Eintrag hinzufügen, neu anlegen oder verwerfen?
            </p>

            {/* Existing DB items */}
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Vorhandene Einträge</p>
              {pendingResolve.dbDuplicates.map((existing) => (
                <button
                  key={existing.id}
                  onClick={() => resolveEntry(pendingResolve.id, 'merge-into', existing)}
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl p-3 transition-colors text-left group"
                >
                  {existing.cover_url && (
                    <div className="relative w-10 h-[52px] rounded-lg overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={existing.cover_url} alt={existing.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{existing.name}</p>
                    {existing.serie && <p className="text-xs text-zinc-500 truncate">{existing.serie}</p>}
                    <p className="text-xs text-yellow-400 mt-0.5 group-hover:text-yellow-300">
                      Zu bestehendem hinzufügen →
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => resolveEntry(pendingResolve.id, 'save-new')}
                className="flex-1 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors"
              >
                Neu anlegen
              </button>
              <button
                onClick={() => resolveEntry(pendingResolve.id, 'discard')}
                title="Verwerfen"
                className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Remaining indicator */}
            {entries.filter((e) => e.resolution === 'pending').length > 1 && (
              <p className="text-xs text-zinc-500 text-center">
                {entries.filter((e) => e.resolution === 'pending').length - 1} weitere{' '}
                {entries.filter((e) => e.resolution === 'pending').length - 1 === 1 ? 'Duplikat' : 'Duplikate'} folgen
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
