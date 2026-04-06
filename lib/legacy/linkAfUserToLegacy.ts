import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { computeAndSaveRank } from '@/lib/ranking/computeAndSaveRank'
import type { ResolvedLegacyUser } from '@/lib/legacy-user-resolver'

export type LinkAfUserToLegacyOptions = {
  /** When true, skip calling `computeAndSaveRank` (caller will sync leagues first). */
  skipComputeRank?: boolean
}

/**
 * Link the authenticated AF account to the Sleeper legacy profile so `/api/user/rank` and rankings UI work.
 * Does not create `League` / `SleeperLeague` rows (those come from full import or on-site leagues only).
 */
export async function linkAfUserToLegacy(
  afUserId: string,
  resolved: ResolvedLegacyUser,
  options?: LinkAfUserToLegacyOptions,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const taken = await prisma.appUser.findFirst({
    where: { legacyUserId: resolved.id, id: { not: afUserId } },
    select: { id: true },
  })
  if (taken) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'This Sleeper account is already linked to another AllFantasy login. Sign in with that account or use a different Sleeper username.',
        },
        { status: 409 },
      ),
    }
  }

  await prisma.appUser.update({
    where: { id: afUserId },
    data: { legacyUserId: resolved.id },
  })

  const sleeperIdTaken = await prisma.userProfile.findFirst({
    where: {
      sleeperUserId: resolved.sleeperUserId,
      userId: { not: afUserId },
    },
    select: { userId: true },
  })

  if (!sleeperIdTaken) {
    await prisma.userProfile.upsert({
      where: { userId: afUserId },
      update: {
        sleeperUsername: resolved.sleeperUsername,
        sleeperUserId: resolved.sleeperUserId,
        sleeperLinkedAt: new Date(),
      },
      create: {
        userId: afUserId,
        sleeperUsername: resolved.sleeperUsername,
        sleeperUserId: resolved.sleeperUserId,
        sleeperLinkedAt: new Date(),
      },
    })
  }

  if (options?.skipComputeRank) {
    return { ok: true }
  }

  const leagueCount = await prisma.legacyLeague.count({
    where: { userId: resolved.id },
  })
  if (leagueCount > 0) {
    await computeAndSaveRank(afUserId).catch(() => null)
  }

  return { ok: true }
}
