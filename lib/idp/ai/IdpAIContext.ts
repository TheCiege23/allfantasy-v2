/**
 * IDP AI context builders. Deterministic data only — AI explains, recommends, narrates; never decides outcomes.
 */

import { getIdpLeagueConfig, getRosterDefaultsForIdpLeague } from '@/lib/idp'
import type { IdpLeagueConfigLoaded } from '@/lib/idp/types'
import { IDP_SCORING_PRESET_LABELS, IDP_POSITION_MODE_LABELS, IDP_ROSTER_PRESET_LABELS } from '@/lib/idp/IDPScoringPresets'

export type IdpDraftAssistantContext = {
  leagueId: string
  config: IdpLeagueConfigLoaded
  rosterSummary: {
    offenseCount: number
    idpCount: number
    byPosition: Record<string, number>
  }
  starterSlots: { offense: Record<string, number>; idp: Record<string, number> }
  scoringStyle: string
  positionMode: 'grouped' | 'split' | 'hybrid'
  currentRound?: number
  myPicksSoFar?: number
}

export type IdpWaiverAssistantContext = {
  leagueId: string
  config: IdpLeagueConfigLoaded
  scoringStyle: string
  rosterId?: string
  rosterPositions?: string[]
  availableDefenders?: Array<{ name: string; position: string; team?: string; points?: number }>
  myIdpRoster?: Array<{ name: string; position: string }>
}

export type IdpTradeAnalyzerContext = {
  leagueId: string
  config: IdpLeagueConfigLoaded
  scoringStyle: string
  side: 'sender' | 'receiver'
  assets: Array<{ name: string; position: string; isIdp?: boolean }>
  partnerAssets?: Array<{ name: string; position: string; isIdp?: boolean }>
  idpLineupWarning?: string
}

export type IdpStartSitContext = {
  leagueId: string
  config: IdpLeagueConfigLoaded
  scoringStyle: string
  slot: string
  options: Array<{ name: string; position: string; team?: string; points?: number; tackleFloor?: string; bigPlayUpside?: string }>
}

export type IdpLeagueEducatorContext = {
  leagueId: string
  config: IdpLeagueConfigLoaded
  scoringStyle: string
  starterSlotsSummary: string
}

function scoringStyleLabel(preset: string): string {
  return IDP_SCORING_PRESET_LABELS[preset] ?? preset
}

function positionModeLabel(mode: string): string {
  return IDP_POSITION_MODE_LABELS[mode] ?? mode
}

export async function buildIdpDraftAssistantContext(
  leagueId: string,
  rosterId?: string,
  currentRound?: number
): Promise<IdpDraftAssistantContext | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  const defaults = await getRosterDefaultsForIdpLeague(leagueId)
  if (!defaults?.starter_slots) return null

  const offenseSlots: Record<string, number> = {}
  const idpSlots: Record<string, number> = {}
  for (const [k, v] of Object.entries(defaults.starter_slots)) {
    if (typeof v !== 'number' || v <= 0) continue
    if (['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].includes(k)) offenseSlots[k] = v
    else idpSlots[k] = v
  }

  let rosterSummary = { offenseCount: 0, idpCount: 0, byPosition: {} as Record<string, number> }
  if (rosterId) {
    const { prisma } = await import('@/lib/prisma')
    const roster = await (prisma as any).roster.findFirst({
      where: { id: rosterId, leagueId },
      select: { playerData: true },
    })
    const players = Array.isArray(roster?.playerData) ? roster.playerData : []
    for (const p of players) {
      const pos = (p?.position ?? p?.pos ?? '').toUpperCase()
      if (!pos) continue
      rosterSummary.byPosition[pos] = (rosterSummary.byPosition[pos] ?? 0) + 1
      if (['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'].includes(pos)) rosterSummary.idpCount++
      else rosterSummary.offenseCount++
    }
  }

  const positionMode =
    config.positionMode === 'advanced' ? 'split' : config.positionMode === 'hybrid' ? 'hybrid' : 'grouped'

  return {
    leagueId,
    config,
    rosterSummary,
    starterSlots: { offense: offenseSlots, idp: idpSlots },
    scoringStyle: scoringStyleLabel(config.scoringPreset),
    positionMode,
    currentRound,
    myPicksSoFar: rosterSummary.offenseCount + rosterSummary.idpCount,
  }
}

export async function buildIdpWaiverAssistantContext(
  leagueId: string,
  body: { rosterId?: string; availableDefenders?: any[]; myIdpRoster?: any[] }
): Promise<IdpWaiverAssistantContext | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  return {
    leagueId,
    config,
    scoringStyle: scoringStyleLabel(config.scoringPreset),
    rosterId: body.rosterId,
    availableDefenders: body.availableDefenders,
    myIdpRoster: body.myIdpRoster,
  }
}

export async function buildIdpTradeAnalyzerContext(
  leagueId: string,
  body: { side: string; assets: any[]; partnerAssets?: any[]; idpLineupWarning?: string }
): Promise<IdpTradeAnalyzerContext | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  const isIdp = (p: string) => ['DE', 'DT', 'LB', 'CB', 'S', 'SS', 'FS'].includes((p || '').toUpperCase())
  return {
    leagueId,
    config,
    scoringStyle: scoringStyleLabel(config.scoringPreset),
    side: body.side === 'receiver' ? 'receiver' : 'sender',
    assets: (body.assets ?? []).map((a) => ({
      name: a.name ?? a.id ?? '',
      position: (a.position ?? a.pos ?? '').toUpperCase(),
      isIdp: isIdp(a.position ?? a.pos ?? ''),
    })),
    partnerAssets: (body.partnerAssets ?? []).map((a) => ({
      name: a.name ?? a.id ?? '',
      position: (a.position ?? a.pos ?? '').toUpperCase(),
      isIdp: isIdp(a.position ?? a.pos ?? ''),
    })),
    idpLineupWarning: body.idpLineupWarning,
  }
}

export async function buildIdpStartSitContext(
  leagueId: string,
  body: { slot: string; options: any[] }
): Promise<IdpStartSitContext | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  return {
    leagueId,
    config,
    scoringStyle: scoringStyleLabel(config.scoringPreset),
    slot: body.slot ?? 'IDP_FLEX',
    options: (body.options ?? []).map((o) => ({
      name: o.name ?? '',
      position: (o.position ?? o.pos ?? '').toUpperCase(),
      team: o.team,
      points: o.points,
      tackleFloor: o.tackleFloor,
      bigPlayUpside: o.bigPlayUpside,
    })),
  }
}

export async function buildIdpLeagueEducatorContext(leagueId: string): Promise<IdpLeagueEducatorContext | null> {
  const config = await getIdpLeagueConfig(leagueId)
  if (!config) return null
  const defaults = await getRosterDefaultsForIdpLeague(leagueId)
  const parts: string[] = []
  if (defaults?.starter_slots) {
    const idpKeys = Object.entries(defaults.starter_slots)
      .filter(([k, v]) => typeof v === 'number' && v > 0 && !['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
    parts.push(`IDP starter slots: ${idpKeys.join(', ')}`)
  }
  parts.push(`Position mode: ${positionModeLabel(config.positionMode)}`)
  parts.push(`Roster preset: ${IDP_ROSTER_PRESET_LABELS[config.rosterPreset] ?? config.rosterPreset}`)
  return {
    leagueId,
    config,
    scoringStyle: scoringStyleLabel(config.scoringPreset),
    starterSlotsSummary: parts.join('. '),
  }
}
