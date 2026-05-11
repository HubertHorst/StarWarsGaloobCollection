'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2 } from 'lucide-react'

interface Props {
  itemId: string
  imageUrl: string
  isCurrent: boolean
}

export default function SetCoverButton({ itemId, imageUrl, isCurrent }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (isCurrent) {
    return (
      <span className="flex items-center gap-1 text-xs bg-yellow-600 text-white px-2 py-1 rounded-md font-medium">
        <Star className="w-3 h-3 fill-white" /> Cover
      </span>
    )
  }

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setLoading(true)
    await fetch(`/api/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_url: imageUrl }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 text-xs bg-black/70 hover:bg-yellow-600 text-white px-2 py-1 rounded-md font-medium transition-colors opacity-0 group-hover:opacity-100"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
      Als Cover setzen
    </button>
  )
}
