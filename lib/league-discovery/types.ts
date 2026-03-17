/** Client-safe type for discovery league cards (no Prisma). */
export interface LeagueCard {
  id: string
  name: string
  joinCode: string
  sport: string
  season: number
  tournamentName: string
  tournamentId: string
  scoringMode: string
  isPaidLeague: boolean
  isPrivate: boolean
  memberCount: number
  entryCount: number
  maxManagers: number
  ownerName: string
  ownerAvatar: string | null
  joinUrl: string
}
