/**
 * Spaltenbreiten für die ItemListView. Werden in Header, Filter-Reihe
 * und jeder Zeile gleich angewendet, sodass alles exakt untereinander
 * steht. Per Mouse-Drag am Header verschiebbar; in localStorage
 * persistiert.
 */

export interface ColWidths {
  checkbox: number
  thumb:    number
  name:     number  // wirkt als minWidth; Spalte hat flex-grow
  serie:    number
  zustand:  number
  jahr:     number
  setnr:    number
  lief:     number
  sammlung: number
  actions:  number
  kauf:     number
  wert:     number
}

export const DEFAULT_COL_WIDTHS: ColWidths = {
  checkbox: 24,
  thumb:    44,
  name:    280,
  serie:   200,
  zustand: 130,
  jahr:     56,
  setnr:    72,
  lief:     44,
  sammlung: 36,
  actions:  36,
  kauf:     80,
  wert:     80,
}

export const COL_WIDTHS_LS_KEY = 'galoob-list-col-widths'

export const COL_MIN_WIDTH = 32
