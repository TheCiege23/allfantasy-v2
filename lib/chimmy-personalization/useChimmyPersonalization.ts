'use client'

import { useEffect, useState } from 'react'
import type { ChimmyPersonalizationProfile } from './types'

export function useChimmyPersonalization() {
  const [profile, setProfile] = useState<ChimmyPersonalizationProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/user/chimmy-personalization', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load Chimmy personalization')
        const data = (await res.json()) as { profile?: ChimmyPersonalizationProfile }
        if (!cancelled) setProfile(data.profile ?? null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load Chimmy personalization')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { profile, isLoading, error }
}
