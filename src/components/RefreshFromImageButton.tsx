'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScanSearch, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface Props {
  itemId: string
  compact?: boolean
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function RefreshFromImageButton({ itemId, compact = false }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'loading') return

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(`/api/items/${itemId}/refresh-image`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Fehler')
        setTimeout(() => setStatus('idle'), 4000)
        return
      }

      setStatus('success')
      setMessage(data.identified ?? 'Aktualisiert')
      router.refresh()
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setMessage('Netzwerkfehler')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const icon = status === 'loading'
    ? <Loader2 className="w-4 h-4 animate-spin" />
    : status === 'success'
    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
    : status === 'error'
    ? <AlertCircle className="w-4 h-4 text-red-400" />
    : <ScanSearch className="w-4 h-4" />

  if (compact) {
    return (
      <div className="relative flex items-center gap-1">
        <button
          onClick={handleClick}
          disabled={status === 'loading'}
          title="Erneut aus Bild identifizieren"
          className={[
            'p-1.5 rounded-lg transition-colors',
            status === 'idle' ? 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 opacity-0 group-hover:opacity-100' :
            status === 'loading' ? 'text-zinc-400' :
            status === 'success' ? 'text-green-400' : 'text-red-400',
          ].join(' ')}
        >
          {icon}
        </button>
        {message && (
          <span className={`absolute left-8 top-0 text-xs whitespace-nowrap px-2 py-1 rounded-md z-10 ${
            status === 'success' ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'
          }`}>
            {message}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className={[
          'flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors',
          status === 'idle' ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' :
          status === 'loading' ? 'bg-zinc-800 text-zinc-500 cursor-wait' :
          status === 'success' ? 'bg-green-900/40 text-green-400' :
          'bg-red-900/40 text-red-400',
        ].join(' ')}
      >
        {icon}
        {status === 'idle' && 'Aus Bild neu laden'}
        {status === 'loading' && 'Wird erkannt…'}
        {status === 'success' && (message || 'Aktualisiert')}
        {status === 'error' && (message || 'Fehler')}
      </button>
    </div>
  )
}
