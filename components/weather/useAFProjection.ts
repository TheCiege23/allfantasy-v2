'use client'

import { useCallback, useState } from 'react'
import type { AFProjection } from '@/lib/weather/afProjectionService'
import type { AFCrestButtonProps } from '@/components/weather/afCrestTypes'

const cache = new Map<string, AFProjection>()

function cacheKey(p: AFCrestButtonProps): string {
  return [
    p.playerId,
    p.week ?? 'w',
    p.season ?? 's',
    p.eventId ?? 'e',
    Number(p.baselineProjection).toFixed(4),
    p.lat ?? 'lat',
    p.lng ?? 'lng',
    p.gameTime ?? 'gt',
    p.isIndoor ? '1' : '0',
    p.isDome ? '1' : '0',
    p.roofClosed ? '1' : '0',
  ].join('|')
}

export function useAFProjection(params: AFCrestButtonProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AFProjection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const fetchProjection = useCallback(async () => {
    const key = cacheKey(params)
    const hit = cache.get(key)
    if (hit) {
      setData(hit)
      setFetched(true)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/weather/af-projection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          playerId: params.playerId,
          playerName: params.playerName,
          sport: params.sport,
          position: params.position,
          baselineProjection: Number(params.baselineProjection),
          lat: params.lat ?? undefined,
          lng: params.lng ?? undefined,
          gameTime: params.gameTime ?? undefined,
          isIndoor: params.isIndoor,
          isDome: params.isDome,
          roofClosed: params.roofClosed,
          week: params.week,
          season: params.season,
          eventId: params.eventId,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as AFProjection & { error?: string }
      if (!res.ok) {
        throw new Error(typeof j.error === 'string' ? j.error : 'Projection failed')
      }
      cache.set(key, j)
      setData(j)
      setFetched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [
    params.playerId,
    params.playerName,
    params.sport,
    params.position,
    params.baselineProjection,
    params.lat,
    params.lng,
    params.gameTime,
    params.isIndoor,
    params.isDome,
    params.roofClosed,
    params.week,
    params.season,
    params.eventId,
  ])

  return { loading, data, error, fetched, fetch: fetchProjection }
}
