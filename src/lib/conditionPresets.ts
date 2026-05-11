export const CONDITION_PRESETS = [
  'Neu in Box',
  'Box Neuwertig',
  'Box mit Gebrauchspuren',
  'Box Beschädigt',
] as const

export const DEFAULT_CONDITION = 'Box Neuwertig' as const

export type ConditionPreset = (typeof CONDITION_PRESETS)[number]
