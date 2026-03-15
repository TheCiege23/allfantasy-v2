/**
 * NotificationRouteResolver — resolve destination href from notification meta.
 * Used for notification card click and "Open league" / "Open chat" links.
 */

import type { PlatformNotification } from "@/types/platform-shared"

export interface NotificationDestination {
  href: string
  label: string
}

/**
 * Resolve primary destination for a notification (e.g. league page, chat thread, bracket).
 */
export function getNotificationDestination(n: PlatformNotification): NotificationDestination | null {
  const meta = n.meta ?? {}
  const leagueId = meta.leagueId as string | undefined
  const chatThreadId = meta.chatThreadId as string | undefined
  const tournamentId = meta.tournamentId as string | undefined
  const bracketEntryId = meta.bracketEntryId as string | undefined

  if (leagueId && chatThreadId) {
    return { href: `/messages?thread=${chatThreadId}`, label: "Open chat" }
  }
  if (chatThreadId) {
    return { href: `/messages?thread=${chatThreadId}`, label: "Open chat" }
  }
  if (leagueId) {
    return { href: `/leagues/${leagueId}`, label: "Open league" }
  }
  if (tournamentId && bracketEntryId) {
    return { href: `/bracket/${tournamentId}/entry/${bracketEntryId}`, label: "Open bracket" }
  }
  if (tournamentId) {
    return { href: `/brackets/tournament/${tournamentId}`, label: "Open bracket" }
  }
  if (n.product === "bracket") {
    return { href: "/brackets", label: "Open brackets" }
  }
  if (n.product === "legacy") {
    return { href: "/af-legacy", label: "Open Legacy" }
  }
  return { href: "/dashboard", label: "Go to dashboard" }
}
