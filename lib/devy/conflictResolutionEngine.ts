import type { DevyMergeConflict } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type ConflictReviewPayload = {
  sessionId: string
  pending: Array<{
    conflict: DevyMergeConflict
    suggestedAction: string
    options: string[]
  }>
}

export async function resolveConflict(
  conflictId: string,
  resolution: string,
  commissionerNote: string | undefined,
  resolvedByUserId: string,
): Promise<void> {
  const allowed = ['auto_resolved', 'commissioner_resolved', 'skipped']
  if (!allowed.includes(resolution)) {
    throw new Error(`Invalid resolution: ${resolution}`)
  }

  await prisma.devyMergeConflict.update({
    where: { id: conflictId },
    data: {
      resolution,
      resolvedBy: resolvedByUserId,
      resolvedAt: new Date(),
      resolutionNote: commissionerNote ?? null,
      commissionerNote: commissionerNote ?? null,
    },
  })
}

export async function getConflictResolutionUI(sessionId: string): Promise<ConflictReviewPayload> {
  const pending = await prisma.devyMergeConflict.findMany({
    where: { sessionId, resolution: 'pending' },
    orderBy: { createdAt: 'asc' },
  })

  const items = pending.map(c => {
    let suggestedAction = 'Review affected entities and pick an authoritative roster or player record.'
    const options = ['commissioner_resolved', 'skipped']
    if (c.conflictType === 'duplicate_player') {
      suggestedAction = 'Keep one roster assignment; drop or trade the duplicate per league rules.'
    } else if (c.conflictType === 'graduated_devy_on_nfl_roster') {
      suggestedAction = 'Treat as NFL roster asset; remove duplicate devy row.'
    } else if (c.conflictType === 'username_mismatch') {
      suggestedAction = 'Link the external account to the correct AllFantasy user in manager mappings.'
    } else if (c.conflictType === 'conflicting_picks') {
      suggestedAction = 'Choose which source is authoritative for future picks.'
    } else if (c.conflictType === 'player_on_two_rosters') {
      suggestedAction = 'Decide which team retains the player.'
    }
    return {
      conflict: c,
      suggestedAction,
      options,
    }
  })

  return { sessionId, pending: items }
}
