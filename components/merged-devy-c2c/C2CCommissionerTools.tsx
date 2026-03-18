'use client'

/**
 * PROMPT 3: C2C commissioner tools — recalc, force promote, revoke, reopen window, regenerate pools, repair duplicate rights, resolve mapping, hybrid standings.
 */

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  leagueId: string
}

export function C2CCommissionerTools({ leagueId }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const post = async (path: string, body?: object): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/merged-devy-c2c/admin/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'err', text: (data as { error?: string }).error ?? 'Request failed' })
        return { ok: false }
      }
      setMessage({ type: 'ok', text: (data as { message?: string }).message ?? 'Done' })
      return data as { ok: boolean }
    } catch {
      setMessage({ type: 'err', text: 'Request failed' })
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">C2C commissioner tools</h3>
      {message && (
        <p className={`text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('recalc')}
        >
          Recalc college/pro status
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('reopen-window')}
        >
          Reopen promotion window
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('regenerate-rookie-pool')}
        >
          Regenerate rookie pool
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('regenerate-college-pool')}
        >
          Regenerate college pool
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('repair-duplicate-rights')}
        >
          Repair duplicate rights
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-50"
          onClick={() => post('hybrid-standings')}
        >
          Re-run hybrid standings
        </button>
      </div>

      <p className="text-xs text-white/50">
        Force promote / revoke: use Promotion center with pro player ID, or call admin/force-promote and admin/revoke-promotion with rightsId.
      </p>
      <Link
        href={`/api/leagues/${leagueId}/merged-devy-c2c/audit?limit=50`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-white/70 hover:text-white"
      >
        View audit log →
      </Link>
    </div>
  )
}
