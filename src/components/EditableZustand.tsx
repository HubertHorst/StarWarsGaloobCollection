'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import { CONDITION_PRESETS } from '@/lib/conditionPresets'

interface Props {
  itemId: string
  initialZustand: string | null
}

export default function EditableZustand({ itemId, initialZustand }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(initialZustand ?? '')
  const [saved, setSaved] = useState(initialZustand ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const label = e.target.value
    if (!label) return
    setText(label)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value)
  }

  async function save() {
    const trimmed = text.trim()
    setSaving(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zustand: trimmed || null }),
    })
    setSaved(trimmed)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setText(saved)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 w-64">
        {/* Preset dropdown */}
        <select
          onChange={handlePresetChange}
          value={CONDITION_PRESETS.includes(text as typeof CONDITION_PRESETS[number]) ? text : ''}
          className="bg-zinc-800 text-zinc-300 rounded-md px-2 py-1 text-sm outline-none ring-2 ring-yellow-500 cursor-pointer"
        >
          <option value="">— Zustand wählen —</option>
          {CONDITION_PRESETS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Free text input */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={saving}
            placeholder="Eigene Eingabe…"
            className="flex-1 bg-zinc-800 text-zinc-300 rounded-md px-2 py-0.5 text-sm outline-none ring-1 ring-zinc-600 focus:ring-yellow-500"
          />
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
        <span className="text-sm text-zinc-600 italic">kein Zustand</span>
      )}
      <button
        onClick={() => setEditing(true)}
        className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Zustand bearbeiten"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}
