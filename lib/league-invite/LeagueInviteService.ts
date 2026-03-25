/**
 * LeagueInviteService — high-level invite flow: link generation, preview, and join.
 * Uses InviteTokenGenerator and InviteValidationResolver.
 */

import {
  getInviteTokenForLeague,
  getFantasyInviteTokenForLeague,
  type FantasyInviteTokenResult,
} from "./InviteTokenGenerator"
import {
  validateInviteCode,
  validateFantasyInviteCode,
  type LeagueInvitePreview,
  type FantasyLeagueInvitePreview,
  type FantasyInviteValidationResult,
} from "./InviteValidationResolver"

export type { LeagueInvitePreview }
export type { FantasyLeagueInvitePreview, FantasyInviteValidationResult, FantasyInviteTokenResult }

export interface InviteLinkResult {
  ok: true
  inviteLink: string
  joinCode: string
}

export interface PreviewResult {
  ok: true
  preview: LeagueInvitePreview
}

export interface JoinResult {
  ok: true
  leagueId: string
}

/**
 * Get the invite link and join code for a bracket league (for share UI).
 */
export async function getInviteLink(leagueId: string, baseUrl?: string): Promise<InviteLinkResult | { ok: false; error: string }> {
  const result = await getInviteTokenForLeague(leagueId, baseUrl)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, inviteLink: result.inviteLink, joinCode: result.joinCode }
}

/**
 * Get league preview by invite code (public). Use for join page when code is in URL.
 */
export async function getLeaguePreviewByCode(
  code: string | null | undefined,
  options?: { userId?: string | null }
): Promise<
  | { ok: true; preview: LeagueInvitePreview }
  | { ok: false; error: string; preview?: LeagueInvitePreview }
> {
  const validation = await validateInviteCode(code, options)
  if (validation.valid) {
    return { ok: true, preview: validation.preview }
  }
  return {
    ok: false,
    error: validation.error,
    preview: validation.preview ?? undefined,
  }
}

/**
 * Get the invite link and code for a fantasy league.
 */
export async function getFantasyInviteLink(
  leagueId: string,
  baseUrl?: string
): Promise<
  | { ok: true; inviteCode: string; inviteLink: string; inviteExpiresAt: string | null }
  | { ok: false; error: string }
> {
  const result = await getFantasyInviteTokenForLeague(leagueId, baseUrl)
  if (!result.ok) return { ok: false, error: result.error }
  return result
}

/**
 * Validate fantasy league invite code and return preview or error.
 */
export async function getFantasyLeaguePreviewByCode(
  code: string | null | undefined,
  options?: { userId?: string | null; password?: string | null }
): Promise<
  | { ok: true; preview: FantasyLeagueInvitePreview }
  | { ok: false; error: string; preview?: FantasyLeagueInvitePreview }
> {
  const validation = await validateFantasyInviteCode(code, options)
  if (validation.valid) return { ok: true, preview: validation.preview }
  return {
    ok: false,
    error: validation.error,
    preview: validation.preview ?? undefined,
  }
}

export { buildInviteShareUrl } from "./buildInviteShareUrl"

export { buildInviteLink } from "./InviteTokenGenerator"
export {
  normalizeJoinCode,
  validateInviteCode,
  normalizeFantasyInviteCode,
  validateFantasyInviteCode,
} from "./InviteValidationResolver"
