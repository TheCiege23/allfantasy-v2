'use client'

/**
 * IDP scoring style card for league home. Explains balanced vs tackle-heavy vs big-play-heavy.
 */

import { useState } from 'react'
import { Shield, BookOpen, MessageSquare } from 'lucide-react'
import { IDP_SCORING_PRESET_LABELS } from '@/lib/idp'

const SCORING_TIPS: Record<string, string> = {
  balanced: 'Tackles, sacks, and turnovers all matter. Every-down LBs and versatile DBs have strong value.',
  tackle_heavy: 'Solo and assist tackles dominate. Prioritize high-snap LBs and safeties with tackle volume.',
  big_play_heavy: 'Sacks, INTs, and TDs spike value. Edge rushers and ball-hawking DBs get a premium.',
}

interface IdpConfig {
  scoringPreset: string
  positionMode?: string
  rosterPreset?: string
}

interface Props {
  leagueId: string
  config: IdpConfig | null
  loading?: boolean
  onAskChimmy?: () => void
}

export function IdpScoringStyleCard({ leagueId, config, loading, onAskChimmy }: Props) {
  const [educatorOpen, setEducatorOpen] = useState(false)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loadingNarrative, setLoadingNarrative] = useState(false)

  const fetchEducator = async () => {
    setLoadingNarrative(true)
    try {
      const res = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/idp/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'league_educator' }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.narrative) setNarrative(data.narrative)
      setEducatorOpen(true)
    } finally {
      setLoadingNarrative(false)
    }
  }

  if (loading) return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">Loading IDP settings…</div>
  if (!config) return null

  const label = IDP_SCORING_PRESET_LABELS[config.scoringPreset] ?? config.scoringPreset
  const tip = SCORING_TIPS[config.scoringPreset] ?? SCORING_TIPS.balanced

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
      <div className="flex items-center gap-2 text-cyan-200">
        <Shield className="h-5 w-5 shrink-0" />
        <h3 className="font-medium">IDP scoring: {label}</h3>
      </div>
      <p className="mt-2 text-sm text-white/80">{tip}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={fetchEducator}
          disabled={loadingNarrative}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {loadingNarrative ? 'Loading…' : 'Learn more'}
        </button>
        {onAskChimmy && (
          <button
            type="button"
            onClick={onAskChimmy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-950/50"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask Chimmy about IDP
          </button>
        )}
      </div>
      {educatorOpen && narrative && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/90">
          {narrative}
          <button
            type="button"
            onClick={() => setEducatorOpen(false)}
            className="mt-2 text-xs text-cyan-300 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
