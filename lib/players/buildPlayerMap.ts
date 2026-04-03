/**
 * Player image priority (see lib/players/README.md):
 * 1. Rolling Insights headshot (when enriched.headshot_url set)
 * 2. ESPN CDN (espn_id from Sleeper)
 * 3. Sport-specific official CDN (NBA/MLB/NHL) when ri_id present
 * 4. Sleeper CDN
 * 5. Position-colored initials (PlayerImage component)
 */

export type EnrichedPlayer = {
  sleeper_id: string
  ri_id?: string
  espn_id?: string
  full_name: string
  position: string
  team: string
  sport: string
  headshot_url?: string
  espn_url?: string
  sleeper_url?: string
  official_url?: string
}

function espnHeadshotUrl(espnId: string, sportUpper: string): string | null {
  const sport = sportUpper.toLowerCase()
  const espnSport =
    sport === 'nfl'
      ? 'nfl'
      : sport === 'nba'
        ? 'nba'
        : sport === 'mlb'
          ? 'mlb'
          : sport === 'nhl'
            ? 'nhl'
            : sport === 'ncaaf' || sport === 'ncaafb'
              ? 'college-football'
              : sport === 'ncaab' || sport === 'ncaabb'
                ? 'mens-college-basketball'
                : null
  if (!espnSport) return null
  return `https://a.espncdn.com/i/headshots/${espnSport}/players/full/${espnId}.png`
}

/** Ordered URLs for PlayerImage to try on each onError (highest quality first). */
export function resolveHeadshotCandidates(player: EnrichedPlayer): string[] {
  const urls: string[] = []
  const s = player.sport.toUpperCase()

  if (player.headshot_url) urls.push(player.headshot_url)

  if (player.espn_id) {
    const u = espnHeadshotUrl(player.espn_id, s)
    if (u) urls.push(u)
  }

  if (s === 'NBA' && player.ri_id) {
    urls.push(`https://cdn.nba.com/headshots/nba/latest/260x190/${player.ri_id}.png`)
  }
  if (s === 'MLB' && player.ri_id) {
    urls.push(
      `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${player.ri_id}/headshot/67/current`,
    )
  }
  if (s === 'NHL' && player.ri_id) {
    urls.push(`https://assets.nhle.com/mugs/nhl/latest/${player.ri_id}.png`)
  }

  if (player.sleeper_id) {
    urls.push(`https://sleepercdn.com/content/nfl/players/thumb/${player.sleeper_id}.jpg`)
  }

  return [...new Set(urls.filter(Boolean))]
}

export function resolveHeadshot(player: EnrichedPlayer): string {
  const c = resolveHeadshotCandidates(player)
  return c[0] ?? ''
}

export function buildEnrichedPlayer(input: {
  sleeper_id: string
  full_name: string
  position: string
  team: string
  sport: string
  espn_id?: string
  ri_id?: string
  headshot_url?: string
}): EnrichedPlayer {
  const sportNorm = input.sport.toUpperCase()
  return {
    sleeper_id: input.sleeper_id,
    ri_id: input.ri_id,
    espn_id: input.espn_id,
    full_name: input.full_name,
    position: input.position,
    team: input.team,
    sport: sportNorm,
    headshot_url: input.headshot_url,
    espn_url: input.espn_id ? espnHeadshotUrl(input.espn_id, sportNorm) ?? undefined : undefined,
    sleeper_url: `https://sleepercdn.com/content/nfl/players/thumb/${input.sleeper_id}.jpg`,
  }
}
