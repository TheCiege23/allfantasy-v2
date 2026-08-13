import 'server-only'

import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/get-base-url'
import { sendTemplatedEmail } from '@/lib/resend-client'
import { getTradeGrades } from '@/lib/trade-intel/sleeperTradeGradeService'
import { buildTradeGradeEmail } from '@/lib/trade-intel/tradeGradeEmail'

/**
 * tradeNotifyService — "your league just traded" with INSTANT grades.
 *
 * Flow per league (invoked by the cron route):
 *  1. Cheap detection: read the CURRENT season's transaction feed and collect
 *     completed trade ids.
 *  2. Diff against the seen-set stored in SportsDataCache (no migrations).
 *  3. On a new trade: force-refresh the graded ledger (so the fresh trade is
 *     graded), then email every AF member of that league the initial grades
 *     with a link to the Legacy ledger.
 *
 * Honesty + noise rules:
 *  - BOOTSTRAP: the first run for a league records every existing trade as
 *    seen and sends NOTHING — history is browsable in the app; email is only
 *    for what happens after you turned this on.
 *  - Emails go only to AF users attached to the league (owner + claimed
 *    teams). We cannot email league members who aren't on AllFantasy.
 *  - Every failure is contained per-league; one broken league never blocks
 *    the rest of the sweep.
 */

const SLEEPER = 'https://api.sleeper.app/v1'
const SEEN_PREFIX = 'trade-notify:v1:'
const SEEN_TTL_MS = 2 * 365 * 24 * 60 * 60 * 1000
const MAX_WEEKS = 18

async function j<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${SLEEPER}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

type SeenRecord = { version: 1; seen: string[]; lastRunIso: string }

async function readSeen(sleeperLeagueId: string): Promise<SeenRecord | null> {
  const row = await prisma.sportsDataCache
    .findUnique({ where: { cacheKey: `${SEEN_PREFIX}${sleeperLeagueId}` } })
    .catch(() => null)
  const data = row?.data as unknown as SeenRecord | null
  return data?.version === 1 && Array.isArray(data.seen) ? data : null
}

async function writeSeen(sleeperLeagueId: string, seen: string[]): Promise<void> {
  const cacheKey = `${SEEN_PREFIX}${sleeperLeagueId}`
  const data = { version: 1, seen: seen.slice(-500), lastRunIso: new Date().toISOString() } as unknown as object
  const expiresAt = new Date(Date.now() + SEEN_TTL_MS)
  await prisma.sportsDataCache
    .upsert({ where: { cacheKey }, update: { data, expiresAt }, create: { cacheKey, data, expiresAt } })
    .catch(() => null)
}

/** Completed trade ids in the CURRENT season's feed (cheap: 18 week fetches). */
async function currentCompletedTradeIds(sleeperLeagueId: string): Promise<string[] | null> {
  const weeks = await Promise.all(
    Array.from({ length: MAX_WEEKS }, (_, i) =>
      j<{ transaction_id: string; type: string; status: string }[]>(
        `/league/${sleeperLeagueId}/transactions/${i + 1}`,
      ),
    ),
  )
  if (weeks.every((w) => w == null)) return null
  const ids: string[] = []
  for (const w of weeks) {
    for (const t of w ?? []) {
      if (t.type === 'trade' && t.status === 'complete') ids.push(t.transaction_id)
    }
  }
  return ids
}

export type LeagueNotifyResult = {
  sleeperLeagueId: string
  checked: boolean
  bootstrap: boolean
  newTrades: number
  emailsSent: number
  error?: string
}

/** Detect + notify for one Sleeper league id (may map to several AF league rows). */
export async function detectAndNotifyLeague(sleeperLeagueId: string): Promise<LeagueNotifyResult> {
  const base: LeagueNotifyResult = {
    sleeperLeagueId,
    checked: false,
    bootstrap: false,
    newTrades: 0,
    emailsSent: 0,
  }
  try {
    const currentIds = await currentCompletedTradeIds(sleeperLeagueId)
    if (currentIds == null) return { ...base, error: 'transaction feed unavailable' }
    base.checked = true

    const seenRecord = await readSeen(sleeperLeagueId)
    if (!seenRecord) {
      // First run: record history, notify nothing (no retro spam).
      await writeSeen(sleeperLeagueId, currentIds)
      return { ...base, bootstrap: true }
    }

    const seen = new Set(seenRecord.seen)
    const newIds = currentIds.filter((id) => !seen.has(id))
    if (newIds.length === 0) return base
    base.newTrades = newIds.length

    // Fresh grades so the new trade is included and graded.
    const grades = await getTradeGrades(sleeperLeagueId, { force: true })
    // Mark seen regardless — a grading hiccup must not cause duplicate emails later.
    await writeSeen(sleeperLeagueId, [...seenRecord.seen, ...newIds])
    if (!grades) return { ...base, error: 'grading unavailable — trade recorded, email skipped' }

    const newTrades = grades.trades.filter((t) => newIds.some((id) => t.id.endsWith(`:${id}`)))
    if (newTrades.length === 0) return { ...base, error: 'new trade not present in graded ledger yet' }

    // Recipients: AF users attached to any AF league row for this Sleeper league.
    const afLeagues = await prisma.league.findMany({
      where: { platform: 'sleeper', platformLeagueId: sleeperLeagueId },
      select: {
        id: true,
        name: true,
        userId: true,
        teams: { select: { claimedByUserId: true } },
      },
    })
    if (afLeagues.length === 0) return base
    const userIds = [
      ...new Set(
        afLeagues.flatMap((l) => [l.userId, ...l.teams.map((t) => t.claimedByUserId)]).filter(
          (v): v is string => typeof v === 'string' && v.length > 0,
        ),
      ),
    ]
    const users = await prisma.appUser
      .findMany({ where: { id: { in: userIds } }, select: { email: true } })
      .catch(() => [] as { email: string | null }[])
    const emails = [...new Set(users.map((u) => u.email).filter((e): e is string => Boolean(e)))]
    if (emails.length === 0) return base

    const leagueName = afLeagues[0].name ?? 'your league'
    const ledgerUrl = `${getBaseUrl()}/league/${afLeagues[0].id}?view=legacy`
    for (const trade of newTrades) {
      const { subject, html } = buildTradeGradeEmail({ leagueName, trade, ledgerUrl })
      for (const to of emails) {
        const sent = await sendTemplatedEmail({ to, subject, html }).catch(
          () => ({ ok: false as const }),
        )
        if (sent.ok) base.emailsSent += 1
      }
    }
    return base
  } catch (err) {
    console.error('[trade-notify] league sweep failed', { sleeperLeagueId, err })
    return { ...base, error: 'unexpected failure' }
  }
}

/** Sweep every imported Sleeper league (bounded), one contained result each. */
export async function detectAndNotifyAll(limit = 50): Promise<LeagueNotifyResult[]> {
  const leagues = await prisma.league.findMany({
    where: { platform: 'sleeper', platformLeagueId: { not: '' } },
    select: { platformLeagueId: true },
    distinct: ['platformLeagueId'],
    take: limit,
  })
  const results: LeagueNotifyResult[] = []
  for (const l of leagues) {
    if (!l.platformLeagueId) continue
    results.push(await detectAndNotifyLeague(l.platformLeagueId))
  }
  return results
}
