import type { Prisma } from '@prisma/client'

export type RosterSettingsShape = {
  isAdvertised?: boolean
  aiManaged?: boolean
  aiManagerType?: 'season_long' | 'until_claimed'
}

export function parseRosterSettings(raw: unknown): RosterSettingsShape {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as RosterSettingsShape
}

export function mergeRosterSettings(existing: unknown, patch: RosterSettingsShape): Prisma.InputJsonValue {
  const base = parseRosterSettings(existing)
  return { ...base, ...patch } as Prisma.InputJsonValue
}
