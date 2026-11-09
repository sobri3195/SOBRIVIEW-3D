export const SYSTEM_IDS = [
  'skeletal',
  'muscular',
  'cardiac',
  'sensory',
  'arterial',
  'venous',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
  'reproductive',
  'integumentary',
  'connective',
] as const

export type SystemId = (typeof SYSTEM_IDS)[number]

export const SURFACE_SYSTEM: SystemId = 'integumentary'

export const SYSTEM_COLORS: Record<SystemId, string> = {
  skeletal: '#e2d9ba',
  muscular: '#a85b50',
  cardiac: '#b96760',
  sensory: '#b0c8ce',
  arterial: '#c05245',
  venous: '#527c9f',
  nervous: '#d8b565',
  respiratory: '#b98991',
  digestive: '#b8916b',
  urinary: '#b47961',
  lymphatic: '#879f7c',
  endocrine: '#c5a09a',
  reproductive: '#bda098',
  integumentary: '#ba9b7d',
  connective: '#aec3bb',
}

export function isSystemId(value: unknown): value is SystemId {
  return SYSTEM_IDS.some((id) => id === value)
}

export const DEFAULT_VISIBLE_SYSTEMS: readonly SystemId[] = SYSTEM_IDS.filter(
  (id) => id !== SURFACE_SYSTEM,
)
