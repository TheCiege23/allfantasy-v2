'use client'

import { useState } from 'react'
import { Lock, Loader2, Sparkles } from 'lucide-react'
import type { IDPWaiverTarget } from '@/lib/idp/ai/idpChimmy'

/**
 * Defensive waiver UX — static snapshot plus optional Chimmy waiver scan (AfSub).
 */
export function IDPWaiverSection({ leagueId, week }: { leagueId: string; week: number }) {
  const [pos, setPos] = useState<'ALL' | 'DL' | 'LB' | 'DB'>('ALL')
  const [sort, setSort] = useState<'proj' | 'avg' | 'trend'>('proj')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiLocked, setAiLocked] = useState(false)
  const [aiTargets, setAiTargets] = useState<IDPWaiverTarget[] | null>(null)

  const trending = [
    { name: 'D. Defender', pos: 'LB', add: '+412%', pts: 14.2 },
    { name: 'N. Edge', pos: 'DL', add: '+301%', pts: 11.8 },
    { name: 'C. Safety', pos: 'DB', add: '+240%', pts: 9.4 },
  ]

  const breakout = [
    { name: 'R. Rookie LB', snap: '78% → 92%', note: 'Depth chart ↑' },
    { name: 'M. Nickel', snap: '64% → 81%', note: 'Snap share ↑' },
    { name: 'T. Edge', snap: '55% → 72%', note: 'Role expansion' },
  ]

  const runAiTargets = async () => {
    setAiLoading(true)
    setAiLocked(false)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leagueId, week, action: 'waiver_targets', limit: 5 }),
      })
      if (res.status === 402) {
        setAiLocked(true)
        setAiTargets(null)
        return
      }
      const data = (await res.json().catch(() => null)) as IDPWaiverTarget[] | null
      if (Array.isArray(data)) setAiTargets(data)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-[color:var(--idp-border)] bg-[color:var(--idp-panel)] p-4"
      data-testid="idp-waiver-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">Defensive free agents</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-white/35">
            {leagueId.slice(0, 6)}… · Wk {week}
          </span>
          <button
            type="button"
            onClick={() => void runAiTargets()}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-950/30 px-2.5 py-1.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-950/45 disabled:opacity-50"
            data-testid="idp-waiver-ai-targets"
          >
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Targets (AfSub)
          </button>
        </div>
      </div>

      {aiLocked ? (
        <p className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100/95">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          🔒 This feature requires the AF Commissioner Subscription.
        </p>
      ) : null}

      {aiTargets && aiTargets.length > 0 ? (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/15 p-3" data-testid="idp-waiver-ai-list">
          <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-100">Chimmy waiver targets</p>
          <ul className="mt-2 space-y-2">
            {aiTargets.map((t) => (
              <li key={`${t.rank}-${t.name}`} className="text-xs text-white/85">
                <span className="font-semibold text-white">
                  {t.rank}. {t.name}
                </span>{' '}
                <span className="text-white/45">
                  ({t.position}, {t.team ?? '—'})
                </span>
                <p className="mt-0.5 text-white/55">{t.reasoning}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['ALL', 'DL', 'LB', 'DB'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPos(p === 'ALL' ? 'ALL' : p)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              pos === p
                ? 'border-[color:var(--idp-defense)] bg-red-950/40 text-red-100'
                : 'border-white/10 bg-white/[0.04] text-white/45'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-100">Trending defenders</p>
          <p className="mt-1 text-[10px] text-white/45">Most added (claim volume snapshot)</p>
          <ul className="mt-2 space-y-2">
            {trending.map((t) => (
              <li key={t.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-white/85">
                  {t.name} <span className="text-white/40">({t.pos})</span>
                </span>
                <span className="font-mono text-emerald-300">{t.add}</span>
                <span className="text-white/50">{t.pts} pts</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/15 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-100">📈 Breakout watch</p>
          <p className="mt-1 text-[10px] text-white/45">Snap share + depth chart momentum</p>
          <ul className="mt-2 space-y-2">
            {breakout.map((t) => (
              <li key={t.name} className="flex flex-col gap-0.5 text-xs text-white/80">
                <span className="font-semibold">{t.name}</span>
                <span className="text-white/45">
                  {t.snap} · {t.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-3">
        <span className="text-[10px] font-semibold uppercase text-white/35">Defense sort</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'proj' | 'avg' | 'trend')}
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-[11px] text-white"
        >
          <option value="proj">Projected IDP pts</option>
          <option value="avg">Avg IDP pts</option>
          <option value="trend">Target / snap trend</option>
        </select>
      </div>
    </section>
  )
}
