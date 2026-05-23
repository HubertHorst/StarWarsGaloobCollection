'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Star, ArrowLeft, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? 'Login fehlgeschlagen')
      }
      router.push(next)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Fehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="border-b border-white/5 bg-zinc-900/80 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <h1 className="text-base font-bold">Login</h1>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h2 className="text-lg font-bold">Galoob Collection</h2>
          </div>
          <p className="text-sm text-zinc-400">
            Login um Änderungen vorzunehmen und Wert/Kaufpreise zu sehen.
          </p>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 block">Benutzer</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/60"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 block">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-500/60"
            />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>
      </main>
    </div>
  )
}
