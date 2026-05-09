import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { WorldCupRound } from "./types"
import { recalculateWorldCupChallenge } from "./worldCupScoringService"
import { formatWorldCupPlaceholder } from "./worldCupBracketUtils"

type DbMatch = {
  id: string
  challengeId: string
  round: string
  matchNumber: number
  homeSlotKey: string
  awaySlotKey: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string | null
  awayTeamLogo: string | null
  homeScore: number | null
  awayScore: number | null
  status: string
  winnerTeamId: string | null
  winnerTeamName: string | null
  nextMatchId: string | null
  nextMatchSlot: string | null
}

type DbChallenge = {
  id: string
  ownerUserId: string
  visibility: string
  includeThirdPlace: boolean
  sourcePayload: Prisma.JsonValue | null
  matches: DbMatch[]
}

export type WorldCupSimulationStrategy = "random" | "higher_seed" | "home" | "away"

type SimulateResultInput = {
  challengeId: string
  matchId: string
  winnerTeamId?: string | null
  homeScore?: number | null
  awayScore?: number | null
  status?: "scheduled" | "live" | "final"
  elapsedMinute?: number | null
  dryRun?: boolean
}

type SimulateRoundInput = {
  challengeId: string
  round: WorldCupRound
  strategy: WorldCupSimulationStrategy
  dryRun?: boolean
}

type SimulateTournamentInput = {
  challengeId: string
  strategy: WorldCupSimulationStrategy
  dryRun?: boolean
}

type ResetSimulationInput = {
  challengeId: string
  dryRun?: boolean
}

type ApplyMatchOptions = {
  winnerTeamId?: string | null
  homeScore?: number | null
  awayScore?: number | null
  status?: "scheduled" | "live" | "final"
  elapsedMinute?: number | null
  strategy?: WorldCupSimulationStrategy
  now: Date
  dryRun: boolean
}

function jsonObj(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return { ...(value as Prisma.JsonObject) }
}

function setSimulationState(payload: Prisma.JsonValue | null | undefined, patch: {
  simulationStatus?: string | null
  simulatedAt?: Date | null
}): Prisma.JsonObject {
  const base = jsonObj(payload)
  const simulation =
    base.simulation && typeof base.simulation === "object" && !Array.isArray(base.simulation)
      ? ({ ...(base.simulation as Prisma.JsonObject) } as Prisma.JsonObject)
      : ({} as Prisma.JsonObject)

  if (patch.simulationStatus !== undefined) {
    simulation.simulationStatus = patch.simulationStatus
  }
  if (patch.simulatedAt !== undefined) {
    simulation.simulatedAt = patch.simulatedAt ? patch.simulatedAt.toISOString() : null
  }

  base.simulation = simulation
  return base
}

function readSimulationFlags(sourcePayload: Prisma.JsonValue | null | undefined): {
  isTestMode: boolean
  simulationEnabled: boolean
} {
  const payload = jsonObj(sourcePayload)
  const simulation =
    payload.simulation && typeof payload.simulation === "object" && !Array.isArray(payload.simulation)
      ? (payload.simulation as Prisma.JsonObject)
      : null

  return {
    isTestMode: Boolean(simulation?.isTestMode),
    simulationEnabled: Boolean(simulation?.simulationEnabled),
  }
}

function parseSeed(slotKey: string): number {
  const groupMatch = slotKey.match(/^[A-L](\d)$/)
  if (groupMatch) {
    const value = Number(groupMatch[1])
    if (!Number.isNaN(value)) return value
  }
  if (slotKey.startsWith("W-M")) return 1
  if (slotKey.startsWith("L-M")) return 4
  if (slotKey.startsWith("TBD")) return 3
  return 2
}

function pickWinnerSide(match: DbMatch, strategy: WorldCupSimulationStrategy): "home" | "away" {
  if (strategy === "home") return "home"
  if (strategy === "away") return "away"
  if (strategy === "higher_seed") {
    const homeSeed = parseSeed(match.homeSlotKey)
    const awaySeed = parseSeed(match.awaySlotKey)
    if (homeSeed === awaySeed) return Math.random() >= 0.5 ? "home" : "away"
    return homeSeed < awaySeed ? "home" : "away"
  }
  return Math.random() >= 0.5 ? "home" : "away"
}

function pickScoresForWinner(side: "home" | "away", status: "scheduled" | "live" | "final"): {
  homeScore: number
  awayScore: number
  elapsedMinute: number
} {
  if (status === "scheduled") {
    return { homeScore: 0, awayScore: 0, elapsedMinute: 0 }
  }

  if (status === "live") {
    if (side === "home") return { homeScore: 1, awayScore: 0, elapsedMinute: 58 }
    return { homeScore: 0, awayScore: 1, elapsedMinute: 62 }
  }

  const winnersScore = 1 + Math.floor(Math.random() * 3)
  const losersScore = Math.floor(Math.random() * winnersScore)
  if (side === "home") return { homeScore: winnersScore, awayScore: losersScore, elapsedMinute: 90 }
  return { homeScore: losersScore, awayScore: winnersScore, elapsedMinute: 90 }
}

function inferWinnerFromScores(match: DbMatch, homeScore: number, awayScore: number): {
  winnerTeamId: string | null
  winnerTeamName: string | null
  winnerSide: "home" | "away"
} {
  if (homeScore === awayScore) {
    throw new Error("Simulation requires a non-tied score unless winnerTeamId is supplied")
  }

  const winnerSide = homeScore > awayScore ? "home" : "away"
  return {
    winnerSide,
    winnerTeamId: winnerSide === "home" ? match.homeTeamId : match.awayTeamId,
    winnerTeamName: winnerSide === "home" ? match.homeTeamName : match.awayTeamName,
  }
}

function resolveWinnerByTeamId(match: DbMatch, winnerTeamId: string): {
  winnerSide: "home" | "away"
  winnerTeamId: string | null
  winnerTeamName: string | null
} {
  if (winnerTeamId === match.homeTeamId) {
    return { winnerSide: "home", winnerTeamId: match.homeTeamId, winnerTeamName: match.homeTeamName }
  }
  if (winnerTeamId === match.awayTeamId) {
    return { winnerSide: "away", winnerTeamId: match.awayTeamId, winnerTeamName: match.awayTeamName }
  }
  throw new Error("winnerTeamId is not one of the teams in this match")
}

function canSimulateMatch(match: DbMatch): boolean {
  return Boolean(match.homeTeamName && match.awayTeamName)
}

async function loadChallenge(challengeId: string): Promise<DbChallenge> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      ownerUserId: true,
      visibility: true,
      includeThirdPlace: true,
      sourcePayload: true,
      matches: {
        orderBy: { matchNumber: "asc" },
        select: {
          id: true,
          challengeId: true,
          round: true,
          matchNumber: true,
          homeSlotKey: true,
          awaySlotKey: true,
          homeTeamId: true,
          awayTeamId: true,
          homeTeamName: true,
          awayTeamName: true,
          homeTeamLogo: true,
          awayTeamLogo: true,
          homeScore: true,
          awayScore: true,
          status: true,
          winnerTeamId: true,
          winnerTeamName: true,
          nextMatchId: true,
          nextMatchSlot: true,
        },
      },
    },
  })

  if (!challenge) {
    throw new Error("World Cup bracket challenge not found")
  }

  return challenge as unknown as DbChallenge
}

export async function getWorldCupSimulationAccessState(challengeId: string): Promise<{
  challengeId: string
  visibility: string
  includeThirdPlace: boolean
  isTestMode: boolean
  simulationEnabled: boolean
}> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, visibility: true, includeThirdPlace: true, sourcePayload: true },
  })
  if (!challenge) throw new Error("World Cup bracket challenge not found")
  const flags = readSimulationFlags(challenge.sourcePayload)
  return {
    challengeId: challenge.id,
    visibility: challenge.visibility,
    includeThirdPlace: challenge.includeThirdPlace,
    isTestMode: flags.isTestMode,
    simulationEnabled: flags.simulationEnabled,
  }
}

export function isWorldCupSimulationAllowed(input: {
  challengeVisibility: string
  isTestMode: boolean
  simulationEnabled: boolean
  confirmSimulation: boolean
}): { allowed: boolean; reason?: string } {
  const isProd = process.env.NODE_ENV === "production"
  if (!isProd) return { allowed: true }
  if (input.isTestMode || input.simulationEnabled) return { allowed: true }
  if (input.challengeVisibility === "public") {
    return { allowed: false, reason: "Simulation is blocked for public production leagues unless test mode is enabled" }
  }
  if (!input.confirmSimulation) {
    return { allowed: false, reason: "confirmSimulation is required in production" }
  }
  return { allowed: true }
}

function normalizeMatchRound(round: string): WorldCupRound | null {
  if (
    round === "round_of_32" ||
    round === "round_of_16" ||
    round === "quarterfinal" ||
    round === "semifinal" ||
    round === "final" ||
    round === "third_place"
  ) {
    return round
  }
  return null
}

async function applyMatchResultInternal(
  tx: Prisma.TransactionClient | typeof prisma,
  challenge: DbChallenge,
  match: DbMatch,
  options: ApplyMatchOptions
): Promise<{
  updatedMatch: DbMatch
  advancedMatchIds: string[]
}> {
  if (!canSimulateMatch(match)) {
    throw new Error(`Cannot simulate match ${match.matchNumber} until both sides are available`)
  }

  const status = options.status ?? "final"
  const sideFromStrategy = pickWinnerSide(match, options.strategy ?? "random")

  let resolvedWinner: { winnerSide: "home" | "away"; winnerTeamId: string | null; winnerTeamName: string | null }
  if (options.winnerTeamId) {
    resolvedWinner = resolveWinnerByTeamId(match, options.winnerTeamId)
  } else if (options.homeScore != null && options.awayScore != null) {
    resolvedWinner = inferWinnerFromScores(match, options.homeScore, options.awayScore)
  } else {
    const randomScores = pickScoresForWinner(sideFromStrategy, status)
    resolvedWinner = inferWinnerFromScores(match, randomScores.homeScore, randomScores.awayScore)
  }

  const derived =
    options.homeScore != null && options.awayScore != null
      ? {
          homeScore: options.homeScore,
          awayScore: options.awayScore,
          elapsedMinute: options.elapsedMinute ?? (status === "final" ? 90 : status === "live" ? 58 : 0),
        }
      : pickScoresForWinner(resolvedWinner.winnerSide, status)

  const finalStatus = status
  const updatedMatchInput = {
    homeScore: derived.homeScore,
    awayScore: derived.awayScore,
    winnerTeamId: finalStatus === "scheduled" ? null : resolvedWinner.winnerTeamId,
    winnerTeamName: finalStatus === "scheduled" ? null : resolvedWinner.winnerTeamName,
    status: finalStatus,
    elapsedMinute: options.elapsedMinute ?? derived.elapsedMinute,
    apiStatusShort: "SIM",
    lastScoreSyncedAt: options.now,
    sourcePayload: {
      ...(jsonObj((match as unknown as { sourcePayload?: Prisma.JsonValue }).sourcePayload)),
      simulation: {
        status: finalStatus,
        appliedAt: options.now.toISOString(),
      },
    },
  }

  const updatedMatch = options.dryRun
    ? ({ ...match, ...updatedMatchInput } as DbMatch)
    : ((await tx.worldCupBracketMatch.update({
        where: { id: match.id },
        data: updatedMatchInput,
      })) as unknown as DbMatch)

  const advancedMatchIds: string[] = []

  if (finalStatus !== "scheduled" && updatedMatch.nextMatchId && updatedMatch.nextMatchSlot) {
    const side = updatedMatch.nextMatchSlot === "home" ? "home" : "away"
    const teamLogo =
      resolvedWinner.winnerSide === "home" ? updatedMatch.homeTeamLogo : updatedMatch.awayTeamLogo

    const nextPatch =
      side === "home"
        ? {
            homeTeamId: resolvedWinner.winnerTeamId,
            homeTeamName: resolvedWinner.winnerTeamName ?? formatWorldCupPlaceholder(updatedMatch.homeSlotKey, updatedMatch.homeTeamName, updatedMatch.homeTeamId),
            homeTeamLogo: teamLogo,
            apiStatusShort: "SIM",
          }
        : {
            awayTeamId: resolvedWinner.winnerTeamId,
            awayTeamName: resolvedWinner.winnerTeamName ?? formatWorldCupPlaceholder(updatedMatch.awaySlotKey, updatedMatch.awayTeamName, updatedMatch.awayTeamId),
            awayTeamLogo: teamLogo,
            apiStatusShort: "SIM",
          }

    if (!options.dryRun) {
      await tx.worldCupBracketMatch.update({
        where: { id: updatedMatch.nextMatchId },
        data: {
          ...nextPatch,
          lastScoreSyncedAt: options.now,
        },
      })
    }
    advancedMatchIds.push(updatedMatch.nextMatchId)
  }

  if (challenge.includeThirdPlace && match.round === "semifinal" && finalStatus !== "scheduled") {
    const thirdPlace = challenge.matches.find((row) => row.round === "third_place")
    if (thirdPlace) {
      const loserSide = resolvedWinner.winnerSide === "home" ? "away" : "home"
      const loserTeamId = loserSide === "home" ? updatedMatch.homeTeamId : updatedMatch.awayTeamId
      const loserTeamName = loserSide === "home" ? updatedMatch.homeTeamName : updatedMatch.awayTeamName
      const loserTeamLogo = loserSide === "home" ? updatedMatch.homeTeamLogo : updatedMatch.awayTeamLogo

      const targetSide = match.matchNumber === 29 ? "home" : "away"
      if (!options.dryRun) {
        await tx.worldCupBracketMatch.update({
          where: { id: thirdPlace.id },
          data:
            targetSide === "home"
              ? {
                  homeTeamId: loserTeamId,
                  homeTeamName: loserTeamName,
                  homeTeamLogo: loserTeamLogo,
                  apiStatusShort: "SIM",
                  lastScoreSyncedAt: options.now,
                }
              : {
                  awayTeamId: loserTeamId,
                  awayTeamName: loserTeamName,
                  awayTeamLogo: loserTeamLogo,
                  apiStatusShort: "SIM",
                  lastScoreSyncedAt: options.now,
                },
        })
      }
      advancedMatchIds.push(thirdPlace.id)
    }
  }

  return { updatedMatch, advancedMatchIds }
}

export async function simulateWorldCupMatchResult(options: SimulateResultInput) {
  const challenge = await loadChallenge(options.challengeId)
  const match = challenge.matches.find((row) => row.id === options.matchId)
  if (!match) throw new Error("Match not found for this challenge")

  const now = new Date()
  if (options.dryRun) {
    const dry = await applyMatchResultInternal(prisma, challenge, match, {
      winnerTeamId: options.winnerTeamId,
      homeScore: options.homeScore,
      awayScore: options.awayScore,
      status: options.status,
      elapsedMinute: options.elapsedMinute,
      now,
      dryRun: true,
    })
    return {
      challengeId: options.challengeId,
      dryRun: true,
      updatedMatch: dry.updatedMatch,
      advancedMatchIds: dry.advancedMatchIds,
      recalculated: false,
      leaderboardTop: [],
    }
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const applied = await applyMatchResultInternal(tx, challenge, match, {
      winnerTeamId: options.winnerTeamId,
      homeScore: options.homeScore,
      awayScore: options.awayScore,
      status: options.status,
      elapsedMinute: options.elapsedMinute,
      now,
      dryRun: false,
    })

    await tx.worldCupBracketChallenge.update({
      where: { id: options.challengeId },
      data: {
        sourcePayload: setSimulationState(challenge.sourcePayload, {
          simulationStatus: "simulated_match",
          simulatedAt: now,
        }),
      },
    })

    return applied
  })

  const leaderboard = await recalculateWorldCupChallenge(options.challengeId)
  return {
    challengeId: options.challengeId,
    dryRun: false,
    updatedMatch: txResult.updatedMatch,
    advancedMatchIds: txResult.advancedMatchIds,
    recalculated: true,
    leaderboardTop: leaderboard.slice(0, 10),
  }
}

async function simulateRoundInternal(input: SimulateRoundInput & {
  skipRecalculate?: boolean
}): Promise<{
  challengeId: string
  round: WorldCupRound
  dryRun: boolean
  strategy: WorldCupSimulationStrategy
  simulatedMatches: number
  skippedMatches: number
  skippedMatchIds: string[]
}> {
  const challenge = await loadChallenge(input.challengeId)
  const roundMatches = challenge.matches.filter((m) => normalizeMatchRound(m.round) === input.round)

  const runnable = roundMatches.filter((m) => canSimulateMatch(m))
  const skipped = roundMatches.filter((m) => !canSimulateMatch(m)).map((m) => m.id)

  if (input.dryRun) {
    for (const match of runnable) {
      await applyMatchResultInternal(prisma, challenge, match, {
        strategy: input.strategy,
        status: "final",
        now: new Date(),
        dryRun: true,
      })
    }

    return {
      challengeId: input.challengeId,
      round: input.round,
      strategy: input.strategy,
      dryRun: true,
      simulatedMatches: runnable.length,
      skippedMatches: skipped.length,
      skippedMatchIds: skipped,
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    for (const match of runnable) {
      await applyMatchResultInternal(tx, challenge, match, {
        strategy: input.strategy,
        status: "final",
        now,
        dryRun: false,
      })
    }

    await tx.worldCupBracketChallenge.update({
      where: { id: input.challengeId },
      data: {
        sourcePayload: setSimulationState(challenge.sourcePayload, {
          simulationStatus: `simulated_${input.round}`,
          simulatedAt: now,
        }),
      },
    })
  })

  if (!input.skipRecalculate) {
    await recalculateWorldCupChallenge(input.challengeId)
  }

  return {
    challengeId: input.challengeId,
    round: input.round,
    strategy: input.strategy,
    dryRun: false,
    simulatedMatches: runnable.length,
    skippedMatches: skipped.length,
    skippedMatchIds: skipped,
  }
}

export async function simulateWorldCupRound(input: SimulateRoundInput) {
  return simulateRoundInternal(input)
}

export async function simulateWorldCupTournament(input: SimulateTournamentInput) {
  const challenge = await loadChallenge(input.challengeId)
  const rounds: WorldCupRound[] = [
    "round_of_32",
    "round_of_16",
    "quarterfinal",
    "semifinal",
    "final",
  ]
  if (challenge.includeThirdPlace) {
    rounds.splice(4, 0, "third_place")
  }

  const summaries: Array<{
    round: WorldCupRound
    simulatedMatches: number
    skippedMatches: number
    skippedMatchIds: string[]
  }> = []

  for (const round of rounds) {
    const result = await simulateRoundInternal({
      challengeId: input.challengeId,
      strategy: input.strategy,
      round,
      dryRun: input.dryRun,
      skipRecalculate: true,
    })
    summaries.push({
      round,
      simulatedMatches: result.simulatedMatches,
      skippedMatches: result.skippedMatches,
      skippedMatchIds: result.skippedMatchIds,
    })
  }

  let leaderboardTop: unknown[] = []
  if (!input.dryRun) {
    const now = new Date()
    const updatedChallenge = await prisma.worldCupBracketChallenge.findUnique({
      where: { id: input.challengeId },
      select: { sourcePayload: true },
    })
    await prisma.worldCupBracketChallenge.update({
      where: { id: input.challengeId },
      data: {
        sourcePayload: setSimulationState(updatedChallenge?.sourcePayload, {
          simulationStatus: "simulated_tournament",
          simulatedAt: now,
        }),
      },
    })
    const leaderboard = await recalculateWorldCupChallenge(input.challengeId)
    leaderboardTop = leaderboard.slice(0, 10)
  }

  const finalMatch = await prisma.worldCupBracketMatch.findFirst({
    where: { challengeId: input.challengeId, round: "final" },
    select: { winnerTeamId: true, winnerTeamName: true },
  })

  return {
    challengeId: input.challengeId,
    dryRun: Boolean(input.dryRun),
    strategy: input.strategy,
    rounds: summaries,
    champion: {
      winnerTeamId: finalMatch?.winnerTeamId ?? null,
      winnerTeamName: finalMatch?.winnerTeamName ?? null,
    },
    leaderboardTop,
  }
}

export async function resetWorldCupSimulation(input: ResetSimulationInput) {
  const challenge = await loadChallenge(input.challengeId)
  const now = new Date()

  const updates = challenge.matches.map((match) => {
    const isOpeningRound = match.round === "round_of_32"
    const resetNameHome = formatWorldCupPlaceholder(match.homeSlotKey, match.homeTeamName, match.homeTeamId)
    const resetNameAway = formatWorldCupPlaceholder(match.awaySlotKey, match.awayTeamName, match.awayTeamId)

    return {
      id: match.id,
      data: {
        status: "scheduled",
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamId: null,
        winnerTeamName: null,
        elapsedMinute: null,
        injuryTime: null,
        period: null,
        apiStatusShort: null,
        lastScoreSyncedAt: null,
        sourcePayload: null,
        homeTeamId: isOpeningRound ? match.homeTeamId : null,
        awayTeamId: isOpeningRound ? match.awayTeamId : null,
        homeTeamName: resetNameHome,
        awayTeamName: resetNameAway,
        homeTeamLogo: isOpeningRound ? match.homeTeamLogo : null,
        awayTeamLogo: isOpeningRound ? match.awayTeamLogo : null,
      },
    }
  })

  if (!input.dryRun) {
    await prisma.$transaction(async (tx) => {
      for (const item of updates) {
        await tx.worldCupBracketMatch.update({ where: { id: item.id }, data: item.data })
      }
      await tx.worldCupBracketChallenge.update({
        where: { id: input.challengeId },
        data: {
          sourcePayload: setSimulationState(challenge.sourcePayload, {
            simulationStatus: "reset",
            simulatedAt: now,
          }),
        },
      })
    })
    await recalculateWorldCupChallenge(input.challengeId)
  }

  return {
    challengeId: input.challengeId,
    dryRun: Boolean(input.dryRun),
    resetMatches: updates.length,
    recalculated: !input.dryRun,
  }
}

/**
 * Load demo test fixtures into World Cup bracket.
 *
 * Admin-only operation to populate first-round matches with demo teams
 * so the full pick flow can be tested before real fixture data is available.
 */
export async function loadWorldCupTestFixtures(
  challengeId: string,
  options: { dryRun?: boolean } = {}
): Promise<{
  success: boolean
  teamsCreated: number
  teamsUpdated: number
  matchesUpdated: number
  pickableMatchesAfter: number
  totalMatchesAfter: number
  unresolvedMatchesAfter: number
  warnings: string[]
}> {
  const { WORLD_CUP_DEMO_TEAMS, buildWorldCupDemoRoundOf32Fixtures } = await import("./worldCupTestFixtures")

  const warnings: string[] = []
  let teamsCreated = 0
  let teamsUpdated = 0
  let matchesUpdated = 0

  try {
    const challenge = await prisma.worldCupBracketChallenge.findUnique({
      where: { id: challengeId },
      include: {
        matches: {
          orderBy: { matchNumber: "asc" },
        },
      },
    })

    if (!challenge) {
      return {
        success: false,
        teamsCreated,
        teamsUpdated,
        matchesUpdated,
        pickableMatchesAfter: 0,
        totalMatchesAfter: 0,
        unresolvedMatchesAfter: 0,
        warnings: ["Challenge not found"],
      }
    }

    const existingTeams = await prisma.worldCupTeam.findMany({
      where: { id: { in: WORLD_CUP_DEMO_TEAMS.map((t) => t.id) } },
      select: { id: true },
    })
    const existingTeamIds = new Set(existingTeams.map((t) => t.id))
    teamsCreated = WORLD_CUP_DEMO_TEAMS.filter((t) => !existingTeamIds.has(t.id)).length
    teamsUpdated = WORLD_CUP_DEMO_TEAMS.length - teamsCreated

    const fixturePatches = buildWorldCupDemoRoundOf32Fixtures(challenge.matches)

    if (!options.dryRun) {
      for (const team of WORLD_CUP_DEMO_TEAMS) {
        await prisma.worldCupTeam.upsert({
          where: { id: team.id },
          create: {
            id: team.id,
            name: team.name,
            country: team.name,
            fifaCode: team.fifaCode,
            flagUrl: team.flagUrl,
            logoUrl: team.flagUrl,
            groupName: team.groupName,
            qualificationStatus: "qualified",
            sourcePayload: { testFixture: true, seed: team.seed, groupName: team.groupName },
          },
          update: {
            name: team.name,
            country: team.name,
            fifaCode: team.fifaCode,
            flagUrl: team.flagUrl,
            logoUrl: team.flagUrl,
            groupName: team.groupName,
            qualificationStatus: "qualified",
            sourcePayload: { testFixture: true, seed: team.seed, groupName: team.groupName },
          },
        })
      }

      for (const patch of fixturePatches) {
        const match = challenge.matches.find((m) => m.id === patch.matchId)
        if (!match) continue

        if (match.status === "final" || match.apiStatusShort === "SIM") {
          warnings.push(`Skipped match ${match.matchNumber} because it already has simulated/final results`)
          continue
        }

        await prisma.worldCupBracketMatch.update({
          where: { id: patch.matchId },
          data: patch.data,
        })
        matchesUpdated += 1
      }
    } else {
      matchesUpdated = fixturePatches.filter((patch) => {
        const match = challenge.matches.find((m) => m.id === patch.matchId)
        if (!match) return false
        return !(match.status === "final" || match.apiStatusShort === "SIM")
      }).length
    }

    const effectiveMatches = options.dryRun
      ? challenge.matches.map((m) => {
          const patch = fixturePatches.find((p) => p.matchId === m.id)
          if (!patch) return m
          if (m.status === "final" || m.apiStatusShort === "SIM") return m
          return { ...m, ...patch.data }
        })
      : (
          (await prisma.worldCupBracketChallenge.findUnique({
            where: { id: challengeId },
            include: { matches: { orderBy: { matchNumber: "asc" } } },
          }))?.matches ?? challenge.matches
        )

    const pickableCount = effectiveMatches.filter((m) => Boolean(m.homeTeamId && m.awayTeamId) && m.status !== "final").length
    const unresolvedCount = effectiveMatches.filter((m) => !m.homeTeamId || !m.awayTeamId).length

    return {
      success: true,
      teamsCreated,
      teamsUpdated,
      matchesUpdated,
      pickableMatchesAfter: pickableCount,
      totalMatchesAfter: effectiveMatches.length,
      unresolvedMatchesAfter: unresolvedCount,
      warnings,
    }
  } catch (error) {
    return {
      success: false,
      teamsCreated,
      teamsUpdated,
      matchesUpdated,
      pickableMatchesAfter: 0,
      totalMatchesAfter: 0,
      unresolvedMatchesAfter: 0,
      warnings: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

