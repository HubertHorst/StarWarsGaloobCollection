import Link from 'next/link'
import { Plus, Layers, Star } from 'lucide-react'
import EditModeToggle from '@/components/EditModeToggle'
import { getDb, initDb } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'
import ItemGridView from '@/components/ItemGridView'
import ItemListView from '@/components/ItemListView'
import SearchBar from '@/components/SearchBar'
import SerieFilter from '@/components/SerieFilter'
import ViewToggle from '@/components/ViewToggle'
import ChangelogPanel from '@/components/ChangelogPanel'
import ScrollRestorer from '@/components/ScrollRestorer'
import { Item } from '@/types/item'

interface Props {
  searchParams: Promise<{ q?: string; serie?: string; view?: string; edit?: string }>
}

function parseItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

async function getItems(search?: string, serie?: string): Promise<Item[]> {
  await initDb()
  const db = getDb()
  let sql = 'SELECT * FROM items'
  const args: string[] = []
  const conditions: string[] = []

  if (serie) { conditions.push('serie = ?'); args.push(serie) }
  if (search) { conditions.push('name LIKE ?'); args.push(`%${search}%`) }
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY name'

  const { rows } = await db.execute({ sql, args })
  return rows.map((r) => parseItem(r as Record<string, unknown>))
}

async function getSeries(): Promise<string[]> {
  const db = getDb()
  const { rows } = await db.execute('SELECT DISTINCT serie FROM items WHERE serie IS NOT NULL ORDER BY serie')
  return rows.map((r) => r.serie as string)
}

export default async function LibraryPage({ searchParams }: Props) {
  const { q, serie, view, edit } = await searchParams
  const currentView = view === 'list' ? 'list' : 'grid'
  const editMode = edit === '1' && currentView === 'grid'
  const [items, series] = await Promise.all([getItems(q, serie), getSeries()])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/5 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <h1 className="text-lg font-bold tracking-tight">Star Wars Galoob Collection</h1>
            <span className="ml-2 text-sm text-zinc-500">
              {items.length} {items.length === 1 ? 'Artikel' : 'Artikel'}
            </span>
          </div>
          <div className="flex gap-2">
            <ChangelogPanel />
            {currentView === 'grid' && (
              <EditModeToggle editMode={editMode} />
            )}
            <Link
              href="/bulk"
              className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
              Bulk Import
            </Link>
            <Link
              href="/add"
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Artikel hinzufügen
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ScrollRestorer />
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchBar defaultValue={q} />
          <SerieFilter series={series} selected={serie} />
          <ViewToggle current={currentView} />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <Star className="w-16 h-16 text-zinc-700" />
            <div>
              <p className="text-zinc-400 text-lg font-medium">
                {q || serie ? 'Keine Artikel gefunden' : 'Deine Sammlung ist leer'}
              </p>
              <p className="text-zinc-600 text-sm mt-1">
                {q || serie
                  ? 'Versuche eine andere Suche oder einen anderen Filter'
                  : 'Füge deinen ersten Artikel hinzu, indem du ein Foto machst'}
              </p>
            </div>
            {!q && !serie && (
              <Link
                href="/add"
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Ersten Artikel hinzufügen
              </Link>
            )}
          </div>
        ) : currentView === 'list' ? (
          <ItemListView items={items} />
        ) : (
          <ItemGridView items={items} editMode={editMode} />
        )}
      </main>
    </div>
  )
}
