import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTrendingPlayers } from '@/lib/sleeper-client'
import type { WaiverDashboardResponse, WaiverDrop, WaiverLeagueRec, WaiverPickup } from '@/app/dashboard/dashboardStripApiTypes'

export const dynamic = 'force-dynamic'

const SLEEPER = 'https://api.sleeper.app/v1'

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
          content: `League: ${args.leagueName}. Sport: ${args.sport}.
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

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { sleeperUserId: true },
  })
  const sleeperUserId = profile?.sleeperUserId?.trim() || null

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
      teams: {
        where: { claimedByUserId: userId },
        select: { platformUserId: true },
        take: 1,
      },
    },
  })

  const recommendations: WaiverLeagueRec[] = []

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

      rec = {
        ...rec,
        pickups,
        drops,
        chimmyAdvice: await chimmyWaiverAdvice({
          leagueName: rec.leagueName,
          sport: prismaSport,
          topPlayers,
          rosterNeeds,
        }),
        waiverDeadline: leagueJson?.settings != null ? 'See league settings for waiver run' : null,
      }
    } catch {
      rec.chimmyAdvice = 'Waiver data unavailable — check your league directly.'
    }

    recommendations.push(rec)
  }

  const body: WaiverDashboardResponse = {
    totalLeagues: recommendations.length,
    recommendations,
  }

  return NextResponse.json(body)
}
