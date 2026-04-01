import type { LeagueSport } from '@prisma/client'
import { getRosterDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type FormatRosterModifierId =
  | 'superflex'
  | 'idp'
  | 'te_premium'
  | 'taxi'
  | 'devy'
  | 'c2c'
  | 'salary_cap'
  | 'best_ball'

export type FormatRosterDefaults = {
  sport: LeagueSport
  starterSlots: Record<string, number>
  benchSlots: number
  irSlots: number
  taxiSlots: number
  devySlots: number
  flexDefinitions: Array<{ slotName: string; allowedPositions: string[] }>
  rosterSize: number
  modifiers: FormatRosterModifierId[]
}

function toRosterSize(slots: FormatRosterDefaults): number {
  return (
    Object.values(slots.starterSlots).reduce((sum, count) => sum + count, 0) +
    slots.benchSlots +
    slots.irSlots +
    slots.taxiSlots +
    slots.devySlots
  )
}

function normalizeVariantForRoster(
  sport: LeagueSport,
  formatId?: string | null,
  modifiers: FormatRosterModifierId[] = []
): string | undefined {
  if (modifiers.includes('idp') && sport === 'NFL') return 'IDP'
  if (formatId === 'devy') return 'devy_dynasty'
  if (formatId === 'c2c') return 'merged_devy_c2c'
  if (modifiers.includes('superflex') && sport === 'NFL') return 'SUPERFLEX'
  return undefined
}

export function resolveFormatRosterDefaults(options: {
  sport: LeagueSport | string
  formatId?: string | null
  modifiers?: FormatRosterModifierId[]
}): FormatRosterDefaults {
  const sport = normalizeToSupportedSport(options.sport)
  const modifiers = [...new Set(options.modifiers ?? [])]
  const variant = normalizeVariantForRoster(sport, options.formatId, modifiers)
  const base = getRosterDefaults(sport, variant)

  const starterSlots = { ...base.starter_slots }
  const flexDefinitions = [...base.flex_definitions]
  let benchSlots = base.bench_slots
  let irSlots = base.IR_slots
  let taxiSlots = base.taxi_slots
  let devySlots = base.devy_slots

  if (modifiers.includes('superflex') && !('SUPERFLEX' in starterSlots) && sport === 'NFL') {
    starterSlots.SUPERFLEX = 1
    flexDefinitions.push({
      slotName: 'SUPERFLEX',
      allowedPositions: ['QB', 'RB', 'WR', 'TE'],
    })
  }

  if (modifiers.includes('taxi') && taxiSlots === 0) {
    taxiSlots = sport === 'NFL' || sport === 'NCAAF' ? 4 : 2
  }

  if (options.formatId === 'dynasty' && benchSlots < 10) {
    benchSlots = sport === 'SOCCER' ? 6 : 10
  }

  if (options.formatId === 'keeper' && benchSlots < 6) {
    benchSlots = 6
  }

  if (options.formatId === 'best_ball' && benchSlots < 8) {
    benchSlots = 8
  }

  if (options.formatId === 'salary_cap' && irSlots < 2) {
    irSlots = 2
  }

  if (options.formatId === 'devy' && devySlots === 0) {
    devySlots = sport === 'NBA' || sport === 'NCAAB' ? 5 : 6
    taxiSlots = Math.max(taxiSlots, sport === 'NBA' || sport === 'NCAAB' ? 4 : 6)
    irSlots = Math.max(irSlots, 3)
  }

  if (options.formatId === 'c2c') {
    devySlots = Math.max(devySlots, sport === 'NBA' || sport === 'NCAAB' ? 10 : 14)
    taxiSlots = Math.max(taxiSlots, sport === 'NBA' || sport === 'NCAAB' ? 4 : 6)
    irSlots = Math.max(irSlots, 3)
  }

  const resolved: FormatRosterDefaults = {
    sport,
    starterSlots,
    benchSlots,
    irSlots,
    taxiSlots,
    devySlots,
    flexDefinitions,
    rosterSize: 0,
    modifiers,
  }

  resolved.rosterSize = toRosterSize(resolved)
  return resolved
}
