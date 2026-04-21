/**
 * Pick commit flow: guards → commit payload → advance clock + reset timer (pure, testable).
 * Pair with API `POST .../draft/pick` in production; use these helpers for local/mock reducers.
 */

import { getRosterIdForOverall } from './DraftOrderService'
import type {
  CommitPickPayload,
  DraftPickSnapshot,
  DraftRoomCoreState,
  DraftRoomPick,
  DraftType,
  SlotOrderEntry,
} from './types'

function pickIndexInRound(overall: number, teamCount: number): number {
  if (teamCount < 1) return 1
  return ((overall - 1) % teamCount) + 1
}

/** Guards before calling `commitPick` / API. */
export function isPickCommitAllowed(args: {
  canDraft: boolean
  playerId: string | null
  draftedPlayerIds: ReadonlySet<string>
}): boolean {
  if (!args.canDraft) return false
  if (args.playerId != null && args.draftedPlayerIds.has(args.playerId)) return false
  return true
}

/** When pool rows lack stable ids, block by normalized player name. */
export function isPickCommitAllowedByName(args: {
  canDraft: boolean
  playerName: string
  draftedNames: ReadonlySet<string>
}): boolean {
  if (!args.canDraft) return false
  const key = args.playerName.trim().toLowerCase()
  if (!key) return false
  if (args.draftedNames.has(key)) return false
  return true
}

/**
 * Build a {@link CommitPickPayload} for the current selection (call after guards pass).
 */
export function buildCommitPickPayload(args: {
  playerId: string | null
  teamId: string
  overall: number
  round: number
  slot: number
  at?: Date
}): CommitPickPayload {
  const at = args.at ?? new Date()
  return {
    playerId: args.playerId,
    teamId: args.teamId,
    overall: args.overall,
    round: args.round,
    slot: args.slot,
    timestamp: at.toISOString(),
  }
}

/**
 * Reset pick timer anchor (new deadline = now + per-pick seconds).
 */
export function computeTimerEndAtIso(pickTimeSeconds: number, now: Date = new Date()): string {
  const ms = Math.max(0, Math.floor(pickTimeSeconds * 1000))
  return new Date(now.getTime() + ms).toISOString()
}

/**
 * Append the new pick row, advance `currentOverall` by 1, recompute on-clock team/round/slot, reset timer.
 * Throws if `commit.overall` does not match `state.currentOverall` (stale state).
 *
 * Not used for **auction** drafts (different lifecycle).
 */
export function advanceDraftRoomCoreStateAfterPick(params: {
  state: DraftRoomCoreState
  commit: CommitPickPayload
  newPick: DraftRoomPick
  rounds: number
  teamCount: number
  draftType: DraftType
  thirdRoundReversal: boolean
  slotOrder: SlotOrderEntry[]
  pickTimeSeconds: number
  now?: Date
}): DraftRoomCoreState {
  const {
    state,
    commit,
    newPick,
    rounds,
    teamCount,
    draftType,
    thirdRoundReversal,
    slotOrder,
    pickTimeSeconds,
  } = params
  const now = params.now ?? new Date()

  if (state.currentOverall !== commit.overall) {
    throw new Error(
      `[advanceDraftRoomCoreStateAfterPick] commit.overall ${commit.overall} !== state.currentOverall ${state.currentOverall}`,
    )
  }

  const totalPicks = rounds * teamCount
  const picks: DraftPickSnapshot[] = [...state.picks, newPick]

  const nextOverall = commit.overall + 1

  if (nextOverall > totalPicks) {
    return {
      draftStarted: true,
      currentOverall: 0,
      currentRound: 0,
      currentPickInRound: 0,
      currentTeamId: '',
      timerEndAt: '',
      picks,
    }
  }

  const next = getRosterIdForOverall(
    nextOverall,
    teamCount,
    draftType,
    thirdRoundReversal,
    slotOrder,
  )

  return {
    draftStarted: true,
    currentOverall: nextOverall,
    currentRound: Math.ceil(nextOverall / teamCount),
    currentPickInRound: pickIndexInRound(nextOverall, teamCount),
    currentTeamId: next?.rosterId ?? '',
    timerEndAt: computeTimerEndAtIso(pickTimeSeconds, now),
    picks,
  }
}

/**
 * Simple mutex for client-side “one pick in flight” (pair with backend idempotency).
 */
export class PickCommitLock {
  private locked = false

  /** Returns false if already locked. */
  tryAcquire(): boolean {
    if (this.locked) return false
    this.locked = true
    return true
  }

  release(): void {
    this.locked = false
  }

  get isLocked(): boolean {
    return this.locked
  }
}
