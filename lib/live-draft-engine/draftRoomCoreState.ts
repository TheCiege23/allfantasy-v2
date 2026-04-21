/**
 * Build {@link DraftRoomCoreState} from a full session snapshot (single source for UI/tests).
 */

import type { DraftRoomCoreState, DraftSessionSnapshot } from './types'

function pickIndexInRound(overall: number, teamCount: number): number {
  if (teamCount < 1) return 1
  return ((overall - 1) % teamCount) + 1
}

export function buildDraftRoomCoreState(session: DraftSessionSnapshot): DraftRoomCoreState {
  const picks = session.picks ?? []
  const tc = Math.max(1, session.teamCount)
  const pre = session.status === 'pre_draft'

  const timerIso = session.timer?.timerEndAt ?? session.timerEndAt ?? ''
  const timerEndAt = timerIso ? String(timerIso) : ''

  if (pre) {
    const first = session.slotOrder[0]
    return {
      draftStarted: false,
      currentOverall: 1,
      currentRound: 1,
      currentPickInRound: 1,
      currentTeamId: first?.rosterId ?? '',
      timerEndAt: '',
      picks,
    }
  }

  const cp = session.currentPick
  if (!cp) {
    // Completed (or rare edge): no pick on the clock
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

  return {
    draftStarted: true,
    currentOverall: cp.overall,
    currentRound: cp.round,
    currentPickInRound: pickIndexInRound(cp.overall, tc),
    currentTeamId: cp.rosterId,
    timerEndAt,
    picks,
  }
}

/**
 * First team on the clock from a manager list (`id` or `rosterId`, as in league/draft UIs).
 */
export function resolveFirstManagerTeamId(
  managers: Array<{ id?: string; rosterId?: string }> | null | undefined,
): string {
  const first = managers?.[0]
  if (!first) return ''
  return String(first.id ?? first.rosterId ?? '').trim()
}

/**
 * Initial {@link DraftRoomCoreState} right after start: pick 1.01, first manager, timer = now + pick time.
 * Use with `setDraftState(createStartedDraftRoomState({ ... }))` for local reducers / demos.
 *
 * @param pickTimeSeconds Per-pick clock length in seconds (same units as league `timerSeconds`).
 * @param now Anchor time; default `new Date()`. `timerEndAt` is `now + pickTimeSeconds` as ISO UTC.
 */
export function createStartedDraftRoomState(params: {
  managers: Array<{ id?: string; rosterId?: string }>
  pickTimeSeconds: number
  now?: Date
}): DraftRoomCoreState {
  const now = params.now ?? new Date()
  const ms = Math.max(0, Math.floor(params.pickTimeSeconds * 1000))
  const timerEndAt = new Date(now.getTime() + ms).toISOString()

  return {
    draftStarted: true,
    currentOverall: 1,
    currentRound: 1,
    currentPickInRound: 1,
    currentTeamId: resolveFirstManagerTeamId(params.managers),
    timerEndAt,
    picks: [],
  }
}
