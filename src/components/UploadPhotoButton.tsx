'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'

export default function UploadPhotoButton({ itemId }: { itemId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)

  async function handleFile(rawFile: File) {
    setUploading(true)
    try {
      const file = await compressImage(rawFile)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('itemId', itemId)

      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData })
      if (res.ok) router.refresh()
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        Foto hinzufügen
      </button>
    </>
  )
}
