import type { LeagueTeam } from '@prisma/client'
import type { LeagueTeamSlot } from '@/app/dashboard/types'

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function getDraftPosition(settings: Record<string, unknown> | null, externalId: string): number | null {
  const candidates = [settings?.draftOrder, settings?.draft_order, toRecord(settings?.metadata)?.draft_order]

  for (const candidate of candidates) {
    const order = toRecord(candidate)
    if (!order) continue
    const value = order[externalId]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return null
}

/** Map Prisma league teams + settings JSON to `LeagueTeamSlot` for tab UIs. */
export function mapLeagueTeamsToSlots(teams: LeagueTeam[], settings: unknown): LeagueTeamSlot[] {
  const rec = toRecord(settings)
  return teams.map((t) => ({
    id: t.id,
    externalId: t.externalId,
    teamName: t.teamName,
    ownerName: t.ownerName,
    avatarUrl: t.avatarUrl,
    role: t.role,
    isOrphan: t.isOrphan,
    claimedByUserId: t.claimedByUserId,
    draftPosition: getDraftPosition(rec, t.externalId),
    wins: t.wins,
    losses: t.losses,
    ties: t.ties,
    pointsFor: t.pointsFor,
  }))
}
