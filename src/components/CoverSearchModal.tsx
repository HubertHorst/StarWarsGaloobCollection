'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check, Loader2, SkipForward, AlertCircle, RefreshCw } from 'lucide-react'

export interface CoverSearchItem {
  id: string
  name: string
  serie?: string | null
}

interface Props {
  items: CoverSearchItem[]
  onClose: () => void
  /** Called immediately when a cover is successfully saved so the grid can update optimistically */
  onApplied?: (itemId: string, newUrl: string) => void
}

function buildDefaultQuery(item: CoverSearchItem) {
  return [item.name, item.serie, 'Star Wars Galoob'].filter(Boolean).join(' ')
}

/** Proxy all preview images through our server to bypass hotlink protection */
function proxyUrl(url: string) {
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

export default function CoverSearchModal({ items, onClose, onApplied }: Props) {
  const [queueIndex, setQueueIndex] = useState(0)
  const [queryInput, setQueryInput] = useState('')
  const [results, setResults] = useState<string[]>([])
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [doneIndices, setDoneIndices] = useState<Set<number>>(new Set())

  const currentItem = items[queueIndex]
  const isLast = queueIndex >= items.length - 1

  // When the queue index changes: auto-populate query and search
  useEffect(() => {
    if (!currentItem) return
    const q = buildDefaultQuery(currentItem)
    setQueryInput(q)
    setSelected(null)
    setApplyError(null)
    triggerSearch(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueIndex])

  async function triggerSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setResults([])
    setBrokenUrls(new Set())
    setSelected(null)
    setSearchError(null)
    try {
      const res = await fetch(`/api/cover-search?q=${encodeURIComponent(q.trim())}&debug=1`)
      const data = await res.json()
      const urls: string[] = data.urls ?? []
      setResults(urls)
      if (data.error) {
        setSearchError(`API: ${data.error}`)
      } else if (urls.length === 0) {
        // Show full debug info so we can diagnose server-side
        const d = data.debug ?? {}
        setSearchError(
          `0 URLs — initStatus:${d.initStatus} bodyLen:${d.initBodyLen} vqd:${d.vqd ?? 'null'} imgStatus:${d.imgStatus} imgLen:${d.imgBodyLen} results:${d.resultCount} | ${d.error ?? d.imgBodySnippet?.substring(0,80) ?? ''}`
        )
      }
    } catch (e) {
      setSearchError(`Fetch failed: ${e}`)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleSearchClick() {
    triggerSearch(queryInput)
  }

  async function handleApply() {
    if (!selected || !currentItem) return
    setApplying(true)
    setApplyError(null)
    try {
      const res = await fetch(`/api/items/${currentItem.id}/apply-cover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unbekannter Fehler')
      onApplied?.(currentItem.id, data.url)
      setDoneIndices((d) => new Set([...d, queueIndex]))
      advance()
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err))
    } finally {
      setApplying(false)
    }
  }

  function advance() {
    if (!isLast) {
      setQueueIndex((i) => i + 1)
    } else {
      onClose()
    }
  }

  const visibleResults = results.filter((url) => !brokenUrls.has(url))

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-white/5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight">{currentItem?.name}</p>
            {currentItem?.serie && (
              <p className="text-xs text-yellow-600/80 mt-0.5">{currentItem.serie}</p>
            )}
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {items.length > 1 && (
              <span className="text-xs text-zinc-400 tabular-nums bg-zinc-800 px-2 py-0.5 rounded-full">
                {queueIndex + 1} / {items.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors p-0.5"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 px-5 pt-4">
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
            placeholder="Suchbegriff…"
            className="flex-1 bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-yellow-500 placeholder-zinc-600 transition-colors"
          />
          <button
            onClick={handleSearchClick}
            disabled={loading || !queryInput.trim()}
            title="Nochmal suchen"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 transition-colors flex-shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Image grid ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
              <p className="text-sm">Suche nach Titelbildern…</p>
            </div>
          ) : visibleResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-500">
              <Search className="w-8 h-8 text-zinc-700" />
              <p className="text-sm">Keine Ergebnisse gefunden</p>
              {searchError ? (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-1.5 max-w-xs text-center">{searchError}</p>
              ) : results.length > 0 ? (
                <p className="text-xs text-zinc-500">{results.length} URLs geladen, {brokenUrls.size} fehlgeschlagen</p>
              ) : (
                <p className="text-xs text-zinc-600">Suchbegriff anpassen und erneut suchen</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {results.map((url, i) => {
                const isBroken = brokenUrls.has(url)
                const isSelected = selected === url
                return (
                  <button
                    key={url}
                    onClick={() => setSelected(isSelected ? null : url)}
                    className={[
                      'relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 ring-2 transition-all duration-150',
                      isBroken ? 'hidden' : '',
                      isSelected
                        ? 'ring-yellow-400 scale-[1.03] shadow-lg shadow-yellow-500/25'
                        : 'ring-transparent hover:ring-white/25 hover:scale-[1.01]',
                    ].join(' ')}
                  >
                    <img
                      src={proxyUrl(url)}
                      alt={`Option ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => setBrokenUrls((s) => new Set([...s, url]))}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                        <div className="bg-yellow-400 rounded-full p-1.5 shadow-lg">
                          <Check className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {applyError && (
            <div className="mt-4 flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{applyError}</span>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3 border-t border-white/5">

          {/* Progress dots (multi-item mode) */}
          {items.length > 1 ? (
            <div className="flex gap-1.5 items-center">
              {items.map((_, i) => (
                <div
                  key={i}
                  title={items[i].name}
                  className={[
                    'rounded-full transition-all duration-200',
                    i === queueIndex
                      ? 'w-3 h-3 bg-yellow-400'
                      : doneIndices.has(i)
                        ? 'w-2 h-2 bg-green-500'
                        : 'w-2 h-2 bg-zinc-600',
                  ].join(' ')}
                />
              ))}
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={advance}
              disabled={applying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-sm transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              {isLast ? 'Schließen' : 'Überspringen'}
            </button>
            <button
              onClick={handleApply}
              disabled={!selected || applying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors min-w-[130px] justify-center"
            >
              {applying ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichert…</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Übernehmen</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
