'use client'

import React from 'react'
import { Crown, ChevronRight } from 'lucide-react'

export interface ChimmyCommissionerCardProps {
  title: string
  body: string
  /** Optional suggested action for the commissioner to take */
  suggestedAction?: string
  onTakeAction?: () => void
  /** Tagged concern area */
  area?: 'health' | 'activity' | 'trade' | 'parity' | 'general'
  className?: string
}

const AREA_LABEL: Record<NonNullable<ChimmyCommissionerCardProps['area']>, string> = {
  health:   'League Health',
  activity: 'Activity Monitor',
  trade:    'Trade Activity',
  parity:   'Competitive Parity',
  general:  'Commissioner Alert',
}

export default function ChimmyCommissionerCard({
  title,
  body,
  suggestedAction,
  onTakeAction,
  area = 'general',
  className = '',
}: ChimmyCommissionerCardProps) {
  return (
    <div className={`rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Crown className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-medium uppercase tracking-wide text-amber-400">{AREA_LABEL[area]}</span>
      </div>

      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      <p className="text-sm text-white/65 leading-relaxed">{body}</p>

      {suggestedAction && (
        <div className="mt-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-xs text-white/50 mb-1">Suggested action</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-white/80">{suggestedAction}</p>
            {onTakeAction && (
              <button
                onClick={onTakeAction}
                className="flex items-center gap-1 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors shrink-0"
              >
                Act <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
