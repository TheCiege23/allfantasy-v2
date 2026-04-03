import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const SLEEPER = 'https://api.sleeper.app/v1'

type IssueSeverity = 'critical' | 'warning' | 'info'

type LineupIssue = {
  type: string
  message: string
  playerName?: string
  position?: string
  severity: IssueSeverity
}

export type LineupCheckLeague = {
  leagueId: string
  leagueName: string
  leagueAvatar: string | null
  sport: string
  issues: LineupIssue[]
  chimmyAdvice: string
}

export type LineupCheckResult = {
  totalIssues: number
  leagues: LineupCheckLeague[]
}

async function chimmyLineupAdvice(leagueName: string, issueMessages: string[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey || issueMessages.length === 0) {
    return issueMessages.length
      ? `Review ${issueMessages.length} issue(s) above — set your starters in Team before lock.`
      : 'Your lineups look set.'
  }
  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: 'You are Chimmy, a fantasy sports assistant. Be brief and specific.',
      messages: [
        {
          role: 'user',
          content: `League: ${leagueName}. Issues: ${issueMessages.join(', ')}. In 1-2 sentences, tell the manager what to do right now to fix their lineup.`,
        },
      ],
    })
    const block = msg.content[0]
    return block?.type === 'text' ? block.text.trim() : ''
  } catch {
    return 'Open your team tab and adjust starters before the weekly lock.'
  }
}

type SleeperRoster = {
  roster_id?: number
  owner_id?: string
  starters?: (string | null)[]
  players?: string[]
}

type SleeperMatchup = {
  roster_id?: number
  starters?: (string | null)[]
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

  const out: LineupCheckLeague[] = []
  let totalIssues = 0
  let scannedSleeper = 0

  let nflWeek = 1
  try {
    const st = await fetch(`${SLEEPER}/state/nfl`, { next: { revalidate: 60 } })
    if (st.ok) {
      const j = (await st.json()) as { week?: number }
      if (typeof j.week === 'number' && j.week > 0) nflWeek = j.week
    }
  } catch {
    /* default week */
  }

  for (const league of leagues) {
    if (league.platform !== 'sleeper' || !league.platformLeagueId) continue

    const ownerSleeperId =
      league.teams[0]?.platformUserId?.trim() || sleeperUserId || null
    if (!ownerSleeperId) continue

    scannedSleeper += 1
    const lid = league.platformLeagueId
    const issues: LineupIssue[] = []

    try {
      const [rostersRes, matchRes] = await Promise.all([
        fetch(`${SLEEPER}/league/${encodeURIComponent(lid)}/rosters`, { next: { revalidate: 30 } }),
        fetch(`${SLEEPER}/league/${encodeURIComponent(lid)}/matchups/${nflWeek}`, { next: { revalidate: 30 } }),
      ])

      const rosters = rostersRes.ok ? ((await rostersRes.json()) as SleeperRoster[]) : []
      const matchups = matchRes.ok ? ((await matchRes.json()) as SleeperMatchup[]) : []

      const roster = Array.isArray(rosters)
        ? rosters.find((r) => String(r.owner_id) === String(ownerSleeperId))
        : undefined
      const rosterId = roster?.roster_id
      const matchup = Array.isArray(matchups)
        ? matchups.find((m) => m.roster_id === rosterId)
        : undefined

      const starters = matchup?.starters ?? roster?.starters ?? []
      const emptyCount = starters.filter((slot) => slot == null || slot === '').length
      if (emptyCount > 0) {
        issues.push({
          type: 'empty_starter',
          message:
            emptyCount === 1
              ? 'You have 1 empty starter slot'
              : `You have ${emptyCount} empty starter slots`,
          severity: 'critical',
        })
      }

      const starterIds = starters.filter((x): x is string => typeof x === 'string' && x.length > 0)
      if (starterIds.length > 0) {
        const rows = await prisma.sportsPlayer.findMany({
          where: {
            sport: 'NFL',
            externalId: { in: starterIds.slice(0, 30) },
          },
          select: { externalId: true, name: true, status: true },
        })
        const byId = new Map(rows.map((r) => [r.externalId, r]))
        for (const pid of starterIds) {
          const p = byId.get(pid)
          const st = (p?.status ?? '').toUpperCase()
          if (st === 'OUT' || st === 'IR' || st === 'INJURED RESERVE') {
            issues.push({
              type: 'injured_starter',
              message: `Starting ${p?.name ?? 'a player'} who is listed as ${p?.status ?? st}`,
              playerName: p?.name ?? undefined,
              severity: 'critical',
            })
          }
        }
      }
    } catch {
      issues.push({
        type: 'fetch_error',
        message: 'Could not load lineup data from Sleeper',
        severity: 'info',
      })
    }

    const chimmyAdvice = await chimmyLineupAdvice(league.name ?? 'League', issues.map((i) => i.message))

    if (issues.length > 0) {
      totalIssues += issues.length
      out.push({
        leagueId: league.id,
        leagueName: league.name ?? 'League',
        leagueAvatar: league.avatarUrl ?? null,
        sport: String(league.sport),
        issues,
        chimmyAdvice,
      })
    }
  }

  return NextResponse.json({
    totalIssues,
    leagues: out,
    scannedLeagues: scannedSleeper,
  })
}
