import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export type DraftAiNewsBrief = {
  player: string
  team: string | null
  headline: string
  publishedAt: string | null
  source: string
}

export type DraftAiInjuryBrief = {
  player: string
  team: string | null
  status: string
  type: string | null
  date: string | null
}

export type DraftAiContextBundle = {
  sport: string
  news: DraftAiNewsBrief[]
  injuries: DraftAiInjuryBrief[]
  /** Convenience: pre-rendered prose suitable for direct concatenation into a Claude prompt. */
  promptSection: string
}

/**
 * Pull recent player news + injury rows that the chain has already cached and
 * shape them into a compact bundle ready to embed into any draft AI prompt.
 *
 * - News + injuries both come from `SportsNews` / `SportsInjury`, populated
 *   by news-importer + injury-importer running through the unified provider
 *   chain (RI → TSDB → API-Sports → ClearSports → Sleeper → ESPN).
 * - When `playerNames` is provided, results are filtered to those names so we
 *   spend the prompt budget on the player set the AI is reasoning about
 *   (e.g. user roster + queued players + on-the-clock candidates).
 * - When `playerNames` is empty/omitted, returns the most recent rows for the
 *   sport so the AI still has a market pulse.
 */
export async function buildDraftAiContext(input: {
  sport?: string | null
  playerNames?: string[]
  newsLimit?: number
  injuryLimit?: number
}): Promise<DraftAiContextBundle> {
  const sport = normalizeToSupportedSport(input.sport ?? 'NFL')
  const newsLimit = Math.max(1, Math.min(20, input.newsLimit ?? 8))
  const injuryLimit = Math.max(1, Math.min(20, input.injuryLimit ?? 12))
  const names = (input.playerNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 60)

  const newsWhere = names.length
    ? { sport, playerName: { in: names, mode: 'insensitive' as const } }
    : { sport }

  const injuryWhere = names.length
    ? { sport, playerName: { in: names, mode: 'insensitive' as const } }
    : { sport }

  const [newsRows, injuryRows] = await Promise.all([
    prisma.sportsNews
      .findMany({
        where: newsWhere,
        orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
        take: newsLimit,
        select: {
          title: true,
          playerName: true,
          team: true,
          publishedAt: true,
          source: true,
        },
      })
      .catch(() => []),
    prisma.sportsInjury
      .findMany({
        where: injuryWhere,
        orderBy: [{ date: 'desc' }],
        take: injuryLimit,
        select: {
          playerName: true,
          team: true,
          status: true,
          type: true,
          date: true,
        },
      })
      .catch(() => []),
  ])

  const news: DraftAiNewsBrief[] = newsRows
    .filter((n) => n.title)
    .map((n) => ({
      player: n.playerName ?? '—',
      team: n.team,
      headline: n.title,
      publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      source: n.source,
    }))

  const injuries: DraftAiInjuryBrief[] = injuryRows
    .filter((i) => i.status)
    .map((i) => ({
      player: i.playerName,
      team: i.team,
      status: i.status ?? '—',
      type: i.type,
      date: i.date ? i.date.toISOString() : null,
    }))

  const newsSection = news.length
    ? news
        .map(
          (n) =>
            `- ${n.player}${n.team ? ` (${n.team})` : ''}: ${n.headline}${
              n.publishedAt ? ` [${n.publishedAt.slice(0, 10)} via ${n.source}]` : ` [${n.source}]`
            }`,
        )
        .join('\n')
    : '(no recent news cached)'

  const injurySection = injuries.length
    ? injuries
        .map(
          (i) =>
            `- ${i.player}${i.team ? ` (${i.team})` : ''}: ${i.status}${i.type ? ` — ${i.type}` : ''}${
              i.date ? ` [${i.date.slice(0, 10)}]` : ''
            }`,
        )
        .join('\n')
    : '(no active injury entries cached)'

  const promptSection = `\nLatest news (most recent first):\n${newsSection}\n\nInjury report:\n${injurySection}\n`

  return { sport, news, injuries, promptSection }
}

/**
 * Extract candidate player names from a draft AI request body so the context
 * helper can scope news/injury queries. Falls back to an empty list when the
 * payload doesn't carry roster / queue / pick info.
 */
export function collectAiContextPlayerNames(body: Record<string, unknown> | null | undefined): string[] {
  if (!body) return []
  const out = new Set<string>()

  const pushName = (raw: unknown) => {
    if (typeof raw !== 'string') return
    const v = raw.trim()
    if (v) out.add(v)
  }

  // Already-drafted picks (mostly viewer's roster context).
  if (Array.isArray(body.picks)) {
    for (const p of body.picks as Array<Record<string, unknown>>) {
      pushName(p?.playerName)
    }
  }
  // Queue rows.
  if (Array.isArray(body.queue)) {
    for (const q of body.queue as Array<Record<string, unknown>>) {
      pushName(q?.name)
      pushName(q?.playerName)
    }
  }
  // Best-available list provided by client.
  if (Array.isArray(body.bestAvailable)) {
    for (const r of body.bestAvailable as Array<Record<string, unknown>>) {
      pushName(r?.name)
      pushName(r?.playerName)
    }
  }
  // Single player focus (used by pick-survival, compare).
  pushName((body as { playerName?: unknown }).playerName)

  return Array.from(out)
}
