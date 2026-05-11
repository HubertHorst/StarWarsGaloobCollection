'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { Check, SkipForward, Loader2 } from 'lucide-react'
import { Item } from '@/types/item'

export interface ProposedData {
  name: string
  serie: string | null
  set_nummer: string | null
  jahr: number | null
  zustand: string | null
}

interface Props {
  item: Item
  proposed: ProposedData
  identified: string
  progress: { done: number; total: number }
  applying: boolean
  onConfirm: () => void
  onSkip: () => void
}

function Row({ label, current, next }: { label: string; current: string | null; next: string | null }) {
  const changed = current !== next && next
  return (
    <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs py-1.5 border-b border-white/5">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-400 truncate">{current || '—'}</span>
      <span className={`truncate ${changed ? 'text-yellow-300 font-medium' : 'text-zinc-600'}`}>
        {next || '—'}
      </span>
    </div>
  )
}

export default function BulkRefreshReviewModal({
  item, proposed, identified, progress, applying, onConfirm, onSkip,
}: Props) {
  const coverUrl = item.cover_url ?? null

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">
              Artikel {progress.done + 1} von {progress.total}
            </p>
            <h2 className="font-semibold text-white">Änderungen bestätigen</h2>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: progress.total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-5 rounded-full ${i < progress.done ? 'bg-yellow-500' : i === progress.done ? 'bg-yellow-400' : 'bg-zinc-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="flex gap-4 mb-4">
            {coverUrl && (
              <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                <Image src={coverUrl} alt={item.name} fill className="object-cover" sizes="64px" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 mb-1">
                Erkannt als: <span className="text-zinc-300">{identified}</span>
              </p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs pb-1 border-b border-white/10 mb-1">
            <span />
            <span className="text-zinc-600 font-medium">Aktuell</span>
            <span className="text-zinc-400 font-medium">Vorgeschlagen</span>
          </div>
          <Row label="Name" current={item.name} next={proposed.name} />
          <Row label="Serie" current={item.serie} next={proposed.serie} />
          <Row label="Set-Nr." current={item.set_nummer} next={proposed.set_nummer} />
          <Row label="Jahr" current={item.jahr ? String(item.jahr) : null} next={proposed.jahr ? String(proposed.jahr) : null} />
          <Row label="Zustand" current={item.zustand} next={proposed.zustand} />
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-3 border-t border-white/5 flex gap-3">
          <button
            onClick={onSkip}
            disabled={applying}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" />
            Überspringen
          </button>
          <button
            onClick={onConfirm}
            disabled={applying}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {applying
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Check className="w-4 h-4" />}
            Übernehmen
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
