import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueH2H } from '@/lib/league-history/sleeperH2HService'

export const dynamic = 'force-dynamic'

/**
 * Commissioner pulse — inactive/at-risk managers from COUNTED signals only:
 *  - empty starter slots right now (the classic dead-team tell),
 *  - days since that roster's last transaction this season,
 *  - scoring trend from the H2H deep sync (last 3 weeks vs season average).
 * A manager is flagged when ≥2 signals fire. No psychology guessed — every
 * flag lists the exact signals behind it.
 */

const SLEEPER = 'https://api.sleeper.app/v1'
const MAX_WEEKS = 18
const STALE_DAYS = 21

async function j<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SLEEPER}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

type WireRoster = { roster_id: number; owner_id: string | null; starters?: string[] | null }
type WireUser = {
  user_id: string
  display_name: string
  avatar: string | null
  metadata?: { team_name?: string | null } | null
}
type WireTransaction = { status: string; created: number; roster_ids?: number[] | null }

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = req.nextUrl.searchParams?.get('leagueId')?.trim()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ userId: userId }, { teams: { some: { claimedByUserId: userId } } }],
    },
    select: { platform: true, platformLeagueId: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.platform !== 'sleeper' || !league.platformLeagueId) {
    return NextResponse.json({ supported: false as const, platform: league.platform })
  }
  const sid = league.platformLeagueId

  const weekFetches = Array.from({ length: MAX_WEEKS }, (_, i) =>
    j<WireTransaction[]>(`/league/${sid}/transactions/${i + 1}`),
  )
  const [rosters, users, h2h, ...weeks] = await Promise.all([
    j<WireRoster[]>(`/league/${sid}/rosters`),
    j<WireUser[]>(`/league/${sid}/users`),
    getLeagueH2H(sid).catch(() => null),
    ...weekFetches,
  ])
  if (!rosters || !users) {
    return NextResponse.json(
      { supported: true as const, pulse: null, error: 'League feed temporarily unavailable' },
      { status: 502 },
    )
  }

  const lastTxByRoster = new Map<number, number>()
  for (const w of weeks) {
    for (const t of w ?? []) {
      if (t.status !== 'complete') continue
      for (const rid of t.roster_ids ?? []) {
        lastTxByRoster.set(rid, Math.max(lastTxByRoster.get(rid) ?? 0, t.created))
      }
    }
  }
  const usersById = new Map(users.map((u) => [u.user_id, u]))
  const trendByOwner = new Map(
    (h2h?.managers ?? []).map((m) => [m.ownerId, m.trend] as const),
  )
  const now = Date.now()

  const managers = rosters.map((r) => {
    const ownerId = r.owner_id
    const user = ownerId ? usersById.get(ownerId) : undefined
    const emptyStarters = (r.starters ?? []).filter((s) => !s || s === '0').length
    const lastTx = lastTxByRoster.get(r.roster_id) ?? null
    const daysSinceTx = lastTx ? Math.floor((now - lastTx) / 86_400_000) : null
    const trend = ownerId ? trendByOwner.get(ownerId) ?? null : null

    const signals: string[] = []
    if (!ownerId) signals.push('orphan roster (no owner)')
    if (emptyStarters > 0) signals.push(`${emptyStarters} empty starter slot${emptyStarters === 1 ? '' : 's'}`)
    if (daysSinceTx == null) signals.push('no completed transactions this season')
    else if (daysSinceTx >= STALE_DAYS) signals.push(`no transactions in ${daysSinceTx} days`)
    if (trend === 'down') signals.push('scoring trending down (last 3 wks vs season avg)')

    return {
      rosterId: r.roster_id,
      ownerId,
      name: user?.display_name ?? 'Orphan team',
      teamName: user?.metadata?.team_name?.trim() || null,
      avatar: user?.avatar ?? null,
      emptyStarters,
      daysSinceTx,
      trend,
      signals,
      flagged: signals.length >= 2,
    }
  })
  managers.sort((a, b) => b.signals.length - a.signals.length)

  return NextResponse.json({
    supported: true as const,
    pulse: {
      version: 1,
      fetchedAt: new Date().toISOString(),
      flaggedCount: managers.filter((m) => m.flagged).length,
      managers,
      method: `Flagged when ≥2 counted signals fire: empty starter slots, ${STALE_DAYS}+ days without a transaction (or none all season), downward scoring trend, orphan roster.`,
    },
  })
}
