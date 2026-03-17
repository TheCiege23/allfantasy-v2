/**
 * InviteTokenGenerator — resolve or build invite token (join code) for bracket leagues.
 * Bracket leagues use a unique joinCode created at league creation; this module exposes
 * lookup and link building.
 */

import { prisma } from "@/lib/prisma"

const DEFAULT_BASE_URL = typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"

export type InviteTokenResult =
  | { ok: true; joinCode: string; inviteLink: string }
  | { ok: false; error: "LEAGUE_NOT_FOUND" | "NO_JOIN_CODE" }

/**
 * Get the invite token (join code) and full invite link for a bracket league.
 */
export async function getInviteTokenForLeague(
  leagueId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<InviteTokenResult> {
  const league = await prisma.bracketLeague.findUnique({
    where: { id: leagueId },
    select: { joinCode: true },
  })
  if (!league) return { ok: false, error: "LEAGUE_NOT_FOUND" }
  const joinCode = league.joinCode?.trim()
  if (!joinCode) return { ok: false, error: "NO_JOIN_CODE" }
  const inviteLink = buildInviteLink(joinCode, baseUrl)
  return { ok: true, joinCode, inviteLink }
}

/**
 * Build the public invite URL for a join code (bracket join page).
 */
export function buildInviteLink(joinCode: string, baseUrl: string = DEFAULT_BASE_URL): string {
  const code = joinCode.trim().toUpperCase()
  const base = baseUrl.replace(/\/$/, "")
  return `${base}/brackets/join?code=${encodeURIComponent(code)}`
}
