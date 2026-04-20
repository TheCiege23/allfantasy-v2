'use client'

import { useMemo } from 'react'
import type { LeagueLifecycleSnapshot } from '@/components/league/types'
import {
  explainLifecycleUiBlock,
  isLifecycleActionAllowedForUi,
} from '@/lib/league/lifecycle-ui'

/**
 * Derives disabled state + human-readable block reason for commissioner/member UX.
 */
export function useLeagueLifecycleGate(
  snapshot: LeagueLifecycleSnapshot | undefined,
  options: { isElevatedCommissioner: boolean },
) {
  const { isElevatedCommissioner } = options

  return useMemo(
    () => ({
      can: (action: string) =>
        isLifecycleActionAllowedForUi(snapshot, action, isElevatedCommissioner),
      reason: (action: string) =>
        explainLifecycleUiBlock(snapshot, action, isElevatedCommissioner),
    }),
    [snapshot, isElevatedCommissioner],
  )
}
