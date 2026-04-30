import type { WorldCupMatchSpec, WorldCupRound, WorldCupScoringValues, WorldCupSlotSpec } from "./types"

export const DEFAULT_WORLD_CUP_SCORING: WorldCupScoringValues = { roundOf32Points: 1, roundOf16Points: 2, quarterFinalPoints: 4, semiFinalPoints: 8, finalPoints: 16, championBonusPoints: 0, thirdPlacePoints: 4 }
const POINT_KEY: Record<WorldCupRound, keyof WorldCupScoringValues> = { round_of_32: "roundOf32Points", round_of_16: "roundOf16Points", quarterfinal: "quarterFinalPoints", semifinal: "semiFinalPoints", third_place: "thirdPlacePoints", final: "finalPoints" }
const R32: Array<[string, string, string, string]> = [
  ["A1", "Group A Winner", "B2", "Group B Runner-up"], ["C1", "Group C Winner", "D3", "Best 3rd Place Team 1"], ["E1", "Group E Winner", "F2", "Group F Runner-up"], ["G1", "Group G Winner", "H3", "Best 3rd Place Team 2"],
  ["I1", "Group I Winner", "J2", "Group J Runner-up"], ["K1", "Group K Winner", "L3", "Best 3rd Place Team 3"], ["B1", "Group B Winner", "A2", "Group A Runner-up"], ["D1", "Group D Winner", "C3", "Best 3rd Place Team 4"],
  ["F1", "Group F Winner", "E2", "Group E Runner-up"], ["H1", "Group H Winner", "G3", "Best 3rd Place Team 5"], ["J1", "Group J Winner", "I2", "Group I Runner-up"], ["L1", "Group L Winner", "K3", "Best 3rd Place Team 6"],
  ["C2", "Group C Runner-up", "D2", "Group D Runner-up"], ["G2", "Group G Runner-up", "H2", "Group H Runner-up"], ["K2", "Group K Runner-up", "L2", "Group L Runner-up"], ["TBD1", "TBD Qualifier 1", "TBD2", "TBD Qualifier 2"],
]
export function getWorldCupRoundPoints(round: WorldCupRound, scoring?: Partial<WorldCupScoringValues> | null) { return Number(({ ...DEFAULT_WORLD_CUP_SCORING, ...(scoring ?? {}) })[POINT_KEY[round]] ?? 0) }
function slotMeta(slotKey: string, displayName: string) {
  const m = displayName.match(/^Group ([A-L]) (Winner|Runner-up)$/)
  if (m) return { sourceGroup: m[1], sourceRank: m[2] === "Winner" ? "winner" : "runner_up" }
  if (displayName.startsWith("Best 3rd")) return { sourceGroup: null, sourceRank: "best_third" }
  return { sourceGroup: slotKey.startsWith("TBD") ? null : slotKey[0] ?? null, sourceRank: "tbd" }
}
export function generateWorldCupBracketTemplate(params?: { includeThirdPlace?: boolean }): { slots: WorldCupSlotSpec[]; matches: WorldCupMatchSpec[]; requiredPickCount: number } {
  const slots: WorldCupSlotSpec[] = [], matches: WorldCupMatchSpec[] = []
  R32.forEach(([hs, hn, as, an], i) => {
    const n = i + 1, region = n <= 8 ? "Left" : "Right"
    ;([[hs, hn], [as, an]] as Array<[string, string]>).forEach(([slotKey, displayName]) => slots.push({ slotKey, round: "round_of_32", region, ...slotMeta(slotKey, displayName), displayName, isPlaceholder: true }))
    matches.push({ matchNumber: n, round: "round_of_32", roundIndex: n, homeSlotKey: hs, awaySlotKey: as, homeTeamName: hn, awayTeamName: an, nextMatchNumber: 17 + Math.floor(i / 2), nextMatchSlot: i % 2 === 0 ? "home" : "away" })
  })
  for (let i = 0; i < 8; i++) matches.push({ matchNumber: 17 + i, round: "round_of_16", roundIndex: i + 1, homeSlotKey: `W-M${i * 2 + 1}`, awaySlotKey: `W-M${i * 2 + 2}`, homeTeamName: `Winner Match ${i * 2 + 1}`, awayTeamName: `Winner Match ${i * 2 + 2}`, nextMatchNumber: 25 + Math.floor(i / 2), nextMatchSlot: i % 2 === 0 ? "home" : "away" })
  for (let i = 0; i < 4; i++) matches.push({ matchNumber: 25 + i, round: "quarterfinal", roundIndex: i + 1, homeSlotKey: `W-M${17 + i * 2}`, awaySlotKey: `W-M${18 + i * 2}`, homeTeamName: `Winner Match ${17 + i * 2}`, awayTeamName: `Winner Match ${18 + i * 2}`, nextMatchNumber: 29 + Math.floor(i / 2), nextMatchSlot: i % 2 === 0 ? "home" : "away" })
  for (let i = 0; i < 2; i++) matches.push({ matchNumber: 29 + i, round: "semifinal", roundIndex: i + 1, homeSlotKey: `W-M${25 + i * 2}`, awaySlotKey: `W-M${26 + i * 2}`, homeTeamName: `Winner Match ${25 + i * 2}`, awayTeamName: `Winner Match ${26 + i * 2}`, nextMatchNumber: 31, nextMatchSlot: i === 0 ? "home" : "away" })
  matches.push({ matchNumber: 31, round: "final", roundIndex: 1, homeSlotKey: "W-M29", awaySlotKey: "W-M30", homeTeamName: "Winner Semifinal 1", awayTeamName: "Winner Semifinal 2" })
  if (params?.includeThirdPlace) matches.push({ matchNumber: 32, round: "third_place", roundIndex: 1, homeSlotKey: "L-M29", awaySlotKey: "L-M30", homeTeamName: "Loser Semifinal 1", awayTeamName: "Loser Semifinal 2" })
  return { slots, matches, requiredPickCount: matches.length }
}
export const buildWorldCupBracketTemplate = generateWorldCupBracketTemplate
export function isWorldCupMatchLocked(input: { challenge?: { pickLockStrategy?: string | null; pickLockAt?: Date | string | null; status?: string | null }; match?: { startsAt?: Date | string | null; status?: string | null }; pickLockStrategy?: string | null; pickLockAt?: Date | string | null; startsAt?: Date | string | null; status?: string | null; now?: Date }) {
  const challenge = input.challenge ?? input
  const match = input.match ?? input
  const now = input.now ?? new Date(), strategy = challenge.pickLockStrategy ?? "per_match", lockAt = challenge.pickLockAt ? new Date(challenge.pickLockAt) : null, start = match.startsAt ? new Date(match.startsAt) : null
  if (["final", "locked"].includes(challenge.status ?? "") || ["live", "halftime", "final"].includes(match.status ?? "")) return true
  if (strategy === "tournament_start" && lockAt && now >= lockAt) return true
  if (strategy === "per_match" && start && now >= start) return true
  return false
}
