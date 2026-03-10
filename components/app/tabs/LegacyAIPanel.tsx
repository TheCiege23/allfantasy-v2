'use client'

import { useEffect, useState } from 'react'

type LegacyEnvelope = {
  status?: string
  data?: unknown
  meta?: { confidence?: number }
  errors?: Array<{ message?: string }>
}

export default function LegacyAIPanel({
  leagueId,
  endpoint,
  title,
}: {
  leagueId: string
  endpoint: string
  title: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<LegacyEnvelope | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      if (!leagueId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/legacy/leagues/${encodeURIComponent(leagueId)}/${endpoint}`, {
          cache: 'no-store',
        })
        const json = (await res.json().catch(() => ({}))) as LegacyEnvelope
        if (!active) return

        if (!res.ok || json?.status === 'error') {
          const message = json?.errors?.[0]?.message || `Unable to load ${title}`
          setError(message)
          setPayload(null)
        } else {
          setPayload(json)
        }
      } catch {
        if (active) {
          setError(`Unable to load ${title}`)
          setPayload(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [endpoint, leagueId, title])

  return (
    <aside className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <h4 className="text-sm font-semibold text-cyan-200">{title}</h4>
      {loading && <p className="mt-2 text-xs text-cyan-100/80">Loading AI panel...</p>}
      {!loading && error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {!loading && !error && (
        <>
          <p className="mt-2 text-xs text-cyan-100/80">
            Status: <span className="font-medium">{payload?.status || 'ok'}</span>
          </p>
          {typeof payload?.meta?.confidence === 'number' && (
            <p className="mt-1 text-xs text-cyan-100/80">
              Confidence: <span className="font-medium">{Math.round(payload.meta.confidence * 100)}%</span>
            </p>
          )}
          <p className="mt-2 text-xs text-cyan-100/75">Live from Legacy route: `/api/legacy/leagues/{leagueId}/{endpoint}`</p>
        </>
      )}
    </aside>
  )
}
