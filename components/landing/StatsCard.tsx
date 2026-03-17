'use client'

import type { LucideIcon } from 'lucide-react'

export interface StatsCardProps {
  /** Display value (e.g. "1M+", "10K+", or number formatted by caller) */
  value: string | number
  /** Label under the value (e.g. "AI analyses run") */
  label: string
  /** Optional icon shown above the value */
  icon?: LucideIcon
  /** Optional className for the root element */
  className?: string
}

/**
 * Single platform stat card. Use for usage stats: AI analyses run, leagues created, player comparisons run, etc.
 */
export function StatsCard({ value, label, icon: Icon, className = '' }: StatsCardProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center ${className}`}
      style={{ color: 'var(--text)' }}
    >
      {Icon ? (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
        >
          <Icon className="h-6 w-6 text-emerald-400" aria-hidden />
        </div>
      ) : null}
      <span className="text-2xl font-bold tabular-nums sm:text-3xl" style={{ color: 'var(--text)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
    </div>
  )
}
