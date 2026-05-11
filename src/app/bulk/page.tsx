import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import BulkUploadClient from './BulkUploadClient'

export default function BulkPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/5 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Layers className="w-5 h-5 text-yellow-400" />
          <h1 className="text-base font-bold">Bulk Import</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <BulkUploadClient />
      </main>
    </div>
  )
}
