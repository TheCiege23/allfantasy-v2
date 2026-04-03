/**
 * Team logo URLs by abbreviation + sport (public CDNs).
 */

export function getTeamLogoUrl(teamAbbr: string, sport: string): string {
  const abbr = teamAbbr.toUpperCase()
  const s = sport.toUpperCase()

  if (s === 'NFL') {
    return `https://sleepercdn.com/images/team_logos/nfl/${teamAbbr.toLowerCase()}.jpg`
  }

  const espnSport =
    s === 'NBA'
      ? 'nba'
      : s === 'MLB'
        ? 'mlb'
        : s === 'NHL'
          ? 'nhl'
          : s === 'NCAAFB' || s === 'NCAAF'
            ? 'college-football'
            : null

  if (espnSport) {
    return `https://a.espncdn.com/i/teamlogos/${espnSport}/500/${abbr.toLowerCase()}.png`
  }

  return '/default-avatar.png'
}
