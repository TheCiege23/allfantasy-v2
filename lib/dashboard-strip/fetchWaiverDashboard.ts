import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { getTrendingPlayers } from '@/lib/sleeper-client'
import type { WaiverDashboardResponse, WaiverDrop, WaiverLeagueRec, WaiverPickup } from '@/app/dashboard/dashboardStripApiTypes'
import { getChimmyOfficialTimePrefix } from '@/lib/time-engine/chimmyPromptPrefix'
import { estimateNextWaiversProcessUTC } from '@/lib/time-engine/estimateWaiverRun'

const SLEEPER = 'https://api.sleeper.app/v1' // db-first-exception: base URL constant for dashboard fan-out calls

type SleeperRoster = {
  roster_id?: number
  owner_id?: string
  players?: string[]
  starters?: string[]
}

async function chimmyWaiverAdvice(args: {
  leagueName: string
  sport: string
  topPlayers: string
  rosterNeeds: string
  timeHint?: string
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return 'Add the best available player who fits your roster needs before waivers process.'
  }
  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 180,
      system: 'You are Chimmy, a fantasy sports AI assistant. Be concise.',
      messages: [
        {
          role: 'user',
          content: `${args.timeHint ? `${args.timeHint}\n\n` : ''}League: ${args.leagueName}. Sport: ${args.sport}.
Top waiver adds available: ${args.topPlayers}.
User roster needs: ${args.rosterNeeds}.
In 1-2 sentences, name the best pickup and who to drop.`,
        },
      ],
    })
    const block = msg.content[0]
    return block?.type === 'text' ? block.text.trim() : ''
  } catch {
    return 'Review trending adds and drop your weakest bench piece if you need a roster spot.'
  }
}

function sleeperSportFromDb(sport: string): string {
  return sport.toLowerCase()
}

function countPositionDepth(
  rosterPlayerIds: string[],
  byId: Map<string, { position?: string | null }>
): string {
  const counts: Record<string, number> = {}
  for (const id of rosterPlayerIds) {
    const pos = (byId.get(id)?.position ?? '').toUpperCase().trim()
    if (!pos) continue
    counts[pos] = (counts[pos] ?? 0) + 1
  }
  const weak = Object.entries(counts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([p, n]) => `${p}: ${n}`)
  return weak.length ? weak.join(', ') : 'depth unknown'
}

/** Sleeper waiver recommendations + optional injury pulse for dashboard / Today Actions. */
export async function fetchWaiverDashboard(userId: string): Promise<WaiverDashboardResponse> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { sleeperUserId: true },
  })
  const sleeperUserId = profile?.sleeperUserId?.trim() || null

  const waiverTimeHint = await getChimmyOfficialTimePrefix(userId)

  const sinceInjury = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const leagues = await prisma.league.findMany({
    where: {
      platform: 'sleeper',
      OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      platform: true,
      platformLeagueId: true,
      avatarUrl: true,
      timezone: true,
      waiverProcessTime: true,
      teams: {
        where: { claimedByUserId: userId },
        select: { platformUserId: true },
        take: 1,
      },
    },
  })

  const recommendations: WaiverLeagueRec[] = []
  const sportsInLeagues = Array.from(new Set(leagues.map((l) => String(l.sport))))

  const injuryPulse =
    sportsInLeagues.length > 0
      ? await prisma.injuryReportRecord
          .findMany({
            where: {
              sport: { in: sportsInLeagues },
              reportDate: { gte: sinceInjury },
            },
            orderBy: { reportDate: 'desc' },
            take: 40,
            select: {
              sport: true,
              playerName: true,
              team: true,
              status: true,
              reportDate: true,
            },
          })
          .then((rows) =>
            rows.map((r) => ({
              sport: r.sport,
              playerName: r.playerName,
              team: r.team,
              status: r.status,
              reportDate: r.reportDate.toISOString(),
            }))
          )
      : []

  for (const league of leagues) {
    if (!league.platformLeagueId) continue

    const ownerSleeperId = league.teams[0]?.platformUserId?.trim() || sleeperUserId || null
    if (!ownerSleeperId) continue

    const prismaSport = String(league.sport)
    const sportKey = sleeperSportFromDb(prismaSport)

    let rec: WaiverLeagueRec = {
      leagueId: league.id,
      leagueName: league.name ?? 'League',
      leagueAvatar: league.avatarUrl ?? null,
      sport: prismaSport,
      platform: 'sleeper',
      pickups: [],
      drops: [],
      chimmyAdvice: 'Waiver data unavailable — check your league directly.',
      waiverDeadline: null,
    }

    try {
      const [rostersRes, leagueRes] = await Promise.all([
        fetch(`${SLEEPER}/league/${encodeURIComponent(league.platformLeagueId)}/rosters`, { next: { revalidate: 30 } }),
        fetch(`${SLEEPER}/league/${encodeURIComponent(league.platformLeagueId)}`, { next: { revalidate: 120 } }),
      ])

      const rosters = rostersRes.ok ? ((await rostersRes.json()) as SleeperRoster[]) : []
      const leagueJson = leagueRes.ok ? ((await leagueRes.json()) as { settings?: Record<string, unknown> }) : null

      const roster = Array.isArray(rosters)
        ? rosters.find((r) => String(r.owner_id) === String(ownerSleeperId))
        : undefined
      if (!roster?.players?.length) {
        recommendations.push(rec)
        continue
      }

      const starterSet = new Set(
        (roster.starters ?? []).filter((x): x is string => typeof x === 'string' && x.length > 0)
      )
      const rosterIds = roster.players.filter((x): x is string => typeof x === 'string' && x.length > 0)
      const rosterSet = new Set(rosterIds)

      const trending = await getTrendingPlayers(sportKey, 'add', 24, 40)
      const trendingIds = trending.map((t) => t.player_id).filter((id) => !rosterSet.has(id))
      const topPickIds = trendingIds.slice(0, 8)

      if (topPickIds.length === 0) {
        rec.chimmyAdvice = await chimmyWaiverAdvice({
          leagueName: rec.leagueName,
          sport: prismaSport,
          topPlayers: '(none trending)',
          rosterNeeds: countPositionDepth(rosterIds, new Map()),
          timeHint: waiverTimeHint,
        })
        recommendations.push(rec)
        continue
      }

      const rows = await prisma.sportsPlayer.findMany({
        where: {
          sport: prismaSport,
          externalId: { in: topPickIds.slice(0, 25) },
        },
        select: { externalId: true, name: true, position: true, team: true },
      })
      const byExt = new Map(rows.map((r) => [r.externalId, r]))

      const pickups: WaiverPickup[] = []
      for (const tid of topPickIds.slice(0, 3)) {
        const p = byExt.get(tid)
        const tr = trending.find((x) => x.player_id === tid)
        pickups.push({
          playerId: tid,
          playerName: p?.name ?? `Player ${tid}`,
          position: p?.position ?? '—',
          team: p?.team ?? '—',
          addReason: tr ? `trending add (+${tr.count})` : 'trending add',
        })
      }

      const rosterRows = await prisma.sportsPlayer.findMany({
        where: {
          sport: prismaSport,
          externalId: { in: rosterIds.slice(0, 80) },
        },
        select: { externalId: true, name: true, position: true, team: true },
      })
      const rosterById = new Map(rosterRows.map((r) => [r.externalId, r]))

      const benchIds = rosterIds.filter((id) => !starterSet.has(id))
      const drops: WaiverDrop[] = []
      for (const bid of benchIds.slice(-2)) {
        const p = rosterById.get(bid)
        drops.push({
          playerId: bid,
          playerName: p?.name ?? `Player ${bid}`,
          position: p?.position ?? '—',
          team: p?.team ?? '—',
        })
      }

      const topPlayers = pickups.map((p) => `${p.playerName} (${p.position})`).join('; ')
      const rosterNeeds = countPositionDepth(rosterIds, rosterById)

      const nextWaiver = estimateNextWaiversProcessUTC({
        leagueTimezone: league.timezone,
        waiverProcessTime: league.waiverProcessTime,
      })
      const waiverDeadline = nextWaiver ? nextWaiver.toISOString() : null

      rec = {
        ...rec,
        pickups,
        drops,
        chimmyAdvice: await chimmyWaiverAdvice({
          leagueName: rec.leagueName,
          sport: prismaSport,
          topPlayers,
          rosterNeeds,
          timeHint: waiverTimeHint,
        }),
        waiverDeadline,
      }
    } catch {
      rec.chimmyAdvice = 'Waiver data unavailable — check your league directly.'
    }

    recommendations.push(rec)
  }

  return {
    totalLeagues: recommendations.length,
    recommendations,
    ...(injuryPulse.length > 0 ? { injuryPulse } : {}),
  }
}
