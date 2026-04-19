import 'server-only'

import type { AppPrismaClient } from '@/lib/sports-data-normalization/appPrismaClient'
import { resolveNormalizedPlayerSportsProfiles } from '@/lib/sports-data-normalization/resolveNormalizedPlayerSportsProfiles'
import type { NormalizedScoringRules } from '@/lib/league-context-engine/types'
import type { SupportedSport } from '@/lib/sport-scope'
import { effectiveFantasyPoints, collectProjectionNotes } from '@/lib/projection-engine'
import type { TradeConsolePlayerLine } from './types'

/**
 * Merge league-scored projections, injury/news, weather, and trend hints onto trade lines (real DB rows only).
 */
export async function enrichTradeConsolePlayerLines(args: {
  prisma: AppPrismaClient
  sport: SupportedSport
  leagueScoring: NormalizedScoringRules | null | undefined
  lines: TradeConsolePlayerLine[]
}): Promise<TradeConsolePlayerLine[]> {
  const playable = args.lines.filter(
    (line) =>
      line.pricedSource !== 'pick' &&
      line.pricedSource !== 'faab' &&
      Boolean(line.playerId?.trim()),
  )
  if (playable.length === 0) return args.lines

  const rows = await args.prisma.sportsPlayerRecord.findMany({
    where: { id: { in: playable.map((p) => p.playerId!) } },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))

  const players = playable
    .map((line) => {
      const row = byId.get(line.playerId!)
      if (!row) return null
      return {
        name: row.name,
        rosterPlayerId: line.playerId!,
        sportsPlayerRow: {
          name: row.name,
          position: row.position,
          team: row.team,
          injuryStatus: row.injuryStatus,
          projections: row.projections,
          stats: row.stats,
          externalId: row.id,
        },
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)

  if (players.length === 0) return args.lines

  const batch = await resolveNormalizedPlayerSportsProfiles({
    prisma: args.prisma,
    sport: args.sport,
    players,
    leagueScoring: args.leagueScoring ?? null,
    includeClearSportsProjections: players.length <= 28,
  })

  const byName = new Map(batch.players.map((p) => [p.player.name.toLowerCase(), p]))
  const enrichByKey = new Map<string, Partial<TradeConsolePlayerLine>>()

  for (const line of playable) {
    const row = byId.get(line.playerId!)
    if (!row) continue
    const prof = byName.get(row.name.toLowerCase())
    const eff = effectiveFantasyPoints(prof)
    const notes = collectProjectionNotes(prof)
    const key = `${line.playerId}|${line.name.toLowerCase()}`
    enrichByKey.set(key, {
      effectiveProjection: eff,
      projectionNotes: notes.length ? notes : undefined,
      injuryNewsSummary: prof?.injuryNewsLayer?.playerNewsSummary ?? null,
      weatherSummary: prof?.projection.weatherSummary ?? null,
      weatherRiskLevel: prof?.projection.weatherRiskLevel ?? null,
      trendHint: prof?.trendUsage?.trendHint ?? null,
      rollingFppg: prof?.trendUsage?.rollingFppg ?? null,
    })
  }

  return args.lines.map((line) => {
    const key = `${line.playerId}|${line.name.toLowerCase()}`
    const extra = enrichByKey.get(key)
    return extra ? { ...line, ...extra } : line
  })
}

export function sumEffectiveProjections(lines: TradeConsolePlayerLine[]): number | null {
  const vals = lines
    .map((l) => l.effectiveProjection)
    .filter((v): v is number => v != null && Number.isFinite(v))
  if (vals.length === 0) return null
  return Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10
}
