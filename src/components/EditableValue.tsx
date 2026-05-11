'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Euro, Pencil, Check, X, Loader2 } from 'lucide-react'

interface Props {
  itemId: string
  field: 'wert' | 'kaufpreis'
  label: string
  initialValue: string | null
}

export default function EditableValue({ itemId, field, label, initialValue }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setValue(initialValue ?? '')
  }, [initialValue, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function save() {
    const trimmed = value.trim()
    if (trimmed === (initialValue ?? '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: trimmed || null }),
    })
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  function cancel() {
    setValue(initialValue ?? '')
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500 text-xs flex-shrink-0">{label}</span>
        <Euro className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          placeholder="z.B. 29,99"
          className="w-28 bg-zinc-800 text-zinc-300 rounded-md px-2 py-0.5 text-sm outline-none ring-2 ring-yellow-500"
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
    )
  }

  return (
    <div className="group flex items-center gap-2 text-sm">
      <span className="text-zinc-500 text-xs">{label}</span>
      <Euro className="w-4 h-4 text-zinc-500" />
      <span className="text-zinc-300">{value || <span className="text-zinc-600 italic">kein Wert</span>}</span>
      <button
        onClick={() => setEditing(true)}
        className="p-1 rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
        aria-label={`${label} bearbeiten`}
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}
