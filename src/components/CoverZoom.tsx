'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  src: string
  alt: string
  sizes?: string
  priority?: boolean
  /** Additional images to browse in the lightbox (src is always index 0) */
  images?: string[]
}

export default function CoverZoom({ src, alt, sizes = '192px', priority = false, images }: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  const all = images && images.length > 0 ? images : [src]
  const multi = all.length > 1

  const prev = useCallback(() => setIndex((i) => (i - 1 + all.length) % all.length), [all.length])
  const next = useCallback(() => setIndex((i) => (i + 1) % all.length), [all.length])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, prev, next])

  function openLightbox(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIndex(0)
    setOpen(true)
  }

  return (
    <>
      <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} priority={priority} />

      <div className="absolute inset-0 pointer-events-none">
        <button
          onClick={openLightbox}
          className="pointer-events-auto absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white opacity-60 hover:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          aria-label="Vergrößern"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setOpen(false) }}
          tabIndex={-1}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 z-10"
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            aria-label="Schließen"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Prev arrow */}
          {multi && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); prev() }}
              aria-label="Vorheriges Bild"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-[min(90vw,100vh)] aspect-[3/4]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              key={all[index]}
              src={all[index]}
              alt={`${alt} ${index + 1}`}
              fill
              className="object-contain rounded-xl"
              sizes="90vw"
              priority
            />
          </div>

          {/* Next arrow */}
          {multi && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); next() }}
              aria-label="Nächstes Bild"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Counter */}
          {multi && (
            <p className="absolute bottom-4 text-white/50 text-sm select-none">
              {index + 1} / {all.length}
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
