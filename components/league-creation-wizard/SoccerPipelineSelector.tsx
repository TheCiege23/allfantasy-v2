'use client'

import type { SoccerPipeline } from '@/lib/soccer/soccer-pipeline'

export type SoccerPipelineSelectorProps = {
  value: SoccerPipeline
  onChange: (pipeline: SoccerPipeline) => void
}

const OPTIONS: { id: SoccerPipeline; label: string; description: string }[] = [
  {
    id: 'euro',
    label: 'European leagues',
    description: 'Premier League, La Liga, Serie A, Bundesliga, UCL pipeline (Euro data feeds).',
  },
  {
    id: 'mls',
    label: 'MLS / North America',
    description: 'Major League Soccer and NA soccer feeds (aligned with MLS API paths).',
  },
]

/**
 * Shown when the user selects Soccer — picks which external soccer data chain the league uses.
 */
export function SoccerPipelineSelector({ value, onChange }: SoccerPipelineSelectorProps) {
  return (
    <div className="space-y-3" data-testid="wizard-soccer-pipeline">
      <div>
        <h3 className="text-sm font-semibold text-white/90">Soccer data region</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/55">
          Choose which player and match data source powers this league. You can’t mix both in one league.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`wizard-soccer-pipeline-${opt.id}`}
              onClick={() => onChange(opt.id)}
              className={[
                'rounded-xl border px-3 py-3 text-left transition-colors',
                selected
                  ? 'border-cyan-400/50 bg-cyan-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'border-white/10 bg-black/25 hover:border-white/15 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <div className="text-sm font-medium text-white/90">{opt.label}</div>
              <div className="mt-1 text-[11px] leading-snug text-white/50">{opt.description}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
