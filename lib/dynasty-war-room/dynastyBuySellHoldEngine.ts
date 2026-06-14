/**
 * DYNASTY BUY / SELL / HOLD ENGINE — pure, deterministic. No AI, no fabrication.
 *
 * Per-player asset call for the viewer's roster, combining dynasty VALUE,
 * AGE trajectory, and the team's contention window (from the direction engine):
 *   - contender: hold prime/ascending; consider selling young depth for win-now;
 *     hold aging stars (use the window).
 *   - rebuilder: sell aging/cliff assets for youth/picks; hold ascending.
 *   - middle: hold core, sell aging depth.
 * Requires a value signal; without it, calls degrade to 'hold' + a missing-data flag.
 */

import { dynastyValue, ageTrajectory, type AgeTrajectory } from './dynastyPlayerValue'
import { evaluateDynastyTeamDirection } from './dynastyTeamDirectionEngine'
import type { ContentionWindow, DynastyPlayerFact, DynastyWarRoomContext } from './types'

export type AssetCall = 'buy' | 'sell' | 'hold'

export interface BuySellHoldEntry {
  playerId: string
  playerName: string
  position: string
  age: number | null
  trajectory: AgeTrajectory
  value: number | null
  call: AssetCall
  reason: string
}

export interface BuySellHoldResult {
  rosterId: string
  window: ContentionWindow
  entries: BuySellHoldEntry[]
  missingDataFlags: string[]
  needsValueSignal: boolean
}

function valueOf(p: DynastyPlayerFact): number | null {
  const v = dynastyValue(p)
  return v.source === 'none' ? null : v.value
}

function decide(
  window: ContentionWindow,
  traj: AgeTrajectory,
  value: number | null,
): { call: AssetCall; reason: string } {
  const highValue = value != null && value >= 15
  if (window === 'rebuild') {
    if (traj === 'aging' || traj === 'cliff') {
      return { call: 'sell', reason: 'Rebuilding — convert this aging asset to youth or picks while value remains.' }
    }
    if (traj === 'ascending') return { call: 'hold', reason: 'Rebuilding — young ascending piece to build around.' }
    if (highValue && traj === 'prime') return { call: 'sell', reason: 'Rebuilding — a prime, high-value vet can return a strong youth/pick haul.' }
    return { call: 'hold', reason: 'Rebuilding — retain developing value.' }
  }
  if (window === 'contend') {
    if (traj === 'cliff' && !highValue) return { call: 'sell', reason: 'Contending — flip declining depth before value erodes.' }
    if (traj === 'ascending' && !highValue) return { call: 'sell', reason: 'Contending — package young depth to upgrade a starting slot now.' }
    return { call: 'hold', reason: 'Contending — keep productive pieces inside the window.' }
  }
  if (window === 'middle') {
    if (traj === 'cliff') return { call: 'sell', reason: 'Middling — sell declining assets before they slide further.' }
    if (traj === 'ascending') return { call: 'hold', reason: 'Middling — hold youth that raises your ceiling.' }
    return { call: 'hold', reason: 'Middling — hold the core and let the window clarify.' }
  }
  return { call: 'hold', reason: 'Direction unclear — hold pending a clearer contention read.' }
}

export function evaluateBuySellHold(
  context: DynastyWarRoomContext,
  rosterId: string,
): BuySellHoldResult {
  const team = context.teams.find((t) => t.rosterId === rosterId)
  const missingDataFlags = [...context.missingDataFlags]
  if (!team) {
    return { rosterId, window: 'unknown', entries: [], missingDataFlags: ['Roster not found in this league.'], needsValueSignal: true }
  }

  const needsValueSignal = context.availability.playerValues !== 'available'
  const direction = evaluateDynastyTeamDirection(context, rosterId)

  if (needsValueSignal) {
    missingDataFlags.push('Buy/sell/hold needs a dynasty value signal — calls default to hold.')
  }

  const entries: BuySellHoldEntry[] = team.players
    .map((p) => {
      const value = valueOf(p)
      const traj = ageTrajectory(p.position, p.age)
      const { call, reason } = needsValueSignal
        ? { call: 'hold' as AssetCall, reason: 'No value signal — holding by default.' }
        : decide(direction.window, traj, value)
      return {
        playerId: p.playerId,
        playerName: p.playerName,
        position: p.position,
        age: p.age,
        trajectory: traj,
        value: value == null ? null : Math.round(value * 100) / 100,
        call,
        reason,
      }
    })
    // Surface sells/buys first, then by value descending.
    .sort((a, b) => {
      const rank = (c: AssetCall) => (c === 'sell' ? 0 : c === 'buy' ? 1 : 2)
      if (rank(a.call) !== rank(b.call)) return rank(a.call) - rank(b.call)
      return (b.value ?? -1) - (a.value ?? -1)
    })

  return {
    rosterId,
    window: direction.window,
    entries,
    missingDataFlags: [...new Set([...missingDataFlags, ...direction.missingDataFlags])],
    needsValueSignal,
  }
}
