import Link from 'next/link'
import { Plus, Layers, Star } from 'lucide-react'
import EditModeToggle from '@/components/EditModeToggle'
import { getDb, initDb } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'
import ItemGridView from '@/components/ItemGridView'
import ItemListView from '@/components/ItemListView'
import ViewToggle from '@/components/ViewToggle'
import ChangelogPanel from '@/components/ChangelogPanel'
import ScrollRestorer from '@/components/ScrollRestorer'
import { Item } from '@/types/item'
import { sortItems } from '@/lib/sortItems'

interface Props {
  searchParams: Promise<{ view?: string; edit?: string }>
}

function parseItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

async function getItems(): Promise<Item[]> {
  await initDb()
  const db = getDb()

  // Sort: serie alpha, then numeric for #N names, then plain alpha
  const sql = `SELECT * FROM items ORDER BY serie ASC,
    CASE
      WHEN INSTR(name, '#') > 0
        THEN PRINTF('%08d', CAST(TRIM(SUBSTR(name, INSTR(name, '#') + 1)) AS INTEGER))
      WHEN name GLOB '[0-9]*'
        THEN PRINTF('%08d', CAST(name AS INTEGER))
      ELSE 'zzzzzzzz' || LOWER(name)
    END ASC`

  const { rows } = await db.execute({ sql, args: [] })
  return sortItems(rows.map((r) => parseItem(r as Record<string, unknown>)))
}

export default async function LibraryPage({ searchParams }: Props) {
  const { view, edit } = await searchParams
  const currentView = view === 'list' ? 'list' : 'grid'
  const editMode = edit === '1' && currentView === 'grid'
  const items = await getItems()

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            <h1 className="text-lg font-bold tracking-tight">Star Wars Galoob Collection</h1>
            <span className="ml-2 text-sm text-zinc-500">
              {items.length} {items.length === 1 ? 'Artikel' : 'Artikel'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChangelogPanel />
            <ViewToggle current={currentView} />
            {currentView === 'grid' && (
              <EditModeToggle editMode={editMode} />
            )}
            <Link
              href="/bulk"
              className="hidden sm:flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
              Bulk Import
            </Link>
            <Link
              href="/add"
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Artikel hinzufügen</span>
              <span className="sm:hidden">Neu</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ScrollRestorer />

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <Star className="w-16 h-16 text-zinc-700" />
            <div>
              <p className="text-zinc-400 text-lg font-medium">Deine Sammlung ist leer</p>
              <p className="text-zinc-600 text-sm mt-1">
                Füge deinen ersten Artikel hinzu, indem du ein Foto machst
              </p>
            </div>
            <Link
              href="/add"
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Ersten Artikel hinzufügen
            </Link>
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
