/**
 * InviteTokenGenerator — resolve or build invite token (join code) for bracket leagues.
 * Bracket leagues use a unique joinCode created at league creation; this module exposes
 * lookup and link building.
 */

import { prisma } from "@/lib/prisma"
import crypto from "crypto"

const DEFAULT_BASE_URL = typeof process !== "undefined" ? process.env.NEXTAUTH_URL ?? "https://allfantasy.ai" : "https://allfantasy.ai"
const DEFAULT_FANTASY_INVITE_EXPIRY_DAYS = 14

export type InviteTokenResult =
  | { ok: true; joinCode: string; inviteLink: string }
  | { ok: false; error: "LEAGUE_NOT_FOUND" | "NO_JOIN_CODE" }

export type FantasyInviteTokenResult =
  | { ok: true; inviteCode: string; inviteLink: string; inviteExpiresAt: string | null }
  | { ok: false; error: "LEAGUE_NOT_FOUND" | "NO_INVITE_CODE" }

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

/**
 * Build the public invite URL for a fantasy league invite code (/join page).
 */
export function buildFantasyInviteLink(inviteCode: string, baseUrl: string = DEFAULT_BASE_URL): string {
  const code = inviteCode.trim()
  const base = baseUrl.replace(/\/$/, "")
  return `${base}/join?code=${encodeURIComponent(code)}`
}

/**
 * Build a short alphanumeric invite token.
 */
export function generateInviteToken(length = 8): string {
  return crypto
    .randomBytes(Math.max(6, Math.ceil(length * 0.75)))
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length)
}

/**
 * Resolve fantasy league invite token/link from League.settings.
 */
export async function getFantasyInviteTokenForLeague(
  leagueId: string,
  baseUrl: string = DEFAULT_BASE_URL
): Promise<FantasyInviteTokenResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { settings: true },
  })
  if (!league) return { ok: false, error: "LEAGUE_NOT_FOUND" }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const inviteCode = typeof settings.inviteCode === "string" ? settings.inviteCode.trim() : ""
  if (!inviteCode) return { ok: false, error: "NO_INVITE_CODE" }

  const inviteLink = buildFantasyInviteLink(inviteCode, baseUrl)
  const expiresAtRaw = settings.inviteExpiresAt
  let inviteExpiresAt: string | null = null
  if (expiresAtRaw instanceof Date) inviteExpiresAt = expiresAtRaw.toISOString()
  else if (typeof expiresAtRaw === "string" && expiresAtRaw.trim()) {
    const parsed = new Date(expiresAtRaw)
    if (!Number.isNaN(parsed.getTime())) inviteExpiresAt = parsed.toISOString()
  }

  return { ok: true, inviteCode, inviteLink, inviteExpiresAt }
}

/**
 * Calculate default fantasy invite expiry timestamp.
 */
export function getDefaultFantasyInviteExpiry(days = DEFAULT_FANTASY_INVITE_EXPIRY_DAYS): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(1, days))
  return d.toISOString()
}
