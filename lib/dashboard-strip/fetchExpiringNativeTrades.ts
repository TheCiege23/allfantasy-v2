import { prisma } from '@/lib/prisma'

export type ExpiringNativeTrade = {
  leagueId: string
  leagueName: string
  tradeId: string
  expiresAt: string
}

const EXPIRING_WINDOW_HOURS = 48

/**
 * Native (non-Sleeper) `AfLeagueTrade` rows expiring soon for the user's own rosters.
 * Separate data source from `fetchTradesDashboard` (Sleeper-only) — native trades use
 * the AF trade engine's own `expiresAt` field, which Sleeper transactions don't have.
 */
export async function fetchExpiringNativeTradesForUser(userId: string): Promise<ExpiringNativeTrade[]> {
  const rosterRows: { id: string }[] = await prisma.roster.findMany({
    where: { platformUserId: userId },
    select: { id: true },
  })
  const rosterIds = rosterRows.map((r) => r.id)
  if (rosterIds.length === 0) return []

  const now = new Date()
  const windowEnd = new Date(now.getTime() + EXPIRING_WINDOW_HOURS * 3600 * 1000)

  type TradeRow = { id: string; expiresAt: Date | null; league: { id: string; name: string | null } }

  const trades: TradeRow[] = await prisma.afLeagueTrade.findMany({
    where: {
      status: 'pending',
      expiresAt: { gt: now, lte: windowEnd },
      OR: [{ proposerRosterId: { in: rosterIds } }, { receiverRosterId: { in: rosterIds } }],
    },
    select: {
      id: true,
      expiresAt: true,
      league: { select: { id: true, name: true } },
    },
    orderBy: { expiresAt: 'asc' },
    take: 5,
  })

  return trades
    .filter((t): t is typeof t & { expiresAt: Date } => t.expiresAt !== null)
    .map((t) => ({
      leagueId: t.league.id,
      leagueName: t.league.name ?? 'League',
      tradeId: t.id,
      expiresAt: t.expiresAt.toISOString(),
    }))
}
