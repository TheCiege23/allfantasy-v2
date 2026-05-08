/**
 * Client-side utilities for projecting the World Cup bracket forward
 * based on a user's entry picks.
 *
 * None of these functions hit the network or mutate Prisma state.
 * They are pure transformations for UI rendering only.
 */

import type { WorldCupMatchView, WorldCupPickView, WorldCupRound } from "./types"
import { WORLD_CUP_ROUNDS } from "./types"

export function hasWorldCupPickSelection(pick: Pick<WorldCupPickView, "selectedTeamId" | "selectedSlotKey">): boolean {
  return Boolean(pick.selectedTeamId || pick.selectedSlotKey)
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
  const pickByMatchId = new Map(
    picks.filter(hasWorldCupPickSelection).map((p) => [p.matchId, p])
  )

  for (const m of out) {
    const pick = pickByMatchId.get(m.id)
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
  const pickedMatchIds = new Set(
    picks.filter(hasWorldCupPickSelection).map((p) => p.matchId)
  )

  for (const round of orderedRounds) {
    const roundMatches = matches
      .filter((m) => m.round === round)
      .sort((a, b) => a.matchNumber - b.matchNumber)

    // Find the first in this round that is unpicked and has known teams
    const unpicked = roundMatches.find(
      (m) =>
        !pickedMatchIds.has(m.id) &&
        (m.homeTeamId !== null || m.awayTeamId !== null)
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

  const pickedMatchIds = new Set(
    picks.filter(hasWorldCupPickSelection).map((p) => p.matchId)
  )

  // Try to find next in the same round (higher matchNumber)
  const sameRound = matches
    .filter(
      (m) =>
        m.round === current.round &&
        m.matchNumber > current.matchNumber &&
        !pickedMatchIds.has(m.id) &&
        (m.homeTeamId !== null || m.awayTeamId !== null)
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
          !pickedMatchIds.has(m.id) &&
          (m.homeTeamId !== null || m.awayTeamId !== null)
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
  const pickByMatchId = new Map(picks.map((p) => [p.matchId, p]))
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
  const existingPickAtChanged = pickByMatchId.get(changedMatchId)
  if (existingPickAtChanged) {
    prevWinnerTeamId = existingPickAtChanged.selectedTeamId
  }

  // Walk downstream
  const visited = new Set<string>()
  while (cursor.nextMatchId && !visited.has(cursor.id)) {
    visited.add(cursor.id)
    const nextMatch = byId.get(cursor.nextMatchId)
    if (!nextMatch) break

    const pickAtNext = pickByMatchId.get(nextMatch.id)
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
    (m) => m.round !== "third_place" || includeThirdPlace
  )
  const pickedIds = new Set(
    picks.filter(hasWorldCupPickSelection).map((p) => p.matchId)
  )
  return required.every((m) => pickedIds.has(m.id))
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
    (m) => m.round !== "third_place" || includeThirdPlace
  )
  const pickedIds = new Set(
    picks.filter(hasWorldCupPickSelection).map((p) => p.matchId)
  )
  return required.filter((m) => !pickedIds.has(m.id)).length
}
