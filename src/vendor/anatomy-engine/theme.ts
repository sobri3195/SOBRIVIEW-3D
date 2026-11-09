import { type SystemId, SYSTEM_COLORS } from './systems.ts'

export type AnatomyEngineTheme = {
  background: string
  ground: string
  platform: string
  ring: string
  innerRing: string
  skyLight: string
  groundLight: string
  keyLight: string
  rimLight: string
  selection: string
  hover: string
  marker: string
  systems: Record<SystemId, string>
}

export type AnatomyEngineThemeOverrides = Partial<
  Omit<AnatomyEngineTheme, 'systems'>
> & {
  systems?: Partial<Record<SystemId, string>>
}

export const DEFAULT_THEME: AnatomyEngineTheme = {
  background: '#e8edf2',
  ground: '#cfd5db',
  platform: '#e5e8eb',
  ring: '#8c969f',
  innerRing: '#a4aeb8',
  skyLight: '#ffffff',
  groundLight: '#a7acb2',
  keyLight: '#fffaf4',
  rimLight: '#e9f0ff',
  selection: '#adede5',
  hover: '#90f6ea',
  marker: '#64748b',
  systems: SYSTEM_COLORS,
}

export function resolveTheme(
  overrides: AnatomyEngineThemeOverrides = {},
): AnatomyEngineTheme {
  return {
    ...DEFAULT_THEME,
    ...overrides,
    systems: { ...DEFAULT_THEME.systems, ...overrides.systems },
  }
}
