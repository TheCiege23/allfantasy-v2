import type { LeagueLifecycleState } from '@prisma/client'

/**
 * Payout requests open from playoffs onward; approval/pay after playoffs or when season is completed.
 */
export function canCreatePayoutRequest(state: LeagueLifecycleState): boolean {
  return state === 'playoffs' || state === 'completed'
}

export function canApproveOrPayPayout(state: LeagueLifecycleState): boolean {
  return state === 'completed' || state === 'playoffs'
}

export function payoutLifecycleMessage(state: LeagueLifecycleState): string | null {
  if (canApproveOrPayPayout(state)) return null
  return 'Payout actions unlock when the league reaches the playoffs or completed phase.'
}
