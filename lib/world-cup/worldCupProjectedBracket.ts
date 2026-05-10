/**
 * Client-side utilities for projecting the World Cup bracket forward
 * based on a user's entry picks.
 *
 * None of these functions hit the network or mutate Prisma state.
 * They are pure transformations for UI rendering only.
 */

import type { WorldCupMatchView, WorldCupPickView, WorldCupRound } from "./types"
import { WORLD_CUP_ROUNDS } from "./types"

export type WorldCupGuidedPickPayloadLike = {
  selectedTeamId?: string | null
  selectedSlotKey?: string | null
}

export type WorldCupPickSelectionLike = {
  selectedTeamId?: string | null
  selectedSlotKey?: string | null
}

export type WorldCupPickMatchIdentityLike = {
  matchId?: string | null
  round?: WorldCupRound | string | null
  matchNumber?: number | null
}

export type WorldCupMatchIdentityLike = {
  id?: string | null
  round?: WorldCupRound | string | null
  matchNumber?: number | null
}

export type WorldCupMatchPickabilityLike = {
  id?: string | null
  round?: WorldCupRound | string
  status?: string | null
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeTeamName?: string | null
  awayTeamName?: string | null
}

export type WorldCupProjectedMatchStatusLike = {
  apiFixtureId?: number | null
  status?: string | null
  startsAt?: string | Date | null
  homeScore?: number | null
  awayScore?: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
  winnerTeamId?: string | null
  winnerTeamName?: string | null
  elapsedMinute?: number | null
  injuryTime?: number | null
  period?: string | null
  apiStatusShort?: string | null
  lastScoreSyncedAt?: string | Date | null
}

export type WorldCupGuidedPicksState = "fixtures_not_synced" | "fixtures_not_ready" | "ready"

export type WorldCupUnpickableReason =
  | "missing_home_team"
  | "missing_away_team"
  | "placeholder_team"
  | "final"
  | "unknown"

function normalizeTeamName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function isPlaceholderTeamName(value: string | null | undefined): boolean {
  const normalized = normalizeTeamName(value)
  if (!normalized) return true
  if (normalized === "tbd" || normalized === "to be determined") return true
  if (/^[a-h][12]$/.test(normalized)) return true
  if (/^tbd\d+$/.test(normalized)) return true
  return false
}

export function getWorldCupUnpickableReason(match: WorldCupMatchPickabilityLike): WorldCupUnpickableReason {
  if (!match?.id) return "unknown"
  if (match.status === "final") return "final"
  if (!match.homeTeamId) return "missing_home_team"
  if (!match.awayTeamId) return "missing_away_team"
  if (
    !match.homeTeamName ||
    !match.awayTeamName ||
    isPlaceholderTeamName(match.homeTeamName) ||
    isPlaceholderTeamName(match.awayTeamName)
  ) {
    return "placeholder_team"
  }
  return "unknown"
}

export function isWorldCupMatchPickable(match: WorldCupMatchPickabilityLike): boolean {
  if (!match?.id) return false
  if (match.status === "final") return false
  if (!match.homeTeamId || !match.awayTeamId) return false
  if (!match.homeTeamName || !match.awayTeamName) return false
  if (isPlaceholderTeamName(match.homeTeamName) || isPlaceholderTeamName(match.awayTeamName)) return false
  return true
}

export function assertWorldCupPickPayloadReady(payload: WorldCupGuidedPickPayloadLike): void {
  if (!hasWorldCupPickSelection(payload)) {
    throw new Error("This matchup is not ready for picks yet.")
  }
}

export function getWorldCupGuidedPicksState(matches: WorldCupMatchView[]): WorldCupGuidedPicksState {
  if (matches.length === 0) return "fixtures_not_synced"
  if (!matches.some((match) => isWorldCupMatchPickable(match))) return "fixtures_not_ready"
  return "ready"
}

export function hasWorldCupPickSelection(pick: WorldCupPickSelectionLike | null | undefined): boolean {
  return Boolean(pick?.selectedTeamId || pick?.selectedSlotKey)
}

export type WorldCupPickMatchMethod = "matchId" | "round_matchNumber"

export function getWorldCupPickMatchMethod(
  pick: WorldCupPickMatchIdentityLike | null | undefined,
  match: WorldCupMatchIdentityLike | null | undefined
): WorldCupPickMatchMethod | null {
  if (!pick || !match) return null
  if (pick.matchId && match.id && pick.matchId === match.id) return "matchId"
  if (
    pick.round &&
    match.round &&
    pick.round === match.round &&
    pick.matchNumber != null &&
    match.matchNumber != null &&
    pick.matchNumber === match.matchNumber
  ) {
    return "round_matchNumber"
  }
  return null
}

export function worldCupPickMatchesMatch(
  pick: WorldCupPickMatchIdentityLike | null | undefined,
  match: WorldCupMatchIdentityLike | null | undefined
): boolean {
  return getWorldCupPickMatchMethod(pick, match) !== null
}

export function findWorldCupPickForMatch<T extends WorldCupPickMatchIdentityLike & WorldCupPickSelectionLike>(
  picks: T[],
  match: WorldCupMatchIdentityLike
): T | null {
  const candidates = picks.filter(
    (pick) => hasWorldCupPickSelection(pick) && worldCupPickMatchesMatch(pick, match)
  )
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const ranked = candidates
    .map((pick) => {
      const method = getWorldCupPickMatchMethod(pick, match)
      const exactMethodScore = method === "matchId" ? 2 : method === "round_matchNumber" ? 1 : 0

      const matchTeamContext = match as {
        homeTeamId?: string | null
        awayTeamId?: string | null
        homeSlotKey?: string | null
        awaySlotKey?: string | null
      }
      const selectedTeamMatches =
        Boolean(
          pick.selectedTeamId &&
            (pick.selectedTeamId === matchTeamContext.homeTeamId ||
              pick.selectedTeamId === matchTeamContext.awayTeamId)
        )
      const selectedSlotMatches =
        Boolean(
          pick.selectedSlotKey &&
            (pick.selectedSlotKey === matchTeamContext.homeSlotKey ||
              pick.selectedSlotKey === matchTeamContext.awaySlotKey)
        )
      const contextScore = selectedTeamMatches || selectedSlotMatches ? 1 : 0

      // Preserve stable ordering when scores tie.
      const originalIndex = picks.indexOf(pick)
      return {
        pick,
        score: exactMethodScore * 10 + contextScore,
        originalIndex,
      }
    })
    .sort((a, b) => b.score - a.score || b.originalIndex - a.originalIndex)

  return ranked[0]?.pick ?? null
}

function normalizeApiStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

export function isOfficialWorldCupFixtureState(match: WorldCupProjectedMatchStatusLike): boolean {
  const apiStatus = normalizeApiStatus(match.apiStatusShort)
  if (apiStatus === "SIM" || apiStatus === "TEST") return false
  if (match.apiFixtureId != null && (match.status === "live" || match.status === "halftime" || match.status === "final")) {
    return true
  }
  return match.status === "final" && Boolean(match.winnerTeamId)
}

export function resetWorldCupProjectedMatchStatus<T extends WorldCupProjectedMatchStatusLike>(match: T): T {
  if (isOfficialWorldCupFixtureState(match)) return match

  match.status = "scheduled"
  match.startsAt = null
  match.homeScore = null
  match.awayScore = null
  match.homePenaltyScore = null
  match.awayPenaltyScore = null
  match.winnerTeamId = null
  match.winnerTeamName = null
  match.elapsedMinute = null
  match.injuryTime = null
  match.period = null
  match.apiStatusShort = null
  match.lastScoreSyncedAt = null
  return match
}

// ── Projected bracket ─────────────────────────────────────────────────────────

/**
 * Return a copy of `matches` with projected home/away teams filled in for later
 * rounds based on the picks the user has made so far.
 *
 * – Does NOT mutate the originals.
 * – For the first available round, teams come from the real match data.
 * – For later rounds, teams are derived from nextMatchId / nextMatchSlot and
 *   the entry's picks.
 */
export function buildWorldCupProjectedMatches(
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[]
): WorldCupMatchView[] {
  const out = matches.map((m) => ({ ...m }))
  const byId = new Map(out.map((m) => [m.id, m]))
  const realPicks = picks.filter(hasWorldCupPickSelection)

  for (const m of out) {
    const pick = findWorldCupPickForMatch(realPicks, m)
    const next = m.nextMatchId ? byId.get(m.nextMatchId) : null
    if (!pick || !next || !m.nextMatchSlot) continue

    // Determine which team the user picked
    const pickedHome =
      (pick.selectedTeamId !== null &&
        pick.selectedTeamId !== undefined &&
        pick.selectedTeamId === m.homeTeamId) ||
      (pick.selectedSlotKey !== null &&
        pick.selectedSlotKey !== undefined &&
        pick.selectedSlotKey === m.homeSlotKey)

    const team = pickedHome
      ? {
          id: m.homeTeamId,
          name: m.homeTeamName,
          logo: m.homeTeamLogo,
          slot: m.homeSlotKey,
        }
      : {
          id: m.awayTeamId,
          name: m.awayTeamName,
          logo: m.awayTeamLogo,
          slot: m.awaySlotKey,
        }

    resetWorldCupProjectedMatchStatus(next)

    if (m.nextMatchSlot === "home") {
      next.homeTeamId = team.id
      next.homeTeamName = team.name
      next.homeTeamLogo = team.logo
      next.homeSlotKey = team.slot
    } else {
      next.awayTeamId = team.id
      next.awayTeamName = team.name
      next.awayTeamLogo = team.logo
      next.awaySlotKey = team.slot
    }
  }

  return out
}

// ── Round ordering ────────────────────────────────────────────────────────────

/**
 * Return the bracket rounds in play order (excluding third_place unless the
 * challenge includes it).
 */
export function getOrderedRounds(
  matches: WorldCupMatchView[],
  includeThirdPlace = false
): WorldCupRound[] {
  const inUse = new Set(matches.map((m) => m.round))
  return WORLD_CUP_ROUNDS.filter(
    (r) => inUse.has(r) && (r !== "third_place" || includeThirdPlace)
  )
}

// ── Pick helpers ──────────────────────────────────────────────────────────────

/**
 * Given the ordered rounds and current picks, return the first matchup in the
 * earliest round that has at least one unpicked matchup (where the teams are
 * actually known).
 *
 * Picks whose teams are "TBD" / null on both sides are skipped — they can't
 * be picked until the previous round is complete.
 */
export function findFirstUnpickedMatch(
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[],
  orderedRounds: WorldCupRound[]
): WorldCupMatchView | null {
  for (const round of orderedRounds) {
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.matchNumber - b.matchNumber)

    // Find the first in this round that is unpicked and has known teams
    const unpicked = roundMatches.find(
      (m) =>
        !findWorldCupPickForMatch(picks, m) &&
        isWorldCupMatchPickable(m)
    )
    if (unpicked) return unpicked
  }
  return null
}

/**
 * From a given matchId, find the next matchup to show in the guided picker.
 * Cycling order: finish the current round in matchNumber order, then move to
 * the next round.
 */
export function findNextMatchInGuidedOrder(
  matchId: string,
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[],
  orderedRounds: WorldCupRound[]
): WorldCupMatchView | null {
  const current = matches.find((m) => m.id === matchId)
  if (!current) return findFirstUnpickedMatch(matches, picks, orderedRounds)

  // Try to find next in the same round (higher matchNumber)
  const sameRound = matches
    .filter(
      (m) =>
        m.round === current.round &&
        m.matchNumber > current.matchNumber &&
        !findWorldCupPickForMatch(picks, m) &&
        isWorldCupMatchPickable(m)
    )
    .sort((a, b) => a.matchNumber - b.matchNumber)

  if (sameRound.length > 0) return sameRound[0]

  // Advance to next round(s)
  const currentRoundIdx = orderedRounds.indexOf(current.round)
  for (let i = currentRoundIdx + 1; i < orderedRounds.length; i++) {
    const nextRound = orderedRounds[i]
    const nextRoundMatches = matches
      .filter(
        (m) =>
          m.round === nextRound &&
          !findWorldCupPickForMatch(picks, m) &&
          isWorldCupMatchPickable(m)
      )
      .sort((a, b) => a.matchNumber - b.matchNumber)
    if (nextRoundMatches.length > 0) return nextRoundMatches[0]
  }

  return null
}

// ── Downstream invalidation ───────────────────────────────────────────────────

/**
 * When the user changes an earlier-round pick, any downstream picks that
 * advanced a team that is no longer the winner are now invalid.
 *
 * Returns the IDs of pick records that should be cleared.
 *
 * Algorithm:
 * 1. Follow the nextMatchId chain forward from the changed match.
 * 2. At each downstream match, check whether the currently-saved pick chose
 *    a team that originally came from the path we just changed.
 * 3. If the saved pick's selectedTeamId is no longer in the projected bracket
 *    (because the user changed the upstream winner), that pick is invalid.
 */
export function getInvalidDownstreamPickIds(
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[],
  changedMatchId: string,
  newWinnerTeamId: string | null
): string[] {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const invalidIds: string[] = []

  // Build the projected bracket using picks EXCEPT the changed one so we can
  // detect what team originally came through that slot.
  const changedMatch = byId.get(changedMatchId)
  if (!changedMatch) return []

  // Walk forward from changedMatchId, following nextMatchId
  let cursor = changedMatch
  // The "winning" team that used to come through this slot — we'll derive
  // it as we walk forward based on existing picks at each step.
  let prevWinnerTeamId: string | null = null

  // Get current pick at changedMatch (the old pick, before the new selection)
  const existingPickAtChanged = findWorldCupPickForMatch(picks, changedMatch)
  if (existingPickAtChanged) {
    prevWinnerTeamId = existingPickAtChanged.selectedTeamId
  }

  // Walk downstream
  const visited = new Set<string>()
  while (cursor.nextMatchId && !visited.has(cursor.id)) {
    visited.add(cursor.id)
    const nextMatch = byId.get(cursor.nextMatchId)
    if (!nextMatch) break

    const pickAtNext = findWorldCupPickForMatch(picks, nextMatch)
    if (!pickAtNext) {
      // No pick here — nothing to invalidate downstream from here
      break
    }

    // If the pick at next chose the team that came from the changed slot,
    // it's now invalid (unless it happens to equal the new winner)
    const pickChoseOldWinner =
      prevWinnerTeamId !== null &&
      pickAtNext.selectedTeamId === prevWinnerTeamId &&
      pickAtNext.selectedTeamId !== newWinnerTeamId

    if (pickChoseOldWinner) {
      invalidIds.push(pickAtNext.id)
      prevWinnerTeamId = pickAtNext.selectedTeamId
    } else {
      // The pick here diverged from the changed path — stop propagating
      break
    }

    cursor = nextMatch
  }

  return invalidIds
}

// ── Bracket completion ────────────────────────────────────────────────────────

/**
 * Returns true if all required matches (excluding third_place unless enabled)
 * have a corresponding pick.
 */
export function isBracketComplete(
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[],
  includeThirdPlace = false
): boolean {
  const required = matches.filter(
    (m) =>
      (m.round !== "third_place" || includeThirdPlace) &&
      isWorldCupMatchPickable(m)
  )
  if (required.length === 0) return false
  return required.every((m) => Boolean(findWorldCupPickForMatch(picks, m)))
}

/**
 * Count of required matches that still need a pick.
 */
export function countRemainingPicks(
  matches: WorldCupMatchView[],
  picks: WorldCupPickView[],
  includeThirdPlace = false
): number {
  const required = matches.filter(
    (m) =>
      (m.round !== "third_place" || includeThirdPlace) &&
      isWorldCupMatchPickable(m)
  )
  return required.filter((m) => !findWorldCupPickForMatch(picks, m)).length
}
