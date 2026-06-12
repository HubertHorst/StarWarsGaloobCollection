'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Loader2 } from 'lucide-react'

export default function DuplicateItemButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDuplicate() {
    setLoading(true)
    try {
      const res = await fetch(`/api/items/${itemId}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Fehler beim Duplizieren')
      const newItem = await res.json()
      router.push(`/items/${newItem.id}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      title="Set duplizieren"
      className="text-zinc-600 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-indigo-500/10 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}
