'use client'

import React from 'react'
import { BookOpen, TrendingUp } from 'lucide-react'

export interface ChimmyStoryCardProps {
  /** Week or period label */
  period: string
  headline: string
  body: string
  /** Key stat highlights */
  highlights?: Array<{ label: string; value: string }>
  /** Narrative type */
  storyType?: 'league' | 'team' | 'player' | 'matchup'
  onDeepDive?: () => void
  className?: string
}

const TYPE_LABEL: Record<NonNullable<ChimmyStoryCardProps['storyType']>, string> = {
  league:  'League Story',
  team:    'Team Story',
  player:  'Player Story',
  matchup: 'Matchup Story',
}

export default function ChimmyStoryCard({
  period,
  headline,
  body,
  highlights,
  storyType = 'league',
  onDeepDive,
  className = '',
}: ChimmyStoryCardProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-medium text-indigo-300 uppercase tracking-wide">{TYPE_LABEL[storyType]}</span>
        <span className="ml-auto text-xs text-white/40">{period}</span>
      </div>

      <h3 className="text-base font-bold text-white leading-snug mb-2">{headline}</h3>
      <p className="text-sm text-white/65 leading-relaxed">{body}</p>

      {highlights && highlights.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-indigo-400" />
              <span className="text-xs text-white/50">{h.label}:</span>
              <span className="text-xs font-semibold text-white">{h.value}</span>
            </div>
          ))}
        </div>
      )}

      {onDeepDive && (
        <button
          onClick={onDeepDive}
          className="mt-3 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Full story →
        </button>
      )}
    </div>
  )
}
