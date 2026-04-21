/**
 * C2C placeholder-roster claim. When a manager joins an imported C2C league,
 * try to match their profile against a placeholder roster created by
 * persistC2CMultiSource (platformUserId like "import:<provider>:<teamId>").
 *
 * Match order: normalized display name → sleeper username → email local-part.
 * On match, transfer ownership in-place (keeps all pre-imported players and
 * the C2CPlayerState rows already bound to the roster id).
 */

import type { Prisma } from '@prisma/client'

type Tx = Prisma.TransactionClient

function normalize(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

export interface ClaimCandidate {
  displayName: string | null
  sleeperUsername: string | null
  email: string | null
}

export interface ClaimResult {
  claimed: boolean
  rosterId?: string
}

/**
 * Find a placeholder roster in the league whose stored import displayName
 * matches the joining user, then transfer ownership.
 */
export async function claimC2CPlaceholderRoster(args: {
  tx: Tx
  leagueId: string
  userId: string
  candidate: ClaimCandidate
}): Promise<ClaimResult> {
  const { tx, leagueId, userId, candidate } = args

  const placeholders = await tx.roster.findMany({
    where: {
      leagueId,
      platformUserId: { startsWith: 'import:' },
    },
    select: { id: true, platformUserId: true, playerData: true },
  })
  if (placeholders.length === 0) return { claimed: false }

  const keys = [candidate.displayName, candidate.sleeperUsername, candidate.email?.split('@')[0]]
    .map(normalize)
    .filter(Boolean)
  if (keys.length === 0) return { claimed: false }

  const match = placeholders.find((roster) => {
    const meta = ((roster.playerData as Record<string, unknown> | null)?.import as
      | Record<string, unknown>
      | undefined) ?? null
    const displayName = typeof meta?.displayName === 'string' ? meta.displayName : null
    const target = normalize(displayName)
    return target.length > 0 && keys.includes(target)
  })
  if (!match) return { claimed: false }

  await tx.roster.update({
    where: { id: match.id },
    data: { platformUserId: userId },
  })
  return { claimed: true, rosterId: match.id }
}
