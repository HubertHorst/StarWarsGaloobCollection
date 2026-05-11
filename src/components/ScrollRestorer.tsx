'use client'

import { useEffect } from 'react'

export default function ScrollRestorer() {
  useEffect(() => {
    const saved = sessionStorage.getItem('library-scroll')
    if (saved) {
      window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' })
      sessionStorage.removeItem('library-scroll')
    }
  }, [])

  return null
}
