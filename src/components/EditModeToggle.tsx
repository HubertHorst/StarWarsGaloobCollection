'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { GitMerge, PencilOff } from 'lucide-react'

interface Props {
  editMode: boolean
}

export default function EditModeToggle({ editMode }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function toggle() {
    const params = new URLSearchParams(searchParams.toString())
    if (editMode) {
      params.delete('edit')
    } else {
      params.set('edit', '1')
    }
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  return editMode ? (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-yellow-700 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      <PencilOff className="w-4 h-4" />
      Fertig
    </button>
  ) : (
    <button
      onClick={toggle}
      className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      <GitMerge className="w-4 h-4" />
      Bearbeiten
    </button>
  )
}
