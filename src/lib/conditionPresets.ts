export const CONDITION_PRESETS = [
  'OVP (ungeöffnet)',
  'Neu',
  'Sehr gut',
  'Gut',
  'Gebraucht',
  'Beschädigt',
] as const

export type ConditionPreset = (typeof CONDITION_PRESETS)[number]
