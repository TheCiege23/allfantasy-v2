/**
 * Resolves roster template by sport (and optional format).
 * Uses DB RosterTemplate + RosterTemplateSlot; falls back to in-memory defaults if no template exists.
 */
import { prisma } from '@/lib/prisma'
import { getPositionsForSport } from './SportRegistry'
import { toSportType, type SportType } from './sport-types'
import { getRosterDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'

export interface RosterTemplateSlotDto {
  slotName: string
  allowedPositions: string[]
  starterCount: number
  benchCount: number
  reserveCount: number
  taxiCount: number
  devyCount: number
  isFlexibleSlot: boolean
  slotOrder: number
}

export interface RosterTemplateDto {
  templateId: string
  sportType: SportType
  name: string
  formatType: string
  slots: RosterTemplateSlotDto[]
}

/**
 * Build default NFL-style roster slots (for fallback when no DB template).
 * Slots: QB, RB, WR, TE, K, DST, FLEX, BENCH, IR.
 */
function defaultNflSlots(): RosterTemplateSlotDto[] {
  const positions = getPositionsForSport('NFL')
  const slots: RosterTemplateSlotDto[] = []
  const starters: Record<string, number> = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }
  let order = 0
  for (const pos of positions) {
    const count = starters[pos] ?? 0
    if (count > 0) {
      slots.push({
        slotName: pos,
        allowedPositions: [pos],
        starterCount: count,
        benchCount: 0,
        reserveCount: 0,
        taxiCount: 0,
        devyCount: 0,
        isFlexibleSlot: false,
        slotOrder: order++,
      })
    }
  }
  slots.push({
    slotName: 'FLEX',
    allowedPositions: ['RB', 'WR', 'TE'],
    starterCount: 1,
    benchCount: 0,
    reserveCount: 0,
    taxiCount: 0,
    devyCount: 0,
    isFlexibleSlot: true,
    slotOrder: order++,
  })
  slots.push({
    slotName: 'BENCH',
    allowedPositions: [...positions],
    starterCount: 0,
    benchCount: 7,
    reserveCount: 0,
    taxiCount: 0,
    devyCount: 0,
    isFlexibleSlot: false,
    slotOrder: order++,
  })
  slots.push({
    slotName: 'IR',
    allowedPositions: [...positions],
    starterCount: 0,
    benchCount: 0,
    reserveCount: 2,
    taxiCount: 0,
    devyCount: 0,
    isFlexibleSlot: false,
    slotOrder: order++,
  })
  return slots
}

/** IDP fixed-position slot counts for NFL IDP / Dynasty IDP variant. */
const NFL_IDP_EXTRA_SLOTS: Record<string, number> = {
  DE: 2,
  DT: 1,
  LB: 2,
  CB: 2,
  S: 2,
}

/** IDP flexible slots: DL (DE+DT), DB (CB+S), IDP_FLEX (any IDP). */
const NFL_IDP_FLEX_SLOTS: { slotName: string; allowedPositions: string[] }[] = [
  { slotName: 'DL', allowedPositions: ['DE', 'DT'] },
  { slotName: 'DB', allowedPositions: ['CB', 'S'] },
  { slotName: 'IDP_FLEX', allowedPositions: ['DE', 'DT', 'LB', 'CB', 'S'] },
]

/**
 * Build default NFL IDP roster (offense + IDP fixed + IDP flex + BENCH/IR with full position set).
 * Offense: QB, RB, WR, TE, K, DST, FLEX. IDP: DE, DT, LB, CB, S, DL, DB, IDP_FLEX. BENCH, IR accept all positions.
 */
function defaultNflIdpSlots(): RosterTemplateSlotDto[] {
  const base = defaultNflSlots()
  const idpPositions = getPositionsForSport('NFL', 'IDP')
  const starterOnly = base.filter((s) => s.slotName !== 'BENCH' && s.slotName !== 'IR')
  const slots: RosterTemplateSlotDto[] = []
  let idx = 0

  for (const s of starterOnly) {
    slots.push({ ...s, slotOrder: idx++ })
  }
  for (const [slotName, count] of Object.entries(NFL_IDP_EXTRA_SLOTS)) {
    slots.push({
      slotName,
      allowedPositions: [slotName],
      starterCount: count,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: idx++,
    })
  }
  for (const flex of NFL_IDP_FLEX_SLOTS) {
    slots.push({
      slotName: flex.slotName,
      allowedPositions: flex.allowedPositions,
      starterCount: 1,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: true,
      slotOrder: idx++,
    })
  }
  const benchDef = base.find((s) => s.slotName === 'BENCH')
  const irDef = base.find((s) => s.slotName === 'IR')
  if (benchDef) {
    slots.push({
      ...benchDef,
      allowedPositions: [...idpPositions],
      slotOrder: idx++,
    })
  }
  if (irDef) {
    slots.push({
      ...irDef,
      allowedPositions: [...idpPositions],
      slotOrder: idx++,
    })
  }
  return slots
}

/** Flexible slot names (flex, util, superflex, pitcher flex, IDP flex, etc.). */
const FLEX_SLOT_NAMES = new Set(['FLEX', 'UTIL', 'G', 'F', 'SUPERFLEX', 'P', 'DL', 'DB', 'IDP_FLEX'])

/**
 * Build default roster slots from sport-defaults registry (single source of truth).
 * Used for NBA, MLB, NHL, NCAAF, NCAAB when no DB template exists.
 */
function buildDefaultSlotsFromRosterDefaults(
  sportType: SportType,
  formatType?: string
): RosterTemplateSlotDto[] {
  const def = getRosterDefaults(sportType, formatType)
  const slots: RosterTemplateSlotDto[] = []
  let order = 0
  const playerPositions = new Set<string>()

  for (const [slotName, count] of Object.entries(def.starter_slots)) {
    if (count <= 0) continue
    const flexDef = def.flex_definitions.find((f) => f.slotName === slotName)
    const allowedPositions = flexDef?.allowedPositions ?? [slotName]
    const isFlex = !!flexDef || FLEX_SLOT_NAMES.has(slotName)
    if (flexDef) flexDef.allowedPositions.forEach((p) => playerPositions.add(p))
    else if (!FLEX_SLOT_NAMES.has(slotName)) playerPositions.add(slotName)
    slots.push({
      slotName,
      allowedPositions,
      starterCount: count,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: isFlex,
      slotOrder: order++,
    })
  }

  const allPositions = playerPositions.size > 0 ? [...playerPositions] : getPositionsForSport(sportType, formatType)
  if (def.bench_slots > 0) {
    slots.push({
      slotName: 'BENCH',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: def.bench_slots,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  if (def.IR_slots > 0) {
    slots.push({
      slotName: 'IR',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: 0,
      reserveCount: def.IR_slots,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  if (def.taxi_slots > 0) {
    slots.push({
      slotName: 'TAXI',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: def.taxi_slots,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  if (def.devy_slots > 0) {
    slots.push({
      slotName: 'DEVY',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: def.devy_slots,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  return slots
}

/**
 * Build roster template slots from a RosterDefaults object (e.g. IDP config-driven).
 */
function buildSlotsFromRosterDefaultsDef(
  def: { starter_slots: Record<string, number>; bench_slots: number; IR_slots: number; flex_definitions: Array<{ slotName: string; allowedPositions: string[] }> },
  allPositionsFallback: string[]
): RosterTemplateSlotDto[] {
  const slots: RosterTemplateSlotDto[] = []
  let order = 0
  const playerPositions = new Set<string>()
  for (const [slotName, count] of Object.entries(def.starter_slots)) {
    if (count <= 0) continue
    const flexDef = def.flex_definitions.find((f) => f.slotName === slotName)
    const allowedPositions = flexDef?.allowedPositions ?? [slotName]
    const isFlex = !!flexDef || FLEX_SLOT_NAMES.has(slotName)
    if (flexDef) flexDef.allowedPositions.forEach((p) => playerPositions.add(p))
    else if (!FLEX_SLOT_NAMES.has(slotName)) playerPositions.add(slotName)
    slots.push({
      slotName,
      allowedPositions,
      starterCount: count,
      benchCount: 0,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: isFlex,
      slotOrder: order++,
    })
  }
  const allPositions = playerPositions.size > 0 ? [...playerPositions] : allPositionsFallback
  if (def.bench_slots > 0) {
    slots.push({
      slotName: 'BENCH',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: def.bench_slots,
      reserveCount: 0,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  if (def.IR_slots > 0) {
    slots.push({
      slotName: 'IR',
      allowedPositions: allPositions,
      starterCount: 0,
      benchCount: 0,
      reserveCount: def.IR_slots,
      taxiCount: 0,
      devyCount: 0,
      isFlexibleSlot: false,
      slotOrder: order++,
    })
  }
  return slots
}

/**
 * Build default slots for a sport (and optional format). NFL and SOCCER use custom builders; others use registry.
 */
function defaultSlotsForSport(sportType: SportType, formatType?: string): RosterTemplateSlotDto[] {
  if (sportType === 'NFL') {
    if (formatType === 'IDP' || formatType === 'idp') return defaultNflIdpSlots()
    return defaultNflSlots()
  }
  if (sportType === 'SOCCER') return defaultSoccerSlots()
  return buildDefaultSlotsFromRosterDefaults(sportType, formatType)
}

/**
 * Build default Soccer roster slots (GKP/GK, DEF, MID, FWD, UTIL, BENCH, IR).
 * GKP slot accepts both GKP and GK positions for commissioner/feed flexibility.
 */
function defaultSoccerSlots(): RosterTemplateSlotDto[] {
  const positions = getPositionsForSport('SOCCER')
  const slots: RosterTemplateSlotDto[] = []
  const starters: Record<string, number> = { GKP: 1, DEF: 4, MID: 4, FWD: 2, UTIL: 1 }
  let order = 0
  for (const pos of positions) {
    const count = starters[pos] ?? 0
    if (count > 0) {
      slots.push({
        slotName: pos,
        allowedPositions: pos === 'UTIL' ? ['GKP', 'DEF', 'MID', 'FWD'] : pos === 'GKP' ? ['GKP', 'GK'] : [pos],
        starterCount: count,
        benchCount: 0,
        reserveCount: 0,
        taxiCount: 0,
        devyCount: 0,
        isFlexibleSlot: pos === 'UTIL',
        slotOrder: order++,
      })
    }
  }
  slots.push({
    slotName: 'BENCH',
    allowedPositions: [...positions],
    starterCount: 0,
    benchCount: 4,
    reserveCount: 0,
    taxiCount: 0,
    devyCount: 0,
    isFlexibleSlot: false,
    slotOrder: order++,
  })
  slots.push({
    slotName: 'IR',
    allowedPositions: [...positions],
    starterCount: 0,
    benchCount: 0,
    reserveCount: 1,
    taxiCount: 0,
    devyCount: 0,
    isFlexibleSlot: false,
    slotOrder: order++,
  })
  return slots
}

/**
 * Get roster template for sport (and optional format). Prefer DB; else in-memory default.
 * When leagueId is provided and league is IDP with config, uses commissioner IDP preset (roster slots from IdpLeagueConfig).
 */
export async function getRosterTemplate(
  sportType: SportType | string,
  formatType: string = 'standard',
  leagueId?: string
): Promise<RosterTemplateDto> {
  const sport = toSportType(typeof sportType === 'string' ? sportType : sportType)
  if (leagueId && sport === 'NFL' && (formatType === 'IDP' || formatType === 'idp')) {
    try {
      const { getRosterDefaultsForIdpLeague } = await import('@/lib/idp/IDPLeagueConfig')
      const idpDefaults = await getRosterDefaultsForIdpLeague(leagueId)
      if (idpDefaults) {
        const positions = getPositionsForSport('NFL', 'IDP')
        const slots = buildSlotsFromRosterDefaultsDef(idpDefaults, positions)
        return {
          templateId: `default-NFL-IDP-${leagueId}`,
          sportType: 'NFL',
          name: 'IDP League Roster',
          formatType: 'IDP',
          slots,
        }
      }
    } catch {
      // fall through to default
    }
  }
  const template = await prisma.rosterTemplate.findUnique({
    where: {
      uniq_roster_template_sport_format: { sportType: sport, formatType },
    },
    include: { slots: { orderBy: { slotOrder: 'asc' } } },
  })
  if (template) {
    return {
      templateId: template.id,
      sportType: sport,
      name: template.name,
      formatType: template.formatType,
      slots: template.slots.map((s) => ({
        slotName: s.slotName,
        allowedPositions: (s.allowedPositions as string[]) ?? [],
        starterCount: s.starterCount,
        benchCount: s.benchCount,
        reserveCount: s.reserveCount,
        taxiCount: s.taxiCount,
        devyCount: s.devyCount,
        isFlexibleSlot: s.isFlexibleSlot,
        slotOrder: s.slotOrder,
      })),
    }
  }
  return {
    templateId: `default-${sport}-${formatType}`,
    sportType: sport,
    name: `Default ${sport} ${formatType}`,
    formatType,
    slots: defaultSlotsForSport(sport, formatType),
  }
}

/**
 * Ensure a league has a roster config (template id + overrides). Creates from template if missing.
 * When only in-memory default exists, no DB row is created; we return the default template id.
 */
export async function getOrCreateLeagueRosterConfig(
  leagueId: string,
  sportType: SportType | string,
  formatType: string = 'standard'
): Promise<{ templateId: string; overrides: Record<string, unknown> | null }> {
  const existing = await prisma.leagueRosterConfig.findUnique({
    where: { leagueId },
  })
  if (existing) {
    return {
      templateId: existing.templateId,
      overrides: (existing.overrides as Record<string, unknown>) ?? null,
    }
  }
  const template = await getRosterTemplate(sportType, formatType)
  const isDefault = template.templateId.startsWith('default-')
  if (!isDefault) {
    await prisma.leagueRosterConfig.create({
      data: { leagueId, templateId: template.templateId, overrides: undefined },
    })
  }
  return { templateId: template.templateId, overrides: null }
}
