'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

interface Props {
  itemId: string
  initialName: string
}

export default function EditableTitle({ itemId, initialName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialName)
  const [savedName, setSavedName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function save() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === savedName) {
      setValue(savedName)
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      setSaving(false)
      if (!res.ok) {
        setError(`Fehler beim Speichern (${res.status}): ${data?.error ?? 'unbekannt'}`)
        return
      }
      setEditing(false)
      setSavedName(trimmed)
      router.refresh()
    } catch (err) {
      setSaving(false)
      setError(`Netzwerkfehler: ${String(err)}`)
    }
  }

  function cancel() {
    setValue(savedName)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="text-3xl font-bold tracking-tight bg-zinc-800 text-white rounded-lg px-3 py-1 outline-none ring-2 ring-yellow-500 w-full"
        />
        <button
          onClick={save}
          disabled={saving}
          className="flex-shrink-0 p-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        <button
          onClick={cancel}
          disabled={saving}
          className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
    {error && <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">{error}</p>}
    <div className="group flex items-center gap-2">
      <h1 className="text-3xl font-bold tracking-tight">{value}</h1>
      <button
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Titel bearbeiten"
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
    </div>
  )
}
