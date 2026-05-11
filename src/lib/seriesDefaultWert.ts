export const SERIES_DEFAULT_WERT: Record<string, string> = {
  'Action Fleet : Classic Vessel': '50',
  'Action Fleet : Alpha Series': '80',
  'Action Fleet : Transforming Playsets': '100',
  'Action Fleet : Sonderserie': '70',
  'Action Fleet : Battle Packs': '30',
  'Hasbro Saga Action Fleet 2002 : Vessel': '25',
  'Hasbro Saga Action Fleet 2002 : Battle Packs': '15',
  'Micro Machines : Playsets': '60',
  'Micro Machines : Transforming Action Sets': '70',
  'Micro Machines : Mini Heads': '25',
  'Micro Machines : Gift Sets': '35',
  'Micro Machines : Original 3 Pack': '25',
  'Micro Machines : Mini Figures': '30',
  'Micro Machines : Original 3 Pack Filme': '25',
}

export function getDefaultWert(serie: string | null | undefined): string | null {
  if (!serie) return null
  return SERIES_DEFAULT_WERT[serie] ?? null
}
