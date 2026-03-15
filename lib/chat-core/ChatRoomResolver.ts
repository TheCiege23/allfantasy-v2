/**
 * ChatRoomResolver — map room identifiers to room type, leagueId, and backend source.
 * Supports platform thread UUIDs and virtual "league:leagueId" rooms.
 */

export type ChatRoomSource = "platform" | "bracket_league"

export interface ResolvedChatRoom {
  roomId: string
  roomType: "dm" | "group" | "league" | "bracket_pool" | "ai"
  source: ChatRoomSource
  leagueId: string | null
  /** For platform threads, the actual UUID; for league virtual, same as roomId. */
  backendId: string
}

const LEAGUE_PREFIX = "league:"
const AI_PREFIX = "ai:"

/** Check if roomId is a virtual league room (bracket league chat). */
export function isLeagueVirtualRoom(roomId: string): boolean {
  return roomId.startsWith(LEAGUE_PREFIX) && roomId.length > LEAGUE_PREFIX.length
}

/** Extract leagueId from virtual room id "league:leagueId". */
export function getLeagueIdFromVirtualRoom(roomId: string): string | null {
  if (!isLeagueVirtualRoom(roomId)) return null
  return roomId.slice(LEAGUE_PREFIX.length)
}

/** Check if roomId is a virtual AI room. */
export function isAiVirtualRoom(roomId: string): boolean {
  return roomId.startsWith(AI_PREFIX)
}

/** Resolve roomId to source and backend identifier. */
export function resolveChatRoom(roomId: string, context?: { leagueId?: string | null }): ResolvedChatRoom {
  if (isLeagueVirtualRoom(roomId)) {
    const leagueId = getLeagueIdFromVirtualRoom(roomId)
    return {
      roomId,
      roomType: "league",
      source: "bracket_league",
      leagueId,
      backendId: roomId,
    }
  }
  if (isAiVirtualRoom(roomId)) {
    return {
      roomId,
      roomType: "ai",
      source: "platform",
      leagueId: context?.leagueId ?? null,
      backendId: roomId,
    }
  }
  return {
    roomId,
    roomType: "dm", // or group; determined by thread data
    source: "platform",
    leagueId: context?.leagueId ?? null,
    backendId: roomId,
  }
}
