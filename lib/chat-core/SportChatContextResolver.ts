/**
 * SportChatContextResolver — resolve sport for chat rooms (league, bracket, DM context).
 * Uses lib/sport-scope.ts; supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

import { SUPPORTED_SPORTS, DEFAULT_SPORT, isSupportedSport } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"

export const SUPPORTED_CHAT_SPORTS: LeagueSport[] = [...SUPPORTED_SPORTS]

/** Resolve sport from room context (league, bracket, or null for DMs/group). */
export function resolveSportForChatRoom(context: {
  sport?: string | null
  leagueId?: string | null
  leagueSport?: string | null
}): LeagueSport | null {
  const raw = context.leagueSport ?? context.sport ?? null
  if (raw && isSupportedSport(raw)) return raw as LeagueSport
  return null
}

/** Default sport when room has no sport (e.g. for system messages). */
export function getDefaultChatSport(): LeagueSport {
  return DEFAULT_SPORT
}

/** Whether the given room type is sport-scoped (league, bracket_pool). */
export function isSportScopedRoomType(roomType: string): boolean {
  return roomType === "league" || roomType === "bracket_pool"
}
