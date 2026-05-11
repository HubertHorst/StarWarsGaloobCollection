'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Props {
  itemId: string
  initialValue: number
}

export default function LieferungToggle({ itemId, initialValue }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function toggle() {
    const newVal = value === 1 ? 0 : 1
    setSaving(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lieferung_ausstehend: newVal }),
    })
    setValue(newVal)
    setSaving(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        value === 1 ? 'bg-yellow-500' : 'bg-zinc-700'
      }`}
      role="switch"
      aria-checked={value === 1}
    >
      {saving ? (
        <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
      ) : (
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value === 1 ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      )}
    </button>
  )
}
