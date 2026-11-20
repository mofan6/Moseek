export const PALETTES = [
  'warm',
  'ocean',
  'celadon',
  'pine',
  'violet',
  'rose',
  'maple',
  'graphite',
] as const

export type Palette = (typeof PALETTES)[number]

export const INTERFACE_FONTS = [
  'harmony',
  'iqoo',
  'sourceHanSans',
  'sourceHanSerif',
  'inter',
  'system',
  'custom',
] as const

export type InterfaceFont = (typeof INTERFACE_FONTS)[number]
