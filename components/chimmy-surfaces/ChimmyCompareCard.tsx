'use client'

import React from 'react'
import ChimmyConfidenceBadge from './ChimmyConfidenceBadge'

export interface ChimmyCompareItem {
  id: string
  label: string
  /** Primary metric value displayed prominently */
  primaryValue: string
  primaryLabel?: string
  /** Secondary metrics as key → value */
  secondaryStats?: Record<string, string>
  /** Chimmy's verdict for this item */
  verdict?: string
  /** Optional confidence percentage */
  confidencePct?: number
  /** Mark as recommended */
  isRecommended?: boolean
}

export interface ChimmyCompareCardProps {
  title?: string
  items: [ChimmyCompareItem, ChimmyCompareItem]
  /** Chimmy's overall comparison summary */
  summary?: string
  className?: string
}

export default function ChimmyCompareCard({ title, items, summary, className = '' }: ChimmyCompareCardProps) {
  const [left, right] = items

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-4 ${className}`}>
      {title && (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/40">{title}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[left, right].map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-3 ${item.isRecommended ? 'border-indigo-500/50 bg-indigo-500/10' : 'border-white/10 bg-white/5'}`}
          >
            <div className="flex items-center justify-between gap-1 flex-wrap mb-2">
              <span className="text-sm font-semibold text-white">{item.label}</span>
              {item.isRecommended && (
                <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-xs text-indigo-200">
                  Recommended
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-white">{item.primaryValue}</p>
            {item.primaryLabel && (
              <p className="text-xs text-white/40">{item.primaryLabel}</p>
            )}

            {item.secondaryStats && Object.keys(item.secondaryStats).length > 0 && (
              <div className="mt-2 space-y-1">
                {Object.entries(item.secondaryStats).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-white/40">{k}</span>
                    <span className="text-white/70">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {item.confidencePct !== undefined && (
              <div className="mt-2">
                <ChimmyConfidenceBadge pct={item.confidencePct} showPct={false} />
              </div>
            )}

            {item.verdict && (
              <p className="mt-2 text-xs text-white/60 italic">{item.verdict}</p>
            )}
          </div>
        ))}
      </div>

      {summary && (
        <p className="mt-3 text-sm text-white/60 leading-relaxed border-t border-white/10 pt-3">
          {summary}
        </p>
      )}
    </div>
  )
}
