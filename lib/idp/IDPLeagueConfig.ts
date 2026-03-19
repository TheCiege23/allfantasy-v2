/**
 * IDP League config: detect, load, upsert. NFL only.
 * PROMPT 2/6.
 */

import { prisma } from '@/lib/prisma'
import type {
  IdpLeagueConfigLoaded,
  IdpPositionMode,
  IdpRosterPreset,
  IdpScoringPreset,
  IdpScoringOverrides,
  IdpDraftType,
  IdpSlotOverrides,
} from './types'

const IDP_VARIANTS = ['idp', 'IDP', 'DYNASTY_IDP', 'dynasty_idp']

export async function isIdpLeague(leagueId: string): Promise<boolean> {
  const config = await prisma.idpLeagueConfig.findUnique({
    where: { leagueId },
    select: { id: true },
  })
  if (config) return true
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { leagueVariant: true, sport: true },
  })
  return league?.sport === 'NFL' && league?.leagueVariant != null && IDP_VARIANTS.includes(league.leagueVariant)
}

function toPositionMode(s: unknown): IdpPositionMode {
  if (s === 'advanced' || s === 'hybrid') return s
  return 'standard'
}

function toRosterPreset(s: unknown): IdpRosterPreset {
  if (s === 'beginner' || s === 'advanced' || s === 'custom') return s
  return 'standard'
}

function toScoringPreset(s: unknown): IdpScoringPreset {
  if (s === 'tackle_heavy' || s === 'big_play_heavy') return s
  return 'balanced'
}

function toDraftType(s: unknown): IdpDraftType {
  if (s === 'linear' || s === 'auction') return s
  return 'snake'
}

function parseSlotOverrides(raw: unknown): IdpSlotOverrides | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: IdpSlotOverrides = {}
  if (typeof o.DL === 'number') out.DL = o.DL
  if (typeof o.LB === 'number') out.LB = o.LB
  if (typeof o.DB === 'number') out.DB = o.DB
  if (typeof o.IDP_FLEX === 'number') out.IDP_FLEX = o.IDP_FLEX
  if (typeof o.DE === 'number') out.DE = o.DE
  if (typeof o.DT === 'number') out.DT = o.DT
  if (typeof o.CB === 'number') out.CB = o.CB
  if (typeof o.S === 'number') out.S = o.S
  if (typeof o.bench === 'number') out.bench = o.bench
  if (typeof o.ir === 'number') out.ir = o.ir
  return Object.keys(out).length ? out : null
}

function parseScoringOverrides(raw: unknown): IdpScoringOverrides | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: IdpScoringOverrides = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return Object.keys(out).length ? out : null
}

export async function getIdpLeagueConfig(leagueId: string): Promise<IdpLeagueConfigLoaded | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true },
  })
  if (!league || league.sport !== 'NFL') return null

  const row = await prisma.idpLeagueConfig.findUnique({
    where: { leagueId },
  })
  if (row) {
    return {
      leagueId: row.leagueId,
      configId: row.id,
      positionMode: toPositionMode(row.positionMode),
      rosterPreset: toRosterPreset(row.rosterPreset),
      slotOverrides: parseSlotOverrides(row.slotOverrides),
      scoringPreset: toScoringPreset(row.scoringPreset),
      scoringOverrides: parseScoringOverrides(row.scoringOverrides),
      bestBallEnabled: row.bestBallEnabled,
      draftType: toDraftType(row.draftType),
      benchSlots: row.benchSlots,
      irSlots: row.irSlots,
      settingsLockedAt: row.settingsLockedAt,
    }
  }

  if (!league.leagueVariant || !IDP_VARIANTS.includes(league.leagueVariant)) return null

  return {
    leagueId: league.id,
    configId: '',
    positionMode: 'standard',
    rosterPreset: 'standard',
    slotOverrides: null,
    scoringPreset: 'balanced',
    scoringOverrides: null,
    bestBallEnabled: false,
    draftType: 'snake',
    benchSlots: 7,
    irSlots: 2,
    settingsLockedAt: null,
  }
}

export async function upsertIdpLeagueConfig(
  leagueId: string,
  input: Partial<{
    positionMode: string
    rosterPreset: string
    slotOverrides: IdpSlotOverrides | object
    scoringPreset: string
    scoringOverrides: IdpScoringOverrides | object | null
    bestBallEnabled: boolean
    draftType: string
    benchSlots: number
    irSlots: number
    settingsLockedAt: Date | null
  }>
): Promise<IdpLeagueConfigLoaded | null> {
  await prisma.idpLeagueConfig.upsert({
    where: { leagueId },
    create: {
      leagueId,
      positionMode: (input.positionMode as string) ?? 'standard',
      rosterPreset: (input.rosterPreset as string) ?? 'standard',
      slotOverrides: (input.slotOverrides as object) ?? undefined,
      scoringPreset: (input.scoringPreset as string) ?? 'balanced',
      scoringOverrides: (input.scoringOverrides as object) ?? undefined,
      bestBallEnabled: input.bestBallEnabled ?? false,
      draftType: (input.draftType as string) ?? 'snake',
      benchSlots: input.benchSlots ?? 7,
      irSlots: input.irSlots ?? 2,
      settingsLockedAt: input.settingsLockedAt ?? undefined,
    },
    update: {
      ...(input.positionMode !== undefined && { positionMode: input.positionMode }),
      ...(input.rosterPreset !== undefined && { rosterPreset: input.rosterPreset }),
      ...(input.slotOverrides !== undefined && { slotOverrides: input.slotOverrides as object }),
      ...(input.scoringPreset !== undefined && { scoringPreset: input.scoringPreset }),
      ...(input.scoringOverrides !== undefined && { scoringOverrides: input.scoringOverrides as object | undefined }),
      ...(input.bestBallEnabled !== undefined && { bestBallEnabled: input.bestBallEnabled }),
      ...(input.draftType !== undefined && { draftType: input.draftType }),
      ...(input.benchSlots !== undefined && { benchSlots: input.benchSlots }),
      ...(input.irSlots !== undefined && { irSlots: input.irSlots }),
      ...(input.settingsLockedAt !== undefined && { settingsLockedAt: input.settingsLockedAt }),
    },
  })
  return getIdpLeagueConfig(leagueId)
}

/**
 * Get RosterDefaults for an IDP league (from config or fallback). Returns null if league is not IDP.
 * Used by RosterTemplateService and roster resolution to build slots from commissioner presets.
 */
export async function getRosterDefaultsForIdpLeague(leagueId: string): Promise<import('@/lib/sport-defaults/types').RosterDefaults | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  const { getFullRosterDefaultsForIdp } = await import('./IDPRosterPresets')
  return getFullRosterDefaultsForIdp(
    config.rosterPreset,
    config.slotOverrides,
    config.positionMode,
    config.benchSlots,
    config.irSlots
  )
}
