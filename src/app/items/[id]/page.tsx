import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Hash, Truck, PackageCheck } from 'lucide-react'
import { getDb } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'
import { Item } from '@/types/item'
import UploadPhotoButton from '@/components/UploadPhotoButton'
import DeleteItemButton from '@/components/DeleteItemButton'
import ImageGallery from '@/components/ImageGallery'
import EditableTitle from '@/components/EditableTitle'
import EditableValue from '@/components/EditableValue'
import EditableZustand from '@/components/EditableZustand'
import EditableSerie from '@/components/EditableSerie'
import RefreshFromImageButton from '@/components/RefreshFromImageButton'
import CoverZoom from '@/components/CoverZoom'
import PriceCheckButton from '@/components/PriceCheckButton'
import LieferungToggle from '@/components/LieferungToggle'
import SammlungToggle from '@/components/SammlungToggle'
import ItemNavigation from '@/components/ItemNavigation'

async function getNeighbours(currentId: string): Promise<{ prev: string | null; next: string | null }> {
  const db = getDb()
  try {
    const result = await db.execute('SELECT id FROM items ORDER BY name')
    const rows = result.rows.map((r) => String(r.id))
    const idx = rows.indexOf(currentId)
    if (idx === -1) return { prev: null, next: null }
    return {
      prev: idx > 0 ? rows[idx - 1] : null,
      next: idx < rows.length - 1 ? rows[idx + 1] : null,
    }
  } catch {
    return { prev: null, next: null }
  }
}

async function getItem(id: string): Promise<Item | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM items WHERE id = ?',
    args: [id],
  })
  if (!result.rows[0]) return null
  const row = result.rows[0] as Record<string, unknown>
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getItem(id)

  if (!item) notFound()

  const { prev: fallbackPrev, next: fallbackNext } = await getNeighbours(item.id)

  const coverUrl = item.cover_url ?? null
  const userPhotos = item.user_photos ?? []
  const allGallery = coverUrl
    ? [coverUrl, ...userPhotos.filter((u) => u !== coverUrl)]
    : [...userPhotos]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/5 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Sammlung</span>
            </Link>
            <ItemNavigation
              currentId={item.id}
              fallbackPrev={fallbackPrev}
              fallbackNext={fallbackNext}
            />
          </div>
          <div className="flex items-center gap-2">
            <RefreshFromImageButton itemId={item.id} />
            <DeleteItemButton itemId={item.id} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Cover */}
          <div className="flex-shrink-0 flex flex-col gap-4">
            <div className="group relative w-48 aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-800 ring-1 ring-white/10 shadow-2xl mx-auto sm:mx-0">
              {coverUrl ? (
                <CoverZoom
                  src={coverUrl}
                  alt={item.name}
                  sizes="192px"
                  priority
                  images={[coverUrl, ...userPhotos.filter((u) => u !== coverUrl)].filter(Boolean)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-5">
            <div>
              <EditableTitle itemId={item.id} initialName={item.name} />
              <EditableZustand itemId={item.id} initialZustand={item.zustand} />
              <div className="mt-2">
                <EditableSerie itemId={item.id} initialSerie={item.serie} />
              </div>
              <div className="mt-3">
                <PriceCheckButton name={item.name} imageUrl={coverUrl} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {item.jahr && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{item.jahr}</span>
                </div>
              )}
              {item.set_nummer && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{item.set_nummer}</span>
                </div>
              )}
              <EditableValue itemId={item.id} field="kaufpreis" label="Kaufpreis" initialValue={item.kaufpreis} />
              <EditableValue itemId={item.id} field="wert" label="Wert" initialValue={item.wert} />
            </div>

            {/* In Sammlung vorhanden */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5">
              <PackageCheck className={`w-5 h-5 ${item.in_sammlung === 0 ? 'text-red-400' : 'text-green-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">In Sammlung</p>
                <p className={`text-xs mt-0.5 ${item.in_sammlung === 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {item.in_sammlung === 0 ? 'Fehlt in der Sammlung' : 'Vorhanden'}
                </p>
              </div>
              <SammlungToggle itemId={item.id} initialValue={item.in_sammlung ?? 1} />
            </div>

            {/* Lieferung ausstehend */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-white/5">
              <Truck className={`w-5 h-5 ${item.lieferung_ausstehend === 1 ? 'text-yellow-400' : 'text-zinc-600'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Lieferung ausstehend</p>
                {item.lieferung_ausstehend === 1 && (
                  <p className="text-xs text-yellow-400 mt-0.5">Dieser Artikel wurde noch nicht geliefert</p>
                )}
              </div>
              <LieferungToggle itemId={item.id} initialValue={item.lieferung_ausstehend ?? 0} />
            </div>
          </div>
        </div>

        {/* Gallery */}
        <section className="mt-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fotos</h2>
            <UploadPhotoButton itemId={item.id} />
          </div>

          {allGallery.length > 0 ? (
            <ImageGallery
              images={allGallery}
              title={item.name}
              itemId={item.id}
              coverUrl={coverUrl}
            />
          ) : (
            <div className="border border-dashed border-zinc-700 rounded-xl p-8 text-center text-zinc-500 text-sm">
              Noch keine Fotos. Füge eigene Fotos des Artikels hinzu.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
