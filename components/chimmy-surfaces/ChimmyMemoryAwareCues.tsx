'use client'

import { useMemo } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAISurface } from './AISurfaceContext'
import { useChimmyPersonalization } from '@/lib/chimmy-personalization/useChimmyPersonalization'

export interface ChimmyMemoryAwareCuesProps {
  onSelectCue?: (cue: string) => void
  className?: string
}

export default function ChimmyMemoryAwareCues({ onSelectCue, className = '' }: ChimmyMemoryAwareCuesProps) {
  const surface = useAISurface()
  const { profile } = useChimmyPersonalization()

  const cues = useMemo(() => {
    const next: string[] = []
    if (profile?.effective.leagueStylePreference === 'dynasty-first') {
      next.push('Want me to use your dynasty preferences here?')
    }

    if (surface.leagueSettings?.scoring?.isCustom) {
      next.push('This league uses your custom scoring settings.')
    }

    if (profile?.effective.actionPreference === 'quick-one-move') {
      next.push('I can give one fast recommendation first, then details if you want.')
    }

    next.push('Your saved waiver plan suggests revisiting your bench spots first.')
    return next.slice(0, 3)
  }, [profile?.effective.actionPreference, profile?.effective.leagueStylePreference, surface.leagueSettings])

  if (cues.length === 0) return null

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${className}`}>
      <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/65">
        <MessageCircle className="h-3.5 w-3.5" />
        Memory-Aware Cues
      </p>
      <div className="flex flex-wrap gap-2">
        {cues.map((cue) => (
          <button
            key={cue}
            type="button"
            onClick={() => onSelectCue?.(cue)}
            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/75 hover:border-cyan-400/35 hover:text-cyan-200 transition"
          >
            {cue}
          </button>
        ))}
      </div>
    </div>
  )
}