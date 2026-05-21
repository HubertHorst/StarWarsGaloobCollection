'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { compressImage } from '@/lib/compressImage'

export default function UploadPhotoButton({ itemId }: { itemId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleFile(rawFile: File) {
    setUploading(true)
    setErr(null)
    try {
      // HEIC → JPEG client-side (iPhone Live Photos / Mac default)
      let file = rawFile
      if (
        /heic|heif/i.test(rawFile.type) ||
        /\.(heic|heif)$/i.test(rawFile.name)
      ) {
        try {
          const heic2any = (await import('heic2any')).default
          const blob = (await heic2any({ blob: rawFile, toType: 'image/jpeg', quality: 0.85 })) as Blob
          file = new File([blob], rawFile.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
        } catch (e) {
          throw new Error('HEIC-Konvertierung fehlgeschlagen: ' + (e instanceof Error ? e.message : 'unbekannt'))
        }
      }

      file = await compressImage(file)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('itemId', itemId)

      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData })
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(j.error ?? `Upload-Fehler (HTTP ${res.status})`)
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload-Fehler')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0]
          // reset value so picking the same file again still fires onChange
          e.target.value = ''
          if (f) handleFile(f)
        }}
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
      {err && (
        <p className="text-xs text-red-400 max-w-xs">{err}</p>
      )}
    </div>
  )
}
