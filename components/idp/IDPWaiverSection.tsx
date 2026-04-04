'use client'

/**
 * Waiver targets + Chimmy AI list via POST /api/idp/ai waiver_targets.
 */

import { useState } from 'react'
import { Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IDPWaiverTarget } from '@/lib/idp/ai/idpChimmy'

const STATIC_PLACEHOLDER = [
  { name: 'Use AI Targets', desc: 'Loads personalized waiver ideas from Chimmy.' },
  { name: 'DL / LB / DB', desc: 'Prioritize high-snap roles and favorable schedules.' },
]

export function IDPWaiverSection({ leagueId, week }: { leagueId: string; week: number }) {
  const [mode, setMode] = useState<'static' | 'ai'>('static')
  const [loading, setLoading] = useState(false)
  const [locked, setLocked] = useState(false)
  const [targets, setTargets] = useState<IDPWaiverTarget[] | null>(null)

  const loadAi = async () => {
    setLoading(true)
    setLocked(false)
    try {
      const res = await fetch('/api/idp/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, week, action: 'waiver_targets', limit: 5 }),
      })
      if (res.status === 402) {
        setLocked(true)
        return
      }
      const data = (await res.json().catch(() => [])) as IDPWaiverTarget[]
      if (Array.isArray(data)) {
        setTargets(data)
        setMode('ai')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Waiver wire</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void loadAi()}
          className="gap-1.5 border-cyan-500/30 text-cyan-100 hover:bg-cyan-950/40"
          data-testid="idp-waiver-ai-targets"
        >
          {locked ? <Lock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Loading…' : 'AI Targets'}
        </Button>
      </div>
      {locked ? (
        <p className="mt-2 text-xs text-amber-200/90">🔒 This feature requires the AF Commissioner Subscription.</p>
      ) : null}
      <ul className="mt-3 space-y-2 text-sm">
        {mode === 'ai' && targets?.length
          ? targets.map((t) => (
              <li key={`${t.rank}-${t.name}`} className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
                <span className="font-medium text-white">
                  {t.rank}. {t.name} ({t.position}
                  {t.team ? `, ${t.team}` : ''})
                </span>
                <p className="mt-1 text-xs text-white/70">{t.reasoning}</p>
              </li>
            ))
          : STATIC_PLACEHOLDER.map((row) => (
              <li key={row.name} className="text-white/75">
                <span className="font-medium text-white/90">{row.name}</span> — {row.desc}
              </li>
            ))}
      </ul>
    </div>
  )
}
