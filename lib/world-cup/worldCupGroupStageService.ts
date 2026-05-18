import "server-only"
import { prisma } from "@/lib/prisma"
import {
  buildWorldCupGroupDefinitions,
  validateWorldCupGroupRanking,
  validateWorldCupThirdPlaceSelections,
  type WorldCupGroupKey,
} from "./worldCupGroups"
import {
  WORLD_CUP_2026_OFFICIAL_GROUPS,
  resolveWorldCup2026OfficialGroup,
  type WorldCupOfficialGroupKey,
  type WorldCupOfficialGroupTeam,
} from "./worldCupOfficialGroups"
import { getFlagUrlForCountryCode } from "./worldCupSeedData"
import { WORLD_CUP_BRACKET_LOCKED_MESSAGE } from "./worldCupBracketService"
import { isWorldCupChallengeLocked } from "./worldCupBracketBuilder"

export type WorldCupGroupStageWarning = {
  code: string
  message: string
  groupKey?: WorldCupGroupKey
}

export type WorldCupGroupStageTeamView = {
  id: string
  teamId: string
  name: string
  country: string
  fifaCode: string | null
  flagUrl: string | null
  logoUrl: string | null
  seedOrder: number
  actualRank: number | null
  points: number | null
  goalDifference: number | null
  goalsFor: number | null
}

export type WorldCupGroupStageView = {
  challengeId: string
  entryId: string
  groups: Array<{
    id: string
    groupKey: string
    displayName: string
    sortOrder: number
    teams: WorldCupGroupStageTeamView[]
  }>
  groupRankingPicks: Array<{
    id: string
    groupId: string
    teamId: string
    predictedRank: number
    actualRank: number | null
    isCorrect: boolean | null
    pointsAwarded: number
  }>
  thirdPlaceAdvancerPicks: Array<{
    id: string
    groupId: string
    teamId: string
    isSelected: boolean
    actualAdvanced: boolean | null
    isCorrect: boolean | null
    pointsAwarded: number
  }>
  completion: {
    groupsRankedCount: number
    allGroupsRanked: boolean
    thirdPlaceSelectedCount: number
    thirdPlaceComplete: boolean
    groupStageComplete: boolean
  }
  lock: {
    isLocked: boolean
    lockReason: string | null
  }
  warnings: WorldCupGroupStageWarning[]
}

type ChallengeForLock = {
  id: string
  pickLockStrategy: string | null
  pickLockAt: Date | null
  status: string | null
  sourcePayload?: unknown
  matches: Array<{ startsAt: Date | null; status: string | null; apiStatusShort: string | null }>
}

function normalizeGroupName(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  const groupMatch = upper.match(/^GROUP\s+([A-L])$/)
  if (groupMatch?.[1]) return groupMatch[1]
  return /^[A-L]$/.test(upper) ? upper : null
}

function isWorldCupTestModeChallenge(challenge: { sourcePayload?: unknown } | null): boolean {
  const payload = challenge?.sourcePayload as { simulation?: { isTestMode?: boolean }; isTestMode?: boolean } | null
  return Boolean(payload?.isTestMode || payload?.simulation?.isTestMode)
}

function canSeedWorldCupPlaceholderTeams(challenge: { sourcePayload?: unknown } | null): boolean {
  if (process.env.NODE_ENV !== "production") return true
  return isWorldCupTestModeChallenge(challenge)
}

function placeholderTeamId(challengeId: string, groupKey: string, seedOrder: number) {
  const safeChallengeId = challengeId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return `wc2026_placeholder_${safeChallengeId}_${groupKey}_${seedOrder}`
}

function buildPlaceholderTeam(challengeId: string, groupKey: string, seedOrder: number) {
  return {
    id: placeholderTeamId(challengeId, groupKey, seedOrder),
    name: `Group ${groupKey} Test Team ${seedOrder}`,
    country: `TBD Group ${groupKey}`,
    fifaCode: `${groupKey}${seedOrder}`,
    groupName: groupKey,
    qualificationStatus: "test_placeholder",
    sourcePayload: {
      source: "allfantasy_test_placeholder",
      challengeId,
      groupKey,
      seedOrder,
      note: "Temporary 2026 World Cup group-stage placeholder until official teams are loaded.",
    },
  }
}

function isWorldCupTestTeam(team: {
  id: string
  name?: string | null
  country?: string | null
  qualificationStatus?: string | null
  sourcePayload?: unknown
}) {
  const payload = team.sourcePayload && typeof team.sourcePayload === "object" && !Array.isArray(team.sourcePayload)
    ? team.sourcePayload as Record<string, unknown>
    : {}
  const label = `${team.name ?? ""} ${team.country ?? ""}`.toLowerCase()
  return (
    team.id.startsWith("demo_team_") ||
    team.id.startsWith("wc2026_placeholder_") ||
    team.qualificationStatus === "test" ||
    team.qualificationStatus === "test_placeholder" ||
    payload.testFixture === true ||
    payload.source === "allfantasy_test_placeholder" ||
    label.includes("group ") && label.includes("tbd")
  )
}

function seedOrderForTeam(team: { sourcePayload?: unknown }, fallback: number) {
  const payload = team.sourcePayload && typeof team.sourcePayload === "object" && !Array.isArray(team.sourcePayload)
    ? team.sourcePayload as { seedOrder?: unknown; seed?: unknown }
    : null
  const value = Number(payload?.seedOrder ?? payload?.seed ?? fallback)
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function officialTeamId(team: WorldCupOfficialGroupTeam) {
  return `wc2026_official_${team.fifaCode.toLowerCase()}`
}

async function ensureOfficialWorldCupTeamRows() {
  const officialIds: string[] = []
  for (const teams of Object.values(WORLD_CUP_2026_OFFICIAL_GROUPS)) {
    for (const [index, team] of teams.entries()) {
      const existing = await prisma.worldCupTeam.findFirst({
        where: {
          OR: [
            { id: officialTeamId(team) },
            { fifaCode: team.fifaCode },
            { name: { equals: team.name, mode: "insensitive" } },
          ],
          NOT: [
            { id: { startsWith: "demo_team_" } },
            { id: { startsWith: "wc2026_placeholder_" } },
            { qualificationStatus: { in: ["test", "test_placeholder"] } },
            { sourcePayload: { path: ["testFixture"], equals: true } },
            { sourcePayload: { path: ["source"], equals: "allfantasy_test_placeholder" } },
          ],
        },
        select: { id: true },
      })
      const data = {
        name: team.name,
        country: team.name,
        fifaCode: team.fifaCode,
        flagUrl: getFlagUrlForCountryCode(team.fifaCode),
        logoUrl: getFlagUrlForCountryCode(team.fifaCode),
        groupName: team.group,
        qualificationStatus: "qualified",
        sourcePayload: {
          source: "allfantasy_official_2026_groups",
          groupName: team.group,
          seedOrder: index + 1,
        },
      }

      if (existing) {
        const row = await prisma.worldCupTeam.update({
          where: { id: existing.id },
          data,
          select: { id: true },
        })
        officialIds.push(row.id)
      } else {
        const row = await prisma.worldCupTeam.create({
          data: {
            id: officialTeamId(team),
            ...data,
          },
          select: { id: true },
        })
        officialIds.push(row.id)
      }
    }
  }

  return prisma.worldCupTeam.findMany({
    where: { id: { in: officialIds } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  })
}

async function clearStaleWorldCupGroupPicks(input: {
  challengeId: string
  groupId: string
  teamIds: string[]
}) {
  if (input.teamIds.length === 0) return { entriesReset: 0, groupPicksDeleted: 0, thirdPlacePicksDeleted: 0 }

  const [rankingPicks, thirdPlacePicks] = await Promise.all([
    prisma.worldCupGroupRankingPick.findMany({
      where: { challengeId: input.challengeId, groupId: input.groupId, teamId: { in: input.teamIds } },
      select: { entryId: true },
    }),
    prisma.worldCupThirdPlaceAdvancerPick.findMany({
      where: { challengeId: input.challengeId, groupId: input.groupId, teamId: { in: input.teamIds } },
      select: { entryId: true },
    }),
  ])
  const affectedEntryIds = [...new Set([...rankingPicks, ...thirdPlacePicks].map((pick) => pick.entryId))]

  const [groupDelete, thirdPlaceDelete] = await Promise.all([
    prisma.worldCupGroupRankingPick.deleteMany({
      where: { challengeId: input.challengeId, groupId: input.groupId, teamId: { in: input.teamIds } },
    }),
    prisma.worldCupThirdPlaceAdvancerPick.deleteMany({
      where: { challengeId: input.challengeId, groupId: input.groupId, teamId: { in: input.teamIds } },
    }),
  ])

  const resetResult = affectedEntryIds.length > 0
    ? await prisma.worldCupBracketEntry.updateMany({
        where: { id: { in: affectedEntryIds }, submittedAt: { not: null } },
        data: { submittedAt: null, isComplete: false, isLocked: false },
      })
    : { count: 0 }

  return {
    entriesReset: resetResult.count,
    groupPicksDeleted: groupDelete.count,
    thirdPlacePicksDeleted: thirdPlaceDelete.count,
  }
}

async function clearInvalidWorldCupGroupPicks(input: {
  challengeId: string
  groupId: string
  validTeamIds: Set<string>
}) {
  const [rankingPicks, thirdPlacePicks] = await Promise.all([
    prisma.worldCupGroupRankingPick.findMany({
      where: { challengeId: input.challengeId, groupId: input.groupId },
      select: { entryId: true, teamId: true },
    }),
    prisma.worldCupThirdPlaceAdvancerPick.findMany({
      where: { challengeId: input.challengeId, groupId: input.groupId },
      select: { entryId: true, teamId: true },
    }),
  ])
  const invalidTeamIds = [...new Set([...rankingPicks, ...thirdPlacePicks]
    .map((pick) => pick.teamId)
    .filter((teamId) => !input.validTeamIds.has(teamId)))]
  if (invalidTeamIds.length === 0) return { entriesReset: 0, groupPicksDeleted: 0, thirdPlacePicksDeleted: 0 }

  return clearStaleWorldCupGroupPicks({
    challengeId: input.challengeId,
    groupId: input.groupId,
    teamIds: invalidTeamIds,
  })
}

function toLockState(challenge: ChallengeForLock, entry: { isLocked?: boolean | null }) {
  const lock = isWorldCupChallengeLocked({
    challenge,
    matches: challenge.matches,
    entry,
  })
  return {
    isLocked: lock.locked,
    lockReason: lock.locked ? lock.reason : null,
  }
}

async function getEntryForRead(input: { challengeId: string; entryId: string; userId: string }) {
  const entry = await prisma.worldCupBracketEntry.findUnique({
    where: { id: input.entryId },
    include: {
      challenge: {
        include: {
          matches: {
            select: { startsAt: true, status: true, apiStatusShort: true },
          },
        },
      },
    },
  })
  if (!entry || entry.challengeId !== input.challengeId) throw new Error("Entry not found")
  if (entry.userId !== input.userId && entry.challenge.ownerUserId !== input.userId) {
    throw new Error("Entry not found")
  }
  return entry
}

async function getOwnedEntryForWrite(input: { challengeId: string; entryId: string; userId: string }) {
  const entry = await prisma.worldCupBracketEntry.findUnique({
    where: { id: input.entryId },
    include: {
      challenge: {
        include: {
          matches: {
            select: { startsAt: true, status: true, apiStatusShort: true },
          },
        },
      },
    },
  })
  if (!entry || entry.challengeId !== input.challengeId || entry.userId !== input.userId) {
    throw new Error("Entry not found")
  }
  const lock = toLockState(entry.challenge, entry)
  if (lock.isLocked) throw new Error(WORLD_CUP_BRACKET_LOCKED_MESSAGE)
  return entry
}

function buildCompletionState(input: {
  groupRankingPicks: Array<{ groupId: string; predictedRank: number }>
  thirdPlaceAdvancerPicks: Array<{ isSelected: boolean }>
}) {
  const rankedGroups = new Map<string, Set<number>>()
  for (const pick of input.groupRankingPicks) {
    const ranks = rankedGroups.get(pick.groupId) ?? new Set<number>()
    ranks.add(pick.predictedRank)
    rankedGroups.set(pick.groupId, ranks)
  }
  const groupsRankedCount = [...rankedGroups.values()].filter((ranks) => [1, 2, 3, 4].every((rank) => ranks.has(rank))).length
  const allGroupsRanked = groupsRankedCount === 12
  const thirdPlaceSelectedCount = input.thirdPlaceAdvancerPicks.filter((pick) => pick.isSelected).length
  const thirdPlaceComplete = thirdPlaceSelectedCount === 8
  return {
    groupsRankedCount,
    allGroupsRanked,
    thirdPlaceSelectedCount,
    thirdPlaceComplete,
    groupStageComplete: allGroupsRanked && thirdPlaceComplete,
  }
}

function sameOrderedValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function sameValueSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

export async function ensureWorldCupGroupsForChallenge(challengeId: string) {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, sourcePayload: true },
  })
  if (!challenge) throw new Error("Challenge not found")

  const definitions = buildWorldCupGroupDefinitions()
  await prisma.worldCupGroup.createMany({
    data: definitions.map((group) => ({ challengeId, ...group })),
    skipDuplicates: true,
  })

  const groups = await prisma.worldCupGroup.findMany({
    where: { challengeId },
    orderBy: { sortOrder: "asc" },
    include: { teams: { select: { teamId: true } } },
  })
  const teams = await prisma.worldCupTeam.findMany({
    where: { groupName: { not: null } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  })

  const isTestModeChallenge = isWorldCupTestModeChallenge(challenge)
  const shouldSeedPlaceholders = canSeedWorldCupPlaceholderTeams(challenge)
  const officialTeams = !isTestModeChallenge
    ? await ensureOfficialWorldCupTeamRows()
    : []
  const effectiveTeams = isTestModeChallenge ? teams : officialTeams
  const teamsByGroup = new Map<string, typeof teams>()
  for (const team of effectiveTeams) {
    if (!isTestModeChallenge && isWorldCupTestTeam(team)) continue
    const groupKey = normalizeGroupName(team.groupName)
    if (!groupKey) continue
    const rows = teamsByGroup.get(groupKey) ?? []
    rows.push(team)
    teamsByGroup.set(groupKey, rows)
  }

  const warnings: WorldCupGroupStageWarning[] = []
  const rowsToCreate: Array<{ challengeId: string; groupId: string; teamId: string; seedOrder: number }> = []
  for (const group of groups) {
    const groupKey = group.groupKey as WorldCupOfficialGroupKey
    const existingRows = await prisma.worldCupGroupTeam.findMany({
      where: { challengeId, groupId: group.id },
      include: { team: true },
      orderBy: { seedOrder: "asc" },
    })
    const officialGroupTeamIds = !isTestModeChallenge
      ? new Set((WORLD_CUP_2026_OFFICIAL_GROUPS[groupKey] ?? []).map(officialTeamId))
      : new Set<string>()
    const officialTeamIds = new Set((teamsByGroup.get(group.groupKey) ?? []).slice(0, 4).map((team) => team.id))
    const staleRows = !isTestModeChallenge && officialTeamIds.size === 4
      ? existingRows.filter((row) => {
          if (officialGroupTeamIds.has(row.teamId)) return false
          if (isWorldCupTestTeam(row.team)) return true
          const officialGroup = resolveWorldCup2026OfficialGroup({
            fifaCode: row.team.fifaCode,
            name: row.team.name,
            country: row.team.country,
          })
          return officialGroup !== group.groupKey
        })
      : []
    if (staleRows.length > 0) {
      const staleTeamIds = [...new Set(staleRows.map((row) => row.teamId))]
      const stalePickRepair = await clearStaleWorldCupGroupPicks({
        challengeId,
        groupId: group.id,
        teamIds: staleTeamIds,
      })
      await prisma.worldCupGroupTeam.deleteMany({
        where: { id: { in: staleRows.map((row) => row.id) } },
      })
      warnings.push({
        code: "GROUP_STALE_TEST_TEAMS_REPLACED",
        groupKey: group.groupKey as WorldCupGroupKey,
        message: `${group.displayName} replaced stale demo/test team rows with official 2026 group teams. Cleared ${stalePickRepair.groupPicksDeleted + stalePickRepair.thirdPlacePicksDeleted} stale saved pick${stalePickRepair.groupPicksDeleted + stalePickRepair.thirdPlacePicksDeleted === 1 ? "" : "s"}.`,
      })
    }

    const existingTeamIds = new Set(existingRows.filter((row) => !staleRows.some((stale) => stale.id === row.id)).map((team) => team.teamId))
    if (!isTestModeChallenge && officialTeamIds.size === 4) {
      const invalidPickRepair = await clearInvalidWorldCupGroupPicks({
        challengeId,
        groupId: group.id,
        validTeamIds: officialTeamIds,
      })
      const deletedCount = invalidPickRepair.groupPicksDeleted + invalidPickRepair.thirdPlacePicksDeleted
      if (deletedCount > 0) {
        warnings.push({
          code: "GROUP_STALE_SAVED_PICKS_CLEARED",
          groupKey: group.groupKey as WorldCupGroupKey,
          message: `${group.displayName} cleared ${deletedCount} saved pick${deletedCount === 1 ? "" : "s"} that referenced old demo/test/TBD teams.`,
        })
      }
    }
    const availableSlots = Math.max(0, 4 - existingTeamIds.size)
    const groupTeams = [...(teamsByGroup.get(group.groupKey) ?? [])]
      .filter((team) => !existingTeamIds.has(team.id))
      .slice(0, availableSlots)
    const existingSeededCount = existingTeamIds.size + groupTeams.length
    if (existingSeededCount < 4 && shouldSeedPlaceholders) {
      for (let seedOrder = existingSeededCount + 1; seedOrder <= 4; seedOrder += 1) {
        const placeholder = buildPlaceholderTeam(challengeId, group.groupKey, seedOrder)
        await prisma.worldCupTeam.upsert({
          where: { id: placeholder.id },
          update: {
            name: placeholder.name,
            country: placeholder.country,
            fifaCode: placeholder.fifaCode,
            groupName: placeholder.groupName,
            qualificationStatus: placeholder.qualificationStatus,
            sourcePayload: placeholder.sourcePayload,
          },
          create: placeholder,
        })
        groupTeams.push(placeholder)
      }
    }
    if (existingTeamIds.size + groupTeams.length < 4) {
      warnings.push({
        code: "GROUP_TEAMS_INCOMPLETE",
        groupKey: group.groupKey as WorldCupGroupKey,
        message: `${group.displayName} needs 4 teams before it can be saved.`,
      })
    }
    groupTeams.forEach((team, index) => {
      const seedOrder = seedOrderForTeam(team, existingTeamIds.size + index + 1)
      rowsToCreate.push({
        challengeId,
        groupId: group.id,
        teamId: team.id,
        seedOrder,
      })
    })
  }

  if (rowsToCreate.length > 0) {
    await prisma.worldCupGroupTeam.createMany({
      data: rowsToCreate,
      skipDuplicates: true,
    })
  }

  const refreshedGroups = await prisma.worldCupGroup.findMany({
    where: { challengeId },
    orderBy: { sortOrder: "asc" },
    include: {
      teams: {
        orderBy: { seedOrder: "asc" },
        include: { team: true },
      },
    },
  })

  return { groups: refreshedGroups, warnings }
}

export async function getWorldCupGroupStageView(input: {
  challengeId: string
  entryId: string
  userId: string
}): Promise<WorldCupGroupStageView> {
  const entry = await getEntryForRead(input)
  const ensured = await ensureWorldCupGroupsForChallenge(input.challengeId)
  const validGroupTeamIds = new Map<string, Set<string>>()
  for (const group of ensured.groups) {
    validGroupTeamIds.set(group.id, new Set(group.teams.map((row) => row.teamId)))
  }
  const [groupRankingPicks, thirdPlaceAdvancerPicks] = await Promise.all([
    prisma.worldCupGroupRankingPick.findMany({
      where: { challengeId: input.challengeId, entryId: input.entryId },
      orderBy: [{ groupId: "asc" }, { predictedRank: "asc" }],
    }),
    prisma.worldCupThirdPlaceAdvancerPick.findMany({
      where: { challengeId: input.challengeId, entryId: input.entryId },
      orderBy: [{ groupId: "asc" }],
    }),
  ])
  const visibleGroupRankingPicks = groupRankingPicks.filter((pick) => validGroupTeamIds.get(pick.groupId)?.has(pick.teamId))
  const visibleThirdPlaceAdvancerPicks = thirdPlaceAdvancerPicks.filter((pick) => validGroupTeamIds.get(pick.groupId)?.has(pick.teamId))
  return {
    challengeId: input.challengeId,
    entryId: input.entryId,
    groups: ensured.groups.map((group) => ({
      id: group.id,
      groupKey: group.groupKey,
      displayName: group.displayName,
      sortOrder: group.sortOrder,
      teams: group.teams.map((row) => ({
        id: row.id,
        teamId: row.teamId,
        name: row.team.name,
        country: row.team.country,
        fifaCode: row.team.fifaCode,
        flagUrl: row.team.flagUrl,
        logoUrl: row.team.logoUrl,
        seedOrder: row.seedOrder,
        actualRank: row.actualRank,
        points: row.points,
        goalDifference: row.goalDifference,
        goalsFor: row.goalsFor,
      })),
    })),
    groupRankingPicks: visibleGroupRankingPicks.map((pick) => ({
      id: pick.id,
      groupId: pick.groupId,
      teamId: pick.teamId,
      predictedRank: pick.predictedRank,
      actualRank: pick.actualRank,
      isCorrect: pick.isCorrect,
      pointsAwarded: pick.pointsAwarded,
    })),
    thirdPlaceAdvancerPicks: visibleThirdPlaceAdvancerPicks.map((pick) => ({
      id: pick.id,
      groupId: pick.groupId,
      teamId: pick.teamId,
      isSelected: pick.isSelected,
      actualAdvanced: pick.actualAdvanced,
      isCorrect: pick.isCorrect,
      pointsAwarded: pick.pointsAwarded,
    })),
    completion: buildCompletionState({ groupRankingPicks: visibleGroupRankingPicks, thirdPlaceAdvancerPicks: visibleThirdPlaceAdvancerPicks }),
    lock: toLockState(entry.challenge, entry),
    warnings: ensured.warnings,
  }
}

export async function saveWorldCupGroupRanking(input: {
  challengeId: string
  entryId: string
  groupId: string
  orderedTeamIds: string[]
  userId: string
}) {
  const entry = await getOwnedEntryForWrite(input)
  const validation = validateWorldCupGroupRanking(input.orderedTeamIds)
  if (!validation.ok) throw new Error(validation.error)
  await ensureWorldCupGroupsForChallenge(input.challengeId)

  const group = await prisma.worldCupGroup.findFirst({
    where: { id: input.groupId, challengeId: input.challengeId },
    include: { teams: { select: { teamId: true }, orderBy: { seedOrder: "asc" } } },
  })
  if (!group) throw new Error("Group not found")
  if (group.teams.length !== 4) {
    throw new Error(`${group.groupKey ? `Group ${group.groupKey}` : "This group"} needs 4 teams before it can be saved.`)
  }
  const groupTeamIds = new Set(group.teams.map((team) => team.teamId))
  if (input.orderedTeamIds.some((teamId) => !groupTeamIds.has(teamId))) {
    throw new Error("Every ranked team must belong to this group.")
  }
  const existingRanking = await prisma.worldCupGroupRankingPick.findMany({
    where: { challengeId: input.challengeId, entryId: input.entryId, groupId: input.groupId },
    orderBy: { predictedRank: "asc" },
    select: { teamId: true },
  })
  const rankingChanged = !sameOrderedValues(
    existingRanking.map((pick) => pick.teamId),
    input.orderedTeamIds
  )

  await prisma.$transaction(async (tx) => {
    if (rankingChanged && entry.submittedAt) {
      await tx.worldCupBracketEntry.update({
        where: { id: input.entryId },
        data: { submittedAt: null },
      })
    }
    await tx.worldCupGroupRankingPick.deleteMany({
      where: { entryId: input.entryId, groupId: input.groupId },
    })
    await tx.worldCupGroupRankingPick.createMany({
      data: input.orderedTeamIds.map((teamId, index) => ({
        challengeId: input.challengeId,
        entryId: input.entryId,
        groupId: input.groupId,
        teamId,
        predictedRank: index + 1,
      })),
    })
  })

  return getWorldCupGroupStageView(input)
}

export async function saveWorldCupThirdPlaceAdvancers(input: {
  challengeId: string
  entryId: string
  selectedTeamIds?: string[]
  selectedGroupIds?: string[]
  userId: string
}) {
  const entry = await getOwnedEntryForWrite(input)
  const picks = await prisma.worldCupGroupRankingPick.findMany({
    where: { challengeId: input.challengeId, entryId: input.entryId },
    orderBy: [{ groupId: "asc" }, { predictedRank: "asc" }],
  })
  const completion = buildCompletionState({ groupRankingPicks: picks, thirdPlaceAdvancerPicks: [] })
  if (!completion.allGroupsRanked) {
    throw new Error("Rank all 12 World Cup groups before selecting third-place advancers.")
  }

  const thirdPlaceByGroup = new Map(picks.filter((pick) => pick.predictedRank === 3).map((pick) => [pick.groupId, pick]))
  const thirdPlaceByTeam = new Map([...thirdPlaceByGroup.values()].map((pick) => [pick.teamId, pick]))
  let selected = input.selectedTeamIds?.length
    ? input.selectedTeamIds.map((teamId) => thirdPlaceByTeam.get(teamId))
    : (input.selectedGroupIds ?? []).map((groupId) => thirdPlaceByGroup.get(groupId))
  const selectedKeys = input.selectedTeamIds?.length ? input.selectedTeamIds : input.selectedGroupIds ?? []
  const validation = validateWorldCupThirdPlaceSelections(selectedKeys)
  if (!validation.ok) throw new Error(validation.error)
  if (selected.some((pick) => !pick)) {
    throw new Error("Third-place selections must match currently predicted third-place teams.")
  }

  const selectedPicks = selected as Array<NonNullable<(typeof selected)[number]>>
  const existingSelections = await prisma.worldCupThirdPlaceAdvancerPick.findMany({
    where: { challengeId: input.challengeId, entryId: input.entryId, isSelected: true },
    select: { teamId: true },
  })
  const thirdPlaceChanged = !sameValueSet(
    existingSelections.map((pick) => pick.teamId),
    selectedPicks.map((pick) => pick.teamId)
  )
  await prisma.$transaction(async (tx) => {
    if (thirdPlaceChanged && entry.submittedAt) {
      await tx.worldCupBracketEntry.update({
        where: { id: input.entryId },
        data: { submittedAt: null },
      })
    }
    await tx.worldCupThirdPlaceAdvancerPick.deleteMany({
      where: { entryId: input.entryId },
    })
    await tx.worldCupThirdPlaceAdvancerPick.createMany({
      data: selectedPicks.map((pick) => ({
        challengeId: input.challengeId,
        entryId: input.entryId,
        groupId: pick.groupId,
        teamId: pick.teamId,
        isSelected: true,
      })),
    })
  })

  return getWorldCupGroupStageView(input)
}
