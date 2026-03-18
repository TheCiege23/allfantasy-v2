'use client'

/**
 * Draft room: IDP scoring-style explainer and scarcity note. AI explains; engine enforces.
 */

import { IDP_SCORING_PRESET_LABELS } from '@/lib/idp'

const SCORING_HINT: Record<string, string> = {
  balanced: 'In balanced scoring, every-down LBs and versatile DBs are valuable; don’t reach for big names over fit.',
  tackle_heavy: 'Tackle-heavy leagues favor high-snap LBs and safeties; edge-only rushers lose value.',
  big_play_heavy: 'Big-play scoring boosts sacks and INTs; prioritize edge rushers and ball-hawking DBs.',
}

interface Props {
  scoringPreset: string
  positionMode?: string
  className?: string
}

export function IdpDraftExplainerCard({ scoringPreset, positionMode, className = '' }: Props) {
  const label = IDP_SCORING_PRESET_LABELS[scoringPreset] ?? scoringPreset
  const hint = SCORING_HINT[scoringPreset] ?? SCORING_HINT.balanced

  return (
    <div className={`rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 text-sm ${className}`}>
      <div className="font-medium text-cyan-200">IDP scoring: {label}</div>
      <p className="mt-1 text-white/80">{hint}</p>
      {positionMode && positionMode !== 'standard' && (
        <p className="mt-1 text-xs text-white/60">
          Position mode: {positionMode === 'advanced' ? 'Split (DE, DT, LB, CB, S)' : 'Hybrid'} — slot eligibility is enforced by the app.
        </p>
      )}
    </div>
  )
}
