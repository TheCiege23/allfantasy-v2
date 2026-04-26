'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  pollIncomingTradeEvalEvents,
  readAutoTradeEvalEnabled,
  resolveTradeEvalIdentity,
  writeAutoTradeEvalEnabled,
  type ChimmyAutoTradeEvalEvent,
} from '@/lib/chimmy-chat/autoTradeEval'

export function useChimmyAutoTradeEval(options: {
  onEvent: (event: ChimmyAutoTradeEvalEvent) => void
  pollMs?: number
}) {
  const pollMs = Math.max(15_000, options.pollMs ?? 30_000)
  const [enabled, setEnabled] = useState(true)
  const [ready, setReady] = useState(false)
  const identityRef = useRef<{ sleeperUsername: string | null; identityKey: string | null }>({
    sleeperUsername: null,
    identityKey: null,
  })
  const onEventRef = useRef(options.onEvent)
  onEventRef.current = options.onEvent

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      const identityKey = identityRef.current.identityKey
      if (identityKey) writeAutoTradeEvalEnabled(identityKey, next)
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const identity = await resolveTradeEvalIdentity()
      if (cancelled) return
      identityRef.current = identity
      if (identity.identityKey) {
        setEnabled(readAutoTradeEvalEnabled(identity.identityKey))
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !enabled) return
    const sleeperUsername = identityRef.current.sleeperUsername
    if (!sleeperUsername) return

    let cancelled = false
    let inflight = false

    const run = async () => {
      if (cancelled || inflight) return
      inflight = true
      try {
        const events = await pollIncomingTradeEvalEvents(sleeperUsername)
        if (cancelled || events.length === 0) return
        for (const event of events) {
          onEventRef.current(event)
        }
      } finally {
        inflight = false
      }
    }

    void run()
    const timer = window.setInterval(() => {
      void run()
    }, pollMs)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [enabled, pollMs, ready])

  return {
    autoTradeEvalEnabled: enabled,
    toggleAutoTradeEval: toggleEnabled,
    autoTradeEvalReady: ready,
  }
}
