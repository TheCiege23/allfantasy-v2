import { prisma } from '@/lib/prisma'
import { assignIdpCapSalaryForWaiverClaim } from '@/lib/idp/capEngine'

export type ProcessedClaim = { claimId: string; status: string; reason?: string }

/**
 * After a claim is approved and `RedraftRosterPlayer` exists for the add, assign IDP cap salary.
 * No-op when the league has no `IDPCapConfig`.
 */
export async function finalizeRedraftWaiverClaimIdpCap(opts: {
  leagueId: string
  rosterId: string
  addPlayerId: string
  addPlayerName: string
  bidAmount: number | null | undefined
  position: string
  isDefensive: boolean
}): Promise<void> {
  await assignIdpCapSalaryForWaiverClaim(
    opts.leagueId,
    opts.rosterId,
    opts.addPlayerId,
    opts.addPlayerName,
    opts.position,
    opts.isDefensive,
    opts.bidAmount,
  )
}

function isDefensivePosition(position: string): boolean {
  return ['DE', 'DT', 'DL', 'LB', 'ILB', 'OLB', 'CB', 'S', 'DB'].includes(position.toUpperCase())
}

async function resolvePlayerMeta(addPlayerId: string, addPlayerName: string, sport: string) {
  const sportKeys = [sport.toUpperCase(), sport.toLowerCase()]
  const player = await prisma.sportsPlayer
    .findFirst({
      where: {
        sport: { in: sportKeys },
        OR: [{ externalId: addPlayerId }, { sleeperId: addPlayerId }, { id: addPlayerId }],
      },
      select: { name: true, position: true, team: true },
    })
    .catch(() => null)
  if (player) {
    return {
      playerName: player.name || addPlayerName,
      position: player.position || 'UNK',
      team: player.team ?? null,
      warning: null as string | null,
    }
  }

  const identity = await prisma.playerIdentityMap
    .findFirst({
      where: {
        sport: { in: sportKeys },
        OR: [
          { sleeperId: addPlayerId },
          { fantasyCalcId: addPlayerId },
          { rollingInsightsId: addPlayerId },
          { apiSportsId: addPlayerId },
          { espnId: addPlayerId },
          { clearSportsId: addPlayerId },
        ],
      },
      select: { canonicalName: true, position: true, currentTeam: true },
    })
    .catch(() => null)

  if (identity) {
    return {
      playerName: identity.canonicalName || addPlayerName,
      position: identity.position || 'UNK',
      team: identity.currentTeam ?? null,
      warning: null as string | null,
    }
  }

  return {
    playerName: addPlayerName,
    position: 'UNK',
    team: null,
    warning: `No cached player metadata found for ${addPlayerId}; rostered with unknown position.`,
  }
}

async function denyClaim(claimId: string, reason: string): Promise<ProcessedClaim> {
  await prisma.redraftWaiverClaim.update({
    where: { id: claimId },
    data: { status: 'denied', processedAt: new Date(), denialReason: reason },
  })
  return { claimId, status: 'denied', reason }
}

async function moveApprovedRosterToBack(seasonId: string, rosterId: string) {
  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId },
    select: { waiverPriority: true },
    orderBy: { waiverPriority: 'desc' },
    take: 1,
  })
  const maxPriority = rosters[0]?.waiverPriority ?? 0
  await prisma.redraftRoster.update({
    where: { id: rosterId },
    data: { waiverPriority: maxPriority + 1 },
  })
}

export async function processWaiverWindow(
  leagueId: string,
  seasonId: string,
): Promise<ProcessedClaim[]> {
  const season = await prisma.redraftSeason.findFirst({ where: { id: seasonId, leagueId } })
  if (!season) return []

  const claims = await prisma.redraftWaiverClaim.findMany({
    where: { leagueId, seasonId, status: 'pending' },
    orderBy: [{ bidAmount: 'desc' }, { priority: 'asc' }, { submittedAt: 'asc' }],
  })

  const results: ProcessedClaim[] = []
  const acquiredPlayerIds = new Set<string>()

  for (const claim of claims) {
    const roster = await prisma.redraftRoster.findFirst({
      where: { id: claim.rosterId, seasonId, leagueId },
    })
    if (!roster) {
      results.push(await denyClaim(claim.id, 'Roster not found for this season.'))
      continue
    }

    const bid = claim.bidAmount ?? 0
    if (bid < 0) {
      results.push(await denyClaim(claim.id, 'Invalid FAAB bid.'))
      continue
    }
    if (roster.faabBalance != null && bid > roster.faabBalance) {
      results.push(await denyClaim(claim.id, 'Insufficient FAAB balance.'))
      continue
    }
    if (acquiredPlayerIds.has(claim.addPlayerId)) {
      results.push(await denyClaim(claim.id, 'Another claim in this waiver run already won this player.'))
      continue
    }

    const existingActive = await prisma.redraftRosterPlayer.findFirst({
      where: {
        playerId: claim.addPlayerId,
        droppedAt: null,
        roster: { seasonId },
      },
      select: { rosterId: true },
    })
    if (existingActive) {
      const reason =
        existingActive.rosterId === claim.rosterId
          ? 'Player is already on this roster.'
          : 'Player is already rostered in this season.'
      results.push(await denyClaim(claim.id, reason))
      continue
    }

    if (claim.dropPlayerId) {
      const dropResult = await prisma.redraftRosterPlayer.updateMany({
        where: { rosterId: claim.rosterId, playerId: claim.dropPlayerId, droppedAt: null },
        data: { droppedAt: new Date() },
      })
      if (dropResult.count === 0) {
        results.push(await denyClaim(claim.id, 'Drop player is not active on this roster.'))
        continue
      }
    }

    const meta = await resolvePlayerMeta(claim.addPlayerId, claim.addPlayerName, season.sport || 'NFL')

    await prisma.redraftRosterPlayer.create({
      data: {
        rosterId: claim.rosterId,
        playerId: claim.addPlayerId,
        playerName: meta.playerName,
        position: meta.position,
        team: meta.team,
        sport: season.sport || 'NFL',
        slotType: 'bench',
        acquisitionType: 'waiver',
      },
    })

    await prisma.redraftWaiverClaim.update({
      where: { id: claim.id },
      data: {
        status: 'approved',
        processedAt: new Date(),
        denialReason: meta.warning,
      },
    })

    if (bid > 0 && roster.faabBalance != null) {
      await prisma.redraftRoster.update({
        where: { id: claim.rosterId },
        data: { faabBalance: Math.max(0, roster.faabBalance - bid) },
      })
    }

    await prisma.redraftLeagueTransaction
      .create({
        data: {
          leagueId,
          seasonId,
          rosterId: claim.rosterId,
          type: 'waiver_claim_approved',
          metadata: {
            claimId: claim.id,
            addPlayerId: claim.addPlayerId,
            addPlayerName: meta.playerName,
            dropPlayerId: claim.dropPlayerId ?? null,
            bidAmount: claim.bidAmount ?? null,
            warning: meta.warning,
          },
        },
      })
      .catch(() => null)

    await finalizeRedraftWaiverClaimIdpCap({
      leagueId,
      rosterId: claim.rosterId,
      addPlayerId: claim.addPlayerId,
      addPlayerName: meta.playerName,
      bidAmount: claim.bidAmount,
      position: meta.position,
      isDefensive: isDefensivePosition(meta.position),
    }).catch(() => null)

    acquiredPlayerIds.add(claim.addPlayerId)
    await moveApprovedRosterToBack(seasonId, claim.rosterId).catch(() => null)
    results.push({ claimId: claim.id, status: 'approved', reason: meta.warning ?? undefined })
  }

  return results
}

export async function resetWaiverPriority(seasonId: string): Promise<void> {
  const rosters = await prisma.redraftRoster.findMany({
    where: { seasonId },
    orderBy: [{ wins: 'asc' }, { pointsFor: 'asc' }],
  })
  let p = 1
  for (const r of rosters) {
    await prisma.redraftRoster.update({
      where: { id: r.id },
      data: { waiverPriority: p },
    })
    p += 1
  }
}
