import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildWorldCupLeaderboardRows } from "./worldCupScoringService"

// ─────────────────────────────────────────────────────────────────────────────
// Card Types — all numeric/factual fields are deterministic; aiNarrative is AI-only
// ─────────────────────────────────────────────────────────────────────────────

export type RootingGuideCard = {
  kind: "rooting_guide"
  /** Entry perspective */
  entryId: string
  entryName: string
  displayName: string
  rank: number
  currentScore: number
  leaderScore: number
  /** Critical upcoming match */
  matchId: string
  homeTeam: string
  awayTeam: string
  roundLabel: string
  kickoffEt: string | null
  /** Rooting specifics */
  rootFor: string
  threatTeam: string
  /** Points lost if threatTeam wins this round */
  pointsAtRisk: number
  /** Display names of higher-ranked entries who picked threatTeam */
  usersAboveWithThreat: string[]
  bestOutcomeLabel: string
  /** AI writes this — 1-2 sentences. Never contains invented numbers. */
  aiNarrative: string | null
}

export type PoolSwingAlertCard = {
  kind: "pool_swing"
  matchId: string
  homeTeam: string
  awayTeam: string
  roundLabel: string
  kickoffEt: string | null
  /** Team more entries picked */
  favoredTeam: string
  /** Team fewer entries picked */
  underdogTeam: string
  favoredCount: number
  underdogCount: number
  /** underdogCount × roundPoints — points that change hands if the upset hits */
  maxPointsAtRisk: number
  /** 1-10 based on pick-split balance × round weight */
  chaosRating: number
  /** Display names of users with picks in this match (both sides, up to 5) */
  highImpactDisplayNames: string[]
  totalEntries: number
  aiNarrative: string | null
}

export type ChampionPickRiskCard = {
  kind: "champion_risk"
  /** null when pool-wide (no specific entry scoped) */
  entryId: string | null
  entryName: string | null
  /** Most popular (or entry's own) champion pick */
  topChampion: string
  topChampionCount: number
  totalEntries: number
  /** Percent of finalized entries picking topChampion */
  poolPickPercent: number
  /** low ≥50%, medium 25-49%, high <25% */
  differentiation: "low" | "medium" | "high"
  upsideLabel: string
  /** 2nd/3rd most popular champion picks for comparison */
  alternativeLeverage: string[]
  aiNarrative: string | null
}

export type CommissionerRecapCard = {
  kind: "commissioner_recap"
  /** Human label for the period: "Quarterfinal", "Group Stage", etc. */
  periodLabel: string
  biggestWinner: { displayName: string; entryName: string; roundScore: number; rank: number } | null
  biggestLoser: { displayName: string; entryName: string; roundScore: number; rank: number } | null
  bestUpcomingMatch: {
    matchId: string
    homeTeam: string
    awayTeam: string
    roundLabel: string
    kickoffEt: string | null
    chaosRating: number
  } | null
  leaderName: string | null
  leaderScore: number
  totalEntries: number
  /** AI-generated commissioner message — never computed from external data */
  suggestedPost: string | null
}

export type InsightCard =
  | RootingGuideCard
  | PoolSwingAlertCard
  | ChampionPickRiskCard
  | CommissionerRecapCard

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — deterministic, no AI
// ─────────────────────────────────────────────────────────────────────────────

const CARD_PICK_SELECT = {
  id: true,
  matchId: true,
  round: true,
  selectedTeamName: true,
  pointsAwarded: true,
  isCorrect: true,
} satisfies Prisma.WorldCupBracketPickSelect

function toRoundLabel(round: string): string {
  const map: Record<string, string> = {
    group: "Group Stage",
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarter_final: "Quarterfinal",
    semi_final: "Semifinal",
    final: "Final",
    third_place: "3rd Place",
  }
  return map[round] ?? round.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

type ScoringProfileLike = {
  roundOf32Points?: number | null
  roundOf16Points?: number | null
  quarterFinalPoints?: number | null
  semiFinalPoints?: number | null
  finalPoints?: number | null
} | null

function getRoundPts(sc: ScoringProfileLike, round: string): number {
  const map: Record<string, number> = {
    group:         sc?.roundOf32Points ?? 1,
    round_of_32:   sc?.roundOf32Points ?? 1,
    round_of_16:   sc?.roundOf16Points ?? 2,
    quarter_final: sc?.quarterFinalPoints ?? 4,
    semi_final:    sc?.semiFinalPoints ?? 8,
    final:         sc?.finalPoints ?? 16,
    third_place:   2,
  }
  return map[round] ?? 1
}

/**
 * Chaos rating 1–10.
 * Perfect 50/50 split in a Final = 10.  One-sided group-stage match = 1.
 */
function computeChaosRating(homePicks: number, awayPicks: number, round: string): number {
  const total = homePicks + awayPicks
  if (total === 0) return 0
  const balance = Math.min(homePicks, awayPicks) / total // 0 → 0.5
  const w: Record<string, number> = {
    group: 0.7, round_of_32: 0.75, round_of_16: 0.85,
    quarter_final: 0.9, semi_final: 1.0, final: 1.0, third_place: 0.6,
  }
  return Math.max(1, Math.min(10, Math.round(balance * (w[round] ?? 0.8) * 20)))
}

function formatKickoffEt(startsAt: Date | string | null | undefined): string | null {
  if (!startsAt) return null
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York",
      }).format(new Date(startsAt)) + " ET"
    )
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Builders — deterministic; aiNarrative / suggestedPost are always null here
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds the upcoming match with the biggest combined leaderboard swing potential
 * and returns a structured card.  No entryId needed — this is pool-wide.
 */
export async function buildPoolSwingAlertCard(
  challengeId: string,
): Promise<PoolSwingAlertCard | null> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: {
        where: { isComplete: true, submittedAt: { not: null } },
        include: {
          picks: { select: CARD_PICK_SELECT },
          participant: { select: { displayName: true } },
        },
      },
    },
  })
  if (!challenge || challenge.entries.length === 0) return null

  type MatchRow = { id: string; status: string; homeTeamName: string; awayTeamName: string; round: string; startsAt?: Date | null }
  type PickRow = { matchId: string; selectedTeamName: string | null }
  type EntryRow = { picks?: PickRow[]; participant?: { displayName?: string | null } | null; name?: string }

  const upcoming = (challenge.matches as MatchRow[]).filter(
    (m) => m.status !== "final" && m.homeTeamName && m.awayTeamName
  )
  if (upcoming.length === 0) return null

  const allPicks = (challenge.entries as EntryRow[]).flatMap((e) => e.picks ?? [])
  const sc = challenge.scoringProfile

  type Candidate = {
    matchId: string; home: string; away: string; round: string
    homePicks: number; awayPicks: number; swingScore: number; pts: number
    startsAt: Date | null | undefined
  }
  let best: Candidate | null = null

  for (const m of upcoming) {
    const picks = allPicks.filter((p: PickRow) => p.matchId === m.id)
    const home = picks.filter((p: PickRow) => p.selectedTeamName === m.homeTeamName).length
    const away = picks.filter((p: PickRow) => p.selectedTeamName === m.awayTeamName).length
    if (home + away === 0) continue
    const pts = getRoundPts(sc, m.round)
    const swing = Math.min(home, away) * pts
    if (!best || swing > best.swingScore) {
      best = { matchId: m.id, home: m.homeTeamName, away: m.awayTeamName, round: m.round,
               homePicks: home, awayPicks: away, swingScore: swing, pts,
               startsAt: m.startsAt ?? null }
    }
  }
  if (!best) return null

  const favoredCount = Math.max(best.homePicks, best.awayPicks)
  const underdogCount = Math.min(best.homePicks, best.awayPicks)
  const favoredTeam = best.homePicks >= best.awayPicks ? best.home : best.away
  const underdogTeam = best.homePicks >= best.awayPicks ? best.away : best.home

  // Collect display names of entries with picks in this match
  const impacted: string[] = []
  for (const entry of challenge.entries as EntryRow[]) {
    const hasPick = (entry.picks ?? []).some((p: PickRow) => p.matchId === best!.matchId)
    if (hasPick) {
      const name = entry.participant?.displayName ?? (entry as any).name ?? null
      if (name) impacted.push(String(name))
    }
  }

  return {
    kind: "pool_swing",
    matchId: best.matchId,
    homeTeam: best.home,
    awayTeam: best.away,
    roundLabel: toRoundLabel(best.round),
    kickoffEt: formatKickoffEt(best.startsAt),
    favoredTeam,
    underdogTeam,
    favoredCount,
    underdogCount,
    maxPointsAtRisk: underdogCount * best.pts,
    chaosRating: computeChaosRating(best.homePicks, best.awayPicks, best.round),
    highImpactDisplayNames: impacted.slice(0, 5),
    totalEntries: challenge.entries.length,
    aiNarrative: null,
  }
}

/**
 * Champion pick concentration for the pool (or scoped to one entry).
 * Shows the most popular pick, pool %, differentiation tier, and contrarian alternatives.
 */
export async function buildChampionPickRiskCard(
  challengeId: string,
  entryId?: string,
): Promise<ChampionPickRiskCard | null> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      entries: {
        where: { isComplete: true, submittedAt: { not: null } },
        select: {
          id: true,
          name: true,
          championTeamName: true,
          picks: {
            select: { round: true, selectedTeamName: true },
            where: { round: "final" },
          },
        },
      },
    },
  })
  if (!challenge || challenge.entries.length === 0) return null

  type EntryRow = {
    id: string
    name: string
    championTeamName?: string | null
    picks?: Array<{ round: string; selectedTeamName?: string | null }>
  }
  const entries = challenge.entries as EntryRow[]
  const total = entries.length

  // Champion distribution
  const champCounts = new Map<string, number>()
  for (const e of entries) {
    const champ =
      e.championTeamName?.trim() ||
      e.picks?.find((p) => p.round === "final")?.selectedTeamName?.trim()
    if (champ) champCounts.set(champ, (champCounts.get(champ) ?? 0) + 1)
  }

  const sorted = [...champCounts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null

  // Entry-scoped override
  let scopedId: string | null = null
  let scopedName: string | null = null
  let topChampion = sorted[0][0]
  let topCount = sorted[0][1]

  if (entryId) {
    const entry = entries.find((e) => e.id === entryId)
    if (entry) {
      const champ =
        entry.championTeamName?.trim() ||
        entry.picks?.find((p) => p.round === "final")?.selectedTeamName?.trim()
      if (champ) {
        scopedId = entry.id
        scopedName = entry.name
        topChampion = champ
        topCount = champCounts.get(champ) ?? 1
      }
    }
  }

  const pct = Math.round((topCount / total) * 100)
  const differentiation: "low" | "medium" | "high" =
    pct >= 50 ? "low" : pct >= 25 ? "medium" : "high"

  const upsideLabel =
    differentiation === "low"
      ? "Safe but crowded — upside capped if they win"
      : differentiation === "medium"
        ? "Good balance of safety and uniqueness"
        : "Contrarian pick — high upside if correct"

  const alternatives = sorted
    .filter(([t]) => t !== topChampion)
    .slice(0, 2)
    .map(([t]) => t)

  return {
    kind: "champion_risk",
    entryId: scopedId,
    entryName: scopedName,
    topChampion,
    topChampionCount: topCount,
    totalEntries: total,
    poolPickPercent: pct,
    differentiation,
    upsideLabel,
    alternativeLeverage: alternatives,
    aiNarrative: null,
  }
}

/**
 * For a specific entry (or the pool leader if no entryId), finds their most
 * critical upcoming pick and tells them who to root for and what's at stake.
 */
export async function buildRootingGuideCard(
  challengeId: string,
  entryId?: string,
): Promise<RootingGuideCard | null> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: {
        where: { isComplete: true, submittedAt: { not: null } },
        include: {
          picks: { select: CARD_PICK_SELECT },
          participant: { select: { displayName: true } },
        },
      },
    },
  })
  if (!challenge || challenge.entries.length === 0) return null

  type MatchRow = { id: string; status: string; homeTeamName: string; awayTeamName: string; round: string; startsAt?: Date | null }
  type PickRow = { matchId: string; selectedTeamName: string | null; round: string; pointsAwarded: number; isCorrect: boolean | null }
  type EntryRow = { id: string; name: string; picks?: PickRow[]; participant?: { displayName?: string | null } | null }

  const rows = buildWorldCupLeaderboardRows({
    entries: challenge.entries as any,
    matches: challenge.matches as any,
    scoring: challenge.scoringProfile,
  })
  const sorted = [...rows].sort((a, b) => a.rank - b.rank || b.totalScore - a.totalScore)
  if (sorted.length === 0) return null

  const leader = sorted[0]
  const targetRow = entryId
    ? (sorted.find((r) => r.entryId === entryId) ?? sorted[0])
    : sorted[0]

  const targetEntry = (challenge.entries as EntryRow[]).find(
    (e) => e.id === targetRow.entryId,
  )
  if (!targetEntry) return null

  const matchMap = new Map(
    (challenge.matches as MatchRow[]).map((m) => [m.id, m]),
  )
  const sc = challenge.scoringProfile

  // Find the most critical upcoming pick: highest round points, not yet final
  type Candidate = { match: MatchRow; pickedTeam: string; pts: number }
  const upcoming: Candidate[] = []
  for (const pick of (targetEntry.picks ?? []) as PickRow[]) {
    const m = matchMap.get(pick.matchId)
    if (!m || m.status === "final" || !pick.selectedTeamName) continue
    upcoming.push({ match: m, pickedTeam: pick.selectedTeamName, pts: getRoundPts(sc, m.round) })
  }
  if (upcoming.length === 0) return null

  upcoming.sort((a, b) => b.pts - a.pts)
  const top = upcoming[0]!
  const { match, pickedTeam, pts } = top
  const rootFor = pickedTeam
  const threatTeam =
    match.homeTeamName === rootFor ? match.awayTeamName : match.homeTeamName

  // Higher-ranked entries who picked the threat in this match
  const usersAboveWithThreat: string[] = []
  for (const row of sorted) {
    if (row.rank >= targetRow.rank || row.entryId === targetRow.entryId) continue
    const entry = (challenge.entries as EntryRow[]).find((e) => e.id === row.entryId)
    const pick = (entry?.picks ?? []).find((p: PickRow) => p.matchId === match.id)
    if (pick?.selectedTeamName === threatTeam) {
      usersAboveWithThreat.push(
        entry?.participant?.displayName ?? entry?.name ?? row.displayName,
      )
    }
  }

  return {
    kind: "rooting_guide",
    entryId: targetRow.entryId,
    entryName: targetRow.entryName,
    displayName: targetRow.displayName,
    rank: targetRow.rank,
    currentScore: targetRow.totalScore,
    leaderScore: leader.totalScore,
    matchId: match.id,
    homeTeam: match.homeTeamName,
    awayTeam: match.awayTeamName,
    roundLabel: toRoundLabel(match.round),
    kickoffEt: formatKickoffEt(match.startsAt),
    rootFor,
    threatTeam,
    pointsAtRisk: pts,
    usersAboveWithThreat: usersAboveWithThreat.slice(0, 5),
    bestOutcomeLabel: `${rootFor} wins`,
    aiNarrative: null,
  }
}

/**
 * Pool-wide round recap:  who won the most points, who lost the most,
 * what's the best upcoming match, and where the leaderboard stands.
 * The AI later fills in suggestedPost with a group-chat message.
 */
export async function buildCommissionerRecapCard(
  challengeId: string,
): Promise<CommissionerRecapCard | null> {
  const challenge = await prisma.worldCupBracketChallenge.findUnique({
    where: { id: challengeId },
    include: {
      matches: true,
      scoringProfile: true,
      entries: {
        where: { isComplete: true, submittedAt: { not: null } },
        include: {
          picks: { select: CARD_PICK_SELECT },
          participant: { select: { displayName: true } },
        },
      },
    },
  })
  if (!challenge || challenge.entries.length === 0) return null

  type MatchRow = { id: string; status: string; homeTeamName: string; awayTeamName: string; round: string; startsAt?: Date | null }
  type PickRow = { matchId: string; selectedTeamName: string | null; round: string; pointsAwarded: number; isCorrect: boolean | null }
  type EntryRow = { id: string; name: string; picks?: PickRow[]; participant?: { displayName?: string | null } | null }

  const rows = buildWorldCupLeaderboardRows({
    entries: challenge.entries as any,
    matches: challenge.matches as any,
    scoring: challenge.scoringProfile,
  })
  const sorted = [...rows].sort((a, b) => a.rank - b.rank || b.totalScore - a.totalScore)

  // Most recently active round = round of the most recent final match
  const finalMatches = (challenge.matches as MatchRow[])
    .filter((m) => m.status === "final")
    .sort((a, b) => {
      const da = a.startsAt ? new Date(a.startsAt).getTime() : 0
      const db = b.startsAt ? new Date(b.startsAt).getTime() : 0
      return db - da
    })
  const activeRound = finalMatches[0]?.round ?? null
  const periodLabel = activeRound ? toRoundLabel(activeRound) : "Recent"

  // Biggest winner / loser this round — by roundBreakdown score
  let biggestWinner: CommissionerRecapCard["biggestWinner"] = null
  let biggestLoser: CommissionerRecapCard["biggestLoser"] = null

  if (activeRound) {
    let maxScore = -1
    let minScore = Infinity
    for (const row of sorted) {
      const roundBreakdown = row.roundBreakdown as Record<string, number>
      const rs = roundBreakdown[activeRound] ?? 0
      const entry = (challenge.entries as EntryRow[]).find((e) => e.id === row.entryId)
      const hasPicksThisRound = (entry?.picks ?? []).some(
        (p: PickRow) => p.round === activeRound,
      )
      if (rs > maxScore) {
        maxScore = rs
        biggestWinner = {
          displayName: row.displayName,
          entryName: row.entryName,
          roundScore: rs,
          rank: row.rank,
        }
      }
      if (hasPicksThisRound && rs < minScore) {
        minScore = rs
        biggestLoser = {
          displayName: row.displayName,
          entryName: row.entryName,
          roundScore: rs,
          rank: row.rank,
        }
      }
    }
    // Don't duplicate winner=loser when only 1 entry
    if (
      biggestLoser &&
      biggestWinner &&
      biggestLoser.entryName === biggestWinner.entryName
    ) {
      biggestLoser = null
    }
  }

  // Best upcoming match by chaos rating
  const allPicks = (challenge.entries as EntryRow[]).flatMap((e) => e.picks ?? [])
  const upcoming = (challenge.matches as MatchRow[]).filter(
    (m) => m.status !== "final" && m.homeTeamName && m.awayTeamName,
  )
  let bestUpcoming: CommissionerRecapCard["bestUpcomingMatch"] = null
  let bestChaos = -1
  for (const m of upcoming) {
    const picks = allPicks.filter((p: PickRow) => p.matchId === m.id)
    const home = picks.filter((p: PickRow) => p.selectedTeamName === m.homeTeamName).length
    const away = picks.filter((p: PickRow) => p.selectedTeamName === m.awayTeamName).length
    const chaos = computeChaosRating(home, away, m.round)
    if (chaos > bestChaos) {
      bestChaos = chaos
      bestUpcoming = {
        matchId: m.id,
        homeTeam: m.homeTeamName,
        awayTeam: m.awayTeamName,
        roundLabel: toRoundLabel(m.round),
        kickoffEt: formatKickoffEt(m.startsAt),
        chaosRating: chaos,
      }
    }
  }

  return {
    kind: "commissioner_recap",
    periodLabel,
    biggestWinner,
    biggestLoser,
    bestUpcomingMatch: bestUpcoming,
    leaderName:
      sorted[0]?.displayName ?? sorted[0]?.entryName ?? null,
    leaderScore: sorted[0]?.totalScore ?? 0,
    totalEntries: sorted.length,
    suggestedPost: null,
  }
}
