'use client'

import { useEffect } from 'react'

/**
 * Saves the current Library-page URL (path + query string) to sessionStorage
 * so that <BackToLibrary> can return the user to the exact view they came from
 * (grid/list/series, with serie + edit filters intact).
 *
 * Re-runs on every render so changes in search params are captured.
 */
export default function LibraryStateMemo() {
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'library-last-url',
        window.location.pathname + window.location.search,
      )
    } catch { /* private mode etc. */ }
  })
  return null
}
