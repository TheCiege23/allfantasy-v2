/**
 * Single source of truth for heuristic player-news categories used by
 * X/Grok ingestion and cron dispatch — keeps classification aligned.
 */

export type PlayerNewsCategory =
  | 'injury'
  | 'suspension'
  | 'trade'
  | 'signing'
  | 'release'
  | 'roster_move'
  | 'team_news'
  | 'player_news'
  | 'game_update'
  | 'coaching'

const CATEGORY_KEYWORDS: Record<PlayerNewsCategory, readonly string[]> = {
  injury: [
    'injury',
    'injured',
    'ruled out',
    'questionable',
    'doubtful',
    'concussion',
    'IL',
    'IR',
    'day-to-day',
    'out for',
    'DNP',
    'limited',
    'hamstring',
    'knee',
    'ankle',
    'shoulder',
    'back',
  ],
  suspension: ['suspended', 'suspension', 'banned', 'PED', 'conduct'],
  trade: ['traded', 'trade', 'acquired', 'deal', 'blockbuster', 'swap'],
  signing: ['signs', 'signed', 'contract', 'extension', 'deal', 'agrees'],
  release: ['released', 'waived', 'cut', 'DFA', 'designated for assignment'],
  roster_move: [
    'placed on IR',
    'injured reserve',
    'activated',
    'recalled',
    'promoted',
    'demoted',
    'roster move',
  ],
  team_news: ['coaching', 'hire', 'fired', 'front office', 'ownership', 'relocat'],
  player_news: ['return', 'comeback', 'retirement', 'retire'],
  game_update: ['postponed', 'cancelled', 'delayed', 'weather'],
  coaching: ['head coach', 'coaching change', 'coordinator', 'fired', 'hired'],
}

export function classifyPlayerNewsCategory(headline: string, body: string | null): PlayerNewsCategory {
  const haystack = `${headline} ${body ?? ''}`.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return category as PlayerNewsCategory
    }
  }
  return 'player_news'
}
