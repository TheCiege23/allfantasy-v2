/**
 * Draft-room-only chat rows for each completed pick.
 * Stored with source `draft` + type `draft_pick` so they never appear in the main league chat stream
 * (league GET excludes source=draft), while the draft chat GET merges these in when sync is on.
 */

import { prisma } from '@/lib/prisma'
import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export type PostDraftPickChatEventInput = {
  leagueId: string
  rosterId: string
  madeByUserId: string | null | undefined
  playerName: string
  position: string
  rosterDisplayName: string
  overall: number
  pickLabel: string
  round?: number | null
  roundSlot?: number | null
  playerId?: string | null
  /** NFL team abbreviation when known */
  nflTeam?: string | null
  /** D.6.3 — player headshot URL (from DraftPick.playerImageUrl). Optional;
   * the wire format and the renderer both gracefully degrade to initials. */
  headshotUrl?: string | null
  /** D.6.3 — NFL team logo URL when callers have one resolved.
   * Caller-provided so this module stays free of asset-resolution side effects;
   * the renderer falls back to displaying the team abbreviation when null. */
  teamLogoUrl?: string | null
  /** D.6.3 — true when this pick was made by an AI / autopick manager
   * (drives the "AI Manager" badge on the pick card). */
  aiManager?: boolean
  /** Commit T — true when this pick was committed via a commissioner
   * action (force_autopick, skip_pick, or assigned-pick from the
   * commissioner control center). Drives a distinct "Commissioner"
   * badge on the chat pick card; mutually exclusive with `aiManager`
   * by upstream invariant (source is one of 'auto' | 'commissioner' |
   * 'user' | 'keeper' | 'devy' | 'college' | 'promoted_devy'). */
  commissionerOverride?: boolean
}

async function resolveActorAppUserId(input: PostDraftPickChatEventInput): Promise<string | null> {
  const direct = typeof input.madeByUserId === 'string' && input.madeByUserId.trim() ? input.madeByUserId.trim() : null
  if (direct) return direct

  const roster = await prisma.roster.findFirst({
    where: { id: input.rosterId, leagueId: input.leagueId },
    select: { platformUserId: true },
  })
  if (roster?.platformUserId) return roster.platformUserId

  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: { userId: true },
  })
  return league?.userId ?? null
}

/**
 * Fire-and-forget from pick submission; failures must never affect draft mechanics.
 */
export async function postDraftPickChatEvent(input: PostDraftPickChatEventInput): Promise<void> {
  const actorId = await resolveActorAppUserId(input)
  if (!actorId) return

  const pickedAt = new Date().toISOString()
  const summary = `${input.playerName} (${input.position}) → ${input.rosterDisplayName}`
  const roundPart =
    input.round != null && input.roundSlot != null
      ? ` · R${input.round} · Pick ${input.roundSlot}`
      : ''
  const body = `${summary} · Pick ${input.pickLabel} (#${input.overall})${roundPart}`

  await createLeagueChatMessage(input.leagueId, actorId, body, {
    type: 'draft_pick',
    source: 'draft',
    metadata: {
      draftPickEvent: true,
      /** Explicit: never treated as league-sync content; stored draft-only at row level. */
      leagueChatSyncExcluded: true,
      playerName: input.playerName,
      position: input.position,
      rosterDisplayName: input.rosterDisplayName,
      rosterId: input.rosterId,
      pickedAt,
      overall: input.overall,
      pickLabel: input.pickLabel,
      ...(input.round != null ? { round: input.round } : {}),
      ...(input.roundSlot != null ? { roundSlot: input.roundSlot, slot: input.roundSlot } : {}),
      ...(typeof input.playerId === 'string' && input.playerId.trim() ? { playerId: input.playerId.trim() } : {}),
      ...(typeof input.nflTeam === 'string' && input.nflTeam.trim() ? { nflTeam: input.nflTeam.trim() } : {}),
      // D.6.3 — pick chat card metadata. headshot + team logo are persisted on
      // the chat row so historical picks rehydrate correctly across reloads;
      // aiManager flips the badge on the rendered card.
      ...(typeof input.headshotUrl === 'string' && input.headshotUrl.trim()
        ? { headshotUrl: input.headshotUrl.trim() }
        : {}),
      ...(typeof input.teamLogoUrl === 'string' && input.teamLogoUrl.trim()
        ? { teamLogoUrl: input.teamLogoUrl.trim() }
        : {}),
      ...(input.aiManager === true ? { aiManager: true } : {}),
      // Commit T — commissioner-pick badge metadata. Mutually exclusive
      // with aiManager: when source is 'commissioner', aiManager stays
      // false. Renderers can show "AI Manager" / "Commissioner" /
      // neither based on which flag is present.
      ...(input.commissionerOverride === true ? { commissionerOverride: true } : {}),
    },
  })
}
