'use client'

import { useCallback, useRef } from 'react'

/**
 * Coalesces identical in-flight async work (same key) so rapid double-clicks or overlapping effects
 * do not duplicate fetches — use for league/trade/waiver GETs where responses are interchangeable.
 */
export function useInflightRequestDedupe() {
  const inflight = useRef<Map<string, Promise<unknown>>>(new Map())

  return useCallback(function run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight.current.get(key)
    if (existing) return existing as Promise<T>
    const p = fn().finally(() => {
      inflight.current.delete(key)
    })
    inflight.current.set(key, p)
    return p as Promise<T>
  }, [])
}
