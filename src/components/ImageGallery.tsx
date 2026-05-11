'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import SetCoverButton from '@/components/SetCoverButton'

interface Props {
  images: string[]
  title: string
  itemId?: string
  coverUrl?: string | null
}

export default function ImageGallery({ images, title, itemId, coverUrl }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  const normalized = images.map((url) =>
    url.startsWith('//') ? `https:${url}` : url
  )

  function prev() {
    setLightboxIndex((i) => (i !== null ? (i - 1 + normalized.length) % normalized.length : null))
  }

  function next() {
    setLightboxIndex((i) => (i !== null ? (i + 1) % normalized.length : null))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') prev()
    else if (e.key === 'ArrowRight') next()
    else if (e.key === 'Escape') setLightboxIndex(null)
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {normalized.map((url, i) => (
          <div key={url} className="group relative aspect-video rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-white/5 hover:ring-yellow-500/50 transition-all">
            <button
              onClick={() => setLightboxIndex(i)}
              className="absolute inset-0 w-full h-full"
              aria-label={`Foto ${i + 1} von ${title} ansehen`}
            >
              <Image src={url} alt={`${title} Foto ${i + 1}`} fill className="object-cover" sizes="200px" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
            </button>
            {itemId && (
              <div className="absolute bottom-1.5 left-1.5 z-10">
                <SetCoverButton itemId={itemId} imageUrl={url} isCurrent={url === coverUrl} />
              </div>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            onClick={() => setLightboxIndex(null)}
            aria-label="Schließen"
          >
            <X className="w-6 h-6" />
          </button>
          {normalized.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); prev() }}
                aria-label="Vorheriges Foto"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); next() }}
                aria-label="Nächstes Foto"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={normalized[lightboxIndex]}
              alt={`${title} Foto`}
              width={1280}
              height={720}
              className="object-contain rounded-lg max-h-[85vh] w-full"
            />
          </div>
          {normalized.length > 1 && (
            <p className="absolute bottom-4 text-white/50 text-sm select-none">
              {lightboxIndex + 1} / {normalized.length}
            </p>
          )}
        </div>
      )}
    </>
  )
}
