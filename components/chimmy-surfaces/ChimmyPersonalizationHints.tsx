'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { useAISurface } from './AISurfaceContext'
import { useChimmyPersonalization } from '@/lib/chimmy-personalization/useChimmyPersonalization'

export interface ChimmyPersonalizationHintsProps {
  className?: string
}

export default function ChimmyPersonalizationHints({ className = '' }: ChimmyPersonalizationHintsProps) {
  const surface = useAISurface()
  const { profile } = useChimmyPersonalization()

  const hints = useMemo(() => {
    if (!profile) return [] as string[]
    const next: string[] = []

    if (profile.effective.riskPreference === 'upside') {
      next.push('You usually prefer upside plays.')
    } else if (profile.effective.riskPreference === 'floor') {
      next.push('You usually lean toward safer floor outcomes.')
    }

    if (profile.effective.actionPreference === 'quick-one-move') {
      next.push('You typically want quick answers.')
    } else if (profile.effective.actionPreference === 'top-3-options') {
      next.push('You usually prefer 2-3 options before deciding.')
    }

    if (surface.leagueType === 'dynasty') {
      next.push('This league is treated as dynasty context by default.')
    } else if (surface.leagueType === 'redraft') {
      next.push('This league is treated as a win-now redraft context.')
    }

    if (profile.effective.explanationStyle === 'concise') {
      next.push('Chimmy will default to concise explanations unless you ask for details.')
    }

    return next.slice(0, 3)
  }, [profile, surface.leagueType])

  if (hints.length === 0) return null

  return (
    <div className={`rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 ${className}`}>
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200/90">
        <Sparkles className="h-3.5 w-3.5" />
        Chimmy remembers
      </p>
      <div className="space-y-1.5">
        {hints.map((hint) => (
          <p key={hint} className="text-xs text-white/70">
            {hint}
          </p>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/45">You can revise these preferences any time.</p>
    </div>
  )
}