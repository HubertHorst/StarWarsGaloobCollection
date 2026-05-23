'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.refresh()
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800"
      title="Abmelden"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Logout</span>
    </button>
  )
}
