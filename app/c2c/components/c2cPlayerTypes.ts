/** Minimal player row for C2C UI (matches API / Prisma fields). */
export type C2CPlayerRow = {
  playerId: string
  playerName: string
  position: string
  playerSide: string
  playerType: string
  bucketState: string
  scoringEligibility: string
  school?: string | null
  schoolLogoUrl?: string | null
  classYear?: string | null
  nflNbaTeam?: string | null
  isRookieEligible?: boolean
  isTaxiEligible?: boolean
  taxiYearsUsed?: number
  projectedDeclarationYear?: number | null
  hasEnteredPro?: boolean
  proEntryYear?: number | null
}
