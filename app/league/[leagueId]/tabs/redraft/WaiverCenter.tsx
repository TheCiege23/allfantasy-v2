'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, TrendingUp, Zap } from 'lucide-react'
import { ProjectionChip } from '@/components/sports/ProjectionCard'
import { PlayerAvatar } from '@/components/app/draft-room/PlayerAvatar'

type WaiverTarget = {
  name: string
  position: string
  team: string
  priority: number
  reason: string
  projectedPoints?: number
  /** Optional player headshot — falls back to silhouette+initials when missing. */
  headshotUrl?: string | null
  teamLogoUrl?: string | null
}

export function WaiverCenter({ seasonId, leagueId, sport }: { seasonId: string | null; leagueId?: string; sport?: string }) {
  const [targets, setTargets] = useState<WaiverTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSuggestions() {
    if (!leagueId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/waiver-ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error ?? 'Failed to load suggestions')
        return
      }
      const data = await res.json()
      const picks = Array.isArray(data?.suggestions) ? data.suggestions
        : Array.isArray(data?.picks) ? data.picks
        : Array.isArray(data?.targets) ? data.targets : []
      setTargets(picks.map((p: any, i: number) => ({
        name: p.playerName ?? p.name ?? p.player ?? '',
        position: p.position ?? '',
        team: p.team ?? 'FA',
        priority: p.priority ?? p.score ?? (picks.length - i),
        reason: p.reason ?? p.rationale ?? p.note ?? '',
        projectedPoints: p.projectedPoints ?? p.expectedPoints ?? null,
        headshotUrl: p.headshotUrl ?? p.imageUrl ?? p.photoUrl ?? null,
        teamLogoUrl: p.teamLogoUrl ?? null,
      })))
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h3 className="text-[14px] font-bold text-white">Waiver Wire AI</h3>
        </div>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading || !leagueId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-1.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/25 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing...' : 'Get AI Picks'}
        </button>
      </div>

      {!leagueId && (
        <p className="text-xs text-white/40">Select a league to get waiver suggestions.</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {targets.length === 0 && !loading && leagueId && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/40">Click &quot;Get AI Picks&quot; to analyze your league&apos;s waiver wire.</p>
          <p className="mt-1 text-xs text-white/20">AI will recommend targets based on your roster, injuries, and trends.</p>
        </div>
      )}

      {targets.length > 0 && (
        <div className="space-y-1.5">
          {targets.map((t, i) => (
            <Link
              key={`${t.name}-${i}`}
              href={`/player/${encodeURIComponent(t.name.toLowerCase().replace(/\s+/g, '-'))}`}
              className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-[10px] font-bold text-cyan-300">
                {i + 1}
              </span>
              <PlayerAvatar
                headshotUrl={t.headshotUrl ?? null}
                teamLogoUrl={t.teamLogoUrl ?? null}
                teamAbbr={t.team}
                position={t.position}
                displayName={t.name}
                size={32}
                testIdBase={`waiver-target-avatar-${i}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-white/80">{t.name}</span>
                  <span className="text-[10px] text-cyan-300/60">{t.position}</span>
                  <span className="text-[10px] text-white/30">{t.team}</span>
                  {t.projectedPoints != null && <ProjectionChip points={t.projectedPoints} />}
                </div>
                {t.reason && <p className="mt-0.5 text-[10px] text-white/35 line-clamp-1">{t.reason}</p>}
              </div>
              <div className="shrink-0 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                {t.priority}/10
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
