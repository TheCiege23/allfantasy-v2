import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueH2H } from '@/lib/league-history/sleeperH2HService'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Weekly awards automation: once the newest week's awards exist in the H2H
 * sync, post them into the league chat as a system message — once per league
 * per week (deduped via SportsDataCache), posted as the league owner's
 * announcer identity (the same identity Chimmy system messages already use).
 *
 * Cron: Tuesdays (see vercel.json). Manual: a signed-in league member may pass
 * ?leagueId= to post their league's awards now (still deduped).
 */

const SEEN_PREFIX = 'awards-posted:v1:'
const SEEN_TTL_MS = 365 * 24 * 60 * 60 * 1000

async function alreadyPosted(key: string): Promise<boolean> {
  const row = await prisma.sportsDataCache.findUnique({ where: { cacheKey: key } }).catch(() => null)
  return Boolean(row)
}
async function markPosted(key: string): Promise<void> {
  const data = { version: 1, postedAt: new Date().toISOString() } as unknown as object
  await prisma.sportsDataCache
    .upsert({
      where: { cacheKey: key },
      update: { data, expiresAt: new Date(Date.now() + SEEN_TTL_MS) },
      create: { cacheKey: key, data, expiresAt: new Date(Date.now() + SEEN_TTL_MS) },
    })
    .catch(() => null)
}

async function postAwardsForLeague(afLeagueId: string, sleeperLeagueId: string, ownerUserId: string) {
  const h2h = await getLeagueH2H(sleeperLeagueId)
  const awards = h2h?.latestWeekAwards
  if (!h2h || !awards) return { posted: false, reason: 'no awards yet' }

  const seenKey = `${SEEN_PREFIX}${sleeperLeagueId}:${awards.season}:${awards.week}`
  if (await alreadyPosted(seenKey)) return { posted: false, reason: 'already posted' }

  const nameOf = (ownerId: string | null | undefined) =>
    h2h.managers.find((m) => m.ownerId === ownerId)?.name ?? 'Manager'
  const lines: string[] = [`🏆 Weekly Awards — ${awards.season}, Week ${awards.week}`]
  if (awards.topScore) lines.push(`🚀 Boom of the week: ${nameOf(awards.topScore.ownerId)} · ${awards.topScore.points.toFixed(1)}`)
  if (awards.lowScore) lines.push(`🥀 Bust of the week: ${nameOf(awards.lowScore.ownerId)} · ${awards.lowScore.points.toFixed(1)}`)
  if (awards.narrowEscape)
    lines.push(
      `😅 Narrow escape: ${nameOf(awards.narrowEscape.winnerOwnerId)} over ${nameOf(awards.narrowEscape.loserOwnerId)} by ${awards.narrowEscape.margin.toFixed(1)}`,
    )
  if (awards.biggestBlowout)
    lines.push(
      `🔨 Hammer of the week: ${nameOf(awards.biggestBlowout.winnerOwnerId)} over ${nameOf(awards.biggestBlowout.loserOwnerId)} by ${awards.biggestBlowout.margin.toFixed(1)}`,
    )
  if (lines.length === 1) return { posted: false, reason: 'no award lines' }
  lines.push('Counted from real matchups — full records book lives in the Legacy tab.')

  const created = await createLeagueChatMessage(afLeagueId, ownerUserId, lines.join('\n'), {
    type: 'system',
    metadata: { isSystem: true, weeklyAwards: true, season: awards.season, week: awards.week },
  }).catch(() => null)
  if (!created) return { posted: false, reason: 'chat post failed' }
  await markPosted(seenKey)
  return { posted: true }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET?.trim()
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  if (isCron) {
    const leagues = await prisma.league.findMany({
      where: { platform: 'sleeper', platformLeagueId: { not: null } },
      select: { id: true, platformLeagueId: true, userId: true },
      take: 100,
    })
    let posted = 0
    const errors: string[] = []
    for (const l of leagues) {
      if (!l.platformLeagueId || !l.userId) continue
      try {
        const r = await postAwardsForLeague(l.id, l.platformLeagueId, l.userId)
        if (r.posted) posted += 1
      } catch {
        errors.push(l.id)
      }
    }
    return NextResponse.json({ mode: 'cron' as const, leagues: leagues.length, posted, errors })
  }

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
    select: { id: true, platform: true, platformLeagueId: true, userId: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.platform !== 'sleeper' || !league.platformLeagueId || !league.userId) {
    return NextResponse.json({ supported: false as const, platform: league.platform })
  }
  const result = await postAwardsForLeague(league.id, league.platformLeagueId, league.userId)
  return NextResponse.json({ mode: 'manual' as const, ...result })
}
