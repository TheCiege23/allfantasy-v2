import { prisma } from '@/lib/prisma'

type MinimalSeason = {
  id: string
  leagueId: string
}

type MinimalGenericRoster = {
  id: string
  leagueId: string
  platformUserId: string
}

type MinimalLeagueTeam = {
  id: string
  leagueId: string
  externalId: string
  ownerName: string
  teamName: string
  avatarUrl: string | null
  claimedByUserId: string | null
  platformUserId: string | null
}

type MinimalRedraftRoster = {
  id: string
  seasonId: string
  leagueId: string
  ownerId: string
  ownerName: string
  teamName: string | null
  avatarUrl: string | null
}

export type RedraftRosterLookupResult = {
  season: MinimalSeason | null
  roster: MinimalRedraftRoster | null
  resolvedBy: string | null
  repairedOwnerId: string | null
  ownerIdCandidates: string[]
  requestedOwnerIdCandidates: string[]
  requestedRosterId: string | null
  inferredLeagueId: string | null
}

function trimmed(value: string | null | undefined): string | null {
  const v = String(value ?? '').trim()
  return v || null
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const out: string[] = []
  for (const value of values) {
    const next = trimmed(value)
    if (!next || out.includes(next)) continue
    out.push(next)
  }
  return out
}

function genericRosterIdFromOwnerId(value: string | null | undefined): string | null {
  const ownerId = trimmed(value)
  if (!ownerId) return null
  return ownerId.startsWith('roster:') ? ownerId.slice('roster:'.length).trim() || null : null
}

function preferredOwnerIdFromMappings(args: {
  claimedByUserId?: string | null
  teamPlatformUserId?: string | null
  genericRosterPlatformUserId?: string | null
  genericRosterId?: string | null
}): string {
  return (
    trimmed(args.claimedByUserId) ??
    trimmed(args.teamPlatformUserId) ??
    trimmed(args.genericRosterPlatformUserId) ??
    (trimmed(args.genericRosterId) ? `roster:${trimmed(args.genericRosterId)}` : '')
  )
}

export function buildRedraftOwnerIdCandidates(args: {
  preferredOwnerId?: string | null
  appUserId?: string | null
  claimedByUserId?: string | null
  teamPlatformUserId?: string | null
  genericRosterPlatformUserId?: string | null
  genericRosterId?: string | null
}): string[] {
  const fallbackOwnerId = args.genericRosterId ? `roster:${args.genericRosterId}` : null
  return uniqueNonEmpty([
    args.preferredOwnerId,
    args.appUserId,
    args.claimedByUserId,
    args.teamPlatformUserId,
    args.genericRosterPlatformUserId,
    fallbackOwnerId,
  ])
}

async function findSeasonByLeagueId(leagueId: string | null): Promise<MinimalSeason | null> {
  if (!leagueId) return null
  return prisma.redraftSeason.findFirst({
    where: { leagueId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, leagueId: true },
  })
}

async function findGenericRosterByOpaqueRef(opaqueRosterId: string | null): Promise<MinimalGenericRoster | null> {
  if (!opaqueRosterId) return null
  const id = genericRosterIdFromOwnerId(opaqueRosterId) ?? opaqueRosterId
  return prisma.roster.findFirst({
    where: { id },
    select: {
      id: true,
      leagueId: true,
      platformUserId: true,
    },
  })
}

async function findLeagueTeamByOpaqueRef(args: {
  opaqueRosterId: string | null
  leagueId?: string | null
}): Promise<MinimalLeagueTeam | null> {
  const opaqueRosterId = trimmed(args.opaqueRosterId)
  if (!opaqueRosterId) return null

  const select = {
    id: true,
    leagueId: true,
    externalId: true,
    ownerName: true,
    teamName: true,
    avatarUrl: true,
    claimedByUserId: true,
    platformUserId: true,
  } as const

  const byId = await prisma.leagueTeam.findFirst({
    where: { id: opaqueRosterId },
    select,
  })
  if (byId) return byId

  const leagueId = trimmed(args.leagueId)
  if (!leagueId) return null

  return prisma.leagueTeam.findFirst({
    where: {
      leagueId,
      externalId: opaqueRosterId,
    },
    select,
  })
}

async function maybeRepairRedraftRosterOwner(args: {
  roster: MinimalRedraftRoster
  seasonId: string
  team?: MinimalLeagueTeam | null
  genericRoster?: MinimalGenericRoster | null
}): Promise<{ roster: MinimalRedraftRoster; repairedOwnerId: string | null }> {
  const preferredOwnerId = preferredOwnerIdFromMappings({
    claimedByUserId: args.team?.claimedByUserId,
    teamPlatformUserId: args.team?.platformUserId,
    genericRosterPlatformUserId: args.genericRoster?.platformUserId,
    genericRosterId: args.genericRoster?.id ?? genericRosterIdFromOwnerId(args.roster.ownerId),
  })

  const currentOwnerId = trimmed(args.roster.ownerId)
  if (!preferredOwnerId || !currentOwnerId || preferredOwnerId === currentOwnerId) {
    return { roster: args.roster, repairedOwnerId: null }
  }

  const safeToRepair =
    currentOwnerId.startsWith('roster:') ||
    currentOwnerId === trimmed(args.team?.platformUserId) ||
    currentOwnerId === trimmed(args.genericRoster?.platformUserId)

  if (!safeToRepair) {
    return { roster: args.roster, repairedOwnerId: null }
  }

  const conflict = await prisma.redraftRoster.findFirst({
    where: {
      seasonId: args.seasonId,
      ownerId: preferredOwnerId,
      NOT: { id: args.roster.id },
    },
    select: { id: true },
  })
  if (conflict) {
    return { roster: args.roster, repairedOwnerId: null }
  }

  const updated = await prisma.redraftRoster.update({
    where: { id: args.roster.id },
    data: {
      ownerId: preferredOwnerId,
      ...(args.team
        ? {
            ownerName: args.team.ownerName,
            teamName: args.team.teamName,
            avatarUrl: args.team.avatarUrl ?? null,
          }
        : {}),
    },
    select: {
      id: true,
      seasonId: true,
      leagueId: true,
      ownerId: true,
      ownerName: true,
      teamName: true,
      avatarUrl: true,
    },
  })

  return {
    roster: updated,
    repairedOwnerId: preferredOwnerId,
  }
}

export async function resolveRedraftRosterLookup(args: {
  userId: string
  requestedRosterId?: string | null
  seasonId?: string | null
  leagueId?: string | null
}): Promise<RedraftRosterLookupResult> {
  const requestedRosterId = trimmed(args.requestedRosterId)
  const explicitSeasonId = trimmed(args.seasonId)
  const explicitLeagueId = trimmed(args.leagueId)

  let season: MinimalSeason | null = explicitSeasonId
    ? await prisma.redraftSeason.findFirst({
        where: { id: explicitSeasonId },
        select: { id: true, leagueId: true },
      })
    : null

  let exactRedraftRoster = requestedRosterId
    ? await prisma.redraftRoster.findFirst({
        where: { id: requestedRosterId },
        select: {
          id: true,
          seasonId: true,
          leagueId: true,
          ownerId: true,
          ownerName: true,
          teamName: true,
          avatarUrl: true,
        },
      })
    : null

  if (!season && exactRedraftRoster) {
    season = { id: exactRedraftRoster.seasonId, leagueId: exactRedraftRoster.leagueId }
  }

  const requestedGenericRoster = await findGenericRosterByOpaqueRef(requestedRosterId)
  let inferredLeagueId =
    explicitLeagueId ??
    season?.leagueId ??
    exactRedraftRoster?.leagueId ??
    requestedGenericRoster?.leagueId ??
    null

  let requestedTeam = await findLeagueTeamByOpaqueRef({
    opaqueRosterId: requestedRosterId,
    leagueId: inferredLeagueId,
  })

  inferredLeagueId =
    explicitLeagueId ??
    season?.leagueId ??
    exactRedraftRoster?.leagueId ??
    requestedGenericRoster?.leagueId ??
    requestedTeam?.leagueId ??
    null

  if (!season) {
    season = await findSeasonByLeagueId(inferredLeagueId)
  }

  inferredLeagueId = explicitLeagueId ?? season?.leagueId ?? inferredLeagueId

  if (exactRedraftRoster && (!season || exactRedraftRoster.seasonId === season.id)) {
    const repaired = await maybeRepairRedraftRosterOwner({
      roster: exactRedraftRoster,
      seasonId: exactRedraftRoster.seasonId,
      team: requestedTeam,
      genericRoster: requestedGenericRoster,
    })
    return {
      season: season ?? { id: repaired.roster.seasonId, leagueId: repaired.roster.leagueId },
      roster: repaired.roster,
      resolvedBy: 'requested_redraft_roster_id',
      repairedOwnerId: repaired.repairedOwnerId,
      ownerIdCandidates: [],
      requestedOwnerIdCandidates: [],
      requestedRosterId,
      inferredLeagueId,
    }
  }

  if (!season) {
    return {
      season: null,
      roster: null,
      resolvedBy: null,
      repairedOwnerId: null,
      ownerIdCandidates: [],
      requestedOwnerIdCandidates: [],
      requestedRosterId,
      inferredLeagueId,
    }
  }

  const requestedOwnerIdCandidates = buildRedraftOwnerIdCandidates({
    claimedByUserId: requestedTeam?.claimedByUserId,
    teamPlatformUserId: requestedTeam?.platformUserId,
    genericRosterPlatformUserId: requestedGenericRoster?.platformUserId,
    genericRosterId: requestedGenericRoster?.id ?? genericRosterIdFromOwnerId(requestedRosterId),
  })

  if (requestedOwnerIdCandidates.length > 0) {
    const requestedMappedRoster = await prisma.redraftRoster.findFirst({
      where: {
        seasonId: season.id,
        ownerId: { in: requestedOwnerIdCandidates },
      },
      select: {
        id: true,
        seasonId: true,
        leagueId: true,
        ownerId: true,
        ownerName: true,
        teamName: true,
        avatarUrl: true,
      },
    })

    if (requestedMappedRoster) {
      const repaired = await maybeRepairRedraftRosterOwner({
        roster: requestedMappedRoster,
        seasonId: season.id,
        team: requestedTeam,
        genericRoster: requestedGenericRoster,
      })
      return {
        season,
        roster: repaired.roster,
        resolvedBy: 'requested_identity_map',
        repairedOwnerId: repaired.repairedOwnerId,
        ownerIdCandidates: [],
        requestedOwnerIdCandidates,
        requestedRosterId,
        inferredLeagueId,
      }
    }
  }

  const viewerTeam = await prisma.leagueTeam.findFirst({
    where: {
      leagueId: season.leagueId,
      OR: [{ claimedByUserId: args.userId }, { platformUserId: args.userId }],
    },
    select: {
      id: true,
      leagueId: true,
      externalId: true,
      ownerName: true,
      teamName: true,
      avatarUrl: true,
      claimedByUserId: true,
      platformUserId: true,
    },
  })

  const viewerPlatformIds = uniqueNonEmpty([args.userId, viewerTeam?.platformUserId])
  const viewerGenericRoster =
    viewerPlatformIds.length > 0
      ? await prisma.roster.findFirst({
          where: {
            leagueId: season.leagueId,
            platformUserId: { in: viewerPlatformIds },
          },
          select: {
            id: true,
            leagueId: true,
            platformUserId: true,
          },
        })
      : null

  const ownerIdCandidates = buildRedraftOwnerIdCandidates({
    preferredOwnerId: args.userId,
    appUserId: args.userId,
    claimedByUserId: viewerTeam?.claimedByUserId,
    teamPlatformUserId: viewerTeam?.platformUserId,
    genericRosterPlatformUserId: viewerGenericRoster?.platformUserId,
    genericRosterId: viewerGenericRoster?.id,
  })

  if (ownerIdCandidates.length === 0) {
    return {
      season,
      roster: null,
      resolvedBy: null,
      repairedOwnerId: null,
      ownerIdCandidates,
      requestedOwnerIdCandidates,
      requestedRosterId,
      inferredLeagueId,
    }
  }

  const viewerRoster = await prisma.redraftRoster.findFirst({
    where: {
      seasonId: season.id,
      ownerId: { in: ownerIdCandidates },
    },
    select: {
      id: true,
      seasonId: true,
      leagueId: true,
      ownerId: true,
      ownerName: true,
      teamName: true,
      avatarUrl: true,
    },
  })

  if (!viewerRoster) {
    return {
      season,
      roster: null,
      resolvedBy: null,
      repairedOwnerId: null,
      ownerIdCandidates,
      requestedOwnerIdCandidates,
      requestedRosterId,
      inferredLeagueId,
    }
  }

  const repaired = await maybeRepairRedraftRosterOwner({
    roster: viewerRoster,
    seasonId: season.id,
    team: viewerTeam,
    genericRoster: viewerGenericRoster,
  })

  return {
    season,
    roster: repaired.roster,
    resolvedBy: repaired.repairedOwnerId ? 'viewer_owner_repaired' : 'viewer_owner_candidates',
    repairedOwnerId: repaired.repairedOwnerId,
    ownerIdCandidates,
    requestedOwnerIdCandidates,
    requestedRosterId,
    inferredLeagueId,
  }
}
