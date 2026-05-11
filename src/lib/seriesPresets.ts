export const SERIES_PRESETS = [
  'Action Fleet : Classic Vessel',
  'Action Fleet : Alpha Series',
  'Action Fleet : Transforming Playsets',
  'Action Fleet : Sonderserie',
  'Action Fleet : Battle Packs',
  'Hasbro Saga Action Fleet 2002 : Vessel',
  'Hasbro Saga Action Fleet 2002 : Battle Packs',
  'Micro Machines : Playsets',
  'Micro Machines : Transforming Action Sets',
  'Micro Machines : Mini Figures',
  'Micro Machines : Original 3 Pack Filme',
  'Micro Machines : Original 3 Pack',
  'Micro Machines : Mini Heads',
  'Micro Machines : Gift Sets',
] as const

export type SeriesPreset = (typeof SERIES_PRESETS)[number]
