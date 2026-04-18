import 'server-only'

import { fetchNewsAPIEverything } from '@/app/api/sports/news/sync-helper'
import { getLatestNews } from '@/lib/data/news'
import { getInjuryReport } from '@/lib/data/players'
import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'

const SPORT_NEWS_QUERY: Record<SupportedSport, string> = {
  NFL: '(NFL OR "fantasy football") AND (injury OR trade OR lineup)',
  NBA: '(NBA OR "fantasy basketball") AND (injury OR trade OR lineup)',
  NHL: '(NHL OR "fantasy hockey") AND (injury OR trade OR lineup)',
  MLB: '(MLB OR "fantasy baseball") AND (injury OR trade OR lineup)',
  NCAAF: '("college football" OR NCAAF OR CFB) AND (injury OR depth chart)',
  NCAAB: '("college basketball" OR NCAAB OR CBB) AND (injury OR lineup)',
  SOCCER: '(soccer OR MLS OR UEFA) AND (injury OR suspension)',
}

export type ChimmyDataDigest = {
  text: string
  sources: string[]
}

/**
 * Deterministic injury + player-news rows (fed by Rolling Insights / API chain / importers) plus optional NewsAPI lines.
 */
export async function buildChimmySportDataDigest(args: {
  sport: SupportedSport | 'all'
  includeNewsApi?: boolean
}): Promise<ChimmyDataDigest> {
  const sources: string[] = []
  const chunks: string[] = []

  const sports: SupportedSport[] =
    args.sport === 'all' ? [...SUPPORTED_SPORTS] : [args.sport]

  for (const sp of sports) {
    const [newsRows, injRows] = await Promise.all([
      getLatestNews(sp, args.sport === 'all' ? 8 : 20),
      getInjuryReport(sp),
    ])

    if (newsRows.length) {
      sources.push(`player_news_${sp}`)
      chunks.push(
        `### ${sp} — Player news (DB / sports ingest)\n${newsRows
          .slice(0, args.sport === 'all' ? 6 : 15)
          .map(
            (n) =>
              `- ${n.headline}${n.playerName ? ` — ${n.playerName}` : ''}${n.team ? ` (${n.team})` : ''} [${n.source}] ${n.publishedAt.toISOString().slice(0, 10)}`
          )
          .join('\n')}`
      )
    }

    if (injRows.length) {
      sources.push(`injury_report_${sp}`)
      chunks.push(
        `### ${sp} — Injury report (DB / sports ingest)\n${injRows
          .slice(0, args.sport === 'all' ? 12 : 35)
          .map(
            (r) =>
              `- ${r.playerName}${r.team ? ` (${r.team})` : ''}: ${r.status ?? 'Unknown'}${r.notes ? ` — ${String(r.notes).slice(0, 120)}` : ''}`
          )
          .join('\n')}`
      )
    }
  }

  if (args.includeNewsApi !== false && process.env.NEWS_API_KEY) {
    try {
      const primary = args.sport === 'all' ? 'NFL' : args.sport
      const articles = await fetchNewsAPIEverything(SPORT_NEWS_QUERY[primary], {
        pageSize: args.sport === 'all' ? 8 : 12,
        impliedSport: primary,
        sortBy: 'publishedAt',
      })
      if (articles.length) {
        sources.push('newsapi_everything')
        chunks.push(
          `### Headlines (NewsAPI — supplemental)\n${articles
            .slice(0, 10)
            .map((a) => `- ${a.title} [${a.source}]`)
            .join('\n')}`
        )
      }
    } catch {
      /* non-fatal */
    }
  }

  if (chunks.length === 0) {
    return {
      text: '',
      sources,
    }
  }

  const body = ['Use only the facts below for injuries/news when answering; do not invent transactions or statuses.', ...chunks].join(
    '\n\n'
  )
  return {
    text: body.length > 8000 ? `${body.slice(0, 8000)}\n…` : body,
    sources,
  }
}
