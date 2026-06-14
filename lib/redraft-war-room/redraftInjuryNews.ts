/**
 * REDRAFT INJURY / NEWS LOOKUP — real, sport-isolated, deterministic.
 *
 * The native injury/news provider data lives in `InjuryReportRecord` (injury_reports)
 * and `PlayerNewsRecord` (player_news), populated by the import-injuries / import-news
 * cron sync. (The `sports_core_*` mirror tables are a separate platform-backend
 * foundation that is not migrated in every environment — we read the populated
 * provider tables instead.) Joins are by normalized player name because these rows
 * frequently carry an empty provider playerId.
 *
 * No fabrication: when a player has no matching report, their injury status stays
 * whatever the roster row already had (often null). Names like "Unknown Player" /
 * "General Update" are ignored.
 */
import { prisma } from '@/lib/prisma'

function normName(name: string): string {
  return String(name ?? '').trim().toLowerCase()
}

const IGNORE_NAMES = new Set(['', 'unknown player', 'general update', 'team update'])

export interface RedraftInjuryEntry {
  status: string
  gameStatus: string | null
  reportDate: Date
}

export interface RedraftInjuryNews {
  /** normalized player name → latest injury entry (real status only). */
  injuryByName: Map<string, RedraftInjuryEntry>
  injuriesAsOf: Date | null
  injuryRowCount: number
  newsCount: number
  newsAsOf: Date | null
}

function sportVariants(sport: string): string[] {
  const s = String(sport ?? '').trim()
  return [s, s.toUpperCase(), s.toLowerCase()]
}

/**
 * Load the latest injury report per player + news availability for the sport.
 * Bounded queries (most recent rows) so this stays cheap on the request path.
 */
export async function fetchRedraftInjuryNews(sport: string): Promise<RedraftInjuryNews> {
  const sports = sportVariants(sport)

  const injuryRows = await prisma.injuryReportRecord
    .findMany({
      where: { sport: { in: sports } },
      select: { playerName: true, status: true, gameStatus: true, reportDate: true },
      orderBy: { reportDate: 'desc' },
      take: 2000,
    })
    .catch(() => [])

  const injuryByName = new Map<string, RedraftInjuryEntry>()
  let injuriesAsOf: Date | null = null
  for (const r of injuryRows) {
    const key = normName(r.playerName)
    if (IGNORE_NAMES.has(key)) continue
    if (!r.status || !r.status.trim()) continue
    if (!injuryByName.has(key)) {
      injuryByName.set(key, { status: r.status, gameStatus: r.gameStatus ?? null, reportDate: r.reportDate })
    }
    if (!injuriesAsOf || r.reportDate > injuriesAsOf) injuriesAsOf = r.reportDate
  }

  const latestNews = await prisma.playerNewsRecord
    .findFirst({
      where: { sport: { in: sports } },
      select: { publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    })
    .catch(() => null)
  const newsCount = await prisma.playerNewsRecord.count({ where: { sport: { in: sports } } }).catch(() => 0)

  return {
    injuryByName,
    injuriesAsOf,
    injuryRowCount: injuryByName.size,
    newsCount,
    newsAsOf: latestNews?.publishedAt ?? null,
  }
}

/** Normalized-name key for joining a player to injury data. */
export function injuryNameKey(playerName: string): string {
  return normName(playerName)
}
