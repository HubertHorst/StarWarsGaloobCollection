'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { SERIES_PRESETS } from '@/lib/seriesPresets'

interface Props {
  itemId: string
  initialSerie: string | null
  /** All distinct serie values currently in the DB. Merged with SERIES_PRESETS
   *  to populate the datalist so user-created series stay reachable. */
  distinctSeries?: string[]
}

export default function EditableSerie({ itemId, initialSerie, distinctSeries }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialSerie ?? '')
  const [saved, setSaved] = useState(initialSerie ?? '')
  const [saving, setSaving] = useState(false)

  // Combine presets with whatever's actually in the DB, dedupe + sort.
  const options = useMemo(() => {
    const set = new Set<string>(SERIES_PRESETS)
    for (const s of distinctSeries ?? []) if (s) set.add(s)
    return [...set].sort()
  }, [distinctSeries])

  async function save() {
    setSaving(true)
    const v = value.trim()
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serie: v || null }),
    })
    setSaved(v)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValue(saved)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          list="serie-options"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); save() }
            else if (e.key === 'Escape') { e.preventDefault(); cancel() }
          }}
          autoFocus
          placeholder="Serie wählen oder eingeben"
          className="bg-zinc-800 text-zinc-100 rounded-md px-2 py-1 text-sm outline-none ring-2 ring-yellow-500 min-w-[260px]"
        />
        <datalist id="serie-options">
          {options.map((s) => <option key={s} value={s} />)}
        </datalist>
        <button
          onClick={save}
          disabled={saving}
          className="p-1 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
          title="Speichern"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="p-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
          title="Abbrechen"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2">
      {saved ? (
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-yellow-400 bg-yellow-500/10 rounded-full px-3 py-1">
          {saved}
        </span>
      ) : (
        <span className="text-sm text-zinc-600 italic">keine Serie</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Serie bearbeiten"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}
