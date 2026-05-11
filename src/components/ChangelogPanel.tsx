'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { History, X, Loader2 } from 'lucide-react'

interface ChangeEntry {
  id: number
  item_id: string
  item_name: string
  action: string
  fields: string | null
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  update: 'Bearbeitet',
  bulk_update: 'Bulk-Update',
  refresh_image: 'Aus Bild neu geladen',
  merge: 'Zusammengeführt',
}

const ACTION_COLORS: Record<string, string> = {
  update: 'bg-zinc-700 text-zinc-300',
  bulk_update: 'bg-indigo-900/60 text-indigo-300',
  refresh_image: 'bg-emerald-900/60 text-emerald-300',
  merge: 'bg-rose-900/60 text-rose-300',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 1000)
  if (diff < 60) return `vor ${diff}s`
  if (diff < 3600) return `vor ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)}h`
  return `vor ${Math.floor(diff / 86400)}d`
}

export default function ChangelogPanel() {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<ChangeEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/changelog')
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        title="Letzte Änderungen"
      >
        <History className="w-4 h-4" />
        Verlauf
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative h-full w-full max-w-sm bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                <h2 className="font-semibold text-sm">Letzte Änderungen</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : entries.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-16">Noch keine Änderungen</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {entries.map((e) => {
                    const fields: string[] = e.fields ? JSON.parse(e.fields) : []
                    const label = ACTION_LABELS[e.action] ?? e.action
                    const color = ACTION_COLORS[e.action] ?? 'bg-zinc-700 text-zinc-300'
                    return (
                      <li key={e.id} className="px-5 py-3 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{e.item_name}</p>
                            {fields.length > 0 && (
                              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                {fields.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                              {label}
                            </span>
                            <span className="text-xs text-zinc-600">{timeAgo(e.created_at)}</span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
