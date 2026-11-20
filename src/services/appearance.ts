export const PALETTES = [
  'ocean',
  'warm',
  'celadon',
  'pine',
  'violet',
  'rose',
  'maple',
  'graphite',
] as const

export type Palette = (typeof PALETTES)[number]

export const INTERFACE_FONTS = [
  'harmonyRegular',
  'harmony',
  'sourceHanSans',
  'sourceHanSerif',
  'kai',
  'inter',
  'system',
] as const

export type InterfaceFont = (typeof INTERFACE_FONTS)[number]
