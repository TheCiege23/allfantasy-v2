import 'server-only'

import type { InjuryReportRecord, SportsPlayerRecord } from '@prisma/client'
import { assertLeagueMember } from '@/lib/league/league-access'
import { openaiChatText } from '@/lib/openai-client'
import { prisma } from '@/lib/prisma'
import { getRosterPlayerIds } from '@/lib/waiver-wire/roster-utils'
import { normalizeToSupportedSport, SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'
import type {
  InjuryImpactDashboardInput,
  InjuryImpactDashboardOutput,
  InjuryPlayerIntelRow,
  InjurySeverityBucket,
  InjuryStatusFilterId,
  InjuryTimeHorizonId,
} from './types'

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function sinceForHorizon(h: InjuryTimeHorizonId): Date {
  const now = Date.now()
  switch (h) {
    case 'today':
      return new Date(now - 24 * 60 * 60 * 1000)
    case 'this_week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000)
    case 'next_2_weeks':
      return new Date(now - 14 * 24 * 60 * 60 * 1000)
    case 'next_month':
      return new Date(now - 30 * 24 * 60 * 60 * 1000)
    case 'rest_of_season':
    case 'playoff_window':
      return new Date(now - 45 * 24 * 60 * 60 * 1000)
    case 'dynasty_long':
      return new Date(now - 90 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now - 21 * 24 * 60 * 60 * 1000)
  }
}

function bucketFromStatus(status: string | null | undefined): InjurySeverityBucket {
  if (!status?.trim()) return 'other'
  const u = status.toLowerCase()
  if (u.includes('ir') || u.includes('injured reserve')) return 'ir'
  if (/\bout\b/.test(u) && !u.includes('without')) return 'out'
  if (u.includes('suspend')) return 'suspended'
  if (u.includes('doubt')) return 'doubtful'
  if (u.includes('quest')) return 'questionable'
  if (u.includes('prob')) return 'probable'
  if (u.includes('game time') || u.includes('gtd') || u === 'gtd') return 'gtd'
  if (u.includes('day-to-day') || u.includes('day to day')) return 'questionable'
  if (u.includes('week-to-week') || u.includes('week to week')) return 'doubtful'
  if (u.includes('pup') || u.includes('nfi')) return 'out'
  return 'other'
}

function baseScoreFromBucket(b: InjurySeverityBucket): number {
  switch (b) {
    case 'out':
      return 92
    case 'ir':
      return 88
    case 'suspended':
      return 85
    case 'doubtful':
      return 72
    case 'gtd':
      return 58
    case 'questionable':
      return 48
    case 'probable':
      return 28
    default:
      return 38
  }
}

function statusFilterAllows(bucket: InjurySeverityBucket, filter: InjuryStatusFilterId): boolean {
  if (filter === 'all') return true
  const map: Record<InjuryStatusFilterId, InjurySeverityBucket[]> = {
    all: [],
    healthy_monitoring: ['probable', 'other'],
    questionable: ['questionable'],
    doubtful: ['doubtful'],
    out: ['out'],
    ir: ['ir'],
    suspended: ['suspended'],
    gtd: ['gtd'],
    day_to_day: ['questionable', 'gtd'],
    week_to_week: ['doubtful', 'questionable'],
    long_term: ['out', 'ir'],
    returning_soon: ['probable', 'questionable'],
  }
  const allowed = map[filter]
  if (!allowed?.length) return true
  return allowed.includes(bucket)
}

function getStarterIds(playerData: unknown): string[] {
  if (!playerData || typeof playerData !== 'object' || Array.isArray(playerData)) return []
  const s = (playerData as Record<string, unknown>).starters
  if (!Array.isArray(s)) return []
  return s.map((x) => String(x)).filter(Boolean)
}

function rowFromInjuryReport(
  r: InjuryReportRecord,
  opts: {
    onRoster: boolean
    isStarter: boolean
    headshotUrl: string | null
    dataGaps: string[]
  },
): InjuryPlayerIntelRow {
  const bucket = bucketFromStatus(r.status)
  let impact = baseScoreFromBucket(bucket)
  if (opts.isStarter) impact = clamp(impact + 12, 0, 100)
  const lineup = clamp(impact * 0.92, 0, 100)
  const urg = clamp((baseScoreFromBucket(bucket) / 100) * (opts.isStarter ? 92 : 55), 0, 100)
  const conf = 0.78
  return {
    playerKey: `${r.sport}:${r.playerId}`,
    name: r.playerName,
    position: '—',
    team: r.team,
    sport: r.sport,
    statusRaw: r.status,
    severity: bucket,
    source: 'injury_report',
    sourceId: r.id,
    notes: r.notes ?? null,
    practice: r.practice ?? null,
    gameStatus: r.gameStatus ?? null,
    reportDate: r.reportDate.toISOString(),
    lastUpdated: null,
    onRoster: opts.onRoster,
    isStarter: opts.isStarter,
    headshotUrl: opts.headshotUrl,
    impactScore: Math.round(impact * 10) / 10,
    lineupDisruption: Math.round(lineup * 10) / 10,
    replacementUrgency: Math.round(urg * 10) / 10,
    confidence: Math.round(conf * 100),
    dataGaps: opts.dataGaps,
  }
}

function rowFromSportsRecord(
  r: SportsPlayerRecord,
  opts: { onRoster: boolean; isStarter: boolean; dataGaps: string[] },
): InjuryPlayerIntelRow {
  const bucket = bucketFromStatus(r.injuryStatus)
  let impact = baseScoreFromBucket(bucket)
  if (opts.isStarter) impact = clamp(impact + 10, 0, 100)
  return {
    playerKey: `${r.sport}:${r.id}`,
    name: r.name,
    position: r.position,
    team: r.team,
    sport: r.sport,
    statusRaw: r.injuryStatus ?? 'Unknown',
    severity: bucket,
    source: 'sports_player_record',
    sourceId: r.id,
    notes: r.injuryNotes ?? null,
    practice: null,
    gameStatus: null,
    reportDate: null,
    lastUpdated: r.lastUpdated.toISOString(),
    onRoster: opts.onRoster,
    isStarter: opts.isStarter,
    headshotUrl: r.headshotUrl ?? r.headshotUrlSm ?? null,
    impactScore: Math.round(impact * 10) / 10,
    lineupDisruption: Math.round(clamp(impact * 0.88, 0, 100) * 10) / 10,
    replacementUrgency: Math.round(clamp((baseScoreFromBucket(bucket) / 100) * (opts.isStarter ? 88 : 50), 0, 100) * 10) / 10,
    confidence: 52,
    dataGaps: [...opts.dataGaps, 'Practice/game designation from official report not in DB row — confirm closer to kickoff.'],
  }
}

export async function runInjuryImpactDashboard(input: InjuryImpactDashboardInput): Promise<InjuryImpactDashboardOutput> {
  const dataGaps: string[] = []
  const since = sinceForHorizon(input.timeHorizon)

  const sports: SupportedSport[] =
    input.sportFilter === 'ALL' ? [...SUPPORTED_SPORTS] : [normalizeToSupportedSport(input.sportFilter)]

  let leagueName: string | null = null
  let leagueSport: SupportedSport | null = null
  let analysisScope: 'league' | 'general' = 'general'
  let rosterIds: string[] = []
  const starterSet = new Set<string>()

  if (input.leagueId?.trim()) {
    const access = await assertLeagueMember(input.leagueId.trim(), input.userId)
    if (!access.ok) {
      return { ok: false, error: 'League not found or access denied', code: 'FORBIDDEN' }
    }
    const league = await prisma.league.findFirst({
      where: { id: input.leagueId.trim() },
      include: { teams: true },
    })
    if (!league) {
      return { ok: false, error: 'League not found', code: 'FORBIDDEN' }
    }
    leagueName = league.name
    leagueSport = normalizeToSupportedSport(String(league.sport))
    analysisScope = 'league'

    const rosters = await prisma.roster.findMany({ where: { leagueId: league.id } })
    const teams = league.teams

    const pickRosters = (): typeof rosters => {
      if (input.teamContext === 'neutral') return []
      if (input.teamContext === 'league_wide_risk' || input.teamContext === 'full_league') return rosters
      if (input.teamContext === 'my_team') {
        const lt = teams.find((t) => t.claimedByUserId === input.userId)
        if (!lt) {
          dataGaps.push('No team claimed for your account in this league — showing league-wide injury intelligence.')
          return rosters
        }
        const r = rosters.find(
          (x) => x.platformUserId === lt.platformUserId || x.platformUserId === lt.externalId,
        )
        return r ? [r] : []
      }
      const specificTeamId = input.specificTeamExternalId?.trim()
      if (input.teamContext === 'specific_team' && specificTeamId) {
        const lt = teams.find((t) => t.externalId === specificTeamId)
        if (!lt) {
          dataGaps.push('Specific team not found — falling back to full league rosters.')
          return rosters
        }
        const r = rosters.find(
          (x) => x.platformUserId === lt.platformUserId || x.platformUserId === lt.externalId,
        )
        return r ? [r] : []
      }
      const opponentTeamId = input.opponentTeamExternalId?.trim()
      if (input.teamContext === 'opponent_team' && opponentTeamId) {
        const lt = teams.find((t) => t.externalId === opponentTeamId)
        if (!lt) {
          dataGaps.push('Opponent team not resolved — falling back to full league.')
          return rosters
        }
        const r = rosters.find(
          (x) => x.platformUserId === lt.platformUserId || x.platformUserId === lt.externalId,
        )
        return r ? [r] : []
      }
      return rosters
    }

    const picked = pickRosters()

    for (const r of picked) {
      const ids = getRosterPlayerIds(r.playerData)
      rosterIds.push(...ids)
      for (const sid of getStarterIds(r.playerData)) starterSet.add(sid)
    }
    rosterIds = [...new Set(rosterIds)]

    if (input.sportFilter !== 'ALL' && input.sportFilter.toUpperCase() !== String(league.sport).toUpperCase()) {
      dataGaps.push('Sport filter does not match league sport — injury rows are still filtered by the sport filter for cross-checks.')
    }
  } else {
    dataGaps.push('No league selected — analysis is general (sport feed + player records), not tied to your roster.')
  }

  const sportWhere = { in: sports as unknown as string[] }

  const [injuryReports, playerInjuries] = await Promise.all([
    prisma.injuryReportRecord.findMany({
      where: {
        sport: sportWhere,
        reportDate: { gte: since },
      },
      orderBy: { reportDate: 'desc' },
      take: 120,
    }),
    prisma.sportsPlayerRecord.findMany({
      where: {
        sport: sportWhere,
        injuryStatus: { not: null },
        NOT: { injuryStatus: '' },
      },
      orderBy: { lastUpdated: 'desc' },
      take: 80,
    }),
  ])

  const rosterSet = new Set(rosterIds)
  const sportsPlayers = await prisma.sportsPlayer.findMany({
    where: {
      sport: sportWhere,
      OR: [{ sleeperId: { in: rosterIds } }, { externalId: { in: rosterIds } }],
    },
    select: { sleeperId: true, externalId: true, name: true, sport: true },
  })
  const nameByRosterId = new Map<string, string>()
  for (const sp of sportsPlayers) {
    if (sp.sleeperId) nameByRosterId.set(sp.sleeperId, sp.name)
    if (sp.externalId) nameByRosterId.set(sp.externalId, sp.name)
  }

  const isOnRoster = (playerId: string, playerName: string): boolean => {
    if (rosterSet.size === 0) return false
    if (rosterSet.has(playerId)) return true
    const n = nameByRosterId.get(playerId)
    if (n && playerName && n.toLowerCase() === playerName.toLowerCase()) return true
    return false
  }

  const isStarter = (playerId: string): boolean => starterSet.has(playerId)

  const seen = new Set<string>()
  const rows: InjuryPlayerIntelRow[] = []

  const recordBySportName = new Map<string, SportsPlayerRecord>()
  for (const rec of playerInjuries) {
    recordBySportName.set(`${rec.sport}:${rec.name.toLowerCase()}`, rec)
  }

  const injByPlayer = new Map<string, InjuryReportRecord>()
  for (const r of injuryReports) {
    const k = `${r.sport}:${r.playerId}`
    if (!injByPlayer.has(k)) injByPlayer.set(k, r)
  }

  for (const r of injByPlayer.values()) {
    if (!sports.includes(r.sport as SupportedSport)) continue
    const b = bucketFromStatus(r.status)
    if (!statusFilterAllows(b, input.statusFilter)) continue
    const on = analysisScope === 'league' ? isOnRoster(r.playerId, r.playerName) : true
    if (
      analysisScope === 'league' &&
      input.teamContext !== 'league_wide_risk' &&
      input.teamContext !== 'full_league' &&
      input.teamContext !== 'neutral' &&
      !on
    ) {
      continue
    }
    if (analysisScope === 'league' && (input.teamContext === 'my_team' || input.teamContext === 'specific_team' || input.teamContext === 'opponent_team') && !on) {
      continue
    }

    const spRec = recordBySportName.get(`${r.sport}:${r.playerName.toLowerCase()}`) ?? null

    const row = rowFromInjuryReport(r, {
      onRoster: on,
      isStarter: isStarter(r.playerId),
      headshotUrl: spRec?.headshotUrl ?? spRec?.headshotUrlSm ?? null,
      dataGaps: [],
    })
    if (spRec?.position) {
      row.position = spRec.position
    }
    const key = row.playerKey
    if (seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }

  for (const rec of playerInjuries) {
    if (!sports.includes(rec.sport as SupportedSport)) continue
    const b = bucketFromStatus(rec.injuryStatus)
    if (!statusFilterAllows(b, input.statusFilter)) continue
    const key = `${rec.sport}:${rec.id}`
    if (seen.has(key)) continue

    const on = analysisScope === 'league' ? rosterSet.has(rec.id) || isOnRoster(rec.id, rec.name) : true
    if (
      analysisScope === 'league' &&
      input.teamContext !== 'league_wide_risk' &&
      input.teamContext !== 'full_league' &&
      input.teamContext !== 'neutral' &&
      !on
    ) {
      continue
    }
    if (analysisScope === 'league' && (input.teamContext === 'my_team' || input.teamContext === 'specific_team' || input.teamContext === 'opponent_team') && !on) {
      continue
    }

    seen.add(key)
    rows.push(
      rowFromSportsRecord(rec, {
        onRoster: on,
        isStarter: isStarter(rec.id),
        dataGaps: [],
      }),
    )
  }

  rows.sort((a, b) => b.impactScore - a.impactScore)

  if (!input.toggles.includePractice) {
    dataGaps.push('Practice tags omitted from narrative weighting (toggle off).')
  }
  if (!input.toggles.includeNews) {
    dataGaps.push('News aggregation not merged in this response — use Injury brief + connected feeds.')
  }

  const summaryCounts = {
    outIr: rows.filter((x) => x.severity === 'out' || x.severity === 'ir').length,
    doubtful: rows.filter((x) => x.severity === 'doubtful').length,
    questionable: rows.filter((x) => x.severity === 'questionable' || x.severity === 'gtd').length,
    limited: rows.filter((x) => x.practice?.toLowerCase().includes('limited')).length,
    fullPractice: rows.filter((x) => x.practice?.toLowerCase().includes('full')).length,
  }

  const overallRisk =
    rows.length === 0 ? 12 : clamp(rows.reduce((s, x) => s + x.impactScore, 0) / rows.length, 8, 98)

  const chimmyPayload: Record<string, unknown> = {
    tool: 'injury_impact',
    analysisScope,
    leagueName,
    leagueSport,
    sportFilter: input.sportFilter,
    teamContext: input.teamContext,
    statusFilter: input.statusFilter,
    timeHorizon: input.timeHorizon,
    toggles: input.toggles,
    summaryCounts,
    overallRisk,
    players: rows.slice(0, 40).map((p) => ({
      name: p.name,
      sport: p.sport,
      status: p.statusRaw,
      severity: p.severity,
      onRoster: p.onRoster,
      starter: p.isStarter,
      impactScore: p.impactScore,
      source: p.source,
      reportDate: p.reportDate,
    })),
    dataGaps,
  }

  let aiNarrative: string | null = null
  if (!input.skipAi) {
    try {
      const res = await openaiChatText({
        messages: [
          {
            role: 'system',
            content:
              'You are Chimmy (AllFantasy). Summarize injury impact in 5–8 sentences. Use ONLY the JSON facts. Never invent players, injuries, or timelines. If data is thin, say so. No markdown.',
          },
          { role: 'user', content: JSON.stringify(chimmyPayload).slice(0, 12000) },
        ],
        temperature: 0.2,
        maxTokens: 520,
        skipCache: true,
      })
      if (res.ok) aiNarrative = res.text.trim() || null
    } catch {
      aiNarrative = null
    }
  }

  return {
    ok: true,
    analysisScope,
    leagueName,
    sportLabel: input.sportFilter === 'ALL' ? 'All sports' : input.sportFilter,
    leagueSport,
    overallRisk: Math.round(overallRisk * 10) / 10,
    summaryCounts,
    players: rows,
    aiNarrative,
    chimmyPayload,
    dataGaps,
    degraded: dataGaps.length > 0 || rows.length === 0,
    computedAt: new Date().toISOString(),
  }
}
