'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ModelOutputItem {
  model: string
  raw: string
  error?: string
  skipped?: boolean
}

export interface CompareProvidersViewProps {
  modelOutputs: ModelOutputItem[]
  /** Only show when more than one successful output */
  className?: string
}

const MODEL_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  grok: 'Grok',
}

/**
 * Compare providers: tabs or accordion per model raw text. Read-only; no new API call.
 */
export default function CompareProvidersView({
  modelOutputs,
  className = '',
}: CompareProvidersViewProps) {
  const [expanded, setExpanded] = useState(false)
  const valid = modelOutputs.filter((o) => !o.skipped && !o.error && o.raw?.trim())

  if (valid.length <= 1) return null

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-white/[0.04] min-h-[44px] touch-manipulation"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-white/90">Compare providers</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
      </button>
      {expanded && (
        <div className="border-t border-white/10 p-3 space-y-4">
          {valid.map((o) => (
            <div key={o.model} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold text-white/60 mb-2">
                {MODEL_LABELS[o.model] ?? o.model}
              </p>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{o.raw}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
