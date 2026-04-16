'use client'

import { useCallback, useState } from 'react'

export type SurvivorAiResponseBody = {
  error?: string
  code?: string
  message?: string
  preview?: { tokenCost: number; featureLabel?: string; ruleCode?: string }
  narrative?: string
  tokenSpend?: { ledgerId?: string; tokenCost?: number | null; balanceAfter?: number } | null
}

/**
 * Call POST /api/leagues/[leagueId]/survivor/ai with entitlement + token confirmation flow.
 * On 409 (token_confirmation_required), re-call with confirmTokenSpend: true after user confirms.
 */
export function useSurvivorAiRequest() {
  const [loading, setLoading] = useState(false)

  const run = useCallback(
    async (leagueId: string, type: string, confirmTokenSpend: boolean) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/survivor/ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, confirmTokenSpend }),
        })
        const body = (await res.json().catch(() => ({}))) as SurvivorAiResponseBody
        return { ok: res.ok, status: res.status, body }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { run, loading }
}
