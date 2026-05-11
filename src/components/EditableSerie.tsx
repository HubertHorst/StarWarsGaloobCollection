'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { SERIES_PRESETS } from '@/lib/seriesPresets'

interface Props {
  itemId: string
  initialSerie: string | null
}

export default function EditableSerie({ itemId, initialSerie }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialSerie ?? '')
  const [saved, setSaved] = useState(initialSerie ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serie: value || null }),
    })
    setSaved(value)
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
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="bg-zinc-800 text-zinc-300 rounded-md px-2 py-1 text-sm outline-none ring-2 ring-yellow-500 cursor-pointer"
        >
          <option value="">— keine Serie —</option>
          {SERIES_PRESETS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="p-1 rounded-md bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="p-1 rounded-md bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
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
