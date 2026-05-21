'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Reads the last-saved Library URL from sessionStorage and links there.
 * Falls back to '/' until the URL is restored on mount (no flash, since
 * Next.js prefetches the default fallback and we just swap target on click
 * when sessionStorage is hydrated).
 */
export default function BackToLibrary({
  children,
  className,
  fallback = '/',
}: {
  children: React.ReactNode
  className?: string
  fallback?: string
}) {
  const [href, setHref] = useState(fallback)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('library-last-url')
      if (saved && saved !== window.location.pathname + window.location.search) {
        setHref(saved)
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
