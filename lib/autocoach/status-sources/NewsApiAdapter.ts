import 'server-only'

import type { NormalizedStatusHit } from './types'

function injuryQueryForSport(sport: string): string {
  const s = sport.toUpperCase()
  if (s === 'NFL') return '(ruled out OR inactive OR IR OR injured reserve) NFL'
  if (s === 'NBA') return '(out OR DNP OR inactive OR suspended) NBA'
  if (s === 'MLB') return '(injured list OR IL OR suspended) MLB'
  if (s === 'NHL') return '(IR OR LTIR OR suspended) NHL'
  if (s === 'NCAAF') return '(out OR suspended) college football'
  if (s === 'NCAAB') return '(out OR suspended) college basketball'
  if (s === 'SOCCER') return '(suspended OR injured OR out) soccer'
  return `${sport} injury ruled out`
}

const INJURY_RE = /(ruled out|placed on|inactive|suspended|injured list|\bIR\b|\bIL\b|scratches|scratch|out for|DNP)/i

function majorOutlet(name: string): boolean {
  const n = name.toLowerCase()
  return /espn|cbs|fox|bleacher|nfl\.com|nba\.com|mlb\.com|nhl\.com/.test(n)
}

/**
 * NewsAPI.org structured articles (optional; requires NEWS_API_KEY / NEWSAPI_KEY).
 */
export async function fetchInjuryNewsArticles(sport: string, gameDate: string): Promise<NormalizedStatusHit[]> {
  const apiKey = process.env.NEWS_API_KEY?.trim() || process.env.NEWSAPI_KEY?.trim()
  if (!apiKey) {
    return []
  }

  const q = injuryQueryForSport(sport)
  try {
    const params = new URLSearchParams({
      q,
      language: 'en',
      sortBy: 'publishedAt',
      from: gameDate,
      pageSize: '40',
      apiKey,
    })
    params.set('domains', 'bleacherreport.com,espn.com,cbssports.com,nfl.com,nba.com,mlb.com,nhl.com')

    const res = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[NewsApiAdapter] everything failed:', res.status)
      return []
    }
    const data = (await res.json()) as { articles?: Array<Record<string, unknown>> }
    const articles = data.articles ?? []
    const out: NormalizedStatusHit[] = []
    const nameRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g

    for (const a of articles) {
      const title = String(a.title ?? '')
      const desc = String(a.description ?? '')
      const combined = `${title} ${desc}`
      if (!INJURY_RE.test(combined)) continue
      const sourceName = String((a.source as { name?: string } | undefined)?.name ?? 'news')

      const candidates: string[] = []
      for (const m of combined.matchAll(nameRe)) {
        if (m[1]) candidates.push(m[1].trim())
      }
      const playerName = candidates[0] ?? ''
      if (!playerName || playerName.length < 5) continue

      let status = 'OUT'
      if (/IR|injured reserve/i.test(combined)) status = 'IR'
      else if (/suspended/i.test(combined)) status = 'SUSPENDED'
      else if (/IL|injured list|10-day|60-day/i.test(combined)) status = 'IL'

      const confidence = majorOutlet(sourceName) ? 0.85 : 0.6
      out.push({
        playerName,
        sport: sport.toUpperCase(),
        status,
        source: 'news_api',
        confidence,
        sourceUrl: typeof a.url === 'string' ? a.url : undefined,
        rawText: title,
        gameDate,
      })
    }

    const seen = new Set<string>()
    const deduped: NormalizedStatusHit[] = []
    for (const h of out) {
      const k = `${h.playerName.toLowerCase()}|${h.status}`
      if (seen.has(k)) continue
      seen.add(k)
      deduped.push(h)
    }
    return deduped
  } catch (e) {
    console.warn('[NewsApiAdapter] error:', e)
    return []
  }
}
