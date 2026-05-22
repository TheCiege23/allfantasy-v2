'use client'

import { useEffect, useState } from 'react'
import type { AIAccessStatus } from '@/lib/ai-access/AIAccessResolver'

type State = {
  data: AIAccessStatus | null
  loading: boolean
  error: string | null
}

const INITIAL: State = { data: null, loading: true, error: null }

/**
 * Phase 1 — small client hook that fetches /api/ai/access once on mount.
 * No revalidation library to keep bundle slim; refresh on focus is enough.
 */
export function useAIAccessStatus(): State {
  const [state, setState] = useState<State>(INITIAL)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/ai/access', { credentials: 'same-origin' })
        if (res.status === 401) {
          if (!cancelled) setState({ data: null, loading: false, error: null })
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as AIAccessStatus
        if (!cancelled) setState({ data: json, loading: false, error: null })
      } catch (err) {
        if (!cancelled) {
          setState({ data: null, loading: false, error: String((err as Error).message || err) })
        }
      }
    }
    void load()
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return state
}
