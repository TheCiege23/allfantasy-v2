/** Map Prisma `LeagueSport` / API sport to `SportConfig.sport` keys. */
export function leagueSportToConfigSport(sport: string): string {
  const u = sport.toUpperCase()
  if (u === 'NCAAF') return 'NCAAFB'
  return u
}
