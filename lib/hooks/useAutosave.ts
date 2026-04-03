'use client'

import { useCallback, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosave(leagueId: string) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(
    async (partial: Record<string, unknown>) => {
      setStatus('saving')
      try {
        const res = await fetch('/api/league/settings', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId, ...partial }),
        })
        if (!res.ok) {
          setStatus('error')
          return
        }
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 1500)
      } catch {
        setStatus('error')
      }
    },
    [leagueId],
  )

  const debouncedSave = useCallback(
    (partial: Record<string, unknown>, delayMs = 450) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        timer.current = null
        void save(partial)
      }, delayMs)
    },
    [save],
  )

  return { status, save, debouncedSave }
}
