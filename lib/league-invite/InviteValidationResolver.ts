/**
 * InviteValidationResolver — validate invite code and return preview or error.
 * Handles: invalid code, expired invite, league full, and optional already-member check.
 */

import { prisma } from "@/lib/prisma"

export type InviteValidationError =
  | "INVALID_CODE"
  | "EXPIRED"
  | "LEAGUE_FULL"
  | "ALREADY_MEMBER"

export interface LeagueInvitePreview {
  leagueId: string
  name: string
  tournamentName: string
  tournamentSeason?: string
  memberCount: number
  maxManagers: number
  isFull: boolean
  expired: boolean
  joinCode: string
}

export type InviteValidationResult =
  | { valid: true; preview: LeagueInvitePreview }
  | { valid: false; error: InviteValidationError; preview?: LeagueInvitePreview | null }

/**
 * Normalize join code (uppercase, trim).
 */
export function normalizeJoinCode(raw: string | null | undefined): string {
  return String(raw ?? "").trim().toUpperCase()
}

/**
 * Validate an invite code and return league preview or error.
 * Optionally pass userId to detect already-member (preview still returned for UI).
 */
export async function validateInviteCode(
  code: string | null | undefined,
  options?: { userId?: string | null }
): Promise<InviteValidationResult> {
  const joinCode = normalizeJoinCode(code)
  if (!joinCode) return { valid: false, error: "INVALID_CODE" }

  const league = await prisma.bracketLeague.findUnique({
    where: { joinCode },
    select: {
      id: true,
      name: true,
      maxManagers: true,
      inviteExpiresAt: true,
      tournament: { select: { name: true, season: true } },
      _count: { select: { members: true } },
    },
  })

  if (!league) return { valid: false, error: "INVALID_CODE" }

  const now = new Date()
  const expired = !!(
    league.inviteExpiresAt &&
    new Date(league.inviteExpiresAt) < now
  )
  if (expired) {
    const preview = toPreview(league, joinCode, true, false)
    return { valid: false, error: "EXPIRED", preview }
  }

  const memberCount = league._count?.members ?? 0
  const maxManagers = Number(league.maxManagers) || 100
  const isFull = memberCount >= maxManagers
  if (isFull) {
    const preview = toPreview(league, joinCode, false, true)
    return { valid: false, error: "LEAGUE_FULL", preview }
  }

  if (options?.userId) {
    const existing = await prisma.bracketLeagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId: league.id, userId: options.userId },
      },
      select: { id: true },
    })
    if (existing) {
      const preview = toPreview(league, joinCode, false, isFull)
      return { valid: false, error: "ALREADY_MEMBER", preview }
    }
  }

  const preview = toPreview(league, joinCode, false, isFull)
  return { valid: true, preview }
}

function toPreview(
  league: {
    id: string
    name: string
    maxManagers: number
    inviteExpiresAt: Date | null
    tournament: { name: string; season?: string | number | null }
    _count: { members: number }
  },
  joinCode: string,
  expired: boolean,
  isFull: boolean
): LeagueInvitePreview {
  const memberCount = league._count?.members ?? 0
  const maxManagers = Number(league.maxManagers) || 100
  const season = league.tournament?.season
  return {
    leagueId: league.id,
    name: league.name,
    tournamentName: league.tournament?.name ?? "Tournament",
    tournamentSeason: season != null ? String(season) : undefined,
    memberCount,
    maxManagers,
    isFull,
    expired,
    joinCode,
  }
}
