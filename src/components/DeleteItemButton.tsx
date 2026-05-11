'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
    router.push('/')
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Aus Sammlung entfernen?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ja, entfernen'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Abbrechen
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
