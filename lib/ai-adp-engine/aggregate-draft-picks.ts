/**
 * Universal draft pick aggregation from DraftPick (live) and MockDraft.results.
 * Produces raw (overall, playerName, position, team) per segment for ADP calculation.
 */

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'

export type SegmentKey = { sport: string; leagueType: string; formatKey: string }

export interface RawPick {
  overall: number
  playerName: string
  position: string
  team: string | null
}

export interface SegmentPicks {
  segment: SegmentKey
  picks: RawPick[]
  draftCount: number
}

function normalizeSport(sport: string | null | undefined): string {
  const s = String(sport ?? 'NFL').toUpperCase()
  return SUPPORTED_SPORTS.includes(s as any) ? s : 'NFL'
}

function leagueTypeFromLeague(isDynasty: boolean | null | undefined): string {
  return isDynasty ? 'dynasty' : 'redraft'
}

function formatKeyFromSettings(settings: Record<string, unknown> | null | undefined): string {
  if (!settings) return 'default'
  const scoring = String(settings.scoring ?? settings.draft_pre_draft_ranking_source ?? 'default').toLowerCase()
  if (scoring.includes('ppr') && !scoring.includes('half')) return 'ppr'
  if (scoring.includes('half')) return 'half-ppr'
  if (scoring.includes('superflex') || scoring.includes('sf') || scoring.includes('2qb')) return 'sf'
  if (scoring.includes('standard')) return 'standard'
  return 'default'
}

/** Fetch all completed live draft picks (DraftPick) with league context and group by segment. */
export async function aggregateLiveDraftPicks(
  since?: Date
): Promise<SegmentPicks[]> {
  const whereSession: any = { status: 'completed' }
  if (since) whereSession.updatedAt = { gte: since }

  const picks = await prisma.draftPick.findMany({
    where: { session: whereSession },
    include: {
      session: {
        include: {
          league: {
            select: { sport: true, isDynasty: true, settings: true },
          },
        },
      },
    },
    orderBy: [{ sessionId: 'asc' }, { overall: 'asc' }],
  })

  const bySegment = new Map<string, { segment: SegmentKey; picks: RawPick[]; draftIds: Set<string> }>()

  for (const p of picks) {
    const league = (p.session as any).league
    if (!league) continue
    const sport = normalizeSport(league.sport)
    const leagueType = leagueTypeFromLeague(league.isDynasty)
    const settings = (league.settings as Record<string, unknown>) ?? {}
    const formatKey = formatKeyFromSettings(settings)
    const key = `${sport}|${leagueType}|${formatKey}`
    if (!bySegment.has(key)) {
      bySegment.set(key, {
        segment: { sport, leagueType, formatKey },
        picks: [],
        draftIds: new Set(),
      })
    }
    const seg = bySegment.get(key)!
    seg.draftIds.add(p.sessionId)
    seg.picks.push({
      overall: p.overall,
      playerName: p.playerName,
      position: p.position,
      team: p.team ?? null,
    })
  }

  return Array.from(bySegment.values()).map(({ segment, picks: p, draftIds }) => ({
    segment,
    picks: p,
    draftCount: draftIds.size,
  }))
}

/** Fetch all completed mock draft results and group by segment. */
export async function aggregateMockDraftResults(
  since?: Date
): Promise<SegmentPicks[]> {
  const where: any = { status: 'completed' }
  if (since) where.updatedAt = { gte: since }

  const mocks = await prisma.mockDraft.findMany({
    where,
    select: { id: true, results: true, metadata: true },
  })

  const bySegment = new Map<string, { segment: SegmentKey; picks: RawPick[]; draftIds: Set<string> }>()

  for (const m of mocks) {
    const results = Array.isArray(m.results) ? (m.results as any[]) : []
    const meta = (m.metadata as Record<string, unknown>) ?? {}
    const sport = normalizeSport(meta.sport as string)
    const leagueType = String(meta.leagueType ?? 'redraft').toLowerCase().includes('dynasty') ? 'dynasty' : 'redraft'
    const formatKey = formatKeyFromSettings(meta as Record<string, unknown>)
    const key = `${sport}|${leagueType}|${formatKey}`

    if (!bySegment.has(key)) {
      bySegment.set(key, {
        segment: { sport, leagueType, formatKey },
        picks: [],
        draftIds: new Set(),
      })
    }
    const seg = bySegment.get(key)!
    seg.draftIds.add(m.id)
    for (const r of results) {
      const overall = r.overall ?? r.pickNumber ?? 0
      const playerName = r.playerName ?? r.name ?? ''
      const position = r.position ?? ''
      const team = r.team ?? null
      if (playerName && overall > 0) {
        seg.picks.push({ overall, playerName, position, team })
      }
    }
  }

  return Array.from(bySegment.values()).map(({ segment, picks: p, draftIds }) => ({
    segment,
    picks: p,
    draftCount: draftIds.size,
  }))
}

/** Merge segment picks from live and mock; one SegmentPicks per segment with combined picks. */
export function mergeSegmentPicks(
  live: SegmentPicks[],
  mock: SegmentPicks[]
): SegmentPicks[] {
  const map = new Map<string, SegmentPicks>()
  for (const s of live) {
    const key = `${s.segment.sport}|${s.segment.leagueType}|${s.segment.formatKey}`
    map.set(key, { ...s })
  }
  for (const s of mock) {
    const key = `${s.segment.sport}|${s.segment.leagueType}|${s.segment.formatKey}`
    const existing = map.get(key)
    if (existing) {
      existing.picks = existing.picks.concat(s.picks)
      existing.draftCount += s.draftCount
    } else {
      map.set(key, { ...s })
    }
  }
  return Array.from(map.values())
}
