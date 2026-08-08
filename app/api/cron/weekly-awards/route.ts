import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueH2H } from '@/lib/league-history/sleeperH2HService'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'
import { sendNotificationEmail } from '@/lib/resend-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Weekly recap engine (grew out of the weekly-awards automation): once the
 * newest week exists in the H2H sync, post a full recap into league chat —
 * every matchup result, the weekly awards, any ALL-TIME records broken this
 * week, and the standings top three. Once per league per week (deduped via
 * SportsDataCache), posted as the league owner's announcer identity (the same
 * identity Chimmy system messages use).
 *
 * Every number is counted from real matchups: results come straight from the
 * Sleeper week feed, awards/records from the same H2H aggregation the Legacy
 * tab renders. Nothing is synthesized.
 *
 * Email: when WEEKLY_RECAP_EMAIL_ENABLED=1, the recap is also emailed to the
 * league's AllFantasy members (owner + claimed teams). We cannot email
 * leaguemates who aren't on AllFantasy — the chat post covers the league.
 *
 * Cron: Tuesdays (see vercel.json). Manual: a signed-in league member may pass
 * ?leagueId= to post their league's recap now (still deduped).
 */

const SEEN_PREFIX = 'recap-posted:v1:'
const SEEN_TTL_MS = 365 * 24 * 60 * 60 * 1000
const MAX_RECAP_EMAILS = 25

const SLEEPER_BASE = 'https://api.sleeper.app/v1' // db-first-exception: platform feed for the week's results

type WireRoster = {
  roster_id: number
  owner_id: string | null
  settings?: { wins?: number; losses?: number; ties?: number; fpts?: number; fpts_decimal?: number } | null
}
type WireUser = { user_id: string; display_name: string; metadata?: { team_name?: string | null } | null }
type WireMatchup = { roster_id: number; matchup_id: number | null; points: number }

async function j<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SLEEPER_BASE}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

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

async function memberEmails(afLeagueId: string, ownerUserId: string): Promise<string[]> {
  const teams = await prisma.leagueTeam
    .findMany({
      where: { leagueId: afLeagueId, claimedByUserId: { not: null } },
      select: { claimedByUserId: true },
    })
    .catch(() => [] as { claimedByUserId: string | null }[])
  const userIds = Array.from(
    new Set([ownerUserId, ...teams.map((t) => t.claimedByUserId).filter((v): v is string => Boolean(v))]),
  )
  const users = await prisma.appUser
    .findMany({ where: { id: { in: userIds } }, select: { email: true } })
    .catch(() => [] as { email: string | null }[])
  return Array.from(
    new Set(users.map((u) => u.email).filter((e): e is string => Boolean(e && e.includes('@')))),
  ).slice(0, MAX_RECAP_EMAILS)
}

async function postRecapForLeague(
  afLeagueId: string,
  sleeperLeagueId: string,
  ownerUserId: string,
  leagueName: string,
) {
  const h2h = await getLeagueH2H(sleeperLeagueId)
  const awards = h2h?.latestWeekAwards
  if (!h2h || !awards) return { posted: false, reason: 'no completed week synced yet', emailsSent: 0 }

  const seenKey = `${SEEN_PREFIX}${sleeperLeagueId}:${awards.season}:${awards.week}`
  if (await alreadyPosted(seenKey)) return { posted: false, reason: 'already posted', emailsSent: 0 }

  const nameOf = (ownerId: string | null | undefined) =>
    h2h.managers.find((m) => m.ownerId === ownerId)?.name ?? 'Manager'

  const lines: string[] = [`📺 Week ${awards.week} Recap — ${leagueName} (${awards.season})`]

  // ── Results: straight from the Sleeper week feed ──
  const [rosters, users, matchups] = await Promise.all([
    j<WireRoster[]>(`/league/${sleeperLeagueId}/rosters`),
    j<WireUser[]>(`/league/${sleeperLeagueId}/users`),
    j<WireMatchup[]>(`/league/${sleeperLeagueId}/matchups/${awards.week}`),
  ])
  if (rosters && users && matchups) {
    const ownerOf = new Map(rosters.map((r) => [r.roster_id, r.owner_id]))
    const displayOf = new Map(users.map((u) => [u.user_id, u.metadata?.team_name?.trim() || u.display_name]))
    const label = (rosterId: number) => {
      const owner = ownerOf.get(rosterId)
      return (owner && (displayOf.get(owner) ?? nameOf(owner))) || `Team ${rosterId}`
    }
    const byMatchup = new Map<number, WireMatchup[]>()
    for (const m of matchups) {
      if (m.matchup_id == null) continue
      const list = byMatchup.get(m.matchup_id) ?? []
      list.push(m)
      byMatchup.set(m.matchup_id, list)
    }
    const results: string[] = []
    for (const pair of byMatchup.values()) {
      if (pair.length !== 2) continue
      const [a, b] = pair
      if ((a.points ?? 0) === 0 && (b.points ?? 0) === 0) continue
      const [w, l] = a.points >= b.points ? [a, b] : [b, a]
      results.push(
        a.points === b.points
          ? `${label(a.roster_id)} ${a.points.toFixed(1)} TIED ${label(b.roster_id)} ${b.points.toFixed(1)}`
          : `${label(w.roster_id)} ${w.points.toFixed(1)} def. ${label(l.roster_id)} ${l.points.toFixed(1)}`,
      )
    }
    if (results.length > 0) {
      lines.push('', '🏈 Results:')
      lines.push(...results.map((r) => `  ${r}`))
    }

    // ── Standings top three: wins, then points-for ──
    const fpts = (r: WireRoster) => (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100
    const top = [...rosters]
      .sort((x, y) => (y.settings?.wins ?? 0) - (x.settings?.wins ?? 0) || fpts(y) - fpts(x))
      .slice(0, 3)
    if (top.length > 0 && top.some((r) => (r.settings?.wins ?? 0) + (r.settings?.losses ?? 0) > 0)) {
      lines.push(
        '',
        `📈 Top of the table: ${top
          .map((r, i) => `${i + 1}. ${label(r.roster_id)} (${r.settings?.wins ?? 0}-${r.settings?.losses ?? 0})`)
          .join(' · ')}`,
      )
    }
  }

  // ── Weekly awards (same numbers as the Legacy tab) ──
  lines.push('', '🏆 Weekly awards:')
  if (awards.topScore)
    lines.push(`  🚀 Boom of the week: ${nameOf(awards.topScore.ownerId)} · ${awards.topScore.points.toFixed(1)}`)
  if (awards.lowScore)
    lines.push(`  🥀 Bust of the week: ${nameOf(awards.lowScore.ownerId)} · ${awards.lowScore.points.toFixed(1)}`)
  if (awards.narrowEscape)
    lines.push(
      `  😅 Narrow escape: ${nameOf(awards.narrowEscape.winnerOwnerId)} over ${nameOf(awards.narrowEscape.loserOwnerId)} by ${awards.narrowEscape.margin.toFixed(1)}`,
    )
  if (awards.biggestBlowout)
    lines.push(
      `  🔨 Hammer of the week: ${nameOf(awards.biggestBlowout.winnerOwnerId)} over ${nameOf(awards.biggestBlowout.loserOwnerId)} by ${awards.biggestBlowout.margin.toFixed(1)}`,
    )

  // ── All-time records broken THIS week (from the records book) ──
  const r = h2h.records
  const isThisWeek = (season?: string | null, week?: number | null) =>
    season === awards.season && week === awards.week
  const broken: string[] = []
  if (r.highestWeek && isThisWeek(r.highestWeek.season, r.highestWeek.week))
    broken.push(`${nameOf(r.highestWeek.ownerId)} set the ALL-TIME single-week high: ${r.highestWeek.points.toFixed(1)}`)
  if (r.biggestBlowout && isThisWeek(r.biggestBlowout.season, r.biggestBlowout.week))
    broken.push(
      `${nameOf(r.biggestBlowout.winnerOwnerId)} delivered the biggest blowout in league history (by ${r.biggestBlowout.margin.toFixed(1)})`,
    )
  if (r.closestGame && isThisWeek(r.closestGame.season, r.closestGame.week))
    broken.push(
      `${nameOf(r.closestGame.winnerOwnerId)} won the closest game in league history (by ${r.closestGame.margin.toFixed(1)})`,
    )
  if (
    r.longestWinStreak?.active &&
    r.longestWinStreak.toSeason === awards.season &&
    r.longestWinStreak.toWeek === awards.week
  )
    broken.push(
      `${nameOf(r.longestWinStreak.ownerId)} extended the longest win streak ever: ${r.longestWinStreak.length} straight`,
    )
  if (broken.length > 0) {
    lines.push('', '📜 RECORDS BROKEN:')
    lines.push(...broken.map((b) => `  ${b}`))
  }

  lines.push('', 'Counted from real matchups — the full records book lives in the Legacy tab.')

  const created = await createLeagueChatMessage(afLeagueId, ownerUserId, lines.join('\n'), {
    type: 'system',
    metadata: { isSystem: true, weeklyRecap: true, season: awards.season, week: awards.week },
  }).catch(() => null)
  if (!created) return { posted: false, reason: 'chat post failed', emailsSent: 0 }
  await markPosted(seenKey)

  // ── Email the AF members (env-gated so beta rollout is deliberate) ──
  let emailsSent = 0
  if (process.env.WEEKLY_RECAP_EMAIL_ENABLED === '1') {
    const recipients = await memberEmails(afLeagueId, ownerUserId)
    const bodyHtml = lines.map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br/>')
    for (const to of recipients) {
      const sent = await sendNotificationEmail({
        to,
        subject: `Week ${awards.week} recap — ${leagueName}`,
        bodyHtml,
        actionHref: `/league/${afLeagueId}`,
        actionLabel: 'Open your league',
      }).catch(() => ({ ok: false as const }))
      if (sent.ok) emailsSent += 1
    }
  }

  return { posted: true, emailsSent }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronSecret = process.env.CRON_SECRET?.trim()
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`

  if (isCron) {
    const leagues = await prisma.league.findMany({
      where: { platform: 'sleeper', platformLeagueId: { not: null } },
      select: { id: true, name: true, platformLeagueId: true, userId: true },
      take: 100,
    })
    let posted = 0
    let emailsSent = 0
    const errors: string[] = []
    for (const l of leagues) {
      if (!l.platformLeagueId || !l.userId) continue
      try {
        const r = await postRecapForLeague(l.id, l.platformLeagueId, l.userId, l.name)
        if (r.posted) {
          posted += 1
          emailsSent += r.emailsSent
        }
      } catch {
        errors.push(l.id)
      }
    }
    return NextResponse.json({ mode: 'cron' as const, leagues: leagues.length, posted, emailsSent, errors })
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
    select: { id: true, name: true, platform: true, platformLeagueId: true, userId: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.platform !== 'sleeper' || !league.platformLeagueId || !league.userId) {
    return NextResponse.json({ supported: false as const, platform: league.platform })
  }
  const result = await postRecapForLeague(league.id, league.platformLeagueId, league.userId, league.name)
  return NextResponse.json({ mode: 'manual' as const, ...result })
}
