/**
 * LeagueInviteService — high-level invite flow: link generation, preview, and join.
 * Uses InviteTokenGenerator and InviteValidationResolver.
 */

import { getInviteTokenForLeague, buildInviteLink } from "./InviteTokenGenerator"
import { validateInviteCode, normalizeJoinCode, type LeagueInvitePreview } from "./InviteValidationResolver"

export type { LeagueInvitePreview }

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

export { buildInviteShareUrl } from "./buildInviteShareUrl"

export { buildInviteLink } from "./InviteTokenGenerator"
export { normalizeJoinCode, validateInviteCode } from "./InviteValidationResolver"
