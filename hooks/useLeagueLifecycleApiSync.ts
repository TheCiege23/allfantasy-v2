'use client'

import { useEffect, useState } from 'react'
import type { LeagueLifecyclePermissions, LeagueLifecycleSnapshot } from '@/components/league/types'

/**
 * Fetches canonical lifecycle snapshot + permission flags after mount so UI matches server
 * (co-commissioner promotion, lock/pause changes) without a full page reload.
 */
export function useLeagueLifecycleApiSync(
  leagueId: string,
  ssrLifecycle: LeagueLifecycleSnapshot | undefined,
): {
  lifecycle: LeagueLifecycleSnapshot | undefined
  permissions: LeagueLifecyclePermissions | null
} {
  const [state, setState] = useState<{
    lifecycle: LeagueLifecycleSnapshot
    permissions: LeagueLifecyclePermissions
  } | null>(null)

  useEffect(() => {
    setState(null)
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/lifecycle`, { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const j = (await res.json()) as {
          lifecycle?: LeagueLifecycleSnapshot
          permissions?: LeagueLifecyclePermissions
        }
        if (cancelled || !j.lifecycle || !j.permissions) return
        setState({ lifecycle: j.lifecycle, permissions: j.permissions })
      } catch {
        /* keep SSR snapshot */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [leagueId])

  return {
    lifecycle: state?.lifecycle ?? ssrLifecycle,
    permissions: state?.permissions ?? null,
  }
}
