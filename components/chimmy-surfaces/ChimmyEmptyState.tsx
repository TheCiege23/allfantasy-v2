'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

export interface ChimmyEmptyStateProps {
  title?: string
  message?: string
  /** Optional quick prompt chips */
  prompts?: Array<{ label: string; onClick: () => void }>
  className?: string
}

export default function ChimmyEmptyState({
  title = 'Ask Chimmy anything',
  message = 'No insights yet. Try asking about your roster, waiver wire, or upcoming matchup.',
  prompts,
  className = '',
}: ChimmyEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 border border-indigo-500/25">
        <Sparkles className="h-5 w-5 text-indigo-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-white/50 max-w-xs">{message}</p>
      </div>
      {prompts && prompts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={p.onClick}
              className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300 hover:bg-indigo-500/20 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
