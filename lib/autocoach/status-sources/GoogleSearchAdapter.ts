import 'server-only'

/**
 * Google Custom Search JSON API — optional fallback for a single player lookup.
 */
export async function googlePlayerStatusSearch(
  playerName: string,
  sport: string
): Promise<{ status: string; confidence: number; sourceUrl: string } | null> {
  const key = process.env.GOOGLE_SEARCH_API_KEY?.trim()
  const cx = process.env.GOOGLE_SEARCH_CX?.trim()
  if (!key || !cx || !playerName.trim()) {
    return null
  }

  const today = new Date().toISOString().slice(0, 10)
  const q = `${playerName} ${sport} injury ruled out inactive ${today}`

  try {
    const params = new URLSearchParams({
      key,
      cx,
      q,
      safe: 'active',
      num: '5',
    })
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn('[GoogleSearchAdapter] API failed:', res.status)
      return null
    }
    const data = (await res.json()) as {
      items?: Array<{ snippet?: string; link?: string; title?: string }>
    }
    const items = data.items ?? []
    const confirm = /(ruled out|inactive|placed on ir|suspended|out for|injured list|\bIR\b|\bIL\b)/i
    for (const it of items) {
      const blob = `${it.snippet ?? ''} ${it.title ?? ''}`
      if (!confirm.test(blob)) continue
      let status = 'OUT'
      if (/suspended/i.test(blob)) status = 'SUSPENDED'
      else if (/IR|injured reserve/i.test(blob)) status = 'IR'
      else if (/IL|injured list/i.test(blob)) status = 'IL'
      return {
        status,
        confidence: 0.7,
        sourceUrl: typeof it.link === 'string' ? it.link : '',
      }
    }
    return null
  } catch (e) {
    console.warn('[GoogleSearchAdapter] error:', e)
    return null
  }
}
