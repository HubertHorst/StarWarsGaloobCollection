import Link from 'next/link'
import { Plus, Layers, Star, ChevronLeft } from 'lucide-react'
import EditModeToggle from '@/components/EditModeToggle'
import { getDb, initDb } from '@/lib/db'
import { safeParseJson } from '@/lib/validate'
import ItemGridView from '@/components/ItemGridView'
import ItemListView from '@/components/ItemListView'
import ItemSeriesView from '@/components/ItemSeriesView'
import ViewToggle from '@/components/ViewToggle'
import ChangelogPanel from '@/components/ChangelogPanel'
import ScrollRestorer from '@/components/ScrollRestorer'
import { Item } from '@/types/item'
import { sortItems } from '@/lib/sortItems'

interface Props {
  searchParams: Promise<{ view?: string; edit?: string; serie?: string }>
}

type View = 'grid' | 'list' | 'series'

function parseItem(row: Record<string, unknown>): Item {
  return {
    ...row,
    user_photos: safeParseJson(row.user_photos),
  } as Item
}

async function getItems(): Promise<Item[]> {
  await initDb()
  const db = getDb()

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
  const { view, edit, serie } = await searchParams

  // Serienansicht ist die Landing Page (Standard)
  const currentView: View = view === 'list' ? 'list' : view === 'grid' ? 'grid' : 'series'
  // editMode is active in grid view OR in a series detail view (which always renders as grid)
  const editMode = edit === '1' && (currentView === 'grid' || !!serie)

  const allItems = await getItems()

  // Wenn ?serie= gesetzt, in diese Serie filtern und Grid zeigen
  const serieFilter = serie ? decodeURIComponent(serie) : null
  const filteredItems = serieFilter
    ? serieFilter === '__none__'
      ? allItems.filter((i) => !i.serie)
      : allItems.filter((i) => i.serie === serieFilter)
    : allItems

  const showSerieDetail = !!serieFilter

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            {showSerieDetail ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-sm hidden sm:inline">Serien</span>
                </Link>
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  {serieFilter === '__none__' ? 'Ohne Serie' : serieFilter}
                </h1>
                <span className="ml-1 text-sm text-zinc-500 flex-shrink-0">
                  {filteredItems.length}
                </span>
              </>
            ) : (
              <>
                <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <h1 className="text-lg font-bold tracking-tight whitespace-nowrap">Star Wars Galoob Collection</h1>
                <span className="ml-2 text-sm text-zinc-500 flex-shrink-0">
                  {allItems.length} Artikel
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ChangelogPanel />
            {!showSerieDetail && <ViewToggle current={currentView} />}
            {(showSerieDetail || currentView === 'grid') && (
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

        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <Star className="w-16 h-16 text-zinc-700" />
            <div>
              <p className="text-zinc-400 text-lg font-medium">Deine Sammlung ist leer</p>
              <p className="text-zinc-600 text-sm mt-1">Füge deinen ersten Artikel hinzu</p>
            </div>
            <Link
              href="/add"
              className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors mt-2"
            >
              <Plus className="w-4 h-4" />
              Ersten Artikel hinzufügen
            </Link>
          </div>
        ) : showSerieDetail ? (
          // Serie detail: pass ALL items so series dropdown is fully populated;
          // initialSerie pre-selects the current series filter in the toolbar.
          <ItemGridView items={allItems} editMode={editMode} initialSerie={serieFilter ?? ''} />
        ) : currentView === 'list' ? (
          <ItemListView items={allItems} />
        ) : currentView === 'grid' ? (
          <ItemGridView items={allItems} editMode={editMode} />
        ) : (
          // series = default landing page
          <ItemSeriesView items={allItems} />
        )}
      </main>
    </div>
  )
}
